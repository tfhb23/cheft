import { describe, it, expect } from 'vitest';
import { Card, isJoker, makeDeck } from '../engine/cards';
import { GameState } from '../engine/game';
import { Meld, interpretMeld } from '../engine/melds';
import { applyAction } from '../engine/actions';
import { startNextRound } from '../engine/game';
import { testGame, setHand } from '../engine/testutil';
import { decideAction, suggestLay } from './bot';
import { layOffTargets } from '../engine/game';
import {
  Cand,
  MEMORY,
  MemoryParams,
  Stage,
  STEAL_DIFFICULTY,
  blindAt,
  comboDifficulty,
  layOffDifficulty,
  overlooksAt,
  pickByScore,
  candKey,
  candidates,
  goodDay,
  memoryFor,
  memoryStage,
  overlooks,
  perceive,
  perceivedState,
  recall,
  roll,
  tableLoad,
} from './memory';

const deck = makeDeck();
const keyOf = (c: Card) => (isJoker(c) ? 'J' : `${c.suit}${c.rank}`);
const card = (key: string, nth = 0): Card => deck.filter((c) => keyOf(c) === key)[nth];

/** Ein Gedächtnis ohne Zufall und ohne Fehler, mit festem Zeitplan: Spanne 3 Runden (bei 4 Spielern 12 Züge). */
const STEADY: MemoryParams = { span: 3, spread: [1, 1], accuracy: 1, form: 0, tableMiss: 0, missExtra: 0, observe: 1, handMiss: 0, noise: 0 };
const BLACK = deck.filter((c) => c.suit === 'S' || c.suit === 'C');

/** Leerer Tisch: nur das, was ein Test selbst hineinlegt. Spieler 0 hat keine Handkarten. */
function bare(seed = 7): GameState {
  const g = testGame(4, seed);
  const r = g.round;
  r.discard = [];
  r.discardLog = [];
  r.taken = [];
  r.melds = [];
  r.carpet = null;
  r.plies = 0;
  r.players.forEach((_, i) => setHand(g, i, []));
  return g;
}

/** Ablage, in der `target` unter `age` weiteren (schwarzen, also unbeteiligten) Karten liegt. */
function pileWith(g: GameState, target: Card, age: number): void {
  g.round.discard = [target, ...BLACK.slice(0, age)];
}

const copies = (g: GameState, params: MemoryParams, pid = 0) => recall(g, pid, perceive(g, pid, params)).unseen.copies;
const redDeficit = (c: Map<string, number>) => [...c.entries()].filter(([k]) => k[0] === 'H' || k[0] === 'D').reduce((s, [, v]) => s + (2 - v), 0);

function fakeMeld(id: number, owner: number, size = 3): Meld {
  const cards = deck.slice(id * 4, id * 4 + size);
  return { id, owner, type: 'set', cards, rank: 5 };
}

// ---------------------------------------------------------------- Zufall

describe('roll: deterministischer Zufall', () => {
  const g = testGame(4, 11);
  it('liefert bei gleichen Eingaben immer dasselbe und bleibt in [0, 1)', () => {
    for (let k = 0; k < 200; k++) {
      const a = roll(g, 1, 3, k, 9);
      expect(roll(g, 1, 3, k, 9)).toBe(a);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(1);
    }
  });
  it('hängt von Spieler, Zweck, Schlüssel, Runde und Seed ab', () => {
    const base = roll(g, 1, 3, 5);
    expect(roll(g, 2, 3, 5)).not.toBe(base);
    expect(roll(g, 1, 4, 5)).not.toBe(base);
    expect(roll(g, 1, 3, 6)).not.toBe(base);
    const other = testGame(4, 12);
    expect(roll(other, 1, 3, 5)).not.toBe(base);
    const g2 = testGame(4, 11);
    g2.round.no = 2;
    expect(roll(g2, 1, 3, 5)).not.toBe(base);
  });
  it('ist über viele Schlüssel gleichmäßig verteilt', () => {
    const buckets = new Array(10).fill(0);
    let sum = 0;
    const N = 5000;
    for (let k = 0; k < N; k++) {
      const v = roll(g, 0, 1, k);
      buckets[Math.floor(v * 10)]++;
      sum += v;
    }
    expect(sum / N).toBeGreaterThan(0.48);
    expect(sum / N).toBeLessThan(0.52);
    for (const b of buckets) {
      expect(b / N).toBeGreaterThan(0.08);
      expect(b / N).toBeLessThan(0.12);
    }
  });
});

// ---------------------------------------------------------------- Treppe

describe('memoryStage: Vergessen als Treppe', () => {
  it('exakt, eine Achse, nur der Eindruck, vergessen (Spanne 10)', () => {
    const at = (age: number) => memoryStage(age, 10, false);
    expect([0, 4.9].map(at)).toEqual([0, 0]);
    expect([5, 9.9].map(at)).toEqual([1, 1]);
    expect([10, 24.9].map(at)).toEqual([2, 2]);
    expect([25, 100].map(at)).toEqual([3, 3]);
  });
  it('eine Verwechslung beim Einprägen macht die Karte sofort eine Stufe verschwommener, aber nie schärfer oder weg', () => {
    expect(memoryStage(0, 10, true)).toBe(1);
    expect(memoryStage(6, 10, true)).toBe(2);
    expect(memoryStage(12, 10, true)).toBe(2); // Eindruck bleibt Eindruck
    expect(memoryStage(30, 10, true)).toBe(3); // Verwechslung verlängert das Gedächtnis nicht
  });
  it('unbegrenzte Spanne bleibt exakt; Spanne 0 oder ungültig ist sofort vergessen', () => {
    expect(memoryStage(0, Infinity, false)).toBe(0);
    expect(memoryStage(10_000, Infinity, false)).toBe(0);
    expect(memoryStage(0, 0, false)).toBe(3);
    expect(memoryStage(5, -2, false)).toBe(3);
    expect(memoryStage(5, NaN, false)).toBe(3);
  });
  it('wird mit dem Alter nie schärfer (für beliebige Spannen)', () => {
    for (const span of [0.5, 1, 3, 10, 37]) {
      for (const mis of [false, true]) {
        let last: Stage = 0;
        for (let age = 0; age < 150; age += 0.5) {
          const s = memoryStage(age, span, mis);
          expect(s).toBeGreaterThanOrEqual(last);
          last = s;
        }
        expect(last).toBe(3);
      }
    }
  });
});

