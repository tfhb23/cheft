import { describe, it, expect } from 'vitest';
import { Rooms, MIN_PLAYERS } from './room';

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
    // Nach dem Start kein Beitritt mehr
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
    room.seats[0].disconnectedAt = Date.now() - 60000;
    let guard = 0;
    while (!room.state!.finished && guard++ < 30000) {
      if (room.state!.round.ended) {
        expect(room.nextRound(1).ok).toBe(false); // nur der Host
        expect(room.nextRound(0).ok).toBe(true);
        continue;
      }
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
});
