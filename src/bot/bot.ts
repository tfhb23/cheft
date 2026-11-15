/**
 * Computergegner mit Profilen: Stufe (gemütlich/normal/gerissen) und Spielweise.
 * decideAction liefert jeweils die nächste regelkonforme Aktion für den Spieler pid.
 */
import { Card, isJoker, makeDeck, penaltyValue, sameCard, makeRng } from '../engine/cards';
import { Action, applyAction } from '../engine/actions';
import {
  BotProfile,
  GameState,
  checkDeclareCheft,
  checkDiscard,
  checkDraw,
  checkLay,
  canUseImmediately,
  checkStealJoker,
  layOffTargets,
  nextIndex,
  thresholdFor,
} from '../engine/game';
import { ALL_TYPES, ROMME_TYPES, MeldShape, findPartition, jokerRepresents, maxPairs } from '../engine/melds';

interface Knobs {
  /** Zusätzliche Augen über der Grenze, bevor der Bot rauskommt. */
  openMargin: number;
  /** Nach dem Rauskommen alles ablegen, was geht. */
  layAll: boolean;
  /** Ablagekarte nehmen, um sofort rauszukommen. */
  takeDiscardToOpen: boolean;
  /** Cheft ansagen, sobald so viele Paare erreichbar sind (99 = nie freiwillig). */
  cheftEagerPairs: number;
  /** Ablagekarte für ein Paar nehmen, wenn so viele Paare schon da sind. */
  pairTakeAt: number;
  /** Auf Hand spielen, wenn wenige Karten fehlen und niemand draußen ist. */
  handHunter: boolean;
  /** Nichts abwerfen, was der nächste Spieler sammelt. */
  blocker: boolean;
  /** Abgeworfene Karten mitzählen. */
  counter: boolean;
  /** Karten für Joker-Klau aufheben, Joker zum Verbrennen behalten. */
  jokerHunter: boolean;
  /** Joker klauen. */
  steal: boolean;
  /** Kluger Abwurf (Nutzen abwägen) statt nur Strafpunkte. */
  smartDiscard: boolean;
  /** Zufallsanteil beim Risiko (0..1). */
  gamble: number;
  /** Joker möglichst als letzte Karte abwerfen (verbrennen) und dafür aufheben. */
  burn: boolean;
  /** Zählt alle gespielten Karten und wirft nach Wahrscheinlichkeiten ab (Gerissen und Mastermind). */
  counting: boolean;
  /** Mastermind: zusätzlich Joker schonen, Erstmeldung ohne Joker bevorzugen und Spielende vorausahnen. */
  master: boolean;
  /** Mit Jokern nicht überstürzt rauskommen: Ist die Teppichkarte nächste Runde ein echtes Paar, lieber warten. */
  patient: boolean;
}

const DEFAULT_PROFILE: BotProfile = { level: 'normal', style: 'balanced' };

export function knobsFor(profile: BotProfile): Knobs {
  const k: Knobs = {
    openMargin: 0,
    layAll: true,
    takeDiscardToOpen: true,
    cheftEagerPairs: 99,
    pairTakeAt: 4,
    handHunter: false,
    blocker: false,
    counter: false,
    jokerHunter: false,
    steal: true,
    smartDiscard: true,
    gamble: 0,
    burn: false,
    counting: false,
    master: false,
    patient: false,
  };
  switch (profile.level) {
    case 'easy':
      k.openMargin = 15;
      k.steal = false;
      k.smartDiscard = false;
      k.takeDiscardToOpen = false;
      break;
    case 'hard':
      k.blocker = true;
      k.counter = true;
      k.jokerHunter = true;
      k.burn = true;
      k.patient = true;
      k.counting = true;
      break;
    case 'master':
      k.blocker = true;
      k.counter = true;
      k.jokerHunter = true;
      k.burn = true;
      k.counting = true;
      k.master = true;
      k.patient = true;
      break;
  }
  switch (profile.style) {
    case 'sprinter':
      k.openMargin = Math.min(k.openMargin, 0);
      k.layAll = true;
      k.takeDiscardToOpen = true;
      break;
    case 'cheft':
      k.cheftEagerPairs = 4;
      k.pairTakeAt = 3;
      break;
    case 'hand':
      k.handHunter = true;
      break;
    case 'blocker':
      k.blocker = true;
      break;
    case 'counter':
      k.counter = true;
      break;
    case 'joker':
      k.jokerHunter = true;
      k.steal = true;
      k.burn = true;
      break;
    case 'gambler':
      k.cheftEagerPairs = 3;
      k.pairTakeAt = 2;
      k.gamble = 0.5;
      break;
  }
  return k;
}

