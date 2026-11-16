import { describe, it, expect } from 'vitest';
import { Card, SUITS } from '../engine/cards';
import { GameState } from '../engine/game';
import { CardPool, setHand, testGame } from '../engine/testutil';
import { Unseen } from './memory';
import { DEFAULT_TUNING, ambition, growth, handChance, isBold, roundProgress, standing, weighOpening } from './strategy';

/** Alle Karten noch unbekannt (2 Kopien je Karte, 2 Joker): das Äußerste an Ungewissheit. */
function allUnseen(copies = 2): Unseen {
  const m = new Map<string, number>();
  for (const s of SUITS) for (let r = 1; r <= 13; r++) m.set(`${s}${r}`, copies);
  m.set('J', copies);
  return { copies: m, total: [...m.values()].reduce((a, b) => a + b, 0) };
}
const none = (): Unseen => ({ copies: new Map([...allUnseen().copies.keys()].map((k) => [k, 0])), total: 0 });

function game(totals: number[], historyLen = 0, rounds = 5): GameState {
  const g = testGame(4, 77, { rounds });
  g.totals = [...totals];
  g.history = Array.from({ length: historyLen }, () => g.history[0]) as GameState['history'];
  return g;
}

describe('standing: wo steht ein Spieler in der Tabelle?', () => {
  it('Rückstand auf den Besten, Vorsprung nur für den Führenden', () => {
    const g = game([50, 0, 30, 20]);
    expect(standing(g, 0)).toMatchObject({ behind: 50, leading: false, lead: 0 });
    expect(standing(g, 1)).toMatchObject({ behind: 0, leading: true, lead: 20 });
    expect(standing(g, 2)).toMatchObject({ behind: 30, leading: false, lead: 0 });
  });
  it('zu Spielbeginn (alle 0) führt jeder, ohne Vorsprung', () => {
    const g = game([0, 0, 0, 0]);
    for (let i = 0; i < 4; i++) expect(standing(g, i)).toMatchObject({ behind: 0, leading: true, lead: 0 });
  });
  it('wie viele Runden nach der laufenden noch kommen', () => {
    expect(standing(game([0, 0, 0, 0], 0, 5), 0).roundsLeft).toBe(4);
    expect(standing(game([0, 0, 0, 0], 3, 5), 0).roundsLeft).toBe(1);
    expect(standing(game([0, 0, 0, 0], 4, 5), 0).roundsLeft).toBe(0);
    expect(standing(game([0, 0, 0, 0], 9, 5), 0).roundsLeft).toBe(0);
  });
});

