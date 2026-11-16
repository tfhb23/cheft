import { describe, it, expect } from 'vitest';
import { Card, SUITS } from '../engine/cards';
import { GameState } from '../engine/game';
import { CardPool, setHand, testGame } from '../engine/testutil';
import { Unseen } from './memory';
import { DEFAULT_TUNING, ambition, growth, isBold, standing, weighOpening } from './strategy';

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

describe('weighOpening: jetzt legen oder noch warten?', () => {
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
  const weigh = (w: ReturnType<typeof world>, extra: object = {}) => weighOpening(w.g, w.me, { base: 0.4, groups: w.groups, hand: w.hand, unseen: allUnseen(), ...extra });
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
    const r = weighOpening(w.g, w.me, { base: 0.4, hand, unseen: allUnseen(), groups: [ids.slice(0, 3), ids.slice(3, 6), ids.slice(9, 12), ids.slice(12, 15)], ...eager });
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