function knobs(state: GameState, pid: number): Knobs {
  return knobsFor(state.players[pid].bot ?? DEFAULT_PROFILE);
}

/** Deterministischer Zufall je Zug (für Zocker). */
function chance(state: GameState, pid: number, p: number): boolean {
  if (p <= 0) return false;
  const r = state.round;
  const rng = makeRng(state.seed + r.no * 131 + pid * 17 + r.stock.length * 7);
  return rng() < p;
}

/** Vorschlag für die Oberfläche: welche Karten könnte der Spieler jetzt auslegen? */
export function suggestLay(state: GameState, pid: number): number[][] | null {
  const p = state.round.players[pid];
  if (state.round.turn.phase !== 'play') return null;
  return p.opened ? bestAdditionalMelds(state, pid, knobs(state, pid)) : bestOpening(state, pid, knobs(state, pid), true);
}

export function decideAction(state: GameState, pid: number): Action {
  const r = state.round;
  const p = r.players[pid];
  const hand = p.hand;
  const top = r.discard[r.discard.length - 1];
  const k = knobs(state, pid);

  if (r.turn.phase === 'draw') {
    // Cheft-Weg: Ablagekarte bildet ein Paar.
    if (top && !p.opened) {
      const mate = isJoker(top) || hand.some((c) => sameCard(c, top));
      const pairsAfter = maxPairs([...hand, top]);
      const wants = pairsAfter >= 5 || (mate && pairsAfter >= k.pairTakeAt && (p.mode === 'cheft' || pairsAfter >= k.cheftEagerPairs || chance(state, pid, k.gamble * 0.4)));
      if (mate && wants) {
        if (p.mode === 'romme' && checkDeclareCheft(state, pid).ok) return { kind: 'declareCheft' };
        if (checkDraw(state, pid, 'discard').ok) return { kind: 'draw', source: 'discard' };
      }
    }
    if (top && p.opened && checkDraw(state, pid, 'discard').ok && usableAfterOpening(state, pid, top)) {
      return { kind: 'draw', source: 'discard' };
    }
    const stockEmpty = r.stock.length === 0;
    if (r.carpet && !stockEmpty && checkDraw(state, pid, 'carpet').ok) return { kind: 'draw', source: 'carpet' };
    if (top && p.mode === 'romme' && !p.opened && k.takeDiscardToOpen && checkDraw(state, pid, 'discard').ok) {
      if (!(k.handHunter && holdForHand(state, pid, k))) return { kind: 'draw', source: 'discard' };
    }
    // Stapel leer: letzter Zug, die Teppichkarte zählt wie eine Stapelkarte.
    if (stockEmpty && r.carpet) return { kind: 'draw', source: 'carpet' };
    return { kind: 'draw', source: 'stock' };
  }

  // ---- Spielphase
  const pendingJoker = r.turn.pendingJokerId;
  if (pendingJoker !== null) {
    const use = useJoker(state, pid, pendingJoker);
    if (use) return use;
  }
  const mustUse = r.turn.mustUseId;
  if (mustUse !== null && hand.some((c) => c.id === mustUse)) {
    const use = useJoker(state, pid, mustUse);
    if (use) return use;
  }

  if (!p.opened) {
    // Freiwillige Cheft-Ansage (Cheft-Fan, Zocker)
    if (p.mode === 'romme' && r.turn.mustOpenWithId === null && maxPairs(hand) >= k.cheftEagerPairs && checkDeclareCheft(state, pid).ok) {
      if (k.cheftEagerPairs <= 3 ? chance(state, pid, k.gamble) : true) return { kind: 'declareCheft' };
    }
    const opening = bestOpening(state, pid, k, false);
    if (opening) return { kind: 'lay', groups: opening };
  } else {
    const more = bestAdditionalMelds(state, pid, k);
    if (more) return { kind: 'lay', groups: more };
    if (k.steal) {
      const steal = findSteal(state, pid, k);
      if (steal) return steal;
    }
    if (k.layAll) {
      const off = findLayOff(state, pid, k);
      if (off) return off;
    }
  }

  return { kind: 'discard', cardId: chooseDiscard(state, pid, k) };
}

