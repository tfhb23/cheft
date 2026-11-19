/**
 * Design-Tokens: die einzige Quelle für Farben, Schriften, Abstände, Maße, Ebenen und Zeiten.
 *
 * - Beim Start wird daraus ein <style>-Block mit CSS-Variablen erzeugt (installTokens). styles.css, die Sprites,
 *   die Sounds und die Animationen lesen nur diese Werte, es stehen dort keine festen Farben oder Maße.
 * - Jeder Token hat eine feste Nummer (Kapitel.Zähler). Dieselbe Nummer steht im Design Guide (Startseite) und,
 *   wenn man dort „Nummern im Spiel“ einschaltet, auf den Elementen im Spiel.
 * - Maße sind in „u“ angegeben: 1 u = 1 Bildschirm-Pixel × Skalierung (--s, siehe 3.01). Auf dem Handy ist 1 u = 2 px.
 * - Zwei Ebenen: Palette (1.xx: echte Farbwerte) und Rollen (1.4x–1.7x: wofür eine Farbe steht). Das Layout
 *   verwendet nur Rollen. Eine Rolle umhängen = alle Stellen im Spiel ändern.
 *
 * Diese Datei darf keine Browser-APIs beim Laden anfassen (wird auch von vite.config.ts und Skripten gelesen).
 */

/** Maß in u: Pixel mal --s (dem Hauptmaßstab). Karten der Mitspieler rechnen mit --so, siehe CARD_PX. */
export const u = (n: number): string => `calc(${n}px * var(--s))`;

/** Basismaße der Karten in Pixeln des Sprites (unskaliert), siehe 3.71–3.78. */
export const CARD_PX = { w: 32, h: 44, atlasW: 256, atlasH: 396, cols: 8 };

// ---------------------------------------------------------------- 1 Farben
export interface ColorToken {
  id: string;
  css: string;
  name: string;
  value: string;
  group: string;
  use: string;
}

/** 1.01–1.39: Palette. Echte Farbwerte, jeder nur einmal. */
export const PALETTE_COLORS: ColorToken[] = [
  { id: '1.01', css: '--c-ink', name: 'Tinte', value: '#23201f', group: 'Tinte und Text', use: 'Rahmen, harte Schatten, Button-Text, Namen, Kartenkontur und schwarze Farben' },
  { id: '1.02', css: '--c-ink-soft', name: 'Tinte weich', value: '#5a4d44', group: 'Tinte und Text', use: 'Gedämpfter Text, Hinweise, deaktivierte Rahmen' },
  { id: '1.03', css: '--c-brown', name: 'Textbraun', value: '#3a2d25', group: 'Tinte und Text', use: 'Standard-Fließtext, Regeln, Status-Zeile' },
  { id: '1.04', css: '--c-panel', name: 'Panel', value: '#fffaf0', group: 'Flächen', use: 'Panels, Dialoge, Buttons, Leisten, Toast' },
  { id: '1.05', css: '--c-cream', name: 'Creme', value: '#fbf6ea', group: 'Flächen', use: 'Eingabefelder, Wahloptionen, Zähler auf dem Stapel, Kartenvorderseite, Text auf Orange' },
  { id: '1.06', css: '--c-sand', name: 'Sand', value: '#efe2c6', group: 'Flächen', use: 'Seitenhintergrund (Schachbrett dunkel), Badge' },
  { id: '1.07', css: '--c-sand-light', name: 'Sand hell', value: '#f4eadb', group: 'Flächen', use: 'Seitenhintergrund (Schachbrett hell)' },
  { id: '1.08', css: '--c-sand-dark', name: 'Sand dunkel', value: '#cdbb94', group: 'Flächen', use: 'Weiche Schatten, Tabellenlinien, Hand- und Aktionsleiste, Badge-Rahmen, Überschrift-Schatten' },
  { id: '1.09', css: '--c-gray', name: 'Grau', value: '#c9c0b2', group: 'Flächen', use: 'Deaktivierte Buttons' },
  { id: '1.10', css: '--c-orange', name: 'Cheft-Orange', value: '#f06a2d', group: 'Marke', use: 'Primär-Button, Logo, Markierungen, Cheft-Badge, Kartenrücken A' },
  { id: '1.11', css: '--c-orange-dark', name: 'Orange dunkel', value: '#b94718', group: 'Marke', use: 'Überschriften, Akzenttext, Vorwahl-Rahmen, Cheft-Badge-Rahmen' },
  { id: '1.12', css: '--c-orange-pale', name: 'Orange blass', value: '#ffe3d2', group: 'Marke', use: 'Hover und Ablagezone, Leuchten um Karten, Balken im Punkteverlauf' },
  { id: '1.13', css: '--c-gold', name: 'Gold', value: '#f2b53a', group: 'Marke', use: 'Kreis und Namensschild des aktiven Spielers, Rückblick (Linie, Namensschild), Joker-Stern, Kronen, Nummern-Punkte' },
  { id: '1.14', css: '--c-red', name: 'Rot', value: '#d2362a', group: 'Signal', use: 'Gefahr-Button, Fehlermeldung, Herz und Karo' },
  { id: '1.15', css: '--c-green', name: 'Grün', value: '#4f9a6a', group: 'Signal', use: 'Frisch gezogene Karte, klaubarer Joker' },
  { id: '1.16', css: '--c-green-pale', name: 'Grün blass', value: '#d9ecd2', group: 'Signal', use: 'Balken des Rundensiegers im Punkteverlauf' },
  { id: '1.17', css: '--c-shell', name: 'App-Hülle', value: '#2e1d16', group: 'System und Überlagerung', use: 'Browser-Leiste (theme-color), Ladebild und Hintergrund der installierten App, Icon-Hintergrund' },
  { id: '1.18', css: '--c-scrim', name: 'Abdunkelung', value: 'rgba(60, 40, 20, 0.55)', group: 'System und Überlagerung', use: 'Hintergrund hinter Fenstern (Overlay)' },
  { id: '1.19', css: '--c-scrim-dark', name: 'Abdunkelung stark', value: 'rgba(30, 18, 12, 0.8)', group: 'System und Überlagerung', use: 'Tisch beim Rückblick auf Abwürfe' },
  { id: '1.20', css: '--c-skin-h', name: 'Haut Herz', value: '#e6be9a', group: 'Kartenkunst', use: 'Gesichter der Bildkarten in Herz (Nase und Lippen werden daraus per Formel berechnet)' },
  { id: '1.21', css: '--c-skin-d', name: 'Haut Karo', value: '#f5d5bb', group: 'Kartenkunst', use: 'Gesichter der Bildkarten in Karo' },
  { id: '1.22', css: '--c-skin-c', name: 'Haut Kreuz', value: '#edc4a3', group: 'Kartenkunst', use: 'Gesichter der Bildkarten in Kreuz' },
  { id: '1.23', css: '--c-skin-s', name: 'Haut Pik', value: '#f6e1d1', group: 'Kartenkunst', use: 'Gesichter der Bildkarten in Pik (die hellste Haut)' },
  { id: '1.24', css: '--c-white', name: 'Weiß', value: '#ffffff', group: 'Kartenkunst', use: 'Weiß der Bildkarten: Turbane, Schleier, Hermelin, Perlen, alle Pik-Haare (Juwelen und Falten per Formel)' },
  { id: '1.25', css: '--c-back-b', name: 'Rückseite B', value: '#4a4440', group: 'Kartenkunst', use: 'Kartenrücken des zweiten Decks (Muster darauf in Tinte)' },
  { id: '1.26', css: '--c-hair-h', name: 'Haar Herz', value: '#7a4526', group: 'Kartenkunst', use: 'Haar und Brauen der Bildkarten in Herz' },
  { id: '1.27', css: '--c-hair-d', name: 'Haar Karo', value: '#d7ad54', group: 'Kartenkunst', use: 'Haar, Bart und Brauen der Bildkarten in Karo (eine Farbe für die Familie)' },
  { id: '1.28', css: '--c-hair-c', name: 'Haar Kreuz', value: '#645144', group: 'Kartenkunst', use: 'Haar, Brauen und Schnurrbart der Bildkarten in Kreuz, davon abgeleitet der Falkenkörper' },
  { id: '1.29', css: '--c-hair-gray', name: 'Haar grau', value: '#ddd8cf', group: 'Kartenkunst', use: 'Haar, Bart und Brauen des Herz-Königs (begründete Ausnahme: Alter)' },
  { id: '1.30', css: '--c-eye-h', name: 'Auge Herz', value: '#6a3a14', group: 'Kartenkunst', use: 'Augen der Bildkarten in Herz (1 Pixel)' },
  { id: '1.31', css: '--c-eye-d', name: 'Auge Karo', value: '#3f7a3a', group: 'Kartenkunst', use: 'Augen der Bildkarten in Karo' },
  { id: '1.32', css: '--c-eye-c', name: 'Auge Kreuz', value: '#2f62a0', group: 'Kartenkunst', use: 'Augen der Bildkarten in Kreuz' },
  { id: '1.33', css: '--c-eye-s', name: 'Auge Pik', value: '#4a5a6e', group: 'Kartenkunst', use: 'Augen der Bildkarten in Pik (etwas dezenter)' },
  { id: '1.34', css: '--c-icon-line', name: 'Icon-Kontur', value: '#1c120d', group: 'App-Icon', use: 'Kartenkontur im App-Icon (PWA)' },
  { id: '1.35', css: '--c-icon-orange', name: 'Icon-Orange', value: '#e8521f', group: 'App-Icon', use: 'Buchstabe C und Ecke im App-Icon' },
  { id: '1.36', css: '--c-icon-paper', name: 'Icon-Papier', value: '#f6ecd6', group: 'App-Icon', use: 'Kartenfläche im App-Icon' },
];

