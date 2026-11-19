/**
 * Cheft-Server: liefert die gebaute App (dist/) aus und betreibt die Mehrspieler-Räume per WebSocket.
 * Start: `npx tsx server/index.ts` (Umgebungsvariable PORT, Standard 8080).
 */
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { Room, Rooms, Speed, Seating, Result, RoomSnapshot, MIN_PLAYERS, isRoomCode, snapshotUsable } from './room';
import { seal, open as openSnapshot } from './snapshot';
import { Action } from '../src/engine/actions';
import { BotChoice } from '../src/bot/names';

const PORT = Number(process.env.PORT ?? 8080);
const STARTED_AT = Date.now();
/** So lange nach dem Aufwachen des Servers können Mitspieler noch ein laufendes Spiel wiederherstellen. */
const WARM_MS = 45000;
/** Verbindungsprüfung: alle 10 s ein Ping; nach zwei verpassten Antworten gilt die Verbindung als getrennt. */
const PING_MS = 10000;
const MAX_MISSED = 2;

/** Sekunden, die ein Neuankömmling nach dem Aufwachen noch warten sollte, bevor er einen fehlenden Raum neu eröffnet. */
function warmWait(now = Date.now()): number {
  return Math.max(0, Math.ceil((WARM_MS - (now - STARTED_AT)) / 1000));
}
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
  | { type: 'create'; name: string; auto?: boolean; back?: string }
  | { type: 'join'; room: string; name: string; auto?: boolean; back?: string }
  | { type: 'open'; room: string; name: string; auto?: boolean; back?: string }
  | { type: 'rejoin'; room: string; token: string; snap?: string }
  | { type: 'claim'; room: string; pid: number; name: string; auto?: boolean; back?: string }
  | { type: 'claimReply'; id: number; ok: boolean }
  | { type: 'claimCancel' }
  | { type: 'kick'; pid: number }
  | { type: 'handover'; pid: number }
  | { type: 'setBack'; back: string }
  | { type: 'pause'; on: boolean; all?: boolean }
  | { type: 'rename'; name: string }
  | { type: 'leave' }
  | { type: 'lobby'; op: 'addBot'; choice: BotChoice }
  | { type: 'lobby'; op: 'removeSeat'; pid: number }
  | { type: 'lobby'; op: 'settings'; rounds?: number; firstTurnOpenAllowed?: boolean; speed?: Speed; seating?: Seating; peekDiscards?: boolean; sortedDeal?: boolean }
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
  /** Wie viele Ping-Runden in Folge ohne Antwort. */
  missed: number;
}

const rooms = new Rooms();
const conns = new Set<Conn>();
const botTimers = new Map<string, NodeJS.Timeout>();
/** Wer hinter einer offenen Anfrage steckt (die Raumdaten stehen in room.requests). */
const requesters = new Map<number, { c: Conn; room: Room; name: string; back?: string; auto: boolean }>();

/** Zieht eine Anfrage zurück und sagt dem Anfragenden bei Bedarf, warum. */
function endRequest(room: Room, id: number, error?: string): void {
  room.takeRequest(id);
  const r = requesters.get(id);
  requesters.delete(id);
  if (r && error) send(r.c, { type: 'error', error });
}

function cancelRequestsOf(c: Conn): void {
  for (const [id, r] of requesters) {
    if (r.c !== c) continue;
    endRequest(r.room, id);
    if (rooms.get(r.room.code) === r.room) broadcast(r.room);
  }
}

/** Alles, was nach einer Änderung der Plätze nachzuziehen ist. */
function dropRequestsForSeat(room: Room, pid: number): void {
  for (const req of [...room.requests]) if (req.pid === pid) endRequest(room, req.id, 'net.seatTaken');
}

function send(c: Conn, msg: unknown): void {
  if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(msg));
}

