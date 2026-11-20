/**
 * Cheats für das Solospiel: Eingabe (Parser) und Austeilen mit Wunschkarten.
 *
 * Grundsätze:
 * - Ein Cheat verändert nur den Startzustand des menschlichen Platzes (Hand, Auslage, Teppichkarte) oder bietet Komfort.
 *   Regelprüfungen, Gegner und Nachziehstapel bleiben unberührt: Alles, was ein Cheat braucht, wird aus dem gemischten Deck
 *   genommen (nie neu erzeugt). Die Karten im Spiel sind also immer genau die des Decks.
 * - Cheats liegen in `GameState.cheats`, nie in den Einstellungen. Der Server kennt sie nicht (siehe server/room.ts).
 *
 * Eingabe: Cheat-Wörter in beliebiger Reihenfolge, durch Leerzeichen (auch Komma, Semikolon) getrennt. Parameter stehen direkt
 * hinter dem Wort. `HAND( … )` enthält die Wunschhand: Runden durch `/` getrennt, leer = Zufallsrunde. Ohne Klammern läuft die
 * Hand bis zum Ende des Textes. Namen siehe cheatnames.ts.
 */
import { ALL_RANKS, Card, DeckConfig, MINI_RANKS, STANDARD_DECK, SUITS, Suit, deckSize, isJoker, rankValue, shuffle, makeRng } from './cards';
import { Meld, meldAugen } from './melds';
import type { BotStyle } from './game';
import { CHEAT_NAMES, CHEAT_MESSAGES, CheatId, JOKER_CARD_NAMES, PRESET_NAMES, PresetId, ROLE_NAMES } from './cheatnames';

export const HAND_SIZE = 14;
export const MAX_ROUNDS = 999;

export interface CardSpec {
  suit: Suit | 'J';
  rank: number;
}

/** Eine Runde der Wunschhand: Karten, optional auf Basis einer Testhand. */
export interface HandLine {
  cards: CardSpec[];
  preset?: PresetId;
}

export interface Cheats {
  /** Platz des Spielers, für den die Cheats gelten (solo immer 0). */
  seat: number;
  /** So viele Joker mindestens auf der Hand, jede Runde. */
  jokers?: number;
  /** Wunschhand je Runde (Index 0 = Runde 1); null = Zufallsrunde. */
  hand?: (HandLine | null)[];
  rounds?: number;
  /** Start mit ausgelegter Kombination samt Joker. */
  laidOut?: boolean;
  /** Teppichkarte ist die zweite Kopie einer Handkarte. */
  carpet?: boolean;
  /** Autoplay mit Einzelschritt; Rolle des Bots. */
  autoplay?: { role: BotStyle };
  /** Zeitreise: unbegrenzt zurück. */
  timeTravel?: boolean;
  /** Mindestaugen für die Erstmeldung ohne und mit Cheft-Ansage. */
  firstMeld?: { base: number; cheft: number };
  /** Deck: jede Karte so viel mal öfter als im Standardspiel (2, 3, 4), Joker entsprechend mehr. */
  deckMult?: 2 | 3 | 4;
  /** Genau so viele Joker im Deck (überstimmt die Joker des Deck-Faktors). */
  jokerParty?: number;
  /** Mini-Deck (7 bis Ass). */
  mini?: boolean;
}

/** Die Deck-Zusammensetzung dieses Spiels (ohne Cheats: das Standardspiel). */
export function deckConfigOf(cheats?: Cheats): DeckConfig {
  if (!cheats || (!cheats.deckMult && cheats.jokerParty === undefined && !cheats.mini)) return STANDARD_DECK;
  const mult = cheats.deckMult ?? 1;
  return { copies: 2 * mult, jokers: cheats.jokerParty ?? 2 * mult, ranks: cheats.mini ? MINI_RANKS : ALL_RANKS };
}

/** Reicht das Deck für Austeilen (14 Karten je Spieler, Teppichkarte, 15. Karte) und einen Stapel? */
export function deckTooSmall(cfg: DeckConfig, players: number): boolean {
  return deckSize(cfg) < 14 * players + 4;
}

