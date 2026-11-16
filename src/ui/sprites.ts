/**
 * Pixel-Kartensatz: erzeugt beim Start einen Sprite-Atlas (Canvas) mit allen Karten.
 * Logische Kartengröße 32×44 Pixel, auf dem Bildschirm ganzzahlig skaliert.
 */
import { Card, Suit, isJoker } from '../engine/cards';
import { CARD_PX, color } from './tokens';

export const CARD_W = CARD_PX.w;
export const CARD_H = CARD_PX.h;
const COLS = CARD_PX.cols;
/** Zellen im Atlas: 52 Karten, Joker, Rücken A, Platzhalter, Rücken B. */
export const ATLAS_CELLS = 56;

/** Farben der Kartenkunst; alle Werte stehen in tokens.ts (Kapitel 1). */
export const PALETTE = {
  ink: color('ink'),
  inkLight: color('ink-light'),
  cream: color('cream'),
  red: color('red'),
  redLight: color('red-light'),
  orange: color('orange'),
  orangeDark: color('orange-dark'),
  gold: color('gold'),
  skin: color('skin'),
  white: color('white'),
  mouth: color('mouth'),
  backB: color('back-b'),
};

export const GLYPHS: Record<string, string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
};

export const SUIT_SHAPES: Record<Suit, string[]> = {
  H: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
  D: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
  C: ['..###..', '..###..', '##.#.##', '#######', '##.#.##', '...#...', '..###..'],
  S: ['...#...', '..###..', '.#####.', '#######', '##.#.##', '...#...', '..###..'],
};

export const STAR = [
  '......#......',
  '.....###.....',
  '.....###.....',
  '....#####....',
  '#############',
  '.###########.',
  '..#########..',
  '...#######...',
  '...#######...',
  '..####.####..',
  '.###.....###.',
  '.#.........#.',
  '.............',
];


/** Bildkarten-Figuren 16×19. S Haut, H Haar, G Gold, R Robe, W Weiß, K Kontur, E Auge, M Mund, B Bart, F Feder, L Robe hell */
export const KING = [
  '..G.G.G.G.G.G...',
  '..GGGGGGGGGGG...',
  '..GGGKGGGKGGG...',
  '...KSSSSSSSK....',
  '...KSSSSSSSK....',
  '...KSESSSESK....',
  '...KSSSSSSSK....',
  '...KSSSMMSSK....',
  '...KBBSSSSBK....',
  '...KBBBBBBBK....',
  '....KBBBBBK.....',
  '.....KBBBK......',
  '.RRRWWKKKKWWRRR.',
  'RRRRRWWWWWWRRRRR',
  'RRRRRRRWWRRRRRRR',
  'RRRGRRRRRRRRGRRR',
  'RRRRRRRGGRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
];
export const QUEEN = [
  '.....G.G.G......',
  '....GGGGGGG.....',
  '...HHHGGGHHH....',
  '..HHHSSSSSHHH...',
  '..HHKSSSSSKHH...',
  '..HHKSESSESKHH..',
  '..HHKSSSSSSKHH..',
  '..HHKSSMMSSKHH..',
  '..HHHKSSSSKHHH..',
  '..HHH.KSSK.HHH..',
  '..HHH..KK..HHH..',
  '.HHHRRWWWWRRHHH.',
  '.HHRRRRWWRRRRHH.',
  '.HRRRRRRRRRRRRH.',
  '.RRRRRGRRGRRRRR.',
  '.RRRRRRGGRRRRRR.',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
];
export const JACK = [
  '.......FF.......',
  '......FF........',
  '..RRRRRRRRRRR...',
  '.RRRRRRRRRRRRR..',
  '..HHHHHHHHHHH...',
  '...KSSSSSSSK....',
  '...KSSSSSSSK....',
  '...KSESSSESK....',
  '...KSSSSSSSK....',
  '...KSSSMMSSK....',
  '....KSSSSSK.....',
  '.....KSSSK......',
  '..RRRWKKKKWRRR..',
  '.RRRRRWWWWRRRRR.',
  '.RRRRRRWWRRRRRR.',
  '.RRLRRRRRRRRLRR.',
  '.RRRRRRRRRRRRRR.',
  '.RRRRRRRRRRRRRR.',
  '.RRRRRRRRRRRRRR.',
];
const HAIR: Record<Suit, string> = { H: color('hair-h'), D: color('hair-d'), C: color('hair-c'), S: color('hair-s') };
const BEARD: Record<Suit, string> = { H: color('beard-h'), D: color('beard-d'), C: color('beard-c'), S: color('beard-s') };

