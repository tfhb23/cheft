/**
 * Raumlogik für den Mehrspieler: Lobby, Start, Aktionen, Bots, Sichten.
 * Netzwerkunabhängig; der Server verbindet Räume mit WebSockets.
 */
import { makeRng } from '../src/engine/cards';
import { Action, applyAction } from '../src/engine/actions';
import { BotProfile, GameState, PlayerInfo, Settings, current, newGame } from '../src/engine/game';
import { GameView, viewFor } from '../src/engine/view';
import { decideAction } from '../src/bot/bot';
import { BotChoice, resolveBots, sanitizeChoice } from '../src/bot/names';
import { FORGOTTEN_NAMES } from '../src/ui/names';

export type Speed = 'normal' | 'fast';

export type Seating = 'manual' | 'random';

export const ROUND_OPTIONS = [3, 5, 7, 9];

export interface LobbySettings {
  rounds: number;
  firstTurnOpenAllowed: boolean;
  speed: Speed;
  /** Sitzordnung: wie vom Gastgeber festgelegt oder beim Start ausgelost. */
  seating: Seating;
  /** Rückblick auf die letzten Abwürfe erlaubt. */
  peekDiscards: boolean;
  /** Karten zu Rundenbeginn nach Farbe sortiert austeilen. */
  sortedDeal: boolean;
}

