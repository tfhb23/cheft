/**
 * Parameter-Sweeps: Ein Platz mit veränderten Reglern (auch absurden) gegen drei Ausgewogene (Normal).
 *
 *   npx tsx scripts/lab2.ts <satz> [Spiele=500] [Runden=5]
 *
 * Sätze: knobs (alle neuen und alten Charakterregler), loyal (Rollentreue, Launen, Stimmung), levels (Rolle × Gedächtnis),
 * extras (Mastermind-Extras: master, patient, burn, jokerHunter je Stufe)
 */
import { appendFileSync } from 'node:fs';
import { CAND } from '../src/bot/personas';
import { Spec, line, runSpecs } from './roles';
import type { BotLevel } from '../src/engine/game';

const set = process.argv[2] ?? 'knobs';
const games = Number(process.argv[3] ?? 500);
const rounds = Number(process.argv[4] ?? 5);
const out = process.env.OUT;

const ctl: Spec = { name: 'Kontrolle', level: 'normal' };
const T = (name: string, extra: Partial<Spec> = {}): Spec => ({ name, level: 'normal', persona: 'ausgewogen', ...extra });
const K = (name: string, knobs: object, extra: Partial<Spec> = {}) => T(name, { knobs, ...extra });

const sweeps: Record<string, Spec[]> = {};

sweeps.knobs = [
  ...[-1, 0, 0.2, 0.4, 0.6, 0.8, 1, 3].map((v) => K(`ambition ${v}`, { ambition: v })),
  ...[-0.5, 0, 0.12, 0.3, 0.6, 1.5, 5, 30].map((v) => K(`shedPre ${v}`, { shedPre: v })),
  ...[-1, 0, 0.9, 1.5, 3, 10, 50].map((v) => K(`shedOpen ${v}`, { shedOpen: v })),
  ...[-9, 0, 4.5, 9, 18, 40, 200].map((v) => K(`blockWeight ${v}`, { blockWeight: v })),
  ...[0, 2, 4, 6, 8, 14].map((v) => K(`handHunter reach ${v}`, { handHunter: true, handReach: v })),
  ...[-1, 0, 2, 4, 6, 10, 14].map((v) => K(`dangerHand ${v}`, { dangerHand: v })),
  ...[-2, 0, 0.5, 1, 2, 4, 20].map((v) => K(`pairLove ${v}`, { pairLove: v })),
  ...[-1, 0.5, 1, 3, 10].map((v) => K(`huntLeader ${v}`, { huntLeader: v })),
  ...[
    [99, 5],
    [5, 5],
    [4, 4],
    [4, 3],
    [3, 3],
    [3, 2],
    [2, 2],
    [1, 1],
    [0, 0],
  ].map(([e, t]) => K(`cheft eager ${e} take ${t}`, { cheftEagerPairs: e, pairTakeAt: t })),
  ...[0, 0.25, 0.5, 1, 3].map((v) => K(`gamble ${v} (+cheft 3/2)`, { gamble: v, cheftEagerPairs: 3, pairTakeAt: 2 })),
  K('weighOpening aus', { weighOpening: false }),
  K('weighOpening aus + ambition 0', { weighOpening: false, ambition: 0 }),
  ...[10, 30, 100].map((v) => K(`openMargin ${v}`, { openMargin: v })),
  K('boldHold + ambition .8', { ambition: 0.8, tuning: { boldHold: true } }),
  K('boldHold + ambition 1, w1 9', { ambition: 1, tuning: { boldHold: true, w1: 9, holdAt0: 0 } }),
  K('tuning holdAt0 -5 (immer warten)', { tuning: { holdAt0: -5 } }),
  K('tuning wTime 0 (Zeit egal)', { tuning: { wTime: 0, holdAt0: 0.1 } }),
  K('bold aus', { bold: false }),
  K('oppModel aus', { oppModel: false }),
  K('steal aus', { steal: false }),
  K('layAll aus', { layAll: false }),
  K('takeDiscardToOpen aus', { takeDiscardToOpen: false }),
  K('master', { master: true }),
  K('patient', { patient: true }),
  K('burn', { burn: true }),
  K('jokerHunter', { jokerHunter: true }),
  K('master+patient+burn+jokerHunter', { master: true, patient: true, burn: true, jokerHunter: true }),
];

