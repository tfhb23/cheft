import { describe, it, expect } from 'vitest';
import { applyAction } from '../engine/actions';
import { BotLevel, BotStyle, startNextRound } from '../engine/game';
import { rolePersona } from './roles';
import { decideAction, nextPlayerRisk, perceivedGroups, similarity } from './bot';
import { testGame, CardPool, setHand } from '../engine/testutil';
import { isJoker, makeDeck, makeRng } from '../engine/cards';
import { MEMORY, memoryFor, perceive } from './memory';
import { interpretMeld } from '../engine/melds';
import { checkLay } from '../engine/game';
import { simulate } from './simulate';

/**
 * Entscheidungs-Tests über Gedächtnis und Gegner-Gedächtnis prüfen die Wirkung einer Einzelheit und sollen nicht von der Rolle
 * (Wildcard wechselt jede Runde), den Vorlieben oder den neuen Standardwerten abhängen: reine Ausgewogene mit dem früheren Abwurfdruck.
 */
const PURE_PERSONA = rolePersona('balanced', { tastes: false, oppUse: 0, loyalty: 1, jitter: 0, tilt: 0 });
const LEGACY_KNOBS = { shedPre: 0.12, dangerOpenedOnly: false };
const decideLegacy = (g: Parameters<typeof decideAction>[0], pid: number, o: Parameters<typeof decideAction>[2] = {}) =>
  decideAction(g, pid, { persona: PURE_PERSONA, ...o, knobs: { ...LEGACY_KNOBS, ...o.knobs } });

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
    const { resolveBots } = await import('./names');
    const { ROLE_NAMES } = await import('./rolenames');
    const all = Object.values(ROLE_NAMES).flatMap((byRole) => Object.values(byRole).flat().map((x) => x.name));
    expect(all.length).toBeGreaterThanOrEqual(24 * 5); // 4 Gedächtnisse × 6 Rollen, je mindestens fünf Namen
    expect(new Set(all).size).toBe(all.length);
    const { makeRng } = await import('../engine/cards');
    const bots = resolveBots([{ level: 'random', style: 'random' }, { level: 'easy', style: 'pairs' }, { level: 'easy', style: 'pairs' }], makeRng(3));
    expect(new Set(bots.map((b) => b.name)).size).toBe(3);
  });
  it('Zufall wählt nie den Mastermind, der muss bewusst gewählt werden', async () => {
    const { resolveBots } = await import('./names');
    const { makeRng } = await import('../engine/cards');
    const rng = makeRng(9);
    const levels = new Set(Array.from({ length: 60 }, () => resolveBots([{ level: 'random', style: 'random' }], rng)[0].level));
    expect(levels.has('master')).toBe(false);
    expect(resolveBots([{ level: 'master', style: 'cunning' }], rng)[0].level).toBe('master');
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
    const remembers = decideLegacy(g, me, { memory: PERFECT });
    const forgot = decideLegacy(g, me, { memory: FORGETFUL });
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
    const a = decideLegacy(g, me, { memory: PERFECT });
    expect(a.kind).toBe('discard');
    if (a.kind === 'discard') expect(a.cardId).not.toBe(H7);
  });
  it('mit der Stufe statt einer Überschreibung: der Mastermind erinnert sich, Vergesslich vergisst die alten Abwürfe', () => {
    const { g, me } = scenario(PILE_IDS);
    // Der Stapel ist 31 und 32 Züge alt (4 Spieler: ~8 Runden), weit jenseits der Spanne von Vergesslich und Normal
    g.players[me].bot = { level: 'master', style: 'balanced' };
    expect(decideLegacy(g, me)).toEqual({ kind: 'discard', cardId: H7 });
    for (const level of ['easy', 'normal'] as const) {
      g.players[me].bot = { level, style: 'balanced' };
      const a = decideLegacy(g, me, { memory: { handMiss: 0, tableMiss: 0 } });
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
          const a1 = decideLegacy(g, pid);
          const a2 = decideLegacy(g, pid);
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
          const a = decideLegacy(old, pid);
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
            if (JSON.stringify(decideLegacy(g, pid)) !== JSON.stringify(decideLegacy(g, pid, { memory: full }))) diffs++;
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
  const allStyles: BotStyle[] = ['balanced', 'early', 'cunning', 'pairs', 'gambler', 'wildcard'];

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
    expect(MEMORY.easy).toEqual({ span: 3, spread: [0, 2], accuracy: 0.75, form: 0.3, tableMiss: 0.08, missExtra: 2, observe: 0.4, handMiss: 0.2, noise: 1.5, oppObserve: 0, oppDetail: 0, oppSpan: 0, oppAccuracy: 0.6 });
    expect(MEMORY.normal).toEqual({ span: 5, spread: [0.3, 1.7], accuracy: 0.85, form: 0.2, tableMiss: 0.04, missExtra: 1, observe: 0.7, handMiss: 0.12, noise: 0.9, oppObserve: 0.6, oppDetail: 0.2, oppSpan: 3, oppAccuracy: 0.75 });
    expect(MEMORY.hard).toEqual({ span: 9, spread: [0.7, 1.3], accuracy: 0.93, form: 0.1, tableMiss: 0.02, missExtra: 0, observe: 0.9, handMiss: 0.06, noise: 0.6, oppObserve: 0.85, oppDetail: 0.6, oppSpan: 5, oppAccuracy: 0.9 });
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
    expect(o.partial).toBeGreaterThan(o.n * 0.08);
    expect(o.partial).toBeLessThan(o.n * 0.28);
    expect(o.none).toBeGreaterThan(o.n * 0.15); // fehlt ein Satz, reichen die Augen nicht mehr
    expect(o.none).toBeLessThan(o.n * 0.4);
    expect(o.full).toBeGreaterThan(o.n * 0.4);
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
    expect(missedSet / n).toBeGreaterThan(0.03); // Normal: 12 % × (Satz ≈ 0,65) ≈ 8 %
    expect(missedSet / n).toBeLessThan(0.14);
    expect(missedRun / n).toBeGreaterThan(0.07); // 12 % × (Folge ≈ 0,98) ≈ 12 %
    expect(missedRun / n).toBeLessThan(0.2);
  });
});

