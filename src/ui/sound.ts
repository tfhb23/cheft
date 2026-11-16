/** Kleine Pixel-Sounds per WebAudio, ohne Dateien. */
export type SoundName = 'card' | 'drawStock' | 'drawDiscard' | 'drawCarpet' | 'discard' | 'lay' | 'win' | 'lose' | 'error' | 'tick' | 'cheft';

let ctx: AudioContext | null = null;
let enabled = false;
/** Nur während einer Hör-Probe im Design Guide: spielt auch bei ausgeschaltetem Sound. */
let forced = false;
let master: AudioNode | null = null;

/** Alle Töne des Spiels mit Nummer, Wirkung und Rezept (Kapitel 9 im Design Guide). */
export const SOUND_CATALOG: { id: string; name: SoundName; label: string; use: string; recipe: string }[] = [
  { id: '9.01', name: 'card', label: 'Austeilen', use: 'Nach dem Austeilen; bei Stapel-Zug von Mitspielern', recipe: 'Rechteck 880 Hz, 50 ms' },
  { id: '9.02', name: 'drawStock', label: 'Ziehen vom Stapel', use: 'Eigener und fremder Zug vom Stapel', recipe: 'Rechteck 880 Hz, 50 ms (wie Austeilen)' },
  { id: '9.03', name: 'drawDiscard', label: 'Ziehen von der Ablage', use: 'Eigener und fremder Zug von der Ablage', recipe: 'Rechteck 659 Hz, 60 ms (tiefer, weicher als Stapel)' },
  { id: '9.04', name: 'drawCarpet', label: 'Ziehen der Teppichkarte', use: 'Die besondere Karte', recipe: 'Zwei Rechtecktöne aufwärts: 784 Hz, 1047 Hz' },
  { id: '9.05', name: 'discard', label: 'Abwerfen', use: 'Eigenes und fremdes Abwerfen', recipe: 'Dreieck 440 Hz, dann 330 Hz abwärts' },
  { id: '9.06', name: 'lay', label: 'Auslegen / Anlegen', use: 'Auslegen, Anlegen, Joker klauen; Testton beim Einschalten der Sounds', recipe: 'Drei Rechtecktöne aufwärts: 523, 659, 784 Hz' },
  { id: '9.07', name: 'win', label: 'Rundensieg', use: 'Du gewinnst die Runde', recipe: 'Vier Rechtecktöne aufwärts: 523, 659, 784, 1047 Hz' },
  { id: '9.08', name: 'lose', label: 'Niederlage', use: 'Jemand anderes gewinnt die Runde', recipe: 'Dreieck 330 Hz, dann 262 Hz abwärts' },
  { id: '9.09', name: 'error', label: 'Fehler', use: 'Unerlaubte Aktion', recipe: 'Sägezahn 180 Hz, 120 ms' },
  { id: '9.10', name: 'tick', label: 'Tick', use: 'Karte vorwählen, Bereit, Zurücklegen, Markieren', recipe: 'Rechteck 1320 Hz, 20 ms, sehr leise' },
  { id: '9.11', name: 'cheft', label: 'Cheft!', use: 'Jemand sagt Cheft an', recipe: 'Pauke, Sägezahn-Akkord, Lauf aufwärts, zweiter Einschlag mit Becken' },
];

/** Vibrationsmuster in Millisekunden (Pause/Impuls im Wechsel). Unter 30 ms spüren viele Android-Geräte nichts. */
export const VIB = {
  short: 30,
  error: [30, 60, 30] as number[],
  win: [40, 60, 40, 60, 80] as number[],
  cheft: 250,
  probe: 300,
};
export const VIBRATION_CATALOG: { id: string; label: string; pattern: number | number[]; use: string }[] = [
  { id: '9.21', label: 'Kurz', pattern: VIB.short, use: 'Jede eigene Aktion, Vorwahl, Rückblick' },
  { id: '9.22', label: 'Fehler', pattern: VIB.error, use: 'Unerlaubte Aktion' },
  { id: '9.23', label: 'Sieg', pattern: VIB.win, use: 'Du gewinnst die Runde' },
  { id: '9.24', label: 'Cheft', pattern: VIB.cheft, use: 'Du sagst Cheft an' },
  { id: '9.25', label: 'Probe', pattern: VIB.probe, use: 'Testimpuls beim Einschalten der Vibration' },
];

/** Gesamtlautstärke; der Kompressor verhindert Übersteuern bei den lauteren Effekten. */
const MASTER_GAIN = 1.7;

