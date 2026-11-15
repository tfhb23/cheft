/**
 * Verschlüsselte Spielstand-Kopien. Der Server gibt sie an die Clients mit; ein Client reicht sie beim
 * Wiederverbinden zurück, wenn der Server zwischenzeitlich eingeschlafen ist und den Raum vergessen hat.
 * Der Schlüssel kommt aus CHEFT_SECRET (auf Render automatisch erzeugt); ohne gesetzte Variable gilt er nur bis zum Neustart.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

const SECRET = process.env.CHEFT_SECRET || randomBytes(32).toString('hex');
const KEY = createHash('sha256').update(`cheft-snapshot:${SECRET}`).digest();

/** Komprimiert, verschlüsselt und kodiert beliebige JSON-Daten als kurzen Text. */
export function seal(data: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const body = Buffer.concat([cipher.update(deflateRawSync(Buffer.from(JSON.stringify(data), 'utf8'))), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

/** Gegenstück zu seal; liefert null bei Fälschung, falschem Schlüssel oder kaputtem Text. */
export function open(text: unknown): unknown | null {
  if (typeof text !== 'string' || text.length < 40 || text.length > 400_000) return null;
  try {
    const buf = Buffer.from(text, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', KEY, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const plain = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]);
    return JSON.parse(inflateRawSync(plain, { maxOutputLength: 4_000_000 }).toString('utf8'));
  } catch {
    return null;
  }
}
