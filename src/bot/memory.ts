/**
 * Gedächtnis und Wahrnehmung der Bots.
 *
 * Die Stufe eines Bots ("Gedächtnis") besteht nur aus diesen Werten: Wie lange und wie scharf merkt er sich
 * abgeworfene und offen genommene Karten, wie oft übersieht er etwas am Tisch oder in der eigenen Hand?
 * Alles wird bei jeder Entscheidung deterministisch aus dem Spielzustand abgeleitet (Seed, Runde, Spieler, Karte,
 * eigener Zug). Der Bot speichert nichts: Derselbe Zustand führt immer zur selben Wahrnehmung, auch nach einem
 * Neustart des Servers, und eine Erinnerung verblasst gleichmäßig, statt zwischen den Zügen zu flackern.
 *
 * Vergessen ist eine Treppe, kein Absturz (S = Spanne dieser einen Karte, in Zügen):
 *   Alter < 0,5 S    exakt           "Herz Bube"
 *   Alter < 1 S      eine Achse      "roter Bube" oder "Pik-Bildkarte"
 *   Alter < 2,5 S    nur der Eindruck "schwarze Bildkarte"
 *   danach           vergessen
 * Die Genauigkeit wirkt schon beim Einprägen: Mit der Wahrscheinlichkeit (1 − Genauigkeit) wird die Karte gleich eine
 * Stufe verschwommener abgespeichert. Nur der Mastermind (alles 100 %) irrt sich nie.
 */
import { Card, SUITS, Suit, isJoker, makeRng } from '../engine/cards';
import { BotLevel, GameState } from '../engine/game';
import { Meld, MeldShape } from '../engine/melds';

export interface MemoryParams {
  /** Durchschnittliche Gedächtnisspanne in Runden (ein Umlauf, in dem jeder einmal dran war). Infinity = vergisst nie. */
  span: number;
  /** Faktorbereich, in dem die Spanne je Karte schwankt (0 = sofort vergessen, 2 = doppelt so lang). [1, 1] = starr. */
  spread: [number, number];
  /** Genauigkeit 0..1: Wahrscheinlichkeit, eine Karte beim Einprägen exakt abzuspeichern. */
  accuracy: number;
  /** Tagesform 0..1: Wie stark Spanne, Genauigkeit und Aufmerksamkeit zwischen guten und schlechten Runden schwanken. */
  form: number;
  /** Chance, eine fremde Auslage in einem Zug zu übersehen (bei vollem Tisch; bei leerem Tisch 0). */
  tableMiss: number;
  /** Eine Blindphase dauert 1 bis 1 + missExtra eigene Züge; danach wird die Auslage wieder wahrgenommen. */
  missExtra: number;
  /** Chance, dass ein offenes Nehmen von Ablage oder Teppichkarte durch einen Mitspieler überhaupt registriert wird. */
  observe: number;
  /**
   * Handüberblick: Grundchance, eine mögliche Kombination, ein Anlegen oder Klauen mit der eigenen Hand zu übersehen.
   * Einfache Dinge (ein Satz aus drei Karten, ein Paar) übersieht man seltener, schwierige (lange Folgen, Joker, Ass
   * oben oder unten, Klauen) öfter: Die Chance wird mit der Schwierigkeit multipliziert (siehe comboDifficulty).
   */
  handMiss: number;
}

export const MEMORY: Record<BotLevel, MemoryParams> = {
  easy: { span: 3, spread: [0, 2], accuracy: 0.75, form: 0.3, tableMiss: 0.12, missExtra: 2, observe: 0.4, handMiss: 0.4 },
  normal: { span: 5, spread: [0.3, 1.7], accuracy: 0.85, form: 0.2, tableMiss: 0.06, missExtra: 1, observe: 0.7, handMiss: 0.2 },
  hard: { span: 9, spread: [0.7, 1.3], accuracy: 0.93, form: 0.1, tableMiss: 0.02, missExtra: 0, observe: 0.9, handMiss: 0.07 },
  master: { span: Infinity, spread: [1, 1], accuracy: 1, form: 0, tableMiss: 0, missExtra: 0, observe: 1, handMiss: 0 },
};

