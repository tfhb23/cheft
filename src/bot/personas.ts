/**
 * Rollen-Schicht (Entwurf): Eine Rolle ist eine Reglermenge (`PersonaDef`), dazu vier „menschliche“ Zusätze, die aus jeder
 * Rolle eine lebendige Figur machen:
 *
 *   loyalty  Rollentreue 0..1: Chance je Runde, wirklich in der Rolle zu spielen. Sonst spielt der Bot diese Runde eine andere
 *            Rolle aus `pool` (eine ganze Runde lang, nicht zugweise, damit es wie eine Laune wirkt). Wildcard = Rollentreue 0.
 *   jitter   Launen 0..1: Jede Runde werden Ehrgeiz, Blockierwille und Abwurfdruck leicht verschoben.
 *   tilt     Stimmung -1..1: Nach einer schlechten Runde mutiger (> 0) oder vorsichtiger (< 0), nach einem Sieg umgekehrt.
 *   levels   Gedächtnis pro Runde aus dieser Liste (Tagesform als Charakterzug); sonst bleibt die Stufe des Bots.
 *
 * Alles ist eine reine Funktion des Spielzustands (Seed, Runde, Spieler): kein echter Zufall, deterministisch, auch nach einem
 * Serverneustart. Innerhalb einer Runde bleibt die Wahl stabil.
 */
import type { BotLevel, GameState } from '../engine/game';
import type { Knobs } from './bot';
import { MemoryParams, roll } from './memory';

export interface PersonaDef {
  id: string;
  label: string;
  knobs: Partial<Knobs>;
  memory?: Partial<MemoryParams>;
}

export interface Persona {
  def: PersonaDef;
  loyalty: number;
  pool?: PersonaDef[];
  jitter: number;
  tilt: number;
  levels?: BotLevel[];
}

export interface ResolvedPersona {
  knobs: Partial<Knobs>;
  memory?: Partial<MemoryParams>;
  level?: BotLevel;
  /** Welche Rolle in dieser Runde gespielt wird (für Auswertungen). */
  active: string;
}

const SALT = 100;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function resolvePersona(p: Persona, state: GameState, pid: number): ResolvedPersona {
  let def = p.def;
  if (p.pool && p.pool.length > 0 && p.loyalty < 1 && roll(state, pid, SALT + 1) >= p.loyalty) {
    def = p.pool[Math.floor(roll(state, pid, SALT + 2) * p.pool.length) % p.pool.length];
  }
  const knobs: Partial<Knobs> = { ...def.knobs };
  const base = knobs.ambition ?? 0.4;
  let ambition = base;
  if (p.jitter > 0) {
    const j = (salt: number) => (roll(state, pid, SALT + salt) * 2 - 1) * p.jitter;
    ambition += 0.5 * j(3);
    if (knobs.blockWeight !== undefined) knobs.blockWeight = Math.max(0, knobs.blockWeight * (1 + j(4)));
    else knobs.blockWeight = Math.max(0, 9 * (1 + j(4)));
    knobs.shedPre = Math.max(0, (knobs.shedPre ?? 0.12) * (1 + 2 * j(5)));
    knobs.shedOpen = Math.max(0, (knobs.shedOpen ?? 0.9) * (1 + j(6)));
  }
  if (p.tilt !== 0) {
    const last = state.history[state.history.length - 1];
    if (last) {
      const pen = last.scores[pid]?.total ?? 0;
      const heat = pen > 0 ? Math.min(1, pen / 100) : -0.3;
      ambition += p.tilt * 0.5 * heat;
    }
  }
  if (ambition !== base) knobs.ambition = clamp(ambition, 0, 1);
  let level: BotLevel | undefined;
  if (p.levels && p.levels.length > 0) level = p.levels[Math.floor(roll(state, pid, SALT + 9) * p.levels.length) % p.levels.length];
  return { knobs, memory: def.memory, level, active: def.id };
}

// ---------------------------------------------------------------- Kandidaten-Rollen (Entwurf, noch nicht in der App)

