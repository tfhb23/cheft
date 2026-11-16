// Erzeugt die App-Icons (PWA, Android, Apple Touch): die Sonne als Mittelmotiv auf durchgehend oranger Vollfläche.
// Keine eigenen Rundungen: Android (Kreis, Squircle) und iOS (abgerundetes Quadrat) schneiden selbst zu. Die Sonne liegt
// innerhalb der „Safe Zone“ (Kreis mit 80 % Durchmesser). Ausführen mit: npx tsx scripts/make-icons.mjs
import { COL, SUN, sunPixel, writePng } from './sun-art.mjs';

// Raster 24 × 24 Sonnenpixel: 192 px = 8 je Pixel (exakt), 512 px = 21 je Pixel (504 px, der Rest ist orange Rand).
const GRID = 24, PAD = (GRID - SUN) / 2;
for (const size of [192, 512]) {
  const unit = Math.floor(size / GRID), off = Math.floor((size - unit * GRID) / 2);
  writePng(`public/icon-${size}.png`, size, (x, y) => {
    const gx = Math.floor((x - off) / unit) - PAD, gy = Math.floor((y - off) / unit) - PAD;
    return x < off || y < off ? COL.main : sunPixel(gx, gy);
  });
}
console.log('Icons erzeugt.');
