/**
 * Die Rollen (Entwurf V3): fünf Spielweisen und die Wildcard. Jede Rolle ist eine Reglermenge (PersonaDef); dazu kommen für alle
 * Rollen die menschlichen Zutaten: Vorlieben (tastes.ts), Gegner-Gedächtnis (opponents.ts) und auf Wunsch Rollentreue, Launen
 * und Stimmung (personas.ts).
 *
 *   Ausgewogen    Referenz
 *   Frühvogel     kommt so früh wie möglich raus, nie Cheft, ruhige Runden
 *   Gerissener    wartet auf die große Erstmeldung und hebt damit die Hürde für alle anderen
 *   Pärchenkönig  sammelt Paare, sagt Cheft mit vier Paaren an
 *   Glücksritter  Cheft schon mit drei Paaren, aus Laune auch früher, hohes Risiko
 *   Wildcard      spielt jede Runde eine andere dieser Spielweisen (gleichverteilt, Wiederholungen möglich)
 */
import type { GameState } from '../engine/game';
import type { Knobs } from './bot';
import { Persona, PersonaDef, persona, resolvePersona } from './personas';
import { standing } from './strategy';

export type RoleId = 'balanced' | 'early' | 'cunning' | 'pairs' | 'gambler' | 'wildcard';
export type StyleId = Exclude<RoleId, 'wildcard'>;

export const ROLE_LABEL: Record<RoleId, string> = {
  balanced: 'Ausgewogen',
  early: 'Frühvogel',
  cunning: 'Gerissener',
  pairs: 'Pärchenkönig',
  gambler: 'Glücksritter',
  wildcard: 'Wildcard',
};

export const STYLE_IDS: StyleId[] = ['balanced', 'early', 'cunning', 'pairs', 'gambler'];

/** Alte Spielweisen (ältere Spielstände und Einstellungen) auf die neuen Rollen abbilden; Unbekanntes wird zur Wildcard. */
const LEGACY_STYLE: Record<string, RoleId> = { sprinter: 'early', cheft: 'pairs', hand: 'balanced', blocker: 'balanced', counter: 'balanced', joker: 'cunning' };
export function roleOfStyle(style: string | undefined): RoleId {
  if (style && style in ROLE_LABEL) return style as RoleId;
  return (style && LEGACY_STYLE[style]) || 'wildcard';
}

/** Reglermengen der Spielweisen (ohne Zutaten). */
export const STYLE_KNOBS: Record<StyleId, Partial<Knobs>> = {
  balanced: {},
  early: { weighOpening: false, bold: false, ambition: 0, cheftEagerPairs: 99, pairTakeAt: 5 },
  cunning: { ambition: 0.8, tuning: { holdAt0: 0.2 } },
  pairs: { cheftEagerPairs: 4, pairTakeAt: 3, pairLove: 1.8, ambition: 0.5 },
  // Der Glücksritter ist vernünftig, solange er führt, und setzt alles auf Cheft (schon mit 3 Paaren), sobald er nicht mehr führt (siehe def)
  gambler: { cheftEagerPairs: 4, pairTakeAt: 3, pairLove: 2, ambition: 0.6 },
};

/** Grundstärke der Stimmung (Endspurt-Neigung) je Rolle: Der Frühvogel bleibt ruhiger, der Pärchenkönig und der Glücksritter gehen früher aufs Ganze. */
export const STYLE_TILT: Record<StyleId, number> = { balanced: 1, early: 0.8, cunning: 1, pairs: 1.1, gambler: 1.3 };

/** Rollenabhängige Sorgfalt (Faktoren auf Rauschen und Handüberblick der Stufe). Der Frühvogel hat es eilig und übersieht mehr. */
export const STYLE_CARELESSNESS: Partial<Record<StyleId, { noise?: number; handMiss?: number }>> = {};

/**
 * Wohin eine Spielweise in einer „Laune“-Runde ausweicht: nur zu ähnlichen, damit die Rolle erkennbar bleibt. Der Frühvogel wird
 * nie plötzlich zum Glücksritter, der Glücksritter nie zum Frühvogel; nur die Ausgewogene darf überallhin.
 */
export const NEIGHBORS: Record<StyleId, StyleId[]> = {
  balanced: ['early', 'cunning', 'pairs', 'gambler'],
  early: ['balanced'],
  cunning: ['balanced', 'pairs'],
  pairs: ['balanced', 'cunning', 'gambler'],
  gambler: ['pairs'],
};

