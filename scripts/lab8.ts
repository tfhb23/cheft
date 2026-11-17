/**
 * „Teures Vergnügen“: Wie oft gewinnt oder verliert ein Bot haushoch? Ein Platz gegen drei Ausgewogene (Normal), 7 Runden.
 *   npx tsx scripts/lab8.ts [Spiele=600] [Runden=7]
 */
import { Spec, runSpecs } from './roles';

const games = Number(process.argv[2] ?? 600);
const rounds = Number(process.argv[3] ?? 7);
const ctl: Spec = { name: 'Kontrolle', level: 'normal' };
const P = (name: string, persona: string, extra: Partial<Spec> = {}): Spec => ({ name, level: 'normal', persona, ...extra });
const specs: Spec[] = [
  P('Ausgewogen', 'ausgewogen'),
  P('Frühvogel', 'tempo2'),
  P('Pärchenkönig', 'cheft2'),
  P('Glücksritter (jetzt)', 'zocker2'),
  P('Glücksritter früh Cheft nur 1. Rundenhälfte', 'netzA'),
  P('Glücksritter nur wenn hinten (30+)', 'netzB'),
  P('Glücksritter 1. Hälfte oder hinten', 'netzC'),
  P('Glücksritter ganz früh oder hinten', 'netzD'),
  P('Hasardeur (warten + Cheft 3)', 'hasardeur'),
  P('Glücksritter + Stimmung 1 (tilt)', 'zocker2', { tilt: 1 }),
];
const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '–');
console.log(`${games} Spiele à ${rounds} Runden. Spalten: Sieg | Strafpunkte/Runde (Streuung) | Spiele mit ≥100 / ≥200 Vorsprung | Spiele mit ≥200 Rückstand | mittlerer Vorsprung der Siege | Cheft-Runden (selbst gewonnen)`);
for (const sp of specs) {
  const { sums } = await runSpecs([sp, ctl, ctl, ctl], games, rounds, 0);
  const s = sums[0] as unknown as Record<string, number>;
  console.log(`${sp.name.padEnd(46)} ${f(s.win)}% | ${f(s.pen)} (${f(s.sd, 0)}) | ${f(s.bigWin100)}% / ${f(s.bigWin200)}% | ${f(s.bigLoss200)}% | ${f(s.winMargin, 0)} | Cheft ${f(s.cheft, 0)}% (${f(s.cheftWinRate, 0)}% gewonnen)`);
}
console.log('FERTIG');