describe('candidates: was kommt für die Erinnerung in Frage?', () => {
  const ranks = (cs: Cand[]) => cs.map((c) => c.rank).sort((a, b) => a - b);
  const suits = (cs: Cand[]) => [...new Set(cs.map((c) => c.suit))].sort();

  it('exakt: genau die Karte', () => {
    expect(candidates(card('H11'), 0, 0.3)).toEqual([{ suit: 'H', rank: 11 }]);
  });
  it('vergessen: nichts', () => {
    expect(candidates(card('H11'), 3, 0.3)).toEqual([]);
    expect(candidates(card('J'), 3, 0.3)).toEqual([]);
  });
  it('Bildkarte, Wert verschwommen: gleiche Farbe, alle Bildkarten (B, D, K, A)', () => {
    const cs = candidates(card('S11'), 1, 0.1);
    expect(suits(cs)).toEqual(['S']);
    expect(ranks(cs)).toEqual([1, 11, 12, 13]);
  });
  it('Bildkarte, Farbe verschwommen: gleiche Farbart, gleicher Wert (Pik/Kreuz, Herz/Karo)', () => {
    expect(suits(candidates(card('S12'), 1, 0.9))).toEqual(['C', 'S']);
    expect(suits(candidates(card('C12'), 1, 0.9))).toEqual(['C', 'S']);
    expect(suits(candidates(card('H12'), 1, 0.9))).toEqual(['D', 'H']);
    expect(suits(candidates(card('D12'), 1, 0.9))).toEqual(['D', 'H']);
    expect(ranks(candidates(card('S12'), 1, 0.9))).toEqual([12, 12]);
  });
  it('Zahlkarte, Wert verschwommen: Nachbarn, aber nie über die Klassengrenze 6/7', () => {
    expect(ranks(candidates(card('H7'), 1, 0.9))).toEqual([7, 8]);
    expect(ranks(candidates(card('H6'), 1, 0.9))).toEqual([5, 6]);
    expect(ranks(candidates(card('H5'), 1, 0.9))).toEqual([4, 5, 6]);
    expect(ranks(candidates(card('H2'), 1, 0.9))).toEqual([2, 3]);
    expect(ranks(candidates(card('H10'), 1, 0.9))).toEqual([9, 10]);
  });
  it('Zahlkarte, Farbe verschwommen: nur die Farbart', () => {
    const cs = candidates(card('D8'), 1, 0.1);
    expect(suits(cs)).toEqual(['D', 'H']);
    expect(ranks(cs)).toEqual([8, 8]);
  });
  it('nur der Eindruck: Farbart und Klasse', () => {
    const face = candidates(card('S13'), 2, 0.5);
    expect(suits(face)).toEqual(['C', 'S']);
    expect(face.length).toBe(8);
    expect(new Set(ranks(face))).toEqual(new Set([1, 11, 12, 13]));
    const low = candidates(card('H3'), 2, 0.5);
    expect(low.length).toBe(10);
    expect(new Set(ranks(low))).toEqual(new Set([2, 3, 4, 5, 6]));
    const high = candidates(card('D9'), 2, 0.5);
    expect(high.length).toBe(8);
    expect(new Set(ranks(high))).toEqual(new Set([7, 8, 9, 10]));
  });
  it('Joker werden nie verwechselt', () => {
    for (const stage of [0, 1, 2] as Stage[]) expect(candidates(card('J'), stage, 0.4)).toEqual([{ suit: 'J', rank: 0 }]);
  });
  it('enthält immer die echte Karte und wird mit jeder Stufe nur unschärfer (nie schärfer)', () => {
    for (const c of deck.filter((d) => !isJoker(d))) {
      for (const axis of [0.05, 0.5, 0.69, 0.71, 0.95]) {
        const stages = ([0, 1, 2] as Stage[]).map((s) => candidates(c, s, axis).map(candKey));
        for (const keys of stages) expect(keys).toContain(keyOf(c));
        expect(stages[0].length).toBe(1);
        for (const k of stages[1]) expect(stages[2]).toContain(k); // Stufe 1 ⊆ Stufe 2
        expect(stages[1].length).toBeGreaterThanOrEqual(2);
        expect(new Set(stages[1]).size).toBe(stages[1].length);
      }
    }
  });
});

// ---------------------------------------------------------------- Die Stufen als Daten

describe('MEMORY: die vier Stufen sind eine saubere Rangfolge', () => {
  const order = [MEMORY.easy, MEMORY.normal, MEMORY.hard, MEMORY.master];
  it('Gedächtnis, Genauigkeit und Beobachtung wachsen, Fehlerquellen sinken', () => {
    for (let i = 1; i < order.length; i++) {
      const a = order[i - 1];
      const b = order[i];
      expect(b.span).toBeGreaterThan(a.span);
      expect(b.accuracy).toBeGreaterThan(a.accuracy);
      expect(b.observe).toBeGreaterThan(a.observe);
      expect(b.tableMiss).toBeLessThan(a.tableMiss);
      expect(b.handMiss).toBeLessThan(a.handMiss);
      expect(b.noise).toBeLessThan(a.noise);
      expect(b.form).toBeLessThan(a.form);
      expect(b.spread[1] - b.spread[0]).toBeLessThan(a.spread[1] - a.spread[0]);
      expect(b.missExtra).toBeLessThanOrEqual(a.missExtra);
    }
  });
  it('nur der Mastermind ist perfekt, alle anderen sind es nie ganz', () => {
    const m = MEMORY.master;
    expect(m).toMatchObject({ span: Infinity, spread: [1, 1], accuracy: 1, form: 0, tableMiss: 0, missExtra: 0, observe: 1, handMiss: 0, noise: 0 });
    for (const p of [MEMORY.easy, MEMORY.normal, MEMORY.hard]) {
      expect(p.span).toBeLessThan(Infinity);
      expect(p.accuracy).toBeLessThan(1);
      expect(p.observe).toBeLessThan(1);
      expect(p.tableMiss).toBeGreaterThan(0);
      expect(p.handMiss).toBeGreaterThan(0);
      expect(p.noise).toBeGreaterThan(0);
      expect(p.form).toBeGreaterThan(0);
      expect(p.spread[0]).toBeLessThan(p.spread[1]);
    }
  });
  it('memoryFor überschreibt einzelne Werte, ohne die Stufe zu verändern', () => {
    const before = JSON.stringify(MEMORY.easy);
    expect(memoryFor('easy', { handMiss: 0 }).handMiss).toBe(0);
    expect(memoryFor('easy', { handMiss: 0 }).span).toBe(3);
    expect(JSON.stringify(MEMORY.easy)).toBe(before);
  });
});

// ---------------------------------------------------------------- Tagesform

describe('Tagesform', () => {
  const g = testGame(4, 21);
  it('ist beim Mastermind immer 0', () => {
    for (let pid = 0; pid < 4; pid++) expect(goodDay(g, pid, MEMORY.master)).toBe(0);
  });
  it('bleibt innerhalb der Schwankung der Stufe, ist je Runde und Bot verschieden, aber stabil', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const p = MEMORY[level];
      const seen = new Set<number>();
      let sum = 0;
      let n = 0;
      for (let round = 1; round <= 40; round++) {
        const gr = testGame(4, 21);
        gr.round.no = round;
        for (let pid = 0; pid < 4; pid++) {
          const d = goodDay(gr, pid, p);
          expect(Math.abs(d)).toBeLessThanOrEqual(p.form);
          expect(goodDay(gr, pid, p)).toBe(d);
          seen.add(d);
          sum += d;
          n++;
        }
      }
      expect(seen.size).toBeGreaterThan(100); // kaum Wiederholungen
      expect(Math.abs(sum / n)).toBeLessThan(p.form * 0.15); // gute und schlechte Tage halten sich die Waage
    }
  });
});

// ---------------------------------------------------------------- Blindphasen