describe('Wer hinten liegt, spielt mutiger (Hand, früher Cheft)', () => {
  const PERFECT = { handMiss: 0, tableMiss: 0 };
  /** Ein Bot in der Spielphase, der Erstmeldung noch nicht gelegt hat. `behind`: Strafpunkte Rückstand auf die anderen. */
  function scene(specs: string[], behind: number, level: 'easy' | 'normal' | 'hard' | 'master' = 'master', turns = 4) {
    const g = testGame(4, 31, { rounds: 5 });
    const p = new CardPool();
    const me = g.round.starter;
    g.players[me].isBot = true;
    g.players[me].bot = { level, style: 'balanced' };
    g.round.players[me].turns = turns;
    g.totals = g.totals.map((_, i) => (i === me ? behind : 0));
    const hand = p.takeAll(...specs);
    setHand(g, me, hand);
    g.round.turn = { ...g.round.turn, player: me, phase: 'play', drawSource: 'stock', drawnCardId: hand[hand.length - 1].id };
    return { g, me, hand };
  }
  // Vier Paare plus Einzelkarten, keine Rommé-Erstmeldung möglich
  const PAIRS = ['HK', 'HK', 'S9', 'S9', 'D5', 'D5', 'C3', 'C3', 'H2', 'D8', 'S4', 'C10', 'H6', 'D12', 'S1'];
  // Drei Sätze und eine Folge (93 Augen mit 12 Karten); drei Karten bleiben: Hand in Reichweite
  const NEAR_HAND = ['SK', 'HK', 'DK', 'SD', 'HD', 'DD', 'S7', 'H7', 'D7', 'H3', 'H4', 'H5', 'C2', 'D9', 'S8'];

  it('mit vier Paaren sagt ein Zurückliegender Cheft an, ein Gleichauf-Bot nicht', () => {
    const behind = scene(PAIRS, 120);
    expect(decideLegacy(behind.g, behind.me, { memory: PERFECT })).toEqual({ kind: 'declareCheft' });
    const even = scene(PAIRS, 0);
    expect(decideLegacy(even.g, even.me, { memory: PERFECT }).kind).not.toBe('declareCheft');
  });
  it('der mutige Modus lässt sich abschalten (Gegenprobe)', () => {
    const behind = scene(PAIRS, 120);
    expect(decideLegacy(behind.g, behind.me, { memory: PERFECT, knobs: { bold: false } }).kind).not.toBe('declareCheft');
  });
  it('auch der Mastermind wagt das: Der mutige Modus hängt am Tabellenstand, nicht am Gedächtnis', () => {
    for (const level of ['easy', 'normal', 'hard', 'master'] as const) {
      const s = scene(PAIRS, 120, level);
      expect(decideLegacy(s.g, s.me, { memory: PERFECT }).kind).toBe('declareCheft');
    }
  });
  it('nur vier Paare reichen nicht zu Cheft für einen, der vorn liegt, und drei Paare auch nicht für den Zurückliegenden', () => {
    const three = scene(['HK', 'HK', 'S9', 'S9', 'D5', 'D5', 'C3', 'H2', 'D8', 'S4', 'C10', 'H6', 'D12', 'S1', 'C7'], 120);
    expect(decideLegacy(three.g, three.me, { memory: PERFECT }).kind).not.toBe('declareCheft');
  });
  it('wer hinten liegt und fast eine Hand hat, wartet auf die Hand, statt mit 12 von 15 Karten rauszukommen', () => {
    // Ohne die Hand-Chance der Abwägung (wHand 0), damit nur die Hand-Jagd des mutigen Modus den Unterschied macht
    const isolate = { tuning: { wHand: 0 } };
    const behind = scene(NEAR_HAND, 120);
    expect(decideLegacy(behind.g, behind.me, { memory: PERFECT, knobs: isolate }).kind).toBe('discard');
    // Gegenprobe: gleichauf legt er die Erstmeldung sofort (93 Augen)
    const even = scene(NEAR_HAND, 0, 'master', 1);
    expect(decideLegacy(even.g, even.me, { memory: PERFECT, knobs: isolate }).kind).toBe('lay');
    // und ohne mutigen Modus legt auch der Zurückliegende
    const off = scene(NEAR_HAND, 120);
    expect(decideLegacy(off.g, off.me, { memory: PERFECT, knobs: { ...isolate, bold: false } }).kind).toBe('lay');
  });
  it('auch gleichauf wartet ein Bot kurz, wenn die Chance auf eine Hand den Zeitdruck überwiegt (Abwägung); ohne Gewicht auf die Hand legt er', () => {
    // Restkarten: Kreuz 2 und das verbundene Paar Herz 9, Herz 10. Mit Herz 8 oder Herz Bube wäre alles bis auf eine Karte in Kombinationen.
    const CONNECTED = ['SK', 'HK', 'DK', 'SD', 'HD', 'DD', 'S7', 'H7', 'D7', 'H3', 'H4', 'H5', 'C2', 'H9', 'H10'];
    const wait = scene(CONNECTED, 0, 'master', 1);
    expect(decideLegacy(wait.g, wait.me, { memory: PERFECT, knobs: { tuning: { wHand: 6 } } }).kind).toBe('discard');
    const go = scene(CONNECTED, 0, 'master', 1);
    expect(decideLegacy(go.g, go.me, { memory: PERFECT, knobs: { tuning: { wHand: 0 } } }).kind).toBe('lay');
    // Ohne verbundenes Paar unter den Restkarten gibt es keine Hand-Chance: Auch mit großem Gewicht wird gelegt
    const none = scene(NEAR_HAND, 0, 'master', 1);
    expect(decideLegacy(none.g, none.me, { memory: PERFECT, knobs: { tuning: { wHand: 6 } } }).kind).toBe('lay');
  });
  it('hat ein Gegner schon die Erstmeldung gelegt, wartet auch der Mutige nicht auf die Hand', () => {
    const s = scene(NEAR_HAND, 120);
    s.g.round.players[(s.me + 1) % 4].opened = true;
    s.g.round.lastRommeOpening = 55;
    expect(decideLegacy(s.g, s.me, { memory: PERFECT }).kind).toBe('lay');
  });
  it('alle Rollen spielen mit dem mutigen Modus regelkonform durch (große Rückstände von Anfang an)', () => {
    for (let i = 0; i < 8; i++) {
      const n = 3 + (i % 2);
      const seats = Array.from({ length: n }, (_, k) => ({ level: (['easy', 'normal', 'hard', 'master'] as const)[(i + k) % 4], style: 'balanced' as BotStyle }));
      const res = simulate({
        seed: 8100 + i,
        seats,
        rounds: 3,
        visit: (g) => {
          // Von Anfang an klare Unterschiede im Tabellenstand, damit der mutige Modus oft greift
          if (g.round.no === 1 && (g.round.plies ?? 0) === 0) g.totals = g.totals.map((_, j) => (j === 0 ? 150 : 0));
        },
      });
      expect(res.state.finished).toBe(true);
    }
  }, 120000);
});