describe('ambition: Wie viel Risiko geht der Bot ein?', () => {
  it('beginnt bei der Spielweise und bleibt zwischen 0 und 1', () => {
    expect(ambition(game([0, 0, 0, 0]), 0, 0.4)).toBeCloseTo(0.4, 9); // alle gleich: weder vorn noch hinten
    for (const base of [0, 0.4, 1]) {
      for (const totals of [[300, 0, 0, 0], [0, 300, 300, 300], [0, 0, 0, 0]]) {
        for (const h of [0, 2, 4]) {
          const a = ambition(game(totals, h), 0, base);
          expect(a).toBeGreaterThanOrEqual(0);
          expect(a).toBeLessThanOrEqual(1);
        }
      }
    }
  });
  it('wer hinten liegt, wagt mehr, und das wächst mit dem Rückstand bis 100 Punkte', () => {
    const at = (behind: number) => ambition(game([behind, 0, 0, 0], 1), 0, 0.4);
    expect(at(0)).toBeLessThan(at(30));
    expect(at(30)).toBeLessThan(at(60));
    expect(at(60)).toBeLessThan(at(100));
    expect(at(100)).toBeCloseTo(at(250), 9); // mehr als 100 Rückstand macht nicht noch mutiger
    expect(at(100)).toBeCloseTo(0.9, 9);
  });
  it('wer führt und noch viele Runden vor sich hat, will Abstand gewinnen; kurz vor Schluss sichert er', () => {
    const early = ambition(game([0, 40, 50, 60], 1), 0, 0.4); // 3 Runden nach dieser
    const late = ambition(game([0, 40, 50, 60], 4), 0, 0.4); // letzte Runde
    expect(early).toBeCloseTo(0.5, 9);
    expect(late).toBeCloseTo(0.2, 9);
    expect(early).toBeGreaterThan(late);
  });
  it('im Endspurt wagt ein deutlich Zurückliegender noch mehr', () => {
    const mid = ambition(game([60, 0, 0, 0], 2), 0, 0.4);
    const finale = ambition(game([60, 0, 0, 0], 4), 0, 0.4);
    expect(finale - mid).toBeCloseTo(0.2, 9);
  });
  it('ein knapper Rückstand im Endspurt löst keinen Endspurt aus', () => {
    expect(ambition(game([30, 0, 0, 0], 4), 0, 0.4)).toBeCloseTo(0.4 + 0.5 * 0.3, 9);
  });
  it('die Spielweise verschiebt den Ausgangswert für alle Lagen gleich', () => {
    for (const totals of [[0, 0, 0, 0], [80, 0, 10, 0], [0, 90, 80, 70]]) {
      expect(ambition(game(totals, 1), 0, 0.3) - ambition(game(totals, 1), 0, 0.1)).toBeCloseTo(0.2, 9);
    }
    // an den Rändern wird abgeschnitten, nie über 1 oder unter 0
    expect(ambition(game([150, 0, 0, 0], 1), 0, 0.9)).toBe(1);
    expect(ambition(game([0, 90, 80, 70], 4), 0, 0.1)).toBe(0);
  });
  it('isBold: ab der Schwelle (Standard 0,7) spielt der Bot mutig', () => {
    expect(isBold(game([0, 0, 0, 0]), 0, 0.4)).toBe(false);
    expect(isBold(game([50, 0, 0, 0]), 0, 0.4)).toBe(false); // 0,65
    expect(isBold(game([60, 0, 0, 0]), 0, 0.4)).toBe(true); // 0,70
    expect(isBold(game([150, 0, 0, 0]), 0, 0.4)).toBe(true);
    expect(isBold(game([40, 0, 0, 0]), 0, 0.4, { boldAt: 0.55 })).toBe(true);
    expect(DEFAULT_TUNING.boldAt).toBe(0.7);
  });
});

describe('growth: Wie gut kann die Erstmeldung noch wachsen?', () => {
  const p = new CardPool();
  const hand: Card[] = p.takeAll('SK', 'HK', 'DK', 'H5', 'H6', 'H7', 'S9', 'S10', 'C2', 'D3');
  const ids = (...i: number[]) => i.map((k) => hand[k].id);
  const groups = [ids(0, 1, 2), ids(3, 4, 5)]; // Dreiersatz Könige, Folge Herz 5 bis 7

  it('Ergänzen geplanter Kombinationen und neue Kombination aus zwei übrigen Karten sind Chancen', () => {
    const g = growth(hand, groups, allUnseen(), 8);
    expect(g.chance).toBeGreaterThan(0);
    expect(g.expected).toBeGreaterThan(0);
    // Mit nichts mehr im Spiel gibt es keine Chance
    const n = growth(hand, groups, none(), 8);
    expect(n.chance).toBe(0);
    expect(n.expected).toBe(0);
  });
  it('die vierte Karte eines Satzes zählt: Der letzte König der vierten Farbe', () => {
    const only = none();
    only.copies.set('C13', 2);
    only.total = 2;
    const g = growth(hand, groups, only, 8);
    expect(g.chance).toBeCloseTo(2 / 8, 9); // U wird auf mindestens 8 gehoben
    expect(g.expected).toBeCloseTo((2 / 8) * 10, 9);
  });
  it('das Ende einer Folge zählt: Herz 8 (8 Augen) ja, Herz 4 (4 Augen) nur im Erwartungswert, nicht als lohnender Zuwachs', () => {
    const h8 = none();
    h8.copies.set('H8', 2);
    h8.total = 8;
    expect(growth(hand, groups, h8, 8).chance).toBeCloseTo(2 / 8, 9);
    const h4 = none();
    h4.copies.set('H4', 2);
    h4.total = 8;
    const g4 = growth(hand, groups, h4, 8);
    expect(g4.chance).toBe(0); // 4 Augen sind unter dem Mindestzuwachs
    expect(g4.expected).toBeCloseTo((2 / 8) * 4, 9);
  });
  it('aus zwei übrigen Karten wird eine neue Kombination: Pik 9 und 10 brauchen den Buben (29 Augen) oder die 8 (27 Augen)', () => {
    const sj = none();
    sj.copies.set('S11', 2);
    sj.total = 8;
    expect(growth(hand, groups, sj, 8).expected).toBeCloseTo((2 / 8) * 29, 9);
    const s8 = none();
    s8.copies.set('S8', 2);
    s8.total = 8;
    expect(growth(hand, groups, s8, 8).expected).toBeCloseTo((2 / 8) * 27, 9);
  });
  it('mehrere Züge Vorausschau erhöhen die Chance: 1 − (1 − p)^n, nie über 1', () => {
    const base = growth(hand, groups, allUnseen(), 8, 1).chance;
    const three = growth(hand, groups, allUnseen(), 8, 3).chance;
    expect(three).toBeCloseTo(1 - Math.pow(1 - base, 3), 9);
    expect(three).toBeGreaterThan(base);
    expect(growth(hand, groups, allUnseen(), 8, 500).chance).toBeLessThanOrEqual(1);
  });
  it('ein Joker im Spiel ist eine Chance (passt fast überall)', () => {
    const only = none();
    only.copies.set('J', 2);
    only.total = 8;
    expect(growth(hand, groups, only, 8).chance).toBeCloseTo(2 / 8, 9);
  });
  it('verändert weder die Hand noch die Karten im Spiel', () => {
    const before = JSON.stringify(hand);
    const un = allUnseen();
    const unBefore = JSON.stringify([...un.copies]);
    growth(hand, groups, un, 8, 2);
    expect(JSON.stringify(hand)).toBe(before);
    expect(JSON.stringify([...un.copies])).toBe(unBefore);
  });
});

