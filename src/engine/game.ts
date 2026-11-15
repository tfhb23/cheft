/**
 * Spielzustand und Regeln von Cheft.
 * Alle Aktionen prüfen zuerst (check…) und verändern dann den Zustand (do…).
 * Fehler werden als Übersetzungsschlüssel zurückgegeben.
 */
import { Card, isJoker, makeDeck, makeRng, penaltyValue, shuffle, sameCard } from './cards';
import {
  Meld,
  MeldShape,
  ROMME_TYPES,
  addOptions,
  asPair,
  asRun,
  asSet,
  findPartition,
  jokerRepresents,
  maxPairs,
  meldAugen,
  replaceJoker,
} from './melds';

export type Mode = 'romme' | 'cheft';
export type DrawSource = 'stock' | 'discard' | 'carpet';

export interface Settings {
  rounds: number;
  firstTurnOpenAllowed: boolean;
  direction: 'cw' | 'ccw';
  /** Hand automatisch nach Farbe sortieren (nur Oberfläche). */
  autoSort?: boolean;
}

export type BotLevel = 'easy' | 'normal' | 'hard';
export type BotStyle = 'balanced' | 'sprinter' | 'cheft' | 'hand' | 'blocker' | 'counter' | 'joker' | 'gambler';

export interface BotProfile {
  level: BotLevel;
  style: BotStyle;
}

export interface PlayerInfo {
  id: number;
  name: string;
  isBot: boolean;
  bot?: BotProfile;
}

export interface PlayerRound {
  hand: Card[];
  mode: Mode;
  opened: boolean;
  openingValue: number;
  pairsLaid: number;
  turns: number;
}

export interface Turn {
  player: number;
  phase: 'draw' | 'play';
  drawSource: DrawSource | null;
  drawnCardId: number | null;
  /** Rommé-Spieler hat vom Ablagestapel gezogen und muss damit rauskommen. */
  mustOpenWithId: number | null;
  /** Teppichkarte genommen: muss in diesem Zug in einem Paar liegen und rauskommen. */
  mustPairWithId: number | null;
  /** Rausgekommener Rommé-Spieler hat die Ablagekarte genommen und muss sie sofort verwenden. */
  mustUseId: number | null;
  openedThisTurn: boolean;
  isHand: boolean;
  laidOffToOthers: boolean;
  pendingJokerId: number | null;
  /** Anzahl Auslege-/Anlege-/Klau-Aktionen in diesem Zug. */
  actions: number;
  /** Cheft-Ansage kam durch das Ziehen (Teppichkarte) zustande. */
  cheftByDraw: boolean;
  cheftAnnouncedBefore: boolean;
}

export interface LogEntry {
  key: string;
  player?: number;
  params?: Record<string, string | number>;
}

export interface PlayerScore {
  base: number;
  factors: string[];
  total: number;
}

export interface RoundResult {
  roundNo: number;
  winner: number | null;
  reason: 'out' | 'stock';
  winnerMode: Mode | null;
  hand: boolean;
  jokerBurned: boolean;
  scores: PlayerScore[];
}

export interface RoundState {
  no: number;
  dealer: number;
  starter: number;
  stock: Card[];
  discard: Card[];
  carpet: Card | null;
  melds: Meld[];
  nextMeldId: number;
  players: PlayerRound[];
  turn: Turn;
  cheftAnnounced: boolean;
  lastRommeOpening: number | null;
  lastDiscarder: number | null;
  lastDiscarderMode: Mode | null;
  /** Offen genommene Karten (Ablage/Teppich) je Spieler, für die Bots sichtbar wie am echten Tisch. */
  taken: { player: number; card: Card }[];
  /** Nach dem Austeilen: Spieler sortieren, bis alle bereit sind. */
  waiting: boolean;
  ready: boolean[];
  ended: boolean;
  /** Nach Rundenende: Wer die Auswertung bestätigt hat. Erst wenn alle bestätigt haben, beginnt die nächste Runde (Mehrspieler). */
  nextReady?: boolean[];
  result: RoundResult | null;
  log: LogEntry[];
}

export interface GameState {
  settings: Settings;
  players: PlayerInfo[];
  totals: number[];
  round: RoundState;
  history: RoundResult[];
  finished: boolean;
  seed: number;
}

export type Result = { ok: true } | { ok: false; error: string; params?: Record<string, string | number> };
const OK: Result = { ok: true };
const fail = (error: string, params?: Record<string, string | number>): Result => ({ ok: false, error, params });