describe('Teppichkarte: Bots paaren sie nur mit der genau gleichen Karte, nie mit einem Joker', () => {
  const PERFECT = { handMiss: 0, tableMiss: 0 };
  /** Cheft-Spieler in der Ziehphase; Teppichkarte ist Herz Dame, die Ablage ist leer, der Stapel voll. */
  function drawScene(specs: string[]) {
    const g = testGame(4, 41, { rounds: 5 });
    const p = new CardPool();
    const me = g.round.starter;
    g.players[me].isBot = true;
    g.players[me].bot = { level: 'master', style: 'balanced' };
    g.round.carpet = p.take('HD');
    g.round.discard = [];
    g.round.players[me].mode = 'cheft';
    g.round.cheftAnnounced = true;
    g.round.players[me].turns = 3;
    const hand = p.takeAll(...specs);
    setHand(g, me, hand);
    g.round.turn = { ...g.round.turn, player: me, phase: 'draw', drawSource: null, drawnCardId: null };
    return { g, me, hand };
  }
  // vier echte Paare, ein Joker, zwei Einzelkarten (der Joker bräuchte nur irgendeine Karte zum fünften Paar)
  const NO_TWIN = ['J', 'C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'H5', 'H8', 'S3', 'S4', 'D10'];
  const WITH_TWIN = ['HD', 'C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'J', 'H5', 'H8', 'S3', 'S4'];

  it('mit einem Joker, aber ohne die zweite Herz Dame, zieht der Bot die Teppichkarte nicht (er zieht vom Stapel)', () => {
    const { g, me } = drawScene(NO_TWIN);
    expect(decideLegacy(g, me, { memory: PERFECT })).toEqual({ kind: 'draw', source: 'stock' });
  });
  it('mit der zweiten Herz Dame und vier weiteren Paaren nimmt er sie und legt sie mit genau dieser Karte', () => {
    const { g, me } = drawScene(WITH_TWIN);
    const draw = decideLegacy(g, me, { memory: PERFECT });
    expect(draw).toEqual({ kind: 'draw', source: 'carpet' });
    expect(applyAction(g, me, draw).ok).toBe(true);
    const lay = decideLegacy(g, me, { memory: PERFECT });
    expect(lay.kind).toBe('lay');
    if (lay.kind !== 'lay') return;
    const hand = g.round.players[me].hand;
    const carpetPair = lay.groups.find((grp) => grp.includes(g.round.turn.mustPairWithId!))!;
    expect(carpetPair.length).toBe(2);
    const cards = carpetPair.map((id) => hand.find((c) => c.id === id)!);
    expect(cards.some(isJoker)).toBe(false);
    expect(cards[0].suit).toBe(cards[1].suit);
    expect(cards[0].rank).toBe(cards[1].rank);
    expect(applyAction(g, me, lay).ok).toBe(true);
  });
  it('ein ausgelegter Cheft-Bot mit fünf Paaren nimmt die Teppichkarte, wenn er Zwilling und ein weiteres Paar hat, und beendet die Runde', () => {
    const { g, me } = drawScene(['HD', 'C7', 'C7', 'S3']);
    const pr = g.round.players[me];
    pr.opened = true;
    pr.pairsLaid = 5;
    const draw = decideLegacy(g, me, { memory: PERFECT });
    expect(draw).toEqual({ kind: 'draw', source: 'carpet' });
    expect(applyAction(g, me, draw).ok).toBe(true);
    const lay = decideLegacy(g, me, { memory: PERFECT });
    expect(lay.kind).toBe('lay');
    expect(applyAction(g, me, lay).ok).toBe(true);
    const out = decideLegacy(g, me, { memory: PERFECT });
    expect(out.kind).toBe('discard');
    expect(applyAction(g, me, out).ok).toBe(true);
    expect(g.round.ended).toBe(true);
    expect(g.round.result!.winner).toBe(me);
  });
  it('das gilt für jede Stufe, Spielweise und auch in einem Pflichtzug (mit Joker auf der Hand)', () => {
    for (const level of ['easy', 'normal', 'hard', 'master'] as const) {
      for (const style of ['balanced', 'pairs', 'gambler', 'cunning'] as const) {
        const { g, me } = drawScene(WITH_TWIN);
        g.players[me].bot = { level, style };
        const draw = decideLegacy(g, me);
        if (draw.kind !== 'draw' || draw.source !== 'carpet') continue; // ein Bot darf auch vom Stapel ziehen
        expect(applyAction(g, me, draw).ok).toBe(true);
        const lay = decideLegacy(g, me);
        expect(lay.kind).toBe('lay');
        expect(applyAction(g, me, lay).ok).toBe(true);
        const pair = g.round.melds.find((m) => m.type === 'pair' && m.cards.some((c) => c.id === g.round.turn.mustPairWithId));
        expect(pair).toBeDefined();
        expect(pair!.cards.some(isJoker)).toBe(false);
      }
    }
  });
  it('in vielen echten Spielen liegt die Teppichkarte nie mit einem Joker in einem Paar, ein Bot bleibt nie hängen', () => {
    let carpetTakes = 0;
    let checkedPairs = 0;
    for (let i = 0; i < 40; i++) {
      const seats = Array.from({ length: 4 }, (_, k) => ({
        level: (['easy', 'normal', 'hard', 'master'] as const)[(i + k) % 4],
        style: (['pairs', 'gambler', 'cunning', 'balanced'] as const)[(i + 2 * k) % 4] as BotStyle,
      }));
      const carpetIds = new Set<number>();
      const check = (g: Parameters<typeof decideAction>[0]) => {
        for (const m of g.round.melds) {
          if (m.type === 'pair' && m.cards.some((c) => carpetIds.has(c.id))) {
            checkedPairs++;
            expect(m.cards.some(isJoker)).toBe(false);
          }
        }
      };
      simulate({
        seed: 9100 + i,
        seats,
        rounds: 3,
        visit: (g) => {
          const id = g.round.turn.mustPairWithId;
          if (id !== null && g.round.turn.drawSource === 'carpet' && !carpetIds.has(id)) {
            carpetIds.add(id);
            carpetTakes++;
          }
          check(g);
        },
      });
    }
    // Es muss auch wirklich Teppichkarten gegeben haben, sonst prüft der Test nichts
    expect(carpetTakes).toBeGreaterThan(0);
    expect(checkedPairs).toBeGreaterThan(0);
  }, 180000);
});

describe('Kein Mogeln: Die Bots kennen nur, was ein Spieler am Tisch sehen kann', () => {
  /** Vertauscht die verdeckten Karten (fremde Hände und Nachziehstapel) untereinander, die Anzahlen bleiben gleich. */
  function reshuffleHidden(g: ReturnType<typeof testGame>, pid: number, rng: () => number): ReturnType<typeof testGame> {
    const alt = structuredClone(g);
    const r = alt.round;
    const holders = r.players.map((p, i) => ({ i, p })).filter((x) => x.i !== pid);
    const pool = [...holders.flatMap((x) => x.p.hand), ...r.stock];
    for (let k = pool.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [pool[k], pool[j]] = [pool[j], pool[k]];
    }
    let at = 0;
    for (const { p } of holders) {
      const n = p.hand.length;
      p.hand = pool.slice(at, at + n);
      at += n;
    }
    r.stock = pool.slice(at);
    return alt;
  }

  it('fremde Handkarten und die Reihenfolge des Stapels zu vertauschen ändert keine Entscheidung, auf keiner Stufe', () => {
    let checked = 0;
    for (const level of ['easy', 'normal', 'hard', 'master'] as const) {
      const rng = makeRng(level.length * 101);
      simulate({
        seed: 9300 + level.length,
        rounds: 2,
        seats: Array.from({ length: 4 }, () => ({ level, style: 'balanced' as BotStyle })),
        visit: (g, pid) => {
          if ((g.round.plies ?? 0) % 3 !== 0) return;
          const alt = reshuffleHidden(g, pid, rng);
          expect(decideAction(alt, pid)).toEqual(decideAction(g, pid));
          checked++;
        },
      });
    }
    expect(checked).toBeGreaterThan(100);
  }, 180000);

  it('auch alle Spielweisen und der mutige Modus (großer Rückstand) schauen nicht in verdeckte Karten', () => {
    const styles: BotStyle[] = ['balanced', 'early', 'cunning', 'pairs', 'gambler', 'wildcard'];
    let checked = 0;
    for (const style of styles) {
      const rng = makeRng(style.length * 37);
      simulate({
        seed: 9400 + style.length,
        rounds: 2,
        seats: Array.from({ length: 4 }, (_, k) => ({ level: (['easy', 'normal', 'hard', 'master'] as const)[k], style })),
        visit: (g, pid) => {
          if (g.round.no === 1 && (g.round.plies ?? 0) === 0) g.totals = g.totals.map((_, j) => (j === 0 ? 150 : 0));
          if ((g.round.plies ?? 0) % 4 !== 1) return;
          const alt = reshuffleHidden(g, pid, rng);
          expect(decideAction(alt, pid)).toEqual(decideAction(g, pid));
          checked++;
        },
      });
    }
    expect(checked).toBeGreaterThan(80);
  }, 180000);

  it('die eigene Hand dagegen zählt: Wird sie verändert, kann die Entscheidung anders ausfallen (Gegenprobe, der Test ist nicht blind)', () => {
    let differs = 0;
    const rng = makeRng(5);
    simulate({
      seed: 9500,
      rounds: 2,
      seats: Array.from({ length: 4 }, () => ({ level: 'master' as const, style: 'balanced' as BotStyle })),
      visit: (g, pid) => {
        if ((g.round.plies ?? 0) % 2 !== 0) return;
        // eigene Hand mit der eines Mitspielers tauschen
        const alt = structuredClone(g);
        const other = (pid + 1) % 4;
        [alt.round.players[pid].hand, alt.round.players[other].hand] = [alt.round.players[other].hand, alt.round.players[pid].hand];
        void rng;
        const a = decideAction(g, pid);
        let b;
        try {
          b = decideAction(alt, pid);
        } catch {
          b = null;
        }
        if (JSON.stringify(a) !== JSON.stringify(b)) differs++;
      },
    });
    expect(differs).toBeGreaterThan(5);
  }, 120000);

  it('ein aus dem Speicher zurückgeholter Spielstand (JSON-Kopie) ergibt dieselbe Entscheidung', () => {
    let checked = 0;
    simulate({
      seed: 9600,
      rounds: 2,
      seats: Array.from({ length: 4 }, (_, k) => ({ level: (['easy', 'normal', 'hard', 'master'] as const)[k], style: 'balanced' as BotStyle })),
      visit: (g, pid) => {
        if ((g.round.plies ?? 0) % 3 !== 0) return;
        const restored = JSON.parse(JSON.stringify(g));
        expect(decideAction(restored, pid)).toEqual(decideAction(g, pid));
        checked++;
      },
    });
    expect(checked).toBeGreaterThan(30);
  }, 120000);
});

describe('Handüberblick bei Paar-Erstmeldungen (Cheft): ganz oder gar nicht, mit einem Wurf', () => {
  // Fünf Paare, eines davon mit Joker: nur alle fünf zusammen sind eine gültige Erstmeldung
  const HAND = ['HK', 'HK', 'S9', 'S9', 'D5', 'D5', 'C3', 'C3', 'J', 'H2', 'D8', 'S4', 'C10', 'H6', 'D12'];
  function setup(seed: number, level: 'easy' | 'normal' | 'hard' | 'master', t: number) {
    const g = testGame(4, seed);
    const p = new CardPool();
    const me = g.round.starter;
    g.round.players[me].turns = t;
    g.round.players[me].mode = 'cheft';
    const hand = p.takeAll(...HAND);
    setHand(g, me, hand);
    g.round.turn = { ...g.round.turn, player: me, phase: 'play', drawSource: 'stock', drawnCardId: hand[14].id };
    const groups = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]].map((ix) => ix.map((i) => hand[i].id));
    return { g, me, groups, per: perceive(g, me, memoryFor(level)) };
  }
  const run = (level: 'easy' | 'normal' | 'hard' | 'master') => {
    let missed = 0;
    let partial = 0;
    let n = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (let t = 0; t < 30; t++) {
        const { g, me, groups, per } = setup(seed * 5, level, t);
        const kept = perceivedGroups(g, me, groups, per, 1);
        n++;
        if (kept === null) missed++;
        else if (kept.length !== groups.length) partial++;
      }
    }
    return { missed: missed / n, partial };
  };

  it('nie teilweise: Entweder sieht der Bot alle fünf Paare oder er legt in diesem Zug nichts', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) expect(run(level).partial).toBe(0);
  });
  it('die Fehlerquote liegt bei der Grundchance mal der mittleren Schwierigkeit (Normal ≈ 10 %, nicht ≈ 40 % wie bei fünf Einzelwürfen)', () => {
    const normal = run('normal').missed;
    expect(normal).toBeGreaterThan(0.03);
    expect(normal).toBeLessThan(0.09);
    expect(run('easy').missed).toBeGreaterThan(0.07);
    expect(run('easy').missed).toBeLessThan(0.16);
    expect(run('hard').missed).toBeLessThan(0.06);
  });
  it('der Mastermind und Pflichtzüge übersehen auch hier nichts', () => {
    expect(run('master').missed).toBe(0);
    const { g, me, groups } = setup(7, 'easy', 0);
    expect(perceivedGroups(g, me, groups, perceive(g, me, memoryFor('easy'), true), 1)).toEqual(groups);
  });
});

