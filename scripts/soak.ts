/**
 * Dauertest für alle Bot-Logiken (Gedächtnis, Wahrnehmung, Sorgfalt, Gegner-Gedächtnis, Abwägung, mutiger Modus).
 * Spielt viele Spiele mit zufälligen Einstellungen und prüft in fast jedem Zug Eigenschaften, die immer gelten müssen.
 *
 *   npm run soak                    2000 Spiele
 *   npm run soak -- 6000 0          6000 Spiele ab Startindex 0 (Spiele sind reproduzierbar: Index → Einstellung)
 *
 * Geprüft wird (Verstöße werden mit Spielindex gesammelt und am Ende ausgegeben):
 *  - Jede Bot-Aktion ist regelkonform, jedes Spiel endet, alle 106 Karten sind immer da.
 *  - decideAction verändert den Zustand nicht und entscheidet für denselben Zustand gleich.
 *  - Kein Mogeln: Vertauschen fremder Hände und der Stapelreihenfolge ändert nichts; ein JSON-Neustart auch nicht.
 *  - Erinnerung: Kopien je Karte in [0, 2]; wer weniger weiß als der Mastermind, hat nie weniger "unbekannte" Karten;
 *    der Mastermind stimmt exakt mit der Referenzrechnung überein.
 *  - Wahrnehmung: Der Mastermind und Pflichtzüge übersehen nie etwas.
 *  - Teppichkarte: nie in einem Paar mit Joker (außer im letzten Zug bei leerem Stapel).
 *  - Rechenzeit einer Entscheidung.
 *
 * Mit SOAK_EXTREME=1 bekommt jeder Platz zufällige, auch absurde Werte für Gedächtnis und alle Regler (so, wie spätere Rollen
 * sie setzen könnten). Dann gelten dieselben Prüfungen: Ein Bot darf nie hängen bleiben oder Unzulässiges tun.
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { applyAction } from '../src/engine/actions';
import { Card, isJoker, makeDeck, makeRng } from '../src/engine/cards';
import type { BotLevel, BotStyle, GameState } from '../src/engine/game';
import { STYLES, LEVELS } from '../src/bot/names';
import { decideAction } from '../src/bot/bot';
import { MEMORY, perceive, recall } from '../src/bot/memory';
import { simulate } from '../src/bot/simulate';
import { CAND, persona } from '../src/bot/personas';

interface Job {
  indices: number[];
}
interface Result {
  games: number;
  decisions: number;
  checks: Record<string, number>;
  failures: string[];
  maxMs: number;
  slow: number;
  rounds: number;
  byPlayers: Record<number, number>;
  firstTurnBlocked: number;
}

const deck = makeDeck();
const keyOf = (c: Card) => (isJoker(c) ? 'J' : `${c.suit}${c.rank}`);

function exactUnseen(g: GameState, pid: number): Map<string, number> {
  const r = g.round;
  const seen = new Set<number>();
  for (const c of r.players[pid].hand) seen.add(c.id);
  for (const m of r.melds) for (const c of m.cards) seen.add(c.id);
  for (const c of r.discard) seen.add(c.id);
  if (r.carpet) seen.add(r.carpet.id);
  for (const x of r.taken) seen.add(x.card.id);
  const out = new Map<string, number>();
  for (const c of deck) if (!seen.has(c.id)) out.set(keyOf(c), (out.get(keyOf(c)) ?? 0) + 1);
  return out;
}

function reshuffleHidden(g: GameState, pid: number, rng: () => number): GameState {
  const alt = structuredClone(g);
  const r = alt.round;
  const holders = r.players.map((p, i) => ({ i, p })).filter((x) => x.i !== pid);
  const pool = [...holders.flatMap((x) => x.p.hand), ...r.stock];
  for (let k = pool.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  let at = 0;
  for (const { p } of holders) {
    p.hand = pool.slice(at, at + p.hand.length);
    at += p.hand.length;
  }
  r.stock = pool.slice(at);
  return alt;
}

function cardCount(g: GameState): number {
  const r = g.round;
  return r.stock.length + r.discard.length + (r.carpet ? 1 : 0) + r.players.reduce((s, p) => s + p.hand.length, 0) + r.melds.reduce((s, m) => s + m.cards.length, 0);
}

function runGame(i: number, res: Result): void {
  const rng = makeRng(777 + i * 31);
  const n = 2 + Math.floor(rng() * 3);
  const rounds = [1, 3, 5, 7, 9][Math.floor(rng() * 5)];
  const firstTurnOpenAllowed = rng() < 0.5;
  const mixed = rng() < 0.7; // 30 %: alle Plätze dieselbe Stufe (die Randfälle jeder Stufe)
  const sameLevel = LEVELS[Math.floor(rng() * 4)];
  const extreme = process.env.SOAK_EXTREME === '1';
  const wild = () => {
    const lo = rng() * 1.5;
    const pool = Object.values(CAND);
    return {
      persona: rng() < 0.7 ? persona(pool[Math.floor(rng() * pool.length)], { loyalty: rng(), jitter: rng() < 0.2 ? rng() * 5 : rng(), tilt: (rng() * 2 - 1) * (rng() < 0.2 ? 5 : 1), pool: rng() < 0.8 ? pool : undefined, levels: rng() < 0.3 ? LEVELS.filter(() => rng() < 0.6) : undefined }) : undefined,
      memory: { span: rng() * 12, spread: [lo, lo + rng() * 2] as [number, number], accuracy: rng(), form: rng() * 0.5, tableMiss: rng() * 0.6, missExtra: Math.floor(rng() * 3), observe: rng(), handMiss: rng() * 0.9, noise: rng() * 10 },
      knobs: {
        ambition: rng() < 0.1 ? (rng() < 0.5 ? -3 : 7) : rng(),
        shedPre: rng() < 0.2 ? rng() * 50 - 10 : rng() * 2,
        shedOpen: rng() < 0.2 ? rng() * 50 - 10 : rng() * 4,
        blockWeight: rng() < 0.2 ? rng() * 400 - 50 : rng() * 40,
        handReach: Math.floor(rng() * 16) - 1,
        dangerHand: Math.floor(rng() * 16) - 1,
        pairLove: rng() < 0.2 ? rng() * 100 - 5 : rng() * 5,
        huntLeader: rng() < 0.2 ? rng() * 20 - 3 : rng() * 2,
        handHunter: rng() < 0.4,
        jokerHunter: rng() < 0.3,
        burn: rng() < 0.3,
        master: rng() < 0.3,
        patient: rng() < 0.3,
        steal: rng() < 0.8,
        layAll: rng() < 0.8,
        takeDiscardToOpen: rng() < 0.8,
        cheftEagerPairs: [99, 7, 5, 4, 3, 2, 1, 0][Math.floor(rng() * 8)],
        pairTakeAt: Math.floor(rng() * 8),
        gamble: rng() < 0.3 ? rng() * 3 : rng(),
        bold: rng() < 0.5,
        weighOpening: rng() < 0.7,
        oppModel: rng() < 0.7,
        openMargin: rng() < 0.3 ? Math.floor(rng() * 30) : 0,
        tuning: { mode: (rng() < 0.5 ? 'v1' : 'v2') as 'v1' | 'v2', boldHold: rng() < 0.4, ignoreGrowth: rng() < 0.2, draws: 1 + Math.floor(rng() * 3), wHand: rng() * 3, wBar: rng() * 3, wTime: rng() * 2, holdAt0: rng() * 0.8, holdAt1: rng() * 0.5, t0: rng() * 40, t1: rng() * 60, w0: Math.floor(rng() * 4), w1: rng() * 8, boldAt: 0.3 + rng() * 0.7 },
      },
    };
  };
  const seats = Array.from({ length: n }, () => ({
    level: (mixed ? LEVELS[Math.floor(rng() * 4)] : sameLevel) as BotLevel,
    style: STYLES[Math.floor(rng() * STYLES.length)] as BotStyle,
    opts: extreme ? wild() : undefined,
  }));
  const bigGap = rng() < 0.4; // viele Spiele mit großem Rückstand von Anfang an (mutiger Modus)
  const tag = `Spiel ${i} (${n} Spieler, ${rounds} Runden, Erstzug ${firstTurnOpenAllowed ? 'erlaubt' : 'gesperrt'}, ${seats.map((s) => `${s.level}/${s.style}`).join(' ')})`;
  const fail = (msg: string) => {
    if (res.failures.length < 40) res.failures.push(`${tag}: ${msg}`);
  };
  const count = (k: string) => (res.checks[k] = (res.checks[k] ?? 0) + 1);
  const carpetIds = new Set<number>();
  let lastRoundNo = 0;
  try {
    const out = simulate({
      seed: 400000 + i,
      seats,
      rounds,
      firstTurnOpenAllowed,
      dealer: i % n,
      visit: (g, pid) => {
        res.decisions++;
        if (bigGap && g.round.no === 1 && (g.round.plies ?? 0) === 0) g.totals = g.totals.map((_, j) => (j === 0 ? 120 + (i % 80) : 0));
        if (g.round.no !== lastRoundNo) {
          lastRoundNo = g.round.no;
          carpetIds.clear();
        }
        const plies = g.round.plies ?? 0;
        // Karten vollzählig
        if (cardCount(g) !== 106) fail(`Kartenzahl ${cardCount(g)} statt 106 (Runde ${g.round.no}, Zug ${plies})`);
        count('Karten vollzählig');
        // Teppichkarte nie mit Joker im Paar (außer im letzten Zug bei leerem Stapel)
        const mp = g.round.turn.mustPairWithId;
        if (mp !== null) carpetIds.add(mp);
        for (const m of g.round.melds) {
          if (m.type === 'pair' && m.cards.some((c) => carpetIds.has(c.id)) && m.cards.some(isJoker)) fail('Teppichkarte mit Joker im Paar');
        }
        // Entscheidung: Zeit, Reinheit, Determinismus
        const level = g.players[pid].bot!.level;
        const t0 = performance.now();
        const o = seats[pid].opts; // die Sonderwerte des Platzes (Extrem-Modus), sonst keine
        const a1 = decideAction(g, pid, o);
        const ms = performance.now() - t0;
        res.maxMs = Math.max(res.maxMs, ms);
        if (ms > 250) res.slow++;
        if (plies % 3 === 0) {
          const before = JSON.stringify(g);
          const a2 = decideAction(g, pid, o);
          if (JSON.stringify(a2) !== JSON.stringify(a1)) fail(`Entscheidung nicht deterministisch (${level}): ${JSON.stringify(a1)} gegen ${JSON.stringify(a2)}`);
          if (JSON.stringify(g) !== before) fail('decideAction hat den Zustand verändert');
          count('Reinheit und Determinismus');
        }
        // Kein Mogeln und Neustart aus dem Speicher
        if (plies % 4 === 1) {
          const alt = reshuffleHidden(g, pid, rng);
          if (JSON.stringify(decideAction(alt, pid, o)) !== JSON.stringify(a1)) fail(`Entscheidung hängt von verdeckten Karten ab (${level})`);
          count('Kein Mogeln');
          const restored = JSON.parse(JSON.stringify(g));
          if (JSON.stringify(decideAction(restored, pid, o)) !== JSON.stringify(a1)) fail(`Entscheidung nach JSON-Neustart anders (${level})`);
          count('Neustart aus JSON');
        }
        // Erinnerung
        if (plies % 2 === 0) {
          const forced = g.round.turn.phase === 'play' && (g.round.turn.pendingJokerId !== null || g.round.turn.mustUseId !== null || g.round.turn.mustOpenWithId !== null || g.round.turn.mustPairWithId !== null);
          const per = perceive(g, pid, MEMORY[level], forced);
          const mine = recall(g, pid, per);
          let total = 0;
          for (const [k, v] of mine.unseen.copies) {
            if (!(v >= -1e-9 && v <= 2 + 1e-9)) fail(`Kopien von ${k} außerhalb [0, 2]: ${v}`);
            total += v;
          }
          const ref = exactUnseen(g, pid);
          const master = recall(g, pid, perceive(g, pid, MEMORY.master));
          if (total < master.unseen.total - 1e-6) fail(`${level} hat weniger unbekannte Karten (${total}) als der Mastermind (${master.unseen.total})`);
          for (const [k, v] of master.unseen.copies) if (Math.abs(v - (ref.get(k) ?? 0)) > 1e-9) fail(`Mastermind weicht von der Referenz ab bei ${k}: ${v} gegen ${ref.get(k) ?? 0}`);
          for (const s of mine.signals) {
            if (s.player === pid) fail('Hinweis über den Bot selbst');
            if (s.player < 0 || s.player >= n) fail('Hinweis über einen unbekannten Spieler');
            if (s.cands.length === 0) fail('Hinweis ohne Kandidaten');
          }
          if (level === 'master' && (per.blindMelds.size > 0 || per.carpetBlind || per.topBlind)) fail('Mastermind übersieht etwas');
          if (forced && (per.blindMelds.size > 0 || per.carpetBlind || per.topBlind)) fail('Pflichtzug übersieht etwas');
          count('Erinnerung und Wahrnehmung');
        }
        // Aktion ausführen lässt simulate() selbst (wirft bei ungültiger Aktion); dieselbe Entscheidung nochmals zu prüfen genügt hier nicht
        void applyAction;
      },
    });
    res.rounds += out.state.history.length;
    if (!out.state.finished) fail('Spiel nicht beendet');
    if (out.state.history.length !== rounds) fail(`${out.state.history.length} statt ${rounds} Runden gespielt`);
    if (cardCount(out.state) !== 106) fail('Karten am Ende nicht vollzählig');
    res.games++;
    res.byPlayers[n] = (res.byPlayers[n] ?? 0) + 1;
    if (!firstTurnOpenAllowed) res.firstTurnBlocked++;
  } catch (e) {
    fail(`Ausnahme: ${(e as Error).message}`);
  }
}

if (!isMainThread) {
  const job = workerData as Job;
  const res: Result = { games: 0, decisions: 0, checks: {}, failures: [], maxMs: 0, slow: 0, rounds: 0, byPlayers: {}, firstTurnBlocked: 0 };
  for (const i of job.indices) runGame(i, res);
  parentPort!.postMessage(res);
} else {
  const games = Number(process.argv[2] ?? 2000);
  const first = Number(process.argv[3] ?? 0);
  const workers = Math.max(1, Math.min(cpus().length, 8));
  const t0 = Date.now();
  const shards = Array.from({ length: workers }, () => ({ indices: [] as number[] }) as Job);
  for (let i = first; i < first + games; i++) shards[(i - first) % workers].indices.push(i);
  const parts = await Promise.all(
    shards.map(
      (job) =>
        new Promise<Result>((resolve, reject) => {
          const w = new Worker(new URL(import.meta.url), { workerData: job, execArgv: ['--import', 'tsx'] });
          w.once('message', resolve);
          w.once('error', reject);
        }),
    ),
  );
  const sum: Result = { games: 0, decisions: 0, checks: {}, failures: [], maxMs: 0, slow: 0, rounds: 0, byPlayers: {}, firstTurnBlocked: 0 };
  for (const p of parts) {
    sum.games += p.games;
    sum.decisions += p.decisions;
    sum.rounds += p.rounds;
    sum.maxMs = Math.max(sum.maxMs, p.maxMs);
    sum.slow += p.slow;
    sum.firstTurnBlocked += p.firstTurnBlocked;
    for (const [k, v] of Object.entries(p.checks)) sum.checks[k] = (sum.checks[k] ?? 0) + v;
    for (const [k, v] of Object.entries(p.byPlayers)) sum.byPlayers[Number(k)] = (sum.byPlayers[Number(k)] ?? 0) + v;
    sum.failures.push(...p.failures);
  }
  console.log(`\nDauertest: ${sum.games} von ${games} Spielen beendet (${sum.rounds} Runden, ${sum.decisions} Entscheidungen) in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  console.log(`Spieler: ${Object.entries(sum.byPlayers).map(([k, v]) => `${k}: ${v}`).join(' | ')} | Erstzug gesperrt in ${sum.firstTurnBlocked} Spielen`);
  console.log('Prüfungen:');
  for (const [k, v] of Object.entries(sum.checks)) console.log(`  ${k.padEnd(28)} ${v}`);
  console.log(`Rechenzeit: Maximum ${sum.maxMs.toFixed(0)} ms, über 250 ms: ${sum.slow}`);
  if (sum.failures.length === 0) console.log('\nKEINE VERSTÖSSE');
  else {
    console.log(`\n${sum.failures.length} VERSTÖSSE (höchstens 40 je Worker gezeigt):`);
    for (const f of sum.failures.slice(0, 30)) console.log(' - ' + f);
    process.exitCode = 1;
  }
}
