import { describe, it, expect } from 'vitest';
import { Rooms, Room, MIN_PLAYERS, AUTOPILOT_AFTER_MS, claimLockMs, CLAIM_LOCK_MAX_MS, LOBBY_GRACE_MS, SNAPSHOT_TTL_MS, MAX_ROOMS, snapshotUsable, isRoomCode, REQUEST_TTL_MS, MAX_REQUESTS, RoomSnapshot } from './room';
import { seal, open } from './snapshot';

describe('Räume', () => {
  it('erstellen, beitreten, Bots auffüllen, starten', () => {
    const rooms = new Rooms(5);
    const room = rooms.create();
    expect(room.code).toMatch(/^[1-9]\d{2}$/);
    const a = room.addHuman('Tobias');
    expect('pid' in a && a.pid).toBe(0);
    const b = room.addHuman('Tobias');
    expect('pid' in b && b.pid).toBe(1);
    expect(room.seats[1].name).not.toBe(room.seats[0].name);
    let r = room.start();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('net.tooFew');
    expect(room.addBot({ level: 'random', style: 'random' }).ok).toBe(true);
    expect(room.addBot({ level: 'hard', style: 'cunning' }).ok).toBe(true);
    expect(room.addBot({ level: 'easy', style: 'pairs' }).ok).toBe(false); // voll
    r = room.start();
    expect(r.ok).toBe(true);
    expect(room.started).toBe(true);
    expect(room.state!.players.length).toBe(4);
    expect(room.state!.players[3].bot).toEqual({ level: 'hard', style: 'cunning' });
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

  it('wer weg ist: nach 45 s pausiert das Spiel, nach „Weiter“ bestätigt der Autopilot für ihn', () => {
    const room = roundEndRoom(12);
    const no = room.state!.round.no;
    room.nextRound(0);
    room.setConnected(1, false);
    room.setConnected(2, true); // Bot bleibt unberührt
    expect(room.autoSeat()).toBe(2); // zuerst der Bot
    room.autoStep(2);
    expect(room.autoSeat()).toBeNull(); // B ist noch in der Schonfrist: kein Autopilot
    expect(room.checkAwayPause()).toBe(false);
    const late = Date.now() + AUTOPILOT_AFTER_MS + 1000;
    expect(room.checkAwayPause(late)).toBe(true);
    expect(room.paused).toBe('auto');
    expect(room.autoSeat()).toBeNull(); // Pause: auch kein Autopilot
    room.requestResume(0); // A ist der einzige aktive Mensch
    expect(room.paused).toBeNull();
    expect(room.seats[1].autopilot).toBe(true);
    expect(room.checkAwayPause(late + 60000)).toBe(false); // keine zweite Pause für dieselbe Abwesenheit
    expect(room.autoSeat()).toBe(1);
    room.autoStep(1);
    expect(room.state!.round.no).toBe(no + 1);
  });

  it('Pause stoppt Aktionen und Autopilot; alle aktiven Spieler müssen sie beenden', () => {
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
    // A tippt auf Weiter: B fehlt noch
    expect(room.requestResume(0).ok).toBe(true);
    expect(room.paused).toBe('manual');
    expect(room.lobbyView().resumed).toEqual([0]);
    expect(room.requestResume(1).ok).toBe(true);
    expect(room.paused).toBeNull();
    expect(room.lobbyView().resumed).toEqual([]);
    // Fällt der Unbestätigte weg, blockiert er die anderen nicht
    room.pause();
    room.requestResume(0);
    expect(room.paused).toBe('manual');
    room.setConnected(1, false);
    expect(room.paused).toBeNull();
  });

  it('Alle weg: das Spiel pausiert von selbst, auch bei der Endauswertung; manuelle Pause bleibt manuell', () => {
    const rooms = new Rooms(14);
    const room = rooms.create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'random', style: 'random' });
    room.start();
    // Manuelle Pause, dann gehen beide (Handys gesperrt): bleibt manuell, jeder muss danach bestätigen
    room.pause();
    room.setConnected(0, false);
    room.setConnected(1, false);
    expect(room.paused).toBe('manual');
    room.setConnected(0, true);
    room.setConnected(1, true);
    expect(room.paused).toBe('manual');
    room.requestResume(0);
    expect(room.paused).toBe('manual');
    room.requestResume(1);
    expect(room.paused).toBeNull();
    // Automatische Pause endet von selbst, wenn alle wieder da sind
    room.setConnected(0, false);
    room.setConnected(1, false);
    expect(room.paused).toBe('auto');
    expect(room.autoSeat()).toBeNull(); // Bots spielen nicht allein weiter
    room.setConnected(0, true);
    expect(room.paused).toBe('auto');
    room.setConnected(1, true);
    expect(room.paused).toBeNull();
  });

  it('Auch nach dem letzten Spiel bleibt die Auswertung stehen, wenn niemand mehr da ist', () => {
    const room = new Rooms(15).create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'random', style: 'random' });
    room.updateSettings({ rounds: 3 });
    room.start();
    room.setConnected(0, false);
    room.setConnected(1, false);
    room.resume();
    for (const pid of [0, 1]) room.seats[pid].disconnectedAt = Date.now() - 60000;
    let guard = 0;
    while (!(room.state!.finished && room.state!.round.ended) && guard++ < 20000) room.autoStep(room.autoSeat()!);
    // Beide sind weiter weg: erst jetzt fällt die Verbindung weg
    room.setConnected(0, true);
    room.setConnected(0, false);
    expect(room.paused).toBe('auto');
    expect(room.autoSeat()).toBeNull(); // niemand bestätigt für die Abwesenden: die Punkteübersicht bleibt
    expect(room.started).toBe(true);
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

  it('Plätze übernehmen: Bot sofort, Abwesende erst nach Pause, „Weiter“ und Sperrzeit', () => {
    const rooms = new Rooms(15);
    const room = rooms.create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'hard', style: 'cunning' });
    room.start();
    const now = Date.now();
    expect(room.claimable(now).map((c) => [c.pid, c.kind])).toEqual([[2, 'bot']]);
    room.setConnected(1, false);
    // Solange B nur kurz weg ist oder die anderen noch nicht „Weiter“ gesagt haben, bleibt sein Platz für Fremde unsichtbar
    expect(room.claimable(now + 5000).map((c) => c.pid)).toEqual([2]);
    expect(room.checkAwayPause(now + AUTOPILOT_AFTER_MS + 1000)).toBe(true);
    expect(room.claimable(now + AUTOPILOT_AFTER_MS + 2000).map((c) => c.pid)).toEqual([2]); // auch in der Pause nicht
    const early = room.claim(1, 'Dritte', now + AUTOPILOT_AFTER_MS + 2000);
    expect('ok' in early && early.ok).toBe(false);
    room.requestResume(0);
    const since = room.seats[1].autopilotSince!;
    const lock = claimLockMs(room.roundsLeft());
    expect(lock).toBe(CLAIM_LOCK_MAX_MS); // 7 Runden: gedeckelt auf 10 Minuten
    expect(room.claimable(since + lock - 1000).map((c) => c.pid)).toEqual([2]);
    const later = since + lock + 1000;
    expect(room.claimable(later).map((c) => [c.pid, c.kind])).toEqual([[1, 'away'], [2, 'bot']]);
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
    expect(room.updateSettings({ rounds: 9, firstTurnOpenAllowed: undefined, speed: undefined }).ok).toBe(true);
    expect(room.settings).toEqual({ rounds: 9, firstTurnOpenAllowed: false, speed: 'normal', seating: 'random', peekDiscards: true, sortedDeal: true });
    room.updateSettings({ rounds: undefined, firstTurnOpenAllowed: true, speed: undefined });
    expect(room.settings).toEqual({ rounds: 9, firstTurnOpenAllowed: true, speed: 'normal', seating: 'random', peekDiscards: true, sortedDeal: true });
    room.updateSettings({ rounds: undefined, firstTurnOpenAllowed: undefined, speed: 'fast', seating: 'random', peekDiscards: false, sortedDeal: true });
    expect(room.settings).toEqual({ rounds: 9, firstTurnOpenAllowed: true, speed: 'fast', seating: 'random', peekDiscards: false, sortedDeal: true });
    expect(room.updateSettings({ rounds: 11 }).ok).toBe(false); // nur 3, 5, 7, 9
  });

  it('Sitzordnung: umsortieren, auslosen, nur vor dem Start', () => {
    const room = new Rooms(21).create();
    room.addHuman('Anna');
    room.addHuman('Ben');
    room.addBot({ level: 'random', style: 'random' });
    const tokens = room.seats.map((x) => x.token);
    // Bot nach vorn, Anna rutscht auf Platz 1; Gastgeber (Anna) wandert mit
    const r = room.reorder([2, 0, 1]);
    expect('map' in r && r.map).toEqual([1, 2, 0]);
    expect(room.seats.map((x) => x.name)).toEqual(['Bot 2', 'Anna', 'Ben']);
    expect(room.seats.map((x) => x.pid)).toEqual([0, 1, 2]);
    expect(room.seats[1].token).toBe(tokens[0]);
    expect(room.hostPid).toBe(1);
    expect(room.findByToken(tokens[1]!)!.pid).toBe(2);
    // Ungültige Eingaben
    expect('ok' in room.reorder([0, 0, 1])).toBe(true);
    expect(room.reorder([0, 1]).hasOwnProperty('map')).toBe(false);
    // Auslosen behält alle Spieler und ordnet Plätze passend zu
    const names = room.seats.map((x) => x.name).sort();
    const map = room.shuffleSeats();
    expect(room.seats.map((x) => x.name).sort()).toEqual(names);
    expect(room.seats.every((x, i) => x.pid === i)).toBe(true);
    expect(map.slice().sort()).toEqual([0, 1, 2]);
    expect(room.seats[room.hostPid].name).toBe('Anna');
    room.start();
    const late = room.reorder([0, 1, 2]);
    expect('ok' in late && late.ok).toBe(false);
  });

  it('Startspieler wird ausgelost', () => {
    const starters = new Set<number>();
    for (let seed = 1; seed <= 24; seed++) {
      const room = new Rooms(seed).create();
      room.addHuman('A');
      room.addHuman('B');
      room.addBot({ level: 'random', style: 'random' });
      room.start();
      starters.add(room.state!.round.starter);
    }
    expect(starters.size).toBeGreaterThan(1);
  });

  it('nach dem letzten Spiel geht es erst in die Lobby, wenn alle bestätigt haben', () => {
    const room = new Rooms(22).create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'random', style: 'random' });
    room.updateSettings({ rounds: 3 });
    room.start();
    room.setConnected(0, false);
    room.setConnected(1, false);
    room.resume();
    for (const pid of [0, 1]) room.seats[pid].disconnectedAt = Date.now() - 60000;
    let guard = 0;
    while (!(room.state!.finished && room.state!.round.ended) && guard++ < 20000) room.autoStep(room.autoSeat()!);
    expect(room.state!.finished).toBe(true);
    room.setConnected(0, true);
    room.setConnected(1, true);
    expect(room.nextRound(0).ok).toBe(true);
    expect(room.started).toBe(true); // B und der Bot fehlen noch: Auswertung bleibt für alle stehen
    expect(room.nextRound(1).ok).toBe(true);
    expect(room.started).toBe(true); // der Bot bestätigt von selbst
    expect(room.autoSeat()).toBe(2);
    room.autoStep(2);
    expect(room.started).toBe(false); // alle bestätigt: zurück in die Lobby
    expect(room.seats.length).toBe(3);
  });

  it('Abwürfe werden mit Spieler protokolliert (für den Rückblick)', () => {
    const room = new Rooms(23).create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'random', style: 'random' });
    room.start();
    room.setConnected(0, false);
    room.setConnected(1, false);
    room.resume();
    for (const pid of [0, 1]) room.seats[pid].disconnectedAt = Date.now() - 60000;
    for (let i = 0; i < 40 && !room.state!.round.ended; i++) room.autoStep(room.autoSeat()!);
    const log = room.state!.round.discardLog!;
    expect(log.length).toBeGreaterThan(3);
    expect(log.length).toBeLessThanOrEqual(8);
    expect(log.every((e) => e.player >= 0 && e.player < 3 && e.card.id >= 0)).toBe(true);
  });

  it('Spieler können sich umbenennen, auch der Gastgeber und mitten im Spiel', () => {
    const room = new Rooms(31).create();
    room.addHuman('Anna');
    room.addHuman('Ben');
    room.addBot({ level: 'random', style: 'random' });
    expect(room.rename(0, '  Annika  ').ok).toBe(true);
    expect(room.seats[0].name).toBe('Annika');
    expect(room.hostPid).toBe(0);
    const clash = room.rename(1, 'Annika'); // gleicher Name: bekommt eine Nummer
    expect(clash.ok).toBe(true);
    expect(room.seats[1].name).toBe('Annika 2');
    expect(room.rename(1, '###').ok).toBe(false); // nach dem Säubern leer
    expect(room.rename(2, 'Neu').ok).toBe(false); // Bots nicht
    room.start();
    expect(room.rename(0, 'Anna').ok).toBe(true);
    expect(room.state!.players[0].name).toBe('Anna');
    expect(room.lobbyView().seats[0].name).toBe('Anna');
  });

  it('Kartenrückseiten: pro Spieler gespeichert, geprüft, umstellbar; Bots haben keine', () => {
    const room = new Rooms(5).create();
    room.addHuman('A', 'mond');
    room.addHuman('B', '<script>');
    room.addBot({ level: 'easy', style: 'random' });
    expect(room.seats.map((s) => s.back)).toEqual(['mond', undefined, undefined]);
    expect(room.setBack(1, 'teppich').ok).toBe(true);
    expect(room.setBack(2, 'teppich').ok).toBe(false); // Bots haben keine eigene Rückseite
    expect(room.lobbyView().seats.map((s) => s.back)).toEqual(['mond', 'teppich', undefined]);
  });

  it('Ohne gewählten Namen bekommt man bei Kollision einen anderen freien Ersatznamen statt einer Nummer', () => {
    const room = new Rooms(41).create();
    room.addHuman('Bourne', undefined, true);
    for (let i = 0; i < 3; i++) room.addHuman('Bourne', undefined, true);
    const names = room.seats.map((x) => x.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.some((n) => /\d$/.test(n) && n.startsWith('Bourne'))).toBe(false);
    const manual = new Rooms(42).create();
    manual.addHuman('Anna');
    manual.addHuman('Anna'); // selbst gewählt: bekommt weiter die Nummer
    expect(manual.seats[1].name).toBe('Anna 2');
  });
});

