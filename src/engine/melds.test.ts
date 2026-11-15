import { describe, it, expect } from 'vitest';
import { makeDeck, penaltyValue } from './cards';
import { asRun, asSet, asPair, meldAugen, findPartition, findAllPartitions, addToMeld, jokerRepresents, maxPairs, Meld, ROMME_TYPES, ALL_TYPES } from './melds';
import { CardPool } from './testutil';

describe('Deck', () => {
  it('hat 106 Karten mit 2 Jokern', () => {
    const d = makeDeck();
    expect(d.length).toBe(106);
    expect(d.filter((c) => c.suit === 'J').length).toBe(2);
    expect(new Set(d.map((c) => c.id)).size).toBe(106);
  });
  it('Strafpunkte: Joker 25, Ass 11, Bild 10', () => {
    const p = new CardPool();
    expect(penaltyValue(p.take('J'))).toBe(25);
    expect(penaltyValue(p.take('HA'))).toBe(11);
    expect(penaltyValue(p.take('SK'))).toBe(10);
    expect(penaltyValue(p.take('D7'))).toBe(7);
  });
});

describe('Folgen', () => {
  it('erkennt Herz 4-5-6', () => {
    const p = new CardPool();
    const r = asRun(p.takeAll('H5', 'H4', 'H6'))!;
    expect(r.type).toBe('run');
    expect(r.startRank).toBe(4);
    expect(meldAugen(r)).toBe(15);
  });
  it('Ass unten zählt 1, Ass oben 11', () => {
    const p = new CardPool();
    expect(meldAugen(asRun(p.takeAll('HA', 'H2', 'H3'))!)).toBe(6);
    expect(meldAugen(asRun(p.takeAll('SD', 'SK', 'SA'))!)).toBe(31);
  });
  it('König-Ass-2 ist nicht erlaubt', () => {
    const p = new CardPool();
    expect(asRun(p.takeAll('HK', 'HA', 'H2'))).toBeNull();
  });
  it('verschiedene Farben sind keine Folge', () => {
    const p = new CardPool();
    expect(asRun(p.takeAll('H4', 'S5', 'H6'))).toBeNull();
  });
  it('Joker füllt Lücke', () => {
    const p = new CardPool();
    const r = asRun(p.takeAll('H4', 'J', 'H6'))!;
    expect(r.cards[1].suit).toBe('J');
    expect(meldAugen(r)).toBe(15);
  });
  it('überzähliger Joker liegt oben, bei Ass oben unten', () => {
    const p = new CardPool();
    const r = asRun(p.takeAll('H4', 'H5', 'J'))!;
    expect(r.startRank).toBe(4);
    expect(meldAugen(r)).toBe(15);
    const r2 = asRun(p.takeAll('SK', 'SA', 'J'))!;
    expect(r2.startRank).toBe(12);
  });
  it('zwei Karten sind keine Folge', () => {
    const p = new CardPool();
    expect(asRun(p.takeAll('H4', 'H5'))).toBeNull();
  });
});

describe('Sätze', () => {
  it('drei Könige in drei Farben', () => {
    const p = new CardPool();
    const s = asSet(p.takeAll('HK', 'SK', 'DK'))!;
    expect(s.type).toBe('set');
    expect(meldAugen(s)).toBe(30);
  });
  it('gleiche Farbe doppelt ist ungültig', () => {
    const p = new CardPool();
    expect(asSet(p.takeAll('HK', 'HK', 'DK'))).toBeNull();
  });
  it('Joker ergänzt Satz, drei Asse = 33', () => {
    const p = new CardPool();
    expect(meldAugen(asSet(p.takeAll('HA', 'SA', 'J'))!)).toBe(33);
  });
  it('fünf Karten sind kein Satz', () => {
    const p = new CardPool();
    expect(asSet(p.takeAll('HK', 'SK', 'DK', 'CK', 'J'))).toBeNull();
  });
});

describe('Cheft-Paare', () => {
  it('zwei identische Karten', () => {
    const p = new CardPool();
    expect(asPair(p.takeAll('C7', 'C7'))).not.toBeNull();
    expect(asPair(p.takeAll('C8', 'D8'))).toBeNull();
    expect(asPair(p.takeAll('H7', 'J'))).not.toBeNull();
    expect(asPair(p.takeAll('J', 'J'))).not.toBeNull();
  });
  it('maxPairs zählt Joker als Wildcard', () => {
    const p = new CardPool();
    expect(maxPairs(p.takeAll('C7', 'C7', 'H2', 'H2', 'S9', 'J', 'D3'))).toBe(3);
    expect(maxPairs(p.takeAll('J', 'J', 'H2'))).toBe(1);
  });
});