function usableAfterOpening(state: GameState, pid: number, card: Card): boolean {
  const p = state.round.players[pid];
  // Anlegen, neue Kombination oder einen ausgelegten Joker gegen die Karte eintauschen
  if (canUseImmediately(state, pid, card)) return true;
  if (layOffTargets(state, pid, card.id).length > 0) return true;
  const hand = [...p.hand, card];
  if (p.mode === 'cheft' && hand.length === 5 && maxPairs(hand) >= 2) {
    const part = findPartition(hand, { types: ALL_TYPES, allowSkip: true, pairCounts: [2], mustInclude: [card.id] });
    if (part && part.used === 4) return true;
  }
  const part = findPartition(hand, { types: ROMME_TYPES, allowSkip: true, mustInclude: [card.id] });
  return !!part && part.used > 0 && part.used < hand.length;
}

function groupsOf(melds: MeldShape[]): number[][] {
  return melds.map((m) => m.cards.map((c) => c.id));
}

/** Handmacher: zurückhalten, wenn höchstens drei Karten fehlen und noch niemand draußen ist. */
function holdForHand(state: GameState, pid: number, k: Knobs): boolean {
  if (!k.handHunter) return false;
  const r = state.round;
  if (r.players.some((q) => q.opened)) return false;
  if (r.stock.length < 8) return false;
  const hand = r.players[pid].hand;
  const part = findPartition(hand, { types: hand.length ? (r.players[pid].mode === 'cheft' ? ALL_TYPES : ROMME_TYPES) : ROMME_TYPES, allowSkip: true });
  const missing = hand.length - (part ? part.used : 0);
  return missing <= 4;
}

