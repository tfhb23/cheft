import { QUADRANT_DESIGNS, QuadrantDesign } from './backs-data';

/**
 * Kartenrückseiten zur Auswahl (Einstellungen). Jeder Spieler wählt für sich, auch mitten im Spiel; das Design wird
 * nur lokal gezeichnet und hat keinen Einfluss auf den Spielstand oder die Mitspieler.
 *
 * Neues Design: einen Eintrag in FORMULA_DESIGNS (Formel) oder eine Viertelfläche in backs-data.ts ergänzen; die Reihenfolge in den
 * Einstellungen ergibt sich automatisch aus dem Detailgrad (backDetail). `paint` bekommt je Pixel des Felds (26 × 38, innerhalb des
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

const FORMULA_DESIGNS: BackDesign[] = [
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
  {
    id: 'toranj',
    name: 'Toranj',
    // Persisches Medaillon (Toranj): Raute in der Mitte, Anhänger oben und unten, Viertel-Medaillons in den Ecken,
    // im Hintergrund ein Rautengitter alle 6 Pixel.
    paint: ({ dx, dy }) => {
      const m6 = (n: number) => ((n % 6) + 6) % 6;
      const ring = (d: number, seq: readonly BackRole[]) => seq[Math.max(0, Math.min(Math.ceil(d) - 1, seq.length - 1))];
      if (Math.max(dx - 12.5, dy - 18.5) >= 0) return 'dark';
      const d = dx + dy;
      if (d <= 7) return ring(d, ['gold', 'cream', 'dark', 'cream', 'dark', 'dark', 'cream']);
      const dp = dx + Math.abs(dy - 13.5);
      if (dp <= 2) return ring(dp, ['gold', 'cream', 'dark']);
      if (dx <= 0.5 && dy >= 9.5 && dy <= 10.5) return 'dark';
      if (dx <= 0.5 && dy >= 8.5 && dy <= 11.5) return 'cream';
      const e = 13 - dx + (19 - dy);
      if (e >= 0 && e <= 6) return ring(e + 1, ['dark', 'cream', 'dark', 'cream', 'dark', 'dark', 'cream']);
      if (d <= 8.5 || dp <= 3.5 || e <= 8) return null;
      return m6(d) < 1 || m6(dx - dy) < 1 ? 'dark' : null;
    },
  },
  {
    id: 'herati',
    name: 'Herati',
    // Rauten-Zellen mit goldenen Knoten und Zickzack-Rand (Herati-Muster), dazwischen feines Raster.
    paint: ({ dx, dy }) => {
      if (Math.max(dx - 12.5, dy - 18.5) >= 0) return 'dark';
      if (Math.max(dx - 11.5, dy - 17.5) >= 0) return Math.floor(dy >= 17.5 ? dx : dy) % 2 === 0 ? 'cream' : null;
      const ring = (d: number, seq: readonly BackRole[]) => seq[Math.max(0, Math.min(Math.ceil(d) - 1, seq.length - 1))];
      for (const cx of [0, 8]) {
        for (const cy of [4, 12]) {
          const d = Math.abs(dx - cx) + Math.abs(dy - cy);
          if (d <= 3) return ring(d, ['gold', 'cream', 'dark', 'cream']);
        }
      }
      if ((Math.abs(dx - 4) < 0.6 || Math.abs(dx - 12) < 0.6) && (Math.abs(dy) < 0.6 || Math.abs(dy - 8) < 0.6 || Math.abs(dy - 16) < 0.6)) return 'gold';
      return (Math.floor(dx) + Math.floor(dy)) % 4 === 0 ? 'dark' : null;
    },
  },
  {
    id: 'rosette',
    name: 'Rosette',
    // Rosette mit zwölf Blättchen, Viertel-Medaillons in den Ecken, Zickzack-Rand, Punktraster im Hintergrund.
    paint: ({ dx, dy }) => {
      const ring = (d: number, seq: readonly BackRole[]) => seq[Math.max(0, Math.min(Math.ceil(d) - 1, seq.length - 1))];
      if (Math.max(dx - 12.5, dy - 18.5) >= 0) return 'dark';
      if (Math.max(dx - 11.5, dy - 17.5) >= 0) return Math.floor(dy >= 17.5 ? dx : dy) % 2 === 0 ? 'cream' : null;
      const r = Math.hypot(dx, dy);
      if (r <= 7.6) {
        if (r <= 1.5) return 'gold';
        if (r <= 3.2) return 'cream';
        if (r <= 4.2) return 'dark';
        if (r <= 6.5) {
          const petal = Math.abs(Math.cos(4 * Math.atan2(dy, dx))) > 0.55;
          return r > 5.4 ? (petal ? 'cream' : 'dark') : petal ? 'dark' : 'main';
        }
        return 'cream';
      }
      const e = 13 - dx + (19 - dy);
      if (e >= 0 && e <= 5) return ring(e + 1, ['dark', 'cream', 'dark', 'cream', 'dark']);
      if (r <= 10) return null;
      return Math.floor(dx) % 4 === 1 && Math.floor(dy) % 4 === 1 ? 'dark' : null;
    },
  },
  {
    id: 'lotus',
    name: 'Lotus',
    // Lotus (Scheibe mit acht Blättern) in der Mitte, im Hintergrund ein Raster aus kleinen Ringen mit Mittelpunkt.
    paint: ({ dx, dy }) => {
      if (Math.max(dx - 12.5, dy - 18.5) >= 0) return 'dark';
      const r = Math.hypot(dx, dy);
      if (r <= 1.6) return 'gold';
      if (r <= 2.6) return 'cream';
      if (r <= 4.6) return 'dark';
      if (r <= 5.6) return 'cream';
      for (const [px, py] of [[8, 0], [0, 8], [6, 6]]) {
        const e = Math.abs(dx - px) + Math.abs(dy - py);
        if (e <= (px === 6 ? 2 : 2.5)) return e > 1.5 ? 'cream' : 'dark';
      }
      if (r <= 10) return null;
      const m8 = (n: number) => ((n % 8) + 8) % 8;
      const d = Math.hypot(m8(dx) - 4, m8(dy) - 4);
      return d <= 0.8 || (d >= 2.6 && d <= 3.3) ? 'dark' : null;
    },
  },
  {
    id: 'sonne',
    name: 'Sonne',
    // Sonne mit gezacktem Rand in der Mitte, im Hintergrund Kreise mit Achsenkreuz, Viertel-Medaillons in den Ecken.
    paint: ({ dx, dy }) => {
      const ring = (d: number, seq: readonly BackRole[]) => seq[Math.max(0, Math.min(Math.ceil(d) - 1, seq.length - 1))];
      if (Math.max(dx - 12.5, dy - 18.5) >= 0) return 'dark';
      const r = Math.hypot(dx, dy);
      if (r <= 4) return r <= 1.5 ? 'gold' : r <= 3 ? 'cream' : 'dark';
      const zack = 5.2 + (Math.abs(Math.cos(6 * Math.atan2(dy, dx))) > 0.5 ? 1.6 : 0);
      if (r <= zack + (r > 5 ? 1 : 0)) return r > 4.8 ? 'cream' : 'main';
      const e = 13 - dx + (19 - dy);
      if (e >= 0 && e <= 6) return ring(e + 1, ['dark', 'cream', 'dark', 'cream', 'dark', 'dark']);
      if (r <= 8.5) return null;
      const n = Math.floor(r);
      if (n % 4 === 0) return 'dark';
      return (dx <= 0.5 || dy <= 0.5) && n % 2 === 0 ? 'dark' : null;
    },
  },
  {
    id: 'ring',
    name: 'Ring',
    // Kleiner leerer Kreis (6 Pixel) in der Mitte, im Hintergrund Kreise im Abstand von 3 Pixeln.
    paint: ({ dx, dy }) => {
      if (Math.max(dx - 12.5, dy - 18.5) >= 0) return 'dark';
      const r = Math.hypot(dx, dy);
      if (r > 2.1 && r <= 3.1) return 'cream';
      if (r <= 5.5) return null;
      return Math.floor(r) % 3 === 0 ? 'dark' : null;
    },
  },
];

/** Design aus einer Viertelfläche (obere linke Ecke, 13 × 19 Pixel), an beiden Achsen gespiegelt. */
function fromQuadrant(q: QuadrantDesign): BackDesign {
  const roles: Record<string, BackRole | null> = { '.': null, d: 'dark', c: 'cream', g: 'gold' };
  return {
    id: q.id,
    name: q.name,
    paint: ({ x, y }) => roles[q.rows[Math.min(y, BACK_FIELD.h - 1 - y)][Math.min(x, BACK_FIELD.w - 1 - x)]],
  };
}

