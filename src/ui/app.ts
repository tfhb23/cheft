/**
 * Oberfläche: Menü, Spielfeld, Regeln, Rundenauswertung. Reines DOM ohne Framework.
 */
import { Card, isJoker, sortByRank, sortBySuit, penaltyValue } from '../engine/cards';
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
import { decideAction, suggestLay } from '../bot/bot';
import { t, cardName } from '../i18n';
import { h, clear } from './dom';
import { Atlas, buildAtlas, atlasOffset } from './sprites';
import { RULES_DE } from './rules';

type Screen = 'menu' | 'setup' | 'rules' | 'game';
const SAVE_KEY = 'cheft.save.v1';
const PREFS_KEY = 'cheft.prefs.v1';
const HUMAN = 0;

interface Prefs {
  name: string;
  bots: number;
  rounds: number;
  firstTurn: boolean;
  sort: 'suit' | 'rank';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class App {
  private root: HTMLElement;
  private atlas: Atlas;
  private screen: Screen = 'menu';
  private state: GameState | null = null;
  private prefs: Prefs = { name: '', bots: 3, rounds: 7, firstTurn: true, sort: 'suit' };
  private selected = new Set<number>();
  private targetMode = false;
  private botGen = 0;
  private botsRunning = false;
  private toastTimer: number | null = null;
  private rulesFrom: Screen = 'menu';

  constructor(root: HTMLElement) {
    this.root = root;
    this.atlas = buildAtlas();
    document.documentElement.style.setProperty('--atlas', `url(${this.atlas.url})`);
    this.loadPrefs();
    this.state = this.loadSave();
    window.addEventListener('resize', () => this.render());
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
  }
  private loadSave(): GameState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as GameState;
      if (!s.round || s.finished) return null;
      return s;
    } catch {
      return null;
    }
  }
  private save(): void {
    try {
      if (this.state && !this.state.finished) localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
      else localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignorieren */
    }
  }

  // ------------------------------------------------------------ Rendern
  private render(): void {
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
        const nt = this.root.querySelector('.table');
        if (nt) nt.scrollTop = scroll;
        break;
    }
  }

  private cardEl(card: Card | 'back' | 'slot', opts: { selected?: boolean; onClick?: () => void; glow?: boolean; dim?: boolean; title?: string } = {}): HTMLElement {
    const off = atlasOffset(this.atlas.index(card));
    const el = h('div', {
      class: `card${opts.selected ? ' selected' : ''}${opts.onClick ? ' clickable' : ''}${opts.glow ? ' glow' : ''}${opts.dim ? ' dim' : ''}`,
      style: { backgroundPosition: `calc(${-off.x}px * var(--s)) calc(${-off.y}px * var(--s))` },
      title: opts.title ?? (typeof card === 'string' ? '' : cardName(card)),
      onclick: opts.onClick,
    });
    return el;
  }

  // ------------------------------------------------------------ Menü
  private renderMenu(): HTMLElement {
    const demo: Card[] = [
      { id: -1, suit: 'H', rank: 1 },
      { id: -2, suit: 'J', rank: 0 },
      { id: -3, suit: 'S', rank: 13 },
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
      ),
      h('div', { class: 'muted', style: { fontSize: 'calc(8px * var(--s))' } }, t('setup.online')),
    );
  }

  private renderSetup(): HTMLElement {
    const choice = (label: string, values: { v: unknown; label: string }[], get: () => unknown, set: (v: unknown) => void) =>
      h(
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
        choice(
          t('setup.bots'),
          [
            { v: 2, label: '2' },
            { v: 3, label: '3' },
          ],
          () => this.prefs.bots,
          (v) => (this.prefs.bots = v as number),
        ),
        choice(
          t('setup.rounds'),
          [
            { v: 7, label: '7' },
            { v: 11, label: '11' },
          ],
          () => this.prefs.rounds,
          (v) => (this.prefs.rounds = v as number),
        ),
        choice(
          t('setup.firstTurn'),
          [
            { v: true, label: t('setup.yes') },
            { v: false, label: t('setup.no') },
          ],
          () => this.prefs.firstTurn,
          (v) => (this.prefs.firstTurn = v as boolean),
        ),
        h('div', { class: 'muted', style: { fontSize: 'calc(8px * var(--s))' } }, `${t('setup.direction')}: ${t('setup.ccw')}`),
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
      h(
        'div',
        { class: 'rules' },
        ...RULES_DE.map((sec) => h('div', null, h('h3', null, sec.title), h('ul', null, ...sec.items.map((i) => h('li', null, i))))),
      ),
    );
  }

  private goto(screen: Screen): void {
    this.screen = screen;
    this.render();
  }

  private showRules(from: Screen): void {
    this.rulesFrom = from;
    this.goto('rules');
  }

  // ------------------------------------------------------------ Spielsteuerung
  private startGame(): void {
    const name = this.prefs.name.trim() || t('you');
    const players: PlayerInfo[] = [{ id: 0, name, isBot: false }];
    for (let i = 1; i <= this.prefs.bots; i++) players.push({ id: i, name: t('bot.name', { n: i }), isBot: true });
    const settings: Settings = { rounds: this.prefs.rounds, firstTurnOpenAllowed: this.prefs.firstTurn, direction: 'ccw' };
    this.state = newGame(players, settings);
    this.selected.clear();
    this.targetMode = false;
    this.botGen++;
    this.save();
    this.goto('game');
    void this.runBots();
  }

  private continueGame(): void {
    if (!this.state) return;
    this.selected.clear();
    this.targetMode = false;
    this.botGen++;
    this.goto('game');
    void this.runBots();
  }

  private quitGame(): void {
    if (!confirm(t('confirm.quit'))) return;
    this.state = null;
    this.botGen++;
    this.save();
    this.goto('menu');
  }

  private act(action: Action): boolean {
    const s = this.state!;
    const res = applyAction(s, HUMAN, action);
    if (!res.ok) {
      this.toast(t(res.error, res.params), true);
      return false;
    }
    this.targetMode = false;
    if (action.kind === 'steal') {
      // Geklauten Joker direkt markieren, damit er sofort angelegt werden kann.
      this.selected = new Set([s.round.turn.pendingJokerId ?? -1]);
    }
    if (action.kind === 'discard' || action.kind === 'lay' || action.kind === 'layOff') {
      // Ausgelegte oder abgeworfene Karten aus der Auswahl entfernen
      const hand = new Set(s.round.players[HUMAN].hand.map((c) => c.id));
      for (const id of [...this.selected]) if (!hand.has(id)) this.selected.delete(id);
    }
    this.save();
    this.render();
    void this.runBots();
    return true;
  }

  private async runBots(): Promise<void> {
    if (this.botsRunning) return;
    this.botsRunning = true;
    const gen = this.botGen;
    try {
      while (this.state && gen === this.botGen && this.screen === 'game' && !this.state.round.ended) {
        const pid = current(this.state);
        if (!this.state.players[pid].isBot) break;
        await sleep(500);
        if (gen !== this.botGen || !this.state) break;
        const action = decideAction(this.state, pid);
        const res = applyAction(this.state, pid, action);
        if (!res.ok) {
          // Sollte nie passieren: Notfall-Abwurf
          console.error('Bot-Fehler', action, res.error);
          const hand = this.state.round.players[pid].hand;
          applyAction(this.state, pid, { kind: 'discard', cardId: hand[hand.length - 1].id });
        }
        this.save();
        this.render();
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
    this.targetMode = false;
    this.save();
    this.render();
    void this.runBots();
  }

  private toast(msg: string, error = false): void {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const el = h('div', { class: `toast${error ? ' error' : ''}` }, msg);
    document.body.appendChild(el);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.remove(), 3200);
  }

  // ------------------------------------------------------------ Spielfeld
  private renderGame(): HTMLElement {
    const s = this.state!;
    const r = s.round;
    const me = r.players[HUMAN];
    const myTurn = current(s) === HUMAN && !r.ended;
    const drawPhase = myTurn && r.turn.phase === 'draw';
    const playPhase = myTurn && r.turn.phase === 'play';

    // Gegner
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
            h('div', { class: 'name' }, h('span', null, p.name)),
            h('div', null, h('span', { class: 'minicard' }), `${pr.hand.length}`, ' ', h('span', { class: 'muted' }, `· ${s.totals[p.id]} P.`)),
            h(
              'div',
              null,
              h('span', { class: `badge${pr.mode === 'cheft' ? ' cheft' : ''}` }, t(`mode.${pr.mode}`)),
              ' ',
              h('span', { class: `badge${pr.opened ? ' open' : ''}` }, t(pr.opened ? 'status.opened' : 'status.notOpened')),
            ),
          );
        }),
    );

    // Tisch
    const selectedCards = me.hand.filter((c) => this.selected.has(c.id));
    const singleSel = selectedCards.length === 1 ? selectedCards[0] : null;
    const targets = playPhase && singleSel ? layOffTargets(s, HUMAN, singleSel.id) : [];
    const targetIds = new Set(targets.map((x) => x.meld.id));
    const stealable = new Set<number>();
    if (playPhase && singleSel && !isJoker(singleSel) && me.opened) {
      for (const m of r.melds) {
        m.cards.forEach((c, i) => {
          if (isJoker(c) && checkStealJoker(s, HUMAN, m.id, i, singleSel.id).ok) stealable.add(m.id);
        });
      }
    }
    const blocks: HTMLElement[] = [];
    const order = [HUMAN, ...s.players.filter((p) => p.id !== HUMAN).map((p) => p.id)];
    for (const pid of order) {
      const melds = r.melds.filter((m) => m.owner === pid);
      if (melds.length === 0) continue;
      blocks.push(
        h(
          'div',
          { class: 'player-block' },
          h('div', { class: 'label' }, pid === HUMAN ? t('you') : s.players[pid].name, ' ', h('span', { class: 'muted' }, `(${t(`mode.${r.players[pid].mode}`)})`)),
          h('div', { class: 'melds' }, ...melds.map((m) => this.meldEl(m, targetIds.has(m.id), stealable.has(m.id)))),
        ),
      );
    }
    const table = h('div', { class: 'table' }, blocks.length ? blocks : h('div', { class: 'table-empty' }, t('table.empty')));

    // Stapel
    const canStock = drawPhase && checkDraw(s, HUMAN, 'stock').ok;
    const canDiscardDraw = drawPhase && checkDraw(s, HUMAN, 'discard').ok;
    const canCarpet = drawPhase && checkDraw(s, HUMAN, 'carpet').ok;
    const top = r.discard[r.discard.length - 1];
    const piles = h(
      'div',
      { class: 'piles' },
      h(
        'div',
        { class: 'pile' },
        h('div', { style: { position: 'relative' } }, this.cardEl(r.stock.length ? 'back' : 'slot', { glow: canStock, onClick: drawPhase ? () => this.act({ kind: 'draw', source: 'stock' }) : undefined }), h('div', { class: 'count-left' }, String(r.stock.length))),
        t('stock'),
      ),
      h(
        'div',
        { class: 'pile' },
        top
          ? this.cardEl(top, {
              glow: canDiscardDraw,
              onClick: drawPhase ? () => this.act({ kind: 'draw', source: 'discard' }) : playPhase && singleSel ? () => this.act({ kind: 'discard', cardId: singleSel.id }) : undefined,
            })
          : this.cardEl('slot', { onClick: playPhase && singleSel ? () => this.act({ kind: 'discard', cardId: singleSel.id }) : undefined }),
        t('discard'),
      ),
      h(
        'div',
        { class: 'pile' },
        r.carpet ? this.cardEl(r.carpet, { glow: canCarpet, dim: !canCarpet && drawPhase, onClick: drawPhase ? () => this.act({ kind: 'draw', source: 'carpet' }) : undefined }) : this.cardEl('slot'),
        t('carpet'),
      ),
    );

    // Status
    let msg = '';
    if (r.ended) msg = '';
    else if (!myTurn) msg = t('turn.bot', { name: s.players[current(s)].name });
    else if (drawPhase) msg = t('turn.you.draw');
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
    const lastLog = r.log[r.log.length - 1];
    const logEl = h('div', { class: 'log' }, lastLog ? this.logText(lastLog) : '');

    // Hand
    const hand = this.prefs.sort === 'suit' ? sortBySuit(me.hand) : sortByRank(me.hand);
    const handEl = h(
      'div',
      { class: `hand${hand.length > 9 ? ' two-rows' : ''}` },
      ...hand.map((c) =>
        this.cardEl(c, {
          selected: this.selected.has(c.id),
          onClick: () => this.toggleSelect(c.id),
        }),
      ),
    );

    // Aktionen
    const btn = (label: string, onclick: () => void, opts: { disabled?: boolean; cls?: string } = {}) =>
      h('button', { class: `btn ${opts.cls ?? ''}`, disabled: opts.disabled, onclick }, label);
    const canCheft = myTurn && !me.opened && me.mode === 'romme' && r.turn.mustOpenWithId === null;
    const actions = h(
      'div',
      { class: 'actions' },
      btn(t('btn.lay'), () => this.laySelected(), { disabled: !playPhase || selectedCards.length < 2, cls: 'primary' }),
      btn(t('btn.layOff'), () => this.layOffSelected(), { disabled: !playPhase || !singleSel || !me.opened }),
      btn(t('btn.discard'), () => singleSel && this.act({ kind: 'discard', cardId: singleSel.id }), { disabled: !playPhase || !singleSel }),
      btn(t('btn.cheft'), () => this.declareCheft(), { disabled: !canCheft }),
      h('div', { class: 'sep' }),
      btn(t('btn.sortSuit'), () => this.setSort('suit'), { cls: this.prefs.sort === 'suit' ? 'active small' : 'small' }),
      btn(t('btn.sortRank'), () => this.setSort('rank'), { cls: this.prefs.sort === 'rank' ? 'active small' : 'small' }),
      btn(t('btn.hint'), () => this.hint(), { disabled: !playPhase, cls: 'small' }),
      btn(t('btn.rules'), () => this.showRules('game'), { cls: 'small' }),
      btn(t('btn.menu'), () => this.quitGame(), { cls: 'small' }),
    );

    const header = h(
      'div',
      { class: 'topbar' },
      h('span', { class: 'accent' }, t('round', { n: r.no, total: s.settings.rounds })),
      h('span', { class: 'muted' }, ` · ${s.players[HUMAN].name}: ${s.totals[HUMAN]} P.`),
      h('span', { style: { marginLeft: 'auto' } }, h('span', { class: `badge${me.mode === 'cheft' ? ' cheft' : ''}` }, t(`mode.${me.mode}`)), ' ', h('span', { class: `badge${me.opened ? ' open' : ''}` }, t(me.opened ? 'status.opened' : 'status.notOpened'))),
    );

    const game = h('div', { class: 'game' }, header, opponents, table, piles, status, logEl, h('div', { class: 'hand-wrap' }, handEl), actions);
    if (r.ended) game.appendChild(this.renderRoundEnd());
    return game;
  }

  private meldEl(m: Meld, isTarget: boolean, isStealable: boolean): HTMLElement {
    const s = this.state!;
    const playPhase = current(s) === HUMAN && s.round.turn.phase === 'play' && !s.round.ended;
    const onClick = playPhase ? () => this.tapMeld(m) : undefined;
    return h(
      'div',
      { class: `meld${m.type === 'pair' ? ' pair' : ''}${isTarget ? ' target' : ''}${isStealable ? ' stealable' : ''}${onClick ? ' clickable' : ''}`, onclick: onClick, title: `${t(`mode.${m.type === 'pair' ? 'cheft' : 'romme'}`)} · ${meldAugen(m)}` },
      ...m.cards.map((c, i) => {
        let title = cardName(c);
        if (isJoker(c)) {
          const rep = jokerRepresents(m, i);
          if (rep) title = `${t('card.joker')} = ${cardName({ id: -1, suit: rep.suit, rank: rep.rank })}`;
        }
        return this.cardEl(c, { title });
      }),
    );
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

  private layoutHand(): void {
    const handEl = this.root.querySelector('.hand') as HTMLElement | null;
    if (!handEl) return;
    const cards = Array.from(handEl.children) as HTMLElement[];
    const n = cards.length;
    if (n === 0) return;
    const s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 2;
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
    handEl.classList.toggle('two-rows', rows === 2);
    const perRow = rows === 2 ? Math.ceil(n / 2) : n;
    cards.forEach((el, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const countInRow = row === 0 ? perRow : n - perRow;
      const rowWidth = (countInRow - 1) * step + cw;
      const x = (W - rowWidth) / 2 + col * step;
      const y = rows === 2 ? row * (ch + 2 * s) : 6 * s;
      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(y)}px`;
      el.style.zIndex = String(i);
    });
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
        h('td', null, name(p.id), h('div', { class: 'factors' }, `${t(`mode.${pr.mode}`)} · ${pr.opened ? t('status.opened') : t('status.notOpened')} · ${t('cards.count', { n: pr.hand.length })}`)),
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
          h('thead', null, h('tr', null, h('th', null, ''), h('th', { class: 'num' }, t('score.base')), h('th', { class: 'num' }, t('score.total')), h('th', { class: 'num' }, t('score.sum')))),
          h('tbody', null, ...rows),
        ),
        s.finished
          ? h('button', { class: 'btn primary', onclick: () => this.nextRound() }, t('btn.endGame'))
          : h('button', { class: 'btn primary', onclick: () => this.nextRound() }, t('btn.nextRound')),
      ),
    );
  }

  // ------------------------------------------------------------ Eingaben
  private toggleSelect(id: number): void {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
    this.targetMode = false;
    this.render();
  }

  private setSort(mode: 'suit' | 'rank'): void {
    this.prefs.sort = mode;
    this.savePrefs();
    this.render();
  }

  private selectedCards(): Card[] {
    return this.state!.round.players[HUMAN].hand.filter((c) => this.selected.has(c.id));
  }

  /** Teilt die Auswahl automatisch in gültige Kombinationen auf und legt sie aus. */
  private laySelected(): void {
    const s = this.state!;
    const me = s.round.players[HUMAN];
    const cards = this.selectedCards();
    if (cards.length < 2) {
      this.toast(t('err.nothingSelected'), true);
      return;
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
      if (chk.ok) {
        this.act({ kind: 'lay', groups });
        return;
      }
      if (!firstError) firstError = { error: chk.error, params: chk.params };
    }
    if (!firstError) {
      // Einzelne Kombination zur besseren Fehlermeldung prüfen
      const single = interpretMeld(cards, ALL_TYPES);
      if (single) {
        const chk = checkLay(s, HUMAN, [cards.map((c) => c.id)]);
        if (!chk.ok) firstError = { error: chk.error, params: chk.params };
      }
    }
    this.toast(t(firstError?.error ?? 'err.invalidMeld', firstError?.params), true);
  }

  private layOffSelected(): void {
    const s = this.state!;
    const cards = this.selectedCards();
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

  private tapMeld(m: Meld): void {
    const s = this.state!;
    const cards = this.selectedCards();
    if (cards.length !== 1) {
      this.toast(t('err.selectOne'), true);
      return;
    }
    const card = cards[0];
    // Joker klauen?
    if (!isJoker(card)) {
      for (let i = 0; i < m.cards.length; i++) {
        if (isJoker(m.cards[i]) && checkStealJoker(s, HUMAN, m.id, i, card.id).ok) {
          this.act({ kind: 'steal', meldId: m.id, jokerIndex: i, cardId: card.id });
          return;
        }
      }
    }
    const targets = layOffTargets(s, HUMAN, card.id).filter((x) => x.meld.id === m.id);
    if (targets.length === 0) {
      this.toast(t(s.round.players[HUMAN].opened ? 'err.cannotAdd' : 'err.notOpened'), true);
      return;
    }
    this.act({ kind: 'layOff', cardId: card.id, meldId: m.id, end: 'top' });
  }

  private declareCheft(): void {
    if (!confirm(t('confirm.cheft'))) return;
    this.act({ kind: 'declareCheft' });
  }

  private hint(): void {
    const s = this.state!;
    const groups = suggestLay(s, HUMAN);
    if (!groups) {
      this.toast(t('hint.none'));
      return;
    }
    this.selected = new Set(groups.flat());
    this.targetMode = false;
    this.render();
    const me = s.round.players[HUMAN];
    if (!me.opened) {
      const cards = this.selectedCards();
      const part = findPartition(cards, { types: ROMME_TYPES });
      this.toast(t('hint.open', { n: part ? part.augen : cards.reduce((a, c) => a + penaltyValue(c), 0) }));
    } else this.toast(t('hint.lay'));
  }
}