/** Zeichenschlüssel der Bildkarten-Figuren: S Haut, H Haar, G Gold, R Robe, W Weiß, K Kontur, E Auge, M Mund, B Bart, F Feder, L Robe hell. */
export function figureMap(suit: Suit, rank: number): Record<string, string> {
  const ink = suit === 'H' || suit === 'D' ? PALETTE.red : PALETTE.ink;
  const light = ink === PALETTE.red ? PALETTE.redLight : PALETTE.inkLight;
  return {
    S: PALETTE.skin,
    H: HAIR[suit],
    G: PALETTE.gold,
    R: ink,
    W: PALETTE.white,
    K: PALETTE.ink,
    E: PALETTE.ink,
    M: PALETTE.mouth,
    B: rank === 13 ? BEARD[suit] : ink,
    F: PALETTE.orange,
    L: light,
  };
}
export const FIGURES: Record<number, string[]> = { 11: JACK, 12: QUEEN, 13: KING };

function shapeMap(ctx: Ctx, rows: string[], x: number, y: number, map: Record<string, string>): void {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = map[row[rx]];
      if (c) px(ctx, x + rx, y + ry, c);
    }
  });
}


type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function shape(ctx: Ctx, rows: string[], x: number, y: number, color: string, scale = 1): void {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] === '#') {
        ctx.fillStyle = color;
        ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
      }
    }
  });
}

function rankText(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'B';
  if (rank === 12) return 'D';
  if (rank === 13) return 'K';
  return String(rank);
}

function text(ctx: Ctx, s: string, x: number, y: number, color: string): number {
  let cx = x;
  for (const ch of s) {
    shape(ctx, GLYPHS[ch], cx, y, color);
    cx += 6;
  }
  return cx - 1;
}

/** Um 180 Grad gedrehte Pixelzeilen (für die untere Eckmarke, die auf dem Kopf steht). */
function rot180(rows: string[]): string[] {
  return rows.map((r) => [...r].reverse().join('')).reverse();
}

/** Text um 180 Grad gedreht, rechtsbündig bei xRight (Zeichenreihenfolge ebenfalls umgekehrt). */
function textRot(ctx: Ctx, s: string, xRight: number, y: number, color: string): void {
  const w = s.length * 6 - 1;
  let cx = xRight - w;
  for (const ch of [...s].reverse()) {
    shape(ctx, rot180(GLYPHS[ch]), cx, y, color);
    cx += 6;
  }
}

function cardBase(ctx: Ctx, x: number, y: number, fill: string): void {
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(x, y, CARD_W, CARD_H);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, CARD_W - 2, CARD_H - 2);
  // Ecken "abrunden"
  ctx.clearRect(x, y, 1, 1);
  ctx.clearRect(x + CARD_W - 1, y, 1, 1);
  ctx.clearRect(x, y + CARD_H - 1, 1, 1);
  ctx.clearRect(x + CARD_W - 1, y + CARD_H - 1, 1, 1);
  px(ctx, x + 1, y + 1, PALETTE.ink);
  px(ctx, x + CARD_W - 2, y + 1, PALETTE.ink);
  px(ctx, x + 1, y + CARD_H - 2, PALETTE.ink);
  px(ctx, x + CARD_W - 2, y + CARD_H - 2, PALETTE.ink);
}

function drawFace(ctx: Ctx, x: number, y: number, suit: Suit, rank: number): void {
  cardBase(ctx, x, y, PALETTE.cream);
  const ink = suit === 'H' || suit === 'D' ? PALETTE.red : PALETTE.ink;
  const rt = rankText(rank);
  text(ctx, rt, x + 3, y + 3, ink);
  shape(ctx, SUIT_SHAPES[suit], x + 3, y + 11, ink);
  // unten rechts: Zahl und Farbe stehen auf dem Kopf (um 180 Grad gedreht wie bei echten Karten)
  textRot(ctx, rt, x + CARD_W - 3, y + CARD_H - 10, ink);
  shape(ctx, rot180(SUIT_SHAPES[suit]), x + CARD_W - 10, y + CARD_H - 18, ink);
  if (rank >= 11) {
    // Bildkarte: heller Rahmen, Figur in Kartenfarbe
    const light = ink === PALETTE.red ? PALETTE.redLight : PALETTE.inkLight;
    ctx.fillStyle = light;
    ctx.fillRect(x + 7, y + 12, 18, 21);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x + 8, y + 13, 16, 19);
    shapeMap(ctx, FIGURES[rank], x + 8, y + 13, figureMap(suit, rank));
  } else {
    shape(ctx, SUIT_SHAPES[suit], x + 9, y + 15, ink, 2);
  }
}

