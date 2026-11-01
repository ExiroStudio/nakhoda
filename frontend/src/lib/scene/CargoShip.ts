import { Text } from "pixi.js";
import type { Container as DockerContainer, Stats } from "../protocol/types";
import { fleetState } from "../state/vessels";
import { buildCargo, toSvg } from "./shipArt";
import { ICON_SCALE } from "./Ship";
import { VesselView } from "./VesselView";

/**
 * Kapal kontainer untuk satu project docker compose (dua container atau lebih).
 * Satu kotak per container. Panjang kapal mengikuti jumlahnya sampai batas
 * 10 kotak. Sisanya hanya ditulis "+N", dan isi lengkapnya ada di Inspector.
 *
 * Aturan "compose dengan lebih dari satu container" ada di groupVessels (vessels.ts).
 * View ini hanya menggambar apa pun yang diberikan kepadanya.
 */
export class CargoShip extends VesselView {
  private readonly more = new Text({
    text: "",
    style: { fill: 0xcfe3ff, fontSize: 13, fontWeight: "700" },
  });
  private shown = "";
  private count = -1;

  constructor(seed: string) {
    super(seed, 0.55); // kapal besar lebih tenang daripada perahu
    this.art.scale.set(ICON_SCALE);
    this.more.anchor.set(1, 1);
    this.more.visible = false;
    this.body.addChild(this.more);
  }

  update(project: string, members: DockerContainer[], stats: Map<string, Stats>) {
    const states = members.map((m) => m.state);
    const running = states.filter((s) => s === "running").length;

    let cpu = 0;
    let sampled = false;
    for (const m of members) {
      const s = stats.get(m.id);
      if (s) {
        cpu += s.cpu;
        sampled = true;
      }
    }

    this.float.set(fleetState(states));
    this.setLabels(
      project,
      `${running}/${members.length} running` + (sampled ? ` · cpu ${cpu.toFixed(0)}%` : ""),
    );

    // gambar ulang hanya saat susunan state berubah
    const sig = states.join(",");
    if (sig === this.shown) return;
    this.shown = sig;

    const a = buildCargo(states);
    this.art.clear().svg(toSvg(a, { overflowLabel: false }));

    this.more.visible = a.overflow > 0;
    this.more.text = `+${a.overflow}`;
    this.more.position.set(a.overflowAnchor.x * ICON_SCALE, a.overflowAnchor.y * ICON_SCALE);

    this.layout(a.width * ICON_SCALE, a.height * ICON_SCALE);

    // muatan bertambah atau berkurang: kapal berdenyut sebentar (bukan saat pertama kali muncul)
    if (this.count !== -1 && this.count !== members.length) this.bump();
    this.count = members.length;
  }
}
