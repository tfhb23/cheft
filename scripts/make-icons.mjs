// Erzeugt die PWA-Icons (PNG) ohne externe Abhängigkeiten: Pixelbild hochskaliert.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { color } from '../src/ui/tokens.ts';

// Farben aus den Design-Tokens (Kapitel 1): Hülle 1.17, Kontur 1.34, Orange 1.35, Gold 1.13, Papier 1.36. Ausführen mit: npx tsx scripts/make-icons.mjs
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];

const ART = [
  '................................',
  '................................',
  '....######################......',
  '...#......................#.....',
  '...#..####################.#....',
  '...#..#..................#.#....',
  '...#..#..OOOO............#.#....',
  '...#..#.OOOOOO...........#.#....',
  '...#..#.OO..OO...........#.#....',
  '...#..#.OO...............#.#....',
  '...#..#.OO...............#.#....',
  '...#..#.OO..OO...........#.#....',
  '...#..#.OOOOOO...........#.#....',
  '...#..#..OOOO............#.#....',
  '...#..#..................#.#....',
  '...#..#.......GGG........#.#....',
  '...#..#......GGGGG.......#.#....',
  '...#..#.....GGGGGGG......#.#....',
  '...#..#....GGGGGGGGG.....#.#....',
  '...#..#.....GGGGGGG......#.#....',
  '...#..#......GGGGG.......#.#....',
  '...#..#.......GGG........#.#....',
  '...#..#........G.........#.#....',
  '...#..#..................#.#....',
  '...#..#..................#.#....',
  '...#..#.............OOOO.#.#....',
  '...#..#............OO..OO#.#....',
  '...#..#............OO....#.#....',
  '...#..####################.#....',
  '...#.......................#....',
  '....#######################.....',
  '................................',
];
const COLORS = { '.': rgb(color('shell')), '#': rgb(color('icon-line')), O: rgb(color('icon-orange')), G: rgb(color('gold')) };
const BG = rgb(color('icon-paper'));

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const scale = size / 32;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const ax = Math.floor(x / scale), ay = Math.floor(y / scale);
      const ch = ART[ay][ax];
      // Innenraum der Karte cremefarben
      const inside = ax > 6 && ax < 25 && ay > 4 && ay < 28 && ch === '.';
      const col = inside ? BG : COLORS[ch];
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2]; raw[o + 3] = col[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
for (const size of [192, 512]) writeFileSync(`public/icon-${size}.png`, png(size));
console.log('Icons erzeugt.');
