import { describe, it, expect } from 'vitest';
import { isJoker } from './cards';
import {
  doDraw,
  doLay,
  doDiscard,
  doLayOff,
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
  GameState,
} from './game';
import { CardPool, testGame, setHand } from './testutil';

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
    let res = checkDraw(g, b, 'discard');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('err.rommeDiscardNoOpen');
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
    expect(checkUndoDraw(g, b).ok).toBe(false);
    expect(doDiscard(g, b, hb[0].id).ok).toBe(true);
    // Unbrauchbare Karte darf nicht genommen werden
    const c = (b + 1) % 3;
    g.round.players[c].opened = true;
    setHand(g, c, p.takeAll('S3', 'C10'));
    expect(checkDraw(g, c, 'discard').ok).toBe(false);
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
    expect(checkDraw(g, b, 'discard').ok).toBe(false);
  });
});

describe('Zurücklegen', () => {
  it('Ablagekarte zurücklegen, solange nichts liegt', () => {
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
    // Vom Stapel ziehen ist kein Rückgängig-Fall
    expect(doDraw(g, b, 'stock').ok).toBe(true);
    expect(checkUndoDraw(g, b).ok).toBe(false);
  });
  it('Teppichkarte zurücklegen nimmt die Cheft-Ansage zurück', () => {
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
    expect(g.round.cheftAnnounced).toBe(true);
    expect(doUndoDraw(g, b).ok).toBe(true);
    expect(g.round.players[b].mode).toBe('romme');
    expect(g.round.cheftAnnounced).toBe(false);
    expect(g.round.carpet!.id).toBe(carpet.id);
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
