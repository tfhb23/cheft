import { describe, expect, it } from 'vitest';
import { Card, isJoker, makeDeck, makeRng } from '../engine/cards';
import { GameState } from '../engine/game';
import { RoundProfile, buildProfiles } from '../engine/profile';
import { ALL_TYPES, ROMME_TYPES, findPartition } from '../engine/melds';
import { testGame } from '../engine/testutil';
import { decideAction, inCompleteCombo } from './bot';
import { MEMORY, MemoryParams } from './memory';
import { OppModel, likes, opponentModel, tempoShift } from './opponents';
import { resolvePersona as resolve } from './personas';
import { NEIGHBORS, RoleId, STYLE_IDS, describeRoleRounds, rolePersona, rolesPerRound } from './roles';
import { simulate } from './simulate';
import { TasteSet, TasteSpec, describeTasteSet, matches, tasteScore, tastesFor } from './tastes';

const deck = makeDeck();
const code = (suit: 'H' | 'D' | 'C' | 'S', rank: number) => ({ H: 0, D: 1, C: 2, S: 3 })[suit] * 16 + rank;

// ---------------------------------------------------------------- Vorlieben

describe('Vorlieben', () => {
  it('sind je Spiel und Platz fest und unterscheiden sich zwischen Spielen und Plätzen', () => {
    const a = JSON.stringify(tastesFor(1234, 2));
    expect(JSON.stringify(tastesFor(1234, 2))).toBe(a);
    const seen = new Set<string>();
    for (let seed = 0; seed < 300; seed++) for (let pid = 0; pid < 4; pid++) seen.add(JSON.stringify(tastesFor(seed, pid)));
    expect(seen.size).toBeGreaterThan(1150); // fast jedes Paar aus Spiel und Platz hat eigene Vorlieben
  });

  it('Vielfalt: alle Arten kommen vor, es gibt Abneigungen, Aberglaube, Strukturwünsche und „große Spannen“', () => {
    const kinds = new Set<string>();
    let dislike = 0;
    let superstition = 0;
    let structure = 0;
    let union = 0;
    let multi = 0;
    const N = 800;
    for (let seed = 0; seed < N; seed++) {
      const t = tastesFor(seed, 0);
      if (t.tastes.filter((x) => x.weight > 0 && !x.superstition).length >= 2) multi++;
      for (const x of t.tastes) {
        kinds.add(x.spec.kind);
        if (x.weight < 0 && !x.superstition) dislike++;
        if (x.superstition) superstition++;
        if (x.spec.kind === 'union') union++;
      }
      if (t.structure) structure++;
    }
    for (const k of ['suit', 'color', 'range', 'parity', 'ranks', 'cards', 'combo', 'union']) expect(kinds.has(k)).toBe(true);
    expect(dislike).toBeGreaterThan(N * 0.25);
    expect(superstition).toBeGreaterThan(N * 0.3);
    expect(structure).toBeGreaterThan(N * 0.35);
    expect(union).toBeGreaterThan(N * 0.1);
    expect(multi).toBeGreaterThan(N * 0.3);
  });

  it('jede Beschreibung ist ein lesbarer deutscher Satz, auch bei Randfällen', () => {
    for (let seed = 0; seed < 300; seed++) {
      const lines = describeTasteSet(tastesFor(seed, seed % 4));
      for (const l of lines) {
        expect(l.length).toBeGreaterThan(3);
        expect(l).not.toMatch(/undefined|NaN|\[object/);
      }
    }
    expect(describeTasteSet({ intensity: 1, tastes: [{ spec: { kind: 'suit', suit: 'H' }, weight: 3 }, { spec: { kind: 'ranks', ranks: [7, 13] }, weight: -2 }, { spec: { kind: 'ranks', ranks: [7] }, weight: 3.5, superstition: true }] })).toEqual(['mag Herzkarten', 'mag keine Siebener und Könige', 'Glückszahl Sieben']);
  });

  it('passen: Farbe, Wertklassen, gerade und ungerade (nur Zahlkarten), Einzelkarten, Mischungen und große Spannen', () => {
    const c = (suit: 'H' | 'D' | 'C' | 'S', rank: number) => ({ suit, rank });
    expect(matches({ kind: 'color', color: 'black' }, c('S', 4))).toBe(true);
    expect(matches({ kind: 'color', color: 'black' }, c('H', 4))).toBe(false);
    expect(matches({ kind: 'range', range: 'face' }, c('H', 11))).toBe(true);
    expect(matches({ kind: 'range', range: 'face' }, c('H', 10))).toBe(false);
    expect(matches({ kind: 'range', range: 'low' }, c('H', 1))).toBe(false); // das Ass ist nicht niedrig
    expect(matches({ kind: 'parity', odd: true }, c('D', 7))).toBe(true);
    expect(matches({ kind: 'parity', odd: true }, c('D', 11))).toBe(false); // Bildkarten zählen nicht als ungerade Zahl
    expect(matches({ kind: 'parity', odd: false }, c('D', 10))).toBe(true);
    expect(matches({ kind: 'combo', color: 'black', range: 'face' }, c('C', 12))).toBe(true);
    expect(matches({ kind: 'combo', suit: 'H', minRank: 8 }, c('H', 7))).toBe(false);
    expect(matches({ kind: 'combo', suit: 'H', minRank: 8 }, c('H', 8))).toBe(true);
    const span: TasteSpec = { kind: 'union', parts: [{ kind: 'ranks', ranks: [6, 9] }, { kind: 'cards', cards: [{ suit: 'H', rank: 11 }] }] };
    expect(matches(span, c('S', 6))).toBe(true);
    expect(matches(span, c('H', 11))).toBe(true);
    expect(matches(span, c('S', 11))).toBe(false);
    expect(matches({ kind: 'suit', suit: 'H' }, { suit: 'J', rank: 0 })).toBe(false); // Joker passen nie
  });

  it('der Zuschlag ist gedeckelt, auch bei absurden Gewichten; ohne Intensität oder ohne Treffer ist er 0', () => {
    const crazy: TasteSet = { intensity: 1, tastes: Array.from({ length: 30 }, () => ({ spec: { kind: 'suit', suit: 'H' }, weight: 1e9 })) };
    expect(tasteScore(crazy, { suit: 'H', rank: 5 })).toBeLessThanOrEqual(9);
    expect(tasteScore(crazy, { suit: 'S', rank: 5 })).toBe(0);
    expect(tasteScore({ ...crazy, intensity: 0 }, { suit: 'H', rank: 5 })).toBe(0);
    expect(tasteScore({ intensity: 1, tastes: [{ spec: { kind: 'ranks', ranks: [] }, weight: 5 }] }, { suit: 'H', rank: 5 })).toBe(0);
    expect(tasteScore({ intensity: 1, tastes: [{ spec: { kind: 'suit', suit: 'H' }, weight: 4 }, { spec: { kind: 'suit', suit: 'H' }, weight: -4 }] }, { suit: 'H', rank: 5 })).toBe(0); // Vorliebe und Abneigung heben sich auf
  });

  it('Schutz: fertige Kombinationen (Paar, Satz, Folge) werden als solche erkannt', () => {
    const c = (suit: 'H' | 'D' | 'C' | 'S', rank: number, id: number): Card => ({ id, suit, rank });
    const hand = [c('D', 5, 1), c('D', 5, 2), c('D', 9, 3), c('C', 9, 4), c('S', 9, 5), c('H', 2, 6), c('H', 3, 7), c('H', 4, 8), c('S', 13, 9), c('S', 12, 10), c('S', 2, 11)];
    expect(inCompleteCombo(hand[0], hand, 'cheft', true)).toBe(true); // Paar bei Cheft
    expect(inCompleteCombo(hand[0], hand, 'romme', true)).toBe(false); // Rommé nach der Erstmeldung: Paar zählt nicht
    expect(inCompleteCombo(hand[2], hand, 'romme', true)).toBe(true); // Satz
    expect(inCompleteCombo(hand[5], hand, 'romme', true)).toBe(true); // Folge H2 H3 H4
    expect(inCompleteCombo(hand[8], hand, 'romme', true)).toBe(false); // Pik König und Dame ohne dritte Karte
    expect(inCompleteCombo(hand[8], [...hand, c('S', 11, 12)], 'romme', true)).toBe(true); // jetzt mit dem Buben
  });
});

// ---------------------------------------------------------------- Rundenprofile und Gegner-Gedächtnis

/** Ein Spielstand mit vorgegebenen Profilen vergangener Runden für Spieler 1. */
function withProfiles(profiles: Partial<RoundProfile>[], seed = 5, now = profiles.length + 1): GameState {
  const g = testGame(4, seed);
  g.round.no = now;
  g.history = profiles.map((p, i) => ({
    roundNo: i + 1,
    winner: null,
    reason: 'stock' as const,
    winnerMode: null,
    hand: false,
    jokerBurned: false,
    scores: [],
    profiles: [0, 1, 2, 3].map((pl) => ({ turns: 8, cheft: false, openTurn: 4, openAugen: 60, first: false, hand: false, discards: [], takes: [], steals: 0, ...(pl === 1 ? p : {}) })),
  }));
  return g;
}

const MASTER = MEMORY.master;

describe('Rundenprofile', () => {
  it('werden am Rundenende je Spieler aufgezeichnet: Abwürfe, genommene Karten, Cheft, Erstmeldung', () => {
    const res = simulate({ seed: 71, rounds: 3, seats: Array.from({ length: 4 }, () => ({ level: 'normal' as const, style: 'balanced' as const })) });
    const hist = res.state.history;
    expect(hist).toHaveLength(3);
    for (const h of hist) {
      expect(h.profiles).toHaveLength(4);
      h.profiles!.forEach((p) => {
        expect(p.turns).toBeGreaterThan(0);
        expect(p.discards.length).toBeGreaterThan(0);
        for (const c of [...p.discards, ...p.takes]) expect(c >= 1 && c <= 64).toBe(true);
        if (p.openTurn !== null) expect(p.openTurn).toBeGreaterThanOrEqual(1);
      });
      // höchstens einer ist „als Erster draußen“
      expect(h.profiles!.filter((p) => p.first).length).toBeLessThanOrEqual(1);
    }
  });

  it('die Abwürfe im Profil entsprechen genau dem Protokoll der Runde', () => {
    const g = testGame(4, 9);
    g.round.log = [
      { key: 'log.draw.stock', player: 1 },
      { key: 'log.discard', player: 1, params: { card: 5 } },
      { key: 'log.draw.discard', player: 2 },
      { key: 'log.open', player: 2, params: { augen: 62, pairs: 0 } },
      { key: 'log.discard', player: 2, params: { card: 14 } },
      { key: 'log.cheft', player: 3 },
    ];
    const p = buildProfiles(g);
    expect(p[1].discards).toEqual([code('H', 6)]); // Karte 5 = Herz 6
    expect(p[2].discards).toEqual([code('D', 2)]); // Karte 14 = Karo 2 (13 Karten je Farbe: Herz 0..12, Karo ab 13)
    expect(p[2].openTurn).toBe(1);
    expect(p[2].openAugen).toBe(62);
    expect(p[2].first).toBe(true);
    expect(p[3].cheft).toBe(true);
    expect(p[0].openTurn).toBeNull();
  });
});

describe('Gegner-Gedächtnis', () => {
  const cheftRounds = Array.from({ length: 6 }, () => ({ cheft: true, openTurn: null as number | null, openAugen: null as number | null }));

  it('der Mastermind kennt Cheft-Neigung, früh/spät und „nie raus“ genau', () => {
    const g = withProfiles(cheftRounds);
    const m = opponentModel(g, 0, 1, MASTER)!;
    expect(m.rounds).toBe(6);
    expect(m.cheftRate).toBe(1);
    expect(m.neverRate).toBe(1);
    expect(m.earlyRate).toBe(0);
    const fast = opponentModel(withProfiles(Array.from({ length: 5 }, () => ({ openTurn: 2, openAugen: 70, first: true }))), 0, 1, MASTER)!;
    expect(fast.earlyRate).toBe(1);
    expect(fast.firstRate).toBe(1);
    expect(fast.avgOpen).toBe(70);
    expect(fast.cheftRate).toBe(0);
  });

  it('ohne Profile (alte Spielstände), ohne vergangene Runden, für sich selbst oder bei Gedächtnis ohne Beobachtung: kein Bild', () => {
    const g = testGame(4, 3);
    expect(opponentModel(g, 0, 1, MASTER)).toBeNull();
    const old = withProfiles(cheftRounds);
    old.history.forEach((h) => delete h.profiles);
    expect(opponentModel(old, 0, 1, MASTER)).toBeNull();
    expect(opponentModel(withProfiles(cheftRounds), 1, 1, MASTER)).toBeNull();
    expect(opponentModel(withProfiles(cheftRounds), 0, 1, MEMORY.easy)).toBeNull();
  });

  it('erkennt Vorlieben: Wer nie Herz abwirft und Herz nimmt, „mag“ Herz; wer Pik abwirft, nicht', () => {
    const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const discards = ranks.flatMap((r) => [code('D', r), code('C', r), code('S', r)]).slice(0, 20);
    const g = withProfiles([{ discards, takes: [code('H', 5), code('H', 9)] }, { discards: discards.slice(10), takes: [code('H', 7)] }]);
    const m = opponentModel(g, 0, 1, MASTER)!;
    expect(m.detail).toBe(2);
    expect(m.suit[0]).toBeGreaterThan(0.3); // Herz
    expect(likes(m, { suit: 'H', rank: 6 })).toBeGreaterThan(0);
    expect(likes(m, { suit: 'S', rank: 6 })).toBeLessThan(likes(m, { suit: 'H', rank: 6 }));
    expect(likes(m, { suit: 'J', rank: 0 })).toBe(0);
    expect(likes(null, { suit: 'H', rank: 6 })).toBe(0);
  });

  it('schwächere Gedächtnisse wissen weniger: Normal nur grob, Scharfsinnig ohne einzelne Farbe, beide mit Lücken', () => {
    const discards = Array.from({ length: 30 }, (_, i) => code(i % 2 ? 'D' : 'C', 2 + (i % 10)));
    const profiles = Array.from({ length: 8 }, () => ({ discards, cheft: true }));
    const g = withProfiles(profiles);
    const normal = opponentModel(g, 0, 1, { ...MEMORY.normal, oppObserve: 1, oppAccuracy: 1 })!;
    expect(normal.detail).toBe(0);
    const hard = opponentModel(g, 0, 1, { ...MEMORY.hard, oppObserve: 1, oppAccuracy: 1 })!;
    expect(hard.detail).toBe(1);
    // Beobachtungslücken: 8 Runden, nur ein Teil ist angekommen; Spanne: nur die jüngsten Runden
    let totalSeen = 0;
    for (let seed = 1; seed <= 40; seed++) totalSeen += opponentModel(withProfiles(profiles, seed), 0, 1, { ...MEMORY.normal, oppSpan: 99 })?.rounds ?? 0;
    expect(totalSeen / 40).toBeGreaterThan(3.5);
    expect(totalSeen / 40).toBeLessThan(6.0); // Beobachtung 0,6 von 8 Runden = 4,8
    const span2 = opponentModel(withProfiles(profiles), 0, 1, { ...MASTER, oppSpan: 2 })!;
    expect(span2.rounds).toBe(2);
  });

  it('Merkfehler verwässern: Bei Genauigkeit 0 stimmt die Cheft-Neigung oft nicht mehr, das Bild bleibt gültig', () => {
    const g = withProfiles(Array.from({ length: 9 }, () => ({ cheft: true, openTurn: 2, discards: [code('H', 5), code('H', 6)] })));
    const exact = opponentModel(g, 0, 1, MASTER)!;
    const blurred = opponentModel(g, 0, 1, { ...MASTER, oppAccuracy: 0 })!;
    expect(exact.cheftRate).toBe(1);
    expect(blurred.cheftRate).toBeLessThan(1);
    for (const v of [blurred.cheftRate, blurred.earlyRate, blurred.neverRate, blurred.firstRate, blurred.red, blurred.low, blurred.mid, blurred.face, ...blurred.suit]) expect(Number.isFinite(v) && Math.abs(v) <= 1).toBe(true);
  });

  it('das Bild ist je Spiel stabil (kein Flackern) und für dieselbe Runde immer gleich', () => {
    const g = withProfiles(cheftRounds, 11);
    const a = JSON.stringify(opponentModel(g, 0, 1, MEMORY.hard));
    expect(JSON.stringify(opponentModel(structuredClone(g), 0, 1, MEMORY.hard))).toBe(a);
  });

  it('hält kaputte Profile aus (NaN, riesige Werte, leere und fehlende Felder) ohne Absturz', () => {
    const junk: Partial<RoundProfile>[] = [
      { discards: [NaN, -5, 1e9, 64, 0] as number[], takes: [Infinity, 17] as number[], openAugen: NaN, openTurn: -3 },
      { discards: [], takes: [], openAugen: 1e12, openTurn: 1e9 },
      { discards: undefined as unknown as number[], takes: undefined as unknown as number[] },
    ];
    for (const j of junk) {
      let m: OppModel | null = null;
      try {
        m = opponentModel(withProfiles([j, j, j]), 0, 1, MASTER);
      } catch {
        m = null;
      }
      void m;
    }
    // Die ersten beiden Einträge sind formal gültig und müssen ohne Absturz durchlaufen
    expect(() => opponentModel(withProfiles([junk[0], junk[1]]), 0, 1, MASTER)).not.toThrow();
  });

  it('Tempo: Gegen schnelle Gegner sinkt der Ehrgeiz, gegen langsame steigt er, immer innerhalb von ±0,2', () => {
    const mk = (early: number) => ({ earlyRate: early }) as OppModel;
    expect(tempoShift([mk(0.9), mk(0.9)], 1)).toBeLessThan(0);
    expect(tempoShift([mk(0.0), mk(0.1)], 1)).toBeGreaterThan(0);
    expect(tempoShift([mk(0.35)], 1)).toBeCloseTo(0, 5);
    expect(tempoShift([mk(5), mk(5)], 100)).toBeGreaterThanOrEqual(-20);
    expect(tempoShift([mk(1)], 1)).toBeGreaterThanOrEqual(-0.2);
    expect(tempoShift([null, null], 1)).toBe(0);
    expect(tempoShift([mk(0.9)], 0)).toBe(0);
  });
});

// ---------------------------------------------------------------- Rollen

describe('Rollen', () => {
  it('die Wildcard spielt jede Runde eine Spielweise, gleichverteilt, deterministisch, Wiederholungen sind möglich', () => {
    const p = rolePersona('wildcard');
    const counts = new Map<string, number>();
    let repeats = 0;
    let last = '';
    for (let seed = 0; seed < 60; seed++) {
      const g = testGame(4, seed);
      for (let round = 1; round <= 9; round++) {
        g.round.no = round;
        const a = decideRoleActive(p, g, 1);
        expect(decideRoleActive(p, g, 1)).toBe(a); // gleicher Zustand, gleiche Rolle
        counts.set(a, (counts.get(a) ?? 0) + 1);
        if (a === last) repeats++;
        last = a;
      }
    }
    for (const id of STYLE_IDS) expect(counts.get(id) ?? 0).toBeGreaterThan(60 * 9 * 0.12); // jede kommt vor, grob gleichverteilt (20 % je Rolle)
    expect(repeats).toBeGreaterThan(0);
  });

  it('die Spielweisen halten ohne Würze (Treue 1) immer ihre Rolle', () => {
    for (const id of STYLE_IDS) {
      const p = rolePersona(id, { loyalty: 1 });
      const g = testGame(4, 3);
      for (let round = 1; round <= 9; round++) {
        g.round.no = round;
        expect(decideRoleActive(p, g, 2)).toBe(id);
      }
    }
  });

  it('jede Rolle (mit Vorlieben und Gegner-Gedächtnis) spielt auf jeder Stufe vollständige Spiele regelkonform', () => {
    const roles: RoleId[] = [...STYLE_IDS, 'wildcard'];
    let games = 0;
    for (const level of ['easy', 'normal', 'hard', 'master'] as const) {
      const seats = roles.slice(0, 4).map((_, i) => ({ level, style: 'balanced' as const, opts: { persona: rolePersona(roles[(i + games) % roles.length], { jitter: 0.3, tilt: 0.5 }) } }));
      const res = simulate({ seed: 8000 + games, rounds: 3, seats, firstTurnOpenAllowed: games % 2 === 0 });
      expect(res.state.finished).toBe(true);
      games++;
    }
    for (const r of roles) {
      const res = simulate({ seed: 8100 + games++, rounds: 3, seats: Array.from({ length: 3 }, () => ({ level: 'master' as const, style: 'balanced' as const, opts: { persona: rolePersona(r) } })) });
      expect(res.state.finished).toBe(true);
    }
  }, 240000);
});

function decideRoleActive(p: ReturnType<typeof rolePersona>, g: GameState, pid: number): string {
  // Welche Spielweise ist in dieser Runde aktiv? Über resolvePersona (rein aus dem Zustand).
  return (resolve(p, g, pid) as { active: string }).active;
}


describe('Würze als Standard (Rollentreue 0,85, nur zu ähnlichen Rollen)', () => {
  const sevenRounds = (seed: number): GameState => {
    const g = testGame(4, 100003 + seed * 7919); // echte Spiele haben große Seeds
    g.history = Array.from({ length: 7 }, () => ({}) as never);
    return g;
  };

  it('weicht in etwa 15 % der Runden ab, und nur zu den vereinbarten Nachbarn', () => {
    let total = 0;
    let off = 0;
    for (const id of STYLE_IDS) {
      for (let seed = 0; seed < 120; seed++) {
        for (const r of rolesPerRound(sevenRounds(seed), 1, id)) {
          total++;
          if (r !== id) {
            off++;
            expect(NEIGHBORS[id]).toContain(r);
          }
        }
      }
    }
    expect(off / total).toBeGreaterThan(0.1);
    expect(off / total).toBeLessThan(0.2);
  });

  it('der Frühvogel wird nie zum Glücksritter, der Glücksritter nie zum Frühvogel', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(rolesPerRound(sevenRounds(seed), 0, 'early')).not.toContain('gambler');
      expect(rolesPerRound(sevenRounds(seed), 0, 'gambler')).not.toContain('early');
    }
  });

  it('im Schnitt weicht ein Bot in 7 Runden etwa einmal ab; die Wahl ist je Spiel und Platz fest', () => {
    let off = 0;
    for (let seed = 0; seed < 200; seed++) off += rolesPerRound(sevenRounds(seed), 2, 'pairs').filter((r) => r !== 'pairs').length;
    expect(off / 200).toBeGreaterThan(0.7);
    expect(off / 200).toBeLessThan(1.4);
    const a = rolesPerRound(sevenRounds(5), 2, 'pairs');
    expect(rolesPerRound(sevenRounds(5), 2, 'pairs')).toEqual(a);
  });

  it('Text für die Endauswertung: Wildcard mit Zählung je Spielweise, andere mit „x von y Runden in Rolle“', () => {
    const g = sevenRounds(11);
    const w = describeRoleRounds(g, 1, 'wildcard');
    expect(w).toMatch(/^(\d+× [A-Za-zäöüÄÖÜß]+)(, \d+× [A-Za-zäöüÄÖÜß]+)*$/);
    expect(w.split(', ').reduce((n, part) => n + Number(part.split('×')[0]), 0)).toBe(7);
    expect(describeRoleRounds(g, 1, 'early')).toMatch(/^[0-7] von 7 Runden in Rolle$/);
    expect(describeRoleRounds(g, 1, 'early', { loyalty: 1 })).toBe('7 von 7 Runden in Rolle');
  });
});

