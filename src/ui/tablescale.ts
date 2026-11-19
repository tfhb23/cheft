/**
 * Kartengrößen am Tisch: Auslagen (aller Sitze, auch die eigene) und Mitte (Stapel, Ablage, Teppichkarte) haben je eine Stufe.
 * Die Handkarten bleiben bei ihrer Größe (--s).
 *
 * Pixelkarten sehen nur dann gleichmäßig aus, wenn ein Kartenpixel eine ganze Zahl von Geräte-Pixeln groß ist. Die erlaubten
 * Stufen sind darum n ÷ Pixeldichte (Dichte 1: 1, 2, 3 · Dichte 2: 1, 1,5, 2 … · Dichte 3: 1, 1,33, 1,67 …).
 * Die Mitte darf höchstens MAX_RATIO mal so groß sein wie die Auslagen, damit alles ähnlich groß wirkt.
 * Es gibt keine feste Obergrenze: Die Reihenfolge beginnt bei der größten Stufe (TOP) und geht schrittweise nach unten, bis alles
 * auf den Bildschirm passt. START ist nur die Bezugsgröße der Geräteklasse: Wer darunter landet, verliert die Beschriftungen der Mitte.
 */

export const MAX_RATIO = 1.75;
const MIN_STEP = 0.95;
/** Größte Stufe, die überhaupt probiert wird (passt sie nicht, geht es nach unten). */
const MAX_STEP = 4.05;

export interface ScaleStep {
  /** Stufe der Auslagen (alle Sitze). */
  a: number;
  /** Stufe der Mitte. */
  c: number;
}

export type DeviceClass = 'phoneNarrow' | 'phone' | 'tablet' | 'desktop';

/** Bezugsgrößen je Geräteklasse (Auslagen / Mitte), auf die Stufen des Bildschirms gerundet: Darunter entfallen die Beschriftungen. */
export const START: Record<DeviceClass, ScaleStep> = {
  phoneNarrow: { a: 1, c: 1.75 },
  phone: { a: 1.5, c: 1.75 },
  tablet: { a: 2, c: 2 },
  desktop: { a: 3, c: 3 },
};

/** Geräteklasse nach Fenstergröße (gleiche Umschaltpunkte wie der Maßstab der Handkarten, siehe SCALE_TOKENS). */
export function deviceClass(width: number, height: number): DeviceClass {
  if (width >= 1000 && height >= 860) return 'desktop';
  if (width >= 700) return 'tablet';
  return width <= 380 ? 'phoneNarrow' : 'phone';
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** Erlaubte Stufen für diese Pixeldichte, aufsteigend. Ganze Geräte-Pixel je Kartenpixel; 1 als Notstufe, wenn nichts Kleines dabei ist. */
export function scaleGrid(dpr: number): number[] {
  const d = dpr > 0 ? dpr : 1;
  const out: number[] = [];
  for (let n = 1; n / d <= MAX_STEP + 1e-9; n++) {
    const v = r3(n / d);
    if (v >= MIN_STEP) out.push(v);
  }
  if (!out.some((v) => v < 1.2)) out.unshift(1);
  return out;
}

/** Größte Stufe des Rasters, die das Ziel (mit kleiner Toleranz) nicht überschreitet; gibt es keine, die kleinste. */
export function snap(grid: number[], target: number, tol = 0.05): number {
  let best = grid[0];
  for (const v of grid) if (v <= target + tol + 1e-9) best = v;
  return best;
}

/** Bezugsgröße des Geräts (Auslagen / Mitte), auf das Raster gerundet. Die Mitte ist nie kleiner als die Auslagen. */
export function baseStep(dpr: number, cls: DeviceClass): ScaleStep {
  const grid = scaleGrid(dpr);
  const a = snap(grid, START[cls].a);
  return { a, c: Math.max(a, snap(grid, START[cls].c)) };
}

/**
 * Alle zulässigen Kombinationen, von groß nach klein: Mitte nie kleiner als die Auslagen und höchstens MAX_RATIO mal so groß.
 * Keine Rücksicht auf die Größe der Handkarten: Wenn Platz da ist, darf der Tisch größer sein als die Hand.
 */
export function tableLadder(dpr: number): ScaleStep[] {
  const grid = scaleGrid(dpr);
  const steps: ScaleStep[] = [];
  for (const a of grid) {
    for (const c of grid) {
      if (c < a - 1e-9 || c > MAX_RATIO * a + 1e-9) continue;
      steps.push({ a, c });
    }
  }
  // Größte Summe zuerst; bei Gleichstand die mit den größeren Auslagen (weniger Unterschied zwischen den Karten)
  steps.sort((x, y) => y.a + y.c - (x.a + x.c) || y.a - x.a);
  return steps;
}
