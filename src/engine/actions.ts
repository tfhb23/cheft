/** Einheitliche Aktionen (für Oberfläche, Bots und später den Server). */
import { DrawSource, GameState, Result, doDeclareCheft, doDiscard, doDraw, doLay, doLayOff, doStealJoker, doUndoDraw } from './game';

export type Action =
  | { kind: 'draw'; source: DrawSource }
  | { kind: 'declareCheft' }
  | { kind: 'undoDraw' }
  | { kind: 'lay'; groups: number[][] }
  | { kind: 'layOff'; cardId: number; meldId: number; end?: 'top' | 'bottom' }
  | { kind: 'steal'; meldId: number; jokerIndex: number; cardId: number }
  | { kind: 'discard'; cardId: number };

export function applyAction(state: GameState, pid: number, a: Action): Result {
  switch (a.kind) {
    case 'draw':
      return doDraw(state, pid, a.source);
    case 'declareCheft':
      return doDeclareCheft(state, pid);
    case 'undoDraw':
      return doUndoDraw(state, pid);
    case 'lay':
      return doLay(state, pid, a.groups);
    case 'layOff':
      return doLayOff(state, pid, a.cardId, a.meldId, a.end ?? 'top');
    case 'steal':
      return doStealJoker(state, pid, a.meldId, a.jokerIndex, a.cardId);
    case 'discard':
      return doDiscard(state, pid, a.cardId);
  }
}
