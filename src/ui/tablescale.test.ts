import { describe, expect, it } from 'vitest';
import { MAX_RATIO, deviceClass, scaleGrid, snap, tableLadder } from './tablescale';

describe('Kartengrößen am Tisch: Raster in ganzen Geräte-Pixeln', () => {
  it('Dichte 1: ganze Stufen; Dichte 2: halbe; Dichte 3: Drittel', () => {
    expect(scaleGrid(1)).toEqual([1, 2, 3]);
    expect(scaleGrid(2)).toEqual([1, 1.5, 2, 2.5, 3]);
    expect(scaleGrid(3)).toEqual([1, 1.333, 1.667, 2, 2.333, 2.667, 3]);
  });

  it('jede Stufe ergibt ganze Geräte-Pixel je Kartenpixel (außer der Notstufe 1)', () => {
    for (const dpr of [1, 1.5, 2, 2.625, 3, 3.5]) {
      for (const s of scaleGrid(dpr)) {
        if (s === 1 && dpr % 1 !== 0 && scaleGrid(dpr).length && Math.abs(s * dpr - Math.round(s * dpr)) > 0.01) continue; // Notstufe
        expect(Math.abs(s * dpr - Math.round(s * dpr))).toBeLessThan(0.01);
      }
    }
  });

  it('Pixel (Dichte 2,625): crisp 1,143 / 1,524 / 1,905 …, keine Notstufe nötig', () => {
    const g = scaleGrid(2.625);
    expect(g[0]).toBeCloseTo(1.143, 3);
    expect(g).toContain(1.524);
    expect(g).not.toContain(1);
  });

  it('Dichte 1,25 (Windows 125 %): Notstufe 1, sonst nur grobe Stufen', () => {
    const g = scaleGrid(1.25);
    expect(g[0]).toBe(1);
    expect(g).toContain(1.6);
  });

  it('snap nimmt die größte Stufe, die das Ziel nicht (nennenswert) überschreitet', () => {
    expect(snap([1, 1.333, 1.667, 2], 1.75)).toBe(1.667);
    expect(snap([1, 1.5, 2], 1.4)).toBe(1);
    expect(snap([1, 1.524, 1.905], 1.5)).toBe(1.524); // kleine Toleranz nach oben
    expect(snap([1, 2, 3], 1.75)).toBe(1);
    expect(snap([1.6, 2.4], 1.2)).toBe(1.6); // nichts darunter: die kleinste
  });
});

describe('Kartengrößen am Tisch: Geräteklassen', () => {
  it('Umschaltpunkte wie beim Maßstab der Handkarten', () => {
    expect(deviceClass(360, 740)).toBe('phoneNarrow');
    expect(deviceClass(412, 915)).toBe('phone');
    expect(deviceClass(820, 1100)).toBe('tablet');
    expect(deviceClass(1100, 700)).toBe('tablet');
    expect(deviceClass(1280, 900)).toBe('desktop');
  });
});

describe('Kartengrößen am Tisch: Reihenfolge beim Verkleinern', () => {
  it('Mitte nie kleiner als die Auslagen, höchstens 1,75-mal so groß, nie größer als die Hand', () => {
    for (const dpr of [1, 1.25, 1.5, 2, 2.625, 3]) {
      for (const [cls, hand] of [['phoneNarrow', 2], ['phone', 2], ['tablet', 2], ['desktop', 3]] as const) {
        const l = tableLadder(dpr, cls, hand);
        expect(l.length).toBeGreaterThan(0);
        for (const st of l) {
          expect(st.c).toBeGreaterThanOrEqual(st.a - 1e-9);
          expect(st.c).toBeLessThanOrEqual(MAX_RATIO * st.a + 1e-6);
          expect(st.c).toBeLessThanOrEqual(hand + 0.1);
        }
        // Reihenfolge: nie größer als der Schritt davor
        for (let i = 1; i < l.length; i++) expect(l[i].a + l[i].c).toBeLessThanOrEqual(l[i - 1].a + l[i - 1].c + 1e-9);
      }
    }
  });

  it('Startgrößen der Vorschlagstabelle (Dichte 2)', () => {
    expect(tableLadder(2, 'phoneNarrow', 2)[0]).toEqual({ a: 2, c: 2 });
    expect(tableLadder(2, 'phone', 2)[0]).toEqual({ a: 2, c: 2 });
    expect(tableLadder(2, 'tablet', 2)[0]).toEqual({ a: 2, c: 2 });
    expect(tableLadder(2, 'desktop', 3)[0]).toEqual({ a: 3, c: 3 });
  });

  it('großer Desktop, Dichte 2: 3/3, 2,5/3, 2,5/2,5, 2/2,5 … bis 1/1,5 und 1/1', () => {
    const l = tableLadder(2, 'desktop', 3).map((x) => `${x.a}/${x.c}`);
    expect(l.slice(0, 5)).toEqual(['3/3', '2.5/3', '2.5/2.5', '2/3', '2/2.5']);
    expect(l[l.length - 1]).toBe('1/1');
    expect(l).toContain('1/1.5');
  });

  it('iPhone (Dichte 3): schmal startet mit 2 zu 2', () => {
    expect(tableLadder(3, 'phoneNarrow', 2)[0]).toEqual({ a: 2, c: 2 });
  });

  it('Google Pixel (Dichte 2,625): Start in der Klasse Handy normal', () => {
    const first = tableLadder(2.625, 'phone', 2)[0];
    expect(first.a).toBeCloseTo(1.905, 3);
    expect(first.c).toBeCloseTo(1.905, 3);
  });

  it('Dichte 1: nur ganze Stufen, Verhältnis höchstens 1,75', () => {
    const l = tableLadder(1, 'desktop', 3).map((x) => `${x.a}/${x.c}`);
    expect(l).toEqual(['3/3', '2/3', '2/2', '1/1']);
  });
});
