/**
 * Pixel-Kartensatz: erzeugt beim Start einen Sprite-Atlas (Canvas) mit allen Karten.
 * Logische Kartengröße 32×44 Pixel, auf dem Bildschirm ganzzahlig skaliert.
 */
import { Card, Suit, isJoker } from '../engine/cards';

export const CARD_W = 32;
export const CARD_H = 44;
const COLS = 8;

export const PALETTE = {
  ink: '#1c120d',
  cream: '#f6ecd6',
  creamDark: '#d9c9a6',
  red: '#c9311c',
  orange: '#e8521f',
  orangeDark: '#a8330f',
  orangeLight: '#ffb27a',
  gold: '#f2b53a',
  felt: '#2e1d16',
};

const GLYPHS: Record<string, string[]> = {
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

const SUIT_SHAPES: Record<Suit, string[]> = {
  H: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
  D: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
  C: ['..###..', '..###..', '##.#.##', '#######', '##.#.##', '...#...', '..###..'],
  S: ['...#...', '..###..', '.#####.', '#######', '##.#.##', '...#...', '..###..'],
};

const STAR = [
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

const CROWN = ['#.#.#.#.#', '#.#.#.#.#', '#########', '#########', '.#######.'];

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
  const color = suit === 'H' || suit === 'D' ? PALETTE.red : PALETTE.ink;
  const rt = rankText(rank);
  text(ctx, rt, x + 3, y + 3, color);
  shape(ctx, SUIT_SHAPES[suit], x + 3, y + 11, color);
  // unten rechts gespiegelt (gleiche Ausrichtung, wie bei Pixel-Solitaire)
  const w = rt.length * 6 - 1;
  text(ctx, rt, x + CARD_W - 3 - w, y + CARD_H - 10, color);
  shape(ctx, SUIT_SHAPES[suit], x + CARD_W - 10, y + CARD_H - 18, color);
  if (rank >= 11) {
    // Bildkarte: Rahmen, Krone, Buchstabe
    const fx = x + 10;
    const fy = y + 12;
    ctx.fillStyle = color;
    ctx.fillRect(fx, fy, 12, 20);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(fx + 1, fy + 1, 10, 18);
    ctx.fillStyle = rank === 13 ? PALETTE.gold : rank === 12 ? PALETTE.orangeLight : PALETTE.creamDark;
    ctx.fillRect(fx + 1, fy + 1, 10, 18);
    shape(ctx, CROWN, fx + 2, fy + 2, rank === 11 ? color : PALETTE.orangeDark);
    shape(ctx, GLYPHS[rt], fx + 4, fy + 9, color);
    // Schultern
    ctx.fillStyle = color;
    ctx.fillRect(fx + 2, fy + 17, 8, 2);
  } else {
    shape(ctx, SUIT_SHAPES[suit], x + 9, y + 15, color, 2);
  }
}

function drawJoker(ctx: Ctx, x: number, y: number): void {
  cardBase(ctx, x, y, PALETTE.cream);
  text(ctx, 'J', x + 3, y + 3, PALETTE.orange);
  text(ctx, 'J', x + CARD_W - 8, y + CARD_H - 10, PALETTE.orange);
  shape(ctx, STAR, x + 9, y + 15, PALETTE.orangeDark);
  shape(ctx, STAR, x + 9, y + 14, PALETTE.gold);
  px(ctx, x + 15, y + 19, PALETTE.cream);
}

function drawBack(ctx: Ctx, x: number, y: number): void {
  cardBase(ctx, x, y, PALETTE.orange);
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(x + 2, y + 2, CARD_W - 4, CARD_H - 4);
  ctx.fillStyle = PALETTE.orange;
  ctx.fillRect(x + 3, y + 3, CARD_W - 6, CARD_H - 6);
  for (let yy = 3; yy < CARD_H - 3; yy++) {
    for (let xx = 3; xx < CARD_W - 3; xx++) {
      if ((xx + yy) % 4 === 0 || (xx - yy + 400) % 4 === 0) px(ctx, x + xx, y + yy, PALETTE.orangeDark);
    }
  }
  ctx.fillStyle = PALETTE.orangeDark;
  ctx.fillRect(x + 11, y + 17, 10, 10);
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(x + 12, y + 18, 8, 8);
  shape(ctx, ['..#..', '.###.', '#####', '.###.', '..#..'], x + 13, y + 19, PALETTE.orange);
}

function drawSlot(ctx: Ctx, x: number, y: number): void {
  for (let yy = 0; yy < CARD_H; yy++) {
    for (let xx = 0; xx < CARD_W; xx++) {
      const edge = xx === 0 || yy === 0 || xx === CARD_W - 1 || yy === CARD_H - 1;
      if (edge && (xx + yy) % 2 === 0) px(ctx, x + xx, y + yy, PALETTE.creamDark);
    }
  }
}

export interface Atlas {
  url: string;
  width: number;
  height: number;
  index(card: Card | 'back' | 'slot'): number;
}

export function buildAtlas(): Atlas {
  const cells = 55;
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
  drawBack(ctx, p.x, p.y);
  p = at(i++);
  drawSlot(ctx, p.x, p.y);
  return {
    url: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    index(card) {
      if (card === 'back') return 53;
      if (card === 'slot') return 54;
      if (isJoker(card)) return 52;
      return suits.indexOf(card.suit as Suit) * 13 + (card.rank - 1);
    },
  };
}

/** CSS-Hintergrundposition für eine Atlas-Zelle bei Skalierung s. */
export function atlasOffset(idx: number): { x: number; y: number } {
  return { x: (idx % COLS) * CARD_W, y: Math.floor(idx / COLS) * CARD_H };
}