describe('weighOpening (v1, getrennte Regeln): jetzt legen oder noch warten?', () => {
  /** 15 Karten: König-Satz (30), Folge Herz 7 bis 9 (24) = 54 Augen, dazu unverbundene Karten. Alle liegen gleichauf, der Ehrgeiz ist 0,4. */
  function world() {
    const g = game([0, 0, 0, 0]);
    const p = new CardPool();
    const me = g.round.starter;
    const hand = p.takeAll('SK', 'HK', 'DK', 'H7', 'H8', 'H9', 'C2', 'D3', 'S5', 'C10', 'D1', 'S12', 'H3', 'C6', 'D12');
    setHand(g, me, hand);
    g.round.players[me].turns = 0;
    g.round.stock = g.round.stock.slice(0, 60);
    const ids = (a: number, b: number) => hand.slice(a, b).map((c) => c.id);
    return { g, me, hand, groups: [ids(0, 3), ids(3, 6)] };
  }
  const weigh = (w: ReturnType<typeof world>, extra: { tuning?: object; [k: string]: unknown } = {}) =>
    weighOpening(w.g, w.me, { base: 0.4, groups: w.groups, hand: w.hand, unseen: allUnseen(), ...extra, tuning: { mode: 'v1' as const, draws: 1, ...(extra.tuning ?? {}) } });
  /** Wie der Test oben, aber ohne die Wachstumsprüfung und ohne mutigen Modus: Es soll nur der Wille zum Warten zählen. */
  const eager = { tuning: { ignoreGrowth: true, boldHold: false } };

  it('wartet nie bei Pflichtzügen', () => {
    const w = world();
    const r = weigh(w, { ...eager, forced: true });
    expect(r).toMatchObject({ hold: false, why: 'forced' });
  });
  it('wartet nie, wenn ein Gegner schon draußen ist', () => {
    const w = world();
    w.g.round.players[(w.me + 1) % 4].opened = true;
    expect(weigh(w, eager)).toMatchObject({ hold: false, why: 'opponent-open' });
  });
  it('wartet nie, wenn die Cheft-Hürde (101) gilt', () => {
    const w = world();
    w.g.round.cheftAnnounced = true;
    expect(weigh(w, eager)).toMatchObject({ hold: false, why: 'cheft-bar' });
  });
  it('wartet nicht, wenn der Stapel zur Neige geht', () => {
    const w = world();
    w.g.round.stock = w.g.round.stock.slice(0, 10);
    expect(weigh(w, eager)).toMatchObject({ hold: false, why: 'endgame' });
  });
  it('legt eine Hand (alle Karten bis auf eine) immer sofort', () => {
    const w = world();
    const hand = w.hand.slice(0, 10); // zehn Karten, davon neun in drei Dreiergruppen: nur eine bleibt übrig
    const ids = hand.map((c) => c.id);
    const groups = [ids.slice(0, 3), ids.slice(3, 6), ids.slice(6, 9)];
    expect(weigh(w, { ...eager, hand, groups })).toMatchObject({ hold: false, why: 'hand' });
    // Mit einer Karte weniger in den Gruppen ist es keine Hand mehr, dann entscheidet die Abwägung
    expect(weigh(w, { ...eager, hand: [...hand, w.hand[10]], groups }).why).not.toBe('hand');
  });
  it('wartet nicht auf Cheft-Paare: Die werden hier nicht abgewogen', () => {
    const w = world();
    const r = weigh(w, { ...eager, groups: [[w.hand[0].id, w.hand[1].id]] });
    expect(r).toMatchObject({ hold: false, why: 'pairs' });
  });
  it('wartet, solange die Geduld reicht, und legt dann doch', () => {
    const w = world();
    // Ehrgeiz 0,4 (alle gleichauf): Geduld round(1 + 5 × 0,4) = 3 eigene Züge
    for (const [turns, hold] of [[0, true], [1, true], [2, true], [3, false], [6, false]] as const) {
      w.g.round.players[w.me].turns = turns;
      const r = weigh(w, eager);
      expect(r.hold).toBe(hold);
      if (!hold) expect(r.why).toBe('patience-used');
    }
  });
  it('hoher Ehrgeiz bedeutet mehr Geduld', () => {
    const w = world();
    w.g.totals = [0, 0, 0, 0];
    w.g.totals[w.me] = 120; // weit hinten: Ehrgeiz 0,9, Geduld round(1 + 4,5) = 6
    w.g.round.players[w.me].turns = 5;
    expect(weigh(w, eager).hold).toBe(true);
    w.g.round.players[w.me].turns = 6;
    expect(weigh(w, eager)).toMatchObject({ hold: false, why: 'patience-used' });
  });
  it('legt sofort, wenn die Erstmeldung schon hoch genug ist (sie hebt die Hürde für die Gegner)', () => {
    const w = world();
    // Zusätzlich Damen- und Buben-Sätze: 54 + 30 + 30 = 114 Augen, über dem Ziel
    const p = new CardPool();
    const extra = p.takeAll('SD', 'HD', 'DD', 'SB', 'HB', 'DB');
    setHand(w.g, w.me, [...w.hand.slice(0, 9), ...extra]);
    const hand = w.g.round.players[w.me].hand;
    const ids = hand.map((c) => c.id);
    const r = weighOpening(w.g, w.me, { base: 0.4, hand, unseen: allUnseen(), groups: [ids.slice(0, 3), ids.slice(3, 6), ids.slice(9, 12), ids.slice(12, 15)], tuning: { mode: 'v1', ...eager.tuning } });
    expect(r.augen).toBeGreaterThanOrEqual(r.target);
    expect(r).toMatchObject({ hold: false, why: 'high-enough' });
  });
  it('wartet nicht, wenn nichts zu gewinnen ist (keine Aussicht auf mehr Augen)', () => {
    const w = world();
    expect(weigh(w, { unseen: none() })).toMatchObject({ hold: false, why: 'no-growth' });
  });
  it('wartet, wenn die Chance auf mehr Augen groß genug ist', () => {
    const w = world();
    const r = weigh(w, { tuning: { minChance: 0, boldHold: false } });
    expect(r).toMatchObject({ hold: true, why: 'wait-for-more' });
    expect(r.chance).toBeGreaterThan(0);
  });
  it('wer weit hinten liegt, wartet auch ohne erkennbare Aussicht (die Siegchance zählt, nicht der Durchschnitt)', () => {
    const w = world();
    w.g.totals[w.me] = 120;
    expect(weigh(w, { unseen: none(), tuning: { boldHold: true } })).toMatchObject({ hold: true, why: 'wait-no-check' });
    // ... nur wenn dieser Zug des mutigen Modus erlaubt ist (Standard: aus, in Simulationen kostet er Siege)
    expect(DEFAULT_TUNING.boldHold).toBe(false);
    expect(weigh(w, { unseen: none() })).toMatchObject({ hold: false, why: 'no-growth' });
  });
  it('der mutige Modus hebelt die Sicherheitsbremsen nicht aus: Gegner draußen, Cheft-Hürde, Rundenende, Hand', () => {
    const w = world();
    w.g.totals[w.me] = 120;
    w.g.round.players[(w.me + 1) % 4].opened = true;
    expect(weigh(w, { tuning: { boldHold: true } }).why).toBe('opponent-open');
    const w2 = world();
    w2.g.totals[w2.me] = 120;
    w2.g.round.stock = w2.g.round.stock.slice(0, 5);
    expect(weigh(w2, { tuning: { boldHold: true } }).why).toBe('endgame');
    const w3 = world();
    w3.g.totals[w3.me] = 120;
    w3.g.round.cheftAnnounced = true;
    expect(weigh(w3, { tuning: { boldHold: true } }).why).toBe('cheft-bar');
  });
  it('verändert den Spielzustand nicht', () => {
    const w = world();
    const before = JSON.stringify(w.g);
    weigh(w, eager);
    weigh(w, { unseen: none() });
    expect(JSON.stringify(w.g)).toBe(before);
  });
  it('gibt die Gründe und Kennzahlen mit (für Tests und Fehlersuche)', () => {
    const w = world();
    const r = weigh(w, eager);
    expect(r.ambition).toBeCloseTo(0.4, 9);
    expect(r.augen).toBe(54);
    expect(r.target).toBeCloseTo(51 + 10 + 40 * 0.4, 9);
  });
});

