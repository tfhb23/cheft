/**
 * Duell: Zwei Einstellungen (Regler der Spielweise und/oder Gedächtnis) treten am selben Tisch gegeneinander an.
 * Plätze 0 und 2 spielen A, Plätze 1 und 3 spielen B; Plätze und Geber rotieren. Fair wären je 50 %.
 *
 *   npm run duel -- 960 5 '{"weighOpening":true}' '{"weighOpening":false}'
 *   npm run duel -- 960 5 '{"tuning":{"ignoreGrowth":true}}' '{"weighOpening":false}' master
 *
 * Argumente: Spiele, Runden, Regler A (JSON), Regler B (JSON), Gedächtnis (easy|normal|hard|master, Standard master),
 * Startindex. Ausgegeben werden auch Kennzahlen des Spielcharakters (Höhe der Erstmeldungen, Cheft, Hand).
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { simulate } from '../src/bot/simulate';
import type { BotLevel, LogEntry } from '../src/engine/game';

interface Job {
  indices: number[];
  rounds: number;
  a: object;
  b: object;
  level: BotLevel;
}
interface Out {
  games: number;
  rounds: number;
  winsA: number;
  penA: number;
  penB: number;
  roundWinsA: number;
  roundWinsB: number;
  opens: number[];
  firstOpens: number[];
  cheftRounds: number;
  handRounds: number;
  noWinner: number;
  plies: number;
  unopenedLosers: number;
  loserSlots: number;
}

function run(job: Job): Out {
  const o: Out = { games: 0, rounds: 0, winsA: 0, penA: 0, penB: 0, roundWinsA: 0, roundWinsB: 0, opens: [], firstOpens: [], cheftRounds: 0, handRounds: 0, noWinner: 0, plies: 0, unopenedLosers: 0, loserSlots: 0 };
  for (const i of job.indices) {
    const rot = i % 2; // Plätze tauschen: A auf 0 und 2 oder auf 1 und 3
    const dealer = Math.floor(i / 2) % 4;
    const isA = (s: number) => (s + rot) % 2 === 0;
    const seats = Array.from({ length: 4 }, (_, s) => ({ level: job.level, style: 'balanced' as const, opts: { knobs: (isA(s) ? job.a : job.b) as never } }));
    let cur: LogEntry[] | null = null;
    const logs: { log: LogEntry[]; plies: number }[] = [];
    let lastNo = 0;
    let curPlies = 0;
    const res = simulate({
      seed: 20000 + i,
      seats,
      rounds: job.rounds,
      dealer,
      firstTurnOpenAllowed: process.env.FIRST_TURN === 'open',
      visit: (g) => {
        if (g.round.no !== lastNo) {
          if (cur) logs.push({ log: [...cur], plies: curPlies });
          lastNo = g.round.no;
        }
        cur = g.round.log;
        curPlies = g.round.plies ?? 0;
      },
    });
    logs.push({ log: [...res.state.round.log], plies: res.state.round.plies ?? 0 });
    o.games++;
    o.rounds += res.state.history.length;
    let wa = 0;
    let na = 0;
    seats.forEach((_, s) => {
      if (isA(s)) {
        o.penA += res.totals[s];
        o.roundWinsA += res.roundWins[s];
        if (res.winners.includes(s)) wa += 1 / res.winners.length;
        na++;
      } else {
        o.penB += res.totals[s];
        o.roundWinsB += res.roundWins[s];
      }
    });
    o.winsA += wa;
    res.state.history.forEach((h, ri) => {
      const r = logs[ri];
      if (!r) return;
      o.plies += r.plies;
      if (h.winner === null) o.noWinner++;
      if (h.hand) o.handRounds++;
      if (r.log.some((e) => e.key === 'log.cheft')) o.cheftRounds++;
      let first = true;
      for (const e of r.log) {
        if ((e.key === 'log.open' || e.key === 'log.hand') && Number(e.params?.pairs ?? 0) === 0) {
          const a = Number(e.params?.augen ?? 0);
          o.opens.push(a);
          if (first) o.firstOpens.push(a);
          first = false;
        }
      }
      h.scores.forEach((sc, p) => {
        if (p !== h.winner) {
          o.loserSlots++;
          if (sc.base === 100) o.unopenedLosers++;
        }
      });
    });
  }
  return o;
}

if (!isMainThread) {
  parentPort!.postMessage(run(workerData as Job));
} else {
  const games = Number(process.argv[2] ?? 480);
  const rounds = Number(process.argv[3] ?? 5);
  const a = JSON.parse(process.argv[4] ?? '{}');
  const b = JSON.parse(process.argv[5] ?? '{"weighOpening":false}');
  const level = (process.argv[6] ?? 'master') as BotLevel;
  const first = Number(process.argv[7] ?? 0);
  const workers = Math.max(1, Math.min(cpus().length, 8));
  const t0 = Date.now();
  const shards = Array.from({ length: workers }, () => ({ indices: [] as number[], rounds, a, b, level }) as Job);
  for (let i = first; i < first + games; i++) shards[(i - first) % workers].indices.push(i);
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
  const sum = parts.reduce((x, y) => ({
    games: x.games + y.games,
    rounds: x.rounds + y.rounds,
    winsA: x.winsA + y.winsA,
    penA: x.penA + y.penA,
    penB: x.penB + y.penB,
    roundWinsA: x.roundWinsA + y.roundWinsA,
    roundWinsB: x.roundWinsB + y.roundWinsB,
    opens: x.opens.concat(y.opens),
    firstOpens: x.firstOpens.concat(y.firstOpens),
    cheftRounds: x.cheftRounds + y.cheftRounds,
    handRounds: x.handRounds + y.handRounds,
    noWinner: x.noWinner + y.noWinner,
    plies: x.plies + y.plies,
    unopenedLosers: x.unopenedLosers + y.unopenedLosers,
    loserSlots: x.loserSlots + y.loserSlots,
  }));
  const mean = (v: number[]) => (v.length ? v.reduce((p, q) => p + q, 0) / v.length : 0);
  const share = sum.winsA / sum.games / 2; // Anteil von A an allen Siegen (fair 50 %)
  const p = sum.winsA / sum.games;
  const err = 1.96 * Math.sqrt((p * (1 - p)) / sum.games) / 1; // Näherung
  const pa = sum.penA / (sum.rounds * 2);
  const pb = sum.penB / (sum.rounds * 2);
  console.log(`\nA = ${JSON.stringify(a)}\nB = ${JSON.stringify(b)}\n${sum.games} Spiele à ${rounds} Runden, Gedächtnis ${level}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  console.log(`A gewinnt ${(100 * p).toFixed(1)} % der Spiele (fair 50 %, ±${(100 * err).toFixed(1)}) | Strafpunkte pro Runde: A ${pa.toFixed(1)}, B ${pb.toFixed(1)} (Differenz ${(pb - pa).toFixed(1)} für A) | Rundensiege A ${((100 * sum.roundWinsA) / (sum.rounds * 2)).toFixed(1)} % B ${((100 * sum.roundWinsB) / (sum.rounds * 2)).toFixed(1)} %`);
  console.log(`Charakter: Rommé-Erstmeldung Ø ${mean(sum.opens).toFixed(1)} Augen (erste der Runde Ø ${mean(sum.firstOpens).toFixed(1)}) | Runden mit Cheft ${((100 * sum.cheftRounds) / sum.rounds).toFixed(0)} % | Hand ${((100 * sum.handRounds) / sum.rounds).toFixed(1)} % | Ø ${(sum.plies / sum.rounds).toFixed(1)} Züge je Runde | Verlierer ohne Erstmeldung ${((100 * sum.unopenedLosers) / sum.loserSlots).toFixed(0)} %`);
  void share;
}
