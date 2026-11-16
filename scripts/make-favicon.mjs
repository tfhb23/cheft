// Erzeugt alle Favicon-Dateien in public/: Sonne auf einfarbig orangem Grund mit abgerundeten Ecken.
//   favicon.ico (16, 32, 48 px in einer Datei; Standardadresse /favicon.ico, auch für alte Browser)
//   favicon-16/32/48.png (Tab und Lesezeichen; 48 und 96 sind außerdem die Vielfachen von 48 px, die Google für Suchergebnisse verlangt)
//   favicon-96.png (scharfe Darstellung auf hochauflösenden Bildschirmen und für die Google-Suche)
//   apple-touch-icon.png (180 px, Vollfläche: iOS rundet selbst ab)
// Ausführen mit: npx tsx scripts/make-favicon.mjs
import { writeFileSync } from 'node:fs';
import { pngBuffer, renderSun, writePng } from './sun-art.mjs';

const GRID = 21.333; // Sonne füllt 75 % der Breite
const px = (size, rounded) => {
  const img = renderSun(size, GRID, rounded ? 0.23 : 0);
  return (x, y) => img[y * size + x];
};
for (const size of [16, 32, 48, 96]) writePng(`public/favicon-${size}.png`, size, px(size, true));
writePng('public/apple-touch-icon.png', 180, px(180, false));

const sizes = [16, 32, 48];
const images = sizes.map((s) => pngBuffer(s, px(s, true)));
const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e[0] = s; e[1] = s; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(images[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});
writeFileSync('public/favicon.ico', Buffer.concat([head, ...entries, ...images]));
console.log('Favicons erzeugt.');