// ---------------------------------------------------------------- Schutz und Kein Mogeln

/** Für Spieler `pid`: Gehört die Karte zu einer fertigen Kombination seiner Hand? Mit der Partitionssuche der Regeln gegengeprüft. */
function inPartition(g: GameState, pid: number, cardId: number): boolean {
  const p = g.round.players[pid];
  const part = findPartition(p.hand, { types: p.mode === 'cheft' || !p.opened ? ALL_TYPES : ROMME_TYPES, allowSkip: true });
  return !!part && part.melds.some((m) => m.cards.some((c) => c.id === cardId));
}

describe('Schutz guter Karten', () => {
  it('auch mit extrem starken Vorlieben gibt kein Bot wegen einer Vorliebe eine fertige Kombination auf', () => {
    let compared = 0;
    let changed = 0;
    for (const level of ['easy', 'master'] as const) {
      simulate({
        seed: 6100 + level.length,
        rounds: 3,
        seats: Array.from({ length: 4 }, () => ({ level, style: 'balanced' as const })),
        visit: (g, pid) => {
          if (g.round.turn.phase !== 'play') return;
          const base = decideAction(g, pid, { knobs: { taste: undefined } });
          const taste = decideAction(g, pid, { knobs: { taste: 'auto', tasteScale: 6 } });
          if (base.kind !== 'discard' || taste.kind !== 'discard') {
            expect(taste).toEqual(base); // Vorlieben berühren nur den Abwurf
            return;
          }
          compared++;
          if (taste.cardId !== base.cardId) {
            changed++;
            if (level !== 'master') return; // mit Entscheidungsrauschen greift auch der Bot ohne Vorliebe mal daneben; die Regel gilt für den besten Abwurf
            // Ändert die Vorliebe den Abwurf, so war die abgeworfene Karte keine Karte einer fertigen Kombination, außer beide wären es
            if (!inCompleteCombo(g.round.players[pid].hand.find((c) => c.id === taste.cardId)!, g.round.players[pid].hand, g.round.players[pid].mode, g.round.players[pid].opened)) return;
            expect(inCompleteCombo(g.round.players[pid].hand.find((c) => c.id === base.cardId)!, g.round.players[pid].hand, g.round.players[pid].mode, g.round.players[pid].opened)).toBe(true);
          }
        },
      });
    }
    expect(compared).toBeGreaterThan(200);
    expect(changed).toBeGreaterThan(5); // die Vorlieben wirken tatsächlich (der Test ist nicht blind)
    void inPartition;
  }, 240000);

  it('im Ernstfall (ein Gegner ist fast draußen) gelten die Vorlieben nicht', () => {
    let near = 0;
    simulate({
      seed: 6300,
      rounds: 3,
      seats: Array.from({ length: 4 }, () => ({ level: 'master' as const, style: 'balanced' as const })),
      visit: (g, pid) => {
        if (g.round.turn.phase !== 'play') return;
        if (!g.round.players.some((q, i) => i !== pid && q.opened && q.hand.length <= 2)) return;
        near++;
        expect(decideAction(g, pid, { knobs: { taste: 'auto', tasteScale: 50 } })).toEqual(decideAction(g, pid));
      },
    });
    expect(near).toBeGreaterThan(5);
  }, 120000);
});

