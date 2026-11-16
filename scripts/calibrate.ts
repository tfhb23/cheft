/**
 * Kalibrierung der Bot-Stufen (Gedächtnis): Alle vier Stufen spielen am selben Tisch gegeneinander.
 * Plätze und Geber rotieren (Latin-Design über je 16 Spiele), damit kein Sitz- oder Startvorteil das Ergebnis verfälscht.
 *
 *   npm run calibrate                         256 Spiele, 5 Runden, Spielweise "Ausgewogen", alle Regler
 *   npm run calibrate -- 640 5 sprinter       640 Spiele, 5 Runden, Spielweise Sprinter
 *   npm run calibrate -- 256 5 balanced full  vierter Wert: Variante
 *   npm run calibrate -- 960 5 balanced full 4000  fünfter Wert: Startindex der Spiele (unabhängige Wiederholung)
 *
 * Varianten (wozu trägt welcher Regler bei?):
 *   full         alles wie in der App
 *   memory       nur das Gedächtnis (Spanne, Streuung, Genauigkeit, Beobachtung, Tagesform), ohne Übersehen
 *   perception   nur Übersehen (Tisch und Handüberblick), mit perfektem Gedächtnis
 *   none         Kontrolle: alles perfekt; jede Stufe muss dann ≈ 25 % erreichen
 *
 * Zielwerte am Vierertisch (fair wären 25 %): Vergesslich ≈ 20 %, Normal ≈ 24 %, Scharfsinnig ≈ 27 %, Mastermind ≈ 30 %.
 * Besser als die Siegquote (stark vom Kartenglück verrauscht) misst man die Strafpunkte pro Runde.
 * Die Spiele laufen parallel auf allen Kernen (Worker); das Ergebnis hängt nicht von der Zahl der Kerne ab.
 *
 * Werte ausprobieren, ohne die Tabelle in memory.ts zu ändern (Gedächtnis-Überschreibungen je Stufe als JSON):
 *   CALIB_OVERRIDE='{"easy":{"handMiss":0.4},"normal":{"handMiss":0.2}}' npm run calibrate -- 480 5
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { LEVELS } from '../src/bot/names';
import { simulate } from '../src/bot/simulate';
import type { MemoryParams } from '../src/bot/memory';
import type { BotLevel, BotStyle } from '../src/engine/game';

type Variant = 'full' | 'memory' | 'perception' | 'none';

interface Job {
  indices: number[];
  rounds: number;
  style: BotStyle;
  variant: Variant;
}
interface Tally {
  wins: number;
  penalty: number;
  roundWins: number;
  seats: number;
}
interface ShardResult {
  tally: Record<BotLevel, Tally>;
  seatWins: number[];
  rounds: number;
}

const NO_PERCEPTION: Partial<MemoryParams> = { handMiss: 0, tableMiss: 0 };
const PERFECT_MEMORY: Partial<MemoryParams> = { span: Infinity, spread: [1, 1], accuracy: 1, form: 0, observe: 1 };
const OVERRIDE: Partial<Record<BotLevel, Partial<MemoryParams>>> = process.env.CALIB_OVERRIDE ? JSON.parse(process.env.CALIB_OVERRIDE) : {};
const optsFor = (variant: Variant, level: BotLevel): { memory?: Partial<MemoryParams> } | undefined => {
  const extra = OVERRIDE[level] ?? {};
  switch (variant) {
    case 'memory':
      return { memory: { ...extra, ...NO_PERCEPTION } };
    case 'perception':
      return { memory: { ...extra, ...PERFECT_MEMORY } };
    case 'none':
      return { memory: { ...extra, ...NO_PERCEPTION, ...PERFECT_MEMORY } };
    default:
      return Object.keys(extra).length ? { memory: extra } : undefined;
  }
};

function runShard(job: Job): ShardResult {
  const tally = Object.fromEntries(LEVELS.map((l) => [l, { wins: 0, penalty: 0, roundWins: 0, seats: 0 }])) as Record<BotLevel, Tally>;
  const seatWins = [0, 0, 0, 0];
  let rounds = 0;
  for (const i of job.indices) {
    const rot = i % 4;
    const dealer = Math.floor(i / 4) % 4;
    // Platz s bekommt Stufe (s + rot) mod 4: über vier Spiele sitzt jede Stufe einmal auf jedem Platz
    const seats = Array.from({ length: 4 }, (_, s) => ({ level: LEVELS[(s + rot) % 4], style: job.style, opts: optsFor(job.variant, LEVELS[(s + rot) % 4]) }));
    const res = simulate({ seed: 9000 + i, seats, rounds: job.rounds, dealer });
    rounds += res.state.history.length;
    seats.forEach((seat, s) => {
      const t = tally[seat.level];
      t.seats++;
      t.penalty += res.totals[s];
      t.roundWins += res.roundWins[s];
      if (res.winners.includes(s)) {
        t.wins += 1 / res.winners.length;
        seatWins[s] += 1 / res.winners.length;
      }
    });
  }
  return { tally, seatWins, rounds };
}

if (!isMainThread) {
  parentPort!.postMessage(runShard(workerData as Job));
} else {
  const games = Number(process.argv[2] ?? 256);
  const rounds = Number(process.argv[3] ?? 5);
  const style = (process.argv[4] ?? 'balanced') as BotStyle;
  const variant = (process.argv[5] ?? 'full') as Variant;
  const first = Number(process.argv[6] ?? 0); // Startindex: andere Spiele für unabhängige Wiederholungen
  const workers = Math.max(1, Math.min(cpus().length, 8));
  const t0 = Date.now();

  const shards = Array.from({ length: workers }, (_, w) => ({ indices: [] as number[], rounds, style, variant }) as Job);
  for (let i = first; i < first + games; i++) shards[(i - first) % workers].indices.push(i);

  const results = await Promise.all(
    shards.map(
      (job) =>
        new Promise<ShardResult>((resolve, reject) => {
          const w = new Worker(new URL(import.meta.url), { workerData: job, execArgv: ['--import', 'tsx'] });
          w.once('message', resolve);
          w.once('error', reject);
          w.once('exit', (code) => code !== 0 && reject(new Error(`Worker beendet mit Code ${code}`)));
        }),
    ),
  );

  const tally = Object.fromEntries(LEVELS.map((l) => [l, { wins: 0, penalty: 0, roundWins: 0, seats: 0 }])) as Record<BotLevel, Tally>;
  const seatWins = [0, 0, 0, 0];
  let playedRounds = 0;
  for (const r of results) {
    playedRounds += r.rounds;
    r.seatWins.forEach((w, s) => (seatWins[s] += w));
    for (const l of LEVELS) for (const k of Object.keys(tally[l]) as (keyof Tally)[]) tally[l][k] += r.tally[l][k];
  }

  const TARGET: Record<BotLevel, [number, number]> = { easy: [17, 22], normal: [22, 26], hard: [25, 29], master: [28, 33] };
  const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
  console.log(`\n${games} Spiele à ${rounds} Runden, Spielweise ${style}, Variante ${variant}, ${workers} Worker, ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
  console.log('Gedächtnis   Siegquote (95 %)     Ziel        Strafpunkte/Runde   Rundensiege');
  for (const level of LEVELS) {
    const t = tally[level];
    const p = t.wins / t.seats;
    const err = 1.96 * Math.sqrt((p * (1 - p)) / t.seats);
    const [lo, hi] = TARGET[level];
    const ok = p * 100 >= lo && p * 100 <= hi ? 'ok' : p * 100 < lo ? 'zu schwach' : 'zu stark';
    console.log(
      `${level.padEnd(11)}  ${pct(p).padStart(7)} (±${(100 * err).toFixed(1)})   ${`${lo}–${hi} %`.padEnd(9)}  ${(t.penalty / (t.seats * rounds)).toFixed(1).padStart(7)}            ${pct(t.roundWins / (t.seats * rounds)).padStart(7)}   ${ok}`,
    );
  }
  console.log(`\nSitzplätze (fair = 25 %): ${seatWins.map((w) => pct(w / games)).join('  ')}`);
  if (playedRounds !== games * rounds) console.log(`Achtung: ${games * rounds - playedRounds} Runden fehlen.`);
}
