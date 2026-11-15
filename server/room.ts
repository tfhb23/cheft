/**
 * Raumlogik für den Mehrspieler: Lobby, Start, Aktionen, Bots, Sichten.
 * Netzwerkunabhängig; der Server verbindet Räume mit WebSockets.
 */
import { makeRng } from '../src/engine/cards';
import { Action, applyAction } from '../src/engine/actions';
import { BotProfile, GameState, PlayerInfo, Settings, current, newGame } from '../src/engine/game';
import { GameView, viewFor } from '../src/engine/view';
import { decideAction } from '../src/bot/bot';
import { BotChoice, resolveBots } from '../src/bot/names';

export type Speed = 'normal' | 'fast';

export interface LobbySettings {
  rounds: number;
  firstTurnOpenAllowed: boolean;
  speed: Speed;
}

export interface Seat {
  pid: number;
  name: string;
  isBot: boolean;
  bot?: BotProfile;
  botChoice?: BotChoice;
  token?: string;
  connected: boolean;
  /** Zeitpunkt der Trennung (für Autopilot). */
  disconnectedAt?: number;
}

export type PauseKind = 'manual' | 'auto';

export interface LobbyView {
  code: string;
  hostPid: number;
  started: boolean;
  /** Pause: 'manual' durch einen Spieler, 'auto' wenn niemand verbunden ist oder der Raum wiederhergestellt wurde. */
  paused: PauseKind | null;
  settings: LobbySettings;
  seats: { pid: number; name: string; isBot: boolean; connected: boolean; isHost: boolean; botLabel?: string }[];
}

/** Platz, den ein neu hinzukommender Spieler übernehmen kann. */
export interface ClaimableSeat {
  pid: number;
  name: string;
  kind: 'bot' | 'away';
}

/** Alles, was zum Wiederherstellen eines Raums nötig ist (wird verschlüsselt an die Clients gegeben). */
export interface RoomSnapshot {
  v: 1;
  code: string;
  rev: number;
  hostPid: number;
  settings: LobbySettings;
  seats: Seat[];
  state: GameState | null;
  paused: PauseKind | null;
}

export type Result = { ok: true } | { ok: false; error: string; params?: Record<string, string | number> };
const ok: Result = { ok: true };
const fail = (error: string, params?: Record<string, string | number>): Result => ({ ok: false, error, params });

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function makeCode(rng: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return s;
}

export function makeToken(rng: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 24; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return s;
}

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 3;
/** Nach so vielen Millisekunden ohne Verbindung spielt ein Bot für den Menschen weiter. */
export const AUTOPILOT_AFTER_MS = 45000;

export class Room {
  readonly code: string;
  seats: Seat[] = [];
  hostPid = 0;
  settings: LobbySettings = { rounds: 7, firstTurnOpenAllowed: true, speed: 'normal' };
  state: GameState | null = null;
  paused: PauseKind | null = null;
  /** Zählt jede Änderung; der neueste Spielstand gewinnt beim Wiederherstellen. */
  rev = 0;
  /** Zeitpunkt, an dem der Raum aus einer Kopie wiederhergestellt wurde. */
  restoredAt: number | null = null;
  readonly createdAt = Date.now();
  lastActivity = Date.now();
  private rng: () => number;

  constructor(code: string, rng: () => number = Math.random) {
    this.code = code;
    this.rng = rng;
  }

  get started(): boolean {
    return this.state !== null;
  }

  // ------------------------------------------------------------ Lobby
  addHuman(name: string): { pid: number; token: string } | Result {
    if (this.started) return fail('net.alreadyStarted');
    if (this.seats.length >= MAX_PLAYERS) return fail('net.full');
    const clean = sanitizeName(name) || `Spieler ${this.seats.length + 1}`;
    const unique = this.seats.some((s) => s.name === clean) ? `${clean} ${this.seats.length + 1}` : clean;
    const pid = this.seats.length;
    const token = makeToken(this.rng);
    this.seats.push({ pid, name: unique, isBot: false, token, connected: true });
    this.touch();
    return { pid, token };
  }

