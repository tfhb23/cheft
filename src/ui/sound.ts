/** Kleine Pixel-Sounds per WebAudio, ohne Dateien. */
export type SoundName = 'card' | 'discard' | 'lay' | 'win' | 'error';

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

export function play(name: SoundName): void {
  if (!enabled) return;
  unlockAudio();
  if (!ctx) return;
  switch (name) {
    case 'card':
      blip(880, 0.05, 'square', 0.05);
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
  }
}

export function vibrate(ms: number, on: boolean): void {
  if (!on) return;
  try {
    if ('vibrate' in navigator) navigator.vibrate(ms);
  } catch {
    /* ignorieren */
  }
}
