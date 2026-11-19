/**
 * Oberfläche: Menü, Spielfeld mit Sitzordnung, Drag & Drop, Animationen, Einstellungen.
 * Reines DOM ohne Framework.
 */
import { Card, SUITS, Suit, isJoker, shuffle, sortBySuit } from '../engine/cards';
import { Action, applyAction } from '../engine/actions';
import {
  BotProfile,
  GameState,
  PlayerInfo,
  Settings,
  abortTurn,
  checkDraw,
  checkUndoDraw,
  checkDeclareCheft,
  checkLay,
  checkStealJoker,
  checkLayOff,
  current,
  layOffTargets,
  newGame,
  scoreOrder,
  startNextRound,
  tableThreshold,
  tempCardIds,
  winnerOfGame,
} from '../engine/game';
import { ALL_TYPES, ROMME_TYPES, Meld, MeldShape, findPartition, findAllPartitions, jokerRepresents, meldAugen, interpretMeld, replaceJoker } from '../engine/melds';
import { decideAction } from '../bot/bot';
import { BotChoice, LEVELS, STYLES, resolveBots, sanitizeChoice } from '../bot/names';
import { describeRole, roleOfStyle } from '../bot/roles';
import { describeTasteSet, tastesFor } from '../bot/tastes';
import { makeRng } from '../engine/cards';
import { t, cardName } from '../i18n';
import { h, clear } from './dom';
import { Atlas, buildAtlas, atlasOffset, backOf, backThumb } from './sprites';
import { BACK_DESIGNS, DEFAULT_BACK, backDesign } from './backs';
import { ICON_BOOK, ICON_GEAR, ICON_INFO, ICON_TABLE, ICON_UNDO, ICON_X, pixelIcon } from './icons';
import { backBtn, backChoiceRow, btn, roundsTable, fieldLabel, hint, iconBtn, lostIcon, meldEl as meldBox, seatLabel, showToast, viewEl, windowEl } from './components';
import { BREAKPOINTS, CARD_PX, EASE_FLY, HAND, MOTION, PEEK_FROM_SCALE, TURN_DISC, colorValue } from './tokens';
import { ScaleStep, deviceClass, tableLadder } from './tablescale';
import { renderGuide, DsLabels } from './guide';
import { RULES_DE } from './rules';
import { snapshot, flip, flyClone, dealAnimation, RectMap } from './anim';
import { NetClient, LobbyInfo, ServerUpdate, ClaimableSeat, defaultServerUrl, SNAPSHOT_TTL_MS } from '../net/client';
import { RoundView } from '../engine/view';
import { play, setSoundEnabled, unlockAudio, vibrate, SoundName, VIB } from './sound';
import { randomForgottenName } from './names';
import { packSave, unpackSave } from './savecode';
import { NavGuard } from './nav';

type Screen = 'menu' | 'setup' | 'rules' | 'guide' | 'game' | 'online' | 'lobby';
const ONLINE_KEY = 'cheft.online.v1';
/** So lange muss jemand getrennt sein, bevor das Funksymbol erscheint (kurze Aussetzer bleiben unsichtbar). */
const LOST_ICON_DELAY_MS = 10000;
interface StoredOnline {
  url: string;
  room: string;
  token: string;
  snap?: string;
  /** Zeitpunkt, an dem die Kopie zuletzt aktualisiert wurde. */
  at?: number;
}
const SAVE_KEY = 'cheft.save.v2';
/** Faktor, um den die Ablagefläche größer ist als der sichtbare Kreis. */
const DROP_ZONE_GROW = 1.15;

/** So lange nach einer Berührung der Kartenhand wird ein Zurück-Wischen ignoriert. */
const HAND_BACK_GUARD_MS = 1500;

const PREFS_KEY = 'cheft.prefs.v2';
/** Wählbare Rundenzahlen. */
const ROUND_CHOICES = [3, 5, 7, 9];
/** Obergrenze für die Auswahl „Wie auslegen?“. Es werden alle erlaubten Möglichkeiten angeboten, die Grenze schützt nur vor endlosem Rechnen. */
const ALL_OPTIONS = 500;

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
  /** Rückblick auf die letzten Abwürfe (langes Drücken auf die Ablage) im Solospiel. */
  peekDiscards: boolean;
  /** Ziehen mit Bestätigung: Gibt es mehrere Möglichkeiten, wählt das erste Tippen nur aus. */
  /** Design Guide: Nummern der Elemente über dem Spiel einblenden. */
  dsLabels: boolean;
  /** Gewählte Kartenrückseite (backs.ts), nur für die eigene Anzeige. */
  cardDesign: string;
  /** Sitzordnung der Bots: wie eingestellt oder zufällig. */
  seating: 'manual' | 'random';
  /** Karten zu Rundenbeginn nach Farbe sortiert austeilen. */
  sortedDeal: boolean;
}

interface DialogSpec {
  title: string;
  text?: string;
  /** Eingabefeld (zum Einfügen oder, schreibgeschützt, zum Kopieren). */
  input?: { value: string; readonly?: boolean; placeholder?: string };
  /** Entscheidung: Knöpfe wie „Abbrechen“ und die Aktion. */
  buttons?: { label: string; primary?: boolean; danger?: boolean; onClick?: (input: string) => void }[];
  /** Nur Anzeige: ein „Zurück“ als letzter Knopf; ein Tipp neben das Fenster schließt ebenfalls. */
  back?: boolean;
}

/** Die Einstellungen eines Spiels, wie Solo-Setup und Lobby sie anzeigen. */
interface SettingValues {
  seating: 'manual' | 'random';
  speed: 'normal' | 'fast';
  firstTurnOpenAllowed: boolean;
  sortedDeal: boolean;
  peekDiscards: boolean;
  rounds: number;
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

/** Je Quelle ein eigener, aber verwandter Ton beim Ziehen. */
function drawSound(source: 'stock' | 'discard' | 'carpet'): SoundName {
  return source === 'stock' ? 'drawStock' : source === 'discard' ? 'drawDiscard' : 'drawCarpet';
}

function hash(n: number): number {
  let x = (n + 1) * 2654435761;
  x = ((x >>> 13) ^ x) * 1274126177;
  return ((x >>> 16) ^ x) >>> 0;
}

/**
 * Eine Achse der Tischmitte. `want` ist die Wunschlage der Referenz (Spielfeldmitte), [lo, hi] der Bereich, in dem die Gruppe ohne
 * Berührung passt, `e0` der halbe Spielraum bei leerem Tisch. Je enger der Tisch, desto stärker zieht die Referenz zur Mitte des
 * freien Platzes (weich, ab 25 % Enge), und sie bleibt immer im Bereich. Bei viel Platz ist sie exakt auf der Spielfeldmitte.
 */
export function placeAxis(want: number, lo: number, hi: number, e0: number): number {
  if (hi < lo) return (lo + hi) / 2;
  const m = (lo + hi) / 2;
  const e = (hi - lo) / 2;
  const soft = (v: number): number => {
    const d = v - m;
    if (e <= 0 || d === 0) return m;
    const x = Math.abs(d) / e;
    const a = 0.5;
    const k = x <= a ? x : a + (1 - a) * (1 - Math.exp(-(x - a) / (1 - a)));
    return m + Math.sign(d) * e * k;
  };
  const crowd = e0 > 0 ? Math.max(0, Math.min(1, 1 - e / e0)) : 1;
  const t = Math.max(0, Math.min(1, (crowd - 0.25) / 0.5));
  const tau = t * t * (3 - 2 * t);
  return soft(m + (want - m) * (1 - tau));
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
    firstTurn: false,
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
    peekDiscards: true,
    seating: 'random',
    sortedDeal: true,
    dsLabels: false,
    cardDesign: DEFAULT_BACK,
  };
  /** Online: Verbindung, Raum und eigene Platznummer. */
  private net: NetClient | null = null;
  private online: { room: string; pid: number; token: string; lobby: LobbyInfo | null; status: 'connecting' | 'open' | 'closed' } | null = null;
  private joinCode = '';
  /** Raumcode aus dem Link, solange die Verbindung aufgebaut wird. */
  private linkRoom: string | null = null;
  /** Wann wir zuerst gesehen haben, dass ein Mensch getrennt ist (pid → Zeit). Das Funksymbol erscheint erst nach einer kurzen Verzögerung, damit kurze Aussetzer nicht flackern. */
  private lostSince = new Map<number, number>();
  /** Meine Anfrage auf einen Platz wartet auf die Zustimmung des Spielleiters. */
  private claimWait = false;
  /** Code, den wir gerade beitreten wollen: meldet der Server „gibt es nicht“, bieten wir an, den Raum neu zu eröffnen. */
  private pendingCode: string | null = null;
  /** Fehlender Raum: Angebot zum Neueröffnen (wait: noch so viele Sekunden, in denen Mitspieler ein laufendes Spiel wiederherstellen können). */
  private openOffer: { code: string; wait: number } | null = null;
  /** Eigener Dialog im Look der App (statt der Browser-Pop-ups). */
  private dialog: DialogSpec | null = null;
  private dialogInput = '';
  private lastDiscardTap = 0;
  /** Ersatzname, falls kein Name eingegeben wurde; bleibt während der Sitzung gleich. */
  private forgottenName = randomForgottenName();
  /** Kein Name eingegeben: der Ersatzname ist nur ein Vorschlag. */
  private autoName(): boolean {
    return !this.prefs.name.trim();
  }
  private playerName(): string {
    return this.prefs.name.trim() || this.forgottenName;
  }
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
  private drag: Drag | null = null;
  private botGen = 0;
  private botsRunning = false;
  private dealing = false;
  private showSettings = false;
  private showScores = false;
  /** Die drei Karten im Menü-Logo (2, 3, 2 mit drei verschiedenen Farben), bei jedem Aufruf des Menüs neu gezogen. */
  private logoCards: Card[] | null = null;
  private peekTable = false;
  private chooser: { title: string; hint: string; options: { shapes: MeldShape[]; label: string; onPick: () => void }[] } | null = null;
  private toastTimer: number | null = null;
  /** Nummern-Etiketten des Design Guides über dem Spiel. */
  private labels = new DsLabels();
  private rulesFrom: Screen = 'menu';
  /** Zurück-Geste/-Taste des Geräts: eine Ebene zurück, im Spiel und in der Lobby erst warnen, im Hauptmenü die App verlassen. */
  /** Zeitpunkt der letzten Berührung auf der eigenen Kartenhand: Ein Zurück-Wischen kurz danach ist ein Versehen vom Rand. */
  private lastHandTouch = 0;
  private nav = new NavGuard(
    window,
    () => this.screen === 'menu',
    () => this.navBack(),
    () => this.screen === 'game' && (!!this.drag || Date.now() - this.lastHandTouch < HAND_BACK_GUARD_MS),
  );

