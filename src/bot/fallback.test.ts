import { describe, it, expect } from 'vitest';
import { fallbackMove } from './fallback';
import { testGame } from '../engine/testutil';
import { applyAction } from '../engine/actions';
import { current } from '../engine/game';

describe('Notausgang für Bot-Züge', () => {
  it('Ziehphase: zieht vom Stapel', () => {
    const g = testGame(3, 5);
    // Startspieler hat die 15. Karte schon; der nächste Spieler ist in der Ziehphase, wenn der Startspieler abwirft
    const first = current(g);
    const hand = g.round.players[first].hand;
    expect(applyAction(g, first, { kind: 'discard', cardId: hand[0].id }).ok).toBe(true);
    const pid = current(g);
    expect(g.round.turn.phase).toBe('draw');
    const before = g.round.players[pid].hand.length;
    expect(fallbackMove(g, pid)).toBe(true);
    expect(g.round.players[pid].hand.length).toBe(before + 1);
    expect(g.round.turn.phase).toBe('play');
  });

  it('Spielphase: wirft eine Karte ab', () => {
    const g = testGame(3, 6);
    const pid = current(g);
    const before = g.round.players[pid].hand.length;
    expect(g.round.turn.phase).toBe('play');
    expect(fallbackMove(g, pid)).toBe(true);
    expect(g.round.players[pid].hand.length).toBe(before - 1);
    expect(g.round.discard.length).toBe(1);
  });

  it('beendete oder noch nicht begonnene Runde: nichts zu tun', () => {
    const g = testGame(3, 7);
    g.round.waiting = true;
    expect(fallbackMove(g, current(g))).toBe(false);
  });
});