describe('blindAt: Übersehen am Tisch', () => {
  const g = testGame(4, 33);
  const run = (key: number, p: number, extra: number, turns = 80) => Array.from({ length: turns }, (_, t) => blindAt(g, 1, key, p, extra, t));

  it('ohne Wahrscheinlichkeit wird nie etwas übersehen', () => {
    for (let key = 0; key < 50; key++) expect(run(key, 0, 2).some(Boolean)).toBe(false);
  });
  it('ist für denselben Zug immer gleich und hängt nicht vom späteren Verlauf ab', () => {
    for (let key = 0; key < 30; key++) {
      const a = run(key, 0.2, 2, 60);
      const b = run(key, 0.2, 2, 60);
      expect(a).toEqual(b);
      for (let t = 0; t < 60; t++) expect(blindAt(g, 1, key, 0.2, 2, t)).toBe(a[t]);
    }
  });
  it('dauert höchstens 1 + extra Züge am Stück und danach folgt mindestens ein aufmerksamer Zug', () => {
    for (const extra of [0, 1, 2]) {
      let longest = 0;
      let blindTurns = 0;
      let total = 0;
      for (let key = 0; key < 300; key++) {
        let streak = 0;
        for (const blind of run(key, 0.3, extra)) {
          total++;
          if (blind) {
            streak++;
            blindTurns++;
            longest = Math.max(longest, streak);
          } else streak = 0;
        }
      }
      expect(longest).toBeLessThanOrEqual(1 + extra);
      expect(longest).toBe(1 + extra); // die volle Länge kommt auch vor
      expect(blindTurns).toBeGreaterThan(0);
      expect(blindTurns / total).toBeLessThan(0.7); // nie dauerhaft ausgeblendet
    }
  });
  it('trifft ungefähr den erwarteten Anteil der Züge (Start 6 %, 1 bis 3 Züge ≈ 10 %)', () => {
    let blind = 0;
    let total = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const gs = testGame(4, seed * 17);
      for (let key = 0; key < 40; key++) {
        for (let t = 0; t < 40; t++) {
          total++;
          if (blindAt(gs, 2, key, 0.06, 2, t)) blind++;
        }
      }
    }
    expect(blind / total).toBeGreaterThan(0.07);
    expect(blind / total).toBeLessThan(0.13);
  });
  it('ein Übersehen kann auch mehrere Züge anhalten (Dauer 2 und 3 kommen vor)', () => {
    const lens = new Set<number>();
    for (let key = 0; key < 400; key++) {
      let streak = 0;
      for (const b of [...run(key, 0.2, 2), false]) {
        if (b) streak++;
        else {
          if (streak) lens.add(streak);
          streak = 0;
        }
      }
    }
    expect([...lens].sort()).toEqual([1, 2, 3]);
  });
});

describe('perceive: Wahrnehmung eines Zuges', () => {
  /** Tisch mit `n` fremden Auslagen zu je 3 Karten (Besitzer 1). */
  function table(seed: number, n: number): GameState {
    const g = bare(seed);
    g.round.melds = Array.from({ length: n }, (_, i) => fakeMeld(i + 1, 1));
    g.round.nextMeldId = n + 1;
    return g;
  }
  const rate = (level: 'easy' | 'normal' | 'hard', n: number) => {
    let blind = 0;
    let total = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const g = table(seed * 13, n);
      for (let t = 0; t < 40; t++) {
        g.round.players[0].turns = t;
        const per = perceive(g, 0, MEMORY[level]);
        blind += per.blindMelds.size;
        total += n;
      }
    }
    return blind / total;
  };

  it('der Mastermind übersieht nie etwas', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = table(seed, 8);
      g.round.carpet = card('H5');
      g.round.discard = [card('S5')];
      for (let t = 0; t < 40; t++) {
        g.round.players[0].turns = t;
        const per = perceive(g, 0, MEMORY.master);
        expect(per.blindMelds.size).toBe(0);
        expect(per.carpetBlind).toBe(false);
        expect(per.topBlind).toBe(false);
      }
    }
  });
  it('Pflichtzüge übersehen nichts', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = table(seed, 8);
      g.round.carpet = card('H5');
      g.round.discard = [card('S5')];
      for (let t = 0; t < 40; t++) {
        g.round.players[0].turns = t;
        const per = perceive(g, 0, MEMORY.easy, true);
        expect(per.blindMelds.size + Number(per.carpetBlind) + Number(per.topBlind)).toBe(0);
        expect(overlooks(g, 0, per, t)).toBe(false);
      }
    }
  });
  it('eigene Auslagen werden nie übersehen', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = table(seed, 8);
      g.round.melds.forEach((m) => (m.owner = 0));
      for (let t = 0; t < 40; t++) {
        g.round.players[0].turns = t;
        expect(perceive(g, 0, { ...MEMORY.easy, tableMiss: 0.5 }).blindMelds.size).toBe(0);
      }
    }
  });
  it('ein voller Tisch wird öfter übersehen als ein leerer, und Vergessliche öfter als Aufmerksame', () => {
    expect(tableLoad(table(1, 0))).toBe(0);
    expect(tableLoad(table(1, 8))).toBe(1);
    expect(tableLoad(table(1, 4))).toBe(0.5);
    const full = rate('easy', 8);
    expect(full).toBeGreaterThan(0.1);
    expect(full).toBeLessThan(0.2);
    expect(rate('easy', 2)).toBeLessThan(full * 0.5);
    expect(rate('normal', 8)).toBeLessThan(full);
    expect(rate('hard', 8)).toBeLessThan(rate('normal', 8));
    expect(rate('hard', 8)).toBeGreaterThan(0);
    expect(rate('hard', 8)).toBeLessThan(0.04);
  });
  it('Teppichkarte und oberste Ablagekarte werden seltener übersehen als eine Auslage, aber nicht nie', () => {
    let carpet = 0;
    let top = 0;
    let total = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const g = table(seed * 7, 8);
      g.round.carpet = card('H5');
      g.round.discard = [card('S5')];
      for (let t = 0; t < 40; t++) {
        g.round.players[0].turns = t;
        const per = perceive(g, 0, MEMORY.easy);
        carpet += Number(per.carpetBlind);
        top += Number(per.topBlind);
        total++;
      }
    }
    expect(carpet / total).toBeGreaterThan(0.005);
    expect(carpet / total).toBeLessThan(rate('easy', 8) / 2);
    expect(top / total).toBeGreaterThan(0.005);
    expect(top / total).toBeLessThan(rate('easy', 8) / 2);
  });
  it('perceivedState lässt übersehene Auslagen weg und verändert den Zustand nicht', () => {
    const g = table(5, 6);
    const before = JSON.stringify(g);
    const per = { ...perceive(g, 0, MEMORY.master), blindMelds: new Set([2, 4]) };
    const view = perceivedState(g, per);
    expect(view.round.melds.map((m) => m.id)).toEqual([1, 3, 5, 6]);
    expect(g.round.melds.length).toBe(6);
    expect(JSON.stringify(g)).toBe(before);
    const none = perceive(g, 0, MEMORY.master);
    expect(perceivedState(g, none)).toBe(g);
  });
});