export const BASE_THRESHOLD = 51;
export const CHEFT_THRESHOLD = 101;
export const NOT_OPENED_PENALTY = 100;

// ---------------------------------------------------------------- Aufbau

export function newGame(players: PlayerInfo[], settings: Settings, seed = Date.now() % 2147483647): GameState {
  if (players.length < 2 || players.length > 4) throw new Error('2-4 Spieler');
  const state: GameState = {
    settings,
    players,
    totals: players.map(() => 0),
    round: null as unknown as RoundState,
    history: [],
    finished: false,
    seed,
  };
  state.round = dealRound(state, 1, 0);
  return state;
}

export function nextIndex(state: GameState, i: number): number {
  return (i + 1) % state.players.length;
}

export function dealRound(state: GameState, no: number, dealer: number): RoundState {
  const rng = makeRng(state.seed + no * 7919);
  let deck = shuffle(makeDeck(), rng);
  const n = state.players.length;
  const starter = (dealer + 1) % n;
  const hands: Card[][] = state.players.map(() => []);

  // Abheben: die unterste Karte des abgehobenen Stapels wird Teppichkarte.
  // Ist sie ein Joker, nimmt der abhebende Spieler (= Startspieler) ihn auf
  // und die nächste Karte wird Teppichkarte.
  let carpet = deck.pop()!;
  let starterExtra = 0;
  while (isJoker(carpet)) {
    hands[starter].push(carpet);
    starterExtra++;
    carpet = deck.pop()!;
  }
  for (let i = 0; i < 14; i++) {
    for (let p = 0; p < n; p++) {
      if (hands[p].length < 14) hands[p].push(deck.pop()!);
    }
  }
  // Startspieler: 15. Karte (zählt als Ziehen).
  const fifteenth = deck.pop()!;
  hands[starter].push(fifteenth);

  const players: PlayerRound[] = hands.map((hand) => ({
    hand,
    mode: 'romme',
    opened: false,
    openingValue: 0,
    pairsLaid: 0,
    turns: 0,
  }));

  return {
    no,
    dealer,
    starter,
    stock: deck,
    discard: [],
    carpet,
    melds: [],
    nextMeldId: 1,
    players,
    turn: newTurn(starter, 'play', 'stock', fifteenth.id),
    cheftAnnounced: false,
    lastRommeOpening: null,
    lastDiscarder: null,
    lastDiscarderMode: null,
    taken: [],
    waiting: true,
    ready: state.players.map(() => false),
    ended: false,
    nextReady: state.players.map(() => false),
    result: null,
    log: [{ key: 'log.roundStart', params: { round: no } }],
  };
}

function newTurn(player: number, phase: 'draw' | 'play', source: DrawSource | null, drawnId: number | null): Turn {
  return {
    player,
    phase,
    drawSource: source,
    drawnCardId: drawnId,
    mustOpenWithId: null,
    mustPairWithId: null,
    mustUseId: null,
    openedThisTurn: false,
    isHand: false,
    laidOffToOthers: false,
    pendingJokerId: null,
    actions: 0,
    cheftByDraw: false,
    cheftAnnouncedBefore: false,
  };
}

export function startNextRound(state: GameState): void {
  if (state.finished || !state.round.ended) return;
  const no = state.round.no + 1;
  state.round = dealRound(state, no, nextIndex(state, state.round.dealer));
}

// ---------------------------------------------------------------- Hilfen

export function current(state: GameState): number {
  return state.round.turn.player;
}

export function playerRound(state: GameState, pid: number): PlayerRound {
  return state.round.players[pid];
}

export function handCard(state: GameState, pid: number, cardId: number): Card | undefined {
  return playerRound(state, pid).hand.find((c) => c.id === cardId);
}

/** Aktuelle Mindestaugen am Tisch für die nächste Rommé-Erstmeldung. */
export function tableThreshold(state: GameState): number {
  const r = state.round;
  let t = r.cheftAnnounced ? CHEFT_THRESHOLD : BASE_THRESHOLD;
  if (r.lastRommeOpening !== null) t = Math.max(t, r.lastRommeOpening + 1);
  return t;
}

/** Mindestaugen für die Rommé-Erstmeldung dieses Spielers (0 beim Hand machen). */
export function thresholdFor(state: GameState, pid: number): number {
  if (state.round.players[pid].opened) return 0;
  return tableThreshold(state);
}

