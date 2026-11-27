/** Pembangkit acak kecil dengan seed, supaya gerak tiap kapal berbeda tapi bisa diulang saat uji. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPEED = 16; // piksel dunia per detik, kecepatan jelajah
const SLOW_ZONE = 34; // mulai melambat saat sedekat ini dengan tujuan
const ARRIVE = 4; // dianggap sampai
const INERTIA = 0.8; // detik; makin besar makin lamban berbelok dan berhenti
const DWELL_MIN = 1500; // ms berhenti di tujuan
const DWELL_MAX = 5000;
const MIN_TRIP = 0.35; // perjalanan minimal sebagai pecahan dari rx

/**
 * Kapal berkeliaran di dalam sebuah elips di sekitar titik asalnya (0,0).
 * Posisi (x, y) adalah selisih terhadap titik asal. Tidak tahu apa-apa soal Pixi.
 *
 * Perilaku: pilih tujuan acak di dalam elips, berlayar ke sana dengan melambat saat
 * mendekat, berhenti sebentar, lalu pilih tujuan baru. Kecepatan mengikuti
 * kecepatan yang diinginkan secara halus, jadi berbelok dan berhenti tidak patah.
 */
export class Wander {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** 1 = menghadap kanan, -1 = kiri. Berubah hanya saat benar-benar bergerak ke arah lain. */
  facing: 1 | -1 = 1;

  private tx = 0;
  private ty = 0;
  private hasTarget = false;
  private wait: number;
  private rnd: () => number;

  /** @param rnd biasanya mulberry32(hash(kunciKapal)), jadi tiap kapal punya gerak sendiri yang tetap. */
  constructor(rnd: () => number) {
    this.rnd = rnd;
    // kapal tidak berangkat serempak
    this.wait = this.rnd() * 2500;
  }

  /** Kembali ke titik asal dan diam. Dipakai saat kapal dipindahkan oleh pengguna. */
  reset() {
    this.x = this.y = this.vx = this.vy = 0;
    this.hasTarget = false;
    this.wait = 600 + this.rnd() * 1500;
  }

  /** Laju sesaat (piksel dunia per detik). */
  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  /**
   * @param active false = kapal diam (tenggelam, dijeda). Ia melambat sampai berhenti.
   * @param rx,ry  setengah lebar dan tinggi area jelajah
   */
  tick(dtMs: number, active: boolean, rx: number, ry: number) {
    const dt = Math.min(dtMs, 100) / 1000; // lonjakan frame tidak boleh melontarkan kapal
    let dvx = 0;
    let dvy = 0;

    if (active) {
      if (!this.hasTarget) {
        this.wait -= dtMs;
        if (this.wait <= 0) this.pickTarget(rx, ry);
      }
      if (this.hasTarget) {
        const dx = this.tx - this.x;
        const dy = this.ty - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < ARRIVE) {
          this.hasTarget = false;
          this.wait = DWELL_MIN + this.rnd() * (DWELL_MAX - DWELL_MIN);
        } else {
          const s = SPEED * Math.min(1, dist / SLOW_ZONE);
          dvx = (dx / dist) * s;
          dvy = (dy / dist) * s;
        }
      }
    }

    const k = 1 - Math.exp(-dt / INERTIA);
    this.vx += (dvx - this.vx) * k;
    this.vy += (dvy - this.vy) * k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Jalur lurus antara dua titik di dalam elips tetap di dalam elips, jadi ini hanya bekerja
    // saat elipsnya mengecil (kapal berganti bentuk) atau kapal baru saja dilepas dari drag.
    const e = (this.x / rx) ** 2 + (this.y / ry) ** 2;
    if (e > 1) {
      const pull = 1 - Math.exp(-dt / 0.4);
      const s = 1 / Math.sqrt(e);
      this.x += (this.x * s - this.x) * pull;
      this.y += (this.y * s - this.y) * pull;
      this.hasTarget = false;
    }

    if (Math.abs(this.vx) > 3) this.facing = this.vx > 0 ? 1 : -1;
  }

  private pickTarget(rx: number, ry: number) {
    // beberapa percobaan agar perjalanan tidak terlalu pendek (kapal tampak bergetar di tempat)
    for (let i = 0; i < 5; i++) {
      const a = this.rnd() * Math.PI * 2;
      const r = Math.sqrt(this.rnd()) * 0.95; // seragam di dalam elips
      this.tx = Math.cos(a) * r * rx;
      this.ty = Math.sin(a) * r * ry;
      if (Math.hypot(this.tx - this.x, this.ty - this.y) >= rx * MIN_TRIP) break;
    }
    this.hasTarget = true;
  }
}