describe('overlooks: Handüberblick', () => {
  const frac = (level: 'easy' | 'normal' | 'hard' | 'master', forced = false) => {
    let miss = 0;
    let total = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const g = bare(seed * 11);
      for (let t = 0; t < 10; t++) {
        g.round.players[0].turns = t;
        const per = perceive(g, 0, MEMORY[level], forced);
        for (let k = 0; k < 40; k++) {
          total++;
          if (overlooks(g, 0, per, k)) miss++;
        }
      }
    }
    return miss / total;
  };
  it('trifft ungefähr die Quote der Stufe', () => {
    expect(frac('easy')).toBeGreaterThan(0.16);
    expect(frac('easy')).toBeLessThan(0.24);
    expect(frac('normal')).toBeGreaterThan(0.09);
    expect(frac('normal')).toBeLessThan(0.15);
    expect(frac('hard')).toBeGreaterThan(0.04);
    expect(frac('hard')).toBeLessThan(0.08);
  });
  it('der Mastermind und Pflichtzüge übersehen nie etwas', () => {
    expect(frac('master')).toBe(0);
    expect(frac('easy', true)).toBe(0);
  });
  it('würfelt für denselben Zustand und dieselbe Stelle immer gleich, für andere Stellen und Züge neu', () => {
    const g = bare(3);
    const per = perceive(g, 0, MEMORY.easy);
    const a = Array.from({ length: 200 }, (_, k) => overlooks(g, 0, per, k));
    expect(Array.from({ length: 200 }, (_, k) => overlooks(g, 0, per, k))).toEqual(a);
    expect(a.some(Boolean)).toBe(true);
    expect(a.every(Boolean)).toBe(false);
    g.round.players[0].turns = 5;
    const per2 = perceive(g, 0, MEMORY.easy);
    expect(Array.from({ length: 200 }, (_, k) => overlooks(g, 0, per2, k))).not.toEqual(a);
  });
});

// ---------------------------------------------------------------- Erinnerung