/** Beste Erstmeldung (Rommé oder Cheft), die die Regeln und das Profil erfüllt. */
function bestOpening(state: GameState, pid: number, k: Knobs, ignoreProfile: boolean): number[][] | null {
  const r = state.round;
  const p = r.players[pid];
  const hand = p.hand;
  const n = hand.length;
  const must = r.turn.mustOpenWithId ?? r.turn.mustPairWithId;
  type Best = { groups: number[][]; used: number; augen: number };
  let best: Best | null = null;
  const consider = (groups: number[][], used: number, augen: number) => {
    if (!checkLay(state, pid, groups).ok) return;
    if (!best || used > best.used || (used === best.used && augen > best.augen)) best = { groups, used, augen };
  };

  const wantCheft = p.mode === 'cheft' || maxPairs(hand) >= 5;
  if (wantCheft && r.turn.mustOpenWithId === null) {
    // Beste Paar-Erstmeldung, wahlweise ohne Joker (die bleiben dann auf der Hand)
    const pairOpening = (allowJokers: boolean): Best | null => {
      let found: Best | null = null;
      for (let kk = 0; kk < n; kk++) {
        if (hand[kk].id === must) continue;
        const rest = hand.filter((c, i) => i !== kk && (allowJokers || !isJoker(c)));
        const part = findPartition(rest, { types: ALL_TYPES, pairCounts: [5, 7], allowSkip: true, mustInclude: must === null ? [] : [must] });
        if (!part || part.used === 0) continue;
        const groups = groupsOf(part.melds);
        if (!checkLay(state, pid, groups).ok) continue;
        if (!found || part.used > found.used || (part.used === found.used && part.augen > found.augen)) found = { groups, used: part.used, augen: part.augen };
      }
      return found;
    };
    const withJokers = pairOpening(true);
    // Joker sind wertvoll (Klauen, Verbrennen, 25 Strafpunkte): Reicht es ohne sie, werden sie nicht in Paare gesteckt.
    // Nur für die Hand (7 Paare, alle Karten) lohnt sich der Einsatz.
    const natural = k.smartDiscard && hand.some(isJoker) ? pairOpening(false) : null;
    const chosen: Best | null = natural && !(withJokers && withJokers.used === n - 1 && natural.used < withJokers.used) ? natural : withJokers;
    if (chosen) {
      const usesJoker = chosen.groups.flat().some((id) => isJoker(hand.find((c) => c.id === id)!));
      if (usesJoker && waitForCarpet(state, pid, k)) return null;
      return chosen.groups;
    }
  }
  if (p.mode === 'cheft') return null;

  const threshold = thresholdFor(state, pid);
  const margin = ignoreProfile || must !== null ? 0 : k.openMargin;
  for (let kk = 0; kk < n; kk++) {
    if (hand[kk].id === must) continue;
    const rest = hand.filter((_, i) => i !== kk);
    const part = findPartition(rest, { types: ROMME_TYPES, allowSkip: true, mustInclude: must === null ? [] : [must] });
    if (!part || part.used === 0) continue;
    const isHand = part.used === n - 1;
    if (isHand || part.augen >= threshold + margin) consider(groupsOf(part.melds), part.used, part.augen);
  }
  // Mastermind: Reicht die Erstmeldung auch ohne Joker, bleiben die Joker auf der Hand (Klauen, Verbrennen).
  if (k.master && hand.some(isJoker) && !(!ignoreProfile && must === null && holdForHand(state, pid, k))) {
    let alt: Best | null = null;
    for (let kk = 0; kk < n; kk++) {
      if (hand[kk].id === must) continue;
      const rest = hand.filter((c, i) => i !== kk && !isJoker(c));
      if (must !== null && !rest.some((c) => c.id === must)) continue;
      const part = findPartition(rest, { types: ROMME_TYPES, allowSkip: true, mustInclude: must === null ? [] : [must] });
      if (!part || part.used === 0 || part.augen < threshold + margin) continue;
      const groups = groupsOf(part.melds);
      if (!checkLay(state, pid, groups).ok) continue;
      if (!alt || part.used > alt.used || (part.used === alt.used && part.augen > alt.augen)) alt = { groups, used: part.used, augen: part.augen };
    }
    if (alt) return (alt as Best).groups;
  }
  if (!best) return null;
  const b = best as Best;
  // Handmacher: lieber warten, außer die Erstmeldung ist bereits die Hand oder eine Pflichtkarte zwingt.
  if (!ignoreProfile && must === null && b.used < n - 1 && holdForHand(state, pid, k)) return null;
  return b.groups;
}

/** Nach dem Rauskommen: weitere Kombinationen aus der Hand (eine Karte bleibt). */
function bestAdditionalMelds(state: GameState, pid: number, k: Knobs): number[][] | null {
  const p = state.round.players[pid];
  const hand = p.hand;
  if (hand.length < 3) return null;
  if (p.mode === 'cheft' && hand.length === 5) {
    for (let kk = 0; kk < hand.length; kk++) {
      const rest = hand.filter((_, i) => i !== kk);
      const part = findPartition(rest, { types: ['pair'], pairCounts: [2] });
      if (part && checkLay(state, pid, groupsOf(part.melds)).ok) return groupsOf(part.melds);
    }
  }
  if (!k.layAll && hand.length > 4) return null;
  let best: { groups: number[][]; used: number; keepsJoker: boolean } | null = null;
  for (let kk = 0; kk < hand.length; kk++) {
    const rest = hand.filter((_, i) => i !== kk);
    // Jokerjäger behält einen Joker zum Verbrennen, wenn er damit die letzte Karte wäre
    const part = findPartition(rest, { types: ROMME_TYPES, allowSkip: true });
    if (!part || part.used === 0) continue;
    const groups = groupsOf(part.melds);
    if (!checkLay(state, pid, groups).ok) continue;
    // Verbrenner: bei gleicher Kartenzahl lieber den Joker als letzte Karte behalten und am Ende abwerfen
    if (!best || part.used > best.used || (k.burn && part.used === best.used && isJoker(hand[kk]) && !best.keepsJoker)) best = { groups, used: part.used, keepsJoker: isJoker(hand[kk]) };
  }
  return best ? best.groups : null;
}