/** Empfohlene Würze (gemessen: 94 % der Erkennbarkeit bleiben, im Schnitt weicht der Bot in 7 Runden einmal ab). */
export const SPICE = { loyalty: 0.85, jitter: 0.2, tilt: 1 } as const;

export interface RoleOptions {
  /** Vorlieben (Standard: an). */
  tastes?: boolean;
  /** Gegner-Gedächtnis nutzen, 0 bis 1 (Standard 1; was der Bot weiß, bestimmt seine Stufe). */
  oppUse?: number;
  /** Rollentreue, Launen, Stimmung (Standard: SPICE, d. h. Treue 0,85, Launen 0,2, Stimmung 1; 1 / 0 / 0 schaltet die Würze ab). */
  loyalty?: number;
  /** Wohin eine Laune-Runde ausweicht: 'neighbors' (Standard, nur ähnliche Spielweisen) oder 'all'. */
  deviate?: 'neighbors' | 'all';
  jitter?: number;
  tilt?: number;
  /** Überschreibt Regler (für Tests). */
  knobs?: Partial<Knobs>;
  /** Überschreibt die rollenabhängige Sorgfalt (für Messungen). */
  carelessness?: { noise?: number; handMiss?: number };
}

function def(id: StyleId, o: RoleOptions): PersonaDef {
  const knobs: Partial<Knobs> = { ...STYLE_KNOBS[id], oppUse: o.oppUse ?? 1, ...o.knobs };
  if (o.tastes ?? true) knobs.taste = 'auto';
  const adapt = id === 'gambler' ? (st: GameState, pid: number): Partial<Knobs> => (standing(st, pid).behind > 0 ? { cheftEagerPairs: 3 } : {}) : undefined;
  return { id, label: ROLE_LABEL[id], knobs, adapt, carelessness: o.carelessness ?? STYLE_CARELESSNESS[id], tiltScale: STYLE_TILT[id] };
}

/** Die Rolle als Persona für `DecideOptions.persona`. Die Wildcard wählt jede Runde gleichverteilt eine Spielweise. */
export function rolePersona(id: RoleId, o: RoleOptions = {}): Persona {
  const pool = STYLE_IDS.map((s) => def(s, o));
  const base = id === 'wildcard' ? pool[0] : def(id, o);
  const jitter = o.jitter ?? SPICE.jitter;
  const tilt = o.tilt ?? SPICE.tilt;
  if (id === 'wildcard') return persona(base, { loyalty: 0, pool, jitter, tilt });
  const allowed = o.deviate === 'all' ? pool.filter((d) => d.id !== id) : pool.filter((d) => NEIGHBORS[id as StyleId].includes(d.id as StyleId));
  return persona(base, { loyalty: o.loyalty ?? SPICE.loyalty, pool: allowed, jitter, tilt });
}

/**
 * Welche Spielweise hat der Bot in jeder gespielten Runde gespielt? Rein aus Spiel und Runde berechnet (Wildcard wie Laune-Runden),
 * für die Endauswertung. Der Bot auf Platz `pid` muss mit `rolePersona(id, o)` gespielt haben.
 */
export function rolesPerRound(state: GameState, pid: number, id: RoleId, o: RoleOptions = {}): StyleId[] {
  const p = rolePersona(id, o);
  const out: StyleId[] = [];
  for (let r = 1; r <= state.history.length; r++) {
    const st = { ...state, round: { ...state.round, no: r } };
    out.push(resolvePersona(p, st, pid).active as StyleId);
  }
  return out;
}

/**
 * Text für die Endauswertung: Bei allen Spielweisen steht nur die Rolle des Bots (eine Laune-Runde zählt nicht). Nur die Wildcard zeigt mehrere
 * Rollen mit Zählung, z. B. „Wildcard: 3× Glücksritter, 2× Gerissener, 1× Ausgewogen“.
 */
export function describeRole(state: GameState, pid: number, id: RoleId, o: RoleOptions = {}): string {
  if (id !== 'wildcard') return ROLE_LABEL[id];
  const counts = new Map<StyleId, number>();
  for (const r of rolesPerRound(state, pid, id, o)) counts.set(r, (counts.get(r) ?? 0) + 1);
  return `${ROLE_LABEL.wildcard}: ` + [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => `${n}× ${ROLE_LABEL[r]}`).join(', ');
}
