/**
 * Kombinationen: Folgen (run), Sätze (set) und Cheft-Paare (pair),
 * inklusive Joker-Vertretung, Anlegen, Joker klauen und Partitionssuche.
 */
import { Card, Suit, isJoker, rankValue, sameCard } from './cards';

export type MeldType = 'run' | 'set' | 'pair';

export interface Meld {
  id: number;
  owner: number;
  type: MeldType;
  /** Bei Folgen geordnet von unten nach oben (Joker an ihrer Position). */
  cards: Card[];
  /** Folge: Farbe. Paar: Farbe der vertretenen Karte (undefined bei Joker+Joker). */
  suit?: Suit;
  /** Folge: Rang an Position 0 (1 = Ass unten ... 14 = Ass oben). */
  startRank?: number;
  /** Satz / Paar: Rang (undefined bei Joker+Joker-Paar). */
  rank?: number;
}

/** Form einer noch nicht ausgelegten Kombination (ohne id/owner). */
export type MeldShape = Omit<Meld, 'id' | 'owner'>;

export const ALL_TYPES: MeldType[] = ['run', 'set', 'pair'];
export const ROMME_TYPES: MeldType[] = ['run', 'set'];

// ---------------------------------------------------------------- Augen

export function meldAugen(m: MeldShape): number {
  if (m.type === 'run') {
    let sum = 0;
    for (let i = 0; i < m.cards.length; i++) sum += rankValue(m.startRank! + i);
    return sum;
  }
  const v = m.rank === undefined ? 0 : rankValue(m.rank === 1 ? 14 : m.rank);
  return v * m.cards.length;
}

// ---------------------------------------------------------------- Erkennen

/** Alle gültigen Anordnungen der Karten als Folge (Ass unten/oben, Joker-Verteilung). */
export function asRunAll(cards: Card[]): MeldShape[] {
  if (cards.length < 3 || cards.length > 14) return [];
  const real = cards.filter((c) => !isJoker(c));
  const jokers = cards.filter(isJoker);
  if (real.length === 0) return [];
  const suit = real[0].suit as Suit;
  if (real.some((c) => c.suit !== suit)) return [];
  const nonAces = real.filter((c) => c.rank !== 1);
  const aces = real.filter((c) => c.rank === 1);
  if (aces.length > 2) return [];
  const ranks = nonAces.map((c) => c.rank);
  if (new Set(ranks).size !== ranks.length) return [];

  const aceOptions: number[][] = [];
  if (aces.length === 0) aceOptions.push([]);
  else if (aces.length === 1) aceOptions.push([1], [14]);
  else aceOptions.push([1, 14]);

  const out: MeldShape[] = [];
  const seen = new Set<number>();
  for (const aceRanks of aceOptions) {
    const posRanks = [...ranks, ...aceRanks];
    const min = Math.min(...posRanks);
    const max = Math.max(...posRanks);
    const span = max - min + 1;
    const gaps = span - posRanks.length;
    if (gaps > jokers.length) continue;
    const extra = jokers.length - gaps;
    for (let up = extra; up >= 0; up--) {
      const down = extra - up;
      const start = min - down;
      const end = max + up;
      if (start < 1 || end > 14) continue;
      if (seen.has(start)) continue;
      seen.add(start);
      const byRank = new Map<number, Card>();
      for (const c of nonAces) byRank.set(c.rank, c);
      aces.forEach((a, i) => byRank.set(aceRanks[i], a));
      const ordered: Card[] = [];
      let ji = 0;
      for (let r = start; r <= end; r++) ordered.push(byRank.get(r) ?? jokers[ji++]);
      out.push({ type: 'run', cards: ordered, suit, startRank: start });
    }
  }
  return out;
}

/** Versucht, die Karten als Folge zu lesen. Gibt die beste (augenreichste) Anordnung zurück. */
export function asRun(cards: Card[]): MeldShape | null {
  let best: MeldShape | null = null;
  for (const shape of asRunAll(cards)) {
    if (!best || meldAugen(shape) > meldAugen(best)) best = shape;
  }
  return best;
}