describe('recall: was weiß der Bot noch?', () => {
  it('ohne Ereignisse sind alle 106 Karten unbekannt (2 Kopien je Karte, 2 Joker)', () => {
    const g = bare();
    const { unseen } = recall(g, 0, perceive(g, 0, STEADY));
    expect(unseen.total).toBe(106);
    expect(unseen.copies.size).toBe(53);
    for (const v of unseen.copies.values()) expect(v).toBe(2);
  });
  it('die eigene Hand, Auslagen und Teppichkarte kennt der Bot genau', () => {
    const g = bare();
    setHand(g, 0, [card('H5'), card('H5', 1), card('J')]);
    g.round.melds = [{ id: 1, owner: 2, type: 'set', cards: [card('S9'), card('C9'), card('D9')], rank: 9 }];
    g.round.carpet = card('D4');
    const c = copies(g, STEADY);
    expect(c.get('H5')).toBe(0);
    expect(c.get('J')).toBe(1);
    expect(c.get('S9')).toBe(1);
    expect(c.get('C9')).toBe(1);
    expect(c.get('D9')).toBe(1);
    expect(c.get('D4')).toBe(1);
    expect(c.get('D5')).toBe(2);
  });
  it('fremde Handkarten und der Stapel sind unbekannt (gehen nicht in die Rechnung ein)', () => {
    const g = bare();
    g.round.players[1].hand = [card('H5'), card('H6')];
    g.round.stock = [card('D7')];
    const c = copies(g, STEADY);
    expect(c.get('H5')).toBe(2);
    expect(c.get('H6')).toBe(2);
    expect(c.get('D7')).toBe(2);
  });

  describe('Abwürfe verblassen auf der Treppe (Spanne 3 Runden = 12 Züge bei 4 Spielern)', () => {
    const H6 = card('H6');
    it('Alter 1 bis 5: exakt', () => {
      for (const age of [1, 3, 5]) {
        const g = bare();
        pileWith(g, H6, age);
        const c = copies(g, STEADY);
        expect(c.get('H6')).toBe(1);
        expect(redDeficit(c)).toBe(1);
      }
    });
    it('Alter 6 bis 11: eine Achse verschwommen, die Karte bleibt ein halber Treffer', () => {
      for (const age of [6, 9, 11]) {
        const g = bare();
        pileWith(g, H6, age);
        const c = copies(g, STEADY);
        expect(c.get('H6')).toBeCloseTo(1.5, 9);
        expect(redDeficit(c)).toBeCloseTo(1, 9);
        // entweder H5/H6 (Wert verschwommen) oder H6/D6 (Farbe verschwommen)
        const other = (c.get('H5') ?? 2) + (c.get('D6') ?? 2);
        expect(other).toBeCloseTo(3.5, 9);
      }
    });
    it('Alter 12 bis 29: nur der Eindruck (rot, niedrige Zahl), über zehn Karten verteilt', () => {
      for (const age of [12, 20, 29]) {
        const g = bare();
        pileWith(g, H6, age);
        const c = copies(g, STEADY);
        expect(c.get('H6')).toBeCloseTo(1.9, 9);
        expect(c.get('D2')).toBeCloseTo(1.9, 9);
        expect(c.get('H7')).toBe(2); // hohe Zahl: nicht Teil des Eindrucks "niedrige Zahl"
        expect(c.get('D9')).toBe(2);
        expect(c.get('HK')).toBeUndefined();
        expect(redDeficit(c)).toBeCloseTo(1, 9);
      }
    });
    it('ab Alter 30: vergessen', () => {
      for (const age of [30, 45, 52]) {
        const g = bare();
        pileWith(g, H6, age);
        const c = copies(g, STEADY);
        expect(redDeficit(c)).toBe(0);
        expect(c.get('H6')).toBe(2);
      }
    });
    it('jeder Schritt in dieser Reihe gibt höchstens so viel Wissen her wie der vorige', () => {
      let last = Infinity;
      for (let age = 1; age <= 52; age++) {
        const g = bare();
        pileWith(g, H6, age);
        const certainty = 2 - (copies(g, STEADY).get('H6') ?? 2);
        expect(certainty).toBeLessThanOrEqual(last + 1e-9);
        last = certainty;
      }
    });
  });

  it('die oberste Ablagekarte liegt offen und ist immer exakt; übersehen verlässt sich der Bot auf die Erinnerung', () => {
    const g = bare();
    g.round.discard = [card('H6')];
    const none: MemoryParams = { ...STEADY, span: 0 }; // alles sofort vergessen
    expect(copies(g, none).get('H6')).toBe(1);
    const per = { ...perceive(g, 0, none), topBlind: true };
    expect(recall(g, 0, per).unseen.copies.get('H6')).toBe(2);
    const per2 = { ...perceive(g, 0, STEADY), topBlind: true };
    expect(recall(g, 0, per2).unseen.copies.get('H6')).toBe(1);
  });
  it('die Teppichkarte zählen alle mit, solange sie sie sehen', () => {
    const g = bare();
    g.round.carpet = card('D4');
    for (const level of ['easy', 'normal', 'hard', 'master'] as const) {
      const per = { ...perceive(g, 0, MEMORY[level]), carpetBlind: false };
      expect(recall(g, 0, per).unseen.copies.get('D4')).toBe(1);
    }
    const blind = { ...perceive(g, 0, MEMORY.easy), carpetBlind: true };
    expect(recall(g, 0, blind).unseen.copies.get('D4')).toBe(2);
  });
  it('übersehene Auslagen fehlen in der Rechnung', () => {
    const g = bare();
    g.round.melds = [{ id: 1, owner: 2, type: 'set', cards: [card('S9'), card('C9'), card('D9')], rank: 9 }];
    const per = { ...perceive(g, 0, STEADY), blindMelds: new Set([1]) };
    const c = recall(g, 0, per).unseen.copies;
    expect(c.get('S9')).toBe(2);
    expect(c.get('D9')).toBe(2);
  });

  describe('Joker und eigene Abwürfe', () => {
    it('Joker bleiben doppelt so lange im Kopf und werden nie verwechselt', () => {
      const g = bare();
      const J = card('J');
      // Alter 8 bei Spanne 12: eine normale Karte ist schon verschwommen, der Joker (Spanne 24) noch exakt
      pileWith(g, J, 8);
      expect(copies(g, STEADY).get('J')).toBe(1);
      // Selbst nach 50 Zügen kennt er den Joker noch (Eindruck = der Joker, es gibt nur ihn)
      pileWith(g, J, 50);
      expect(copies(g, STEADY).get('J')).toBe(1);
      // Ohne jede Genauigkeit wird alles andere sofort verwechselt, der Joker nicht
      const sloppy: MemoryParams = { ...STEADY, accuracy: 0 };
      pileWith(g, J, 1);
      expect(copies(g, sloppy).get('J')).toBe(1);
      pileWith(g, card('H6'), 1);
      expect(copies(g, sloppy).get('H6')).toBeCloseTo(1.5, 9);
    });
    it('eigene Abwürfe merkt man sich länger (Spanne × 1,5)', () => {
      const H6 = card('H6');
      const g = bare();
      pileWith(g, H6, 8); // 8 ≥ 6: bei fremden Abwürfen schon verschwommen
      g.round.discardedBy = { [H6.id]: 1 };
      expect(copies(g, STEADY).get('H6')).toBeCloseTo(1.5, 9);
      g.round.discardedBy = { [H6.id]: 0 };
      expect(copies(g, STEADY).get('H6')).toBe(1); // 8 < 9: noch exakt
    });
    it('ältere Spielstände ohne "discardedBy" erkennen eigene Abwürfe am kurzen Protokoll; ohne beides gelten alle als fremd', () => {
      const H6 = card('H6');
      const g = bare();
      pileWith(g, H6, 8);
      g.round.discardedBy = undefined;
      g.round.discardLog = [{ player: 0, card: H6 }];
      expect(copies(g, STEADY).get('H6')).toBe(1);
      g.round.discardLog = undefined;
      expect(copies(g, STEADY).get('H6')).toBeCloseTo(1.5, 9);
    });
  });

  describe('offen genommene Karten', () => {
    it('merken sich Bots mit der Beobachtungs-Chance; die Karte zählt dann als bekannt, und die Spur zum Nehmer bleibt', () => {
      const g = bare();
      g.round.plies = 10;
      g.round.taken = [{ player: 2, card: card('H6'), at: 10 }];
      const seen = recall(g, 0, perceive(g, 0, STEADY));
      expect(seen.unseen.copies.get('H6')).toBe(1);
      expect(seen.takes).toEqual([{ player: 2, cands: [{ suit: 'H', rank: 6 }] }]);
      const blind = recall(g, 0, perceive(g, 0, { ...STEADY, observe: 0 }));
      expect(blind.unseen.copies.get('H6')).toBe(2);
      expect(blind.takes).toEqual([]);
    });
    it('eigene genommene Karten sind keine Spur (sie liegen in der eigenen Hand)', () => {
      const g = bare();
      g.round.taken = [{ player: 0, card: card('H6'), at: 0 }];
      setHand(g, 0, [card('H6')]);
      const r = recall(g, 0, perceive(g, 0, STEADY));
      expect(r.takes).toEqual([]);
      expect(r.unseen.copies.get('H6')).toBe(1);
    });
    it('verblassen wie Abwürfe: nach langer Zeit bleibt nur noch der Eindruck, später nichts', () => {
      const g = bare();
      g.round.taken = [{ player: 2, card: card('H6'), at: 0 }];
      g.round.plies = 3;
      expect(recall(g, 0, perceive(g, 0, STEADY)).takes[0].cands.length).toBe(1);
      g.round.plies = 8; // ≥ 6
      expect(recall(g, 0, perceive(g, 0, STEADY)).takes[0].cands.length).toBe(2);
      g.round.plies = 15; // ≥ 12
      expect(recall(g, 0, perceive(g, 0, STEADY)).takes[0].cands.length).toBe(10);
      g.round.plies = 31; // ≥ 30
      expect(recall(g, 0, perceive(g, 0, STEADY)).takes).toEqual([]);
    });
    it('eine genommene und danach ausgelegte Karte zählt nur einmal und die Spur bleibt scharf', () => {
      const g = bare();
      g.round.plies = 40; // lange her
      g.round.taken = [{ player: 2, card: card('H6'), at: 0 }];
      g.round.melds = [{ id: 1, owner: 2, type: 'set', cards: [card('H6'), card('S6'), card('C6')], rank: 6 }];
      const r = recall(g, 0, perceive(g, 0, STEADY));
      expect(r.unseen.copies.get('H6')).toBe(1);
      expect(r.takes).toEqual([{ player: 2, cands: [{ suit: 'H', rank: 6 }] }]);
    });
    it('dieselbe Karte als Abwurf und als Nehmen zählt nur einmal (das jüngere Ereignis gilt)', () => {
      const g = bare();
      g.round.plies = 10;
      g.round.taken = [{ player: 2, card: card('H6'), at: 4 }]; // vor 6 Zügen genommen ...
      pileWith(g, card('H6'), 2); // ... und vor 2 Zügen wieder abgeworfen
      const c = copies(g, STEADY);
      expect(c.get('H6')).toBe(1);
      expect(redDeficit(c)).toBe(1);
    });
    it('wird je Stufe unterschiedlich oft überhaupt bemerkt', () => {
      const frac = (observe: number) => {
        let seenCount = 0;
        let total = 0;
        for (let seed = 1; seed <= 6; seed++) {
          const g = bare(seed * 19);
          g.round.plies = 0;
          const ids = deck.slice(0, 100);
          g.round.taken = ids.map((c) => ({ player: 2, card: c, at: 0 }));
          seenCount += recall(g, 0, perceive(g, 0, { ...STEADY, observe })).takes.length;
          total += ids.length;
        }
        return seenCount / total;
      };
      expect(frac(0.4)).toBeGreaterThan(0.33);
      expect(frac(0.4)).toBeLessThan(0.47);
      expect(frac(0.9)).toBeGreaterThan(0.85);
      expect(frac(1)).toBe(1);
      expect(frac(0)).toBe(0);
    });
  });

  it('die Streuung macht dieselbe Karte mal kurz, mal lang erinnerbar (Vergesslich: von sofort weg bis lange da)', () => {
    // Alter 3 Runden = 12 Züge bei Spanne 3: eine starre Spanne ist hier gerade verschwommen.
    const lasts = { gone: 0, sharp: 0, blurred: 0 };
    for (const c of deck.slice(0, 52).filter((x) => x.suit === 'H' || x.suit === 'D')) {
      const g = bare();
      pileWith(g, c, 5);
      const params: MemoryParams = { ...MEMORY.easy, accuracy: 1, form: 0 };
      const certainty = 2 - (copies(g, params).get(keyOf(c)) ?? 2);
      if (certainty === 0) lasts.gone++;
      else if (certainty === 1) lasts.sharp++;
      else lasts.blurred++;
    }
    expect(lasts.gone).toBeGreaterThan(0); // manche Karten sind nach 5 Zügen vergessen ...
    expect(lasts.sharp).toBeGreaterThan(0); // ... andere noch ganz scharf
    expect(lasts.blurred).toBeGreaterThan(0); // ... und der Rest dazwischen
    // Der Aufmerksame ist dagegen bei diesem Alter fast immer noch scharf
    let sharp = 0;
    let n = 0;
    for (const c of deck.slice(0, 52).filter((x) => x.suit === 'H' || x.suit === 'D')) {
      const g = bare();
      pileWith(g, c, 5);
      n++;
      if ((copies(g, { ...MEMORY.hard, accuracy: 1, form: 0 }).get(keyOf(c)) ?? 2) === 1) sharp++;
    }
    expect(sharp / n).toBeGreaterThan(0.95);
  });
});

