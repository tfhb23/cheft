import { describe, it, expect } from 'vitest';
import { makeDeck, isJoker } from './cards';
import { CHEAT_NAMES, ROLE_NAMES, PRESET_NAMES } from './cheatnames';
import { Cheats, parseCheatCode, parseCardToken } from './cheats';
import { GameState, PlayerInfo, Settings, newGame, thresholdFor, tableThreshold, startNextRound, doDeclareCheft } from './game';
import { viewFor } from './view';

const players = (n = 4): PlayerInfo[] => Array.from({ length: n }, (_, i) => ({ id: i, name: `P${i}`, isBot: i > 0 }));
const settings: Settings = { rounds: 5, firstTurnOpenAllowed: true, direction: 'ccw' };

function ok(text: string): Cheats {
  const r = parseCheatCode(text);
  if (r.kind !== 'ok') throw new Error(`erwartet ok: ${JSON.stringify(r)}`);
  return r.cheats;
}

/** Alle Karten im Spiel (Hände, Stapel, Teppichkarte, Auslagen, Ablage). */
function allCards(s: GameState) {
  const r = s.round;
  return [...r.players.flatMap((p) => p.hand), ...r.stock, ...r.discard, ...r.melds.flatMap((m) => m.cards), ...(r.carpet ? [r.carpet] : [])];
}
function expectConserved(s: GameState) {
  const cards = allCards(s);
  expect(cards.length).toBe(106);
  expect(new Set(cards.map((c) => c.id)).size).toBe(106);
  // genau das Deck: jede Karte zweimal, zwei Joker
  const count = new Map<string, number>();
  for (const c of cards) count.set(`${c.suit}${c.rank}`, (count.get(`${c.suit}${c.rank}`) ?? 0) + 1);
  for (const [k, v] of count) expect(v, k).toBe(k === 'J0' ? 2 : 2);
}
const keys = (s: GameState, pid: number) => s.round.players[pid].hand.map((c) => `${c.suit}${c.rank}`).sort();

