/**
 * Rechenzeit einer Bot-Entscheidung und Größe des Spielstands, mit und ohne Gegner-Gedächtnis und Rundenprofile.
 *   npx tsx scripts/bench.ts [Spiele=30] [Runden=9]
 */
import { decideAction } from '../src/bot/bot';
import { rolePersona } from '../src/bot/roles';
import { simulate } from '../src/bot/simulate';
import type { BotLevel } from '../src/engine/game';

const games = Number(process.argv[2] ?? 30);
const rounds = Number(process.argv[3] ?? 9);
const pct = (v: number[], q: number) => v.sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(q * v.length))];

for (const level of ['master', 'hard', 'normal'] as BotLevel[]) {
  for (const oppUse of [0, 1]) {
    const times: number[] = [];
    let size = 0;
    let sizeNoProfiles = 0;
    for (let i = 0; i < games; i++) {
      const res = simulate({
        seed: 123000 + i,
        rounds,
        seats: Array.from({ length: 4 }, () => ({ level, style: 'balanced' as const, opts: { persona: rolePersona('balanced', { oppUse }) } })),
        visit: (g, pid) => {
          const t0 = performance.now();
          decideAction(g, pid, { persona: rolePersona('balanced', { oppUse }) });
          times.push(performance.now() - t0);
        },
      });
      size += JSON.stringify(res.state).length;
      const copy = structuredClone(res.state);
      copy.history.forEach((h) => delete h.profiles);
      sizeNoProfiles += JSON.stringify(copy).length;
    }
    console.log(`${level.padEnd(7)} Gegner-Gedächtnis ${oppUse}: Entscheidungen ${times.length}, Median ${pct(times, 0.5).toFixed(2)} ms, 99 % ${pct(times, 0.99).toFixed(1)} ms, 99,9 % ${pct(times, 0.999).toFixed(1)} ms, Maximum ${Math.max(...times).toFixed(0)} ms`);
    if (oppUse === 1) console.log(`        Spielstand (JSON, ${rounds} Runden): mit Profilen ${(size / games / 1024).toFixed(1)} KB, ohne ${(sizeNoProfiles / games / 1024).toFixed(1)} KB, Zuwachs ${(((size - sizeNoProfiles) / games) / 1024).toFixed(1)} KB`);
  }
}