function firstTurnBlocked(state: GameState, pid: number): boolean {
  return !state.settings.firstTurnOpenAllowed && playerRound(state, pid).turns === 0;
}

/** Kann der Spieler mit diesen Handkarten (inkl. mustId) als Rommé rauskommen? */
export function canOpenRommeWith(hand: Card[], threshold: number, mustId: number | null): boolean {
  const n = hand.length;
  // Eine Karte muss zum Abwerfen bleiben: jede Karte einmal als "bleibt" probieren.
  for (let k = 0; k < n; k++) {
    if (hand[k].id === mustId) continue;
    const rest = hand.filter((_, i) => i !== k);
    const p = findPartition(rest, {
      types: ROMME_TYPES,
      allowSkip: true,
      mustInclude: mustId === null ? [] : [mustId],
    });
    if (!p || p.used === 0) continue;
    if (p.used === n - 1) return true; // Hand machen
    if (p.augen >= threshold) return true;
  }
  return false;
}

function cardsInHand(state: GameState, pid: number, ids: number[]): Card[] | null {
  const hand = playerRound(state, pid).hand;
  const out: Card[] = [];
  const seen = new Set<number>();
  for (const id of ids) {
    if (seen.has(id)) return null;
    seen.add(id);
    const c = hand.find((x) => x.id === id);
    if (!c) return null;
    out.push(c);
  }
  return out;
}

function requireTurn(state: GameState, pid: number, phase: 'draw' | 'play'): Result {
  if (state.round.ended) return fail('err.roundOver');
  if (state.round.waiting) return fail('err.notStarted');
  if (current(state) !== pid) return fail('err.notYourTurn');
  if (state.round.turn.phase !== phase) return fail(phase === 'draw' ? 'err.drawFirst' : 'err.alreadyDrew');
  return OK;
}

// ---------------------------------------------------------------- Bereit

export function doReady(state: GameState, pid: number): Result {
  const r = state.round;
  if (r.ended) {
    // Rundenende bestätigen; sobald alle bestätigt haben, wird die nächste Runde ausgeteilt.
    if (state.finished) return OK;
    const flags = (r.nextReady ??= state.players.map(() => false));
    flags[pid] = true;
    if (flags.every(Boolean)) startNextRound(state);
    return OK;
  }
  if (!r.waiting) return OK;
  r.ready[pid] = true;
  if (r.ready.every(Boolean)) {
    r.waiting = false;
    r.log.push({ key: 'log.start', player: r.starter });
  }
  return OK;
}

/** Kann die Karte sofort verwendet werden (anlegen oder neue Kombination)? Eine Karte muss zum Abwerfen bleiben. */
export function canUseImmediately(state: GameState, pid: number, card: Card): boolean {
  const p = state.round.players[pid];
  for (const m of state.round.melds) if (addOptions(m, card).length > 0) return true;
  const hand = [...p.hand, card];
  const part = findPartition(hand, { types: ROMME_TYPES, allowSkip: true, mustInclude: [card.id] });
  return !!part && part.used > 0 && part.used < hand.length;
}

// ---------------------------------------------------------------- Ziehen

export function checkDraw(state: GameState, pid: number, source: DrawSource): Result {
  const t = requireTurn(state, pid, 'draw');
  if (!t.ok) return t;
  const r = state.round;
  const p = r.players[pid];
  if (source === 'stock') {
    if (r.stock.length === 0) return fail('err.stockEmpty');
    return OK;
  }
  if (source === 'discard') {
    const top = r.discard[r.discard.length - 1];
    if (!top) return fail('err.discardEmpty');
    if (p.mode === 'cheft') return OK;
    // Rommé-Spieler: nie von einem Cheft-Spieler; vor dem Rauskommen nur zum sofortigen Rauskommen,
    // danach nur, wenn die Karte sofort angelegt oder ausgelegt wird.
    if (r.lastDiscarderMode === 'cheft') return fail('err.rommeDiscardCheft');
    if (p.opened) return canUseImmediately(state, pid, top) ? OK : fail('err.rommeOpenedNoDiscard');
    if (firstTurnBlocked(state, pid)) return fail('err.firstTurn');
    if (!canOpenRommeWith([...p.hand, top], thresholdFor(state, pid), top.id)) return fail('err.rommeDiscardNoOpen');
    return OK;
  }
  // Teppichkarte
  if (!r.carpet) return fail('err.carpetGone');
  if (p.opened) return fail('err.carpetOnlyCheft');
  if (firstTurnBlocked(state, pid)) return fail('err.firstTurn');
  const mate = p.hand.some((c) => isJoker(c) || sameCard(c, r.carpet!));
  if (!mate || maxPairs([...p.hand, r.carpet]) < 5) return fail('err.carpetNeedsPair');
  return OK;
}

