// Gemeinsame Bausteine für Favicon und App-Icons: die Sonne (Rückseite „sonne“) als einzelnes Mittelmotiv und ein PNG-Schreiber.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { BACK_DESIGNS, BACK_FIELD } from '../src/ui/backs.ts';
import { color } from '../src/ui/tokens.ts';

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
export const COL = { main: rgb(color('orange')), dark: rgb(color('orange-dark')), cream: rgb(color('cream')), gold: rgb(color('gold')) };
const design = BACK_DESIGNS.find((d) => d.id === 'sonne');
/** Die Sonne belegt 16 × 16 Feldpixel (Spalten 5–20, Zeilen 11–26); Rahmen und Eckpunkte der Karte bleiben weg. */
export const SUN = 16;
const X0 = 5, Y0 = 11;

/** Farbe der Sonne an Pixel (sx, sy) in 0…15; Orange (Hintergrund) für alles außerhalb. */
export function sunPixel(sx, sy) {
  if (sx < 0 || sy < 0 || sx >= SUN || sy >= SUN) return COL.main;
  const fx = X0 + sx, fy = Y0 + sy;
  const dx = Math.abs(fx - (BACK_FIELD.w - 1) / 2), dy = Math.abs(fy - (BACK_FIELD.h - 1) / 2);
  if (Math.hypot(dx, dy) > 8.6) return COL.main;
  return COL[design.paint({ x: fx, y: fy, dx, dy }) ?? 'main'];
}

function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }

/** Schreibt ein PNG der Größe size × size; pixel(x, y) liefert [r, g, b, a]. */
export function writePng(path, size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = pixel(x, y), o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = c[3] ?? 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

/**
 * Rendert die Sonne in beliebiger Größe (Überabtastung 4 × 4, deshalb auch bei krummen Verhältnissen sauber).
 * grid: Breite des Bildes in Sonnenpixeln (16 = Sonne füllt alles, größer = mehr orangener Rand).
 * radiusFrac: Eckenradius als Anteil der Kantenlänge (0 = Vollfläche, ohne Transparenz).
 */
export function renderSun(size, grid, radiusFrac = 0) {
  const pad = (grid - SUN) / 2, R = radiusFrac * size, N = 4;
  const out = new Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const px = x + (i + 0.5) / N, py = y + (j + 0.5) / N;
        if (R > 0) {
          const cx = Math.min(Math.max(px, R), size - R), cy = Math.min(Math.max(py, R), size - R);
          if ((px - cx) ** 2 + (py - cy) ** 2 > R * R) continue;
        }
        const c = sunPixel(Math.floor((px / size) * grid - pad), Math.floor((py / size) * grid - pad));
        r += c[0]; g += c[1]; b += c[2]; n++;
      }
      out[y * size + x] = n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n), Math.round((255 * n) / (N * N))] : [0, 0, 0, 0];
    }
  }
  return out;
}

/** PNG als Buffer (statt Datei), z. B. für favicon.ico. */
export function pngBuffer(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = pixel(x, y), o = y * (size * 4 + 1) + 1 + x * 4;
    raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = c[3] ?? 255;
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
