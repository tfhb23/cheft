/** Glücksritter „hinten“-Schwellen. npx tsx scripts/lab10.ts [Spiele=600] [Runden=7] */
import { Spec, runSpecs } from './roles';
const games = Number(process.argv[2] ?? 600);
const rounds = Number(process.argv[3] ?? 7);
const ctl: Spec = { name: 'Kontrolle', level: 'normal' };
const P = (name: string, persona: string): Spec => ({ name, level: 'normal', persona });
const specs = [P('Glücksritter nur wenn hinten (30+)', 'netzB'), P('früh Cheft, sobald er nicht führt', 'netzE'), P('früh Cheft ab 15 Punkten Rückstand', 'netzF'), P('ab 15: 3 Paare, ab 60: schon 2 Paare', 'netzG')];
const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '–');
for (const sp of specs) {
  const { sums } = await runSpecs([sp, ctl, ctl, ctl], games, rounds, 0);
  const s = sums[0] as unknown as Record<string, number>;
  console.log(`${sp.name.padEnd(42)} ${f(s.win)}% | ${f(s.pen)} (${f(s.sd, 0)}) | ≥100/≥200 Vorsprung ${f(s.bigWin100)}% / ${f(s.bigWin200)}% | ≥200 Rückstand ${f(s.bigLoss200)}% | Cheft ${f(s.cheft, 0)}% nie in ${f(s.cheftNone, 0)}% der Spiele (${f(s.cheftWinRate, 0)}% gewonnen)`);
}
console.log('FERTIG');
