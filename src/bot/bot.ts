/**
 * Computergegner mit Profilen: Gedächtnis (Stufe, siehe memory.ts) und Spielweise.
 * decideAction liefert jeweils die nächste regelkonforme Aktion für den Spieler pid.
 *
 * Das Gedächtnis bestimmt nur, was der Bot wahrnimmt und behält (Abwürfe, genommene Karten, Auslagen, eigene Hand).
 * Die Spielweise bestimmt, was er daraus macht (Knobs).
 */
import { Card, isJoker, penaltyValue, sameCard, makeRng } from '../engine/cards';
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
import { ALL_TYPES, ROMME_TYPES, MeldShape, findPartition, interpretMeld, jokerRepresents, maxPairs } from '../engine/melds';
import { DEFAULT_TUNING, Tuning, isBold, weighOpening } from './strategy';
import { Cand, MemoryParams, Signal, Perception, STEAL_DIFFICULTY, Unseen, comboDifficulty, layOffDifficulty, memoryFor, overlooksAt, perceive, perceivedState, pickByScore, recall } from './memory';

export interface Knobs {
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
  /** Wirft nach Wahrscheinlichkeiten ab, die aus der Erinnerung folgen (für alle Stufen an; die Stufe bestimmt nur, wie gut die Erinnerung ist). */
  counting: boolean;
  /** Erstmeldung ohne Joker bevorzugen (Joker bleiben für Klauen und Verbrennen auf der Hand). */
  master: boolean;
  /** Mit Jokern nicht überstürzt rauskommen: Ist die Teppichkarte nächste Runde ein echtes Paar, lieber warten. */
  patient: boolean;
  /** Ausgangs-Ehrgeiz 0..1: wie bereitwillig der Bot mit der Erstmeldung wartet, um die Hürde zu erhöhen (Tabellenstand verschiebt ihn). */
  ambition: number;
  /** Erstmeldung abwägen (sofort legen oder noch warten). Aus nur für Vergleiche und Tests. */
  weighOpening: boolean;
  /** Stellschrauben der Abwägung überschreiben (Simulation). */
  tuning?: Partial<Tuning>;
  /** Mutiger Modus beim Zurückliegen erlauben (siehe strategy.ts). Aus nur für Vergleiche und Tests. */
  bold: boolean;
  /** Gegner-Gedächtnis: Abwurf nach dem, was der nächste Spieler nimmt, abwirft und liegen lässt. Aus: nur nach seinen genommenen Karten. */
  oppModel: boolean;
}

/** Überschreibt Regler und Gedächtniswerte, für Tests und Simulationen. */
export interface DecideOptions {
  knobs?: Partial<Knobs>;
  memory?: Partial<MemoryParams>;
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
    counting: true,
    master: false,
    patient: false,
    ambition: 0.4,
    weighOpening: true,
    bold: true,
    oppModel: true,
  };
  // Die Stufe (profile.level) setzt hier bewusst nichts: Sie wirkt nur über das Gedächtnis (memory.ts).
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

function profileOf(state: GameState, pid: number): BotProfile {
  return state.players[pid].bot ?? DEFAULT_PROFILE;
}

function knobs(state: GameState, pid: number, opts: DecideOptions = {}): Knobs {
  return { ...knobsFor(profileOf(state, pid)), ...opts.knobs };
}

/** Deterministischer Zufall je Zug (für Zocker). Der Zugzähler `plies` macht jeden Zug zu einem neuen Wurf. */
function chance(state: GameState, pid: number, p: number): boolean {
  if (p <= 0) return false;
  const r = state.round;
  const rng = makeRng(state.seed + r.no * 131 + pid * 17 + (r.plies ?? 0) * 7);
  return rng() < p;
}

/** Vorschlag für die Oberfläche: welche Karten könnte der Spieler jetzt auslegen? (Ohne Wahrnehmungsfehler.) */
export function suggestLay(state: GameState, pid: number): number[][] | null {
  const p = state.round.players[pid];
  if (state.round.turn.phase !== 'play') return null;
  return p.opened ? bestAdditionalMelds(state, pid, knobs(state, pid)) : bestOpening(state, pid, knobs(state, pid), true);
}