describe('Partition', () => {
  it('findet 5 Paare', () => {
    const p = new CardPool();
    const cards = p.takeAll('C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'HA', 'J');
    const part = findPartition(cards, { types: ALL_TYPES, pairCounts: [5, 7] })!;
    expect(part).not.toBeNull();
    expect(part.melds.length).toBe(5);
    expect(part.melds.every((m) => m.type === 'pair')).toBe(true);
  });
  it('findet Rommé-Aufteilung mit maximalen Augen', () => {
    const p = new CardPool();
    const cards = p.takeAll('H4', 'H5', 'H6', 'SK', 'DK', 'CK');
    const part = findPartition(cards, { types: ROMME_TYPES })!;
    expect(part.augen).toBe(45);
    expect(part.melds.length).toBe(2);
  });
  it('Joker landet dort, wo er die meisten Augen bringt', () => {
    const p = new CardPool();
    const cards = p.takeAll('H4', 'H5', 'SK', 'DK', 'J');
    expect(findPartition(cards, { types: ROMME_TYPES })).toBeNull();
    const part = findPartition([...cards, p.take('H6')], { types: ROMME_TYPES })!;
    expect(part.augen).toBe(45);
  });
  it('Teilmenge mit Pflichtkarte', () => {
    const p = new CardPool();
    const must = p.take('H6');
    const cards = [...p.takeAll('H4', 'H5', 'D2', 'C9'), must];
    const part = findPartition(cards, { types: ROMME_TYPES, allowSkip: true, mustInclude: [must.id] })!;
    expect(part.used).toBe(3);
    expect(part.augen).toBe(15);
  });
  it('lehnt ungültige exakte Aufteilung ab', () => {
    const p = new CardPool();
    expect(findPartition(p.takeAll('H4', 'H5', 'D2'), { types: ROMME_TYPES })).toBeNull();
  });
});

describe('Anlegen und Joker klauen', () => {
  it('legt oben und unten an eine Folge an', () => {
    const p = new CardPool();
    const shape = asRun(p.takeAll('H4', 'H5', 'H6'))!;
    const m: Meld = { ...shape, id: 1, owner: 0 };
    expect(addToMeld(m, p.take('H7'))!.cards.length).toBe(4);
    expect(addToMeld(m, p.take('H3'))!.startRank).toBe(3);
    expect(addToMeld(m, p.take('S7'))).toBeNull();
    expect(addToMeld(m, p.take('H8'))).toBeNull();
  });
  it('Satz nimmt nur fehlende Farbe', () => {
    const p = new CardPool();
    const m: Meld = { ...asSet(p.takeAll('HK', 'SK', 'DK'))!, id: 1, owner: 0 };
    expect(addToMeld(m, p.take('CK'))).not.toBeNull();
    expect(addToMeld(m, p.take('HK'))).toBeNull();
    const full = addToMeld(m, p.take('J'))!;
    expect(addToMeld(full, p.take('CK'))).toBeNull();
  });
  it('Joker im Drilling ist nicht klaubar, im Vierling schon', () => {
    const p = new CardPool();
    const drilling: Meld = { ...asSet(p.takeAll('HK', 'SK', 'J'))!, id: 1, owner: 0 };
    expect(jokerRepresents(drilling, 2)).toBeNull();
    const vierling: Meld = { ...asSet(p.takeAll('HK', 'SK', 'DK', 'J'))!, id: 2, owner: 0 };
    expect(jokerRepresents(vierling, 3)).toEqual({ suit: 'C', rank: 13 });
  });
  it('Joker in Folge vertritt seine Position, Ass oben = Ass', () => {
    const p = new CardPool();
    const run: Meld = { ...asRun(p.takeAll('SD', 'SK', 'J'))!, id: 1, owner: 0 };
    expect(jokerRepresents(run, 2)).toEqual({ suit: 'S', rank: 1 });
  });
  it('Joker in Paar vertritt die Partnerkarte, Joker+Joker nicht klaubar', () => {
    const p = new CardPool();
    const pair: Meld = { ...asPair(p.takeAll('C7', 'J'))!, id: 1, owner: 0 };
    expect(jokerRepresents(pair, 1)).toEqual({ suit: 'C', rank: 7 });
    const jj: Meld = { ...asPair(p.takeAll('J', 'J'))!, id: 2, owner: 0 };
    expect(jokerRepresents(jj, 0)).toBeNull();
  });
});

describe('Mehrere Aufteilungen', () => {
  it('4-5-6 in drei Farben: drei Folgen oder drei Sätze', () => {
    const p = new CardPool();
    const cards = p.takeAll('H4', 'H5', 'H6', 'S4', 'S5', 'S6', 'D4', 'D5', 'D6');
    const parts = findAllPartitions(cards, { types: ROMME_TYPES });
    expect(parts.length).toBe(2);
    expect(parts.every((x) => x.augen === 45)).toBe(true);
    const kinds = parts.map((x) => x.melds.map((m) => m.type).join(',')).sort();
    expect(kinds).toEqual(['run,run,run', 'set,set,set']);
  });
  it('eindeutige Aufteilung liefert genau ein Ergebnis', () => {
    const p = new CardPool();
    const parts = findAllPartitions(p.takeAll('H4', 'H5', 'H6', 'SK', 'DK', 'CK'), { types: ROMME_TYPES });
    expect(parts.length).toBe(1);
  });
});
