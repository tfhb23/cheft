/**
 * Design Guide: zeigt jedes Element der App mit fester Nummer, echtem Aussehen (aus denselben Bausteinen und
 * Stilen wie das Spiel) und den tatsächlich berechneten Werten. Nummern stammen aus tokens.ts (Kapitel 1–3) und
 * stehen hier (Kapitel 4–11). Mit „Nummern im Spiel“ erscheinen sie als Punkte über dem laufenden Spiel.
 *
 * Neues Element aufnehmen: unten in chapters() einen Eintrag mit neuer Nummer ergänzen. Ein Test prüft, dass die Nummern
 * eindeutig sind und jeder Selektor existiert.
 */
import { Card } from '../engine/cards';
import { h, Child } from './dom';
import { t } from '../i18n';
import { backBtn, backChoiceRow, badge, btn, roundsTable, fieldLabel, hint, iconBtn, meldEl, seatLabel, toastEl, viewEl } from './components';
import { ICONS, ICON_INFO, pixelArt, pixelIcon } from './icons';
import { ATLAS_CELLS, FACE2_CELL, GLYPHS, STAR, SUIT_SHAPES, faceColors, PALETTE, backThumb } from './sprites';
import { FACE_ART } from './face-art';
import { BACK_DESIGNS } from './backs';
import { MAX_RATIO, tableLadder } from './tablescale';
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
  cardEl: (card: Card | 'back' | 'back2' | 'slot', opts?: { selected?: boolean; glow?: boolean; dim?: boolean; temp?: boolean; small?: boolean; mini?: boolean; fresh?: boolean; cls?: string; title?: string }) => HTMLElement;
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
  /** Zusätzliche feste Angaben (Zeile für Zeile: Name, Wert). */
  facts?: [string, string][];
}

interface Group {
  title: string;
  note?: string;
  specs?: Spec[];
  node?: () => HTMLElement;
}

interface Chapter {
  n: number;
  title: string;
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
  const paletteGroups: Group[] = [];
  for (const g of [...new Set(PALETTE_COLORS.map((x) => x.group))]) {
    paletteGroups.push({
      title: `Palette: ${g}`,
      node: () =>
        h(
          'div',
          { class: 'spec' },
          ...PALETTE_COLORS.filter((x) => x.group === g).map((x) => {
            const roles = ROLE_COLORS.filter((r) => r.ref === x.css).map((r) => r.id);
            return h(
              'div',
              { class: 'swatch-row' },
              swatch(x.value, true),
              h(
                'div',
                { class: 'swatch-text' },
                h('div', { class: 'spec-head' }, idChip(x.id), h('span', { class: 'spec-name' }, x.name), h('span', { class: 'muted' }, x.value)),
                h('div', { class: 'spec-where' }, `${x.css}${roles.length ? ` · Rollen: ${roles.join(', ')}` : ''}`),
                h('div', { class: 'spec-where' }, x.use),
              ),
            );
          }),
        ),
    });
  }
  const roleGroups: Group[] = [];
  for (const g of [...new Set(ROLE_COLORS.map((x) => x.group))]) {
    roleGroups.push({
      title: `Rollen: ${g}`,
      node: () =>
        h(
          'div',
          { class: 'spec' },
          ...ROLE_COLORS.filter((x) => x.group === g).map((x) => {
            const p = PALETTE_COLORS.find((pc) => pc.css === x.ref)!;
            return h(
              'div',
              { class: 'swatch-row' },
              swatch(p.value),
              h(
                'div',
                { class: 'swatch-text' },
                h('div', { class: 'spec-head' }, idChip(x.id), h('span', { class: 'spec-name' }, x.name), h('span', { class: 'muted' }, `→ ${p.id} ${p.name}`)),
                h('div', { class: 'spec-where' }, `${x.css} · ${x.use}`),
              ),
            );
          }),
        ),
    });
  }

