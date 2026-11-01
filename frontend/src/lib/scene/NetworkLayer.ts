import { Container as PixiContainer, Graphics, Text } from "pixi.js";
import type { WorldState } from "../state/reducer";
import type { Anchor } from "./ShipLayer";
import { hash, hslToHex } from "./util";

type Resolver = (containerId: string) => Anchor | null;

export class NetworkLayer {
  readonly view = new PixiContainer();
  private g = new Graphics();
  private labels = new Map<string, Text>();

  constructor() {
    this.view.addChild(this.g);
  }

  redraw(state: WorldState, anchorOf: Resolver, zoom: number) {
    this.g.clear();

    // kapal anggota tiap network. Dideduplikasi per kapal: kapal kontainer dengan tiga
    // container di network yang sama tetap hanya satu titik.
    const members = new Map<string, Map<string, Anchor>>();
    for (const c of state.containers.values()) {
      if (c.state === "exited") continue; // container yang berhenti tidak terhubung ke network
      const a = anchorOf(c.id);
      if (!a) continue;
      for (const nid of c.networks) {
        let m = members.get(nid);
        if (!m) members.set(nid, (m = new Map()));
        m.set(a.key, a);
      }
    }

    const visible = new Set<string>();

    for (const [nid, byKey] of members) {
      const pts = [...byKey.values()];
      // network yang seluruh anggotanya ada di satu kapal (misalnya <project>_default) tidak digambar
      if (pts.length < 2) continue;

      const color = hslToHex(hash(nid) % 360);
      let cx = 0;
      let cy = 0;
      for (const p of pts) {
        cx += p.x;
        cy += p.y;
      }
      cx /= pts.length;
      cy /= pts.length;

      // lebar dibagi zoom supaya tebal garis di layar tetap sama
      for (const p of pts) this.g.moveTo(p.x, p.y).lineTo(cx, cy);
      this.g.stroke({ width: 2 / zoom, color, alpha: 0.65 });
      this.g.circle(cx, cy, 6 / zoom).fill({ color });

      let label = this.labels.get(nid);
      if (!label) {
        const name = state.networks.get(nid)?.name ?? nid;
        label = new Text({ text: name, style: { fill: color, fontSize: 12 } });
        this.labels.set(nid, label);
        this.view.addChild(label);
      }
      label.scale.set(1 / zoom); // ukuran teks tetap di layar
      label.position.set(cx + 10 / zoom, cy - 8 / zoom);
      visible.add(nid);
    }

    // label disembunyikan kalau network-nya tidak lagi menghubungkan apa pun, atau saat zoom jauh
    for (const [nid, label] of this.labels) {
      label.visible = visible.has(nid) && zoom >= 0.5;
    }
  }
}
