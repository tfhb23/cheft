import { describe, it, expect } from 'vitest';
import { packSave, unpackSave } from './savecode';
import { testGame } from '../engine/testutil';

describe('Spielstand-Code', () => {
  const data = { state: testGame(4, 5), order: [1, 2, 3] };
  const json = JSON.stringify(data);

  it('Hin und zurück, deutlich kürzer als reines Base64', async () => {
    const code = await packSave(data);
    expect(code.startsWith('C1.')).toBe(true);
    expect(code.length).toBeLessThan(btoa(json).length / 3);
    expect(await unpackSave(code)).toBe(json);
  });

  it('liest ältere unkomprimierte Codes, auch mit Zeilenumbrüchen und Anführungszeichen', async () => {
    const old = btoa(unescape(encodeURIComponent(json)));
    expect(await unpackSave(old)).toBe(json);
    const wrapped = '"' + old.replace(/(.{60})/g, '$1\n') + '"';
    expect(await unpackSave(wrapped)).toBe(json);
  });

  it('wirft bei abgeschnittenem oder beschädigtem Code', async () => {
    const code = await packSave(data);
    await expect(unpackSave(code.slice(0, 40))).rejects.toBeDefined();
    await expect(unpackSave('quatsch!!')).rejects.toBeDefined();
  });
});