  // ----- 2 Typografie
  const typeRoles: Spec[] = [
    { id: '2.30', name: 'Logo-Schriftzug (h1)', where: 'Menü', code: 'h1', sel: 'h1', stage: () => h('h1', null, t('app.title')), live: 'text' },
    { id: '2.31', name: 'Titel (h2)', where: 'Seiten- und Fenstertitel, immer zentriert', code: 'h2', sel: 'h2', stage: () => h('h2', null, t('btn.settings')), live: 'text' },
    { id: '2.32', name: 'Zwischenüberschrift links (h3)', where: 'Regeln, Design Guide: Abschnitte', code: '.rules h3', sel: '.rules h3', stage: () => h('div', { class: 'rules' }, h('h3', null, 'Spielablauf')), live: 'text', liveSel: 'h3' },
    { id: '2.33', name: 'Zwischenüberschrift im Fenster (h3)', where: 'Punkteverlauf (Spielende)', code: '.dialog h3', sel: '.dialog h3', stage: () => h('div', { class: 'dialog' }, h('h3', null, t('gameEnd.rounds'))), stageCls: 'flat', live: 'text', liveSel: 'h3' },
    { id: '2.34', name: 'Rückblick-Banner', where: 'Rückblick auf Abwürfe: Banner oben', code: '.peek-banner', sel: '.peek-banner', stage: () => h('div', { class: 'peek-banner', style: { position: 'static' } }, t('peek.title')), stageCls: 'dark', live: 'text' },
    { id: '2.35', name: 'Fließtext', where: 'Meldungen im Fenster, Regeln, Bestätigungen', code: 'p / body', stage: () => h('div', { class: 'panel' }, h('p', null, t('confirm.quit'))), stageCls: 'flat', live: 'text', liveSel: 'p' },
    { id: '2.36', name: 'Feldbeschriftung', where: 'Über Auswahlzeilen und Eingabefeldern', code: '.field-label', sel: '.field-label', stage: () => fieldLabel(t('setup.peek')), live: 'text' },
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
    { id: '2.49', name: 'Tabellenzeile Du', where: 'Auswertung: die eigene Zeile (orange, synthetisches Fett), damit man den eigenen Platz sofort findet', code: 'table.scores tr.me', sel: 'table.scores tr.me', stage: () => h('table', { class: 'scores' }, h('tbody', null, h('tr', { class: 'me' }, h('td', null, 'Emil')))), live: 'text', liveSel: 'td' },
    { id: '2.50', name: 'Faktoren und Zuwachs', where: 'Auswertung: „Cheft gewonnen ×2“, Punkteverlauf: „+12“', code: '.factors / .delta', sel: '.factors, .delta', stage: () => h('div', { class: 'factors' }, t('factor.cheftWon')), live: 'text' },
    { id: '2.53', name: 'Namensschild im Rückblick', where: 'Rückblick auf Abwürfe: Schild an jeder Karte', code: '.peek-tag', sel: '.peek-tag', stage: () => h('div', { class: 'peek-tag' }, 'Emil'), live: 'both' },
    { id: '2.54', name: 'Rundenzähler', where: 'Kopfzeile im Spiel', code: '.round-no', sel: '.round-no', stage: () => h('div', { class: 'topbar', style: { position: 'static' } }, h('span', { class: 'accent round-no' }, h('span', { class: 'rl' }, `${t('round.word')} `), '1/7')), live: 'text', liveSel: '.round-no' },
  ];

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
      stage: () => h('div', { class: 'space-bar', style: { width: `var(${s.css})`, height: 'var(--sp-4)' } }),
      stageCls: 'flat' as const,
      facts: [['Wert', `${s.units} u = ${s.units * rootScale()} px bei Maßstab ${rootScale()}`]],
    })),
  };
  const spacingRoleGroup: Group = {
    title: 'Abstands-Rollen (3.21–3.37)',
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
  const roleU = (css: string): number => (css.startsWith('--gap') || css.startsWith('--pad-') ? unitsOfRole(css) : (SPACING_SCALE.find((x) => x.css === css)?.units ?? SIZE_TOKENS.find((x) => x.css === css)!.units!));
  const usage: [string, Use[]][] = [
    [
      'Menü und Seiten mit Panel (Neues Spiel, Online, Beitreten, Lobby)',
      [
        { where: 'Seitenrand außen', parts: ['--pad-screen'], note: 'Rand um Logo und Panel' },
        { where: 'Logo ↔ Panel', parts: ['--gap-screen'] },
        { where: 'Logo: Karten ↔ Schriftzug', parts: ['--gap-hair', '--sp-3'], note: '1 u Logo-Abstand + 3 u unter den Karten' },
        { where: 'Logo: Schriftzug ↔ Untertitel', parts: ['--gap-hair'] },
        { where: 'Panel: Innenrand', parts: ['--pad-panel'] },
        { where: 'Knopf ↔ Knopf (untereinander)', parts: ['--gap-stack'], note: 'auch Feld ↔ Feld und Feld ↔ Knopf' },
        { where: 'Menü: Gruppe ↔ Gruppe (Weiterspielen/Neues Spiel | Online | Regeln/Guide/Einstellungen)', parts: ['--gap-stack', '--gap-group'], note: 'Stapelabstand + Gruppen-Zusatz' },
        { where: 'Über „Zurück“ (Neues Spiel, Mit Freunden, Beitreten, Einstellungen)', parts: ['--gap-stack', '--gap-group'], note: 'Wie zwischen Menü-Gruppen: „Zurück“ steht immer abgesetzt' },
        { where: 'Auswahlzeile: Beschriftung ↔ Knöpfe', parts: ['--gap-hair'] },
        { where: 'Auswahlzeile: Knopf ↔ Knopf (an/aus)', parts: ['--gap-tight'] },
        { where: 'Bot-Auswahl: Stufe ↔ Spielweise', parts: ['--gap-row'] },
        { where: 'Bot-Auswahl: Hinweis ↔ Knopf', parts: ['--gap-hair'] },
        { where: 'Feld ↔ Knopf in einer Zeile (Raumcode, Beitreten)', parts: ['--gap-row'] },
        { where: 'Einstellungen-Zusammenfassung: Zeilenabstand innen', parts: ['--sp-1'], note: 'oben/unten je 1 u, Spalten 3 u' },
      ],
    ],
    [
      'Fenster (Dialog, Einstellungen, Punkte, Auswertung, Pause, Auswahl)',
      [
        { where: 'Fenster ↔ Bildschirmrand', parts: ['--pad-overlay'] },
        { where: 'Fenster: Innenrand', parts: ['--pad-panel'] },
        { where: 'Element ↔ Element (Titel, Text, Felder, Knöpfe)', parts: ['--gap-stack'], note: 'Absätze haben im Fenster keinen eigenen Abstand mehr' },
        { where: 'Über „Zurück“', parts: ['--gap-stack', '--gap-group'] },
        { where: 'Zwei Knöpfe nebeneinander (Abbrechen | Aktion)', parts: ['--gap-row'] },
        { where: 'Wahloption in „Wie auslegen?“: Innenrand', parts: ['--sp-3'] },
        { where: 'Wahloption: Kombinationen untereinander', parts: ['--sp-3'] },
        { where: 'Tabelle: Zelle innen oben/unten', parts: ['--sp-1'], note: 'links/rechts 2 u' },
        { where: 'Restkarten in der Auswertung: Karte ↔ Karte', parts: ['--gap-hair'] },
      ],
    ],
    [
      'Ganzseitige Ansicht (Regeln, Design Guide)',
      [
        { where: 'Titelleiste: oben/unten', parts: ['--sp-3'], note: 'links/rechts 4 u' },
        { where: 'Lesespalte: Rand oben/unten', parts: ['--sp-6'] },
        { where: 'Zwischenüberschrift: darüber', parts: ['--sp-6'], note: 'darunter 2 u' },
        { where: 'Listenpunkt ↔ Listenpunkt', parts: ['--sp-2'] },
        { where: 'Fußleiste: oben/unten', parts: ['--pad-bar-y'], note: 'links/rechts 4 u; unten mindestens der Sicherheitsrand des Geräts' },
      ],
    ],
    [
      'Spielfeld',
      [
        { where: 'Kopfzeile: Rand oben/unten', parts: ['--sp-2'], note: 'links/rechts 3 u' },
        { where: 'Kopfzeile: Zähler ↔ Piktogramme', parts: ['--sp-4'] },
        { where: 'Kopfzeile: Piktogramm ↔ Piktogramm', parts: ['--gap-tight'] },
        { where: 'Tisch: Innenrand', parts: ['--sp-2'] },
        { where: 'Sitz: Beschriftung ↔ Auslage ↔ Fächer', parts: ['--gap-tight'] },
        { where: 'Eigener Sitz: Beschriftung ↔ Auslage', parts: ['--gap-hair'] },
        { where: 'Auslage: Kombination ↔ Kombination (Zeile / Spalte)', parts: ['--gap-tight', '--sp-4'], note: '2 u zwischen den Zeilen, 4 u daneben' },
        { where: 'Kombination: Innenrand', parts: ['--sp-1'] },
        { where: 'Sitz-Beschriftung: Name ↔ Chip ↔ Kartenzahl', parts: ['--sp-3'] },
        { where: 'Aktiver Sitz: Innenrand links/rechts', parts: ['--sp-3'] },
        { where: 'Tischmitte: Stapel ↔ Ablage', parts: ['--pile-gap'] },
        { where: 'Stapel/Ablage ↔ Beschriftung', parts: ['--gap-hair'] },
        { where: 'Status-Zeile: Rand oben/unten', parts: ['--sp-2'], note: 'links/rechts 5 u; Meldung ↔ Info 4 u' },
        { where: 'Handleiste: Rand oben', parts: ['--pad-bar-y'], note: 'links/rechts 4 u; unten 0, die Karten stehen an der Aktionsleiste' },
        { where: 'Hand: Zeile ↔ Zeile (zweizeilig)', parts: ['--sp-4'] },
        { where: 'Aktionsleiste: Rand oben/unten', parts: ['--pad-bar-y'], note: 'links/rechts 4 u; Knopf-Innenrand 2 u links/rechts' },
        { where: 'Aktionsleiste: Knopf ↔ Knopf', parts: ['--gap-tight'] },
        { where: 'Toast: Innenrand oben/unten', parts: ['--sp-3'], note: 'links/rechts 5 u; 90 u über dem unteren Rand' },
      ],
    ],
    [
      'Lobby',
      [
        { where: 'Sitzreihe: Innenrand oben/unten', parts: ['--sp-2'] },
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
        if (b.css === '--sh-heading') return h('h1', null, 'Cheft');
        return h('div', { style: { width: 'calc(6 * var(--size-btn-icon))', height: 'calc(2 * var(--size-btn-icon))', background: 'var(--surface-panel)', border: 'var(--bw) solid var(--line)', boxShadow: `var(${b.css})`, margin: 'var(--sp-6)' } });
      };
      return { id: b.id, name: b.name, where: b.use, code: `${b.css}: ${b.value}`, stage };
    }),
  };

  const effectGroup: Group = {
    title: 'Wirkung auf Karten (3.61–3.67)',
    node: tokenTable(['Nr.', 'Name', 'Wert'], () => EFFECT_TOKENS.map((e) => [idChip(e.id), sub(e.name, `${e.css} · ${e.use}`), e.value]), [2]),
  };

  // ----- 4 Bedienelemente
  const btnSpecs: Spec[] = [
    { id: '4.01', name: 'Button Standard', where: 'Alle normalen Aktionen, inaktive Wahlknöpfe', code: 'btn(label, onClick)', sel: '.btn:not(.primary):not(.dark):not(.danger):not(.icon):not(.back):not(:disabled)', stage: () => btn(t('btn.newGame')), live: 'both' },
    { id: '4.02', name: 'Button Primär', where: 'Die eine Hauptaktion einer Ansicht, gewählte Wahlknöpfe', code: "btn(label, onClick, { variant: 'primary' })", sel: '.btn.primary:not(:disabled)', stage: () => btn(t('btn.start'), undefined, { variant: 'primary' }), live: 'both' },
    { id: '4.03', name: 'Button Dunkel', where: 'Cheft ansagen (Aktionsleiste, ganz links)', code: "variant: 'dark'", sel: '.btn.dark:not(:disabled)', stage: () => btn(t('btn.cheft'), undefined, { variant: 'dark' }), live: 'both' },
    { id: '4.04', name: 'Button Gefahr', where: 'Spiel abbrechen, Raum verlassen', code: "variant: 'danger'", sel: '.btn.danger:not(:disabled)', stage: () => btn(t('btn.quit'), undefined, { variant: 'danger' }), live: 'both' },
    { id: '4.05', name: 'Button Deaktiviert', where: 'Alle Varianten, wenn die Aktion gerade nicht geht', code: '{ disabled: true }', sel: '.btn:disabled', stage: () => [btn(t('btn.lay'), undefined, { disabled: true }), btn(t('btn.start'), undefined, { variant: 'primary', disabled: true })], live: 'both' },
    { id: '4.06', name: 'Button Zurück', where: 'Letzter Knopf jedes Fensters und jeder Seite (Neues Spiel, Online, Beitreten, Einstellungen, Punkte, Info-Dialog, Regeln, Design Guide)', code: 'backBtn(onClick) → this.back()', sel: '.btn.back', stage: () => backBtn(() => undefined), live: 'both', facts: [['Regel', 'Immer „Zurück“, immer Standard-Variante, immer ganz unten. In Stapeln steht ein Gruppen-Zusatzabstand (3.22) darüber.']] },
    { id: '4.07', name: 'Button Piktogramm', where: 'Kopfzeile im Spiel, Entfernen in der Lobby', code: 'iconBtn(icon, title, onClick)', sel: '.btn.icon', stage: () => ICONS.map((i) => iconBtn(pixelIcon(i.rows), i.name)), live: 'box' },
    { id: '4.08', name: 'Button gedrückt', where: 'Beim Antippen: Schatten weg, 1 u nach unten rechts', code: '.btn:active / .btn.active', stage: () => h('button', { class: 'btn active' }, t('btn.newGame')), live: 'box' },
    { id: '4.09', name: 'Button-Reihe', where: 'Zwei Knöpfe nebeneinander in Fenstern (Abbrechen | Aktion, Tisch ansehen | Nächste Runde)', code: '.btn-row', sel: '.btn-row', stage: () => h('div', { class: 'btn-row', style: { width: '100%' } }, btn(t('btn.cancel')), btn(t('btn.cheftConfirm'), undefined, { variant: 'primary' })), live: 'box', liveSel: '.btn-row' },
    { id: '4.10', name: 'Button in Aktionsleiste', where: 'Cheft, Auslegen, Anlegen, Abwerfen (innen schmaler: 2 u links/rechts)', code: '.actions .btn', stage: () => h('div', { class: 'actions', style: { width: '100%' } }, btn(t('btn.lay'), undefined, { variant: 'primary' }), btn(t('btn.discard'))), live: 'box', liveSel: '.btn' },
  ];
  const choiceDemo = (): HTMLElement =>
    h('div', { class: 'option', style: { width: '100%' } }, fieldLabel(t('setup.peek')), h('div', { class: 'choices' }, btn(t('setup.yes'), undefined, { variant: 'primary' }), btn(t('setup.no'))));
  const inputSpecs: Spec[] = [
    { id: '4.11', name: 'Auswahlzeile', where: 'Alle Einstellungen: Vibration, Sounds, Runden, Sitzplätze …', code: 'App.choice() · .option .choices', sel: '.option', stage: choiceDemo, stageCls: 'flat', live: 'box', liveSel: '.option' },
    { id: '4.12', name: 'Bot-Auswahl', where: 'Neues Spiel, Lobby: Stufe und Spielweise', code: 'App.botPicker() · .bot-pick', sel: '.bot-pick', stage: () => h('div', { class: 'bot-pick', style: { width: '100%' } }, h('div', { class: 'bot-col' }, hint(t('setup.level')), btn(t('level.hard'), undefined, { variant: 'primary' })), h('div', { class: 'bot-col' }, hint(t('setup.style')), btn(t('setup.random')))), stageCls: 'flat', live: 'box', liveSel: '.bot-pick' },
    { id: '4.13', name: 'Texteingabe', where: 'Name (Neues Spiel, Online), Server-Adresse', code: 'input.text', sel: 'input.text:not(.name-edit):not(.code)', stage: () => h('input', { class: 'text', type: 'text', value: 'Tobi', placeholder: t('you') }), stageCls: 'flat', live: 'both' },
    { id: '4.14', name: 'Namensfeld', where: 'Lobby und Einstellungen online: eigener Name', code: 'input.text.name-edit', sel: 'input.text.name-edit', stage: () => h('input', { class: 'text name-edit', type: 'text', value: 'Tobi' }), stageCls: 'flat', live: 'box' },
    { id: '4.15', name: 'Codefeld', where: 'Raumcode eingeben', code: 'input.text.code', sel: 'input.text.code', stage: () => h('input', { class: 'text code', type: 'text', value: '232' }), stageCls: 'flat', live: 'both' },
    { id: '4.16', name: 'Mehrzeiliges Feld', where: 'Spielstand-Code einfügen/kopieren, Link kopieren', code: 'textarea.text', sel: 'textarea.text', stage: () => h('textarea', { class: 'text', rows: '3' }, 'CHEFT1-ABCDEFGH…'), stageCls: 'flat', live: 'box' },
    { id: '4.17', name: 'Auf-/Zuklapper', where: 'Online: Server-Adresse', code: 'details > summary.hint', sel: 'details', stage: () => h('details', { open: 'open' }, h('summary', { class: 'hint' }, t('online.server')), hint(t('online.serverHint'))), stageCls: 'flat', live: 'box', liveSel: 'details' },
    { id: '4.18', name: 'Einstellungs-Zeile (nur lesen)', where: 'Lobby für Mitspieler ohne Rechte', code: '.summary-row', sel: '.summary-row', stage: () => h('div', { class: 'row spread summary-row', style: { width: '100%' } }, h('span', { class: 'field-label' }, t('setup.rounds')), h('span', null, '7')), stageCls: 'flat', live: 'box', liveSel: '.summary-row' },
    { id: '4.19', name: 'Sortier-Griff', where: 'Lobby: Sitzordnung ziehen (nur Gastgeber)', code: '.handle', sel: '.handle', stage: () => h('span', { class: 'handle' }), live: 'box' },
    { id: '4.20', name: 'Chip Rommé', where: 'Sitz-Beschriftung, Auswertung; „Gastgeber“, „getrennt“, „Bot“ in der Lobby', code: 'badge(text) · .badge', sel: '.badge:not(.cheft)', stage: () => badge(t('mode.romme'), 'romme'), live: 'both' },
    { id: '4.22', name: 'Auswahl Kartenrückseite', where: 'Einstellungen (Menü und im Spiel): Rückseiten als Karten in Spielgröße; die gewählte orange und leuchtend (5.13), die übrigen dunkel und abgeblendet (5.15). Wirkt sofort, nur für den eigenen Bildschirm', code: 'backChoiceRow() · .back-choices · backs.ts', sel: '.back-choices', stage: () => h('div', { class: 'option', style: { width: '100%' } }, fieldLabel(t('settings.cardBack')), backChoiceRow(BACK_DESIGNS.map((d) => ({ id: d.id, name: d.name, orange: backThumb(d.id, 'a'), dark: backThumb(d.id, 'b') })), BACK_DESIGNS[0].id, () => undefined)), stageCls: 'flat' },
    { id: '4.21', name: 'Chip Cheft', where: 'Sitz-Beschriftung: Spieler hat Cheft angesagt', code: "badge(text, 'cheft')", sel: '.badge.cheft', stage: () => badge(t('mode.cheft'), 'cheft'), live: 'both' },
  ];

  // ----- 5 Karten und Grafiken
  const suitRows: Spec[] = (['H', 'D', 'C', 'S'] as const).map((su, i) => ({
    id: `5.0${i + 2}`,
    name: `Kartensatz ${suitName[su]} (13 Karten)`,
    code: `sprites.ts › drawFace · Atlas-Zellen ${i * 13}–${i * 13 + 12}`,
    stage: () => h('div', { class: 'card-grid' }, ...Array.from({ length: 13 }, (_, k) => c(card(su, k + 1, -200 - k), { title: `${suitName[su]} ${rankName(k + 1)}` }))),
    stageCls: 'flat' as const,
  }));
  const stateCard = (cls: Parameters<GuideEnv['cardEl']>[1]) => c(card('H', 12), cls);
  const cardStates: Spec[] = [
    { id: '5.11', name: 'Karte normal', where: 'Hand, Auslage, Ablage', code: '.card', stage: () => stateCard({}) },
    { id: '5.12', name: 'Karte ausgewählt', where: 'Hand: angetippt (hebt sich 6 u an)', code: '.card.selected', sel: '.card.selected', stage: () => stateCard({ selected: true }) },
    { id: '5.13', name: 'Karte leuchtet', where: 'Nur die gewählte Kartenrückseite in den Einstellungen. Im Spiel leuchtet nie etwas: Ob Ablage- oder Teppichkarte nutzbar ist, muss jeder selbst sehen', code: '.card.glow', sel: '.card.glow', stage: () => stateCard({ glow: true }), stageCls: 'flat' },
    { id: '5.15', name: 'Karte abgeblendet', where: 'Nicht gewählte Kartenrückseiten in den Einstellungen', code: '.card.dim', sel: '.card.dim', stage: () => stateCard({ dim: true }), stageCls: 'flat' },
    { id: '5.14', name: 'Karte frisch gezogen', where: 'Hand: gerade gezogene Karte (grün)', code: '.card.fresh', sel: '.card.fresh', stage: () => stateCard({ fresh: true }), stageCls: 'flat' },
    { id: '5.17', name: 'Vorübergehende Karte', where: 'Roter Rand mit dünnem dunklem Ring: Ablagekarte (nur als Rommé-Spieler), Teppichkarte (nicht bei leerem Stapel) und geklauter Joker. Muss im selben Zug verwendet werden. Die Mitspieler sehen sie offen (Fächer am Desktop, halbe Karte am Handy)', code: '.card.temp', sel: '.card.temp', stage: () => h('div', { class: 'hand', style: { height: 'auto', width: 'var(--card-w)', padding: 'var(--sp-4)' } }, (() => { const e = stateCard({ temp: true }); e.style.position = 'static'; return e; })()), stageCls: 'flat', liveSel: '.card' },
    { id: '5.18', name: 'Karte unter dem Finger', where: 'Ziehen: leicht durchsichtig und größer, mit Zahl der Gruppe', code: '.hand .card.dragging · .drag-badge', sel: '.drag-badge', stage: () => h('div', { style: { opacity: 'var(--op-drag)', transform: 'scale(var(--scale-drag))', position: 'relative' } }, stateCard({}), h('div', { class: 'drag-badge' }, '×3')), stageCls: 'flat' },
    { id: '5.19', name: 'Platzhalter', where: 'Leere Ablage', code: "cardEl('slot') · .slot-hint", stage: () => c('slot'), stageCls: 'flat' },
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
      id: '5.20',
      name: 'Bildkarten-Personen (je 32 × 44 Pixel, zwei Decks)',
      where: 'Bube, Dame, König in Herz, Karo, Kreuz, Pik: Person 1 im ersten Deck (Karten 0–51), Person 2 im zweiten Deck (Karten 52–103). Bei sieben Karten steht dort vorerst dieselbe Person doppelt',
      code: 'face-art.ts (erzeugt von design/bildkarten/code/export_ts.py) · sprites.ts › drawPerson()',
      stage: () => (['H', 'D', 'C', 'S'] as const).flatMap((su) => [11, 12, 13].flatMap((r) => FACE_ART[`${su}${r}`].map((rows) => art(rows, faceColors(), 1)))),
      stageCls: 'flat',
      facts: [
        ['Familien', 'Herz: Dichtkunst, Rot, Gold, Weiß · Karo: Schätze, Gold · Kreuz: Königsfamilie, Schwarz, Gold · Pik: die Bösen, Weiß, Schwarz'],
        ['Farben je Familie', 'Haut 1.20–1.23 · Haar 1.26–1.29 · Augen 1.30–1.33 (1 Pixel) · Gold 1.13 · Tinte 1.01 · Rot 1.14 · Orange 1.10 (Federn, Edelsteine, Hutbänder) · Weiß 1.24'],
        ['Per Formel abgeleitet', 'Licht links/oben: Helligkeit +0,12, Sättigung ×0,92 · Schatten rechts/unten: Helligkeit −0,13, Sättigung ×1,10 (bei Weiß nur −0,06) · Nase: Haut −0,18 · Lippen: Rot 1.14 mit 50 % (Männer) und 90 % (Damen) Deckkraft auf der Haut · Falten: eine Stufe dunkler · Saumlinien auf Schwarz und Zylinderglanz: Schwarz +0,17 · Weiß-Kante: Creme −0,16'],
        ['Saum', 'König: drei Goldlinien mit 1 Pixel Abstand · Dame: zwei Goldlinien plus Schattenlinie · Bube: eine Goldlinie plus zwei Schattenlinien'],
        ['Neu erzeugen', 'Figuren und Formeln: design/bildkarten/code (Python, Pillow). Nach jeder Änderung an Palette 1.20–1.33 dort export_ts.py ausführen; die Datei face-art.ts nie von Hand ändern'],
      ],
    },
    {
      id: '5.21',
      name: 'Ziffern- und Buchstaben-Glyphen (5 × 7 Pixel, die 0 nur 4 × 7)',
      where: 'Eckmarken aller Karten: 2–10, A, B (Bube), D (Dame), K, J (Joker)',
      code: 'sprites.ts › GLYPHS',
      stage: () => Object.entries(GLYPHS).map(([k, rows]) => h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-1)', color: 'var(--text-strong)' } }, art(rows, undefined, 1.5), hint(k))),
      stageCls: 'flat',
    },
    {
      id: '5.22',
      name: 'Farbsymbole (7 × 7 Pixel)',
      where: 'Eckmarken und Mitte der Zahlenkarten (Herz/Karo rot, Pik/Kreuz Tinte)',
      code: 'sprites.ts › SUIT_SHAPES',
      stage: () => (['H', 'D', 'C', 'S'] as const).map((su) => h('div', { style: { color: su === 'H' || su === 'D' ? PALETTE.red : PALETTE.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-1)' } }, art(SUIT_SHAPES[su], undefined, 3), hint(suitName[su]))),
      stageCls: 'flat',
    },
    {
      id: '5.23',
      name: 'Joker-Stern (13 × 13 Pixel)',
      where: 'Joker-Karte: Stern in Orange dunkel und Gold (1 Pixel versetzt)',
      code: 'sprites.ts › STAR',
      stage: () => [art(STAR, { '#': PALETTE.orangeDark }, 3), art(STAR, { '#': PALETTE.gold }, 3)],
      stageCls: 'flat',
    },
    { id: '5.24', name: 'Joker', where: 'Zwei Joker im Spiel', code: 'sprites.ts › drawJoker · Atlas-Zelle 52', stage: () => c(jack), stageCls: 'flat' },
    { id: '5.25', name: 'Kartenrücken A (Orange)', where: 'Stapel, erstes Deck, Mitspieler-Hände, Austeilen', code: "sprites.ts › drawBack · 'back' · Zelle 53", stage: () => c('back'), stageCls: 'flat' },
    { id: '5.26', name: 'Kartenrücken B (Dunkel)', where: 'Zweites Deck (Karten 52–103)', code: "sprites.ts › drawBack · 'back2' · Zelle 55", stage: () => c('back2'), stageCls: 'flat' },
    {
      id: '5.27',
      name: 'Atlas (alle Zellen)',
      where: 'Alle Karten stecken in einem Bild, das beim Start gezeichnet wird (Canvas, kein Bilddatei)',
      code: 'sprites.ts › buildAtlas()',
      stage: () => {
        const img = h('img', { src: env.atlasUrl, alt: 'Atlas' }) as HTMLImageElement;
        img.style.cssText = 'image-rendering:pixelated;width:calc(var(--px-atlas-w) * var(--s) * 0.75);height:auto;display:block';
        return img;
      },
      stageCls: 'flat',
      facts: [['Zellen', `H: 0–12 · D: 13–25 · C: 26–38 · S: 39–51 · Joker: 52 · Rücken A: 53 · Platzhalter: 54 · Rücken B: 55 · Bildkarten Deck 2: ${FACE2_CELL}–${ATLAS_CELLS - 1} (H, D, C, S je Bube, Dame, König)`]],
    },
  ];
  const backThumbs = (d: (typeof BACK_DESIGNS)[number]): HTMLElement[] => (['a', 'b'] as const).map((deck) => h('span', { class: 'thumb', style: { backgroundImage: `url(${backThumb(d.id, deck)})`, width: 'var(--card-w)', height: 'var(--card-h)' } }));
  const backGrid = (): HTMLElement =>
    h(
      'div',
      { style: { display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-6) var(--sp-8)' } },
      ...BACK_DESIGNS.map((d, i) => h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--gap-tight)' } }, h('div', { style: { display: 'flex', gap: 'var(--gap-hair)' } }, ...backThumbs(d)), h('div', null, idChip(`5.${61 + i}`), ` ${d.name}`))),
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
      where: 'Hinter allen Seiten: Schachbrett aus Sandstufe 6 (1.07) und Sandstufe 3 (1.06), Kachel 8 u',
      code: 'body · --tile',
      stage: () => h('div', { style: { width: 'calc(8 * var(--tile))', height: 'calc(3 * var(--tile))', background: 'var(--surface-page)', backgroundImage: 'repeating-conic-gradient(var(--surface-page) 0 25%, var(--surface-page-alt) 0 50%)', backgroundSize: 'var(--tile) var(--tile)', border: 'var(--bw) solid var(--line)' } }),
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
  const iconSpecs: Spec[] = ICONS.map((i) => ({
    id: i.id,
    name: `Piktogramm ${i.name} (10 × 10 Pixel)`,
    where: i.use,
    code: `icons.ts › ICON_${i.key.toUpperCase()}`,
    stage: () => [art(i.rows, undefined, 3), iconBtn(pixelIcon(i.rows), i.name)],
    stageCls: 'flat' as const,
  }));

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
    { id: '6.32', name: 'Cheft-Paar', where: 'Auslage: zwei gleiche Karten, enger überlappt', code: "meldEl(cards, { pair: true }) · .meld.pair", sel: '.meld.pair', stage: () => melds('pair', true) },
    { id: '6.36', name: 'Eigene Auslage als Ablagezone', where: 'Beim Ziehen markierter Karten: orange gestrichelt, hinterlegt', code: '.own.drop', sel: '.own.drop', stage: () => h('div', { class: 'own drop', style: { width: '100%' } }, melds('run', true)), stageCls: 'flat', live: 'box' },
    { id: '6.40', name: 'Stapel', where: 'Tischmitte: Rücken mit Dicke (eine Kante je angefangene 8 Karten, höchstens 7)', code: 'App.stockEl()', sel: '.stock-wrap > .card', stage: () => h('div', { class: 'stock-wrap', style: { margin: 0, marginRight: 'calc(7 * var(--s))', marginBottom: 'calc(7 * var(--s))' } }, (() => { const e = c('back', { glow: true }); const sh: string[] = []; for (let i = 7; i >= 1; i--) sh.push(`calc(${i}px * var(--s)) calc(${i}px * var(--s)) 0 0 var(--c-cream)`, `calc(${i}px * var(--s)) calc(${i}px * var(--s)) 0 1px var(--c-sand-dark)`); e.style.boxShadow = sh.join(', '); return e; })()) },
    { id: '6.41', name: 'Teppichkarte', where: 'Quer unter dem Stapel, offen', code: '.carpet', sel: '.carpet', stage: () => h('div', { style: { position: 'relative', width: 'calc(1.4 * var(--card-h))', height: 'calc(1.2 * var(--card-w))' } }, h('div', { class: 'carpet', style: { left: 'calc(0.2 * var(--card-h))' } }, c(card('S', 11, -520), { glow: true }))) },
    { id: '6.42', name: 'Ablage', where: 'Tischmitte: Karten liegen verstreut; die oberste ist ziehbar', code: '.discard', sel: '.discard', stage: () => h('div', { class: 'discard' }, ...[[0, 0, -10], [3, -2, 14], [-2, 4, -20]].map(([dx, dy, rot], i) => { const e = c(card('C', 4 + i, -530 - i), i === 2 ? { glow: true } : {}); e.style.transform = `translate(calc(${dx}px * var(--s)), calc(${dy}px * var(--s))) rotate(${rot}deg)`; e.style.zIndex = String(i); return e; })), stageCls: 'flat' },
    { id: '6.43', name: 'Ablage leer', where: 'Zu Rundenbeginn: gestrichelter Platzhalter', code: "cardEl('slot', { cls: 'slot-hint' })", stage: () => h('div', { class: 'discard' }, c('slot', { cls: 'slot-hint' })), stageCls: 'flat' },
    { id: '6.44', name: 'Ablage als Ablageziel', where: 'Beim Ziehen einer Karte über die Ablage: oberste Karte orange gestrichelt', code: '.discard.drop', sel: '.discard.drop', stage: () => h('div', { class: 'discard drop' }, c(card('C', 4, -540))), stageCls: 'flat' },
    { id: '6.45', name: 'Stapel-Beschriftung', where: 'Eine kleine Schrift ganz nah an der Karte: „Stapel“ und „Ablage“ über der Karte (die Ablage später von Karten verdeckt), „Teppich“ gedreht links neben der Teppichkarte. Entfallen, sobald am Tisch etwas kleiner ist als zum Start (6.18); die Titel der Startkarten (6.22, 6.23) bleiben', code: '.pile-label', sel: '.pile-label', stage: () => h('div', { class: 'piles', style: { position: 'relative', height: 'calc(2 * var(--size-btn-icon))' } }, h('span', { class: 'pile-label', style: { position: 'static' } }, `${t('stock')} · ${t('discard')} · ${t('carpet.label')}`)), stageCls: 'flat', live: 'text', liveSel: '.pile-label' },
    { id: '6.47', name: 'Tippfläche Teppichkarte', where: 'Unsichtbar: genau so groß wie eine Karte im Hochformat, direkt links neben dem Stapel, nur beim Ziehen aktiv. Damit sind alle drei „Karte nehmen“-Felder (Stapel, Ablage, Teppich) gleich groß. Rommé-Spieler bekommen beim Antippen die Rückfrage „Cheft ansagen?“', code: '.carpet-hit', sel: '.carpet-hit', stage: () => h('div', { class: 'hint' }, 'Unsichtbar, ohne Rahmen und ohne Leuchten'), stageCls: 'flat' },
    { id: '6.48', name: 'Offene Karten am Fächer', where: 'Ab 900 px Breite: Die vorübergehenden Karten des Spielers am Zug liegen offen und rot umrandet am Ende des Fächers, mehrere untereinander', code: '.fan-wrap > .temp-col', sel: '.temp-col', stage: () => h('div', { class: 'fan-wrap', style: { paddingRight: 'calc(var(--px-card-w) * var(--so) + var(--sp-4))', marginTop: 'calc(var(--px-card-h) * var(--so))' } }, h('div', { class: 'fan' }, ...Array.from({ length: 6 }, (_, i) => c(i % 2 ? 'back2' : 'back', { small: true }))), h('div', { class: 'temp-col' }, c(card('C', 10, -611), { small: true, temp: true }), c(jack, { small: true, temp: true }))), stageCls: 'flat' },
    { id: '6.49', name: 'Halbe Karte am Handy', where: 'Ohne Fächer (Handy): Von jeder vorübergehenden Karte bleibt die obere Hälfte, am äußeren Rand des Sitzes bis zum Bildschirmrand verlängert, der Rahmen fehlt an der Außenseite (die Karte wirkt abgeschnitten). Sie liegt über dem Sitz und belegt keinen Platz. Beim eigenen Sitz gibt es sie nicht (die Karte ist rot in der Hand)', code: '.temp-half > .half', sel: '.temp-half', stage: () => h('div', { class: 'temp-half', style: { margin: 'var(--sp-4)' } }, h('div', { class: 'half' }, c(card('C', 10, -612), { small: true })), h('div', { class: 'half' }, c(jack, { small: true }))), stageCls: 'flat' },
    { id: '6.46', name: 'Fächer der Mitspieler', where: 'Verdeckte Handkarten bei Mitspielern (nur ab 900 px Breite)', code: '.fan', sel: '.fan', stage: () => h('div', { class: 'fan' }, ...Array.from({ length: 8 }, (_, i) => c(i % 2 ? 'back2' : 'back', { small: true }))), stageCls: 'flat' },
    {
      id: '6.18',
      name: 'Kartengrößen am Tisch',
      where: 'Auslagen aller Sitze (--so) und Tischmitte: Stapel, Ablage, Teppichkarte (--sc). Die Handkarten bleiben bei --s',
      code: 'tablescale.ts › tableLadder() · App.layoutTable',
      stage: () => h('div', { class: 'hint' }, 'Beispiel dieses Geräts: ' + tableLadder(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, rootScale()).map((x) => `${x.a} / ${x.c}`).join(' → ')),
      stageCls: 'flat',
      facts: [
        ['Regel', `Die Mitte ist nie kleiner als die Auslagen und höchstens ${MAX_RATIO}-mal so groß, nie größer als die Hand.`],
        ['Stufen', 'Ganze Geräte-Pixel je Kartenpixel: n ÷ Pixeldichte (Dichte 1: 1, 2, 3 · Dichte 2: auch Halbschritte · Dichte 3: Drittel). Fehlt eine kleine Stufe, ist 1 die Notstufe.'],
        ['Start', 'Keine festen Größen je Gerät: Der Tisch beginnt so groß wie die Handkarten (nie größer), auf die Stufen des Bildschirms gerundet.'],
        ['Verkleinern', 'Bei Platzmangel schrittweise nach unten (größte Summe zuerst), innerhalb einer Runde nie wieder größer. Neu bestimmt wird bei neuer Runde, nach „Bereit“ und bei anderer Fenstergröße.'],
        ['Beschriftungen', 'Sobald etwas kleiner ist als zum Start, entfallen „Stapel“, „Ablage“ und „Teppich“ (6.45).'],
      ],
    },
    { id: '6.50', name: 'Status-Zeile', where: 'Zwischen Tisch und Hand: Meldung links, Info rechts', code: '.status', sel: '.status', stage: () => h('div', { class: 'status', style: { width: '100%' } }, h('span', { class: 'msg' }, t('turn.you.play')), h('span', { class: 'info' }, t('threshold', { n: 51 }))), stageCls: 'flat', live: 'box', liveSel: '.status' },
    { id: '6.60', name: 'Hand', where: 'Eigene Karten auf der Leiste in Sand: markiert, frisch, vorübergehend (rot)', code: '.hand-wrap > .hand', sel: '.hand-wrap', stage: () => h('div', { class: 'hand-wrap', style: { width: '100%' } }, h('div', { class: 'hand', style: { display: 'flex', gap: 'var(--sp-2)', height: 'auto', paddingTop: 'var(--lift-selected)' } }, ...[card('H', 5, -601), card('S', 13, -602), card('D', 1, -603), card('C', 7, -604)].map((k, i) => { const e = c(k, i === 1 ? { selected: true } : i === 2 ? { fresh: true } : {}); e.style.position = 'static'; if (i === 1) e.style.transform = 'translateY(calc(-1 * var(--lift-selected)))'; return e; }))), stageCls: 'flat', live: 'box', liveSel: '.hand-wrap', facts: [['Raster', `Abstand ${HAND.minStep}–(Kartenbreite + ${HAND.maxOver}) u; darunter zwei Zeilen im Abstand ${HAND.rowGap} u (3.151–3.154)`]] },
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
        h('div', { class: 'peek-banner', style: { top: 'var(--sp-3)' } }, t('peek.title')),
        h('div', { class: 'peek-line', style: { left: 'calc(2.5 * var(--card-w))', top: 'calc(0.5 * var(--card-h))', width: 'var(--card-w)', transform: 'rotate(0.6rad)' } }),
        h('div', { class: 'peek-item', style: { left: 'var(--sp-8)', top: 'calc(1.2 * var(--card-h))' } }, c(card('H', 9, -701)), h('div', { class: 'peek-tag' }, 'Emil')),
        h('div', { class: 'peek-item taken', style: { left: 'calc(2 * var(--card-w))', top: 'calc(1.2 * var(--card-h))' } }, c(card('D', 3, -702)), h('div', { class: 'peek-tag' }, 'Zhao', h('div', { class: 'peek-taken' }, t('peek.taken', { name: 'Neo' })))),
      ),
      stageCls: 'flat',
    },
    { id: '6.80', name: 'Fliegende Karte', where: 'Alle Kartenbewegungen: Ziehen, Abwerfen, Auslegen, Austeilen', code: '.card.fly · anim.ts', stage: () => h('div', { class: 'hint' }, `Kopie der Karte, die in ${MOTION.fly} ms (Austeilen ${MOTION.dealFly} ms) vom alten zum neuen Platz fliegt, Kurve ${EASE_FLY}. Ebene 3.122.`), stageCls: 'flat' },
  ];

  // ----- 7 Fenster
  const dlg = (...children: Child[]): HTMLElement => h('div', { class: 'panel dialog', style: { margin: '0 auto' } }, ...children);
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
  const h2row = (me: boolean, name: string, mode: string, rest: 'opened' | 'closed' | null, base: string, factor: string, total: string, sum: string, place = '', info = false): HTMLElement =>
    h(
      'tr',
      { class: me ? 'me' : '' },
      h('td', { class: 'place' }, place),
      h('td', null, info ? btn([name, pixelIcon(ICON_INFO)], undefined, { cls: 'name-info' }) : name, h('div', { class: 'factors' }, t(`mode.${mode}`)), rest === 'opened' ? h('div', { class: 'rest' }, c(card('D', 3, -901), { mini: true }), c(card('S', 7, -902), { mini: true })) : rest === 'closed' ? h('div', { class: 'rest backs' }, ...[1, 2, 3].map((n) => c('back', { mini: true, cls: `r${n}` }))) : null),
      h('td', { class: 'num' }, base, factor ? h('div', { class: 'factors' }, factor) : null),
      h('td', { class: 'num' }, total),
      h('td', { class: 'num' }, sum),
    );
  const windows: Spec[] = [
    { id: '7.01', name: 'Fenster (Grundform)', where: 'Alle Fenster: Titel, Inhalt, Knöpfe auf Abdunkelung; max. 230 u breit', code: 'windowEl(children, onBackdrop?)', sel: '.overlay > .dialog', stage: () => dlg(h('h2', null, t('pause.title')), h('p', null, t('pause.text')), btn(t('pause.resume'), undefined, { variant: 'primary' })), stageCls: 'flat', live: 'box', liveSel: '.dialog' },
    { id: '7.02', name: 'Entscheidung', where: 'Cheft ansagen: Abbrechen | Aktion (primär)', code: 'askDialog({ buttons: [Abbrechen, Aktion] })', stage: () => dlg(h('h2', null, t('confirm.cheft.title')), h('p', null, t('confirm.cheft')), h('div', { class: 'btn-row' }, btn(t('btn.cancel')), btn(t('btn.cheftConfirm'), undefined, { variant: 'primary' }))), stageCls: 'flat' },
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
      where: 'Nach der letzten Runde: Sieger, Auswertung mit Platz (1. 2. 3. 4.), eigene Zeile hervorgehoben, Bot-Details hinter dem (i), Punkteverlauf',
      code: 'App.renderRoundEnd() · tr.me · table.rounds',
      stage: () => dlg(h('h2', null, t('gameEnd.title')), h('p', null, t('gameEnd.winner', { name: 'Emil', n: 38 })),
        h('table', { class: 'scores' }, h('thead', null, h('tr', null, h('th', { class: 'place' }), h('th', null, t('roundEnd.rest')), h('th', { class: 'num' }, t('score.base')), h('th', { class: 'num' }, t('score.total')), h('th', { class: 'num' }, t('score.sum')))), h('tbody', null, ...(['Emil', 'Neo', 'Zhao', 'Tobi'] as const).map((n, i) => { const r = h2row(i === 0, n, n === 'Tobi' ? 'cheft' : 'romme', null, ['0', '36', '100', '100'][i], '', ['0', '36', '100', '100'][i], ['38', '64', '228', '302'][i], `${i + 1}.`, i > 0); return r; }))),
        h('div', null, h('h3', null, t('gameEnd.rounds')), roundsDemo()),
        btn(t('btn.endGame'), undefined, { variant: 'primary' })),
      stageCls: 'flat',
    },
    { id: '7.20', name: 'Toast', where: 'Kurze Rückmeldung (Kopiert, Geladen), steht 3,2 s', code: 'toastEl(msg) · showToast()', stage: () => staticToast(t('save.copied')), stageCls: 'flat', live: 'both', liveSel: '.toast' },
    { id: '7.21', name: 'Toast Fehler', where: 'Unerlaubte Aktion, Verbindungsfehler: rot', code: 'toastEl(msg, true)', stage: () => staticToast(t('err.cannotAdd'), true), stageCls: 'flat', live: 'both', liveSel: '.toast' },
    { id: '7.30', name: 'Abdunkelung', where: 'Hinter jedem Fenster; ein Tipp daneben = „Zurück“, aber nur bei Fenstern, die nur anzeigen', code: '.overlay', stage: () => h('div', { class: 'overlay', style: { position: 'relative', width: '100%', height: 'calc(2 * var(--size-btn-icon))', inset: 'auto', padding: 0, zIndex: 'auto' } }, hint('Abdunkelung 1.18')), stageCls: 'flat', live: 'box', liveSel: '.overlay' },
  ];

  // ----- 8 Seiten
  const anatomy = (rows: [string, string][]): (() => HTMLElement) => () => table(['Nr.', 'Element'], rows.map(([id, text]) => [idChip(id), text]));
  const viewDemo: Spec = {
    id: '8.10',
    name: 'Ganzseitige Ansicht',
    where: 'Regeln und Design Guide: Titelleiste (oben), scrollender Inhalt, Fußleiste mit „Zurück“ (unten)',
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
    { title: '8.01 Menü', node: anatomy([['5.30', 'Logo'], ['4.02', 'Weiterspielen (nur mit Spielstand, primär)'], ['4.01/4.02', 'Neues Spiel (primär, wenn nichts zum Weiterspielen)'], ['4.01', 'Spielstand-Code einfügen'], ['4.01', 'Mit Freunden spielen'], ['4.02', 'Zurück in den Raum (nur wenn ein Raum gespeichert ist)'], ['4.01', 'Regeln'], ['4.01', 'Design Guide'], ['4.01', 'Einstellungen (Fenster 7.06)']]) },
    { title: '8.02 Neues Spiel', node: anatomy([['2.31', 'Titel'], ['4.13', 'Name'], ['4.11', 'Bots (2 | 3)'], ['4.12', 'Je Bot: Stufe | Spielweise'], ['4.01', 'Alle zufällig'], ['4.11', 'Sitzplätze, Rauskommen im ersten Zug, Karten beim Austeilen, Rückblick, Runden'], ['2.37', 'Spielrichtung-Hinweis'], ['4.02', 'Spiel starten'], ['4.06', 'Zurück']]) },
    { title: '8.03 Mit Freunden spielen', node: anatomy([['2.31', 'Titel'], ['4.13', 'Name'], ['4.02', 'Raum eröffnen'], ['4.15', 'Raumcode + Beitreten (4.01)'], ['4.17', 'Server-Adresse (aufklappbar)'], ['4.06', 'Zurück']]) },
    { title: '8.04 Beitreten (Spiel läuft)', node: anatomy([['2.31', 'Titel'], ['2.37', 'Hinweis'], ['4.01', 'Ein Knopf je übernehmbarem Platz'], ['4.06', 'Zurück']]) },
    { title: '8.05 Lobby', node: anatomy([['2.31', 'Titel (Raumcode)'], ['4.01', 'Link / Raumcode kopieren'], ['4.19', 'Sitzreihen mit Griff, Name (4.14), Chips (4.20), Entfernen (4.07), Bot-Auswahl (4.12)'], ['4.01', 'Bot hinzufügen'], ['4.11', 'Einstellungen (Gastgeber) oder 4.18 (Mitspieler)'], ['2.37', 'Spielrichtung-Hinweis'], ['4.02', 'Spiel starten'], ['4.04', 'Raum verlassen']]) },
    { title: '8.06 Regeln', node: anatomy([['8.10', 'Ganzseitige Ansicht'], ['2.32', 'Zwischenüberschriften'], ['2.35', 'Listen'], ['4.06', 'Zurück (zum Menü oder ins Spiel)']]) },
    { title: '8.07 Design Guide', node: anatomy([['8.10', 'Ganzseitige Ansicht'], ['2.32', 'Kapitel (2.31) und Gruppen (2.32)'], ['4.11', 'Nummern im Spiel'], ['4.06', 'Zurück zum Menü']]) },
    { title: '8.08 Spielfeld', node: anatomy([['6.01', 'Kopfzeile'], ['6.11–6.15', 'Sitze, Mitte, eigene Auslage'], ['6.50', 'Status'], ['6.60', 'Hand'], ['6.62', 'Aktionen']]) },
  ];

  // ----- 9 Sound
  const vibFor = (use: string) => VIBRATION_CATALOG.find((v) => v.use === use);
  const pattern = (v: (typeof VIBRATION_CATALOG)[number]) => (Array.isArray(v.pattern) ? v.pattern.join(' · ') : String(v.pattern));
  const soundSpecs: Spec[] = SOUND_CATALOG.map((s) => {
    const v = vibFor(s.use);
    return {
      id: s.id,
      name: `Ton ${s.label}`,
      where: s.use,
      code: `sound.ts › play('${s.name}')`,
      stage: () => (v ? [btn('Anhören', () => preview(s.name)), btn('Fühlen', () => vibrate(v.pattern, true))] : btn('Anhören', () => preview(s.name))),
      stageCls: 'flat' as const,
      facts: [['Rezept', s.recipe], ...(v ? [['Vibration (ms)', pattern(v)] as [string, string]] : [])],
    };
  });
  // Vibrationen mit eigenem Anlass; die zum Anlass eines Tons stehen schon dort
  const vibSpecs: Spec[] = VIBRATION_CATALOG.filter((v) => !SOUND_CATALOG.some((s) => s.use === v.use)).map((v) => ({
    id: v.id,
    name: `Vibration ${v.label}`,
    where: v.use,
    stage: () => btn('Fühlen', () => vibrate(v.pattern, true)),
    stageCls: 'flat' as const,
    facts: [['Muster (ms)', pattern(v)]],
  }));

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
          ['Design Guide', 'Zurück · Esc', 'Menü'],
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
          ['Regeln · Design Guide · Einstellungen', '4.01', 'Menü'],
          ['Alle zufällig · Bot hinzufügen · Link kopieren', '4.01', 'Neues Spiel, Lobby'],
          ['Auslegen · Anlegen · Abwerfen', '4.02 · 4.01 · 4.01', 'Aktionsleiste'],
          ['Cheft! · Zurücklegen', '4.03', 'Aktionsleiste'],
          ['Cheft ansagen', '4.02', 'Entscheidung 7.02'],
          ['Bereit', '4.02', 'Aktionsleiste 6.63'],
          ['Tisch ansehen · Auswertung · Nächste Runde · Spiel beenden', '4.01 · 4.01 · 4.02 · 4.02', 'Rundenende 7.10, Fußleiste 7.11'],
          ['Pause · Weiter · Trotzdem weiter', '4.01 · 4.02 · 4.02', 'Einstellungen, Pause-Fenster 7.09'],
          ['Spielstand-Code kopieren · Speichern & zum Menü', '4.01', 'Einstellungen im Spiel'],
          ['Spiel abbrechen · Raum verlassen', '4.04', 'Einstellungen im Spiel, Lobby'],
          ['an/aus · normal/schnell u. a.', '4.01 / 4.02', 'Auswahlzeilen 4.11'],
        ],
      ),
  };

  // ----- Aufbau
  return [
    {
      n: 1,
      title: 'Farben',
      intro: 'Zwei Ebenen: Die Palette (1.01–1.36) sind die echten Farbwerte. Die Rollen (1.41–1.79) sagen, wofür eine Farbe steht. Das Layout benutzt nur Rollen: eine Rolle auf eine andere Palettenfarbe zeigen lassen ändert alle Stellen im Spiel. Die Sandtöne bilden eine Leiter aus zehn gleich großen Schritten von Creme (Stufe 0) bis Sand (Stufe 9): Nur diese beiden Enden sind festgelegt, alle Stufen dazwischen (1.06, 1.07) werden per Formel berechnet (sandStep in tokens.ts). Quelle: tokens.ts.',
      groups: [...paletteGroups, ...roleGroups],
    },
    {
      n: 2,
      title: 'Typografie',
      intro: 'Zwei Schriften: VT323 für Text, Tiny5 Duo Bold (700) für Überschriften. Sieben Größen. Die Spezifikation unter jedem Muster ist live aus dem Element gelesen, nicht abgeschrieben.',
      groups: [
        { title: 'Schriftarten', specs: fontSpecs },
        { title: 'Schriftschnitte', specs: weightSpecs },
        { title: 'Schriftgrößen', specs: sizeSpecs },
        { title: 'Zeilenhöhe und Laufweite (2.21–2.24)', node: tokenTable(['Nr.', 'Name', 'Wert'], () => TYPE_MISC_TOKENS.map((x) => [idChip(x.id), sub(x.name, `${x.css} · ${x.use}`), x.value]), [2]) },
        { title: 'Textstile: Überschriften, Texte, Hinweise (2.30–2.54)', specs: typeRoles },
      ],
    },
    {
      n: 3,
      title: 'Abstände, Rahmen, Maße',
      intro: '1 u = 1 Pixel × Maßstab. Abstände sind Stufen der Skala (3.11–3.18), Rollen (3.21–3.37) geben ihnen Bedeutung; am Ende steht, wo im Spiel welcher Abstand wirkt.',
      groups: [
        {
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
        },
        spacingScaleGroup,
        spacingRoleGroup,
        borderGroup,
        effectGroup,
        sizeTable,
        { title: 'Ebenen, z-index (3.121–3.127)', node: tokenTable(['Nr.', 'Name', 'Wert'], () => Z_TOKENS.map((x) => [idChip(x.id), sub(x.name, `${x.css} · ${x.use}`), x.value]), [2]) },
        { title: 'Zeiten in Millisekunden (3.131–3.145)', node: tokenTable(['Nr.', 'Name', 'Wert'], () => [...MOTION_TOKENS.map((m) => [idChip(m.id), sub(m.name, m.use), `${MOTION[m.key]} ms`]), [idChip('3.143'), sub('Kurve', 'Alle Kartenflüge und der Rückblick'), EASE_FLY], [idChip('3.144'), sub('Rückblick: Startgröße', 'Karten wachsen beim Einblenden'), String(PEEK_FROM_SCALE)], [idChip('3.145'), sub('Kreis des aktiven Spielers', 'Durchmesser = (Breite + Höhe des Spielfelds) ÷ 2 ÷ φ ÷ φ'), `φ = ${TURN_DISC.phi}`]], [2]) },
        { title: 'Hand-Raster (3.151–3.154)', node: tokenTable(['Nr.', 'Name', 'Wert'], () => HAND_TOKENS.map((x) => [idChip(x.id), sub(x.name, `${x.css} · ${x.use}`), `${HAND[x.key]} u`]), [2]) },
        ...usageGroup,
      ],
    },
    {
      n: 4,
      title: 'Bedienelemente',
      intro: 'Jeder Button kommt aus btn() in components.ts; die Variante bestimmt die Farbe, der Zustand (deaktiviert, gedrückt) ist für alle gleich.',
      groups: [
        { title: 'Buttons', specs: btnSpecs },
        { title: 'Auswahl, Eingabe, Chips', specs: inputSpecs },
      ],
    },
    {
      n: 5,
      title: 'Karten und Grafiken',
      intro: 'Alle Karten werden beim Start als Pixelbild gezeichnet (sprites.ts) und per Atlas ausgeschnitten. Alle Farben stammen aus der Palette (Kapitel 1).',
      groups: [
        { title: 'Kartensatz', note: 'Alle Karten gibt es zweimal (zwei Blätter, 104 Karten).', specs: [sizes, ...suitRows] },
        { title: 'Sonderkarten, Figuren, Glyphen', specs: cardArt },
        { title: 'Kartenrückseiten zur Auswahl (5.61 ff.)', note: 'Zur Auswahl in den Einstellungen (4.22), links Deck 1 (Orange), rechts Deck 2 (Dunkel). Das Feld liegt im Rahmen 26 × 38 Pixel; Rahmen, weiße Kontur und abgerundete Ecken sind für alle Designs gleich. Neues Design: Eintrag in backs.ts › BACK_DESIGNS ergänzen.', node: backGrid },
        { title: 'Kartenzustände', specs: cardStates },
        { title: 'Logo, App-Icon, Hintergrund', specs: brand },
        { title: 'Piktogramme', specs: iconSpecs },
      ],
    },
    {
      n: 6,
      title: 'Spielfeld',
      intro: 'Jeder Sitz hat eine Achse, auf der sein Paket aus Beschriftung und Auslage mittig liegt (6.10). Die Kartengrößen am Tisch richten sich nach dem Platz (6.18).',
      groups: [{ title: 'Spielfeld-Elemente', specs: field }],
    },
    {
      n: 7,
      title: 'Fenster und Meldungen',
      intro: 'Alle Fenster stehen auf einer Abdunkelung (1.18). Anzeige-Fenster schließen mit „Zurück“ oder einem Tipp daneben, Entscheidungen nur über ihre Knöpfe.',
      groups: [{ title: 'Fenster, Leisten, Toast', specs: windows }],
    },
    {
      n: 8,
      title: 'Seiten',
      intro: 'Jede Seite als Liste ihrer Elemente von oben nach unten, mit den Nummern der Bausteine.',
      groups: [{ title: 'Ganzseitige Ansicht und Lobby', specs: [viewDemo, lobbyRow] }, ...pages],
    },
    {
      n: 9,
      title: 'Sound und Haptik',
      intro: 'Alle Töne entstehen live per WebAudio (keine Dateien). Anhören geht auch bei ausgeschalteten Sounds. Vibration geht nur auf Geräten, die sie können.',
      groups: [
        { title: 'Töne', specs: soundSpecs },
        { title: 'Vibration', note: 'Alle Muster stehen in sound.ts › VIB. Muster zu einem Anlass mit Ton (Fehler, Sieg) stehen beim Ton.', specs: vibSpecs },
        { title: 'Lautstärke', node: () => table(['Nr.', 'Name', 'Wert'], [[idChip('9.30'), 'Gesamtlautstärke', '4,5 mit Kompressor (Schwelle −16 dB) gegen Übersteuern (sound.ts › MASTER_GAIN)']]) },
      ],
    },
    {
      n: 10,
      title: 'Navigation und Beschriftungen',
      groups: [navTable, labelTable],
    },
  ];
}

