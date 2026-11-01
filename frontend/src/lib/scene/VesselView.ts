import { Container as PixiContainer, Graphics, Text } from "pixi.js";
import { Buoyancy } from "./buoyancy";

const LABEL_H = 38; // ruang untuk nama dan keterangan di bawah ikon

/** Memotong teks panjang supaya tidak melebar jauh dari ikon. */
function fit(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/**
 * Dasar tampilan satu kapal di dunia: ikon yang bergoyang, label di bawahnya,
 * dan bingkai saat terpilih. View tidak punya posisi sendiri dan tidak menerima
 * klik. Keduanya diurus slot di ShipLayer, supaya view bisa diganti
 * (perahu menjadi kapal kontainer) tanpa kehilangan posisi.
 */
export abstract class VesselView extends PixiContainer {
  protected readonly float: Buoyancy;
  protected readonly body = new PixiContainer(); // bergoyang dan tenggelam
  protected readonly art = new Graphics(); // gambar ikon
  private readonly frame = new Graphics(); // bingkai pilihan, diam di tempat
  private readonly title = new Text({
    text: "",
    style: { fill: 0xffffff, fontSize: 14, fontWeight: "600" },
  });
  private readonly info = new Text({ text: "", style: { fill: 0xcfe3ff, fontSize: 12 } });
  private pop = 0; // denyut singkat saat jumlah muatan berubah

  /** Ukuran ikon dalam koordinat dunia. Diisi oleh layout(). */
  iconW = 0;
  iconH = 0;

  get boxW() {
    return this.iconW;
  }
  get boxH() {
    return this.iconH + LABEL_H;
  }

  /**
   * Titik tempat garis network menempel: di badan lambung (opaque), bukan di tengah ikon.
   * Di tengah ikon kapal kontainer adalah area dek yang transparan, sehingga garis tampak menembus kotak.
   */
  get anchorX() {
    return this.iconW / 2;
  }
  get anchorY() {
    return this.iconH * 0.82;
  }

  constructor(seed: string, weight: number) {
    super();
    this.eventMode = "none"; // klik ditangani slot
    this.float = new Buoyancy(seed, weight);

    this.title.anchor.set(0.5, 0);
    this.info.anchor.set(0.5, 0);
    this.frame.visible = false;

    this.body.addChild(this.art);
    this.addChild(this.frame, this.body, this.title, this.info);
  }

  setSelected(v: boolean) {
    this.frame.visible = v;
  }

  protected setLabels(title: string, info: string) {
    this.title.text = fit(title, 22);
    this.info.text = info;
  }

  /** Dipanggil subclass setiap kali gambar ikon diganti. Mengembalikan true kalau ukurannya berubah. */
  protected layout(iconW: number, iconH: number): boolean {
    if (iconW === this.iconW && iconH === this.iconH) return false;
    this.iconW = iconW;
    this.iconH = iconH;

    // body berputar di sekitar titik tengah ikon
    this.body.pivot.set(iconW / 2, iconH / 2);
    this.body.position.set(iconW / 2, iconH / 2);

    this.title.position.set(iconW / 2, iconH + 6);
    this.info.position.set(iconW / 2, iconH + 24);

    this.frame
      .clear()
      .roundRect(-6, -6, this.boxW + 12, this.boxH + 12, 12)
      .stroke({ width: 2, color: 0xffffff });
    return true;
  }

  /** Denyut kecil, dipakai saat muatan bertambah atau berkurang. */
  protected bump() {
    this.pop = 1;
  }

  /** Dipanggil tiap frame oleh ShipLayer. */
  tick(dtMs: number) {
    this.float.tick(dtMs, this.body, this.iconW / 2, this.iconH / 2, this.iconH);

    this.pop *= Math.exp(-dtMs / 180);
    if (this.pop > 0.001) this.body.scale.set(this.body.scale.x * (1 + 0.06 * this.pop));

    // teks tetap di tempat tapi meredup saat kapalnya tenggelam
    this.title.alpha = this.info.alpha = 1 - this.float.depth * 0.4;
  }
}
