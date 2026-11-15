/**
 * WebSocket-Client für den Mehrspieler mit automatischem Wiederverbinden.
 */
import { Action } from '../engine/actions';
import { GameView } from '../engine/view';
import { BotChoice } from '../bot/names';

export interface LobbyInfo {
  code: string;
  hostPid: number;
  started: boolean;
  /** Pause: 'manual' durch einen Spieler, 'auto' solange nicht alle Menschen verbunden sind. */
  paused: 'manual' | 'auto' | null;
  settings: { rounds: number; firstTurnOpenAllowed: boolean; speed: 'normal' | 'fast'; seating: 'manual' | 'random'; peekDiscards: boolean; sortedDeal: boolean };
  seats: { pid: number; name: string; isBot: boolean; connected: boolean; isHost: boolean; botLabel?: string }[];
}

export interface ServerUpdate {
  lobby: LobbyInfo;
  state: GameView | null;
  last: { pid: number; action: Action } | null;
  /** Verschlüsselte Kopie des Raums, mit der der Server nach dem Einschlafen den Raum wiederherstellen kann. */
  snap?: string;
}

export interface ClaimableSeat {
  pid: number;
  name: string;
  kind: 'bot' | 'away';
}

export interface NetHandlers {
  onJoined(info: { room: string; pid: number; token: string }): void;
  onUpdate(update: ServerUpdate): void;
  onError(error: string, params?: Record<string, string | number>): void;
  onStatus(status: 'connecting' | 'open' | 'closed'): void;
  onLeft(): void;
  /** Das Spiel läuft schon: Plätze, die man übernehmen kann. */
  onClaimable(room: string, seats: ClaimableSeat[]): void;
}

/** Standardadresse: gleiche Herkunft wie die Seite; auf GitHub Pages gibt es keinen Server. */
export function defaultServerUrl(): string {
  const built = (import.meta.env?.VITE_SERVER_URL as string | undefined) ?? '';
  if (built) return built;
  if (typeof location === 'undefined') return '';
  if (/github\.io$/.test(location.hostname)) return '';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

export class NetClient {
  private ws: WebSocket | null = null;
  private url = '';
  private handlers: NetHandlers;
  private closedByUser = false;
  private retry = 0;
  private rejoin: { room: string; token: string } | null = null;
  private snap: string | null = null;
  private pingTimer: number | null = null;
  private retryTimer: number | null = null;
  private lastPong = 0;

  constructor(handlers: NetHandlers) {
    this.handlers = handlers;
    // Zurück im Vordergrund oder wieder online: sofort neu verbinden statt auf die Wartezeit zu warten.
    const wake = () => this.reconnectNow();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') wake();
    });
    window.addEventListener('online', wake);
  }

  /** Setzt die Kopie, die beim Wiederverbinden mitgeschickt wird (z. B. aus dem Browserspeicher). */
  setSnapshot(snap: string | null): void {
    this.snap = snap;
  }

  /** Nach dem Entsperren: Verbindung prüfen und bei Bedarf sofort neu aufbauen. */
  reconnectNow(): void {
    if (this.closedByUser || !this.url) return;
    if (this.connected) {
      // Eine Verbindung kann nach dem Sperren des Handys tot sein, ohne dass der Browser es merkt.
      const sent = Date.now();
      this.send({ type: 'ping' });
      window.setTimeout(() => {
        if (!this.closedByUser && this.lastPong < sent) this.ws?.close();
      }, 4000);
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.retry = 0;
    this.open();
  }

  get connected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  connect(url: string, rejoin: { room: string; token: string; snap?: string } | null = null): void {
    this.url = url;
    this.rejoin = rejoin ? { room: rejoin.room, token: rejoin.token } : null;
    if (rejoin?.snap) this.snap = rejoin.snap;
    this.closedByUser = false;
    this.open();
  }

  private open(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.handlers.onStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.handlers.onError('net.badUrl');
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.handlers.onStatus('open');
      if (this.rejoin) this.send({ type: 'rejoin', room: this.rejoin.room, token: this.rejoin.token, snap: this.snap ?? undefined });
      this.pingTimer = window.setInterval(() => this.send({ type: 'ping' }), 25000);
    };
    ws.onmessage = (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      switch (msg.type) {
        case 'pong':
          this.lastPong = Date.now();
          break;
        case 'claimable':
          this.handlers.onClaimable(String(msg.room), msg.seats as ClaimableSeat[]);
          break;
        case 'joined':
          this.rejoin = { room: String(msg.room), token: String(msg.token) };
          this.handlers.onJoined({ room: String(msg.room), pid: Number(msg.pid), token: String(msg.token) });
          break;
        case 'state':
          if (typeof msg.snap === 'string') this.snap = msg.snap;
          this.handlers.onUpdate({ lobby: msg.lobby as LobbyInfo, state: (msg.state as GameView | null) ?? null, last: (msg.last as ServerUpdate['last']) ?? null, snap: this.snap ?? undefined });
          break;
        case 'error':
          this.handlers.onError(String(msg.error), msg.params as Record<string, string | number> | undefined);
          break;
        case 'left':
          this.rejoin = null;
          this.snap = null;
          this.handlers.onLeft();
          break;
      }
    };
    ws.onclose = () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      this.handlers.onStatus('closed');
      if (this.closedByUser) return;
      const wait = Math.min(15000, 1000 * Math.pow(2, this.retry++));
      this.retryTimer = window.setTimeout(() => {
        this.retryTimer = null;
        if (!this.closedByUser) this.open();
      }, wait);
    };
    ws.onerror = () => {
      /* onclose folgt */
    };
  }

  send(msg: unknown): boolean {
    if (!this.connected) return false;
    this.ws!.send(JSON.stringify(msg));
    return true;
  }

  create(name: string): void {
    this.send({ type: 'create', name });
  }
  join(room: string, name: string): void {
    this.send({ type: 'join', room: room.toUpperCase(), name });
  }
  addBot(choice: BotChoice): void {
    this.send({ type: 'lobby', op: 'addBot', choice });
  }
  removeSeat(pid: number): void {
    this.send({ type: 'lobby', op: 'removeSeat', pid });
  }
  settings(patch: { rounds?: number; firstTurnOpenAllowed?: boolean; speed?: 'normal' | 'fast'; seating?: 'manual' | 'random'; peekDiscards?: boolean; sortedDeal?: boolean }): void {
    this.send({ type: 'lobby', op: 'settings', ...patch });
  }
  /** Neue Sitzordnung: order[neu] = bisheriger Platz. */
  reorder(order: number[]): void {
    this.send({ type: 'lobby', op: 'reorder', order });
  }
  start(): void {
    this.send({ type: 'lobby', op: 'start' });
  }
  backToLobby(): void {
    this.send({ type: 'lobby', op: 'backToLobby' });
  }
  claim(room: string, pid: number, name: string): void {
    this.send({ type: 'claim', room, pid, name });
  }
  pause(on: boolean): void {
    this.send({ type: 'pause', on });
  }
  nextRound(): void {
    this.send({ type: 'nextRound' });
  }
  action(action: Action): void {
    this.send({ type: 'action', action });
  }
  leave(): void {
    this.send({ type: 'leave' });
    this.rejoin = null;
    this.snap = null;
  }
  close(): void {
    this.closedByUser = true;
    this.rejoin = null;
    this.snap = null;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.ws) this.ws.close();
    this.ws = null;
  }
}
