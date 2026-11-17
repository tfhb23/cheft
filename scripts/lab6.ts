/**
 * Wie deutlich sieht man eine Vorliebe am Abwurf? Ein Bot mit fester Vorliebe (Gewicht 5) gegen drei ohne; gemessen wird der Anteil der
 * Abwürfe, die zur Vorliebe passen, gegen den Anteil bei den Kontrollen (je kleiner, desto lieber behält der Bot sie).
 *   npx tsx scripts/lab6.ts [Spiele=400]
 */
import { Spec, runSpecs } from './roles';
import type { TasteSet, TasteSpec } from '../src/bot/tastes';

const games = Number(process.argv[2] ?? 400);
const ctl: Spec = { name: 'Kontrolle', level: 'normal' };
const set = (spec: TasteSpec, weight: number): TasteSet => ({ intensity: 1, tastes: [{ spec, weight }] });
const tastes: { name: string; set: TasteSet; metric: 'dH' | 'dFace' | 'dRanks' | 'dLow' }[] = [
  { name: 'Herz', set: set({ kind: 'suit', suit: 'H' }, 5), metric: 'dH' },
  { name: 'Bildkarten', set: set({ kind: 'range', range: 'face' }, 5), metric: 'dFace' },
  { name: 'Sieben und Buben', set: set({ kind: 'ranks', ranks: [7, 11] }, 5), metric: 'dRanks' },
  { name: 'niedrige (Gewicht 2,5)', set: set({ kind: 'range', range: 'low' }, 2.5), metric: 'dLow' },
];
const settings: [string, object][] = [
  ['Skala 1, Band 4', { tasteScale: 1, tasteBand: 4 }],
  ['Skala 2, Band 8', { tasteScale: 2, tasteBand: 8 }],
  ['Skala 3, Band 12, Schutz 20', { tasteScale: 3, tasteBand: 12, tasteProt: 20 }],
];
for (const t of tastes) {
  for (const [sn, k] of settings) {
    const sp: Spec = { name: `${t.name} / ${sn}`, level: 'normal', knobs: { taste: t.set, ...k } };
    const { sums } = await runSpecs([sp, ctl, ctl, ctl], games, 5, 0);
    const s = sums[0] as unknown as Record<string, number>;
    const c = sums[1] as unknown as Record<string, number>;
    console.log(`${sp.name.padEnd(48)} Anteil Abwürfe ${s[t.metric].toFixed(1)} % (Kontrolle ${c[t.metric].toFixed(1)} %, Verhältnis ${(s[t.metric] / c[t.metric]).toFixed(2)}) | Sieg ${s.win.toFixed(1)} Pen ${s.pen.toFixed(1)} (Kontrolle ${c.pen.toFixed(1)})`);
  }
}
console.log('FERTIG');