/** Versucht, die Karten als Satz (3–4 gleiche Werte, verschiedene Farben) zu lesen. */
export function asSet(cards: Card[]): MeldShape | null {
  if (cards.length < 3 || cards.length > 4) return null;
  const real = cards.filter((c) => !isJoker(c));
  if (real.length === 0) return null;
  const rank = real[0].rank;
  if (real.some((c) => c.rank !== rank)) return null;
  const suits = new Set(real.map((c) => c.suit));
  if (suits.size !== real.length) return null;
  return { type: 'set', cards: [...cards], rank };
}

/** Versucht, die Karten als Cheft-Paar zu lesen (zwei identische Karten, Joker erlaubt). */
export function asPair(cards: Card[]): MeldShape | null {
  if (cards.length !== 2) return null;
  const real = cards.filter((c) => !isJoker(c));
  if (real.length === 2 && !sameCard(real[0], real[1])) return null;
  const shape: MeldShape = { type: 'pair', cards: [...cards] };
  if (real.length > 0) {
    shape.rank = real[0].rank;
    shape.suit = real[0].suit as Suit;
  }
  return shape;
}

/** Liest die Karten als eine der erlaubten Kombinationsarten (beste Augen gewinnen). */
export function interpretMeld(cards: Card[], types: MeldType[] = ALL_TYPES): MeldShape | null {
  let best: MeldShape | null = null;
  for (const t of types) {
    const s = t === 'run' ? asRun(cards) : t === 'set' ? asSet(cards) : asPair(cards);
    if (s && (!best || meldAugen(s) > meldAugen(best))) best = s;
  }
  return best;
}

// ---------------------------------------------------------------- Anlegen

/** Prüft, ob eine Karte an eine Folge oder einen Satz angelegt werden kann. Liefert die neue Form. */
export function addToMeld(m: Meld, card: Card): Meld | null {
  if (m.type === 'pair') return null;
  if (m.type === 'set') {
    if (m.cards.length >= 4) return null;
    if (isJoker(card)) return { ...m, cards: [...m.cards, card] };
    if (card.rank !== m.rank) return null;
    const realSuits = new Set(m.cards.filter((c) => !isJoker(c)).map((c) => c.suit));
    if (realSuits.has(card.suit)) return null;
    return { ...m, cards: [...m.cards, card] };
  }
  // Folge
  const start = m.startRank!;
  const end = start + m.cards.length - 1;
  if (m.cards.length >= 14) return null;
  if (isJoker(card)) {
    if (end < 14) return { ...m, cards: [...m.cards, card] };
    if (start > 1) return { ...m, cards: [card, ...m.cards], startRank: start - 1 };
    return null;
  }
  if (card.suit !== m.suit) return null;
  const topRank = card.rank === 1 ? 14 : card.rank;
  const bottomRank = card.rank;
  if (topRank === end + 1) return { ...m, cards: [...m.cards, card] };
  if (bottomRank === start - 1) return { ...m, cards: [card, ...m.cards], startRank: start - 1 };
  return null;
}

/** Alle Möglichkeiten, eine Karte an eine Folge anzulegen (oben/unten), für Joker relevant. */
export function addOptions(m: Meld, card: Card): Meld[] {
  const out: Meld[] = [];
  if (m.type !== 'run' || !isJoker(card)) {
    const r = addToMeld(m, card);
    if (r) out.push(r);
    return out;
  }
  const start = m.startRank!;
  const end = start + m.cards.length - 1;
  if (m.cards.length >= 14) return out;
  if (end < 14) out.push({ ...m, cards: [...m.cards, card] });
  if (start > 1) out.push({ ...m, cards: [card, ...m.cards], startRank: start - 1 });
  return out;
}

// ---------------------------------------------------------------- Joker klauen

/** Welche echte Karte vertritt der Joker an Index i? null, wenn nicht klaubar. */
export function jokerRepresents(m: Meld, i: number): { suit: Suit; rank: number } | null {
  const joker = m.cards[i];
  if (!joker || !isJoker(joker)) return null;
  if (m.type === 'run') {
    const r = m.startRank! + i;
    return { suit: m.suit!, rank: r === 14 ? 1 : r };
  }
  if (m.type === 'set') {
    const real = m.cards.filter((c) => !isJoker(c));
    if (m.cards.length !== 4 || real.length !== 3) return null; // nur aus Vierling
    const missing = (['H', 'D', 'C', 'S'] as Suit[]).find((s) => !real.some((c) => c.suit === s))!;
    return { suit: missing, rank: m.rank! };
  }
  // Paar
  if (m.rank === undefined || m.suit === undefined) return null; // Joker+Joker
  return { suit: m.suit, rank: m.rank };
}

