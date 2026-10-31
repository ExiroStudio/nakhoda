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
import { buildBoat, toSvg } from "./shipArt";
import { hash } from "./util";

const BOAT = buildBoat("running"); // hanya untuk mengambil ukuran
export const SHIP_W = 150;
const SCALE = SHIP_W / BOAT.width;
export const SHIP_H = Math.round(BOAT.height * SCALE); // tinggi ikon
const LABEL_H = 38; // ruang untuk nama dan CPU di bawah ikon

const SWAY: Record<ContainerState, number> = {
  running: 1,
  restarting: 1.8,
  overload: 0.5,
  paused: 0.1,
  exited: 0,
};

export class Ship extends PixiContainer {
  readonly shipId: string;
  private body = new PixiContainer(); // bergoyang dan tenggelam
  private art = new Graphics();       // gambar perahu
  private frame = new Graphics();     // bingkai pilihan, diam di tempat
  private title = new Text({
    text: "",
    style: { fill: 0xffffff, fontSize: 14, fontWeight: "600" },
  });
  private info = new Text({ text: "", style: { fill: 0xcfe3ff, fontSize: 12 } });

  private state: ContainerState = "running";
  private ready = false;

  private wave: number; // fase gelombang, bertambah tiap frame
  private amp = 1;      // amplitudo goyang saat ini (menuju SWAY[state])
  private sink = 0;     // 0 = mengapung, 1 = tenggelam

  constructor(id: string, onPress: (ship: Ship, e: FederatedPointerEvent) => void) {
    super();
    this.shipId = id;
    this.wave = (hash(id) % 628) / 100; // fase awal acak, 0..2π

    // body berputar di sekitar titik tengah ikon
    this.body.pivot.set(SHIP_W / 2, SHIP_H / 2);
    this.body.position.set(SHIP_W / 2, SHIP_H / 2);
    this.art.scale.set(SCALE);
    this.body.addChild(this.art);

    this.title.anchor.set(0.5, 0);
    this.title.position.set(SHIP_W / 2, SHIP_H + 6);
    this.info.anchor.set(0.5, 0);
    this.info.position.set(SHIP_W / 2, SHIP_H + 24);

    // bingkai digambar sekali, setSelected hanya menampilkan atau menyembunyikannya
    this.frame
      .roundRect(-6, -6, SHIP_W + 12, SHIP_H + LABEL_H + 12, 12)
      .stroke({ width: 2, color: 0xffffff });
    this.frame.visible = false;

    this.addChild(this.frame, this.body, this.title, this.info);

    // area klik tetap, tidak ikut bergoyang atau tenggelam
    this.hitArea = new Rectangle(0, 0, SHIP_W, SHIP_H + LABEL_H);
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
    this.frame.visible = v;
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

    this.body.y = SHIP_H / 2 + bob + this.sink * 30;
    this.body.rotation = roll + this.sink * 0.2;
    this.body.alpha = 1 - this.sink * 0.5;
    this.body.scale.set(1 - this.sink * 0.08);

    // teks tetap di tempat tapi meredup saat kapalnya tenggelam
    this.title.alpha = this.info.alpha = 1 - this.sink * 0.4;
  }

  // dipanggil hanya saat state berubah, bukan tiap frame
  private draw() {
    this.art.clear().svg(toSvg(buildBoat(this.state), { overflowLabel: false }));
  }
}