export const MAX_JOKER_PARTY = 60;

export interface CheatNote {
  key: string;
  params?: Record<string, string | number>;
}

export type ParseResult =
  | { kind: 'none' }
  | { kind: 'error'; key: string; params?: Record<string, string | number> }
  | { kind: 'ok'; cheats: Cheats; active: CheatId[]; messages: string[]; warnings: CheatNote[] };

// ---------------------------------------------------------------- Eingabe

function norm(s: string): string {
  return s.toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE');
}
/** Name ohne Leerzeichen, Bindestriche, Unterstriche (so wird verglichen). */
function compact(s: string): string {
  return norm(s).replace(/[\s\-_]/g, '');
}

const SEP = /[\s,;]/;
const SKIP = /[\s\-_]/;

interface Word {
  id: string;
  compact: string;
}

/** Längstes Wort, das ab Position i steht (Leerzeichen, Bindestriche und Unterstriche im Wort werden übersprungen). */
function matchWord(text: string, i: number, words: Word[]): { id: string; end: number } | null {
  let best: { id: string; end: number; len: number } | null = null;
  for (const w of words) {
    let j = i;
    let ok = true;
    for (let k = 0; k < w.compact.length; k++) {
      while (k > 0 && j < text.length && SKIP.test(text[j])) j++;
      if (text[j] !== w.compact[k]) {
        ok = false;
        break;
      }
      j++;
    }
    if (ok && (!best || w.compact.length > best.len)) best = { id: w.id, end: j, len: w.compact.length };
  }
  return best ? { id: best.id, end: best.end } : null;
}

function wordsOf(table: Record<string, string[]>): Word[] {
  const out: Word[] = [];
  for (const [id, names] of Object.entries(table)) for (const n of names) out.push({ id, compact: compact(n) });
  return out;
}

function skipSep(text: string, i: number): number {
  while (i < text.length && SEP.test(text[i])) i++;
  return i;
}

function readInt(text: string, i: number): { value: number; end: number } | null {
  const j = skipSep(text, i);
  const m = /^\d+/.exec(text.slice(j));
  return m ? { value: Number(m[0]), end: j + m[0].length } : null;
}

const SUIT_CODE: Record<string, Suit> = { HE: 'H', KA: 'D', KR: 'C', PI: 'S' };
const RANK_CODE: Record<string, number> = { A: 1, B: 11, D: 12, K: 13, '1': 1, '11': 11, '12': 12, '13': 13 };
for (let r = 2; r <= 10; r++) RANK_CODE[String(r)] = r;

/** "HED", "KR10", "J" → Karte; sonst null. Der Text ist schon normiert (Großbuchstaben, ohne Leerzeichen). */
export function parseCardToken(tok: string): CardSpec | null {
  if (JOKER_CARD_NAMES.some((n) => compact(n) === tok)) return { suit: 'J', rank: 0 };
  const m = /^(HE|KA|KR|PI)(10|11|12|13|[1-9ABDK])$/.exec(tok);
  if (!m) return null;
  const rank = RANK_CODE[m[2]];
  return rank ? { suit: SUIT_CODE[m[1]], rank } : null;
}

export function specCode(c: CardSpec): string {
  if (c.suit === 'J') return 'J';
  const suit = { H: 'He', D: 'Ka', C: 'Kr', S: 'Pi' }[c.suit];
  const rank = c.rank === 1 ? 'A' : c.rank === 11 ? 'B' : c.rank === 12 ? 'D' : c.rank === 13 ? 'K' : String(c.rank);
  return suit + rank;
}

type HandParse = { ok: true; lines: (HandLine | null)[]; warnings: CheatNote[] } | { ok: false; key: string; params?: Record<string, string | number> };