export interface RoleToken {
  id: string;
  css: string;
  name: string;
  /** Name der Palette-Variable, auf die die Rolle zeigt. */
  ref: string;
  group: string;
  use: string;
}

/** 1.41–1.79: Rollen. Das Layout benutzt nur diese Namen. */
export const ROLE_COLORS: RoleToken[] = [
  { id: '1.41', css: '--text', name: 'Text', ref: '--c-brown', group: 'Text', use: 'Standardtext (Body, Regeln, Status)' },
  { id: '1.42', css: '--text-strong', name: 'Text stark', ref: '--c-ink', group: 'Text', use: 'Button-Text, Namen, Toast, Eingabefelder' },
  { id: '1.43', css: '--text-muted', name: 'Text gedämpft', ref: '--c-ink-soft', group: 'Text', use: 'Feldbeschriftungen, Hinweise, Stapel-Beschriftung, Badge' },
  { id: '1.44', css: '--text-accent', name: 'Text Akzent', ref: '--c-orange-dark', group: 'Text', use: 'Überschriften h2/h3, Rundenzähler, Info-Zeile, Tabellenkopf, Spielweise im Ergebnis' },
  { id: '1.45', css: '--text-brand', name: 'Text Marke', ref: '--c-orange', group: 'Text', use: 'Logo-Schriftzug (h1)' },
  { id: '1.46', css: '--text-on-accent', name: 'Text auf Fläche', ref: '--c-cream', group: 'Text', use: 'Schrift auf Orange, Dunkel, Rot und auf dem abgedunkelten Tisch' },
  { id: '1.47', css: '--text-danger', name: 'Text Fehler', ref: '--c-red', group: 'Text', use: 'Fehlermeldung (Toast)' },
  { id: '1.51', css: '--surface-page', name: 'Seite', ref: '--c-sand', group: 'Fläche', use: 'Seitenhintergrund (Schachbrett dunkel)' },
  { id: '1.52', css: '--surface-page-alt', name: 'Seite hell', ref: '--c-sand-light', group: 'Fläche', use: 'Seitenhintergrund (Schachbrett hell)' },
  { id: '1.53', css: '--surface-panel', name: 'Panel', ref: '--c-panel', group: 'Fläche', use: 'Panels, Dialoge, Buttons, Kopf- und Fußleisten, Toast, Sitzreihen in der Lobby' },
  { id: '1.54', css: '--surface-field', name: 'Feld', ref: '--c-cream', group: 'Fläche', use: 'Eingabefelder, Wahloptionen, Zähler auf dem Stapel' },
  { id: '1.55', css: '--surface-bar', name: 'Leiste', ref: '--c-sand-dark', group: 'Fläche', use: 'Handleiste, Aktionsleiste' },
  { id: '1.56', css: '--surface-chip', name: 'Chip', ref: '--c-sand', group: 'Fläche', use: 'Badge Rommé' },
  { id: '1.57', css: '--surface-highlight', name: 'Hervorhebung', ref: '--c-orange-pale', group: 'Fläche', use: 'Ablagezone, Hover auf Kombination, angetippte Wahloption, Balken im Punkteverlauf' },
  { id: '1.58', css: '--surface-disabled', name: 'Deaktiviert', ref: '--c-gray', group: 'Fläche', use: 'Deaktivierte Buttons' },
  { id: '1.59', css: '--surface-positive', name: 'Positiv', ref: '--c-green-pale', group: 'Fläche', use: 'Balken des Rundensiegers' },
  { id: '1.60', css: '--surface-dark', name: 'Dunkel', ref: '--c-ink', group: 'Fläche', use: 'Dunkler Button (Cheft, Zurücklegen)' },
  { id: '1.61', css: '--surface-accent', name: 'Akzent', ref: '--c-orange', group: 'Fläche', use: 'Primär-Button, Cheft-Badge, Zählerchip beim Ziehen' },
  { id: '1.62', css: '--surface-danger', name: 'Gefahr', ref: '--c-red', group: 'Fläche', use: 'Gefahr-Button' },
  { id: '1.63', css: '--surface-gold', name: 'Gold', ref: '--c-gold', group: 'Fläche', use: 'Namensschild des aktiven Spielers, Namensschild im Rückblick, Nummern-Punkte' },
  { id: '1.64', css: '--line', name: 'Linie', ref: '--c-ink', group: 'Linie', use: 'Standardrahmen, Trennlinien der Leisten' },
  { id: '1.65', css: '--line-soft', name: 'Linie weich', ref: '--c-sand-dark', group: 'Linie', use: 'Tabellenlinien, Zeilentrenner, Badge-Rahmen' },
  { id: '1.66', css: '--line-muted', name: 'Linie gedämpft', ref: '--c-ink-soft', group: 'Linie', use: 'Rahmen deaktivierter Buttons' },
  { id: '1.67', css: '--line-accent', name: 'Linie Akzent', ref: '--c-orange-dark', group: 'Linie', use: 'Cheft-Badge-Rahmen' },
  { id: '1.68', css: '--line-danger', name: 'Linie Fehler', ref: '--c-red', group: 'Linie', use: 'Toast-Rahmen bei Fehlern' },
  { id: '1.71', css: '--accent', name: 'Akzent', ref: '--c-orange', group: 'Markierung', use: 'Ausgewählte Karte, Ablagezone, Auswahl-Rahmen' },
  { id: '1.72', css: '--mark-temp', name: 'Vorübergehende Karte', ref: '--c-red', group: 'Markierung', use: 'Roter Rand: Karte, die nur vorübergehend auf der Hand ist (Ablagekarte als Rommé-Spieler, Teppichkarte, geklauter Joker) und noch verwendet werden muss' },
  { id: '1.73', css: '--accent-halo', name: 'Leuchten', ref: '--c-orange-pale', group: 'Markierung', use: 'Leuchten um die gewählte Kartenrückseite in den Einstellungen' },
  { id: '1.74', css: '--accent-gold', name: 'Gold', ref: '--c-gold', group: 'Markierung', use: 'Rückblick-Linie und Karten-Rahmen' },
  { id: '1.75', css: '--positive', name: 'Positiv', ref: '--c-green', group: 'Markierung', use: 'Frisch gezogene Karte, Joker zum Klauen' },
  { id: '1.76', css: '--shadow-solid', name: 'Schatten hart', ref: '--c-ink', group: 'Schatten', use: 'Schatten der Buttons' },
  { id: '1.77', css: '--shadow-soft', name: 'Schatten weich', ref: '--c-sand-dark', group: 'Schatten', use: 'Schatten von Panels, Karten, Toast, Überschrift' },
  { id: '1.78', css: '--scrim', name: 'Abdunkelung', ref: '--c-scrim', group: 'Überlagerung', use: 'Hintergrund hinter Fenstern' },
  { id: '1.79', css: '--scrim-dark', name: 'Abdunkelung stark', ref: '--c-scrim-dark', group: 'Überlagerung', use: 'Tisch beim Rückblick' },
];

