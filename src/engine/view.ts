/**
 * Spieler-Sicht auf den Zustand: eigene Hand offen, fremde Hände und Nachziehstapel maskiert.
 * Maskierte Karten tragen nur die Deck-Information (id -1 = erstes Deck, -2 = zweites Deck).
 * Offen sichtbar bleiben die vorübergehenden Karten des Spielers am Zug (Ablage-, Teppichkarte, geklauter Joker).
 * Der Rücksetzpunkt des Zuges (Turn.rewind) steckt die ganze Runde samt Stapel und gehört nie in eine Spieler-Sicht.
 */
import { Card } from './cards';
import { GameState, RoundState, tempCardIds } from './game';

export interface RoundView extends RoundState {
  /** Offene Karte des Startspielers während der Sortierphase. */
  openCard?: Card;
}

export interface GameView extends GameState {
  round: RoundView;
  /** Index des Betrachters. */
  viewer: number;
}

export function maskCard(c: Card): Card {
  const second = c.id === 105 || (c.id >= 52 && c.id < 104);
  return { id: second ? -2 : -1, suit: 'J', rank: 0 };
}

export function viewFor(state: GameState, viewer: number): GameView {
  const r = state.round;
  const finished = state.finished;
  const openCard = r.waiting ? r.players[r.starter].hand.find((c) => c.id === r.turn.drawnCardId) : undefined;
  const temp = new Set(tempCardIds(r));
  const round: RoundView = {
    ...r,
    stock: r.stock.map(maskCard),
    players: r.players.map((p, i) => (i === viewer ? p : { ...p, hand: p.hand.map((c) => (temp.has(c.id) ? c : maskCard(c))) })),
    turn: { ...r.turn, rewind: undefined, drawnCardId: r.turn.player === viewer || r.waiting ? r.turn.drawnCardId : null },
    openCard,
  };
  // Bei Rundenende dürfen die Restkarten der Spieler gezeigt werden, die draußen sind.
  if (r.ended) {
    round.players = r.players.map((p, i) => (i === viewer || p.opened ? p : { ...p, hand: p.hand.map(maskCard) }));
  }
  return {
    ...state,
    players: state.players.map((p) => (finished ? p : { ...p, bot: undefined })),
    round,
    viewer,
  };
}
