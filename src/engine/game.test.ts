import { describe, it, expect } from 'vitest';
import { isJoker, sortBySuit } from './cards';
import {
  doDraw,
  doLay,
  doDiscard,
  doLayOff,
  layOffTargets,
  doDeclareCheft,
  doStealJoker,
  doUndoDraw,
  doReady,
  checkUndoDraw,
  checkDraw,
  checkLay,
  checkDiscard,
  thresholdFor,
  endRound,
  startNextRound,
  newGame,
  dealRound,
  scoreOrder,
  GameState,
  abortTurn,
  tempCardIds,
} from './game';
import { viewFor } from './view';
import { ALL_TYPES, findAllPartitions, ROMME_TYPES } from './melds';
import { Card, makeRng } from './cards';
import { CardPool, testGame, setHand, testPlayers, DEFAULT_SETTINGS } from './testutil';

function freshTurn(state: GameState, pid: number) {
  state.round.turn = { ...state.round.turn, player: pid, phase: 'play', drawSource: 'stock', drawnCardId: null, mustOpenWithId: null, mustPairWithId: null, openedThisTurn: false, isHand: false, laidOffToOthers: false, pendingJokerId: null };
}

describe('Austeilen', () => {
  it('14 Karten pro Spieler, Startspieler 15, Teppichkarte sichtbar', () => {
    const g = testGame(4, 7);
    const r = g.round;
    expect(r.starter).toBe(1);
    r.players.forEach((p, i) => expect(p.hand.length).toBe(i === r.starter ? 15 : 14));
    expect(r.carpet).not.toBeNull();
    expect(isJoker(r.carpet!)).toBe(false);
    const total = r.stock.length + r.players.reduce((s, p) => s + p.hand.length, 0) + 1;
    expect(total).toBe(106);
    expect(r.turn.player).toBe(r.starter);
    expect(r.turn.phase).toBe('play');
  });
  it('Joker als Teppichkarte geht an den Startspieler', () => {
    // Seeds durchsuchen, bis die Teppichkarte ein Joker wäre.
    let found = false;
    for (let seed = 1; seed < 2000 && !found; seed++) {
      const g = testGame(3, seed);
      const starter = g.round.players[g.round.starter];
      if (starter.hand.some(isJoker) && g.round.stock.length === 106 - 14 * 3 - 2) {
        // Prüfen, ob der Joker tatsächlich vom Teppich kam: Stock-Länge ist gleich wie sonst.
        found = true;
        expect(starter.hand.length).toBe(15);
      }
    }
    expect(found).toBe(true);
  });
});

