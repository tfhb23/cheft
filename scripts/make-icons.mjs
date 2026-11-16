// Erzeugt die App-Icons (PWA, Android): die Sonne als Mittelmotiv auf durchgehend oranger Vollfläche.
// Keine eigenen Rundungen: Android (Kreis, Squircle) und iOS (abgerundetes Quadrat) schneiden selbst zu. Die Sonne liegt
// innerhalb der „Safe Zone“ (Kreis mit 80 % Durchmesser): bei 22 Sonnenpixeln Bildbreite reichen die Strahlen genau bis dorthin.
// Ausführen mit: npx tsx scripts/make-icons.mjs
import { renderSun, writePng } from './sun-art.mjs';

const GRID = 22;
for (const size of [192, 512]) {
  const img = renderSun(size, GRID);
  writePng(`public/icon-${size}.png`, size, (x, y) => img[y * size + x]);
}
console.log('Icons erzeugt.');