export function doDraw(state: GameState, pid: number, source: DrawSource): Result {
  const c = checkDraw(state, pid, source);
  if (!c.ok) return c;
  const r = state.round;
  const p = r.players[pid];
  let card: Card;
  if (source === 'stock') {
    card = r.stock.pop()!;
  } else if (source === 'discard') {
    card = r.discard.pop()!;
    if (p.mode === 'romme' && !p.opened) r.turn.mustOpenWithId = card.id;
    if (p.mode === 'romme' && p.opened) r.turn.mustUseId = card.id;
    r.taken.push({ player: pid, card });
  } else {
    card = r.carpet!;
    r.carpet = null;
    r.turn.mustPairWithId = card.id;
    r.turn.cheftAnnouncedBefore = r.cheftAnnounced;
    r.turn.cheftByDraw = p.mode !== 'cheft';
    setCheft(state, pid);
    r.taken.push({ player: pid, card });
  }
  p.hand.push(card);
  r.turn.phase = 'play';
  r.turn.drawSource = source;
  r.turn.drawnCardId = card.id;
  r.log.push({ key: `log.draw.${source}`, player: pid });
  return OK;
}

function setCheft(state: GameState, pid: number): void {
  const p = state.round.players[pid];
  if (p.mode !== 'cheft') {
    p.mode = 'cheft';
    state.round.cheftAnnounced = true;
    state.round.log.push({ key: 'log.cheft', player: pid });
  }
}

// ---------------------------------------------------------------- Zurücklegen

/** Ablagekarte (Rommé) oder Teppichkarte zurücklegen, solange noch nichts ausgelegt wurde. */
export function checkUndoDraw(state: GameState, pid: number): Result {
  const t = requireTurn(state, pid, 'play');
  if (!t.ok) return t;
  const turn = state.round.turn;
  const eligible = (turn.drawSource === 'discard' && (turn.mustOpenWithId !== null || turn.mustUseId !== null)) || turn.drawSource === 'carpet';
  if (!eligible) return fail('err.noUndo');
  if (turn.openedThisTurn || turn.actions > 0 || turn.pendingJokerId !== null) return fail('err.noUndoAfterLay');
  return OK;
}

export function doUndoDraw(state: GameState, pid: number): Result {
  const c = checkUndoDraw(state, pid);
  if (!c.ok) return c;
  const r = state.round;
  const p = r.players[pid];
  const turn = r.turn;
  const card = p.hand.find((x) => x.id === turn.drawnCardId);
  if (!card) return fail('err.noUndo');
  p.hand = p.hand.filter((x) => x.id !== card.id);
  if (turn.drawSource === 'discard') r.discard.push(card);
  else r.carpet = card;
  const ti = r.taken.map((x) => x.card.id).lastIndexOf(card.id);
  if (ti >= 0) r.taken.splice(ti, 1);
  if (turn.cheftByDraw) {
    p.mode = 'romme';
    r.cheftAnnounced = turn.cheftAnnouncedBefore;
  }
  r.turn = newTurn(pid, 'draw', null, null);
  r.log.push({ key: 'log.undo', player: pid });
  return OK;
}

// ---------------------------------------------------------------- Cheft ansagen

export function checkDeclareCheft(state: GameState, pid: number): Result {
  if (state.round.ended) return fail('err.roundOver');
  if (current(state) !== pid) return fail('err.notYourTurn');
  const p = state.round.players[pid];
  if (p.mode === 'cheft') return fail('err.alreadyCheft');
  if (p.opened) return fail('err.alreadyOpenedRomme');
  if (state.round.turn.mustOpenWithId !== null) return fail('err.rommeDiscardNoOpen');
  return OK;
}

export function doDeclareCheft(state: GameState, pid: number): Result {
  const c = checkDeclareCheft(state, pid);
  if (!c.ok) return c;
  setCheft(state, pid);
  return OK;
}

// ---------------------------------------------------------------- Auslegen

export interface LayPlan {
  shapes: MeldShape[];
  cards: Card[];
  pairs: number;
  augen: number;
  isHand: boolean;
}