export function memoryFor(level: BotLevel, override: Partial<MemoryParams> = {}): MemoryParams {
  return { ...MEMORY[level], ...override };
}

// ---------------------------------------------------------------- Deterministischer Zufall

const SALT = { form: 1, span: 2, mis: 3, axis: 4, observe: 5, blind: 6, blindLen: 7, hand: 8 } as const;

function mix(h: number, v: number): number {
  h = Math.imul(h ^ (v | 0), 0x9e3779b1);
  return (h ^ (h >>> 15)) >>> 0;
}

/** Zufallszahl in [0, 1), nur abhängig von Seed, Runde, Spieler, Zweck und Schlüsseln. */
export function roll(state: GameState, pid: number, salt: number, ...keys: number[]): number {
  let h = mix(mix(mix(state.seed >>> 0, state.round.no), pid), salt);
  for (const k of keys) h = mix(h, k);
  return makeRng(h)();
}

export const ROLL_SALT = SALT;

// ---------------------------------------------------------------- Erinnerungsstufen

/** 0 exakt, 1 eine Achse verschwommen, 2 nur der Eindruck, 3 vergessen. */
export type Stage = 0 | 1 | 2 | 3;

/**
 * Wie scharf ist eine Erinnerung? `age` und `span` in derselben Einheit (Züge).
 * `misperceived`: Die Karte wurde schon beim Einprägen verwechselt und ist um eine Stufe verschwommener.
 */
export function memoryStage(age: number, span: number, misperceived: boolean): Stage {
  if (!(span > 0)) return 3;
  const a = age / span; // Infinity als Spanne ergibt 0
  let stage: Stage = a < 0.5 ? 0 : a < 1 ? 1 : a < 2.5 ? 2 : 3;
  if (misperceived && stage < 2) stage = (stage + 1) as Stage;
  return stage;
}

export interface Cand {
  suit: Suit | 'J';
  rank: number;
}

export const candKey = (c: Cand): string => (c.suit === 'J' ? 'J' : `${c.suit}${c.rank}`);

const isFace = (rank: number) => rank === 1 || rank >= 11;
const FACE_RANKS = [1, 11, 12, 13];
const colorMates = (s: Suit): Suit[] => (s === 'H' || s === 'D' ? ['H', 'D'] : ['C', 'S']);

/**
 * Welche Karten kommen für diese Erinnerung in Frage?
 * `axisRoll` (0..1) entscheidet, welche Achse zuerst verschwimmt: Bildkarten (B, D, K, A) verwechselt man eher im Wert,
 * Zahlkarten eher in der Farbe (Herz/Karo, Pik/Kreuz).
 */
export function candidates(card: Card, stage: Stage, axisRoll: number): Cand[] {
  if (stage === 3) return [];
  if (isJoker(card)) return [{ suit: 'J', rank: 0 }];
  const suit = card.suit as Suit;
  if (stage === 0) return [{ suit, rank: card.rank }];
  const face = isFace(card.rank);
  if (stage === 1) {
    const blurRank = face ? axisRoll < 0.7 : axisRoll >= 0.7;
    if (blurRank) {
      // Zahlkarten: der Nachbarwert, aber nie über die Klassengrenze (2 bis 6, 7 bis 10) hinaus, damit eine
      // schwächere Erinnerung immer alles enthält, was die schärfere noch erlaubte.
      const sameClass = (r: number) => r >= 2 && r <= 10 && r <= 6 === card.rank <= 6;
      const ranks = face ? FACE_RANKS : [card.rank - 1, card.rank, card.rank + 1].filter(sameClass);
      return ranks.map((rank) => ({ suit, rank }));
    }
    return colorMates(suit).map((s) => ({ suit: s, rank: card.rank }));
  }
  // Nur der Eindruck: Farbe (rot/schwarz) und Klasse (Bildkarte, niedrige oder hohe Zahl)
  const ranks = face ? FACE_RANKS : card.rank <= 6 ? [2, 3, 4, 5, 6] : [7, 8, 9, 10];
  const out: Cand[] = [];
  for (const s of colorMates(suit)) for (const rank of ranks) out.push({ suit: s, rank });
  return out;
}

// ---------------------------------------------------------------- Tagesform und Wahrnehmung am Tisch

