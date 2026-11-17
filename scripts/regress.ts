import { simulate } from '../src/bot/simulate';
import { STYLES, LEVELS } from '../src/bot/names';
import { createHash } from 'node:crypto';
const h = createHash('sha1');
for (let i = 0; i < 120; i++) {
  const seats = [0, 1, 2, 3].map((s) => ({ level: LEVELS[(i + s) % 4], style: STYLES[(i * 3 + s * 5) % STYLES.length] }));
  const r = simulate({ seed: 900 + i, seats, rounds: 3, firstTurnOpenAllowed: i % 2 === 0 });
  h.update(JSON.stringify([r.totals, r.roundWins, r.steps]));
}
console.log(h.digest('hex'));
