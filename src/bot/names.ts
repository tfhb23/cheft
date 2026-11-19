/**
 * Bot-Auswahl: 4 Gedächtnisse (Stufen) × 6 Rollen (fünf Spielweisen und die Wildcard). Die Namen stehen in rolenames.ts.
 * „Zufällig“ wählt vor dem Spiel verdeckt für das ganze Spiel (die Wildcard darf dabei herauskommen), die Wildcard selbst wechselt
 * die Spielweise jede Runde (siehe roles.ts).
 */
import { BotLevel, BotStyle } from '../engine/game';
import { pickRoleName } from './rolenames';
import { roleOfStyle } from './roles';

export const LEVELS: BotLevel[] = ['easy', 'normal', 'hard', 'master'];
/**
 * „Zufall“ wählt nur aus diesen Stufen (Gedächtnis), nach unten gewichtet, damit eine Familienrunde meist
 * milde Gegner bekommt; der Mastermind muss bewusst gewählt werden.
 */
export const RANDOM_LEVELS: [BotLevel, number][] = [
  ['easy', 0.4],
  ['normal', 0.4],
  ['hard', 0.2],
];

function pickRandomLevel(rng: () => number): BotLevel {
  let x = rng();
  for (const [level, weight] of RANDOM_LEVELS) {
    if (x < weight) return level;
    x -= weight;
  }
  return RANDOM_LEVELS[RANDOM_LEVELS.length - 1][0];
}

export const STYLES: BotStyle[] = ['balanced', 'early', 'cunning', 'pairs', 'gambler', 'wildcard'];

export interface BotChoice {
  level: BotLevel | 'random';
  style: BotStyle | 'random';
}

/** Macht aus einer gespeicherten oder übertragenen Auswahl eine gültige (alte Spielweisen werden auf die neuen Rollen abgebildet). */
export function sanitizeChoice(c: Partial<BotChoice> | undefined | null): BotChoice {
  const level = c && (c.level === 'random' || LEVELS.includes(c.level as BotLevel)) ? (c.level as BotLevel | 'random') : 'random';
  const style = !c || c.style === undefined || c.style === 'random' ? 'random' : (roleOfStyle(c.style) as BotStyle);
  return { level, style };
}

/** Löst Zufallswahlen auf und vergibt eindeutige Namen. */
export function resolveBots(choices: BotChoice[], rng: () => number): { level: BotLevel; style: BotStyle; name: string; fixed: { level: boolean; style: boolean } }[] {
  const used = new Set<string>();
  return choices.map((raw) => {
    const c = sanitizeChoice(raw);
    const level = c.level === 'random' ? pickRandomLevel(rng) : c.level;
    const style = c.style === 'random' ? STYLES[Math.floor(rng() * STYLES.length)] : c.style;
    const name = pickRoleName(level, roleOfStyle(style), rng, used);
    used.add(name);
    return { level, style, name, fixed: { level: c.level !== 'random', style: c.style !== 'random' } };
  });
}
