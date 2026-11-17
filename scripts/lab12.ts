/** Grundstrategie: Was bringt es, die zwei Gewohnheiten zu entschärfen? Ein Bot gegen drei Standard-Bots. npx tsx scripts/lab12.ts [Spiele=600] [Runden=5] */
import { Spec, runSpecs } from './roles';
const games = Number(process.argv[2] ?? 600);
const rounds = Number(process.argv[3] ?? 5);
const ctl: Spec = { name: 'Kontrolle', level: 'normal' };
const K = (name: string, knobs: object): Spec => ({ name, level: 'normal', knobs });
const specs: Spec[] = [
  K('Standard (zum Vergleich)', {}),
  K('Gefahrenmodus nur für Spieler, die draußen sind', { dangerOpenedOnly: true }),
  K('Hochkarten vor der Erstmeldung nicht abwerfen (shedPre 0)', { shedPre: 0 }),
  K('beides', { dangerOpenedOnly: true, shedPre: 0 }),
  K('Gefahrenmodus ganz aus + shedPre 0', { dangerHand: 0, shedPre: 0 }),
];
const f = (x: number, d = 1) => x.toFixed(d);
for (const first of [0, 7000]) {
  for (const sp of specs) {
    const { sums } = await runSpecs([sp, ctl, ctl, ctl], games, rounds, first);
    console.log(`Start ${String(first).padEnd(5)} ${sp.name.padEnd(62)} Sieg ${f(sums[0].win)}±${f(sums[0].err)} Pen ${f(sums[0].pen)} ohne Erstmeldung ${f(sums[0].unopened, 0)}% (Kontrolle: Sieg ${f(sums[1].win)} Pen ${f(sums[1].pen)})`);
  }
}
console.log('FERTIG');
