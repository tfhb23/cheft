/**
 * Vorlieben („menschliche Eigenheiten“): Jeder Bot bekommt für ein ganzes Spiel zufällig ein paar Vorlieben und Abneigungen,
 * zum Beispiel „sammelt gern Herz“, „mag ungerade Zahlen“, „Glückszahl 7, Unglückszahl König“ oder „lieber Folgen als Sätze“.
 * Sie wirken nur beim Abwerfen und nur als sanfter Zuschlag, wenn ohnehin keine Karte klar besser zu behalten ist:
 *  - Je mehr eine Karte zu einer fertigen oder fast fertigen Kombination beiträgt, desto weniger zählt die Vorliebe (Schutz);
 *  - im Ernstfall (ein Gegner ist fast draußen) gilt sie gar nicht;
 *  - der Gesamteinfluss ist gedeckelt.
 * Die Vorlieben ergeben sich aus Spiel und Platz (Seed), bleiben also über alle Runden und nach einem Neustart gleich.
 */
import { Card, makeRng } from '../engine/cards';

export type SuitCode = 'H' | 'D' | 'C' | 'S';
export type RangeName = 'low' | 'mid' | 'face' | 'ace';

export type TasteSpec =
  | { kind: 'suit'; suit: SuitCode }
  | { kind: 'color'; color: 'red' | 'black' }
  | { kind: 'range'; range: RangeName }
  | { kind: 'parity'; odd: boolean }
  | { kind: 'ranks'; ranks: number[] }
  | { kind: 'cards'; cards: { suit: SuitCode; rank: number }[] }
  /** Alles muss passen: z. B. schwarze Bildkarten, Herz ab 8. */
  | { kind: 'combo'; suit?: SuitCode; color?: 'red' | 'black'; range?: RangeName; minRank?: number }
  /** Eine der Teilvorlieben genügt: „alle Sechser, alle Neuner und der Herz-Bube“. */
  | { kind: 'union'; parts: TasteSpec[] };

export interface Taste {
  spec: TasteSpec;
  /** Positiv = mag (behält lieber), negativ = mag nicht (wirft lieber ab). Gewicht in Punkten des Abwurf-Bewertungsmaßes. */
  weight: number;
  /** Aberglaube (Glückszahl / Unglückszahl) statt gewöhnlicher Vorliebe. */
  superstition?: boolean;
}

export interface Structure {
  /** Faktoren auf den Behaltewert von Sätzen, Folgen und Paaren (1 = neutral). */
  set: number;
  run: number;
  pair: number;
}

export interface TasteSet {
  tastes: Taste[];
  structure?: Structure;
  /** Wie stark sich der Bot von seinen Vorlieben leiten lässt (0,2 fast gleichgültig bis 1,5 sehr). */
  intensity: number;
}

/** Deckel für den Zuschlag einer Karte (vor der Intensität). */
export const TASTE_CAP = 9;

// ---------------------------------------------------------------- Passen

const RANGE: Record<RangeName, (r: number) => boolean> = {
  low: (r) => r >= 2 && r <= 6,
  mid: (r) => r >= 7 && r <= 10,
  face: (r) => r >= 11,
  ace: (r) => r === 1,
};
const isRed = (s: string) => s === 'H' || s === 'D';

export function matches(spec: TasteSpec, c: Pick<Card, 'suit' | 'rank'>): boolean {
  if (c.suit === 'J') return false;
  switch (spec.kind) {
    case 'suit':
      return c.suit === spec.suit;
    case 'color':
      return isRed(c.suit) === (spec.color === 'red');
    case 'range':
      return RANGE[spec.range](c.rank);
    case 'parity':
      return c.rank >= 2 && c.rank <= 10 && c.rank % 2 === (spec.odd ? 1 : 0);
    case 'ranks':
      return spec.ranks.includes(c.rank);
    case 'cards':
      return spec.cards.some((x) => x.suit === c.suit && x.rank === c.rank);
    case 'combo':
      return (
        (spec.suit === undefined || c.suit === spec.suit) &&
        (spec.color === undefined || isRed(c.suit) === (spec.color === 'red')) &&
        (spec.range === undefined || RANGE[spec.range](c.rank)) &&
        (spec.minRank === undefined || c.rank >= spec.minRank)
      );
    case 'union':
      return spec.parts.some((p) => matches(p, c));
  }
}

/** Zuschlag (positiv = behalten) für eine Karte vor dem Schutz, gedeckelt und mit der Intensität des Bots. */
export function tasteScore(set: TasteSet, c: Pick<Card, 'suit' | 'rank'>): number {
  if (c.suit === 'J' || !(set.intensity > 0)) return 0;
  let s = 0;
  for (const t of set.tastes) if (matches(t.spec, c)) s += t.weight;
  return Math.max(-TASTE_CAP, Math.min(TASTE_CAP, s)) * set.intensity;
}

// ---------------------------------------------------------------- Beschreibung (für die Endauswertung)