  addBot(choice: BotChoice): Result {
    if (this.started) return fail('net.alreadyStarted');
    if (this.seats.length >= MAX_PLAYERS) return fail('net.full');
    const pid = this.seats.length;
    this.seats.push({ pid, name: `Bot ${pid}`, isBot: true, botChoice: choice, connected: true });
    this.touch();
    return ok;
  }

  setBotChoice(pid: number, choice: BotChoice): Result {
    if (this.started) return fail('net.alreadyStarted');
    const seat = this.seats[pid];
    if (!seat || !seat.isBot) return fail('net.noSuchSeat');
    seat.botChoice = choice;
    this.touch();
    return ok;
  }

  removeSeat(pid: number): Result {
    if (this.started) return fail('net.alreadyStarted');
    const idx = this.seats.findIndex((s) => s.pid === pid);
    if (idx < 0) return fail('net.noSuchSeat');
    this.seats.splice(idx, 1);
    this.seats.forEach((s, i) => (s.pid = i));
    if (this.hostPid >= this.seats.length) this.hostPid = 0;
    this.touch();
    return ok;
  }

  findByToken(token: string): Seat | undefined {
    return this.seats.find((s) => !s.isBot && s.token === token);
  }

  setConnected(pid: number, connected: boolean): void {
    const seat = this.seats[pid];
    if (!seat) return;
    seat.connected = connected;
    seat.disconnectedAt = connected ? undefined : Date.now();
    if (this.state && !this.state.finished) {
      // Ist niemand mehr da, wartet das Spiel, statt dass Bots allein weiterspielen.
      if (!connected && !this.paused && !this.humans().some((s) => s.connected)) this.paused = 'auto';
      // Eine automatische Pause endet, sobald alle Menschen wieder da sind.
      if (connected && this.paused === 'auto' && this.humans().every((s) => s.connected)) this.resume();
    }
    this.touch();
  }

  humans(): Seat[] {
    return this.seats.filter((s) => !s.isBot);
  }

  /** Spielleiter: der Einlader, solange er verbunden ist; sonst der erste verbundene Mensch. */
  effectiveHost(): number {
    const host = this.seats[this.hostPid];
    if (host && !host.isBot && host.connected) return this.hostPid;
    const other = this.humans().find((s) => s.connected);
    return other ? other.pid : this.hostPid;
  }

  // ------------------------------------------------------------ Pause
  pause(): Result {
    if (!this.state) return fail('net.notStarted');
    if (this.state.finished) return fail('net.notEnded');
    this.paused = 'manual';
    this.touch();
    return ok;
  }

  resume(): Result {
    if (!this.paused) return ok;
    this.paused = null;
    // Wer währenddessen weg war, bekommt die volle Wartezeit noch einmal.
    const now = Date.now();
    for (const s of this.seats) if (!s.isBot && !s.connected) s.disconnectedAt = now;
    this.touch();
    return ok;
  }

  // ------------------------------------------------------------ Platz übernehmen
  private isClaimable(seat: Seat, now = Date.now()): 'bot' | 'away' | null {
    if (seat.isBot) return 'bot';
    if (seat.connected) return null;
    if (this.paused || now - (seat.disconnectedAt ?? 0) > AUTOPILOT_AFTER_MS) return 'away';
    return null;
  }

  claimable(now = Date.now()): ClaimableSeat[] {
    if (!this.state || this.state.finished) return [];
    const out: ClaimableSeat[] = [];
    for (const seat of this.seats) {
      const kind = this.isClaimable(seat, now);
      if (kind) out.push({ pid: seat.pid, name: seat.name, kind });
    }
    return out;
  }

  /** Ein neuer Spieler übernimmt einen Bot-Platz oder den Platz eines länger abwesenden Spielers. */
  claim(pid: number, name: string, now = Date.now()): { pid: number; token: string } | Result {
    if (!this.state) return fail('net.notStarted');
    if (this.state.finished) return fail('net.alreadyStarted');
    const seat = this.seats[pid];
    if (!seat) return fail('net.noSuchSeat');
    if (!this.isClaimable(seat, now)) return fail('net.seatTaken');
    const clean = sanitizeName(name) || `Spieler ${pid + 1}`;
    const taken = (n: string) => this.seats.some((o) => o.pid !== pid && o.name === n);
    const unique = taken(clean) ? `${clean} ${pid + 1}` : clean;
    const token = makeToken(this.rng);
    seat.isBot = false;
    delete seat.bot;
    delete seat.botChoice;
    seat.token = token;
    seat.name = unique;
    seat.connected = true;
    seat.disconnectedAt = undefined;
    const info = this.state.players[pid];
    info.isBot = false;
    info.name = unique;
    delete info.bot;
    this.touch();
    return { pid, token };
  }

