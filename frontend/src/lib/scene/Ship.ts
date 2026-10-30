import {
  Container as PixiContainer,
  FederatedPointerEvent,
  Graphics,
  Rectangle,
  Text,
} from "pixi.js";
import type {
  Container as DockerContainer,
  ContainerState,
  Stats,
} from "../protocol/types";
import { hash } from "./util";

export const SHIP_W = 150;
export const SHIP_H = 60;

const COLORS = {
  running: 0x3fa66b,
  exited: 0x8a3b42,
  paused: 0x6b7c93,
  restarting: 0xe0b04a,
} as const;

const SWAY: Record<ContainerState, number> = {
  running: 1,
  restarting: 1.8,
  paused: 0.2,
  exited: 0,
};

export class Ship extends PixiContainer {
  readonly shipId: string;
  private body = new PixiContainer();
  private hull = new Graphics();
  private title = new Text({
    text: "",
    style: { fill: 0xffffff, fontSize: 14, fontWeight: "600" },
  });
  private info = new Text({ text: "", style: { fill: 0xcfe3ff, fontSize: 12 } });

  private state: ContainerState = "running";
  private selected = false;
  private ready = false;

  private wave: number; // fase gelombang, bertambah tiap frame
  private amp = 1;      // amplitudo goyang saat ini (menuju SWAY[state])
  private sink = 0;     // 0 = mengapung, 1 = tenggelam

  constructor(id: string, onPress: (ship: Ship, e: FederatedPointerEvent) => void) {
    super();
    this.shipId = id;
    this.wave = (hash(id) % 628) / 100; // fase awal acak, 0..2π

    // body berputar di sekitar titik tengahnya
    this.body.pivot.set(SHIP_W / 2, SHIP_H / 2);
    this.body.position.set(SHIP_W / 2, SHIP_H / 2);
    this.title.position.set(12, 10);
    this.info.position.set(12, 34);
    this.body.addChild(this.hull, this.title, this.info);
    this.addChild(this.body);

    // area klik tetap, tidak ikut bergoyang atau tenggelam
    this.hitArea = new Rectangle(0, 0, SHIP_W, SHIP_H);
    this.eventMode = "static";
    this.cursor = "grab";
    this.on("pointerdown", (e) => {
      e.stopPropagation();
      onPress(this, e);
    });

    this.draw();
  }

  update(c: DockerContainer, s?: Stats) {
    this.title.text = c.name;
    this.info.text = s ? `cpu ${s.cpu.toFixed(0)}%` : c.state;

    // kapal yang sudah mati sejak awal langsung tenggelam, tanpa animasi saat halaman dibuka
    if (!this.ready) {
      this.ready = true;
      this.amp = SWAY[c.state];
      this.sink = c.state === "exited" ? 1 : 0;
    }

    if (c.state !== this.state) {
      this.state = c.state;
      this.draw();
    }
  }

  setSelected(v: boolean) {
    if (v === this.selected) return;
    this.selected = v;
    this.draw();
  }

  /** Dipanggil tiap frame oleh ShipLayer. */
  tick(dtMs: number) {
    // interpolasi yang tidak bergantung frame rate
    const k = 1 - Math.exp(-dtMs / 250);
    this.amp += (SWAY[this.state] - this.amp) * k;
    this.sink += ((this.state === "exited" ? 1 : 0) - this.sink) * k;

    const speed = this.state === "restarting" ? 4 : 1.6;
    this.wave += (dtMs / 1000) * speed;

    const bob = Math.sin(this.wave) * 3 * this.amp;
    const roll = Math.sin(this.wave * 0.8 + 1) * 0.04 * this.amp;

    this.body.y = SHIP_H / 2 + bob + this.sink * 26;
    this.body.rotation = roll + this.sink * 0.2;
    this.body.alpha = 1 - this.sink * 0.5;
    this.body.scale.set(1 - this.sink * 0.08);
  }

  private draw() {
    this.hull.clear().roundRect(0, 0, SHIP_W, SHIP_H, 10).fill(COLORS[this.state]);
    if (this.selected) {
      this.hull
        .roundRect(-4, -4, SHIP_W + 8, SHIP_H + 8, 13)
        .stroke({ width: 3, color: 0xffffff });
    }
  }
}