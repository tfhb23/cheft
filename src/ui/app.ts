/**
 * Oberfläche: Menü, Spielfeld mit Sitzordnung, Drag & Drop, Animationen, Einstellungen.
 * Reines DOM ohne Framework.
 */
import { Card, isJoker, sortBySuit } from '../engine/cards';
import { Action, applyAction } from '../engine/actions';
import {
  GameState,
  PlayerInfo,
  Settings,
  checkDraw,
  checkLay,
  checkStealJoker,
  checkUndoDraw,
  current,
  layOffTargets,
  newGame,
  startNextRound,
  tableThreshold,
  winnerOfGame,
} from '../engine/game';
import { ALL_TYPES, ROMME_TYPES, Meld, MeldShape, findPartition, findAllPartitions, jokerRepresents, meldAugen, interpretMeld } from '../engine/melds';
import { decideAction } from '../bot/bot';
import { BotChoice, LEVELS, STYLES, resolveBots } from '../bot/names';
import { makeRng } from '../engine/cards';
import { t, cardName } from '../i18n';
import { h, clear } from './dom';
import { Atlas, buildAtlas, atlasOffset, backOf } from './sprites';
import { RULES_DE } from './rules';
import { snapshot, flip, flyClone, dealAnimation, RectMap } from './anim';
import { NetClient, LobbyInfo, ServerUpdate, ClaimableSeat, defaultServerUrl } from '../net/client';
import { RoundView } from '../engine/view';
import { play, setSoundEnabled, unlockAudio, vibrate } from './sound';

type Screen = 'menu' | 'setup' | 'rules' | 'game' | 'online' | 'lobby';
const ONLINE_KEY = 'cheft.online.v1';
const SAVE_KEY = 'cheft.save.v2';
const PREFS_KEY = 'cheft.prefs.v2';

interface Prefs {
  name: string;
  bots: number;
  rounds: number;
  firstTurn: boolean;
  speed: 'normal' | 'fast';
  vibration: boolean;
  sound: boolean;
  botChoices: BotChoice[];
  serverUrl: string;
  /** Bildschirm während des Spiels nicht ausgehen lassen. */
  keepAwake: boolean;
}

interface SaveFile {
  state: GameState;
  order: number[];
}

interface Drag {
  id: number;
  el: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  offX: number;
  offY: number;
  active: boolean;
  group: number[];
  over: HTMLElement | null;
}

type SeatPos = 'top' | 'left' | 'right';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ICON_BOOK = ['.########.', '.#..#....#', '.#..#....#', '.#..#....#', '.#..#....#', '.#..#....#', '.#..#....#', '.#..#....#', '.########.', '..........'];
const ICON_GEAR = ['....##....', '.#.####.#.', '.########.', '..##..##..', '###....###', '###....###', '..##..##..', '.########.', '.#.####.#.', '....##....'];

function pixelIcon(rows: string[]): HTMLElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 10 10');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '#') continue;
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', String(x));
      r.setAttribute('y', String(y));
      r.setAttribute('width', '1');
      r.setAttribute('height', '1');
      r.setAttribute('fill', 'currentColor');
      svg.appendChild(r);
    }
  });
  return svg as unknown as HTMLElement;
}

function hash(n: number): number {
  let x = (n + 1) * 2654435761;
  x = ((x >>> 13) ^ x) * 1274126177;
  return ((x >>> 16) ^ x) >>> 0;
}

export class App {
  private root: HTMLElement;
  private atlas: Atlas;
  private screen: Screen = 'menu';
  private state: GameState | null = null;
  private prefs: Prefs = {
    name: '',
    bots: 3,
    rounds: 7,
    firstTurn: true,
    speed: 'normal',
    vibration: true,
    sound: false,
    botChoices: [
      { level: 'random', style: 'random' },
      { level: 'random', style: 'random' },
      { level: 'random', style: 'random' },
    ],
    serverUrl: '',
    keepAwake: true,
  };
  /** Online: Verbindung, Raum und eigene Platznummer. */
  private net: NetClient | null = null;
  private online: { room: string; pid: number; token: string; lobby: LobbyInfo | null; status: 'connecting' | 'open' | 'closed' } | null = null;
  private joinCode = '';
  /** Laufendes Spiel: Plätze, die der Beitretende übernehmen kann. */
  private claimChoice: { room: string; seats: ClaimableSeat[] } | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private pendingBefore: RectMap | null = null;
  private lastRoundNo = 0;

  /** Eigene Platznummer: lokal immer 0, online vom Server. */
  private get me(): number {
    return this.online ? this.online.pid : 0;
  }
  private order: number[] = [];
  private fresh = new Set<number>();
  private selected = new Set<number>();
  private targetMode = false;
  private drag: Drag | null = null;
  private botGen = 0;
  private botsRunning = false;
  private dealing = false;
  private showSettings = false;
  private peekTable = false;
  private chooser: { title: string; hint: string; options: { shapes: MeldShape[]; label: string; onPick: () => void }[] } | null = null;
  private toastTimer: number | null = null;
  private rulesFrom: Screen = 'menu';

  constructor(root: HTMLElement) {
    this.root = root;
    this.atlas = buildAtlas();
    document.documentElement.style.setProperty('--atlas', `url(${this.atlas.url})`);
    this.loadPrefs();
    setSoundEnabled(this.prefs.sound);
    const save = this.loadSave();
    if (save) {
      this.state = save.state;
      this.order = save.order;
    }
    window.addEventListener('resize', () => {
      const a = document.activeElement;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
      this.render();
    });
    document.addEventListener('pointerdown', () => unlockAudio(), { passive: true });
    document.addEventListener('visibilitychange', () => void this.syncWakeLock());
    this.prewarm();
    this.render();
  }

  /** Weckt einen schlafenden Gratis-Server schon beim Start der App, damit er beim Beitreten bereit ist. */
  private prewarm(): void {
    const url = this.serverUrl();
    if (!url) return;
    try {
      const u = new URL(url);
      if (u.host === location.host) return; // gleiche Herkunft: Die Seite selbst hat den Server schon geweckt
      void fetch(`${u.protocol === 'wss:' ? 'https:' : 'http:'}//${u.host}/healthz`, { mode: 'no-cors', cache: 'no-store' }).catch(() => undefined);
    } catch {
      /* ungültige Adresse ignorieren */
    }
  }

  /** Hält den Bildschirm an, solange ein Spiel oder eine Lobby offen ist (sonst trennt das gesperrte Handy die Verbindung). */
  private async syncWakeLock(): Promise<void> {
    const want = this.prefs.keepAwake && (this.screen === 'game' || this.screen === 'lobby') && document.visibilityState === 'visible';
    try {
      if (!want) {
        if (this.wakeLock) {
          const l = this.wakeLock;
          this.wakeLock = null;
          await l.release();
        }
        return;
      }
      if (this.wakeLock && !this.wakeLock.released) return;
      if (!('wakeLock' in navigator)) return;
      const lock = await navigator.wakeLock.request('screen');
      this.wakeLock = lock;
      lock.addEventListener('release', () => {
        if (this.wakeLock === lock) this.wakeLock = null;
      });
    } catch {
      /* nicht unterstützt oder verweigert (z. B. Energiesparmodus) */
    }
  }