// ---------------------------------------------------------------- 2 Typografie
export interface ValueToken {
  id: string;
  css: string;
  name: string;
  value: string;
  use: string;
}

/** Schriftarten. VT323 ist die Textschrift, Tiny5 Duo Bold (700) die Überschriftenschrift. */
export const FONT_TOKENS: ValueToken[] = [
  { id: '2.01', css: '--font-body', name: 'Textschrift', value: "'VT323', 'Courier New', monospace", use: 'Alle Texte, Buttons, Tabellen, Eingaben' },
  { id: '2.02', css: '--font-head', name: 'Überschriftenschrift', value: "'Tiny5 Duo', 'VT323', monospace", use: 'Logo, h2, h3, Rückblick-Banner' },
];

/** Schriftschnitte, die tatsächlich geladen sind (main.ts) bzw. synthetisch erzeugt werden. */
export const WEIGHT_TOKENS: ValueToken[] = [
  { id: '2.03', css: '--fw-regular', name: 'Normal (400)', value: '400', use: 'VT323: alle Texte' },
  { id: '2.04', css: '--fw-head', name: 'Fett (700)', value: '700', use: 'Tiny5 Duo Bold: alle Überschriften (800 ExtraBold wäre eine Zeile hier plus Schnitt in styles.css)' },
  { id: '2.05', css: '--fw-bold', name: 'Fett (synthetisch)', value: 'bold', use: 'Vom Browser erzeugtes Fett: Sieger-Zeile in der Auswertung (VT323 hat kein eigenes Fett)' },
];