function drawJoker(ctx: Ctx, x: number, y: number): void {
  cardBase(ctx, x, y, PALETTE.cream);
  text(ctx, 'J', x + 3, y + 3, PALETTE.orange);
  textRot(ctx, 'J', x + CARD_W - 3, y + CARD_H - 10, PALETTE.orange);
  shape(ctx, STAR, x + 9, y + 15, PALETTE.orangeDark);
  shape(ctx, STAR, x + 9, y + 14, PALETTE.gold);
  px(ctx, x + 15, y + 19, PALETTE.cream);
}

function drawBack(ctx: Ctx, x: number, y: number, main: string, dark: string): void {
  cardBase(ctx, x, y, main);
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(x + 2, y + 2, CARD_W - 4, CARD_H - 4);
  ctx.fillStyle = main;
  ctx.fillRect(x + 3, y + 3, CARD_W - 6, CARD_H - 6);
  for (let yy = 3; yy < CARD_H - 3; yy++) {
    for (let xx = 3; xx < CARD_W - 3; xx++) {
      if ((xx + yy) % 4 === 0 || (xx - yy + 400) % 4 === 0) px(ctx, x + xx, y + yy, dark);
    }
  }
  ctx.fillStyle = dark;
  ctx.fillRect(x + 11, y + 17, 10, 10);
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(x + 12, y + 18, 8, 8);
  shape(ctx, ['..#..', '.###.', '#####', '.###.', '..#..'], x + 13, y + 19, main);
}

function drawSlot(ctx: Ctx, x: number, y: number): void {
  for (let yy = 0; yy < CARD_H; yy++) {
    for (let xx = 0; xx < CARD_W; xx++) {
      const edge = xx === 0 || yy === 0 || xx === CARD_W - 1 || yy === CARD_H - 1;
      if (edge && (xx + yy) % 2 === 0) px(ctx, x + xx, y + yy, PALETTE.ink);
    }
  }
}

export interface Atlas {
  url: string;
  width: number;
  height: number;
  index(card: Card | 'back' | 'back2' | 'slot'): number;
}

export function buildAtlas(): Atlas {
  const cells = ATLAS_CELLS;
  const rows = Math.ceil(cells / COLS);
  const canvas = document.createElement('canvas');
  canvas.width = COLS * CARD_W;
  canvas.height = rows * CARD_H;
  const ctx = canvas.getContext('2d')!;
  const suits: Suit[] = ['H', 'D', 'C', 'S'];
  let i = 0;
  const at = (n: number) => ({ x: (n % COLS) * CARD_W, y: Math.floor(n / COLS) * CARD_H });
  for (const s of suits) {
    for (let r = 1; r <= 13; r++) {
      const p = at(i++);
      drawFace(ctx, p.x, p.y, s, r);
    }
  }
  let p = at(i++);
  drawJoker(ctx, p.x, p.y);
  p = at(i++);
  drawBack(ctx, p.x, p.y, PALETTE.orange, PALETTE.orangeDark);
  p = at(i++);
  drawSlot(ctx, p.x, p.y);
  p = at(i++);
  drawBack(ctx, p.x, p.y, PALETTE.backB, PALETTE.ink);
  return {
    url: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    index(card) {
      if (card === 'back') return 53;
      if (card === 'slot') return 54;
      if (card === 'back2') return 55;
      if (isJoker(card)) return 52;
      return suits.indexOf(card.suit as Suit) * 13 + (card.rank - 1);
    },
  };
}

/** CSS-Hintergrundposition für eine Atlas-Zelle bei Skalierung s. */
export function atlasOffset(idx: number): { x: number; y: number } {
  return { x: (idx % COLS) * CARD_W, y: Math.floor(idx / COLS) * CARD_H };
}

/** Zwei gemischte Decks: Karten des zweiten Decks haben eine andere Rückseite. */
export function backOf(card: Card): 'back' | 'back2' {
  if (card.id === -2) return 'back2'; // vom Server maskierte Karte aus dem zweiten Deck
  if (card.id === 104) return 'back';
  if (card.id === 105) return 'back2';
  return card.id >= 52 ? 'back2' : 'back';
}