export interface Seat {
  pid: number;
  name: string;
  isBot: boolean;
  bot?: BotProfile;
  botChoice?: BotChoice;
  token?: string;
  /** Kennung der Kartenrückseite, die dieser Spieler gewählt hat (nur Anzeige; Bots haben keine). */
  back?: string;
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
  /** Wer die Pause schon mit „Weiter“ bestätigt hat. */
  resumed: number[];
  settings: LobbySettings;
  seats: { pid: number; name: string; isBot: boolean; connected: boolean; isHost: boolean; botLabel?: string; back?: string }[];
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

/** Raumcode: nur Ziffern, ohne führende Null, standardmäßig dreistellig (z. B. 232). */
export function makeCode(rng: () => number = Math.random, digits = 3): string {
  let s = String(1 + Math.floor(rng() * 9));
  for (let i = 1; i < digits; i++) s += String(Math.floor(rng() * 10));
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
  settings: LobbySettings = { rounds: 7, firstTurnOpenAllowed: false, speed: 'normal', seating: 'random', peekDiscards: true, sortedDeal: true };
  state: GameState | null = null;
  paused: PauseKind | null = null;
  /** Wer die Pause beenden will; es geht erst weiter, wenn alle aktiven Menschen bestätigt haben. */
  private resumeVotes = new Set<number>();
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
  /**
   * Hat jemand keinen Namen gewählt (auto), ist der vorgeschlagene Name aber schon vergeben, bekommt er einen anderen
   * freien Ersatznamen statt einer Nummer. Selbst gewählte Namen behalten die Nummer („Anna 2“).
   */
  private nameFor(clean: string, auto: boolean, taken: (n: string) => boolean, number: number): string {
    if (!taken(clean)) return clean;
    if (auto) {
      const free = FORGOTTEN_NAMES.filter((n) => !taken(n));
      if (free.length) return free[Math.floor(this.rng() * free.length)];
    }
    return `${clean} ${number}`;
  }

  addHuman(name: string, back?: string, auto = false): { pid: number; token: string } | Result {
    if (this.started) return fail('net.alreadyStarted');
    if (this.seats.length >= MAX_PLAYERS) return fail('net.full');
    const clean = sanitizeName(name) || `Spieler ${this.seats.length + 1}`;
    const unique = this.nameFor(clean, auto, (n) => this.seats.some((s) => s.name === n), this.seats.length + 1);
    const pid = this.seats.length;
    const token = makeToken(this.rng);
    this.seats.push({ pid, name: unique, isBot: false, token, back: sanitizeBack(back), connected: true });
    this.touch();
    return { pid, token };
  }

  addBot(choice: BotChoice): Result {
    if (this.started) return fail('net.alreadyStarted');
    if (this.seats.length >= MAX_PLAYERS) return fail('net.full');
    const pid = this.seats.length;
    this.seats.push({ pid, name: `Bot ${pid}`, isBot: true, botChoice: sanitizeChoice(choice), connected: true });
    this.touch();
    return ok;
  }

  setBotChoice(pid: number, choice: BotChoice): Result {
    if (this.started) return fail('net.alreadyStarted');
    const seat = this.seats[pid];
    if (!seat || !seat.isBot) return fail('net.noSuchSeat');
    seat.botChoice = sanitizeChoice(choice);
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

  /** Spieler benennt sich um (in der Lobby und im laufenden Spiel). */
  rename(pid: number, name: string): Result {
    const seat = this.seats[pid];
    if (!seat || seat.isBot) return fail('net.noSuchSeat');
    const clean = sanitizeName(name);
    if (!clean) return fail('net.badName');
    const taken = (n: string) => this.seats.some((o) => o.pid !== pid && o.name === n);
    let unique = clean;
    if (taken(unique)) unique = `${clean.slice(0, 10)} ${pid + 1}`;
    if (taken(unique)) return fail('net.nameTaken');
    seat.name = unique;
    if (this.state) this.state.players[pid].name = unique;
    this.touch();
    return ok;
  }

  /** Spieler stellt seine Kartenrückseite um (wirkt nur auf die Anzeige bei den anderen). */
  setBack(pid: number, back: string): Result {
    const seat = this.seats[pid];
    if (!seat || seat.isBot) return fail('net.noSuchSeat');
    seat.back = sanitizeBack(back);
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
    if (this.state) {
      // Ist niemand mehr da, wartet das Spiel (auch die Endauswertung), statt dass Bots allein weiterspielen.
      if (!connected && !this.paused && !this.humans().some((s) => s.connected)) this.paused = 'auto';
      // Eine automatische Pause endet, sobald alle Menschen wieder da sind.
      if (connected && this.paused === 'auto' && this.humans().every((s) => s.connected)) this.resume();
      // Wer wegfällt, blockiert die Bestätigung der anderen nicht.
      if (!connected) this.checkResumeVotes();
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
    this.resumeVotes.clear();
    this.touch();
    return ok;
  }

  /** Ein Spieler tippt auf „Weiter“. Die Pause endet erst, wenn alle verbundenen Menschen bestätigt haben. */
  requestResume(pid: number): Result {
    if (!this.paused) return ok;
    const seat = this.seats[pid];
    if (!seat || seat.isBot) return fail('net.noSuchSeat');
    this.resumeVotes.add(pid);
    this.touch();
    this.checkResumeVotes();
    return ok;
  }

  private checkResumeVotes(): void {
    if (!this.paused) return;
    const active = this.humans().filter((s) => s.connected);
    if (active.length > 0 && active.every((s) => this.resumeVotes.has(s.pid))) this.resume();
  }

  resume(): Result {
    if (!this.paused) return ok;
    this.paused = null;
    this.resumeVotes.clear();
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
  claim(pid: number, name: string, now = Date.now(), back?: string, auto = false): { pid: number; token: string } | Result {
    if (!this.state) return fail('net.notStarted');
    if (this.state.finished) return fail('net.alreadyStarted');
    const seat = this.seats[pid];
    if (!seat) return fail('net.noSuchSeat');
    if (!this.isClaimable(seat, now)) return fail('net.seatTaken');
    const clean = sanitizeName(name) || `Spieler ${pid + 1}`;
    const taken = (n: string) => this.seats.some((o) => o.pid !== pid && o.name === n);
    const unique = this.nameFor(clean, auto, taken, pid + 1);
    const token = makeToken(this.rng);
    seat.isBot = false;
    delete seat.bot;
    delete seat.botChoice;
    seat.token = token;
    seat.back = sanitizeBack(back);
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
    // Ältere Kopien kennen neuere Einstellungen noch nicht: Standardwerte ergänzen.
    const defaults: LobbySettings = { rounds: 7, firstTurnOpenAllowed: false, speed: 'normal', seating: 'random', peekDiscards: true, sortedDeal: true };
    this.settings = { ...defaults, ...(snap.settings as Partial<LobbySettings>) };
    this.state = snap.state;
    this.rev = snap.rev;
    // Nach dem Wiederherstellen warten alle, bis die Menschen wieder verbunden sind.
    this.paused = this.state ? (this.paused ?? snap.paused ?? 'auto') : null;
    this.resumeVotes.clear();
    if (this.paused === 'auto' && this.humans().every((s) => s.connected)) this.paused = null;
    this.restoredAt = Date.now();
    this.lastActivity = Date.now();
  }

  updateSettings(patch: Partial<LobbySettings>): Result {
    if (this.started) return fail('net.alreadyStarted');
    if (patch.rounds !== undefined && !ROUND_OPTIONS.includes(patch.rounds)) return fail('net.badSettings');
    if (patch.peekDiscards !== undefined && typeof patch.peekDiscards !== 'boolean') return fail('net.badSettings');
    if (patch.sortedDeal !== undefined && typeof patch.sortedDeal !== 'boolean') return fail('net.badSettings');
    if (patch.seating !== undefined && patch.seating !== 'manual' && patch.seating !== 'random') return fail('net.badSettings');
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
    const settings: Settings = { rounds: this.settings.rounds, firstTurnOpenAllowed: this.settings.firstTurnOpenAllowed, direction: 'ccw', peekDiscards: this.settings.peekDiscards, sortedDeal: this.settings.sortedDeal };
    // Wer die erste Runde austeilt (und damit wer beginnt), wird ausgelost.
    const dealer = Math.floor(this.rng() * players.length);
    this.state = newGame(players, settings, Math.floor(this.rng() * 2147483647), dealer);
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

  /** Sitzordnung ändern: `order[neu] = alter Platz`. Liefert die Zuordnung alt nach neu. */
  reorder(order: number[]): { ok: true; map: number[] } | Result {
    if (this.started) return fail('net.alreadyStarted');
    const n = this.seats.length;
    if (order.length !== n || new Set(order).size !== n || order.some((o) => !Number.isInteger(o) || o < 0 || o >= n)) return fail('net.badSettings');
    const map: number[] = [];
    order.forEach((old, neu) => (map[old] = neu));
    this.applyPidMap(map);
    this.touch();
    return { ok: true, map };
  }

  /** Lost die Sitzordnung aus. Liefert die Zuordnung alt nach neu. */
  shuffleSeats(): number[] {
    const order = this.seats.map((s) => s.pid);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const map: number[] = [];
    order.forEach((old, neu) => (map[old] = neu));
    this.applyPidMap(map);
    return map;
  }

  private applyPidMap(map: number[]): void {
    const seats = [...this.seats];
    this.seats = seats.map((_, neu) => seats[map.indexOf(neu)]);
    this.seats.forEach((s, i) => (s.pid = i));
    this.hostPid = map[this.hostPid] ?? 0;
  }

  // ------------------------------------------------------------ Spiel
  act(pid: number, action: Action): Result {
    if (!this.state) return fail('net.notStarted');
    if (this.paused) return fail('net.paused');
    const res = applyAction(this.state, pid, action);
    if (res.ok) {
      this.touch();
      this.checkFinishedConfirm();
    }
    return res;
  }

  /** Bestätigt die Rundenauswertung; sobald alle bestätigt haben, beginnt die nächste Runde. */
  nextRound(pid: number): Result {
    if (!this.state) return fail('net.notStarted');
    if (this.paused) return fail('net.paused');
    if (!this.state.round.ended) return fail('net.notEnded');
    const res = applyAction(this.state, pid, { kind: 'ready' });
    if (res.ok) {
      this.touch();
      this.checkFinishedConfirm();
    }
    return res;
  }

  /** Nach dem letzten Spiel geht es erst in die Lobby, wenn alle die Endauswertung bestätigt haben. */
  private checkFinishedConfirm(): void {
    const s = this.state;
    if (!s || !s.finished || !s.round.ended) return;
    if (this.seats.every((seat) => s.round.nextReady?.[seat.pid])) {
      this.state = null;
      this.paused = null;
    }
  }

  /** Welcher Sitz soll jetzt automatisch spielen? Bots immer, getrennte Menschen nach Wartezeit. */
  autoSeat(now = Date.now()): number | null {
    const s = this.state;
    if (!s || this.paused) return null;
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
    if (confirm) this.checkFinishedConfirm();
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
      resumed: [...this.resumeVotes],
      settings: this.settings,
      seats: this.seats.map((s) => ({
        pid: s.pid,
        name: s.name,
        isBot: s.isBot,
        connected: s.connected,
        isHost: s.pid === host,
        botLabel: s.isBot && s.botChoice ? `${s.botChoice.level}/${s.botChoice.style}` : undefined,
        back: s.back,
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

/** Kennung einer Kartenrückseite: nur kurze, einfache Zeichen; unbekannte Kennungen fallen beim Anzeigen auf den Standard zurück. */
export function sanitizeBack(back: unknown): string | undefined {
  return typeof back === 'string' && /^[a-z0-9-]{1,24}$/.test(back) ? back : undefined;
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
    // Dreistellig, solange Platz ist; sind viele Räume offen, weichen wir auf vier Stellen aus.
    let code = makeCode(this.rng);
    for (let tries = 0; this.rooms.has(code); tries++) code = makeCode(this.rng, tries < 40 ? 3 : 4);
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
