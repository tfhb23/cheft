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
import type { Knobs } from './bot';
import { Persona, PersonaDef, persona } from './personas';

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

/** Reglermengen der Spielweisen (ohne Zutaten). */
export const STYLE_KNOBS: Record<StyleId, Partial<Knobs>> = {
  balanced: {},
  early: { weighOpening: false, bold: false, ambition: 0, cheftEagerPairs: 99, pairTakeAt: 5 },
  cunning: { ambition: 0.8, tuning: { holdAt0: 0.2 } },
  pairs: { cheftEagerPairs: 4, pairTakeAt: 3, pairLove: 1.8, ambition: 0.5 },
  gambler: { cheftEagerPairs: 3, pairTakeAt: 3, pairLove: 2, ambition: 0.6 },
};

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
export const SPICE = { loyalty: 0.85, jitter: 0.2, tilt: 0.5 } as const;

export interface RoleOptions {
  /** Vorlieben (Standard: an). */
  tastes?: boolean;
  /** Gegner-Gedächtnis nutzen, 0 bis 1 (Standard 1; was der Bot weiß, bestimmt seine Stufe). */
  oppUse?: number;
  /** Rollentreue, Launen, Stimmung (Standard: aus). */
  loyalty?: number;
  /** Wohin eine Laune-Runde ausweicht: 'neighbors' (Standard, nur ähnliche Spielweisen) oder 'all'. */
  deviate?: 'neighbors' | 'all';
  jitter?: number;
  tilt?: number;
  /** Überschreibt Regler (für Tests). */
  knobs?: Partial<Knobs>;
}

function def(id: StyleId, o: RoleOptions): PersonaDef {
  const knobs: Partial<Knobs> = { ...STYLE_KNOBS[id], oppUse: o.oppUse ?? 1, ...o.knobs };
  if (o.tastes ?? true) knobs.taste = 'auto';
  return { id, label: ROLE_LABEL[id], knobs };
}

/** Die Rolle als Persona für `DecideOptions.persona`. Die Wildcard wählt jede Runde gleichverteilt eine Spielweise. */
export function rolePersona(id: RoleId, o: RoleOptions = {}): Persona {
  const pool = STYLE_IDS.map((s) => def(s, o));
  const base = id === 'wildcard' ? pool[0] : def(id, o);
  if (id === 'wildcard') return persona(base, { loyalty: 0, pool, jitter: o.jitter ?? 0, tilt: o.tilt ?? 0 });
  const allowed = o.deviate === 'all' ? pool.filter((d) => d.id !== id) : pool.filter((d) => NEIGHBORS[id as StyleId].includes(d.id as StyleId));
  return persona(base, { loyalty: o.loyalty ?? 1, pool: allowed, jitter: o.jitter ?? 0, tilt: o.tilt ?? 0 });
}
