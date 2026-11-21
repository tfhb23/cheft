/**
 * Familienalbum (Design Guide): zeigt jedes Element der App mit fester Nummer, echtem Aussehen (aus denselben Bausteinen und
 * Stilen wie das Spiel) und den tatsächlich berechneten Werten. Nummern stammen aus tokens.ts (Farben, Maße) und stehen hier
 * (alle übrigen Kapitel). Die Nummer ist ein Name, keine Seitenposition: Ein Element behält sie, auch wenn sein Kapitel wandert.
 * Mit „Nummern im Spiel“ (Werkstatt) erscheinen die Nummern als Punkte über dem laufenden Spiel.
 *
 * Aufbau: Marke (Familien, Rückseiten, Blatt, Farben, Schrift und Pixel, Klang), Tisch (Spielfeld, Bausteine, Fenster, Seiten,
 * Verhalten) und Werkstatt (Maße, Abstände, Atlas; eingeklappt).
 *
 * Neues Element aufnehmen: unten in chapters() einen Eintrag mit neuer Nummer ergänzen. Ein Test prüft, dass die Nummern
 * eindeutig sind und jeder Selektor existiert.
 */
import { Card } from '../engine/cards';
import { h, Child } from './dom';
import { t } from '../i18n';
import { backBtn, backChoiceRow, badge, btn, roundsTable, fieldLabel, hint, iconBtn, meldEl, seatLabel, toastEl, viewEl } from './components';
import { ICONS, pixelArt, pixelIcon } from './icons';
import { ATLAS_CELLS, FACE2_CELL, GLYPHS, STAR, SUIT_SHAPES, faceColors, PALETTE, backThumb } from './sprites';
import { FACE_ART } from './face-art';
import { BACK_DESIGNS } from './backs';
import { MAX_RATIO, START, deviceClass, tableLadder } from './tablescale';
import { SOUND_CATALOG, VIBRATION_CATALOG, preview, vibrate } from './sound';
import {
  BORDER_TOKENS,
  BREAKPOINT_TOKENS,
  CARD_PX,
  EASE_FLY,
  EFFECT_TOKENS,
  FONT_SIZES,
  FONT_TOKENS,
  HAND_TOKENS,
  HAND,
  MOTION,
  MOTION_TOKENS,
  TURN_DISC,
  PALETTE_COLORS,
  PEEK_FROM_SCALE,
  ROLE_COLORS,
  SCALE_TOKENS,
  SIZE_TOKENS,
  SPACING_ROLES,
  SPACING_SCALE,
  TYPE_MISC_TOKENS,
  WEIGHT_TOKENS,
  Z_TOKENS,
} from './tokens';

export interface GuideEnv {
  cardEl: (card: Card | 'back' | 'back2' | 'slot', opts?: { selected?: boolean; dim?: boolean; temp?: boolean; small?: boolean; mini?: boolean; fresh?: boolean; cls?: string; title?: string }) => HTMLElement;
  atlasUrl: string;
  atlasIndex: (card: Card | 'back' | 'back2' | 'slot') => number;
  labelsOn: boolean;
  setLabels: (on: boolean) => void;
  onBack: () => void;
}

type Live = 'text' | 'box' | 'both';

/** Ein nummeriertes Element. */
export interface Spec {
  id: string;
  name: string;
  /** Wo im Spiel das Element vorkommt. */
  where?: string;
  /** Klasse oder Funktion im Code. */
  code?: string;
  /** Selektor, mit dem „Nummern im Spiel“ das Element findet. */
  sel?: string;
  stage: () => Child | Child[];
  stageCls?: 'col' | 'dark' | 'flat';
  /** Welche berechneten Werte angezeigt werden und an welchem Element sie gemessen werden. */
  live?: Live;
  liveSel?: string;
  /** Weitere Nummern, die im Spiel denselben Stil teilen: Sie stehen bei diesem Eintrag, ihre Nummern-Punkte im Spiel bleiben. */
  also?: { id: string; name: string; where?: string; sel?: string }[];
  /** Zusätzliche feste Angaben (Zeile für Zeile: Name, Wert). */
  facts?: [string, string][];
}

interface Group {
  title: string;
  note?: string;
  specs?: Spec[];
  node?: () => HTMLElement;
  /** Nummern, die der Knoten selbst trägt (für die Prüfung auf eindeutige Nummern). */
  ids?: string[];
  /** Knoten ohne den Rahmen eines Eintrags (bringt sein eigenes Panel mit). */
  bare?: boolean;
}

type Tier = 'marke' | 'tisch' | 'werkstatt';

interface Chapter {
  key: string;
  tier: Tier;
  title: string;
  /** Nummernbereich zur Orientierung, z. B. „5.50–5.53“. */
  ids?: string;
  intro?: string;
  groups: Group[];
}

// ---------------------------------------------------------------- Hilfen
const NS = 'guide';
let measurers: (() => void)[] = [];