function out(): AudioNode {
  if (master) return master;
  const c = ctx!;
  const gain = c.createGain();
  gain.gain.value = MASTER_GAIN;
  const comp = c.createDynamicsCompressor();
  gain.connect(comp).connect(c.destination);
  master = gain;
  return gain;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function unlockAudio(): void {
  if (!enabled && !forced) return;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = null;
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function blip(freq: number, dur: number, type: OscillatorType, gain = 0.08, delay = 0): void {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(out());
  o.start(t);
  o.stop(t + dur);
}

/** Tiefer Paukenschlag: Sinus, dessen Tonhöhe schnell fällt. */
function boom(freq: number, dur: number, gain = 0.2, delay = 0): void {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.45, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(out());
  o.start(t);
  o.stop(t + dur);
}

/** Rauschstoß wie ein Becken, durch einen Hochpass geschickt. */
function crash(dur: number, gain = 0.07, delay = 0): void {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(hp).connect(g).connect(out());
  src.start(t);
}

/** Hör-Probe für den Design Guide: spielt unabhängig von der Einstellung „Sounds“. */
export function preview(name: SoundName): void {
  forced = true;
  try {
    play(name);
  } finally {
    forced = false;
  }
}

export function play(name: SoundName): void {
  if (!enabled && !forced) return;
  unlockAudio();
  if (!ctx) return;
  switch (name) {
    case 'card':
    case 'drawStock':
      blip(880, 0.05, 'square', 0.05);
      break;
    case 'drawDiscard':
      // Verwandt mit dem Stapel-Ton, aber tiefer und etwas weicher
      blip(659, 0.06, 'square', 0.05);
      break;
    case 'drawCarpet':
      // Zwei schnelle Töne aufwärts: die besondere Karte
      blip(784, 0.04, 'square', 0.05);
      blip(1047, 0.06, 'square', 0.05, 0.05);
      break;
    case 'tick':
      blip(1320, 0.02, 'square', 0.012);
      break;
    case 'lose':
      blip(330, 0.12, 'triangle', 0.05);
      blip(262, 0.2, 'triangle', 0.05, 0.11);
      break;
    case 'discard':
      blip(440, 0.07, 'triangle', 0.07);
      blip(330, 0.06, 'triangle', 0.05, 0.05);
      break;
    case 'lay':
      blip(523, 0.06, 'square', 0.05);
      blip(659, 0.06, 'square', 0.05, 0.06);
      blip(784, 0.08, 'square', 0.05, 0.12);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.12, 'square', 0.06, i * 0.1));
      break;
    case 'error':
      blip(180, 0.12, 'sawtooth', 0.05);
      break;
    case 'cheft':
      // Dramatisch: Paukenschlag mit verminderten Akkord, aufsteigender Lauf und ein zweiter, großer Einschlag
      boom(80, 0.55, 0.22);
      [220, 262, 311].forEach((f) => blip(f, 0.4, 'sawtooth', 0.045, 0.03));
      [262, 311, 370, 440, 523].forEach((f, i) => blip(f, 0.09, 'square', 0.05, 0.42 + i * 0.07));
      boom(65, 0.9, 0.26, 0.82);
      crash(0.7, 0.08, 0.82);
      [110, 131, 156, 220].forEach((f) => blip(f, 0.85, 'sawtooth', 0.05, 0.84));
      [440, 523, 622].forEach((f) => blip(f, 0.7, 'square', 0.035, 0.86));
      break;
  }
}

/** iPhone-Safari kennt navigator.vibrate nicht; ab iOS 18 löst das Umschalten eines Schalters einen Haptik-Impuls aus (nur direkt nach einer Berührung). */
function iosTick(): void {
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:-100px;top:-100px;opacity:0;pointer-events:none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.appendChild(input);
  document.body.appendChild(label);
  label.click();
  label.remove();
}

const isIos = (): boolean => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Unterstützt dieses Gerät die Vibration überhaupt (Android-Browser mit Vibration API oder iPhone mit Haptik-Fallback)? */
export function vibrationSupported(): boolean {
  return 'vibrate' in navigator || isIos();
}

/** Vibrationsmuster in Millisekunden. Einzelne Impulse unter 30 ms spüren viele Android-Geräte nicht. Gibt zurück, ob der Impuls ausgelöst werden konnte. */
export function vibrate(pattern: number | number[], on: boolean): boolean {
  if (!on) return true;
  try {
    if ('vibrate' in navigator) return navigator.vibrate(typeof pattern === 'number' ? Math.max(30, pattern) : pattern);
    if (isIos()) {
      iosTick();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
