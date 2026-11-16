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
    // Das bisherige feine Rautengitter (Diagonalen alle 4 Pixel), ohne Mittelstück
    paint: ({ x, y }) => {
      const xx = x + BACK_FIELD.inset;
      const yy = y + BACK_FIELD.inset;
      return (xx + yy) % 4 === 0 || (xx - yy + 400) % 4 === 0 ? 'dark' : null;
    },
  },
];

export const DEFAULT_BACK = BACK_DESIGNS[0].id;

export function backDesign(id: string | undefined): BackDesign {
  return BACK_DESIGNS.find((d) => d.id === id) ?? BACK_DESIGNS[0];
}
