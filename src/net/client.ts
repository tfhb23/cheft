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
  settings: { rounds: number; firstTurnOpenAllowed: boolean; speed: 'normal' | 'fast' };
  seats: { pid: number; name: string; isBot: boolean; connected: boolean; isHost: boolean; botLabel?: string }[];
}

export interface ServerUpdate {
  lobby: LobbyInfo;
  state: GameView | null;
  last: { pid: number; action: Action } | null;
}

export interface NetHandlers {
  onJoined(info: { room: string; pid: number; token: string }): void;
  onUpdate(update: ServerUpdate): void;
  onError(error: string, params?: Record<string, string | number>): void;
  onStatus(status: 'connecting' | 'open' | 'closed'): void;
  onLeft(): void;
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
  private pingTimer: number | null = null;

  constructor(handlers: NetHandlers) {
    this.handlers = handlers;
  }

  get connected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  connect(url: string, rejoin: { room: string; token: string } | null = null): void {
    this.url = url;
    this.rejoin = rejoin;
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
      if (this.rejoin) this.send({ type: 'rejoin', room: this.rejoin.room, token: this.rejoin.token });
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
        case 'joined':
          this.rejoin = { room: String(msg.room), token: String(msg.token) };
          this.handlers.onJoined({ room: String(msg.room), pid: Number(msg.pid), token: String(msg.token) });
          break;
        case 'state':
          this.handlers.onUpdate({ lobby: msg.lobby as LobbyInfo, state: (msg.state as GameView | null) ?? null, last: (msg.last as ServerUpdate['last']) ?? null });
          break;
        case 'error':
          this.handlers.onError(String(msg.error), msg.params as Record<string, string | number> | undefined);
          break;
        case 'left':
          this.rejoin = null;
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
      setTimeout(() => {
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
  settings(patch: { rounds?: number; firstTurnOpenAllowed?: boolean; speed?: 'normal' | 'fast' }): void {
    this.send({ type: 'lobby', op: 'settings', ...patch });
  }
  start(): void {
    this.send({ type: 'lobby', op: 'start' });
  }
  backToLobby(): void {
    this.send({ type: 'lobby', op: 'backToLobby' });
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
  }
  close(): void {
    this.closedByUser = true;
    this.rejoin = null;
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.ws) this.ws.close();
    this.ws = null;
  }
}