describe('Raumleben: Gastgeber, Karenz, Kopie', () => {
  it('der Gastgeber bleibt Gastgeber, wenn ein Sitz vor ihm entfernt oder die Reihenfolge geändert wird', () => {
    const room = new Rooms(50).create();
    room.addHuman('A');
    room.addHuman('B');
    room.addHuman('C');
    room.hostPid = 2; // C ist Gastgeber
    expect(room.seats[room.hostPid].name).toBe('C');
    room.removeSeat(0);
    expect(room.seats[room.hostPid].name).toBe('C');
    expect(room.effectiveHost()).toBe(room.hostPid);
    room.shuffleSeats();
    expect(room.seats[room.hostPid].name).toBe('C');
  });

  it('fehlt der Gastgeber, vertritt ihn der am längsten anwesende Mensch (nie ein Bot) und gibt zurück, wenn er wieder da ist', () => {
    const room = new Rooms(51).create();
    room.addHuman('Host');
    room.addBot({ level: 'random', style: 'random' });
    room.addHuman('Zweiter');
    room.addHuman('Dritter');
    room.setConnected(0, false);
    expect(room.seats[room.effectiveHost()].name).toBe('Zweiter');
    room.setConnected(2, false);
    expect(room.seats[room.effectiveHost()].name).toBe('Dritter');
    expect(room.lobbyView().ownerPid).toBe(0);
    room.setConnected(0, true);
    expect(room.effectiveHost()).toBe(0);
    // Die Reihenfolge richtet sich nach dem Beitritt, nicht nach der (ausgelosten) Sitzordnung
    room.setConnected(0, false);
    room.setConnected(2, true);
    room.shuffleSeats();
    expect(room.seats[room.effectiveHost()].name).toBe('Zweiter');
  });

  it('Lobby: ein getrennter Sitz bleibt die Karenzzeit reserviert, dann wird er frei und die Rolle geht dauerhaft weiter', () => {
    const room = new Rooms(52).create();
    const a = room.addHuman('Host');
    room.addHuman('Zweiter');
    room.setConnected(0, false);
    const t0 = room.seats[0].disconnectedAt!;
    expect(room.staleLobbySeats(t0 + LOBBY_GRACE_MS - 1000)).toEqual([]);
    expect(room.staleLobbySeats(t0 + LOBBY_GRACE_MS + 1000)).toEqual([0]);
    // Rückkehr mit dem Token innerhalb der Karenz: gleicher Platz, wieder Gastgeber
    expect('token' in a && room.findByToken(a.token)!.pid).toBe(0);
    room.setConnected(0, true);
    expect(room.staleLobbySeats(t0 + LOBBY_GRACE_MS + 1000)).toEqual([]);
    expect(room.effectiveHost()).toBe(0);
    // Läuft die Karenz ab, wird der Sitz entfernt und der Zweite ist dauerhaft Gastgeber
    room.setConnected(0, false);
    room.removeSeat(0);
    room.setConnected(0, true);
    expect(room.seats.map((s) => s.name)).toEqual(['Zweiter']);
    expect(room.hostPid).toBe(0);
    expect(room.lobbyView().ownerPid).toBe(0);
    // Im laufenden Spiel gibt es keine Lobby-Karenz
    const g = new Rooms(53).create();
    g.addHuman('A');
    g.addHuman('B');
    g.addBot({ level: 'random', style: 'random' });
    g.start();
    g.setConnected(0, false);
    expect(g.staleLobbySeats(Date.now() + 10 * LOBBY_GRACE_MS)).toEqual([]);
  });

  it('wer einen Platz übernimmt, kommt hinten in die Reihenfolge und erbt die Gastgeber-Rolle nicht', () => {
    const room = new Rooms(54).create();
    room.addHuman('Host');
    room.addHuman('B');
    room.addBot({ level: 'random', style: 'random' });
    room.start();
    const sidOfBot = room.seats[2].sid;
    const r = room.claim(2, 'Neu');
    expect('pid' in r).toBe(true);
    expect(room.seats[2].sid).toBeGreaterThan(sidOfBot);
    expect(room.hostPid).toBe(0);
    // Übernimmt jemand den Gastgeber-Sitz, geht die Rolle an den am längsten anwesenden Menschen
    room.setConnected(0, false);
    expect(room.checkAwayPause(Date.now() + AUTOPILOT_AFTER_MS + 1000)).toBe(true);
    room.requestResume(1);
    room.requestResume(2); // auch „Neu“ (hat vorher den Bot-Platz übernommen) muss bestätigen
    const since = room.seats[0].autopilotSince!;
    expect('pid' in room.claim(0, 'Fremd', since + CLAIM_LOCK_MAX_MS + 1000)).toBe(true);
    expect(room.seats[room.hostPid].name).toBe('B');
  });

  it('Kopie: nur laufende, nicht zu alte Spiele sind brauchbar', () => {
    const room = new Rooms(55).create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'random', style: 'random' });
    const lobbySnap = room.toSnapshot();
    expect(snapshotUsable(lobbySnap)).toBe(false); // Lobby: nichts wiederherzustellen
    room.start();
    const snap = room.toSnapshot();
    expect(snapshotUsable(snap)).toBe(true);
    expect(snapshotUsable(snap, snap.activeAt! + SNAPSHOT_TTL_MS - 1000)).toBe(true);
    expect(snapshotUsable(snap, snap.activeAt! + SNAPSHOT_TTL_MS + 1000)).toBe(false); // nach 72 Stunden hinfällig
    const old: RoomSnapshot = { ...snap, activeAt: undefined }; // Kopie aus der Zeit vor dem Update
    expect(snapshotUsable(old)).toBe(true);
    const finished = { ...snap, state: { ...snap.state!, finished: true } };
    expect(snapshotUsable(finished)).toBe(false); // Endauswertung zählt nicht als aktives Spiel
    expect(snapshotUsable(null)).toBe(false);
  });

  it('die 72 Stunden zählen ab dem letzten Spielzug, nicht ab Verbindungen', () => {
    const room = new Rooms(56).create();
    room.addHuman('A');
    room.addBot({ level: 'random', style: 'random' });
    room.addBot({ level: 'random', style: 'random' });
    room.start();
    room.activeAt = 1000;
    room.setConnected(0, false);
    room.setConnected(0, true);
    expect(room.activeAt).toBe(1000);
    const pid = room.autoSeat()!;
    room.autoStep(pid);
    expect(room.activeAt).toBeGreaterThan(1000);
  });

  it('eine ältere Kopie ohne feste Sitz-Kennungen lässt sich laden', () => {
    const room = new Rooms(57).create();
    room.addHuman('A');
    room.addHuman('B');
    room.addBot({ level: 'random', style: 'random' });
    room.start();
    const snap = JSON.parse(JSON.stringify(room.toSnapshot())) as RoomSnapshot;
    for (const s of snap.seats) delete (s as Partial<typeof s>).sid;
    delete snap.hostSid;
    delete snap.nextSid;
    delete snap.activeAt;
    snap.hostPid = 1;
    const restored = new Rooms(58).restore(snap);
    expect(restored.seats.map((s) => s.sid)).toEqual([0, 1, 2]);
    expect(restored.hostPid).toBe(1);
    const next = restored.claim(2, 'Neu');
    expect('pid' in next).toBe(true);
    expect(restored.seats[2].sid).toBe(3);
  });

  it('Raum mit Wunschcode eröffnen: nur gültige freie Codes, mit Obergrenze', () => {
    const rooms = new Rooms(59);
    expect(isRoomCode('232')).toBe(true);
    expect(isRoomCode('0232')).toBe(false);
    expect(isRoomCode('12')).toBe(false);
    expect(isRoomCode('abc')).toBe(false);
    const a = rooms.open('232');
    expect(a?.code).toBe('232');
    expect(rooms.get('232')).toBe(a);
    expect(rooms.open('232')).toBeNull(); // gibt es schon
    expect(rooms.open('x')).toBeNull();
    const many = new Rooms(60);
    let opened = 0;
    for (let n = 1000; opened < MAX_ROOMS; n++) if (many.open(String(n))) opened++;
    expect(many.full).toBe(true);
    expect(many.open('555')).toBeNull();
  });
});

