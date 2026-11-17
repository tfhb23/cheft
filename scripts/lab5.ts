/**
 * Messreihen für das Rollen-System V3 (Spielweisen, Vorlieben, Gegner-Gedächtnis, Wildcard).
 *
 *   npx tsx scripts/lab5.ts <satz> [Spiele=600] [Runden=5]
 *
 * Sätze: roles (Spielweisen pur und mit Zutaten), tastes (Stärke der Vorlieben, Band, Schutz, absurde Werte),
 *        opp (Gegner-Gedächtnis des Mastermind und der anderen Stufen), human (Rollentreue, Launen, Stimmung),
 *        matrix (alle Rollen auf allen Stufen), tables (Extremtische: nur Wildcards, nur Glücksritter, 2 und 3 Spieler)
 */
import { appendFileSync } from 'node:fs';
import { Spec, Summary, line, runSpecs } from './roles';
import type { RoleId } from '../src/bot/roles';
import type { BotLevel } from '../src/engine/game';

const set = process.argv[2] ?? 'roles';
const games = Number(process.argv[3] ?? 600);
const rounds = Number(process.argv[4] ?? 5);
const out = process.env.OUT;

const ctl: Spec = { name: 'Kontrolle', level: 'normal' };
const T = (name: string, extra: Partial<Spec> = {}): Spec => ({ name, level: 'normal', ...extra });
const R = (name: string, role: RoleId, extra: Partial<Spec> = {}): Spec => ({ name, level: 'normal', role, ...extra });
const ROLES: RoleId[] = ['balanced', 'early', 'cunning', 'pairs', 'gambler', 'wildcard'];
const PURE = { tastes: false, oppUse: 0 };

interface Run {
  specs: Spec[];
  /** Welche Specs ausgegeben werden (Standard: nur die erste). */
  show?: number[];
}
const runs: Run[] = [];
const solo = (sp: Spec, c: Spec = ctl): Run => ({ specs: [sp, c, c, c] });

if (set === 'roles') {
  for (const id of ROLES) runs.push(solo(R(`${id} pur`, id, { roleOpts: PURE })));
  for (const id of ROLES) runs.push(solo(R(`${id} +Vorl.+Gegner`, id, { probeTaste: true })));
  for (const g of [0, 0.3, 0.6]) runs.push(solo(R(`gambler gamble ${g} pur`, 'gambler', { roleOpts: { ...PURE, knobs: { gamble: g } } })));
}

if (set === 'tastes') {
  const A = (name: string, knobs: object) => solo(T(name, { knobs: { taste: 'auto', ...knobs }, probeTaste: true }));
  runs.push(solo(T('ohne Vorlieben')));
  for (const s of [0.5, 1, 2, 4, 8]) runs.push(A(`Skala ${s}`, { tasteScale: s }));
  for (const b of [0, 2, 4, 8, 16, 1000]) runs.push(A(`Band ${b} (Skala 2)`, { tasteScale: 2, tasteBand: b }));
  for (const p of [1e-9, 6, 14, 30, 1e9]) runs.push(A(`Schutz ${p} (Skala 2)`, { tasteScale: 2, tasteProt: p }));
  runs.push(A('ABSURD: Skala 100, Band 1e9, Schutz 1e9', { tasteScale: 100, tasteBand: 1e9, tasteProt: 1e9 }));
  runs.push(A('ABSURD: Skala -5 (kehrt um)', { tasteScale: -5 }));
  runs.push(
    solo(
      T('ABSURD: Herz+Gewicht 1000, Intensität 5', {
        knobs: { taste: { intensity: 5, tastes: [{ spec: { kind: 'suit', suit: 'H' }, weight: 1000 }, { spec: { kind: 'ranks', ranks: [13] }, weight: -1000, superstition: true }] } },
      }),
    ),
  );
  runs.push(solo(T('Rot+Schwarz gleich geliebt', { knobs: { taste: { intensity: 1, tastes: [{ spec: { kind: 'color', color: 'red' }, weight: 5 }, { spec: { kind: 'color', color: 'black' }, weight: 5 }] } } })));
}

