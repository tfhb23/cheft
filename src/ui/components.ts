/**
 * Wiederverwendbare Bausteine. Das Spiel und der Design Guide bauen ihre Elemente aus denselben Funktionen,
 * damit „so sieht ein Button aus“ nur an einer Stelle steht. Das Aussehen selbst kommt aus styles.css und tokens.ts.
 */
import { h, Child } from './dom';
import { t } from '../i18n';
import { MOTION } from './tokens';
import { ICON_ARROW_L, ICON_ARROW_R, ICON_NOCONN, pixelIcon } from './icons';

export type BtnVariant = 'default' | 'primary' | 'dark' | 'danger';

export interface BtnOpts {
  variant?: BtnVariant;
  disabled?: boolean;
  cls?: string;
  title?: string;
}

/** 4.01–4.04: Standard-Button in vier Varianten. */
export function btn(label: Child, onclick?: () => void, opts: BtnOpts = {}): HTMLElement {
  const v = opts.variant && opts.variant !== 'default' ? ` ${opts.variant}` : '';
  return h('button', { class: `btn${v}${opts.cls ? ' ' + opts.cls : ''}`, disabled: opts.disabled, title: opts.title, onclick }, label);
}

/**
 * 4.06: „Zurück“. Der eine Knopf, der ein Fenster oder eine Seite verlässt und zum Vorherigen zurückgeht.
 * Immer als letztes Element, immer Standard-Variante, immer derselbe Text.
 */
export function backBtn(onclick: () => void): HTMLElement {
  return btn(t('btn.back'), onclick, { cls: 'back' });
}

/** 4.07: Quadratischer Button mit Pixel-Piktogramm. */
export function iconBtn(icon: Child, title: string, onclick?: () => void): HTMLElement {
  return h('button', { class: 'btn icon', title, onclick }, icon);
}

/** 2.31: Hinweis (klein, gedämpft). `center` für Hinweise unter Knöpfen. */
export function hint(text: string, center = false): HTMLElement {
  return h('div', { class: `hint${center ? ' center' : ''}` }, text);
}

/** 4.12: Beschriftung über einem Feld. */
export function fieldLabel(text: string): HTMLElement {
  return h('div', { class: 'field-label' }, text);
}

/** 4.30: Spielweise-Chip (Rommé grau, Cheft orange). */
export function badge(text: string, mode?: string): HTMLElement {
  return h('span', { class: `badge${mode ? ' ' + mode : ''}` }, text);
}

/** 6.24: Kleines Funk-Piktogramm hinter einem Namen: die Verbindung ist weg. Ohne sichtbaren Text, nur als Beschriftung für Screenreader. */
export function lostIcon(): HTMLElement {
  const title = t('conn.lost');
  return h('span', { class: 'conn-lost', title, role: 'img', 'aria-label': title }, pixelIcon(ICON_NOCONN));
}

/** 6.20: Beschriftung eines Sitzes: Name, Spielweise, Kartenzahl, optional Hinweis. */
export function seatLabel(o: { name: string; mode: string; count: number; hint?: string; cls?: string; lost?: boolean }): HTMLElement {
  return h(
    'div',
    { class: `seat-label${o.cls ? ' ' + o.cls : ''}` },
    h('span', { class: 'sl-name' }, o.name, o.lost ? lostIcon() : null),
    badge(t(`mode.${o.mode}`), o.mode),
    h('span', { class: 'sl-cnt' }, t('cards.count', { n: o.count })),
    o.hint ? h('span', { class: 'sl-hint' }, o.hint) : null,
  );
}

/**
 * 7.01: Fenster auf der Abdunkelung. Mit `onBackdrop` schließt ein Tipp daneben das Fenster; das macht dasselbe wie
 * „Zurück“ und gibt es nur, wo das Fenster nur anzeigt (Einstellungen, Punkte, Info), nie bei Entscheidungen.
 */
export function windowEl(children: Child[], onBackdrop?: () => void): HTMLElement {
  return h(
    'div',
    { class: 'overlay', onclick: onBackdrop ? (e: Event) => e.target === e.currentTarget && onBackdrop() : undefined },
    h('div', { class: 'panel dialog' }, ...children),
  );
}

/** 7.20: Meldung unten im Bild. */
export function toastEl(msg: string, error = false): HTMLElement {
  return h('div', { class: `toast${error ? ' error' : ''}` }, msg);
}

/** Zeigt einen Toast und räumt ihn nach der Standarddauer ab. Gibt den Timer zurück. */
export function showToast(msg: string, error: boolean, previous: number | null): number {
  document.querySelector('.toast')?.remove();
  const el = toastEl(msg, error);
  document.body.appendChild(el);
  if (previous) clearTimeout(previous);
  return window.setTimeout(() => el.remove(), MOTION.toast);
}

