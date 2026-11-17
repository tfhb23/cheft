// Erzeugt die App-Icons und die Vorschau für Link-Teilen: die Sonne als Mittelmotiv auf durchgehend oranger Fläche.
//   icon-192/512.png            Zweck „any“: abgerundete Ecken, transparent (Desktop-Installation, Tab-Listen, Android ohne Maske)
//   icon-maskable-192/512.png   Zweck „maskable“: Vollfläche ohne eigene Rundung; Android schneidet Kreis/Squircle selbst zu.
//                               Die Sonne (16 von 32 Sonnenpixeln Bildbreite = 50 %) liegt weit innerhalb der Safe Zone; ältere Android-Versionen
//                               und enge Masken (Kreis) schneiden sonst die Strahlen an. 32 teilt 192 und 512 glatt, die Sonne sitzt auf ganzen Pixeln.
//   apple-touch-icon.png        180 px, Vollfläche (iOS rundet selbst ab; Transparenz würde schwarz)
//   og-image.png                1200 × 630, Vorschaubild beim Teilen des Links (Messenger, soziale Netze)
// Ausführen mit: npx tsx scripts/make-icons.mjs
import { COL, renderSun, sunPixel, writePng } from './sun-art.mjs';

for (const size of [192, 512]) {
  const any = renderSun(size, 24, 0.225);
  writePng(`public/icon-${size}.png`, size, (x, y) => any[y * size + x]);
  const mask = renderSun(size, 32);
  writePng(`public/icon-maskable-${size}.png`, size, (x, y) => mask[y * size + x]);
}
const apple = renderSun(180, 32);
writePng('public/apple-touch-icon.png', 180, (x, y) => apple[y * 180 + x]);

// Teilen-Vorschau: Sonne mittig, ganzzahlig vergrößert, auf der Fläche in Cheft-Orange
const W = 1200, H = 630, unit = 26, sunPx = 16 * unit;
const ox = Math.floor((W - sunPx) / 2), oy = Math.floor((H - sunPx) / 2);
writePng('public/og-image.png', W, (x, y) => (x < ox || y < oy ? COL.main : sunPixel(Math.floor((x - ox) / unit), Math.floor((y - oy) / unit))), H);
console.log('Icons erzeugt.');
