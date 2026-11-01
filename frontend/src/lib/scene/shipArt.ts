export type BoxState = "running" | "overload" |"restarting" | "paused" | "exited";

export type Shape =
  | { kind: "path"; d: string; fill?: string; stroke?: string; strokeWidth?: number }
  | {
      kind: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      r?: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    }
  | { kind: "circle"; cx: number; cy: number; r: number; fill: string };

export interface ShipArt {
  width: number;
  height: number;
  shapes: Shape[];
  overflow: number;
  overflowAnchor: { x: number; y: number };
}

// ---------------------------------------------------------------- warna

export const OCEAN = "#0b1d33";

export const STATE_COLOR: Record<BoxState, string> = {
  running: "#008AC5",
  restarting: "#e0b04a",
  overload: "#f12020",
  paused: "#6b7c93",
  exited: "#000000",
};

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Campur dua warna hex. t = 0 menghasilkan a, t = 1 menghasilkan b. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

/** Semua warna turunan dari satu warna dasar, jadi ganti identitas visual cukup lewat `accent`. */
export function palette(accent: string) {
  return {
    hull: accent,
    light: mix(accent, "#ffffff", 0.45),
    pale: mix(accent, "#ffffff", 0.7),
    dark: mix(accent, "#000000", 0.4),
    window: mix(accent, "#000000", 0.7),
  };
}

// ---------------------------------------------------------------- path builder

const f = (n: number) => String(Math.round(n * 100) / 100);

/** Penulis path absolut dengan pergeseran (dx, dy), supaya koordinat kerangka asli bisa dipakai apa adanya. */
class Path {
  private out = "";
  private dx: number;
  private dy: number;

  constructor(dx = 0, dy = 0) {
    this.dx = dx;
    this.dy = dy;
  }
  M(x: number, y: number) {
    this.out += `M${f(x + this.dx)} ${f(y + this.dy)}`;
    return this;
  }
  H(x: number) {
    this.out += `H${f(x + this.dx)}`;
    return this;
  }
  C(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    const X = (v: number) => f(v + this.dx);
    const Y = (v: number) => f(v + this.dy);
    this.out += `C${X(x1)} ${Y(y1)} ${X(x2)} ${Y(y2)} ${X(x)} ${Y(y)}`;
    return this;
  }
  Z() {
    this.out += "Z";
    return this;
  }
  toString() {
    return this.out;
  }
}

// ---------------------------------------------------------------- perahu

const BOAT_DY = 14; // ruang di atas layar untuk bendera

/** Perahu kecil untuk container yang berdiri sendiri (docker run). Bendera di tiang menunjukkan state. */
export function buildBoat(state: BoxState = "running"): ShipArt {
  const p = palette(STATE_COLOR[state]);
  const dy = BOAT_DY;
  const shapes: Shape[] = [];

  // Layar. Digeser +4.5 supaya titik tengah tepi atas dan bawahnya tepat di tiang (x = 106).
  const sail = new Path(4.5, dy)
    .M(151, 6)
    .H(52)
    .C(66.681, 40.123, 62.388, 56.13, 52, 84)
    .H(151)
    .C(163.859, 53.539, 163.551, 36.461, 151, 6)
    .Z();
  shapes.push({ kind: "path", d: String(sail), fill: p.pale });

  // Tiang: turun sedikit ke belakang lambung supaya tidak ada celah.
  shapes.push({ kind: "rect", x: 104, y: 0, w: 4, h: 98 + dy + 2, fill: p.hull });

  // Bendera state di ujung tiang.
  const flag = new Path().M(108, 0).C(120, 2, 132, 5, 143, 7).C(132, 9, 120, 12, 108, 14).Z();
  shapes.push({ kind: "path", d: String(flag), fill: STATE_COLOR[state] });

  // Lambung: kerangka asli.
  const hull = new Path(0, dy)
    .M(0, 98)
    .H(212)
    .C(212, 124.51, 190.51, 146, 164, 146)
    .H(48)
    .C(21.49, 146, 0, 124.51, 0, 98)
    .Z();
  shapes.push({ kind: "path", d: String(hull), fill: p.hull });

  // Pinggir atas lambung dan tiga lubang jendela.
  shapes.push({ kind: "rect", x: 0, y: 98 + dy, w: 212, h: 7, fill: p.light });
  for (const cx of [62, 106, 150]) {
    shapes.push({ kind: "circle", cx, cy: 124 + dy, r: 8, fill: p.light });
    shapes.push({ kind: "circle", cx, cy: 124 + dy, r: 5.5, fill: p.window });
  }

  return {
    width: 212,
    height: 146 + dy,
    shapes,
    overflow: 0,
    overflowAnchor: { x: 0, y: 0 },
  };
}