describe('Gegner-Gedächtnis: Was wirft man dem nächsten Spieler hin?', () => {
  const deck = makeDeck();
  const PERFECT = { handMiss: 0, tableMiss: 0 };
  const HAND_IDS = [14, 54, 37, 63, 65, 78, 41, 87, 56, 22, 84, 85, 32, 93, 1];
  const X = 65; // Karo Ass: ohne Hinweis die Abwurfkarte
  const TWIN = 13; // Karo Ass, die andere Kopie

  /** Der Bot (Rommé, schon draußen) hat die Hand oben; der Nächste ist ein Cheft-Spieler. */
  function scene() {
    const g = testGame(4, 21);
    const me = g.round.starter;
    const next = (me + 1) % 4;
    g.players[me].bot = { level: 'master', style: 'balanced' };
    g.round.players[me].turns = 5;
    g.round.players[me].opened = true;
    g.round.players[next].mode = 'cheft';
    g.round.cheftAnnounced = true;
    const hand = HAND_IDS.map((id) => deck[id]);
    setHand(g, me, hand);
    g.round.turn = { ...g.round.turn, player: me, phase: 'play', drawSource: 'stock', drawnCardId: hand[14].id };
    g.round.discard = [];
    g.round.taken = [];
    g.round.discardedBy = {};
    g.round.discardLog = [];
    g.round.plies = 6;
    return { g, me, next };
  }
  const discardOf = (g: ReturnType<typeof testGame>, me: number, knobs: object = {}) => {
    const a = decideLegacy(g, me, { memory: PERFECT, knobs });
    expect(a.kind).toBe('discard');
    return a.kind === 'discard' ? a.cardId : -1;
  };

  it('ohne Hinweis wirft der Bot Karo Ass ab', () => {
    const { g, me } = scene();
    expect(discardOf(g, me)).toBe(X);
  });
  it('hat der nächste Spieler (Cheft) die andere Kopie genommen, behält der Bot sie und wirft etwas anderes ab', () => {
    const { g, me, next } = scene();
    g.round.taken = [{ player: next, card: deck[TWIN], at: 5 }];
    expect(discardOf(g, me)).not.toBe(X);
  });
  it('hat er sie danach selbst wieder abgeworfen, ist das Interesse weg: Der Bot wirft Karo Ass wieder ab', () => {
    const { g, me, next } = scene();
    g.round.taken = [{ player: next, card: deck[TWIN], at: 3 }];
    g.round.discard = [deck[TWIN]];
    g.round.discardedBy = { [TWIN]: next };
    g.round.discardLog = [{ player: next, card: deck[TWIN] }];
    expect(discardOf(g, me)).toBe(X);
  });
  it('ein Hinweis, der nur für den Spieler dahinter gilt, ändert nichts: Nur der nächste Spieler bekommt den Abwurf', () => {
    const { g, me, next } = scene();
    g.round.taken = [{ player: (next + 1) % 4, card: deck[TWIN], at: 5 }];
    expect(discardOf(g, me)).toBe(X);
  });
});

