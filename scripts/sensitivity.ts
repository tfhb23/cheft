/**
 * Empfindlichkeit der Gedächtnis-Regler: Ein Testbot mit veränderten Werten spielt gegen drei perfekte Mastermind-Bots.
 * Die Plätze rotieren. Fair wären 25 %; je weiter darunter, desto stärker schadet der Regler.
 *
 *   npm run sensitivity                    640 Spiele je Einstellung, 5 Runden
 *   npm run sensitivity -- 960 5           960 Spiele je Einstellung
 *
 * Die Einstellungen stehen unten in CASES. Jede ist ein Gedächtnis-Override des Testbots.
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { MEMORY } from '../src/bot/memory';
import type { MemoryParams } from '../src/bot/memory';
import { simulate } from '../src/bot/simulate';

const PERFECT: MemoryParams = MEMORY.master;
const NO_PERCEPTION: Partial<MemoryParams> = { handMiss: 0, tableMiss: 0 };
const NO_MEMORY: Partial<MemoryParams> = { span: 0, observe: 0 };

const CASES: [string, Partial<MemoryParams>][] = [
  ['Kontrolle: perfekt', {}],
  ['Sorgfalt: Streuung 1,5', { noise: 1.5 }],
  ['Sorgfalt: Streuung 3', { noise: 3 }],
  ['Sorgfalt: Streuung 6', { noise: 6 }],
  ['Sorgfalt: Streuung 12', { noise: 12 }],
  ['Handüberblick 40 %', { handMiss: 0.4 }],
  ['Gar kein Gedächtnis (Spanne 0, nichts beobachtet)', NO_MEMORY],
  ['Vergesslich komplett', { ...MEMORY.easy }],
  ['Normal komplett', { ...MEMORY.normal }],
  ['Scharfsinnig komplett', { ...MEMORY.hard }],
];

interface Job {
  indices: number[];
  rounds: number;
  override: Partial<MemoryParams>;
}
interface Out {
  wins: number;
  penalty: number;
  games: number;
  rounds: number;
}

function run(job: Job): Out {
  const out: Out = { wins: 0, penalty: 0, games: 0, rounds: 0 };
  for (const i of job.indices) {
    const subject = i % 4;
    const seats = Array.from({ length: 4 }, (_, s) => ({
      level: 'master' as const,
      style: 'balanced' as const,
      opts: { memory: s === subject ? { ...PERFECT, ...job.override } : undefined },
    }));
    const res = simulate({ seed: 12000 + i, seats, rounds: job.rounds, dealer: Math.floor(i / 4) % 4, firstTurnOpenAllowed: process.env.FIRST_TURN === 'open' });
    out.games++;
    out.rounds += res.state.history.length;
    out.penalty += res.totals[subject];
    if (res.winners.includes(subject)) out.wins += 1 / res.winners.length;
  }
  return out;
}

if (!isMainThread) {
  parentPort!.postMessage(run(workerData as Job));
} else {
  const games = Number(process.argv[2] ?? 640);
  const rounds = Number(process.argv[3] ?? 5);
  const workers = Math.max(1, Math.min(cpus().length, 8));
  console.log(`Testbot gegen drei Mastermind-Bots, ${games} Spiele à ${rounds} Runden je Einstellung (fair = 25 %)\n`);
  console.log('Einstellung                                          Siegquote (95 %)    Strafpunkte/Runde');
  for (const [name, override] of CASES) {
    const shards = Array.from({ length: workers }, () => ({ indices: [] as number[], rounds, override }) as Job);
    for (let i = 0; i < games; i++) shards[i % workers].indices.push(i);
    const parts = await Promise.all(
      shards.map(
        (job) =>
          new Promise<Out>((resolve, reject) => {
            const w = new Worker(new URL(import.meta.url), { workerData: job, execArgv: ['--import', 'tsx'] });
            w.once('message', resolve);
            w.once('error', reject);
          }),
      ),
    );
    const total = parts.reduce((a, b) => ({ wins: a.wins + b.wins, penalty: a.penalty + b.penalty, games: a.games + b.games, rounds: a.rounds + b.rounds }), { wins: 0, penalty: 0, games: 0, rounds: 0 });
    const p = total.wins / total.games;
    const err = 1.96 * Math.sqrt((p * (1 - p)) / total.games);
    console.log(`${name.padEnd(52)} ${(100 * p).toFixed(1).padStart(5)} % (±${(100 * err).toFixed(1)})      ${(total.penalty / total.rounds).toFixed(1).padStart(6)}`);
  }
}
