/**
 * Kontur der Ablage als Ablageziel (Design 6.44): eine geschlossene Linie im Abstand `gap` um die Umrisse aller Ablagekarten.
 * Reine Rechnung ohne DOM: Jedes Pixel wird auf Abstand zu den (gedrehten) Kartenvierecken geprüft, der Rand der so
 * entstehenden Fläche wird abgelaufen (Moore) und als Pfad zurückgegeben. Pixelgenau, darum passt die Linie zum Pixel-Look.
 */
export type Pt = [number, number];

export interface Contour {
  /** Pfad in Koordinaten relativ zu (x, y). */
  d: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const DIRS: Pt[] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

function segDist(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len2));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

/** Liegt der Punkt höchstens `gap` vom konvexen Viereck entfernt (oder darin)? */
function near(px: number, py: number, poly: Pt[], gap: number): boolean {
  let pos = false;
  let neg = false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cr = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
    if (cr > 0) pos = true;
    else if (cr < 0) neg = true;
  }
  if (!(pos && neg)) return true;
  for (let i = 0; i < poly.length; i++) if (segDist(px, py, poly[i], poly[(i + 1) % poly.length]) <= gap) return true;
  return false;
}

export function discardContour(polys: Pt[][], gap: number): Contour | null {
  if (polys.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of polys) for (const [x, y] of p) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const ox = Math.floor(minX - gap) - 1;
  const oy = Math.floor(minY - gap) - 1;
  const w = Math.ceil(maxX + gap) + 2 - ox;
  const h = Math.ceil(maxY + gap) + 2 - oy;
  const mask = new Uint8Array(w * h);
  for (const p of polys) {
    const bx0 = Math.max(0, Math.floor(Math.min(...p.map((q) => q[0])) - gap) - ox);
    const bx1 = Math.min(w - 1, Math.ceil(Math.max(...p.map((q) => q[0])) + gap) - ox);
    const by0 = Math.max(0, Math.floor(Math.min(...p.map((q) => q[1])) - gap) - oy);
    const by1 = Math.min(h - 1, Math.ceil(Math.max(...p.map((q) => q[1])) + gap) - oy);
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if (!mask[y * w + x] && near(ox + x + 0.5, oy + y + 0.5, p, gap)) mask[y * w + x] = 1;
  }
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  let sx = -1;
  let sy = -1;
  outer: for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) { sx = x; sy = y; break outer; }
  if (sx < 0) return null;
  let x = sx;
  let y = sy;
  let dir = 6;
  const pts: Pt[] = [[x, y]];
  for (let i = 0; i < 4 * w * h; i++) {
    let moved = false;
    for (let k = 0; k < 8; k++) {
      const nd = (dir + 6 + k) % 8;
      const nx = x + DIRS[nd][0];
      const ny = y + DIRS[nd][1];
      if (on(nx, ny)) { x = nx; y = ny; dir = nd; moved = true; break; }
    }
    if (!moved || (x === sx && y === sy)) break;
    pts.push([x, y]);
  }
  // Nur die Eckpunkte behalten
  const keep = pts.filter((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length];
    const b = pts[(i + 1) % pts.length];
    return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
  });
  const d = 'M' + keep.map(([px, py]) => `${px + 0.5} ${py + 0.5}`).join('L') + 'Z';
  return { d, x: ox, y: oy, w, h };
}
