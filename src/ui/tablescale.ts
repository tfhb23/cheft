/**
 * Kartengrößen am Tisch: Auslagen (aller Sitze, auch die eigene) und Mitte (Stapel, Ablage, Teppichkarte) haben je eine Stufe.
 * Die Handkarten bleiben bei ihrer Größe (--s).
 *
 * Pixelkarten sehen nur dann gleichmäßig aus, wenn ein Kartenpixel eine ganze Zahl von Geräte-Pixeln groß ist. Die erlaubten
 * Stufen sind darum n ÷ Pixeldichte (Dichte 1: 1, 2, 3 · Dichte 2: 1, 1,5, 2 … · Dichte 3: 1, 1,33, 1,67 …).
 * Die Mitte darf höchstens MAX_RATIO mal so groß sein wie die Auslagen, damit alles ähnlich groß wirkt.
 * Beim Verkleinern geht es von der Startgröße der Geräteklasse schrittweise nach unten, bis alles passt.
 */

export const MAX_RATIO = 1.75;
const MIN_STEP = 0.95;
const MAX_STEP = 3.05;

export interface ScaleStep {
  /** Stufe der Auslagen (alle Sitze). */
  a: number;
  /** Stufe der Mitte. */
  c: number;
}

export type DeviceClass = 'phoneNarrow' | 'phone' | 'tablet' | 'desktop';

/** Startgrößen je Geräteklasse (Auslagen / Mitte) = Größe der Handkarten, bevor sie auf die Stufen des Bildschirms gerundet werden. */
export const START: Record<DeviceClass, ScaleStep> = {
  phoneNarrow: { a: 2, c: 2 },
  phone: { a: 2, c: 2 },
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

/**
 * Alle zulässigen Kombinationen, von groß nach klein: Mitte nie kleiner als die Auslagen und höchstens MAX_RATIO mal so groß.
 * `handScale` ist die Größe der Handkarten: Nichts am Tisch wird größer.
 */
export function tableLadder(dpr: number, cls: DeviceClass, handScale: number): ScaleStep[] {
  const grid = scaleGrid(dpr);
  const cap = (v: number) => Math.min(v, handScale);
  const a0 = snap(grid, cap(START[cls].a));
  let c0 = snap(grid, cap(START[cls].c));
  if (c0 < a0) c0 = a0;
  const steps: ScaleStep[] = [];
  for (const a of grid) {
    if (a > a0 + 1e-9) continue;
    for (const c of grid) {
      if (c > c0 + 1e-9 || c < a - 1e-9 || c > MAX_RATIO * a + 1e-9) continue;
      steps.push({ a, c });
    }
  }
  // Größte Summe zuerst; bei Gleichstand die mit den größeren Auslagen (weniger Unterschied zwischen den Karten)
  steps.sort((x, y) => y.a + y.c - (x.a + x.c) || y.a - x.a);
  // Reicht die Startgröße nicht aus, steht sie trotzdem an erster Stelle (Raster und Verhältnis erlauben sie immer)
  if (steps.length === 0) steps.push({ a: a0, c: c0 });
  return steps;
}