const SUIT_NAME: Record<SuitCode, string> = { H: 'Herz', D: 'Karo', C: 'Kreuz', S: 'Pik' };
const RANK_PLURAL: Record<number, string> = { 1: 'Asse', 2: 'Zweier', 3: 'Dreier', 4: 'Vierer', 5: 'Fünfer', 6: 'Sechser', 7: 'Siebener', 8: 'Achter', 9: 'Neuner', 10: 'Zehner', 11: 'Buben', 12: 'Damen', 13: 'Könige' };
const RANK_SINGLE: Record<number, string> = { 1: 'Ass', 2: 'Zwei', 3: 'Drei', 4: 'Vier', 5: 'Fünf', 6: 'Sechs', 7: 'Sieben', 8: 'Acht', 9: 'Neun', 10: 'Zehn', 11: 'Bube', 12: 'Dame', 13: 'König' };
const RANGE_NAME: Record<RangeName, string> = { low: 'niedrige Karten (2 bis 6)', mid: 'mittlere Karten (7 bis 10)', face: 'Bildkarten', ace: 'Asse' };

export function describeSpec(spec: TasteSpec): string {
  switch (spec.kind) {
    case 'suit':
      return `${SUIT_NAME[spec.suit]}karten`;
    case 'color':
      return spec.color === 'red' ? 'rote Karten' : 'schwarze Karten';
    case 'range':
      return RANGE_NAME[spec.range];
    case 'parity':
      return spec.odd ? 'ungerade Zahlen' : 'gerade Zahlen';
    case 'ranks':
      return 'die ' + spec.ranks.map((r) => RANK_PLURAL[r] ?? String(r)).join(' und ');
    case 'cards':
      return spec.cards.map((x) => `${SUIT_NAME[x.suit]} ${RANK_SINGLE[x.rank] ?? x.rank}`).join(' und ');
    case 'combo': {
      const parts: string[] = [];
      if (spec.color) parts.push(spec.color === 'red' ? 'rote' : 'schwarze');
      if (spec.suit) parts.push(SUIT_NAME[spec.suit] + '-');
      const base = spec.range === 'face' ? 'Bildkarten' : spec.range === 'low' ? 'niedrige Karten' : spec.range === 'mid' ? 'mittlere Karten' : spec.range === 'ace' ? 'Asse' : 'Karten';
      const text = parts.length ? (spec.suit ? `${SUIT_NAME[spec.suit]}${spec.range ? '-' + base : 'karten'}` : `${parts.join(' ')} ${base}`) : base;
      return spec.minRank ? `${text} ab ${spec.minRank > 10 ? RANK_SINGLE[spec.minRank] : spec.minRank}` : text;
    }
    case 'union':
      return spec.parts.map(describeSpec).join(' und ');
  }
}

export function describeTaste(t: Taste): string {
  const what = describeSpec(t.spec);
  if (t.superstition) {
    const rank = t.spec.kind === 'ranks' ? RANK_SINGLE[t.spec.ranks[0]] : what;
    return t.weight >= 0 ? `Glückszahl ${rank}` : `Unglückszahl ${rank}`;
  }
  return t.weight >= 0 ? `mag ${what}` : `mag keine ${what.replace(/^die /, '')}`;
}

export function describeTasteSet(set: TasteSet): string[] {
  const out = set.tastes.map(describeTaste);
  if (set.structure) {
    const { set: s, run, pair } = set.structure;
    if (s > 1.05 && s >= run && s >= pair) out.push('sammelt lieber Sätze');
    else if (run > 1.05 && run >= pair) out.push('sammelt lieber Folgen');
    else if (pair > 1.05) out.push('sammelt lieber Paare');
  }
  return out;
}

// ---------------------------------------------------------------- Zufall: Vorlieben je Spiel und Platz

function hash(...vals: number[]): number {
  let h = 0x2545f491;
  for (const v of vals) {
    h = Math.imul(h ^ (v | 0), 0x9e3779b1);
    h = (h ^ (h >>> 15)) >>> 0;
  }
  return h >>> 0;
}

const SUITS: SuitCode[] = ['H', 'D', 'C', 'S'];
/** Zusätzlicher Faktor für Vorlieben, die den Abwurf unübersichtlich machen (gerade/ungerade). */
const COST_FACTOR: Record<string, number> = { parity: 0.85 };

type Rng = () => number;
const pick = <T>(rng: Rng, xs: T[]): T => xs[Math.floor(rng() * xs.length) % xs.length];
const chooseWeighted = <T>(rng: Rng, xs: [T, number][]): T => {
  const total = xs.reduce((s, [, w]) => s + w, 0);
  let u = rng() * total;
  for (const [x, w] of xs) {
    u -= w;
    if (u <= 0) return x;
  }
  return xs[xs.length - 1][0];
};
function distinct(rng: Rng, n: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  while (out.length < n) {
    const r = lo + Math.floor(rng() * (hi - lo + 1));
    if (!out.includes(r)) out.push(r);
  }
  return out.sort((a, b) => a - b);
}
const randomCard = (rng: Rng) => ({ suit: pick(rng, SUITS), rank: 1 + Math.floor(rng() * 13) });