/** Detailgrad: Anzahl der Farbwechsel zwischen Nachbarpixeln im Feld. Je höher, desto detailreicher und prunkvoller. */
export function backDetail(d: BackDesign): number {
  const at = (x: number, y: number) => d.paint({ x, y, dx: Math.abs(x - (BACK_FIELD.w - 1) / 2), dy: Math.abs(y - (BACK_FIELD.h - 1) / 2) }) ?? 'main';
  let n = 0;
  for (let y = 0; y < BACK_FIELD.h; y++) {
    for (let x = 0; x < BACK_FIELD.w; x++) {
      if (x + 1 < BACK_FIELD.w && at(x, y) !== at(x + 1, y)) n++;
      if (y + 1 < BACK_FIELD.h && at(x, y) !== at(x, y + 1)) n++;
    }
  }
  return n;
}

/**
 * Reihenfolge in den Einstellungen: von einfach (ein kleines Element, ruhiges Muster) zu detailreich und prunkvoll
 * (Ornamente, Ränder, dichte Muster). Von Hand nach Anblick sortiert; backDetail dient dabei nur als Anhaltspunkt für
 * das dichte Ende. Ein neues Design bekommt hier seinen Platz (der Test erzwingt das).
 */
export const BACK_ORDER = [
  'classic', 'ring', 'raute', 'lotus', 'sonne', 'stern', 'rosette', 'raute-ecken', 'achtecke-2', 'faecher-4',
  'medaillon-schach', 'strahlen-1', 'strahlen-2', 'toranj', 'kartusche-2', 'kartusche-1', 'kartusche-4', 'kartusche-3',
  'stern-rahmen', 'ranken-1', 'ranken-2', 'zwei-kreise', 'faecher-3', 'faecher-2', 'faecher-1', 'achtecke-1',
  'guilloche-3', 'guilloche-1', 'guilloche-2', 'loewe-sonne', 'gitter-2', 'gitter-1', 'gitter-4', 'gitter-3', 'herati',
  'schlacht', 'geometrie-3', 'geometrie-2', 'geometrie-5', 'geometrie-4', 'geometrie-1',
];

const ALL_DESIGNS: BackDesign[] = [...FORMULA_DESIGNS, ...QUADRANT_DESIGNS.map(fromQuadrant)];

export const BACK_DESIGNS: BackDesign[] = BACK_ORDER.map((id) => ALL_DESIGNS.find((d) => d.id === id)!).filter(Boolean);

/** Designs, die in BACK_ORDER fehlen (für den Test). */
export const BACK_UNSORTED: string[] = ALL_DESIGNS.filter((d) => !BACK_ORDER.includes(d.id)).map((d) => d.id);

export const DEFAULT_BACK = 'classic';

export function backDesign(id: string | undefined): BackDesign {
  return BACK_DESIGNS.find((d) => d.id === id) ?? BACK_DESIGNS.find((d) => d.id === DEFAULT_BACK)!;
}