  constructor(root: HTMLElement) {
    this.root = root;
    this.loadPrefs();
    this.atlas = buildAtlas(this.prefs.cardDesign);
    document.documentElement.style.setProperty('--atlas', `url(${this.atlas.url})`);
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
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      document.addEventListener(type, (e) => {
        if ((e.target as HTMLElement | null)?.closest?.('.hand-wrap')) this.lastHandTouch = Date.now();
      }, { passive: true, capture: true });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.navBack()) e.preventDefault();
    });
    document.addEventListener('visibilitychange', () => void this.syncWakeLock());
    this.prewarm();
    const linked = this.pathRoomCode();
    if (linked) this.openRoomLink(linked);
    this.render();
  }

  /** Raumcode aus der Adresse, z. B. https://cheft.beigi.eu/232 */
  private pathRoomCode(): string | null {
    const m = location.pathname.match(/^\/(\d{3,4})\/?$/);
    return m ? m[1] : null;
  }

  /** Raumlink geöffnet: direkt beitreten, ohne etwas einzugeben (bei schlafendem Server dauert das bis zu einer Minute). */
  private openRoomLink(code: string): void {
    const stored = this.storedOnline();
    if (stored && stored.room === code) {
      this.nav.replaceUrl('/');
      this.resumeOnline(); // Seite neu geladen, du warst schon in diesem Raum
      return;
    }
    const url = this.serverUrl();
    if (!url) return;
    this.linkRoom = code;
    this.pendingCode = code;
    this.screen = 'online';
    const net = this.ensureNet();
    net.connect(url);
    const t0 = Date.now();
    const wait = () => {
      if (this.linkRoom !== code) return; // abgebrochen oder schon drin
      if (net.connected) {
        this.nav.replaceUrl('/');
        net.join(code, this.playerName(), undefined, this.autoName());
      } else if (Date.now() - t0 < 90000) setTimeout(wait, 200);
      else {
        this.linkRoom = null;
        this.toast(t('net.disconnected'), true);
        this.render();
      }
    };
    wait();
  }

  /** Weckt einen schlafenden Gratis-Server schon beim Start der App, damit er beim Beitreten bereit ist. */
  private prewarm(): void {
    const url = this.serverUrl();
    if (!url) return;
    try {
      const u = new URL(url);
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

  /** Aufdecken am Spielende: Stufe und Rolle des Bots in einer Zeile (bei der Wildcard die Rollen der Runden, darf umbrechen). */
  private botReveal(s: GameState, pid: number, bot: BotProfile): HTMLElement {
    const role = roleOfStyle(bot.style);
    const roleText = role === 'wildcard' ? describeRole(s, pid, 'wildcard') : t(`style.${role}`);
    return h('div', { class: 'factors accent reveal' }, `${t(`level.${bot.level}`)} · ${roleText}`);
  }

  /** Zwischen den Runden: nur die Werte, die in der Lobby fest gewählt waren (und nur bei fester Sitzordnung). */
  private botPartialReveal(bot: BotProfile): HTMLElement | null {
    const parts: string[] = [];
    if (bot.reveal?.level) parts.push(t(`level.${bot.level}`));
    if (bot.reveal?.style) parts.push(t(`style.${roleOfStyle(bot.style)}`));
    return parts.length ? h('div', { class: 'factors accent reveal' }, parts.join(' · ')) : null;
  }

  /** Infobox zum Bot (nur nach Spielende): jede Vorliebe in einer eigenen Zeile. */
  private botInfo(s: GameState, pid: number): void {
    const tastes = describeTasteSet(tastesFor(s.seed, pid));
    this.askDialog({
      title: s.players[pid].name,
      text: tastes.length ? `${t('gameEnd.tastes')}\n${tastes.join('\n')}` : t('gameEnd.noTastes'),
      back: true,
    });
  }

  // ------------------------------------------------------------ Persistenz
  private loadPrefs(): void {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<Prefs> & { v?: number };
        this.prefs = { ...this.prefs, ...stored };
        // Neuer Standard: Rauskommen im ersten Zug gesperrt (einmalig auch für gespeicherte Einstellungen).
        if ((stored.v ?? 0) < 3) this.prefs.firstTurn = false;
        // Neuer Standard: Sitzplätze zufällig (einmalig auch für gespeicherte Einstellungen).
        if ((stored.v ?? 0) < 4) this.prefs.seating = 'random';
      }
      // Bot-Auswahl aus älteren Versionen (alte Spielweisen) auf die neuen Rollen abbilden
      this.prefs.botChoices = (this.prefs.botChoices ?? []).map((c) => sanitizeChoice(c));
      if (!ROUND_CHOICES.includes(this.prefs.rounds)) this.prefs.rounds = 7;
      this.prefs.cardDesign = backDesign(this.prefs.cardDesign).id;
    } catch {
      /* ignorieren */
    }
  }
  private savePrefs(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ ...this.prefs, v: 4 }));
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
    // Ein angefangener Zug (z. B. mit genommener Ablagekarte) beginnt nach dem Laden wieder am Rücksetzpunkt.
    abortTurn(s.state);
    return { state: s.state, order: Array.isArray(s.order) ? s.order : [] };
  }
  /** Gespeichert wird ein angefangener Zug immer am Rücksetzpunkt (nach dem Laden beginnt er dort), damit kein Zustand mit Pflichtkarte hängen bleibt. */
  private persistable(state: GameState): GameState {
    const copy = structuredClone(state);
    abortTurn(copy);
    return copy;
  }
  private save(): void {
    if (this.online) return;
    try {
      if (this.state && !this.state.finished) localStorage.setItem(SAVE_KEY, JSON.stringify({ state: this.persistable(this.state), order: this.order }));
      else localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignorieren */
    }
  }
  private async exportSave(): Promise<void> {
    if (!this.state) return;
    const code = await packSave({ state: this.persistable(this.state), order: this.order });
    const show = () => this.askDialog({ title: t('btn.exportSave'), text: t('save.show'), input: { value: code, readonly: true }, back: true });
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(
        () => this.toast(t('save.copied')),
        () => show(),
      );
    } else show();
  }
  private importSave(): void {
    this.askDialog({
      title: t('btn.importSave'),
      text: t('save.prompt'),
      input: { value: '', placeholder: '…' },
      buttons: [
        { label: t('btn.cancel') },
        {
          label: t('btn.load'),
          primary: true,
          onClick: async (code) => {
            if (!code.trim()) return;
            let raw: string;
            try {
              raw = await unpackSave(code);
              JSON.parse(raw);
            } catch {
              // Nicht lesbar: meist wurde der Code nicht ganz kopiert
              this.toast(t('save.broken'), true);
              return;
            }
            try {
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
          },
        },
      ],
    });
  }

  // ------------------------------------------------------------ Rendern
  private render(): void {
    if (this.drag) return; // während des Ziehens nicht neu aufbauen
    const tableEl = this.root.querySelector('.table');
    const scroll = tableEl ? tableEl.scrollTop : 0;
    // Scrollende Flächen merken: Menüs und Formulare (.menu), ganzseitige Ansichten wie Regeln und Design Guide (.view-body)
    const scrollers = ['.menu', '.view-body'].map((sel) => [sel, this.root.querySelector(sel)?.scrollTop ?? 0] as const);
    // Auch ein Fenster, das selbst scrollt (Einstellungen mit vielen Rückseiten), behält seine Scrollposition beim Neuaufbau
    const oldDialog = this.root.querySelector('.overlay > .dialog');
    const dialogScroll = oldDialog?.scrollTop ?? 0;
    const dialogKey = oldDialog?.querySelector('h2')?.textContent ?? '';
    const prevScreen = this.root.dataset.screen;
    clear(this.root);
    this.root.dataset.screen = this.screen;
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
      case 'guide':
        this.root.appendChild(this.renderGuideScreen());
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
        this.layoutPlacement();
        this.layoutDisc();
        const nt = this.root.querySelector('.table');
        if (nt) nt.scrollTop = scroll;
        break;
    }
    // Gleicher Bildschirm (z. B. Einstellung angetippt, Nummern im Guide umgeschaltet): Scrollposition behalten.
    // Beim Wechsel zu einem anderen Bildschirm beginnt die Ansicht oben.
    if (prevScreen === this.screen) {
      for (const [sel, pos] of scrollers) {
        const el = pos > 0 ? this.root.querySelector(sel) : null;
        if (el) el.scrollTop = pos;
      }
    }
    if (this.dialog) this.root.appendChild(this.renderDialog(this.dialog));
    if (dialogScroll > 0) {
      const nd = this.root.querySelector('.overlay > .dialog');
      if (nd && nd.querySelector('h2')?.textContent === dialogKey) nd.scrollTop = dialogScroll;
    }
    void this.syncWakeLock();
    this.labels.refresh(this.prefs.dsLabels);
    this.nav.sync();
    this.refreshPeek();
  }

  // ------------------------------------------------------------ Eigener Dialog
  private askDialog(spec: DialogSpec): void {
    document.querySelector('.toast')?.remove();
    this.dialog = spec;
    this.dialogInput = spec.input?.value ?? '';
    this.render();
  }

  private closeDialog(): void {
    this.dialog = null;
    this.render();
  }

  private renderDialog(d: DialogSpec): HTMLElement {
    let field: HTMLElement | null = null;
    if (d.input) {
      const ta = h('textarea', {
        class: 'text',
        rows: '4',
        placeholder: d.input.placeholder ?? '',
        readonly: d.input.readonly ? 'readonly' : null,
        oninput: (e: Event) => (this.dialogInput = (e.target as HTMLTextAreaElement).value),
        onfocus: (e: Event) => d.input?.readonly && (e.target as HTMLTextAreaElement).select(),
      }) as HTMLTextAreaElement;
      ta.value = this.dialogInput;
      field = ta;
    }
    const buttons = (d.buttons ?? []).map((b) =>
      btn(
        b.label,
        () => {
          const value = this.dialogInput;
          this.closeDialog();
          b.onClick?.(value);
        },
        { variant: b.danger ? 'danger' : b.primary ? 'primary' : 'default' },
      ),
    );
    return windowEl(
      [h('h2', null, d.title), d.text ? h('p', null, d.text) : null, field, buttons.length ? h('div', { class: 'btn-row' }, ...buttons) : null, d.back ? backBtn(() => this.closeDialog()) : null],
      d.back ? () => this.closeDialog() : undefined,
    );
  }

  private cardEl(
    card: Card | 'back' | 'back2' | 'slot',
    opts: { selected?: boolean; onClick?: () => void; temp?: boolean; title?: string; small?: boolean; mini?: boolean; fresh?: boolean; cls?: string; backId?: string } = {},
  ): HTMLElement {
    const off = atlasOffset(this.atlas.index(card));
    const sc = opts.mini ? '1' : opts.small ? 'var(--so)' : 'var(--s)';
    const el = h('div', {
      class: `card${opts.small ? ' o' : ''}${opts.mini ? ' mini' : ''}${opts.selected ? ' selected' : ''}${opts.onClick ? ' clickable' : ''}${opts.temp ? ' temp' : ''}${opts.fresh ? ' fresh' : ''}${opts.cls ? ' ' + opts.cls : ''}`,
      style: { backgroundPosition: `calc(${-off.x}px * ${sc}) calc(${-off.y}px * ${sc})` },
      title: opts.title ?? (typeof card === 'string' ? '' : cardName(card)),
      onclick: opts.onClick,
    });
    // Fremdes Rückseiten-Design (Mehrspieler): als eigenes Bild über den Atlas legen
    if (opts.backId && (card === 'back' || card === 'back2')) {
      el.style.backgroundImage = `url(${backThumb(opts.backId, card === 'back' ? 'a' : 'b')})`;
      el.style.backgroundSize = '100% 100%';
      el.style.backgroundPosition = '0 0';
    }
    if (typeof card !== 'string' && !opts.mini) el.dataset.cardId = String(card.id);
    return el;
  }

  // ------------------------------------------------------------ Menü
  private renderMenu(): HTMLElement {
    if (!this.logoCards) {
      const suits: Suit[] = shuffle(SUITS, Math.random);
      this.logoCards = [2, 3, 2].map((rank, i) => ({ id: -(i + 1), suit: suits[i], rank }));
    }
    const demo = this.logoCards;
    const hasSave = !!this.state && !this.state.finished;
    const hasRoom = !!this.storedOnline();
    return h(
      'div',
      { class: 'menu' },
      h('div', { class: 'logo' }, h('div', { class: 'logo-cards' }, ...demo.map((c) => this.cardEl(c))), h('h1', null, t('app.title')), h('div', { class: 'muted' }, t('app.subtitle'))),
      h(
        'div',
        { class: 'panel' },
        h(
          'div',
          { class: 'menu-group' },
          btn(t('btn.newGame'), () => this.goto('setup'), { variant: hasSave || hasRoom ? 'default' : 'primary' }),
          hasSave && btn(t('btn.continue'), () => this.continueGame(), { variant: 'primary' }),
          btn(t('btn.importSave'), () => this.importSave()),
        ),
        h(
          'div',
          { class: 'menu-group' },
          btn(t('btn.online'), () => this.goto('online')),
          hasRoom ? btn(t('lobby.backToLobby'), () => this.resumeOnline(), { variant: 'primary' }) : null,
        ),
        h(
          'div',
          { class: 'menu-group' },
          btn(t('btn.rules'), () => this.showRules('menu')),
          btn(t('btn.guide'), () => this.goto('guide')),
          btn(t('btn.settings'), () => {
            this.showSettings = true;
            this.render();
          }),
        ),
      ),
      this.showSettings ? this.renderSettings() : null,
    );
  }

  private choice(label: string, values: { v: unknown; label: string }[], get: () => unknown, set: (v: unknown) => void): HTMLElement {
    return h(
      'div',
      { class: 'option' },
      fieldLabel(label),
      h(
        'div',
        { class: 'choices' },
        ...values.map((o) =>
          btn(
            o.label,
            () => {
              set(o.v);
              this.savePrefs();
              this.render();
            },
            { variant: get() === o.v ? 'primary' : 'default' },
          ),
        ),
      ),
    );
  }

  /** Die Spieleinstellungen in fester Reihenfolge, im Solo-Setup und in der Lobby gleich. */
  private settingChoices(v: SettingValues, set: (patch: Partial<SettingValues>) => void): HTMLElement[] {
    const yesNo = [
      { v: true, label: t('setup.yes') },
      { v: false, label: t('setup.no') },
    ];
    return [
      this.choice(t('setup.seating'), [{ v: 'manual', label: t('setup.seating.manual') }, { v: 'random', label: t('setup.seating.random') }], () => v.seating, (x) => set({ seating: x as SettingValues['seating'] })),
      this.choice(t('settings.speed'), [{ v: 'normal', label: t('settings.speed.normal') }, { v: 'fast', label: t('settings.speed.fast') }], () => v.speed, (x) => set({ speed: x as SettingValues['speed'] })),
      this.choice(t('setup.firstTurn'), yesNo, () => v.firstTurnOpenAllowed, (x) => set({ firstTurnOpenAllowed: x as boolean })),
      this.choice(t('setup.sortedDeal'), [{ v: true, label: t('setup.sortedDeal.yes') }, { v: false, label: t('setup.sortedDeal.no') }], () => v.sortedDeal, (x) => set({ sortedDeal: x as boolean })),
      this.choice(t('setup.peek'), yesNo, () => v.peekDiscards, (x) => set({ peekDiscards: x as boolean })),
      this.choice(t('setup.rounds'), ROUND_CHOICES.map((n) => ({ v: n, label: String(n) })), () => v.rounds, (x) => set({ rounds: x as number })),
    ];
  }

  /** Dieselben Einstellungen für Mitspieler ohne Rechte: eine Zeile je Einstellung, gleiche Reihenfolge. */
  private settingSummary(v: SettingValues): HTMLElement[] {
    const row = (label: string, value: string) => h('div', { class: 'row spread summary-row' }, h('span', { class: 'field-label' }, label), h('span', null, value));
    return [
      row(t('setup.seating'), t(`setup.seating.${v.seating}`)),
      row(t('settings.speed'), t(`settings.speed.${v.speed}`)),
      row(t('setup.firstTurn'), t(v.firstTurnOpenAllowed ? 'setup.yes' : 'setup.no')),
      row(t('setup.sortedDeal'), t(v.sortedDeal ? 'setup.sortedDeal.yes' : 'setup.sortedDeal.no')),
      row(t('setup.peek'), t(v.peekDiscards ? 'setup.yes' : 'setup.no')),
      row(t('setup.rounds'), String(v.rounds)),
    ];
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
        h('div', { class: 'option' }, fieldLabel(t('setup.name')), nameInput),
        this.choice(t('setup.bots'), [{ v: 2, label: '2' }, { v: 3, label: '3' }], () => this.prefs.bots, (v) => (this.prefs.bots = v as number)),
        ...this.prefs.botChoices.slice(0, this.prefs.bots).map((c, i) => this.botRow(c, i)),
        btn(t('setup.allRandom'), () => {
          this.prefs.botChoices = this.prefs.botChoices.map(() => ({ level: 'random', style: 'random' }));
          this.savePrefs();
          this.render();
        }),
        ...this.settingChoices(
          { seating: this.prefs.seating, speed: this.prefs.speed, firstTurnOpenAllowed: this.prefs.firstTurn, sortedDeal: this.prefs.sortedDeal, peekDiscards: this.prefs.peekDiscards, rounds: this.prefs.rounds },
          (patch) => {
            if (patch.seating !== undefined) this.prefs.seating = patch.seating;
            if (patch.speed !== undefined) this.prefs.speed = patch.speed;
            if (patch.firstTurnOpenAllowed !== undefined) this.prefs.firstTurn = patch.firstTurnOpenAllowed;
            if (patch.sortedDeal !== undefined) this.prefs.sortedDeal = patch.sortedDeal;
            if (patch.peekDiscards !== undefined) this.prefs.peekDiscards = patch.peekDiscards;
            if (patch.rounds !== undefined) this.prefs.rounds = patch.rounds;
          },
        ),
        hint(t('setup.directionCcw')),
        btn(t('btn.start'), () => this.startGame(), { variant: 'primary' }),
        backBtn(() => this.back()),
      ),
    );
  }

  /** Eine Zeile je Bot: Stufe und Spielweise durchschalten, "Zufall" verbirgt die Rolle. */
  /** Eigenen Namen ändern (Lobby und Spiel): wird beim Verlassen des Felds oder mit Enter übernommen. */
  private nameDraft: string | null = null;

  private nameField(current: string): HTMLElement {
    return h('input', {
      class: 'text name-edit',
      type: 'text',
      maxlength: '12',
      value: this.nameDraft ?? current,
      placeholder: this.forgottenName,
      title: t('setup.name'),
      oninput: (e: Event) => (this.nameDraft = (e.target as HTMLInputElement).value),
      onchange: (e: Event) => this.commitName((e.target as HTMLInputElement).value, current),
      onblur: () => {
        if (this.nameDraft !== null) this.commitName(this.nameDraft, current);
      },
      onkeydown: (e: KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLElement).blur();
      },
    });
  }

  private commitName(value: string, current: string): void {
    this.nameDraft = null;
    const v = value.trim();
    if (!v || v === current) {
      this.render();
      return;
    }
    this.prefs.name = v;
    this.savePrefs();
    this.net?.rename(v);
    if (!this.online && this.state?.players[this.me]) {
      // Einzelspiel: Name direkt im laufenden Spiel und im Speicherstand ändern
      this.state.players[this.me].name = v;
      this.save();
    }
  }

  /** Zwei gleich breite Knöpfe nebeneinander (Stufe und Spielweise), Überschrift darüber. Bricht nie um. */
  private botPicker(c: BotChoice, onChange: (next: BotChoice) => void): HTMLElement {
    const cycle = <T extends string>(list: readonly T[], cur: T | 'random'): T | 'random' => {
      const all: (T | 'random')[] = ['random', ...list];
      return all[(all.indexOf(cur) + 1) % all.length];
    };
    const col = (caption: string, value: string, active: boolean, onclick: () => void) =>
      h('div', { class: 'bot-col' }, hint(caption), btn(value, onclick, { variant: active ? 'primary' : 'default' }));
    return h(
      'div',
      { class: 'bot-pick' },
      col(t('setup.level'), c.level === 'random' ? t('setup.random') : t(`level.${c.level}`), c.level !== 'random', () => onChange({ level: cycle(LEVELS, c.level), style: c.style })),
      col(t('setup.style'), c.style === 'random' ? t('setup.random') : t(`style.${c.style}`), c.style !== 'random', () => onChange({ level: c.level, style: cycle(STYLES, c.style) })),
    );
  }

  private botRow(c: BotChoice, i: number): HTMLElement {
    return h(
      'div',
      { class: 'option' },
      fieldLabel(t(this.prefs.bots === 3 ? ['seat.right', 'seat.top', 'seat.left'][i] : ['seat.right', 'seat.left'][i])),
      this.botPicker(c, (next) => {
        c.level = next.level;
        c.style = next.style;
        this.savePrefs();
        this.render();
      }),
    );
  }


  private renderRules(): HTMLElement {
    return viewEl(
      t('btn.rules'),
      RULES_DE.map((sec) => h('div', null, h('h3', null, sec.title), h('ul', null, ...sec.items.map((i) => h('li', null, i))))),
      () => this.back(),
      'reading rules',
    );
  }

  private renderGuideScreen(): HTMLElement {
    return renderGuide({
      cardEl: (card, opts) => this.cardEl(card, opts),
      atlasUrl: this.atlas.url,
      atlasIndex: (card) => this.atlas.index(card),
      labelsOn: this.prefs.dsLabels,
      setLabels: (on) => {
        this.prefs.dsLabels = on;
        this.savePrefs();
        this.render();
      },
      onBack: () => this.back(),
    });
  }

  private goto(screen: Screen): void {
    this.screen = screen;
    this.showSettings = false;
    this.showScores = false;
    if (screen === 'menu') this.logoCards = null;
    this.render();
  }

  private showRules(from: Screen): void {
    this.rulesFrom = from;
    this.showSettings = false;
    this.goto('rules');
  }

  /**
   * Zurück: die eine Regel für alles, was sich „schließen“ lässt. Beendet die oberste offene Ebene und geht zur
   * vorherigen zurück (Fenster -> Seite darunter, Regeln/Guide/Setup/Online -> Menü oder Spiel). Der „Zurück“-Knopf,
   * ein Tipp neben ein Fenster und die Esc-Taste rufen alle diese Methode auf. Gibt zurück, ob etwas geschlossen wurde.
   * Entscheidungen (Cheft ansagen, Spiel abbrechen) haben statt „Zurück“ ein „Abbrechen“ und gehören nicht dazu.
   */
  private back(): boolean {
    if (this.dialog) {
      this.closeDialog();
      return true;
    }
    if (this.screen === 'game') {
      if (this.online?.lobby?.paused) return false;
      if (this.chooser) this.chooser = null;
      else if (this.showScores) this.showScores = false;
      else if (this.showSettings) this.showSettings = false;
      else return false;
      this.render();
      return true;
    }
    if (this.showSettings) {
      this.showSettings = false;
      this.render();
      return true;
    }
    switch (this.screen) {
      case 'rules':
        this.goto(this.rulesFrom);
        return true;
      case 'guide':
      case 'setup':
        this.goto('menu');
        return true;
      case 'online':
        if (this.claimChoice || this.openOffer) {
          this.claimChoice = null;
          this.openOffer = null;
          this.render();
        } else this.goto('menu');
        return true;
      default:
        return false;
    }
  }

  /**
   * Zurück-Geste, Zurück-Taste des Geräts und Esc: erst schließen, was offen ist (back), sonst im Spiel und in der
   * Lobby vor dem Verlassen warnen. Im Hauptmenü gibt es nichts zu tun (false): Dort verlässt „Zurück“ die App.
   */
  private navBack(): boolean {
    if (this.back()) return true;
    if (this.screen === 'lobby' || (this.screen === 'game' && this.online)) {
      this.leaveOnline(true);
      return true;
    }
    if (this.screen === 'game') {
      // Beendetes Solospiel: nichts mehr zu verlieren. Laufendes Spiel: warnen, der Stand bleibt gespeichert.
      if (this.state?.finished) this.saveAndQuit();
      else
        this.askDialog({
          title: t('confirm.toMenu.title'),
          text: t('confirm.toMenu'),
          buttons: [{ label: t('btn.continue'), primary: true }, { label: t('btn.toMenu'), onClick: () => this.saveAndQuit() }],
        });
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------ Spielsteuerung
  private startGame(): void {
    const name = this.playerName();
    const players: PlayerInfo[] = [{ id: 0, name, isBot: false }];
    const bots = resolveBots(this.prefs.botChoices.slice(0, this.prefs.bots), makeRng(Date.now() % 2147483647));
    if (this.prefs.seating === 'random') {
      // Zufällige Sitzordnung: Die Bots werden neu auf die Plätze verteilt, du sitzt unten.
      for (let i = bots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bots[i], bots[j]] = [bots[j], bots[i]];
      }
    }
    const seatFixed = this.prefs.seating !== 'random';
    bots.forEach((b, i) => players.push({ id: i + 1, name: b.name, isBot: true, bot: { level: b.level, style: b.style, reveal: seatFixed ? b.fixed : undefined } }));
    const settings: Settings = { rounds: this.prefs.rounds, firstTurnOpenAllowed: this.prefs.firstTurn, direction: 'ccw', peekDiscards: this.prefs.peekDiscards, sortedDeal: this.prefs.sortedDeal };
    // Wer die erste Runde austeilt (und damit wer beginnt), wird ausgelost.
    this.state = newGame(players, settings, undefined, Math.floor(Math.random() * players.length));
    this.order = [];
    this.fresh.clear();
    this.selected.clear();
    this.peekTable = false;
    this.botGen++;
    this.save();
    this.screen = 'game';
    void this.startRoundWithDeal();
  }

  private continueGame(): void {
    if (!this.state) return;
    this.selected.clear();
    this.fresh.clear();
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
    await dealAnimation(stock ? stock.getBoundingClientRect() : null, targets, 7, CARD_PX.w * s, CARD_PX.h * s);
    this.dealing = false;
    play('card');
    this.render();
    void this.runBots();
  }

  private quitGame(): void {
    this.showSettings = false;
    this.askDialog({
      title: t('confirm.quit.title'),
      text: t('confirm.quit'),
      buttons: [
        { label: t('btn.cancel') },
        {
          label: t('btn.quit'),
          danger: true,
          onClick: () => {
            this.state = null;
            this.botGen++;
            this.save();
            this.goto('menu');
          },
        },
      ],
    });
  }

  private saveAndQuit(): void {
    this.save();
    this.botGen++;
    this.goto('menu');
  }

  // ------------------------------------------------------------ Rückblick auf Abwürfe
  private peekSuppress = false;
  private peekLayer: HTMLElement | null = null;
  private peekShown = new Set<string>();
  private peekTimer: number | null = null;

  /** Rückblick ist erlaubt (Einstellung), sobald Abwürfe vorliegen, auch wenn man nicht an der Reihe ist. */
  private canPeek(): boolean {
    const s = this.state;
    if (!s || this.screen !== 'game' || this.drag) return false;
    const r = s.round;
    return !!s.settings.peekDiscards && !r.ended && !r.waiting && (r.discardLog ?? []).length > 0;
  }

  /** Langes Drücken auf die Ablage zeigt die letzten Abwürfe, solange der Finger bleibt. */
  private bindPeek(el: HTMLElement): void {
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', () => {
      if (this.peekTimer) clearTimeout(this.peekTimer);
      if (!this.canPeek()) return;
      this.peekTimer = window.setTimeout(() => {
        this.peekTimer = null;
        this.showPeek();
      }, MOTION.peekHold);
    });
    const cancel = () => {
      if (this.peekTimer) clearTimeout(this.peekTimer);
      this.peekTimer = null;
    };
    el.addEventListener('pointerup', cancel);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('pointerleave', cancel);
  }

  private hidePeek(): void {
    if (!this.peekLayer) return;
    const layer = this.peekLayer;
    this.peekLayer = null;
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: MOTION.peekOut, fill: 'forwards' }).onfinish = () => layer.remove();
    window.setTimeout(() => (this.peekSuppress = false), MOTION.peekGuard);
  }

  /**
   * Zeigt die letzten Abwürfe der anderen: Der Tisch wird abgedunkelt, jede Karte gleitet von der Ablage ein Stück
   * in Richtung des Spielers, der sie abgeworfen hat, und trägt dessen Namen. So ist klar, dass es nur ein Rückblick
   * ist und keine Karte auf dem Stapel oder in der Ablage eines Spielers liegt.
   */
  private showPeek(): void {
    if (!this.canPeek() || this.peekLayer) return;
    const layer = h('div', { class: 'peek-layer' }, h('div', { class: 'peek-banner' }, t('peek.title')));
    if (!this.fillPeek(layer, new Set())) return;
    this.peekSuppress = true;
    vibrate(VIB.short, this.prefs.vibration);
    document.body.appendChild(layer);
    this.peekLayer = layer;
    // Nach dem Loslassen bleibt die Ansicht stehen (der Daumen ist sonst im Weg). Erst das nächste Tippen irgendwo
    // beendet sie; dieses Tippen löst nichts darunter aus, damit nicht aus Versehen eine Karte gezogen wird.
    const released = () => {
      document.removeEventListener('pointerup', released);
      document.removeEventListener('pointercancel', released);
      const dismiss = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        document.removeEventListener('pointerdown', dismiss, true);
        const swallow = (ev: Event) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        document.addEventListener('click', swallow, true);
        window.setTimeout(() => document.removeEventListener('click', swallow, true), 450);
        this.hidePeek();
      };
      // Kurz warten, damit das Loslassen selbst nicht als Tippen zählt
      window.setTimeout(() => {
        if (this.peekLayer === layer) document.addEventListener('pointerdown', dismiss, true);
      }, 60);
    };
    document.addEventListener('pointerup', released);
    document.addEventListener('pointercancel', released);
  }

  /** Die zuletzt abgeworfene Karte jedes Spielers (auch die eigene: so sieht man, ob sie inzwischen genommen wurde). */
  private lastDiscards(): { player: number; card: Card }[] {
    const seen = new Set<number>();
    const out: { player: number; card: Card }[] = [];
    for (const e of [...(this.state!.round.discardLog ?? [])].reverse()) {
      if (seen.has(e.player)) continue;
      seen.add(e.player);
      out.push(e);
    }
    return out.reverse();
  }

  /** Baut die Karten des Rückblicks neu auf; nur Karten, die nicht in `keep` stehen, fliegen animiert ein. Liefert false, wenn nichts anzuzeigen ist. */
  private fillPeek(layer: HTMLElement, keep: Set<string>): boolean {
    const s = this.state!;
    const r = s.round;
    const entries = this.lastDiscards();
    const pile = this.root.querySelector('.discard .card:last-child')?.getBoundingClientRect() ?? this.root.querySelector('.discard')?.getBoundingClientRect();
    if (!entries.length || !pile) return false;
    layer.querySelectorAll('.peek-line, .peek-item').forEach((n) => n.remove());
    this.peekShown = new Set(entries.map((e) => e.card.id));
    const pc = { x: pile.left + pile.width / 2, y: pile.top + pile.height / 2 };
    const margin = pile.width * 0.7;
    entries.forEach((e, i) => {
      const seat = this.seatRect(e.player);
      const sc = seat ? { x: seat.left + seat.width / 2, y: seat.top + seat.height / 2 } : { x: pc.x, y: pc.y - 200 };
      // Gut die Hälfte des Wegs von der Ablage zum Sitz, aber im Bild bleiben
      let tx = pc.x + (sc.x - pc.x) * 0.58;
      let ty = pc.y + (sc.y - pc.y) * 0.58;
      tx = Math.min(window.innerWidth - margin, Math.max(margin, tx));
      ty = Math.min(window.innerHeight - margin * 1.6, Math.max(margin * 1.4, ty));
      const len = Math.hypot(tx - pc.x, ty - pc.y);
      const line = h('div', { class: 'peek-line' });
      line.style.cssText = `left:${pc.x}px;top:${pc.y}px;width:${len}px;transform:rotate(${Math.atan2(ty - pc.y, tx - pc.x)}rad)`;
      const takenBy = r.taken.find((x) => x.card.id === e.card.id);
      const stillThere = r.discard.some((c) => c.id === e.card.id);
      const who = s.players[e.player].name;
      const tag = h('div', { class: 'peek-tag' }, who, takenBy && !stillThere ? h('div', { class: 'peek-taken' }, t('peek.taken', { name: s.players[takenBy.player].name })) : null);
      const card = this.cardEl(e.card, {});
      delete card.dataset.cardId;
      const item = h('div', { class: `peek-item${takenBy && !stillThere ? ' taken' : ''}` }, card, tag);
      item.style.left = `${tx - pile.width / 2}px`;
      item.style.top = `${ty - pile.height / 2}px`;
      item.style.width = `${pile.width}px`;
      layer.appendChild(line);
      layer.appendChild(item);
      if (!keep.has(e.card.id)) item.animate([{ transform: `translate(${pc.x - tx}px, ${pc.y - ty}px) scale(${PEEK_FROM_SCALE})`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: MOTION.peekIn, delay: keep.size ? 0 : i * MOTION.peekStagger, easing: EASE_FLY, fill: 'backwards' });
    });
    return true;
  }

  /** Nach jedem Neuaufbau: läuft der Rückblick, zeigt er sofort die neuesten Abwürfe (nur neue Karten fliegen ein). */
  private refreshPeek(): void {
    const layer = this.peekLayer;
    if (!layer) return;
    const s = this.state;
    if (!s || this.screen !== 'game' || s.round.ended || !s.settings.peekDiscards) return this.hidePeek();
    this.fillPeek(layer, this.peekShown);
  }

  /** Eine gezogene Karte fliegt vom Stapel (verdeckt) oder von der Ablage (offen) zum Sitz des Spielers. */
  private flyDraw(d: { pid: number; source: 'stock' | 'discard' | 'carpet'; from: DOMRect | null; face: Card | null; back: Card | null }): void {
    const seat = this.seatRect(d.pid);
    if (!d.from || !seat) return;
    const ghost = this.cardEl(d.source === 'stock' ? (d.back ? backOf(d.back) : 'back') : (d.face ?? 'back'));
    ghost.classList.add('fly');
    delete ghost.dataset.cardId;
    document.body.appendChild(ghost);
    const to = new DOMRect(seat.left + seat.width / 2 - d.from.width / 2, seat.top + seat.height / 2 - d.from.height / 2, d.from.width, d.from.height);
    void flyClone(ghost, d.from, to, 320, true, 0, 0).then(() => ghost.remove());
    ghost.remove();
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
      // Das Zurücksetzen prüft nur, ob es einen Rücksetzpunkt gibt; den Inhalt kennt allein der Server.
      const probe = action.kind === 'undoDraw' ? checkUndoDraw(s, this.me) : applyAction(structuredClone(s), this.me, action);
      if (!probe.ok) {
        this.toast(t(probe.error, probe.params), true);
        this.errorFx();
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
    if (res.ok) this.noteModes();
    if (!res.ok) {
      this.toast(t(res.error, res.params), true);
      this.errorFx();
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
    if (action.kind === 'steal' && !this.online) this.selected = new Set([s.round.turn.pendingJokerId ?? -1]);
    if (action.kind === 'discard' || action.kind === 'lay' || action.kind === 'layOff') {
      if (!this.online) {
        const hand = new Set(s.round.players[this.me].hand.map((c) => c.id));
        for (const id of [...this.selected]) if (!hand.has(id)) this.selected.delete(id);
      } else this.selected.clear();
    }
    if (action.kind === 'discard') this.fresh.clear();
    if (action.kind === 'draw') {
      play(drawSound(action.source));
      vibrate(VIB.short, this.prefs.vibration);
    } else if (action.kind === 'discard') {
      play('discard');
      vibrate(VIB.short, this.prefs.vibration);
    } else if (action.kind === 'lay' || action.kind === 'layOff' || action.kind === 'steal') {
      play('lay');
      vibrate(VIB.short, this.prefs.vibration);
    } else if (action.kind === 'ready') play('tick');
  }

  /** Fehler: tiefer Ton und zweimal kurz. */
  private errorFx(): void {
    play('error');
    vibrate(VIB.error, this.prefs.vibration);
  }

  private onRoundEnded(): void {
    this.peekTable = false; // Das Ergebnis-Popup geht immer auf, egal was in der Vorrunde gedrückt wurde
    const r = this.state!.round.result!;
    if (r.winner === this.me) {
      play('win');
      vibrate(VIB.win, this.prefs.vibration);
    } else play('lose');
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
        const drawInfo =
          action.kind === 'draw'
            ? {
                pid,
                source: action.source,
                from: this.pileRect(action.source),
                face: action.source === 'discard' ? (this.state.round.discard[this.state.round.discard.length - 1] ?? null) : action.source === 'carpet' ? this.state.round.carpet : null,
                back: this.state.round.stock[this.state.round.stock.length - 1] ?? null,
              }
            : null;
        const res = applyAction(this.state, pid, action);
        if (!res.ok) {
          console.error('Bot-Fehler', action, res.error);
          const hand = this.state.round.players[pid].hand;
          applyAction(this.state, pid, { kind: 'discard', cardId: hand[hand.length - 1].id });
        }
        this.noteModes();
        this.save();
        this.render();
        if (action.kind === 'draw') {
          play(drawSound(action.source));
          if (drawInfo) this.flyDraw(drawInfo);
          void flip(this.root, before, {});
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
    this.peekTable = false;
    this.chooser = null;
    this.save();
    void this.startRoundWithDeal();
  }

  private toast(msg: string, error = false): void {
    this.toastTimer = showToast(msg, error, this.toastTimer);
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
    // Die offene Startkarte liegt in der Sortierphase noch auf dem Tisch und wandert erst mit „Bereit“ in die Hand.
    // (Auch die Teppich-Joker liegen noch offen auf dem Tisch und wandern erst mit „Bereit“ in die Hand.)
    const hiddenOpenId = r.waiting && this.me === r.starter ? r.turn.drawnCardId : null;
    const hidden = new Set<number>([...(hiddenOpenId !== null ? [hiddenOpenId] : []), ...(r.waiting && this.me === r.starter ? (r.carpetJokers ?? []).map((c) => c.id) : [])]);
    const handIds = me.hand.filter((c) => !hidden.has(c.id)).map((c) => c.id);
    const have = new Set(handIds);
    this.order = this.order.filter((id) => have.has(id));
    const known = new Set(this.order);
    const added = handIds.filter((id) => !known.has(id));
    if (this.order.length === 0) this.order = (this.state!.settings.sortedDeal === false ? me.hand : sortBySuit(me.hand)).filter((c) => !hidden.has(c.id)).map((c) => c.id);
    else this.order.push(...added);
    if (myTurn) {
      for (const id of added) {
        if (id === r.turn.drawnCardId || id === r.turn.pendingJokerId || (r.carpetJokers ?? []).some((c) => c.id === id)) this.fresh.add(id);
      }
    }
    for (const id of [...this.fresh]) if (!have.has(id)) this.fresh.delete(id);

    const header = h(
      'div',
      { class: 'topbar' },
      iconBtn(pixelIcon(ICON_TABLE), t('btn.scores'), () => {
        this.showScores = true;
        this.render();
      }),
      h('span', { class: 'accent round-no' }, h('span', { class: 'rl' }, `${t('round.word')} `), `${r.no}/${s.settings.rounds}`),
      h(
        'div',
        { class: 'icons' },
        iconBtn(pixelIcon(ICON_BOOK), t('btn.rules'), () => this.showRules('game')),
        iconBtn(pixelIcon(ICON_GEAR), t('btn.settings'), () => {
          this.showSettings = true;
          this.render();
        }),
      ),
    );

    // Keine Tipps: Weder Ablage-, Stapel- oder Teppichkarte noch passende Kombinationen werden hervorgehoben.
    const selectedCards = me.hand.filter((c) => this.selected.has(c.id));
    const singleSel = selectedCards.length === 1 ? selectedCards[0] : null;
    // Vorübergehende Karten des Spielers am Zug (für alle sichtbar, rot umrandet)
    const tempIds = new Set(tempCardIds(r));

    // Tisch
    const table = h('div', { class: 'table' });
    // Wer dran ist: großer goldener Pixel-Kreis hinter allem, seine Mitte liegt auf der Spielfeldkante bei diesem Spieler (layoutDisc)
    // (auch vor dem Start der Runde: Der Kreis zeigt sofort, wer anfängt)
    if (!r.ended) {
      const activePos = current(s) === this.me ? 'bottom' : this.seats().find((x) => x.pid === current(s))?.pos;
      if (activePos) table.appendChild(h('div', { class: 'turn-clip' }, h('div', { class: 'turn-disc', dataset: { pos: activePos } })));
    }
    // Offene Startkarte: liegt im Auslagebereich des Startspielers (dort ist in dieser Phase noch nichts ausgelegt).
    const starterCard = r.waiting ? ((r as RoundView).openCard ?? r.players[r.starter].hand.find((c) => c.id === r.turn.drawnCardId)) : undefined;
    // Die eigene offene Startkarte antippen heißt: nehmen, also dasselbe wie „Bereit“.
    const openCardEl = (pid: number): HTMLElement | null =>
      starterCard
        ? h(
            'div',
            { class: 'pile open-card' },
            h('span', null, t('wait.openCard')),
            this.cardEl(starterCard, { small: true, title: cardName(starterCard), onClick: pid === this.me && !r.ready[this.me] ? () => this.act({ kind: 'ready' }) : undefined }),
          )
        : null;
    // Teppich-Joker: Wer beim Abheben unter der Teppichkarte lag, bekommt der Startspieler. Jeder sieht sie links neben der offenen Karte
    // (im Stil einer Auslage, mit Titel), bis „Bereit“ gedrückt ist.
    const carpetJk = r.waiting ? ((r as RoundView).carpetJokers ?? []) : [];
    const carpetJokersEl = (): HTMLElement | null =>
      carpetJk.length ? h('div', { class: 'pile open-card' }, h('span', null, t('carpet.label')), meldBox(carpetJk.map((c) => this.cardEl(c, { small: true, title: cardName(c) })))) : null;
    const showFan = window.innerWidth >= BREAKPOINTS.fan && window.innerHeight >= BREAKPOINTS.fanHeight;
    for (const seat of this.seats()) {
      const pr = r.players[seat.pid];
      const melds = r.melds.filter((m) => m.owner === seat.pid);
      const meldsEl = h('div', { class: 'melds' }, ...melds.map((m) => this.meldEl(m, true)), seat.pid === r.starter ? [carpetJokersEl(), openCardEl(seat.pid)] : null);
      const label = seatLabel({ name: s.players[seat.pid].name, mode: pr.mode, count: pr.hand.length, lost: seat.pid !== this.me && this.lostVisible(seat.pid) });
      // Die offene Startkarte liegt noch auf dem Tisch und gehört optisch nicht in den Fächer (die Zahl im Text zählt sie mit).
      const backId = this.seatBack(seat.pid);
      const temps = seat.pid === current(s) && !r.ended ? pr.hand.filter((c) => tempIds.has(c.id) && c.id >= 0) : [];
      const fanHand = (r.waiting && seat.pid === r.starter ? pr.hand.slice(carpetJk.length, -1) : pr.hand).filter((c) => !temps.includes(c));
      const fanEl = showFan && fanHand.length ? h('div', { class: 'fan' }, ...fanHand.map((c) => this.cardEl(backOf(c), { small: true, backId }))) : null;
      // Vorübergehende Karten liegen offen am Ende des Fächers (untereinander); ohne Fächer (Handy) ragt von jeder nur die obere
      // Hälfte am äußeren Rand der Auslage herein.
      let fan: HTMLElement | null = fanEl;
      if (temps.length && showFan) {
        fan = h('div', { class: 'fan-wrap' }, fanEl, h('div', { class: 'temp-col' }, ...temps.map((c) => this.cardEl(c, { small: true, temp: true }))));
      }
      const halves = temps.length && !showFan ? h('div', { class: 'temp-half' }, ...temps.map((c) => h('div', { class: 'half' }, this.cardEl(c, { small: true })))) : null;
      const inner =
        seat.pos === 'top'
          ? h('div', { class: 'seat-inner' }, fan ? h('div', { class: 'flip180' }, fan) : null, label, h('div', { class: 'flip180' }, meldsEl), halves ? h('div', { class: 'flip180 temp-edge' }, halves) : null)
          : h('div', { class: 'seat-inner' }, meldsEl, label, fan, halves ? h('div', { class: 'temp-edge' }, halves) : null);
      const wrap = h('div', { class: `seat seat-${seat.pos}${current(s) === seat.pid && !r.ended ? ' current' : ''}`, dataset: { seat: String(seat.pid), pos: seat.pos } }, inner);
      table.appendChild(wrap);
    }

    // Stapel in der Mitte. Alle drei „Karte nehmen“-Felder sind gleich groß (eine Karte im Hochformat) und leuchten nie:
    // Ob eine Karte nutzbar ist, muss jeder selbst sehen.
    const stockWrap = h(
      'div',
      { class: 'stock-wrap' },
      r.carpet
        ? [
            h('div', { class: 'carpet' }, this.cardEl(r.carpet, { title: `${t('carpet')}: ${cardName(r.carpet)}` })),
            h('div', { class: `carpet-hit${drawPhase ? ' active' : ''}`, onclick: drawPhase ? () => this.pileTap('carpet') : undefined, title: t('carpet') }),
            h('span', { class: 'pile-label carpet-label' }, t('carpet.label')),
          ]
        : null,
      this.stockEl(drawPhase),
      r.stock.length > 0 && r.stock.length <= 7 ? h('div', { class: 'count-on-card' }, String(r.stock.length)) : null,
      h('span', { class: 'pile-label stock-label' }, t('stock')),
    );
    // Die ganze Ablage bleibt sichtbar; ältere Karten verschwinden nicht plötzlich.
    const discardCards = r.discard;
    const topClick = drawPhase ? () => this.pileTap('discard') : playPhase && singleSel ? () => this.act({ kind: 'discard', cardId: singleSel.id }) : undefined;
    const discard = h(
      'div',
      { class: 'discard' },
      h('span', { class: 'pile-label discard-label' }, t('discard')),
      discardCards.length === 0 ? this.cardEl('slot', { cls: 'slot-hint', onClick: playPhase && singleSel ? () => this.act({ kind: 'discard', cardId: singleSel.id }) : undefined }) : null,
      ...discardCards.map((c, i) => {
        const top = i === discardCards.length - 1;
        const hsh = hash(c.id);
        const rot = (hsh % 45) - 22;
        const dx = ((hsh >> 6) % 15) - 5;
        const dy = ((hsh >> 11) % 15) - 7;
        const el = this.cardEl(c, {
          // Nach einem langen Drücken (Rückblick) löst das Loslassen keinen Klick aus.
          onClick:
            top && topClick
              ? () => {
                  if (this.peekSuppress) return;
                  topClick();
                }
              : undefined,
        });
        el.style.transform = `translate(calc(${dx}px * var(--s)), calc(${dy}px * var(--s))) rotate(${rot}deg)`;
        el.style.zIndex = String(i + 1);
        return el;
      }),
    );
    this.bindPeek(discard);
    const center = h('div', { class: 'center' }, h('div', { class: 'piles' }, stockWrap, discard));
    center.style.setProperty('--sc', String(this.scale()));
    table.appendChild(center);

    // Eigene Auslage
    const myMelds = r.melds.filter((m) => m.owner === this.me);
    const own = h(
      'div',
      { class: `own${myTurn && !r.ended ? ' current' : ''}`, dataset: { seat: String(this.me) } },
      h('div', { class: 'melds' }, ...myMelds.map((m) => this.meldEl(m, true)), this.me === r.starter ? [carpetJokersEl(), openCardEl(this.me)] : null),
      seatLabel({ name: s.players[this.me].name, mode: me.mode, count: me.hand.length, cls: 'own-label' }),
    );
    table.appendChild(own);

    // Status
    const held = (id: number | null) => id !== null && me.hand.some((c) => c.id === id);
    let msg = '';
    if (r.ended) msg = '';
    else if (r.waiting) {
      const waitingFor = s.players.filter((p) => !r.ready[p.id] && p.id !== this.me).map((p) => p.name);
      msg = r.ready[this.me] ? t('wait.others', { names: waitingFor.join(', ') }) : t('wait.sorting');
    } else if (!myTurn) {
      const last = r.log[r.log.length - 1];
      msg = last && last.player !== undefined ? this.logText(last) : t('turn.bot', { name: s.players[current(s)].name });
    } else if (drawPhase) msg = r.finalTurn ? t('turn.you.final') : t('turn.you.draw');
    else if (held(r.turn.pendingJokerId)) msg = t('turn.you.joker');
    else if (held(r.turn.mustOpenWithId)) msg = t('turn.you.mustOpen');
    else if (held(r.turn.mustPairWithId)) msg = t('turn.you.carpet');
    else if (held(r.turn.mustUseId)) msg = t('turn.you.mustUse');
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
        const isTemp = myTurn && tempIds.has(id);
        const el = this.cardEl(c, { selected: this.selected.has(id), fresh: this.fresh.has(id) && !isTemp, temp: isTemp });
        el.classList.add('clickable');
        el.addEventListener('pointerdown', (e) => this.onPointerDown(e, id, el));
        el.addEventListener('pointermove', (e) => this.onPointerMove(e));
        el.addEventListener('pointerup', (e) => this.onPointerUp(e));
        el.addEventListener('pointercancel', () => this.endDrag(null));
        return el;
      }),
    );

    // Immer alle vier Knöpfe, damit nichts wandert; was gerade nicht geht, ist abgeblendet. Reihenfolge wie im Zug:
    // Cheft! (die Entscheidung am Anfang, bewusst weit weg vom oft gedrückten Abwerfen), Auslegen, Anlegen, Abwerfen.
    const canCheft = myTurn && !me.opened && me.mode === 'romme';
    const actions = r.waiting
      ? h('div', { class: 'actions' }, btn(t('btn.ready'), () => this.act({ kind: 'ready' }), { disabled: r.ready[this.me], variant: 'primary' }))
      : h(
          'div',
          { class: 'actions' },
          btn(t('btn.cheft'), () => this.declareCheft(), { disabled: !canCheft, variant: 'dark' }),
          btn(t('btn.lay'), () => this.laySelected([...this.selected]), { disabled: !playPhase || selectedCards.length < 2, variant: 'primary' }),
          btn(t('btn.layOff'), () => this.layOffSelected(), { disabled: !playPhase || !singleSel || !me.opened }),
          btn(t('btn.discard'), () => singleSel && this.act({ kind: 'discard', cardId: singleSel.id }), { disabled: !playPhase || !singleSel }),
        );
    // Zug zurücksetzen: kleines Symbol links unten auf dem Spielfeld, kein Hauptknopf. Immer da, abgeblendet wenn nichts zurückzusetzen ist.
    if (!r.waiting && !r.ended) {
      const undo = iconBtn(pixelIcon(ICON_UNDO), t('btn.undoDraw'), () => this.undoTurn());
      undo.classList.add('undo-btn');
      (undo as HTMLButtonElement).disabled = !(playPhase && r.turn.canRewind);
      table.appendChild(undo);
    }

    const game = h('div', { class: 'game' }, header, table, status, h('div', { class: 'hand-wrap' }, handEl), actions);
    if (r.ended) game.appendChild(this.peekTable ? this.renderEndBar() : this.renderRoundEnd());
    else if (this.chooser) game.appendChild(this.renderChooser());
    if (this.showSettings && !this.chooser && !(r.ended && !this.peekTable)) game.appendChild(this.renderSettings());
    if (this.showScores) game.appendChild(this.renderScores());
    if (this.online?.lobby?.paused) game.appendChild(this.renderPause(this.online.lobby));
    const request = this.online?.lobby ? this.renderRequest(this.online.lobby) : null;
    if (request) game.appendChild(request);
    return game;
  }

  /** Stapel mit sichtbarer Dicke (eine Kante je angefangene sechs Karten). */
  private stockEl(clickable: boolean): HTMLElement {
    const r = this.state!.round;
    const n = r.stock.length;
    const el = this.cardEl(n ? backOf(r.stock[n - 1]) : 'slot', { onClick: clickable ? () => this.pileTap('stock') : undefined });
    if (n > 0) {
      const layers = Math.min(7, Math.ceil(n / 8));
      const shadows: string[] = [];
      for (let i = 1; i <= layers; i++) shadows.push(`calc(${i} * var(--s)) calc(${i} * var(--s)) 0 0 var(--surface-field)`, `calc(${i} * var(--s)) calc(${i} * var(--s)) 0 1px var(--line-soft)`);
      el.style.boxShadow = shadows.reverse().join(', ');
      el.style.marginBottom = `calc(${layers} * var(--s))`;
      el.style.marginRight = `calc(${layers} * var(--s))`;
    }
    return el;
  }

  private meldEl(m: Meld, small: boolean): HTMLElement {
    const s = this.state!;
    const playPhase = current(s) === this.me && s.round.turn.phase === 'play' && !s.round.ended;
    const onClick = playPhase ? () => this.tapMeld(m) : undefined;
    return meldBox(
      m.cards.map((c, i) => {
        let title = cardName(c);
        if (isJoker(c)) {
          const rep = jokerRepresents(m, i);
          if (rep) title = `${t('card.joker')} = ${cardName({ id: -1, suit: rep.suit, rank: rep.rank })}`;
        }
        return this.cardEl(c, { title, small });
      }),
      { pair: m.type === 'pair', onClick, title: `${t(`mode.${m.type === 'pair' ? 'cheft' : 'romme'}`)} · ${meldAugen(m)}`, id: m.id },
    );
  }

  private logText(e: { key: string; player?: number; params?: Record<string, string | number> }): string {
    const s = this.state!;
    const params: Record<string, string | number> = { ...(e.params ?? {}) };
    if (e.player !== undefined) params.name = s.players[e.player].name;
    if (e.key === 'log.discard') {
      const top = s.round.discard[s.round.discard.length - 1];
      params.card = top ? cardName(top) : '';
    }
    return t(e.key, params);
  }

  /** Gezeichnete Kreise (Pixelraster) nach Größe in Einheiten, damit nicht bei jedem Neuzeichnen ein neues Bild entsteht. */
  private discImages = new Map<number, string>();

  /**
   * Kreis für den aktiven Spieler: Durchmesser = (Breite + Höhe des Spielfelds) ÷ 2 ÷ φ ÷ φ, auf das Pixelraster (1 u) gerundet,
   * Mitte genau auf der Spielfeldkante bei diesem Spieler. Gezeichnet mit scharfer Pixelkante, ohne Weichzeichnen.
   */
  private layoutDisc(): void {
    const table = this.root.querySelector('.table') as HTMLElement | null;
    const disc = table?.querySelector('.turn-disc') as HTMLElement | null;
    if (!table || !disc) return;
    const s = this.scale();
    const W = table.clientWidth;
    const H = table.clientHeight;
    const n = Math.max(4, Math.round((W + H) / 2 / TURN_DISC.phi / TURN_DISC.phi / s));
    let url = this.discImages.get(n);
    if (!url) {
      const cv = document.createElement('canvas');
      cv.width = n;
      cv.height = n;
      const ctx = cv.getContext('2d');
      if (ctx) {
        ctx.fillStyle = colorValue('--c-gold');
        const r = n / 2;
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if ((x + 0.5 - r) ** 2 + (y + 0.5 - r) ** 2 <= r * r) ctx.fillRect(x, y, 1, 1);
        url = cv.toDataURL();
        this.discImages.set(n, url);
      }
    }
    const size = n * s;
    const pos = disc.dataset.pos;
    let left = (W - size) / 2;
    let top = (H - size) / 2;
    if (pos === 'bottom') top = H - size / 2;
    else if (pos === 'top') top = -size / 2;
    else if (pos === 'left') left = -size / 2;
    else if (pos === 'right') left = W - size / 2;
    disc.style.width = `${size}px`;
    disc.style.height = `${size}px`;
    disc.style.left = `${Math.round(left)}px`;
    disc.style.top = `${Math.round(top)}px`;
    if (url) disc.style.backgroundImage = `url(${url})`;
  }

  /** Aktuelle Stufe am Tisch (Index in der Verkleinerungs-Reihenfolge); gilt für eine Runde und eine Fenstergröße, wird nur kleiner. */
  private tableStep = { key: '', index: 0 };
  /** Letzte Lage der Tischmitte und der seitlichen Sitze, damit Verschiebungen gleiten (nur innerhalb derselben Tischgröße). */
  private placePrev: { key: string; piles: [number, number]; side: Record<string, number> } | null = null;

  /**
   * Kartengrößen am Tisch und Sitzgrößen. Alle Auslagen (auch die eigene) haben eine Stufe, die Mitte eine eigene (höchstens 1,75-mal so groß).
   * Es geht von der Startgröße des Geräts schrittweise nach unten, bis alles passt (siehe tablescale.ts). Sobald etwas kleiner ist als
   * zum Start, entfallen die Beschriftungen der Mitte. Gedrehte Auslagen brauchen vertauschte Breite und Höhe.
   */
  private layoutTable(): void {
    const table = this.root.querySelector('.table') as HTMLElement | null;
    // Ohne Größe (Bildschirm wird gerade umgeschaltet) nichts messen und nichts merken
    if (!table || table.clientWidth < 50 || table.clientHeight < 50) return;
    const s = this.scale();
    const seats = Array.from(table.querySelectorAll<HTMLElement>('.seat'));
    const own = table.querySelector('.own') as HTMLElement | null;
    const center = table.querySelector('.center') as HTMLElement | null;
    const sides = seats.filter((e) => e.classList.contains('seat-left') || e.classList.contains('seat-right'));
    const top = table.querySelector('.seat-top') as HTMLElement | null;
    const W = table.clientWidth - 4 * s;
    const H = table.clientHeight - 4 * s;
    const dpr = window.devicePixelRatio || 1;
    const ladder = tableLadder(dpr, deviceClass(window.innerWidth, window.innerHeight), s);
    const key = `${this.state?.round.no ?? 0}${this.state?.round.waiting ? 'w' : 'p'}:${this.state?.players.length ?? 0}:${window.innerWidth}x${window.innerHeight}@${dpr}`;
    if (this.tableStep.key !== key) this.tableStep = { key, index: 0 };
    const apply = (st: ScaleStep) => {
      for (const e of [...seats, ...(own ? [own] : [])]) e.style.setProperty('--so', String(st.a));
      center?.style.setProperty('--sc', String(st.c));
    };
    const layoutSides = () => {
      const topH = top ? top.offsetHeight : 0;
      const ownH = own ? own.offsetHeight : 0;
      const free = H - topH - ownH;
      const M = Math.max((44 + 28) * s, free);
      let depth = 0;
      for (const side of sides) {
        const inner = side.querySelector('.seat-inner') as HTMLElement;
        inner.style.width = `${M}px`;
        const d = inner.offsetHeight;
        side.style.width = `${d}px`;
        side.style.height = `${M}px`;
        depth += d;
      }
      return { M, depth, free };
    };
    const fits = (st: ScaleStep, g: { depth: number; free: number }) => {
      const pilesMin = (32 + 12 + 10 + 32 + 26 + 10) * st.c;
      const minMid = (44 + 28) * st.c;
      return !(sides.length > 0 && W - g.depth < pilesMin) && !(top && g.free < minMid);
    };
    let i = Math.min(this.tableStep.index, ladder.length - 1);
    for (; i < ladder.length; i++) {
      apply(ladder[i]);
      if (fits(ladder[i], layoutSides()) || i === ladder.length - 1) break;
    }
    this.tableStep.index = i;
    table.classList.toggle('shrunk', i > 0);
  }

  /**
   * Ausrichtung: Jedes Paket aus Beschriftung und Auslage sitzt mittig auf der Achse seines Sitzes (Mitte der Spielfeldkante, dort
   * liegt auch der Kreis). Die Tischmitte (Mitte zwischen Stapel und Ablagefeld) liegt auf der Spielfeldmitte, solange viel Platz
   * ist, und wandert mit zunehmender Enge weich zur Mitte des freien Platzes, ohne eine Auslage zu berühren.
   */
  private layoutPlacement(): void {
    const table = this.root.querySelector('.table') as HTMLElement | null;
    if (!table || table.clientWidth < 50 || table.clientHeight < 50) return;
    const s = this.scale();
    const tr = table.getBoundingClientRect();
    const W = table.clientWidth;
    const H = table.clientHeight;
    const gap = 4 * s;
    const rel = (r: DOMRect) => ({ l: r.left - tr.left, r: r.right - tr.left, t: r.top - tr.top, b: r.bottom - tr.top });
    const top = table.querySelector('.seat-top') as HTMLElement | null;
    const own = table.querySelector('.own') as HTMLElement | null;
    const left = table.querySelector('.seat-left') as HTMLElement | null;
    const right = table.querySelector('.seat-right') as HTMLElement | null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const key = this.tableStep.key;
    const prev = this.placePrev && this.placePrev.key === key ? this.placePrev : null;
    const next: { key: string; piles: [number, number]; side: Record<string, number> } = { key, piles: [0, 0], side: {} };
    // Seitliche Sitze: Das Paket liegt auf der Achse H/2, nur wenn der obere oder untere Sitz im Weg ist, wird es verschoben.
    const freeTop = top ? rel(top.getBoundingClientRect()).b + gap : 0;
    const freeBottom = own ? rel(own.getBoundingClientRect()).t - gap : H;
    for (const [side, name] of [[left, 'left'], [right, 'right']] as const) {
      const inner = side?.querySelector('.seat-inner') as HTMLElement | null;
      if (!side || !inner) continue;
      inner.style.translate = '0 0';
      const parts = [inner.querySelector('.seat-label'), ...Array.from(inner.querySelectorAll('.melds > *, .reveal > *'))].filter(Boolean) as Element[];
      let lo = Infinity;
      let hi = -Infinity;
      for (const e of parts) {
        const r = rel(e.getBoundingClientRect());
        lo = Math.min(lo, r.t);
        hi = Math.max(hi, r.b);
      }
      if (!isFinite(lo)) continue;
      let dy = H / 2 - (lo + hi) / 2;
      dy = Math.max(freeTop - lo, Math.min(freeBottom - hi, dy));
      if (hi - lo > freeBottom - freeTop) dy = (freeTop + freeBottom) / 2 - (lo + hi) / 2;
      dy = Math.round(dy);
      inner.style.translate = `0 ${dy}px`;
      next.side[name] = dy;
      const old = prev?.side[name];
      if (old !== undefined && old !== dy && !reduce) {
        try {
          inner.animate([{ translate: `0 ${old}px` }, { translate: `0 ${dy}px` }], { duration: MOTION.fly, easing: EASE_FLY });
        } catch {
          /* ohne Animation */
        }
      }
    }
    // Tischmitte
    const piles = table.querySelector('.piles') as HTMLElement | null;
    const stock = table.querySelector('.stock-wrap > .card') as HTMLElement | null;
    const disc = table.querySelector('.discard') as HTMLElement | null;
    if (piles && stock && disc) {
      piles.style.transform = 'none';
      const pr = rel(piles.getBoundingClientRect());
      const sr = rel(stock.getBoundingClientRect());
      const dr = rel(disc.getBoundingClientRect());
      const refX = (sr.l + sr.r) / 4 + (dr.l + dr.r) / 4;
      const refY = (sr.t + sr.b) / 2;
      const freeL = (left ? rel(left.getBoundingClientRect()).r : 0) + gap;
      const freeR = (right ? rel(right.getBoundingClientRect()).l : W) - gap;
      // Der Teppich ragt links aus dem Kasten: Platzbedarf als Vereinigung der Kinder
      let bl = pr.l;
      let br = pr.r;
      piles.querySelectorAll('.stock-wrap *').forEach((e) => {
        const r = rel(e.getBoundingClientRect());
        bl = Math.min(bl, r.l);
        br = Math.max(br, r.r);
      });
      const nx = placeAxis(W / 2, freeL + (refX - bl), freeR - (br - refX), (W - (br - bl)) / 2 - gap);
      const ny = placeAxis(H / 2, freeTop + (refY - pr.t), freeBottom - (pr.b - refY), (H - (pr.b - pr.t)) / 2 - gap);
      const dx = Math.round(nx - refX);
      const dy = Math.round(ny - refY);
      piles.style.transform = `translate(${dx}px, ${dy}px)`;
      next.piles = [dx, dy];
      if (prev && (prev.piles[0] !== dx || prev.piles[1] !== dy) && !reduce) {
        const from = prev.piles;
        // Erst nach der Messung der Kartenflüge starten: Deren Ziel ist die endgültige Lage der Mitte.
        requestAnimationFrame(() => {
          if (!piles.isConnected) return;
          try {
            piles.animate([{ transform: `translate(${from[0]}px, ${from[1]}px)` }, { transform: `translate(${dx}px, ${dy}px)` }], { duration: MOTION.fly, easing: EASE_FLY });
          } catch {
            /* ohne Animation */
          }
        });
      }
    }
    this.placePrev = next;
  }

  private handGeometry(): { cw: number; ch: number; W: number; step: number; rows: number; perRow: number; n: number; s: number } | null {
    const handEl = this.root.querySelector('.hand') as HTMLElement | null;
    if (!handEl) return null;
    const n = this.order.length;
    const s = this.scale();
    const cw = CARD_PX.w * s;
    const ch = CARD_PX.h * s;
    const W = handEl.clientWidth;
    const minStep = HAND.minStep * s;
    const maxStep = cw + HAND.maxOver * s;
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
    const y = g.rows === 2 ? row * (g.ch + HAND.rowGap * g.s) : HAND.top * g.s;
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
      this.showDropAreas(true, d.group.length === 1 ? d.id : null);
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
      let zone = target ? (target.closest('.discard, .meld, .own') as HTMLElement | null) : null;
      // Ablage und Sätze gehen vor; sonst zählt der ganze Halbkreis (etwas größer) als Fläche zum Auslegen.
      // Das Viereck um den eigenen Namen zählt nicht, nur der Halbkreis (Rückfall aufs Viereck nur, wenn es keinen Kreis gibt).
      if (!zone || zone.classList.contains('own')) {
        const circle = this.discZoneCircle();
        zone = circle ? (this.inDiscZone(e.clientX, e.clientY) ? (this.root.querySelector('.own') as HTMLElement | null) : null) : zone;
      }
      this.setOver(zone);
    }
  }

  /** Ablegefläche zum Auslegen: der Kreis des aktiven Spielers, um ein Siebtel vergrößert. */
  private discZoneCircle(): { cx: number; cy: number; r: number } | null {
    const disc = this.root.querySelector('.turn-disc') as HTMLElement | null;
    if (!disc || disc.dataset.pos !== 'bottom') return null;
    const rc = disc.getBoundingClientRect();
    return { cx: rc.left + rc.width / 2, cy: rc.top + rc.height / 2, r: (rc.width / 2) * DROP_ZONE_GROW };
  }

  private inDiscZone(x: number, y: number): boolean {
    const c = this.discZoneCircle();
    return !!c && Math.hypot(x - c.cx, y - c.cy) <= c.r;
  }

  /** Beim Ziehen: alle Flächen, auf denen man loslassen kann, hervorheben (Ablage, Sätze, Halbkreis zum Auslegen). */
  private showDropAreas(on: boolean, cardId: number | null = null): void {
    const table = this.root.querySelector('.table');
    table?.classList.toggle('drag-on', on);
    // Nur Sätze, an die genau diese Karte wirklich angelegt werden kann (oder einen Joker austauschen), werden markiert
    table?.querySelectorAll('.meld.can').forEach((e) => e.classList.remove('can'));
    const st = this.state;
    if (on && cardId !== null && st && current(st) === this.me && st.round.turn.phase === 'play' && !st.round.ended) {
      const card = st.round.players[this.me].hand.find((c) => c.id === cardId);
      table?.querySelectorAll<HTMLElement>('.meld').forEach((el) => {
        const m = st.round.melds.find((x) => x.id === Number(el.dataset.meldId));
        if (!m || !card) return;
        const steal = !isJoker(card) && m.cards.some((mc, i) => isJoker(mc) && checkStealJoker(st, this.me, m.id, i, card.id).ok);
        if (steal || checkLayOff(st, this.me, card.id, m.id).ok) el.classList.add('can');
      });
    }
    table?.querySelector('.drop-halo')?.remove();
    const c = on ? this.discZoneCircle() : null;
    const clip = table?.querySelector('.turn-clip') as HTMLElement | null;
    if (c && clip && table) {
      const tr = table.getBoundingClientRect();
      const halo = h('div', { class: 'drop-halo' });
      halo.style.width = `${c.r * 2}px`;
      halo.style.height = `${c.r * 2}px`;
      halo.style.left = `${c.cx - c.r - tr.left}px`;
      halo.style.top = `${c.cy - c.r - tr.top}px`;
      clip.appendChild(halo);
    }
  }

  private setOver(zone: HTMLElement | null): void {
    const d = this.drag;
    if (!d) return;
    if (d.over === zone) return;
    if (d.over) d.over.classList.remove('drop', 'hover');
    d.over = zone;
    if (zone) {
      if (!zone.classList.contains('meld')) zone.classList.add('drop');
      else if (zone.classList.contains('can')) zone.classList.add('hover');
    }
    this.root.querySelector('.table')?.classList.toggle('drop-own', !!zone && zone.classList.contains('own'));
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
    this.showDropAreas(false);
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
    play('tick');
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
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
      const parts = findAllPartitions(cards, opts, ALL_OPTIONS);
      if (parts.length === 0) continue;
      const valid: { groups: number[][]; shapes: MeldShape[]; augen: number }[] = [];
      for (const part of parts) {
        const groups = part.melds.map((m) => m.cards.map((c) => c.id));
        const chk = checkLay(s, this.me, groups);
        if (chk.ok) valid.push({ groups, shapes: part.melds, augen: part.augen });
        else if (!firstError) firstError = { error: chk.error, params: chk.params };
      }
      // Aufteilungen, die auf dem Tisch gleich aussehen (z. B. zwei gleiche Karten vertauscht), nur einmal anbieten.
      const look = (v: { shapes: MeldShape[] }) =>
        v.shapes
          .map((m) => {
            const cs = m.cards.map((c) => (isJoker(c) ? 'J' : `${c.suit}${c.rank}`));
            return `${m.type}:${(m.type === 'run' ? cs : [...cs].sort()).join(',')}`;
          })
          .sort()
          .join('|');
      const seen = new Set<string>();
      const distinct = valid.filter((v) => {
        const k = look(v);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (distinct.length === 1) return this.act({ kind: 'lay', groups: distinct[0].groups });
      if (distinct.length > 1) {
        this.chooser = {
          title: t('choose.title'),
          hint: t('choose.hint'),
          options: distinct.map((v) => ({ shapes: v.shapes, label: t('choose.augen', { n: v.augen }), onPick: () => this.act({ kind: 'lay', groups: v.groups }) })),
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
    this.errorFx();
    return false;
  }

  /**
   * „Anlegen“ mit einer markierten Karte. Passt sie nur an eine Stelle, wird sie dort angelegt. Passt sie an mehrere
   * (auch Joker klauen), fragt die App im Stil der Kombinations-Auswahl nach: Statt der Augen steht der Spieler dabei,
   * auch man selbst (mit dem Namen). Wo die Karte hinpassen könnte, wird sonst nirgends gezeigt.
   */
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
    // Eigene Auslage zuerst, danach die anderen in Spielreihenfolge
    const n = s.players.length;
    const rank = (owner: number) => (owner - this.me + n) % n;
    type Target = { owner: number; shapes: MeldShape[]; run: () => boolean };
    const found: Target[] = [];
    if (!isJoker(card)) {
      for (const m of s.round.melds) {
        m.cards.forEach((c, i) => {
          if (isJoker(c) && checkStealJoker(s, this.me, m.id, i, card.id).ok) {
            const result = replaceJoker(m, i, card);
            found.push({ owner: m.owner, shapes: [result], run: () => this.act({ kind: 'steal', meldId: m.id, jokerIndex: i, cardId: card.id }) });
          }
        });
      }
    }
    const byMeld = new Map<number, Meld>();
    for (const x of layOffTargets(s, this.me, card.id)) byMeld.set(x.meld.id, x.meld);
    for (const m of byMeld.values()) {
      const opts = layOffTargets(s, this.me, card.id).filter((x) => x.meld.id === m.id);
      opts.forEach((o, i) => {
        found.push({ owner: m.owner, shapes: [o.result], run: () => this.act({ kind: 'layOff', cardId: card.id, meldId: m.id, end: i === 0 ? 'top' : 'bottom' }) });
      });
    }
    if (found.length === 0) {
      this.toast(t('err.noTarget'), true);
      this.errorFx();
      return;
    }
    found.sort((a, b) => rank(a.owner) - rank(b.owner));
    if (found.length === 1) {
      found[0].run();
      return;
    }
    this.chooser = {
      title: t('choose.layoff'),
      hint: t('choose.layoff.hint'),
      options: found.map((f) => ({ shapes: f.shapes, label: s.players[f.owner].name, onPick: () => void f.run() })),
    };
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
      this.errorFx();
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

  /** Cheft ansagen, mit Rückfrage im App-Stil. Mit `then` wird danach gleich die Ablage- oder Teppichkarte genommen. */
  private declareCheft(then?: 'discard' | 'carpet'): void {
    this.askDialog({
      title: t('confirm.cheft.title'),
      text: t('confirm.cheft'),
      buttons: [
        { label: t('btn.cancel') },
        {
          label: t('btn.cheftConfirm'),
          primary: true,
          onClick: () => {
            if (then === 'carpet') {
              // Die Teppichkarte zu nehmen macht zum Cheft-Spieler; die Rückfrage war die offizielle Ansage.
              this.act({ kind: 'draw', source: 'carpet' });
              return;
            }
            if (then !== 'discard') {
              this.act({ kind: 'declareCheft' });
              return;
            }
            if (this.online) {
              // Der Server führt beide Aktionen in dieser Reihenfolge aus.
              this.pendingAppearFrom = this.pileRect('discard');
              this.net?.action({ kind: 'declareCheft' });
              this.net?.action({ kind: 'draw', source: 'discard' });
            } else if (this.act({ kind: 'declareCheft' })) this.act({ kind: 'draw', source: 'discard' });
          },
        },
      ],
    });
  }

  /**
   * Tippen auf einen Stapel beim Ziehen: zieht sofort. Es gibt keine Vorwahl und keine Hervorhebung, denn die Frage, ob eine
   * Karte nutzbar ist, soll jeder selbst beantworten (bei der Ablage gilt: nehmen und dann verwenden, sonst Zug zurücksetzen).
   */
  private pileTap(source: 'stock' | 'discard' | 'carpet'): void {
    if (source === 'discard') this.onDiscardDrawTap();
    else if (source === 'carpet') this.onCarpetTap();
    else this.act({ kind: 'draw', source });
  }

  /** Teppichkarte: Wer noch Rommé spielt, bestätigt zuerst „Cheft ansagen?“; ob die Karte überhaupt genommen werden darf, prüft die Regel. */
  private onCarpetTap(): void {
    const s = this.state!;
    const chk = checkDraw(s, this.me, 'carpet');
    if (!chk.ok) {
      this.toast(t(chk.error, chk.params), true);
      this.errorFx();
      return;
    }
    if (s.round.players[this.me].mode === 'romme' && s.round.stock.length > 0) this.declareCheft('carpet');
    else this.act({ kind: 'draw', source: 'carpet' });
  }

  /**
   * Zug zurücksetzen (Ausnahme, kein Hauptknopf): Wer sich verzählt hat, setzt auf den Anfang des Zuges zurück. Nur das
   * Nehmen der Karte allein wird ohne Rückfrage zurückgesetzt; wurde schon etwas ausgelegt, angelegt oder geklaut, fragt die App.
   */
  private undoTurn(): void {
    const s = this.state!;
    if (!checkUndoDraw(s, this.me).ok) return;
    const turn = s.round.turn;
    const doIt = () => {
      play('undo');
      vibrate(VIB.error, this.prefs.vibration);
      this.act({ kind: 'undoDraw' });
    };
    if (turn.actions > 0 || turn.openedThisTurn) {
      this.askDialog({
        title: t('confirm.undo.title'),
        text: t('confirm.undo'),
        buttons: [{ label: t('btn.cancel') }, { label: t('confirm.undo.yes'), primary: true, onClick: doIt }],
      });
    } else doIt();
  }

  /** Tippen auf die Ablage beim Ziehen. Zweimal kurz nacheinander (wenn ein Rommé-Spieler die Karte eines Cheft-Spielers nicht nehmen darf) bietet Cheft an. */
  private onDiscardDrawTap(): void {
    const s = this.state!;
    const now = Date.now();
    const double = now - this.lastDiscardTap < MOTION.doubleTap;
    this.lastDiscardTap = now;
    const draw = checkDraw(s, this.me, 'discard');
    if (draw.ok) {
      this.lastDiscardTap = 0;
      this.act({ kind: 'draw', source: 'discard' });
      return;
    }
    if (s.round.discard.length > 0 && checkDeclareCheft(s, this.me).ok) {
      if (double) {
        this.lastDiscardTap = 0;
        this.declareCheft('discard');
      } else {
        this.toast(`${t(draw.error, draw.params)} ${t('hint.cheftDouble')}`, true);
        this.errorFx();
      }
      return;
    }
    this.act({ kind: 'draw', source: 'discard' }); // zeigt den Grund an
  }

  // ------------------------------------------------------------ Dialoge
  /** Merkt sich, seit wann jemand getrennt ist; nach kurzer Zeit wird neu gezeichnet, damit das Funksymbol erscheint. */
  private trackLost(lobby: LobbyInfo): void {
    const now = Date.now();
    for (const seat of lobby.seats) {
      if (!seat.isBot && !seat.connected) {
        if (this.lostSince.has(seat.pid)) continue;
        this.lostSince.set(seat.pid, now);
        window.setTimeout(() => {
          if (this.lostSince.has(seat.pid) && (this.screen === 'game' || this.screen === 'lobby')) this.render();
        }, LOST_ICON_DELAY_MS + 100);
      } else this.lostSince.delete(seat.pid);
    }
  }

  private lostVisible(pid: number): boolean {
    const since = this.lostSince.get(pid);
    return since !== undefined && Date.now() - since >= LOST_ICON_DELAY_MS;
  }

  private renderPause(lobby: LobbyInfo): HTMLElement {
    // Genannt wird nur, wer neu die Verbindung verloren hat; wen der Autopilot schon vertritt, kennen alle.
    const awaySeats = lobby.seats.filter((s) => !s.isBot && !s.connected && !s.autopilot);
    const away = awaySeats.map((s) => s.name);
    const waiting = lobby.paused === 'auto' && away.length > 0;
    const isHost = lobby.hostPid === this.me;
    // Weiter geht es erst, wenn alle verbundenen Menschen auf „Weiter“ getippt haben
    const voted = new Set(lobby.resumed ?? []);
    const mine = voted.has(this.me);
    const missing = lobby.seats.filter((s) => !s.isBot && s.connected && !voted.has(s.pid) && s.pid !== this.me).map((s) => s.name);
    return windowEl([
      h('h2', null, t('pause.title')),
      h('p', null, waiting ? t(away.length > 1 ? 'pause.waitingMany' : 'pause.waiting', { names: away.join(', ') }) : t('pause.text')),
      // Der Spielleiter kann Abwesende, die den Platz blockieren, direkt entfernen.
      waiting && isHost ? h('div', { class: 'seat-list' }, ...awaySeats.filter((s) => this.canRemove(lobby, s.pid)).map((s) => this.playerRow(lobby, s))) : null,
      // Der Spielleiter kann die Pause für alle beenden oder wie jeder andere nur selbst „Weiter“ sagen.
      isHost ? btn(t('pause.resumeAll'), () => this.net?.pause(false, true), { variant: 'primary' }) : null,
      btn(t('pause.resume'), () => this.net?.pause(false), { variant: isHost ? 'default' : 'primary', disabled: mine }),
      mine && missing.length ? hint(t('wait.others', { names: missing.join(', ') }), true) : null,
    ]);
  }

  /** Darf der Spielleiter diesen Menschen entfernen? Nicht sich selbst, keine Bots und nicht den Gastgeber, solange er nur vertreten wird. */
  private canRemove(lobby: LobbyInfo, pid: number): boolean {
    const seat = lobby.seats.find((s) => s.pid === pid);
    if (!seat || seat.isBot || lobby.hostPid !== this.me || pid === this.me) return false;
    return pid !== (lobby.ownerPid ?? lobby.hostPid);
  }

  /** Eine Zeile mit Namen, Gastgeber-Markierung, Funksymbol und (für den Spielleiter) dem Entfernen-Knopf. */
  private playerRow(lobby: LobbyInfo, seat: LobbyInfo['seats'][number]): HTMLElement {
    const owner = lobby.ownerPid ?? lobby.hostPid;
    return h(
      'div',
      { class: 'lobby-seat' },
      h(
        'div',
        { class: 'row spread' },
        h(
          'span',
          { class: 'row' },
          h('span', null, seat.name),
          seat.pid === owner ? h('span', { class: 'badge' }, t('lobby.host')) : null,
          !seat.isBot && !seat.connected && this.lostVisible(seat.pid) ? lostIcon() : null,
        ),
        this.canRemove(lobby, seat.pid) ? iconBtn(pixelIcon(ICON_X), t('lobby.remove'), () => this.askKick(seat.pid, seat.name)) : null,
      ),
    );
  }

  private askKick(pid: number, name: string): void {
    this.askDialog({
      title: t('kick.title'),
      text: t('kick.text', { name }),
      buttons: [{ label: t('btn.cancel') }, { label: t('lobby.remove'), danger: true, onClick: () => this.net?.kick(pid) }],
    });
  }

  /** Der Gastgeber gibt die Spielleitung dauerhaft an einen anderen verbundenen Menschen. */
  private askHandover(lobby: LobbyInfo): void {
    const others = lobby.seats.filter((s) => !s.isBot && s.connected && s.pid !== this.me);
    this.askDialog({
      title: t('handover.title'),
      buttons: [...others.map((s) => ({ label: s.name, onClick: () => this.net?.handover(s.pid) })), { label: t('btn.cancel') }],
    });
  }

  private canHandover(lobby: LobbyInfo): boolean {
    return (lobby.ownerPid ?? lobby.hostPid) === this.me && lobby.seats.some((s) => !s.isBot && s.connected && s.pid !== this.me);
  }

  /** Spielleiter: jemand möchte einen Platz übernehmen. */
  private renderRequest(lobby: LobbyInfo): HTMLElement | null {
    const req = lobby.requests?.[0];
    if (!req || lobby.hostPid !== this.me) return null;
    return windowEl([
      h('h2', null, t('request.title')),
      h('p', null, t('request.text', { name: req.name, seat: req.seatName })),
      h('div', { class: 'btn-row' }, btn(t('request.deny'), () => this.net?.claimReply(req.id, false)), btn(t('request.allow'), () => this.net?.claimReply(req.id, true), { variant: 'primary' })),
    ]);
  }

  private renderSettings(): HTMLElement {
    const inGame = this.screen === 'game';
    const onOff = [
      { v: true, label: t('settings.on') },
      { v: false, label: t('settings.off') },
    ];
    // Im Spiel zuerst, was das laufende Spiel betrifft (Pause, Spielstand, Speichern, Abbrechen), danach die allgemeinen Einstellungen
    const gameActions = inGame
      ? h(
          'div',
          { class: 'menu-group' },
          this.online && this.state && !this.state.finished
            ? btn(t('btn.pause'), () => {
                this.showSettings = false;
                this.net?.pause(true);
                this.render();
              })
            : null,
          !this.online ? btn(t('btn.exportSave'), () => this.exportSave()) : null,
          !this.online ? btn(t('btn.saveQuit'), () => this.saveAndQuit()) : null,
          this.online ? btn(t('lobby.leave'), () => this.leaveOnline(true), { variant: 'danger' }) : btn(t('btn.quit'), () => this.quitGame(), { variant: 'danger' }),
        )
      : null;
    // Laufender Online-Raum: Code und Link zum Einladen, solange Plätze frei sind (Bot oder länger Abwesende lassen sich übernehmen)
    const lobby = this.online?.lobby;
    const invite =
      inGame && lobby && lobby.seats.some((x) => x.isBot || !x.connected)
        ? h(
            'div',
            { class: 'menu-group' },
            h('div', { class: 'option' }, fieldLabel(t('settings.room')), h('div', null, lobby.code)),
            hint(t('settings.inviteHint')),
            btn(t(this.canShareLink() ? 'lobby.copy' : 'lobby.copyCode'), () => this.copyCode(lobby.code)),
          )
        : null;
    const general = h(
      'div',
      { class: 'menu-group' },
      inGame && this.state ? h('div', { class: 'option' }, fieldLabel(t('setup.name')), this.nameField(this.state.players[this.me]?.name ?? '')) : null,
      this.choice(
        t('settings.vibration'),
        onOff,
        () => this.prefs.vibration,
        (v) => {
          this.prefs.vibration = v as boolean;
          // Probe direkt beim Einschalten; meldet, wenn der Browser die Vibration ablehnt
          if (this.prefs.vibration && !vibrate(VIB.probe, true)) this.toast(t('settings.vibration.fail'), true);
        },
      ),
      this.choice(
        t('settings.sound'),
        onOff,
        () => this.prefs.sound,
        (v) => {
          this.prefs.sound = v as boolean;
          // Testton direkt beim Einschalten (die Berührung schaltet auch den Audiokanal frei)
          setSoundEnabled(this.prefs.sound);
          if (this.prefs.sound) {
            unlockAudio();
            play('lay');
          }
        },
      ),
      this.choice(
        t('settings.keepAwake'),
        onOff,
        () => this.prefs.keepAwake,
        (v) => {
          this.prefs.keepAwake = v as boolean;
          void this.syncWakeLock();
        },
      ),
      this.cardBackChoice(),
    );
    // Spieler im Raum: für alle sichtbar; der Spielleiter kann entfernen, der Gastgeber die Leitung übergeben
    const players =
      inGame && lobby
        ? h(
            'div',
            { class: 'menu-group' },
            fieldLabel(t('players.title')),
            h('div', { class: 'seat-list' }, ...lobby.seats.map((s) => this.playerRow(lobby, s))),
            this.canHandover(lobby)
              ? btn(t('handover.btn'), () => {
                  this.showSettings = false;
                  this.askHandover(lobby);
                })
              : null,
          )
        : null;
    return windowEl([h('h2', null, t('btn.settings')), gameActions, invite, players, general, backBtn(() => this.back())], () => this.back());
  }

  /** Auswahl der Kartenrückseite mit Vorschaubild je Design; wirkt sofort, auch mitten im Spiel. */
  private cardBackChoice(): HTMLElement {
    const items = BACK_DESIGNS.map((d) => ({ id: d.id, name: d.name, orange: backThumb(d.id, 'a'), dark: backThumb(d.id, 'b') }));
    return h('div', { class: 'option' }, fieldLabel(t('settings.cardBack')), backChoiceRow(items, this.prefs.cardDesign, (id) => this.setCardDesign(id)));
  }

  /** Rückseite, mit der die verdeckten Handkarten eines Platzes gezeichnet werden: online das Design des Spielers (Bots: stabil aus Raumcode und Platz abgeleitet, bei allen gleich), sonst nichts (= das eigene). */
  private seatBack(pid: number): string | undefined {
    const o = this.online;
    const seat = o?.lobby?.seats.find((x) => x.pid === pid);
    if (!o || !seat || pid === this.me) return undefined;
    if (!seat.isBot) return seat.back ? backDesign(seat.back).id : undefined;
    let hsh = 7;
    for (const ch of `${o.room}/${pid}`) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    return BACK_DESIGNS[hsh % BACK_DESIGNS.length].id;
  }

  private setCardDesign(id: string): void {
    this.prefs.cardDesign = backDesign(id).id;
    this.savePrefs();
    this.net?.setBack(this.prefs.cardDesign);
    this.atlas = buildAtlas(this.prefs.cardDesign);
    document.documentElement.style.setProperty('--atlas', `url(${this.atlas.url})`);
    this.render();
  }

  // ------------------------------------------------------------ Online
  private storedOnline(): StoredOnline | null {
    try {
      const raw = localStorage.getItem(ONLINE_KEY);
      const v = raw ? (JSON.parse(raw) as StoredOnline) : null;
      // Eine Kopie, die älter als die Haltbarkeit ist, ist hinfällig: Es gibt dann ein frisches Spiel ohne Historie.
      if (v && v.at && Date.now() - v.at > SNAPSHOT_TTL_MS) {
        localStorage.removeItem(ONLINE_KEY);
        return null;
      }
      return v;
    } catch {
      return null;
    }
  }

  private storeOnline(v: StoredOnline | null): void {
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
        this.storeOnline({ url: this.serverUrl(), room: info.room, token: info.token, snap: this.storedOnline()?.snap, at: Date.now() });
        this.claimChoice = null;
        this.linkRoom = null;
        this.pendingCode = null;
        this.openOffer = null;
        this.claimWait = false;
      },
      onClaimable: (room, seats) => {
        this.linkRoom = null;
        this.pendingCode = null;
        this.openOffer = null;
        this.claimChoice = { room, seats };
        this.render();
      },
      onPending: () => {
        this.claimWait = true;
        this.render();
      },
      onKicked: () => {
        this.leaveOnlineNow(false);
        this.toast(t('kicked'), true);
      },
      onNotice: (key, params) => this.toast(t(key, params)),
      onReplaced: (room) => {
        // Ein laufendes Spiel hat unseren frischen Raum ersetzt: neu beitreten, um einen Platz zu übernehmen.
        this.online = null;
        this.storeOnline(null);
        this.state = null;
        this.order = [];
        this.botGen++;
        this.pendingCode = room;
        this.goto('online');
        this.net?.join(room, this.playerName(), this.prefs.cardDesign, this.autoName());
      },
      onUpdate: (u) => this.onServerUpdate(u),
      onError: (error, params) => {
        // Den Raum gibt es nicht: nicht nur eine Fehlermeldung, sondern anbieten, ihn neu zu eröffnen.
        if (error === 'net.noRoom' && this.pendingCode) {
          const code = this.pendingCode;
          this.pendingCode = null;
          this.linkRoom = null;
          this.offerOpen(code, Number(params?.wait ?? 0));
          return;
        }
        this.toast(t(error, params), true);
        if (this.claimWait) {
          this.claimWait = false; // abgelehnt oder keine Antwort: zurück zur Platzauswahl
          this.render();
        }
        if (this.linkRoom) {
          this.linkRoom = null;
          this.render();
        }
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
    const name = this.playerName();
    this.connectOnline(() => this.net!.create(name, this.prefs.cardDesign, this.autoName()));
  }

  private joinRoom(): void {
    const code = this.joinCode.trim().toUpperCase();
    if (!/^\d{3,4}$/.test(code)) {
      this.toast(t('net.noRoom'), true);
      return;
    }
    const name = this.playerName();
    this.claimChoice = null;
    this.pendingCode = code;
    this.connectOnline(() => this.net!.join(code, name, this.prefs.cardDesign, this.autoName()));
  }

  /** Raum fehlt: erst kurz warten, falls Mitspieler ein laufendes Spiel wiederherstellen, dann Neueröffnen anbieten. */
  private offerOpen(code: string, wait: number): void {
    this.openOffer = { code, wait };
    this.goto('online');
    if (wait > 0) {
      window.setTimeout(() => {
        if (this.openOffer?.code !== code || !this.net) return;
        this.pendingCode = code;
        this.net.join(code, this.playerName(), this.prefs.cardDesign, this.autoName());
      }, wait * 1000 + 1500);
    }
  }

  private renderOpenOffer(o: { code: string; wait: number }): HTMLElement {
    const cancel = btn(t('btn.cancel'), () => {
      this.openOffer = null;
      this.net?.close();
      this.net = null;
      this.goto('menu');
    });
    return h(
      'div',
      { class: 'menu' },
      h('h2', null, t('lobby.title', { code: o.code })),
      o.wait > 0
        ? h('div', { class: 'panel' }, h('p', null, t('open.wait')), hint(t('open.waitHint')), cancel)
        : h(
            'div',
            { class: 'panel' },
            h('p', null, t('open.missing')),
            hint(t('open.hint')),
            btn(t('open.create'), () => this.net?.openRoom(o.code, this.playerName(), this.prefs.cardDesign, this.autoName()), { variant: 'primary' }),
            cancel,
          ),
    );
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
    if (tellServer) {
      this.showSettings = false;
      this.askDialog({
        title: t('confirm.leave.title'),
        text: t('confirm.leave'),
        buttons: [{ label: t('btn.cancel') }, { label: t('lobby.leave'), danger: true, onClick: () => this.leaveOnlineNow(true) }],
      });
      return;
    }
    this.leaveOnlineNow(false);
  }

  private leaveOnlineNow(tellServer: boolean): void {
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

  /** Wird jemand Cheft, gibt es den dramatischen Sound. */
  private lastModes: string[] = [];
  private lastModesRound = 0;
  private noteModes(): void {
    const s = this.state;
    if (!s) return;
    const modes = s.round.players.map((p) => p.mode);
    if (s.round.no === this.lastModesRound && modes.some((m, i) => m === 'cheft' && this.lastModes[i] === 'romme')) {
      play('cheft');
      if (modes[this.me] === 'cheft' && this.lastModes[this.me] === 'romme') vibrate(VIB.cheft, this.prefs.vibration);
    }
    this.lastModes = modes;
    this.lastModesRound = s.round.no;
  }

  private onServerUpdate(u: ServerUpdate): void {
    if (!this.online) return;
    this.online.lobby = u.lobby;
    this.trackLost(u.lobby);
    const stored = this.storedOnline();
    if (stored && stored.room === this.online.room) this.storeOnline({ ...stored, snap: u.snap ?? undefined, at: Date.now() });
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
    // Zieht ein Mitspieler, merken wir uns vor dem Neuzeichnen, wo der Stapel lag und welche Karte es war.
    const drawInfo =
      prev && u.last && u.last.pid !== this.me && u.last.action.kind === 'draw'
        ? {
            pid: u.last.pid,
            source: u.last.action.source,
            from: this.pileRect(u.last.action.source),
            face: u.last.action.source === 'discard' ? (prev.round.discard[prev.round.discard.length - 1] ?? null) : u.last.action.source === 'carpet' ? prev.round.carpet : null,
            back: prev.round.stock[prev.round.stock.length - 1] ?? null,
          }
        : null;
    this.state = u.state;
    this.noteModes();
    if (newRound) {
      this.order = [];
      this.fresh.clear();
      this.selected.clear();
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
      if (u.last.action.kind === 'draw') play(drawSound(u.last.action.source));
      else if (k === 'discard') play('discard');
      else if (k === 'lay' || k === 'layOff') play('lay');
      if (drawInfo) this.flyDraw(drawInfo);
      if (!r.ended) void flip(this.root, before, k === 'draw' ? {} : { appearFrom: seat, disappearTo: seat });
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
    if (this.openOffer) return this.renderOpenOffer(this.openOffer);
    if (this.linkRoom) {
      return h(
        'div',
        { class: 'menu' },
        h('h2', null, t('lobby.title', { code: this.linkRoom })),
        h(
          'div',
          { class: 'panel' },
          h('p', null, t('online.connecting')),
          hint(t('online.wake')),
          btn(t('btn.cancel'), () => {
            this.linkRoom = null;
            this.net?.close();
            this.net = null;
            this.goto('menu');
          }),
        ),
      );
    }
    return h(
      'div',
      { class: 'menu' },
      h('h2', null, t('online.title')),
      h(
        'div',
        { class: 'panel' },
        h('div', { class: 'option' }, fieldLabel(t('setup.name')), nameInput),
        btn(t('online.create'), () => this.createRoom(), { variant: 'primary' }),
        h('div', { class: 'option' }, fieldLabel(t('online.code')), h('div', { class: 'row' }, codeInput, btn(t('online.join'), () => this.joinRoom()))),
        h('details', null, h('summary', { class: 'hint' }, t('online.server')), hint(t('online.serverHint')), serverInput),
        backBtn(() => this.back()),
      ),
    );
  }

  /** Spiel läuft schon: einen Bot-Platz oder den Platz eines länger Abwesenden übernehmen. */
  private renderClaim(c: { room: string; seats: ClaimableSeat[] }): HTMLElement {
    const name = this.playerName();
    if (this.claimWait) {
      return h(
        'div',
        { class: 'menu' },
        h('h2', null, t('claim.title', { code: c.room })),
        h(
          'div',
          { class: 'panel' },
          h('p', null, t('claim.wait')),
          btn(t('btn.cancel'), () => {
            this.net?.cancelClaim();
            this.claimWait = false;
            this.render();
          }),
        ),
      );
    }
    return h(
      'div',
      { class: 'menu' },
      h('h2', null, t('claim.title', { code: c.room })),
      h(
        'div',
        { class: 'panel' },
        hint(t('claim.hint')),
        ...c.seats.map((seat) =>
          btn(seat.kind === 'bot' ? `${seat.name} · ${t('claim.bot')}` : h('span', null, seat.name, lostIcon()), () => this.net?.claim(c.room, seat.pid, name, this.prefs.cardDesign, this.autoName())),
        ),
        backBtn(() => this.back()),
      ),
    );
  }

  private renderLobby(): HTMLElement {
    const o = this.online;
    const lobby = o?.lobby;
    if (!o || !lobby) {
      return h('div', { class: 'menu' }, h('div', { class: 'panel' }, h('p', null, t('online.connecting')), btn(t('btn.cancel'), () => this.leaveOnline(false))));
    }
    const isHost = lobby.hostPid === this.me;
    const list = h('div', { class: 'seat-list' });
    lobby.seats.forEach((seat, index) => {
      const row = h(
        'div',
        { class: 'lobby-seat', dataset: { pid: String(seat.pid) } },
        h(
          'div',
          { class: 'row spread' },
          h(
            'span',
            { class: 'row' },
            isHost && lobby.seats.length > 1 ? h('span', { class: 'handle', title: t('lobby.drag') }) : null,
            seat.pid === this.me ? this.nameField(seat.name) : h('span', null, seat.name),
            seat.isHost ? h('span', { class: 'badge' }, t('lobby.host')) : null,
            !seat.isBot && !seat.connected && this.lostVisible(seat.pid) ? lostIcon() : null,
            seat.isBot && !isHost ? h('span', { class: 'badge' }, 'Bot') : null,
          ),
          isHost && seat.pid !== this.me ? iconBtn(pixelIcon(ICON_X), t('lobby.remove'), () => this.net?.removeSeat(seat.pid)) : null,
        ),
        seat.isBot && isHost ? this.lobbyBotButtons(seat) : null,
      );
      const handle = row.querySelector('.handle');
      if (handle) handle.addEventListener('pointerdown', (e) => this.dragSeat(e as PointerEvent, list, index));
      list.appendChild(row);
    });
    const values: SettingValues = {
      seating: lobby.settings.seating,
      speed: lobby.settings.speed,
      firstTurnOpenAllowed: lobby.settings.firstTurnOpenAllowed,
      sortedDeal: lobby.settings.sortedDeal ?? true,
      peekDiscards: lobby.settings.peekDiscards,
      rounds: lobby.settings.rounds,
    };
    const settings = isHost ? this.settingChoices(values, (patch) => this.net?.settings(patch)) : this.settingSummary(values);
    return h(
      'div',
      { class: 'menu' },
      h('h2', null, t('lobby.title', { code: lobby.code })),
      h(
        'div',
        { class: 'panel' },
        btn(t(this.canShareLink() ? 'lobby.copy' : 'lobby.copyCode'), () => this.copyCode(lobby.code)),
        list,
        isHost && lobby.seats.length < 4 ? btn(t('lobby.addBot'), () => this.net?.addBot({ level: 'random', style: 'random' })) : null,
        this.canHandover(lobby) ? btn(t('handover.btn'), () => this.askHandover(lobby)) : null,
        ...settings,
        hint(t('setup.directionCcw')),
        isHost
          ? btn(lobby.seats.length < 3 ? t('lobby.need', { min: 3 }) : t('lobby.start'), () => this.net?.start(), { variant: 'primary', disabled: lobby.seats.length < 3 })
          : h('div', { class: 'field-label' }, t('lobby.waitHost')),
        isHost && lobby.ownerPid !== undefined && lobby.ownerPid !== this.me ? hint(t('lobby.acting')) : null,
        o.status !== 'open' ? hint(t(o.status === 'connecting' ? 'online.connecting' : 'online.offline')) : null,
        btn(t('lobby.leave'), () => this.leaveOnline(true), { variant: 'danger' }),
      ),
    );
  }

  /** Sitzordnung per Ziehen am Griff ändern (nur Gastgeber). */
  private dragSeat(e: PointerEvent, list: HTMLElement, from: number): void {
    e.preventDefault();
    const rows = [...list.children] as HTMLElement[];
    const row = rows[from];
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const heights = rows.map((r) => r.getBoundingClientRect().height);
    const tops = rows.map((_, i) => heights.slice(0, i).reduce((a, b) => a + b, 0));
    let to = from;
    row.classList.add('dragging');
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - startY;
      row.style.transform = `translateY(${dy}px)`;
      const centre = tops[from] + heights[from] / 2 + dy;
      to = rows.findIndex((_, i) => centre < tops[i] + heights[i]);
      if (to < 0) to = rows.length - 1;
      rows.forEach((r, i) => {
        if (i === from) return;
        const shift = from < to && i > from && i <= to ? -heights[from] : from > to && i >= to && i < from ? heights[from] : 0;
        r.style.transform = shift ? `translateY(${shift}px)` : '';
      });
    };
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      rows.forEach((r) => (r.style.transform = ''));
      row.classList.remove('dragging');
      if (to !== from) {
        const order = rows.map((r) => Number(r.dataset.pid));
        const [moved] = order.splice(from, 1);
        order.splice(to, 0, moved);
        this.net?.reorder(order);
      }
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  private lobbyBotButtons(seat: LobbyInfo['seats'][number]): HTMLElement {
    const [level, style] = (seat.botLabel ?? 'random/random').split('/') as [BotChoice['level'], BotChoice['style']];
    return this.botPicker({ level, style }, (choice) => this.net?.send({ type: 'lobby', op: 'botChoice', pid: seat.pid, choice }));
  }


  /** Auf einer eigenen Domain lässt sich der Raum per Link teilen (https://domain/232); auf GitHub Pages nur der Code. */
  private canShareLink(): boolean {
    return !/github\.io$/.test(location.hostname);
  }

  private copyCode(code: string): void {
    const text = this.canShareLink() ? `${location.origin}/${code}` : code;
    const label = t(this.canShareLink() ? 'lobby.copy' : 'lobby.copyCode');
    const show = () => this.askDialog({ title: label, input: { value: text, readonly: true }, back: true });
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => this.toast(t(this.canShareLink() ? 'lobby.copied' : 'lobby.copiedCode')), show);
    else show();
  }

  private renderChooser(): HTMLElement {
    const ch = this.chooser!;
    return windowEl([
      h('h2', null, ch.title),
      ch.hint ? hint(ch.hint) : null,
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
          hint(o.label),
        ),
      ),
      btn(t('btn.cancel'), () => this.back()),
    ]);
  }

  private nextRoundButton(): HTMLElement {
    const s = this.state!;
    if (this.online) {
      // Jeder Mensch bestätigt die Auswertung (auch das Spielende); erst wenn alle bestätigt haben, geht es weiter.
      const mine = !!(s.round.nextReady ?? [])[this.me];
      return btn(t(s.finished ? 'lobby.backToLobby' : 'btn.nextRound'), () => this.nextRound(), { variant: 'primary', disabled: mine });
    }
    return btn(t(s.finished ? 'btn.endGame' : 'btn.nextRound'), () => this.nextRound(), { variant: 'primary' });
  }

  /** Online: Hinweis, auf wen noch gewartet wird, nachdem man selbst bestätigt hat. */
  private waitHint(): HTMLElement | null {
    const s = this.state!;
    if (!this.online) return null;
    const flags = s.round.nextReady ?? [];
    if (!flags[this.me]) return null;
    const waiting = s.players.filter((p) => !flags[p.id] && p.id !== this.me && !p.isBot).map((p) => p.name);
    return waiting.length ? hint(t('wait.others', { names: waiting.join(', ') }), true) : null;
  }

  private renderEndBar(): HTMLElement {
    return h(
      'div',
      { class: 'footbar endbar' },
      btn(t('btn.showResult'), () => {
        this.peekTable = false;
        this.render();
      }),
      this.nextRoundButton(),
    );
  }

  /** Punkteverlauf: Spieler als Spalten, Runden als Zeilen mit aufsummierten Strafpunkten. */
  private renderRoundsTable(order: number[]): HTMLElement {
    const s = this.state!;
    const rows = s.history.map((res) => ({ points: order.map((pid) => res.scores[pid].total), winner: res.winner === null ? null : order.indexOf(res.winner) }));
    return h('div', null, h('h3', null, t('gameEnd.rounds')), roundsTable(order.map((pid) => s.players[pid].name), rows, s.settings.rounds));
  }

  /** Punkteübersicht aus der Kopfzeile: dieselbe Tabelle wie am Spielende. */
  private renderScores(): HTMLElement {
    const s = this.state!;
    return windowEl(
      [s.history.length ? this.renderRoundsTable(scoreOrder(s)) : h('p', { class: 'muted' }, t('scores.none')), backBtn(() => this.back())],
      () => this.back(),
    );
  }

  private renderRoundEnd(): HTMLElement {
    const s = this.state!;
    const r = s.round;
    const res = r.result!;
    const name = (pid: number) => s.players[pid].name;
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
          s.finished && p.bot ? btn([name(p.id), pixelIcon(ICON_INFO)], () => this.botInfo(s, p.id), { cls: 'name-info' }) : name(p.id),
          p.bot ? (s.finished ? this.botReveal(s, p.id, p.bot) : this.botPartialReveal(p.bot)) : null,
          h('div', { class: 'factors' }, t(`mode.${pr.mode}`)),
          pr.opened && pr.hand.length ? h('div', { class: 'rest' }, ...pr.hand.map((c) => this.cardEl(c, { mini: true }))) : null,
          !pr.opened && pr.hand.length ? h('div', { class: 'rest backs' }, ...pr.hand.map((c) => this.cardEl(backOf(c), { mini: true, backId: this.seatBack(p.id) }))) : null,
          // Wer fertig ist, hat keine Restkarten: leere Box, damit alle Zeilen gleich hoch sind
          !pr.hand.length ? h('div', { class: 'rest' }, this.cardEl('slot', { mini: true })) : null,
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
    return windowEl([
      h('h2', null, title),
      h('p', null, text),
      extras.length ? h('p', { class: 'accent' }, extras.join(' ')) : null,
      h(
        'table',
        { class: 'scores' },
        h('thead', null, h('tr', null, h('th', null, t('roundEnd.rest')), h('th', { class: 'num' }, t('score.base')), h('th', { class: 'num' }, t('score.total')), h('th', { class: 'num' }, t('score.sum')))),
        h('tbody', null, ...rows),
      ),
      h(
        'div',
        { class: 'btn-row' },
        btn(t('btn.peekTable'), () => {
          this.peekTable = true;
          this.render();
        }),
        this.nextRoundButton(),
      ),
      this.waitHint(),
    ]);
  }
}

// Nicht genutzte Importe vermeiden (RectMap für Typen in anim.ts)
export type { RectMap };
