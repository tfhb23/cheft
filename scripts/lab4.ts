/** Kleiner Test: Vorlieben (Abwurf-Zuschlag) und Satz/Folge-Neigung. npx tsx scripts/lab4.ts [Spiele] */
import { Spec, runSpecs } from './roles';
const games = Number(process.argv[2] ?? 400);
const T = (name: string, knobs: object): Spec => ({ name, level: 'normal', persona: 'ausgewogen', knobs });
const specs: Spec[] = [
  T('ohne Vorliebe', {}),
  ...[3, 6, 12, 25, 100].map((w) => T(`Herz w${w}`, { tasteSuit: 'H', tasteWeight: w })),
  ...[6, 12, 25].map((w) => T(`niedrige w${w}`, { tasteLow: true, tasteWeight: w })),
  ...[6, 12, 25].map((w) => T(`Bildkarten w${w}`, { tasteFace: true, tasteWeight: w })),
  ...[6, 12].map((w) => T(`schwarz w${w}`, { tasteColor: 'black', tasteWeight: w })),
  ...[6, 12, 25].map((w) => T(`Bube+7 w${w}`, { tasteRanks: [11, 7], tasteWeight: w })),
  T('Sätze 1.5 / Folgen .67', { setLove: 1.5, runLove: 0.67 }),
  T('Sätze 3 / Folgen .33', { setLove: 3, runLove: 0.33 }),
  T('Folgen 1.5 / Sätze .67', { runLove: 1.5, setLove: 0.67 }),
  T('Folgen 3 / Sätze .33', { runLove: 3, setLove: 0.33 }),
];
const ctl: Spec = { name: 'Kontrolle', level: 'normal' };
const f = (x: number, d = 1) => x.toFixed(d);
for (const sp of specs) {
  const { sums } = await runSpecs([sp, ctl, ctl, ctl], games, 5, 0);
  const s = sums[0] as any, c = sums[1] as any;
  console.log(`${sp.name.padEnd(24)} Sieg ${f(s.win)}±${f(s.err)} Pen ${f(s.pen)} | Anteil an Abwürfen: Herz ${f(s.dH)} (Kontr. ${f(c.dH)}) niedrig ${f(s.dLow)} (${f(c.dLow)}) Bild ${f(s.dFace)} (${f(c.dFace)}) Bube/7 ${f(s.dRanks)} (${f(c.dRanks)}) | Cheft ${f(s.cheft, 0)}% Erstm. ${f(s.openAugen, 0)}`);
}