const pool = Object.keys(CAND);
sweeps.loyal = [
  // Rollentreue des Cheft-Fans: Wie stark wird aus „immer Cheft“ ein „meistens“?
  ...[1, 0.8, 0.6, 0.4, 0.2, 0].map((v) => T(`cheft loyalty ${v}`, { persona: 'cheft', loyalty: v, pool })),
  ...[1, 0.7, 0.4, 0].map((v) => T(`hand loyalty ${v}`, { persona: 'hand', loyalty: v, pool })),
  ...[1, 0.7, 0.4, 0].map((v) => T(`tempo loyalty ${v}`, { persona: 'tempo', loyalty: v, pool })),
  ...[0, 0.3, 0.6, 1, 2, 5].map((v) => T(`cheft jitter ${v}`, { persona: 'cheft', jitter: v })),
  ...[-5, -1, 0, 1, 5].map((v) => T(`ausgewogen tilt ${v}`, { persona: 'ausgewogen', tilt: v })),
  T('wildcard jitter .4', { persona: 'ausgewogen', loyalty: 0, jitter: 0.4, pool }),
  T('wildcard nur riskante', { persona: 'ausgewogen', loyalty: 0, jitter: 0.4, pool: ['cheft', 'hand', 'joker', 'huerde', 'zocker'] }),
  T('wildcard nur ruhige', { persona: 'ausgewogen', loyalty: 0, jitter: 0.4, pool: ['ausgewogen', 'tempo', 'vorsicht', 'blocker'] }),
  T('wildcard + Tagesform easy/normal/hard', { persona: 'ausgewogen', loyalty: 0, jitter: 0.4, pool, levels: ['easy', 'normal', 'hard'] }),
  T('wildcard + Tagesform easy..master', { persona: 'ausgewogen', loyalty: 0, jitter: 0.4, pool, levels: ['easy', 'normal', 'hard', 'master'] }),
  T('ausgewogen + Tagesform easy/master', { persona: 'ausgewogen', levels: ['easy', 'master'] }),
  T('ausgewogen + Tagesform easy/hard', { persona: 'ausgewogen', levels: ['easy', 'hard'] }),
];

const lv: BotLevel[] = ['easy', 'normal', 'hard', 'master'];
sweeps.levels = lv.flatMap((l) => ['ausgewogen', 'tempo', 'cheft', 'hand', 'joker', 'huerde', 'blocker', 'zocker', 'vorsicht', 'jaeger'].map((p) => T(`${l}/${p}`, { level: l, persona: p })));

sweeps.extras = lv.flatMap((l) =>
  [
    ['Basis', {}],
    ['master', { master: true }],
    ['patient', { patient: true }],
    ['burn+jokerHunter', { burn: true, jokerHunter: true }],
    ['alle vier', { master: true, patient: true, burn: true, jokerHunter: true }],
  ].map(([n, k]) => T(`${l}/${n}`, { level: l, knobs: k as object })),
);

const specs = sweeps[set];
if (!specs) throw new Error(`Unbekannter Satz ${set}`);
console.log(`Satz ${set}: ${specs.length} Konfigurationen × ${games} Spiele × ${rounds} Runden`);
for (const sp of specs) {
  const { accs, sums, secs } = await runSpecs([sp, ctl, ctl, ctl], games, rounds, 0);
  console.log(line(sp.name, sums[0]) + `  (${secs.toFixed(0)} s)`);
  if (out) appendFileSync(out, JSON.stringify({ set, spec: sp, games, rounds, sum: sums[0], ctl: sums[1], acc: accs[0] }) + '\n');
}
console.log('FERTIG');
