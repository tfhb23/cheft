/**
 * Bot-Rollen und Namen: 3 Stufen × 8 Spielweisen = 24 Rollen, je 3 Namen.
 * Namen sind literarischen und volkstümlichen Figuren aus dem deutschen,
 * türkischen und fernöstlichen Raum entlehnt.
 */
import { BotLevel, BotStyle } from '../engine/game';

export const LEVELS: BotLevel[] = ['easy', 'normal', 'hard'];
export const STYLES: BotStyle[] = ['balanced', 'sprinter', 'cheft', 'hand', 'blocker', 'counter', 'joker', 'gambler'];

export const NAMES: Record<BotLevel, Record<BotStyle, [string, string, string]>> = {
  easy: {
    balanced: ['Tünnes', 'Dursun', 'Bajie'],
    sprinter: ['Hans', 'Temel', 'Momotaro'],
    cheft: ['Moritz', 'Hacivat', 'Heungbu'],
    hand: ['Taugenichts', 'Mecnun', 'Urashima'],
    blocker: ['Rübezahl', 'Karagöz', 'Nolbu'],
    counter: ['Emil', 'Hodscha', 'Shōnagon'],
    joker: ['Däumling', 'Keloğlan', 'Issun'],
    gambler: ['Hieronymus', 'Kerem', 'Lu Da'],
  },
  normal: {
    balanced: ['Effi', 'Memed', 'Genji'],
    sprinter: ['Till', 'Bamsı', 'Kintaro'],
    cheft: ['Max', 'Zühre', 'Chunhyang'],
    hand: ['Siddhartha', 'Yunus', 'Sanzang'],
    blocker: ['Hagen', 'Dumrul', 'Zhang Fei'],
    counter: ['Kröger', 'Kemal', 'Kongming'],
    joker: ['Krabat', 'Köroğlu', 'Gildong'],
    gambler: ['Felix', 'Kaygusuz', 'Xifeng'],
  },
  hard: {
    balanced: ['Schäl', 'Dede', 'Zhou Yu'],
    sprinter: ['Reineke', 'Ferhat', 'Musashi'],
    cheft: ['Gretel', 'Aslı', 'Daiyu'],
    hand: ['Schlemihl', 'Şahmeran', 'Kaguya'],
    blocker: ['Brunhild', 'Battal', 'Zhao Yun'],
    counter: ['Cipolla', 'Kalfa', 'Sima'],
    joker: ['Rumpelstilz', 'Nasreddin', 'Ne Zha'],
    gambler: ['Munk', 'Köse', 'Li Kui'],
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