/** 2.11–2.16: Schriftgrößen in u. */
export const FONT_SIZES: { id: string; css: string; name: string; units: number; use: string }[] = [
  { id: '2.11', css: '--fs-display', name: 'Display', units: 22, use: 'Logo-Schriftzug (h1)' },
  { id: '2.12', css: '--fs-title', name: 'Titel', units: 12, use: 'Fenster- und Seitentitel (h2), Rückblick-Banner' },
  { id: '2.13', css: '--fs-body', name: 'Text', units: 10, use: 'Standardtext, Buttons, Eingaben, Zwischenüberschrift (h3), Zähler auf dem Stapel' },
  { id: '2.14', css: '--fs-label', name: 'Label', units: 9, use: 'Status-Zeile, Auswertungstabelle, Toast, Spielername am Sitz' },
  { id: '2.15', css: '--fs-caption', name: 'Hinweis', units: 8, use: 'Hinweise, Sitz-Beschriftung, Info-Zeile, Namensschild im Rückblick, Zählerchip beim Ziehen' },
  { id: '2.16', css: '--fs-micro', name: 'Mikro', units: 7, use: 'Badge, Stapel-Beschriftung, Faktoren und Zuwachs in Tabellen, „genommen von“' },
];

export const TYPE_MISC_TOKENS: ValueToken[] = [
  { id: '2.21', css: '--lh-base', name: 'Zeilenhöhe', value: '1.2', use: 'Alle Texte und Buttons' },
  { id: '2.22', css: '--lh-chip', name: 'Zeilenhöhe Chip', value: '1.4', use: 'Badge, Namensschild im Rückblick' },
  { id: '2.23', css: '--ls-head', name: 'Laufweite Überschrift', value: u(1), use: 'Alle Überschriften (1 u)' },
  { id: '2.24', css: '--ls-code', name: 'Laufweite Code', value: u(2), use: 'Raumcode-Feld (2 u)' },
];

// ---------------------------------------------------------------- 3 Maße
/** 3.01: Hauptmaßstab. */
export const SCALE_TOKENS = {
  id: '3.01',
  /** [Bedingung, --s, --so, Beschreibung] */
  rules: [
    { media: null as string | null, s: 2, so: 1, name: 'Handy (Standard)' },
    { media: '(min-width: 700px) and (max-width: 999px), (min-width: 1000px) and (max-height: 859px)', s: 2, so: 2, name: 'Tablet, flacher Desktop' },
    { media: '(min-width: 1000px) and (min-height: 860px)', s: 3, so: 2, name: 'Großer Desktop' },
  ],
};

/** 3.05–3.07: Umschaltpunkte der Oberfläche. */
export const BREAKPOINTS = {
  /** Unterhalb entfällt das Wort „Runde“ in der Kopfzeile. */
  compact: 520,
  /** Ab hier sieht man die verdeckten Handkarten der Mitspieler als Fächer. */
  fan: 900,
  /** Im flachen Querformat (Handy) überlagert der Fächer die Symbole in den Ecken, darum erst ab dieser Höhe. */
  fanHeight: 520,
};
export const BREAKPOINT_TOKENS: ValueToken[] = [
  { id: '3.05', css: '--bp-compact', name: 'Kompakt', value: `${BREAKPOINTS.compact}px`, use: 'Darunter: „Runde“ in der Kopfzeile ausgeblendet, nur „1/7“' },
  { id: '3.06', css: '--bp-fan', name: 'Fächer', value: `${BREAKPOINTS.fan}px`, use: 'Ab hier: verdeckte Handkarten der Mitspieler sichtbar' },
];

/** 3.11–3.18: Abstandsskala. Jede Stufe heißt nach ihren u. */
export const SPACING_SCALE: { id: string; css: string; units: number }[] = [
  { id: '3.11', css: '--sp-1', units: 1 },
  { id: '3.12', css: '--sp-2', units: 2 },
  { id: '3.13', css: '--sp-3', units: 3 },
  { id: '3.14', css: '--sp-4', units: 4 },
  { id: '3.15', css: '--sp-5', units: 5 },
  { id: '3.16', css: '--sp-6', units: 6 },
  { id: '3.17', css: '--sp-8', units: 8 },
  { id: '3.18', css: '--sp-16', units: 16 },
];