/** Tagesform dieser Runde: positiv = guter Tag, negativ = schlechter Tag, begrenzt durch params.form. */
export function goodDay(state: GameState, pid: number, params: MemoryParams): number {
  if (!(params.form > 0)) return 0;
  return params.form * (roll(state, pid, SALT.form) * 2 - 1);
}

/** Wie voll ist der Tisch? 0 = leer, 1 = ab 24 ausgelegten Karten unübersichtlich. */
export function tableLoad(state: GameState): number {
  let n = 0;
  for (const m of state.round.melds) n += m.cards.length;
  return Math.min(1, n / 24);
}

/**
 * Ist ein Ding am Tisch (Auslage, Teppichkarte, oberste Ablagekarte) im eigenen Zug `turn` in einer Blindphase?
 * Eine Phase beginnt mit der Wahrscheinlichkeit `pStart`, dauert 1 bis 1 + extra Züge und wird danach von mindestens
 * einem aufmerksamen Zug gefolgt. So bleibt nichts dauerhaft ausgeblendet. Die Phasen werden vom Rundenbeginn an
 * nachgerechnet, also bleibt das Ergebnis für denselben Zug immer gleich.
 */
export function blindAt(state: GameState, pid: number, key: number, pStart: number, extra: number, turn: number): boolean {
  if (!(pStart > 0)) return false;
  let until = -2;
  for (let s = 0; s <= turn; s++) {
    if (s <= until + 1) continue;
    if (roll(state, pid, SALT.blind, key, s) < pStart) {
      const len = 1 + Math.min(extra, Math.floor(roll(state, pid, SALT.blindLen, key, s) * (extra + 1)));
      until = s + len - 1;
    }
  }
  return turn <= until;
}

export interface Perception {
  params: MemoryParams;
  /** Gute oder schlechte Tagesform dieser Runde (siehe goodDay). */
  goodDay: number;
  /** Eigene Zugnummer in dieser Runde. */
  turn: number;
  /** Pflichtzüge (Joker verwenden, genommene Karte nutzen, Paar mit der Teppichkarte): hier wird nichts übersehen. */
  forced: boolean;
  /** Fremde Auslagen (Meld-IDs), die der Bot in diesem Zug übersieht. */
  blindMelds: ReadonlySet<number>;
  carpetBlind: boolean;
  topBlind: boolean;
}

export function perceive(state: GameState, pid: number, params: MemoryParams, forced = false): Perception {
  const r = state.round;
  const gd = goodDay(state, pid, params);
  const turn = r.players[pid].turns;
  const blindMelds = new Set<number>();
  let carpetBlind = false;
  let topBlind = false;
  if (!forced && params.tableMiss > 0) {
    const mult = Math.max(0, 1 - gd);
    const pMeld = params.tableMiss * mult * tableLoad(state);
    // Einzelne, auffällige Karten (Teppichkarte, oberste Ablagekarte) übersieht man seltener als eine Auslage unter vielen
    const pSingle = params.tableMiss * mult * 0.25;
    for (const m of r.melds) {
      if (m.owner !== pid && blindAt(state, pid, m.id, pMeld, params.missExtra, turn)) blindMelds.add(m.id);
    }
    if (r.carpet) carpetBlind = blindAt(state, pid, 100000 + r.carpet.id, pSingle, params.missExtra, turn);
    const top = r.discard[r.discard.length - 1];
    if (top) topBlind = blindAt(state, pid, 200000 + top.id, pSingle, params.missExtra, turn);
  }
  return { params, goodDay: gd, turn, forced, blindMelds, carpetBlind, topBlind };
}

/** Der Spielzustand, wie der Bot ihn gerade sieht: übersehene Auslagen fehlen. Nur zum Lesen verwenden. */
export function perceivedState(state: GameState, per: Perception): GameState {
  if (per.blindMelds.size === 0) return state;
  return { ...state, round: { ...state.round, melds: state.round.melds.filter((m) => !per.blindMelds.has(m.id)) } };
}

/**
 * Handüberblick: Übersieht der Bot an dieser Stelle etwas mit der eigenen Hand? `difficulty` skaliert die Grundchance
 * der Stufe (1 = durchschnittlich schwierig). `keys` unterscheidet die Entscheidungen im selben Zug; derselbe Zustand
 * würfelt immer gleich, der nächste Zug dagegen neu.
 */