/** Interpretiert Kartengruppen als Kombinationen und prüft alle Auslege-Regeln. */
export function checkLay(state: GameState, pid: number, groups: number[][]): Result & { plan?: LayPlan } {
  const t = requireTurn(state, pid, 'play');
  if (!t.ok) return t;
  const r = state.round;
  const p = r.players[pid];
  if (groups.length === 0) return fail('err.nothingSelected');
  const all = cardsInHand(state, pid, groups.flat());
  if (!all) return fail('err.cardNotInHand');
  if (!p.opened && firstTurnBlocked(state, pid)) return fail('err.firstTurn');

  const shapes: MeldShape[] = [];
  for (const g of groups) {
    const cs = g.map((id) => all.find((c) => c.id === id)!);
    const shape = cs.length === 2 ? asPair(cs) : pickBest(asRun(cs), asSet(cs));
    if (!shape) return fail('err.invalidMeld');
    shapes.push(shape);
  }
  const pairs = shapes.filter((s) => s.type === 'pair').length;
  const rommeShapes = shapes.filter((s) => s.type !== 'pair');
  const total = all.length;
  if (p.hand.length - total < 1) return fail('err.lastCard');
  const isHand = !p.opened && p.hand.length - total === 1;
  const augen = rommeShapes.reduce((s, m) => s + meldAugen(m), 0);
  const carpetId = r.turn.mustPairWithId;

  if (pairs > 0) {
    if (p.mode === 'romme' && p.opened) return fail('err.rommeNoPairs');
    if (!p.opened) {
      if (pairs !== 5 && pairs !== 7) return fail('err.pairCount');
    } else {
      if (pairs !== 2) return fail('err.sixPairs');
      if (rommeShapes.length > 0) return fail('err.sixPairs');
    }
    if (carpetId !== null) {
      const inPair = shapes.some((s) => s.type === 'pair' && s.cards.some((c) => c.id === carpetId));
      if (!inPair) return fail('err.carpetNeedsPair');
    }
  } else {
    if (carpetId !== null && !p.opened) return fail('err.carpetNeedsPair');
    if (p.mode === 'cheft') {
      if (!p.opened) return fail('err.cheftRommeBeforePairs');
    } else if (!p.opened && !isHand) {
      const th = thresholdFor(state, pid);
      if (augen < th) return fail('err.threshold', { need: th, have: augen });
    }
  }
  // Teppichkarte darf nie in Rommé-Kombinationen liegen.
  if (carpetId !== null && rommeShapes.some((s) => s.cards.some((c) => c.id === carpetId))) {
    return fail('err.carpetNeedsPair');
  }
  return { ok: true, plan: { shapes, cards: all, pairs, augen, isHand } };
}

function pickBest(a: MeldShape | null, b: MeldShape | null): MeldShape | null {
  if (!a) return b;
  if (!b) return a;
  return meldAugen(b) > meldAugen(a) ? b : a;
}

export function doLay(state: GameState, pid: number, groups: number[][]): Result {
  const c = checkLay(state, pid, groups);
  if (!c.ok) return c;
  const plan = c.plan!;
  const r = state.round;
  const p = r.players[pid];
  const ids = new Set(plan.cards.map((x) => x.id));
  p.hand = p.hand.filter((x) => !ids.has(x.id));
  for (const s of plan.shapes) {
    r.melds.push({ ...s, id: r.nextMeldId++, owner: pid });
  }
  if (plan.pairs > 0) setCheft(state, pid);
  if (!p.opened) {
    p.opened = true;
    p.openingValue = plan.augen;
    r.turn.openedThisTurn = true;
    r.turn.isHand = plan.isHand;
    if (p.mode === 'romme' && !plan.isHand) r.lastRommeOpening = plan.augen;
    r.log.push({ key: plan.isHand ? 'log.hand' : 'log.open', player: pid, params: { augen: plan.augen, pairs: plan.pairs } });
  } else {
    // Weitere Kombinationen im Zug des Rauskommens zählen zur Erstmeldung, solange nicht bei anderen angelegt wurde.
    if (r.turn.openedThisTurn && !r.turn.isHand && !r.turn.laidOffToOthers && p.mode === 'romme' && plan.augen > 0) {
      p.openingValue += plan.augen;
      r.lastRommeOpening = p.openingValue;
    }
    r.log.push({ key: 'log.lay', player: pid, params: { count: plan.cards.length } });
  }
  p.pairsLaid += plan.pairs;
  r.turn.actions++;
  if (plan.cards.some((x) => x.id === r.turn.pendingJokerId)) r.turn.pendingJokerId = null;
  return OK;
}