/** 3.21–3.49: Abstands-Rollen. Wer ändern will, ändert hier den Verweis auf die Skala. */
export const SPACING_ROLES: { id: string; css: string; name: string; ref: string; use: string }[] = [
  { id: '3.21', css: '--gap-stack', name: 'Abstand Stapel', ref: '--sp-4', use: 'Zwischen Knöpfen und Feldern untereinander in Panel, Dialog und Menü-Gruppe' },
  { id: '3.22', css: '--gap-group', name: 'Zusatz zwischen Gruppen', ref: '--sp-6', use: 'Kommt zum Stapelabstand dazu: Menü-Gruppen und über „Zurück“ (zusammen 10 u)' },
  { id: '3.23', css: '--gap-row', name: 'Abstand Reihe', ref: '--sp-3', use: 'Zwischen Knöpfen nebeneinander (btn-row), in Zeilen mit Feld und Knopf, Bot-Auswahl, Kopfleiste' },
  { id: '3.24', css: '--gap-tight', name: 'Abstand eng', ref: '--sp-2', use: 'Wahlknöpfe (an/aus), Aktionsleiste, Sitzbeschriftung, Karten untereinander' },
  { id: '3.25', css: '--gap-hair', name: 'Abstand haar', ref: '--sp-1', use: 'Feldbeschriftung über ihren Knöpfen, Tabellenzeilen, Karten in der Restkarten-Reihe' },
  { id: '3.26', css: '--gap-screen', name: 'Abstand Seitenelemente', ref: '--sp-6', use: 'Menü: zwischen Logo und Panel' },
  { id: '3.27', css: '--pad-screen', name: 'Rand Seite', ref: '--sp-8', use: 'Außenrand der Menü-Seiten' },
  { id: '3.28', css: '--pad-panel', name: 'Innenrand Panel', ref: '--sp-5', use: 'Panels und Dialoge' },
  { id: '3.29', css: '--pad-overlay', name: 'Rand Fenster', ref: '--sp-6', use: 'Außenrand um Fenster auf der Abdunkelung' },
  { id: '3.30', css: '--pad-btn-y', name: 'Innenrand Button oben/unten', ref: '--sp-2', use: 'Alle Buttons' },
  { id: '3.31', css: '--pad-btn-x', name: 'Innenrand Button links/rechts', ref: '--sp-5', use: 'Alle Buttons (Aktionsleiste: 2 u)' },
  { id: '3.32', css: '--pad-input-y', name: 'Innenrand Feld oben/unten', ref: '--sp-2', use: 'Eingabefelder' },
  { id: '3.33', css: '--pad-input-x', name: 'Innenrand Feld links/rechts', ref: '--sp-3', use: 'Eingabefelder' },
  { id: '3.34', css: '--pad-bar-y', name: 'Innenrand Leiste oben/unten', ref: '--sp-3', use: 'Aktionsleiste, Fußleiste, Handleiste oben' },
  { id: '3.35', css: '--pad-bar-x', name: 'Innenrand Leiste links/rechts', ref: '--sp-4', use: 'Aktionsleiste, Fußleiste, Handleiste, Kopfleiste' },
  { id: '3.36', css: '--pad-status-x', name: 'Innenrand Status', ref: '--sp-5', use: 'Status-Zeile links/rechts' },
  { id: '3.37', css: '--pad-toast-x', name: 'Innenrand Toast', ref: '--sp-5', use: 'Toast links/rechts (oben/unten 3 u)' },
];

/** 3.51–3.59: Rahmen, Schatten und Linien. */
export const BORDER_TOKENS: ValueToken[] = [
  { id: '3.51', css: '--bw', name: 'Rahmenstärke', value: u(1), use: 'Rahmen aller Panels, Buttons, Felder, Karten-Rückblick (1 u)' },
  { id: '3.52', css: '--bw-mark', name: 'Markierungsstärke', value: u(2), use: 'Auswahl, Leuchten, rote Markierung vorübergehender Karten, Ablagezone (2 u)' },
  { id: '3.54', css: '--radius', name: 'Eckenradius', value: '0', use: 'Keine abgerundeten Ecken (Pixel-Look). Die Kartenecken sind in den Sprites abgerundet' },
  { id: '3.55', css: '--sh-btn', name: 'Schatten Button', value: `${u(1)} ${u(1)} 0 var(--shadow-solid)`, use: 'Buttons (gedrückt: kein Schatten, 1 u verschoben)' },
  { id: '3.56', css: '--sh-panel', name: 'Schatten Panel', value: `${u(2)} ${u(2)} 0 var(--shadow-soft)`, use: 'Panels, Dialoge, Toast, gezogener Sitz in der Lobby' },
  { id: '3.57', css: '--sh-card', name: 'Schatten Karte', value: `${u(1)} ${u(1)} 0 var(--shadow-soft)`, use: 'Stapel, Teppichkarte, Ablage' },
  { id: '3.58', css: '--sh-heading', name: 'Schatten Schrift', value: `${u(1)} ${u(1)} 0 var(--shadow-soft)`, use: 'Logo-Schriftzug (text-shadow)' },
  { id: '3.59', css: '--sh-halo', name: 'Leuchten', value: `0 0 0 ${u(4)} var(--accent-halo)`, use: 'Gewählte Kartenrückseite in den Einstellungen (4 u breit)' },
];

/** 3.61–3.69: Wirkung auf Karten. */
export const EFFECT_TOKENS: ValueToken[] = [
  { id: '3.68', css: '--op-dot', name: 'Deckkraft Nummern-Punkt', value: '0.85', use: 'Gelber Punkt unten links am Element („Nummern im Spiel“)' },
  { id: '3.61', css: '--filter-dim', name: 'Abblenden', value: 'grayscale(0.5) contrast(0.6) brightness(1.08)', use: 'Nicht gewählte Kartenrückseiten in den Einstellungen (ohne Durchscheinen)' },
  { id: '3.62', css: '--op-drag', name: 'Deckkraft beim Ziehen', value: '0.92', use: 'Karte unter dem Finger' },
  { id: '3.63', css: '--scale-drag', name: 'Vergrößerung beim Ziehen', value: '1.05', use: 'Karte unter dem Finger' },
  { id: '3.64', css: '--op-taken', name: 'Deckkraft genommen', value: '0.55', use: 'Im Rückblick: Karte, die schon jemand genommen hat' },
  { id: '3.65', css: '--op-peek-line', name: 'Deckkraft Rückblick-Linie', value: '0.8', use: 'Gestrichelte Linie von der Ablage zum Namensschild' },
  { id: '3.66', css: '--lift-selected', name: 'Anheben', value: u(6), use: 'Markierte Handkarte schiebt sich nach oben (6 u)' },
  { id: '3.67', css: '--rot-logo', name: 'Neigung Logo-Karten', value: '6deg', use: 'Linke und rechte Karte im Logo (mittlere gerade)' },
];

/**
 * 3.71–3.78: Basismaße der Karten in echten Bildschirm-Pixeln des Sprites (unskaliert).
 * Die Mitspieler-Karten werden im CSS aus diesen Werten mal --so berechnet (nicht aus --card-w), weil --so je Sitz
 * überschrieben werden kann (layoutTable).
 */

export interface SizeToken {
  id: string;
  css: string;
  name: string;
  /** Zahl: in u (mal --s). 'px': feste Pixel. Wenn "of" gesetzt ist, wird der Wert aus dieser Variable mal --s berechnet. */
  units?: number;
  px?: number;
  of?: string;
  use: string;
}