describe('nextPlayerRisk: Wahrscheinlichkeit, dass der Nächste die Karte nimmt', () => {
  const deck = makeDeck();
  const card = (spec: string, nth = 0) => deck.filter((c) => (c.suit === 'J' ? 'J' : `${c.suit}${c.rank}`) === spec)[nth];
  const exact = (spec: string) => [{ suit: spec[0] as 'H', rank: Number(spec.slice(1)) }];
  function world(opts: { me: 'romme' | 'cheft'; next: 'romme' | 'cheft'; nextOpened?: boolean }) {
    const g = testGame(4, 5);
    const me = g.round.starter;
    const next = (me + 1) % 4;
    g.round.players[me].mode = opts.me;
    g.round.players[next].mode = opts.next;
    g.round.players[next].opened = !!opts.nextOpened;
    return { g, me, next };
  }

  it('similarity: genau diese Karte 1, gleicher Wert oder gleiche Farbe in Reichweite 4/9, sonst 0; Joker zählen nicht', () => {
    expect(similarity(card('H9'), exact('H9'))).toBe(1);
    expect(similarity(card('S9'), exact('H9'))).toBeCloseTo(4 / 9, 9);
    expect(similarity(card('H11'), exact('H9'))).toBeCloseTo(4 / 9, 9);
    expect(similarity(card('H12'), exact('H9'))).toBe(0);
    expect(similarity(card('S2'), exact('H9'))).toBe(0);
    expect(similarity(card('H9'), [{ suit: 'J', rank: 0 }])).toBe(0);
    // verschwommene Erinnerung: Mittel über die Kandidaten
    expect(similarity(card('H9'), [{ suit: 'H', rank: 9 }, { suit: 'D', rank: 9 }])).toBeCloseTo((1 + 4 / 9) / 2, 9);
    expect(similarity(card('H9'), [])).toBe(0);
  });
  it('von einem Cheft-Spieler nimmt ein Rommé-Spieler nie eine Karte (Regel): Risiko 0', () => {
    const { g, me, next } = world({ me: 'cheft', next: 'romme' });
    expect(nextPlayerRisk(g, me, card('H9'), [{ player: next, kind: 'take', cands: exact('H9') }])).toBe(0);
  });
  it('ein Cheft-Spieler nimmt frei: volles Risiko für die Karte, die er gesammelt hat', () => {
    const { g, me, next } = world({ me: 'romme', next: 'cheft' });
    expect(nextPlayerRisk(g, me, card('H9'), [{ player: next, kind: 'take', cands: exact('H9') }])).toBe(1);
    expect(nextPlayerRisk(g, me, card('S9'), [{ player: next, kind: 'take', cands: exact('H9') }])).toBeCloseTo(4 / 9, 9);
    expect(nextPlayerRisk(g, me, card('C2'), [{ player: next, kind: 'take', cands: exact('H9') }])).toBe(0);
  });
  it('ein Rommé-Spieler nimmt nur, wenn er die Karte sofort anlegen oder damit rauskommen kann: draußen 0,7, sonst 0,2', () => {
    const sig = (next: number) => [{ player: next, kind: 'take' as const, cands: exact('H9') }];
    const a = world({ me: 'romme', next: 'romme', nextOpened: true });
    expect(nextPlayerRisk(a.g, a.me, card('H9'), sig(a.next))).toBeCloseTo(0.7, 9);
    const b = world({ me: 'romme', next: 'romme', nextOpened: false });
    expect(nextPlayerRisk(b.g, b.me, card('H9'), sig(b.next))).toBeCloseTo(0.2, 9);
  });
  it('ohne Hinweise ist das Risiko 0; Hinweise anderer Spieler zählen nicht', () => {
    const { g, me, next } = world({ me: 'romme', next: 'cheft' });
    expect(nextPlayerRisk(g, me, card('H9'), [])).toBe(0);
    expect(nextPlayerRisk(g, me, card('H9'), [{ player: (next + 1) % 4, kind: 'take', cands: exact('H9') }])).toBe(0);
  });
  it('mehrere Hinweise addieren sich, begrenzt auf 1', () => {
    const { g, me, next } = world({ me: 'romme', next: 'cheft' });
    const sigs = [
      { player: next, kind: 'take' as const, cands: exact('H9') },
      { player: next, kind: 'take' as const, cands: exact('H9') },
    ];
    expect(nextPlayerRisk(g, me, card('H9'), sigs)).toBe(1);
  });
  it('was er abgeworfen oder liegen gelassen hat, senkt das Risiko (liegen lassen zählt bei einem, der frei nehmen darf, stärker)', () => {
    const { g, me, next } = world({ me: 'romme', next: 'cheft' });
    const take = { player: next, kind: 'take' as const, cands: exact('H9') };
    const base = nextPlayerRisk(g, me, card('H9'), [take]);
    const thrown = nextPlayerRisk(g, me, card('H9'), [take, { player: next, kind: 'throw', cands: exact('H9') }]);
    const declined = nextPlayerRisk(g, me, card('H9'), [take, { player: next, kind: 'decline', cands: exact('H9') }]);
    expect(thrown).toBeCloseTo(0.5, 9);
    expect(declined).toBeCloseTo(0.4, 9);
    expect(base).toBeGreaterThan(thrown);
    expect(thrown).toBeGreaterThan(declined);
    // Nur Gegenhinweise ohne "nimmt" ergeben nie ein negatives Risiko
    expect(nextPlayerRisk(g, me, card('H9'), [{ player: next, kind: 'throw', cands: exact('H9') }])).toBe(0);
    // Ein Rommé-Spieler, der nicht frei nehmen darf, "lässt" weniger aussagekräftig liegen (0,2 statt 0,6)
    const w = world({ me: 'romme', next: 'romme', nextOpened: false });
    const t2 = { player: w.next, kind: 'take' as const, cands: exact('H9') };
    const d2 = { player: w.next, kind: 'decline' as const, cands: exact('H9') };
    expect(nextPlayerRisk(w.g, w.me, card('H9'), [t2, d2])).toBeCloseTo(0.2 * (1 - 0.2), 9);
  });
});