function simpleSpec(rng: Rng): TasteSpec {
  const kind = chooseWeighted<'suit' | 'color' | 'range' | 'parity' | 'ranks' | 'cards' | 'combo'>(rng, [
    ['suit', 14],
    ['color', 8],
    ['range', 12],
    ['parity', 8],
    ['ranks', 20],
    ['cards', 12],
    ['combo', 18],
  ]);
  switch (kind) {
    case 'suit':
      return { kind, suit: pick(rng, SUITS) };
    case 'color':
      return { kind, color: rng() < 0.5 ? 'red' : 'black' };
    case 'range':
      return { kind, range: pick<RangeName>(rng, ['low', 'mid', 'face', 'face', 'ace']) };
    case 'parity':
      return { kind, odd: rng() < 0.5 };
    case 'ranks':
      return { kind, ranks: distinct(rng, 1 + Math.floor(rng() * 3), 1, 13) };
    case 'cards':
      return { kind, cards: Array.from({ length: 1 + Math.floor(rng() * 3) }, () => randomCard(rng)) };
    case 'combo': {
      const shape = Math.floor(rng() * 3);
      if (shape === 0) return { kind, color: rng() < 0.5 ? 'red' : 'black', range: 'face' };
      if (shape === 1) return { kind, suit: pick(rng, SUITS), minRank: 8 + Math.floor(rng() * 3) };
      return { kind, suit: pick(rng, SUITS), range: pick<RangeName>(rng, ['low', 'mid', 'face']) };
    }
  }
}

/**
 * Wie teuer ist die Richtung dieser Vorliebe? Gemessen kostet es viel, niedrige Karten zu behalten (6 bis 8 Strafpunkte pro Runde),
 * ebenso, Bildkarten und Asse früh loszuwerden; Bildkarten oder Asse zu behalten ist dagegen frei. Teure Richtungen bekommen ein
 * deutlich kleineres Gewicht (die Vorliebe bleibt, wirkt aber nur noch als sanfter Hang).
 */
function costFactor(spec: TasteSpec, weight: number): number {
  if (spec.kind === 'range') {
    if (spec.range === 'low') return weight > 0 ? 0.15 : 1;
    if (spec.range === 'face' || spec.range === 'ace') return weight < 0 ? 0.3 : 1;
  }
  if (spec.kind === 'combo' && spec.range) return costFactor({ kind: 'range', range: spec.range }, weight);
  if (spec.kind === 'parity') return COST_FACTOR.parity;
  if (spec.kind === 'union') return Math.min(...spec.parts.map((p) => costFactor(p, weight)));
  return 1;
}

/** Zufällige Vorlieben für diesen Spieler in diesem Spiel (deterministisch aus Seed und Platz). */
export function tastesFor(seed: number, pid: number): TasteSet {
  const rng = makeRng(hash(seed, pid, 4711));
  const tastes: Taste[] = [];
  const nPos = chooseWeighted(rng, [[1, 45], [2, 35], [3, 20]] as [number, number][]);
  for (let i = 0; i < nPos; i++) {
    // Manche Vorlieben sind „große Spannen“: mehrere Teile in einer (alle Sechser, alle Neuner plus Herz-Bube)
    const spec: TasteSpec =
      rng() < 0.22 ? { kind: 'union', parts: Array.from({ length: 2 + Math.floor(rng() * 2) }, () => simpleSpec(rng)) } : simpleSpec(rng);
    const base = i === 0 ? 4 + rng() * 2 : 2 + rng() * 1.5;
    tastes.push({ spec, weight: base * costFactor(spec, 1) });
  }
  if (rng() < 0.4) {
    // Abneigung: lieber nicht behalten
    const spec = simpleSpec(rng);
    tastes.push({ spec, weight: -(1.5 + rng() * 2.5) * costFactor(spec, -1) });
  }
  if (rng() < 0.25) tastes.push({ spec: { kind: 'ranks', ranks: [1 + Math.floor(rng() * 13)] }, weight: 3.5, superstition: true });
  if (rng() < 0.25) tastes.push({ spec: { kind: 'ranks', ranks: [rng() < 0.5 ? 13 : 1 + Math.floor(rng() * 13)] }, weight: -3, superstition: true });
  let structure: Structure | undefined;
  const sr = rng();
  if (sr < 0.2) structure = { set: 1.35, run: 0.75, pair: 1 };
  else if (sr < 0.4) structure = { set: 0.75, run: 1.35, pair: 1 };
  else if (sr < 0.5) structure = { set: 1, run: 1, pair: 1.5 };
  const intensity = rng() < 0.12 ? 0.2 : 0.5 + rng();
  return { tastes, structure, intensity };
}