  // ------------------------------------------------------------ Persistenz
  private loadPrefs(): void {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) this.prefs = { ...this.prefs, ...JSON.parse(raw) };
    } catch {
      /* ignorieren */
    }
  }
  private savePrefs(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      /* ignorieren */
    }
    setSoundEnabled(this.prefs.sound);
  }
  private loadSave(): SaveFile | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return this.parseSave(raw);
    } catch {
      return null;
    }
  }
  private parseSave(raw: string): SaveFile | null {
    const s = JSON.parse(raw) as SaveFile;
    if (!s || !s.state || !s.state.round || s.state.finished) return null;
    return { state: s.state, order: Array.isArray(s.order) ? s.order : [] };
  }
  private save(): void {
    if (this.online) return;
    try {
      if (this.state && !this.state.finished) localStorage.setItem(SAVE_KEY, JSON.stringify({ state: this.state, order: this.order }));
      else localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignorieren */
    }
  }
  private exportSave(): void {
    if (!this.state) return;
    const code = btoa(unescape(encodeURIComponent(JSON.stringify({ state: this.state, order: this.order }))));
    const show = () => prompt(t('save.show'), code);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(
        () => this.toast(t('save.copied')),
        () => show(),
      );
    } else show();
  }
  private importSave(): void {
    const code = prompt(t('save.prompt'));
    if (!code) return;
    try {
      const raw = decodeURIComponent(escape(atob(code.trim())));
      const s = this.parseSave(raw);
      if (!s) throw new Error('invalid');
      this.state = s.state;
      this.order = s.order;
      this.save();
      this.toast(t('save.imported'));
      this.continueGame();
    } catch {
      this.toast(t('save.invalid'), true);
    }
  }

  // ------------------------------------------------------------ Rendern
  private render(): void {
    if (this.drag) return; // während des Ziehens nicht neu aufbauen
    const tableEl = this.root.querySelector('.table');
    const scroll = tableEl ? tableEl.scrollTop : 0;
    clear(this.root);
    switch (this.screen) {
      case 'menu':
        this.root.appendChild(this.renderMenu());
        break;
      case 'setup':
        this.root.appendChild(this.renderSetup());
        break;
      case 'rules':
        this.root.appendChild(this.renderRules());
        break;
      case 'online':
        this.root.appendChild(this.renderOnline());
        break;
      case 'lobby':
        this.root.appendChild(this.renderLobby());
        break;
      case 'game':
        this.root.appendChild(this.renderGame());
        this.layoutHand();
        this.layoutTable();
        const nt = this.root.querySelector('.table');
        if (nt) nt.scrollTop = scroll;
        break;
    }
    void this.syncWakeLock();
  }

  private cardEl(
    card: Card | 'back' | 'back2' | 'slot',
    opts: { selected?: boolean; onClick?: () => void; glow?: boolean; dim?: boolean; title?: string; small?: boolean; mini?: boolean; fresh?: boolean; cls?: string } = {},
  ): HTMLElement {
    const off = atlasOffset(this.atlas.index(card));
    const sc = opts.mini ? '1' : opts.small ? 'var(--so)' : 'var(--s)';
    const el = h('div', {
      class: `card${opts.small ? ' o' : ''}${opts.mini ? ' mini' : ''}${opts.selected ? ' selected' : ''}${opts.onClick ? ' clickable' : ''}${opts.glow ? ' glow' : ''}${opts.dim ? ' dim' : ''}${opts.fresh ? ' fresh' : ''}${opts.cls ? ' ' + opts.cls : ''}`,
      style: { backgroundPosition: `calc(${-off.x}px * ${sc}) calc(${-off.y}px * ${sc})` },
      title: opts.title ?? (typeof card === 'string' ? '' : cardName(card)),
      onclick: opts.onClick,
    });
    if (typeof card !== 'string' && !opts.mini) el.dataset.cardId = String(card.id);
    return el;
  }

  // ------------------------------------------------------------ Menü
  private renderMenu(): HTMLElement {
    const demo: Card[] = [
      { id: -1, suit: 'H', rank: 13 },
      { id: -2, suit: 'J', rank: 0 },
      { id: -3, suit: 'S', rank: 12 },
    ];
    const hasSave = !!this.state && !this.state.finished;
    return h(
      'div',
      { class: 'menu' },
      h('div', { class: 'logo' }, h('div', { class: 'logo-cards' }, ...demo.map((c) => this.cardEl(c))), h('h1', null, t('app.title')), h('div', { class: 'muted' }, t('app.subtitle'))),
      h(
        'div',
        { class: 'panel' },
        hasSave && h('button', { class: 'btn primary', onclick: () => this.continueGame() }, t('btn.continue')),
        h('button', { class: `btn${hasSave ? '' : ' primary'}`, onclick: () => this.goto('setup') }, t('btn.newGame')),
        h('button', { class: 'btn', onclick: () => this.goto('online') }, t('btn.online')),
        this.storedOnline() ? h('button', { class: 'btn', onclick: () => this.resumeOnline() }, t('lobby.backToLobby')) : null,
        h('button', { class: 'btn', onclick: () => this.showRules('menu') }, t('btn.rules')),
        h('button', { class: 'btn small', onclick: () => this.importSave() }, t('btn.importSave')),
      ),
      h('div', { class: 'muted small-text' }, t('setup.online')),
    );
  }

  private choice(label: string, values: { v: unknown; label: string }[], get: () => unknown, set: (v: unknown) => void): HTMLElement {
    return h(
      'div',
      { class: 'option' },
      h('div', { class: 'muted' }, label),
      h(
        'div',
        { class: 'choices' },
        ...values.map((o) =>
          h(
            'button',
            {
              class: `btn${get() === o.v ? ' primary' : ''}`,
              onclick: () => {
                set(o.v);
                this.savePrefs();
                this.render();
              },
            },
            o.label,
          ),
        ),
      ),
    );
  }

  private renderSetup(): HTMLElement {
    const nameInput = h('input', {
      class: 'text',
      type: 'text',
      maxlength: '12',
      value: this.prefs.name,
      placeholder: t('you'),
      oninput: (e: Event) => {
        this.prefs.name = (e.target as HTMLInputElement).value;
        this.savePrefs();
      },
    });
    return h(
      'div',
      { class: 'menu' },
      h('h2', null, t('btn.newGame')),
      h(
        'div',
        { class: 'panel' },
        h('div', { class: 'option' }, h('div', { class: 'muted' }, t('setup.name')), nameInput),
        this.choice(t('setup.bots'), [{ v: 2, label: '2' }, { v: 3, label: '3' }], () => this.prefs.bots, (v) => (this.prefs.bots = v as number)),
        ...this.prefs.botChoices.slice(0, this.prefs.bots).map((c, i) => this.botRow(c, i)),
        h(
          'button',
          {
            class: 'btn small',
            onclick: () => {
              this.prefs.botChoices = this.prefs.botChoices.map(() => ({ level: 'random', style: 'random' }));
              this.savePrefs();
              this.render();
            },
          },
          t('setup.allRandom'),
        ),
        this.choice(t('setup.rounds'), [{ v: 7, label: '7' }, { v: 11, label: '11' }], () => this.prefs.rounds, (v) => (this.prefs.rounds = v as number)),
        this.choice(
          t('setup.firstTurn'),
          [
            { v: true, label: t('setup.yes') },
            { v: false, label: t('setup.no') },
          ],
          () => this.prefs.firstTurn,
          (v) => (this.prefs.firstTurn = v as boolean),
        ),
        h('div', { class: 'muted small-text' }, `${t('setup.direction')}: ${t('setup.ccw')}`),
        h('button', { class: 'btn primary', onclick: () => this.startGame() }, t('btn.start')),
        h('button', { class: 'btn', onclick: () => this.goto('menu') }, t('btn.back')),
      ),
    );
  }

  /** Eine Zeile je Gegner: Stufe und Spielweise durchschalten, "Überraschung" verbirgt die Rolle. */
  private botRow(c: BotChoice, i: number): HTMLElement {
    const cycle = <T extends string>(list: readonly T[], cur: T | 'random'): T | 'random' => {
      const all: (T | 'random')[] = ['random', ...list];
      return all[(all.indexOf(cur) + 1) % all.length];
    };
    const levelLabel = c.level === 'random' ? t('setup.random') : t(`level.${c.level}`);
    const styleLabel = c.style === 'random' ? t('setup.random') : t(`style.${c.style}`);
    return h(
      'div',
      { class: 'option' },
      h('div', { class: 'muted' }, t(this.prefs.bots === 3 ? ['seat.right', 'seat.top', 'seat.left'][i] : ['seat.right', 'seat.left'][i])),
      h(
        'div',
        { class: 'choices' },
        h(
          'button',
          {
            class: `btn small${c.level === 'random' ? '' : ' primary'}`,
            onclick: () => {
              c.level = cycle(LEVELS, c.level);
              this.savePrefs();
              this.render();
            },
          },
          `${t('setup.level')}: ${levelLabel}`,
        ),
        h(
          'button',
          {
            class: `btn small${c.style === 'random' ? '' : ' primary'}`,
            onclick: () => {
              c.style = cycle(STYLES, c.style);
              this.savePrefs();
              this.render();
            },
          },
          `${t('setup.style')}: ${styleLabel}`,
        ),
      ),
    );
  }

  private renderRules(): HTMLElement {
    return h(
      'div',
      { class: 'game' },
      h('div', { class: 'topbar' }, h('button', { class: 'btn small', onclick: () => this.goto(this.rulesFrom) }, t('btn.back')), h('h2', null, t('btn.rules'))),
      h('div', { class: 'rules' }, ...RULES_DE.map((sec) => h('div', null, h('h3', null, sec.title), h('ul', null, ...sec.items.map((i) => h('li', null, i)))))),
    );
  }

  private goto(screen: Screen): void {
    this.screen = screen;
    this.showSettings = false;
    this.render();
  }

  private showRules(from: Screen): void {
    this.rulesFrom = from;
    this.showSettings = false;
    this.goto('rules');
  }

  // ------------------------------------------------------------ Spielsteuerung
  private startGame(): void {
    const name = this.prefs.name.trim() || t('you');
    const players: PlayerInfo[] = [{ id: 0, name, isBot: false }];
    const bots = resolveBots(this.prefs.botChoices.slice(0, this.prefs.bots), makeRng(Date.now() % 2147483647));
    bots.forEach((b, i) => players.push({ id: i + 1, name: b.name, isBot: true, bot: { level: b.level, style: b.style } }));
    const settings: Settings = { rounds: this.prefs.rounds, firstTurnOpenAllowed: this.prefs.firstTurn, direction: 'ccw' };
    this.state = newGame(players, settings);
    this.order = [];
    this.fresh.clear();
    this.selected.clear();
    this.targetMode = false;
    this.botGen++;
    this.save();
    this.screen = 'game';
    void this.startRoundWithDeal();
  }

  private continueGame(): void {
    if (!this.state) return;
    this.selected.clear();
    this.fresh.clear();
    this.targetMode = false;
    this.botGen++;
    this.goto('game');
    this.fresh.clear();
    this.render();
    void this.runBots();
  }

  private async startRoundWithDeal(): Promise<void> {
    this.dealing = true;
    this.render();
    const stock = this.root.querySelector('.stock-wrap > .card');
    const targets: DOMRect[] = [];
    this.root.querySelectorAll<HTMLElement>('[data-seat]').forEach((el) => targets.push(el.getBoundingClientRect()));
    const hand = this.root.querySelector('.hand');
    if (hand) targets.push(hand.getBoundingClientRect());
    const s = this.scale();
    await dealAnimation(stock ? stock.getBoundingClientRect() : null, targets, 7, 32 * s, 44 * s);
    this.dealing = false;
    play('card');
    this.render();
    void this.runBots();
  }

  private quitGame(): void {
    if (!confirm(t('confirm.quit'))) return;
    this.state = null;
    this.botGen++;
    this.save();
    this.goto('menu');
  }

  private saveAndQuit(): void {
    this.save();
    this.botGen++;
    this.goto('menu');
  }

  private pileRect(source: 'stock' | 'discard' | 'carpet'): DOMRect | null {
    const sel = source === 'stock' ? '.stock-wrap > .card' : source === 'discard' ? '.discard .card:last-child' : '.carpet .card';
    const el = this.root.querySelector(sel);
    return el ? el.getBoundingClientRect() : null;
  }

  private seatRect(pid: number): DOMRect | null {
    const el = this.root.querySelector(`[data-seat="${pid}"]`);
    return el ? el.getBoundingClientRect() : null;
  }

  private act(action: Action): boolean {
    const s = this.state!;
    const before = snapshot(this.root);
    const appearFrom = action.kind === 'draw' ? this.pileRect(action.source) : null;
    if (this.online) {
      // Lokal nur prüfen, ausführen tut der Server.
      const probe = applyAction(structuredClone(s), this.me, action);
      if (!probe.ok) {
        this.toast(t(probe.error, probe.params), true);
        play('error');
        return false;
      }
      if (!this.net || !this.net.connected) {
        this.toast(t('net.disconnected'), true);
        return false;
      }
      this.pendingBefore = before;
      this.pendingAppearFrom = appearFrom;
      this.net.action(action);
      this.afterOwnAction(action, s);
      return true;
    }
    const res = applyAction(s, this.me, action);
    if (!res.ok) {
      this.toast(t(res.error, res.params), true);
      play('error');
      return false;
    }
    this.afterOwnAction(action, s);
    this.save();
    this.render();
    if (s.round.ended) this.onRoundEnded();
    else void flip(this.root, before, { appearFrom });
    void this.runBots();
    return true;
  }

  private pendingAppearFrom: DOMRect | null = null;

  private afterOwnAction(action: Action, s: GameState): void {
    this.targetMode = false;
    if (action.kind === 'steal' && !this.online) this.selected = new Set([s.round.turn.pendingJokerId ?? -1]);
    if (action.kind === 'discard' || action.kind === 'lay' || action.kind === 'layOff') {
      if (!this.online) {
        const hand = new Set(s.round.players[this.me].hand.map((c) => c.id));
        for (const id of [...this.selected]) if (!hand.has(id)) this.selected.delete(id);
      } else this.selected.clear();
    }
    if (action.kind === 'discard') this.fresh.clear();
    if (action.kind === 'draw') {
      play('card');
      vibrate(10, this.prefs.vibration);
    } else if (action.kind === 'discard') {
      play('discard');
      vibrate(15, this.prefs.vibration);
    } else if (action.kind === 'lay' || action.kind === 'layOff' || action.kind === 'steal') play('lay');
  }

  private onRoundEnded(): void {
    const r = this.state!.round.result!;
    if (r.winner === this.me) play('win');
    vibrate(30, this.prefs.vibration);
  }

  private botDelay(): number {
    return this.prefs.speed === 'fast' ? 650 : 1300;
  }

  private async runBots(): Promise<void> {
    if (this.botsRunning || this.online) return;
    this.botsRunning = true;
    const gen = this.botGen;
    try {
      while (this.state && gen === this.botGen && this.screen === 'game' && !this.state.round.ended && !this.dealing) {
        if (this.state.round.waiting) {
          const r = this.state.round;
          const pending = this.state.players.filter((p) => p.isBot && !r.ready[p.id]);
          if (pending.length === 0) break; // auf den Menschen warten
          await sleep(900 + Math.floor(Math.random() * 1200));
          if (gen !== this.botGen || !this.state) break;
          applyAction(this.state, pending[0].id, { kind: 'ready' });
          this.save();
          if (!this.drag) this.render();
          if (!this.state.round.waiting) play('card');
          continue;
        }
        const pid = current(this.state);
        if (!this.state.players[pid].isBot) break;
        await sleep(this.botDelay());
        if (gen !== this.botGen || !this.state || this.drag) {
          if (this.drag) {
            // Während der Mensch sortiert, kurz warten
            await sleep(200);
            continue;
          }
          break;
        }
        const action = decideAction(this.state, pid);
        const before = snapshot(this.root);
        const seat = this.seatRect(pid);
        const stockRect = action.kind === 'draw' && action.source === 'stock' ? this.pileRect('stock') : null;
        const res = applyAction(this.state, pid, action);
        if (!res.ok) {
          console.error('Bot-Fehler', action, res.error);
          const hand = this.state.round.players[pid].hand;
          applyAction(this.state, pid, { kind: 'discard', cardId: hand[hand.length - 1].id });
        }
        this.save();
        this.render();
        if (action.kind === 'draw') {
          play('card');
          if (stockRect && seat) {
            const botHand = this.state.round.players[pid].hand;
            const ghost = this.cardEl(botHand.length ? backOf(botHand[botHand.length - 1]) : 'back');
            ghost.classList.add('fly');
            document.body.appendChild(ghost);
            const to = new DOMRect(seat.left + seat.width / 2 - stockRect.width / 2, seat.top + seat.height / 2 - stockRect.height / 2, stockRect.width, stockRect.height);
            void flyClone(ghost, stockRect, to, 260, true).then(() => ghost.remove());
            ghost.remove();
          } else void flip(this.root, before, { disappearTo: seat });
        } else {
          play(action.kind === 'discard' ? 'discard' : 'lay');
          if (!this.state.round.ended) void flip(this.root, before, { appearFrom: seat, disappearTo: seat });
        }
        if (this.state.round.ended) this.onRoundEnded();
        // Nach einem Abwurf etwas länger zeigen, was liegt.
        if (action.kind === 'discard') await sleep(this.prefs.speed === 'fast' ? 250 : 700);
      }
    } finally {
      this.botsRunning = false;
    }
  }

  private nextRound(): void {
    if (!this.state) return;
    if (this.online) {
      if (this.state.finished) this.net?.backToLobby();
      else this.net?.nextRound();
      return;
    }
    if (this.state.finished) {
      this.state = null;
      this.save();
      this.goto('menu');
      return;
    }
    startNextRound(this.state);
    this.selected.clear();
    this.fresh.clear();
    this.order = [];
    this.targetMode = false;
    this.peekTable = false;
    this.chooser = null;
    this.save();
    void this.startRoundWithDeal();
  }

  private toast(msg: string, error = false): void {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const el = h('div', { class: `toast${error ? ' error' : ''}` }, msg);
    document.body.appendChild(el);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.remove(), 3200);
  }

  private scale(): number {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 2;
  }

  // ------------------------------------------------------------ Spielfeld
  private seats(): { pid: number; pos: SeatPos }[] {
    const s = this.state!;
    const n = s.players.length;
    const others: number[] = [];
    for (let i = 1; i < n; i++) others.push((this.me + i) % n);
    // Gegen den Uhrzeigersinn: nach dem Menschen (unten) kommt rechts, dann gegenüber, dann links.
    if (n === 4) return [{ pid: others[0], pos: 'right' }, { pid: others[1], pos: 'top' }, { pid: others[2], pos: 'left' }];
    if (n === 3) return [{ pid: others[0], pos: 'right' }, { pid: others[1], pos: 'left' }];
    return [{ pid: others[0], pos: 'top' }];
  }

  private renderGame(): HTMLElement {
    const s = this.state!;
    const r = s.round;
    const me = r.players[this.me];
    const myTurn = current(s) === this.me && !r.ended;
    const drawPhase = myTurn && r.turn.phase === 'draw';
    const playPhase = myTurn && r.turn.phase === 'play';

    // Handreihenfolge abgleichen
    const handIds = me.hand.map((c) => c.id);
    const have = new Set(handIds);
    this.order = this.order.filter((id) => have.has(id));
    const known = new Set(this.order);
    const added = handIds.filter((id) => !known.has(id));
    if (this.order.length === 0) this.order = sortBySuit(me.hand).map((c) => c.id);
    else this.order.push(...added);
    if (myTurn) {
      for (const id of added) {
        if (id === r.turn.drawnCardId || id === r.turn.pendingJokerId) this.fresh.add(id);
      }
    }
    for (const id of [...this.fresh]) if (!have.has(id)) this.fresh.delete(id);

    const header = h(
      'div',
      { class: 'topbar' },
      h('span', { class: 'accent' }, t('round', { n: r.no, total: s.settings.rounds })),
      h('span', { class: 'muted' }, ` · ${s.players[this.me].name}: ${s.totals[this.me]} P.`),
      h('span', null, ' ', h('span', { class: `badge${me.mode === 'cheft' ? ' cheft' : ''}` }, t(`mode.${me.mode}`)), ' ', h('span', { class: `badge${me.opened ? ' open' : ''}` }, t(me.opened ? 'status.opened' : 'status.notOpened'))),
      h(
        'div',
        { class: 'icons' },
        h('button', { class: 'btn icon', title: t('btn.rules'), onclick: () => this.showRules('game') }, pixelIcon(ICON_BOOK)),
        h(
          'button',
          {
            class: 'btn icon',
            title: t('btn.settings'),
            onclick: () => {
              this.showSettings = true;
              this.render();
            },
          },
          pixelIcon(ICON_GEAR),
        ),
      ),
    );

    const opponents = h(
      'div',
      { class: 'opponents' },
      ...[...this.seats()]
        .sort((a, b) => ['left', 'top', 'right'].indexOf(a.pos) - ['left', 'top', 'right'].indexOf(b.pos))
        .map((seat) => s.players[seat.pid])
        .map((p) => {
          const pr = r.players[p.id];
          return h(
            'div',
            { class: `opp${current(s) === p.id && !r.ended ? ' current' : ''}` },
            h('div', { class: 'name' }, h('span', null, p.name), h('span', { class: 'muted pts' }, `${s.totals[p.id]} P.`)),
            h('div', { class: 'row-compact' }, h('span', { class: `badge${pr.mode === 'cheft' ? ' cheft' : ''}` }, t(`mode.${pr.mode}`)), ' ', h('span', { class: `badge${pr.opened ? ' open' : ''}` }, t(pr.opened ? 'status.opened' : 'status.notOpened')), h('span', { class: 'cnt' }, h('span', { class: 'minicard' }), `${pr.hand.length}`)),
          );
        }),
    );

    // Ziele für Anlegen / Klauen
    const selectedCards = me.hand.filter((c) => this.selected.has(c.id));
    const singleSel = selectedCards.length === 1 ? selectedCards[0] : null;
    const targets = playPhase && singleSel && this.targetMode ? layOffTargets(s, this.me, singleSel.id) : [];
    const targetIds = new Set(targets.map((x) => x.meld.id));
    const stealable = new Set<number>();
    if (playPhase && singleSel && !isJoker(singleSel) && me.opened) {
      for (const m of r.melds) m.cards.forEach((c, i) => isJoker(c) && checkStealJoker(s, this.me, m.id, i, singleSel.id).ok && stealable.add(m.id));
    }

    // Tisch
    const table = h('div', { class: 'table' });
    // Offene Startkarte: liegt im Auslagebereich des Startspielers (dort ist in dieser Phase noch nichts ausgelegt).
    const starterCard = r.waiting ? ((r as RoundView).openCard ?? r.players[r.starter].hand.find((c) => c.id === r.turn.drawnCardId)) : undefined;
    const openCardEl = (): HTMLElement | null =>
      starterCard
        ? h('div', { class: 'pile open-card' }, this.cardEl(starterCard, { glow: true, title: cardName(starterCard) }), h('span', null, t('wait.openCard', { name: r.starter === this.me ? t('you') : s.players[r.starter].name })))
        : null;
    const showFan = window.innerWidth >= 900;
    for (const seat of this.seats()) {
      const pr = r.players[seat.pid];
      const melds = r.melds.filter((m) => m.owner === seat.pid);
      const meldsEl = h('div', { class: 'melds' }, ...melds.map((m) => this.meldEl(m, targetIds.has(m.id), stealable.has(m.id), true)), seat.pid === r.starter ? openCardEl() : null);
      const label = h('div', { class: 'seat-label' }, `${s.players[seat.pid].name} · ${t('cards.count', { n: pr.hand.length })}`);
      const fan = showFan && pr.hand.length ? h('div', { class: 'fan' }, ...pr.hand.map((c) => this.cardEl(backOf(c), { small: true }))) : null;
      const inner =
        seat.pos === 'top'
          ? h('div', { class: 'seat-inner' }, fan ? h('div', { class: 'flip180' }, fan) : null, h('div', { class: 'flip180' }, meldsEl), label)
          : h('div', { class: 'seat-inner' }, meldsEl, label, fan);
      const wrap = h('div', { class: `seat seat-${seat.pos}${current(s) === seat.pid && !r.ended ? ' current' : ''}`, dataset: { seat: String(seat.pid), pos: seat.pos } }, inner);
      table.appendChild(wrap);
    }

    // Stapel in der Mitte
    const canStock = drawPhase && checkDraw(s, this.me, 'stock').ok;
    const canDiscardDraw = drawPhase && checkDraw(s, this.me, 'discard').ok;
    const canCarpet = drawPhase && checkDraw(s, this.me, 'carpet').ok;
    const stockWrap = h(
      'div',
      { class: 'stock-wrap' },
      r.carpet
        ? h('div', { class: 'carpet' }, this.cardEl(r.carpet, { glow: canCarpet, dim: drawPhase && !canCarpet, onClick: drawPhase ? () => this.act({ kind: 'draw', source: 'carpet' }) : undefined, title: `${t('carpet')}: ${cardName(r.carpet)}` }))
        : null,
      this.stockEl(canStock, drawPhase),
      r.stock.length > 0 && r.stock.length <= 7 ? h('div', { class: 'count-on-card' }, String(r.stock.length)) : null,
    );
    const discardCards = r.discard.slice(-6);
    const discard = h(
      'div',
      { class: 'discard' },
      discardCards.length === 0 ? this.cardEl('slot', { cls: 'slot-hint', onClick: playPhase && singleSel ? () => this.act({ kind: 'discard', cardId: singleSel.id }) : undefined }) : null,
      ...discardCards.map((c, i) => {
        const top = i === discardCards.length - 1;
        const hsh = hash(c.id);
        const rot = (hsh % 45) - 22;
        const dx = ((hsh >> 6) % 15) - 5;
        const dy = ((hsh >> 11) % 15) - 7;
        const el = this.cardEl(c, {
          glow: top && canDiscardDraw,
          onClick: top ? (drawPhase ? () => this.act({ kind: 'draw', source: 'discard' }) : playPhase && singleSel ? () => this.act({ kind: 'discard', cardId: singleSel.id }) : undefined) : undefined,
        });
        el.style.transform = `translate(calc(${dx}px * var(--s)), calc(${dy}px * var(--s))) rotate(${rot}deg)`;
        el.style.zIndex = String(i);
        return el;
      }),
    );
    const center = h(
      'div',
      { class: 'center' },
      h('div', { class: 'piles' }, h('div', { class: 'pile' }, stockWrap, h('span', null, t('stock'))), h('div', { class: 'pile' }, discard, h('span', null, t('discard')))),
    );
    table.appendChild(center);

    // Eigene Auslage
    const myMelds = r.melds.filter((m) => m.owner === this.me);
    const own = h(
      'div',
      { class: 'own', dataset: { seat: String(this.me) } },
      h('div', { class: 'own-label' }, myMelds.length ? `${t('you')} (${t(`mode.${me.mode}`)})` : playPhase && selectedCards.length >= 2 ? t('drop.lay') : ''),
      h('div', { class: 'melds' }, ...myMelds.map((m) => this.meldEl(m, targetIds.has(m.id), stealable.has(m.id), false)), this.me === r.starter ? openCardEl() : null),
    );
    table.appendChild(own);

    // Status
    let msg = '';
    if (r.ended) msg = '';
    else if (r.waiting) {
      const waitingFor = s.players.filter((p) => !r.ready[p.id] && p.id !== this.me).map((p) => p.name);
      msg = r.ready[this.me] ? t('wait.others', { names: waitingFor.join(', ') }) : t('wait.sorting');
    } else if (!myTurn) {
      const last = r.log[r.log.length - 1];
      msg = last && last.player !== undefined ? this.logText(last) : t('turn.bot', { name: s.players[current(s)].name });
    } else if (drawPhase) msg = r.finalTurn ? t('turn.you.final') : t('turn.you.draw');
    else if (r.turn.pendingJokerId !== null) msg = t('turn.you.joker');
    else if (r.turn.mustOpenWithId !== null && !r.turn.openedThisTurn) msg = t('turn.you.mustOpen');
    else if (r.turn.mustPairWithId !== null && !r.turn.openedThisTurn) msg = t('turn.you.carpet');
    else if (r.turn.mustUseId !== null && me.hand.some((c) => c.id === r.turn.mustUseId)) msg = t('turn.you.mustUse');
    else if (this.targetMode) msg = t('target.pick');
    else msg = t('turn.you.play');
    let info = t('threshold', { n: tableThreshold(s) });
    if (selectedCards.length >= 3 && !me.opened && me.mode === 'romme') {
      const part = findPartition(selectedCards, { types: ROMME_TYPES });
      if (part) info = `${t('selected.augen', { n: part.augen })} · ${info}`;
    }
    const status = h('div', { class: 'status' }, h('span', { class: 'msg' }, msg), h('span', { class: 'info' }, info));

    // Hand
    const byId = new Map(me.hand.map((c) => [c.id, c]));
    const handEl = h(
      'div',
      { class: `hand${this.dealing ? ' dealing' : ''}` },
      ...this.order.map((id) => {
        const c = byId.get(id)!;
        const mustId = myTurn ? (r.turn.mustOpenWithId ?? r.turn.mustPairWithId ?? r.turn.mustUseId) : null;
        const el = this.cardEl(c, { selected: this.selected.has(id), fresh: this.fresh.has(id) && id !== mustId, cls: id === mustId ? 'must' : undefined });
        el.classList.add('clickable');
        el.addEventListener('pointerdown', (e) => this.onPointerDown(e, id, el));
        el.addEventListener('pointermove', (e) => this.onPointerMove(e));
        el.addEventListener('pointerup', (e) => this.onPointerUp(e));
        el.addEventListener('pointercancel', () => this.endDrag(null));
        return el;
      }),
    );

    const btn = (label: string, onclick: () => void, opts: { disabled?: boolean; cls?: string } = {}) => h('button', { class: `btn ${opts.cls ?? ''}`, disabled: opts.disabled, onclick }, label);
    const canCheft = myTurn && !me.opened && me.mode === 'romme' && r.turn.mustOpenWithId === null;
    const actions = r.waiting
      ? h('div', { class: 'actions' }, btn(t('btn.ready'), () => this.act({ kind: 'ready' }), { disabled: r.ready[this.me], cls: 'primary' }))
      : h(
      'div',
      { class: 'actions' },
      btn(t('btn.lay'), () => this.laySelected([...this.selected]), { disabled: !playPhase || selectedCards.length < 2, cls: 'primary' }),
      btn(t('btn.layOff'), () => this.layOffSelected(), { disabled: !playPhase || !singleSel || !me.opened }),
      btn(t('btn.discard'), () => singleSel && this.act({ kind: 'discard', cardId: singleSel.id }), { disabled: !playPhase || !singleSel }),
      playPhase && checkUndoDraw(s, this.me).ok
        ? btn(t('btn.undoDraw'), () => this.act({ kind: 'undoDraw' }), { cls: 'dark' })
        : btn(t('btn.cheft'), () => this.declareCheft(), { disabled: !canCheft, cls: 'dark' }),
    );

    const game = h('div', { class: 'game' }, header, opponents, table, status, h('div', { class: 'hand-wrap' }, handEl), actions);
    if (r.ended) game.appendChild(this.peekTable ? this.renderEndBar() : this.renderRoundEnd());
    else if (this.chooser) game.appendChild(this.renderChooser());
    else if (this.showSettings) game.appendChild(this.renderSettings());
    if (this.online?.lobby?.paused) game.appendChild(this.renderPause(this.online.lobby));
    return game;
  }

  /** Nachziehstapel mit sichtbarer Dicke (eine Kante je angefangene sechs Karten). */
  private stockEl(glow: boolean, clickable: boolean): HTMLElement {
    const r = this.state!.round;
    const n = r.stock.length;
    const el = this.cardEl(n ? backOf(r.stock[n - 1]) : 'slot', { glow, onClick: clickable ? () => this.act({ kind: 'draw', source: 'stock' }) : undefined });
    if (n > 0) {
      const s = this.scale();
      const layers = Math.min(7, Math.ceil(n / 8));
      const shadows: string[] = [];
      for (let i = 1; i <= layers; i++) shadows.push(`${i * s}px ${i * s}px 0 0 var(--cream)`, `${i * s}px ${i * s}px 0 1px var(--sand-dark)`);
      el.style.boxShadow = shadows.reverse().join(', ');
      el.style.marginBottom = `${layers * s}px`;
      el.style.marginRight = `${layers * s}px`;
    }
    return el;
  }

  private meldEl(m: Meld, isTarget: boolean, isStealable: boolean, small: boolean): HTMLElement {
    const s = this.state!;
    const playPhase = current(s) === this.me && s.round.turn.phase === 'play' && !s.round.ended;
    const onClick = playPhase ? () => this.tapMeld(m) : undefined;
    const el = h(
      'div',
      {
        class: `meld${m.type === 'pair' ? ' pair' : ''}${isTarget ? ' target' : ''}${isStealable ? ' stealable' : ''}${onClick ? ' clickable' : ''}`,
        onclick: onClick,
        title: `${t(`mode.${m.type === 'pair' ? 'cheft' : 'romme'}`)} · ${meldAugen(m)}`,
        dataset: { meldId: String(m.id) },
      },
      ...m.cards.map((c, i) => {
        let title = cardName(c);
        if (isJoker(c)) {
          const rep = jokerRepresents(m, i);
          if (rep) title = `${t('card.joker')} = ${cardName({ id: -1, suit: rep.suit, rank: rep.rank })}`;
        }
        return this.cardEl(c, { title, small });
      }),
    );
    return el;
  }

  private logText(e: { key: string; player?: number; params?: Record<string, string | number> }): string {
    const s = this.state!;
    const params: Record<string, string | number> = { ...(e.params ?? {}) };
    if (e.player !== undefined) params.name = e.player === this.me ? t('you') : s.players[e.player].name;
    if (e.key === 'log.discard') {
      const top = s.round.discard[s.round.discard.length - 1];
      params.card = top ? cardName(top) : '';
    }
    return t(e.key, params);
  }

  /** Sitzgrößen: gedrehte Auslagen brauchen vertauschte Breite/Höhe; Gegnerkarten schrumpfen nur bei Platzmangel. */
  private layoutTable(): void {
    const table = this.root.querySelector('.table') as HTMLElement | null;
    if (!table) return;
    const s = this.scale();
    const seats = Array.from(table.querySelectorAll<HTMLElement>('.seat'));
    if (seats.length === 0) return;
    const sides = seats.filter((e) => e.classList.contains('seat-left') || e.classList.contains('seat-right'));
    const top = table.querySelector('.seat-top') as HTMLElement | null;
    const own = table.querySelector('.own') as HTMLElement | null;
    const W = table.clientWidth - 4 * s;
    const H = table.clientHeight - 4 * s;
    const pilesMin = (32 + 12 + 10 + 32 + 26 + 10) * s;
    const minMid = (44 + 28) * s;
    const small = Math.max(1, s - 1);
    const setScale = (el: HTMLElement, v: number) => el.style.setProperty('--so', String(v));
    seats.forEach((e) => setScale(e, s));
    const layoutSides = () => {
      const topH = top ? top.offsetHeight : 0;
      const ownH = own ? own.offsetHeight : 0;
      const M = Math.max(minMid, H - topH - ownH);
      let depth = 0;
      for (const side of sides) {
        const inner = side.querySelector('.seat-inner') as HTMLElement;
        inner.style.width = `${M}px`;
        const d = inner.offsetHeight;
        side.style.width = `${d}px`;
        side.style.height = `${M}px`;
        depth += d;
      }
      return { M, depth, free: H - topH - ownH };
    };
    let g = layoutSides();
    const tooWide = sides.length > 0 && W - g.depth < pilesMin;
    const tooHigh = !!top && g.free < minMid;
    if (tooWide || tooHigh) {
      seats.forEach((e) => setScale(e, small));
      g = layoutSides();
    }
  }

  private handGeometry(): { cw: number; ch: number; W: number; step: number; rows: number; perRow: number; n: number; s: number } | null {
    const handEl = this.root.querySelector('.hand') as HTMLElement | null;
    if (!handEl) return null;
    const n = this.order.length;
    const s = this.scale();
    const cw = 32 * s;
    const ch = 44 * s;
    const W = handEl.clientWidth;
    const minStep = 15 * s;
    const maxStep = cw + 2 * s;
    let rows = 1;
    let step = n > 1 ? Math.min(maxStep, (W - cw) / (n - 1)) : maxStep;
    if (step < minStep && n > 1) {
      rows = 2;
      const perRow = Math.ceil(n / 2);
      step = perRow > 1 ? Math.min(maxStep, (W - cw) / (perRow - 1)) : maxStep;
    }
    const perRow = rows === 2 ? Math.ceil(n / 2) : n;
    return { cw, ch, W, step, rows, perRow, n, s };
  }

  private slotPos(i: number, g: NonNullable<ReturnType<App['handGeometry']>>): { x: number; y: number } {
    const row = Math.floor(i / g.perRow);
    const col = i % g.perRow;
    const countInRow = row === 0 ? g.perRow : g.n - g.perRow;
    const rowWidth = (countInRow - 1) * g.step + g.cw;
    const x = (g.W - rowWidth) / 2 + col * g.step;
    const y = g.rows === 2 ? row * (g.ch + 4 * g.s) : 6 * g.s;
    return { x: Math.round(x), y: Math.round(y) };
  }

  private layoutHand(): void {
    const handEl = this.root.querySelector('.hand') as HTMLElement | null;
    const g = this.handGeometry();
    if (!handEl || !g) return;
    handEl.classList.toggle('two-rows', g.rows === 2);
    const els = new Map<number, HTMLElement>();
    handEl.querySelectorAll<HTMLElement>('[data-card-id]').forEach((el) => els.set(Number(el.dataset.cardId), el));
    this.order.forEach((id, i) => {
      const el = els.get(id);
      if (!el) return;
      el.style.zIndex = String(i + 1);
      if (this.drag && this.drag.active && this.drag.id === id) return;
      const p = this.slotPos(i, g);
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
    });
  }

  // ------------------------------------------------------------ Drag & Drop
  private onPointerDown(e: PointerEvent, id: number, el: HTMLElement): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const rect = el.getBoundingClientRect();
    this.drag = { id, el, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, offX: e.clientX - rect.left, offY: e.clientY - rect.top, active: false, group: [id], over: null };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignorieren */
    }
    e.preventDefault();
  }

  private onPointerMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (Math.hypot(dx, dy) < 7) return;
      d.active = true;
      d.el.classList.add('dragging');
      this.fresh.delete(d.id);
      d.el.classList.remove('fresh');
      if (this.selected.has(d.id) && this.selected.size > 1) {
        d.group = this.order.filter((id) => this.selected.has(id));
        d.el.appendChild(h('div', { class: 'drag-badge' }, `×${d.group.length}`));
      }
    }
    const handEl = this.root.querySelector('.hand') as HTMLElement;
    const hr = handEl.getBoundingClientRect();
    d.el.style.left = `${e.clientX - hr.left - d.offX}px`;
    d.el.style.top = `${e.clientY - hr.top - d.offY}px`;

    const wrapRect = (handEl.parentElement as HTMLElement).getBoundingClientRect();
    const inHand = e.clientY >= wrapRect.top - 10 && e.clientY <= wrapRect.bottom + 10;
    this.setOver(null);
    if (inHand) {
      const g = this.handGeometry();
      if (!g) return;
      const x = e.clientX - hr.left;
      const y = e.clientY - hr.top;
      const row = g.rows === 2 && y > g.ch + 2 * g.s ? 1 : 0;
      const countInRow = row === 0 ? g.perRow : g.n - g.perRow;
      const rowWidth = (countInRow - 1) * g.step + g.cw;
      const startX = (g.W - rowWidth) / 2;
      let col = Math.round((x - startX - g.cw / 2) / g.step);
      col = Math.max(0, Math.min(countInRow - 1, col));
      let idx = row * g.perRow + col;
      idx = Math.max(0, Math.min(g.n - 1, idx));
      const cur = this.order.indexOf(d.id);
      if (cur !== idx) {
        this.order.splice(cur, 1);
        this.order.splice(idx, 0, d.id);
        this.layoutHand();
      }
    } else {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const zone = target ? (target.closest('.discard, .meld, .own') as HTMLElement | null) : null;
      this.setOver(zone);
    }
  }

  private setOver(zone: HTMLElement | null): void {
    const d = this.drag;
    if (!d) return;
    if (d.over === zone) return;
    if (d.over) d.over.classList.remove('drop', 'hover');
    d.over = zone;
    if (zone) zone.classList.add(zone.classList.contains('meld') ? 'hover' : 'drop');
  }

  private onPointerUp(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    if (!d.active) {
      this.drag = null;
      this.fresh.delete(d.id);
      this.toggleSelect(d.id);
      return;
    }
    this.endDrag(d.over);
  }

  private endDrag(zone: HTMLElement | null): void {
    const d = this.drag;
    if (!d) return;
    d.el.classList.remove('dragging');
    d.el.querySelector('.drag-badge')?.remove();
    if (d.over) d.over.classList.remove('drop', 'hover');
    this.drag = null;
    this.save();
    const s = this.state;
    const playPhase = !!s && current(s) === this.me && s.round.turn.phase === 'play' && !s.round.ended;
    if (zone && playPhase) {
      if (zone.classList.contains('discard') && d.group.length === 1) {
        if (this.act({ kind: 'discard', cardId: d.id })) return;
      } else if (zone.classList.contains('meld') && d.group.length === 1) {
        const meldId = Number(zone.dataset.meldId);
        const m = s!.round.melds.find((x) => x.id === meldId);
        if (m && this.dropOnMeld(m, d.id)) return;
      } else if (zone.classList.contains('own')) {
        if (d.group.length >= 2) {
          if (this.laySelected(d.group)) return;
        } else this.toast(t('err.nothingSelected'), true);
      }
    } else if (zone && !playPhase) {
      this.toast(t(current(s!) === this.me ? 'err.drawFirst' : 'err.notYourTurn'), true);
    }
    this.render();
  }

  // ------------------------------------------------------------ Eingaben
  private toggleSelect(id: number): void {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
    this.targetMode = false;
    this.render();
  }

  private selectedCards(ids: number[]): Card[] {
    const set = new Set(ids);
    return this.state!.round.players[this.me].hand.filter((c) => set.has(c.id));
  }

  /** Teilt die Karten automatisch in gültige Kombinationen auf und legt sie aus. */
  private laySelected(ids: number[]): boolean {
    const s = this.state!;
    const me = s.round.players[this.me];
    const cards = this.selectedCards(ids);
    if (cards.length < 2) {
      this.toast(t('err.nothingSelected'), true);
      return false;
    }
    const attempts: Parameters<typeof findPartition>[1][] = [];
    if (!me.opened) attempts.push({ types: ALL_TYPES, pairCounts: [5, 7] });
    else if (me.mode === 'cheft') attempts.push({ types: ALL_TYPES, pairCounts: [2] });
    attempts.push({ types: ROMME_TYPES });
    attempts.push({ types: ALL_TYPES });
    let firstError: { error: string; params?: Record<string, string | number> } | null = null;
    for (const opts of attempts) {
      const parts = findAllPartitions(cards, opts, 8);
      if (parts.length === 0) continue;
      const valid: { groups: number[][]; shapes: MeldShape[]; augen: number }[] = [];
      for (const part of parts) {
        const groups = part.melds.map((m) => m.cards.map((c) => c.id));
        const chk = checkLay(s, this.me, groups);
        if (chk.ok) valid.push({ groups, shapes: part.melds, augen: part.augen });
        else if (!firstError) firstError = { error: chk.error, params: chk.params };
      }
      if (valid.length === 1) return this.act({ kind: 'lay', groups: valid[0].groups });
      if (valid.length > 1) {
        this.chooser = {
          title: t('choose.title'),
          hint: t('choose.hint'),
          options: valid.map((v) => ({ shapes: v.shapes, label: t('choose.augen', { n: v.augen }), onPick: () => this.act({ kind: 'lay', groups: v.groups }) })),
        };
        this.render();
        return true;
      }
    }
    if (!firstError && interpretMeld(cards, ALL_TYPES)) {
      const chk = checkLay(s, this.me, [cards.map((c) => c.id)]);
      if (!chk.ok) firstError = { error: chk.error, params: chk.params };
    }
    this.toast(t(firstError?.error ?? 'err.invalidMeld', firstError?.params), true);
    play('error');
    return false;
  }

  private layOffSelected(): void {
    const s = this.state!;
    const cards = this.selectedCards([...this.selected]);
    if (cards.length !== 1) {
      this.toast(t('err.selectOne'), true);
      return;
    }
    const card = cards[0];
    if (!s.round.players[this.me].opened) {
      this.toast(t('err.notOpened'), true);
      return;
    }
    const targets = layOffTargets(s, this.me, card.id);
    if (targets.length === 0) {
      this.toast(t('err.noTarget'), true);
      return;
    }
    const meldIds = new Set(targets.map((x) => x.meld.id));
    if (meldIds.size === 1) {
      this.layOffWithChoice(targets[0].meld, card);
      return;
    }
    this.targetMode = true;
    this.render();
  }

  /** Legt an; passt ein Joker an beide Enden einer Folge, fragt die App nach dem Ende. */
  private layOffWithChoice(m: Meld, card: Card): boolean {
    const s = this.state!;
    const opts = layOffTargets(s, this.me, card.id).filter((x) => x.meld.id === m.id);
    if (opts.length <= 1) return this.act({ kind: 'layOff', cardId: card.id, meldId: m.id, end: 'top' });
    this.chooser = {
      title: t('choose.end'),
      hint: '',
      options: opts.map((o, i) => ({
        shapes: [o.result],
        label: t(i === 0 ? 'choose.top' : 'choose.bottom'),
        onPick: () => this.act({ kind: 'layOff', cardId: card.id, meldId: m.id, end: i === 0 ? 'top' : 'bottom' }),
      })),
    };
    this.render();
    return true;
  }

  private dropOnMeld(m: Meld, cardId: number): boolean {
    const s = this.state!;
    const card = s.round.players[this.me].hand.find((c) => c.id === cardId);
    if (!card) return false;
    if (!isJoker(card)) {
      for (let i = 0; i < m.cards.length; i++) {
        if (isJoker(m.cards[i]) && checkStealJoker(s, this.me, m.id, i, card.id).ok) {
          return this.act({ kind: 'steal', meldId: m.id, jokerIndex: i, cardId: card.id });
        }
      }
    }
    const targets = layOffTargets(s, this.me, card.id).filter((x) => x.meld.id === m.id);
    if (targets.length === 0) {
      this.toast(t(s.round.players[this.me].opened ? 'err.cannotAdd' : 'err.notOpened'), true);
      play('error');
      return false;
    }
    return this.layOffWithChoice(m, card);
  }

  private tapMeld(m: Meld): void {
    const cards = this.selectedCards([...this.selected]);
    if (cards.length !== 1) {
      this.toast(t('err.selectOne'), true);
      return;
    }
    this.dropOnMeld(m, cards[0].id);
  }

  private declareCheft(): void {
    if (!confirm(t('confirm.cheft'))) return;
    this.act({ kind: 'declareCheft' });
  }

  // ------------------------------------------------------------ Dialoge
  private renderPause(lobby: LobbyInfo): HTMLElement {
    const away = lobby.seats.filter((s) => !s.isBot && !s.connected).map((s) => s.name);
    const waiting = lobby.paused === 'auto' && away.length > 0;
    return h(
      'div',
      { class: 'overlay' },
      h(
        'div',
        { class: 'panel dialog' },
        h('h2', null, t('pause.title')),
        h('p', null, waiting ? t('pause.waiting', { names: away.join(', ') }) : t('pause.text')),
        h('button', { class: 'btn primary', onclick: () => this.net?.pause(false) }, waiting ? t('pause.resumeAnyway') : t('pause.resume')),
      ),
    );
  }

  private renderSettings(): HTMLElement {
    return h(
      'div',
      {
        class: 'overlay',
        onclick: (e: Event) => {
          if (e.target === e.currentTarget) {
            this.showSettings = false;
            this.render();
          }
        },
      },
      h(
        'div',
        { class: 'panel dialog' },
        h('h2', null, t('btn.settings')),
        this.choice(
          t('settings.speed'),
          [
            { v: 'normal', label: t('settings.speed.normal') },
            { v: 'fast', label: t('settings.speed.fast') },
          ],
          () => this.prefs.speed,
          (v) => (this.prefs.speed = v as Prefs['speed']),
        ),
        this.choice(
          t('settings.vibration'),
          [
            { v: true, label: t('settings.on') },
            { v: false, label: t('settings.off') },
          ],
          () => this.prefs.vibration,
          (v) => (this.prefs.vibration = v as boolean),
        ),
        this.choice(
          t('settings.sound'),
          [
            { v: true, label: t('settings.on') },
            { v: false, label: t('settings.off') },
          ],
          () => this.prefs.sound,
          (v) => (this.prefs.sound = v as boolean),
        ),
        this.choice(
          t('settings.keepAwake'),
          [
            { v: true, label: t('settings.on') },
            { v: false, label: t('settings.off') },
          ],
          () => this.prefs.keepAwake,
          (v) => {
            this.prefs.keepAwake = v as boolean;
            void this.syncWakeLock();
          },
        ),
        h('button', { class: 'btn', onclick: () => this.showRules('game') }, t('btn.rules')),
        this.online && this.state && !this.state.finished
          ? h(
              'button',
              {
                class: 'btn',
                onclick: () => {
                  this.showSettings = false;
                  this.net?.pause(true);
                  this.render();
                },
              },
              t('btn.pause'),
            )
          : null,
        this.online ? null : h('button', { class: 'btn', onclick: () => this.exportSave() }, t('btn.exportSave')),
        this.online ? null : h('button', { class: 'btn', onclick: () => this.saveAndQuit() }, t('btn.saveQuit')),
        this.online
          ? h('button', { class: 'btn danger', onclick: () => this.leaveOnline(true) }, t('lobby.leave'))
          : h('button', { class: 'btn danger', onclick: () => this.quitGame() }, t('btn.quit')),
        h(
          'button',
          {
            class: 'btn primary',
            onclick: () => {
              this.showSettings = false;
              this.render();
            },
          },
          t('btn.close'),
        ),
      ),
    );
  }

  // ------------------------------------------------------------ Online
  private storedOnline(): { url: string; room: string; token: string; snap?: string } | null {
    try {
      const raw = localStorage.getItem(ONLINE_KEY);
      return raw ? (JSON.parse(raw) as { url: string; room: string; token: string; snap?: string }) : null;
    } catch {
      return null;
    }
  }

  private storeOnline(v: { url: string; room: string; token: string; snap?: string } | null): void {
    try {
      if (v) localStorage.setItem(ONLINE_KEY, JSON.stringify(v));
      else localStorage.removeItem(ONLINE_KEY);
    } catch {
      /* ignorieren */
    }
  }

  private serverUrl(): string {
    return (this.prefs.serverUrl || defaultServerUrl()).trim();
  }

  private ensureNet(): NetClient {
    if (this.net) return this.net;
    this.net = new NetClient({
      onJoined: (info) => {
        this.online = { room: info.room, pid: info.pid, token: info.token, lobby: this.online?.lobby ?? null, status: 'open' };
        this.storeOnline({ url: this.serverUrl(), room: info.room, token: info.token, snap: this.storedOnline()?.snap });
        this.claimChoice = null;
      },
      onClaimable: (room, seats) => {
        this.claimChoice = { room, seats };
        this.render();
      },
      onUpdate: (u) => this.onServerUpdate(u),
      onError: (error, params) => {
        this.toast(t(error, params), true);
        if (error === 'net.seatTaken' || error === 'net.noFreeSeat') {
          this.claimChoice = null;
          this.render();
        }
        if (error === 'net.noRoom' && (this.screen === 'lobby' || this.screen === 'game' || !this.online)) {
          this.storeOnline(null);
          if (this.online) this.leaveOnline(false);
        }
      },
      onStatus: (status) => {
        if (this.online) this.online.status = status;
        if (status === 'closed' && this.online) this.toast(t('online.offline'), true);
        if (this.screen === 'lobby' || this.screen === 'online') this.render();
      },
      onLeft: () => this.leaveOnline(false),
    });
    return this.net;
  }

  private connectOnline(after: () => void): void {
    const url = this.serverUrl();
    if (!url) {
      this.toast(t('online.noServer'), true);
      return;
    }
    const net = this.ensureNet();
    if (net.connected) {
      after();
      return;
    }
    net.connect(url);
    const t0 = Date.now();
    const wait = () => {
      if (net.connected) after();
      else if (Date.now() - t0 < 8000) setTimeout(wait, 150);
      else this.toast(t('net.disconnected'), true);
    };
    wait();
  }

  private createRoom(): void {
    const name = this.prefs.name.trim() || t('you');
    this.connectOnline(() => this.net!.create(name));
  }

  private joinRoom(): void {
    const code = this.joinCode.trim().toUpperCase();
    if (!/^\d{3,4}$/.test(code)) {
      this.toast(t('net.noRoom'), true);
      return;
    }
    const name = this.prefs.name.trim() || t('you');
    this.claimChoice = null;
    this.connectOnline(() => this.net!.join(code, name));
  }

  private resumeOnline(): void {
    const stored = this.storedOnline();
    if (!stored) return;
    this.prefs.serverUrl = this.prefs.serverUrl || stored.url;
    const net = this.ensureNet();
    this.online = { room: stored.room, pid: 0, token: stored.token, lobby: null, status: 'connecting' };
    net.connect(stored.url, { room: stored.room, token: stored.token, snap: stored.snap });
    this.screen = 'lobby';
    this.render();
  }

  private leaveOnline(tellServer: boolean): void {
    if (tellServer && !confirm(t('confirm.quit'))) return;
    if (tellServer) this.net?.leave();
    this.net?.close();
    this.net = null;
    this.online = null;
    this.storeOnline(null);
    this.state = this.loadSave()?.state ?? null;
    this.order = [];
    this.botGen++;
    this.goto('menu');
  }

  private onServerUpdate(u: ServerUpdate): void {
    if (!this.online) return;
    this.online.lobby = u.lobby;
    const stored = this.storedOnline();
    if (u.snap && stored && stored.room === this.online.room) this.storeOnline({ ...stored, snap: u.snap });
    if (!u.state) {
      this.state = null;
      this.lastRoundNo = 0;
      if (this.screen !== 'rules') this.screen = 'lobby';
      this.render();
      return;
    }
    const prev = this.state;
    const newRound = u.state.round.no !== this.lastRoundNo;
    this.lastRoundNo = u.state.round.no;
    const before = this.pendingBefore ?? (this.screen === 'game' ? snapshot(this.root) : new Map());
    const appearFrom = this.pendingAppearFrom;
    this.pendingBefore = null;
    this.pendingAppearFrom = null;
    this.state = u.state;
    if (newRound) {
      this.order = [];
      this.fresh.clear();
      this.selected.clear();
      this.targetMode = false;
      this.peekTable = false;
      this.chooser = null;
    }
    if (u.last && u.last.pid === this.me && u.last.action.kind === 'steal') {
      this.selected = new Set([u.state.round.turn.pendingJokerId ?? -1]);
    }
    this.screen = 'game';
    if (newRound && prev === null) {
      void this.startRoundWithDeal();
      return;
    }
    if (newRound) {
      void this.startRoundWithDeal();
      return;
    }
    this.render();
    const r = u.state.round;
    if (u.last && u.last.pid !== this.me) {
      const seat = this.seatRect(u.last.pid);
      const k = u.last.action.kind;
      if (k === 'draw') play('card');
      else if (k === 'discard') play('discard');
      else if (k === 'lay' || k === 'layOff') play('lay');
      if (!r.ended) void flip(this.root, before, { appearFrom: seat, disappearTo: seat });
    } else if (!r.ended) {
      void flip(this.root, before, { appearFrom });
    }
    if (r.ended && prev && !prev.round.ended) this.onRoundEnded();
  }

  private renderOnline(): HTMLElement {
    const nameInput = h('input', {
      class: 'text',
      type: 'text',
      maxlength: '12',
      value: this.prefs.name,
      placeholder: t('you'),
      oninput: (e: Event) => {
        this.prefs.name = (e.target as HTMLInputElement).value;
        this.savePrefs();
      },
    });
    const codeInput = h('input', {
      class: 'text code',
      type: 'text',
      maxlength: '4',
      inputmode: 'numeric',
      pattern: '[0-9]*',
      value: this.joinCode,
      placeholder: '123',
      oninput: (e: Event) => {
        const el = e.target as HTMLInputElement;
        el.value = el.value.replace(/\D/g, '');
        this.joinCode = el.value;
      },
    });
    const serverInput = h('input', {
      class: 'text',
      type: 'url',
      value: this.prefs.serverUrl || defaultServerUrl(),
      placeholder: 'wss://cheft.example.org/ws',
      oninput: (e: Event) => {
        this.prefs.serverUrl = (e.target as HTMLInputElement).value;
        this.savePrefs();
      },
    });
    if (this.claimChoice) return this.renderClaim(this.claimChoice);
    return h(
      'div',
      { class: 'menu' },
      h('h2', null, t('online.title')),
      h(
        'div',
        { class: 'panel' },
        h('div', { class: 'option' }, h('div', { class: 'muted' }, t('setup.name')), nameInput),
        h('button', { class: 'btn primary', onclick: () => this.createRoom() }, t('online.create')),
        h('div', { class: 'option' }, h('div', { class: 'muted' }, t('online.code')), h('div', { class: 'row' }, codeInput, h('button', { class: 'btn', onclick: () => this.joinRoom() }, t('online.join')))),
        h('details', null, h('summary', { class: 'muted small-text' }, t('online.server')), h('div', { class: 'muted small-text' }, t('online.serverHint')), serverInput),
        h('button', { class: 'btn', onclick: () => this.goto('menu') }, t('btn.back')),
      ),
    );
  }

  /** Spiel läuft schon: einen Bot-Platz oder den Platz eines länger Abwesenden übernehmen. */
  private renderClaim(c: { room: string; seats: ClaimableSeat[] }): HTMLElement {
    const name = this.prefs.name.trim() || t('you');
    return h(
      'div',
      { class: 'menu' },
      h('h2', null, t('claim.title', { code: c.room })),
      h(
        'div',
        { class: 'panel' },
        h('p', { class: 'muted small-text' }, t('claim.hint')),
        ...c.seats.map((seat) =>
          h(
            'button',
            { class: 'btn', onclick: () => this.net?.claim(c.room, seat.pid, name) },
            `${seat.name} · ${t(seat.kind === 'bot' ? 'claim.bot' : 'claim.away')}`,
          ),
        ),
        h(
          'button',
          {
            class: 'btn',
            onclick: () => {
              this.claimChoice = null;
              this.render();
            },
          },
          t('btn.back'),
        ),
      ),
    );
  }

  private renderLobby(): HTMLElement {
    const o = this.online;
    const lobby = o?.lobby;
    if (!o || !lobby) {
      return h('div', { class: 'menu' }, h('div', { class: 'panel' }, h('p', null, t('online.connecting')), h('button', { class: 'btn', onclick: () => this.leaveOnline(false) }, t('btn.back'))));
    }
    const isHost = lobby.hostPid === this.me;
    const seats = lobby.seats.map((seat) =>
      h(
        'div',
        { class: 'row spread lobby-seat' },
        h('span', null, seat.name, seat.pid === this.me ? h('span', { class: 'muted' }, ` (${t('lobby.you')})`) : null, seat.isHost ? h('span', { class: 'badge open' }, t('lobby.host')) : null, !seat.isBot && !seat.connected ? h('span', { class: 'badge' }, t('lobby.offline')) : null),
        h(
          'span',
          { class: 'row' },
          seat.isBot && isHost ? this.lobbyBotButtons(seat) : seat.isBot ? h('span', { class: 'badge' }, 'Bot') : null,
          isHost && seat.pid !== this.me ? h('button', { class: 'btn small', onclick: () => this.net?.removeSeat(seat.pid) }, t('lobby.remove')) : null,
        ),
      ),
    );
    const settings = isHost
      ? [
          this.choice(t('setup.rounds'), [{ v: 7, label: '7' }, { v: 11, label: '11' }], () => lobby.settings.rounds, (v) => this.net?.settings({ rounds: v as number })),
          this.choice(
            t('setup.firstTurn'),
            [
              { v: true, label: t('setup.yes') },
              { v: false, label: t('setup.no') },
            ],
            () => lobby.settings.firstTurnOpenAllowed,
            (v) => this.net?.settings({ firstTurnOpenAllowed: v as boolean }),
          ),
          this.choice(
            t('settings.speed'),
            [
              { v: 'normal', label: t('settings.speed.normal') },
              { v: 'fast', label: t('settings.speed.fast') },
            ],
            () => lobby.settings.speed,
            (v) => this.net?.settings({ speed: v as 'normal' | 'fast' }),
          ),
        ]
      : [h('div', { class: 'muted small-text' }, `${t('setup.rounds')}: ${lobby.settings.rounds} · ${t('setup.firstTurn')}: ${t(lobby.settings.firstTurnOpenAllowed ? 'setup.yes' : 'setup.no')}`)];
    return h(
      'div',
      { class: 'menu' },
      h('h2', null, t('lobby.title', { code: lobby.code })),
      h(
        'div',
        { class: 'panel' },
        h('div', { class: 'row spread' }, h('span', { class: 'code-big' }, lobby.code), h('button', { class: 'btn small', onclick: () => this.copyCode(lobby.code) }, t('lobby.copy'))),
        h('div', { class: 'muted small-text' }, t('lobby.share')),
        ...seats,
        isHost && lobby.seats.length < 4 ? h('button', { class: 'btn', onclick: () => this.net?.addBot({ level: 'random', style: 'random' }) }, t('lobby.addBot')) : null,
        ...settings,
        isHost
          ? h('button', { class: 'btn primary', disabled: lobby.seats.length < 3, onclick: () => this.net?.start() }, lobby.seats.length < 3 ? t('lobby.need', { min: 3 }) : t('lobby.start'))
          : h('div', { class: 'muted' }, t('lobby.waitHost')),
        o.status !== 'open' ? h('div', { class: 'muted small-text' }, t(o.status === 'connecting' ? 'online.connecting' : 'online.offline')) : null,
        h('button', { class: 'btn', onclick: () => this.leaveOnline(true) }, t('lobby.leave')),
      ),
    );
  }

  private lobbyBotButtons(seat: LobbyInfo['seats'][number]): HTMLElement {
    const [lv, st] = (seat.botLabel ?? 'random/random').split('/') as [BotChoice['level'], BotChoice['style']];
    const cycle = <T extends string>(list: readonly T[], cur: T | 'random'): T | 'random' => {
      const all: (T | 'random')[] = ['random', ...list];
      return all[(all.indexOf(cur) + 1) % all.length];
    };
    return h(
      'span',
      { class: 'row' },
      h('button', { class: `btn small${lv === 'random' ? '' : ' primary'}`, onclick: () => this.net?.send({ type: 'lobby', op: 'botChoice', pid: seat.pid, choice: { level: cycle(LEVELS, lv), style: st } }) }, lv === 'random' ? t('setup.random') : t(`level.${lv}`)),
      h('button', { class: `btn small${st === 'random' ? '' : ' primary'}`, onclick: () => this.net?.send({ type: 'lobby', op: 'botChoice', pid: seat.pid, choice: { level: lv, style: cycle(STYLES, st) } }) }, st === 'random' ? t('setup.random') : t(`style.${st}`)),
    );
  }

  private copyCode(code: string): void {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(() => this.toast(t('lobby.copied')), () => prompt(t('lobby.copy'), code));
    else prompt(t('lobby.copy'), code);
  }

  private renderChooser(): HTMLElement {
    const ch = this.chooser!;
    return h(
      'div',
      { class: 'overlay' },
      h(
        'div',
        { class: 'panel dialog' },
        h('h2', null, ch.title),
        ch.hint ? h('p', { class: 'muted small-text' }, ch.hint) : null,
        ...ch.options.map((o) =>
          h(
            'div',
            {
              class: 'choose-option',
              onclick: () => {
                this.chooser = null;
                o.onPick();
              },
            },
            h('div', { class: 'choose-melds' }, ...o.shapes.map((m) => h('div', { class: 'choose-meld' }, ...m.cards.map((c) => this.cardEl(c, { mini: true }))))),
            h('div', { class: 'muted small-text' }, o.label),
          ),
        ),
        h(
          'button',
          {
            class: 'btn',
            onclick: () => {
              this.chooser = null;
              this.render();
            },
          },
          t('btn.cancel'),
        ),
      ),
    );
  }

  private nextRoundButton(): HTMLElement {
    const s = this.state!;
    if (this.online && !s.finished) {
      // Jeder Mensch bestätigt die Auswertung; erst wenn alle bestätigt haben, geht es weiter.
      const flags = s.round.nextReady ?? [];
      const mine = !!flags[this.me];
      const waiting = s.players.filter((p) => !flags[p.id] && p.id !== this.me && !p.isBot).map((p) => p.name);
      return h(
        'div',
        { class: 'next-round' },
        h('button', { class: 'btn primary', disabled: mine, onclick: () => this.nextRound() }, t('btn.nextRound')),
        mine && waiting.length ? h('div', { class: 'muted small-text', style: { textAlign: 'center' } }, t('wait.others', { names: waiting.join(', ') })) : null,
      );
    }
    const label = this.online ? t(s.finished ? 'lobby.backToLobby' : 'btn.nextRound') : t(s.finished ? 'btn.endGame' : 'btn.nextRound');
    return h('button', { class: 'btn primary', onclick: () => this.nextRound() }, label);
  }

  private renderEndBar(): HTMLElement {
    return h(
      'div',
      { class: 'endbar' },
      h(
        'button',
        {
          class: 'btn',
          onclick: () => {
            this.peekTable = false;
            this.render();
          },
        },
        t('btn.showResult'),
      ),
      this.nextRoundButton(),
    );
  }

  /** Punkteverlauf: Spieler als Spalten, Runden als Zeilen mit aufsummierten Strafpunkten. */
  private renderRoundsTable(order: number[]): HTMLElement {
    const s = this.state!;
    const name = (pid: number) => (pid === this.me ? t('you') : s.players[pid].name);
    const sums = order.map(() => 0);
    const max = Math.max(1, ...s.totals);
    const body = s.history.map((res) =>
      h(
        'tr',
        null,
        h('td', { class: 'muted' }, t('round.short', { n: res.roundNo })),
        ...order.map((pid, i) => {
          const pts = res.scores[pid].total;
          sums[i] += pts;
          const bar = h('div', { class: 'bar', style: { width: `${Math.round((sums[i] / max) * 100)}%` } });
          return h('td', { class: `num cell${res.winner === pid ? ' win' : ''}` }, bar, h('span', { class: 'sum' }, String(sums[i])), h('span', { class: 'delta' }, pts ? `+${pts}` : '·'));
        }),
      ),
    );
    return h(
      'div',
      null,
      h('h3', null, t('gameEnd.rounds')),
      h('table', { class: 'scores rounds' }, h('thead', null, h('tr', null, h('th', null, ''), ...order.map((pid) => h('th', { class: 'num' }, name(pid))))), h('tbody', null, ...body)),
    );
  }

  private renderRoundEnd(): HTMLElement {
    const s = this.state!;
    const r = s.round;
    const res = r.result!;
    const name = (pid: number) => (pid === this.me ? t('you') : s.players[pid].name);
    const extras: string[] = [];
    if (res.winnerMode === 'cheft') extras.push(t('roundEnd.cheft'));
    if (res.hand) extras.push(t('roundEnd.hand'));
    if (res.jokerBurned) extras.push(t('roundEnd.joker'));
    const ordered = [...s.players].sort((a, b) => s.totals[a.id] - s.totals[b.id] || res.scores[a.id].total - res.scores[b.id].total);
    const rows = ordered.map((p) => {
      const sc = res.scores[p.id];
      const pr = r.players[p.id];
      return h(
        'tr',
        { class: res.winner === p.id ? 'winner' : '' },
        h(
          'td',
          null,
          name(p.id),
          h('div', { class: 'factors' }, `${t(`mode.${pr.mode}`)} · ${pr.opened ? t('status.opened') : t('status.notOpened')}`),
          pr.opened && pr.hand.length ? h('div', { class: 'rest' }, ...pr.hand.map((c) => this.cardEl(c, { mini: true }))) : null,
          !pr.opened && pr.hand.length ? h('div', { class: 'rest backs' }, ...pr.hand.map((c) => this.cardEl(backOf(c), { mini: true }))) : null,
          s.finished && p.bot ? h('div', { class: 'factors accent' }, `${t(`level.${p.bot.level}`)} · ${t(`style.${p.bot.style}`)}`) : null,
        ),
        h('td', { class: 'num' }, String(sc.base), sc.factors.length ? h('div', { class: 'factors' }, sc.factors.map((f) => t(`factor.${f}`)).join(', ')) : null),
        h('td', { class: 'num' }, String(sc.total)),
        h('td', { class: 'num' }, String(s.totals[p.id])),
      );
    });
    let title = t('roundEnd.title', { n: r.no });
    let text = res.winner === null ? t('roundEnd.stock') : t('roundEnd.winner', { name: name(res.winner) });
    if (s.finished) {
      title = t('gameEnd.title');
      const w = winnerOfGame(s);
      text = w.length === 1 ? t('gameEnd.winner', { name: name(w[0]), n: s.totals[w[0]] }) : t('gameEnd.tie', { names: w.map(name).join(', ') });
    }
    return h(
      'div',
      { class: 'overlay' },
      h(
        'div',
        { class: 'panel dialog' },
        h('h2', null, title),
        h('p', null, text),
        extras.length ? h('p', { class: 'gold' }, extras.join(' ')) : null,
        h(
          'table',
          { class: 'scores' },
          h('thead', null, h('tr', null, h('th', null, t('roundEnd.rest')), h('th', { class: 'num' }, t('score.base')), h('th', { class: 'num' }, t('score.total')), h('th', { class: 'num' }, t('score.sum')))),
          h('tbody', null, ...rows),
        ),
        s.finished ? this.renderRoundsTable(ordered.map((p) => p.id)) : null,
        h(
          'button',
          {
            class: 'btn',
            onclick: () => {
              this.peekTable = true;
              this.render();
            },
          },
          t('btn.peekTable'),
        ),
        this.nextRoundButton(),
      ),
    );
  }
}

// Nicht genutzte Importe vermeiden (RectMap für Typen in anim.ts)
export type { RectMap };