/** 3.71–3.115: Maße einzelner Elemente. */
export const SIZE_TOKENS: SizeToken[] = [
  { id: '3.71', css: '--px-card-w', name: 'Karte Breite (Basis)', px: CARD_PX.w, use: 'Sprite-Grundmaß 32 × 44 Pixel; auch die Mini-Karten in Auswahl und Auswertung (1×)' },
  { id: '3.72', css: '--px-card-h', name: 'Karte Höhe (Basis)', px: CARD_PX.h, use: 'dito' },
  { id: '3.73', css: '--px-atlas-w', name: 'Atlas Breite (Basis)', px: CARD_PX.atlasW, use: 'Sprite-Atlas: 8 Spalten × 32 Pixel' },
  { id: '3.74', css: '--px-atlas-h', name: 'Atlas Höhe (Basis)', px: CARD_PX.atlasH, use: 'Sprite-Atlas: 9 Zeilen × 44 Pixel' },
  { id: '3.75', css: '--px-ov-meld', name: 'Überlappung Kombination (Basis)', px: -18, use: 'Karten einer Auslage; auch Mini-Karten in „Wie auslegen?“' },
  { id: '3.76', css: '--px-ov-pair', name: 'Überlappung Paar (Basis)', px: -20, use: 'Cheft-Paar' },
  { id: '3.77', css: '--px-ov-fan', name: 'Überlappung Fächer (Basis)', px: -26, use: 'Verdeckte Handkarten der Mitspieler' },
  { id: '3.78', css: '--px-ov-mini-back', name: 'Überlappung Mini-Rücken', px: -22, use: 'Verdeckte Restkarten in der Auswertung' },
  { id: '3.79', css: '--card-w', name: 'Karte Breite', of: '--px-card-w', use: 'Handkarten (Basis × --s). Tischmitte (Stapel, Ablage, Teppichkarte): Basis × --sc, im Bereich .center neu berechnet. Alle Auslagen, auch die eigene: Basis × --so (Klasse .o)' },
  { id: '3.80', css: '--card-h', name: 'Karte Höhe', of: '--px-card-h', use: 'dito' },
  { id: '3.81', css: '--atlas-w', name: 'Atlas Breite', of: '--px-atlas-w', use: 'Hintergrundgröße der Karten (Basis × --s)' },
  { id: '3.82', css: '--atlas-h', name: 'Atlas Höhe', of: '--px-atlas-h', use: 'dito' },
  { id: '3.83', css: '--ov-meld', name: 'Überlappung Kombination', of: '--px-ov-meld', use: 'Karten einer eigenen Auslage' },
  { id: '3.84', css: '--ov-pair', name: 'Überlappung Paar', of: '--px-ov-pair', use: 'Cheft-Paar in der eigenen Auslage' },
  { id: '3.86', css: '--w-menu', name: 'Breite Menü-Panel', units: 170, use: 'Panels der Menü-Seiten' },
  { id: '3.87', css: '--w-dialog', name: 'Breite Dialog', units: 230, use: 'Alle Fenster (Overlay)' },
  { id: '3.88', css: '--w-rules', name: 'Breite Lesespalte', units: 360, use: 'Regeln und Design Guide (ca. 65 Zeichen)' },
  { id: '3.89', css: '--w-input', name: 'Breite Eingabefeld', units: 120, use: 'Texteingaben (höchstens)' },
  { id: '3.90', css: '--w-input-name', name: 'Breite Namensfeld', units: 90, use: 'Eigener Name in Lobby und Einstellungen' },
  { id: '3.111', css: '--size-dot', name: 'Größe Nummern-Punkt', units: 5, use: 'Gelber Punkt unten links am Element („Nummern im Spiel“)' },
  { id: '3.91', css: '--w-input-code', name: 'Breite Codefeld', units: 50, use: 'Raumcode' },
  { id: '3.92', css: '--size-btn-icon', name: 'Größe Icon-Button', units: 14, use: 'Quadratische Buttons (Punkte, Regeln, Zahnrad, Entfernen)' },
  { id: '3.93', css: '--size-icon-glyph', name: 'Größe Piktogramm', units: 10, use: 'Pixel-Piktogramm im Icon-Button (10 × 10 Pixel)' },
  { id: '3.112', css: '--size-icon-status', name: 'Größe Statussymbol', units: 12, use: 'Funksymbol „Verbindung verloren“ hinter Namen (12 × 12 Pixel)' },
  { id: '3.94', css: '--size-handle', name: 'Größe Griff', units: 9, use: 'Sortier-Griff in der Lobby' },
  { id: '3.95', css: '--pile-gap', name: 'Abstand Stapel–Ablage', units: 16, use: 'Zwischen den beiden Spalten in der Tischmitte' },
  { id: '3.96', css: '--stock-shift', name: 'Versatz Stapel', units: 14, use: 'Stapel und Beschriftung nach rechts, damit die Teppichkarte links Platz hat' },
  { id: '3.97', css: '--carpet-shift', name: 'Versatz Teppichkarte', units: -15, use: 'Teppichkarte quer unter dem Stapel' },
  { id: '3.98', css: '--discard-pad-x', name: 'Ablage Zusatzbreite', units: 24, use: 'Ablage ist breiter als eine Karte (Karten liegen verstreut)' },
  { id: '3.99', css: '--discard-pad-y', name: 'Ablage Zusatzhöhe', units: 18, use: 'dito' },
  { id: '3.100', css: '--discard-x', name: 'Ablage Versatz links', units: 12, use: 'Oberste Karte in der Ablage' },
  { id: '3.101', css: '--discard-y', name: 'Ablage Versatz oben', units: 9, use: 'dito' },
  { id: '3.102', css: '--count-size', name: 'Größe Zähler auf Stapel', units: 14, use: 'Kästchen mit der Restzahl (ab 7 Karten)' },
  { id: '3.103', css: '--count-x', name: 'Zähler Position links', units: 9, use: 'Kästchen auf dem Stapel' },
  { id: '3.104', css: '--count-y', name: 'Zähler Position oben', units: 15, use: 'Kästchen auf dem Stapel' },
  { id: '3.105', css: '--status-h', name: 'Mindesthöhe Status-Zeile', units: 13, use: 'Status-Zeile' },
  { id: '3.106', css: '--hand-gap', name: 'Handhöhe Zusatz', units: 8, use: 'Luft unter der Handkarte bei einzeiliger Hand (zweizeilig: 4 u zwischen den Zeilen)' },
  { id: '3.107', css: '--tile', name: 'Schachbrett', units: 8, use: 'Kachelgröße des Seitenhintergrunds' },
  { id: '3.108', css: '--peek-top', name: 'Rückblick-Banner oben', units: 10, use: 'Abstand des Rückblick-Banners vom oberen Rand' },
  { id: '3.109', css: '--toast-bottom', name: 'Toast unten', units: 90, use: 'Abstand des Toasts vom unteren Rand' },
];