/** Alle Etiketten-Ziele: Nummer und Selektor. */
export function labelTargets(): { id: string; sel: string; name: string }[] {
  const stub = {} as GuideEnv;
  const out: { id: string; sel: string; name: string }[] = [];
  for (const ch of chapters(stub)) for (const g of ch.groups) for (const sp of g.specs ?? []) if (sp.sel) out.push({ id: sp.id, sel: sp.sel, name: sp.name });
  return out;
}

/** Alle Nummern des Guides in Reihenfolge (für Tests). */
export function allSpecIds(): string[] {
  const stub = {} as GuideEnv;
  const out: string[] = [];
  for (const ch of chapters(stub)) for (const g of ch.groups) for (const sp of g.specs ?? []) out.push(sp.id);
  return out;
}

// ---------------------------------------------------------------- Seite
export function renderGuide(env: GuideEnv): HTMLElement {
  measurers = [];
  const chs = chapters(env);
  const toc = h(
    'div',
    { class: 'guide-toc' },
    ...chs.map((ch) =>
      btn(`${ch.n} ${ch.title}`, () => {
        document.getElementById(`${NS}-ch${ch.n}`)?.scrollIntoView({ block: 'start' });
      }),
    ),
  );
  const intro = h(
    'div',
    { class: 'panel guide-intro' },
    h('p', null, 'Alle Elemente der App mit fester Nummer aus Kapitel und Zähler (z. B. 4.02 = Button Primär).'),
    h('p', null, 'Maße stehen in u: 1 u = 1 Pixel × Maßstab (Handy: 1 u = 2 px). Farben, Größen und Abstände sind in tokens.ts als Parameter angelegt; styles.css verwendet nur diese Variablen.'),
    h('div', { class: 'option' }, fieldLabel('Nummern im Spiel'), h('div', { class: 'choices' }, btn('an', () => env.setLabels(true), { variant: env.labelsOn ? 'primary' : 'default' }), btn('aus', () => env.setLabels(false), { variant: env.labelsOn ? 'default' : 'primary' }))),
    hint('Zeigt an jedem Element einen kleinen gelben Punkt unten links (nicht in diesem Guide). Antippen zeigt die Nummer und kopiert sie.'),
    toc,
  );
  const body: HTMLElement[] = [intro];
  for (const ch of chs) {
    body.push(h('h2', { class: 'guide-chapter', id: `${NS}-ch${ch.n}` }, `${ch.n} ${ch.title}`));
    if (ch.intro) body.push(h('p', { class: 'guide-chapter-intro muted' }, ch.intro));
    for (const g of ch.groups) {
      body.push(h('h3', { class: 'guide-group' }, g.title));
      if (g.note) body.push(hint(g.note));
      if (g.specs) for (const sp of g.specs) body.push(specEl(sp));
      if (g.node) body.push(h('div', { class: 'panel spec' }, g.node()));
    }
  }
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