// ---------------------------------------------------------------- Mastermind gegen eine unabhängige Referenz

/** Unabhängige Referenz: alles, was irgendwo offen zu sehen war, ist bekannt. */
function exactUnseen(g: GameState, pid: number): Map<string, number> {
  const r = g.round;
  const seen = new Set<number>();
  for (const c of r.players[pid].hand) seen.add(c.id);
  for (const m of r.melds) for (const c of m.cards) seen.add(c.id);
  for (const c of r.discard) seen.add(c.id);
  if (r.carpet) seen.add(r.carpet.id);
  for (const x of r.taken) seen.add(x.card.id);
  const out = new Map<string, number>();
  for (const c of deck) if (!seen.has(c.id)) out.set(keyOf(c), (out.get(keyOf(c)) ?? 0) + 1);
  return out;
}

/** Spielt Bots durch und ruft nach jedem Zug `visit` auf. */
function playGames(seeds: number[], levels: ('easy' | 'normal' | 'hard' | 'master')[], visit: (g: GameState, pid: number) => void, rounds = 2): void {
  for (const seed of seeds) {
    const n = 3 + (seed % 2);
    const g = testGame(n, seed, { rounds });
    g.players.forEach((p, i) => {
      p.isBot = true;
      p.bot = { level: levels[i % levels.length], style: 'balanced' };
    });
    let guard = 0;
    while (!g.finished && guard++ < 20000) {
      if (g.round.ended) {
        startNextRound(g);
        g.round.waiting = false;
        continue;
      }
      const pid = g.round.turn.player;
      visit(g, pid);
      const a = decideAction(g, pid);
      const res = applyAction(g, pid, a);
      if (!res.ok) throw new Error(`ungültig: ${a.kind} -> ${res.error} (seed ${seed})`);
    }
    expect(g.finished).toBe(true);
  }
}

describe('Mastermind-Gedächtnis gegen eine unabhängige Referenzrechnung', () => {
  it('stimmt in jedem Zug kompletter Spiele exakt mit "alles Offene ist bekannt" überein', () => {
    let checked = 0;
    playGames([301, 302, 303, 304, 305, 306], ['master'], (g, pid) => {
      const per = perceive(g, pid, MEMORY.master);
      const mine = recall(g, pid, per).unseen.copies;
      const ref = exactUnseen(g, pid);
      for (const [key] of mine) expect(mine.get(key)).toBe(ref.get(key) ?? 0);
      checked++;
    });
    expect(checked).toBeGreaterThan(300);
  });
});

describe('Gedächtnis-Stufen in echten Spielen', () => {
  /** Mittlerer Abstand der Erinnerung zur Wahrheit (Summe über alle Karten), gemessen in denselben Spielen. */
  function distances(): Record<string, number> {
    const sum: Record<string, number> = { easy: 0, normal: 0, hard: 0, master: 0 };
    let n = 0;
    playGames([311, 312, 313, 314, 315, 316, 317, 318], ['master'], (g, pid) => {
      if ((g.round.plies ?? 0) % 2 !== 0) return;
      const ref = exactUnseen(g, pid);
      let masterTotal = 0;
      // Der Mastermind zuerst: Wer weniger weiß, kennt nie mehr als er, die Summe der unbekannten Karten wird also nicht kleiner.
      for (const level of ['master', 'easy', 'normal', 'hard'] as const) {
        const un = recall(g, pid, perceive(g, pid, MEMORY[level])).unseen;
        let d = 0;
        for (const [key, v] of un.copies) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(2);
          d += Math.abs(v - (ref.get(key) ?? 0));
        }
        sum[level] += d;
        if (level === 'master') masterTotal = un.total;
        else expect(un.total).toBeGreaterThanOrEqual(masterTotal - 1e-9);
      }
      n++;
    });
    for (const level of Object.keys(sum)) sum[level] /= n;
    return sum;
  }
  it('je besser das Gedächtnis, desto näher an der Wahrheit; nur der Mastermind liegt exakt richtig', () => {
    const d = distances();
    expect(d.master).toBe(0);
    expect(d.hard).toBeGreaterThan(0);
    expect(d.normal).toBeGreaterThan(d.hard);
    expect(d.easy).toBeGreaterThan(d.normal);
  });
});

// ---------------------------------------------------------------- Handüberblick: Schwierigkeit

