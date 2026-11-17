import { describe, expect, it } from 'vitest';
import { makeRng } from '../engine/cards';
import type { BotLevel } from '../engine/game';
import { ROLE_NAMES, pickRoleName } from './rolenames';
import { RoleId, ROLE_LABEL } from './roles';

const LEVELS: BotLevel[] = ['easy', 'normal', 'hard', 'master'];
const ROLES = Object.keys(ROLE_LABEL) as RoleId[];

describe('Namen der Rollen', () => {
  it('jede der 24 Kombinationen (4 Gedächtnisse × 6 Rollen) hat mindestens vier Namen', () => {
    for (const l of LEVELS) for (const r of ROLES) expect(ROLE_NAMES[l][r].length, `${l}/${r}`).toBeGreaterThanOrEqual(4);
  });

  it('kein Name kommt zweimal vor, keiner ist leer oder nur Leerraum', () => {
    const seen = new Map<string, string>();
    for (const l of LEVELS)
      for (const r of ROLES)
        for (const n of ROLE_NAMES[l][r]) {
          expect(n.trim().length, `${l}/${r}`).toBeGreaterThan(0);
          expect(n, `${n} in ${l}/${r}`).toBe(n.trim());
          expect(seen.has(n.toLowerCase()), `${n} doppelt: ${seen.get(n.toLowerCase())} und ${l}/${r}`).toBe(false);
          seen.set(n.toLowerCase(), `${l}/${r}`);
        }
  });

  it('Q ist ein Mastermind-Wildcard-Name, Data ein Ausgewogener-Mastermind-Name', () => {
    expect(ROLE_NAMES.master.wildcard).toContain('Q');
    expect(ROLE_NAMES.master.balanced).toContain('Data');
  });

  it('die Namenswahl vergibt am Tisch keinen Namen doppelt, solange noch freie da sind, und hält sich an die Kombination', () => {
    const rng = makeRng(3);
    for (const l of LEVELS)
      for (const r of ROLES) {
        const used = new Set<string>();
        const all = ROLE_NAMES[l][r];
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