export function overlooksAt(state: GameState, pid: number, per: Perception, difficulty: number, ...keys: number[]): boolean {
  if (per.forced || !(per.params.handMiss > 0)) return false;
  const p = Math.min(1, per.params.handMiss * Math.max(0, 1 - per.goodDay) * difficulty);
  return roll(state, pid, SALT.hand, per.turn, state.round.turn.actions, ...keys) < p;
}

/** Wie `overlooksAt` mit durchschnittlicher Schwierigkeit. */
export function overlooks(state: GameState, pid: number, per: Perception, ...keys: number[]): boolean {
  return overlooksAt(state, pid, per, 1, ...keys);
}

/**
 * Wie schwer ist eine Kombination zu erkennen? Ein Satz aus drei Karten oder ein Paar springt ins Auge, eine lange Folge,
 * ein Joker oder ein Ass (oben oder unten angelegt) dagegen erkennt man leichter nicht. Das Mittel über die Kombinationen,
 * die Bots in echten Spielen sehen, ist 1 (siehe COMBO_SCALE und die Kalibrierung).
 */
export const COMBO_SCALE = 1.63;
/** Wie COMBO_SCALE, für das Anlegen (Mittel über die Anlegemöglichkeiten in echten Spielen = 1). */
export const LAYOFF_SCALE = 1.15;

export function comboDifficulty(shape: Pick<MeldShape, 'type' | 'cards' | 'startRank'>): number {
  const jokers = shape.cards.filter(isJoker).length;
  let d: number;
  if (shape.type === 'pair') d = 0.2;
  else if (shape.type === 'set') d = shape.cards.length <= 3 ? 0.4 : 0.55;
  else {
    d = 0.6 + 0.2 * Math.max(0, shape.cards.length - 3);
    const start = shape.startRank ?? 2;
    const end = start + shape.cards.length - 1;
    if (start === 1 || end === 14) d += 0.25; // Ass unten oder oben
  }
  d += 0.45 * Math.min(jokers, 2);
  return Math.min(2.5, Math.max(0.15, d * COMBO_SCALE));
}

/** Schwierigkeit, an einer Auslage anzulegen: Sätze sind leicht, Folgen schwerer, Joker und Asse in der Auslage erschweren es. */
export function layOffDifficulty(card: Card, meld: Pick<Meld, 'type' | 'cards'>): number {
  let d = meld.type === 'set' ? 0.5 : 0.85;
  if (meld.cards.some(isJoker)) d += 0.4;
  if (!isJoker(card) && card.rank === 1) d += 0.3;
  return Math.min(2.5, Math.max(0.15, d * LAYOFF_SCALE));
}

/** Einen ausgelegten Joker zu klauen erfordert, die vertretene Karte zu erkennen: das übersieht man am ehesten. */
export const STEAL_DIFFICULTY = 1.6;

// ---------------------------------------------------------------- Erinnerung: Was weiß der Bot noch?

export interface Unseen {
  /** Noch nicht verortete Kopien je Karte ('H5', 'J' für Joker). Verschwommene Erinnerungen ziehen anteilig ab. */
  copies: Map<string, number>;
  total: number;
}

export interface Recall {
  unseen: Unseen;
  /** Offen genommene Karten der Mitspieler, so scharf, wie der Bot sie noch im Kopf hat. */
  takes: { player: number; cands: Cand[] }[];
}

interface PublicEvent {
  kind: 'discard' | 'take';
  card: Card;
  /** Alter in Zügen. */
  age: number;
  by: number | null;
}

