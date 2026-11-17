/**
 * Stärke nach der Fehlerbehebung: Jede Rolle (mit Fehlerbehebung) gegen drei Bots mit dem ALTEN Verhalten („Lineal“: Gefahrenmodus für alle,
 * Hochkarten früh abwerfen). So lässt sich die absolute Stärke vor und nach der Fehlerbehebung vergleichen.
 *   npx tsx scripts/lab13.ts roles|levels [Spiele=600] [Runden=7]
 */
import { Spec, line, runSpecs } from './roles';
import type { BotLevel } from '../src/engine/game';
import type { RoleId } from '../src/bot/roles';

const set = process.argv[2] ?? 'roles';
const games = Number(process.argv[3] ?? 600);
const rounds = Number(process.argv[4] ?? 7);
const legacy = (level: BotLevel): Spec => ({ name: 'Lineal (altes Verhalten)', level, knobs: { dangerOpenedOnly: false, shedPre: 0.12 } });
const R = (name: string, role: RoleId, level: BotLevel = 'normal'): Spec => ({ name, level, role });
const runs: Spec[][] = [];
if (set === 'roles') for (const id of ['balanced', 'early', 'cunning', 'pairs', 'gambler', 'wildcard'] as RoleId[]) runs.push([R(`${id} (behoben)`, id), legacy('normal'), legacy('normal'), legacy('normal')]);
if (set === 'levels') for (const l of ['easy', 'normal', 'hard', 'master'] as BotLevel[]) runs.push([R(`balanced ${l} (behoben)`, 'balanced', l), legacy(l), legacy(l), legacy(l)]);
for (const specs of runs) {
  const { sums } = await runSpecs(specs, games, rounds, 0);
  console.log(line(specs[0].name, sums[0]) + ` | Lineal-Bots: Sieg ${sums[1].win.toFixed(1)} Pen ${sums[1].pen.toFixed(1)}`);
}
console.log('FERTIG');