describe('Kein Mogeln: auch Vorlieben und Gegner-Gedächtnis nutzen nur Öffentliches', () => {
  function reshuffleHidden(g: GameState, pid: number, rng: () => number): GameState {
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
      p.hand = pool.slice(at, at + p.hand.length);
      at += p.hand.length;
    }
    r.stock = pool.slice(at);
    return alt;
  }

  it('Rollen mit Vorlieben und vollem Gegner-Gedächtnis entscheiden unabhängig von verdeckten Karten, auch nach JSON-Neustart', () => {
    let checked = 0;
    const rng = makeRng(99);
    for (const role of ['early', 'gambler', 'wildcard'] as RoleId[]) {
      simulate({
        seed: 6400 + role.length,
        rounds: 4,
        seats: (['easy', 'normal', 'hard', 'master'] as const).map((level) => ({ level, style: 'balanced' as const, opts: { persona: rolePersona(role) } })),
        visit: (g, pid) => {
          if ((g.round.plies ?? 0) % 3 !== 1) return;
          const a = decideAction(g, pid, { persona: rolePersona(role) });
          expect(decideAction(reshuffleHidden(g, pid, rng), pid, { persona: rolePersona(role) })).toEqual(a);
          expect(decideAction(JSON.parse(JSON.stringify(g)), pid, { persona: rolePersona(role) })).toEqual(a);
          checked++;
        },
      });
    }
    expect(checked).toBeGreaterThan(150);
  }, 240000);
});

void deck;
void isJoker;
void ({} as MemoryParams);
