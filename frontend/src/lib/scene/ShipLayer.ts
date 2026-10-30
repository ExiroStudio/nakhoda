import type { Container as PixiContainer, FederatedPointerEvent } from "pixi.js";
import type { WorldState } from "../state/reducer";
import { Ship, SHIP_W, SHIP_H } from "./Ship";

const DRAG_THRESHOLD = 4; // piksel layar

interface DragState {
    ship: Ship;
    pointerId: number;
    dx: number; // selisih posisi kapal terhadap kursor (koordinat dunia)
    dy: number;
    startX: number; // posisi layar saat ditekan
    startY: number;
    moving: boolean;
}

export class ShipLayer {
    private ships = new Map<string, Ship>();
    private world: PixiContainer;
    private stage: PixiContainer;
    private onSelect: (id: string) => void;
    private selectedId: string | null = null;
    private drag: DragState | null = null;

    constructor(
        world: PixiContainer,
        stage: PixiContainer,
        onSelect: (id: string) => void,
    ) {
        this.world = world;
        this.stage = stage;
        this.onSelect = onSelect;

        stage.on("pointermove", this.onMove);
        stage.on("pointerup", this.onUp);
        stage.on("pointerupoutside", this.onUp);
    }

    tick(dtMs: number) {
        for (const ship of this.ships.values()) ship.tick(dtMs);
    }

    anchorOf = (containerId: string) => {
        const s = this.ships.get(containerId);
        return s ? { x: s.x + SHIP_W / 2, y: s.y + SHIP_H / 2 } : null;
    };

    setSelected(id: string | null) {
        this.selectedId = id;
        for (const ship of this.ships.values()) ship.setSelected(ship.shipId === id);
    }

    sync(state: WorldState) {
        for (const [id, c] of state.containers) {
            let ship = this.ships.get(id);
            if (!ship) {
                ship = new Ship(id, this.onPress);
                ship.setSelected(id === this.selectedId);
                const i = this.ships.size;
                ship.position.set((i % 3) * 220 - 330, Math.floor(i / 3) * 140 - 100);
                this.world.addChild(ship);
                this.ships.set(id, ship);
            }
            ship.update(c, state.stats.get(id));
        }
        for (const [id, ship] of this.ships) {
            if (!state.containers.has(id)) {
                if (this.drag?.ship === ship) this.drag = null; // kapal dihapus saat sedang diseret
                ship.destroy({ children: true });
                this.ships.delete(id);
            }
        }
    }

    private onPress = (ship: Ship, e: FederatedPointerEvent) => {
        this.onSelect(ship.shipId);
        this.world.addChild(ship); // naik ke paling atas supaya tidak tertutup kapal lain

        const p = this.world.toLocal(e.global);
        this.drag = {
            ship,
            pointerId: e.pointerId,
            dx: ship.x - p.x,
            dy: ship.y - p.y,
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
            d.ship.cursor = "grabbing";
        }

        const p = this.world.toLocal(e.global);
        d.ship.position.set(p.x + d.dx, p.y + d.dy);
    };

    private onUp = (e: FederatedPointerEvent) => {
        const d = this.drag;
        if (!d || e.pointerId !== d.pointerId) return;
        d.ship.cursor = "grab";
        this.drag = null;
        // di sini nanti: kalau d.moving, cek apakah kapal dilepas di atas garis network
    };

    destroy() {
        this.stage.off("pointermove", this.onMove);
        this.stage.off("pointerup", this.onUp);
        this.stage.off("pointerupoutside", this.onUp);
        for (const ship of this.ships.values()) ship.destroy({ children: true });
        this.ships.clear();
        this.drag = null;
    }
}