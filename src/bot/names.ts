/**
 * Bot-Rollen und Namen: 3 Stufen × 8 Spielweisen = 24 Rollen, je 4 Namen.
 * Namen sind literarischen und volkstümlichen Figuren aus dem deutschen,
 * türkischen und fernöstlichen Raum entlehnt.
 */
import { BotLevel, BotStyle } from '../engine/game';

export const LEVELS: BotLevel[] = ['easy', 'normal', 'hard'];
export const STYLES: BotStyle[] = ['balanced', 'sprinter', 'cheft', 'hand', 'blocker', 'counter', 'joker', 'gambler'];

export const NAMES: Record<BotLevel, Record<BotStyle, [string, string, string, string]>> = {
  easy: {
    balanced: ['Tünnes', 'Dursun', 'Bajie', 'Bolle'],
    sprinter: ['Hans', 'Temel', 'Momotaro', 'Struwwel'],
    cheft: ['Moritz', 'Hacivat', 'Heungbu', 'Tahir'],
    hand: ['Taugenichts', 'Mecnun', 'Urashima', 'Momo'],
    blocker: ['Rübezahl', 'Karagöz', 'Nolbu', 'Benkei'],
    counter: ['Emil', 'Hodscha', 'Shōnagon', 'Riese'],
    joker: ['Däumling', 'Keloğlan', 'Issun', 'Pumuckl'],
    gambler: ['Hieronymus', 'Kerem', 'Lu Da', 'Kalender'],
  },
  normal: {
    balanced: ['Effi', 'Memed', 'Genji', 'Botchan'],
    sprinter: ['Till', 'Bamsı', 'Kintaro', 'Hızır'],
    cheft: ['Max', 'Zühre', 'Chunhyang', 'Baoyu'],
    hand: ['Siddhartha', 'Yunus', 'Sanzang', 'Meister'],
    blocker: ['Hagen', 'Dumrul', 'Zhang Fei', 'Dietrich'],
    counter: ['Kröger', 'Kemal', 'Kongming', 'Sun Bin'],
    joker: ['Krabat', 'Köroğlu', 'Gildong', 'Goemon'],
    gambler: ['Felix', 'Kaygusuz', 'Xifeng', 'Bahtiyar'],
  },
  hard: {
    balanced: ['Schäl', 'Dede', 'Zhou Yu', 'Çelebi'],
    sprinter: ['Reineke', 'Ferhat', 'Musashi', 'Tengu'],
    cheft: ['Gretel', 'Aslı', 'Daiyu', 'Zhinü'],
    hand: ['Schlemihl', 'Şahmeran', 'Kaguya', 'Parzival'],
    blocker: ['Brunhild', 'Battal', 'Zhao Yun', 'Fafnir'],
    counter: ['Cipolla', 'Kalfa', 'Sima', 'Kien'],
    joker: ['Rumpelstilz', 'Nasreddin', 'Ne Zha', 'Kitsune'],
    gambler: ['Munk', 'Köse', 'Li Kui', 'Leverkühn'],
  },
};

export interface BotChoice {
  level: BotLevel | 'random';
  style: BotStyle | 'random';
}

/** Löst Zufallswahlen auf und vergibt eindeutige Namen. */
export function resolveBots(choices: BotChoice[], rng: () => number): { level: BotLevel; style: BotStyle; name: string }[] {
  const used = new Set<string>();
  return choices.map((c) => {
    const level = c.level === 'random' ? LEVELS[Math.floor(rng() * LEVELS.length)] : c.level;
    const style = c.style === 'random' ? STYLES[Math.floor(rng() * STYLES.length)] : c.style;
    const pool = NAMES[level][style].filter((n) => !used.has(n));
    const candidates = pool.length ? pool : NAMES[level][style];
    const name = candidates[Math.floor(rng() * candidates.length)];
    used.add(name);
    return { level, style, name };
  });
}