  // ------------------------------------------------------------ Kopie
  toSnapshot(): RoomSnapshot {
    return {
      v: 1,
      code: this.code,
      rev: this.rev,
      hostPid: this.hostPid,
      settings: this.settings,
      seats: this.seats,
      state: this.state,
      paused: this.paused,
    };
  }

  /** Übernimmt eine Kopie. Verbindungszustände bleiben erhalten, wenn `keepConnections` gesetzt ist. */
  applySnapshot(snap: RoomSnapshot, keepConnections: boolean): void {
    const old = this.seats;
    this.seats = snap.seats.map((s) => {
      const prev = keepConnections ? old.find((o) => o.pid === s.pid && o.token === s.token) : undefined;
      if (prev) return { ...s, connected: prev.connected, disconnectedAt: prev.disconnectedAt };
      return s.isBot ? { ...s, connected: true } : { ...s, connected: false, disconnectedAt: Date.now() };
    });
    this.hostPid = snap.hostPid;
    this.settings = snap.settings;
    this.state = snap.state;
    this.rev = snap.rev;
    // Nach dem Wiederherstellen warten alle, bis die Menschen wieder verbunden sind.
    this.paused = this.state && !this.state.finished ? (this.paused ?? snap.paused ?? 'auto') : null;
    if (this.paused === 'auto' && this.humans().every((s) => s.connected)) this.paused = null;
    this.restoredAt = Date.now();
    this.lastActivity = Date.now();
  }

  updateSettings(patch: Partial<LobbySettings>): Result {
    if (this.started) return fail('net.alreadyStarted');
    if (patch.rounds !== undefined && patch.rounds !== 7 && patch.rounds !== 11) return fail('net.badSettings');
    // Nur gesetzte Werte übernehmen: Ein fehlender Wert darf die bestehende Einstellung nicht überschreiben.
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    this.settings = { ...this.settings, ...defined };
    this.touch();
    return ok;
  }

  start(): Result {
    if (this.started) return fail('net.alreadyStarted');
    if (this.seats.length < MIN_PLAYERS) return fail('net.tooFew', { min: MIN_PLAYERS });
    const botChoices: BotChoice[] = this.seats.filter((s) => s.isBot).map((s) => s.botChoice ?? { level: 'random', style: 'random' });
    const resolved = resolveBots(botChoices, this.rng);
    let bi = 0;
    const players: PlayerInfo[] = this.seats.map((s) => {
      if (!s.isBot) return { id: s.pid, name: s.name, isBot: false };
      const b = resolved[bi++];
      s.name = b.name;
      s.bot = { level: b.level, style: b.style };
      return { id: s.pid, name: b.name, isBot: true, bot: s.bot };
    });
    const settings: Settings = { rounds: this.settings.rounds, firstTurnOpenAllowed: this.settings.firstTurnOpenAllowed, direction: 'ccw' };
    this.state = newGame(players, settings, Math.floor(this.rng() * 2147483647));
    this.touch();
    return ok;
  }

  /** Nach Spielende zurück in die Lobby, gleiche Spieler, neue Rollen beim nächsten Start. */
  backToLobby(): Result {
    if (!this.state || !this.state.finished) return fail('net.notFinished');
    this.state = null;
    this.touch();
    return ok;
  }

  // ------------------------------------------------------------ Spiel
  act(pid: number, action: Action): Result {
    if (!this.state) return fail('net.notStarted');
    if (this.paused) return fail('net.paused');
    const res = applyAction(this.state, pid, action);
    if (res.ok) this.touch();
    return res;
  }