/** Ausgangswerte der bisherigen Rollen (zur Kontrolle: gleich wie knobsFor in bot.ts). */
export const CAND: Record<string, PersonaDef> = {
  ausgewogen: { id: 'ausgewogen', label: 'Ausgewogen', knobs: {} },
  tempo: {
    id: 'tempo',
    label: 'Tempo (Sprinter neu)',
    knobs: { weighOpening: false, bold: false, ambition: 0, cheftEagerPairs: 99, pairTakeAt: 5, shedPre: 0.5, shedOpen: 1.2 },
  },
  cheft: { id: 'cheft', label: 'Cheft-Fan', knobs: { cheftEagerPairs: 4, pairTakeAt: 3, pairLove: 1.8, ambition: 0.5 } },
  hand: { id: 'hand', label: 'Handmacher', knobs: { handHunter: true, handReach: 5, patient: true, master: true, ambition: 0.6 } },
  joker: { id: 'joker', label: 'Jokerjäger', knobs: { jokerHunter: true, steal: true, burn: true, master: true, dangerHand: 3 } },
  huerde: {
    id: 'huerde',
    label: 'Hürdenbauer',
    knobs: { ambition: 0.85, blockWeight: 12, tuning: { boldHold: true, w0: 2, w1: 6 } },
  },
  blocker: { id: 'blocker', label: 'Blocker', knobs: { blockWeight: 25, ambition: 0.3 } },
  zocker: { id: 'zocker', label: 'Zocker', knobs: { cheftEagerPairs: 3, pairTakeAt: 2, gamble: 0.5, ambition: 0.6 } },
  vorsicht: {
    id: 'vorsicht',
    label: 'Vorsichtig',
    knobs: { ambition: 0.1, bold: false, cheftEagerPairs: 99, pairTakeAt: 5, shedPre: 0.6, shedOpen: 1.5, dangerHand: 4, pairLove: 0.5 },
  },
  // ---- Überarbeitete Kandidaten (zweite Runde, nach den Sweeps)
  tempo2: { id: 'tempo2', label: 'Tempo', knobs: { weighOpening: false, bold: false, ambition: 0, cheftEagerPairs: 99, pairTakeAt: 5 } },
  lauerer: { id: 'lauerer', label: 'Lauerer (mild)', knobs: { ambition: 0.8, tuning: { holdAt0: 0.2 } } },
  lauerer2: { id: 'lauerer2', label: 'Lauerer (mittel)', knobs: { ambition: 0.9, tuning: { holdAt0: 0, w0: 2, w1: 4 } } },
  lauerer3: { id: 'lauerer3', label: 'Lauerer (stark)', knobs: { ambition: 1, tuning: { holdAt0: -5, w0: 2, w1: 8 } } },
  cheft2: { id: 'cheft2', label: 'Cheft-Fan', knobs: { cheftEagerPairs: 4, pairTakeAt: 3, pairLove: 1.8, ambition: 0.5 } },
  cheft3: { id: 'cheft3', label: 'Cheft-Fan (stark)', knobs: { cheftEagerPairs: 4, pairTakeAt: 3, pairLove: 4, ambition: 0.7 } },
  zocker2: { id: 'zocker2', label: 'Zocker', knobs: { cheftEagerPairs: 3, pairTakeAt: 3, pairLove: 2, ambition: 0.6 } },
  zocker3: { id: 'zocker3', label: 'Zocker (wild)', knobs: { cheftEagerPairs: 3, pairTakeAt: 2, gamble: 0.25, pairLove: 2, ambition: 0.7 } },
  hasardeur: { id: 'hasardeur', label: 'Hasardeur', knobs: { cheftEagerPairs: 3, pairTakeAt: 2, pairLove: 2, ambition: 0.9, tuning: { holdAt0: 0, w0: 2, w1: 4 } } },
  jaeger: { id: 'jaeger', label: 'Königsjäger', knobs: { huntLeader: 1, blockWeight: 12 } },
};

export function persona(def: PersonaDef, extra: Partial<Omit<Persona, 'def'>> = {}): Persona {
  return { def, loyalty: 1, jitter: 0, tilt: 0, ...extra };
}
