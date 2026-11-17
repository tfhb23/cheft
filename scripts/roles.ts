/**
 * Rollen-Labor: vier Spezifikationen („Specs“) spielen am selben Tisch; Plätze und Geber rotieren. Ausgewertet wird je Spec
 * Stärke, Risiko, Stil-Kennzahlen und Abwechslung (wie oft zeigt sich ein Verhalten, in wie vielen Spielen immer/nie).
 *
 *   npm run roles -- '<JSON mit 4 Specs>' [Spiele=600] [Runden=5] [Startindex=0]
 *
 * Spec: { name, level, persona (Schlüssel in CAND), loyalty, jitter, tilt, levels, pool (Schlüssel), knobs, memory }
 * Mit OUT=datei werden die Rohsummen als JSON angehängt (eine Zeile je Aufruf).
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { appendFileSync } from 'node:fs';
import { simulate } from '../src/bot/simulate';
import { CAND, persona } from '../src/bot/personas';
import { RoleId, RoleOptions, rolePersona } from '../src/bot/roles';
import { tasteScore, tastesFor } from '../src/bot/tastes';
import { makeDeck } from '../src/engine/cards';
import type { BotLevel, BotStyle, LogEntry } from '../src/engine/game';

export interface Spec {
  name: string;
  level: BotLevel;
  /** Alte Spielweise aus names.ts (zum Vergleich). */
  style?: BotStyle;
  persona?: string;
  loyalty?: number;
  jitter?: number;
  tilt?: number;
  levels?: BotLevel[];
  pool?: string[];
  knobs?: object;
  memory?: object;
  /** Rolle des Entwurfs V3 (src/bot/roles.ts) mit Optionen; hat Vorrang vor persona. */
  role?: RoleId;
  roleOpts?: RoleOptions;
  /** Misst, wie stark die Abwürfe von den (automatischen) Vorlieben des Bots abhängen. */
  probeTaste?: boolean;
}

interface Acc {
  tasteN: number;
  tasteSum: number;
  tasteDeck: number;
  games: number;
  rounds: number;
  wins: number;
  pen: number;
  pen2: number;
  roundWins: number;
  handWins: number;
  burnWins: number;
  cheftRounds: number;
  unopened: number;
  steals: number;
  carpet: number;
  discardTake: number;
  opens: number;
  openAugen: number;
  openTurns: number;
  early: number;
  late: number;
  cheftAll: number;
  cheftNone: number;
  earlyAll: number;
  earlyNone: number;
  halfBehind: number;
  comebacks: number;
  halfLead: number;
  leadHeld: number;
  big: number;
  doubled: number;
  noWinnerRounds: number;
  winsWithBig: number;
  plies: number;
  disc: number;
  discH: number;
  discLow: number;
  discFace: number;
  discRanks: number;
}
const zero = (): Acc => ({ tasteN: 0, tasteSum: 0, tasteDeck: 0, games: 0, rounds: 0, wins: 0, pen: 0, pen2: 0, roundWins: 0, handWins: 0, burnWins: 0, cheftRounds: 0, unopened: 0, steals: 0, carpet: 0, discardTake: 0, opens: 0, openAugen: 0, openTurns: 0, early: 0, late: 0, cheftAll: 0, cheftNone: 0, earlyAll: 0, earlyNone: 0, halfBehind: 0, comebacks: 0, halfLead: 0, leadHeld: 0, big: 0, doubled: 0, noWinnerRounds: 0, winsWithBig: 0, plies: 0, disc: 0, discH: 0, discLow: 0, discFace: 0, discRanks: 0 });

interface Job {
  indices: number[];
  rounds: number;
  specs: Spec[];
}

function seatFor(s: Spec) {
  const pool = s.pool?.map((k) => CAND[k]);
  if (s.role) return { level: s.level, style: 'balanced' as BotStyle, opts: { persona: rolePersona(s.role, s.roleOpts), knobs: s.knobs as never, memory: s.memory as never } };
  const p = s.persona || s.pool ? persona(CAND[s.persona ?? 'ausgewogen'], { loyalty: s.loyalty ?? 1, jitter: s.jitter ?? 0, tilt: s.tilt ?? 0, levels: s.levels, pool }) : undefined;
  return { level: s.level, style: (s.style ?? 'balanced') as BotStyle, opts: { persona: p, knobs: s.knobs as never, memory: s.memory as never } };
}

const DECK = makeDeck();
/** Mittlerer Zuschlag einer zufälligen Karte (Maß dafür, was „kein Einfluss“ wäre). */
function DECK_TASTE_MEAN(ts: ReturnType<typeof tastesFor>): number {
  let s = 0;
  let n = 0;
  for (const c of DECK) {
    if (c.suit === 'J') continue;
    s += tasteScore(ts, c);
    n++;
  }
  return s / n;
}

