/**
 * Bot-gegen-Bot-Spiele für Tests und die Kalibrierung (scripts/calibrate.ts).
 * Spielt komplette Spiele ohne Oberfläche; jeder Platz kann Gedächtnis und Regler einzeln überschreiben.
 */
import { applyAction } from '../engine/actions';
import { BotLevel, BotStyle, GameState, newGame, startNextRound, winnerOfGame } from '../engine/game';
import { DecideOptions, decideAction } from './bot';

export interface SimSeat {
  level: BotLevel;
  style: BotStyle;
  /** Überschreibt Gedächtnis und Regler dieses Platzes (z. B. für Vergleiche ohne Wahrnehmungsfehler). */
  opts?: DecideOptions;
}

export interface SimOptions {
  seed: number;
  seats: SimSeat[];
  /** Rundenzahl des Spiels (3, 5, 7 oder 9 wie in der App). */
  rounds?: number;
  /** Darf man im ersten eigenen Zug rauskommen? Standard der Simulation: ja; die App spielt standardmäßig mit „gesperrt“. */
  firstTurnOpenAllowed?: boolean;
  /** Wer die erste Runde austeilt; Standard: aus dem Seed, damit kein Platz dauerhaft bevorzugt ist. */
  dealer?: number;
  /** Wird vor jeder Entscheidung aufgerufen. */
  visit?: (g: GameState, pid: number) => void;
  /** Sicherung gegen Endlosschleifen. */
  maxSteps?: number;
}

export interface SimResult {
  state: GameState;
  /** Strafpunkte je Platz über alle Runden (weniger ist besser). */
  totals: number[];
  /** Plätze mit den wenigsten Strafpunkten (bei Gleichstand mehrere). */
  winners: number[];
  /** Wie viele Runden jeder Platz durch Rauskommen gewonnen hat. */
  roundWins: number[];
  steps: number;
}

export function simulate(o: SimOptions): SimResult {
  const n = o.seats.length;
  const players = o.seats.map((s, i) => ({ id: i, name: `Bot${i}`, isBot: true, bot: { level: s.level, style: s.style } }));
  const g = newGame(players, { rounds: o.rounds ?? 3, firstTurnOpenAllowed: o.firstTurnOpenAllowed ?? true, direction: 'ccw' }, o.seed, o.dealer ?? o.seed % n);
  g.round.waiting = false;
  g.round.ready = g.round.ready.map(() => true);
  const max = o.maxSteps ?? 40000;
  let steps = 0;
  const recent: string[] = [];
  while (!g.finished && steps++ < max) {
    if (g.round.ended) {
      startNextRound(g);
      g.round.waiting = false;
      g.round.ready = g.round.ready.map(() => true);
      continue;
    }
    const pid = g.round.turn.player;
    o.visit?.(g, pid);
    const a = decideAction(g, pid, o.seats[pid].opts);
    const res = applyAction(g, pid, a);
    recent.push(`${pid}:${a.kind}${a.kind === 'draw' ? '/' + a.source : a.kind === 'discard' || a.kind === 'layOff' ? '#' + a.cardId : a.kind === 'lay' ? '[' + a.groups.map((x) => x.join('+')).join(' ') + ']' : a.kind === 'steal' ? '#' + a.cardId : ''}${res.ok ? '' : '!'}`);
    if (recent.length > 8) recent.shift();
    if (!res.ok) {
      const t = g.round.turn;
      const hand = g.round.players[pid].hand.map((c) => (c.suit === 'J' ? 'J' : `${c.suit}${c.rank}`)).join(' ');
      throw new Error(
        `Ungültige Bot-Aktion ${a.kind} von Platz ${pid} (${o.seats[pid].level}/${o.seats[pid].style}, Seed ${o.seed}): ${res.error} | Zug: Phase ${t.phase}, Quelle ${t.drawSource}, mustUse ${t.mustUseId}, mustOpen ${t.mustOpenWithId}, mustPair ${t.mustPairWithId}, pendingJoker ${t.pendingJokerId}, Aktionen ${t.actions} | Hand: ${hand} | Auslagen: ${g.round.melds.length} | letzte Aktionen: ${recent.join(' ')}`,
      );
    }
  }
  if (!g.finished) throw new Error(`Spiel nicht beendet nach ${max} Schritten (Seed ${o.seed})`);
  const roundWins = o.seats.map(() => 0);
  for (const h of g.history) if (h.winner !== null) roundWins[h.winner]++;
  return { state: g, totals: [...g.totals], winners: winnerOfGame(g), roundWins, steps };
}