/** 3.121–3.127: Ebenen (z-index). */
export const Z_TOKENS: ValueToken[] = [
  { id: '3.121', css: '--z-lift', name: 'Angehoben', value: '5', use: 'Kopfleiste, gezogener Sitz in der Lobby' },
  { id: '3.122', css: '--z-fly', name: 'Flugkarte', value: '50', use: 'Karten, die über den Tisch fliegen (Animation)' },
  { id: '3.123', css: '--z-overlay', name: 'Fenster', value: '60', use: 'Fenster, Dialoge, Fußleiste nach der Runde' },
  { id: '3.124', css: '--z-peek', name: 'Rückblick', value: '70', use: 'Abgedunkelter Tisch mit Abwürfen' },
  { id: '3.125', css: '--z-toast', name: 'Toast', value: '80', use: 'Meldungen, immer ganz oben' },
  { id: '3.126', css: '--z-labels', name: 'Nummern-Punkte', value: '90', use: 'Punkte und Anzeige des Design Guides („Nummern im Spiel“)' },
  { id: '3.127', css: '--z-drag', name: 'Gezogene Karte', value: '100', use: 'Handkarte unter dem Finger' },
];

// ---------------------------------------------------------------- 3.131–3.142 Bewegung
/** Zeiten in Millisekunden; auch das Skript liest sie hier. */
export const MOTION = {
  /** Karte rückt in der Hand an ihren Platz. */
  handShift: 120,
  /** Karte fliegt (Ziehen, Ablegen, Auslegen). */
  fly: 260,
  /** Austeil-Karte fliegt. */
  dealFly: 280,
  /** Abstand zwischen zwei ausgeteilten Karten. */
  dealStep: 70,
  /** Langes Drücken auf die Ablage bis zum Rückblick. */
  peekHold: 380,
  /** Rückblick-Karte gleitet ein. */
  peekIn: 240,
  /** Versatz zwischen zwei Rückblick-Karten. */
  peekStagger: 70,
  /** Rückblick blendet aus. */
  peekOut: 120,
  /** Sperrzeit nach dem Rückblick, damit das Loslassen nichts zieht. */
  peekGuard: 350,
  /** Toast bleibt stehen. */
  toast: 3200,
  /** Zwei Tipps auf die Ablage gelten als Doppeltipp. */
  doubleTap: 500,
};
export const MOTION_TOKENS: { id: string; key: keyof typeof MOTION; name: string; use: string }[] = [
  { id: '3.131', key: 'handShift', name: 'Hand sortiert um', use: 'Übergang left/top der Handkarten (CSS --dur-hand)' },
  { id: '3.132', key: 'fly', name: 'Karte fliegt', use: 'Alle Kartenbewegungen am Tisch' },
  { id: '3.133', key: 'dealFly', name: 'Austeilen: Flug', use: 'Eine Karte beim Austeilen' },
  { id: '3.134', key: 'dealStep', name: 'Austeilen: Takt', use: 'Abstand zwischen zwei Karten' },
  { id: '3.135', key: 'peekHold', name: 'Rückblick: Halten', use: 'So lange drücken, bis der Rückblick erscheint' },
  { id: '3.136', key: 'peekIn', name: 'Rückblick: Einblenden', use: 'Karten gleiten von der Ablage zum Namensschild' },
  { id: '3.137', key: 'peekStagger', name: 'Rückblick: Staffelung', use: 'Versatz zwischen zwei Karten' },
  { id: '3.138', key: 'peekOut', name: 'Rückblick: Ausblenden', use: 'Ausblenden des Rückblicks' },
  { id: '3.139', key: 'peekGuard', name: 'Rückblick: Sperre', use: 'Wartezeit nach dem Rückblick, bis wieder gezogen werden kann' },
  { id: '3.140', key: 'toast', name: 'Toast: Dauer', use: 'So lange bleibt eine Meldung stehen' },
  { id: '3.142', key: 'doubleTap', name: 'Doppeltipp', use: 'Zeitfenster für zwei Tipps auf die Ablage (Cheft ansagen)' },
];

/**
 * 3.145: Kreis des aktiven Spielers. Durchmesser = (Breite + Höhe des Spielfelds) ÷ 2 ÷ φ ÷ φ, Mitte auf der Spielfeldkante
 * bei diesem Spieler, Farbe Gold (--c-gold), ganz hinten, mit Pixelkante auf dem Raster von 1 u.
 */
export const TURN_DISC = { phi: 1.618 };

/** 3.143: Beschleunigungskurve aller Kartenflüge und des Rückblicks. */
export const EASE_FLY = 'cubic-bezier(.2,.8,.3,1)';
/** 3.144: Startgröße der Rückblick-Karten, bevor sie einblenden. */
export const PEEK_FROM_SCALE = 0.92;