/** Pflichtzüge: Hier muss der Bot alles sehen, sonst steckt er fest. */
function isForced(state: GameState): boolean {
  const t = state.round.turn;
  return t.phase === 'play' && (t.pendingJokerId !== null || t.mustUseId !== null || t.mustOpenWithId !== null || t.mustPairWithId !== null);
}

export function decideAction(state: GameState, pid: number, opts: DecideOptions = {}): Action {
  const r = state.round;
  const p = r.players[pid];
  const hand = p.hand;
  const k = knobs(state, pid, opts);
  // Wahrnehmung: Was übersieht der Bot in diesem Zug? Der Spielzustand selbst bleibt unverändert.
  const per = perceive(state, pid, memoryFor(profileOf(state, pid).level, opts.memory), isForced(state));
  const view = perceivedState(state, per);
  const top = per.topBlind ? undefined : r.discard[r.discard.length - 1];
  // Wer hinten liegt, spielt mutiger: auf Hand, früher Cheft, mit der Erstmeldung warten (hier der Ausgangspunkt)
  const bold = k.bold && isBold(state, pid, k.ambition, k.tuning);
  const bt = { ...DEFAULT_TUNING, ...k.tuning };
  const cheftEager = bold && bt.boldCheft ? Math.min(k.cheftEagerPairs, 4) : k.cheftEagerPairs;
  const pairTake = bold && bt.boldCheft ? Math.min(k.pairTakeAt, 3) : k.pairTakeAt;
  const hunter = k.handHunter || (bold && bt.boldHand);

  if (r.turn.phase === 'draw') {
    // Cheft-Weg: Ablagekarte bildet ein Paar.
    if (top && !p.opened) {
      const mate = isJoker(top) || hand.some((c) => sameCard(c, top));
      const pairsAfter = maxPairs([...hand, top]);
      const wants = pairsAfter >= 5 || (mate && pairsAfter >= pairTake && (p.mode === 'cheft' || pairsAfter >= cheftEager || chance(state, pid, k.gamble * 0.4)));
      if (mate && wants) {
        if (p.mode === 'romme' && checkDeclareCheft(state, pid).ok) return { kind: 'declareCheft' };
        if (checkDraw(state, pid, 'discard').ok) return { kind: 'draw', source: 'discard' };
      }
    }
    if (top && p.opened && checkDraw(state, pid, 'discard').ok && usableAfterOpening(view, pid, top)) {
      return { kind: 'draw', source: 'discard' };
    }
    const stockEmpty = r.stock.length === 0;
    if (r.carpet && !per.carpetBlind && !stockEmpty && checkDraw(state, pid, 'carpet').ok) return { kind: 'draw', source: 'carpet' };
    if (top && p.mode === 'romme' && !p.opened && k.takeDiscardToOpen && checkDraw(state, pid, 'discard').ok) {
      // Die Ablagekarte zu nehmen heißt, sofort rauszukommen: Das lohnt nur, wenn Warten nicht besser wäre
      if (!(hunter && holdForHand(state, pid, hunter)) && !holdsOpeningWith(state, pid, k, per, top)) return { kind: 'draw', source: 'discard' };
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
    // Geht es nur durch Klauen, dann mit genau dieser Karte (sonst bleibt sie als letzte Karte übrig und lässt sich nicht mehr verwenden)
    const stealWith = findSteal(state, view, pid, k, per, mustUse);
    if (stealWith) return stealWith;
  }

  if (!p.opened) {
    // Freiwillige Cheft-Ansage (Cheft-Fan, Zocker)
    if (p.mode === 'romme' && r.turn.mustOpenWithId === null && maxPairs(hand) >= cheftEager && checkDeclareCheft(state, pid).ok) {
      if (cheftEager <= 3 ? chance(state, pid, k.gamble) : true) return { kind: 'declareCheft' };
    }
    // Handüberblick: Einzelne Kombinationen der möglichen Erstmeldung übersieht der Bot in diesem Zug vielleicht
    const opening = bestOpening(state, pid, k, false, hunter);
    const seenOpening = opening && perceivedGroups(state, pid, opening, per, 1);
    // Abwägung: Wer noch deutlich mehr Augen zusammenbekommt, wartet und erhöht damit die Hürde für die Gegner
    if (seenOpening && !holdsOpening(state, pid, k, per, seenOpening, hand)) return { kind: 'lay', groups: seenOpening };
  } else {
    const more = bestAdditionalMelds(state, pid, k);
    const seenMore = more && perceivedGroups(state, pid, more, per, 2);
    if (seenMore) return { kind: 'lay', groups: seenMore };
    if (k.steal) {
      const steal = findSteal(state, view, pid, k, per);
      if (steal) return steal;
    }
    if (k.layAll) {
      const off = findLayOff(state, view, pid, k, per);
      if (off) return off;
    }
  }

  return { kind: 'discard', cardId: chooseDiscard(state, pid, k, per) };
}

/** Wartet der Bot mit dieser möglichen Erstmeldung noch (siehe strategy.ts)? */
function holdsOpening(state: GameState, pid: number, k: Knobs, per: Perception, groups: number[][], hand: Card[]): boolean {
  if (!k.weighOpening) return false;
  const unseen = recall(state, pid, per).unseen;
  return weighOpening(state, pid, { base: k.ambition, groups, hand, unseen, forced: per.forced, tuning: k.bold ? k.tuning : { ...k.tuning, boldHold: false } }).hold;
}

/** Wie holdsOpening, aber für die Erstmeldung, die sich durch das Nehmen der obersten Ablagekarte ergäbe. */
function holdsOpeningWith(state: GameState, pid: number, k: Knobs, per: Perception, card: Card): boolean {
  if (!k.weighOpening) return false;
  const hand = [...state.round.players[pid].hand, card];
  const th = thresholdFor(state, pid);
  let best: { groups: number[][]; used: number; augen: number } | null = null;
  for (let kk = 0; kk < hand.length; kk++) {
    if (hand[kk].id === card.id) continue;
    const rest = hand.filter((_, i) => i !== kk);
    const part = findPartition(rest, { types: ROMME_TYPES, allowSkip: true, mustInclude: [card.id] });
    if (!part || part.used === 0) continue;
    if (part.used !== hand.length - 1 && part.augen < th) continue;
    if (!best || part.used > best.used || (part.used === best.used && part.augen > best.augen)) best = { groups: groupsOf(part.melds), used: part.used, augen: part.augen };
  }
  if (!best) return false;
  const unseen = recall(state, pid, per).unseen;
  return weighOpening(state, pid, { base: k.ambition, groups: best.groups, hand, unseen, forced: false, tuning: k.bold ? k.tuning : { ...k.tuning, boldHold: false } }).hold;
}

/**
 * Handüberblick: Welche der möglichen Kombinationen sieht der Bot in diesem Zug? Jede wird einzeln geprüft (Paar-Erstmeldungen als Ganzes), einfache
 * (ein Satz, ein Paar) werden selten, schwierige (lange Folge, Joker, Ass) öfter übersehen. Reicht der Rest nicht mehr
 * für die Regeln (z. B. unter 51 Augen oder keine 5 Paare), legt er in diesem Zug nichts aus und versucht es im nächsten wieder.
 * Pflichtzüge und der Mastermind übersehen nie etwas.
 */
export function perceivedGroups(state: GameState, pid: number, groups: number[][], per: Perception, decision: number): number[][] | null {
  if (per.forced || !(per.params.handMiss > 0)) return groups;
  const hand = state.round.players[pid].hand;
  // Eine Erstmeldung aus lauter Paaren (Cheft) gilt nur ganz oder gar nicht: Ein einziger Wurf mit der mittleren Schwierigkeit,
  // statt fünfmal einzeln zu würfeln (das würde die Fehlerquote auf fast das Doppelte treiben)
  if (groups.length > 0 && groups.every((g) => g.length === 2)) {
    const mean =
      groups.reduce((sum, g) => {
        const shape = interpretMeld(g.map((id) => hand.find((c) => c.id === id)!));
        return sum + (shape ? comboDifficulty(shape) : 1);
      }, 0) / groups.length;
    return overlooksAt(state, pid, per, mean, decision, Math.min(...groups.flat())) ? null : groups;
  }
  const kept = groups.filter((g) => {
    const cards = g.map((id) => hand.find((c) => c.id === id)!);
    const shape = interpretMeld(cards);
    const difficulty = shape ? comboDifficulty(shape) : 1;
    return !overlooksAt(state, pid, per, difficulty, decision, Math.min(...g));
  });
  if (kept.length === groups.length) return groups;
  if (kept.length === 0) return null;
  return checkLay(state, pid, kept).ok ? kept : null;
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
function holdForHand(state: GameState, pid: number, hunter: boolean): boolean {
  if (!hunter) return false;
  const r = state.round;
  if (r.players.some((q) => q.opened)) return false;
  if (r.stock.length < 8) return false;
  const hand = r.players[pid].hand;
  const part = findPartition(hand, { types: hand.length ? (r.players[pid].mode === 'cheft' ? ALL_TYPES : ROMME_TYPES) : ROMME_TYPES, allowSkip: true });
  const missing = hand.length - (part ? part.used : 0);
  return missing <= 4;
}

/** Beste Erstmeldung (Rommé oder Cheft), die die Regeln und das Profil erfüllt. */
function bestOpening(state: GameState, pid: number, k: Knobs, ignoreProfile: boolean, hunter = k.handHunter): number[][] | null {
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
    // Die Teppichkarte bildet ihr Paar nur mit der genau gleichen Karte, nie mit einem Joker: Dieses Paar steht fest,
    // die übrigen vier (oder sechs) Paare dürfen Joker enthalten.
    const carpetId = r.turn.mustPairWithId;
    const carpetCard = carpetId === null ? undefined : hand.find((c) => c.id === carpetId);
    const twin = carpetCard ? hand.find((c) => c.id !== carpetCard.id && !isJoker(c) && sameCard(c, carpetCard)) : undefined;
    const pairOpening = (allowJokers: boolean): Best | null => {
      let found: Best | null = null;
      if (carpetId !== null && !(carpetCard && twin)) return null; // ohne genaue Zwillingskarte ist die Teppichkarte nicht verwendbar
      for (let kk = 0; kk < n; kk++) {
        if (hand[kk].id === must) continue;
        if (twin && hand[kk].id === twin.id) continue;
        let groups: number[][];
        let used: number;
        let augen: number;
        if (carpetCard && twin) {
          const rest = hand.filter((c, i) => i !== kk && c.id !== carpetCard.id && c.id !== twin.id && (allowJokers || !isJoker(c)));
          const part = findPartition(rest, { types: ALL_TYPES, pairCounts: [4, 6], allowSkip: true });
          if (!part || part.used === 0) continue;
          groups = [[carpetCard.id, twin.id], ...groupsOf(part.melds)];
          used = part.used + 2;
          augen = part.augen;
        } else {
          const rest = hand.filter((c, i) => i !== kk && (allowJokers || !isJoker(c)));
          const part = findPartition(rest, { types: ALL_TYPES, pairCounts: [5, 7], allowSkip: true, mustInclude: must === null ? [] : [must] });
          if (!part || part.used === 0) continue;
          groups = groupsOf(part.melds);
          used = part.used;
          augen = part.augen;
        }
        if (!checkLay(state, pid, groups).ok) continue;
        if (!found || used > found.used || (used === found.used && augen > found.augen)) found = { groups, used, augen };
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
  if (k.master && hand.some(isJoker) && !(!ignoreProfile && must === null && holdForHand(state, pid, hunter))) {
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
  if (!ignoreProfile && must === null && b.used < n - 1 && holdForHand(state, pid, hunter)) return null;
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

/** `view` ist der Zustand ohne die Auslagen, die der Bot gerade übersieht; Regeln prüft weiterhin `state`. */
function findLayOff(state: GameState, view: GameState, pid: number, k: Knobs, per: Perception): Action | null {
  const p = state.round.players[pid];
  if (p.hand.length < 2) return null;
  const sorted = [...p.hand].sort((a, b) => (isJoker(a) ? 1 : 0) - (isJoker(b) ? 1 : 0) || penaltyValue(b) - penaltyValue(a));
  for (const c of sorted) {
    if (isJoker(c) && (k.jokerHunter || k.burn) && p.hand.length <= 3 && !endIsNear(state, pid)) continue; // zum Verbrennen aufheben
    const targets = layOffTargets(view, pid, c.id);
    if (targets.length === 0) continue;
    const own = targets.find((t) => t.meld.owner === pid) ?? targets[0];
    if (overlooksAt(state, pid, per, layOffDifficulty(c, own.meld), 3, c.id)) continue; // Handüberblick: Anlegemöglichkeit nicht gesehen
    return { kind: 'layOff', cardId: c.id, meldId: own.meld.id, end: 'top' };
  }
  return null;
}

/** Alle erlaubten Joker-Klauzüge bewerten (Zug durchspielen) und den mit den wenigsten Reststrafpunkten wählen. */
function findSteal(state: GameState, view: GameState, pid: number, k: Knobs, per: Perception, only?: number): Action | null {
  const p = state.round.players[pid];
  if (p.hand.length < 2) return null;
  const options: Extract<Action, { kind: 'steal' }>[] = [];
  for (const m of view.round.melds) {
    for (let i = 0; i < m.cards.length; i++) {
      if (!isJoker(m.cards[i])) continue;
      const rep = jokerRepresents(m, i);
      if (!rep) continue;
      for (const card of p.hand.filter((c) => c.suit === rep.suit && c.rank === rep.rank && (only === undefined || c.id === only))) {
        if (overlooksAt(state, pid, per, STEAL_DIFFICULTY, 4, card.id, m.id, i)) continue; // Handüberblick: Klaumöglichkeit nicht gesehen
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

// ---------------------------------------------------------------- Kartenzählen und Wahrscheinlichkeiten
// Was der Bot dabei noch weiß, bestimmt sein Gedächtnis (memory.ts: recall). Der Mastermind weiß alles, die anderen
// Stufen vergessen, verwechseln oder bekommen manches gar nicht mit.

const SUITS = ['H', 'D', 'C', 'S'] as const;
const augen = (rank: number) => (rank === 1 ? 11 : rank >= 10 ? 10 : rank);

/** Wahrscheinlichkeit, eine von `m` Kopien in `draws` Zügen zu bekommen. */
const outsChance = (m: number, U: number, draws: number) => 1 - Math.pow(1 - Math.min(1, m / U), draws);

/**
 * Wie wertvoll ist die Karte für die Hand? Erwartete Augen der besten Kombinationen, an denen sie beteiligt sein kann
 * (fertige Kombination, oder Wahrscheinlichkeit, die fehlenden Karten noch zu bekommen).
 */
function keepValue(c: Card, hand: Card[], un: Unseen, mode: 'romme' | 'cheft', opened: boolean): number {
  if (isJoker(c)) return 60;
  const draws = 3;
  const U = Math.max(8, un.total);
  const J = un.copies.get('J') ?? 0; // auch die noch ungesehenen Joker zählen als Ersatz
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
  return best + 0.35 * second;
}

/**
 * Wie stark deutet eine (womöglich verschwommene) Erinnerung an die vom nächsten Spieler genommene Karte darauf hin,
 * dass er `c` sammelt? Eine scharfe Erinnerung zählt voll, eine verschwommene anteilig.
 */
function blockPenalty(c: Card, cands: Cand[]): number {
  let s = 0;
  for (const t of cands) {
    if (t.suit === 'J') continue;
    if (t.suit === c.suit && t.rank === c.rank) s += 9;
    else if (t.rank === c.rank) s += 4;
    else if (t.suit === c.suit && Math.abs(t.rank - c.rank) <= 2) s += 4;
  }
  return s / cands.length;
}

/**
 * Wie sehr gleicht die Karte c den Karten einer (womöglich verschwommenen) Erinnerung? 1 = genau diese Karte,
 * 4/9 = gleicher Wert oder dieselbe Farbe in Reichweite einer Folge (Verhältnis wie die frühere Blockierwertung 9 zu 4).
 */
export function similarity(c: Card, cands: Cand[]): number {
  let s = 0;
  for (const t of cands) {
    if (t.suit === 'J') continue;
    if (t.suit === c.suit && t.rank === c.rank) s += 1;
    else if (t.rank === c.rank) s += 4 / 9;
    else if (t.suit === c.suit && Math.abs(t.rank - c.rank) <= 2) s += 4 / 9;
  }
  return cands.length ? s / cands.length : 0;
}

/**
 * Gegner-Gedächtnis: Wie wahrscheinlich nimmt der nächste Spieler die Karte c, wenn ich sie abwerfe (0 bis 1)?
 * Wer sie nehmen darf, richtet sich nach den Regeln (von einem Cheft-Spieler nimmt kein Rommé-Spieler eine Karte; ein
 * Rommé-Spieler nur, wenn er sie sofort anlegen oder damit rauskommen kann). Dann zählt, was er genommen hat (er sammelt in
 * diese Richtung), abgezogen, was er abgeworfen oder liegen gelassen hat, obwohl er es hätte nehmen können.
 */
export function nextPlayerRisk(state: GameState, pid: number, c: Card, signals: Signal[]): number {
  const r = state.round;
  const me = r.players[pid];
  const ni = nextIndex(state, pid);
  const next = r.players[ni];
  let elig: number;
  if (me.mode === 'cheft' && next.mode === 'romme') elig = 0;
  else if (next.mode === 'cheft') elig = 1;
  else elig = next.opened ? 0.7 : 0.2;
  if (elig === 0) return 0;
  let pos = 0;
  let neg = 0;
  for (const s of signals) {
    if (s.player !== ni) continue;
    const sim = similarity(c, s.cands);
    if (s.kind === 'take') pos += sim;
    else if (s.kind === 'throw') neg += 0.5 * sim;
    else neg += (elig >= 0.7 ? 0.6 : 0.2) * sim;
  }
  return Math.min(1, elig * Math.max(0, pos - neg));
}

/** Wirft die Karte ab, die am wenigsten zu den noch erreichbaren Kombinationen beiträgt (nach dem, was der Bot noch weiß). */
function masterDiscard(state: GameState, pid: number, pool: Card[], per: Perception, oppModel: boolean): number {
  const r = state.round;
  const p = r.players[pid];
  const memory = recall(state, pid, per);
  const un = memory.unseen;
  const next = r.players[nextIndex(state, pid)];
  const nextTaken = memory.takes.filter((x) => x.player === nextIndex(state, pid));
  const danger = endIsNear(state, pid);
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
  const scores: number[] = [];
  for (const c of pool) {
    const keep = keepValue(c, p.hand, un, p.mode, p.opened);
    let score = -keep;
    if (danger) score = penaltyValue(c) * 3 - keep * 0.3; // es zählt jetzt jeder Strafpunkt
    else score += p.opened ? penaltyValue(c) * 0.9 : penaltyValue(c) * 0.12;
    if (isJoker(c)) score -= 500;
    // Was der nächste Spieler sammelt, behalten wir lieber (Blockieren)
    if (oppModel) score -= 9 * nextPlayerRisk(state, pid, c, memory.signals);
    else for (const t of nextTaken) score -= blockPenalty(c, t.cands);
    if (next.mode === 'cheft' && !next.opened) score -= 1;
    if (jokerTargets.some((j) => j.suit === c.suit && j.rank === c.rank)) score -= 25;
    scores.push(score);
  }
  // Sorgfalt: Wer ungenau entscheidet, nimmt manchmal eine fast gleich gute andere Karte
  return pool[pickByScore(state, pid, per, scores)].id;
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
function chooseDiscard(state: GameState, pid: number, k: Knobs, per: Perception): number {
  const r = state.round;
  const p = r.players[pid];
  const hand = p.hand;
  const legal = hand.filter((c) => checkDiscard(state, pid, c.id).ok);
  let pool = legal.length > 0 ? legal : hand;
  // Wer auf die Teppichkarte wartet, wirft deren Partner nicht weg
  const mate = k.patient && !p.opened && waitForCarpet(state, pid, k) ? carpetMate(state, pid) : null;
  if (mate && pool.length > 1) pool = pool.filter((c) => c.id !== mate.id);
  if (k.counting) return masterDiscard(state, pid, pool, per, k.oppModel);
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