  /** Bestätigt die Rundenauswertung; sobald alle bestätigt haben, beginnt die nächste Runde. */
  nextRound(pid: number): Result {
    if (!this.state) return fail('net.notStarted');
    if (this.paused) return fail('net.paused');
    if (!this.state.round.ended || this.state.finished) return fail('net.notEnded');
    const res = applyAction(this.state, pid, { kind: 'ready' });
    if (res.ok) this.touch();
    return res;
  }

  /** Welcher Sitz soll jetzt automatisch spielen? Bots immer, getrennte Menschen nach Wartezeit. */
  autoSeat(now = Date.now()): number | null {
    const s = this.state;
    if (!s || this.paused || s.finished) return null;
    const r = s.round;
    const auto = (pid: number) => {
      const seat = this.seats[pid];
      if (!seat) return false;
      if (seat.isBot) return true;
      return !seat.connected && seat.disconnectedAt !== undefined && now - seat.disconnectedAt > AUTOPILOT_AFTER_MS;
    };
    if (r.ended) {
      const flags = r.nextReady ?? [];
      const pending = this.seats.find((seat) => !flags[seat.pid] && auto(seat.pid));
      return pending ? pending.pid : null;
    }
    if (r.waiting) {
      const pending = this.seats.find((seat) => !r.ready[seat.pid] && auto(seat.pid));
      return pending ? pending.pid : null;
    }
    const pid = current(s);
    return auto(pid) ? pid : null;
  }

  /** Führt einen automatischen Zug aus; liefert die Aktion für Animationen. */
  autoStep(pid: number): Action | null {
    const s = this.state;
    if (!s) return null;
    const confirm = s.round.waiting || s.round.ended;
    const action: Action = confirm ? { kind: 'ready' } : decideAction(s, pid);
    const res = applyAction(s, pid, action);
    if (!res.ok && !confirm) {
      const hand = s.round.players[pid].hand;
      if (hand.length) applyAction(s, pid, { kind: 'discard', cardId: hand[hand.length - 1].id });
    }
    this.touch();
    return action;
  }

  // ------------------------------------------------------------ Sichten
  lobbyView(): LobbyView {
    const host = this.effectiveHost();
    return {
      code: this.code,
      hostPid: host,
      started: this.started,
      paused: this.paused,
      settings: this.settings,
      seats: this.seats.map((s) => ({
        pid: s.pid,
        name: s.name,
        isBot: s.isBot,
        connected: s.connected,
        isHost: s.pid === host,
        botLabel: s.isBot && s.botChoice ? `${s.botChoice.level}/${s.botChoice.style}` : undefined,
      })),
    };
  }

  viewFor(pid: number): GameView | null {
    return this.state ? viewFor(this.state, pid) : null;
  }

  private touch(): void {
    this.lastActivity = Date.now();
    this.rev++;
  }
}

export function sanitizeName(name: string): string {
  return String(name ?? '')
    .replace(/[^\p{L}\p{N} _.\-]/gu, '')
    .trim()
    .slice(0, 12);
}

/** Verwaltung aller Räume. */
export class Rooms {
  private rooms = new Map<string, Room>();
  private rng: () => number;

  constructor(seed?: number) {
    this.rng = seed === undefined ? Math.random : makeRng(seed);
  }

  create(): Room {
    let code = makeCode(this.rng);
    while (this.rooms.has(code)) code = makeCode(this.rng);
    const room = new Room(code, this.rng);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(String(code ?? '').toUpperCase());
  }

  /** Stellt einen Raum aus einer (bereits entschlüsselten) Kopie wieder her, falls der Code frei ist. */
  restore(snap: RoomSnapshot): Room {
    const room = new Room(snap.code, this.rng);
    room.applySnapshot(snap, false);
    this.rooms.set(snap.code, room);
    return room;
  }

  remove(code: string): void {
    this.rooms.delete(code);
  }

  /** Räume ohne Aktivität entfernen (Standard: 6 Stunden). */
  sweep(maxIdleMs = 6 * 3600 * 1000, now = Date.now()): string[] {
    const gone: string[] = [];
    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > maxIdleMs) {
        this.rooms.delete(code);
        gone.push(code);
      }
    }
    return gone;
  }

  get size(): number {
    return this.rooms.size;
  }
}