// ---------------------------------------------------------------- Anlegen

export function layOffTargets(state: GameState, pid: number, cardId: number): { meld: Meld; result: Meld }[] {
  const card = handCard(state, pid, cardId);
  if (!card) return [];
  const out: { meld: Meld; result: Meld }[] = [];
  for (const m of state.round.melds) {
    for (const res of addOptions(m, card)) out.push({ meld: m, result: res });
  }
  return out;
}

export function checkLayOff(state: GameState, pid: number, cardId: number, meldId: number, end: 'top' | 'bottom' = 'top'): Result & { result?: Meld } {
  const t = requireTurn(state, pid, 'play');
  if (!t.ok) return t;
  const p = state.round.players[pid];
  const card = handCard(state, pid, cardId);
  if (!card) return fail('err.cardNotInHand');
  if (!p.opened) return fail('err.notOpened');
  if (p.hand.length < 2) return fail('err.lastCard');
  const meld = state.round.melds.find((m) => m.id === meldId);
  if (!meld) return fail('err.cannotAdd');
  if (meld.type === 'pair') return fail('err.pairNoAdd');
  const opts = addOptions(meld, card);
  if (opts.length === 0) return fail('err.cannotAdd');
  let result = opts[0];
  if (opts.length > 1) result = end === 'top' ? opts[0] : opts[1];
  return { ok: true, result };
}

export function doLayOff(state: GameState, pid: number, cardId: number, meldId: number, end: 'top' | 'bottom' = 'top'): Result {
  const c = checkLayOff(state, pid, cardId, meldId, end);
  if (!c.ok) return c;
  const r = state.round;
  const p = r.players[pid];
  p.hand = p.hand.filter((x) => x.id !== cardId);
  const idx = r.melds.findIndex((m) => m.id === meldId);
  r.melds[idx] = c.result!;
  if (r.melds[idx].owner !== pid) r.turn.laidOffToOthers = true;
  if (r.turn.pendingJokerId === cardId) r.turn.pendingJokerId = null;
  r.turn.actions++;
  r.log.push({ key: 'log.layOff', player: pid });
  return OK;
}

// ---------------------------------------------------------------- Joker klauen

export function checkStealJoker(state: GameState, pid: number, meldId: number, jokerIndex: number, cardId: number): Result {
  const t = requireTurn(state, pid, 'play');
  if (!t.ok) return t;
  const r = state.round;
  const p = r.players[pid];
  if (!p.opened) return fail('err.notOpened');
  if (r.turn.pendingJokerId !== null) return fail('err.jokerMustUse');
  const card = handCard(state, pid, cardId);
  if (!card) return fail('err.cardNotInHand');
  if (isJoker(card)) return fail('err.notMatching');
  const meld = r.melds.find((m) => m.id === meldId);
  if (!meld) return fail('err.jokerNotStealable');
  const rep = jokerRepresents(meld, jokerIndex);
  if (!rep) return fail('err.jokerNotStealable');
  if (rep.suit !== card.suit || rep.rank !== card.rank) return fail('err.notMatching');
  if (p.hand.length < 2) return fail('err.lastCard');
  // Der Joker muss sofort verwendbar sein.
  const joker = meld.cards[jokerIndex];
  const newMeld = replaceJoker(meld, jokerIndex, card);
  const melds = r.melds.map((m) => (m.id === meldId ? newMeld : m));
  const canLayOff = melds.some((m) => addOptions(m, joker).length > 0);
  if (!canLayOff) {
    const rest = [...p.hand.filter((x) => x.id !== cardId), joker];
    const part = findPartition(rest, { types: ROMME_TYPES, allowSkip: true, mustInclude: [joker.id] });
    if (!part || part.used === 0 || part.used >= rest.length) return fail('err.jokerUnusable');
  }
  return OK;
}