describe('handChance: Wie wahrscheinlich ist eine Hand?', () => {
  const p = new CardPool();
  // Zwölf Karten in vier Kombinationen (König-Satz, Folge Pik 5 bis 8, Folge Herz 9 bis Bube, Folge Karo 2 bis 4) = 13 Karten,
  // zwei bleiben übrig: Kreuz 9 und Karo Dame.
  const hand: Card[] = p.takeAll('SK', 'HK', 'DK', 'S5', 'S6', 'S7', 'S8', 'H9', 'H10', 'HB', 'D2', 'D3', 'D4', 'C9', 'DD');
  const g = (a: number, b: number) => hand.slice(a, b).map((c) => c.id);
  const groups = [g(0, 3), g(3, 7), g(7, 10), g(10, 13)];
  const only = (keys: Record<string, number>): Unseen => {
    const m = new Map(Object.entries(keys));
    return { copies: m, total: [...m.values()].reduce((a, b) => a + b, 0) };
  };

  it('ist schon eine Hand, wenn höchstens eine Karte übrig bleibt (Chance 1)', () => {
    // 15 von 15 Karten verplant (die letzte Gruppe hat nur zwei Karten, hier zählt nur, wie viele Karten verplant sind)
    expect(handChance(hand, [g(0, 3), g(3, 7), g(7, 10), g(10, 13), g(13, 15)], allUnseen())).toBe(1);
    // 13 von 14 Karten: ein Rest, der abgeworfen wird
    expect(handChance(hand.slice(0, 14), groups, allUnseen())).toBe(1);
  });
  it('bei mehr als drei Restkarten ist eine Hand in den nächsten Zügen unrealistisch', () => {
    expect(handChance(hand, [g(0, 3), g(3, 7)], allUnseen())).toBe(0); // acht Restkarten
    expect(handChance(hand, [g(0, 3), g(3, 7), g(7, 10)], allUnseen())).toBe(0); // fünf Restkarten
  });
  it('mit zwei Restkarten: Die Karte, die die letzte Kombination verlängert, macht die Hand', () => {
    // Pik 9 verlängert die Folge Pik 5 bis 8: Dann bleibt nur Kreuz 9 (der Abwurf) übrig
    const chance = handChance(hand, groups, only({ S9: 2 }));
    expect(chance).toBeCloseTo(2 / 8, 9); // U wird auf mindestens 8 gehoben
    expect(handChance(hand, groups, only({ H2: 2 }))).toBe(0); // passt nirgends
    expect(handChance(hand, groups, only({}))).toBe(0);
  });
  it('mehrere erwünschte Karten addieren sich (Pik 9 und der vierte König)', () => {
    expect(handChance(hand, groups, only({ S9: 2, C13: 2 }))).toBeCloseTo(4 / 8, 9);
  });
  it('mehrere Züge Vorausschau erhöhen die Chance: 1 − (1 − p)^n', () => {
    const one = handChance(hand, groups, only({ S9: 2 }), 1);
    expect(handChance(hand, groups, only({ S9: 2 }), 3)).toBeCloseTo(1 - Math.pow(1 - one, 3), 9);
  });
  it('verändert weder die Hand noch die Karten im Spiel', () => {
    const before = JSON.stringify(hand);
    const un = allUnseen();
    const unBefore = JSON.stringify([...un.copies]);
    handChance(hand, groups, un, 2);
    expect(JSON.stringify(hand)).toBe(before);
    expect(JSON.stringify([...un.copies])).toBe(unBefore);
  });
  it('rechnet auch mit drei Restkarten in überschaubarer Zeit', () => {
    const t0 = Date.now();
    handChance(hand, [g(0, 3), g(3, 7), g(7, 10)].concat([g(10, 12)].slice(1)), allUnseen(), 2);
    handChance(hand.slice(0, 14), [g(0, 3), g(3, 7), g(7, 10)], allUnseen(), 2);
    expect(Date.now() - t0).toBeLessThan(5000);
  });
});