/** 3.151–3.154: Raster der Handkarten (in u). Das Skript (layoutHand) und die Hand-Höhe im CSS lesen dieselben Werte. */
export const HAND = {
  /** Kleinster Abstand zwischen zwei Handkarten; darunter bricht die Hand auf zwei Zeilen um. */
  minStep: 15,
  /** Größter Abstand: Kartenbreite plus dieser Wert. */
  maxOver: 2,
  /** Abstand der Karten vom oberen Rand der Hand (Platz zum Anheben). */
  top: 6,
  /** Abstand zwischen den zwei Zeilen. */
  rowGap: 4,
};
export const HAND_TOKENS: { id: string; css: string; key: keyof typeof HAND; name: string; use: string }[] = [
  { id: '3.151', css: '--hand-step-min', key: 'minStep', name: 'Hand: kleinster Abstand', use: 'Darunter zweizeilig' },
  { id: '3.152', css: '--hand-step-over', key: 'maxOver', name: 'Hand: größter Abstand', use: 'Kartenbreite + 2 u' },
  { id: '3.153', css: '--hand-top', key: 'top', name: 'Hand: Abstand oben', use: 'Platz zum Anheben markierter Karten (6 u)' },
  { id: '3.154', css: '--hand-row-gap', key: 'rowGap', name: 'Hand: Zeilenabstand', use: 'Zwischen den zwei Zeilen (4 u)' },
];

// ---------------------------------------------------------------- Ausgabe
function scaleCss(): string {
  const [base, ...rest] = SCALE_TOKENS.rules;
  const lines = [`:root { --s: ${base.s}; --so: ${base.so}; }`];
  for (const r of rest) lines.push(`@media ${r.media} { :root { --s: ${r.s}; --so: ${r.so}; } }`);
  return lines.join('\n');
}

/** Alle CSS-Variablen als Liste von [Name, Wert]. */
export function tokenVars(): [string, string][] {
  const v: [string, string][] = [];
  for (const c of PALETTE_COLORS) v.push([c.css, c.value]);
  for (const r of ROLE_COLORS) v.push([r.css, `var(${r.ref})`]);
  for (const f of [...FONT_TOKENS, ...WEIGHT_TOKENS, ...TYPE_MISC_TOKENS, ...BREAKPOINT_TOKENS, ...BORDER_TOKENS, ...EFFECT_TOKENS, ...Z_TOKENS]) v.push([f.css, f.value]);
  for (const f of FONT_SIZES) v.push([f.css, u(f.units)]);
  for (const s of SPACING_SCALE) v.push([s.css, u(s.units)]);
  for (const r of SPACING_ROLES) v.push([r.css, `var(${r.ref})`]);
  for (const s of SIZE_TOKENS) {
    if (s.px !== undefined) v.push([s.css, `${s.px}px`]);
    else if (s.of) v.push([s.css, `calc(var(${s.of}) * var(--s))`]);
    else v.push([s.css, u(s.units!)]);
  }
  for (const h of HAND_TOKENS) v.push([h.css, u(HAND[h.key])]);
  v.push(['--dur-hand', `${MOTION.handShift}ms`]);
  return v;
}

/**
 * Maße der Tischmitte (Stapel, Ablage, Teppichkarte): Sie haben eine eigene Stufe (--sc, von der Tischlogik je Bildschirm gesetzt).
 * Im Bereich `.center` gilt darum --s = --sc, und diese Maße werden dort neu berechnet (benutzerdefinierte Variablen erben ihren
 * berechneten Wert, sie rechnen nicht selbst nach).
 */
export const CENTER_VARS = ['--card-w', '--card-h', '--atlas-w', '--atlas-h', '--pile-gap', '--stock-shift', '--carpet-shift', '--discard-pad-x', '--discard-pad-y', '--discard-x', '--discard-y', '--count-size', '--count-x', '--count-y'];

/** Kompletter CSS-Text mit allen Variablen (und den Umschaltpunkten, die keine Variablen können). */
export function tokensCss(): string {
  const all = tokenVars();
  const vars = all.map(([k, val]) => `  ${k}: ${val};`).join('\n');
  const centerVars = all
    .filter(([k]) => CENTER_VARS.includes(k))
    .map(([k, val]) => `  ${k}: ${val};`)
    .join('\n');
  return [
    ':root {',
    vars,
    '}',
    '.center {',
    '  --s: var(--sc);',
    centerVars,
    '}',
    scaleCss(),
    `@media (max-width: ${BREAKPOINTS.compact}px) { .topbar .rl { display: none; } }`,
    '',
  ].join('\n');
}

/** Hängt die Variablen an die Seite und setzt die Browser-Leistenfarbe. Muss vor dem ersten Rendern laufen. */
export function installTokens(): void {
  const style = document.createElement('style');
  style.id = 'design-tokens';
  style.textContent = tokensCss();
  document.head.appendChild(style);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colorValue('--c-shell'));
}

/** Wert einer Palette-Farbe über den CSS-Namen (z. B. '--c-ink'). */
export function colorValue(css: string): string {
  const c = PALETTE_COLORS.find((x) => x.css === css);
  if (!c) throw new Error(`Unbekannte Farbe ${css}`);
  return c.value;
}

/** Kurzform für Skripte und Sprites: Farbe nach Palette-Name ohne Präfix, z. B. color('ink'). */
export function color(name: string): string {
  return colorValue(`--c-${name}`);
}

/** Alle nummerierten Token, flach (für Prüfungen und Suche). */
export function allTokenIds(): string[] {
  return [
    ...PALETTE_COLORS.map((x) => x.id),
    ...ROLE_COLORS.map((x) => x.id),
    ...FONT_TOKENS.map((x) => x.id),
    ...WEIGHT_TOKENS.map((x) => x.id),
    ...FONT_SIZES.map((x) => x.id),
    ...TYPE_MISC_TOKENS.map((x) => x.id),
    SCALE_TOKENS.id,
    ...BREAKPOINT_TOKENS.map((x) => x.id),
    ...SPACING_SCALE.map((x) => x.id),
    ...SPACING_ROLES.map((x) => x.id),
    ...BORDER_TOKENS.map((x) => x.id),
    ...EFFECT_TOKENS.map((x) => x.id),
    ...SIZE_TOKENS.map((x) => x.id),
    ...Z_TOKENS.map((x) => x.id),
    ...MOTION_TOKENS.map((x) => x.id),
    '3.143',
    '3.144',
    '3.145',
    ...HAND_TOKENS.map((x) => x.id),
  ];
}
