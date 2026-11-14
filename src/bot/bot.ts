/**
 * Computergegner: einfache, aber regelkonforme Heuristik.
 * decideAction liefert jeweils die nächste Aktion für den Spieler pid.
 */
import { Card, isJoker, penaltyValue, sameCard } from '../engine/cards';
import { Action } from '../engine/actions';
import {
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

/** Vorschlag für die Oberfläche: welche Karten könnte der Spieler jetzt auslegen? */
export function suggestLay(state: GameState, pid: number): number[][] | null {
  const p = state.round.players[pid];
  if (state.round.turn.phase !== 'play') return null;
  return p.opened ? bestAdditionalMelds(state, pid) : bestOpening(state, pid);
}

export function decideAction(state: GameState, pid: number): Action {
  const r = state.round;
  const p = r.players[pid];
  const hand = p.hand;
  const top = r.discard[r.discard.length - 1];

  if (r.turn.phase === 'draw') {
    // Cheft-Weg: Ablagekarte bildet ein Paar und 5 Paare werden erreichbar.
    if (top && !p.opened) {
      const mate = isJoker(top) || hand.some((c) => sameCard(c, top));
      if (mate && maxPairs([...hand, top]) >= 5) {
        if (p.mode === 'romme' && checkDeclareCheft(state, pid).ok) return { kind: 'declareCheft' };
        if (checkDraw(state, pid, 'discard').ok) return { kind: 'draw', source: 'discard' };
      }
    }
    if (top && p.mode === 'cheft' && p.opened && checkDraw(state, pid, 'discard').ok) {
      // Nach dem Rauskommen: nur nehmen, wenn die Karte sofort verwertbar ist.
      if (usableAfterOpening(state, pid, top)) return { kind: 'draw', source: 'discard' };
    }
    if (top && p.mode === 'cheft' && !p.opened && checkDraw(state, pid, 'discard').ok) {
      const mate = isJoker(top) || hand.some((c) => sameCard(c, top));
      if (mate) return { kind: 'draw', source: 'discard' };
    }
    if (r.carpet && checkDraw(state, pid, 'carpet').ok) return { kind: 'draw', source: 'carpet' };
    if (top && p.mode === 'romme' && !p.opened && checkDraw(state, pid, 'discard').ok) {
      return { kind: 'draw', source: 'discard' };
    }
    return { kind: 'draw', source: 'stock' };
  }

  // ---- Spielphase
  const pendingJoker = r.turn.pendingJokerId;
  if (pendingJoker !== null) {
    const use = useJoker(state, pid, pendingJoker);
    if (use) return use;
  }

  if (!p.opened) {
    const opening = bestOpening(state, pid);
    if (opening) return { kind: 'lay', groups: opening };
  } else {
    // Weitere Kombinationen und Anlegen
    const more = bestAdditionalMelds(state, pid);
    if (more) return { kind: 'lay', groups: more };
    const steal = findSteal(state, pid);
    if (steal) return steal;
    const off = findLayOff(state, pid);
    if (off) return off;
  }

  return { kind: 'discard', cardId: chooseDiscard(state, pid) };
}

function usableAfterOpening(state: GameState, pid: number, card: Card): boolean {
  const p = state.round.players[pid];
  if (layOffTargets(state, pid, card.id).length > 0) return true;
  const hand = [...p.hand, card];
  // Zwei Paare auf einmal (Cheft-Abschluss)?
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

/** Beste Erstmeldung (Rommé oder Cheft), die die Regeln erfüllt. */
function bestOpening(state: GameState, pid: number): number[][] | null {
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

  // Cheft: 5 oder 7 Paare (plus Rommé-Kombinationen im selben Zug).
  const wantCheft = p.mode === 'cheft' || maxPairs(hand) >= 5;
  if (wantCheft && r.turn.mustOpenWithId === null) {
    for (let k = 0; k < n; k++) {
      if (hand[k].id === must) continue;
      const rest = hand.filter((_, i) => i !== k);
      const part = findPartition(rest, {
        types: ALL_TYPES,
        pairCounts: [5, 7],
        allowSkip: true,
        mustInclude: must === null ? [] : [must],
      });
      if (part && part.used > 0) consider(groupsOf(part.melds), part.used, part.augen);
    }
    if (best) return (best as Best).groups;
  }
  if (p.mode === 'cheft') return null;

  // Rommé
  const threshold = thresholdFor(state, pid);
  for (let k = 0; k < n; k++) {
    if (hand[k].id === must) continue;
    const rest = hand.filter((_, i) => i !== k);
    const part = findPartition(rest, {
      types: ROMME_TYPES,
      allowSkip: true,
      mustInclude: must === null ? [] : [must],
    });
    if (!part || part.used === 0) continue;
    if (part.used === n - 1 || part.augen >= threshold) consider(groupsOf(part.melds), part.used, part.augen);
  }
  return best ? (best as Best).groups : null;
}

/** Nach dem Rauskommen: weitere Kombinationen aus der Hand (eine Karte bleibt). */
function bestAdditionalMelds(state: GameState, pid: number): number[][] | null {
  const p = state.round.players[pid];
  const hand = p.hand;
  if (hand.length < 3) {
    return null;
  }
  // Cheft-Abschluss mit 2 Paaren
  if (p.mode === 'cheft' && hand.length === 5) {
    for (let k = 0; k < hand.length; k++) {
      const rest = hand.filter((_, i) => i !== k);
      const part = findPartition(rest, { types: ['pair'], pairCounts: [2] });
      if (part && checkLay(state, pid, groupsOf(part.melds)).ok) return groupsOf(part.melds);
    }
  }
  let best: { groups: number[][]; used: number } | null = null;
  for (let k = 0; k < hand.length; k++) {
    const rest = hand.filter((_, i) => i !== k);
    const part = findPartition(rest, { types: ROMME_TYPES, allowSkip: true });
    if (!part || part.used === 0) continue;
    const groups = groupsOf(part.melds);
    if (!checkLay(state, pid, groups).ok) continue;
    if (!best || part.used > best.used) best = { groups, used: part.used };
  }
  return best ? best.groups : null;
}

function findLayOff(state: GameState, pid: number): Action | null {
  const p = state.round.players[pid];
  if (p.hand.length < 2) return null;
  // Teuerste Karten zuerst loswerden, Joker zuletzt (könnten noch Kombinationen bilden).
  const sorted = [...p.hand].sort((a, b) => (isJoker(a) ? 1 : 0) - (isJoker(b) ? 1 : 0) || penaltyValue(b) - penaltyValue(a));
  for (const c of sorted) {
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
      if (checkStealJoker(state, pid, m.id, i, card.id).ok) {
        return { kind: 'steal', meldId: m.id, jokerIndex: i, cardId: card.id };
      }
    }
  }
  return null;
}

function useJoker(state: GameState, pid: number, jokerId: number): Action | null {
  const p = state.round.players[pid];
  // Neue Kombination mit dem Joker?
  for (let k = 0; k < p.hand.length; k++) {
    if (p.hand[k].id === jokerId) continue;
    const rest = p.hand.filter((_, i) => i !== k);
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

/** Wählt die Abwurfkarte: hohe Strafpunkte, wenig Nutzen, regelkonform. */
function chooseDiscard(state: GameState, pid: number): number {
  const r = state.round;
  const p = r.players[pid];
  const hand = p.hand;
  const legal = hand.filter((c) => checkDiscard(state, pid, c.id).ok);
  const pool = legal.length > 0 ? legal : hand;
  const nextP = r.players[nextIndex(state, pid)];
  let bestCard = pool[0];
  let bestScore = -Infinity;
  for (const c of pool) {
    let score = penaltyValue(c);
    if (isJoker(c)) score -= 100;
    const others = hand.filter((o) => o.id !== c.id);
    for (const o of others) {
      if (isJoker(o)) continue;
      if (sameCard(o, c)) score -= p.mode === 'cheft' || !p.opened ? 9 : 2;
      else if (o.rank === c.rank) score -= 3;
      else if (o.suit === c.suit) {
        const d = Math.abs(o.rank - c.rank);
        if (d === 1) score -= 3;
        else if (d === 2) score -= 1;
        if (c.rank === 1 && (o.rank === 13 || o.rank === 12)) score -= 2;
      }
    }
    // Dem nächsten Spieler (Cheft) keine Paare schenken
    if (nextP.mode === 'cheft' && !nextP.opened) score -= 1;
    if (score > bestScore) {
      bestScore = score;
      bestCard = c;
    }
  }
  return bestCard.id;
}