// ---------------------------------------------------------------- kapal kontainer

export const CARGO_MAX_BOXES = 10;

const MAX_COLS = 5; // kolom bertambah sampai 5, sesudah itu kotak ditumpuk ke atas
const BOX_W = 34;
const BOX_H = 22;
const GAP = 3;
const BOX_X0 = 154; // kotak pertama, tepat di kanan bangunan atas
const DECK = 105.5; // permukaan dek sumur dalam kerangka asli
const OY = 14; // ruang di atas bangunan atas untuk antena

/**
 * Kapal kontainer untuk satu project compose. Satu kotak per elemen `states`.
 *
 * Panjang kapal mengikuti jumlah kolom (2 sampai 5), dan baris kedua baru muncul setelah 5 kotak.
 * Kotak ke-i selalu menempati slot yang sama, jadi menambah atau mengurangi kotak
 * tidak menggeser kotak lain. State "exited" digambar sebagai slot kosong berbingkai merah.
 * Yang melebihi CARGO_MAX_BOXES tidak digambar, jumlahnya ada di `overflow`.
 */
export function buildCargo(states: BoxState[], accent = "#008AC5"): ShipArt {
  const p = palette(accent);
  const shown = states.slice(0, CARGO_MAX_BOXES);
  const n = shown.length;
  const cols = Math.min(MAX_COLS, Math.max(2, n));
  const rows = Math.max(1, Math.ceil(n / cols));

  // Akhir dek sumur. Kerangka asli: 299.664 (untuk 5 kolom kotak lebar 26).
  const x1 = BOX_X0 + cols * BOX_W + (cols - 1) * GAP + 8;
  const g = x1 - 299.664; // selisih panjang terhadap kerangka asli
  const xe = 437.379 + g; // ujung haluan

  const shapes: Shape[] = [];

  // Bangunan atas digambar lebih dulu, lalu lambung menutup bagian bawahnya.
  shapes.push({ kind: "rect", x: 32.164, y: 38.357 + OY, w: 118, h: 68.143, fill: p.light });
  shapes.push({ kind: "rect", x: 45.996, y: 5.5 + OY, w: 84.718, h: 32.857, fill: p.pale });
  shapes.push({ kind: "rect", x: 41.996, y: 0.5 + OY, w: 92.718, h: 5, fill: p.hull });

  // Antena dan radar.
  shapes.push({ kind: "rect", x: 86, y: 3, w: 2, h: 0.5 + OY - 3, fill: p.light });
  shapes.push({ kind: "rect", x: 80, y: 4.5, w: 14, h: 2.5, r: 1.25, fill: p.light });

  // Cerobong.
  shapes.push({ kind: "rect", x: 136.5, y: 9 + OY, w: 13, h: 29.357, fill: p.hull });
  shapes.push({ kind: "rect", x: 136.5, y: 17 + OY, w: 13, h: 5, fill: p.pale });
  shapes.push({ kind: "rect", x: 135, y: 6 + OY, w: 16, h: 3.5, r: 1, fill: p.dark });

  // Jendela anjungan (5) dan bangunan atas (7).
  for (let k = 0; k < 5; k++) {
    shapes.push({ kind: "rect", x: 50.855 + k * 16, y: 13 + OY, w: 11, h: 11, r: 1.5, fill: p.window });
  }
  for (let k = 0; k < 7; k++) {
    shapes.push({ kind: "rect", x: 38.164 + k * 16, y: 47 + OY, w: 9, h: 9, r: 1.5, fill: p.window });
  }

  // Sisi atas lambung (dipakai dua kali: untuk lambung dan garis dek).
  const topEdge = (pa: Path) =>
    pa
      .H(121.664)
      .C(132.013, 84.168, 127.664, 97.5, 148.164, DECK)
      .H(x1) // dek sumur dibuat rata, kerangka asli sedikit melengkung
      .C(x1 + 26.98, 95.557, x1 + 32.471, 84.715, x1 + 37, 62.5)
      .H(xe);

  // Buritan dan haluan dibuat mulus. Di kerangka asli kurva buritan membentuk kait kecil di (65, 159)
  // dan haluan berakhir tegak lurus terhadap dasar, jadi ada dua sudut tajam di sana.
  const xb = 381.664 + g; // awal lengkung haluan di dasar lambung
  const hull = topEdge(new Path(0, OY).M(65.164, 159).C(34, 159, 5, 128, 0.664, 70.5))
    .C(xe - 8, 98, xb + 30, 159, xb, 159)
    .H(65.164)
    .Z();
  shapes.push({ kind: "path", d: String(hull), fill: p.hull });

  const rim = topEdge(new Path(0, OY).M(0.664, 70.5));
  shapes.push({ kind: "path", d: String(rim), stroke: p.light, strokeWidth: 3 });

  // Lubang jendela di sisi lambung: jumlahnya mengikuti panjang kapal.
  for (let cx = 100; cx <= x1 + 20; cx += 26) {
    shapes.push({ kind: "circle", cx, cy: 128 + OY, r: 4.5, fill: p.window });
  }

  // Kotak container.
  shown.forEach((s, i) => {
    const col = i % cols;
    const tier = Math.floor(i / cols);
    const x = BOX_X0 + col * (BOX_W + GAP);
    const y = DECK + OY - 1 - (tier + 1) * BOX_H - tier * GAP;

    if (s === "exited") {
      shapes.push({
        kind: "rect",
        x,
        y,
        w: BOX_W,
        h: BOX_H,
        r: 2,
        fill: OCEAN,
        stroke: STATE_COLOR.exited,
        strokeWidth: 2,
      });
      return;
    }

    const c = STATE_COLOR[s];
    shapes.push({
      kind: "rect",
      x,
      y,
      w: BOX_W,
      h: BOX_H,
      r: 2,
      fill: c,
      stroke: mix(c, "#000000", 0.35),
      strokeWidth: 1,
    });
    shapes.push({ kind: "rect", x: x + 2, y: y + 2, w: BOX_W - 4, h: 2.5, r: 1, fill: mix(c, "#ffffff", 0.3) });
    for (const k of [1, 2]) {
      shapes.push({
        kind: "rect",
        x: x + (BOX_W * k) / 3 - 0.6,
        y: y + 6,
        w: 1.2,
        h: BOX_H - 9,
        fill: mix(c, "#000000", 0.2),
      });
    }
  });

  return {
    width: Math.ceil(xe + 1),
    height: 160 + OY,
    shapes,
    overflow: states.length - n,
    overflowAnchor: { x: x1 - 8, y: DECK + OY - 1 - rows * (BOX_H + GAP) - 3 },
  };
}

