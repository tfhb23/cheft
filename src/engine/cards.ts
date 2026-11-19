/**
 * Karten-Grundlagen für Cheft.
 * 106 Karten: zwei französische Blätter (je 52) plus 2 Joker.
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

export function makeDeck(): Card[] {
  const cards: Card[] = [];
  let id = 0;
  for (let d = 0; d < 2; d++) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        cards.push({ id: id++, suit, rank });
      }
    }
  }
  cards.push({ id: id++, suit: 'J', rank: 0 });
  cards.push({ id: id++, suit: 'J', rank: 0 });
  return cards;
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