describe('roundProgress: Wie weit ist die Runde?', () => {
  it('0 zu Beginn, 1 am Ende des sinnvollen Wartens, dazwischen steigend und begrenzt', () => {
    for (const n of [2, 3, 4]) {
      const g = testGame(n, 5);
      const start = g.round.stock.length;
      expect(roundProgress(g, 16)).toBeCloseTo(0, 5);
      let last = -1;
      for (const left of [start, start - 5, start - 15, 20, 16, 10, 0]) {
        g.round.stock = g.round.stock.length >= left ? g.round.stock.slice(0, left) : g.round.stock;
        const v = roundProgress(g, 16);
        expect(v).toBeGreaterThanOrEqual(last);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        last = v;
      }
      expect(roundProgress(g, 16)).toBe(1);
    }
  });
});

describe('weighOpening v2: Hand-Chance, Höhe und Zeitdruck gegeneinander', () => {
  /**
   * Die Hand der Hand-Chance-Tests: 13 Karten in vier Kombinationen (94 Augen), zwei Restkarten (Kreuz 9, Karo Dame).
   * Pik 9 verlängert die Folge Pik 5 bis 8 und macht dann eine Hand: Chance 2 von (mindestens) 8 = 0,25 pro Zug.
   */
  function world() {
    const g = game([0, 0, 0, 0]);
    const p = new CardPool();
    const me = g.round.starter;
    const hand = p.takeAll('SK', 'HK', 'DK', 'S5', 'S6', 'S7', 'S8', 'H9', 'H10', 'HB', 'D2', 'D3', 'D4', 'C9', 'DD');
    setHand(g, me, hand);
    g.round.players[me].turns = 0;
    const ids = (a: number, b: number) => hand.slice(a, b).map((c) => c.id);
    return { g, me, hand, groups: [ids(0, 3), ids(3, 7), ids(7, 10), ids(10, 13)] };
  }
  const only = (keys: Record<string, number>): Unseen => {
    const m = new Map(Object.entries(keys));
    return { copies: m, total: [...m.values()].reduce((a, b) => a + b, 0) };
  };
  /** Reine Hand-Chance: Höhe der Erstmeldung zählt nicht (wBar 0, Ziel weit über den 94 Augen), nur die Hand und die Zeit. */
  const handOnly = (extra: object = {}) => ({ mode: 'v2' as const, draws: 1, wBar: 0, t0: 60, wHand: 1.5, wTime: 0.6, holdAt0: 0.4, holdAt1: 0.3, ...extra });
  const weigh = (w: ReturnType<typeof world>, tuning: object, unseen: Unseen = only({ S9: 2 }), extra: object = {}) =>
    weighOpening(w.g, w.me, { base: 0.4, groups: w.groups, hand: w.hand, unseen, tuning, ...extra });

  it('die Sicherheitsbremsen gelten unverändert: Pflichtzug, Paare, Hand, Gegner draußen, Cheft-Hürde, Rundenende, Geduld, hohe Erstmeldung', () => {
    const w = world();
    expect(weigh(w, { mode: 'v2' }, allUnseen(), { forced: true }).why).toBe('forced');
    expect(weigh(w, { mode: 'v2' }, allUnseen(), { groups: [[w.hand[0].id, w.hand[1].id]] }).why).toBe('pairs');
    const ids = w.hand.map((c) => c.id);
    expect(weigh(w, { mode: 'v2' }, allUnseen(), { hand: w.hand.slice(0, 10), groups: [ids.slice(0, 3), ids.slice(3, 6), ids.slice(6, 9)] }).why).toBe('hand');
    w.g.round.players[(w.me + 1) % 4].opened = true;
    expect(weigh(w, handOnly()).why).toBe('opponent-open');
    w.g.round.players[(w.me + 1) % 4].opened = false;
    w.g.round.cheftAnnounced = true;
    expect(weigh(w, handOnly()).why).toBe('cheft-bar');
    w.g.round.cheftAnnounced = false;
    const stock = w.g.round.stock;
    w.g.round.stock = stock.slice(0, 5);
    expect(weigh(w, handOnly()).why).toBe('endgame');
    w.g.round.stock = stock;
    w.g.round.players[w.me].turns = 9;
    expect(weigh(w, handOnly()).why).toBe('patience-used');
  });
  it('eine hohe Erstmeldung allein ist in v2 kein Grund zum Warten, die Hand-Chance aber kann trotzdem warten lassen', () => {
    const w = world();
    // 94 Augen liegen über dem Ziel (77): Der Hürden-Anteil ist 0, ohne Hand-Chance wird gelegt
    const plain = weigh(w, { mode: 'v2', draws: 1, wHand: 0 });
    expect(plain.augen).toBeGreaterThan(plain.target);
    expect(plain).toMatchObject({ hold: false, why: 'open-v2' });
    // ... mit einer Hand-Chance (Pik 9) wartet er, obwohl die Erstmeldung schon hoch ist
    const hand = weigh(w, { mode: 'v2', draws: 1, wHand: 1.5, wTime: 0.6 });
    expect(hand.augen).toBeGreaterThan(hand.target);
    expect(hand).toMatchObject({ hold: true, why: 'wait-v2' });
    // v1 legt eine hohe Erstmeldung immer sofort
    expect(weigh(w, { mode: 'v1' }).why).toBe('high-enough');
  });
  it('liefert die Bestandteile des Wertes (Hand-Chance, Zeitdruck, Wert), nur in v2', () => {
    const w = world();
    const r = weigh(w, handOnly());
    expect(r.pHand).toBeCloseTo(0.25, 9);
    expect(r.time).toBeGreaterThanOrEqual(0);
    expect(r.time).toBeLessThanOrEqual(1);
    expect(r.score).toBeCloseTo(1.5 * 0.25 - 0.6 * r.time!, 9);
    expect(weigh(w, { mode: 'v1' }).score).toBeUndefined();
  });
  it('eine Hand-Chance von 25 % lässt warten, obwohl die Erstmeldung mit 94 Augen längst reichen würde', () => {
    const w = world();
    const r = weigh(w, handOnly());
    expect(r).toMatchObject({ hold: true, why: 'wait-v2' });
    expect(r.augen).toBe(94);
  });
  it('ohne Hand-Chance (nichts, was die Hand macht) wird sofort gelegt', () => {
    const w = world();
    const r = weigh(w, handOnly(), only({ H2: 2 }));
    expect(r.pHand).toBe(0);
    expect(r).toMatchObject({ hold: false, why: 'open-v2' });
  });
  it('das Gewicht der Hand-Chance entscheidet: Bei 0 wird gelegt, bei hohem Wert gewartet', () => {
    const w = world();
    expect(weigh(w, handOnly({ wHand: 0 })).hold).toBe(false);
    expect(weigh(w, handOnly({ wHand: 3 })).hold).toBe(true);
  });
  it('Zeitdruck gegen Hand-Chance: Mit dem Rundenverlauf kippt das Warten zum Legen und kippt nie zurück', () => {
    const w = world();
    const full = w.g.round.stock;
    const seq: boolean[] = [];
    const times: number[] = [];
    for (const left of [full.length, 44, 38, 32, 26, 22, 20, 18, 17]) {
      w.g.round.stock = full.slice(0, Math.min(left, full.length));
      const r = weigh(w, handOnly({ wTime: 1.5 }));
      seq.push(r.hold);
      times.push(r.time!);
    }
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    expect(seq[0]).toBe(true); // früh: warten
    expect(seq[seq.length - 1]).toBe(false); // spät: legen
    // einmal "legen", immer "legen"
    for (let i = 1; i < seq.length; i++) if (!seq[i - 1]) expect(seq[i]).toBe(false);
  });
  it('wer hinten liegt (hoher Ehrgeiz), wartet bei gleichem Wert früher als wer gleichauf liegt', () => {
    // Der Wert (0,2) liegt zwischen den Schwellen für Gleichauf (0,28) und für weit hinten (0,13)
    const tuning = handOnly({ wHand: 0.8, wTime: 0 });
    const even = world();
    const behind = world();
    behind.g.totals[behind.me] = 120;
    const a = weigh(even, tuning);
    const b = weigh(behind, tuning);
    expect(a.score).toBeCloseTo(b.score!, 9);
    expect(b.ambition).toBeGreaterThan(a.ambition);
    expect(a.hold).toBe(false);
    expect(b.hold).toBe(true);
  });
  it('die Höhe der Erstmeldung zählt: Je weiter unter dem Ziel und je aussichtsreicher, desto eher wird gewartet', () => {
    const w = world();
    // Hand-Chance ausgeschaltet, nur die erwartete Verbesserung der Erstmeldung. Ziel 51 + 37 + 16 = 104: zehn Augen über den 94,
    // bewertet am Weg von der Hürde (51) bis zum Ziel (53 Augen)
    const tuning = { mode: 'v2' as const, draws: 1, wHand: 0, wTime: 0, t0: 37, wBar: 4 };
    const lots = weigh(w, tuning, only({ S9: 2, C13: 2, H8: 2, H11: 2 }));
    const little = weigh(w, tuning, only({ S9: 2, H2: 60 }));
    expect(lots.score!).toBeGreaterThan(little.score!);
    expect(lots.hold).toBe(true);
    expect(little.hold).toBe(false);
  });
  it('die Standardwerte der Abwägung sind die abgestimmten (Duell: 50,7 % gegen die vorherige Fassung bei 1920 Spielen)', () => {
    expect(DEFAULT_TUNING).toMatchObject({ mode: 'v2', draws: 2, wHand: 0.7, wBar: 0.8, wTime: 1.2, holdAt0: 0.4, holdAt1: 0.3, endgameStock: 16, boldAt: 0.7, boldHold: false, boldHand: true, boldCheft: true });
  });
  it('liegt die Erstmeldung schon fast am Ziel, bringt die erwartete Verbesserung kaum etwas, auch nicht für Ehrgeizige', () => {
    const w = world();
    w.g.totals[w.me] = 120; // Ehrgeiz 0,9: niedrige Schwelle zum Warten
    // Ziel 51 + 10 + 36 = 97, die Erstmeldung hat 94: höchstens drei Augen gibt es noch zu holen
    const r = weigh(w, { mode: 'v2', draws: 1, wHand: 0, wTime: 0, wBar: 0.8 }, only({ S9: 2, C13: 2, H8: 2 }));
    expect(r.target).toBeCloseTo(97, 5);
    expect(r.score!).toBeLessThan(0.1);
    expect(r.hold).toBe(false);
  });
  it('verändert den Spielzustand nicht', () => {
    const w = world();
    const before = JSON.stringify(w.g);
    weigh(w, handOnly({ draws: 3 }));
    expect(JSON.stringify(w.g)).toBe(before);
  });
});
