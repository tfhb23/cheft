import { describe, it, expect } from 'vitest';
import { applyAction } from '../engine/actions';
import { startNextRound } from '../engine/game';
import { decideAction } from './bot';
import { testGame, CardPool, setHand } from '../engine/testutil';
import { isJoker } from '../engine/cards';

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
    expect(all.length).toBe(128); // 4 Stufen × 8 Spielweisen × 4 Namen
    expect(new Set(all).size).toBe(128);
    const { makeRng } = await import('../engine/cards');
    const bots = resolveBots([{ level: 'random', style: 'random' }, { level: 'easy', style: 'cheft' }, { level: 'easy', style: 'cheft' }], makeRng(3));
    expect(new Set(bots.map((b) => b.name)).size).toBe(3);
  });
  it('Zufall wählt nie den Mastermind, der muss bewusst gewählt werden', async () => {
    const { resolveBots } = await import('./names');
    const { makeRng } = await import('../engine/cards');
    const rng = makeRng(9);
    const levels = new Set(Array.from({ length: 60 }, () => resolveBots([{ level: 'random', style: 'random' }], rng)[0].level));
    expect(levels.has('master')).toBe(false);
    expect(resolveBots([{ level: 'master', style: 'joker' }], rng)[0].level).toBe('master');
  });
});

describe('Joker beim Rauskommen mit Paaren', () => {
  /** Vier echte Paare, ein einzelner Karo König (Partner der Teppichkarte), zwei Joker; schon vom Stapel gezogen. */
  function situation(level: 'easy' | 'normal' | 'hard' | 'master') {
    const g = testGame(4, 11);
    const p = new CardPool();
    const me = g.round.starter;
    g.players[me].isBot = true;
    g.players[me].bot = { level, style: 'balanced' };
    g.round.players[me].turns = 3;
    g.round.players[me].mode = 'cheft';
    g.round.cheftAnnounced = true;
    g.round.carpet = p.take('DK');
    g.round.discard = [p.take('C2')];
    setHand(g, me, p.takeAll('CA', 'CA', 'H5', 'H5', 'S8', 'S8', 'D9', 'D9', 'DK', 'J', 'J', 'S3', 'H7', 'C10', 'D4'));
    g.round.turn = { ...g.round.turn, player: me, phase: 'play', drawSource: 'stock', drawnCardId: g.round.players[me].hand[14].id };
    return { g, me };
  }

  it('starke Bots warten auf die Teppichkarte, statt Joker in Paare zu stecken, und kommen dann mit echten Paaren raus', () => {
    for (const level of ['hard', 'master'] as const) {
      const { g, me } = situation(level);
      const wait = decideAction(g, me);
      expect(wait.kind).toBe('discard');
      if (wait.kind !== 'discard') continue;
      // Der Partner der Teppichkarte bleibt
      expect(g.round.players[me].hand.find((c) => c.id === wait.cardId)!.rank === 13 && g.round.players[me].hand.find((c) => c.id === wait.cardId)!.suit === 'D').toBe(false);
      expect(applyAction(g, me, wait).ok).toBe(true);
      g.round.turn = { ...g.round.turn, player: me, phase: 'draw', drawSource: null, drawnCardId: null };
      const draw = decideAction(g, me);
      expect(draw).toEqual({ kind: 'draw', source: 'carpet' });
      expect(applyAction(g, me, draw).ok).toBe(true);
      const open = decideAction(g, me);
      expect(open.kind).toBe('lay');
    }
  });

  it('gemütliche und normale Bots kommen sofort raus', () => {
    for (const level of ['easy', 'normal'] as const) {
      const { g, me } = situation(level);
      expect(decideAction(g, me).kind).toBe('lay');
    }
  });

  it('bei der Erstmeldung mit Paaren bleiben Joker auf der Hand, wenn echte Paare reichen', () => {
    const { g, me } = situation('hard');
    // Teppichkarte schon genommen: Der Partner liegt jetzt als echtes Paar vor
    g.round.carpet = null;
    const hand = g.round.players[me].hand;
    const k = hand.find((c) => c.suit === 'D' && c.rank === 13)!;
    hand.push({ id: 900, suit: 'D', rank: 13 });
    g.round.turn = { ...g.round.turn, mustPairWithId: 900 };
    const a = decideAction(g, me);
    expect(a.kind).toBe('lay');
    if (a.kind !== 'lay') return;
    const used = a.groups.flat().map((id) => g.round.players[me].hand.find((c) => c.id === id)!);
    expect(used.some((c) => c.id === k.id)).toBe(true);
    expect(used.filter(isJoker).length).toBe(0);
  });
});