function run(job: Job): Acc[] {
  const accs = job.specs.map(zero);
  const n = job.specs.length;
  for (const i of job.indices) {
    const rot = i % n;
    const dealer = Math.floor(i / n) % n;
    const specOf = (seat: number) => (seat + rot) % n;
    const seats = Array.from({ length: n }, (_, seat) => seatFor(job.specs[specOf(seat)]));
    let cur: LogEntry[] | null = null;
    const logs: { log: LogEntry[]; plies: number }[] = [];
    let lastNo = 0;
    let curPlies = 0;
    const res = simulate({
      seed: 50000 + i,
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
    const hist = res.state.history;
    const half = Math.max(1, Math.floor(job.rounds / 2));
    const cumHalf = Array.from({ length: n }, (_, s) => hist.slice(0, half).reduce((x, h) => x + h.scores[s].total, 0));
    const perSeat = Array.from({ length: n }, () => ({ cheft: 0, early: 0, big: 0 }));
    hist.forEach((h, ri) => {
      const r = logs[ri];
      if (!r) return;
      const draws = new Array(n).fill(0);
      const opened = new Array(n).fill(false);
      const sawCheft = new Array(n).fill(false);
      for (const e of r.log) {
        const pl = e.player;
        if (pl === undefined) continue;
        const a = accs[specOf(pl)];
        if (e.key.startsWith('log.draw.')) {
          draws[pl]++;
          if (e.key === 'log.draw.carpet') a.carpet++;
          if (e.key === 'log.draw.discard') a.discardTake++;
        } else if (e.key === 'log.discard') {
          const card = DECK[Number(e.params?.card)];
          if (card && card.suit !== 'J') {
            if (job.specs[specOf(pl)].probeTaste) {
              const ts = tastesFor(res.state.seed, pl);
              a.tasteN++;
              a.tasteSum += tasteScore(ts, card);
              a.tasteDeck += DECK_TASTE_MEAN(ts);
            }
            a.disc++;
            if (card.suit === 'H') a.discH++;
            if (card.rank >= 2 && card.rank <= 6) a.discLow++;
            if (card.rank >= 11) a.discFace++;
            if (card.rank === 7 || card.rank === 11) a.discRanks++;
          }
        } else if (e.key === 'log.cheft') {
          sawCheft[pl] = true;
        } else if (e.key === 'log.steal') a.steals++;
        else if ((e.key === 'log.open' || e.key === 'log.hand') && !opened[pl]) {
          opened[pl] = true;
          a.opens++;
          a.openTurns += draws[pl];
          if (Number(e.params?.pairs ?? 0) === 0) a.openAugen += Number(e.params?.augen ?? 0);
          if (draws[pl] <= 3) {
            a.early++;
            perSeat[pl].early++;
          }
          if (draws[pl] >= 7) a.late++;
        }
      }
      h.scores.forEach((sc, pl) => {
        const a = accs[specOf(pl)];
        a.rounds++;
        a.pen += sc.total;
        a.pen2 += sc.total * sc.total;
        a.plies += r.plies;
        if (sc.total >= 100) {
          a.big++;
          perSeat[pl].big++;
        }
        if (sc.factors.length > 0) a.doubled++;
        if (sawCheft[pl]) {
          a.cheftRounds++;
          perSeat[pl].cheft++;
        }
        if (pl === h.winner) {
          a.roundWins++;
          if (h.hand) a.handWins++;
          if (h.jokerBurned) a.burnWins++;
        } else if (h.winner === null) a.noWinnerRounds++;
        if (pl !== h.winner && sc.base === 100) a.unopened++;
      });
    });
    for (let s = 0; s < n; s++) {
      const a = accs[specOf(s)];
      a.games++;
      const won = res.winners.includes(s);
      if (won) a.wins += 1 / res.winners.length;
      const R = hist.length;
      if (perSeat[s].cheft === 0) a.cheftNone++;
      if (perSeat[s].cheft === R) a.cheftAll++;
      if (perSeat[s].early === 0) a.earlyNone++;
      if (perSeat[s].early === R) a.earlyAll++;
      if (won && perSeat[s].big > 0) a.winsWithBig++;
      const rank = cumHalf.filter((t) => t < cumHalf[s]).length;
      if (rank >= n - 2 && cumHalf[s] > Math.min(...cumHalf)) {
        a.halfBehind++;
        if (won) a.comebacks++;
      }
      if (rank === 0) {
        a.halfLead++;
        if (won) a.leadHeld++;
      }
    }
  }
  return accs;
}

function sumAcc(parts: Acc[][]): Acc[] {
  return parts[0].map((_, k) => {
    const t = zero();
    for (const p of parts) for (const key of Object.keys(t) as (keyof Acc)[]) t[key] += p[k][key];
    return t;
  });
}

export function summarize(a: Acc, rounds: number) {
  const pr = a.pen / a.rounds;
  const sd = Math.sqrt(Math.max(0, a.pen2 / a.rounds - pr * pr));
  const pct = (x: number, y: number) => (y > 0 ? (100 * x) / y : NaN);
  const p = a.wins / a.games;
  return {
    win: 100 * p,
    err: 196 * Math.sqrt((p * (1 - p)) / a.games),
    pen: pr,
    sd,
    roundWin: pct(a.roundWins, a.rounds),
    turnsToOpen: a.opens ? a.openTurns / a.opens : NaN,
    openAugen: a.openAugen / Math.max(1, a.opens),
    early: pct(a.early, a.opens),
    late: pct(a.late, a.opens),
    cheft: pct(a.cheftRounds, a.rounds),
    hand: pct(a.handWins, a.rounds),
    burn: pct(a.burnWins, a.rounds),
    unopened: pct(a.unopened, a.rounds),
    steals: a.steals / a.rounds,
    carpet: a.carpet / a.rounds,
    discardTake: a.discardTake / a.rounds,
    big: pct(a.big, a.rounds),
    doubled: pct(a.doubled, a.rounds),
    cheftAll: pct(a.cheftAll, a.games),
    cheftNone: pct(a.cheftNone, a.games),
    earlyAll: pct(a.earlyAll, a.games),
    earlyNone: pct(a.earlyNone, a.games),
    comeback: pct(a.comebacks, a.halfBehind),
    leadHeld: pct(a.leadHeld, a.halfLead),
    winsWithBig: pct(a.winsWithBig, a.wins),
    /** Wie viel Punkte weniger Vorlieben-Zuschlag haben die abgeworfenen Karten gegenüber einer Zufallskarte? Positiv = die Vorlieben prägen den Abwurf. */
    tasteBias: a.tasteN > 0 ? (a.tasteDeck - a.tasteSum) / a.tasteN : NaN,
    dH: pct(a.discH, a.disc),
    dLow: pct(a.discLow, a.disc),
    dFace: pct(a.discFace, a.disc),
    dRanks: pct(a.discRanks, a.disc),
    rounds,
  };
}

export type Summary = ReturnType<typeof summarize>;

export async function runSpecs(specs: Spec[], games: number, rounds: number, first: number): Promise<{ accs: Acc[]; sums: Summary[]; secs: number }> {
  const workers = Math.max(1, Math.min(cpus().length, 8));
  const shards = Array.from({ length: workers }, () => ({ indices: [] as number[], rounds, specs }) as Job);
  for (let i = first; i < first + games; i++) shards[(i - first) % workers].indices.push(i);
  const t0 = Date.now();
  const parts = await Promise.all(
    shards.map(
      (job) =>
        new Promise<Acc[]>((resolve, reject) => {
          const w = new Worker(new URL(import.meta.url), { workerData: job, execArgv: ['--import', 'tsx'] });
          w.once('message', resolve);
          w.once('error', reject);
        }),
    ),
  );
  const accs = sumAcc(parts);
  return { accs, sums: accs.map((a) => summarize(a, rounds)), secs: (Date.now() - t0) / 1000 };
}

export function line(name: string, s: Summary): string {
  const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '–');
  return `${name.padEnd(22)} Sieg ${f(s.win)}±${f(s.err)} | Pen ${f(s.pen)} sd ${f(s.sd)} | Rundensieg ${f(s.roundWin)} | Erst Ø${f(s.openAugen, 0)}A nach ${f(s.turnsToOpen)} Z früh ${f(s.early, 0)}% spät ${f(s.late, 0)}% | Cheft ${f(s.cheft, 0)}% (nie ${f(s.cheftNone, 0)}/immer ${f(s.cheftAll, 0)}) | Hand ${f(s.hand)}% Joker-Burn ${f(s.burn)}% | Klau ${f(s.steals, 2)}/R Teppich ${f(s.carpet, 2)}/R Ablage ${f(s.discardTake, 2)}/R | ohne Erstm. ${f(s.unopened, 0)}% ≥100 ${f(s.big, 0)}% | Aufholsieg ${f(s.comeback, 0)}% Führung gehalten ${f(s.leadHeld, 0)}%`;
}

if (!isMainThread) {
  parentPort!.postMessage(run(workerData as Job));
} else if (process.argv[1]?.endsWith('roles.ts')) {
  const specs = JSON.parse(process.argv[2]) as Spec[];
  const games = Number(process.argv[3] ?? 600);
  const rounds = Number(process.argv[4] ?? 5);
  const first = Number(process.argv[5] ?? 0);
  const { accs, sums, secs } = await runSpecs(specs, games, rounds, first);
  console.log(`\n${games} Spiele à ${rounds} Runden (${secs.toFixed(0)} s), Startindex ${first}`);
  specs.forEach((sp, k) => console.log(line(sp.name, sums[k])));
  if (process.env.OUT) appendFileSync(process.env.OUT, JSON.stringify({ specs, games, rounds, first, sums, accs }) + '\n');
}
