import { describe, it, expect } from 'vitest';
import { applyAction } from '../engine/actions';
import { BotLevel, BotStyle, startNextRound } from '../engine/game';
import { decideAction, perceivedGroups } from './bot';
import { testGame, CardPool, setHand } from '../engine/testutil';
import { isJoker, makeDeck, makeRng } from '../engine/cards';
import { MEMORY, memoryFor, perceive } from './memory';
import { checkLay } from '../engine/game';
import { simulate } from './simulate';

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

  /** Ohne Wahrnehmungsfehler, damit die Regel allein geprüft wird. */
  const PERFECT = { handMiss: 0, tableMiss: 0 };

  it('mit Geduld (patient) warten Bots auf die Teppichkarte, statt Joker in Paare zu stecken, und kommen dann mit echten Paaren raus', () => {
    for (const level of ['easy', 'normal', 'hard', 'master'] as const) {
      const opts = { knobs: { patient: true }, memory: PERFECT };
      const { g, me } = situation(level);
      const wait = decideAction(g, me, opts);
      expect(wait.kind).toBe('discard');
      if (wait.kind !== 'discard') continue;
      // Der Partner der Teppichkarte bleibt
      const dropped = g.round.players[me].hand.find((c) => c.id === wait.cardId)!;
      expect(dropped.rank === 13 && dropped.suit === 'D').toBe(false);
      expect(applyAction(g, me, wait).ok).toBe(true);
      g.round.turn = { ...g.round.turn, player: me, phase: 'draw', drawSource: null, drawnCardId: null };
      const draw = decideAction(g, me, opts);
      expect(draw).toEqual({ kind: 'draw', source: 'carpet' });
      expect(applyAction(g, me, draw).ok).toBe(true);
      const open = decideAction(g, me, opts);
      expect(open.kind).toBe('lay');
    }
  });

  it('ohne Geduld (Standard aller Spielweisen) kommt jeder Bot sofort raus, die Stufe ändert daran nichts', () => {
    for (const level of ['easy', 'normal', 'hard', 'master'] as const) {
      const { g, me } = situation(level);
      expect(decideAction(g, me, { memory: PERFECT }).kind).toBe('lay');
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

// ---------------------------------------------------------------- Gedächtnis und Wahrnehmung im Spiel

describe('Das Gedächtnis ändert Entscheidungen', () => {
  // Beide Herz 6 liegen tief im Ablagestapel. Der Bot hält Herz 5 und Herz 7 (eine Lücke, die nur die 6 füllt).
  // Wer sich an die Abwürfe erinnert, weiß: Die Lücke ist tot. Wer sie vergessen hat, hofft weiter.
  const HAND_IDS = [4, 6, 63, 29, 25, 94, 37, 90, 35, 50, 62, 95, 44, 13, 17];
  const PILE_IDS = [5, 57, 26, 27, 28, 30, 31, 32, 33, 34, 36, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 51, 78, 79, 80, 81, 82, 83, 84, 85, 86];
  const H7 = 6;
  const PERFECT = { handMiss: 0, tableMiss: 0 };
  const FORGETFUL = { span: 0, spread: [1, 1] as [number, number], accuracy: 1, form: 0, tableMiss: 0, missExtra: 0, observe: 1, handMiss: 0 };

  function scenario(pileIds: number[]) {
    const deck = makeDeck();
    const g = testGame(4, 11);
    const me = g.round.starter;
    g.players[me].isBot = true;
    g.players[me].bot = { level: 'master', style: 'balanced' };
    g.round.players[me].turns = 3;
    const hand = HAND_IDS.map((id) => deck[id]);
    g.round.discard = pileIds.map((id) => deck[id]);
    g.round.discardLog = [];
    g.round.taken = [];
    g.round.carpet = null;
    setHand(g, me, hand);
    g.round.turn = { ...g.round.turn, player: me, phase: 'play', drawSource: 'stock', drawnCardId: hand[14].id };
    return { g, me, hand };
  }

  it('wer sich erinnert, wirft die tote Lücke ab; wer vergessen hat, behält sie', () => {
    const { g, me, hand } = scenario(PILE_IDS);
    const remembers = decideAction(g, me, { memory: PERFECT });
    const forgot = decideAction(g, me, { memory: FORGETFUL });
    expect(remembers).toEqual({ kind: 'discard', cardId: H7 });
    expect(forgot.kind).toBe('discard');
    if (forgot.kind !== 'discard') return;
    expect(forgot.cardId).not.toBe(H7);
    expect(hand.some((c) => c.id === forgot.cardId)).toBe(true);
    expect(applyAction(structuredClone(g), me, remembers).ok).toBe(true);
    expect(applyAction(structuredClone(g), me, forgot).ok).toBe(true);
  });
  it('Gegenprobe: liegen die Herz 6 nicht im Ablagestapel, behält auch der Mastermind die Lücke', () => {
    const { g, me } = scenario(PILE_IDS.filter((id) => id !== 5 && id !== 57));
    const a = decideAction(g, me, { memory: PERFECT });
    expect(a.kind).toBe('discard');
    if (a.kind === 'discard') expect(a.cardId).not.toBe(H7);
  });
  it('mit der Stufe statt einer Überschreibung: der Mastermind erinnert sich, Vergesslich vergisst die alten Abwürfe', () => {
    const { g, me } = scenario(PILE_IDS);
    // Der Stapel ist 31 und 32 Züge alt (4 Spieler: ~8 Runden), weit jenseits der Spanne von Vergesslich und Normal
    g.players[me].bot = { level: 'master', style: 'balanced' };
    expect(decideAction(g, me)).toEqual({ kind: 'discard', cardId: H7 });
    for (const level of ['easy', 'normal'] as const) {
      g.players[me].bot = { level, style: 'balanced' };
      const a = decideAction(g, me, { memory: { handMiss: 0, tableMiss: 0 } });
      expect(a.kind).toBe('discard');
      if (a.kind === 'discard') expect(a.cardId).not.toBe(H7);
    }
  });
});

describe('Wahrnehmung: reine Funktion des Zustands', () => {
  it('decideAction verändert den Zustand nicht und entscheidet für denselben Zustand immer gleich', () => {
    for (const level of ['easy', 'normal', 'hard', 'master'] as BotLevel[]) {
      let checked = 0;
      simulate({
        seed: 410 + checked,
        rounds: 2,
        seats: Array.from({ length: 4 }, () => ({ level, style: 'balanced' as BotStyle })),
        visit: (g, pid) => {
          if ((g.round.plies ?? 0) % 3 !== 0) return;
          const before = JSON.stringify(g);
          const a1 = decideAction(g, pid);
          const a2 = decideAction(g, pid);
          expect(a2).toEqual(a1);
          expect(JSON.stringify(g)).toBe(before);
          checked++;
        },
      });
      expect(checked).toBeGreaterThan(20);
    }
  });
  it('ein Spielstand ohne Zugzähler und Zeitstempel (aus einer älteren Version) funktioniert weiter', () => {
    for (const level of ['easy', 'normal', 'hard', 'master'] as BotLevel[]) {
      simulate({
        seed: 420,
        rounds: 1,
        seats: Array.from({ length: 3 }, () => ({ level, style: 'balanced' as BotStyle })),
        visit: (g, pid) => {
          if ((g.round.plies ?? 0) % 5 !== 0) return;
          const old = structuredClone(g);
          delete old.round.plies;
          old.round.taken.forEach((x) => delete x.at);
          old.round.discardLog = undefined;
          const a = decideAction(old, pid);
          expect(applyAction(old, pid, a).ok).toBe(true);
        },
      });
    }
  });
  it('Wahrnehmungsfehler wirken: Vergessliche entscheiden öfter anders als mit perfekter Wahrnehmung, der Mastermind nie', () => {
    const rate = (level: BotLevel) => {
      let states = 0;
      let diffs = 0;
      for (const seed of [430, 431, 432, 433]) {
        simulate({
          seed,
          rounds: 2,
          seats: Array.from({ length: 4 }, () => ({ level, style: 'balanced' as BotStyle })),
          visit: (g, pid) => {
            states++;
            const full = { span: Infinity, spread: [1, 1] as [number, number], accuracy: 1, form: 0, tableMiss: 0, missExtra: 0, observe: 1, handMiss: 0 };
            if (JSON.stringify(decideAction(g, pid)) !== JSON.stringify(decideAction(g, pid, { memory: full }))) diffs++;
          },
        });
      }
      return diffs / states;
    };
    const easy = rate('easy');
    const hard = rate('hard');
    expect(rate('master')).toBe(0);
    expect(easy).toBeGreaterThan(0.02);
    expect(easy).toBeLessThan(0.3); // die Bots spielen weiter vernünftig und nicht zufällig
    expect(hard).toBeLessThan(easy);
  }, 120000);
});

describe('Alle Stufen und Spielweisen in gemischten Runden', () => {
  const allLevels: BotLevel[] = ['easy', 'normal', 'hard', 'master'];
  const allStyles: BotStyle[] = ['balanced', 'sprinter', 'cheft', 'hand', 'blocker', 'counter', 'joker', 'gambler'];

  it('24 gemischte Spiele mit 3 bis 4 Bots bleiben regelkonform und enden (simulate wirft bei jeder ungültigen Aktion)', () => {
    for (let i = 0; i < 24; i++) {
      const rng = makeRng(5000 + i);
      const n = 3 + (i % 2);
      const seats = Array.from({ length: n }, () => ({ level: allLevels[Math.floor(rng() * 4)], style: allStyles[Math.floor(rng() * 8)] }));
      const res = simulate({ seed: 6000 + i, seats, rounds: 3 });
      expect(res.state.finished).toBe(true);
      expect(res.state.history.length).toBe(3);
      const r = res.state.round;
      const total = r.stock.length + r.discard.length + (r.carpet ? 1 : 0) + r.players.reduce((s, p) => s + p.hand.length, 0) + r.melds.reduce((s, m) => s + m.cards.length, 0);
      expect(total).toBe(106);
    }
  }, 120000);
  it('Tische mit lauter Vergesslichen (viele Übersehen-Fehler) enden ebenfalls regelkonform, auch bei Pflichtzügen', () => {
    for (let i = 0; i < 12; i++) {
      const n = 3 + (i % 2);
      const seats = Array.from({ length: n }, (_, k) => ({ level: 'easy' as BotLevel, style: allStyles[(i + k) % 8] }));
      // verschärft: Es wird deutlich öfter übersehen, als die Stufe es tut
      const harsh = { handMiss: 0.5, tableMiss: 0.4, missExtra: 2, observe: 0.1 };
      const res = simulate({ seed: 7000 + i, seats: seats.map((s) => ({ ...s, opts: { memory: harsh } })), rounds: 2 });
      expect(res.state.finished).toBe(true);
    }
  }, 120000);
  it('die Stufe ändert die Regler der Spielweise nicht (nur das Gedächtnis unterscheidet sie)', async () => {
    const { knobsFor } = await import('./bot');
    for (const style of allStyles) {
      const base = knobsFor({ level: 'normal', style });
      for (const level of allLevels) expect(knobsFor({ level, style })).toEqual(base);
    }
  });
});

describe('Zufall nach Gedächtnis gewichtet', () => {
  it('Vergesslich 40 %, Normal 40 %, Scharfsinnig 20 %, nie der Mastermind', async () => {
    const { resolveBots } = await import('./names');
    const rng = makeRng(77);
    const count: Record<string, number> = { easy: 0, normal: 0, hard: 0, master: 0 };
    const N = 6000;
    for (let i = 0; i < N; i++) count[resolveBots([{ level: 'random', style: 'balanced' }], rng)[0].level]++;
    expect(count.master).toBe(0);
    expect(count.easy / N).toBeGreaterThan(0.37);
    expect(count.easy / N).toBeLessThan(0.43);
    expect(count.normal / N).toBeGreaterThan(0.37);
    expect(count.normal / N).toBeLessThan(0.43);
    expect(count.hard / N).toBeGreaterThan(0.17);
    expect(count.hard / N).toBeLessThan(0.23);
  });
  it('bewusst gewählte Stufen bleiben unverändert', async () => {
    const { resolveBots } = await import('./names');
    const rng = makeRng(5);
    for (const level of ['easy', 'normal', 'hard', 'master'] as const) {
      expect(resolveBots([{ level, style: 'random' }], rng)[0].level).toBe(level);
    }
  });
  it('die Stufenwerte sind die vereinbarte Spezifikation', () => {
    expect(MEMORY.easy).toEqual({ span: 3, spread: [0, 2], accuracy: 0.75, form: 0.3, tableMiss: 0.12, missExtra: 2, observe: 0.4, handMiss: 0.4 });
    expect(MEMORY.normal).toEqual({ span: 5, spread: [0.3, 1.7], accuracy: 0.85, form: 0.2, tableMiss: 0.06, missExtra: 1, observe: 0.7, handMiss: 0.2 });
    expect(MEMORY.hard).toEqual({ span: 9, spread: [0.7, 1.3], accuracy: 0.93, form: 0.1, tableMiss: 0.02, missExtra: 0, observe: 0.9, handMiss: 0.07 });
  });
});

describe('Handüberblick: einzelne Kombinationen werden übersehen', () => {
  // Zwei Dreiersätze (30 + 30 Augen) und eine Folge (18 Augen): Zusammen 78, die Sätze allein reichen mit 60 für die 51.
  // Fehlt ein Satz, reicht der Rest nicht mehr; fehlt nur die Folge, bleibt eine gültige Erstmeldung.
  function setup(seed: number, level: 'easy' | 'normal' | 'hard' | 'master', t: number) {
    const g = testGame(4, seed);
    const p = new CardPool();
    const me = g.round.starter;
    g.players[me].isBot = true;
    g.players[me].bot = { level, style: 'balanced' };
    g.round.players[me].turns = t;
    const hand = p.takeAll('SK', 'HK', 'DK', 'S10', 'H10', 'D10', 'C5', 'C6', 'C7', 'H2', 'D4', 'S9', 'C3', 'H8', 'DA');
    setHand(g, me, hand);
    g.round.turn = { ...g.round.turn, player: me, phase: 'play', drawSource: 'stock', drawnCardId: hand[14].id };
    const ids = (a: number, b: number) => hand.slice(a, b).map((c) => c.id);
    const groups = [ids(0, 3), ids(3, 6), ids(6, 9)];
    return { g, me, groups };
  }
  const outcomes = (level: 'easy' | 'normal' | 'hard' | 'master', forced = false) => {
    const o = { full: 0, partial: 0, none: 0, invalid: 0, n: 0 };
    for (let seed = 1; seed <= 25; seed++) {
      for (let t = 0; t < 30; t++) {
        const { g, me, groups } = setup(seed * 3, level, t);
        const per = perceive(g, me, memoryFor(level), forced);
        const kept = perceivedGroups(g, me, groups, per, 1);
        o.n++;
        if (kept === null) o.none++;
        else {
          if (!checkLay(g, me, kept).ok) o.invalid++;
          if (kept.length === groups.length) o.full++;
          else o.partial++;
        }
      }
    }
    return o;
  };

  it('der Mastermind und Pflichtzüge sehen immer alles', () => {
    expect(outcomes('master')).toMatchObject({ full: 750, partial: 0, none: 0 });
    expect(outcomes('easy', true)).toMatchObject({ full: 750, partial: 0, none: 0 });
  });
  it('wer etwas übersieht, legt nie etwas Ungültiges aus: Entweder bleibt eine regelkonforme Erstmeldung oder er legt in diesem Zug nichts aus', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) expect(outcomes(level).invalid).toBe(0);
  });
  it('die einfache Folge fehlt, die Sätze reichen noch: manchmal eine Teil-Erstmeldung statt gar nichts', () => {
    const o = outcomes('easy');
    expect(o.partial).toBeGreaterThan(o.n * 0.1);
    expect(o.partial).toBeLessThan(o.n * 0.35);
    expect(o.none).toBeGreaterThan(o.n * 0.3); // fehlt ein Satz, reichen die Augen nicht mehr
    expect(o.full).toBeGreaterThan(o.n * 0.2);
    expect(o.full + o.partial + o.none).toBe(o.n);
  });
  it('je besser die Aufmerksamkeit, desto öfter sieht der Bot die ganze Erstmeldung', () => {
    const easy = outcomes('easy').full;
    const normal = outcomes('normal').full;
    const hard = outcomes('hard').full;
    expect(normal).toBeGreaterThan(easy);
    expect(hard).toBeGreaterThan(normal);
    expect(hard / 750).toBeGreaterThan(0.8);
  });
  it('die Folge wird öfter übersehen als ein Dreiersatz, und beide gemessen einzeln liegen nahe an der erwarteten Quote', () => {
    let missedRun = 0;
    let missedSet = 0;
    let n = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (let t = 0; t < 30; t++) {
        const { g, me, groups } = setup(seed * 7, 'normal', t);
        const per = perceive(g, me, memoryFor('normal'));
        // Eine Gruppe allein: ohne Ergebnis (null) bedeutet "übersehen"
        if (perceivedGroups(g, me, [groups[0]], per, 1) === null) missedSet++;
        if (perceivedGroups(g, me, [groups[2]], per, 1) === null) missedRun++;
        n++;
      }
    }
    expect(missedRun).toBeGreaterThan(missedSet * 1.3);
    expect(missedSet / n).toBeGreaterThan(0.04); // Normal: 20 % × (Satz ≈ 0,65) ≈ 13 %
    expect(missedSet / n).toBeLessThan(0.22);
    expect(missedRun / n).toBeGreaterThan(0.1); // 20 % × (Folge ≈ 0,98) ≈ 20 %
    expect(missedRun / n).toBeLessThan(0.32);
  });
});
