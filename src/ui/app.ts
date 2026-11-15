/**
 * Oberfläche: Menü, Spielfeld mit Sitzordnung, Drag & Drop, Animationen, Einstellungen.
 * Reines DOM ohne Framework.
 */
import { Card, isJoker } from '../engine/cards';
import { Action, applyAction } from '../engine/actions';
import {
  GameState,
  PlayerInfo,
  Settings,
  checkDraw,
  checkLay,
  checkStealJoker,
  current,
  layOffTargets,
  newGame,
  startNextRound,
  thresholdFor,
  winnerOfGame,
} from '../engine/game';
import { ALL_TYPES, ROMME_TYPES, Meld, findPartition, jokerRepresents, meldAugen, interpretMeld } from '../engine/melds';
import { decideAction } from '../bot/bot';
import { t, cardName } from '../i18n';
import { h, clear } from './dom';
import { Atlas, buildAtlas, atlasOffset } from './sprites';
import { RULES_DE } from './rules';
import { snapshot, flip, flyClone, dealAnimation, RectMap } from './anim';
import { play, setSoundEnabled, unlockAudio, vibrate } from './sound';

type Screen = 'menu' | 'setup' | 'rules' | 'game';
const SAVE_KEY = 'cheft.save.v2';
const PREFS_KEY = 'cheft.prefs.v2';
const HUMAN = 0;