describe('Cheat-Eingabe', () => {
  it('Karten: Farbe + Wert, Groß/Klein egal, Joker', () => {
    expect(parseCardToken('HED')).toEqual({ suit: 'H', rank: 12 });
    expect(parseCardToken('KR10')).toEqual({ suit: 'C', rank: 10 });
    expect(parseCardToken('KA3')).toEqual({ suit: 'D', rank: 3 });
    expect(parseCardToken('PIA')).toEqual({ suit: 'S', rank: 1 });
    expect(parseCardToken('KRB')).toEqual({ suit: 'C', rank: 11 });
    expect(parseCardToken('J')).toEqual({ suit: 'J', rank: 0 });
    expect(parseCardToken('HE14')).toBeNull();
    expect(parseCardToken('XX3')).toBeNull();
  });

  it('kein Cheat-Text → none (z. B. Spielstand-Code)', () => {
    expect(parseCheatCode('').kind).toBe('none');
    expect(parseCheatCode('C1.abcdef').kind).toBe('none');
    expect(parseCheatCode('{"state":1}').kind).toBe('none');
    expect(parseCheatCode('eyJzdGF0ZSI6e30sIm9yZGVyIjpbXX0').kind).toBe('none');
    expect(parseCheatCode('hallo welt').kind).toBe('none');
  });

  it('Cheat-Wörter in beliebiger Reihenfolge, Groß/Klein egal, ohne Trennzeichen nötig', () => {
    const a = ok('RUNDEN 12 teppich Joker 2');
    const b = ok('joker 2   TEPPICH runden 12');
    expect(a).toEqual(b);
    expect(a.rounds).toBe(12);
    expect(a.jokers).toBe(2);
    expect(a.carpet).toBe(true);
    // Komma/Semikolon als Trenner
    expect(ok('rundEN 3, joker; teppich').jokers).toBe(1);
  });

  it('Parameter: Joker-Anzahl, Runden, Rolle, Erstmeldung', () => {
    expect(ok('joker').jokers).toBe(1);
    expect(ok('autoplay').autoplay).toEqual({ role: 'wildcard' });
    expect(ok('autoplay Frühvogel').autoplay).toEqual({ role: 'early' });
    expect(ok('autoplay gerissener teppich').autoplay).toEqual({ role: 'cunning' });
    expect(ok('erstmeldung 21').firstMeld).toEqual({ base: 21, cheft: 41 }); // doppelt minus 1
    expect(ok('erstmeldung 21 60').firstMeld).toEqual({ base: 21, cheft: 60 });
    expect(ok('erstmeldung 51').firstMeld).toEqual({ base: 51, cheft: 101 });
    expect(ok('runden 999').rounds).toBe(999);
  });

  it('Fehler: unbekanntes Wort, fehlende oder falsche Zahl', () => {
    expect(parseCheatCode('joker bla')).toMatchObject({ kind: 'error', key: 'cheat.err.unknown', params: { word: 'BLA' } });
    expect(parseCheatCode('runden')).toMatchObject({ kind: 'error', key: 'cheat.err.needNumber' });
    expect(parseCheatCode('runden 0')).toMatchObject({ kind: 'error', key: 'cheat.err.range' });
    expect(parseCheatCode('runden 1000')).toMatchObject({ kind: 'error', key: 'cheat.err.range' });
    expect(parseCheatCode('erstmeldung')).toMatchObject({ kind: 'error', key: 'cheat.err.needNumber' });
    expect(parseCheatCode('hand(HeD XX)')).toMatchObject({ kind: 'error', key: 'cheat.err.card', params: { word: 'XX' } });
    expect(parseCheatCode('hand(HeD')).toMatchObject({ kind: 'error', key: 'cheat.err.paren' });
  });

  it('Wunschhand: / trennt Runden, leer = Zufall, Klammer an beliebiger Stelle', () => {
    const c = ok('hand( HeD KrB / / PiA ka3 j ) runden 4');
    expect(c.rounds).toBe(4);
    expect(c.hand).toHaveLength(3);
    expect(c.hand![0]!.cards).toEqual([{ suit: 'H', rank: 12 }, { suit: 'C', rank: 11 }]);
    expect(c.hand![1]).toBeNull();
    expect(c.hand![2]!.cards).toEqual([{ suit: 'S', rank: 1 }, { suit: 'D', rank: 3 }, { suit: 'J', rank: 0 }]);
    // ohne Klammer bis zum Ende; leere Runde am Anfang
    const d = ok('teppich hand / HeD');
    expect(d.hand![0]).toBeNull();
    expect(d.hand![1]!.cards).toHaveLength(1);
    // Testhand als Zeile, auch mit zusätzlichen Karten
    const e = ok('hand(paare / paare j)');
    expect(e.hand![0]!.preset).toBe('pairs');
    expect(e.hand![1]).toMatchObject({ preset: 'pairs', cards: [{ suit: 'J', rank: 0 }] });
    // schließender Schrägstrich am Ende ändert nichts
    expect(ok('hand(HeD /)').hand).toHaveLength(1);
  });

  it('mehr als 14 Karten in einer Runde werden abgeschnitten (mit Hinweis)', () => {
    const many = Array.from({ length: 16 }, () => 'HeD').join(' ');
    const r = parseCheatCode(`hand(${many})`);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.cheats.hand![0]!.cards).toHaveLength(14);
      expect(r.warnings[0].key).toBe('cheat.warn.tooMany');
    }
  });

  it('Namen: kein Name besteht aus zwei aneinandergereihten anderen Namen', () => {
    const comp = (s: string) => s.toUpperCase().replace(/[\s\-_]/g, '');
    const all = [...Object.values(CHEAT_NAMES).flat(), ...Object.values(ROLE_NAMES).flat(), ...Object.values(PRESET_NAMES).flat()].map(comp);
    for (const x of all) for (const y of all) for (const z of all) if (x !== z && y !== z) expect(x + y).not.toBe(z);
    // und keine Doppelung
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('Austeilen mit Cheats', () => {
  it('Wunschhand: genau diese Karten, der Rest zufällig; Kartenerhaltung', () => {
    const c = ok('hand(HeD KrB PiA Ka3 j He9 Kr10)');
    const s = newGame(players(), settings, 123, 1, c);
    const mine = keys(s, 0);
    for (const want of ['H12', 'C11', 'S1', 'D3', 'J0', 'H9', 'C10']) expect(mine).toContain(want);
    expect(s.round.players[0].hand.length).toBe(s.round.starter === 0 ? 15 : 14);
    expectConserved(s);
  });

  it('Runde 2 mit Wunschhand, Runde 1 und 3 zufällig', () => {
    const c = ok('hand(/ HeD HeD KaK KaK)');
    const s = newGame(players(), { ...settings, rounds: 5 }, 7, 0, c);
    for (let no = 2; no <= 3; no++) {
      s.round.ended = true;
      startNextRound(s);
      expectConserved(s);
      if (no === 2) expect(keys(s, 0).filter((k) => k === 'H12').length).toBe(2);
    }
  });

  it('nicht erfüllbarer Wunsch (dritte Kopie) wird zufällig ersetzt, mit Hinweis', () => {
    const s = newGame(players(), settings, 5, 1, ok('hand(HeD HeD HeD)'));
    expect(keys(s, 0).filter((k) => k === 'H12').length).toBe(2);
    expect(s.round.cheatNotes?.some((n) => n.key === 'cheat.note.missing')).toBe(true);
    expect(s.round.players[0].hand.length).toBe(14);
    expectConserved(s);
  });

  it('Joker-Cheat: mindestens N Joker, ersetzt nur Füller; Wunschhand gewinnt', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = newGame(players(), settings, seed, seed % 4, ok('joker 2'));
      expect(s.round.players[0].hand.filter(isJoker).length).toBe(2);
      expectConserved(s);
    }
    // 14 feste Karten ohne Joker: der Joker-Cheat bleibt wirkungslos (dort Hinweis)
    const full = 'HeA He2 He3 He4 He5 He6 He7 He8 He9 He10 HeB HeD HeK KaA';
    const s = newGame(players(), settings, 9, 1, ok(`joker 2 hand(${full})`));
    expect(s.round.players[0].hand.filter(isJoker).length).toBe(0);
    expect(s.round.cheatNotes?.some((n) => n.key === 'cheat.note.fewJokers')).toBe(true);
  });

  it('Joker als Teppichkarte bei vollständig festgelegter Hand des Startspielers: zurück in den Stapel', () => {
    const full = 'HeA He2 He3 He4 He5 He6 He7 He8 He9 He10 HeB HeD HeK KaA';
    let tested = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = newGame(players(), settings, seed, 3, ok(`hand(${full})`)); // Spieler 0 beginnt
      expect(s.round.starter).toBe(0);
      expect(s.round.carpet && isJoker(s.round.carpet)).toBeFalsy();
      expect(s.round.carpetJokers?.length ?? 0).toBe(0);
      expect(s.round.players[0].hand.length).toBe(15);
      expectConserved(s);
      tested++;
    }
    expect(tested).toBe(400);
  });

  it('Teppich: zweite Kopie einer Handkarte, nie eine 3. Karte', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = newGame(players(), settings, seed, seed % 4, ok('teppich'));
      const c = s.round.carpet!;
      const same = s.round.players[0].hand.filter((h) => h.suit === c.suit && h.rank === c.rank).length;
      expect(same).toBe(1);
      expectConserved(s);
    }
    // beide Kopien auf der Hand: keine passende Teppichkarte mehr → zufällig, mit Hinweis
    const s = newGame(players(), settings, 2, 1, ok('teppich hand(HeD HeD KaK KaK HeA HeA He2 He2 He3 He3 He4 He4 He5 He5)'));
    expect(s.round.cheatNotes?.some((n) => n.key === 'cheat.note.noCarpet')).toBe(true);
    expectConserved(s);
  });

  it('Ausgelegt: Folge mit Joker liegt aus, Spieler ist draußen, passende Karte auf der Hand', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = newGame(players(), settings, seed, seed % 4, ok('ausgelegt'));
      const me = s.round.players[0];
      expect(me.opened).toBe(true);
      expect(s.round.melds).toHaveLength(1);
      const m = s.round.melds[0];
      expect(m.owner).toBe(0);
      expect(m.cards.some(isJoker)).toBe(true);
      const joker = m.cards.findIndex(isJoker);
      const rank = m.startRank! + joker;
      expect(me.hand.some((c) => c.suit === m.suit && c.rank === rank)).toBe(true);
      expect(me.hand.length).toBe(s.round.starter === 0 ? 15 : 14);
      expectConserved(s);
    }
  });

  it('Testhände: 7 Paare, 5 Paare + Folge, Rommé-Hand', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const p = newGame(players(), settings, seed, 1, ok('hand(paare)'));
      const h = keys(p, 0);
      const counts = new Map<string, number>();
      h.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
      expect([...counts.values()].filter((v) => v === 2).length).toBeGreaterThanOrEqual(7);
      expectConserved(p);
      const f = newGame(players(), settings, seed, 1, ok('hand(fuenfpaare)'));
      expect(f.round.players[0].hand.length).toBe(14);
      expectConserved(f);
      const r = newGame(players(), settings, seed, 1, ok('hand(handrummel)'));
      expect(r.round.players[0].hand.length).toBe(14);
      expect(r.round.cheatNotes).toBeUndefined();
      expectConserved(r);
    }
  });

  it('Testhand mit zusätzlicher Karte: die Karte ersetzt die Testhand von hinten', () => {
    const s = newGame(players(), settings, 11, 1, ok('hand(paare J)'));
    expect(s.round.players[0].hand.some(isJoker)).toBe(true);
    expect(s.round.players[0].hand.length).toBe(14);
    expectConserved(s);
  });

  it('alle Cheats gemeinsam bleiben konsistent', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = newGame(players(seed % 3 === 0 ? 3 : 4), settings, seed, seed % 3, ok('joker 2 teppich ausgelegt hand(HeD KrB / paare) runden 12 erstmeldung 21'));
      const n = s.players.length;
      expect(s.round.players[0].hand.length).toBe(s.round.starter === 0 ? 15 : 14);
      expectConserved(s);
      expect(n).toBeGreaterThan(2);
    }
  });

  it('Gegner und Stapel bleiben zufällig: gleicher Cheat, anderer Seed → andere Karten', () => {
    const c = ok('hand(HeD KrB PiA Ka3 j He9 Kr10)');
    const a = newGame(players(), settings, 1001, 1, c);
    const b = newGame(players(), settings, 2002, 1, c);
    expect(keys(a, 1)).not.toEqual(keys(b, 1));
    expect(a.round.stock.map((x) => x.id)).not.toEqual(b.round.stock.map((x) => x.id));
    // und der Stapel ist unabhängig von den Wünschen gemischt: Mit gleichem Seed (reproduzierbar) ändern die Wünsche nur, was fehlt
    const plain = newGame(players(), settings, 1001, 1);
    expect(plain.round.stock.length).toBe(a.round.stock.length);
  });

  it('ohne Cheats ändert sich nichts', () => {
    const a = newGame(players(), settings, 77, 2);
    const b = newGame(players(), settings, 77, 2, undefined);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.cheats).toBeUndefined();
    expect(makeDeck().length).toBe(106);
  });
});

describe('Erstmeldung', () => {
  it('Cheat senkt die Grenze ohne und mit Cheft; "vorherige übertreffen" bleibt', () => {
    const s = newGame(players(), settings, 3, 1, ok('erstmeldung 21'));
    expect(thresholdFor(s, 0)).toBe(21);
    expect(thresholdFor(s, 1)).toBe(51); // nur für den Cheat-Platz
    s.round.cheftAnnounced = true;
    expect(thresholdFor(s, 0)).toBe(41);
    expect(tableThreshold(s)).toBe(101);
    s.round.cheftAnnounced = false;
    s.round.lastRommeOpening = 60;
    expect(thresholdFor(s, 0)).toBe(61);
    const n = newGame(players(), settings, 3, 1);
    expect(thresholdFor(n, 0)).toBe(51);
    void doDeclareCheft;
  });
});

describe('Cheats bleiben solo', () => {
  it('die Spieler-Sicht (Mehrspieler) enthält nie Cheats', () => {
    const s = newGame(players(), settings, 3, 1, ok('joker teppich'));
    expect(viewFor(s, 0).cheats).toBeUndefined();
  });
});
