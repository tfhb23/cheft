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

// favicon.svg: Pixel-Sonne als Vektor (scharf in jeder Größe, bevorzugt von modernen Browsern). 64 × 64, Sonne 3 Einheiten je Pixel.
import { COL as C, SUN, sunPixel } from './sun-art.mjs';
const hex = (c) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
const paths = new Map();
for (let y = 0; y < SUN; y++) for (let x = 0; x < SUN; x++) {
  const c = sunPixel(x, y);
  if (c === C.main) continue;
  const k = hex(c);
  paths.set(k, (paths.get(k) ?? '') + `M${8 + x * 3} ${8 + y * 3}h3v3h-3z`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${hex(C.main)}"/>${[...paths].map(([k, d]) => `<path fill="${k}" shape-rendering="crispEdges" d="${d}"/>`).join('')}</svg>\n`;
writeFileSync('public/favicon.svg', svg);
