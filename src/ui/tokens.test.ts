import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PALETTE_COLORS,
  ROLE_COLORS,
  SPACING_ROLES,
  SPACING_SCALE,
  allTokenIds,
  color,
  tokenVars,
  tokensCss,
} from './tokens';
import { allSpecIds, labelTargets } from './guide';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const appSrc = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

describe('Design-Tokens', () => {
  it('Nummern sind eindeutig und haben das Format Kapitel.Zähler', () => {
    const ids = allTokenIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^\d{1,2}\.\d{2,3}$/);
  });

  it('CSS-Variablen sind eindeutig', () => {
    const names = tokenVars().map(([k]) => k);
    expect(new Set(names).size).toBe(names.length);
  });

  it('Rollen zeigen auf vorhandene Palettenfarben, Abstandsrollen auf vorhandene Stufen', () => {
    const palette = new Set(PALETTE_COLORS.map((c) => c.css));
    for (const r of ROLE_COLORS) expect(palette.has(r.ref), `${r.css} → ${r.ref}`).toBe(true);
    const scale = new Set(SPACING_SCALE.map((s) => s.css));
    for (const r of SPACING_ROLES) expect(scale.has(r.ref), `${r.css} → ${r.ref}`).toBe(true);
  });

  it('Farben sind gültige Hex- oder rgba-Werte', () => {
    for (const c of PALETTE_COLORS) expect(c.value).toMatch(/^(#[0-9a-f]{6}|rgba\([\d., ]+\))$/i);
    expect(color('shell')).toBe('#2e1d16');
  });

  it('tokensCss enthält :root und die Maßstab-Umschaltung', () => {
    const out = tokensCss();
    expect(out).toContain(':root {');
    expect(out).toContain('--s: 3');
  });
});

describe('styles.css nutzt nur Tokens', () => {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');

  it('keine festen Farben', () => {
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(body).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
  });

  it('keine festen Pixel- oder rem-Maße', () => {
    expect(body.match(/-?\d*\.?\d+(px|rem|em)\b/g) ?? []).toEqual([]);
  });

  it('jede verwendete Variable ist definiert', () => {
    const defined = new Set(tokenVars().map(([k]) => k));
    // zur Laufzeit gesetzt: Maßstäbe und Atlas-Bild
    for (const k of ['--s', '--so', '--atlas']) defined.add(k);
    const used = new Set([...body.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
    const missing = [...used].filter((k) => !defined.has(k));
    expect(missing).toEqual([]);
  });

  it('keine Variable aus tokens.ts bleibt unbenutzt (außer Dokumentation)', () => {
    const docOnly = new Set(['--bp-compact', '--bp-fan', '--hand-step-min', '--hand-step-over', '--hand-top', '--c-icon-line', '--c-icon-orange', '--c-icon-paper', '--c-shell']);
    const guideSrc = readFileSync(new URL('./guide.ts', import.meta.url), 'utf8');
    const spritesSrc = readFileSync(new URL('./sprites.ts', import.meta.url), 'utf8');
    const tokensSrc = readFileSync(new URL('./tokens.ts', import.meta.url), 'utf8');
    const unused: string[] = [];
    for (const [name] of tokenVars()) {
      if (docOnly.has(name)) continue;
      const refs = [css, guideSrc, tokensSrc.replace(new RegExp(`css: '${name}'`, 'g'), '')];
      const used = refs.some((src) => src.includes(`var(${name}`) || src.includes(`var(${name})`)) || tokensSrc.includes(`ref: '${name}'`) || tokensSrc.includes(`of: '${name}'`) || spritesSrc.includes(`'${name.replace('--c-', '')}'`);
      if (!used) unused.push(name);
    }
    expect(unused).toEqual([]);
  });
});

describe('Einheitliche Bausteine', () => {
  it('app.ts baut Buttons nur über btn()/backBtn()/iconBtn()', () => {
    expect(appSrc).not.toMatch(/h\(\s*'button'/);
  });

  it('es gibt keinen eigenen „Schließen“-Knopf mehr', () => {
    expect(appSrc).not.toContain("btn.close");
  });

  it('feste Farben stehen nur in tokens.ts', () => {
    for (const f of ['app.ts', 'sprites.ts', 'anim.ts', 'sound.ts', 'components.ts', 'guide.ts', 'icons.ts']) {
      const src = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
      expect(src, f).not.toMatch(/['"`]#[0-9a-fA-F]{6}['"`]/);
    }
  });

  it('Browser-Leistenfarbe in index.html kommt aus den Tokens', () => {
    expect(indexHtml).toContain('%SHELL_COLOR%');
    expect(indexHtml).not.toContain('#2e1d16');
  });
});

describe('Design Guide', () => {
  const ids = allSpecIds();

  it('Nummern der Elemente sind eindeutig und gültig', () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^\d{1,2}\.\d{2}$/);
  });

  it('Etiketten-Ziele haben gültige Selektoren-Texte', () => {
    for (const t of labelTargets()) {
      expect(t.sel.length).toBeGreaterThan(0);
      expect(ids).toContain(t.id);
    }
  });
});

describe('Kartenrückseiten', () => {
  it('Designs haben eindeutige Namen und liefern gültige Farbrollen', async () => {
    const { BACK_DESIGNS, BACK_FIELD, DEFAULT_BACK, backDesign } = await import('./backs');
    const ids = BACK_DESIGNS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_BACK);
    expect(backDesign('gibt-es-nicht').id).toBe(DEFAULT_BACK);
    for (const d of BACK_DESIGNS) {
      for (let y = 0; y < BACK_FIELD.h; y++) {
        for (let x = 0; x < BACK_FIELD.w; x++) {
          const r = d.paint({ x, y, dx: Math.abs(x - (BACK_FIELD.w - 1) / 2), dy: Math.abs(y - (BACK_FIELD.h - 1) / 2) });
          expect([null, 'main', 'dark', 'cream', 'gold']).toContain(r);
        }
      }
    }
  });
});
