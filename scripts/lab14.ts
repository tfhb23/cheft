/**
 * Rollen-Eigenschaften schärfen und dabei Stärke kosten: Varianten einer Rolle (nach der Fehlerbehebung) gegen drei Bots mit dem alten Verhalten.
 *   npx tsx scripts/lab14.ts [Spiele=500] [Runden=7]
 */
import { Spec, line, runSpecs } from './roles';
import type { RoleId, RoleOptions } from '../src/bot/roles';

const games = Number(process.argv[2] ?? 500);
const rounds = Number(process.argv[3] ?? 7);
const ctl: Spec = { name: 'Lineal', level: 'normal', knobs: { dangerOpenedOnly: false, shedPre: 0.12 } };
const V = (name: string, role: RoleId, o: RoleOptions): Spec => ({ name, level: 'normal', role, roleOpts: { loyalty: 1, ...o } });
const specs: Spec[] = [
  V('balanced', 'balanced', {}),
  V('early', 'early', {}),
  V('early Eile 1,5', 'early', { carelessness: { noise: 1.5, handMiss: 1.5 } }),
  V('early Eile 2', 'early', { carelessness: { noise: 2, handMiss: 2 } }),
  V('early Eile 3', 'early', { carelessness: { noise: 3, handMiss: 2.5 } }),
  V('cunning', 'cunning', {}),
  V('cunning Hürde 1 (holdAt0 0,1, Ehrgeiz .85)', 'cunning', { knobs: { ambition: 0.85, tuning: { holdAt0: 0.1 } } }),
  V('cunning Hürde 2 (holdAt0 0, Ehrgeiz .9)', 'cunning', { knobs: { ambition: 0.9, tuning: { holdAt0: 0, w0: 2, w1: 4 } } }),
  V('cunning Hürde 3 (holdAt0 -0,2, Ehrgeiz .95)', 'cunning', { knobs: { ambition: 0.95, tuning: { holdAt0: -0.2, w0: 2, w1: 6 } } }),
  V('pairs', 'pairs', {}),
  V('pairs Paarliebe 3', 'pairs', { knobs: { pairLove: 3 } }),
  V('pairs Paarliebe 3, Ehrgeiz .7', 'pairs', { knobs: { pairLove: 3, ambition: 0.7 } }),
  V('pairs Paarliebe 4, Ablage ab 2 Paaren', 'pairs', { knobs: { pairLove: 4, ambition: 0.7, pairTakeAt: 2 } }),
  V('gambler', 'gambler', {}),
  V('gambler immer ab 3 Paaren', 'gambler', { knobs: { cheftEagerPairs: 3 } }),
];
for (const sp of specs) {
  const { sums } = await runSpecs([sp, ctl, ctl, ctl], games, rounds, 0);
  console.log(line(sp.name, sums[0]) + ` | Lineal-Bots Sieg ${sums[1].win.toFixed(1)} Pen ${sums[1].pen.toFixed(1)}`);
}
console.log('FERTIG');