describe('Genommene Ablagekarte, die nur durch Klauen verwendbar ist', () => {
  const deck = makeDeck();
  const card = (suit: string, rank: number, nth = 0) => deck.filter((c) => c.suit === suit && c.rank === rank)[nth];

  /** Zwei Folgen mit Joker an Position 3: Herz 5, 6, (7) und Pik 5, 6, (7). Der Bot ist draußen und hat Herz 7 genommen, außerdem Pik 7. */
  function scene() {
    const g = testGame(4, 61, { rounds: 5 });
    const me = g.round.starter;
    g.players[me].isBot = true;
    g.players[me].bot = { level: 'master', style: 'balanced' };
    const joker = deck.filter((c) => c.suit === 'J');
    const mk = (id: number, suit: string, j: (typeof joker)[number]) => ({ ...interpretMeld([card(suit, 5), card(suit, 6), j])!, id, owner: (me + 1) % 4 });
    // Die Pik-Folge liegt zuerst: Bei Gleichstand nähme die frühere Logik die erste Möglichkeit, also die Pik 7
    g.round.melds = [mk(1, 'S', joker[1]), mk(2, 'H', joker[0])];
    g.round.nextMeldId = 3;
    const taken = card('H', 7);
    const hand = [taken, card('S', 7), card('C', 2), card('D', 9), card('H', 12), card('D', 3), card('S', 13), card('C', 11)];
    g.round.players[me].opened = true;
    g.round.players[me].turns = 4;
    setHand(g, me, hand);
    g.round.turn = { ...g.round.turn, player: me, phase: 'play', drawSource: 'discard', drawnCardId: taken.id, mustUseId: taken.id };
    return { g, me, taken };
  }

  it('der Bot klaut genau mit der genommenen Karte, nicht mit der anderen Siebenerkarte', () => {
    const { g, me, taken } = scene();
    const a = decideAction(g, me, { memory: { handMiss: 0, tableMiss: 0 } });
    expect(a.kind).toBe('steal');
    if (a.kind === 'steal') {
      expect(a.cardId).toBe(taken.id);
      expect(applyAction(g, me, a).ok).toBe(true);
    }
  });
  it('danach kann er den geklauten Joker verwenden und die Runde regelkonform fortsetzen (bei jedem Gedächtnis)', () => {
    for (const level of ['easy', 'normal', 'hard', 'master'] as const) {
      const { g, me } = scene();
      g.players[me].bot = { level, style: 'balanced' };
      let steps = 0;
      while (g.round.turn.player === me && steps++ < 8) {
        const a = decideAction(g, me);
        const res = applyAction(g, me, a);
        expect(res.ok).toBe(true);
        if (a.kind === 'discard') break;
      }
      expect(g.round.turn.player).not.toBe(me); // der Zug wurde ordentlich beendet
    }
  });
});
