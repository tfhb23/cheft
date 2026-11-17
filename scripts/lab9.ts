/** Glücksritter-Regler: Lässt sich der Verlust-Anteil senken, ohne die Cheft-Neigung aufzugeben? npx tsx scripts/lab9.ts [Spiele=600] [Runden=7] */
import { Spec, runSpecs } from './roles';
const games = Number(process.argv[2] ?? 600);
const rounds = Number(process.argv[3] ?? 7);
const ctl: Spec = { name: 'Kontrolle', level: 'normal' };
const G = (name: string, knobs: object): Spec => ({ name, level: 'normal', persona: 'zocker2', knobs });
const specs: Spec[] = [
  G('Glücksritter (jetzt)', {}),
  G('pairLove 1 (nicht ganz so paarverliebt)', { pairLove: 1 }),
  G('ambition 0,2', { ambition: 0.2 }),
  G('ambition 1,0 (immer mutig)', { ambition: 1 }),
  G('Frühvogel-Tempo + Cheft ab 3 Paaren', { weighOpening: false, bold: false, ambition: 0 }),
  G('Cheft ab 3, Ablage nehmen erst ab 4', { pairTakeAt: 4, cheftEagerPairs: 3, gamble: 0.3 }),
];
const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '–');
for (const sp of specs) {
  const { sums } = await runSpecs([sp, ctl, ctl, ctl], games, rounds, 0);
  const s = sums[0] as unknown as Record<string, number>;
  console.log(`${sp.name.padEnd(42)} ${f(s.win)}% | ${f(s.pen)} (${f(s.sd, 0)}) | ≥100/≥200 Vorsprung ${f(s.bigWin100)}% / ${f(s.bigWin200)}% | ≥200 Rückstand ${f(s.bigLoss200)}% | Cheft ${f(s.cheft, 0)}% (${f(s.cheftWinRate, 0)}% gewonnen) | Züge bis Erstm. ${f(s.turnsToOpen)}`);
}
console.log('FERTIG');