describe('Schwierigkeit einer Kombination', () => {
  /** Kombination aus Kurzschreibweise ('H5', 'H13' = Herz König, 'J'), jede Karte beliebig oft; die zweite Kopie als 'H5#'. */
  const shapeOf = (...keys: string[]) => {
    const used = new Map<string, number>();
    const cs = keys.map((k) => {
      const key = k.replace('#', '');
      const nth = k.endsWith('#') ? 1 : used.get(key) ?? 0;
      used.set(key, nth + 1);
      return card(key, nth);
    });
    const shape = interpretMeld(cs);
    if (!shape) throw new Error(`keine Kombination: ${keys.join(' ')}`);
    return shape;
  };
  const d = (...keys: string[]) => comboDifficulty(shapeOf(...keys));

  it('ein Paar ist am leichtesten, dann der Dreiersatz, dann Folgen, die mit jeder Karte länger schwerer werden', () => {
    expect(d('H5', 'H5#')).toBeLessThan(d('H7', 'S7', 'D7'));
    expect(d('H7', 'S7', 'D7')).toBeLessThan(d('H5', 'H6', 'H7'));
    expect(d('H5', 'H6', 'H7')).toBeLessThan(d('H5', 'H6', 'H7', 'H8'));
    expect(d('H5', 'H6', 'H7', 'H8')).toBeLessThan(d('H5', 'H6', 'H7', 'H8', 'H9'));
    expect(d('H7', 'S7', 'D7')).toBeLessThan(d('H7', 'S7', 'D7', 'C7'));
  });
  it('Joker und ein Ass (unten oder oben in der Folge) machen eine Kombination schwerer', () => {
    expect(d('H7', 'S7', 'J')).toBeGreaterThan(d('H7', 'S7', 'D7'));
    expect(d('H5', 'J', 'H7')).toBeGreaterThan(d('H5', 'H6', 'H7'));
    expect(d('H1', 'H2', 'H3')).toBeGreaterThan(d('H4', 'H5', 'H6'));
    expect(d('H12', 'H13', 'H1')).toBeGreaterThan(d('H9', 'H10', 'H11'));
    expect(d('H5', 'J', 'J')).toBeGreaterThan(d('H5', 'J', 'H7'));
  });
  it('bleibt in einem sinnvollen Bereich', () => {
    for (const keys of [['H5', 'H5#'], ['J', 'J'], ['H7', 'S7', 'D7'], ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H12', 'H13'], ['J', 'H5', 'J']]) {
      const v = d(...keys);
      expect(v).toBeGreaterThanOrEqual(0.15);
      expect(v).toBeLessThanOrEqual(2.5);
    }
  });
  it('Anlegen: an einem Satz leichter als an einer Folge; Joker in der Auslage und ein Ass erschweren es', () => {
    const set: Pick<Meld, 'type' | 'cards'> = { type: 'set', cards: [card('H7'), card('S7'), card('D7')] };
    const run: Pick<Meld, 'type' | 'cards'> = { type: 'run', cards: [card('H5'), card('H6'), card('H7')] };
    const runJ: Pick<Meld, 'type' | 'cards'> = { type: 'run', cards: [card('H5'), card('J'), card('H7')] };
    expect(layOffDifficulty(card('C7'), set)).toBeLessThan(layOffDifficulty(card('H8'), run));
    expect(layOffDifficulty(card('H8'), runJ)).toBeGreaterThan(layOffDifficulty(card('H8'), run));
    expect(layOffDifficulty(card('H1'), run)).toBeGreaterThan(layOffDifficulty(card('H8'), run));
  });
  it('Klauen ist am schwersten: schwerer als der Durchschnitt aller Kombinationen', () => {
    expect(STEAL_DIFFICULTY).toBeGreaterThan(1);
    expect(STEAL_DIFFICULTY).toBeGreaterThan(d('H7', 'S7', 'D7'));
    expect(STEAL_DIFFICULTY).toBeGreaterThan(d('H5', 'H6', 'H7'));
  });
  it('im Mittel über die Kombinationen und Anlegemöglichkeiten echter Spiele ist die Schwierigkeit 1 (Skala kalibriert)', () => {
    let sum = 0;
    let n = 0;
    let loSum = 0;
    let loN = 0;
    for (let seed = 800; seed < 812; seed++) {
      playGames([seed], ['master'], (g, pid) => {
        if (g.round.turn.phase !== 'play') return;
        const hand = g.round.players[pid].hand;
        for (const grp of suggestLay(g, pid) ?? []) {
          const shape = interpretMeld(grp.map((id) => hand.find((c) => c.id === id)!));
          if (!shape) continue;
          sum += comboDifficulty(shape);
          n++;
        }
        if (g.round.players[pid].opened) {
          for (const c of hand) {
            const t = layOffTargets(g, pid, c.id);
            if (t.length) {
              loSum += layOffDifficulty(c, t[0].meld);
              loN++;
            }
          }
        }
      });
    }
    expect(n).toBeGreaterThan(150);
    expect(loN).toBeGreaterThan(150);
    expect(sum / n).toBeGreaterThan(0.85);
    expect(sum / n).toBeLessThan(1.15);
    expect(loSum / loN).toBeGreaterThan(0.85);
    expect(loSum / loN).toBeLessThan(1.15);
  }, 120000);
});

describe('overlooksAt: die Schwierigkeit skaliert die Grundchance', () => {
  const rate = (level: 'easy' | 'normal' | 'master', difficulty: number, forced = false) => {
    let miss = 0;
    let total = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const g = bare(seed * 23);
      for (let t = 0; t < 10; t++) {
        g.round.players[0].turns = t;
        const per = perceive(g, 0, MEMORY[level], forced);
        for (let k = 0; k < 40; k++) {
          total++;
          if (overlooksAt(g, 0, per, difficulty, k)) miss++;
        }
      }
    }
    return miss / total;
  };
  it('Schwierigkeit 0 wird nie übersehen, doppelte Schwierigkeit doppelt so oft, große Schwierigkeit fast immer', () => {
    expect(rate('normal', 0)).toBe(0);
    const base = rate('normal', 1);
    expect(base).toBeGreaterThan(0.09);
    expect(base).toBeLessThan(0.15);
    expect(rate('normal', 2) / base).toBeGreaterThan(1.8);
    expect(rate('normal', 2) / base).toBeLessThan(2.2);
    expect(rate('normal', 0.5) / base).toBeGreaterThan(0.4);
    expect(rate('normal', 0.5) / base).toBeLessThan(0.6);
    expect(rate('easy', 10)).toBeGreaterThan(0.99); // 0,22 × 10 > 1: gedeckelt, nie über 100 %
  });
  it('der Mastermind und Pflichtzüge übersehen bei keiner Schwierigkeit etwas', () => {
    for (const diff of [0.5, 1, 2.5]) {
      expect(rate('master', diff)).toBe(0);
      expect(rate('easy', diff, true)).toBe(0);
    }
  });
});

// ---------------------------------------------------------------- Sorgfalt (Entscheidungsfehler)