describe('Verbindungsverlust im Spiel: Pause, Autopilot, Sperrzeit', () => {
  function game(seed: number): Room {
    const room = new Rooms(seed).create();
    room.addHuman('Max');
    room.addHuman('Anna');
    room.addBot({ level: 'random', style: 'random' });
    room.start();
    return room;
  }
  const LATE = () => Date.now() + AUTOPILOT_AFTER_MS + 1000;

  it('die Sperrzeit richtet sich nach den verbleibenden Runden: 2 Minuten je Runde, mindestens 3, höchstens 10', () => {
    const min = 60 * 1000;
    expect([1, 2, 3, 4, 5, 9].map((n) => claimLockMs(n) / min)).toEqual([3, 4, 6, 8, 10, 10]);
    const room = game(60);
    room.updateSettings({ rounds: 7 });
    expect(room.roundsLeft()).toBe(room.state!.settings.rounds - room.state!.history.length);
    room.state!.settings.rounds = 3;
    room.state!.history.push({} as never, {} as never);
    expect(room.roundsLeft()).toBe(1);
    expect(claimLockMs(room.roundsLeft())).toBe(3 * min);
  });

  it('kurze Aussetzer lösen keine Pause aus; wer in der Schonfrist zurückkommt, merkt nichts', () => {
    const room = game(61);
    room.setConnected(0, false);
    expect(room.checkAwayPause(Date.now() + 20000)).toBe(false);
    room.setConnected(0, true);
    expect(room.checkAwayPause(LATE())).toBe(false);
    expect(room.paused).toBeNull();
    // Wackelige Verbindung: jede Rückkehr setzt den Zähler zurück
    for (let i = 0; i < 5; i++) {
      room.setConnected(0, false);
      expect(room.checkAwayPause(Date.now() + 30000)).toBe(false);
      room.setConnected(0, true);
    }
    expect(room.paused).toBeNull();
  });

  it('kommt der Abwesende zurück, solange die Pause läuft, geht es ohne Bestätigung weiter', () => {
    const room = game(62);
    room.setConnected(0, false);
    expect(room.checkAwayPause(LATE())).toBe(true);
    expect(room.paused).toBe('auto');
    room.setConnected(0, true);
    expect(room.paused).toBeNull();
    expect(room.seats[0].autopilot).toBeUndefined();
  });

  it('kommt er später zurück, übernimmt er seinen Platz wieder und der Autopilot hört auf', () => {
    const room = game(63);
    room.setConnected(0, false);
    room.checkAwayPause(LATE());
    room.requestResume(1);
    expect(room.seats[0].autopilot).toBe(true);
    expect(room.lobbyView().seats[0].autopilot).toBe(true);
    const token = room.seats[0].token!;
    expect(room.findByToken(token)!.pid).toBe(0);
    room.setConnected(0, true);
    expect(room.seats[0].autopilot).toBeUndefined();
    expect(room.lobbyView().seats[0].autopilot).toBeUndefined();
  });

  it('fällt ein weiterer Mensch aus, gibt es eine neue Pause; der schon vertretene bleibt außen vor', () => {
    const room = new Rooms(64).create();
    room.addHuman('A');
    room.addHuman('B');
    room.addHuman('C');
    room.addBot({ level: 'random', style: 'random' });
    room.start();
    room.setConnected(1, false);
    room.checkAwayPause(LATE());
    room.requestResume(0);
    room.requestResume(2);
    expect(room.paused).toBeNull();
    expect(room.seats[1].autopilot).toBe(true);
    room.setConnected(2, false);
    expect(room.checkAwayPause(Date.now() + 5000)).toBe(false);
    expect(room.checkAwayPause(LATE() + 100000)).toBe(true);
    expect(room.lobbyView().seats.filter((s) => !s.connected && !s.autopilot).map((s) => s.pid)).toEqual([2]);
  });

  it('der Spielleiter beendet die Pause für alle, andere nicht', () => {
    const room = game(65);
    room.setConnected(0, false);
    room.checkAwayPause(LATE());
    // Max ist Gastgeber, aber weg: Anna leitet vorübergehend
    expect(room.effectiveHost()).toBe(1);
    const asBot = room.forceResume(2);
    expect('error' in asBot && asBot.error).toBe('net.hostOnly');
    expect(room.paused).toBe('auto');
    expect(room.forceResume(1).ok).toBe(true);
    expect(room.paused).toBeNull();
    expect(room.seats[0].autopilot).toBe(true);
    // „Bereit“ ist nur die eigene Stimme: bei zwei Menschen reicht eine allein nicht
    const two = game(66);
    two.pause();
    two.requestResume(0);
    expect(two.paused).toBe('manual');
    expect(two.forceResume(0).ok).toBe(true);
    expect(two.paused).toBeNull();
  });

  it('manuelle Pause: ein erst kurz Abwesender wird nicht sofort vom Autopilot vertreten', () => {
    const room = game(67);
    room.pause();
    room.setConnected(0, false);
    room.requestResume(1);
    expect(room.paused).toBeNull();
    expect(room.seats[0].autopilot).toBeUndefined();
    expect(room.autoSeat()).not.toBe(0);
  });

  it('nach einer Wiederherstellung wartet alles; der Autopilot setzt erst nach „Weiter“ ein', () => {
    const room = game(68);
    room.setConnected(0, false);
    room.checkAwayPause(LATE());
    room.requestResume(1);
    expect(room.seats[0].autopilot).toBe(true);
    const snap = JSON.parse(JSON.stringify(room.toSnapshot())) as RoomSnapshot;
    const restored = new Rooms(69).restore(snap);
    expect(restored.seats.every((s) => !s.autopilot)).toBe(true);
    expect(restored.paused).toBe('auto');
    expect(restored.claimable()).toEqual([expect.objectContaining({ kind: 'bot' })]);
  });

  it('nach dem letzten Spiel gibt es keine Pause mehr; wer die Endauswertung nicht bestätigt, wird nach der Wartezeit vertreten', () => {
    const room = game(70);
    room.state!.finished = true;
    room.state!.round.ended = true;
    room.setConnected(0, false);
    expect(room.checkAwayPause(LATE())).toBe(false);
    expect(room.autoSeat()).toBe(2); // der Bot bestätigt von selbst
    room.seats[0].disconnectedAt = Date.now() - AUTOPILOT_AFTER_MS - 1000;
    room.state!.round.nextReady = [false, true, true];
    expect(room.autoSeat()).toBe(0);
  });
});