function parseHand(content: string): HandParse {
  const presets = wordsOf(PRESET_NAMES);
  const warnings: CheatNote[] = [];
  const lines: (HandLine | null)[] = [];
  const segments = content.split('/');
  for (let s = 0; s < segments.length; s++) {
    const tokens = segments[s].split(/[\s,;]+/).filter(Boolean);
    if (tokens.length === 0) {
      lines.push(null);
      continue;
    }
    const line: HandLine = { cards: [] };
    for (const tok0 of tokens) {
      const tok = compact(tok0);
      const card = parseCardToken(tok);
      if (card) {
        line.cards.push(card);
        continue;
      }
      const preset = presets.find((w) => w.compact === tok);
      if (preset) {
        if (line.preset) return { ok: false, key: 'cheat.err.twoPresets', params: { line: s + 1 } };
        line.preset = preset.id as PresetId;
        continue;
      }
      return { ok: false, key: 'cheat.err.card', params: { word: tok0 } };
    }
    if (line.cards.length > HAND_SIZE) {
      warnings.push({ key: 'cheat.warn.tooMany', params: { line: s + 1, max: HAND_SIZE } });
      line.cards = line.cards.slice(0, HAND_SIZE);
    }
    lines.push(line);
  }
  while (lines.length > 0 && lines[lines.length - 1] === null) lines.pop();
  return { ok: true, lines, warnings };
}

/**
 * Liest Cheat-Text. `none`: Das ist kein Cheat-Text (z. B. ein Spielstand-Code). `error`: Es beginnt wie ein Cheat, ist aber
 * fehlerhaft (ein unbekanntes Wort lässt den ganzen Code scheitern, damit ein Tippfehler nichts halb aktiviert).
 */
