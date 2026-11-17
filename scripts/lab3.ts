/**
 * Zweite Runde: überarbeitete Rollen. Alle vier Plätze bekommen dieselbe Grundeinstellung (BASE, z. B. shedPre 0 und
 * dangerHand 0), damit nur der Charakter der Rolle verglichen wird.
 *   BASE='{"shedPre":0,"dangerHand":0}' npx tsx scripts/lab3.ts <satz> [Spiele] [Runden]
 */
import { appendFileSync } from 'node:fs';
import { CAND } from '../src/bot/personas';
import { Spec, line, runSpecs } from './roles';

const set = process.argv[2] ?? 'v2';
const games = Number(process.argv[3] ?? 600);
const rounds = Number(process.argv[4] ?? 5);
const base = JSON.parse(process.env.BASE ?? '{}');
const out = process.env.OUT;
const ctl: Spec = { name: 'Kontrolle', level: 'normal', knobs: base };
const T = (name: string, extra: Partial<Spec>): Spec => ({ name, level: 'normal', knobs: base, ...extra });
const calm = ['ausgewogen', 'tempo2', 'lauerer'];
const wild = ['ausgewogen', 'tempo2', 'lauerer2', 'cheft2', 'zocker2'];
const sets: Record<string, Spec[]> = {
  v2: [
    T('ausgewogen', { persona: 'ausgewogen' }),
    T('tempo2', { persona: 'tempo2' }),
    T('lauerer mild', { persona: 'lauerer' }),
    T('lauerer mittel', { persona: 'lauerer2' }),
    T('lauerer stark', { persona: 'lauerer3' }),
    T('cheft2', { persona: 'cheft2' }),
    T('cheft3 (stark)', { persona: 'cheft3' }),
    T('zocker2', { persona: 'zocker2' }),
    T('zocker3 (wild)', { persona: 'zocker3' }),
    T('hasardeur', { persona: 'hasardeur' }),
    T('wildcard ruhig', { persona: 'ausgewogen', loyalty: 0, jitter: 0.3, pool: calm }),
    T('wildcard gemischt', { persona: 'ausgewogen', loyalty: 0, jitter: 0.3, pool: wild }),
    T('wildcard treu 0.5', { persona: 'ausgewogen', loyalty: 0.5, jitter: 0.3, pool: wild }),
  ],
};
void CAND;
for (const sp of sets[set]) {
  const { accs, sums, secs } = await runSpecs([sp, ctl, ctl, ctl], games, rounds, 0);
  console.log(line(sp.name, sums[0]) + `  (${secs.toFixed(0)} s)`);
  if (out) appendFileSync(out, JSON.stringify({ set, spec: sp, games, rounds, sum: sums[0], ctl: sums[1], acc: accs[0] }) + '\n');
}
console.log('FERTIG');
