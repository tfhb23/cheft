/**
 * Erkennt das Gegner-Gedächtnis die Vorlieben der anderen? Drei Bots mit zufälligen Vorlieben spielen 7 Runden; nach jeder Runde bildet
 * ein Beobachter (Platz 0) sich aus den Rundenprofilen ein Bild von jedem Gegner. Verglichen wird es mit den echten Vorlieben
 * (Korrelation über alle 52 Kartensorten) und mit der echten Cheft-Neigung. Das Bild wird mit den Gedächtnissen aller Stufen gebildet.
 *
 *   npx tsx scripts/lab_infer.ts [Spiele=150] [Runden=7]
 */
import { makeDeck } from '../src/engine/cards';
import { simulate } from '../src/bot/simulate';
import { MEMORY, MemoryParams } from '../src/bot/memory';
import { likes, opponentModel } from '../src/bot/opponents';
import { tasteScore, tastesFor } from '../src/bot/tastes';
import type { GameState } from '../src/engine/game';

const games = Number(process.argv[2] ?? 150);
const rounds = Number(process.argv[3] ?? 7);
const kinds = makeDeck().filter((c, i, a) => c.suit !== 'J' && a.findIndex((x) => x.suit === c.suit && x.rank === c.rank) === i);
const variants: [string, MemoryParams][] = [
  ['Mastermind', MEMORY.master],
  ['Scharfsinnig', MEMORY.hard],
  ['Normal', MEMORY.normal],
  ['Vergesslich', MEMORY.easy],
];

function corr(a: number[], b: number[]): number | null {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    sab += (a[i] - ma) * (b[i] - mb);
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  }
  if (saa < 1e-9 || sbb < 1e-9) return null;
  return sab / Math.sqrt(saa * sbb);
}

// Ergebnis: je Variante und Anzahl bekannter Runden die Korrelationen
const acc = new Map<string, { sum: number; n: number; unknown: number; cheftErr: number; cheftN: number; hit: number; hitN: number }>();
const key = (v: string, r: number) => `${v}|${r}`;

for (let i = 0; i < games; i++) {
  let seen = 0;
  const check = (g: GameState) => {
    const done = g.history.length;
    if (done <= seen || done < 1) return;
    seen = done;
    for (const [name, params] of variants) {
      for (let j = 1; j < 4; j++) {
        const m = opponentModel(g, 0, j, params);
        const a = acc.get(key(name, done)) ?? { sum: 0, n: 0, unknown: 0, cheftErr: 0, cheftN: 0, hit: 0, hitN: 0 };
        if (!m) {
          a.unknown++;
          acc.set(key(name, done), a);
          continue;
        }
        const truth = tastesFor(g.seed, j);
        const t = kinds.map((c) => tasteScore(truth, c));
        const p = kinds.map((c) => likes(m, c));
        const r = corr(t, p);
        if (r !== null) {
          a.sum += r;
          a.n++;
        }
        // Trefferquote: Ist die Hauptvorliebe eine Farbe oder eine Wertklasse, rät das Bild sie?
        const main = truth.tastes.find((x) => x.weight >= 3.5 && !x.superstition);
        if (main && m.detail >= 1) {
          const sp = main.spec;
          if (sp.kind === 'suit' && m.detail === 2) {
            a.hitN++;
            if (m.suit.indexOf(Math.max(...m.suit)) === ['H', 'D', 'C', 'S'].indexOf(sp.suit)) a.hit++;
          } else if (sp.kind === 'range' && sp.range !== 'ace') {
            a.hitN++;
            const cls = { low: m.low, mid: m.mid, face: m.face };
            const best = (Object.keys(cls) as ('low' | 'mid' | 'face')[]).reduce((x, y) => (cls[y] > cls[x] ? y : x));
            if (best === sp.range) a.hit++;
          } else if (sp.kind === 'color') {
            a.hitN++;
            if ((m.red > 0) === (sp.color === 'red')) a.hit++;
          }
        }
        const real = g.history.filter((h) => h.profiles?.[j]?.cheft).length / done;
        a.cheftErr += Math.abs(m.cheftRate - real);
        a.cheftN++;
        acc.set(key(name, done), a);
      }
    }
  };
  simulate({
    seed: 91000 + i,
    rounds,
    seats: Array.from({ length: 4 }, () => ({ level: 'normal' as const, style: 'balanced' as const, opts: { knobs: { taste: 'auto' as const, ...JSON.parse(process.env.TASTE_KNOBS ?? '{}') } } })),
    visit: (g) => {
      if (g.round.plies === 0) check(g);
    },
  });
}

console.log(`${games} Spiele à ${rounds} Runden, 3 Gegner mit Vorlieben. Korrelation zwischen erkannten und echten Vorlieben (1 = perfekt, 0 = nichts erkannt)`);
console.log('Runden gespielt: ' + Array.from({ length: rounds - 1 }, (_, k) => String(k + 1).padStart(14)).join(''));
for (const [name] of variants) {
  const cells = Array.from({ length: rounds - 1 }, (_, k) => {
    const a = acc.get(key(name, k + 1));
    if (!a) return '–'.padStart(14);
    const known = a.n + (a.cheftN - a.n);
    void known;
    return `${(a.n ? a.sum / a.n : NaN).toFixed(2)} (${a.cheftN}/${a.cheftN + a.unknown})`.padStart(14);
  });
  console.log(name.padEnd(16) + cells.join(''));
}
console.log('\nFehler der erkannten Cheft-Neigung (Betrag, 0 = exakt):');
for (const [name] of variants) {
  const cells = Array.from({ length: rounds - 1 }, (_, k) => {
    const a = acc.get(key(name, k + 1));
    return (a && a.cheftN ? (a.cheftErr / a.cheftN).toFixed(2) : '–').padStart(14);
  });
  console.log(name.padEnd(16) + cells.join(''));
}
console.log('\nTrefferquote der Hauptvorliebe (Farbe, Wertklasse oder Rot/Schwarz; Zufall: Farbe 25 %, Klasse 33 %, Rot/Schwarz 50 %):');
for (const [name] of variants) {
  const cells = Array.from({ length: rounds - 1 }, (_, k) => {
    const a = acc.get(key(name, k + 1));
    return (a && a.hitN ? `${((100 * a.hit) / a.hitN).toFixed(0)} % (${a.hitN})` : '–').padStart(14);
  });
  console.log(name.padEnd(16) + cells.join(''));
}
console.log('(in Klammern: Gegner mit Bild / alle Gegner nach dieser Runde)');