export function parseCheatCode(input: string): ParseResult {
  const raw = input.trim();
  if (!raw || raw.includes('{') || /^["'`]*C1\./.test(raw)) return { kind: 'none' };
  const text = norm(raw);
  const cheatWords = wordsOf(CHEAT_NAMES);
  const roleWords = wordsOf(ROLE_NAMES);
  const cheats: Cheats = { seat: 0 };
  const active: CheatId[] = [];
  const warnings: CheatNote[] = [];
  const seen = new Set<string>();
  let i = 0;
  let first = true;
  for (;;) {
    i = skipSep(text, i);
    if (i >= text.length) break;
    const m = matchWord(text, i, cheatWords);
    if (!m) {
      if (first) return { kind: 'none' };
      const word = text.slice(i).split(/[\s,;]/)[0];
      return { kind: 'error', key: 'cheat.err.unknown', params: { word } };
    }
    first = false;
    const id = m.id as CheatId;
    i = m.end;
    const dup = seen.has(id);
    seen.add(id);
    switch (id) {
      case 'hand': {
        // Klammer: bis zur schließenden Klammer; sonst bis zum Ende des Textes
        const j = skipSep(text, i);
        let content: string;
        if (text[j] === '(') {
          const close = text.indexOf(')', j);
          if (close < 0) return { kind: 'error', key: 'cheat.err.paren' };
          content = text.slice(j + 1, close);
          i = close + 1;
        } else {
          content = text.slice(j);
          i = text.length;
        }
        const hp = parseHand(content);
        if (!hp.ok) return { kind: 'error', key: hp.key, params: hp.params };
        warnings.push(...hp.warnings);
        if (!dup && hp.lines.length > 0) {
          cheats.hand = hp.lines;
          active.push(id);
        }
        break;
      }
      case 'jokers': {
        const n = readInt(text, i);
        let k = 1;
        if (n) {
          k = n.value;
          i = n.end;
        }
        if (k < 1 || k > HAND_SIZE) return { kind: 'error', key: 'cheat.err.range', params: { word: CHEAT_NAMES.jokers[0], min: 1, max: HAND_SIZE } };
        if (!dup) {
          cheats.jokers = k;
          active.push(id);
        }
        break;
      }
      case 'rounds': {
        const n = readInt(text, i);
        if (!n) return { kind: 'error', key: 'cheat.err.needNumber', params: { word: CHEAT_NAMES.rounds[0] } };
        if (n.value < 1 || n.value > MAX_ROUNDS) return { kind: 'error', key: 'cheat.err.range', params: { word: CHEAT_NAMES.rounds[0], min: 1, max: MAX_ROUNDS } };
        i = n.end;
        if (!dup) {
          cheats.rounds = n.value;
          active.push(id);
        }
        break;
      }
      case 'firstMeld': {
        const a = readInt(text, i);
        if (!a) return { kind: 'error', key: 'cheat.err.needNumber', params: { word: CHEAT_NAMES.firstMeld[0] } };
        i = a.end;
        const b = readInt(text, i);
        if (b) i = b.end;
        const base = a.value;
        const cheft = b ? b.value : 2 * base - 1;
        if (base < 1 || base > 999 || cheft < 1 || cheft > 999) return { kind: 'error', key: 'cheat.err.range', params: { word: CHEAT_NAMES.firstMeld[0], min: 1, max: 999 } };
        if (!dup) {
          cheats.firstMeld = { base, cheft };
          active.push(id);
        }
        break;
      }
      case 'autoplay': {
        const j = skipSep(text, i);
        const r = matchWord(text, j, roleWords);
        if (r) i = r.end;
        if (!dup) {
          cheats.autoplay = { role: (r ? r.id : 'wildcard') as BotStyle };
          active.push(id);
        }
        break;
      }
      case 'deck2':
      case 'deck3':
      case 'deck4':
        // mehrere Deck-Faktoren: der zuerst genannte zählt
        if (!cheats.deckMult) {
          cheats.deckMult = Number(id[4]) as 2 | 3 | 4;
          active.push(id);
        }
        break;
      case 'jokerParty': {
        const n = readInt(text, i);
        let k = 8;
        if (n) {
          k = n.value;
          i = n.end;
        }
        if (k < 0 || k > MAX_JOKER_PARTY) return { kind: 'error', key: 'cheat.err.range', params: { word: CHEAT_NAMES.jokerParty[0], min: 0, max: MAX_JOKER_PARTY } };
        if (!dup) {
          cheats.jokerParty = k;
          active.push(id);
        }
        break;
      }
      case 'laidOut':
      case 'carpet':
      case 'mini':
      case 'timeTravel':
        if (!dup) {
          cheats[id] = true;
          active.push(id);
        }
        break;
    }
  }
  if (active.length === 0) return { kind: 'none' };
  return { kind: 'ok', cheats, active, messages: active.map((id) => CHEAT_MESSAGES[id]), warnings };
}

// ---------------------------------------------------------------- Austeilen

export interface CheatDeal {
  /** Handkarten des Cheat-Spielers (bis zu 14; der Rest wird zufällig aufgefüllt). */
  hand: Card[];
  /** Fest gewählte Teppichkarte (aus dem Deck genommen), sonst null. */
  carpet: Card | null;
  /** Vorgelegte Kombinationen des Spielers (die Karten stammen aus dem Deck). */
  melds: Omit<Meld, 'id' | 'owner'>[];
  notes: CheatNote[];
}

const keyOf = (c: CardSpec): string => `${c.suit}${c.rank}`;

/** Nimmt eine Karte dieser Sorte aus dem Deck (die Karte wird nie neu erzeugt). */
function takeSpec(deck: Card[], spec: CardSpec): Card | null {
  const i = deck.findIndex((c) => c.suit === spec.suit && c.rank === spec.rank);
  return i < 0 ? null : deck.splice(i, 1)[0];
}

function availability(deck: Card[], minus: CardSpec[] = []): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of deck) m.set(keyOf(c), (m.get(keyOf(c)) ?? 0) + 1);
  for (const s of minus) m.set(keyOf(s), (m.get(keyOf(s)) ?? 0) - 1);
  return m;
}

const spec = (suit: Suit, rank: number): CardSpec => ({ suit, rank });