describe('pickByScore: Sorgfalt bei der Wahl', () => {
  const pickRate = (level: 'easy' | 'normal' | 'hard' | 'master', scores: number[], forced = false, noise?: number) => {
    const counts = new Array(scores.length).fill(0);
    let n = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const g = bare(seed * 29);
      for (let t = 0; t < 40; t++) {
        g.round.players[0].turns = t;
        const per = perceive(g, 0, noise === undefined ? MEMORY[level] : { ...MEMORY[level], noise }, forced);
        counts[pickByScore(g, 0, per, scores)]++;
        n++;
      }
    }
    return counts.map((c) => c / n);
  };

  it('der Mastermind und Pflichtzüge nehmen immer die beste Möglichkeit', () => {
    expect(pickRate('master', [1, 5, 3])).toEqual([0, 1, 0]);
    expect(pickRate('easy', [1, 5, 3], true)).toEqual([0, 1, 0]);
    expect(pickRate('easy', [1, 5, 3], false, 0)).toEqual([0, 1, 0]);
  });
  it('bei nur einer Möglichkeit oder gleich guten wird nichts verfälscht (die Wahl liegt dann gleichmäßig)', () => {
    expect(pickRate('easy', [7])).toEqual([1]);
    const even = pickRate('easy', [4, 4, 4, 4]);
    for (const p of even) expect(p).toBeGreaterThan(0.18);
  });
  it('Fehler sind Beinahe-Treffer: Eine fast gleich gute Karte wird oft, eine deutlich schlechtere praktisch nie gewählt', () => {
    const [best, near, far] = pickRate('easy', [10, 9, -20]); // noise 3: Abstand 1 ist Kleinigkeit, Abstand 30 nie
    expect(best).toBeGreaterThan(0.45);
    expect(near).toBeGreaterThan(0.25);
    expect(far).toBeLessThan(0.002);
  });
  it('je besser das Gedächtnis, desto sorgfältiger', () => {
    const scores = [10, 8, 6];
    const best = (level: 'easy' | 'normal' | 'hard') => pickRate(level, scores)[0];
    expect(best('easy')).toBeLessThan(best('normal'));
    expect(best('normal')).toBeLessThan(best('hard'));
    expect(best('hard')).toBeGreaterThan(0.8);
  });
  it('ein guter Tag macht sorgfältiger, ein schlechter schlampiger (Tagesform)', () => {
    const scores = [10, 8, 6];
    const g = bare(3);
    g.round.players[0].turns = 5;
    const base = perceive(g, 0, MEMORY.easy);
    const rate = (goodDay: number) => {
      let hits = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const gs = bare(seed);
        gs.round.players[0].turns = seed % 17;
        const per = { ...perceive(gs, 0, MEMORY.easy), goodDay };
        if (pickByScore(gs, 0, per, scores) === 0) hits++;
      }
      return hits / 400;
    };
    void base;
    expect(rate(0.3)).toBeGreaterThan(rate(0));
    expect(rate(0)).toBeGreaterThan(rate(-0.3));
  });
  it('dasselbe zum selben Zeitpunkt gibt dieselbe Wahl, in anderen Zügen und bei anderen Schlüsseln eine neue', () => {
    const g = bare(9);
    const per = perceive(g, 0, MEMORY.easy);
    const scores = [5, 5, 5, 5, 5];
    const a = Array.from({ length: 60 }, (_, k) => pickByScore(g, 0, per, scores, k));
    expect(Array.from({ length: 60 }, (_, k) => pickByScore(g, 0, per, scores, k))).toEqual(a);
    expect(new Set(a).size).toBeGreaterThan(1);
    g.round.players[0].turns = 4;
    expect(Array.from({ length: 60 }, (_, k) => pickByScore(g, 0, perceive(g, 0, MEMORY.easy), scores, k))).not.toEqual(a);
  });
  it('rechnet bei sehr großen Abständen (Joker mit −500) sauber, auch bei kleiner Streuung', () => {
    const r = pickRate('easy', [3, -500, 2], false, 0.0001);
    expect(r[1]).toBe(0);
    expect(r[0] + r[2]).toBeCloseTo(1, 9);
    expect(Number.isNaN(r[0])).toBe(false);
  });
});

// ---------------------------------------------------------------- Gegner-Gedächtnis

describe('recall: Hinweise auf die Absichten der Mitspieler', () => {
  const H9 = card('H9');
  const H10 = card('H10');
  const kinds = (g: GameState, params: MemoryParams = STEADY, pid = 0) => recall(g, pid, perceive(g, pid, params)).signals.map((s) => `${s.kind}:${s.player}`);

  it('offen genommene Karten sind ein Hinweis "nimmt" (und stehen weiter in takes)', () => {
    const g = bare();
    g.round.plies = 4;
    g.round.taken = [{ player: 2, card: H9, at: 4 }];
    const r = recall(g, 0, perceive(g, 0, STEADY));
    expect(r.signals).toEqual([{ player: 2, kind: 'take', cands: [{ suit: 'H', rank: 9 }] }]);
    expect(r.takes).toEqual([{ player: 2, cands: [{ suit: 'H', rank: 9 }] }]);
  });
  it('eine Karte im Ablagestapel heißt: Der Abwerfer braucht sie nicht, und der Nächste hat sie liegen lassen', () => {
    const g = bare();
    g.round.discard = [H9, ...BLACK.slice(0, 3)]; // H9 liegt unter drei Karten
    g.round.discardedBy = { [H9.id]: 2 };
    expect(kinds(g)).toContain('throw:2');
    expect(kinds(g)).toContain('decline:3'); // Spieler 3 kommt nach Spieler 2
    expect(kinds(g).filter((k) => k.endsWith(':2') && k.startsWith('decline'))).toEqual([]);
  });
  it('über sich selbst sammelt der Bot keine Hinweise: eigene Abwürfe und was er selbst liegen ließ', () => {
    const g = bare();
    g.round.discard = [H9, H10, ...BLACK.slice(0, 2)];
    g.round.discardedBy = { [H9.id]: 0, [H10.id]: 3 }; // H9 hat der Bot selbst abgeworfen, H10 Spieler 3 (danach käme der Bot)
    const ks = kinds(g);
    expect(ks).toContain('throw:3');
    expect(ks).toContain('decline:1'); // Spieler 1 hat H9 (vom Bot) liegen lassen
    expect(ks.some((k) => k.endsWith(':0'))).toBe(false);
  });
  it('ohne bekannten Abwerfer (alte Spielstände) gibt es keine Hinweise aus dem Ablagestapel', () => {
    const g = bare();
    g.round.discard = [H9, ...BLACK.slice(0, 3)];
    g.round.discardedBy = undefined;
    g.round.discardLog = undefined;
    expect(kinds(g)).toEqual([]);
  });
  it('die Hinweise verblassen wie die Erinnerung: erst unscharf, dann nur der Eindruck, dann weg', () => {
    const sizeAt = (age: number) => {
      const g = bare();
      g.round.discard = [H9, ...BLACK.slice(0, age)];
      g.round.discardedBy = { [H9.id]: 2 };
      const s = recall(g, 0, perceive(g, 0, STEADY)).signals.find((x) => x.kind === 'throw' && x.player === 2);
      return s ? s.cands.length : 0;
    };
    expect(sizeAt(3)).toBe(1); // exakt
    expect(sizeAt(8)).toBeGreaterThanOrEqual(2); // eine Achse verschwommen: Farbe (2) oder Wert (hier 8, 9, 10)
    expect(sizeAt(8)).toBeLessThanOrEqual(3);
    expect(sizeAt(20)).toBeGreaterThan(sizeAt(8)); // nur der Eindruck: viele Kandidaten
    expect(sizeAt(40)).toBe(0); // vergessen: kein Hinweis mehr
  });
  it('der Mastermind kennt alle Hinweise exakt, der Vergessliche verliert sie schneller', () => {
    const count = (level: 'easy' | 'master') => {
      let n = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const g = bare(seed);
        g.round.discard = [...BLACK.slice(0, 40)];
        g.round.discardedBy = Object.fromEntries(g.round.discard.map((c, i) => [c.id, 1 + (i % 3)]));
        const per = perceive(g, 0, MEMORY[level]);
        n += recall(g, 0, per).signals.length;
      }
      return n;
    };
    expect(count('master')).toBeGreaterThan(count('easy'));
  });
});