/** Ersetzt den Joker an Index i durch die echte Karte. */
export function replaceJoker(m: Meld, i: number, card: Card): Meld {
  const cards = [...m.cards];
  cards[i] = card;
  return { ...m, cards };
}

// ---------------------------------------------------------------- Paare zählen

/** Maximale Anzahl Cheft-Paare, die aus den Karten gebildet werden können (Joker als Wildcard). */
export function maxPairs(cards: Card[]): number {
  const counts = new Map<string, number>();
  let jokers = 0;
  for (const c of cards) {
    if (isJoker(c)) jokers++;
    else counts.set(`${c.suit}${c.rank}`, (counts.get(`${c.suit}${c.rank}`) ?? 0) + 1);
  }
  let pairs = 0;
  let singles = 0;
  for (const n of counts.values()) {
    pairs += Math.floor(n / 2);
    singles += n % 2;
  }
  const withSingles = Math.min(jokers, singles);
  pairs += withSingles;
  jokers -= withSingles;
  pairs += Math.floor(jokers / 2);
  return pairs;
}

// ---------------------------------------------------------------- Partitionssuche

export interface PartitionOptions {
  /** Erlaubte Kombinationsarten. */
  types: MeldType[];
  /** Falls gesetzt: erlaubte Gesamtanzahl der Paare in der Lösung. */
  pairCounts?: number[];
  /** Karten dürfen ausgelassen werden (Teilmenge statt exakter Aufteilung). */
  allowSkip?: boolean;
  /** Diese Karten-IDs müssen enthalten sein (nur mit allowSkip relevant). */
  mustInclude?: number[];
}

export interface Partition {
  melds: MeldShape[];
  augen: number;
  /** Anzahl verwendeter Karten. */
  used: number;
}

/**
 * Findet die augenreichste Aufteilung der Karten in gültige Kombinationen.
 * Exakte Aufteilung (allowSkip=false) oder beste Teilmenge (allowSkip=true).
 * Maximal ca. 16 Karten; Joker werden immer an echte Karten gebunden.
 */