/** Testhand: 14 Karten (bei `fivePairs` ebenfalls 14) oder null, wenn das Deck sie nicht hergibt. */
function buildPreset(id: PresetId, avail: Map<string, number>, rng: () => number): CardSpec[] | null {
  const count = new Map(avail);
  const have = (c: CardSpec) => (count.get(keyOf(c)) ?? 0) > 0;
  const use = (c: CardSpec) => count.set(keyOf(c), (count.get(keyOf(c)) ?? 0) - 1);
  const pickPairs = (n: number): CardSpec[] | null => {
    const keys = shuffle(
      [...count.keys()].filter((k) => k[0] !== 'J' && (count.get(k) ?? 0) >= 2),
      rng,
    ).slice(0, n);
    if (keys.length < n) return null;
    const out: CardSpec[] = [];
    for (const k of keys) {
      const c = spec(k[0] as Suit, Number(k.slice(1)));
      out.push(c, c);
      use(c);
      use(c);
    }
    return out;
  };
  const randomRun = (len: number): CardSpec[] | null => {
    for (let t = 0; t < 200; t++) {
      const suit = SUITS[Math.floor(rng() * 4)];
      const start = 1 + Math.floor(rng() * (14 - len));
      const cards = Array.from({ length: len }, (_, i) => spec(suit, start + i));
      if (cards.every(have)) {
        cards.forEach(use);
        return cards;
      }
    }
    return null;
  };

  if (id === 'pairs') return pickPairs(7);
  if (id === 'fivePairs') {
    const run = randomRun(4);
    const pairs = run ? pickPairs(5) : null;
    return run && pairs ? [...run, ...pairs] : null;
  }
  // Rommé-Hand: 'runs' = 14 Karten, die ohne Rest in Folgen und Sätze aufgehen (Hand machen);
  // 'almost' = 13 Karten in fertigen Kombinationen mit mindestens 51 Augen plus eine Füllkarte (Auslegen, in zwei Zügen fertig)
  const plans = id === 'almost' ? [[3, 3, 3, 4], [3, 5, 5], [3, 3, 7], [4, 4, 5], [3, 4, 6]] : [[3, 3, 4, 4], [3, 3, 3, 5], [3, 4, 7], [4, 5, 5], [3, 5, 6]];
  for (let attempt = 0; attempt < 400; attempt++) {
    const snapshot = new Map(count);
    const sizes = shuffle(plans[Math.floor(rng() * plans.length)], rng);
    const out: CardSpec[] = [];
    let augen = 0;
    let ok = true;
    for (const size of sizes) {
      let group: CardSpec[] | null = null;
      if (size <= 4 && rng() < 0.5) {
        const rank = ALL_RANKS[Math.floor(rng() * 13)];
        const suits = shuffle(SUITS, rng).filter((s) => have(spec(s, rank)));
        if (suits.length >= size) {
          group = suits.slice(0, size).map((s) => spec(s, rank));
          group.forEach(use);
          augen += rankValue(rank === 1 ? 14 : rank) * size;
        }
      } else {
        group = randomRun(size);
        if (group) augen += group.reduce((sum, c) => sum + rankValue(c.rank), 0);
      }
      if (!group) {
        ok = false;
        break;
      }
      out.push(...group);
    }
    if (ok && id === 'almost') {
      if (augen < 51) ok = false;
      else {
        const filler = shuffle(
          [...count.keys()].filter((k) => k[0] !== 'J' && (count.get(k) ?? 0) > 0),
          rng,
        )[0];
        if (!filler) ok = false;
        else out.push(spec(filler[0] as Suit, Number(filler.slice(1))));
      }
    }
    if (ok) return out;
    for (const [k, v] of snapshot) count.set(k, v);
  }
  return null;
}

/**
 * Teilt für den Cheat-Platz aus: Wunschhand (Runde `no`), ausgelegte Kombination, Teppichkarte, Joker, in dieser Rangfolge.
 * Was weiter oben steht, bekommt seine Karten zuerst; was nicht mehr geht, entfällt oder wird zufällig ersetzt (mit Hinweis in
 * `notes`). Entnimmt alle Karten dem übergebenen Deck; der Rest bleibt wie er ist, also zufällig gemischt.
 */