function broadcast(room: Room, lastAction?: { pid: number; action: Action }): void {
  const lobby = room.lobbyView();
  let snap: string | null | undefined;
  for (const c of conns) {
    if (c.room !== room) continue;
    // Verschlüsselte Kopie des Raums: damit kann ein Client den Raum nach dem Einschlafen des Servers wiederherstellen.
    // Nur laufende Spiele werden als Kopie weitergegeben; sonst null, damit die Clients eine alte Kopie verwerfen.
    if (snap === undefined) snap = room.state && !room.state.finished ? seal(room.toSnapshot()) : null;
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

/** Entfernt einen Lobby-Sitz samt Umnummerierung; löscht den Raum, wenn kein Mensch mehr drin ist. */
function dropSeat(room: Room, pid: number): void {
  room.removeSeat(pid);
  remap(room, (p) => (p > pid ? p - 1 : p));
  if (room.seats.length === 0 || !room.seats.some((s) => !s.isBot)) {
    rooms.remove(room.code);
    const timer = botTimers.get(room.code);
    if (timer) clearTimeout(timer);
    botTimers.delete(room.code);
  }
}

/**
 * `hard`: bewusstes Verlassen (Sitz sofort frei). Sonst ist es ein Verbindungsabbruch: In der Lobby bleibt der Sitz
 * eine Weile reserviert (LOBBY_GRACE_MS), im Spiel bleibt er ohnehin bestehen.
 */
function leave(c: Conn, hard = true): void {
  const room = c.room;
  if (!room) return;
  c.room = null;
  if (!room.started && hard) {
    // Die Gastgeber-Rolle geht beim Entfernen an den am längsten anwesenden Menschen.
    dropSeat(room, c.pid);
    if (!rooms.get(room.code)) return;
  } else {
    room.setConnected(c.pid, false);
    scheduleBots(room);
  }
  broadcast(room);
}

/** Anfragen, auf die der Spielleiter nicht geantwortet hat, laufen nach einer Minute ab. */
function expireRequests(): void {
  for (const code of rooms.codes()) {
    const room = rooms.get(code);
    if (!room) continue;
    const expired = room.expiredRequests();
    if (!expired.length) continue;
    for (const req of expired) endRequest(room, req.id, 'net.noAnswer');
    broadcast(room);
  }
}

/** Gibt Lobby-Sitze frei, deren Spieler zu lange getrennt sind. */
function dropStaleSeats(): void {
  for (const code of rooms.codes()) {
    const room = rooms.get(code);
    if (!room) continue;
    let changed = false;
    for (let pid = room.staleLobbySeats()[0]; pid !== undefined; pid = room.staleLobbySeats()[0]) {
      dropSeat(room, pid);
      changed = true;
      if (!rooms.get(code)) break;
    }
    if (changed && rooms.get(code)) broadcast(room);
  }
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
    // Ist jemand länger als 45 s weg, pausiert das Spiel, statt dass ein Bot für ihn zieht.
    if (room.checkAwayPause()) {
      broadcast(room);
      scheduleBots(room);
      return;
    }
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
      if (rooms.full) return send(c, { type: 'error', error: 'net.busy' });
      leave(c);
      const room = rooms.create();
      const r = room.addHuman(msg.name, msg.back, msg.auto === true);
      if (!('pid' in r)) return send(c, { type: 'error', error: r.ok ? 'net.serverError' : r.error, params: r.ok ? undefined : r.params });
      room.hostPid = r.pid;
      joined(c, room, r.pid, r.token);
      return;
    }
    case 'join': {
      const room = rooms.get(msg.room);
      if (!room) return send(c, { type: 'error', error: 'net.noRoom', params: { wait: warmWait() } });
      if (room.started) {
        // Laufendes Spiel: einen Bot-Platz oder den Platz eines länger Abwesenden übernehmen.
        const free = room.claimable();
        if (!free.length) return send(c, { type: 'error', error: 'net.noFreeSeat' });
        return send(c, { type: 'claimable', room: room.code, seats: free });
      }
      leave(c);
      const r = room.addHuman(msg.name, msg.back, msg.auto === true);
      if (!('pid' in r)) return send(c, { type: 'error', error: r.ok ? 'net.serverError' : r.error, params: r.ok ? undefined : r.params });
      joined(c, room, r.pid, r.token);
      return;
    }
    case 'open': {
      // Einen fehlenden Raum mit Wunschcode neu eröffnen (alter Familienraum). Gibt es ihn inzwischen, wird beigetreten.
      const code = String(msg.room ?? '');
      if (!isRoomCode(code)) return send(c, { type: 'error', error: 'net.noRoom' });
      if (rooms.get(code)) return handle(c, { type: 'join', room: code, name: msg.name, auto: msg.auto, back: msg.back });
      if (rooms.full) return send(c, { type: 'error', error: 'net.busy' });
      leave(c);
      const room = rooms.open(code)!;
      const r = room.addHuman(msg.name, msg.back, msg.auto === true);
      if (!('pid' in r)) {
        rooms.remove(code);
        return send(c, { type: 'error', error: r.ok ? 'net.serverError' : r.error, params: r.ok ? undefined : r.params });
      }
      room.hostPid = r.pid;
      joined(c, room, r.pid, r.token);
      return;
    }
    case 'rejoin': {
      let room = rooms.get(msg.room);
      const snap = msg.snap ? (openSnapshot(msg.snap) as RoomSnapshot | null) : null;
      // Nur ein laufendes, nicht zu altes Spiel wird wiederhergestellt (nicht Lobbys, nicht Endauswertungen).
      const valid = snapshotUsable(snap) && snap.code === String(msg.room).toUpperCase() && snap.seats.some((s) => !s.isBot && s.token === msg.token);
      if (!room && valid) room = rooms.restore(snap);
      // Ein laufendes Spiel hat Vorrang vor einem frisch eröffneten Raum, in dem noch nicht gespielt wird.
      else if (room && valid && !room.started) {
        const old = room;
        room = rooms.restore(snap);
        for (const o of conns) {
          if (o === c || o.room !== old) continue;
          o.room = null;
          send(o, { type: 'replaced', room: room.code });
        }
      }
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
      // Einen Platz im laufenden Spiel übernehmen: nur mit Zustimmung des Spielleiters.
      const room = rooms.get(msg.room);
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      const hostSeat = room.seats[room.effectiveHost()];
      if (!hostSeat || hostSeat.isBot || !hostSeat.connected) return send(c, { type: 'error', error: 'net.noHostNow' });
      cancelRequestsOf(c);
      const req = room.addRequest(Number(msg.pid), String(msg.name ?? ''));
      if (!('id' in req)) return send(c, { type: 'error', error: req.ok ? 'net.serverError' : req.error, params: req.ok ? undefined : req.params });
      requesters.set(req.id, { c, room, name: String(msg.name ?? ''), back: msg.back, auto: msg.auto === true });
      send(c, { type: 'pending', room: room.code });
      broadcast(room);
      return;
    }
    case 'claimCancel':
      cancelRequestsOf(c);
      return;
    case 'claimReply': {
      const room = c.room;
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      if (c.pid !== room.effectiveHost()) return send(c, { type: 'error', error: 'net.hostOnly' });
      const req = room.requests.find((r) => r.id === Number(msg.id));
      const who = requesters.get(Number(msg.id));
      if (!req || !who) return;
      if (!msg.ok) {
        endRequest(room, req.id, 'net.declined');
        broadcast(room);
        return;
      }
      endRequest(room, req.id);
      const r = room.claim(req.pid, who.name, Date.now(), who.back, who.auto);
      if (!('pid' in r)) {
        send(who.c, { type: 'error', error: r.ok ? 'net.serverError' : r.error, params: r.ok ? undefined : r.params });
        broadcast(room);
        return;
      }
      for (const o of conns) if (o !== who.c && o.room === room && o.pid === r.pid) o.room = null;
      leave(who.c);
      joined(who.c, room, r.pid, r.token);
      return;
    }
    case 'kick': {
      const room = c.room;
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      const target = room.seats[Number(msg.pid)];
      const name = target?.name ?? '';
      const r = room.removePlayer(c.pid, Number(msg.pid));
      if (!r.ok) return send(c, { type: 'error', error: r.error, params: r.params });
      // Wer entfernt wurde, verliert alle Raumdaten und gilt als Unbekannter.
      for (const o of conns) {
        if (o.room === room && o.pid === Number(msg.pid)) {
          o.room = null;
          send(o, { type: 'kicked' });
        }
      }
      dropRequestsForSeat(room, Number(msg.pid));
      for (const o of conns) if (o.room === room) send(o, { type: 'notice', key: 'notice.removed', params: { name } });
      broadcast(room);
      scheduleBots(room);
      return;
    }
    case 'handover': {
      const room = c.room;
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      const r = room.handover(c.pid, Number(msg.pid));
      if (!r.ok) return send(c, { type: 'error', error: r.error, params: r.params });
      broadcast(room);
      return;
    }
    case 'rename': {
      const room = c.room;
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      const r = room.rename(c.pid, String(msg.name ?? ''));
      if (!r.ok) return send(c, { type: 'error', error: r.error, params: r.params });
      broadcast(room);
      return;
    }
    case 'setBack': {
      const room = c.room;
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      const r = room.setBack(c.pid, String(msg.back ?? ''));
      if (!r.ok) return send(c, { type: 'error', error: r.error, params: r.params });
      broadcast(room);
      return;
    }
    case 'pause': {
      const room = c.room;
      if (!room) return send(c, { type: 'error', error: 'net.noRoom' });
      // Beenden: der Spielleiter kann es für alle (`all`), sonst gibt jeder nur seine eigene Stimme ab.
      const r = msg.on ? room.pause() : msg.all ? room.forceResume(c.pid) : room.requestResume(c.pid);
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
        // Weder den Spielleiter selbst noch den abwesenden Gastgeber kann ein Vertreter entfernen.
        if (msg.pid === room.effectiveHost() || msg.pid === room.hostPid) return send(c, { type: 'error', error: 'net.hostOnly' });
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
      } else if (msg.op === 'settings') r = room.updateSettings({ rounds: msg.rounds, firstTurnOpenAllowed: msg.firstTurnOpenAllowed, speed: msg.speed, seating: msg.seating, peekDiscards: msg.peekDiscards, sortedDeal: msg.sortedDeal });
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
  const c: Conn = { ws, room: null, pid: -1, missed: 0 };
  conns.add(c);
  ws.on('pong', () => (c.missed = 0));
  ws.on('message', (data) => {
    c.missed = 0;
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
    cancelRequestsOf(c);
    leave(c, false);
  });
});

let tick = 0;
setInterval(() => {
  for (const c of conns) {
    if (c.missed >= MAX_MISSED) {
      c.ws.terminate();
      continue;
    }
    c.missed++;
    c.ws.ping();
  }
  dropStaleSeats();
  expireRequests();
  if (++tick % 3 === 0) for (const code of rooms.sweep()) botTimers.delete(code);
}, PING_MS);

server.listen(PORT, () => {
  console.log(`Cheft-Server läuft auf Port ${PORT}, Dateien aus ${DIST}`);
});
