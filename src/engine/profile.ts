/**
 * Rundenprofil je Spieler: Was haben die anderen in dieser Runde getan? Das Gegner-Gedächtnis der Bots (bot/opponents.ts)
 * liest daraus, wie ein Spieler im laufenden Spiel spielt (Cheft oder Rommé, früh oder spät raus, welche Karten abgeworfen
 * und genommen). Alles ist öffentlich sichtbar (Abwürfe, offenes Nehmen, Erstmeldungen); verdeckte Karten kommen nicht vor.
 * Das Profil lebt nur im Spielstand: Ein neues Spiel beginnt ohne Erinnerung.
 */
import { Card, makeDeck } from './cards';
import type { GameState } from './game';

export interface RoundProfile {
  /** Eigene Züge in dieser Runde. */
  turns: number;
  /** War der Spieler (zeitweise) Cheft-Spieler? */
  cheft: boolean;
  /** Eigene Züge bis zur Erstmeldung (Ziehen gezählt), null = nie draußen. */
  openTurn: number | null;
  /** Augen der Rommé-Erstmeldung, null = keine oder Paare. */
  openAugen: number | null;
  /** Als Erster der Runde draußen. */
  first: boolean;
  /** Mit Hand gewonnen (alle Karten auf einmal). */
  hand: boolean;
  /** Abgeworfene Karten als Code Farbe*16+Wert (H0 D1 C2 S3, Joker 64). */
  discards: number[];
  /** Offen genommene Karten (Ablage, Teppich) im selben Code. */
  takes: number[];
  steals: number;
}

const DECK = makeDeck();
const SUIT_INDEX: Record<string, number> = { H: 0, D: 1, C: 2, S: 3, J: 4 };

/** Kartencode für Profile: Farbe*16 + Wert (Joker: 64). */
export function cardCode(c: Pick<Card, 'suit' | 'rank'>): number {
  return SUIT_INDEX[c.suit] * 16 + c.rank;
}

export function buildProfiles(state: GameState): RoundProfile[] {
  const r = state.round;
  const n = state.players.length;
  const out: RoundProfile[] = Array.from({ length: n }, (_, i) => ({
    turns: r.players[i].turns,
    cheft: false,
    openTurn: null,
    openAugen: null,
    first: false,
    hand: false,
    discards: [],
    takes: [],
    steals: 0,
  }));
  const draws = new Array(n).fill(0);
  let anyOpen = false;
  for (const e of r.log) {
    const pl = e.player;
    if (pl === undefined || pl < 0 || pl >= n) continue;
    const pr = out[pl];
    if (e.key.startsWith('log.draw.')) draws[pl]++;
    else if (e.key === 'log.cheft') pr.cheft = true;
    else if (e.key === 'log.steal') pr.steals++;
    else if (e.key === 'log.discard') {
      const card = DECK[Number(e.params?.card)];
      if (card) pr.discards.push(cardCode(card));
    } else if ((e.key === 'log.open' || e.key === 'log.hand') && pr.openTurn === null) {
      pr.openTurn = draws[pl];
      if (Number(e.params?.pairs ?? 0) === 0 && e.key === 'log.open') pr.openAugen = Number(e.params?.augen ?? 0);
      if (e.key === 'log.hand') pr.hand = true;
      if (!anyOpen) pr.first = true;
      anyOpen = true;
    }
  }
  for (const x of r.taken) if (x.player >= 0 && x.player < n) out[x.player].takes.push(cardCode(x.card));
  return out;
}
