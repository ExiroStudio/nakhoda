import {
  Container as PixiContainer,
  FederatedPointerEvent,
  Rectangle,
} from "pixi.js";
import type { WorldState } from "../state/reducer";
import { membersOf, type Vessel } from "../state/vessels";
import { CargoShip } from "./CargoShip";
import { Ship } from "./Ship";

const DRAG_THRESHOLD = 4; // piksel layar

// penempatan awal kapal baru: grid dengan sel selebar kapal kontainer terbesar
const CELL_W = 380;
const CELL_H = 210;
const ORIGIN_X = -560;
const ORIGIN_Y = -290;

/** Titik tempat garis network menempel pada sebuah kapal (koordinat dunia), plus kunci kapalnya. */
export interface Anchor {
  key: string;
  x: number;
  y: number;
}

/**
 * Satu slot per kapal. Slot memegang posisi, area klik, dan drag. View di dalamnya
 * (perahu atau kapal kontainer) boleh diganti kapan saja tanpa menghilangkan posisi.
 */
interface Slot {
  key: string;
  kind: Vessel["kind"];
  root: PixiContainer;
  hit: Rectangle;
  view: Ship | CargoShip;
}

interface DragState {
  slot: Slot;
  pointerId: number;
  dx: number; // selisih posisi kapal terhadap kursor (koordinat dunia)
  dy: number;
  startX: number; // posisi layar saat ditekan
  startY: number;
  moving: boolean;
}

export class ShipLayer {
  private slots = new Map<string, Slot>();
  private owner = new Map<string, string>(); // id container -> kunci kapal
  private spawned = 0;
  private selectedKey: string | null = null;
  private drag: DragState | null = null;

  private world: PixiContainer;
  private stage: PixiContainer;
  private onSelect: (key: string) => void;

  constructor(world: PixiContainer, stage: PixiContainer, onSelect: (key: string) => void) {
    this.world = world;
    this.stage = stage;
    this.onSelect = onSelect;

    stage.on("pointermove", this.onMove);
    stage.on("pointerup", this.onUp);
    stage.on("pointerupoutside", this.onUp);
  }

  setSelected(key: string | null) {
    this.selectedKey = key;
    for (const slot of this.slots.values()) slot.view.setSelected(slot.key === key);
  }

  sync(state: WorldState, vessels: Vessel[]) {
    const live = new Set<string>();
    this.owner.clear();

    for (const v of vessels) {
      live.add(v.key);
      let slot = this.slots.get(v.key);
      if (!slot) slot = this.spawn(v);
      else if (slot.kind !== v.kind) this.reshape(slot, v);

      this.refresh(slot, v, state);
      for (const c of membersOf(v)) this.owner.set(c.id, v.key);
    }

    for (const slot of [...this.slots.values()]) {
      if (!live.has(slot.key)) this.remove(slot);
    }
  }

  tick(dtMs: number) {
    for (const slot of this.slots.values()) slot.view.tick(dtMs);
  }

  /** Dari container ke kapalnya. Satu-satunya tempat yang tahu pemetaan ini, dipakai NetworkLayer. */
  anchorOf = (containerId: string): Anchor | null => {
    const key = this.owner.get(containerId);
    const slot = key ? this.slots.get(key) : undefined;
    if (!slot) return null;
    return {
      key: slot.key,
      x: slot.root.x + slot.view.anchorX,
      y: slot.root.y + slot.view.anchorY,
    };
  };

  private createView(v: Vessel): Ship | CargoShip {
    // seed memakai kunci kapal, jadi fase goyang tetap sama saat bentuknya berganti
    return v.kind === "fleet" ? new CargoShip(v.key) : new Ship(v.key);
  }

  private spawn(v: Vessel): Slot {
    const root = new PixiContainer();
    const hit = new Rectangle(0, 0, 1, 1);
    root.hitArea = hit;
    root.eventMode = "static";
    root.cursor = "grab";

    const i = this.spawned++;
    root.position.set(
      ORIGIN_X + (i % 3) * CELL_W,
      ORIGIN_Y + Math.floor(i / 3) * CELL_H,
    );

    const view = this.createView(v);
    view.setSelected(v.key === this.selectedKey);
    root.addChild(view);
    this.world.addChild(root);

    const slot: Slot = { key: v.key, kind: v.kind, root, hit, view };
    root.on("pointerdown", (e) => {
      e.stopPropagation(); // supaya kamera tidak ikut tergeser
      this.onPress(slot, e);
    });
    this.slots.set(v.key, slot);
    return slot;
  }

  /** Perahu menjadi kapal kontainer (atau sebaliknya). Posisi slot tidak berubah. */
  private reshape(slot: Slot, v: Vessel) {
    slot.root.removeChild(slot.view);
    slot.view.destroy({ children: true });
    slot.view = this.createView(v);
    slot.view.setSelected(slot.key === this.selectedKey);
    slot.root.addChild(slot.view);
    slot.kind = v.kind;
  }

  private refresh(slot: Slot, v: Vessel, state: WorldState) {
    if (v.kind === "solo" && slot.view instanceof Ship) {
      slot.view.update(v.container, state.stats.get(v.container.id));
    } else if (v.kind === "fleet" && slot.view instanceof CargoShip) {
      slot.view.update(v.project, v.containers, state.stats);
    }
    slot.hit.width = slot.view.boxW;
    slot.hit.height = slot.view.boxH;
  }

  private remove(slot: Slot) {
    if (this.drag?.slot === slot) this.drag = null; // kapal dihapus saat sedang diseret
    slot.root.destroy({ children: true });
    this.slots.delete(slot.key);
  }

  private onPress = (slot: Slot, e: FederatedPointerEvent) => {
    this.onSelect(slot.key);
    this.world.addChild(slot.root); // naik ke paling atas supaya tidak tertutup kapal lain

    const p = this.world.toLocal(e.global);
    this.drag = {
      slot,
      pointerId: e.pointerId,
      dx: slot.root.x - p.x,
      dy: slot.root.y - p.y,
      startX: e.global.x,
      startY: e.global.y,
      moving: false,
    };
  };

  private onMove = (e: FederatedPointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;

    if (!d.moving) {
      const dist = Math.hypot(e.global.x - d.startX, e.global.y - d.startY);
      if (dist <= DRAG_THRESHOLD) return;
      d.moving = true;
      d.slot.root.cursor = "grabbing";
    }

    const p = this.world.toLocal(e.global);
    d.slot.root.position.set(p.x + d.dx, p.y + d.dy);
  };

  private onUp = (e: FederatedPointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    d.slot.root.cursor = "grab";
    this.drag = null;
    // di sini nanti: kalau d.moving, cek apakah kapal dilepas di atas garis network
  };

  destroy() {
    this.stage.off("pointermove", this.onMove);
    this.stage.off("pointerup", this.onUp);
    this.stage.off("pointerupoutside", this.onUp);
    for (const slot of this.slots.values()) slot.root.destroy({ children: true });
    this.slots.clear();
    this.owner.clear();
    this.drag = null;
  }
}
