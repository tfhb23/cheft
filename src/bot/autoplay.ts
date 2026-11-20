/**
 * Autoplay-Cheat: Ein Mastermind-Bot mit gewählter Rolle spielt für den menschlichen Platz.
 * Der Platz hat kein Bot-Profil im Spielstand; es wird nur für die Dauer der Entscheidung gesetzt und danach wieder entfernt,
 * damit es nirgends (Spielende-Anzeige, Spielstand-Code) auftaucht.
 */
import { Action } from '../engine/actions';
import { BotStyle, GameState } from '../engine/game';
import { decideAction } from './bot';

export function decideForHuman(state: GameState, pid: number, role: BotStyle): Action {
  const p = state.players[pid];
  const before = p.bot;
  p.bot = { level: 'master', style: role };
  try {
    return decideAction(state, pid);
  } finally {
    if (before === undefined) delete p.bot;
    else p.bot = before;
  }
}
