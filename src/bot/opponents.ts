/**
 * Gegner-Gedächtnis über das ganze Spiel: Aus den Rundenprofilen (engine/profile.ts) der vergangenen Runden schätzt ein
 * Bot, wie ein Mitspieler spielt (Mensch oder Bot, das ist egal): Cheft oder Rommé, früh oder spät raus, nie draußen,
 * und welche Karten er lieber abwirft oder behält (seine „Vorlieben“).
 *
 * Wie viel davon ein Bot weiß, bestimmt sein Gedächtnis (memory.ts, oppObserve / oppDetail / oppSpan / oppAccuracy):
 * Der Mastermind kennt alle Runden genau, Scharfsinnig weniger Runden, gröber und mit Merkfehlern, Normal nur das Grobe.
 * Alles ist eine reine Funktion des Spielstands (kein eigener Speicher): Es gilt nur für das laufende Spiel.
 */
import { makeRng } from '../engine/cards';
import type { Card } from '../engine/cards';
import type { GameState } from '../engine/game';
import type { RoundProfile } from '../engine/profile';
import type { MemoryParams } from './memory';

export interface OppModel {
  /** Registrierte vergangene Runden. */
  rounds: number;
  cheftRate: number;
  /** Anteil der Runden, in denen er nach höchstens 3 eigenen Zügen draußen war. */
  earlyRate: number;
  /** Anteil der Runden ohne Erstmeldung. */
  neverRate: number;
  firstRate: number;
  /** Mittlere Rommé-Erstmeldung in Augen, falls bekannt. */
  avgOpen: number | null;
  /** 0 grob, 1 mit Farbe/Wertklasse, 2 mit einzelnen Farben. */
  detail: 0 | 1 | 2;
  /** Zuneigung −1 (meidet) bis 1 (behält gern) je Klasse; nur ab Detail 1 (Farbe/Klasse) bzw. 2 (einzelne Farbe) belegt. */
  suit: number[];
  red: number;
  low: number;
  mid: number;
  face: number;
  /** Wie viele Abwürfe und Karten genommen wurden (Gewicht der Zuneigung). */
  samples: number;
}

const BASE = { suit: 0.25, red: 0.5, low: 5 / 13, mid: 4 / 13, face: 3 / 13 };

