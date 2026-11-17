/**
 * Gegner-Gedächtnis: Woher kommen die Mehrkosten? Ehrgeiz-Verschiebung (oppTempo) und Abwurfwahl (oppUse) getrennt.
 * Plus eine Identitätsprobe (derselbe Bot wie die Kontrolle), die zeigt, wie groß das Rauschen der Messung ist.
 *   npx tsx scripts/lab7.ts [Spiele=1000] [Runden=7]
 */
import { appendFileSync } from 'node:fs';
import { Spec, line, runSpecs } from './roles';
import type { BotLevel } from '../src/engine/game';

const games = Number(process.argv[2] ?? 1000);
const rounds = Number(process.argv[3] ?? 7);
const out = process.env.OUT;
const cfg: [string, BotLevel, object][] = [
  ['Identitätsprobe (wie Kontrolle)', 'master', {}],
  ['nur Abwurfwahl (oppTempo 0)', 'master', { oppUse: 1, oppTempo: 0 }],
  ['nur Ehrgeiz (oppUse 0 für Abwurf geht nicht, daher oppUse 1, Tempo 1)', 'master', { oppUse: 1, oppTempo: 1 }],
  ['Ehrgeiz stark (Tempo 3)', 'master', { oppUse: 1, oppTempo: 3 }],
  ['Scharfsinnig nur Abwurfwahl', 'hard', { oppUse: 1, oppTempo: 0 }],
  ['Normal nur Abwurfwahl', 'normal', { oppUse: 1, oppTempo: 0 }],
];
for (const [name, level, knobs] of cfg) {
  const t: Spec = { name, level, knobs };
  const c: Spec = { name: 'Kontrolle', level };
  const { accs, sums, secs } = await runSpecs([t, c, c, c], games, rounds, 0);
  console.log(line(name, sums[0]) + ` | Kontrolle Sieg ${sums[1].win.toFixed(1)} Pen ${sums[1].pen.toFixed(1)} (${secs.toFixed(0)} s)`);
  if (out) appendFileSync(out, JSON.stringify({ spec: t, sum: sums[0], ctl: sums[1], acc: accs[0] }) + '\n');
}
console.log('FERTIG');
