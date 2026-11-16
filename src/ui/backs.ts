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
  {
    id: 'stern',
    name: 'Stern',
    // Achtzackiger Stern mit Schachbrett-Kern; im Hintergrund wachsen seine Konturen in dunklen Linien weiter (alle 3 Pixel),
    // dahinter ein dezentes Punktraster. Nur dx, dy: perfekt gespiegelt.
    paint: ({ dx, dy }) => {
      const inStar = (a: number, b: number) => Math.max(dx, dy) <= a || dx + dy <= b;
      const A0 = 5.5;
      const B0 = 8.5;
      if (inStar(A0, B0) && !inStar(A0 - 1, B0 - 1)) return 'cream';
      if (inStar(A0 - 1, B0 - 1)) {
        const d = dx + dy;
        if (d <= 1) return 'gold';
        if (d <= 2) return 'cream';
        if (Math.max(dx, dy) <= 2.5) return 'dark';
        return Math.floor(d) % 2 ? null : 'dark';
      }
      if (Math.max(dx - 12.5, dy - 18.5) >= 0) return 'dark';
      for (let k = 1; k <= 3; k++) {
        if (inStar(A0 + 3 * k, B0 + 3 * k) && !inStar(A0 + 3 * k - 1, B0 + 3 * k - 1)) return 'dark';
      }
      return (Math.floor(dx) + Math.floor(dy)) % 3 === 0 && Math.floor(dx) % 2 === 0 ? 'dark' : null;
    },
  },
  {
    id: 'raute-ecken',
    name: 'Raute mit Ecken',
    // Große Raute (7 Ringe) im Diagonalgitter, dunkler Rand und Eck-Klammern in Creme, die an die weiße Kontur stoßen.
    paint: ({ dx, dy }) => {
      const m4 = (n: number) => ((n % 4) + 4) % 4;
      const a = Math.floor(12.5 - dx);
      const b = Math.floor(18.5 - dy);
      if ((a === 1 && b <= 7) || (b === 1 && a <= 7)) return 'cream';
      if (a <= 0 || b <= 0) return 'dark';
      const d = dx + dy;
      if (d <= 7) return (['gold', 'cream', 'dark', 'cream', 'dark', 'dark', 'cream'] as const)[Math.max(0, Math.ceil(d) - 1)];
      if (d <= 8.5) return null;
      return m4(d) === 0 || m4(dx - dy) === 0 ? 'dark' : null;
    },
  },
];

export const DEFAULT_BACK = BACK_DESIGNS[0].id;

export function backDesign(id: string | undefined): BackDesign {
  return BACK_DESIGNS.find((d) => d.id === id) ?? BACK_DESIGNS[0];
}
