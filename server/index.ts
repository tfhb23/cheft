/**
 * Cheft-Server: liefert die gebaute App (dist/) aus und betreibt die Mehrspieler-Räume per WebSocket.
 * Start: `npx tsx server/index.ts` (Umgebungsvariable PORT, Standard 8080).
 */
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { Room, Rooms, Speed, Seating, Result, RoomSnapshot, MIN_PLAYERS } from './room';
import { seal, open as openSnapshot } from './snapshot';
import { Action } from '../src/engine/actions';
import { BotChoice } from '../src/bot/names';

const PORT = Number(process.env.PORT ?? 8080);
const DIST = process.env.CHEFT_DIST ?? join(process.cwd(), 'dist');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(`ok rooms=${rooms.size}`);
    return;
  }
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (path.endsWith('/')) path += 'index.html';
  let file = join(DIST, path);
  if (!file.startsWith(DIST)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const st = await stat(file);
    if (st.isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(DIST, 'index.html');
  }
  try {
    const data = await readFile(file);
    const ext = extname(file);
    const immutable = /\/assets\//.test(file);
    res.writeHead(200, {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}

// ---------------------------------------------------------------- Protokoll

type ClientMsg =
  | { type: 'create'; name: string }
  | { type: 'join'; room: string; name: string }
  | { type: 'rejoin'; room: string; token: string; snap?: string }
  | { type: 'claim'; room: string; pid: number; name: string }
  | { type: 'pause'; on: boolean }
  | { type: 'leave' }
  | { type: 'lobby'; op: 'addBot'; choice: BotChoice }
  | { type: 'lobby'; op: 'removeSeat'; pid: number }
  | { type: 'lobby'; op: 'settings'; rounds?: number; firstTurnOpenAllowed?: boolean; speed?: Speed; seating?: Seating; peekDiscards?: boolean }
  | { type: 'lobby'; op: 'reorder'; order: number[] }
  | { type: 'lobby'; op: 'botChoice'; pid: number; choice: BotChoice }
  | { type: 'lobby'; op: 'start' }
  | { type: 'lobby'; op: 'backToLobby' }
  | { type: 'nextRound' }
  | { type: 'action'; action: Action }
  | { type: 'ping' };

interface Conn {
  ws: WebSocket;
  room: Room | null;
  pid: number;
  alive: boolean;
}

const rooms = new Rooms();
const conns = new Set<Conn>();
const botTimers = new Map<string, NodeJS.Timeout>();

function send(c: Conn, msg: unknown): void {
  if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(msg));
}

function broadcast(room: Room, lastAction?: { pid: number; action: Action }): void {
  const lobby = room.lobbyView();
  let snap: string | undefined;
  for (const c of conns) {
    if (c.room !== room) continue;
    // Verschlüsselte Kopie des Raums: damit kann ein Client den Raum nach dem Einschlafen des Servers wiederherstellen.
    snap ??= seal(room.toSnapshot());
    const state = room.viewFor(c.pid);
    send(c, { type: 'state', lobby, state, last: lastAction ?? null, snap });
  }
}

function joined(c: Conn, room: Room, pid: number, token: string): void {
  c.room = room;
  c.pid = pid;
  send(c, { type: 'joined', room: room.code, pid, token });
  room.setConnected(pid, true);
  broadcast(room);
  scheduleBots(room);
}

/** Platznummern im Raum ändern (Entfernen, Umsortieren, Auslosen) und die betroffenen Spieler informieren. */
function remap(room: Room, map: (pid: number) => number): void {
  for (const o of conns) {
    if (o.room !== room) continue;
    const np = map(o.pid);
    if (np === o.pid) continue;
    o.pid = np;
    const seat = room.seats[np];
    if (seat?.token) send(o, { type: 'joined', room: room.code, pid: np, token: seat.token });
  }
}

function leave(c: Conn): void {
  const room = c.room;
  if (!room) return;
  c.room = null;
  if (!room.started) {
    // In der Lobby wird der Platz freigegeben; verlässt der Host, übernimmt der nächste Mensch.
    room.removeSeat(c.pid);
    remap(room, (p) => (p > c.pid ? p - 1 : p));
    if (room.seats.length === 0 || !room.seats.some((s) => !s.isBot)) rooms.remove(room.code);
    else room.hostPid = room.seats.find((s) => !s.isBot)!.pid;
  } else {
    room.setConnected(c.pid, false);
    scheduleBots(room);
  }
  broadcast(room);
}

function delayFor(room: Room, action: Action | null): number {
  const fast = room.settings.speed === 'fast';
  if (room.state?.round.waiting || room.state?.round.ended) return 900 + Math.floor(Math.random() * 1200);
  if (action?.kind === 'discard') return fast ? 900 : 2000;
  return fast ? 650 : 1300;
}

/** Plant den nächsten automatischen Zug (Bots oder Autopilot) für den Raum. */
function scheduleBots(room: Room, afterAction: Action | null = null): void {
  const existing = botTimers.get(room.code);
  if (existing) clearTimeout(existing);
  if (!room.state || room.state.finished) return;
  const pid = room.autoSeat();
  const delay = pid === null ? AUTOPILOT_CHECK_MS : delayFor(room, afterAction);
  const timer = setTimeout(() => {
    botTimers.delete(room.code);
    if (!rooms.get(room.code)) return;
    const seat = room.autoSeat();
    if (seat === null) {
      scheduleBots(room);
      return;
    }
    const action = room.autoStep(seat);
    broadcast(room, action ? { pid: seat, action } : undefined);
    scheduleBots(room, action);
  }, delay);
  botTimers.set(room.code, timer);
}
const AUTOPILOT_CHECK_MS = 5000;

function handle(c: Conn, msg: ClientMsg): void {
  switch (msg.type) {
    case 'ping':
      send(c, { type: 'pong' });
      return;
    case 'create': {
      leave(c);
      const room = rooms.create();
      const r = room.addHuman(msg.name);
      if (!('pid' in r)) return send(c, { type: 'error', error: r.ok ? 'net.serverError' : r.error, params: r.ok ? undefined : r.params });
      room.hostPid = r.pid;
      joined(c, room, r.pid, r.token);
      return;
    }
    case 'join': {
      const room = rooms.get(msg.room);
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      if (room.started) {
        // Laufendes Spiel: einen Bot-Platz oder den Platz eines länger Abwesenden übernehmen.
        const free = room.claimable();
        if (!free.length) return send(c, { type: 'error', error: 'net.noFreeSeat' });
        return send(c, { type: 'claimable', room: room.code, seats: free });
      }
      leave(c);
      const r = room.addHuman(msg.name);
      if (!('pid' in r)) return send(c, { type: 'error', error: r.ok ? 'net.serverError' : r.error, params: r.ok ? undefined : r.params });
      joined(c, room, r.pid, r.token);
      return;
    }
    case 'rejoin': {
      let room = rooms.get(msg.room);
      const snap = msg.snap ? (openSnapshot(msg.snap) as RoomSnapshot | null) : null;
      const valid = snap && snap.v === 1 && snap.code === String(msg.room).toUpperCase() && snap.seats.some((s) => !s.isBot && s.token === msg.token);
      if (!room && valid) room = rooms.restore(snap);
      // Wurde der Raum eben erst aus einer älteren Kopie hergestellt, gewinnt die neuere.
      else if (room && valid && room.restoredAt !== null && Date.now() - room.restoredAt < 5 * 60 * 1000 && snap.rev > room.rev) room.applySnapshot(snap, true);
      const seat = room?.findByToken(msg.token);
      if (!room || !seat) return send(c, { type: 'error', error: 'net.noRoom' });
      // Alte Verbindung desselben Sitzes ablösen
      for (const o of conns) if (o !== c && o.room === room && o.pid === seat.pid) o.room = null;
      joined(c, room, seat.pid, seat.token!);
      return;
    }
    case 'claim': {
      const room = rooms.get(msg.room);
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      const r = room.claim(Number(msg.pid), msg.name);
      if (!('pid' in r)) return send(c, { type: 'error', error: r.ok ? 'net.serverError' : r.error, params: r.ok ? undefined : r.params });
      for (const o of conns) if (o !== c && o.room === room && o.pid === r.pid) o.room = null;
      leave(c);
      joined(c, room, r.pid, r.token);
      return;
    }
    case 'pause': {
      const room = c.room;
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      const r = msg.on ? room.pause() : room.resume();
      if (!r.ok) return send(c, { type: 'error', error: r.error, params: r.params });
      broadcast(room);
      scheduleBots(room);
      return;
    }
    case 'leave':
      leave(c);
      send(c, { type: 'left' });
      return;
    case 'lobby': {
      const room = c.room;
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      // Das Spielende bestätigen darf jeder Mensch; alles andere der Spielleiter.
      if (msg.op !== 'backToLobby' && c.pid !== room.effectiveHost()) return send(c, { type: 'error', error: 'net.hostOnly' });
      let r: Result;
      if (msg.op === 'addBot') r = room.addBot(msg.choice);
      else if (msg.op === 'removeSeat') {
        if (msg.pid === room.effectiveHost()) return send(c, { type: 'error', error: 'net.hostOnly' });
        for (const o of conns) {
          if (o.room === room && o.pid === msg.pid) {
            o.room = null;
            send(o, { type: 'left' });
          }
        }
        r = room.removeSeat(msg.pid);
        remap(room, (p) => (p > msg.pid ? p - 1 : p));
      } else if (msg.op === 'reorder') {
        const rr = room.reorder(Array.isArray(msg.order) ? msg.order.map(Number) : []);
        if ('map' in rr) {
          remap(room, (p) => rr.map[p]);
          r = { ok: true };
        } else r = rr;
      } else if (msg.op === 'settings') r = room.updateSettings({ rounds: msg.rounds, firstTurnOpenAllowed: msg.firstTurnOpenAllowed, speed: msg.speed, seating: msg.seating, peekDiscards: msg.peekDiscards });
      else if (msg.op === 'start') {
        // Zufällige Sitzordnung wird erst beim Start ausgelost.
        if (room.settings.seating === 'random' && !room.started && room.seats.length >= MIN_PLAYERS) {
          const map = room.shuffleSeats();
          remap(room, (p) => map[p]);
        }
        r = room.start();
      } else if (msg.op === 'botChoice') r = room.setBotChoice(Number(msg.pid), msg.choice);
      else r = room.nextRound(c.pid); // 'backToLobby': Spielende bestätigen
      if (!r.ok) return send(c, { type: 'error', error: r.error, params: r.params });
      broadcast(room);
      scheduleBots(room);
      return;
    }
    case 'nextRound': {
      const room = c.room;
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      const r = room.nextRound(c.pid);
      if (!r.ok) return send(c, { type: 'error', error: r.error, params: r.params });
      broadcast(room);
      scheduleBots(room);
      return;
    }
    case 'action': {
      const room = c.room;
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      const r = room.act(c.pid, msg.action);
      if (!r.ok) return send(c, { type: 'error', error: r.error, params: r.params });
      broadcast(room, { pid: c.pid, action: msg.action });
      scheduleBots(room, msg.action);
      return;
    }
  }
}

// ---------------------------------------------------------------- Start

const server = createServer((req, res) => void serveStatic(req, res));
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 512 * 1024 });

wss.on('connection', (ws) => {
  const c: Conn = { ws, room: null, pid: -1, alive: true };
  conns.add(c);
  ws.on('pong', () => (c.alive = true));
  ws.on('message', (data) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    try {
      handle(c, msg);
    } catch (e) {
      console.error('Fehler bei Nachricht', msg?.type, e);
      send(c, { type: 'error', error: 'net.serverError' });
    }
  });
  ws.on('close', () => {
    conns.delete(c);
    leave(c);
  });
});

setInterval(() => {
  for (const c of conns) {
    if (!c.alive) {
      c.ws.terminate();
      continue;
    }
    c.alive = false;
    c.ws.ping();
  }
  for (const code of rooms.sweep()) botTimers.delete(code);
}, 30000);

server.listen(PORT, () => {
  console.log(`Cheft-Server läuft auf Port ${PORT}, Dateien aus ${DIST}`);
});