function findLayOff(state: GameState, pid: number, k: Knobs): Action | null {
  const p = state.round.players[pid];
  if (p.hand.length < 2) return null;
  const sorted = [...p.hand].sort((a, b) => (isJoker(a) ? 1 : 0) - (isJoker(b) ? 1 : 0) || penaltyValue(b) - penaltyValue(a));
  for (const c of sorted) {
    if (isJoker(c) && (k.jokerHunter || k.burn) && p.hand.length <= 3 && !endIsNear(state, pid)) continue; // zum Verbrennen aufheben
    const targets = layOffTargets(state, pid, c.id);
    if (targets.length === 0) continue;
    const own = targets.find((t) => t.meld.owner === pid) ?? targets[0];
    return { kind: 'layOff', cardId: c.id, meldId: own.meld.id, end: 'top' };
  }
  return null;
}

/** Alle erlaubten Joker-Klauzüge bewerten (Zug durchspielen) und den mit den wenigsten Reststrafpunkten wählen. */
function findSteal(state: GameState, pid: number, k: Knobs): Action | null {
  const p = state.round.players[pid];
  if (p.hand.length < 2) return null;
  const options: Extract<Action, { kind: 'steal' }>[] = [];
  for (const m of state.round.melds) {
    for (let i = 0; i < m.cards.length; i++) {
      if (!isJoker(m.cards[i])) continue;
      const rep = jokerRepresents(m, i);
      if (!rep) continue;
      for (const card of p.hand.filter((c) => c.suit === rep.suit && c.rank === rep.rank)) {
        if (checkStealJoker(state, pid, m.id, i, card.id).ok) options.push({ kind: 'steal', meldId: m.id, jokerIndex: i, cardId: card.id });
      }
    }
  }
  if (options.length === 0) return null;
  if (options.length === 1) return options[0];
  let best = options[0];
  let bestScore = Infinity;
  for (const o of options) {
    const sim = structuredClone(state);
    if (!applyAction(sim, pid, o).ok) continue;
    const joker = sim.round.turn.pendingJokerId;
    if (joker !== null) {
      const follow = useJoker(sim, pid, joker);
      if (follow) applyAction(sim, pid, follow);
    }
    const rest = sim.round.players[pid].hand;
    // Reststrafpunkte; ein behaltener Joker zählt für Verbrenner weniger, weil er die Runde beenden kann
    const score = rest.reduce((sum, c) => sum + (isJoker(c) && k.burn ? 8 : penaltyValue(c)), 0) + rest.length * 0.5;
    if (score < bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

/**
 * Geduld: Würde das Rauskommen Joker in Paare stecken, liegt aber die Teppichkarte noch da und ich halte genau eine echte
 * Kopie von ihr, dann wird sie im nächsten Zug zum echten Paar. Solange noch niemand draußen ist, lohnt sich das Warten.
 */
function waitForCarpet(state: GameState, pid: number, k: Knobs): boolean {
  if (!k.patient) return false;
  const r = state.round;
  const carpet = r.carpet;
  if (!carpet || r.stock.length === 0 || r.turn.mustPairWithId !== null) return false;
  if (r.players.some((q) => q.opened)) return false;
  return carpetMate(state, pid) !== null;
}

/** Die Handkarte, die mit der Teppichkarte ein echtes Paar bilden würde (genau eine Kopie auf der Hand). */
function carpetMate(state: GameState, pid: number): Card | null {
  const carpet = state.round.carpet;
  if (!carpet || isJoker(carpet)) return null;
  const same = state.round.players[pid].hand.filter((c) => sameCard(c, carpet));
  return same.length === 1 ? same[0] : null;
}

/** Ende der Runde droht: Ein anderer Spieler ist draußen und hat nur noch wenige Karten. */
function endIsNear(state: GameState, pid: number): boolean {
  return state.round.players.some((q, i) => i !== pid && q.opened && q.hand.length <= 2);
}

function useJoker(state: GameState, pid: number, jokerId: number): Action | null {
  const p = state.round.players[pid];
  for (let kk = 0; kk < p.hand.length; kk++) {
    if (p.hand[kk].id === jokerId) continue;
    const rest = p.hand.filter((_, i) => i !== kk);
    const part = findPartition(rest, { types: ROMME_TYPES, allowSkip: true, mustInclude: [jokerId] });
    if (part && part.used > 0 && checkLay(state, pid, groupsOf(part.melds)).ok) return { kind: 'lay', groups: groupsOf(part.melds) };
  }
  const targets = layOffTargets(state, pid, jokerId);
  if (targets.length > 0) {
    const own = targets.find((t) => t.meld.owner === pid) ?? targets[0];
    return { kind: 'layOff', cardId: jokerId, meldId: own.meld.id, end: 'top' };
  }
  return null;
}

// ---------------------------------------------------------------- Mastermind: Kartenzählen und Wahrscheinlichkeiten

const SUITS = ['H', 'D', 'C', 'S'] as const;
const augen = (rank: number) => (rank === 1 ? 11 : rank >= 10 ? 10 : rank);

interface Unseen {
  /** Noch nicht gesehene Kopien je Karte ('H5', 'J' für Joker). */
  copies: Map<string, number>;
  total: number;
}

/**
 * Welche Karten kann der Bot noch nicht verorten? Gesehen sind die eigene Hand, alle Auslagen, die ganze Ablage,
 * die Teppichkarte und die Karten, die Mitspieler offen genommen haben. Der Rest steckt im Stapel oder in fremden Händen.
 */
function unseenCards(state: GameState, pid: number, precise: boolean): Unseen {
  const r = state.round;
  const seen = new Set<number>();
  for (const c of r.players[pid].hand) seen.add(c.id);
  for (const m of r.melds) for (const c of m.cards) seen.add(c.id);
  for (const c of r.discard) seen.add(c.id);
  // Gerissen zählt nur, was offen liegt; der Mastermind merkt sich auch Teppichkarte und die offen genommenen Karten der anderen
  if (precise) {
    if (r.carpet) seen.add(r.carpet.id);
    for (const x of r.taken) seen.add(x.card.id);
  }
  const copies = new Map<string, number>();
  let total = 0;
  for (const c of makeDeck()) {
    if (seen.has(c.id)) continue;
    const key = isJoker(c) ? 'J' : `${c.suit}${c.rank}`;
    copies.set(key, (copies.get(key) ?? 0) + 1);
    total++;
  }
  return { copies, total };
}

/** Wahrscheinlichkeit, eine von `m` Kopien in `draws` Zügen zu bekommen. */
const outsChance = (m: number, U: number, draws: number) => 1 - Math.pow(1 - Math.min(1, m / U), draws);

/**
 * Wie wertvoll ist die Karte für die Hand? Erwartete Augen der besten Kombinationen, an denen sie beteiligt sein kann
 * (fertige Kombination, oder Wahrscheinlichkeit, die fehlenden Karten noch zu bekommen).
 */
function keepValue(c: Card, hand: Card[], un: Unseen, mode: 'romme' | 'cheft', opened: boolean, precise: boolean): number {
  if (isJoker(c)) return 60;
  const draws = precise ? 3 : 2;
  const U = Math.max(8, un.total);
  const J = precise ? (un.copies.get('J') ?? 0) : 0; // der Mastermind rechnet auch mit den noch ungesehenen Jokern
  const jokersInHand = hand.filter(isJoker).length;
  const have = (suit: string, rank: number) => hand.some((o) => !isJoker(o) && o.suit === suit && o.rank === rank);
  const chance = (suit: string, rank: number) => outsChance((un.copies.get(`${suit}${rank}`) ?? 0) + J * 0.5, U, draws);
  let best = 0;
  let second = 0;
  const consider = (v: number) => {
    if (v > best) {
      second = best;
      best = v;
    } else if (v > second) second = v;
  };

  if (mode === 'cheft' || !opened) {
    // Paar: identische Karte (Cheft zählt Paare, Rommé-Spieler halten sie als Option)
    const same = hand.filter((o) => !isJoker(o) && sameCard(o, c)).length;
    const pts = augen(c.rank) * 2;
    if (same >= 2) consider(pts + 6);
    else consider((jokersInHand ? 0.8 : chance(c.suit, c.rank)) * pts * (mode === 'cheft' ? 1.4 : 0.7));
  }
  if (mode !== 'cheft') {
    // Satz: drei Farben gleichen Werts
    const haveSuits = SUITS.filter((s) => have(s, c.rank));
    const missing = Math.max(0, 3 - haveSuits.length - Math.min(jokersInHand, 1));
    const pts3 = augen(c.rank) * 3;
    if (missing === 0) consider(pts3 + 6);
    else {
      const ch = SUITS.filter((s) => !have(s, c.rank))
        .map((s) => chance(s, c.rank))
        .sort((a, b) => b - a);
      let p = 1;
      for (let i = 0; i < missing; i++) p *= ch[i] ?? 0;
      consider(p * pts3);
    }
    // Folge: Fenster aus drei Karten derselben Farbe (Ass auch oben)
    for (const k of c.rank === 1 ? [1, 14] : [c.rank]) {
      for (let a = k - 2; a <= k; a++) {
        if (a < 1 || a + 2 > 14) continue;
        const chances: number[] = [];
        let pts = 0;
        for (let rk = a; rk <= a + 2; rk++) {
          const rr = rk === 14 ? 1 : rk;
          pts += augen(rr);
          if (!have(c.suit, rr)) chances.push(chance(c.suit, rr));
        }
        if (jokersInHand && chances.length) chances.splice(chances.indexOf(Math.min(...chances)), 1); // der Joker deckt die schwerste Lücke
        const p = chances.reduce((x, y) => x * y, 1);
        consider(p * pts + (chances.length === 0 ? 6 : 0));
      }
    }
  }
  return best + (precise ? 0.35 : 0.15) * second;
}

/** Mastermind wirft die Karte ab, die am wenigsten zu den noch erreichbaren Kombinationen beiträgt. */
function masterDiscard(state: GameState, pid: number, k: Knobs, pool: Card[]): number {
  const r = state.round;
  const p = r.players[pid];
  const un = unseenCards(state, pid, k.master);
  const next = r.players[nextIndex(state, pid)];
  const nextTaken = r.taken.filter((x) => x.player === nextIndex(state, pid)).map((x) => x.card);
  const danger = k.master && endIsNear(state, pid); // das Spielende vorausahnen kann nur der Mastermind
  // Ausgelegte Joker: Die passenden Karten sind zum Klauen wertvoll
  const jokerTargets: { suit: string; rank: number }[] = [];
  if (p.opened) {
    for (const m of r.melds) {
      m.cards.forEach((c, i) => {
        const rep = isJoker(c) ? jokerRepresents(m, i) : null;
        if (rep) jokerTargets.push(rep);
      });
    }
  }
  let bestCard = pool[0];
  let bestScore = -Infinity;
  for (const c of pool) {
    const keep = keepValue(c, p.hand, un, p.mode, p.opened, k.master);
    let score = -keep;
    if (danger) score = penaltyValue(c) * 3 - keep * 0.3; // es zählt jetzt jeder Strafpunkt
    else score += p.opened ? penaltyValue(c) * 0.9 : penaltyValue(c) * 0.12;
    if (isJoker(c)) score -= 500;
    // Was der nächste Spieler sammelt, behalten wir lieber (Blockieren)
    for (const t of nextTaken) {
      if (isJoker(t)) continue;
      if (sameCard(t, c)) score -= 9;
      else if (t.rank === c.rank) score -= 4;
      else if (t.suit === c.suit && Math.abs(t.rank - c.rank) <= 2) score -= 4;
    }
    if (next.mode === 'cheft' && !next.opened) score -= 1;
    if (jokerTargets.some((j) => j.suit === c.suit && j.rank === c.rank)) score -= 25;
    if (score > bestScore) {
      bestScore = score;
      bestCard = c;
    }
  }
  return bestCard.id;
}

/** Sichtbare Kopien einer Karte (Ablage ohne oberste Karte, Auslagen). */
function visibleCopies(state: GameState, card: Card): number {
  const r = state.round;
  let n = 0;
  for (const c of r.discard) if (sameCard(c, card)) n++;
  for (const m of r.melds) for (const c of m.cards) if (sameCard(c, card)) n++;
  return n;
}

/** Wählt die Abwurfkarte: hohe Strafpunkte, wenig Nutzen, regelkonform, profilabhängig. */
function chooseDiscard(state: GameState, pid: number, k: Knobs): number {
  const r = state.round;
  const p = r.players[pid];
  const hand = p.hand;
  const legal = hand.filter((c) => checkDiscard(state, pid, c.id).ok);
  let pool = legal.length > 0 ? legal : hand;
  // Wer auf die Teppichkarte wartet, wirft deren Partner nicht weg
  const mate = k.patient && !p.opened && waitForCarpet(state, pid, k) ? carpetMate(state, pid) : null;
  if (mate && pool.length > 1) pool = pool.filter((c) => c.id !== mate.id);
  if (k.counting) return masterDiscard(state, pid, k, pool);
  const next = nextIndex(state, pid);
  const nextP = r.players[next];
  const nextTaken = r.taken.filter((x) => x.player === next).map((x) => x.card);
  // Karten, die ausgelegte Joker vertreten (für Jokerjäger wertvoll)
  const jokerTargets: { suit: string; rank: number }[] = [];
  if (k.jokerHunter && p.opened) {
    for (const m of r.melds) m.cards.forEach((c, i) => {
      const rep = isJoker(c) ? jokerRepresents(m, i) : null;
      if (rep) jokerTargets.push(rep);
    });
  }

  let bestCard = pool[0];
  let bestScore = -Infinity;
  for (const c of pool) {
    let score = penaltyValue(c);
    if (isJoker(c)) score -= 100;
    if (k.smartDiscard) {
      const others = hand.filter((o) => o.id !== c.id);
      for (const o of others) {
        if (isJoker(o)) continue;
        if (sameCard(o, c)) score -= p.mode === 'cheft' || !p.opened ? 9 : 2;
        else if (o.rank === c.rank && o.suit !== c.suit) score -= 3;
        else if (o.suit === c.suit) {
          const d = Math.abs(o.rank - c.rank);
          if (d === 1) score -= 3;
          else if (d === 2) {
            // Zähler: Lücke nur wert, wenn die Zwischenkarte noch im Spiel ist
            const mid: Card = { id: -1, suit: c.suit, rank: (o.rank + c.rank) / 2 };
            if (!(k.counter && visibleCopies(state, mid) >= 2)) score -= 1;
          }
          if (c.rank === 1 && (o.rank === 13 || o.rank === 12)) score -= 2;
        }
      }
      // Zähler: Paar nur möglich, wenn die zweite Kopie noch nicht sichtbar ist
      if (k.counter && (p.mode === 'cheft' || !p.opened) && visibleCopies(state, c) >= 1) score += 4;
      // Blocker: nichts abwerfen, was der nächste Spieler sammelt
      if (k.blocker) {
        for (const tcard of nextTaken) {
          if (isJoker(tcard)) continue;
          if (sameCard(tcard, c)) score -= 10;
          else if (tcard.rank === c.rank) score -= 5;
          else if (tcard.suit === c.suit && Math.abs(tcard.rank - c.rank) <= 2) score -= 5;
        }
        if (nextP.mode === 'cheft' && !nextP.opened) score -= 2;
      }
      if (jokerTargets.some((j) => j.suit === c.suit && j.rank === c.rank)) score -= 20;
    }
    if (nextP.mode === 'cheft' && !nextP.opened) score -= 1;
    if (score > bestScore) {
      bestScore = score;
      bestCard = c;
    }
  }
  return bestCard.id;
}