describe('Rommé-Erstmeldung', () => {
  it('braucht 51 Augen, danach +1 und 101 nach Cheft-Ansage', () => {
    const g = testGame(4, 1);
    const p = new CardPool();
    const pid = g.round.starter;
    freshTurn(g, pid);
    // 45 Augen reichen nicht
    setHand(g, pid, p.takeAll('H4', 'H5', 'H6', 'SK', 'DK', 'CK', 'D2', 'D9', 'C3', 'C9', 'S2', 'S5', 'H9', 'D4', 'C5'));
    const hand = g.round.players[pid].hand;
    const ids = (specs: number[]) => specs.map((i) => hand[i].id);
    let res = doLay(g, pid, [ids([0, 1, 2]), ids([3, 4, 5])]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('err.threshold');
    // 55 Augen: dazu Pik 2-5 geht nicht; nehme stattdessen Folge mit Ass oben
    setHand(g, pid, p.takeAll('SD', 'SK', 'SA', 'HK', 'DK', 'CK', 'D2', 'D9', 'C3', 'C9', 'S2', 'S5', 'H9', 'D4', 'C5'));
    const h2 = g.round.players[pid].hand;
    res = doLay(g, pid, [[h2[0].id, h2[1].id, h2[2].id], [h2[3].id, h2[4].id, h2[5].id]]);
    expect(res.ok).toBe(true);
    expect(g.round.players[pid].opened).toBe(true);
    expect(g.round.players[pid].openingValue).toBe(61);
    expect(g.round.lastRommeOpening).toBe(61);
    // Nächster Spieler braucht 62
    const next = (pid + 1) % 4;
    expect(thresholdFor(g, next)).toBe(62);
    g.round.cheftAnnounced = true;
    expect(thresholdFor(g, next)).toBe(101);
    expect(thresholdFor(g, pid)).toBe(0);
  });
  it('weitere Kombinationen im selben Zug zählen zur Erstmeldung', () => {
    const g = testGame(4, 41);
    const p = new CardPool();
    const pid = g.round.starter;
    freshTurn(g, pid);
    setHand(g, pid, p.takeAll('SD', 'SK', 'SA', 'HK', 'DK', 'CK', 'H4', 'H5', 'H6', 'D2', 'D9', 'C3', 'C9', 'S2', 'S5'));
    const h = g.round.players[pid].hand;
    expect(doLay(g, pid, [[h[0].id, h[1].id, h[2].id], [h[3].id, h[4].id, h[5].id]]).ok).toBe(true); // 61
    expect(doLay(g, pid, [[h[6].id, h[7].id, h[8].id]]).ok).toBe(true); // +15
    expect(g.round.players[pid].openingValue).toBe(76);
    expect(g.round.lastRommeOpening).toBe(76);
    expect(thresholdFor(g, (pid + 1) % 4)).toBe(77);
  });
  it('Hand machen braucht keine Mindestaugen', () => {
    const g = testGame(3, 2);
    const p = new CardPool();
    const pid = g.round.starter;
    freshTurn(g, pid);
    setHand(g, pid, p.takeAll('H2', 'H3', 'H4', 'H5', 'S2', 'S3', 'S4', 'D2', 'D3', 'D4', 'C2', 'C3', 'C4', 'C5', 'SK'));
    const h = g.round.players[pid].hand;
    const id = (i: number) => h[i].id;
    const res = doLay(g, pid, [[id(0), id(1), id(2), id(3)], [id(4), id(5), id(6)], [id(7), id(8), id(9)], [id(10), id(11), id(12), id(13)]]);
    expect(res.ok).toBe(true);
    expect(g.round.turn.isHand).toBe(true);
    const d = doDiscard(g, pid, id(14));
    expect(d.ok).toBe(true);
    expect(g.round.ended).toBe(true);
    expect(g.round.result!.winner).toBe(pid);
    expect(g.round.result!.hand).toBe(true);
    const other = (pid + 1) % 3;
    expect(g.round.result!.scores[other].factors).toEqual(['hand']);
    expect(g.round.result!.scores[other].total).toBe(200);
  });
  it('die letzte Handkarte darf nicht ausgelegt werden', () => {
    const g = testGame(3, 3);
    const p = new CardPool();
    const pid = g.round.starter;
    freshTurn(g, pid);
    setHand(g, pid, p.takeAll('SD', 'SK', 'SA', 'HK', 'DK', 'CK'));
    const h = g.round.players[pid].hand;
    const res = checkLay(g, pid, [[h[0].id, h[1].id, h[2].id], [h[3].id, h[4].id, h[5].id]]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('err.lastCard');
  });
  it('im ersten Zug gesperrt, wenn so eingestellt', () => {
    const g = testGame(3, 3, { firstTurnOpenAllowed: false });
    const p = new CardPool();
    const pid = g.round.starter;
    freshTurn(g, pid);
    setHand(g, pid, p.takeAll('SD', 'SK', 'SA', 'HK', 'DK', 'CK', 'D2'));
    const h = g.round.players[pid].hand;
    const res = checkLay(g, pid, [[h[0].id, h[1].id, h[2].id], [h[3].id, h[4].id, h[5].id]]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('err.firstTurn');
  });
});

describe('Cheft', () => {
  it('5 Paare kommen raus, 6 nie, danach 2 Paare auf einmal', () => {
    const g = testGame(3, 5);
    const p = new CardPool();
    const pid = g.round.starter;
    freshTurn(g, pid);
    setHand(g, pid, p.takeAll('C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'HA', 'J', 'D4', 'D4', 'C3', 'C3', 'S5'));
    const h = g.round.players[pid].hand;
    const id = (i: number) => h[i].id;
    // 4 Paare reichen nicht
    let res = checkLay(g, pid, [[id(0), id(1)], [id(2), id(3)], [id(4), id(5)], [id(6), id(7)]]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('err.pairCount');
    res = doLay(g, pid, [[id(0), id(1)], [id(2), id(3)], [id(4), id(5)], [id(6), id(7)], [id(8), id(9)]]);
    expect(res.ok).toBe(true);
    const pr = g.round.players[pid];
    expect(pr.mode).toBe('cheft');
    expect(pr.opened).toBe(true);
    expect(pr.pairsLaid).toBe(5);
    expect(g.round.cheftAnnounced).toBe(true);
    // Ein 6. Paar ist nicht erlaubt
    res = checkLay(g, pid, [[id(10), id(11)]]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('err.sixPairs');
    // 2 Paare zugleich: 7, danach eine Karte abwerfen
    res = doLay(g, pid, [[id(10), id(11)], [id(12), id(13)]]);
    expect(res.ok).toBe(true);
    expect(pr.pairsLaid).toBe(7);
    expect(doDiscard(g, pid, id(14)).ok).toBe(true);
    expect(g.round.result!.winner).toBe(pid);
    expect(g.round.result!.winnerMode).toBe('cheft');
  });
  it('Cheft-Spieler darf immer vom Ablagestapel ziehen, Rommé nicht von Cheft-Abwurf', () => {
    const g = testGame(3, 8);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    doDeclareCheft(g, a);
    setHand(g, a, p.takeAll('C7', 'H2', 'S9'));
    const h = g.round.players[a].hand;
    expect(doDiscard(g, a, h[0].id).ok).toBe(true);
    expect(g.round.turn.player).toBe(b);
    // b ist Rommé: darf die Karte des Cheft-Spielers nicht nehmen
    setHand(g, b, p.takeAll('C7', 'C7', 'HK', 'SK', 'DK', 'HD', 'HB', 'H10', 'D2', 'D5', 'C9', 'S3', 'S4', 'S8'));
    let res = checkDraw(g, b, 'discard');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('err.rommeDiscardCheft');
    doDeclareCheft(g, b);
    res = checkDraw(g, b, 'discard');
    expect(res.ok).toBe(true);
  });
  it('Rommé-Spieler nimmt Ablagekarte nur zum sofortigen Rauskommen', () => {
    const g = testGame(3, 9);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('HK', 'D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id); // Herz König liegt
    // b kann mit HK + SK + DK (30) und H4-5-6 (15) nur 45 -> nicht
    setHand(g, b, p.takeAll('SK', 'DK', 'H4', 'H5', 'H6', 'D2', 'D9', 'C3', 'C8', 'S2', 'S5', 'H10', 'D4', 'C5'));
    // Für Bots gilt die strenge Vorabprüfung, ein Mensch darf nehmen und muss danach rauskommen (sonst Zug zurücksetzen)
    let res = checkDraw(g, b, 'discard', true);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('err.rommeDiscardNoOpen');
    expect(checkDraw(g, b, 'discard').ok).toBe(true);
    // mit SD-SK-SA (31) + HK DK CK? wir haben CK nicht; nutze HK+SK+DK (30) + Folge 10-B-D Herz (30) = 60
    setHand(g, b, p.takeAll('SK', 'DK', 'H10', 'HB', 'HD', 'D2', 'D9', 'C3', 'C9', 'S2', 'S5', 'H9', 'D4', 'C5'));
    res = doDraw(g, b, 'discard');
    expect(res.ok).toBe(true);
    expect(g.round.turn.mustOpenWithId).not.toBeNull();
    const hb = g.round.players[b].hand;
    const hk = hb.find((c) => c.suit === 'H' && c.rank === 13)!;
    // Abwerfen ohne Rauskommen ist verboten
    const d = checkDiscard(g, b, hb[5].id);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.error).toBe('err.rommeDiscardNoOpen');
    const lay = doLay(g, b, [[hk.id, hb[0].id, hb[1].id], [hb[2].id, hb[3].id, hb[4].id]]);
    expect(lay.ok).toBe(true);
    expect(g.round.players[b].mode).toBe('romme');
    expect(doDiscard(g, b, hb[5].id).ok).toBe(true);
  });
  it('Teppichkarte nur mit Paar und Rauskommen', () => {
    const g = testGame(3, 10);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    const carpet = g.round.carpet!;
    const spec = `${carpet.suit}${carpet.rank === 1 ? 'A' : carpet.rank === 11 ? 'B' : carpet.rank === 12 ? 'D' : carpet.rank === 13 ? 'K' : carpet.rank}`;
    // b hat 4 Paare plus die Partnerkarte der Teppichkarte
    const pool2 = new CardPool();
    const mate = pool2.take(spec);
    setHand(g, b, [mate, ...pool2.takeAll('C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'H5', 'H8', 'S3', 'S4', 'D10')]);
    expect(checkDraw(g, b, 'carpet').ok).toBe(true);
    expect(doDraw(g, b, 'carpet').ok).toBe(true);
    expect(g.round.players[b].mode).toBe('cheft');
    const hb = g.round.players[b].hand;
    const id = (i: number) => hb[i].id;
    // Abwerfen ohne Rauskommen verboten
    const d = checkDiscard(g, b, id(9));
    expect(d.ok).toBe(false);
    const res = doLay(g, b, [[mate.id, carpet.id], [id(1), id(2)], [id(3), id(4)], [id(5), id(6)], [id(7), id(8)]]);
    expect(res.ok).toBe(true);
    expect(doDiscard(g, b, id(9)).ok).toBe(true);
  });
});

describe('Teppichkarte: nur mit der genau gleichen Karte, nie mit einem Joker', () => {
  /** Spieler b ist am Zug (Ziehphase); die Teppichkarte ist Herz Dame, a hat schon abgeworfen. */
  function scene(seed: number, hand: (p: CardPool) => ReturnType<CardPool['takeAll']>) {
    const g = testGame(3, seed);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    g.round.carpet = p.take('HD');
    setHand(g, a, p.takeAll('D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    setHand(g, b, hand(p));
    return { g, b, carpet: g.round.carpet! };
  }
  const twin = (p: CardPool) => p.take('HD');

  it('mit einem Joker als einzigem Partner darf die Teppichkarte nicht genommen werden, auch wenn so fünf Paare entstünden', () => {
    // vier echte Paare, ein Joker und keine zweite Herz Dame: Früher ging "Teppichkarte + Joker" als fünftes Paar durch
    const { g, b } = scene(11, (p) => p.takeAll('J', 'C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'H5', 'H8', 'S3', 'S4', 'D10'));
    const r = checkDraw(g, b, 'carpet');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('err.carpetNeedsPair');
    expect(doDraw(g, b, 'carpet').ok).toBe(false);
    expect(g.round.carpet).not.toBeNull();
    expect(g.round.players[b].mode).toBe('romme'); // und er wird auch nicht zum Cheft-Spieler
  });
  it('mit der genau gleichen Karte und vier weiteren Paaren darf sie genommen werden; Joker dürfen eines der anderen Paare füllen', () => {
    const { g, b, carpet } = scene(12, (p) => [twin(p), ...p.takeAll('C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'J', 'DK', 'H5', 'H8', 'S3', 'S4', 'D10')]);
    expect(checkDraw(g, b, 'carpet').ok).toBe(true);
    expect(doDraw(g, b, 'carpet').ok).toBe(true);
    const h = g.round.players[b].hand;
    const mate = h.find((c) => c.id !== carpet.id && c.rank === 12 && c.suit === 'H')!;
    const find = (suit: string, rank: number, nth = 0) => h.filter((c) => c.suit === suit && c.rank === rank)[nth];
    const joker = h.find(isJoker)!;
    const res = doLay(g, b, [[carpet.id, mate.id], [find('C', 7, 0).id, find('C', 7, 1).id], [find('H', 2, 0).id, find('H', 2, 1).id], [find('S', 9, 0).id, find('S', 9, 1).id], [joker.id, find('D', 13).id]]);
    expect(res.ok).toBe(true);
  });
  it('die Teppichkarte mit einem Joker zu legen wird abgelehnt, mit der genau gleichen Karte nicht', () => {
    // Zwillingskarte, vier echte Paare und ein Joker: Mit Joker + Teppichkarte wären es ebenfalls fünf Paare, aber das ist verboten
    const { g, b, carpet } = scene(13, (p) => [twin(p), ...p.takeAll('C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'J', 'H5', 'H8', 'S3', 'S4')]);
    expect(doDraw(g, b, 'carpet').ok).toBe(true);
    const h = g.round.players[b].hand;
    const mate = h.find((c) => c.id !== carpet.id && c.rank === 12 && c.suit === 'H')!;
    const find = (suit: string, rank: number, nth = 0) => h.filter((c) => c.suit === suit && c.rank === rank)[nth];
    const joker = h.find(isJoker)!;
    const pairs = [
      [find('C', 7, 0).id, find('C', 7, 1).id],
      [find('H', 2, 0).id, find('H', 2, 1).id],
      [find('S', 9, 0).id, find('S', 9, 1).id],
      [find('D', 13, 0).id, find('D', 13, 1).id],
    ];
    const bad = checkLay(g, b, [[carpet.id, joker.id], ...pairs]);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toBe('err.carpetNoJoker');
    expect(doLay(g, b, [[carpet.id, joker.id], ...pairs]).ok).toBe(false);
    expect(g.round.players[b].hand.length).toBe(15); // nichts wurde gelegt
    expect(g.round.melds.length).toBe(0);
    // Dieselben fünf Paare mit der genau gleichen Karte statt des Jokers sind gültig
    expect(checkLay(g, b, [[carpet.id, mate.id], ...pairs]).ok).toBe(true);
    expect(doLay(g, b, [[carpet.id, mate.id], ...pairs]).ok).toBe(true);
  });
  it('die übrigen vier Paare müssen auch ohne die Teppichkarte zusammenkommen (Joker dürfen mitzählen)', () => {
    // Zwillingskarte plus nur drei echte Paare: zu wenig
    const few = scene(14, (p) => [twin(p), ...p.takeAll('C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'H5', 'H8', 'S3', 'S4', 'D10', 'C3')]);
    expect(checkDraw(few.g, few.b, 'carpet').ok).toBe(false);
    // dieselbe Hand, aber ein Joker macht den König zum vierten Paar: genug
    const joker = scene(14, (p) => [twin(p), ...p.takeAll('C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'J', 'H8', 'S3', 'S4', 'D10', 'C3')]);
    expect(checkDraw(joker.g, joker.b, 'carpet').ok).toBe(true);
    // Der Joker kann nicht gleichzeitig der Partner der Teppichkarte und der des Königs sein: ohne Zwilling bleibt es verboten
    const none = scene(14, (p) => p.takeAll('C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'J', 'H8', 'S3', 'S4', 'D10', 'C3'));
    expect(checkDraw(none.g, none.b, 'carpet').ok).toBe(false);
  });
  it('im letzten Zug bei leerem Stapel zählt die Teppichkarte wie eine normale Karte: Sie darf auch mit einem Joker ein Paar bilden', () => {
    const g = testGame(3, 15);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    g.round.stock = [];
    g.round.carpet = p.take('HD');
    freshTurn(g, a);
    setHand(g, a, p.takeAll('C2', 'D12', 'H5'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    expect(g.round.finalTurn).toBe(true);
    setHand(g, b, p.takeAll('J', 'C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'H5', 'H8'));
    expect(checkDraw(g, b, 'carpet').ok).toBe(true);
    expect(doDraw(g, b, 'carpet').ok).toBe(true);
    expect(g.round.turn.mustPairWithId).toBeNull(); // kein Zwang, kein Teppichkarten-Paar
    const h = g.round.players[b].hand;
    const carpet = h.find((c) => c.suit === 'H' && c.rank === 12)!;
    const joker = h.find(isJoker)!;
    const find = (suit: string, rank: number, nth = 0) => h.filter((c) => c.suit === suit && c.rank === rank)[nth];
    const res = doLay(g, b, [[carpet.id, joker.id], [find('C', 7, 0).id, find('C', 7, 1).id], [find('H', 2, 0).id, find('H', 2, 1).id], [find('S', 9, 0).id, find('S', 9, 1).id], [find('D', 13, 0).id, find('D', 13, 1).id]]);
    expect(res.ok).toBe(true);
  });
  it('die Ablagekarte verträgt sich weiter mit Jokern: Dort darf ein Joker als Partner dienen', () => {
    const g = testGame(3, 16);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('HK', 'D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    const top = g.round.discard[g.round.discard.length - 1];
    g.round.players[b].mode = 'cheft';
    setHand(g, b, p.takeAll('J', 'C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'H5', 'H8', 'S3', 'S4', 'D10'));
    expect(top.rank).toBe(13);
    expect(checkDraw(g, b, 'discard').ok).toBe(true);
  });
});

describe('Bereit-Phase und Ablage nach dem Rauskommen', () => {
  it('vor dem Start sind keine Züge möglich', () => {
    const g = testGame(3, 31);
    g.round.waiting = true;
    g.round.ready = [false, false, false];
    const pid = g.round.starter;
    const res = checkDiscard(g, pid, g.round.players[pid].hand[0].id);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('err.notStarted');
    doReady(g, 0);
    doReady(g, 1);
    expect(g.round.waiting).toBe(true);
    doReady(g, 2);
    expect(g.round.waiting).toBe(false);
  });
  it('rausgekommener Rommé-Spieler nimmt die Ablagekarte nur zum sofortigen Verwenden', () => {
    const g = testGame(3, 32);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    // b ist draußen mit Herz 4-5-6
    g.round.players[b].opened = true;
    g.round.melds.push({ id: 50, owner: b, type: 'run', cards: p.takeAll('H4', 'H5', 'H6'), suit: 'H', startRank: 4 });
    freshTurn(g, a);
    // a hat nur anlegbare Karten, darf also Herz 7 trotz Sperre abwerfen
    setHand(g, a, p.takeAll('H7', 'H3'));
    expect(doDiscard(g, a, g.round.players[a].hand[0].id).ok).toBe(true); // Herz 7 liegt, passt an die Folge
    setHand(g, b, p.takeAll('S2', 'C9', 'D10'));
    expect(checkDraw(g, b, 'discard').ok).toBe(true);
    expect(doDraw(g, b, 'discard').ok).toBe(true);
    const hb = g.round.players[b].hand;
    const h7 = hb.find((c) => c.suit === 'H' && c.rank === 7)!;
    const d = checkDiscard(g, b, hb[0].id);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.error).toBe('err.mustUseTaken');
    expect(checkUndoDraw(g, b).ok).toBe(true);
    expect(doLayOff(g, b, h7.id, 50).ok).toBe(true);
    expect(checkUndoDraw(g, b).ok).toBe(true); // zurücksetzen geht auch nach dem Anlegen
    expect(doDiscard(g, b, hb[0].id).ok).toBe(true);
    // Unbrauchbare Karte: Bots nehmen sie nicht (strenge Prüfung), ein Mensch darf sie nehmen und setzt dann zurück
    const c = (b + 1) % 3;
    g.round.players[c].opened = true;
    setHand(g, c, p.takeAll('S3', 'C10'));
    expect(checkDraw(g, c, 'discard', true).ok).toBe(false);
    expect(checkDraw(g, c, 'discard').ok).toBe(true);
  });
});

describe('Ablagekarte nehmen, wenn man schon draußen ist', () => {
  it('Drilling auslegen und den Joker abwerfen (verbrennen) zählt als sofortiges Verwenden', () => {
    const g = testGame(3, 33);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    // b ist draußen; auf der Ablage liegt eine 7, b hat zwei weitere 7er und einen Joker
    g.round.players[b].opened = true;
    g.round.melds.push({ id: 50, owner: b, type: 'run', cards: p.takeAll('H8', 'H9', 'H10'), suit: 'H', startRank: 8 });
    g.round.discard = [p.take('C7')];
    g.round.lastDiscarderMode = 'romme';
    freshTurn(g, b);
    g.round.turn.phase = 'draw';
    setHand(g, b, p.takeAll('S7', 'D7', 'J'));
    expect(checkDraw(g, b, 'discard').ok).toBe(true);
    expect(doDraw(g, b, 'discard').ok).toBe(true);
    const hand = g.round.players[b].hand;
    const sevens = hand.filter((c) => c.rank === 7).map((c) => c.id);
    expect(doLay(g, b, [sevens]).ok).toBe(true);
    const joker = g.round.players[b].hand.find((c) => isJoker(c))!;
    expect(doDiscard(g, b, joker.id).ok).toBe(true);
    expect(g.round.ended).toBe(true);
    expect(g.round.result!.jokerBurned).toBe(true);
  });

  it('eine Karte, die sich nirgends verwenden lässt, bleibt gesperrt', () => {
    const g = testGame(3, 34);
    const p = new CardPool();
    const b = g.round.starter;
    g.round.players[b].opened = true;
    g.round.discard = [p.take('C7')];
    g.round.lastDiscarderMode = 'romme';
    freshTurn(g, b);
    g.round.turn.phase = 'draw';
    setHand(g, b, p.takeAll('S2', 'D9', 'J'));
    expect(checkDraw(g, b, 'discard', true).ok).toBe(false);
  });
});

describe('Joker eintauschen', () => {
  /** b ist draußen; die Folge Pik 6-7-8 mit Joker (vertritt Pik 9) liegt am Tisch. */
  function setup(seed: number) {
    const g = testGame(3, seed);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    g.round.players[b].opened = true;
    g.round.melds.push({ id: 60, owner: b, type: 'run', cards: p.takeAll('S6', 'S7', 'S8', 'J'), suit: 'S', startRank: 6 });
    return { g, p, a, b };
  }

  it('eine Karte, gegen die der nächste Spieler einen Joker tauschen könnte, darf nicht abgeworfen werden', () => {
    const { g, p, a } = setup(41);
    freshTurn(g, a);
    setHand(g, a, p.takeAll('S9', 'C2', 'D12'));
    const swap = checkDiscard(g, a, g.round.players[a].hand[0].id);
    expect(swap.ok).toBe(false);
    if (!swap.ok) expect(swap.error).toBe('err.discardJokerSwap');
    expect(checkDiscard(g, a, g.round.players[a].hand[1].id).ok).toBe(true);
  });

  it('Sackgasse: sind alle Karten tauschbar oder anlegbar, darf trotzdem abgeworfen werden', () => {
    const { g, p, a } = setup(42);
    freshTurn(g, a);
    setHand(g, a, p.takeAll('S9', 'S5'));
    expect(checkDiscard(g, a, g.round.players[a].hand[0].id).ok).toBe(true);
  });

  it('ist der nächste Spieler nicht draußen, gibt es keine Sperre', () => {
    const { g, p, a, b } = setup(43);
    g.round.players[b].opened = false;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('S9', 'C2', 'D12'));
    expect(checkDiscard(g, a, g.round.players[a].hand[0].id).ok).toBe(true);
  });

  it('wer draußen ist, darf die Ablagekarte nehmen, um damit einen Joker zu tauschen', () => {
    const { g, p, b } = setup(44);
    g.round.discard = [p.take('S9')];
    g.round.lastDiscarderMode = 'romme';
    freshTurn(g, b);
    g.round.turn.phase = 'draw';
    setHand(g, b, p.takeAll('C2', 'D12'));
    expect(checkDraw(g, b, 'discard').ok).toBe(true);
    expect(doDraw(g, b, 'discard').ok).toBe(true);
    const nine = g.round.players[b].hand.find((c) => c.suit === 'S' && c.rank === 9)!;
    expect(doStealJoker(g, b, 60, 3, nine.id).ok).toBe(true);
    const joker = g.round.players[b].hand.find((c) => isJoker(c))!;
    expect(doLayOff(g, b, joker.id, 60).ok).toBe(true);
    expect(doDiscard(g, b, g.round.players[b].hand[0].id).ok).toBe(true);
  });

  it('ohne passenden Joker auf dem Tisch bleibt dieselbe Karte gesperrt', () => {
    const { g, p, b } = setup(45);
    g.round.discard = [p.take('H9')];
    g.round.lastDiscarderMode = 'romme';
    freshTurn(g, b);
    g.round.turn.phase = 'draw';
    setHand(g, b, p.takeAll('C2', 'D12'));
    expect(checkDraw(g, b, 'discard', true).ok).toBe(false);
  });
});

describe('Stapel leer: Teppichkarte im letzten Zug', () => {
  function nearlyEmpty(seed: number, carpet: boolean) {
    const g = testGame(3, seed);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    g.round.stock = [];
    if (!carpet) g.round.carpet = null;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('C2', 'D12', 'H5'));
    return { g, p, a, b };
  }

  it('der nächste Spieler darf die Teppichkarte wie vom Stapel nehmen, danach endet die Runde', () => {
    const { g, a, b } = nearlyEmpty(51, true);
    const carpet = g.round.carpet!;
    expect(doDiscard(g, a, g.round.players[a].hand[0].id).ok).toBe(true);
    expect(g.round.ended).toBe(false);
    expect(g.round.finalTurn).toBe(true);
    expect(g.round.turn.player).toBe(b);
    expect(g.round.turn.phase).toBe('draw');
    // Ohne Paar, ohne Bedingungen, kein Cheft, kein Rauskommen-Zwang
    expect(checkDraw(g, b, 'carpet').ok).toBe(true);
    expect(doDraw(g, b, 'carpet').ok).toBe(true);
    expect(g.round.carpet).toBeNull();
    expect(g.round.players[b].mode).toBe('romme');
    expect(g.round.turn.mustPairWithId).toBeNull();
    expect(g.round.players[b].hand.some((c) => c.id === carpet.id)).toBe(true);
    // wie eine Stapelkarte: Zurücksetzen lässt die Karte auf der Hand
    expect(doUndoDraw(g, b).ok).toBe(true);
    expect(g.round.carpet).toBeNull();
    expect(g.round.players[b].hand.some((c) => c.id === carpet.id)).toBe(true);
    expect(doDiscard(g, b, g.round.players[b].hand[0].id).ok).toBe(true);
    expect(g.round.ended).toBe(true);
    expect(g.round.result!.reason).toBe('stock');
  });

  it('der letzte Zug darf auch mit der Ablagekarte bestritten werden; danach ist trotzdem Schluss', () => {
    const { g, a, b } = nearlyEmpty(52, true);
    doDiscard(g, a, g.round.players[a].hand[0].id);
    setHand(g, b, [...g.round.players[b].hand.slice(0, 3)]);
    expect(doDraw(g, b, 'carpet').ok).toBe(true);
    doDiscard(g, b, g.round.players[b].hand[0].id);
    expect(g.round.ended).toBe(true);
  });

  it('ohne Teppichkarte endet die Runde sofort wie bisher', () => {
    const { g, a } = nearlyEmpty(53, false);
    expect(doDiscard(g, a, g.round.players[a].hand[0].id).ok).toBe(true);
    expect(g.round.ended).toBe(true);
  });
});

describe('Zug zurücksetzen', () => {
  it('Ablagekarte: Zurücksetzen legt sie zurück auf die Ablage und stellt alles wie vor dem Zug her', () => {
    const g = testGame(3, 21);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('HK', 'D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    setHand(g, b, p.takeAll('SK', 'DK', 'H10', 'HB', 'HD', 'D2', 'D9', 'C3', 'C9', 'S2', 'S5', 'H9', 'D4', 'C5'));
    expect(doDraw(g, b, 'discard').ok).toBe(true);
    expect(checkUndoDraw(g, b).ok).toBe(true);
    expect(doUndoDraw(g, b).ok).toBe(true);
    expect(g.round.turn.phase).toBe('draw');
    expect(g.round.discard[g.round.discard.length - 1].rank).toBe(13);
    expect(g.round.players[b].hand.length).toBe(14);
    expect(g.round.taken).toEqual([]);
  });
  it('Stapel: Die gezogene Karte bleibt auf der Hand, alles danach lässt sich zurücksetzen', () => {
    const g = testGame(3, 23);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('HK', 'D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    const stockBefore = g.round.stock.length;
    expect(checkUndoDraw(g, b).ok).toBe(false); // vor dem Ziehen gibt es nichts zurückzusetzen
    expect(doDraw(g, b, 'stock').ok).toBe(true);
    const drawn = g.round.turn.drawnCardId!;
    // Danach ablegen, wieder zurücksetzen: Die Stapelkarte bleibt auf der Hand, nie wieder auf dem Stapel
    const handBefore = g.round.players[b].hand.map((c) => c.id);
    const ids = g.round.players[b].hand.slice(0, 3).map((c) => c.id);
    expect(doUndoDraw(g, b).ok).toBe(true);
    expect(g.round.players[b].hand.map((c) => c.id)).toEqual(handBefore);
    expect(g.round.stock.length).toBe(stockBefore - 1);
    expect(g.round.players[b].hand.some((c) => c.id === drawn)).toBe(true);
    expect(g.round.turn.phase).toBe('play');
    expect(ids.length).toBe(3);
  });
  it('Teppichkarte zurücksetzen: Die Karte geht zurück, die Cheft-Ansage bleibt (sie gilt für die Runde)', () => {
    const g = testGame(3, 22);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    const carpet = g.round.carpet!;
    const pool2 = new CardPool();
    const spec = `${carpet.suit}${carpet.rank === 1 ? 'A' : carpet.rank === 11 ? 'B' : carpet.rank === 12 ? 'D' : carpet.rank === 13 ? 'K' : carpet.rank}`;
    setHand(g, b, [pool2.take(spec), ...pool2.takeAll('C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'H5', 'H8', 'S3', 'S4', 'D10')]);
    expect(doDraw(g, b, 'carpet').ok).toBe(true);
    expect(g.round.players[b].mode).toBe('cheft');
    expect(doUndoDraw(g, b).ok).toBe(true);
    expect(g.round.players[b].mode).toBe('cheft');
    expect(g.round.cheftAnnounced).toBe(true);
    expect(g.round.carpet!.id).toBe(carpet.id);
    expect(g.round.turn.phase).toBe('draw');
    expect(g.round.players[b].hand.length).toBe(14);
  });
  it('Cheft ansagen mit genommener Ablagekarte: erlaubt, die Pflicht entfällt, und Zurücksetzen nimmt es nicht zurück', () => {
    const g = testGame(3, 24);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('HK', 'D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    setHand(g, b, p.takeAll('SK', 'DK', 'H10', 'HB', 'HD', 'D2', 'D9', 'C3', 'C9', 'S2', 'S5', 'H9', 'D4', 'C5'));
    expect(doDraw(g, b, 'discard').ok).toBe(true);
    expect(g.round.turn.mustOpenWithId).not.toBeNull();
    expect(tempCardIds(g.round).length).toBe(1);
    expect(doDeclareCheft(g, b).ok).toBe(true);
    expect(g.round.turn.mustOpenWithId).toBeNull();
    expect(tempCardIds(g.round)).toEqual([]);
    expect(doUndoDraw(g, b).ok).toBe(true);
    expect(g.round.players[b].mode).toBe('cheft');
    expect(g.round.discard[g.round.discard.length - 1].rank).toBe(13);
  });
  it('Beispielzug: Ablagekarte nehmen, Joker mit der Handkarte klauen, Joker als Lücke und die Ablagekarte anlegen', () => {
    const g = testGame(3, 25);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    // a hat Kreuz 6-7-Joker (Joker = 8) ausgelegt; b ist draußen
    g.round.players[a].opened = true;
    g.round.players[b].opened = true;
    g.round.melds.push({ id: 70, owner: a, type: 'run', cards: p.takeAll('C6', 'C7', 'J'), suit: 'C', startRank: 6 });
    g.round.discard = [p.take('C10')];
    g.round.lastDiscarderMode = 'romme';
    freshTurn(g, b);
    g.round.turn.phase = 'draw';
    setHand(g, b, p.takeAll('C8', 'S2', 'D5'));
    // Die Karte lässt sich direkt nirgends anlegen, aber ein Mensch darf sie nehmen
    expect(checkDraw(g, b, 'discard', true).ok).toBe(false);
    expect(doDraw(g, b, 'discard').ok).toBe(true);
    expect(tempCardIds(g.round)).toEqual([g.round.turn.mustUseId]);
    const c8 = g.round.players[b].hand.find((c) => c.suit === 'C' && c.rank === 8)!;
    expect(doStealJoker(g, b, 70, 2, c8.id).ok).toBe(true);
    const joker = g.round.players[b].hand.find(isJoker)!;
    expect(tempCardIds(g.round).length).toBe(2);
    expect(checkDiscard(g, b, g.round.players[b].hand[0].id).ok).toBe(false);
    expect(doLayOff(g, b, joker.id, 70, 'top').ok).toBe(true);
    const c10 = g.round.players[b].hand.find((c) => c.suit === 'C' && c.rank === 10)!;
    expect(doLayOff(g, b, c10.id, 70, 'top').ok).toBe(true);
    expect(tempCardIds(g.round)).toEqual([]);
    expect(g.round.melds[0].cards.length).toBe(5);
    const rest = g.round.players[b].hand[0];
    expect(doDiscard(g, b, rest.id).ok).toBe(true);
  });
  it('Mit einer vorübergehenden Karte auf der Hand lässt sich nicht abwerfen; nach dem Auslegen ohne sie auch nicht', () => {
    const g = testGame(3, 26);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('HK', 'D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    setHand(g, b, p.takeAll('SK', 'DK', 'H10', 'HB', 'HD', 'D2', 'D9', 'C3', 'C9', 'S2', 'S5', 'H9', 'D4', 'C5'));
    expect(doDraw(g, b, 'discard').ok).toBe(true);
    const hb = g.round.players[b].hand;
    // Erstmeldung ohne die genommene Karte (Herz König) wird abgelehnt
    const lay = doLay(g, b, [[hb.find((c) => c.rank === 12)!.id, hb.find((c) => c.rank === 11)!.id, hb.find((c) => c.rank === 10 && c.suit === 'H')!.id]]);
    expect(lay.ok).toBe(false);
  });
  it('die Spieler-Sicht zeigt vorübergehende Karten offen, nie den Rücksetzpunkt', () => {
    const g = testGame(3, 27);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('HK', 'D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    setHand(g, b, p.takeAll('SK', 'DK', 'H10', 'HB', 'HD', 'D2', 'D9', 'C3', 'C9', 'S2', 'S5', 'H9', 'D4', 'C5'));
    doDraw(g, b, 'discard');
    const view = viewFor(g, a);
    expect(view.round.turn.rewind).toBeUndefined();
    expect(view.round.turn.canRewind).toBe(true);
    const open = view.round.players[b].hand.filter((c) => c.id >= 0);
    expect(open.length).toBe(1);
    expect(open[0].rank).toBe(13);
    expect(view.round.players[b].hand.filter((c) => c.id < 0).length).toBe(14);
    expect(JSON.stringify(view)).not.toContain('"rewind":"');
  });
  it('abortTurn setzt einen angefangenen Zug zurück (Neuladen, Autopilot)', () => {
    const g = testGame(3, 28);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('HK', 'D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    setHand(g, b, p.takeAll('SK', 'DK', 'H10', 'HB', 'HD', 'D2', 'D9', 'C3', 'C9', 'S2', 'S5', 'H9', 'D4', 'C5'));
    doDraw(g, b, 'discard');
    abortTurn(g);
    expect(g.round.turn.phase).toBe('draw');
    expect(g.round.players[b].hand.length).toBe(14);
    expect(g.round.discard[g.round.discard.length - 1].rank).toBe(13);
  });
});

describe('Teppichkarte für Cheft-Spieler, die schon fünf Paare ausgelegt haben', () => {
  /** b ist Cheft, hat fünf Paare ausgelegt und am Zug. Handkarten vor dem Ziehen: `hand`. Teppichkarte: Herz Dame. */
  function scene(seed: number, hand: (p: CardPool) => ReturnType<CardPool['takeAll']>, laid = 5) {
    const g = testGame(3, seed);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    g.round.carpet = p.take('HD');
    setHand(g, a, p.takeAll('D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    const pb = g.round.players[b];
    pb.mode = 'cheft';
    pb.opened = true;
    pb.pairsLaid = laid;
    g.round.cheftAnnounced = true;
    setHand(g, b, hand(p));
    return { g, b };
  }

  it('genau vier Handkarten mit Zwilling und einem weiteren Paar: erlaubt; beide Paare liegen auf einmal, dann ist die Runde aus', () => {
    const { g, b } = scene(61, (p) => p.takeAll('HD', 'C7', 'C7', 'S3'));
    expect(checkDraw(g, b, 'carpet').ok).toBe(true);
    expect(doDraw(g, b, 'carpet').ok).toBe(true);
    expect(tempCardIds(g.round).length).toBe(1);
    const h = g.round.players[b].hand;
    expect(checkDiscard(g, b, h.find((c) => c.suit === 'S')!.id).ok).toBe(false);
    // nur ein Paar (sechstes Paar) ist nicht erlaubt, auch nicht in Schritten
    const twin = h.find((c) => c.rank === 12 && c.id !== g.round.turn.mustPairWithId)!;
    const only = doLay(g, b, [[g.round.turn.mustPairWithId!, twin.id]]);
    expect(only.ok).toBe(false);
    const sevens = h.filter((c) => c.rank === 7).map((c) => c.id);
    expect(doLay(g, b, [[g.round.turn.mustPairWithId!, twin.id], sevens]).ok).toBe(true);
    expect(doDiscard(g, b, h.find((c) => c.suit === 'S')!.id).ok).toBe(true);
    expect(g.round.ended).toBe(true);
    expect(g.round.result!.winner).toBe(b);
  });
  it('das weitere Paar darf mit einem Joker gebildet werden', () => {
    const { g, b } = scene(62, (p) => p.takeAll('HD', 'J', 'C7', 'S3'));
    expect(checkDraw(g, b, 'carpet').ok).toBe(true);
  });
  it('mit Joker als einzigem Partner der Teppichkarte, anderer Handkartenzahl oder anderer Paarzahl nicht', () => {
    const jokerOnly = scene(63, (p) => p.takeAll('J', 'C7', 'C7', 'S3'));
    expect(checkDraw(jokerOnly.g, jokerOnly.b, 'carpet').ok).toBe(false);
    const five = scene(64, (p) => p.takeAll('HD', 'C7', 'C7', 'S3', 'S4'));
    expect(checkDraw(five.g, five.b, 'carpet').ok).toBe(false);
    const three = scene(65, (p) => p.takeAll('HD', 'C7', 'C7'));
    expect(checkDraw(three.g, three.b, 'carpet').ok).toBe(false);
    const nopair = scene(66, (p) => p.takeAll('HD', 'C7', 'S9', 'S3'));
    expect(checkDraw(nopair.g, nopair.b, 'carpet').ok).toBe(false);
    const seven = scene(67, (p) => p.takeAll('HD', 'C7', 'C7', 'S3'), 7);
    expect(checkDraw(seven.g, seven.b, 'carpet').ok).toBe(false);
  });
  it('ein Rommé-Spieler, der draußen ist, darf die Teppichkarte nie nehmen', () => {
    const { g, b } = scene(68, (p) => p.takeAll('HD', 'C7', 'C7', 'S3'));
    g.round.players[b].mode = 'romme';
    const r = checkDraw(g, b, 'carpet');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('err.carpetOnlyCheft');
  });
});

describe('Zugzähler und Zeitstempel (Grundlage des Bot-Gedächtnisses)', () => {
  it('der Zugzähler beginnt bei 0, zählt jeden Abwurf und beginnt mit jeder Runde neu', () => {
    const g = testGame(3, 41);
    expect(g.round.plies).toBe(0);
    for (let i = 0; i < 7; i++) {
      const pid = g.round.turn.player;
      freshTurn(g, pid);
      setHand(g, pid, [
        { id: 2000 + i, suit: 'H', rank: 2 },
        { id: 3000 + i, suit: 'C', rank: 9 },
      ]);
      expect(doDiscard(g, pid, 2000 + i).ok).toBe(true);
      expect(g.round.plies).toBe(i + 1);
    }
    endRound(g, null, false);
    startNextRound(g);
    expect(g.round.plies).toBe(0);
    expect(g.round.taken).toEqual([]);
  });
  it('ein misslungener Abwurf zählt nicht', () => {
    const g = testGame(3, 42);
    const pid = g.round.turn.player;
    freshTurn(g, pid);
    setHand(g, pid, [{ id: 2000, suit: 'H', rank: 2 }]);
    const before = g.round.plies;
    expect(doDiscard(g, pid, 999).ok).toBe(false);
    expect(g.round.plies).toBe(before);
  });
  it('das Abwurf-Protokoll des Rückblicks bleibt bei 8 Einträgen; "discardedBy" kennt die ganze Runde', () => {
    const g = testGame(3, 43);
    const players: number[] = [];
    for (let i = 0; i < 80; i++) {
      const pid = g.round.turn.player;
      players.push(pid);
      freshTurn(g, pid);
      setHand(g, pid, [
        { id: 2000 + i, suit: 'H', rank: 2 },
        { id: 3000 + i, suit: 'C', rank: 9 },
      ]);
      expect(doDiscard(g, pid, 2000 + i).ok).toBe(true);
    }
    expect(g.round.plies).toBe(80);
    const log = g.round.discardLog!;
    expect(log.length).toBe(8);
    expect(log[0].card.id).toBe(2072);
    expect(log[7].card.id).toBe(2079);
    log.forEach((e, k) => expect(e.player).toBe(players[72 + k]));
    expect(Object.keys(g.round.discardedBy!).length).toBe(80);
    for (let i = 0; i < 80; i++) expect(g.round.discardedBy![2000 + i]).toBe(players[i]);
    // Neue Runde: alles beginnt neu
    endRound(g, null, false);
    startNextRound(g);
    expect(g.round.discardedBy).toEqual({});
    expect(g.round.discardLog).toEqual([]);
  });
  it('Nehmen von Ablage und Teppichkarte merkt sich den Zeitpunkt; Zurücklegen löscht den Eintrag wieder', () => {
    const g = testGame(3, 44);
    const p = new CardPool();
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('HK', 'D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    expect(g.round.plies).toBe(1);
    setHand(g, b, p.takeAll('SK', 'DK', 'H10', 'HB', 'HD', 'D2', 'D9', 'C3', 'C9', 'S2', 'S5', 'H9', 'D4', 'C5'));
    expect(doDraw(g, b, 'discard').ok).toBe(true);
    expect(g.round.taken).toEqual([{ player: b, card: expect.objectContaining({ rank: 13, suit: 'H' }), at: 1 }]);
    expect(g.round.plies).toBe(1); // Nehmen beendet den Zug nicht
    expect(doUndoDraw(g, b).ok).toBe(true);
    expect(g.round.taken).toEqual([]);
    expect(g.round.plies).toBe(1);
  });
  it('die Teppichkarte wird mit Zeitpunkt vermerkt und beim Zurücklegen wieder gelöscht', () => {
    const g = testGame(3, 45);
    const a = g.round.starter;
    const b = (a + 1) % 3;
    freshTurn(g, a);
    const pool = new CardPool();
    setHand(g, a, pool.takeAll('D3', 'C8'));
    doDiscard(g, a, g.round.players[a].hand[0].id);
    const carpet = g.round.carpet!;
    const spec = `${carpet.suit}${carpet.rank === 1 ? 'A' : carpet.rank === 11 ? 'B' : carpet.rank === 12 ? 'D' : carpet.rank === 13 ? 'K' : carpet.rank}`;
    const pool2 = new CardPool();
    setHand(g, b, [pool2.take(spec), ...pool2.takeAll('C7', 'C7', 'H2', 'H2', 'S9', 'S9', 'DK', 'DK', 'H5', 'H8', 'S3', 'S4', 'D10')]);
    expect(doDraw(g, b, 'carpet').ok).toBe(true);
    expect(g.round.taken.length).toBe(1);
    expect(g.round.taken[0]).toMatchObject({ player: b, at: 1 });
    expect(g.round.taken[0].card.id).toBe(carpet.id);
    expect(doUndoDraw(g, b).ok).toBe(true);
    expect(g.round.taken).toEqual([]);
  });
});

describe('Anlegen, Abwurf-Sperre, Joker klauen', () => {
  function opened(g: GameState, pid: number) {
    const p = new CardPool();
    freshTurn(g, pid);
    setHand(g, pid, p.takeAll('SD', 'SK', 'SA', 'HK', 'DK', 'CK', 'D2', 'D9', 'H7', 'J'));
    const h = g.round.players[pid].hand;
    expect(doLay(g, pid, [[h[0].id, h[1].id, h[2].id], [h[3].id, h[4].id, h[5].id]]).ok).toBe(true);
    return p;
  }
  it('legt an eigene und fremde Rommé-Kombinationen an', () => {
    const g = testGame(3, 11);
    const a = g.round.starter;
    opened(g, a);
    const run = g.round.melds.find((m) => m.type === 'run')!;
    const h = g.round.players[a].hand;
    const d2 = h.find((c) => c.suit === 'D' && c.rank === 2)!;
    expect(doLayOff(g, a, d2.id, run.id).ok).toBe(false);
    const joker = h.find(isJoker)!;
    expect(doLayOff(g, a, joker.id, run.id, 'bottom').ok).toBe(true);
    expect(g.round.melds.find((m) => m.id === run.id)!.startRank).toBe(11);
  });
  it('verbietet Abwurf einer anlegbaren Karte, wenn der nächste Spieler draußen ist', () => {
    const g = testGame(3, 12);
    const a = g.round.starter;
    const b = (a + 1) % 3;
    const p = opened(g, a);
    const h = g.round.players[a].hand;
    expect(doDiscard(g, a, h.find((c) => c.rank === 2)!.id).ok).toBe(true);
    // b kommt raus, dann ist a wieder dran? Nein: c ist dran. Wir setzen b als geöffnet und a als aktuellen Spieler.
    g.round.players[b].opened = true;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('SB', 'H3', 'C4'));
    const ha = g.round.players[a].hand;
    const res = checkDiscard(g, a, ha[0].id); // Pik Bube passt an D-K-A
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('err.discardLayoffable');
    expect(checkDiscard(g, a, ha[1].id).ok).toBe(true);
  });
  it('erlaubt den Abwurf, wenn jede Handkarte anlegbar wäre', () => {
    const g = testGame(3, 16);
    const a = g.round.starter;
    const b = (a + 1) % 3;
    const p = opened(g, a);
    g.round.players[b].opened = true;
    freshTurn(g, a);
    setHand(g, a, p.takeAll('SB', 'SK'));
    const ha = g.round.players[a].hand;
    expect(checkDiscard(g, a, ha[0].id).ok).toBe(true);
  });
  it('klaut Joker aus Paar nur mit exakter Karte und muss ihn sofort nutzen', () => {
    const g = testGame(3, 13);
    const a = g.round.starter;
    const b = (a + 1) % 3;
    const p = opened(g, a);
    // b legt ein Paar mit Joker (als Cheft) - direkt in den Zustand schreiben
    const jokerPool = new CardPool();
    const [c7, jk] = jokerPool.takeAll('C7', 'J');
    g.round.melds.push({ id: 99, owner: b, type: 'pair', cards: [c7, jk], suit: 'C', rank: 7 });
    freshTurn(g, a);
    setHand(g, a, [...p.takeAll('C7', 'H3', 'C4')]);
    const ha = g.round.players[a].hand;
    expect(doStealJoker(g, a, 99, 1, ha[1].id).ok).toBe(false);
    expect(doStealJoker(g, a, 99, 1, ha[0].id).ok).toBe(true);
    expect(g.round.turn.pendingJokerId).toBe(jk.id);
    const d = checkDiscard(g, a, ha[1].id);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.error).toBe('err.jokerMustUse');
    const run = g.round.melds.find((m) => m.type === 'run')!;
    expect(doLayOff(g, a, jk.id, run.id, 'bottom').ok).toBe(true);
    expect(g.round.turn.pendingJokerId).toBeNull();
  });
});

describe('Wertung', () => {
  it('Extrembeispiel: 100 x 2 x 2 x 2 x 2 = 1600', () => {
    const g = testGame(3, 14);
    const a = g.round.starter;
    const b = (a + 1) % 3;
    g.round.players[a].mode = 'cheft';
    g.round.players[b].mode = 'cheft';
    g.round.turn.player = a;
    g.round.turn.isHand = true;
    g.round.players[a].opened = true;
    g.round.players[a].hand = [];
    endRound(g, a, true);
    const r = g.round.result!;
    expect(r.scores[b].total).toBe(1600);
    expect(r.scores[a].total).toBe(0);
    const c = (a + 2) % 3;
    expect(r.scores[c].total).toBe(800);
  });
  it('rausgekommene Spieler zählen Augen, Stapelende ohne Gewinner', () => {
    const g = testGame(3, 15);
    const p = new CardPool();
    const a = g.round.starter;
    g.round.players[a].opened = true;
    setHand(g, a, p.takeAll('J', 'HA', 'D5'));
    g.round.players[(a + 1) % 3].mode = 'cheft';
    endRound(g, null, false);
    const r = g.round.result!;
    expect(r.reason).toBe('stock');
    expect(r.scores[a].total).toBe(41);
    expect(r.scores[(a + 1) % 3].total).toBe(200);
    expect(r.scores[(a + 2) % 3].total).toBe(100);
    expect(g.totals[a]).toBe(41);
    startNextRound(g);
    expect(g.round.no).toBe(2);
    expect(g.round.dealer).toBe(1);
  });
});

describe('scoreOrder', () => {
  it('beginnt beim Startspieler der ersten Runde und folgt der Spielreihenfolge', () => {
    const players = [0, 1, 2, 3].map((id) => ({ id, name: `P${id}`, isBot: false }));
    const settings = { rounds: 5, firstTurnOpenAllowed: false, direction: 'ccw' as const, peekDiscards: true, sortedDeal: true };
    const state = newGame(players, settings, 1, 2); // Geber 2, Startspieler 3
    expect(scoreOrder(state)).toEqual([3, 0, 1, 2]);
    state.round = dealRound(state, 3, 0); // Runde 3: Startspieler 1, Reihenfolge bleibt
    expect(scoreOrder(state)).toEqual([3, 0, 1, 2]);
  });
});

describe('Letzte Karte und Sortierung', () => {
  it('Ass ist die höchste Karte: nach dem König, Joker zuletzt', () => {
    const pool = new CardPool();
    const cards = pool.takeAll('J', 'H1', 'H13', 'H2', 'S1', 'S5');
    const sorted = sortBySuit(cards).map((c) => (isJoker(c) ? 'J' : `${c.suit}${c.rank}`));
    expect(sorted).toEqual(['H2', 'H13', 'H1', 'S5', 'S1', 'J']);
  });

  it('geklauter Joker darf als letzte Karte abgeworfen werden (Joker verbrannt), mit mehr Karten nicht', () => {
    const g = testGame(3, 14);
    const a = g.round.starter;
    freshTurn(g, a);
    const pool = new CardPool();
    const [jk, c4] = pool.takeAll('J', 'C4');
    setHand(g, a, [jk]);
    g.round.turn.pendingJokerId = jk.id;
    expect(checkDiscard(g, a, jk.id).ok).toBe(true);
    setHand(g, a, [jk, c4]);
    expect(checkDiscard(g, a, c4.id).ok).toBe(false);
  });

  it('genommene Ablagekarte darf als letzte Karte weg, die Teppichkarte nicht', () => {
    const g = testGame(3, 14);
    const a = g.round.starter;
    freshTurn(g, a);
    const [c4] = new CardPool().takeAll('C4');
    setHand(g, a, [c4]);
    g.round.turn.mustUseId = c4.id;
    expect(checkDiscard(g, a, c4.id).ok).toBe(true);
    g.round.turn.mustUseId = null;
    g.round.turn.mustPairWithId = c4.id;
    expect(checkDiscard(g, a, c4.id).ok).toBe(false);
  });
});

describe('Auslegen: gewählte Variante wird genau so gelegt', () => {
  it('Joker bleibt dort, wo die Auswahl ihn zeigt (Q K J ≠ Q K A)', () => {
    const g = testGame(3, 14);
    const a = g.round.starter;
    freshTurn(g, a);
    g.round.players[a].opened = true;
    const pool = new CardPool();
    const [cq, ck, jk, x] = pool.takeAll('C12', 'C13', 'J', 'H3');
    for (const order of [[jk, cq, ck], [cq, ck, jk]]) {
      setHand(g, a, [cq, ck, jk, x]);
      g.round.melds = [];
      expect(doLay(g, a, [order.map((c) => c.id)]).ok).toBe(true);
      expect(g.round.melds[0].cards.map((c) => c.id)).toEqual(order.map((c) => c.id));
      expect(g.round.melds[0].startRank).toBe(order[0] === jk ? 11 : 12);
    }
  });

  it('zufällige Auswahlen: jede angebotene Aufteilung wird exakt so ausgelegt', () => {
    const rng = makeRng(2024);
    let checked = 0;
    for (let iter = 0; iter < 400; iter++) {
      const g = testGame(3, 1 + iter);
      const a = g.round.starter;
      freshTurn(g, a);
      g.round.players[a].opened = true;
      g.round.players[a].mode = 'romme';
      const deck = [...g.round.players[a].hand, ...g.round.players[(a + 1) % 3].hand, ...g.round.stock];
      const pick: Card[] = [];
      const suit = ['H', 'S', 'D', 'C'][Math.floor(rng() * 4)];
      const start = 1 + Math.floor(rng() * 10);
      const len = 3 + Math.floor(rng() * 3);
      const jokers = deck.filter((c) => c.suit === 'J');
      const nj = Math.floor(rng() * 3);
      for (let i = 0; i < len; i++) {
        const rank = ((start + i - 1) % 13) + 1;
        const c = deck.find((d) => d.suit === suit && d.rank === rank && !pick.includes(d));
        if (c && !(i > 0 && i < len && rng() < 0.2 && pick.filter(isJoker).length < nj)) pick.push(c);
        else if (jokers[pick.filter(isJoker).length]) pick.push(jokers[pick.filter(isJoker).length]);
      }
      if (pick.length < 3) continue;
      const extra = deck.find((d) => !pick.includes(d) && !isJoker(d))!;
      setHand(g, a, [...pick, extra]);
      const hand = g.round.players[a].hand;
      const cards = pick.map((c) => hand.find((h) => h.id === c.id)!).filter(Boolean);
      if (cards.length < 3) continue;
      for (const types of [ROMME_TYPES, ALL_TYPES]) {
        for (const part of findAllPartitions(cards, { types }, 500)) {
          const groups = part.melds.map((m) => m.cards.map((c) => c.id));
          const before = structuredClone(g);
          const chk = checkLay(before, a, groups);
          if (!chk.ok) continue;
          expect(doLay(before, a, groups).ok).toBe(true);
          part.melds.forEach((m, i) => {
            const laid = before.round.melds[i];
            expect(laid.type).toBe(m.type);
            expect(laid.cards.map((c) => c.id)).toEqual(m.cards.map((c) => c.id));
            expect(laid.startRank).toBe(m.startRank);
          });
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
  });
});

describe('Anlegen: gewählte Seite wird genau so angelegt', () => {
  it('Joker oben oder unten an eine Folge: jede angebotene Form entsteht wirklich', () => {
    const g = testGame(3, 14);
    const a = g.round.starter;
    const pool = new CardPool();
    const [c5, c6, c7, jk, x] = pool.takeAll('C5', 'C6', 'C7', 'J', 'H3');
    for (const end of ['top', 'bottom'] as const) {
      const h = structuredClone(g);
      freshTurn(h, a);
      h.round.players[a].opened = true;
      h.round.melds = [{ id: 1, owner: (a + 1) % 3, type: 'run', cards: [c5, c6, c7], suit: 'C', startRank: 5 }];
      setHand(h, a, [jk, x]);
      const opts = layOffTargets(h, a, jk.id);
      expect(opts.length).toBe(2);
      const want = opts[end === 'top' ? 0 : 1].result;
      expect(doLayOff(h, a, jk.id, 1, end).ok).toBe(true);
      expect(h.round.melds[0].cards.map((c) => c.id)).toEqual(want.cards.map((c) => c.id));
      expect(h.round.melds[0].startRank).toBe(want.startRank);
    }
  });
});

describe('Teppich-Joker: Joker unter dem Abheben gehen an den Startspieler und sind öffentlich', () => {
  // Seed 18: ein Joker, Seed 3413: zwei Joker nacheinander (gefunden durch Suchlauf, deterministisch)
  const make = (seed: number) => newGame(testPlayers(4), DEFAULT_SETTINGS, seed);

  it('ein Joker: Er liegt in der Hand des Startspielers, die Teppichkarte ist keiner, die Hand hat 14 plus die offene Karte', () => {
    const g = make(18);
    const r = g.round;
    expect(r.carpetJokers?.length).toBe(1);
    expect(isJoker(r.carpet!)).toBe(false);
    const hand = r.players[r.starter].hand;
    expect(hand.length).toBe(15);
    expect(hand.filter(isJoker).length).toBeGreaterThanOrEqual(1);
    for (const c of r.carpetJokers!) expect(hand.some((h) => h.id === c.id)).toBe(true);
    // Die offene Startkarte (15.) ist die letzte Karte der Hand und kein Teppich-Joker
    expect(r.turn.drawnCardId).toBe(hand[14].id);
    expect(r.carpetJokers!.some((c) => c.id === hand[14].id)).toBe(false);
  });

  it('zwei Joker nacheinander: beide gehen an den Startspieler, der Rest der Hand bleibt bei 14 plus offene Karte', () => {
    const g = make(3413);
    const r = g.round;
    expect(r.carpetJokers?.length).toBe(2);
    expect(isJoker(r.carpet!)).toBe(false);
    expect(r.players[r.starter].hand.length).toBe(15);
    expect(r.players.filter((_, i) => i !== r.starter).every((p) => p.hand.length === 14)).toBe(true);
    // Alle 106 Karten sind noch genau einmal da
    const all = [...r.stock, ...r.discard, r.carpet!, ...r.players.flatMap((p) => p.hand)];
    expect(new Set(all.map((c) => c.id)).size).toBe(106);
  });

  it('ohne Joker unter dem Abheben ist die Liste leer', () => {
    const g = make(1);
    expect(g.round.carpetJokers).toEqual([]);
  });

  it('jeder Betrachter sieht die Teppich-Joker offen, die übrigen Handkarten des Startspielers bleiben verdeckt', () => {
    const g = make(3413);
    const s = g.round.starter;
    const other = (s + 1) % 4;
    const v = viewFor(g, other);
    expect(v.round.carpetJokers!.map((c) => c.id)).toEqual(g.round.carpetJokers!.map((c) => c.id));
    expect(v.round.carpetJokers!.every(isJoker)).toBe(true);
    expect(v.round.carpetJokers!.every((c) => c.id >= 0)).toBe(true);
    // Die Hand des Startspielers bleibt für andere komplett verdeckt; die offene Startkarte und die Teppich-Joker kommen getrennt
    expect(v.round.players[s].hand.every((c) => c.id < 0)).toBe(true);
    expect(v.round.openCard).toBeDefined();
  });
});