function cssVar(name: string): string {
  return typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function rootScale(): number {
  return parseFloat(cssVar('--s')) || 2;
}

function hex(c: string): string {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return c;
  const p = m[1].split(',').map((x) => parseFloat(x));
  if (p.length === 4 && p[3] === 0) return 'transparent';
  const h2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  const base = `#${h2(p[0])}${h2(p[1])}${h2(p[2])}`;
  return p.length === 4 && p[3] < 1 ? `rgba(${Math.round(p[0])}, ${Math.round(p[1])}, ${Math.round(p[2])}, ${p[3]})` : base;
}

/** Palette-Nummer und Name zu einem berechneten Farbwert, falls vorhanden. */
function colorLabel(computed: string): string {
  const v = hex(computed);
  if (v === 'transparent') return 'transparent';
  const found = PALETTE_COLORS.find((c) => c.value.toLowerCase().replace(/\s/g, '') === v.toLowerCase().replace(/\s/g, ''));
  return found ? `${v} · ${found.id} ${found.name}` : v;
}

function u(px: number, s: number): string {
  const n = px / s;
  const r = Math.round(n * 10) / 10;
  return `${r} u (${Math.round(px * 10) / 10} px)`;
}

const ALIGN: Record<string, string> = { start: 'links', left: 'links', center: 'zentriert', right: 'rechts', end: 'rechts', justify: 'Blocksatz' };

function liveRows(el: Element, kind: Live): [string, string][] {
  const cs = getComputedStyle(el);
  const s = rootScale();
  const rows: [string, string][] = [];
  const px = (v: string) => parseFloat(v) || 0;
  if (kind === 'text' || kind === 'both') {
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const weight = parseInt(cs.fontWeight, 10);
    rows.push(['Schrift', `${fam}, ${weight >= 700 ? 'fett' : weight >= 600 ? 'halbfett (600)' : 'normal'}${cs.fontStyle === 'italic' ? ', kursiv' : ''}`]);
    rows.push(['Größe', u(px(cs.fontSize), s)]);
    rows.push(['Farbe', colorLabel(cs.color)]);
    rows.push(['Ausrichtung', ALIGN[cs.textAlign] ?? cs.textAlign]);
    if (cs.letterSpacing !== 'normal' && px(cs.letterSpacing) !== 0) rows.push(['Laufweite', u(px(cs.letterSpacing), s)]);
    rows.push(['Zeilenhöhe', cs.lineHeight === 'normal' ? 'normal' : `${Math.round((px(cs.lineHeight) / px(cs.fontSize)) * 100) / 100}`]);
    if (cs.textTransform !== 'none') rows.push(['Schreibweise', cs.textTransform === 'uppercase' ? 'GROSS' : cs.textTransform]);
  }
  if (kind === 'box' || kind === 'both') {
    rows.push(['Hintergrund', colorLabel(cs.backgroundColor)]);
    const bw = px(cs.borderTopWidth);
    if (bw > 0 && cs.borderTopStyle !== 'none') rows.push(['Rahmen', `${u(bw, s)}, ${cs.borderTopStyle}, ${colorLabel(cs.borderTopColor)}`]);
    const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map((v) => Math.round((px(v) / s) * 10) / 10);
    if (pad.some((x) => x)) rows.push(['Innenabstand', `${pad.join(' / ')} u (oben / rechts / unten / links)`]);
    const r = el.getBoundingClientRect();
    rows.push(['Größe', `${Math.round((r.width / s) * 10) / 10} × ${Math.round((r.height / s) * 10) / 10} u`]);
    if (cs.boxShadow !== 'none') {
      const m = cs.boxShadow.match(/(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?/);
      rows.push(['Schatten', m ? `${Math.round((parseFloat(m[2]) / s) * 10) / 10} / ${Math.round((parseFloat(m[3]) / s) * 10) / 10} u, ${colorLabel(m[1])}${m[5] && parseFloat(m[5]) ? `, Ausbreitung ${Math.round((parseFloat(m[5]) / s) * 10) / 10} u` : ''}` : 'ja']);
    }
  }
  return rows;
}

/** Toast zum Ansehen: im Guide an Ort und Stelle statt unten im Bild. */
function staticToast(msg: string, error = false): HTMLElement {
  const el = toastEl(msg, error);
  Object.assign(el.style, { position: 'static', transform: 'none' });
  return el;
}

function idChip(id: string): HTMLElement {
  return h('span', { class: 'spec-id' }, id);
}

function specEl(sp: Spec): HTMLElement {
  const stageChildren = sp.stage();
  const stage = h('div', { class: `spec-stage${sp.stageCls ? ' ' + sp.stageCls : ''}` }, ...(Array.isArray(stageChildren) ? stageChildren : [stageChildren]));
  const vals = h('dl', { class: 'spec-vals' });
  const facts = sp.facts ?? [];
  for (const [k, v] of facts) vals.append(h('dt', null, k), h('dd', null, v));
  if (sp.live) {
    measurers.push(() => {
      const el = (sp.liveSel ? stage.querySelector(sp.liveSel) : null) ?? stage.firstElementChild;
      if (!el) return;
      for (const [k, v] of liveRows(el, sp.live!)) vals.append(h('dt', null, k), h('dd', null, v));
    });
  }
  return h(
    'div',
    { class: 'panel spec', id: `${NS}-${sp.id}` },
    h('div', { class: 'spec-head' }, idChip(sp.id), h('span', { class: 'spec-name' }, sp.name)),
    sp.also?.length ? h('div', { class: 'spec-where spec-also' }, ...sp.also.map((a) => h('div', null, idChip(a.id), ` ${a.name}${a.where ? ': ' + a.where : ''}`))) : null,
    stage,
    vals.childElementCount || sp.live ? vals : null,
    sp.where ? h('div', { class: 'spec-where' }, `Wo: ${sp.where}`) : null,
    sp.code ? h('div', { class: 'spec-where' }, `Code: ${sp.code}`) : null,
  );
}

function table(head: string[], rows: Child[][], numCols: number[] = []): HTMLElement {
  return h(
    'table',
    { class: 'guide-table' },
    h('thead', null, h('tr', null, ...head.map((x, i) => h('th', { class: numCols.includes(i) ? 'num' : '' }, x)))),
    h('tbody', null, ...rows.map((r) => h('tr', null, ...r.map((c, i) => h('td', { class: numCols.includes(i) ? 'num' : '' }, c))))),
  );
}

const flat = (x: Child | Child[]): Child[] => (Array.isArray(x) ? x : [x]);

/**
 * Fasst Einträge zusammen, die im Spiel denselben Stil teilen (nur Größe, Ausrichtung oder Breite unterscheiden sich). Der erste
 * Eintrag der Gruppe bleibt; die Nummern der übrigen stehen bei ihm als „auch“, damit die Nummern-Punkte im Spiel bleiben.
 */
function mergeSpecs(list: Spec[], ...groups: string[][]): Spec[] {
  let out = list;
  for (const [mainId, ...ids] of groups) {
    const main = out.find((x) => x.id === mainId);
    const parts = ids.map((i) => out.find((x) => x.id === i));
    if (!main || parts.some((p) => !p)) throw new Error(`mergeSpecs: ${mainId} ${ids.join(' ')}`);
    const all = [main, ...(parts as Spec[])];
    const merged: Spec = { ...main, stageCls: 'flat', stage: () => all.flatMap((p) => flat(p.stage())), also: (parts as Spec[]).map((p) => ({ id: p.id, name: p.name, where: p.where, sel: p.sel })) };
    out = out.filter((x) => !ids.includes(x.id)).map((x) => (x.id === mainId ? merged : x));
  }
  return out;
}

/** Zelle mit Haupttext und kleiner Zeile darunter. */
const sub = (main: string, note: string): HTMLElement => h('div', null, main, h('div', { class: 'hint' }, note));

const sample = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz ÄÖÜ äöüß 0123456789 .,:;!?+-×·…';

function unitsOfRole(css: string): number {
  const r = SPACING_ROLES.find((x) => x.css === css)!;
  return SPACING_SCALE.find((x) => x.css === r.ref)!.units;
}

// ---------------------------------------------------------------- Inhalt
export function chapters(env: GuideEnv): Chapter[] {
  const card = (suit: Card['suit'], rank: number, id = -100): Card => ({ id, suit, rank });
  const jack: Card = { id: -101, suit: 'J', rank: 0 };
  const c = env.cardEl;
  const suitName: Record<string, string> = { H: 'Herz', D: 'Karo', C: 'Kreuz', S: 'Pik' };
  const rankName = (r: number) => (r === 1 ? 'Ass' : r === 11 ? 'Bube' : r === 12 ? 'Dame' : r === 13 ? 'König' : String(r));

  // ----- 1 Farben
  const swatch = (value: string, lg = false) => h('span', { class: `swatch${lg ? ' lg' : ''}`, style: { background: value } });
  const uiColors = PALETTE_COLORS.filter((x) => x.group !== 'Figuren');
  const paletteGroups: Group[] = [...new Set(uiColors.map((x) => x.group))].map((g) => ({
    title: g,
    node: () =>
      h(
        'div',
        { class: 'spec' },
        ...uiColors
          .filter((x) => x.group === g)
          .map((x) => {
            const roles = ROLE_COLORS.filter((r) => r.ref === x.css);
            return h(
              'div',
              { class: 'swatch-row' },
              swatch(x.value, true),
              h(
                'div',
                { class: 'swatch-text' },
                h('div', { class: 'spec-head' }, idChip(x.id), h('span', { class: 'spec-name' }, x.name), h('span', { class: 'muted' }, x.value)),
                h('div', { class: 'spec-where' }, x.css),
                x.use ? h('div', { class: 'spec-where' }, x.use) : null,
                ...roles.map((r) => h('div', { class: 'spec-where' }, idChip(r.id), ` ${r.name} (${r.css}): ${r.use}`)),
              ),
            );
          }),
      ),
  }));

  // ----- 2 Typografie
  const typeRolesRaw: Spec[] = [
    { id: '2.30', name: 'Logo-Schriftzug (h1)', where: 'Menü', code: 'h1', sel: 'h1', stage: () => h('h1', null, t('app.title')), live: 'text' },
    { id: '2.31', name: 'Titel (h2)', where: 'Seiten- und Fenstertitel, immer zentriert', code: 'h2', sel: 'h2', stage: () => h('h2', null, t('btn.settings')), live: 'text' },
    { id: '2.32', name: 'Zwischenüberschrift links (h3)', where: 'Regeln, Familienalbum: Abschnitte', code: '.rules h3', sel: '.rules h3', stage: () => h('div', { class: 'rules' }, h('h3', null, 'Spielablauf')), live: 'text', liveSel: 'h3' },
    { id: '2.33', name: 'Zwischenüberschrift im Fenster (h3)', where: 'Punkteverlauf (Spielende)', code: '.dialog h3', sel: '.dialog h3', stage: () => h('div', { class: 'dialog' }, h('h3', null, t('gameEnd.rounds'))), stageCls: 'flat', live: 'text', liveSel: 'h3' },
    { id: '2.34', name: 'Rückblick-Banner', where: 'Rückblick auf Abwürfe: Banner oben', code: '.peek-banner', sel: '.peek-banner', stage: () => h('div', { class: 'peek-banner', style: { position: 'static' } }, t('peek.title')), stageCls: 'dark', live: 'text' },
    { id: '2.35', name: 'Fließtext', where: 'Meldungen im Fenster, Regeln, Bestätigungen', code: 'p / body', stage: () => h('div', { class: 'panel' }, h('p', null, t('confirm.quit'))), stageCls: 'flat', live: 'text', liveSel: 'p' },
    { id: '2.36', name: 'Feldbeschriftung', where: 'Über Auswahlzeilen und Eingabefeldern', code: '.field-label', sel: '.field-label', stage: () => fieldLabel(t('settings.speed')), live: 'text' },
    { id: '2.37', name: 'Hinweis', where: 'Erklärungen unter Einstellungen, Bot-Auswahl (Stufe, Spielweise), „Spielrichtung“', code: '.hint', sel: '.hint:not(.center)', stage: () => hint(t('setup.directionCcw')), live: 'text' },
    { id: '2.38', name: 'Hinweis zentriert', where: 'Warten auf Mitspieler (unter Knöpfen)', code: '.hint.center', sel: '.hint.center', stage: () => h('div', { style: { width: '100%' } }, hint(t('wait.others', { names: 'Emil, Zhao' }), true)), live: 'text', liveSel: '.hint' },
    { id: '2.39', name: 'Akzenttext', where: 'Besonderheiten in der Auswertung („Hand gemacht!“), Rollen am Spielende', code: '.accent', sel: '.accent', stage: () => h('p', { class: 'accent' }, t('roundEnd.hand')), live: 'text' },
    { id: '2.40', name: 'Gedämpfter Text', where: 'Untertitel im Menü, „Noch keine Runde beendet“, Rundenzeilen', code: '.muted', sel: '.muted', stage: () => h('div', { class: 'muted' }, t('app.subtitle')), live: 'text' },
    { id: '2.41', name: 'Status-Meldung', where: 'Status-Zeile, links', code: '.status .msg', sel: '.status .msg', stage: () => h('div', { class: 'status', style: { width: '100%' } }, h('span', { class: 'msg' }, t('turn.you.draw'))), live: 'text', liveSel: '.msg' },
    { id: '2.42', name: 'Status-Info', where: 'Status-Zeile, rechts (Erstmeldung, gewählte Augen)', code: '.status .info', sel: '.status .info', stage: () => h('div', { class: 'status', style: { width: '100%' } }, h('span', { class: 'info' }, t('threshold', { n: 51 }))), live: 'text', liveSel: '.info' },
    { id: '2.43', name: 'Spielername am Sitz', where: 'Sitz-Beschriftung: links vom Chip', code: '.sl-name', sel: '.sl-name', stage: () => h('div', { class: 'seat-label' }, h('span', { class: 'sl-name' }, 'Emil')), live: 'text', liveSel: '.sl-name' },
    { id: '2.44', name: 'Kartenzahl am Sitz', where: 'Sitz-Beschriftung: rechts vom Chip', code: '.seat-label', sel: '.seat-label .sl-cnt', stage: () => h('div', { class: 'seat-label' }, h('span', { class: 'sl-cnt' }, t('cards.count', { n: 14 }))), live: 'text', liveSel: '.sl-cnt' },
    { id: '2.46', name: 'Zähler auf dem Stapel', where: 'Stapel mit höchstens 7 Karten', code: '.count-on-card', sel: '.count-on-card', stage: () => h('div', { class: 'stock-wrap', style: { margin: 0 } }, c('back'), h('div', { class: 'count-on-card' }, '7')), live: 'text', liveSel: '.count-on-card' },
    { id: '2.47', name: 'Tabellenkopf', where: 'Auswertung, Punkteverlauf: Spaltenköpfe', code: 'table.scores th', sel: 'table.scores th', stage: () => h('table', { class: 'scores' }, h('thead', null, h('tr', null, h('th', null, t('score.base'))))), live: 'text', liveSel: 'th' },
    { id: '2.48', name: 'Tabellenzeile', where: 'Auswertung, Punkteverlauf: Zellen', code: 'table.scores td', stage: () => h('table', { class: 'scores' }, h('tbody', null, h('tr', null, h('td', null, 'Emil')))), live: 'text', liveSel: 'td' },
    { id: '2.49', name: 'Tabellenzeile Sieger', where: 'Auswertung: Rundensieger (synthetisches Fett)', code: 'table.scores tr.winner', sel: 'table.scores tr.winner', stage: () => h('table', { class: 'scores' }, h('tbody', null, h('tr', { class: 'winner' }, h('td', null, 'Emil')))), live: 'text', liveSel: 'td' },
    { id: '2.50', name: 'Faktoren und Zuwachs', where: 'Auswertung: „Cheft gewonnen ×2“, Punkteverlauf: „+12“', code: '.factors / .delta', sel: '.factors, .delta', stage: () => h('div', { class: 'factors' }, t('factor.cheftWon')), live: 'text' },
    { id: '2.53', name: 'Namensschild im Rückblick', where: 'Rückblick auf Abwürfe: Schild an jeder Karte', code: '.peek-tag', sel: '.peek-tag', stage: () => h('div', { class: 'peek-tag' }, 'Emil'), live: 'both' },
    { id: '2.54', name: 'Rundenzähler', where: 'Kopfzeile im Spiel', code: '.round-no', sel: '.round-no', stage: () => h('div', { class: 'topbar', style: { position: 'static' } }, h('span', { class: 'accent round-no' }, h('span', { class: 'rl' }, `${t('round.word')} `), '1/7')), live: 'text', liveSel: '.round-no' },
  ];
  const typeRoles = mergeSpecs(typeRolesRaw, ['2.32', '2.33'], ['2.37', '2.38', '2.44'], ['2.40', '2.36'], ['2.41', '2.43'], ['2.39', '2.54'], ['2.35', '2.46']);

  const fontSpecs: Spec[] = FONT_TOKENS.map((f) => ({
    id: f.id,
    name: f.name,
    where: f.use,
    code: `${f.css}: ${f.value}`,
    stage: () => h('div', { style: { fontFamily: `var(${f.css})`, fontSize: 'var(--fs-body)' } }, sample),
    stageCls: 'flat' as const,
    facts: [['Quelle', f.css === '--font-body' ? '@fontsource/vt323 (latin, latin-ext), geladen in main.ts' : 'Tiny5 Duo 700 (Google Fonts, OFL), selbst eingebunden: src/ui/fonts, @font-face in styles.css']],
  }));
  const weightSpecs: Spec[] = WEIGHT_TOKENS.map((w) => ({
    id: w.id,
    name: w.name,
    where: w.use,
    code: `${w.css}: ${w.value}`,
    stage: () => h('div', { style: { fontFamily: w.id === '2.04' ? 'var(--font-head)' : 'var(--font-body)', fontWeight: `var(${w.css})`, fontSize: 'var(--fs-body)' } }, `Cheft spielt Rommé – 0123456789`),
    stageCls: 'flat' as const,
    live: 'text' as const,
  }));
  const sizeSpecs: Spec[] = FONT_SIZES.map((f) => ({
    id: f.id,
    name: `${f.name} (${f.units} u)`,
    where: f.use,
    code: f.css,
    stage: () => h('div', { style: { fontSize: `var(${f.css})`, fontFamily: f.units >= 12 ? 'var(--font-head)' : 'var(--font-body)', color: 'var(--text-strong)' } }, 'Cheft Rommé 0123'),
    stageCls: 'flat' as const,
    live: 'text' as const,
  }));

  // ----- 3 Maße
  const tokenTable = (head: string[], rows: () => Child[][], num: number[] = []) => () => table(head, rows(), num);
  const spacingScaleGroup: Group = {
    title: 'Abstandsskala (3.11–3.18)',
    specs: SPACING_SCALE.map((s) => ({
      id: s.id,
      name: `${s.css} = ${s.units} u`,
      stage: () => h('div', { class: 'space-bar', style: { width: `var(${s.css})`, height: 'var(--gap-row)' } }),
      stageCls: 'flat' as const,
      facts: [['Wert', `${s.units} u = ${s.units * rootScale()} px bei Maßstab ${rootScale()}`]],
    })),
  };
  const spacingRoleGroup: Group = {
    title: 'Abstands-Rollen (3.21–3.38)',
    note: 'Einen Abstand im ganzen Spiel ändern: den Verweis auf die Skala ändern (tokens.ts › SPACING_ROLES).',
    node: tokenTable(
      ['Nr.', 'Rolle', 'Wert'],
      () =>
        SPACING_ROLES.map((r) => {
          const un = SPACING_SCALE.find((s) => s.css === r.ref)!;
          return [idChip(r.id), sub(r.name, `${r.css} → ${r.ref} · ${r.use}`), `${un.units} u`];
        }),
      [2],
    ),
  };

  // Abstände im Einsatz: Stelle, Teile (Rollen oder Stufen), Hinweis
  type Use = { where: string; parts: string[]; note?: string };
  const roleU = (css: string): number => {
    if (SPACING_ROLES.some((x) => x.css === css)) return unitsOfRole(css);
    const hand = HAND_TOKENS.find((x) => x.css === css);
    if (hand) return HAND[hand.key];
    return SPACING_SCALE.find((x) => x.css === css)?.units ?? SIZE_TOKENS.find((x) => x.css === css)!.units!;
  };
  const usage: [string, Use[]][] = [
    [
      'Menü und Seiten mit Panel (Neues Spiel, Online, Beitreten, Lobby)',
      [
        { where: 'Seitenrand außen', parts: ['--pad-screen'], note: 'Rand um Logo und Panel' },
        { where: 'Logo ↔ Panel', parts: ['--gap-group'] },
        { where: 'Logo: Karten ↔ Schriftzug', parts: ['--gap-hair', '--gap-row'], note: '1 u Logo-Abstand + 4 u unter den Karten' },
        { where: 'Logo: Schriftzug ↔ Untertitel', parts: ['--gap-hair'] },
        { where: 'Panel: Innenrand', parts: ['--pad-inner'] },
        { where: 'Knopf ↔ Knopf (untereinander)', parts: ['--gap-stack'], note: 'auch Feld ↔ Feld und Feld ↔ Knopf' },
        { where: 'Menü: Gruppe ↔ Gruppe (Weiterspielen/Neues Spiel | Online | Regeln/Guide/Einstellungen)', parts: ['--gap-stack', '--gap-group'], note: 'Stapelabstand + Gruppen-Zusatz' },
        { where: 'Über „Zurück“ (Neues Spiel, Mit Freunden, Beitreten, Einstellungen)', parts: ['--gap-stack', '--gap-group'], note: 'Wie zwischen Menü-Gruppen: „Zurück“ steht immer abgesetzt' },
        { where: 'Auswahlzeile: Beschriftung ↔ Knöpfe', parts: ['--gap-hair'] },
        { where: 'Auswahlzeile: Knopf ↔ Knopf (an/aus)', parts: ['--gap-tight'] },
        { where: 'Bot-Auswahl: Stufe ↔ Spielweise', parts: ['--gap-row'] },
        { where: 'Bot-Auswahl: Hinweis ↔ Knopf', parts: ['--gap-hair'] },
        { where: 'Feld ↔ Knopf in einer Zeile (Raumcode, Beitreten)', parts: ['--gap-row'] },
        { where: 'Einstellungen-Zusammenfassung: Zeilenabstand innen', parts: ['--gap-hair'], note: 'oben/unten je 1 u, Spalten 4 u' },
      ],
    ],
    [
      'Fenster (Dialog, Einstellungen, Punkte, Auswertung, Pause, Auswahl)',
      [
        { where: 'Fenster ↔ Bildschirmrand', parts: ['--pad-overlay'] },
        { where: 'Fenster: Innenrand', parts: ['--pad-inner'] },
        { where: 'Element ↔ Element (Titel, Text, Felder, Knöpfe)', parts: ['--gap-stack'], note: 'Absätze haben im Fenster keinen eigenen Abstand mehr' },
        { where: 'Über „Zurück“', parts: ['--gap-stack', '--gap-group'] },
        { where: 'Zwei Knöpfe nebeneinander (Abbrechen | Aktion)', parts: ['--gap-row'] },
        { where: 'Wahloption in „Wie auslegen?“: Innenrand', parts: ['--pad-inner'] },
        { where: 'Wahloption: Kombinationen untereinander', parts: ['--gap-row'] },
        { where: 'Tabelle: Zelle innen oben/unten', parts: ['--gap-hair'], note: 'links/rechts 2 u' },
        { where: 'Restkarten in der Auswertung: Karte ↔ Karte', parts: ['--gap-hair'] },
      ],
    ],
    [
      'Ganzseitige Ansicht (Regeln, Familienalbum)',
      [
        { where: 'Titelleiste: oben/unten', parts: ['--pad-bar-y'], note: 'links/rechts 4 u' },
        { where: 'Lesespalte: Rand oben/unten', parts: ['--pad-screen'] },
        { where: 'Zwischenüberschrift: darüber', parts: ['--gap-group'], note: 'darunter 2 u' },
        { where: 'Listenpunkt ↔ Listenpunkt', parts: ['--gap-tight'] },
        { where: 'Fußleiste: oben/unten', parts: ['--pad-bar-y'], note: 'links/rechts 4 u; unten mindestens der Sicherheitsrand des Geräts' },
      ],
    ],
    [
      'Spielfeld',
      [
        { where: 'Kopfzeile: Rand oben/unten', parts: ['--gap-tight'], note: 'links/rechts 4 u' },
        { where: 'Kopfzeile: Zähler ↔ Piktogramme', parts: ['--gap-row'] },
        { where: 'Kopfzeile: Piktogramm ↔ Piktogramm', parts: ['--gap-tight'] },
        { where: 'Tisch: Innenrand', parts: ['--gap-tight'] },
        { where: 'Sitz: Beschriftung ↔ Auslage ↔ Fächer', parts: ['--gap-tight'] },
        { where: 'Eigener Sitz: Beschriftung ↔ Auslage', parts: ['--gap-hair'] },
        { where: 'Auslage: Kombination ↔ Kombination (Zeile / Spalte)', parts: ['--gap-tight', '--gap-row'], note: '2 u zwischen den Zeilen, 4 u daneben' },
        { where: 'Kombination: Innenrand', parts: ['--gap-hair'] },
        { where: 'Sitz-Beschriftung: Name ↔ Chip ↔ Kartenzahl', parts: ['--gap-row'] },
        { where: 'Aktiver Sitz: Innenrand links/rechts', parts: ['--gap-row'] },
        { where: 'Tischmitte: Stapel ↔ Ablage', parts: ['--pile-gap'] },
        { where: 'Stapel/Ablage ↔ Beschriftung', parts: ['--gap-hair'] },
        { where: 'Status-Zeile: Rand oben/unten', parts: ['--gap-tight'], note: 'links/rechts 4 u; Meldung ↔ Info 4 u' },
        { where: 'Handleiste: Rand oben', parts: ['--pad-bar-y'], note: 'links/rechts 4 u; unten 0, die Karten stehen an der Aktionsleiste' },
        { where: 'Hand: Zeile ↔ Zeile (zweizeilig)', parts: ['--hand-row-gap'] },
        { where: 'Aktionsleiste: Rand oben/unten', parts: ['--pad-bar-y'], note: 'links/rechts 4 u; Knopf-Innenrand 2 u links/rechts' },
        { where: 'Aktionsleiste: Knopf ↔ Knopf', parts: ['--gap-tight'] },
        { where: 'Toast: Innenrand', parts: ['--pad-inner'], note: 'links/rechts 4 u; 90 u über dem unteren Rand' },
      ],
    ],
    [
      'Lobby',
      [
        { where: 'Sitzreihe: Innenrand oben/unten', parts: ['--gap-tight'] },
        { where: 'Sitzreihe: Name ↔ Chips ↔ Entfernen', parts: ['--gap-row'] },
        { where: 'Sitzreihe: Zeile ↔ Bot-Auswahl', parts: ['--gap-tight'] },
      ],
    ],
  ];
  const usageGroup: Group[] = usage.map(([title, rows]) => ({
    title: `Abstände im Einsatz: ${title}`,
    node: () =>
      table(
        ['Stelle', 'Wert'],
        rows.map((r) => {
          const units = r.parts.map(roleU);
          const sum = units.reduce((a, b) => a + b, 0);
          const val = units.length > 1 && r.where.includes('Zeile / Spalte') ? units.join(' / ') : units.length > 1 ? `${units.join(' + ')} = ${sum}` : `${sum}`;
          return [sub(r.where, `${r.parts.join(' + ')}${r.note ? ' · ' + r.note : ''}`), `${val} u`];
        }),
        [1],
      ),
  }));

  const sizeTable: Group = {
    title: 'Maße einzelner Elemente (3.71–3.109)',
    note: 'Fest in u (mal --s) oder in Pixeln. Auslagen rechnen aus den Basis-Pixeln (3.71–3.78) mal --so, die Tischmitte mal --sc (6.18).',
    node: tokenTable(
      ['Nr.', 'Name', 'Wert'],
      () => SIZE_TOKENS.map((s) => [idChip(s.id), sub(s.name, `${s.css} · ${s.use}`), s.px !== undefined ? `${s.px} px` : s.of ? `${s.of} × s` : `${s.units} u`]),
      [2],
    ),
  };

  const borderGroup: Group = {
    title: 'Rahmen, Schatten, Linien (3.51–3.60)',
    specs: BORDER_TOKENS.map((b): Spec => {
      const stage = (): HTMLElement => {
        if (b.css === '--bw') return h('div', { class: 'panel', style: { boxShadow: 'none' } }, 'Rahmen 1 u');
        if (b.css === '--bw-mark') return h('div', { style: { width: 'calc(4 * var(--size-btn-icon))', height: 'var(--size-btn-icon)', outline: 'var(--bw-mark) solid var(--accent)', background: 'var(--surface-panel)' } });
        if (b.css === '--radius') return h('div', { class: 'panel', style: { boxShadow: 'none' } }, 'Ecken eckig (0)');
        if (b.css === '--sh-card') return h('h1', null, 'Cheft');
        return h('div', { style: { width: 'calc(6 * var(--size-btn-icon))', height: 'calc(2 * var(--size-btn-icon))', background: 'var(--surface-panel)', border: 'var(--border)', boxShadow: `var(${b.css})`, margin: 'var(--gap-group)' } });
      };
      return { id: b.id, name: b.name, where: b.use, code: `${b.css}: ${b.value}`, stage };
    }),
  };

  const effectGroup: Group = {
    title: 'Wirkung auf Karten (3.61–3.67)',
    node: tokenTable(['Nr.', 'Name', 'Wert'], () => EFFECT_TOKENS.map((e) => [idChip(e.id), sub(e.name, `${e.css} · ${e.use}`), e.value]), [2]),
  };

  // ----- 4 Bedienelemente
  const btnSpecsRaw: Spec[] = [
    { id: '4.01', name: 'Button Standard', where: 'Alle normalen Aktionen, inaktive Wahlknöpfe', code: 'btn(label, onClick)', sel: '.btn:not(.primary):not(.dark):not(.danger):not(.icon):not(.back):not(:disabled)', stage: () => btn(t('btn.newGame')), live: 'both' },
    { id: '4.02', name: 'Button Primär', where: 'Die eine Hauptaktion einer Ansicht, gewählte Wahlknöpfe', code: "btn(label, onClick, { variant: 'primary' })", sel: '.btn.primary:not(:disabled)', stage: () => btn(t('btn.start'), undefined, { variant: 'primary' }), live: 'both' },
    { id: '4.03', name: 'Button Dunkel', where: 'Cheft ansagen (Aktionsleiste, ganz links)', code: "variant: 'dark'", sel: '.btn.dark:not(:disabled)', stage: () => btn(t('btn.cheft'), undefined, { variant: 'dark' }), live: 'both' },
    { id: '4.04', name: 'Button Gefahr', where: 'Spiel abbrechen, Raum verlassen', code: "variant: 'danger'", sel: '.btn.danger:not(:disabled)', stage: () => btn(t('btn.quit'), undefined, { variant: 'danger' }), live: 'both' },
    { id: '4.05', name: 'Button Deaktiviert', where: 'Alle Varianten, wenn die Aktion gerade nicht geht', code: '{ disabled: true }', sel: '.btn:disabled', stage: () => [btn(t('btn.lay'), undefined, { disabled: true }), btn(t('btn.start'), undefined, { variant: 'primary', disabled: true })], live: 'both' },
    { id: '4.06', name: 'Button Zurück', where: 'Letzter Knopf jedes Fensters und jeder Seite (Neues Spiel, Online, Beitreten, Einstellungen, Punkte, Info-Dialog, Regeln, Familienalbum)', code: 'backBtn(onClick) → this.back()', sel: '.btn.back', stage: () => backBtn(() => undefined), live: 'both', facts: [['Regel', 'Immer „Zurück“, immer Standard-Variante, immer ganz unten. In Stapeln steht ein Gruppen-Zusatzabstand (3.22) darüber.']] },
    { id: '4.07', name: 'Button Piktogramm', where: 'Kopfzeile im Spiel, Entfernen in der Lobby', code: 'iconBtn(icon, title, onClick)', sel: '.btn.icon', stage: () => ICONS.map((i) => iconBtn(pixelIcon(i.rows), i.name)), live: 'box' },
    { id: '4.08', name: 'Button gedrückt', where: 'Beim Antippen: Schatten weg, 1 u nach unten rechts', code: '.btn:active / .btn.active', stage: () => h('button', { class: 'btn active' }, t('btn.newGame')), live: 'box' },
    { id: '4.09', name: 'Knopfgruppe', where: 'Zwei Knöpfe nebeneinander in Fenstern (Abbrechen | Aktion, Tisch ansehen | Nächste Runde)', code: '.btn-row', sel: '.btn-row', stage: () => h('div', { class: 'btn-row', style: { width: '100%' } }, btn(t('btn.cancel')), btn(t('btn.cheftConfirm'), undefined, { variant: 'primary' })), live: 'box', liveSel: '.btn-row' },
    { id: '4.10', name: 'Button in Aktionsleiste', where: 'Cheft, Auslegen, Anlegen, Abwerfen (innen schmaler: 2 u links/rechts)', code: '.actions .btn', stage: () => h('div', { class: 'actions', style: { width: '100%' } }, btn(t('btn.lay'), undefined, { variant: 'primary' }), btn(t('btn.discard'))), live: 'box', liveSel: '.btn' },
  ];
  const btnSpecs = mergeSpecs(btnSpecsRaw, ['4.09', '4.10']);
  const choiceDemo = (): HTMLElement =>
    h('div', { class: 'option', style: { width: '100%' } }, fieldLabel(t('settings.speed')), h('div', { class: 'choices' }, btn(t('settings.speed.normal'), undefined, { variant: 'primary' }), btn(t('settings.speed.fast'))));
  const inputSpecsRaw: Spec[] = [
    { id: '4.11', name: 'Auswahlzeile', where: 'Alle Einstellungen: Bot-Tempo, Vibration, Sounds, Runden, Sitzplätze …', code: 'App.choice() · .option .choices', sel: '.option', stage: choiceDemo, stageCls: 'flat', live: 'box', liveSel: '.option' },
    { id: '4.12', name: 'Bot-Auswahl', where: 'Neues Spiel, Lobby: Stufe und Spielweise', code: 'App.botPicker() · .bot-pick', sel: '.bot-pick', stage: () => h('div', { class: 'bot-pick', style: { width: '100%' } }, h('div', { class: 'bot-col' }, hint(t('setup.level')), btn(t('level.hard'), undefined, { variant: 'primary' })), h('div', { class: 'bot-col' }, hint(t('setup.style')), btn(t('setup.random')))), stageCls: 'flat', live: 'box', liveSel: '.bot-pick' },
    { id: '4.13', name: 'Eingabefeld', where: 'Name (Neues Spiel, Online), Server-Adresse', code: 'input.text', sel: 'input.text:not(.name-edit):not(.code)', stage: () => h('input', { class: 'text', type: 'text', value: 'Tobi', placeholder: t('you') }), stageCls: 'flat', live: 'both' },
    { id: '4.14', name: 'Namensfeld', where: 'Lobby und Einstellungen online: eigener Name', code: 'input.text.name-edit', sel: 'input.text.name-edit', stage: () => h('input', { class: 'text name-edit', type: 'text', value: 'Tobi' }), stageCls: 'flat', live: 'box' },
    { id: '4.15', name: 'Codefeld', where: 'Raumcode eingeben', code: 'input.text.code', sel: 'input.text.code', stage: () => h('input', { class: 'text code', type: 'text', value: '232' }), stageCls: 'flat', live: 'both' },
    { id: '4.16', name: 'Mehrzeiliges Feld', where: 'Spielstand-Code einfügen/kopieren, Link kopieren', code: 'textarea.text', sel: 'textarea.text', stage: () => h('textarea', { class: 'text', rows: '3' }, 'CHEFT1-ABCDEFGH…'), stageCls: 'flat', live: 'box' },
    { id: '4.17', name: 'Auf-/Zuklapper', where: 'Online: Server-Adresse', code: 'details > summary.hint', sel: 'details', stage: () => h('details', { open: 'open' }, h('summary', { class: 'hint' }, t('online.server')), hint(t('online.serverHint'))), stageCls: 'flat', live: 'box', liveSel: 'details' },
    { id: '4.18', name: 'Einstellungs-Zeile (nur lesen)', where: 'Lobby für Mitspieler ohne Rechte', code: '.summary-row', sel: '.summary-row', stage: () => h('div', { class: 'row spread summary-row', style: { width: '100%' } }, h('span', { class: 'field-label' }, t('setup.rounds')), h('span', null, '7')), stageCls: 'flat', live: 'box', liveSel: '.summary-row' },
    { id: '4.19', name: 'Sortier-Griff', where: 'Lobby: Sitzordnung ziehen (nur Gastgeber)', code: '.handle', sel: '.handle', stage: () => h('span', { class: 'handle' }), live: 'box' },
    { id: '4.20', name: 'Chip (Rommé, Cheft)', where: 'Sitz-Beschriftung, Auswertung; „Gastgeber“, „getrennt“, „Bot“ in der Lobby', code: 'badge(text) · .badge', sel: '.badge:not(.cheft)', stage: () => badge(t('mode.romme'), 'romme'), live: 'both' },
    { id: '4.22', name: 'Auswahl Kartenrückseite', where: 'Einstellungen (Menü und im Spiel): Rückseiten als Karten in Spielgröße; die gewählte orange mit Rahmen (5.12), die übrigen dunkel und abgeblendet (5.15). Wirkt sofort, nur für den eigenen Bildschirm', code: 'backChoiceRow() · .back-choices · backs.ts', sel: '.back-choices', stage: () => h('div', { class: 'option', style: { width: '100%' } }, fieldLabel(t('settings.cardBack')), backChoiceRow(BACK_DESIGNS.map((d) => ({ id: d.id, name: d.name, orange: backThumb(d.id, 'a'), dark: backThumb(d.id, 'b') })), BACK_DESIGNS[0].id, () => undefined)), stageCls: 'flat' },
    { id: '4.21', name: 'Chip Cheft', where: 'Sitz-Beschriftung: Spieler hat Cheft angesagt', code: "badge(text, 'cheft')", sel: '.badge.cheft', stage: () => badge(t('mode.cheft'), 'cheft'), live: 'both' },
  ];
  const inputSpecs = mergeSpecs(inputSpecsRaw, ['4.13', '4.14', '4.15', '4.16'], ['4.20', '4.21']);

  // ----- 5 Karten und Grafiken
  const numberCards: Spec = {
    id: '5.02',
    name: 'Zahlenkarten (Ass bis 10)',
    code: 'sprites.ts › drawFace · Atlas-Zellen 0–9 (Herz) und je 13 für Karo, Kreuz, Pik',
    stage: () => h('div', { class: 'card-grid' }, ...Array.from({ length: 10 }, (_, k) => c(card('H', k + 1, -200 - k), { title: `Herz ${rankName(k + 1)}` }))),
    stageCls: 'flat',
    facts: [
      ['Farben', 'Beispiel Herz. Herz und Karo tragen Zahl und Symbol in Rot, Kreuz und Pik in Tinte, sonst sind alle vier Farben gleich gebaut'],
      ['Maße', 'Ziffern 5 × 7 Pixel (die 0 nur 4 × 7), Symbole 7 × 7 Pixel (5.21, 5.22)'],
    ],
  };
  const stateCard = (cls: Parameters<GuideEnv['cardEl']>[1]) => c(card('H', 12), cls);
  const cardStates: Spec[] = [
    { id: '5.11', name: 'Karte normal', where: 'Hand, Auslage, Ablage', code: '.card', stage: () => stateCard({}) },
    { id: '5.12', name: 'Karte ausgewählt', where: 'Hand: angetippt (hebt sich 6 u an). Rückseiten-Auswahl in den Einstellungen: die gewählte Rückseite', code: '.card.selected', sel: '.card.selected', stage: () => stateCard({ selected: true }), stageCls: 'flat', facts: [['Rahmen', 'Orange, 2 u stark, außen direkt an der Kartenkontur, Außenecken um 1 Pixel abgerundet wie die Karte. Grün (5.14) und Rot (5.17) haben genau dieselbe Form']] },
    { id: '5.14', name: 'Karte frisch gezogen', where: 'Hand: gerade gezogene Karte; auch Teppich-Joker und geklauter Joker (grün)', code: '.card.fresh', sel: '.card.fresh', stage: () => stateCard({ fresh: true }), stageCls: 'flat' },
    { id: '5.15', name: 'Karte abgeblendet', where: 'Rückseiten-Auswahl in den Einstellungen: die nicht gewählten Rückseiten', code: '.card.dim', sel: '.card.dim', stage: () => stateCard({ dim: true }), stageCls: 'flat' },
    { id: '5.17', name: 'Vorübergehende Karte', where: 'Roter Rahmen mit dünnem dunklem Ring: Ablagekarte (nur als Rommé-Spieler), Teppichkarte (nicht bei leerem Stapel) und geklauter Joker. Muss im selben Zug verwendet werden. Die Mitspieler sehen sie offen (Fächer am Desktop, halbe Karte am Handy)', code: '.card.temp', sel: '.card.temp', stage: () => h('div', { style: { padding: 'var(--gap-row)' } }, stateCard({ temp: true })), stageCls: 'flat', liveSel: '.card' },
    { id: '5.18', name: 'Karte unter dem Finger', where: 'Ziehen: leicht durchsichtig und größer, mit Zahl der Gruppe', code: '.hand .card.dragging · .drag-badge', sel: '.drag-badge', stage: () => h('div', { style: { opacity: 'var(--op-drag)', transform: 'scale(var(--scale-drag))', position: 'relative' } }, stateCard({}), h('div', { class: 'drag-badge' }, '×3')), stageCls: 'flat' },
    { id: '5.19', name: 'Platzhalter', where: 'Leere Ablage und leere Restkartenzeile in der Auswertung', code: "cardEl('slot') · .slot-hint", stage: () => c('slot'), stageCls: 'flat' },
  ];
  const sizes: Spec = {
    id: '5.10',
    name: 'Kartengrößen',
    where: 'Handkarten (--s), Auslagen aller Sitze (.o, --so), Tischmitte (--sc, 6.18), Mini-Karten (feste Pixel)',
    code: '.card · .card.o · .card.mini',
    stage: () => [c(card('S', 13)), c(card('S', 13), { small: true }), c(card('S', 13), { mini: true })],
    stageCls: 'flat',
    facts: [['Basis', `${CARD_PX.w} × ${CARD_PX.h} Pixel, Atlas ${CARD_PX.atlasW} × ${CARD_PX.atlasH} (${CARD_PX.cols} Spalten, ${ATLAS_CELLS} Zellen)`]],
  };
  const art = (rows: string[], colors: Record<string, string> | undefined, px: number) => {
    const svg = pixelArt(rows, colors) as unknown as HTMLElement;
    svg.classList.add('pix');
    svg.style.width = `calc(${rows[0].length * px}px * var(--s))`;
    svg.style.height = `calc(${rows.length * px}px * var(--s))`;
    return svg;
  };
  const cardArt: Spec[] = [
    {
      id: '5.21',
      name: 'Ziffern- und Buchstaben-Glyphen (5 × 7 Pixel, die 0 nur 4 × 7)',
      where: 'Eckmarken aller Karten: 2–10, A, B (Bube), D (Dame), K, J (Joker)',
      code: 'sprites.ts › GLYPHS',
      stage: () => Object.entries(GLYPHS).map(([k, rows]) => h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--gap-hair)', color: 'var(--text-strong)' } }, art(rows, undefined, 1.5), hint(k))),
      stageCls: 'flat',
    },
    {
      id: '5.22',
      name: 'Farbsymbole (7 × 7 Pixel)',
      where: 'Eckmarken und Mitte der Zahlenkarten (Herz/Karo rot, Pik/Kreuz Tinte)',
      code: 'sprites.ts › SUIT_SHAPES',
      stage: () => (['H', 'D', 'C', 'S'] as const).map((su) => h('div', { style: { color: su === 'H' || su === 'D' ? PALETTE.red : PALETTE.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--gap-hair)' } }, art(SUIT_SHAPES[su], undefined, 3), hint(suitName[su]))),
      stageCls: 'flat',
    },
    { id: '5.24', name: 'Joker', where: 'Zwei Joker im Spiel', code: 'sprites.ts › drawJoker · Atlas-Zelle 52 · STAR', stage: () => [c(jack), art(STAR, { '#': PALETTE.orangeDark }, 3), art(STAR, { '#': PALETTE.gold }, 3)], stageCls: 'flat', facts: [['Stern (5.23)', '13 × 13 Pixel in Orange dunkel und Gold, 1 Pixel versetzt']] },
  ];
  const backThumbs = (d: (typeof BACK_DESIGNS)[number]): HTMLElement[] => (['a', 'b'] as const).map((deck) => h('span', { class: 'thumb', style: { backgroundImage: `url(${backThumb(d.id, deck)})` } }));
  /** Alle Rückseiten gleichwertig: Paar (Deck 1 orange, Deck 2 dunkel) nebeneinander, darunter Name und Nummer. */
  const backGallery = (): HTMLElement =>
    h(
      'div',
      { class: 'panel back-gallery' },
      ...BACK_DESIGNS.map((d, i) => h('div', { class: 'back-item', id: `${NS}-5.${61 + i}` }, h('div', { class: 'back-pair' }, ...backThumbs(d)), h('div', { class: 'back-name' }, d.name), idChip(`5.${61 + i}`))),
    );
  const backIds = BACK_DESIGNS.map((_, i) => `5.${61 + i}`);

  // ----- Familien: Figuren ohne Spielkarte, beide Decks als Paar. Beschreibungen aus design/bildkarten (STAND.md, zwillinge.py).
  type Fam = { id: string; world: string; chars: Record<11 | 12 | 13, [string, string]>; colors: string[] };
  const FAMILIES: Record<'H' | 'D' | 'C' | 'S', Fam> = {
    H: { id: '5.50', world: 'Die Guten · persische Dichtkunst, Liebe · Rot, Gold, Weiß, Braun, nicht zu bunt', chars: { 11: ['Turbanform, Gold, Mond', 'kleiner Turban mit steiler Feder'], 12: ['Schleier, Mond und Sterne, schmaler Mund', 'Goldkamm, schmale Lippen'], 13: ['Moghul-Turban, Feder, grauer Bart', 'Dreibogen-Goldkrone, graues Haar, kleiner Schnurrbart'] }, colors: ['skin-h', 'hair-h', 'eye-h', 'hair-gray'] },
    D: { id: '5.51', world: 'Orient, Schätze, Gold · blondes Haar, goldene Elemente · roter Fez als Familienmotiv', chars: { 11: ['roter Fez, Quaste', 'Takke und Stirnlocken'], 12: ['Juwelenkönigin, Diamant-Diadem', 'Sonnenscheibe, wellig mit Goldbändern'], 13: ['Kalif, Goldturban, langer Bart', 'Federkrone'] }, colors: ['skin-d', 'hair-d', 'eye-d'] },
    C: { id: '5.52', world: 'Klassische Königsfamilie · Schwarz, Gold, Weiß, braunes Haar', chars: { 11: ['Falkner mit Falke', 'Hermelinprinz'], 12: ['Hofdame, Diadem, Perlen', 'Zopfkrone'], 13: ['Goldkrone, Schnurrbart', 'Glatze, runder Bart, Goldspange'] }, colors: ['skin-c', 'hair-c', 'eye-c'] },
    S: { id: '5.53', world: 'Die Bösen · weiße Haare, Brille, Monokel, Zylinder, blasse Haut, Schwarz', chars: { 11: ['weißer Topfschnitt, runde Brille', ''], 12: ['weißer Bob, Brille, Melone mit rotem Band', 'Beret, Schönheitspunkt'], 13: ['Zylinder, Monokel, weißes langes Haar', 'breiter Zylinder, Glatze, Schnurrbart'] }, colors: ['skin-s', 'eye-s'] },
  };
  const fold = (title: string, ...children: Child[]): HTMLElement => h('details', { class: 'fold' }, h('summary', { class: 'hint' }, title), ...children);
  const colorRows = (names: string[]): HTMLElement =>
    table(
      ['Nr.', 'Farbe', 'Wert'],
      names.map((n) => {
        const col = PALETTE_COLORS.find((x) => x.css === `--c-${n}`)!;
        return [idChip(col.id), h('span', null, h('span', { class: 'swatch', style: { background: col.value } }), ` ${col.name}`), col.value];
      }),
    );
  /** Person ohne Karte: der Ausschnitt mit Kopf und Schultern (Spalten 10–23, Zeilen 8–32 der Karte). */
  const portrait = (su: string, rank: number, deck: 0 | 1): HTMLElement => {
    const rows = FACE_ART[`${su}${rank}`][deck].slice(8, 33).map((r) => r.slice(10, 24));
    return h('div', { class: 'portrait' }, art(rows, faceColors(), 2));
  };
  const familyBand = (su: 'H' | 'D' | 'C' | 'S'): HTMLElement => {
    const f = FAMILIES[su];
    const chars = ([11, 12, 13] as const).map((r) =>
      h('div', { class: 'fam-char' }, h('div', { class: 'fam-pair' }, portrait(su, r, 0), portrait(su, r, 1)), h('div', { class: 'fam-name' }, `${suitName[su]} ${rankName(r)}`), ...f.chars[r].map((txt, d) => h('div', { class: 'hint' }, `${d + 1} · ${txt || '–'}`))),
    );
    return h(
      'div',
      { class: 'panel fam', id: `${NS}-${f.id}` },
      h('div', { class: 'spec-head fam-head' }, h('span', { class: 'fam-suit', style: { color: su === 'H' || su === 'D' ? PALETTE.red : PALETTE.ink } }, art(SUIT_SHAPES[su], undefined, 2)), h('h3', null, suitName[su]), idChip(f.id)),
      h('div', { class: 'hint fam-world' }, f.world),
      h('div', { class: 'fam-chars' }, ...chars),
      fold(`Farben dieser Familie (${f.colors.length}, nur für die Figuren)`, colorRows(f.colors)),
    );
  };
  const familiesNode = (): HTMLElement =>
    h(
      'div',
      { class: 'fam-list' },
      ...(['H', 'D', 'C', 'S'] as const).map(familyBand),
      h(
        'div',
        { class: 'panel fam-more' },
        fold('Für alle Familien: Weiß und Palettenfarben', colorRows(['white']), hint('Weiß kommt in den Figuren aller Familien vor (Turbane, Schleier, Hermelin, Perlen, alle Pik-Haare) und sonst nirgends in der App. Außerdem verwenden die Figuren Tinte, Creme, Rot, Orange, Gold und Sand dunkel aus der Palette. Abgeleitete Töne stehen als feste Werte in face-art.ts.')),
        fold(
          'So sind die Figuren gebaut',
          hint('Licht links/oben: Helligkeit +0,12, Sättigung ×0,92. Schatten rechts/unten: Helligkeit −0,13, Sättigung ×1,10 (bei Weiß nur −0,06). Nase: Haut −0,18. Lippen: Rot 1.14 mit 50 % (Männer) und 90 % (Damen) Deckkraft auf der Haut. Falten eine Stufe dunkler.'),
          hint('Figuren und Formeln: design/bildkarten/code (Python, Pillow). Nach jeder Änderung an Palette 1.20–1.33 dort export_ts.py ausführen. Die Datei face-art.ts nie von Hand ändern. Jede Person ist 32 × 44 Pixel groß (face-art.ts, Karten 0–51 Deck 1, 52–103 Deck 2).'),
        ),
      ),
    );
  const fullDeck = (): HTMLElement =>
    h(
      'div',
      { class: 'panel' },
      ...(['H', 'D', 'C', 'S'] as const).map((su, si) => h('div', { class: 'card-grid blatt-row' }, ...Array.from({ length: 13 }, (_, k) => c(card(su, k + 1, -700 - si * 13 - k), { mini: true, title: `${suitName[su]} ${rankName(k + 1)}` })))),
    );
  const brand: Spec[] = [
    {
      id: '5.30',
      name: 'Logo',
      where: 'Menü: drei Karten (2, 3, 2 in zufälligen Farben, mittlere höher) über Schriftzug und Untertitel',
      code: '.logo · .logo-cards',
      sel: '.logo',
      stage: () => h('div', { class: 'logo' }, h('div', { class: 'logo-cards' }, c(card('H', 2, -301)), c(card('S', 3, -302)), c(card('D', 2, -303))), h('h1', null, t('app.title')), h('div', { class: 'muted' }, t('app.subtitle'))),
    },
    {
      id: '5.31',
      name: 'App-Icon',
      where: 'Homescreen (PWA), Apple Touch Icon, Manifest',
      code: 'public/icon-192.png, icon-512.png · scripts/make-icons.mjs, make-favicon.mjs (Sonne der Rückseite „sonne“ auf Orange, Farben aus tokens.ts)',
      stage: () => [h('img', { src: `${import.meta.env.BASE_URL}icon-192.png`, width: '96', height: '96', style: { imageRendering: 'pixelated' } }), h('img', { src: `${import.meta.env.BASE_URL}icon-maskable-512.png`, width: '96', height: '96', style: { imageRendering: 'pixelated' } })],
      stageCls: 'flat',
      facts: [['App-Icon', '192 und 512 „any“ (abgerundet) · 192 und 512 „maskable“ (Vollfläche, Sonne in der Safe Zone) · Apple Touch 180 (Vollfläche)'], ['Favicon', 'favicon.svg (Vektor) · favicon.ico (16/32/48) · PNG 16, 32, 48, 96'], ['Teilen', 'og-image.png 1200 × 630']],
    },
    {
      id: '5.32',
      name: 'Hintergrundmuster',
      where: 'Hinter allen Seiten: Schachbrett aus Sand (1.06) und Sand hell (1.07), Kachel 8 u',
      code: 'body · --tile',
      stage: () => h('div', { style: { width: 'calc(8 * var(--tile))', height: 'calc(3 * var(--tile))', background: 'var(--surface-page)', backgroundImage: 'repeating-conic-gradient(var(--surface-page) 0 25%, var(--surface-page-alt) 0 50%)', backgroundSize: 'var(--tile) var(--tile)', border: 'var(--border)' } }),
      stageCls: 'flat',
    },
    {
      id: '5.33',
      name: 'Streuung der Ablage',
      where: 'Karten in der Ablage liegen leicht verdreht und verschoben; Werte aus der Karten-Nummer (hash)',
      code: 'App.renderGame › hash(c.id)',
      stage: () => h('div', { class: 'discard' }, ...[ [0, 0, -10], [3, -2, 14], [-2, 4, -20] ].map(([dx, dy, rot], i) => { const e = c(card('C', 4 + i, -400 - i)); e.style.transform = `translate(calc(${dx}px * var(--s)), calc(${dy}px * var(--s))) rotate(${rot}deg)`; e.style.zIndex = String(i); return e; })),
      stageCls: 'flat',
      facts: [['Spanne', 'Drehung −22° bis +22°, Versatz −5…+9 u waagerecht, −7…+7 u senkrecht']],
    },
  ];
  const iconSheet = (): HTMLElement =>
    table(
      ['Nr.', 'Piktogramm', 'Als Button', 'Wo'],
      ICONS.map((i) => [idChip(i.id), art(i.rows, undefined, 3), iconBtn(pixelIcon(i.rows), i.name), sub(`${i.name} (10 × 10 Pixel)`, `${i.use} · icons.ts › ICON_${i.key.toUpperCase()}`)]),
    );

  // ----- 6 Spielfeld
  const tableLayout = (): HTMLElement => {
    const box = (id: string, label: string, style: Record<string, string>) =>
      h('div', { class: 'panel', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: 'none', ...style } }, idChip(id), hint(label));
    return h(
      'div',
      { style: { width: '100%', display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gridTemplateRows: 'auto calc(3 * var(--size-btn-icon)) auto auto auto auto', gap: 'var(--gap-tight)' } },
      box('6.01', 'Kopfzeile', { gridColumn: '1 / 4' }),
      box('6.11', 'Sitz oben (bei 4 Spielern)', { gridColumn: '1 / 4' }),
      box('6.12', 'Sitz links', {}),
      box('6.14', 'Mitte: Stapel, Teppichkarte, Ablage', {}),
      box('6.13', 'Sitz rechts', {}),
      box('6.15', 'Eigene Auslage', { gridColumn: '1 / 4' }),
      box('6.50', 'Status-Zeile', { gridColumn: '1 / 4' }),
      box('6.60', 'Hand', { gridColumn: '1 / 4' }),
      box('6.62', 'Aktionsleiste', { gridColumn: '1 / 4' }),
    );
  };
  const melds = (kind: 'run' | 'set' | 'pair', small: boolean): HTMLElement => {
    const cards: Card[] =
      kind === 'run' ? [card('H', 4, -501), card('H', 5, -502), card('H', 6, -503)] : kind === 'set' ? [card('S', 9, -504), card('H', 9, -505), jack] : [card('D', 12, -506), card('D', 12, -507)];
    return meldEl(
      cards.map((k) => c(k, { small })),
      { pair: kind === 'pair' },
    );
  };
  const field: Spec[] = [
    { id: '6.01', name: 'Kopfzeile', where: 'Oben im Spiel: Punkte-Piktogramm, Rundenzähler, Regeln, Einstellungen', code: '.topbar', sel: '.topbar', stage: () => h('div', { class: 'topbar', style: { position: 'static', width: '100%' } }, iconBtn(pixelIcon(ICONS[0].rows), t('btn.scores')), h('span', { class: 'accent round-no' }, h('span', { class: 'rl' }, `${t('round.word')} `), '1/7'), h('div', { class: 'icons' }, iconBtn(pixelIcon(ICONS[1].rows), t('btn.rules')), iconBtn(pixelIcon(ICONS[2].rows), t('btn.settings')))), stageCls: 'flat', live: 'box', liveSel: '.topbar' },
    {
      id: '6.10',
      name: 'Aufbau und Ausrichtung des Spielfelds',
      where: 'Von oben nach unten; die Nummern verweisen auf die Elemente',
      code: 'App.renderGame · App.layoutPlacement · placeAxis()',
      stage: () => tableLayout(),
      stageCls: 'flat',
      facts: [
        ['Achse', 'Jeder Sitz hat eine Achse: die Mitte seiner Spielfeldkante, dort sitzt auch der Kreis (6.25). Die eigene Achse ist fest.'],
        ['Paket', 'Beschriftung (6.20) und alles, was ausliegt (Auslage, offene Karte, Teppich-Joker, halbe Karte oben drüber) liegen mittig auf der Achse.'],
        ['Seitliche Sitze', 'Das Paket liegt auf der Achse und wird nur verschoben, wenn der obere oder untere Sitz im Weg ist.'],
        ['Tischmitte', 'Mitte zwischen Stapel und Ablagefeld. Sie liegt auf der Spielfeldmitte, solange viel Platz ist, und wandert bei Enge weich zur Mitte des freien Platzes, ohne eine Auslage zu berühren.'],
        ['Bewegung', `Verschiebungen gleiten in ${MOTION.fly} ms (nicht bei reduzierter Bewegung).`],
      ],
    },
    { id: '6.20', name: 'Sitz-Beschriftung', where: 'Bei jedem Mitspieler und über der eigenen Auslage: Name | Rommé/Cheft | Kartenzahl. Die Badge liegt exakt auf der Achse des Sitzes, beide Badges sind gleich breit', code: 'seatLabel({ name, mode, count })', sel: '.seat-label', stage: () => seatLabel({ name: 'Emil', mode: 'romme', count: 14 }), live: 'box' },
    { id: '6.24', name: 'Verbindung verloren', where: 'Hinter dem Namen in Sitz-Beschriftung, Lobby-Zeile und Platzauswahl (Funksymbol mit X, 12 × 12 Pixel); erscheint erst nach 10 s, damit kurze Aussetzer nicht flackern', code: 'lostIcon()', sel: '.conn-lost', stage: () => seatLabel({ name: 'Max', mode: 'romme', count: 14, lost: true }), live: 'box' },
    { id: '6.21', name: 'Sitz-Beschriftung aktiv', where: 'Wer gerade dran ist: Gold hinterlegt, dunkle Schrift (so setzt sich das orange „Cheft“ ab)', code: '.seat.current .seat-label · .own.current', sel: '.seat.current .seat-label, .own.current .seat-label', stage: () => h('div', { class: 'seat current' }, seatLabel({ name: 'Emil', mode: 'cheft', count: 13 })), liveSel: '.seat-label', live: 'box' },
    { id: '6.22', name: 'Teppich-Joker', where: 'Vor dem Start einer Runde: Lagen beim Abheben ein oder zwei Joker unter der Teppichkarte, bekommt sie der Startspieler. Sie liegen für alle sichtbar links neben der offenen Karte (6.23), im Stil einer Auslage, mit dem Titel „Teppich“. Mit „Bereit“ wandern sie grün markiert in seine Hand', code: '.open-card > .meld · RoundState.carpetJokers', sel: '.open-card .meld', stage: () => h('div', { class: 'open-card' }, h('span', null, t('carpet.label')), meldEl([c(jack, { small: true }), c({ ...jack, id: -102 }, { small: true })])) },
    { id: '6.23', name: 'Offene Startkarte', where: 'Vor dem Start einer Runde im Bereich des Startspielers: Karte in der Stufe der Auslagen, ohne Rahmen, mit Titel (der bleibt auch, wenn die Beschriftungen der Mitte entfallen)', code: '.open-card', sel: '.open-card', stage: () => h('div', { class: 'open-card' }, c(card('C', 9, -510), { small: true }), h('span', null, t('wait.openCard', { name: 'Emil' }))) },
    { id: '6.30', name: 'Kombination Folge', where: 'Auslage jedes Sitzes, auch der eigenen: gleiche Stufe (--so, 6.18)', code: 'meldEl(cards) · cardEl(card, { small: true })', sel: '.meld', stage: () => melds('run', true), live: 'box' },
    { id: '6.31', name: 'Kombination Satz mit Joker', where: 'Auslage', code: 'meldEl(cards)', stage: () => melds('set', true) },
    { id: '6.32', name: 'Cheft-Paar', where: 'Auslage: zwei gleiche Karten, gleich überlappt wie jede Kombination', code: "meldEl(cards, { pair: true }) · .meld.pair", sel: '.meld.pair', stage: () => melds('pair', true) },
    { id: '6.40', name: 'Stapel', where: 'Tischmitte: Rücken mit Dicke (eine Kante je angefangene 8 Karten, höchstens 7)', code: 'App.stockEl()', sel: '.stock-wrap > .card', stage: () => h('div', { class: 'stock-wrap', style: { margin: 0, marginRight: 'calc(7 * var(--s))', marginBottom: 'calc(7 * var(--s))' } }, (() => { const e = c('back'); const sh: string[] = []; for (let i = 7; i >= 1; i--) sh.push(`calc(${i}px * var(--s)) calc(${i}px * var(--s)) 0 0 var(--c-cream)`, `calc(${i}px * var(--s)) calc(${i}px * var(--s)) 0 1px var(--c-sand-dark)`); e.style.boxShadow = sh.join(', '); return e; })()) },
    { id: '6.41', name: 'Teppichkarte', where: 'Quer unter dem Stapel, offen', code: '.carpet', sel: '.carpet', stage: () => h('div', { style: { position: 'relative', width: 'calc(1.4 * var(--card-h))', height: 'calc(1.2 * var(--card-w))' } }, h('div', { class: 'carpet', style: { left: 'calc(0.2 * var(--card-h))' } }, c(card('S', 11, -520)))) },
    { id: '6.42', name: 'Ablage', where: 'Tischmitte: Karten liegen verstreut; die oberste ist ziehbar', code: '.discard', sel: '.discard', stage: () => h('div', { class: 'discard' }, ...[[0, 0, -10], [3, -2, 14], [-2, 4, -20]].map(([dx, dy, rot], i) => { const e = c(card('C', 4 + i, -530 - i)); e.style.transform = `translate(calc(${dx}px * var(--s)), calc(${dy}px * var(--s))) rotate(${rot}deg)`; e.style.zIndex = String(i); return e; })), stageCls: 'flat' },
    {
      id: '6.44',
      name: 'Ablageziel',
      where: 'Beim Ziehen von Karten: wohin man sie legen kann. Gestrichelt in Orange (2 u); fährt man darüber, kommt die Hervorhebung (1.57) dazu. Drei Formen: Halbkreis hinter der eigenen Auslage (Auslegen), Kombination (Anlegen, auch Joker klauen) und Ablage (Abwerfen)',
      code: '.drop-halo · .meld.can · .discard.drop',
      sel: '.drop-halo, .meld.can, .discard.drop',
      stage: () => {
        const box = (extra: Record<string, string>, over: boolean) => h('div', { style: { border: 'var(--border-drop)', boxSizing: 'border-box', background: over ? 'color-mix(in srgb, var(--surface-highlight) 50%, transparent)' : 'transparent', ...extra } });
        const form = (label: string, extra: Record<string, string>) => h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--gap-hair)' } }, h('div', { style: { display: 'flex', gap: 'var(--gap-row)' } }, box(extra, false), box(extra, true)), hint(label));
        const w = { width: 'calc(3 * var(--card-w))', height: 'var(--card-h)' };
        return [form('Eigene Auslage: möglich | darüber', { ...w, borderRadius: '50%' }), form('Kombination: möglich | darüber', w), form('Ablage: möglich | darüber', { width: 'var(--card-w)', height: 'var(--card-h)' })];
      },
      stageCls: 'flat',
    },
    { id: '6.45', name: 'Stapel-Beschriftung', where: 'Eine kleine Schrift ganz nah an der Karte: „Stapel“ und „Ablage“ über der Karte (die Ablage später von Karten verdeckt), „Teppich“ gedreht links neben der Teppichkarte. Entfallen, sobald am Tisch etwas kleiner ist als zum Start (6.18); die Titel der Startkarten (6.22, 6.23) bleiben', code: '.pile-label', sel: '.pile-label', stage: () => h('div', { class: 'piles', style: { position: 'relative', height: 'calc(2 * var(--size-btn-icon))' } }, h('span', { class: 'pile-label', style: { position: 'static' } }, `${t('stock')} · ${t('discard')} · ${t('carpet.label')}`)), stageCls: 'flat', live: 'text', liveSel: '.pile-label' },
    { id: '6.47', name: 'Tippfläche Teppichkarte', where: 'Unsichtbar: genau so groß wie eine Karte im Hochformat, direkt links neben dem Stapel, nur beim Ziehen aktiv. Damit sind alle drei „Karte nehmen“-Felder (Stapel, Ablage, Teppich) gleich groß. Rommé-Spieler bekommen beim Antippen die Rückfrage „Cheft ansagen?“', code: '.carpet-hit', sel: '.carpet-hit', stage: () => h('div', { class: 'hint' }, 'Unsichtbar, ohne Rahmen und ohne Leuchten'), stageCls: 'flat' },
    { id: '6.48', name: 'Offene Karten im Fächer', where: 'Ab 900 px Breite: Die vorübergehenden Karten des Spielers am Zug liegen offen und rot umrandet am Ende des Fächers, in derselben Reihe und wie die verdeckten nur als obere Hälfte. Der Rahmen (3.50) ist von der Überlappung (3.75) abgezogen, so bleibt von jeder Karte so viel zu sehen wie ohne Rahmen; oben hat der Fächer Platz für den Rahmen', code: '.fan.has-temp > .card.temp', sel: '.fan .card.temp', stage: () => h('div', { class: 'fan has-temp' }, ...Array.from({ length: 6 }, (_, i) => c(i % 2 ? 'back2' : 'back', { small: true })), c(card('C', 10, -611), { small: true, temp: true }), c(jack, { small: true, temp: true })), stageCls: 'flat' },
    { id: '6.49', name: 'Halbe Karte am Handy', where: 'Ohne Fächer (Handy): Von jeder vorübergehenden Karte bleibt die obere Hälfte (Überlappung wie bei offenen Karten, Rahmen abgezogen), am äußeren Rand des Sitzes bis zum Bildschirmrand verlängert, der Rahmen fehlt an der Außenseite (die Karte wirkt abgeschnitten). Sie liegt über dem Sitz und belegt keinen Platz. Beim eigenen Sitz gibt es sie nicht (die Karte ist rot in der Hand)', code: '.temp-half > .half', sel: '.temp-half', stage: () => h('div', { class: 'temp-half', style: { margin: 'var(--gap-row)' } }, h('div', { class: 'half' }, c(card('C', 10, -612), { small: true, temp: true })), h('div', { class: 'half' }, c(jack, { small: true, temp: true }))), stageCls: 'flat' },
    { id: '6.46', name: 'Fächer der Mitspieler', where: 'Verdeckte Handkarten bei Mitspielern (nur ab 900 px Breite)', code: '.fan', sel: '.fan', stage: () => h('div', { class: 'fan' }, ...Array.from({ length: 8 }, (_, i) => c(i % 2 ? 'back2' : 'back', { small: true }))), stageCls: 'flat' },
    {
      id: '6.18',
      name: 'Kartengrößen am Tisch',
      where: 'Auslagen aller Sitze (--so) und Tischmitte: Stapel, Ablage, Teppichkarte (--sc). Die Handkarten bleiben bei --s',
      code: 'tablescale.ts › tableLadder() · App.layoutTable',
      stage: () => h('div', { class: 'hint' }, 'Beispiel dieses Geräts: ' + tableLadder(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, deviceClass(typeof window === 'undefined' ? 800 : window.innerWidth, typeof window === 'undefined' ? 600 : window.innerHeight), rootScale()).map((x) => `${x.a} / ${x.c}`).join(' → ')),
      stageCls: 'flat',
      facts: [
        ['Regel', `Die Mitte ist nie kleiner als die Auslagen und höchstens ${MAX_RATIO}-mal so groß, nie größer als die Hand.`],
        ['Stufen', 'Ganze Geräte-Pixel je Kartenpixel: n ÷ Pixeldichte (Dichte 1: 1, 2, 3 · Dichte 2: auch Halbschritte · Dichte 3: Drittel). Fehlt eine kleine Stufe, ist 1 die Notstufe.'],
        ['Start (Auslagen / Mitte)', `Handy schmal (bis 380 px) ${START.phoneNarrow.a} / ${START.phoneNarrow.c} · Handy ${START.phone.a} / ${START.phone.c} · Tablet, flacher Desktop ${START.tablet.a} / ${START.tablet.c} · großer Desktop ${START.desktop.a} / ${START.desktop.c}, jeweils auf die Stufen des Bildschirms gerundet.`],
        ['Verkleinern', 'Bei Platzmangel schrittweise nach unten (größte Summe zuerst), innerhalb einer Runde nie wieder größer. Neu bestimmt wird bei neuer Runde, nach „Bereit“ und bei anderer Fenstergröße.'],
        ['Beschriftungen', 'Sobald etwas kleiner ist als zum Start, entfallen „Stapel“, „Ablage“ und „Teppich“ (6.45).'],
      ],
    },
    { id: '6.50', name: 'Status-Zeile', where: 'Zwischen Tisch und Hand: Meldung links, Info rechts', code: '.status', sel: '.status', stage: () => h('div', { class: 'status', style: { width: '100%' } }, h('span', { class: 'msg' }, t('turn.you.play')), h('span', { class: 'info' }, t('threshold', { n: 51 }))), stageCls: 'flat', live: 'box', liveSel: '.status' },
    { id: '6.60', name: 'Hand', where: 'Eigene Karten auf der Leiste in Sand dunkel: markiert, frisch, vorübergehend (rot)', code: '.hand-wrap > .hand', sel: '.hand-wrap', stage: () => h('div', { class: 'hand-wrap', style: { width: '100%' } }, h('div', { class: 'hand', style: { display: 'flex', gap: 'var(--gap-tight)', height: 'auto', paddingTop: 'var(--lift-selected)' } }, ...[card('H', 5, -601), card('S', 13, -602), card('D', 1, -603), card('C', 7, -604)].map((k, i) => { const e = c(k, i === 1 ? { selected: true } : i === 2 ? { fresh: true } : {}); e.style.position = 'static'; if (i === 1) e.style.transform = 'translateY(calc(-1 * var(--lift-selected)))'; return e; }))), stageCls: 'flat', live: 'box', liveSel: '.hand-wrap', facts: [['Raster', `Abstand ${HAND.minStep}–(Kartenbreite + ${HAND.maxOver}) u; darunter zwei Zeilen im Abstand ${HAND.rowGap} u (3.151–3.154)`]] },
    { id: '6.62', name: 'Aktionsleiste', where: 'Unten, immer alle vier: Cheft! (dunkel, ganz links, weit weg vom oft gedrückten Abwerfen), Auslegen (primär), Anlegen, Abwerfen. Nicht Mögliches ist abgeblendet, aber nie vom Handinhalt abhängig. Vor Rundenbeginn steht stattdessen ein einziger Knopf „Bereit“ über die ganze Breite', code: '.actions', sel: '.actions', stage: () => [h('div', { class: 'actions', style: { width: '100%' } }, btn(t('btn.cheft'), undefined, { variant: 'dark' }), btn(t('btn.lay'), undefined, { variant: 'primary' }), btn(t('btn.layOff')), btn(t('btn.discard'))), h('div', { class: 'actions', style: { width: '100%' } }, btn(t('btn.ready'), undefined, { variant: 'primary' }))], stageCls: 'flat', live: 'box', liveSel: '.actions' },
    { id: '6.64', name: 'Zug zurücksetzen', where: 'Kleines Symbol links unten auf dem Spielfeld (5.45), bewusst kein Hauptknopf; immer da, abgeblendet, solange es nichts zurückzusetzen gibt. Setzt den Zug auf den Anfang zurück (Stapelkarte bleibt auf der Hand, Ablage- oder Teppichkarte gehen zurück); wurde schon ausgelegt, angelegt oder geklaut, fragt die App erst. Spielt einen enttäuschten Ton (9.12). Cheft-Ansage bleibt bestehen', code: '.undo-btn', sel: '.undo-btn', stage: () => iconBtn(pixelIcon(ICONS[4].rows), t('btn.undoDraw')), stageCls: 'flat', live: 'box' },
    { id: '6.25', name: 'Kreis des aktiven Spielers', where: 'Wer dran ist: großer goldener Kreis mit Pixelkante ganz hinten im Spielfeld, Mitte auf der Spielfeldkante bei diesem Spieler (unten, links, oben, rechts), am Rand abgeschnitten. Durchmesser = (Breite + Höhe des Spielfelds) ÷ 2 ÷ φ ÷ φ (3.145), aufs Pixelraster gerundet. Schon vor dem Start der Runde: So ist sofort klar, wer anfängt. Das goldene Namensschild verschwindet darin, die dunkle Schrift bleibt lesbar', code: 'App.layoutDisc · .turn-disc', sel: '.turn-disc', stage: () => h('div', { class: 'hint' }, `Durchmesser = (B + H) ÷ 2 ÷ ${TURN_DISC.phi} ÷ ${TURN_DISC.phi}`), stageCls: 'flat' },
    {
      id: '6.70',
      name: 'Rückblick auf Abwürfe',
      where: 'Lange auf die Ablage drücken: Tisch abgedunkelt, Karten mit Namensschild und gestrichelter Linie',
      code: '.peek-layer · .peek-line · .peek-item · .peek-tag · .peek-taken',
      sel: '.peek-item',
      stage: () => h('div', { class: 'peek-layer', style: { position: 'relative', width: '100%', height: 'calc(3.5 * var(--card-h))', zIndex: 'auto' } },
        h('div', { class: 'peek-banner', style: { top: 'var(--gap-row)' } }, t('peek.title')),
        h('div', { class: 'peek-line', style: { left: 'calc(2.5 * var(--card-w))', top: 'calc(0.5 * var(--card-h))', width: 'var(--card-w)', transform: 'rotate(0.6rad)' } }),
        h('div', { class: 'peek-item', style: { left: 'var(--gap-group)', top: 'calc(1.2 * var(--card-h))' } }, c(card('H', 9, -701)), h('div', { class: 'peek-tag' }, 'Emil')),
        h('div', { class: 'peek-item taken', style: { left: 'calc(2 * var(--card-w))', top: 'calc(1.2 * var(--card-h))' } }, c(card('D', 3, -702)), h('div', { class: 'peek-tag' }, 'Zhao', h('div', { class: 'peek-taken' }, t('peek.taken', { name: 'Neo' })))),
      ),
      stageCls: 'flat',
    },
    { id: '6.80', name: 'Fliegende Karte', where: 'Alle Kartenbewegungen: Ziehen, Abwerfen, Auslegen, Austeilen', code: '.card.fly · anim.ts', stage: () => h('div', { class: 'hint' }, `Kopie der Karte, die in ${MOTION.fly} ms (auch beim Austeilen) vom alten zum neuen Platz fliegt, Kurve ${EASE_FLY}. Ebene 3.122.`), stageCls: 'flat' },
  ];

  // ----- 7 Fenster
  const dlg = (...children: Child[]): HTMLElement => h('div', { class: 'panel dialog', style: { width: 'var(--w-dialog)', maxWidth: '100%' } }, ...children);
  // Standard sind vier Spieler: Spalten in Spielreihenfolge ab dem Startspieler der ersten Runde (App.renderRoundsTable)
  const players4 = ['Emil', 'Tobi', 'Zhao', 'Neo'];
  const roundPoints = [
    [14, 100, 28, 100],
    [48, 0, 200, 36],
    [16, 2, 100, 4],
    [0, 25, 12, 60],
  ];
  /** 7 Runden festgelegt, 4 gespielt: die übrigen Zeilen bleiben leer. Eigener Name statt „Du“, wie überall. */
  const roundsDemo = (): HTMLElement =>
    roundsTable(
      players4,
      roundPoints.map((points) => ({ points, winner: points.indexOf(Math.min(...points)) })),
      7,
    );
  /** Zeile der Auswertung; `rest`: offene Restkarten (opened) oder verdeckte (closed). */
  const h2row = (winner: boolean, name: string, mode: string, rest: 'opened' | 'closed' | null, base: string, factor: string, total: string, sum: string): HTMLElement =>
    h(
      'tr',
      { class: winner ? 'winner' : '' },
      h('td', null, name, h('div', { class: 'factors' }, t(`mode.${mode}`)), rest === 'opened' ? h('div', { class: 'rest' }, c(card('D', 3, -901), { mini: true }), c(card('S', 7, -902), { mini: true })) : rest === 'closed' ? h('div', { class: 'rest backs' }, ...[1, 2, 3].map((n) => c('back', { mini: true, cls: `r${n}` }))) : null),
      h('td', { class: 'num' }, base, factor ? h('div', { class: 'factors' }, factor) : null),
      h('td', { class: 'num' }, total),
      h('td', { class: 'num' }, sum),
    );
  const windowsRaw: Spec[] = [
    { id: '7.01', name: 'Fenster (Grundform)', where: 'Alle Fenster: Titel, Inhalt, Knöpfe auf Abdunkelung; max. 230 u breit', code: 'windowEl(children, onBackdrop?)', sel: '.overlay > .dialog', stage: () => dlg(h('h2', null, t('pause.title')), h('p', null, t('pause.text')), btn(t('pause.resume'), undefined, { variant: 'primary' })), stageCls: 'flat', live: 'box', liveSel: '.dialog' },
    { id: '7.02', name: 'Dialog: Entscheidung, Gefahr, Eingabe, Information', where: 'Cheft ansagen: Abbrechen | Aktion (primär)', code: 'askDialog({ buttons: [Abbrechen, Aktion] })', stage: () => dlg(h('h2', null, t('confirm.cheft.title')), h('p', null, t('confirm.cheft')), h('div', { class: 'btn-row' }, btn(t('btn.cancel')), btn(t('btn.cheftConfirm'), undefined, { variant: 'primary' }))), stageCls: 'flat' },
    { id: '7.03', name: 'Entscheidung mit Gefahr', where: 'Spiel abbrechen, Raum verlassen: Aktion rot', code: "askDialog({ buttons: [… { danger: true }] })", stage: () => dlg(h('h2', null, t('confirm.quit.title')), h('p', null, t('confirm.quit')), h('div', { class: 'btn-row' }, btn(t('btn.cancel')), btn(t('btn.quit'), undefined, { variant: 'danger' }))), stageCls: 'flat' },
    { id: '7.04', name: 'Eingabe', where: 'Spielstand-Code einfügen', code: 'askDialog({ input })', stage: () => dlg(h('h2', null, t('btn.importSave')), h('p', null, t('save.prompt')), h('textarea', { class: 'text', rows: '3', placeholder: '…' }), h('div', { class: 'btn-row' }, btn(t('btn.cancel')), btn(t('btn.load'), undefined, { variant: 'primary' }))), stageCls: 'flat' },
    { id: '7.05', name: 'Information', where: 'Code zum Kopieren, wenn die Zwischenablage nicht geht', code: 'askDialog({ back: true })', stage: () => dlg(h('h2', null, t('lobby.copy')), h('textarea', { class: 'text', rows: '2', readonly: 'readonly' }, 'https://cheft.beigi.eu/232'), backBtn(() => undefined)), stageCls: 'flat' },
    { id: '7.06', name: 'Einstellungen', where: 'Menü (Zahnrad im Spiel): Vibration, Sounds, Bildschirm, Karte ziehen, Kartenrückseite. Im Spiel stehen oben zuerst die Spiel-Knöpfe (Pause, Spielstand, Speichern, Abbrechen), dann die allgemeinen Einstellungen. Immer gleich breit (230 u)', code: 'App.renderSettings()', stage: () => dlg(h('h2', null, t('btn.settings')), h('div', { class: 'menu-group' }, btn(t('btn.exportSave')), btn(t('btn.saveQuit')), btn(t('btn.quit'), undefined, { variant: 'danger' })), h('div', { class: 'menu-group' }, choiceDemo()), backBtn(() => undefined)), stageCls: 'flat' },
    { id: '7.07', name: 'Punkteübersicht', where: 'Punkte-Piktogramm in der Kopfzeile; am Spielende in der Auswertung. Vier Spieler, alle Spalten gleich breit, Reihenfolge ab dem Startspieler der ersten Runde in Spielreihenfolge; keine Rundenbeschriftung, eine Zeile je festgelegter Runde (nicht gespielte bleiben leer, ist die Liste voll, ist das Spiel vorbei); immer der eigene Spielername statt „Du“', code: 'App.renderRoundsTable() · table.scores.rounds', sel: 'table.rounds', stage: () => dlg(roundsDemo(), backBtn(() => undefined)), stageCls: 'flat' },
    {
      id: '7.08',
      name: 'Auswahl der Kombination',
      where: 'Wenn Karten sich verschieden auslegen lassen (hier: ♥5 ♦5 ♣5 ♠5 ♥6 ♥7 Joker: alle fünf erlaubten Möglichkeiten, der Joker als ♥8, ♥5, ♥4 oder im Satz; 41 bis 37 Augen). Es werden immer ALLE möglichen Aufteilungen angeboten, auch mit weniger Augen, damit man taktisch wählen kann; auch Joker-Ende',
      code: '.choose-option · App.renderChooser()',
      sel: '.choose-option',
      stage: () => {
        const k = (suit: Card['suit'], rank: number, id: number) => c(card(suit, rank, id), { mini: true });
        const option = (meldCards: Child[][], augen: number) => h('div', { class: 'choose-option' }, h('div', { class: 'choose-melds' }, ...meldCards.map((m) => h('div', { class: 'choose-meld' }, ...m))), hint(t('choose.augen', { n: augen })));
        const jk = () => c(jack, { mini: true });
        return dlg(
          h('h2', null, t('choose.title')),
          hint(t('choose.hint')),
          option([[k('H', 5, -811), k('H', 6, -812), k('H', 7, -813), jk()], [k('C', 5, -814), k('D', 5, -815), k('S', 5, -816)]], 41),
          option([[k('H', 6, -821), k('H', 7, -822), jk()], [k('H', 5, -823), k('C', 5, -824), k('D', 5, -825), k('S', 5, -826)]], 41),
          option([[jk(), k('H', 6, -831), k('H', 7, -832)], [k('H', 5, -833), k('C', 5, -834), k('D', 5, -835), k('S', 5, -836)]], 38),
          option([[k('H', 5, -841), k('H', 6, -842), k('H', 7, -843)], [k('C', 5, -844), k('D', 5, -845), jk(), k('S', 5, -846)]], 38),
          option([[jk(), k('H', 5, -851), k('H', 6, -852), k('H', 7, -853)], [k('C', 5, -854), k('D', 5, -855), k('S', 5, -856)]], 37),
          btn(t('btn.cancel')),
        );
      },
      stageCls: 'flat',
    },
    { id: '7.09', name: 'Pause', where: 'Online: Spiel angehalten (keine „Zurück“-Möglichkeit, nur Weiter; der Spielleiter hat zusätzlich „Für alle fortsetzen“)', code: 'App.renderPause()', stage: () => dlg(h('h2', null, t('pause.title')), h('p', null, t('pause.waiting', { names: 'Emil' })), btn(t('pause.resumeAll'), undefined, { variant: 'primary' }), btn(t('pause.resume')), hint(t('wait.others', { names: 'Zhao' }), true)), stageCls: 'flat' },
    {
      id: '7.10',
      name: 'Rundenende (Auswertung)',
      where: 'Nach jeder Runde; am Spielende zusätzlich Punkteverlauf und Rollen der Bots',
      code: 'App.renderRoundEnd() · table.scores',
      sel: 'table.scores:not(.rounds)',
      stage: () => dlg(h('h2', null, t('roundEnd.title', { n: 2 })), h('p', null, t('roundEnd.winner', { name: 'Emil' })), h('p', { class: 'accent' }, t('roundEnd.hand')),
        h('table', { class: 'scores' }, h('thead', null, h('tr', null, h('th', null, t('roundEnd.rest')), h('th', { class: 'num' }, t('score.base')), h('th', { class: 'num' }, t('score.total')), h('th', { class: 'num' }, t('score.sum')))),
          h('tbody', null,
            h2row(true, 'Emil', 'romme', null, '0', t('factor.hand'), '0', '14'),
            h2row(false, 'Neo', 'romme', 'opened', '36', '', '36', '136'),
            h2row(false, 'Tobi', 'cheft', 'closed', '100', t('factor.cheftLost'), '200', '302'),
            h2row(false, 'Zhao', 'romme', 'closed', '100', '', '100', '228'))),
        h('div', { class: 'btn-row' }, btn(t('btn.peekTable')), btn(t('btn.nextRound'), undefined, { variant: 'primary' }))),
      stageCls: 'flat',
    },
    { id: '7.11', name: 'Fußleiste nach der Runde', where: 'Tisch ansehen: unten fest, Auswertung | Nächste Runde', code: '.footbar.endbar', sel: '.endbar', stage: () => h('div', { class: 'footbar', style: { width: '100%' } }, btn(t('btn.showResult')), btn(t('btn.nextRound'), undefined, { variant: 'primary' })), stageCls: 'flat', live: 'box', liveSel: '.footbar' },
    {
      id: '7.12',
      name: 'Spielende',
      where: 'Nach der letzten Runde: Sieger, Auswertung mit Rollen der Bots (Stufe · Spielweise, orange), Punkteverlauf',
      code: 'App.renderRoundEnd() · .factors.accent · table.rounds',
      stage: () => dlg(h('h2', null, t('gameEnd.title')), h('p', null, t('gameEnd.winner', { name: 'Emil', n: 38 })),
        h('table', { class: 'scores' }, h('thead', null, h('tr', null, h('th', null, t('roundEnd.rest')), h('th', { class: 'num' }, t('score.base')), h('th', { class: 'num' }, t('score.total')), h('th', { class: 'num' }, t('score.sum')))), h('tbody', null, ...(['Emil', 'Neo', 'Zhao', 'Tobi'] as const).map((n, i) => { const r = h2row(i === 0, n, n === 'Tobi' ? 'cheft' : 'romme', null, ['0', '36', '100', '100'][i], '', ['0', '36', '100', '100'][i], ['38', '64', '228', '302'][i]); r.firstElementChild!.append(h('div', { class: 'factors accent' }, n === 'Tobi' ? '' : `${t(['level.hard', 'level.easy', 'level.master'][i % 3])} · ${t(['style.early', 'style.balanced', 'style.gambler'][i % 3])}`)); return r; }))),
        h('div', null, h('h3', null, t('gameEnd.rounds')), roundsDemo()),
        btn(t('btn.endGame'), undefined, { variant: 'primary' })),
      stageCls: 'flat',
    },
    { id: '7.20', name: 'Toast', where: 'Kurze Rückmeldung (Kopiert, Geladen), steht 3,2 s', code: 'toastEl(msg) · showToast()', stage: () => staticToast(t('save.copied')), stageCls: 'flat', live: 'both', liveSel: '.toast' },
    { id: '7.21', name: 'Toast Fehler', where: 'Unerlaubte Aktion, Verbindungsfehler: rot', code: 'toastEl(msg, true)', stage: () => staticToast(t('err.cannotAdd'), true), stageCls: 'flat', live: 'both', liveSel: '.toast' },
    { id: '7.30', name: 'Abdunkelung', where: 'Hinter jedem Fenster; ein Tipp daneben = „Zurück“, aber nur bei Fenstern, die nur anzeigen', code: '.overlay', stage: () => h('div', { class: 'overlay', style: { position: 'relative', width: '100%', height: 'calc(2 * var(--size-btn-icon))', inset: 'auto', padding: 0, zIndex: 'auto' } }, hint('Abdunkelung 1.18')), stageCls: 'flat', live: 'box', liveSel: '.overlay' },
  ];
  const windows = mergeSpecs(windowsRaw, ['7.01', '7.09'], ['7.02', '7.03', '7.04', '7.05'], ['7.10', '7.12'], ['7.20', '7.21']);

  // ----- 8 Seiten
  const anatomy = (rows: [string, string][]): (() => HTMLElement) => () => table(['Nr.', 'Element'], rows.map(([id, text]) => [idChip(id), text]));
  const viewDemo: Spec = {
    id: '8.10',
    name: 'Ganzseitige Ansicht',
    where: 'Regeln und Familienalbum: Titelleiste (oben), scrollender Inhalt, Fußleiste mit „Zurück“ (unten)',
    code: 'viewEl(title, body, onBack)',
    sel: '.viewbar, .footbar:not(.endbar)',
    stage: () => h('div', { style: { height: 'calc(5 * var(--size-btn-icon))', width: '100%', display: 'flex', flexDirection: 'column' } }, viewEl(t('btn.rules'), [h('p', null, 'Inhalt …')], () => undefined, 'reading')),
    stageCls: 'flat',
  };
  const lobbyRow: Spec = {
    id: '8.20',
    name: 'Lobby-Sitzreihe',
    where: 'Lobby: eine Reihe je Spieler; der Gastgeber kann sortieren (Griff), entfernen und Bots einstellen',
    code: '.lobby-seat',
    sel: '.lobby-seat',
    stage: () =>
      h(
        'div',
        { class: 'seat-list', style: { width: '100%' } },
        h(
          'div',
          { class: 'lobby-seat' },
          h('div', { class: 'row spread' }, h('span', { class: 'row' }, h('span', { class: 'handle' }), h('span', null, 'Emil'), badge(t('lobby.host')), badge('Bot')), iconBtn(pixelIcon(ICONS[3].rows), t('lobby.remove'))),
          h('div', { class: 'bot-pick' }, h('div', { class: 'bot-col' }, hint(t('setup.level')), btn(t('level.normal'), undefined, { variant: 'primary' })), h('div', { class: 'bot-col' }, hint(t('setup.style')), btn(t('setup.random')))),
        ),
      ),
    stageCls: 'flat',
    live: 'box',
    liveSel: '.lobby-seat',
  };
  const pages: Group[] = [
    { title: '8.01 Menü', node: anatomy([['5.30', 'Logo'], ['4.02', 'Weiterspielen (nur mit Spielstand, primär)'], ['4.01/4.02', 'Neues Spiel (primär, wenn nichts zum Weiterspielen)'], ['4.01', 'Spielstand-Code einfügen'], ['4.01', 'Mit Freunden spielen'], ['4.02', 'Zurück in den Raum (nur wenn ein Raum gespeichert ist)'], ['4.01', 'Regeln'], ['4.01', 'Familienalbum'], ['4.01', 'Einstellungen (Fenster 7.06)']]) },
    { title: '8.02 Neues Spiel', node: anatomy([['2.31', 'Titel'], ['4.13', 'Name'], ['4.11', 'Bots (2 | 3)'], ['4.12', 'Je Bot: Stufe | Spielweise'], ['4.01', 'Alle zufällig'], ['4.11', 'Sitzplätze, Bot-Tempo, Rauskommen im ersten Zug, Karten beim Austeilen, Rückblick, Runden'], ['2.37', 'Spielrichtung-Hinweis'], ['4.02', 'Spiel starten'], ['4.06', 'Zurück']]) },
    { title: '8.03 Mit Freunden spielen', node: anatomy([['2.31', 'Titel'], ['4.13', 'Name'], ['4.02', 'Raum eröffnen'], ['4.15', 'Raumcode + Beitreten (4.01)'], ['4.17', 'Server-Adresse (aufklappbar)'], ['4.06', 'Zurück']]) },
    { title: '8.04 Beitreten (Spiel läuft)', node: anatomy([['2.31', 'Titel'], ['2.37', 'Hinweis'], ['4.01', 'Ein Knopf je übernehmbarem Platz'], ['4.06', 'Zurück']]) },
    { title: '8.05 Lobby', node: anatomy([['2.31', 'Titel (Raumcode)'], ['4.01', 'Link / Raumcode kopieren'], ['4.19', 'Sitzreihen mit Griff, Name (4.14), Chips (4.20), Entfernen (4.07), Bot-Auswahl (4.12)'], ['4.01', 'Bot hinzufügen'], ['4.11', 'Einstellungen (Gastgeber) oder 4.18 (Mitspieler)'], ['2.37', 'Spielrichtung-Hinweis'], ['4.02', 'Spiel starten'], ['4.04', 'Raum verlassen']]) },
    { title: '8.06 Regeln', node: anatomy([['8.10', 'Ganzseitige Ansicht'], ['2.32', 'Zwischenüberschriften'], ['2.35', 'Listen'], ['4.06', 'Zurück (zum Menü oder ins Spiel)']]) },
    { title: '8.07 Familienalbum', node: anatomy([['8.10', 'Ganzseitige Ansicht'], ['4.01', 'Kapitel-Knöpfe (zentriert)'], ['2.32', 'Marke / Tisch (Überschriften) und Kapitel mit Nummernbereich'], ['4.06', 'Zurück zum Menü']]) },
  ];

  // ----- 9 Sound
  const vibFor = (use: string) => VIBRATION_CATALOG.find((v) => v.use === use);
  const pattern = (v: (typeof VIBRATION_CATALOG)[number]) => (Array.isArray(v.pattern) ? v.pattern.join(' · ') : String(v.pattern));
  const vibOnly = VIBRATION_CATALOG.filter((v) => !SOUND_CATALOG.some((s) => s.use === v.use));
  const soundTable = (): HTMLElement =>
    table(
      ['Nr.', 'Ton', 'Probe', 'Rezept'],
      [
        ...SOUND_CATALOG.map((s) => {
          const v = vibFor(s.use);
          return [idChip(s.id), sub(s.label, s.use), h('div', { class: 'row' }, btn('Anhören', () => preview(s.name)), v ? btn('Fühlen', () => vibrate(v.pattern, true)) : null), sub(s.recipe, v ? `Vibration (ms): ${pattern(v)}` : '')];
        }),
        ...vibOnly.map((v) => [idChip(v.id), sub(`Vibration ${v.label}`, v.use), btn('Fühlen', () => vibrate(v.pattern, true)), `Muster (ms): ${pattern(v)}`]),
        [idChip('9.30'), 'Gesamtlautstärke', '', '4,5 mit Kompressor (Schwelle −16 dB) gegen Übersteuern (sound.ts › MASTER_GAIN)'],
      ],
    );
  const soundIds = [...SOUND_CATALOG.map((x) => x.id), ...vibOnly.map((x) => x.id), '9.30'];

  // ----- 10 Navigation
  const navTable: Group = {
    title: 'Ebenen und ihre Rückwege (10.01)',
    note: 'Zurück beendet die oberste offene Ebene und führt zur vorherigen. Der Knopf „Zurück“, ein Tipp neben ein Fenster (nur Anzeige-Fenster) und die Esc-Taste rufen dieselbe Methode auf: App.back().',
    node: () =>
      table(
        ['Ebene', 'Verlassen mit', 'Landet bei'],
        [
          ['Einstellungen (Fenster)', 'Zurück · daneben tippen · Esc', 'Menü oder Spiel'],
          ['Punkteübersicht (Fenster)', 'Zurück · daneben tippen · Esc', 'Spiel'],
          ['Information (Fenster)', 'Zurück · daneben tippen · Esc', 'Ebene darunter'],
          ['Entscheidung (Fenster)', 'Abbrechen · Esc (nie daneben tippen)', 'Ebene darunter, ohne Aktion'],
          ['Auswahl „Wie auslegen?“', 'Abbrechen · Esc', 'Spiel'],
          ['Regeln', 'Zurück · Esc', 'Menü oder Spiel (woher man kam)'],
          ['Familienalbum', 'Zurück · Esc', 'Menü'],
          ['Neues Spiel', 'Zurück · Esc', 'Menü'],
          ['Mit Freunden spielen', 'Zurück · Esc', 'Menü'],
          ['Beitreten (Spiel läuft)', 'Zurück · Esc', 'Mit Freunden spielen'],
          ['Verbinden über Link', 'Abbrechen', 'Menü'],
          ['Lobby / laufendes Spiel', 'kein Zurück: „Raum verlassen“ oder „Spiel abbrechen“ (mit Rückfrage)', 'Menü'],
          ['Pause, Rundenende', 'kein Zurück: nur Weiter bzw. Nächste Runde', '–'],
        ],
      ),
  };
  const labelTable: Group = {
    title: 'Beschriftungen der Buttons (10.02)',
    note: 'Dieselbe Handlung heißt überall gleich. „Zurück“ verlässt etwas, „Abbrechen“ verwirft eine offene Entscheidung, die Aktion hat ihren eigenen Namen.',
    node: () =>
      table(
        ['Text', 'Variante', 'Wo'],
        [
          ['Zurück', '4.06', 'Seiten und Fenster (siehe 10.01)'],
          ['Abbrechen', '4.01', 'Entscheidungen, Auswahl, Verbinden über Link'],
          ['Weiterspielen · Neues Spiel · Spiel starten', '4.02', 'Hauptaktion einer Seite'],
          ['Spielstand-Code einfügen · Laden', '4.01 · 4.02', 'Menü, Eingabe-Dialog'],
          ['Mit Freunden spielen · Raum eröffnen · Beitreten', '4.01 · 4.02 · 4.01', 'Menü, Online'],
          ['Zurück in den Raum', '4.02', 'Menü, Spielende online'],
          ['Regeln · Familienalbum · Einstellungen', '4.01', 'Menü'],
          ['Alle zufällig · Bot hinzufügen · Link kopieren', '4.01', 'Neues Spiel, Lobby'],
          ['Auslegen · Anlegen · Abwerfen', '4.02 · 4.01 · 4.01', 'Aktionsleiste'],
          ['Cheft!', '4.03', 'Aktionsleiste'],
          ['Cheft ansagen', '4.02', 'Entscheidung 7.02'],
          ['Bereit', '4.02', 'Aktionsleiste 6.62'],
          ['Tisch ansehen · Auswertung · Nächste Runde · Spiel beenden', '4.01 · 4.01 · 4.02 · 4.02', 'Rundenende 7.10, Fußleiste 7.11'],
          ['Pause · Weiter · Trotzdem weiter', '4.01 · 4.02 · 4.02', 'Einstellungen, Pause-Fenster 7.09'],
          ['Spielstand-Code kopieren · Speichern & zum Menü', '4.01', 'Einstellungen im Spiel'],
          ['Spiel abbrechen · Raum verlassen', '4.04', 'Einstellungen im Spiel, Lobby'],
          ['an/aus · normal/schnell u. a.', '4.01 / 4.02', 'Auswahlzeilen 4.11'],
        ],
      ),
  };

  // ----- Aufbau
  const atlasSpec: Spec = {
    id: '5.27',
    name: 'Atlas (alle Zellen)',
    where: 'Alle Karten stecken in einem Bild, das beim Start gezeichnet wird (Canvas, keine Bilddatei)',
    code: 'sprites.ts › buildAtlas()',
    stage: () => {
      const img = h('img', { src: env.atlasUrl, alt: 'Atlas' }) as HTMLImageElement;
      img.style.cssText = 'image-rendering:pixelated;width:calc(var(--px-atlas-w) * var(--s) * 0.75);height:auto;display:block';
      return img;
    },
    stageCls: 'flat',
    facts: [['Zellen', `H: 0–12 · D: 13–25 · C: 26–38 · S: 39–51 · Joker: 52 · Rücken A: 53 · Platzhalter: 54 · Rücken B: 55 · Bildkarten Deck 2: ${FACE2_CELL}–${ATLAS_CELLS - 1} (H, D, C, S je Bube, Dame, König)`]],
  };
  const masterGroup: Group = {
    title: 'Master-Stile',
    note: 'Elemente, die im Spiel denselben Stil teilen, stehen in styles.css in einer gemeinsamen Regel und lesen ihre Werte aus denselben Variablen. Ein Wert ändert alle Stellen; die Varianten setzen nur, was sie anders machen.',
    node: () =>
      table(
        ['Master', 'Parameter', 'Wirkt auf'],
        [
          ['Rahmen', h('span', null, idChip('3.51'), ' ', idChip('3.53'), ' ', idChip('3.59'), ' ', idChip('3.60')), 'Panels, Buttons, Felder, Leisten, Chips, Tabellenlinien, Ablageziele'],
          ['Bedienelement', h('span', null, idChip('3.30'), ' ', idChip('3.28'), ' ', idChip('3.33'), ' ', idChip('3.54')), 'Buttons und Eingabefelder: Schrift, Rahmen, Ecken, Innenrand oben/unten gemeinsam; links/rechts Button 3.28, Feld 3.33'],
          ['Chip', h('span', null, idChip('3.38'), ' ', idChip('2.22'), ' --chip-bg · --chip-fg · --chip-line'), 'Rommé/Cheft (4.20), Nummern im Album, Namensschild im Rückblick, Zahl beim Ziehen (5.18), Nummern-Anzeige. Standard Gold, Varianten setzen nur Farben und Größe'],
          ['Knopfgruppe', h('span', null, idChip('3.23'), ' ', idChip('3.24'), ' --bgap'), 'Button-Reihe (4.09), Fußleiste, Aktionsleiste (3.24)'],
          ['Stapel', idChip('3.21'), 'Menü-Panel und -Gruppen, Fenster, Einleitung des Albums, Werkstatt'],
          ['Panel', h('span', null, idChip('3.28'), ' ', idChip('3.56'), ' ', idChip('1.53')), 'Panels, Dialoge, Toast (nur oben/unten enger)'],
          ['Tabelle', h('span', null, idChip('3.59'), ' ', idChip('1.44')), 'Auswertung und Familienalbum teilen Linien, Innenrand, Kopf und Zahlenspalte; die Schriftgröße setzt die Tabelle selbst'],
          ['Kleiner Text', h('span', null, idChip('2.15'), ' ', idChip('2.16'), ' ', idChip('1.43')), 'Hinweis (Beschriftungen, Sitz, Familienalbum) und Mikro (Pile-Beschriftung, Faktoren, Titel der Startkarten)'],
        ],
      ),
  };
  const scaleGroup: Group = {
          title: 'Maßstab (3.01) und Umschaltpunkte (3.05–3.06)',
          node: tokenTable(
            ['Nr.', 'Maßstab', '--s / --so'],
            () => [
              ...SCALE_TOKENS.rules.map((r) => [idChip(SCALE_TOKENS.id), sub(r.name, r.media ?? 'Standard'), `${r.s} / ${r.so}`]),
              ...BREAKPOINT_TOKENS.map((b) => [idChip(b.id), sub(b.name, b.use), b.value]),
              ['', sub('Jetzt aktiv', '--s: Handkarten und alle Abstände · --so: Startwert der Auslagen, am Tisch je Platz kleiner (6.18)'), `${rootScale()} / ${cssVar('--so')}`],
            ],
            [2],
          ),
        };
  const werkGroups: Group[] = [
    masterGroup,
    scaleGroup,
    spacingScaleGroup,
    spacingRoleGroup,
    borderGroup,
    effectGroup,
    sizeTable,
    { title: 'Ebenen, z-index (3.121–3.127)', node: tokenTable(['Nr.', 'Name', 'Wert'], () => Z_TOKENS.map((x) => [idChip(x.id), sub(x.name, `${x.css} · ${x.use}`), x.value]), [2]) },
    { title: 'Zeiten in Millisekunden (3.131–3.145)', node: tokenTable(['Nr.', 'Name', 'Wert'], () => [...MOTION_TOKENS.map((m) => [idChip(m.id), sub(m.name, m.use), `${MOTION[m.key]} ms`]), [idChip('3.143'), sub('Kurve', 'Alle Kartenflüge und der Rückblick'), EASE_FLY], [idChip('3.144'), sub('Rückblick: Startgröße', 'Karten wachsen beim Einblenden'), String(PEEK_FROM_SCALE)], [idChip('3.145'), sub('Kreis des aktiven Spielers', 'Durchmesser = (Breite + Höhe des Spielfelds) ÷ 2 ÷ φ ÷ φ'), `φ = ${TURN_DISC.phi}`]], [2]) },
    { title: 'Hand-Raster (3.151–3.154)', node: tokenTable(['Nr.', 'Name', 'Wert'], () => HAND_TOKENS.map((x) => [idChip(x.id), sub(x.name, `${x.css} · ${x.use}`), `${HAND[x.key]} u`]), [2]) },
    ...usageGroup,
    { title: 'Kartenatlas (5.27)', specs: [atlasSpec] },
  ];
  return [
    // ---------------- Marke
    {
      key: 'familien',
      tier: 'marke',
      title: 'Familien',
      ids: '5.50–5.53',
      intro: 'Jede Figur gibt es in zwei Personen: Deck 1 links, Deck 2 rechts (die Zahlen vor den Beschreibungen).',
      groups: [{ title: '', node: familiesNode, ids: ['5.50', '5.51', '5.52', '5.53'], bare: true }],
    },
    {
      key: 'rueckseiten',
      tier: 'marke',
      title: 'Rückseiten',
      ids: '5.61–5.83, 4.22',
      intro: 'Alle 23 Designs, jeweils Deck 1 (orange) und Deck 2 (dunkel). Jeder Spieler wählt seine Rückseite in den Einstellungen; sie wirkt nur auf dem eigenen Bildschirm.',
      groups: [
        { title: '', node: backGallery, ids: backIds, bare: true },
        { title: 'In den Einstellungen', specs: inputSpecs.filter((x) => x.id === '4.22') },
        { title: 'Technik', node: () => h('div', { class: 'hint' }, 'Das Feld liegt im Rahmen, 26 × 38 Pixel. Rahmen, weiße Kontur und abgerundete Ecken sind für alle Designs gleich. Deck 1 hat Orange als Hauptfarbe, Deck 2 Dunkelgrau (1.25). Neues Design: Eintrag in backs.ts › BACK_DESIGNS ergänzen, die Reihenfolge ergibt sich aus BACK_ORDER.') },
      ],
    },
    {
      key: 'blatt',
      tier: 'marke',
      title: 'Das Blatt',
      ids: '5.02, 5.10–5.19, 5.24',
      intro: 'Alle Karten gibt es zweimal (zwei Blätter, 104 Karten), dazu 2 Joker. Die Bildkarten stehen bei den Familien.',
      groups: [
        { title: 'Zahlenkarten und Joker', specs: [numberCards, ...cardArt.filter((x) => x.id === '5.24')] },
        { title: 'Das ganze Blatt', node: fullDeck, bare: true },
        { title: 'Größen', specs: [sizes] },
        { title: 'Kartenzustände', specs: cardStates },
      ],
    },
    {
      key: 'farben',
      tier: 'marke',
      title: 'Farben',
      ids: '1.01–1.19, 1.25, 1.42–1.75',
      intro: 'Die Palette sind die echten Farbwerte. Unter jeder Farbe stehen die Rollen, die sie im Layout übernimmt. Das Layout benutzt nur Rollen: eine Rolle auf eine andere Farbe zeigen zu lassen ändert alle Stellen im Spiel. Die Farben der Figuren (1.20–1.33) stehen bei den Familien. Quelle: tokens.ts.',
      groups: paletteGroups,
    },
    {
      key: 'schrift',
      tier: 'marke',
      title: 'Schrift und Pixel',
      ids: '2.xx, 5.21–5.22, 5.30–5.33, 5.41–5.47',
      intro: 'Zwei Schriften: VT323 für Text, Tiny5 Duo Bold (700) für Überschriften. Die Spezifikation unter jedem Muster ist live aus dem Element gelesen, nicht abgeschrieben.',
      groups: [
        { title: 'Schriftarten', specs: fontSpecs },
        { title: 'Schriftschnitte', specs: weightSpecs },
        { title: 'Schriftgrößen', specs: sizeSpecs },
            { title: 'Zeilenhöhe und Laufweite (2.21–2.24)', node: tokenTable(['Nr.', 'Name', 'Wert'], () => TYPE_MISC_TOKENS.map((x) => [idChip(x.id), sub(x.name, `${x.css} · ${x.use}`), x.value]), [2]) },
        { title: 'Textstile: Überschriften, Texte, Hinweise (2.30–2.54)', specs: typeRoles },
        { title: 'Ziffern und Symbole der Karten', specs: cardArt.filter((x) => x.id === '5.21' || x.id === '5.22') },
        { title: 'Piktogramme', node: iconSheet, ids: ICONS.map((x) => x.id) },
        { title: 'Logo, App-Icon, Hintergrund', specs: brand },
      ],
    },
    {
      key: 'klang',
      tier: 'marke',
      title: 'Klang und Haptik',
      ids: '9.xx',
      intro: 'Alle Töne entstehen live per WebAudio (keine Dateien). Anhören geht auch bei ausgeschalteten Sounds. Vibration geht nur auf Geräten, die sie können. Alle Muster stehen in sound.ts › VIB.',
      groups: [{ title: 'Töne und Vibration', node: soundTable, ids: soundIds }],
    },
    // ---------------- Tisch
    {
      key: 'spielfeld',
      tier: 'tisch',
      title: 'Spielfeld',
      ids: '6.xx',
      intro: 'Jeder Sitz hat eine Achse, auf der sein Paket aus Beschriftung und Auslage mittig liegt (6.10). Die Kartengrößen am Tisch richten sich nach dem Platz (6.18).',
      groups: [{ title: 'Spielfeld-Elemente', specs: field }],
    },
    {
      key: 'bausteine',
      tier: 'tisch',
      title: 'Bausteine',
      ids: '4.xx',
      intro: 'Jeder Button kommt aus btn() in components.ts; die Variante bestimmt die Farbe, der Zustand (deaktiviert, gedrückt) ist für alle gleich.',
      groups: [
        { title: 'Buttons', specs: btnSpecs },
        { title: 'Auswahl, Eingabe, Chips', specs: inputSpecs.filter((x) => x.id !== '4.22') },
      ],
    },
    {
      key: 'fenster',
      tier: 'tisch',
      title: 'Fenster und Meldungen',
      ids: '7.xx',
      intro: 'Alle Fenster stehen auf einer Abdunkelung (1.18). Anzeige-Fenster schließen mit „Zurück“ oder einem Tipp daneben, Entscheidungen nur über ihre Knöpfe.',
      groups: [{ title: 'Fenster, Leisten, Toast', specs: windows }],
    },
    {
      key: 'seiten',
      tier: 'tisch',
      title: 'Seiten',
      ids: '8.xx',
      intro: 'Jede Seite als Liste ihrer Elemente von oben nach unten, mit den Nummern der Bausteine.',
      groups: [{ title: 'Ganzseitige Ansicht und Lobby', specs: [viewDemo, lobbyRow] }, ...pages],
    },
    {
      key: 'verhalten',
      tier: 'tisch',
      title: 'Verhalten',
      ids: '10.xx',
      intro: 'Navigation und Beschriftungen.',
      groups: [navTable, labelTable],
    },
    // ---------------- Werkstatt
    {
      key: 'werkstatt',
      tier: 'werkstatt',
      title: 'Werkstatt',
      ids: '3.xx, 5.27',
      intro: '1 u = 1 Pixel × Maßstab. Abstände sind Stufen der Skala (3.11–3.18), Rollen (3.21–3.38) geben ihnen Bedeutung; am Ende steht, wo im Spiel welcher Abstand wirkt.',
      groups: werkGroups,
    },
  ];
}

/** Alle Etiketten-Ziele: Nummer und Selektor. */
export function labelTargets(): { id: string; sel: string; name: string }[] {
  const stub = {} as GuideEnv;
  const out: { id: string; sel: string; name: string }[] = [];
  for (const ch of chapters(stub)) for (const g of ch.groups) for (const sp of g.specs ?? []) {
    if (sp.sel) out.push({ id: sp.id, sel: sp.sel, name: sp.name });
    for (const a of sp.also ?? []) if (a.sel) out.push({ id: a.id, sel: a.sel, name: a.name });
  }
  return out;
}

/** Alle Nummern des Guides in Reihenfolge (für Tests). */
export function allSpecIds(): string[] {
  const stub = {} as GuideEnv;
  const out: string[] = [];
  for (const ch of chapters(stub)) for (const g of ch.groups) out.push(...(g.specs ?? []).flatMap((sp) => [sp.id, ...(sp.also ?? []).map((a) => a.id)]), ...(g.ids ?? []));
  return out;
}

// ---------------------------------------------------------------- Seite
const TIER_TITLES: Record<Tier, string> = { marke: 'Marke', tisch: 'Tisch', werkstatt: 'Werkstatt' };

/** Baut die Elemente einer Gruppe (Überschrift, Hinweis, Einträge). Die Messungen laufen nach dem Einfügen ins Dokument. */
function groupEls(g: Group): HTMLElement[] {
  const out: HTMLElement[] = [g.title ? h('h3', { class: 'guide-group' }, g.title) : h('span', { class: 'guide-group-none' })];
  if (g.note) out.push(hint(g.note));
  for (const sp of g.specs ?? []) out.push(specEl(sp));
  if (g.node) out.push(g.bare ? g.node() : h('div', { class: 'panel spec' }, g.node()));
  return out;
}

/** Aufklappbarer Bereich, dessen Inhalt erst beim ersten Öffnen gebaut wird (die Werkstatt hat sehr viele Einträge). */
function lazyDetails(cls: string, head: Child, build: () => HTMLElement[]): HTMLElement {
  const body = h('div', { class: 'guide-lazy' });
  const el = h('details', { class: cls }, h('summary', null, head), body);
  let built = false;
  el.addEventListener('toggle', () => {
    if ((el as HTMLDetailsElement).open && !built) {
      built = true;
      measurers = [];
      body.append(...build());
      const run = measurers;
      queueMicrotask(() => run.forEach((f) => f()));
    }
  });
  return el;
}

export function renderGuide(env: GuideEnv): HTMLElement {
  measurers = [];
  const chs = chapters(env);
  const werk = chs.find((ch) => ch.tier === 'werkstatt')!;
  const toc = h(
    'div',
    { class: 'guide-toc' },
    ...chs.map((ch) =>
      btn(ch.title, () => {
        const target = document.getElementById(`${NS}-${ch.key}`);
        if (ch.tier === 'werkstatt') (target as HTMLDetailsElement | null)?.setAttribute('open', '');
        target?.scrollIntoView({ block: 'start' });
      }),
    ),
  );
  const intro = h(
    'div',
    { class: 'panel guide-intro' },
    h('p', null, 'Cheft basiert auf den türkischen Rommé-Spielen Elli Bir und Yüzbir Okey. Der Name kommt von türkisch „Çifte“ (Paar).'),
    h('p', null, '3 bis 4 Spieler, 106 Karten (zwei Blätter plus 2 Joker).'),
    h('p', { class: 'muted' }, 'Pixel-Look angelehnt an Windows-3.1-Solitaire, Farbwelt im Cheft-Orange.'),
    h('p', { class: 'muted' }, 'Jedes Element trägt eine feste Nummer aus Kapitel und Zähler (z. B. 4.02 = Button Primär). Maße stehen in u: 1 u = 1 Pixel × Maßstab (Handy: 1 u = 2 px).'),
    toc,
  );
  const body: HTMLElement[] = [intro];
  let tier: Tier | null = null;
  for (const ch of chs) {
    if (ch.tier === 'werkstatt') continue;
    if (ch.tier !== tier) {
      tier = ch.tier;
      body.push(h('h2', { class: 'guide-tier' }, TIER_TITLES[tier]));
    }
    body.push(h('h2', { class: 'guide-chapter', id: `${NS}-${ch.key}` }, ch.title, ch.ids ? h('span', { class: 'guide-ids' }, ch.ids) : null));
    if (ch.intro) body.push(h('p', { class: 'guide-chapter-intro muted' }, ch.intro));
    for (const g of ch.groups) body.push(...groupEls(g));
  }
  // Werkstatt: eingeklappt am Ende derselben Seite, jeder Unterpunkt noch einmal
  const labelsRow = h(
    'div',
    { class: 'panel guide-labels' },
    h('div', { class: 'option' }, fieldLabel('Nummern im Spiel'), h('div', { class: 'choices' }, btn('an', () => env.setLabels(true), { variant: env.labelsOn ? 'primary' : 'default' }), btn('aus', () => env.setLabels(false), { variant: env.labelsOn ? 'default' : 'primary' }))),
    hint('Zeigt an jedem Element im Spiel einen kleinen gelben Punkt unten links (nicht in diesem Album). Antippen zeigt die Nummer und kopiert sie.'),
  );
  const werkInner = h('div', { class: 'guide-wk-body' }, labelsRow, h('p', { class: 'guide-chapter-intro muted' }, werk.intro ?? ''));
  for (const g of werk.groups) werkInner.append(lazyDetails('guide-sub', h('span', { class: 'guide-sub-title' }, g.title), () => groupEls(g).slice(1)));
  body.push(h('details', { class: 'panel guide-wk', id: `${NS}-werkstatt` }, h('summary', null, h('h2', { class: 'guide-chapter' }, 'Werkstatt', h('span', { class: 'guide-ids' }, werk.ids ?? ''))), werkInner));
  const view = viewEl(t('btn.guide'), body, env.onBack, 'reading guide');
  const run = measurers;
  queueMicrotask(() => run.forEach((f) => f()));
  return view;
}

// ---------------------------------------------------------------- Nummern im Spiel
/**
 * Kleiner gelber Punkt unten links an jedem bekannten Element. Antippen zeigt Nummer und Name und kopiert die
 * Nummer(n) in die Zwischenablage. Ein Tipp irgendwo sonst blendet die Anzeige wieder aus.
 */
export class DsLabels {
  private layer: HTMLElement | null = null;
  private raf = 0;
  private on = false;
  private targets: { id: string; sel: string; name: string }[] | null = null;
  private bound = false;
  private open: { el: Element; text: string } | null = null;

  refresh(on: boolean): void {
    this.on = on;
    this.layer?.remove();
    this.layer = null;
    if (!on) {
      this.open = null;
      return;
    }
    if (!this.bound) {
      this.bound = true;
      const again = () => {
        if (!this.on || this.raf) return;
        this.raf = requestAnimationFrame(() => {
          this.raf = 0;
          if (this.on) this.refresh(true);
        });
      };
      window.addEventListener('resize', again);
      document.addEventListener('scroll', again, true);
    }
    this.targets ??= labelTargets();
    const found = new Map<Element, { id: string; name: string }[]>();
    for (const tg of this.targets) {
      let list: NodeListOf<Element>;
      try {
        list = document.querySelectorAll(tg.sel);
      } catch {
        continue;
      }
      list.forEach((el) => {
        if (el.closest('.ds-layer, .view')) return;
        const items = found.get(el) ?? [];
        if (!items.some((i) => i.id === tg.id)) items.push({ id: tg.id, name: tg.name });
        found.set(el, items);
      });
    }
    const layer = h('div', { class: 'ds-layer' });
    document.body.appendChild(layer);
    const placed: DOMRect[] = [];
    for (const [el, items] of found) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) continue;
      const dot = h('button', { class: 'ds-dot', 'aria-label': items.map((i) => i.id).join(' · ') });
      layer.appendChild(dot);
      const size = dot.getBoundingClientRect().width;
      // Der Punkt sitzt mit seiner Mitte auf der Ecke unten links: so verdeckt er auch bei kleinen Elementen kaum etwas
      let left = Math.min(Math.max(0, r.left - size / 2), window.innerWidth - size);
      const top = Math.min(Math.max(0, r.bottom - size / 2), window.innerHeight - size);
      // Liegen zwei Punkte übereinander, rückt der spätere ein Stück nach rechts
      for (let i = 0; i < 8; i++) {
        const hit = placed.find((p) => left < p.right && left + size > p.left && top < p.bottom && top + size > p.top);
        if (!hit) break;
        left = hit.right + size / 4;
      }
      dot.style.left = `${left}px`;
      dot.style.top = `${top}px`;
      placed.push(new DOMRect(left, top, size, size));
      const text = items.map((i) => `${i.id} ${i.name}`).join('\n');
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.show(layer, dot, items.map((i) => i.id).join(' · '), text);
      });
    }
    this.layer = layer;
    if (this.open) {
      // nach einem Neuaufbau (Scrollen) offene Anzeige entfernen, damit nichts an falscher Stelle steht
      this.open = null;
    }
  }

  private show(layer: HTMLElement, dot: HTMLElement, ids: string, text: string): void {
    layer.querySelectorAll('.ds-tag').forEach((n) => n.remove());
    const tag = h('div', { class: 'ds-tag' }, ...text.split('\n').map((l) => h('div', { class: 'ds-tag-name' }, l)));
    layer.appendChild(tag);
    const d = dot.getBoundingClientRect();
    const tr = tag.getBoundingClientRect();
    tag.style.left = `${Math.min(Math.max(0, d.left), window.innerWidth - tr.width)}px`;
    tag.style.top = `${Math.max(0, d.top - tr.height - 2)}px`;
    // Zwischenablage kann verweigert werden (kein HTTPS, Berechtigung): dann zeigt die Anzeige die Nummer trotzdem
    navigator.clipboard?.writeText(ids.replace(/ · /g, ', ')).catch(() => undefined);
    const away = (e: Event) => {
      if ((e.target as Element | null)?.closest('.ds-dot')) return;
      tag.remove();
      document.removeEventListener('pointerdown', away, true);
    };
    window.setTimeout(() => document.addEventListener('pointerdown', away, true), 0);
  }
}