export function doStealJoker(state: GameState, pid: number, meldId: number, jokerIndex: number, cardId: number): Result {
  const c = checkStealJoker(state, pid, meldId, jokerIndex, cardId);
  if (!c.ok) return c;
  const r = state.round;
  const p = r.players[pid];
  const idx = r.melds.findIndex((m) => m.id === meldId);
  const meld = r.melds[idx];
  const joker = meld.cards[jokerIndex];
  const card = handCard(state, pid, cardId)!;
  r.melds[idx] = replaceJoker(meld, jokerIndex, card);
  p.hand = [...p.hand.filter((x) => x.id !== cardId), joker];
  r.turn.pendingJokerId = joker.id;
  r.turn.actions++;
  r.log.push({ key: 'log.steal', player: pid });
  return OK;
}

// ---------------------------------------------------------------- Abwerfen

export function checkDiscard(state: GameState, pid: number, cardId: number): Result {
  const t = requireTurn(state, pid, 'play');
  if (!t.ok) return t;
  const r = state.round;
  const p = r.players[pid];
  const card = handCard(state, pid, cardId);
  if (!card) return fail('err.cardNotInHand');
  if (r.turn.pendingJokerId !== null) return fail('err.jokerMustUse');
  if (r.turn.mustOpenWithId !== null && !r.turn.openedThisTurn) return fail('err.rommeDiscardNoOpen');
  if (r.turn.mustPairWithId !== null && !r.turn.openedThisTurn) return fail('err.carpetNeedsPair');
  if (r.turn.mustUseId !== null && p.hand.some((c) => c.id === r.turn.mustUseId)) return fail('err.mustUseTaken');
  if (p.hand.length > 1) {
    const next = nextIndex(state, pid);
    const layoffable = (c: Card) => r.melds.some((m) => addOptions(m, c).length > 0);
    if (r.players[next].opened && layoffable(card)) {
      // Sackgasse vermeiden: Wenn jede Handkarte anlegbar wäre, darf trotzdem abgeworfen werden.
      if (p.hand.some((c) => !layoffable(c))) return fail('err.discardLayoffable');
    }
  }
  return OK;
}

export function doDiscard(state: GameState, pid: number, cardId: number): Result {
  const c = checkDiscard(state, pid, cardId);
  if (!c.ok) return c;
  const r = state.round;
  const p = r.players[pid];
  const card = handCard(state, pid, cardId)!;
  p.hand = p.hand.filter((x) => x.id !== cardId);
  r.discard.push(card);
  r.lastDiscarder = pid;
  r.lastDiscarderMode = p.mode;
  p.turns++;
  r.log.push({ key: 'log.discard', player: pid, params: { card: cardId } });
  if (p.hand.length === 0) {
    endRound(state, pid, isJoker(card));
    return OK;
  }
  if (r.stock.length === 0) {
    endRound(state, null, false);
    return OK;
  }
  r.turn = newTurn(nextIndex(state, pid), 'draw', null, null);
  return OK;
}

// ---------------------------------------------------------------- Wertung

export function endRound(state: GameState, winner: number | null, jokerBurned: boolean): void {
  const r = state.round;
  const winnerMode: Mode | null = winner === null ? null : r.players[winner].mode;
  const hand = winner !== null && r.turn.isHand && !r.turn.laidOffToOthers;
  const othersOpened = r.players.some((p, i) => i !== winner && p.opened);
  const scores: PlayerScore[] = r.players.map((p, i) => {
    if (i === winner) return { base: 0, factors: [], total: 0 };
    const base = p.opened ? p.hand.reduce((s, c) => s + penaltyValue(c), 0) : NOT_OPENED_PENALTY;
    const factors: string[] = [];
    if (winnerMode === 'cheft') factors.push('cheftWon');
    if (p.mode === 'cheft') factors.push('cheftLost');
    if (hand && !othersOpened) factors.push('hand');
    if (jokerBurned) factors.push('joker');
    return { base, factors, total: base * Math.pow(2, factors.length) };
  });
  const result: RoundResult = {
    roundNo: r.no,
    winner,
    reason: winner === null ? 'stock' : 'out',
    winnerMode,
    hand: hand && !othersOpened,
    jokerBurned,
    scores,
  };
  r.result = result;
  r.ended = true;
  state.history.push(result);
  scores.forEach((s, i) => (state.totals[i] += s.total));
  if (state.history.length >= state.settings.rounds) state.finished = true;
  r.log.push({ key: winner === null ? 'log.stockEnd' : 'log.roundWon', player: winner ?? undefined });
}

export function winnerOfGame(state: GameState): number[] {
  const min = Math.min(...state.totals);
  return state.totals.map((t, i) => (t === min ? i : -1)).filter((i) => i >= 0);
}
