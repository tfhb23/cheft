import { de } from './de';
import { Card, isJoker } from '../engine/cards';

const languages: Record<string, Record<string, string>> = { de };
let current = 'de';

export function setLanguage(code: string): void {
  if (languages[code]) current = code;
}

export function t(key: string, params?: Record<string, string | number>): string {
  let s = languages[current][key] ?? languages.de[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function cardName(c: Card): string {
  if (isJoker(c)) return t('card.joker');
  const rank = c.rank === 1 || c.rank >= 11 ? t(`rank.${c.rank}`) : String(c.rank);
  return `${t(`suit.${c.suit}`)} ${rank}`;
}