export function findPartition(cards: Card[], opts: PartitionOptions): Partition | null {
  const n = cards.length;
  if (n > 20) return null;
  const types = opts.types;
  const allowSkip = !!opts.allowSkip;
  const mustIds = new Set(opts.mustInclude ?? []);
  const must = new Set(cards.map((c, i) => (mustIds.has(c.id) ? i : -1)).filter((i) => i >= 0));
  const pairCounts = opts.pairCounts ? new Set(opts.pairCounts) : null;
  const jokerIdx = cards.map((c, i) => (isJoker(c) ? i : -1)).filter((i) => i >= 0);
  const realIdx = cards.map((c, i) => (isJoker(c) ? -1 : i)).filter((i) => i >= 0);

  type Res = { augen: number; melds: MeldShape[]; used: number } | null;
  const memo = new Map<number, Res>();

  const popcount = (m: number): number => {
    let c = 0;
    while (m) {
      m &= m - 1;
      c++;
    }
    return c;
  };

  function solve(mask: number, pairs: number): Res {
    const key = mask * 8 + pairs;
    if (memo.has(key)) return memo.get(key)!;
    let res: Res = null;

    const first = realIdx.find((i) => mask & (1 << i));
    if (first === undefined) {
      // Nur noch Joker übrig.
      const js = jokerIdx.filter((i) => mask & (1 << i));
      if (js.length === 0) {
        res = pairCounts && !pairCounts.has(pairs) ? null : { augen: 0, melds: [], used: 0 };
      } else {
        const candidates: Res[] = [];
        if (js.length === 2 && types.includes('pair') && pairs < 7) {
          const sub = solve(0, pairs + 1);
          if (sub) {
            const pm = asPair([cards[js[0]], cards[js[1]]])!;
            candidates.push({ augen: sub.augen, melds: [pm, ...sub.melds], used: sub.used + 2 });
          }
        }
        if (allowSkip && !js.some((i) => must.has(i))) {
          const sub = solve(0, pairs);
          if (sub) candidates.push(sub);
        }
        res = pick(candidates);
      }
      memo.set(key, res);
      return res;
    }

    const candidates: Res[] = [];
    if (allowSkip && !must.has(first)) {
      const sub = solve(mask & ~(1 << first), pairs);
      if (sub) candidates.push(sub);
    }
    for (const { shape, bits } of enumerateMelds(first, mask)) {
      const isPair = shape.type === 'pair';
      const np = pairs + (isPair ? 1 : 0);
      if (np > 7) continue;
      const sub = solve(mask & ~bits, np);
      if (!sub) continue;
      candidates.push({
        augen: sub.augen + meldAugen(shape),
        melds: [shape, ...sub.melds],
        used: sub.used + popcount(bits),
      });
    }
    res = pick(candidates);
    memo.set(key, res);
    return res;
  }

  function pick(cands: Res[]): Res {
    let best: Res = null;
    for (const c of cands) {
      if (!c) continue;
      if (!best || c.augen > best.augen || (c.augen === best.augen && c.used > best.used)) best = c;
    }
    return best;
  }

  /** Alle gültigen Kombinationen innerhalb von mask, die Karte first enthalten. */
  function enumerateMelds(first: number, mask: number): { shape: MeldShape; bits: number }[] {
    const out: { shape: MeldShape; bits: number }[] = [];
    const fc = cards[first];
    const availJokers = jokerIdx.filter((i) => mask & (1 << i));
    const jokerSubsets: number[][] = [[]];
    for (let k = 1; k <= availJokers.length; k++) jokerSubsets.push(availJokers.slice(0, k));

    const tryShape = (idxs: number[], type: MeldType) => {
      const cs = idxs.map((i) => cards[i]);
      const shape = type === 'run' ? asRun(cs) : type === 'set' ? asSet(cs) : asPair(cs);
      if (!shape) return;
      let bits = 0;
      for (const i of idxs) bits |= 1 << i;
      out.push({ shape, bits });
    };

    if (types.includes('pair')) {
      for (const i of realIdx) {
        if (i !== first && mask & (1 << i) && sameCard(cards[i], fc)) {
          tryShape([first, i], 'pair');
          break;
        }
      }
      if (availJokers.length > 0) tryShape([first, availJokers[0]], 'pair');
    }
    if (types.includes('set')) {
      const same = realIdx.filter(
        (i) => i !== first && mask & (1 << i) && cards[i].rank === fc.rank && cards[i].suit !== fc.suit,
      );
      // Teilmengen mit verschiedenen Farben
      const subsets = subsetsOf(same).filter((s) => new Set(s.map((i) => cards[i].suit)).size === s.length);
      for (const s of subsets) {
        for (const js of jokerSubsets) {
          const size = 1 + s.length + js.length;
          if (size >= 3 && size <= 4) tryShape([first, ...s, ...js], 'set');
        }
      }
    }
    if (types.includes('run')) {
      const same = realIdx.filter((i) => i !== first && mask & (1 << i) && cards[i].suit === fc.suit);
      const subsets = subsetsOf(same.slice(0, 12));
      for (const s of subsets) {
        for (const js of jokerSubsets) {
          const size = 1 + s.length + js.length;
          if (size >= 3 && size <= 14) tryShape([first, ...s, ...js], 'run');
        }
      }
    }
    return out;
  }

  const full = (1 << n) - 1;
  const r = solve(full, 0);
  if (!r) return null;
  if (!allowSkip && r.used !== n) return null;
  return { melds: r.melds, augen: r.augen, used: r.used };
}

function subsetsOf(items: number[]): number[][] {
  const out: number[][] = [[]];
  for (const it of items) {
    const len = out.length;
    for (let i = 0; i < len; i++) out.push([...out[i], it]);
  }
  return out;
}

