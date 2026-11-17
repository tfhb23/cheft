import { describe, expect, it } from 'vitest';
import { makeRng } from '../engine/cards';
import type { BotLevel } from '../engine/game';
import { ROLE_NAMES, genderCounts, pickRoleName, roleNames } from './rolenames';
import { RoleId, ROLE_LABEL } from './roles';

const LEVELS: BotLevel[] = ['easy', 'normal', 'hard', 'master'];
const ROLES = Object.keys(ROLE_LABEL) as RoleId[];

describe('Namen der Rollen', () => {
  it('jede der 24 Kombinationen (4 Gedächtnisse × 6 Rollen) hat mindestens fünf Namen', () => {
    for (const l of LEVELS) for (const r of ROLES) expect(ROLE_NAMES[l][r].length, `${l}/${r}`).toBeGreaterThanOrEqual(5);
  });

  it('Geschlechterverhältnis: weiblich und neutral sind gut vertreten, jede Kombination hat mindestens einen weiblichen und einen neutralen Namen', () => {
    const total = { m: 0, f: 0, n: 0 };
    for (const l of LEVELS)
      for (const r of ROLES) {
        const c = genderCounts(ROLE_NAMES[l][r]);
        expect(c.f, `${l}/${r} weiblich`).toBeGreaterThanOrEqual(1);
        expect(c.n, `${l}/${r} neutral`).toBeGreaterThanOrEqual(1);
        expect(c.m, `${l}/${r} männlich`).toBeGreaterThanOrEqual(1);
        total.m += c.m;
        total.f += c.f;
        total.n += c.n;
      }
    const all = total.m + total.f + total.n;
    expect(total.f / total.m).toBeGreaterThan(0.8); // weiblich nicht weit hinter männlich
    expect(total.n / all).toBeGreaterThan(0.13);
  });

  it('kein Name kommt zweimal vor, keiner ist leer oder nur Leerraum', () => {
    const seen = new Map<string, string>();
    for (const l of LEVELS)
      for (const r of ROLES)
        for (const { name: n } of ROLE_NAMES[l][r]) {
          expect(n.trim().length, `${l}/${r}`).toBeGreaterThan(0);
          expect(n, `${n} in ${l}/${r}`).toBe(n.trim());
          expect(seen.has(n.toLowerCase()), `${n} doppelt: ${seen.get(n.toLowerCase())} und ${l}/${r}`).toBe(false);
          seen.set(n.toLowerCase(), `${l}/${r}`);
        }
  });

  it('die gewünschten Gäste sind dabei: Q (Mastermind-Wildcard), Data (Mastermind-Ausgewogen), Picard (Mastermind-Gerissener), Mulan, Nasrudin', () => {
    expect(roleNames('master', 'wildcard')).toContain('Q');
    expect(roleNames('master', 'balanced')).toContain('Data');
    expect(roleNames('master', 'cunning')).toContain('Picard');
    const all = LEVELS.flatMap((l) => ROLES.flatMap((r) => roleNames(l, r)));
    expect(all).toContain('Mulan');
    expect(all).toContain('Nasrudin');
  });

  it('die Namenswahl vergibt am Tisch keinen Namen doppelt, solange noch freie da sind, und hält sich an die Kombination', () => {
    const rng = makeRng(3);
    for (const l of LEVELS)
      for (const r of ROLES) {
        const used = new Set<string>();
        const all = roleNames(l, r);
        for (let k = 0; k < all.length; k++) {
          const n = pickRoleName(l, r, rng, used);
          expect(all).toContain(n);
          expect(used.has(n)).toBe(false);
          used.add(n);
        }
        // Sind alle vergeben, wiederholt sich ein Name, statt dass etwas fehlschlägt
        expect(all).toContain(pickRoleName(l, r, rng, used));
      }
  });
});
