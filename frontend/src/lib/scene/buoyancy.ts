import type { Container as PixiContainer } from "pixi.js";
import type { ContainerState } from "../protocol/types";
import { hash } from "./util";

// seberapa kuat kapal bergoyang untuk tiap state
const SWAY: Record<ContainerState, number> = {
  running: 1,
  restarting: 1.8,
  paused: 0.2,
  exited: 0,
};

/**
 * Gerak mengapung dan tenggelam, dipakai bersama oleh perahu dan kapal kontainer.
 * Hanya menyimpan angka, tidak tahu apa-apa soal gambarnya.
 */
export class Buoyancy {
  private wave: number; // fase gelombang, bertambah tiap frame
  private amp = 1; // amplitudo goyang saat ini (menuju SWAY[state])
  private sink = 0; // 0 = mengapung, 1 = tenggelam
  private state: ContainerState = "running";
  private ready = false;
  private weight: number;

  /** seed menentukan fase awal, jadi kapal yang berbeda tidak bergoyang serempak. */
  constructor(seed: string, weight = 1) {
    this.wave = (hash(seed) % 628) / 100; // 0..2π
    this.weight = weight; // kapal besar bergoyang lebih sedikit
  }

  /** Panggilan pertama langsung melompat ke state itu, tanpa animasi saat halaman dibuka. */
  set(state: ContainerState) {
    if (!this.ready) {
      this.ready = true;
      this.amp = SWAY[state];
      this.sink = state === "exited" ? 1 : 0;
    }
    this.state = state;
  }

  /** 0 = mengapung penuh, 1 = tenggelam penuh. */
  get depth() {
    return this.sink;
  }

  /** Menggerakkan `body`, yang pivot-nya harus di titik tengah ikon (cx, cy). */
  tick(dtMs: number, body: PixiContainer, cx: number, cy: number, h: number) {
    // interpolasi yang tidak bergantung frame rate
    const k = 1 - Math.exp(-dtMs / 250);
    this.amp += (SWAY[this.state] - this.amp) * k;
    this.sink += ((this.state === "exited" ? 1 : 0) - this.sink) * k;

    const speed = (this.state === "restarting" ? 4 : 1.6) / Math.sqrt(this.weight + 0.4);
    this.wave += (dtMs / 1000) * speed;

    const bob = Math.sin(this.wave) * 3 * this.amp * this.weight;
    const roll = Math.sin(this.wave * 0.8 + 1) * 0.04 * this.amp * this.weight;

    body.position.set(cx, cy + bob + this.sink * h * 0.27);
    body.rotation = roll + this.sink * 0.2;
    body.alpha = 1 - this.sink * 0.5;
    body.scale.set(1 - this.sink * 0.08);
  }
}