interface Prefs {
  name: string;
  bots: number;
  rounds: number;
  firstTurn: boolean;
  speed: 'normal' | 'fast';
  vibration: boolean;
  sound: boolean;
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
  private prefs: Prefs = { name: '', bots: 3, rounds: 7, firstTurn: true, speed: 'normal', vibration: true, sound: false };
  private order: number[] = [];
  private fresh = new Set<number>();
  private selected = new Set<number>();
  private targetMode = false;
  private drag: Drag | null = null;
  private botGen = 0;
  private botsRunning = false;
  private dealing = false;
  private showSettings = false;
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
    window.addEventListener('resize', () => this.render());
    document.addEventListener('pointerdown', () => unlockAudio(), { passive: true });
    this.render();
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
      case 'game':
        this.root.appendChild(this.renderGame());
        this.layoutHand();
        this.layoutTable();
        const nt = this.root.querySelector('.table');
        if (nt) nt.scrollTop = scroll;
        break;
    }
  }

  private cardEl(
    card: Card | 'back' | 'slot',
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
    for (let i = 1; i <= this.prefs.bots; i++) players.push({ id: i, name: t('bot.name', { n: i }), isBot: true });
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
    await dealAnimation(stock ? stock.getBoundingClientRect() : null, targets, 5, 32 * s, 44 * s);
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
    const res = applyAction(s, HUMAN, action);
    if (!res.ok) {
      this.toast(t(res.error, res.params), true);
      play('error');
      return false;
    }
    this.targetMode = false;
    if (action.kind === 'steal') this.selected = new Set([s.round.turn.pendingJokerId ?? -1]);
    if (action.kind === 'discard' || action.kind === 'lay' || action.kind === 'layOff') {
      const hand = new Set(s.round.players[HUMAN].hand.map((c) => c.id));
      for (const id of [...this.selected]) if (!hand.has(id)) this.selected.delete(id);
    }
    if (action.kind === 'discard') this.fresh.clear();
    if (action.kind === 'draw') {
      play('card');
      vibrate(10, this.prefs.vibration);
    } else if (action.kind === 'discard') {
      play('discard');
      vibrate(15, this.prefs.vibration);
    } else play('lay');
    this.save();
    this.render();
    if (s.round.ended) this.onRoundEnded();
    else void flip(this.root, before, { appearFrom });
    void this.runBots();
    return true;
  }

  private onRoundEnded(): void {
    const r = this.state!.round.result!;
    if (r.winner === HUMAN) play('win');
    vibrate(30, this.prefs.vibration);
  }

  private botDelay(): number {
    return this.prefs.speed === 'fast' ? 260 : 650;
  }

  private async runBots(): Promise<void> {
    if (this.botsRunning) return;
    this.botsRunning = true;
    const gen = this.botGen;
    try {
      while (this.state && gen === this.botGen && this.screen === 'game' && !this.state.round.ended && !this.dealing) {
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
            const ghost = this.cardEl('back');
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
      }
    } finally {
      this.botsRunning = false;
    }
  }

  private nextRound(): void {
    if (!this.state) return;
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
    for (let i = 1; i < n; i++) others.push((HUMAN + i) % n);
    if (n === 4) return [{ pid: others[0], pos: 'right' }, { pid: others[1], pos: 'top' }, { pid: others[2], pos: 'left' }];
    if (n === 3) return [{ pid: others[0], pos: 'right' }, { pid: others[1], pos: 'left' }];
    return [{ pid: others[0], pos: 'top' }];
  }

  private renderGame(): HTMLElement {
    const s = this.state!;
    const r = s.round;
    const me = r.players[HUMAN];
    const myTurn = current(s) === HUMAN && !r.ended;
    const drawPhase = myTurn && r.turn.phase === 'draw';
    const playPhase = myTurn && r.turn.phase === 'play';

    // Handreihenfolge abgleichen
    const handIds = me.hand.map((c) => c.id);
    const have = new Set(handIds);
    this.order = this.order.filter((id) => have.has(id));
    const known = new Set(this.order);
    const added = handIds.filter((id) => !known.has(id));
    this.order.push(...added);
    if (myTurn) for (const id of added) this.fresh.add(id);
    for (const id of [...this.fresh]) if (!have.has(id)) this.fresh.delete(id);

    const header = h(
      'div',
      { class: 'topbar' },
      h('span', { class: 'accent' }, t('round', { n: r.no, total: s.settings.rounds })),
      h('span', { class: 'muted' }, ` · ${s.players[HUMAN].name}: ${s.totals[HUMAN]} P.`),
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
      ...s.players
        .filter((p) => p.id !== HUMAN)
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
    const targets = playPhase && singleSel && this.targetMode ? layOffTargets(s, HUMAN, singleSel.id) : [];
    const targetIds = new Set(targets.map((x) => x.meld.id));
    const stealable = new Set<number>();
    if (playPhase && singleSel && !isJoker(singleSel) && me.opened) {
      for (const m of r.melds) m.cards.forEach((c, i) => isJoker(c) && checkStealJoker(s, HUMAN, m.id, i, singleSel.id).ok && stealable.add(m.id));
    }

    // Tisch
    const table = h('div', { class: 'table' });
    const showFan = window.innerWidth >= 900;
    for (const seat of this.seats()) {
      const pr = r.players[seat.pid];
      const melds = r.melds.filter((m) => m.owner === seat.pid);
      const inner = h(
        'div',
        { class: 'seat-inner' },
        h('div', { class: 'melds' }, ...melds.map((m) => this.meldEl(m, targetIds.has(m.id), stealable.has(m.id), true))),
        h('div', { class: 'seat-label' }, `${s.players[seat.pid].name} · ${t('cards.count', { n: pr.hand.length })}`),
        showFan ? h('div', { class: 'fan' }, ...pr.hand.map(() => this.cardEl('back', { small: true }))) : null,
      );
      const wrap = h('div', { class: `seat seat-${seat.pos}${current(s) === seat.pid && !r.ended ? ' current' : ''}`, dataset: { seat: String(seat.pid), pos: seat.pos } }, inner);
      table.appendChild(wrap);
    }

    // Stapel in der Mitte
    const canStock = drawPhase && checkDraw(s, HUMAN, 'stock').ok;
    const canDiscardDraw = drawPhase && checkDraw(s, HUMAN, 'discard').ok;
    const canCarpet = drawPhase && checkDraw(s, HUMAN, 'carpet').ok;
    const stockWrap = h(
      'div',
      { class: 'stock-wrap' },
      r.carpet
        ? h('div', { class: 'carpet' }, this.cardEl(r.carpet, { glow: canCarpet, dim: drawPhase && !canCarpet, onClick: drawPhase ? () => this.act({ kind: 'draw', source: 'carpet' }) : undefined, title: `${t('carpet')}: ${cardName(r.carpet)}` }))
        : null,
      this.cardEl(r.stock.length ? 'back' : 'slot', { glow: canStock, onClick: drawPhase ? () => this.act({ kind: 'draw', source: 'stock' }) : undefined }),
      h('div', { class: 'count' }, String(r.stock.length)),
    );
    const discardCards = r.discard.slice(-5);
    const discard = h(
      'div',
      { class: 'discard' },
      discardCards.length === 0 ? this.cardEl('slot', { cls: 'slot-hint', onClick: playPhase && singleSel ? () => this.act({ kind: 'discard', cardId: singleSel.id }) : undefined }) : null,
      ...discardCards.map((c, i) => {
        const top = i === discardCards.length - 1;
        const hsh = hash(c.id);
        const rot = (hsh % 19) - 9;
        const dx = ((hsh >> 5) % 5) - 2;
        const dy = ((hsh >> 9) % 5) - 2;
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
    const myMelds = r.melds.filter((m) => m.owner === HUMAN);
    const own = h(
      'div',
      { class: 'own', dataset: { seat: String(HUMAN) } },
      h('div', { class: 'own-label' }, myMelds.length ? `${t('you')} (${t(`mode.${me.mode}`)})` : playPhase && selectedCards.length >= 2 ? t('drop.lay') : ''),
      h('div', { class: 'melds' }, ...myMelds.map((m) => this.meldEl(m, targetIds.has(m.id), stealable.has(m.id), false))),
    );
    table.appendChild(own);

    // Status
    let msg = '';
    if (r.ended) msg = '';
    else if (!myTurn) {
      const last = r.log[r.log.length - 1];
      msg = last && last.player !== undefined ? this.logText(last) : t('turn.bot', { name: s.players[current(s)].name });
    } else if (drawPhase) msg = t('turn.you.draw');
    else if (r.turn.pendingJokerId !== null) msg = t('turn.you.joker');
    else if (r.turn.mustOpenWithId !== null && !r.turn.openedThisTurn) msg = t('turn.you.mustOpen');
    else if (r.turn.mustPairWithId !== null && !r.turn.openedThisTurn) msg = t('turn.you.carpet');
    else if (this.targetMode) msg = t('target.pick');
    else msg = t('turn.you.play');
    let info = '';
    if (me.opened) info = t('threshold.opened');
    else if (me.mode === 'cheft') info = t('threshold.cheft');
    else info = t('threshold', { n: thresholdFor(s, HUMAN) });
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
        const el = this.cardEl(c, { selected: this.selected.has(id), fresh: this.fresh.has(id) });
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
    const actions = h(
      'div',
      { class: 'actions' },
      btn(t('btn.lay'), () => this.laySelected([...this.selected]), { disabled: !playPhase || selectedCards.length < 2, cls: 'primary' }),
      btn(t('btn.layOff'), () => this.layOffSelected(), { disabled: !playPhase || !singleSel || !me.opened }),
      btn(t('btn.discard'), () => singleSel && this.act({ kind: 'discard', cardId: singleSel.id }), { disabled: !playPhase || !singleSel }),
      btn(t('btn.cheft'), () => this.declareCheft(), { disabled: !canCheft, cls: 'dark' }),
    );

    const game = h('div', { class: 'game' }, header, opponents, table, status, h('div', { class: 'hand-wrap' }, handEl), actions);
    if (r.ended) game.appendChild(this.renderRoundEnd());
    else if (this.showSettings) game.appendChild(this.renderSettings());
    return game;
  }

  private meldEl(m: Meld, isTarget: boolean, isStealable: boolean, small: boolean): HTMLElement {
    const s = this.state!;
    const playPhase = current(s) === HUMAN && s.round.turn.phase === 'play' && !s.round.ended;
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
    if (e.player !== undefined) params.name = e.player === HUMAN ? t('you') : s.players[e.player].name;
    if (e.key === 'log.discard') {
      const top = s.round.discard[s.round.discard.length - 1];
      params.card = top ? cardName(top) : '';
    }
    return t(e.key, params);
  }

  /** Sitzgrößen: gedrehte Auslagen brauchen vertauschte Breite/Höhe. */
  private layoutTable(): void {
    const table = this.root.querySelector('.table') as HTMLElement | null;
    if (!table) return;
    const s = this.scale();
    const top = table.querySelector('.seat-top') as HTMLElement | null;
    const own = table.querySelector('.own') as HTMLElement | null;
    const sides = Array.from(table.querySelectorAll<HTMLElement>('.seat-left, .seat-right'));
    if (sides.length === 0) return;
    const H = table.clientHeight - 4 * s;
    const topH = top ? top.offsetHeight : 0;
    const ownH = own ? own.offsetHeight : 0;
    const minMid = 44 * s + 24 * s;
    const M = Math.max(minMid, H - topH - ownH);
    for (const side of sides) {
      const inner = side.querySelector('.seat-inner') as HTMLElement;
      inner.style.width = `${M}px`;
      const depth = inner.offsetHeight;
      side.style.width = `${depth}px`;
      side.style.height = `${M}px`;
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
    const playPhase = !!s && current(s) === HUMAN && s.round.turn.phase === 'play' && !s.round.ended;
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
      this.toast(t(current(s!) === HUMAN ? 'err.drawFirst' : 'err.notYourTurn'), true);
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
    return this.state!.round.players[HUMAN].hand.filter((c) => set.has(c.id));
  }

  /** Teilt die Karten automatisch in gültige Kombinationen auf und legt sie aus. */
  private laySelected(ids: number[]): boolean {
    const s = this.state!;
    const me = s.round.players[HUMAN];
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
      const part = findPartition(cards, opts);
      if (!part) continue;
      const groups = part.melds.map((m) => m.cards.map((c) => c.id));
      const chk = checkLay(s, HUMAN, groups);
      if (chk.ok) return this.act({ kind: 'lay', groups });
      if (!firstError) firstError = { error: chk.error, params: chk.params };
    }
    if (!firstError && interpretMeld(cards, ALL_TYPES)) {
      const chk = checkLay(s, HUMAN, [cards.map((c) => c.id)]);
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
    if (!s.round.players[HUMAN].opened) {
      this.toast(t('err.notOpened'), true);
      return;
    }
    const targets = layOffTargets(s, HUMAN, card.id);
    if (targets.length === 0) {
      this.toast(t('err.noTarget'), true);
      return;
    }
    const meldIds = new Set(targets.map((x) => x.meld.id));
    if (meldIds.size === 1) {
      this.act({ kind: 'layOff', cardId: card.id, meldId: targets[0].meld.id, end: 'top' });
      return;
    }
    this.targetMode = true;
    this.render();
  }

  private dropOnMeld(m: Meld, cardId: number): boolean {
    const s = this.state!;
    const card = s.round.players[HUMAN].hand.find((c) => c.id === cardId);
    if (!card) return false;
    if (!isJoker(card)) {
      for (let i = 0; i < m.cards.length; i++) {
        if (isJoker(m.cards[i]) && checkStealJoker(s, HUMAN, m.id, i, card.id).ok) {
          return this.act({ kind: 'steal', meldId: m.id, jokerIndex: i, cardId: card.id });
        }
      }
    }
    const targets = layOffTargets(s, HUMAN, card.id).filter((x) => x.meld.id === m.id);
    if (targets.length === 0) {
      this.toast(t(s.round.players[HUMAN].opened ? 'err.cannotAdd' : 'err.notOpened'), true);
      play('error');
      return false;
    }
    return this.act({ kind: 'layOff', cardId: card.id, meldId: m.id, end: 'top' });
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
        h('button', { class: 'btn', onclick: () => this.showRules('game') }, t('btn.rules')),
        h('button', { class: 'btn', onclick: () => this.exportSave() }, t('btn.exportSave')),
        h('button', { class: 'btn', onclick: () => this.saveAndQuit() }, t('btn.saveQuit')),
        h('button', { class: 'btn danger', onclick: () => this.quitGame() }, t('btn.quit')),
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

  private renderRoundEnd(): HTMLElement {
    const s = this.state!;
    const r = s.round;
    const res = r.result!;
    const name = (pid: number) => (pid === HUMAN ? t('you') : s.players[pid].name);
    const extras: string[] = [];
    if (res.winnerMode === 'cheft') extras.push(t('roundEnd.cheft'));
    if (res.hand) extras.push(t('roundEnd.hand'));
    if (res.jokerBurned) extras.push(t('roundEnd.joker'));
    const rows = s.players.map((p) => {
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
          pr.hand.length ? h('div', { class: 'rest' }, ...pr.hand.map((c) => this.cardEl(c, { mini: true }))) : null,
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
        h('button', { class: 'btn primary', onclick: () => this.nextRound() }, t(s.finished ? 'btn.endGame' : 'btn.nextRound')),
      ),
    );
  }
}

// Nicht genutzte Importe vermeiden (RectMap für Typen in anim.ts)
export type { RectMap };
