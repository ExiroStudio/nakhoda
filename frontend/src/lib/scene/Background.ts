import { Graphics } from "pixi.js";
import type { Camera } from "../Camera";

export class Background {
  private g = new Graphics();

  constructor(private camera: Camera) {
    camera.world.addChildAt(this.g, 0); // paling bawah
  }

  redraw() {
    const r = this.camera.visibleWorldRect();
    const zoom = this.camera.world.scale.x;

    // kalau zoom out jauh, renggangkan grid supaya garisnya tidak terlalu rapat
    let step = 100;
    while (step * zoom < 24) step *= 5;

    const x0 = Math.floor(r.x / step) * step;
    const y0 = Math.floor(r.y / step) * step;

    this.g.clear();
    for (let x = x0; x <= r.right; x += step) this.g.moveTo(x, r.y).lineTo(x, r.bottom);
    for (let y = y0; y <= r.bottom; y += step) this.g.moveTo(r.x, y).lineTo(r.right, y);
    this.g.stroke({ width: 1 / zoom, color: 0x1c3a5e, alpha: 0.7 }); // 1/zoom: tebal garis tetap 1px
  }
}