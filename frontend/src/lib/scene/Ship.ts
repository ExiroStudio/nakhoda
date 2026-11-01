import type { Container as DockerContainer, Stats } from "../protocol/types";
import { buildBoat, toSvg } from "./shipArt";
import { VesselView } from "./VesselView";

/** Lebar perahu di dunia. Kapal kontainer memakai skala yang sama, jadi otomatis lebih besar. */
export const SHIP_W = 150;
export const ICON_SCALE = SHIP_W / buildBoat().width;

/** Perahu kecil untuk satu container yang berdiri sendiri. */
export class Ship extends VesselView {
  private shown = "";

  constructor(seed: string) {
    super(seed, 1);
    this.art.scale.set(ICON_SCALE);
  }

  update(c: DockerContainer, s?: Stats) {
    this.float.set(c.state);
    this.setLabels(c.name, s ? `cpu ${s.cpu.toFixed(0)}%` : c.state);

    // gambar ulang hanya saat state berubah, bukan tiap update
    if (c.state !== this.shown) {
      this.shown = c.state;
      const a = buildBoat(c.state);
      this.art.clear().svg(toSvg(a, { overflowLabel: false }));
      this.layout(a.width * ICON_SCALE, a.height * ICON_SCALE);
    }
  }
}
