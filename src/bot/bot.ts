/**
 * Computergegner mit Profilen: Stufe (gemütlich/normal/gerissen) und Spielweise.
 * decideAction liefert jeweils die nächste regelkonforme Aktion für den Spieler pid.
 */
import { Card, isJoker, penaltyValue, sameCard, makeRng } from '../engine/cards';
import { Action } from '../engine/actions';
import {
  BotProfile,
  GameState,
  checkDeclareCheft,
  checkDiscard,
  checkDraw,
  checkLay,
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
    if (r.carpet && checkDraw(state, pid, 'carpet').ok) return { kind: 'draw', source: 'carpet' };
    if (top && p.mode === 'romme' && !p.opened && k.takeDiscardToOpen && checkDraw(state, pid, 'discard').ok) {
      if (!(k.handHunter && holdForHand(state, pid, k))) return { kind: 'draw', source: 'discard' };
    }
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
      const steal = findSteal(state, pid);
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
    for (let kk = 0; kk < n; kk++) {
      if (hand[kk].id === must) continue;
      const rest = hand.filter((_, i) => i !== kk);
      const part = findPartition(rest, { types: ALL_TYPES, pairCounts: [5, 7], allowSkip: true, mustInclude: must === null ? [] : [must] });
      if (part && part.used > 0) consider(groupsOf(part.melds), part.used, part.augen);
    }
    if (best) return (best as Best).groups;
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
  let best: { groups: number[][]; used: number } | null = null;
  for (let kk = 0; kk < hand.length; kk++) {
    const rest = hand.filter((_, i) => i !== kk);
    // Jokerjäger behält einen Joker zum Verbrennen, wenn er damit die letzte Karte wäre
    const part = findPartition(rest, { types: ROMME_TYPES, allowSkip: true });
    if (!part || part.used === 0) continue;
    const groups = groupsOf(part.melds);
    if (!checkLay(state, pid, groups).ok) continue;
    if (!best || part.used > best.used) best = { groups, used: part.used };
  }
  return best ? best.groups : null;
}

function findLayOff(state: GameState, pid: number, k: Knobs): Action | null {
  const p = state.round.players[pid];
  if (p.hand.length < 2) return null;
  const sorted = [...p.hand].sort((a, b) => (isJoker(a) ? 1 : 0) - (isJoker(b) ? 1 : 0) || penaltyValue(b) - penaltyValue(a));
  for (const c of sorted) {
    if (isJoker(c) && k.jokerHunter && p.hand.length <= 3) continue; // zum Verbrennen aufheben
    const targets = layOffTargets(state, pid, c.id);
    if (targets.length === 0) continue;
    const own = targets.find((t) => t.meld.owner === pid) ?? targets[0];
    return { kind: 'layOff', cardId: c.id, meldId: own.meld.id, end: 'top' };
  }
  return null;
}

function findSteal(state: GameState, pid: number): Action | null {
  const p = state.round.players[pid];
  if (p.hand.length < 2) return null;
  for (const m of state.round.melds) {
    for (let i = 0; i < m.cards.length; i++) {
      if (!isJoker(m.cards[i])) continue;
      const rep = jokerRepresents(m, i);
      if (!rep) continue;
      const card = p.hand.find((c) => c.suit === rep.suit && c.rank === rep.rank);
      if (!card) continue;
      if (checkStealJoker(state, pid, m.id, i, card.id).ok) return { kind: 'steal', meldId: m.id, jokerIndex: i, cardId: card.id };
    }
  }
  return null;
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
  const pool = legal.length > 0 ? legal : hand;
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