describe('Spielleitung: Übergabe, Entfernen, Anfragen', () => {
  function game(seed: number, humans = 3): Room {
    const room = new Rooms(seed).create();
    for (const n of ['Tobias', 'Max', 'Anna'].slice(0, humans)) room.addHuman(n);
    if (humans < 4) room.addBot({ level: 'random', style: 'random' });
    room.start();
    return room;
  }
  const pidOf = (room: Room, name: string) => room.seats.find((s) => s.name === name)!.pid;

  it('Übergabe: nur der Gastgeber, nur an einen verbundenen Menschen; danach ist es dauerhaft', () => {
    const room = game(80);
    const host = room.hostPid;
    const max = pidOf(room, 'Max');
    expect(room.handover(max, host).ok).toBe(false); // wer nicht Gastgeber ist, kann nicht übergeben
    expect(room.handover(host, host).ok).toBe(false);
    const bot = room.seats.find((s) => s.isBot)!.pid;
    expect(room.handover(host, bot).ok).toBe(false);
    room.setConnected(pidOf(room, 'Anna'), false);
    expect(room.handover(host, pidOf(room, 'Anna')).ok).toBe(false); // Getrennte nicht
    expect(room.handover(host, max).ok).toBe(true);
    expect(room.hostPid).toBe(max);
    room.setConnected(host, false);
    room.setConnected(host, true);
    expect(room.effectiveHost()).toBe(max); // der alte Gastgeber bekommt die Rolle nicht automatisch zurück
    expect(room.lobbyView().ownerPid).toBe(max);
  });

  it('Entfernen: der Platz wird ein Bot „Botname (Max)“, gleiche Hand, Token ungültig', () => {
    const room = game(81);
    const host = room.effectiveHost();
    const max = pidOf(room, 'Max');
    const token = room.seats[max].token!;
    const hand = room.state!.round.players[max].hand.map((c) => c.id);
    expect(room.removePlayer(host, max).ok).toBe(true);
    const seat = room.seats[max];
    expect(seat.isBot).toBe(true);
    expect(seat.name).toMatch(/ \(Max\)$/);
    expect(room.state!.players[max]).toMatchObject({ isBot: true, name: seat.name });
    expect(room.state!.round.players[max].hand.map((c) => c.id)).toEqual(hand);
    expect(room.findByToken(token)).toBeUndefined();
    expect(seat.token).toBeUndefined();
    // Der Bot-Platz ist sofort übernehmbar (mit Zustimmung); der Zusatz verschwindet beim Übernehmen
    expect(room.claimable().some((c) => c.pid === max && c.kind === 'bot')).toBe(true);
    const r = room.claim(max, 'Neu');
    expect('pid' in r).toBe(true);
    expect(room.seats[max].name).toBe('Neu');
  });

  it('Entfernen: nicht sich selbst, nicht den Gastgeber (durch einen Vertreter), nicht ohne Spielleiter, keine Bots', () => {
    const room = game(82);
    const host = room.hostPid;
    const max = pidOf(room, 'Max');
    const anna = pidOf(room, 'Anna');
    expect(room.removePlayer(host, host).ok).toBe(false);
    expect(room.removePlayer(max, anna).ok).toBe(false); // Max ist nicht Spielleiter
    expect(room.removePlayer(host, room.seats.find((s) => s.isBot)!.pid).ok).toBe(false);
    // Gastgeber weg: Max vertritt ihn und darf ihn nicht entfernen, wohl aber Anna
    room.setConnected(host, false);
    expect(room.effectiveHost()).toBe(max);
    expect(room.removePlayer(max, host).ok).toBe(false);
    expect(room.removePlayer(max, anna).ok).toBe(true);
    expect(room.seats[host].isBot).toBe(false);
  });

  it('Wer fehlte und entfernt wird, hält die Pause nicht mehr auf', () => {
    const room = game(83);
    const host = room.hostPid;
    const max = pidOf(room, 'Max');
    room.setConnected(max, false);
    expect(room.checkAwayPause(Date.now() + AUTOPILOT_AFTER_MS + 1000)).toBe(true);
    expect(room.paused).toBe('auto');
    expect(room.removePlayer(host, max).ok).toBe(true);
    expect(room.paused).toBeNull(); // der Grund der Pause ist weg: alle übrigen Menschen sind verbunden, es geht ohne Bestätigung weiter
  });

  it('Anfragen: nur auf übernehmbare Plätze, eine je Platz, höchstens drei, laufen nach einer Minute ab', () => {
    const room = game(84, 2);
    const bot = room.seats.find((s) => s.isBot)!.pid;
    const now = Date.now();
    const human = room.seats.find((s) => !s.isBot)!.pid;
    const bad = room.addRequest(human, 'Fremd', now);
    expect('ok' in bad && bad.ok).toBe(false); // Menschen sind nicht übernehmbar
    const req = room.addRequest(bot, 'Fremd', now);
    expect('id' in req && req.seatName).toBe(room.seats[bot].name);
    expect(room.lobbyView().requests).toEqual([{ id: (req as { id: number }).id, name: 'Fremd', seatName: room.seats[bot].name }]);
    const dup = room.addRequest(bot, 'Zweiter', now);
    expect('ok' in dup && dup.ok).toBe(false);
    expect(room.expiredRequests(now + REQUEST_TTL_MS - 1000)).toEqual([]);
    expect(room.expiredRequests(now + REQUEST_TTL_MS + 1000)).toHaveLength(1);
    expect(room.takeRequest((req as { id: number }).id)).toBeDefined();
    expect(room.requests).toEqual([]);
    expect(MAX_REQUESTS).toBe(3);
  });
});
