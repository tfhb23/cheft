/**
 * Erkennbarkeit der Rollen: Kann man aus dem Verhalten eines Bots über ein ganzes Spiel erraten, welche Spielweise er hatte?
 * Ein einfacher Klassifikator (nächster Mittelpunkt, Merkmale je Spiel: Cheft-Anteil, früh raus, nie raus, Züge bis zur
 * Erstmeldung, Erstmeldung in Augen) wird auf reinen Rollen (Rollentreue 1) trainiert und auf Würze-Varianten geprüft.
 * Gemessen wird, wie viel von der Trefferquote der reinen Rollen erhalten bleibt (Erkennbarkeit) und wie viel Abwechslung entsteht
 * (Anteil der Runden in der Rolle, Anteil der Spiele mit mindestens einer Abweichung).
 *
 *   npx tsx scripts/lab_recog.ts [Spiele je Variante=400] [Runden=7]
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { simulate } from '../src/bot/simulate';
import { STYLE_IDS, StyleId, RoleOptions, rolePersona } from '../src/bot/roles';
import { resolvePersona } from '../src/bot/personas';
import { makeRng } from '../src/engine/cards';

interface Variant {
  name: string;
  opts: RoleOptions;
}
interface Job {
  indices: number[];
  rounds: number;
  opts: RoleOptions;
}
interface Row {
  role: StyleId;
  feats: number[];
  inRole: number;
  rounds: number;
}

function run(job: Job): Row[] {
  const rows: Row[] = [];
  for (const i of job.indices) {
    const rng = makeRng(31337 + i * 7);
    const order = [...STYLE_IDS];
    for (let k = order.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [order[k], order[j]] = [order[j], order[k]];
    }
    const roles = order.slice(0, 4);
    const res = simulate({
      seed: 77000 + i,
      rounds: job.rounds,
      dealer: i % 4,
      seats: roles.map((r) => ({ level: 'normal' as const, style: 'balanced' as const, opts: { persona: rolePersona(r, job.opts) } })),
    });
    const g = res.state;
    roles.forEach((role, pid) => {
      const profs = g.history.map((h) => h.profiles![pid]);
      const R = profs.length;
      const opened = profs.filter((p) => p.openTurn !== null);
      const feats = [
        profs.filter((p) => p.cheft).length / R,
        profs.filter((p) => p.openTurn !== null && p.openTurn <= 3).length / R,
        profs.filter((p) => p.openTurn === null).length / R,
        opened.length ? opened.reduce((s, p) => s + (p.openTurn as number), 0) / opened.length : 8,
        profs.filter((p) => p.openAugen !== null).length ? profs.reduce((s, p) => s + (p.openAugen ?? 0), 0) / profs.filter((p) => p.openAugen !== null).length : 60,
      ];
      const persona = rolePersona(role, job.opts);
      let inRole = 0;
      for (let r = 1; r <= R; r++) {
        const st = { ...g, round: { ...g.round, no: r } };
        if (resolvePersona(persona, st, pid).active === role) inRole++;
      }
      rows.push({ role, feats, inRole, rounds: R });
    });
  }
  return rows;
}

if (!isMainThread) {
  parentPort!.postMessage(run(workerData as Job));
} else {
  const games = Number(process.argv[2] ?? 400);
  const rounds = Number(process.argv[3] ?? 7);
  const workers = Math.max(1, Math.min(cpus().length, 8));
  const collect = async (opts: RoleOptions, n: number, first = 0): Promise<Row[]> => {
    const shards = Array.from({ length: workers }, () => ({ indices: [] as number[], rounds, opts }) as Job);
    for (let i = first; i < first + n; i++) shards[(i - first) % workers].indices.push(i);
    const parts = await Promise.all(
      shards.map(
        (job) =>
          new Promise<Row[]>((resolve, reject) => {
            const w = new Worker(new URL(import.meta.url), { workerData: job, execArgv: ['--import', 'tsx'] });
            w.once('message', resolve);
            w.once('error', reject);
          }),
      ),
    );
    return parts.flat();
  };

  const variants: Variant[] = [
    { name: 'APP-STANDARD (SPICE: Treue .85, Launen .2, Stimmung 1 mit Nervenstärke)', opts: {} },
    { name: 'Treue .85, Launen .2, ohne Stimmung', opts: { loyalty: 0.85, jitter: 0.2, tilt: 0 } },
    { name: 'Treue 1, Launen 0, nur Stimmung 1', opts: { loyalty: 1, jitter: 0, tilt: 1 } },
    { name: 'Nur Launen .3 + Stimmung .5 (Treue 1)', opts: { loyalty: 1, jitter: 0.3, tilt: 0.5 } },
    { name: 'Treue .9, Nachbarn, Launen .2, Stimmung .5', opts: { loyalty: 0.9, jitter: 0.2, tilt: 0.5 } },
    { name: 'Treue .85, Nachbarn, Launen .2, Stimmung .5', opts: { loyalty: 0.85, jitter: 0.2, tilt: 0.5 } },
    { name: 'Treue .8, Nachbarn, Launen .2, Stimmung .5', opts: { loyalty: 0.8, jitter: 0.2, tilt: 0.5 } },
    { name: 'Treue .7, Nachbarn, Launen .2, Stimmung .5', opts: { loyalty: 0.7, jitter: 0.2, tilt: 0.5 } },
    { name: 'Treue .6, Nachbarn, Launen .2, Stimmung .5', opts: { loyalty: 0.6, jitter: 0.2, tilt: 0.5 } },
    { name: 'Treue .8, ALLE anderen (früherer Vorschlag)', opts: { loyalty: 0.8, jitter: 0.3, tilt: 0.5, deviate: 'all' } },
    { name: 'Treue .5, ALLE anderen', opts: { loyalty: 0.5, jitter: 0.3, tilt: 0.5, deviate: 'all' } },
  ];

  // Training: reine Rollen
  const pure = await collect({ loyalty: 1, jitter: 0, tilt: 0 }, games * 2, 0);
  const train = pure.filter((_, k) => k % 2 === 0);
  const test0 = pure.filter((_, k) => k % 2 === 1);
  const dim = train[0].feats.length;
  const mean = Array.from({ length: dim }, (_, d) => train.reduce((s, r) => s + r.feats[d], 0) / train.length);
  const sd = Array.from({ length: dim }, (_, d) => Math.sqrt(train.reduce((s, r) => s + (r.feats[d] - mean[d]) ** 2, 0) / train.length) || 1);
  const z = (f: number[]) => f.map((v, d) => (v - mean[d]) / sd[d]);
  const centroid = new Map<StyleId, number[]>();
  for (const role of STYLE_IDS) {
    const rs = train.filter((r) => r.role === role);
    centroid.set(role, Array.from({ length: dim }, (_, d) => rs.reduce((s, r) => s + z(r.feats)[d], 0) / rs.length));
  }
  const classify = (f: number[]): StyleId => {
    const zf = z(f);
    let best: StyleId = STYLE_IDS[0];
    let bd = Infinity;
    for (const role of STYLE_IDS) {
      const c = centroid.get(role)!;
      const d = zf.reduce((s, v, k) => s + (v - c[k]) ** 2, 0);
      if (d < bd) {
        bd = d;
        best = role;
      }
    }
    return best;
  };
  const evaluate = (rows: Row[]) => {
    const per = new Map<StyleId, { n: number; ok: number }>();
    let ok = 0;
    let inRole = 0;
    let rounds = 0;
    let anyDev = 0;
    for (const r of rows) {
      const hit = classify(r.feats) === r.role;
      if (hit) ok++;
      const p = per.get(r.role) ?? { n: 0, ok: 0 };
      p.n++;
      if (hit) p.ok++;
      per.set(r.role, p);
      inRole += r.inRole;
      rounds += r.rounds;
      if (r.inRole < r.rounds) anyDev++;
    }
    return { acc: ok / rows.length, per, inRole: inRole / rounds, anyDev: anyDev / rows.length };
  };
  const base = evaluate(test0);
  const fmtPer = (e: ReturnType<typeof evaluate>) => STYLE_IDS.map((r) => `${r.slice(0, 5)} ${((100 * (e.per.get(r)?.ok ?? 0)) / (e.per.get(r)?.n ?? 1)).toFixed(0)}`).join(' | ');
  console.log(`Klassifikator auf reinen Rollen (Zufall 20 %): Trefferquote ${(100 * base.acc).toFixed(1)} % | ${fmtPer(base)}`);
  console.log(`Würze-Variante`.padEnd(48) + 'Treffer   Erhalt   Runden in Rolle   Spiele mit Abweichung | Trefferquote je Rolle');
  for (const v of variants.slice(0, Number(process.env.RECOG_ONLY ?? variants.length))) {
    const rows = await collect(v.opts, games, 5000);
    const e = evaluate(rows);
    console.log(`${v.name.padEnd(48)}${(100 * e.acc).toFixed(1).padStart(5)} %  ${(100 * (e.acc / base.acc)).toFixed(0).padStart(5)} %   ${(100 * e.inRole).toFixed(0).padStart(10)} %        ${(100 * e.anyDev).toFixed(0).padStart(10)} %      | ${fmtPer(e)}`);
  }
  console.log('FERTIG');
}
