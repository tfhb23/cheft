// Erzeugt public/favicon.png (64 px): Sonne auf einfarbig orangem, abgerundetem Grund. Ausführen mit: npx tsx scripts/make-favicon.mjs
import { COL, SUN, sunPixel, writePng } from './sun-art.mjs';

const SCALE = 3, MARGIN = 8, SIZE = SUN * SCALE + 2 * MARGIN, RADIUS = 15;
function coverage(x, y) {
  let n = 0;
  for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
    const px = x + (sx + 0.5) / 4, py = y + (sy + 0.5) / 4;
    const cx = Math.min(Math.max(px, RADIUS), SIZE - RADIUS), cy = Math.min(Math.max(py, RADIUS), SIZE - RADIUS);
    if ((px - cx) ** 2 + (py - cy) ** 2 <= RADIUS ** 2) n++;
  }
  return n / 16;
}
writePng('public/favicon.png', SIZE, (x, y) => {
  const c = x < MARGIN || y < MARGIN ? COL.main : sunPixel(Math.floor((x - MARGIN) / SCALE), Math.floor((y - MARGIN) / SCALE));
  return [c[0], c[1], c[2], Math.round(255 * coverage(x, y))];
});
console.log('favicon.png erzeugt.');