/** Alle öffentlichen Kartenereignisse dieser Runde, je Karte nur das jüngste. */
function publicEvents(state: GameState): PublicEvent[] {
  const r = state.round;
  // Wer hat abgeworfen? `discardedBy` kennt die ganze Runde; ältere Spielstände nur das kurze Protokoll des Rückblicks.
  const discarder = new Map<number, number>();
  for (const e of r.discardLog ?? []) discarder.set(e.card.id, e.player);
  for (const [id, player] of Object.entries(r.discardedBy ?? {})) discarder.set(Number(id), player);
  const latest = new Map<number, PublicEvent>();
  const put = (e: PublicEvent) => {
    const old = latest.get(e.card.id);
    if (!old || e.age < old.age) latest.set(e.card.id, e);
  };
  const len = r.discard.length;
  r.discard.forEach((card, idx) => put({ kind: 'discard', card, age: len - 1 - idx, by: discarder.get(card.id) ?? null }));
  const now = r.plies ?? 0;
  for (const x of r.taken) put({ kind: 'take', card: x.card, age: Math.max(0, now - (x.at ?? now)), by: x.player });
  return [...latest.values()];
}

/**
 * Was weiß der Bot noch von den Karten im Spiel? Sieht er sie jetzt, kennt er sie genau (eigene Hand, Auslagen,
 * Teppichkarte, oberste Ablagekarte). Alles andere (verdeckte Abwürfe, offen genommene Karten) kommt aus der Erinnerung
 * und verblasst. Der Rest steckt im Stapel oder in fremden Händen.
 */
export function recall(state: GameState, pid: number, per: Perception): Recall {
  const r = state.round;
  const params = per.params;
  const n = state.players.length;
  const copies = new Map<string, number>();
  for (const s of SUITS) for (let rank = 1; rank <= 13; rank++) copies.set(`${s}${rank}`, 2);
  copies.set('J', 2);
  const sub = (key: string, amount: number) => copies.set(key, Math.max(0, (copies.get(key) ?? 0) - amount));
  const keyOf = (c: Card) => (isJoker(c) ? 'J' : `${c.suit}${c.rank}`);

  // Was der Bot gerade sieht, kennt er genau.
  const exact = new Set<number>();
  const see = (c: Card) => {
    if (exact.has(c.id)) return;
    exact.add(c.id);
    sub(keyOf(c), 1);
  };
  for (const c of r.players[pid].hand) see(c);
  for (const m of r.melds) if (!per.blindMelds.has(m.id)) for (const c of m.cards) see(c);
  if (r.carpet && !per.carpetBlind) see(r.carpet);
  const top = r.discard[r.discard.length - 1];
  if (top && !per.topBlind) see(top);

  const spanPlies = params.span * n * (1 + per.goodDay);
  const accuracy = params.accuracy >= 1 && params.form === 0 ? 1 : Math.min(0.99, params.accuracy * (1 + 0.5 * per.goodDay));
  const observe = params.observe >= 1 ? 1 : Math.min(1, params.observe * (1 + 0.5 * per.goodDay));
  const [lo, hi] = params.spread;

  const takes: Recall['takes'] = [];
  for (const ev of publicEvents(state)) {
    const card = ev.card;
    const id = card.id;
    const isTake = ev.kind === 'take';
    if (isTake && ev.by === pid) continue; // eigene Karten kennt der Bot
    if (isTake && !(roll(state, pid, SALT.observe, id) < observe)) continue; // gar nicht mitbekommen
    const joker = isJoker(card);
    // Joker fallen auf (doppelt so lange im Kopf, nie verwechselt); eigene Abwürfe merkt man sich länger
    let factor = lo + (hi - lo) * roll(state, pid, SALT.span, id);
    if (joker) factor *= 2;
    if (ev.kind === 'discard' && ev.by === pid) factor *= 1.5;
    const mis = !joker && !(roll(state, pid, SALT.mis, id) < accuracy);
    // Ein Kartenereignis, das jetzt offen vor einem liegt (z. B. genommene und ausgelegte Karte), kennt man genau.
    const span = factor === 0 ? 0 : spanPlies * factor; // Infinity * 0 wäre NaN
    const stage: Stage = exact.has(id) ? 0 : memoryStage(ev.age, span, mis);
    const cands = candidates(card, stage, roll(state, pid, SALT.axis, id));
    if (cands.length === 0) continue;
    if (!exact.has(id)) for (const c of cands) sub(candKey(c), 1 / cands.length);
    if (isTake && ev.by !== null) takes.push({ player: ev.by, cands });
  }
  let total = 0;
  for (const v of copies.values()) total += v;
  return { unseen: { copies, total }, takes };
}
