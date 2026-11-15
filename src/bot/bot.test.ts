import { describe, it, expect } from 'vitest';
import { applyAction } from '../engine/actions';
import { startNextRound } from '../engine/game';
import { decideAction } from './bot';
import { testGame } from '../engine/testutil';

describe('Bots spielen komplette Spiele regelkonform', () => {
  it('spielt 4 Spiele mit 3-4 Bots zu Ende', () => {
    for (let seed = 100; seed < 104; seed++) {
      const n = 3 + (seed % 2);
      const g = testGame(n, seed, { rounds: 3 });
      let guard = 0;
      while (!g.finished && guard++ < 20000) {
        if (g.round.ended) {
          startNextRound(g);
          g.round.waiting = false;
          continue;
        }
        const pid = g.round.turn.player;
        const a = decideAction(g, pid);
        const res = applyAction(g, pid, a);
        if (!res.ok) throw new Error(`Bot-Aktion ungültig: ${a.kind} -> ${res.error} (seed ${seed})`);
      }
      expect(g.finished).toBe(true);
      expect(g.history.length).toBe(3);
      // Karten bleiben vollständig
      const r = g.round;
      const total = r.stock.length + r.discard.length + (r.carpet ? 1 : 0) + r.players.reduce((s, p) => s + p.hand.length, 0) + r.melds.reduce((s, m) => s + m.cards.length, 0);
      expect(total).toBe(106);
    }
  });
  it('kommt in einer Stichprobe mindestens einmal raus', () => {
    let wins = 0;
    for (let seed = 200; seed < 212; seed++) {
      const g = testGame(4, seed, { rounds: 1 });
      let guard = 0;
      while (!g.finished && guard++ < 5000) {
        const pid = g.round.turn.player;
        const res = applyAction(g, pid, decideAction(g, pid));
        if (!res.ok) throw new Error(res.error);
      }
      if (g.history[0].winner !== null) wins++;
    }
    expect(wins).toBeGreaterThan(0);
  });
});

describe('Alle Bot-Rollen spielen regelkonform', () => {
  it('jede Stufe und Spielweise übersteht ein Spiel', async () => {
    const { LEVELS, STYLES } = await import('./names');
    let seed = 500;
    for (const level of LEVELS) {
      for (const style of STYLES) {
        const g = testGame(4, seed++, { rounds: 2 });
        g.players.forEach((p) => {
          if (p.isBot) p.bot = { level, style };
        });
        let guard = 0;
        while (!g.finished && guard++ < 20000) {
          if (g.round.ended) {
            startNextRound(g);
            g.round.waiting = false;
            continue;
          }
          const pid = g.round.turn.player;
          const a = decideAction(g, pid);
          const res = applyAction(g, pid, a);
          if (!res.ok) throw new Error(`Rolle ${level}/${style}: ${a.kind} -> ${res.error}`);
        }
        expect(g.finished).toBe(true);
      }
    }
  }, 60000);
  it('Namen sind eindeutig und Zufall löst auf', async () => {
    const { resolveBots, NAMES } = await import('./names');
    const all = Object.values(NAMES).flatMap((byStyle) => Object.values(byStyle).flat());
    expect(all.length).toBe(96);
    expect(new Set(all).size).toBe(96);
    const { makeRng } = await import('../engine/cards');
    const bots = resolveBots([{ level: 'random', style: 'random' }, { level: 'easy', style: 'cheft' }, { level: 'easy', style: 'cheft' }], makeRng(3));
    expect(new Set(bots.map((b) => b.name)).size).toBe(3);
  });
});