export function cheatDeal(cheats: Cheats, no: number, seed: number, deck: Card[]): CheatDeal {
  const rng = makeRng(seed * 31 + no * 104729 + 7);
  const notes: CheatNote[] = [];
  const hand: Card[] = [];
  const melds: CheatDeal['melds'] = [];

  // 1. Wunschhand (Karten der Zeile, dahinter die Testhand; Karten ersetzen die Testhand von hinten)
  const line = cheats.hand?.[no - 1] ?? null;
  if (line) {
    const wished = [...line.cards];
    let wanted = wished;
    if (line.preset) {
      const base = buildPreset(line.preset, availability(deck, wished), rng);
      if (base) wanted = [...wished, ...base.slice(0, Math.max(0, HAND_SIZE - wished.length))];
      else notes.push({ key: 'cheat.note.noPreset' });
    }
    for (const sp of wanted.slice(0, HAND_SIZE)) {
      const card = takeSpec(deck, sp);
      if (card) hand.push(card);
      else notes.push({ key: 'cheat.note.missing', params: { card: specCode(sp) } });
    }
  }

  // 2. Ausgelegt: Folge mit Joker in der Mitte; die vertretene Karte liegt auf der Hand
  if (cheats.laidOut) {
    const jokerIdx = deck.findIndex(isJoker);
    let done = false;
    if (jokerIdx >= 0) {
      const avail = availability(deck);
      const has = (c: CardSpec) => (avail.get(keyOf(c)) ?? 0) > 0;
      // Erst eine Handkarte als vertretene Karte probieren (dann braucht es keinen freien Platz), sonst eine beliebige Folge
      const tries: { suit: Suit; mid: number; fromHand: boolean }[] = [];
      for (const c of shuffle(hand, rng)) if (!isJoker(c) && c.rank >= 2 && c.rank <= 12) tries.push({ suit: c.suit as Suit, mid: c.rank, fromHand: true });
      if (hand.length < HAND_SIZE) for (let t = 0; t < 60; t++) tries.push({ suit: SUITS[Math.floor(rng() * 4)], mid: 2 + Math.floor(rng() * 11), fromHand: false });
      for (const tr of tries) {
        const lo = spec(tr.suit, tr.mid - 1);
        const hi = spec(tr.suit, tr.mid + 1);
        if (!has(lo) || !has(hi) || (!tr.fromHand && !has(spec(tr.suit, tr.mid)))) continue;
        const a = takeSpec(deck, lo)!;
        const b = takeSpec(deck, hi)!;
        const joker = deck.splice(deck.findIndex(isJoker), 1)[0];
        if (!tr.fromHand) hand.push(takeSpec(deck, spec(tr.suit, tr.mid))!);
        melds.push({ type: 'run', cards: [a, joker, b], suit: tr.suit, startRank: tr.mid - 1 });
        done = true;
        break;
      }
    }
    if (!done) notes.push({ key: 'cheat.note.noLaidOut' });
  }

  // 3. Teppichkarte: zweite Kopie einer Handkarte (aus dem Deck genommen, nicht erzeugt)
  let carpet: Card | null = null;
  if (cheats.carpet) {
    // Ohne festgelegte Handkarten gibt es noch nichts zu kopieren: Zufallskarten (der Füller) kommen vorab auf die Hand
    while (!hand.some((c) => !isJoker(c)) && hand.length < HAND_SIZE && deck.length > 0) hand.push(deck.pop()!);
    for (const c of shuffle(hand, rng)) {
      if (isJoker(c)) continue;
      carpet = takeSpec(deck, { suit: c.suit, rank: c.rank });
      if (carpet) break;
    }
    if (!carpet) notes.push({ key: 'cheat.note.noCarpet' });
  }

  // 4. Joker: ersetzt nur zufällige Füller
  if (cheats.jokers) {
    let need = cheats.jokers - hand.filter(isJoker).length;
    while (need > 0 && hand.length < HAND_SIZE) {
      const card = takeSpec(deck, { suit: 'J', rank: 0 });
      if (!card) break;
      hand.push(card);
      need--;
    }
    if (need > 0) notes.push({ key: 'cheat.note.fewJokers', params: { missing: need } });
  }

  return { hand, carpet, melds, notes };
}

export function meldValue(m: Omit<Meld, 'id' | 'owner'>): number {
  return meldAugen(m);
}