function hash(...vals: number[]): number {
  let h = 0x9e3779b1;
  for (const v of vals) {
    h = Math.imul(h ^ (v | 0), 0x85ebca6b);
    h = (h ^ (h >>> 13)) >>> 0;
  }
  return h >>> 0;
}
/** Zufall je (Spiel, Beobachter, Ziel, Runde, Zweck), unabhängig von der laufenden Runde: Das Wissen flackert nicht. */
function dice(state: GameState, pid: number, target: number, round: number, salt: number, k = 0): number {
  return makeRng(hash(state.seed, pid, target, round, salt, k))();
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const rankOf = (code: number) => code % 16;
const suitOf = (code: number) => Math.floor(code / 16);
const isJokerCode = (code: number) => code >= 64;

interface Tally {
  n: number;
  suit: number[];
  red: number;
  low: number;
  mid: number;
  face: number;
}
const tally = (): Tally => ({ n: 0, suit: [0, 0, 0, 0], red: 0, low: 0, mid: 0, face: 0 });
function add(t: Tally, code: number): void {
  if (isJokerCode(code)) return;
  const s = suitOf(code);
  const r = rankOf(code);
  t.n++;
  t.suit[s]++;
  if (s <= 1) t.red++;
  if (r >= 2 && r <= 6) t.low++;
  else if (r >= 7 && r <= 10) t.mid++;
  else if (r >= 11) t.face++;
}

/** Eine verwässerte Erinnerung: statt der echten Karten Zufallskarten (so, als hätte man sich schlecht erinnert). */
function blurCodes(codes: number[], state: GameState, pid: number, target: number, round: number, salt: number): number[] {
  return codes.map((c, i) => {
    if (isJokerCode(c)) return c;
    const u = dice(state, pid, target, round, salt, i);
    return Math.floor(u * 4) * 16 + 1 + Math.floor(dice(state, pid, target, round, salt + 1, i) * 13);
  });
}

/**
 * Das Bild, das `pid` von `target` hat. null, wenn er nichts weiß (keine registrierte Runde oder kein Profil im Spielstand).
 */
export function opponentModel(state: GameState, pid: number, target: number, params: MemoryParams): OppModel | null {
  if (!(params.oppObserve > 0) || target === pid) return null;
  const now = state.round.no;
  const seen: { p: RoundProfile; round: number; blurred: boolean }[] = [];
  state.history.forEach((h, idx) => {
    const p = h.profiles?.[target];
    if (!p) return;
    const round = h.roundNo ?? idx + 1;
    if (now - round > params.oppSpan) return;
    if (!(dice(state, pid, target, round, 1) < params.oppObserve)) return; // diese Runde nicht mitbekommen
    const blurred = !(dice(state, pid, target, round, 2) < params.oppAccuracy);
    seen.push({ p, round, blurred });
  });
  if (seen.length === 0) return null;
  let cheft = 0;
  let early = 0;
  let never = 0;
  let first = 0;
  let openSum = 0;
  let openN = 0;
  const disc = tally();
  const take = tally();
  for (const { p, round, blurred } of seen) {
    let c = p.cheft;
    let e = p.openTurn !== null && p.openTurn <= 3;
    let nv = p.openTurn === null;
    if (blurred) {
      if (dice(state, pid, target, round, 3) < 0.5) c = !c;
      if (dice(state, pid, target, round, 4) < 0.5) e = !e;
      if (dice(state, pid, target, round, 5) < 0.3) nv = !nv;
    }
    if (c) cheft++;
    if (e && !nv) early++;
    if (nv) never++;
    if (p.first && !blurred) first++;
    if (p.openAugen !== null) {
      openSum += blurred ? p.openAugen + (dice(state, pid, target, round, 6) - 0.5) * 30 : p.openAugen;
      openN++;
    }
    const d = blurred ? blurCodes(p.discards, state, pid, target, round, 10) : p.discards;
    const t = blurred ? blurCodes(p.takes, state, pid, target, round, 20) : p.takes;
    for (const code of d) add(disc, code);
    for (const code of t) add(take, code);
  }
  const detail: 0 | 1 | 2 = params.oppDetail < 1 / 3 ? 0 : params.oppDetail < 2 / 3 ? 1 : 2;
  const n = seen.length;
  const affinity = (pick: (t: Tally) => number, base: number): number => {
    const nd = disc.n;
    const nt = take.n;
    const affD = nd > 0 ? clamp((base - pick(disc) / nd) / base, -1, 1) * Math.min(1, nd / 20) : 0;
    const affT = nt > 0 ? clamp((pick(take) / nt - base) / (1 - base), -1, 1) * Math.min(1, nt / 4) : 0;
    return clamp(0.7 * affD + 0.5 * affT, -1, 1);
  };
  return {
    rounds: n,
    cheftRate: cheft / n,
    earlyRate: early / n,
    neverRate: never / n,
    firstRate: first / n,
    avgOpen: openN > 0 ? openSum / openN : null,
    detail,
    suit: detail === 2 ? [0, 1, 2, 3].map((s) => affinity((t) => t.suit[s], BASE.suit)) : [0, 0, 0, 0],
    red: detail >= 1 ? affinity((t) => t.red, BASE.red) : 0,
    low: detail >= 1 ? affinity((t) => t.low, BASE.low) : 0,
    mid: detail >= 1 ? affinity((t) => t.mid, BASE.mid) : 0,
    face: detail >= 1 ? affinity((t) => t.face, BASE.face) : 0,
    samples: disc.n + take.n,
  };
}

/** Wie gern behält dieser Gegner (nach dem, was bekannt ist) eine Karte wie diese? −1 bis 1. */
export function likes(m: OppModel | null, card: Pick<Card, 'suit' | 'rank'>): number {
  if (!m || m.detail === 0 || card.suit === 'J') return 0;
  const si = card.suit === 'H' ? 0 : card.suit === 'D' ? 1 : card.suit === 'C' ? 2 : 3;
  const color = card.suit === 'H' || card.suit === 'D' ? m.red : -m.red;
  const cls = card.rank >= 11 ? m.face : card.rank >= 7 && card.rank <= 10 ? m.mid : card.rank >= 2 ? m.low : 0;
  if (m.detail === 2) return clamp(0.5 * m.suit[si] + 0.3 * cls + 0.2 * color, -1, 1);
  return clamp(0.4 * color + 0.6 * cls, -1, 1);
}

/**
 * Wie schnell kommen die Mitspieler raus? Verschiebung des eigenen Ehrgeizes (−0,2 bis 0,2): Öffnen die anderen fast immer
 * früh, lohnt Warten kaum; öffnen sie selten früh, kann man sich Zeit lassen. Mit `use` skaliert, ohne Daten 0.
 */
export function tempoShift(models: (OppModel | null)[], use: number): number {
  const known = models.filter((m): m is OppModel => !!m);
  if (known.length === 0 || !(use !== 0)) return 0;
  const fast = known.reduce((s, m) => s + m.earlyRate, 0) / known.length;
  return clamp((0.35 - fast) * 0.6, -0.2, 0.2) * use;
}