if (set === 'opp') {
  const lvl = (l: BotLevel, u: number): Spec => ({ name: `${l} Gegner-Gedächtnis ${u}`, level: l, knobs: { oppUse: u } });
  const same = (l: BotLevel): Spec => ({ name: 'Kontrolle', level: l });
  for (const l of ['master', 'hard', 'normal'] as BotLevel[]) for (const u of [1]) runs.push({ specs: [lvl(l, u), same(l), same(l), same(l)] });
  // Gegen Rollen mit Vorlieben: Mastermind mit und ohne Gegner-Gedächtnis auf denselben Spielen
  for (const id of ['early', 'cunning', 'pairs', 'gambler'] as RoleId[]) {
    const c: Spec = { name: `Gegner ${id}`, level: 'normal', role: id, roleOpts: { oppUse: 0 } };
    for (const u of [0, 1]) runs.push({ specs: [{ name: `master oppUse ${u} vs ${id}`, level: 'master', knobs: { oppUse: u } }, c, c, c] });
  }
  // Absurd: Skala 5 und -1
  for (const u of [5, -1]) runs.push({ specs: [lvl('master', u), same('master'), same('master'), same('master')] });
}

if (set === 'human') {
  for (const id of ROLES.slice(0, 5)) {
    runs.push(solo(R(`${id}`, id)));
    runs.push(solo(R(`${id} treu 0.8, Launen .3, Stimmung .5`, id, { roleOpts: { loyalty: 0.8, jitter: 0.3, tilt: 0.5 } })));
  }
}

if (set === 'matrix') {
  for (const l of ['easy', 'normal', 'hard', 'master'] as BotLevel[]) for (const id of ROLES) runs.push(solo(R(`${l}/${id}`, id, { level: l })));
}

if (set === 'tables') {
  const w = (n: string, l: BotLevel = 'normal'): Spec => R(n, 'wildcard', { level: l });
  runs.push({ specs: [w('Wildcard A'), w('Wildcard B'), w('Wildcard C'), w('Wildcard D')], show: [0, 1, 2, 3] });
  runs.push({ specs: ['balanced', 'early', 'cunning', 'pairs'].map((id) => R(id, id as RoleId, { level: 'hard' })), show: [0, 1, 2, 3] });
  runs.push({ specs: ['gambler', 'gambler', 'gambler', 'gambler'].map((id, k) => R(`Glücksritter ${k}`, id as RoleId, { level: 'master' })), show: [0, 1, 2, 3] });
  runs.push({ specs: [R('Frühvogel master', 'early', { level: 'master' }), R('Gerissener easy', 'cunning', { level: 'easy' }), R('Pärchenkönig hard', 'pairs', { level: 'hard' }), R('Glücksritter normal', 'gambler')], show: [0, 1, 2, 3] });
  runs.push({ specs: [R('2 Spieler: Pärchenkönig master', 'pairs', { level: 'master' }), R('2 Spieler: Frühvogel easy', 'early', { level: 'easy' })], show: [0, 1] });
  runs.push({ specs: [R('3 Spieler: Wildcard master', 'wildcard', { level: 'master' }), R('3 Spieler: Gerissener normal', 'cunning'), R('3 Spieler: Glücksritter normal', 'gambler')], show: [0, 1, 2] });
}

if (runs.length === 0) throw new Error(`Unbekannter Satz ${set}`);
console.log(`Satz ${set}: ${runs.length} Läufe × ${games} Spiele × ${rounds} Runden`);
for (const r of runs) {
  const { accs, sums, secs } = await runSpecs(r.specs, games, rounds, 0);
  for (const k of r.show ?? [0]) {
    const s = sums[k] as Summary & { tasteBias?: number };
    const bias = Number.isFinite(s.tasteBias) ? ` | Vorlieben-Einfluss ${s.tasteBias!.toFixed(2)} Pkt` : '';
    console.log(line(r.specs[k].name, sums[k]) + bias + `  (${secs.toFixed(0)} s)`);
    if (out) appendFileSync(out, JSON.stringify({ set, spec: r.specs[k], games, rounds, sum: sums[k], ctl: sums[1], acc: accs[k] }) + '\n');
  }
}
console.log('FERTIG');
