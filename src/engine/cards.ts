/**
 * Karten-Grundlagen für Cheft.
 * Standard: 106 Karten, zwei französische Blätter (je 52) plus 2 Joker (Cheats können das Deck ändern, siehe DeckConfig).
 */

export type Suit = 'H' | 'D' | 'C' | 'S';
export const SUITS: Suit[] = ['H', 'D', 'C', 'S'];

/** rank: 1 = Ass, 11 = Bube, 12 = Dame, 13 = König. Joker: rank 0, suit 'J'. */
export interface Card {
  id: number;
  suit: Suit | 'J';
  rank: number;
}

export const JOKER_PENALTY = 25;
export const ACE_PENALTY = 11;

export function isJoker(c: Card): boolean {
  return c.suit === 'J';
}

/** Zusammensetzung des Decks. Das Standardspiel hat 2 Kopien jeder Karte und 2 Joker (106 Karten); Cheats können sie ändern. */
export interface DeckConfig {
  /** Kopien jeder Karte (Farbe × Wert). */
  copies: number;
  /** Joker im Deck. */
  jokers: number;
  /** Vorhandene Werte (1 = Ass … 13 = König). */
  ranks: number[];
}

export const ALL_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
/** Mini-Deck: wie ein Skatblatt (7 bis Ass). */
export const MINI_RANKS = [1, 7, 8, 9, 10, 11, 12, 13];
export const STANDARD_DECK: DeckConfig = { copies: 2, jokers: 2, ranks: ALL_RANKS };

export function deckSize(cfg: DeckConfig): number {
  return cfg.copies * 4 * cfg.ranks.length + cfg.jokers;
}

/**
 * Das Deck. Die Id einer Karte ist Blatt × 52 + Farbe × 13 + (Wert − 1); Joker folgen ab 52 × Kopien. Für das Standardspiel
 * sind das genau die Ids 0–103 und 104–105, die Oberfläche richtet Kartenbilder und Rücken nach der Id (gerades/ungerades Blatt).
 */
export function makeDeck(cfg: DeckConfig = STANDARD_DECK): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < cfg.copies; d++) {
    SUITS.forEach((suit, si) => {
      for (const rank of cfg.ranks) cards.push({ id: d * 52 + si * 13 + (rank - 1), suit, rank });
    });
  }
  for (let j = 0; j < cfg.jokers; j++) cards.push({ id: 52 * cfg.copies + j, suit: 'J', rank: 0 });
  return cards;
}

/** Umkehrung der Id-Vergabe (für Spielprotokolle, die nur die Id speichern). */
export function cardFromId(id: number, copies: number): Card {
  if (id >= 52 * copies) return { id, suit: 'J', rank: 0 };
  const within = id % 52;
  return { id, suit: SUITS[Math.floor(within / 13)], rank: (within % 13) + 1 };
}

/** Gerades (0) oder ungerades (1) Blatt: bestimmt Rücken und die Personen der Bildkarten. Joker wechseln je Id. */
export function deckParity(c: Pick<Card, 'id' | 'suit'>): 0 | 1 {
  if (c.id < 0) return 0;
  return (c.suit === 'J' ? c.id % 2 : Math.floor(c.id / 52) % 2) as 0 | 1;
}

/** Augenwert einer Position in einer Folge (1 = Ass unten, 14 = Ass oben). */
export function rankValue(rank: number): number {
  if (rank === 1) return 1;
  if (rank === 14) return 11;
  if (rank >= 11) return 10;
  return rank;
}

/** Augenwert einer Karte in einem Satz oder Paar (Ass = 11). */
export function cardValueHigh(c: Card): number {
  if (isJoker(c)) return 0;
  if (c.rank === 1) return 11;
  if (c.rank >= 11) return 10;
  return c.rank;
}

/** Strafpunkte einer Handkarte am Rundenende. */
export function penaltyValue(c: Card): number {
  if (isJoker(c)) return JOKER_PENALTY;
  if (c.rank === 1) return ACE_PENALTY;
  if (c.rank >= 11) return 10;
  return c.rank;
}

export function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function cardKey(c: Card): string {
  return `${c.suit}${c.rank}`;
}

/** Sortierung der Hand: nach Farbe, darin aufsteigend; das Ass zählt als höchste Karte (nach dem König), Joker zuletzt. */
export function sortBySuit(cards: Card[]): Card[] {
  const order: Record<string, number> = { H: 0, S: 1, D: 2, C: 3, J: 4 };
  const high = (c: Card) => (c.rank === 1 ? 14 : c.rank);
  return [...cards].sort((a, b) => order[a.suit] - order[b.suit] || high(a) - high(b) || a.id - b.id);
}

/** Einfacher, seedbarer Zufallsgenerator (mulberry32) für reproduzierbare Tests. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
