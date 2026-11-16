// Erzeugt public/favicon.png: die Sonne (Rückseite „sonne“) nur als mittleres Motiv, auf einer einfarbigen orangen,
// abgerundeten Fläche. Keine Rand- oder Eckelemente der Karte. Ausführen mit: npx tsx scripts/make-favicon.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { BACK_DESIGNS, BACK_FIELD } from '../src/ui/backs.ts';
import { color } from '../src/ui/tokens.ts';

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
const COL = { main: rgb(color('orange')), dark: rgb(color('orange-dark')), cream: rgb(color('cream')), gold: rgb(color('gold')) };

const design = BACK_DESIGNS.find((d) => d.id === 'sonne');
// Die Sonne belegt 16 × 16 Feldpixel um die Mitte (Spalten 5–20, Zeilen 11–26); alles darum herum (Rahmen, Ecken) bleibt weg.
const SUN = 16, X0 = 5, Y0 = 11;
const SCALE = 3, MARGIN = 8, SIZE = SUN * SCALE + 2 * MARGIN; // 64 px
const RADIUS = 15;

function at(x, y) {
  const fx = X0 + Math.floor((x - MARGIN) / SCALE), fy = Y0 + Math.floor((y - MARGIN) / SCALE);
  if (x < MARGIN || y < MARGIN || fx >= X0 + SUN || fy >= Y0 + SUN) return COL.main;
  const dx = Math.abs(fx - (BACK_FIELD.w - 1) / 2), dy = Math.abs(fy - (BACK_FIELD.h - 1) / 2);
  if (Math.hypot(dx, dy) > 8.6) return COL.main; // Eckpunkte des Ausschnitts gehören zum Hintergrund der Karte
  const role = design.paint({ x: fx, y: fy, dx, dy });
  return COL[role ?? 'main'];
}
function inside(x, y) {
  // Abgerundetes Quadrat, Kantenglättung über 4× Überabtastung
  let n = 0;
  for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
    const px = x + (sx + 0.5) / 4, py = y + (sy + 0.5) / 4;
    const cx = Math.min(Math.max(px, RADIUS), SIZE - RADIUS), cy = Math.min(Math.max(py, RADIUS), SIZE - RADIUS);
    if ((px - cx) ** 2 + (py - cy) ** 2 <= RADIUS ** 2) n++;
  }
  return n / 16;
}

function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  for (let x = 0; x < SIZE; x++) {
    const c = at(x, y), o = y * (SIZE * 4 + 1) + 1 + x * 4;
    raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = Math.round(255 * inside(x, y));
  }
}
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 6;
writeFileSync('public/favicon.png', Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('favicon.png erzeugt.');
