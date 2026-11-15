import { describe, it, expect } from 'vitest';
import { Rooms, Room, MIN_PLAYERS, AUTOPILOT_AFTER_MS } from './room';
import { seal, open } from './snapshot';

describe('Räume', () => {
  it('erstellen, beitreten, Bots auffüllen, starten', () => {
    const rooms = new Rooms(5);
    const room = rooms.create();
    expect(room.code).toMatch(/^[A-Z2-9]{4}$/);
    const a = room.addHuman('Tobias');
    expect('pid' in a && a.pid).toBe(0);
    const b = room.addHuman('Tobias');
    expect('pid' in b && b.pid).toBe(1);
    expect(room.seats[1].name).not.toBe(room.seats[0].name);
    let r = room.start();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('net.tooFew');
    expect(room.addBot({ level: 'random', style: 'random' }).ok).toBe(true);
    expect(room.addBot({ level: 'hard', style: 'blocker' }).ok).toBe(true);
    expect(room.addBot({ level: 'easy', style: 'cheft' }).ok).toBe(false); // voll
    r = room.start();
    expect(r.ok).toBe(true);
    expect(room.started).toBe(true);
    expect(room.state!.players.length).toBe(4);
    expect(room.state!.players[3].bot).toEqual({ level: 'hard', style: 'blocker' });
    // Nach dem Start kein normaler Beitritt mehr; Plätze lassen sich nur übernehmen
    const late = room.addHuman('Spät');
    expect('ok' in late && late.ok).toBe(false);
    expect(MIN_PLAYERS).toBe(3);
  });

  it('maskiert fremde Hände und den Stapel', () => {
    const rooms = new Rooms(6);
    const room = rooms.create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'normal', style: 'balanced' });
    room.start();
    const v = room.viewFor(0)!;
    expect(v.viewer).toBe(0);
    expect(v.round.players[0].hand.every((c) => c.id >= 0)).toBe(true);
    expect(v.round.players[1].hand.every((c) => c.id < 0 && c.suit === 'J')).toBe(true);
    expect(v.round.players[1].hand.length).toBe(room.state!.round.players[1].hand.length);
    expect(v.round.stock.every((c) => c.id < 0)).toBe(true);
    expect(v.round.stock.length).toBe(room.state!.round.stock.length);
    expect(v.players[2].bot).toBeUndefined(); // Rolle bleibt bis zum Ende verborgen
    // Offene Karte des Startspielers ist für alle sichtbar
    expect(v.round.openCard).toBeDefined();
    expect(v.round.openCard!.id).toBeGreaterThanOrEqual(0);
  });

  it('spielt ein Spiel mit Autopilot für Bots und getrennte Menschen durch', () => {
    const rooms = new Rooms(7);
    const room = rooms.create();
    room.addHuman('A');
    room.addBot({ level: 'random', style: 'random' });
    room.addBot({ level: 'random', style: 'random' });
    room.updateSettings({ rounds: 7 });
    room.start();
    // Mensch trennt die Verbindung vor langer Zeit
    room.setConnected(0, false);
    expect(room.paused).toBe('auto'); // niemand mehr da: das Spiel wartet
    expect(room.autoSeat()).toBeNull();
    room.resume();
    room.seats[0].disconnectedAt = Date.now() - 60000;
    let guard = 0;
    while (!room.state!.finished && guard++ < 30000) {
      const pid = room.autoSeat();
      expect(pid).not.toBeNull();
      room.autoStep(pid!);
    }
    expect(room.state!.finished).toBe(true);
    const v = room.viewFor(0)!;
    expect(v.players[1].bot).toBeDefined(); // am Ende aufgedeckt
    expect(room.backToLobby().ok).toBe(true);
    expect(room.started).toBe(false);
  });

  it('Rejoin per Token, Aufräumen alter Räume', () => {
    const rooms = new Rooms(8);
    const room = rooms.create();
    const a = room.addHuman('A');
    const token = 'token' in a ? a.token : '';
    expect(room.findByToken(token)!.pid).toBe(0);
    expect(room.findByToken('falsch')).toBeUndefined();
    expect(rooms.get(room.code.toLowerCase())).toBe(room);
    expect(rooms.sweep(1000, Date.now() + 5000)).toEqual([room.code]);
    expect(rooms.size).toBe(0);
  });

  /** Raum mit zwei Menschen und einem Bot, bei dem alle Züge automatisch laufen, bis die Runde endet. */
  function roundEndRoom(seed: number): Room {
    const rooms = new Rooms(seed);
    const room = rooms.create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'random', style: 'random' });
    room.start();
    room.setConnected(0, false);
    room.setConnected(1, false);
    room.resume();
    for (const pid of [0, 1]) room.seats[pid].disconnectedAt = Date.now() - 60000;
    let guard = 0;
    while (!room.state!.round.ended && guard++ < 5000) room.autoStep(room.autoSeat()!);
    expect(room.state!.round.ended).toBe(true);
    room.setConnected(0, true);
    room.setConnected(1, true);
    return room;
  }

  it('neue Runde beginnt erst, wenn alle Menschen die Auswertung bestätigt haben', () => {
    const room = roundEndRoom(11);
    const no = room.state!.round.no;
    expect(room.nextRound(0).ok).toBe(true);
    expect(room.state!.round.no).toBe(no); // B fehlt noch
    expect(room.state!.round.nextReady).toEqual([true, false, false]);
    // Der Bot bestätigt automatisch, aber erst B löst die neue Runde aus
    expect(room.autoSeat()).toBe(2);
    room.autoStep(2);
    expect(room.state!.round.no).toBe(no);
    expect(room.nextRound(1).ok).toBe(true);
    expect(room.state!.round.no).toBe(no + 1);
    // Danach wieder die Bereit-Phase mit Sortieren
    expect(room.state!.round.waiting).toBe(true);
    expect(room.state!.round.ready).toEqual([false, false, false]);
  });

  it('wer weg ist, bestätigt nach der Wartezeit automatisch', () => {
    const room = roundEndRoom(12);
    const no = room.state!.round.no;
    room.nextRound(0);
    room.setConnected(1, false);
    room.setConnected(2, true); // Bot bleibt unberührt
    expect(room.autoSeat()).toBe(2); // zuerst der Bot
    room.autoStep(2);
    expect(room.autoSeat()).toBeNull(); // B ist noch in der Schonfrist
    room.seats[1].disconnectedAt = Date.now() - AUTOPILOT_AFTER_MS - 1000;
    expect(room.autoSeat()).toBe(1);
    room.autoStep(1);
    expect(room.state!.round.no).toBe(no + 1);
  });

  it('Pause stoppt Aktionen und Autopilot, automatische Pause endet bei Rückkehr aller', () => {
    const rooms = new Rooms(13);
    const room = rooms.create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'random', style: 'random' });
    room.start();
    expect(room.pause().ok).toBe(true);
    expect(room.paused).toBe('manual');
    expect(room.autoSeat()).toBeNull();
    const act = room.act(room.state!.round.turn.player, { kind: 'ready' });
    expect(act.ok).toBe(false);
    if (!act.ok) expect(act.error).toBe('net.paused');
    expect(room.resume().ok).toBe(true);
    expect(room.paused).toBeNull();
    // Beide gehen: automatische Pause; erst wenn beide wieder da sind, geht es weiter
    room.setConnected(0, false);
    expect(room.paused).toBeNull(); // B ist noch da
    room.setConnected(1, false);
    expect(room.paused).toBe('auto');
    room.setConnected(0, true);
    expect(room.paused).toBe('auto');
    room.setConnected(1, true);
    expect(room.paused).toBeNull();
  });

  it('Spielleiter wechselt auf den nächsten verbundenen Menschen und zurück', () => {
    const rooms = new Rooms(14);
    const room = rooms.create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'random', style: 'random' });
    room.start();
    expect(room.effectiveHost()).toBe(0);
    room.setConnected(0, false);
    expect(room.effectiveHost()).toBe(1);
    expect(room.lobbyView().seats[1].isHost).toBe(true);
    room.setConnected(0, true);
    expect(room.effectiveHost()).toBe(0);
  });

  it('Plätze übernehmen: Bot sofort, Abwesende erst nach der Wartezeit', () => {
    const rooms = new Rooms(15);
    const room = rooms.create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'hard', style: 'blocker' });
    room.start();
    const now = Date.now();
    expect(room.claimable(now).map((c) => [c.pid, c.kind])).toEqual([[2, 'bot']]);
    room.setConnected(1, false);
    expect(room.claimable(now).map((c) => c.pid)).toEqual([2]); // B ist noch in der Schonfrist
    const early = room.claim(1, 'Dritte', now);
    expect('ok' in early && early.ok).toBe(false);
    const later = now + AUTOPILOT_AFTER_MS + 1000;
    expect(room.claimable(later).map((c) => c.pid)).toEqual([1, 2]);
    const handBefore = room.state!.round.players[2].hand.map((c) => c.id);
    const r = room.claim(2, 'Neu', later);
    expect('pid' in r && r.pid).toBe(2);
    expect(room.seats[2].isBot).toBe(false);
    expect(room.state!.players[2]).toMatchObject({ isBot: false, name: 'Neu' });
    expect(room.state!.players[2].bot).toBeUndefined();
    expect(room.state!.round.players[2].hand.map((c) => c.id)).toEqual(handBefore); // gleiche Hand
    expect(room.findByToken('token' in r ? r.token : '')!.pid).toBe(2);
    const taken = room.claim(2, 'Zweiter', later);
    expect('ok' in taken && taken.ok).toBe(false); // jetzt belegt
  });

  it('Spielstand-Kopie: verschlüsselt, manipulationssicher, stellt den Raum wieder her', () => {
    const rooms = new Rooms(16);
    const room = rooms.create();
    const a = room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'random', style: 'random' });
    room.start();
    const sealed = seal(room.toSnapshot());
    expect(sealed).not.toContain(room.seats[0].token!); // Tokens stehen nicht im Klartext
    const mid = Math.floor(sealed.length / 2);
    const forged = sealed.slice(0, mid) + (sealed[mid] === 'A' ? 'B' : 'A') + sealed.slice(mid + 1);
    expect(open(forged)).toBeNull();
    expect(open('quatsch')).toBeNull();
    const snap = open(sealed) as ReturnType<Room['toSnapshot']>;
    const fresh = new Rooms(17); // „neuer Server“
    const restored = fresh.restore(snap);
    expect(restored.code).toBe(room.code);
    expect(restored.state).toEqual(room.state);
    expect(restored.paused).toBe('auto'); // wartet, bis alle wieder verbunden sind
    expect(restored.seats.filter((s) => !s.isBot).every((s) => !s.connected)).toBe(true);
    expect('token' in a && restored.findByToken(a.token)!.pid).toBe(0);
    restored.setConnected(0, true);
    expect(restored.paused).toBe('auto');
    restored.setConnected(1, true);
    expect(restored.paused).toBeNull();
  });

  it('eine Einstellung ändern lässt die anderen unberührt', () => {
    const room = new Rooms(18).create();
    room.addHuman('A');
    expect(room.updateSettings({ rounds: 11, firstTurnOpenAllowed: undefined, speed: undefined }).ok).toBe(true);
    expect(room.settings).toEqual({ rounds: 11, firstTurnOpenAllowed: true, speed: 'normal' });
    room.updateSettings({ rounds: undefined, firstTurnOpenAllowed: false, speed: undefined });
    expect(room.settings).toEqual({ rounds: 11, firstTurnOpenAllowed: false, speed: 'normal' });
    room.updateSettings({ rounds: undefined, firstTurnOpenAllowed: undefined, speed: 'fast' });
    expect(room.settings).toEqual({ rounds: 11, firstTurnOpenAllowed: false, speed: 'fast' });
  });
});
