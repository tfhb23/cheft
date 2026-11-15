import { Card, makeDeck } from './cards';
import { GameState, PlayerInfo, Settings, newGame } from './game';

/** Erzeugt Karten aus Kurzschreibweise: 'H4' = Herz 4, 'SK' = Pik König, 'J' = Joker. Jede Karte höchstens zweimal. */
export class CardPool {
  private deck = makeDeck();
  private used = new Set<number>();
  take(spec: string): Card {
    const c = this.find(spec);
    this.used.add(c.id);
    return c;
  }
  takeAll(...specs: string[]): Card[] {
    return specs.map((s) => this.take(s));
  }
  private nextId = 1000;
  private find(spec: string): Card {
    if (spec === 'J') {
      const j = this.deck.find((c) => c.suit === 'J' && !this.used.has(c.id));
      // Sind beide Joker vergeben, wird ein weiterer mit neuer ID erzeugt (nur für Tests).
      return j ?? { id: this.nextId++, suit: 'J', rank: 0 };
    }
    const suit = spec[0];
    const r = spec.slice(1);
    const rank = r === 'A' ? 1 : r === 'B' ? 11 : r === 'D' ? 12 : r === 'K' ? 13 : parseInt(r, 10);
    const c = this.deck.find((x) => x.suit === suit && x.rank === rank && !this.used.has(x.id));
    if (!c) return { id: this.nextId++, suit: suit as Card['suit'], rank };
    return c;
  }
}

export const DEFAULT_SETTINGS: Settings = { rounds: 7, firstTurnOpenAllowed: true, direction: 'ccw' };

export function testPlayers(n = 4): PlayerInfo[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, name: `P${i}`, isBot: i > 0 }));
}

export function testGame(n = 4, seed = 42, settings: Partial<Settings> = {}): GameState {
  const g = newGame(testPlayers(n), { ...DEFAULT_SETTINGS, ...settings }, seed);
  g.round.waiting = false;
  g.round.ready = g.round.ready.map(() => true);
  return g;
}

/** Setzt eine Hand direkt (für Regel-Tests). */
export function setHand(state: GameState, pid: number, cards: Card[]): void {
  state.round.players[pid].hand = [...cards];
}