// ---------------------------------------------------------------- SVG

function shapeSvg(s: Shape): string {
  const paint = (fill?: string, stroke?: string, sw?: number) =>
    `fill="${fill ?? "none"}"` +
    (stroke ? ` stroke="${stroke}" stroke-width="${sw ?? 1}" stroke-linejoin="round"` : "");

  switch (s.kind) {
    case "path":
      return `<path d="${s.d}" ${paint(s.fill, s.stroke, s.strokeWidth)}/>`;
    case "rect":
      return (
        `<rect x="${f(s.x)}" y="${f(s.y)}" width="${f(s.w)}" height="${f(s.h)}"` +
        `${s.r ? ` rx="${s.r}"` : ""} ${paint(s.fill, s.stroke, s.strokeWidth)}/>`
      );
    case "circle":
      return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${s.r}" fill="${s.fill}"/>`;
  }
}

/** Isi SVG saja (tanpa elemen <svg>), untuk disusun di lembar lain. */
export function shapesToSvg(art: ShipArt): string {
  return art.shapes.map(shapeSvg).join("");
}

/** Label "+N" untuk container yang tidak muat. Kosong kalau tidak ada yang berlebih. */
export function overflowLabel(art: ShipArt): string {
  if (art.overflow <= 0) return "";
  const { x, y } = art.overflowAnchor;
  return (
    `<text x="${f(x)}" y="${f(y)}" text-anchor="end" font-family="system-ui, sans-serif" ` +
    `font-size="15" font-weight="700" fill="#cfe3ff">+${art.overflow}</text>`
  );
}

/** SVG lengkap. Untuk Pixi, panggil dengan { overflowLabel: false } karena teks diurus sendiri. */
export function toSvg(art: ShipArt, opts: { overflowLabel?: boolean } = {}): string {
  const { width: w, height: h } = art;
  const label = opts.overflowLabel === false ? "" : overflowLabel(art);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `${shapesToSvg(art)}${label}</svg>`
  );
}