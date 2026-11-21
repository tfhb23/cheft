import { describe, expect, it } from 'vitest';
import { discardContour, Pt } from './dropzone';

const rect = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

function bounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const n = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [parseFloat(m[1]), parseFloat(m[2])]);
  return { minX: Math.min(...n.map((p) => p[0])), minY: Math.min(...n.map((p) => p[1])), maxX: Math.max(...n.map((p) => p[0])), maxY: Math.max(...n.map((p) => p[1])) };
}

describe('discardContour', () => {
  it('ohne Karten keine Kontur', () => {
    expect(discardContour([], 8)).toBeNull();
  });

  it('eine Karte: Rand liegt im Abstand um die Karte', () => {
    const c = discardContour([rect(20, 30, 32, 44)], 8)!;
    expect(c.d.startsWith('M')).toBe(true);
    expect(c.d.endsWith('Z')).toBe(true);
    const b = bounds(c.d);
    expect(c.x + b.minX).toBeGreaterThanOrEqual(20 - 8 - 1);
    expect(c.x + b.minX).toBeLessThanOrEqual(20 - 8 + 1.5);
    expect(c.x + b.maxX).toBeGreaterThanOrEqual(52 + 8 - 1.5);
    expect(c.y + b.minY).toBeLessThanOrEqual(30 - 8 + 1.5);
    expect(c.y + b.maxY).toBeGreaterThanOrEqual(74 + 8 - 1.5);
  });

  it('mehrere gedrehte Karten ergeben eine zusammenhängende Kontur', () => {
    const rot = (a: number): Pt[] => {
      const r = (a * Math.PI) / 180;
      return ([[-16, -22], [16, -22], [16, 22], [-16, 22]] as Pt[]).map(([x, y]) => [60 + x * Math.cos(r) - y * Math.sin(r), 60 + x * Math.sin(r) + y * Math.cos(r)]);
    };
    const c = discardContour([rot(-8), rot(12), rot(0)], 8)!;
    expect((c.d.match(/M/g) ?? []).length).toBe(1);
    expect(c.w).toBeGreaterThan(40);
  });
});
