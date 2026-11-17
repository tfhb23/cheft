/** Gerissener einzeln bei 7 Runden: reine Rolle gegen Wiederholung (anderer Startindex). npx tsx scripts/lab11.ts [Spiele=800] */
import { Spec, runSpecs } from './roles';
const games = Number(process.argv[2] ?? 800);
const ctl: Spec = { name: 'Kontrolle', level: 'normal' };
const specs: Spec[] = [
  { name: 'Ausgewogen pur', level: 'normal', persona: 'ausgewogen' },
  { name: 'Gerissener pur (holdAt0 0,2)', level: 'normal', persona: 'lauerer' },
  { name: 'Gerissener holdAt0 0,3', level: 'normal', knobs: { ambition: 0.8, tuning: { holdAt0: 0.3 } } },
  { name: 'Gerissener holdAt0 0,3, Ehrgeiz 0,7', level: 'normal', knobs: { ambition: 0.7, tuning: { holdAt0: 0.3 } } },
];
for (const first of [0, 5000]) {
  for (const sp of specs) {
    const { sums } = await runSpecs([sp, ctl, ctl, ctl], games, 7, first);
    const s = sums[0];
    console.log(`Start ${String(first).padEnd(5)} ${sp.name.padEnd(40)} Sieg ${s.win.toFixed(1)}±${s.err.toFixed(1)} Pen ${s.pen.toFixed(1)} Züge bis Erstm. ${s.turnsToOpen.toFixed(2)} früh ${s.early.toFixed(0)}%`);
  }
}
console.log('FERTIG');
