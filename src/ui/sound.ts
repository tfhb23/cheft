/** Kleine Pixel-Sounds per WebAudio, ohne Dateien. */
export type SoundName = 'card' | 'drawStock' | 'drawDiscard' | 'drawCarpet' | 'discard' | 'lay' | 'win' | 'lose' | 'error' | 'tick' | 'cheft';

let ctx: AudioContext | null = null;
let enabled = false;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function unlockAudio(): void {
  if (!enabled) return;
  try {
    ctx = ctx ?? new AudioContext();
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
  o.connect(g).connect(ctx.destination);
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
  o.connect(g).connect(ctx.destination);
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
  src.connect(hp).connect(g).connect(ctx.destination);
  src.start(t);
}

export function play(name: SoundName): void {
  if (!enabled) return;
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
