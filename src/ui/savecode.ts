/**
 * Spielstand-Code: der Spielstand als Text zum Kopieren. Neue Codes sind komprimiert (Anfang "C1.") und damit
 * etwa zehnmal kürzer. Ältere, unkomprimierte Codes (reines Base64) lassen sich weiter einlesen.
 */

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function packSave(data: unknown): Promise<string> {
  const json = JSON.stringify(data);
  if (typeof CompressionStream === 'undefined') return btoa(unescape(encodeURIComponent(json)));
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return 'C1.' + toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Liefert den JSON-Text des Spielstands oder wirft einen Fehler, wenn der Code unvollständig oder beschädigt ist. */
export async function unpackSave(code: string): Promise<string> {
  const c = code.replace(/\s+/g, '').replace(/^["'`]+|["'`]+$/g, '');
  if (c.startsWith('{')) return c;
  if (c.startsWith('C1.')) {
    const b64 = c.slice(3).replace(/-/g, '+').replace(/_/g, '/');
    const bytes = fromBase64(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Response(stream).text();
  }
  // Älterer Code: Base64 (auch in der URL-sicheren Schreibweise)
  const b64 = c.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))));
}