/** 8.10: Ganzseitige Ansicht mit Titelleiste, scrollendem Inhalt und Fußleiste, in der „Zurück“ steht. */
export function viewEl(title: string, body: Child[], onBack: () => void, bodyCls = ''): HTMLElement {
  return h(
    'div',
    { class: 'view' },
    h('div', { class: 'viewbar' }, h('h2', null, title)),
    h('div', { class: `view-body ${bodyCls}`.trim() }, ...body),
    h('div', { class: 'footbar' }, backBtn(onBack)),
  );
}

/** 6.30: Kombination (Auslage) aus Karten. `cardEl` liefert die Karten, damit der Baustein keinen Atlas kennen muss. */
export function meldEl(cards: Child[], o: { pair?: boolean; target?: boolean; stealable?: boolean; onClick?: () => void; title?: string; id?: number } = {}): HTMLElement {
  return h(
    'div',
    {
      class: `meld${o.pair ? ' pair' : ''}${o.target ? ' target' : ''}${o.stealable ? ' stealable' : ''}${o.onClick ? ' clickable' : ''}`,
      onclick: o.onClick,
      title: o.title,
      dataset: o.id !== undefined ? { meldId: String(o.id) } : undefined,
    },
    ...cards,
  );
}

export interface RoundsRow {
  /** Strafpunkte dieser Runde je Spalte. */
  points: number[];
  /** Spalte des Rundensiegers oder null. */
  winner: number | null;
}

/**
 * 7.07: Punkteverlauf. Eine Zeile je festgelegter Runde, nicht gespielte Runden bleiben leer (ist die Liste voll, ist das
 * Spiel vorbei). Alle Spielerspalten sind gleich breit; `names` stehen in der Reihenfolge der Spalten.
 */
export function roundsTable(names: string[], played: RoundsRow[], totalRounds: number): HTMLElement {
  const sums = names.map(() => 0);
  const total = names.map((_, i) => played.reduce((a, r) => a + r.points[i], 0));
  const max = Math.max(1, ...total);
  const NBSP = '\u00a0';
  const rows: HTMLElement[] = [];
  for (let n = 0; n < Math.max(totalRounds, played.length); n++) {
    const r = played[n];
    rows.push(
      h(
        'tr',
        { class: r ? undefined : 'pending' },
        ...names.map((_, i) => {
          if (!r) return h('td', { class: 'num cell' }, h('span', { class: 'sum' }, NBSP), h('span', { class: 'delta' }, NBSP));
          sums[i] += r.points[i];
          const bar = h('div', { class: 'bar', style: { width: `${Math.round((sums[i] / max) * 100)}%` } });
          return h('td', { class: `num cell${r.winner === i ? ' win' : ''}` }, bar, h('span', { class: 'sum' }, String(sums[i])), h('span', { class: 'delta' }, r.points[i] ? `+${r.points[i]}` : '·'));
        }),
      ),
    );
  }
  return h('table', { class: 'scores rounds' }, h('thead', null, h('tr', null, ...names.map((n) => h('th', { class: 'num' }, n)))), h('tbody', null, ...rows));
}

/**
 * 4.22: Auswahl der Kartenrückseite. Keine Buttons: Jede Rückseite ist eine Karte in Spielgröße. Die gewählte steht
 * orange und leuchtet (Karte leuchtet, 5.13), die anderen dunkel und abgeblendet (Karte abgeblendet, 5.15).
 */
let backScrollKeep: number | null = null;
export function backChoiceRow(items: { id: string; name: string; orange: string; dark: string }[], selected: string, onPick: (id: string) => void): HTMLElement {
  const strip = h(
    'div',
    { class: 'choices back-choices' },
    ...items.map((d) => {
      const on = d.id === selected;
      return h('div', {
        class: `card clickable ${on ? 'glow' : 'dim'}`,
        style: { backgroundImage: `url(${on ? d.orange : d.dark})`, backgroundSize: '100% 100%', backgroundPosition: '0 0' },
        title: d.name,
        onclick: () => {
          backScrollKeep = strip.scrollLeft;
          onPick(d.id);
        },
      });
    }),
  );
  const step = (dir: number) => () => strip.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: 'smooth' });
  // Die gewählte Rückseite beim Aufbau ins Bild holen (nach dem Einfügen ins Dokument, deshalb verzögert)
  requestAnimationFrame(() => {
    const cur = strip.querySelector('.glow') as HTMLElement | null;
    if (backScrollKeep !== null) {
      strip.scrollLeft = backScrollKeep;
      backScrollKeep = null;
    } else if (cur) strip.scrollLeft = cur.offsetLeft - (strip.clientWidth - cur.offsetWidth) / 2;
  });
  return h('div', { class: 'back-scroller' }, iconBtn(pixelIcon(ICON_ARROW_L), '‹', step(-1)), strip, iconBtn(pixelIcon(ICON_ARROW_R), '›', step(1)));
}