/**
 * Alle unterschiedlichen exakten Aufteilungen der Karten (für die Auswahl in der Oberfläche).
 * Begrenzt auf `limit` Ergebnisse; Joker werden an echte Karten gebunden.
 */
export function findAllPartitions(cards: Card[], opts: PartitionOptions, limit = 8): Partition[] {
  const n = cards.length;
  if (n > 16) return [];
  const types = opts.types;
  const pairCounts = opts.pairCounts ? new Set(opts.pairCounts) : null;
  const jokerIdx = cards.map((c, i) => (isJoker(c) ? i : -1)).filter((i) => i >= 0);
  const realIdx = cards.map((c, i) => (isJoker(c) ? -1 : i)).filter((i) => i >= 0);
  const results: Partition[] = [];
  const seen = new Set<string>();
  let steps = 0;

  const candidates = (first: number, mask: number): { shape: MeldShape; bits: number }[] => {
    const out: { shape: MeldShape; bits: number }[] = [];
    const fc = cards[first];
    const availJokers = jokerIdx.filter((i) => mask & (1 << i));
    const jokerSubsets: number[][] = [[]];
    for (let k = 1; k <= availJokers.length; k++) jokerSubsets.push(availJokers.slice(0, k));
    const tryShape = (idxs: number[], type: MeldType) => {
      const cs = idxs.map((i) => cards[i]);
      let bits = 0;
      for (const i of idxs) bits |= 1 << i;
      if (type === 'run') {
        for (const shape of asRunAll(cs)) out.push({ shape, bits });
        return;
      }
      const shape = type === 'set' ? asSet(cs) : asPair(cs);
      if (shape) out.push({ shape, bits });
    };
    if (types.includes('pair')) {
      for (const i of realIdx) if (i !== first && mask & (1 << i) && sameCard(cards[i], fc)) { tryShape([first, i], 'pair'); break; }
      if (availJokers.length > 0) tryShape([first, availJokers[0]], 'pair');
    }
    if (types.includes('set')) {
      const same = realIdx.filter((i) => i !== first && mask & (1 << i) && cards[i].rank === fc.rank && cards[i].suit !== fc.suit);
      for (const sub of subsetsOf(same)) {
        if (new Set(sub.map((i) => cards[i].suit)).size !== sub.length) continue;
        for (const js of jokerSubsets) {
          const size = 1 + sub.length + js.length;
          if (size >= 3 && size <= 4) tryShape([first, ...sub, ...js], 'set');
        }
      }
    }
    if (types.includes('run')) {
      const same = realIdx.filter((i) => i !== first && mask & (1 << i) && cards[i].suit === fc.suit);
      for (const sub of subsetsOf(same.slice(0, 12))) {
        for (const js of jokerSubsets) {
          const size = 1 + sub.length + js.length;
          if (size >= 3 && size <= 14) tryShape([first, ...sub, ...js], 'run');
        }
      }
    }
    return out;
  };

  const rec = (mask: number, acc: MeldShape[], pairs: number): void => {
    if (results.length >= limit || steps++ > 20000) return;
    const first = realIdx.find((i) => mask & (1 << i));
    if (first === undefined) {
      const js = jokerIdx.filter((i) => mask & (1 << i));
      let melds = acc;
      let p = pairs;
      if (js.length === 2 && types.includes('pair')) {
        melds = [...acc, asPair([cards[js[0]], cards[js[1]]])!];
        p++;
      } else if (js.length > 0) return;
      if (pairCounts && !pairCounts.has(p)) return;
      const sig = melds
        .map((m) => `${m.type}${m.startRank ?? ''}:` + m.cards.map((c) => c.id).sort((a, b) => a - b).join('-'))
        .sort()
        .join('|');
      if (seen.has(sig)) return;
      seen.add(sig);
      results.push({ melds, augen: melds.reduce((s, m) => s + meldAugen(m), 0), used: n });
      return;
    }
    for (const { shape, bits } of candidates(first, mask)) {
      const np = pairs + (shape.type === 'pair' ? 1 : 0);
      if (np > 7) continue;
      rec(mask & ~bits, [...acc, shape], np);
    }
  };
  rec((1 << n) - 1, [], 0);
  results.sort((a, b) => b.augen - a.augen);
  return results;
}
