/**
 * Kartenrückseiten zur Auswahl (Einstellungen). Jeder Spieler wählt für sich, auch mitten im Spiel; das Design wird
 * nur lokal gezeichnet und hat keinen Einfluss auf den Spielstand oder die Mitspieler.
 *
 * Neues Design: einen Eintrag in BACK_DESIGNS ergänzen. `paint` bekommt je Pixel des Felds (26 × 38, innerhalb des
 * Rahmens) die Koordinaten und liefert eine Farbrolle oder null (Grundfarbe). Der Rahmen (Tinte, Hauptfarbe, weiße
 * Kontur, abgerundete Ecken) ist für alle Designs gleich und kommt aus sprites.ts.
 *
 *   x, y     Pixel im Feld, 0 = links/oben
 *   dx, dy   Abstand zur Mitte in halben Pixeln (0.5, 1.5, …); Spiegelachsen liegen zwischen Pixeln, dx/dy sind
 *            deshalb auf beiden Seiten gleich: wer nur dx, dy benutzt, ist automatisch perfekt symmetrisch
 *
 * Rollen: main (Hauptfarbe: Orange bzw. beim zweiten Deck Dunkelgrau), dark (Orange dunkel bzw. Tinte), cream, gold.
 */
export type BackRole = 'main' | 'dark' | 'cream' | 'gold';

export interface BackPixel {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export interface BackDesign {
  id: string;
  name: string;
  paint: (p: BackPixel) => BackRole | null;
}

/** Feldgröße innerhalb des Rahmens. */
export const BACK_FIELD = { w: 26, h: 38, inset: 3 };

export const BACK_DESIGNS: BackDesign[] = [
  {
    id: 'classic',
    name: 'Klassik',
    // Feines Rautengitter: Diagonalen in beide Richtungen alle 4 Pixel, von der Mitte aus gezählt und deshalb an beiden
    // Achsen gespiegelt (u, v sind Abstände zur Mitte mit Vorzeichen; ±u und ±v erzeugen dieselbe Menge von Linien)
    paint: ({ x, y }) => {
      const u = x - (BACK_FIELD.w - 1) / 2;
      const v = y - (BACK_FIELD.h - 1) / 2;
      const m = (n: number) => ((n % 4) + 4) % 4;
      return m(u + v) === 0 || m(u - v) === 0 ? 'dark' : null;
    },
  },
  {
    id: 'raute',
    name: 'Raute',
    // Kleine Raute (Gold, Creme, Dunkel, Creme) mit Luft darum, im Hintergrund ein Rautengitter alle 6 Pixel.
    // Nur dx, dy: dadurch an beiden Achsen perfekt gespiegelt.
    paint: ({ dx, dy }) => {
      const m6 = (n: number) => ((n % 6) + 6) % 6;
      const d = dx + dy;
      if (d <= 4) return (['gold', 'cream', 'dark', 'cream'] as const)[Math.max(0, Math.min(3, Math.ceil(d) - 1))];
      if (d <= 6) return null;
      return m6(d) < 1 || m6(dx - dy) < 1 ? 'dark' : null;
    },
  },
];

export const DEFAULT_BACK = BACK_DESIGNS[0].id;

export function backDesign(id: string | undefined): BackDesign {
  return BACK_DESIGNS.find((d) => d.id === id) ?? BACK_DESIGNS[0];
}
