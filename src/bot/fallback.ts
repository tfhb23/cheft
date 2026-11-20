/**
 * Notausgang für Bot-Züge: Liefert die Entscheidung eines Bots eine Aktion, die die Regeln ablehnen (sollte nie vorkommen, ist aber
 * bei ungewöhnlichen Decks, z. B. sehr vielen Jokern, schon vorgekommen), muss das Spiel trotzdem weitergehen. Probiert der Reihe
 * nach die einfachsten regelkonformen Züge; liefert false, wenn gar nichts geht.
 */
import { applyAction } from '../engine/actions';
import { DrawSource, GameState, abortTurn, checkDiscard } from '../engine/game';

const SOURCES: DrawSource[] = ['stock', 'carpet', 'discard'];

function tryDraw(state: GameState, pid: number): boolean {
  return SOURCES.some((source) => applyAction(state, pid, { kind: 'draw', source }).ok);
}

export function fallbackMove(state: GameState, pid: number): boolean {
  const r = state.round;
  if (r.ended || r.waiting) return false;
  if (r.turn.phase === 'draw') return tryDraw(state, pid);
  const hand = r.players[pid].hand;
  // Erst erlaubte Abwürfe (die letzte Handkarte zuerst: sie wird am wenigsten gebraucht), dann alle übrigen
  const order = [...hand].reverse();
  const legal = order.filter((c) => checkDiscard(state, pid, c.id).ok);
  for (const c of [...legal, ...order.filter((c) => !legal.includes(c))]) {
    if (applyAction(state, pid, { kind: 'discard', cardId: c.id }).ok) return true;
  }
  // Pflichtkarte lässt sich nicht verwenden: den Zug von vorn beginnen und einfach vom Stapel ziehen
  abortTurn(state);
  return state.round.turn.phase === 'draw' && tryDraw(state, pid);
}
