/** Ersatznamen für Spieler, die ihren Namen vergessen haben (höchstens 12 Zeichen, so lang darf ein Name sein). */
export const FORGOTTEN_NAMES: string[] = [
  'Wer bin ich',
  'Namenlos',
  'Dings',
  'Dingsbums',
  'Sir Vergess',
  'Frau Vergess',
  'Wie hieß ich',
  'Ähm',
  'Irgendwer',
  'Unbekannt',
  'Name folgt',
  'Hallo Ich',
  'Moment Mal',
  'Vergessen',
  'Mustermann',
  'Name fehlt',
  'Kopfleer',
  'Name lädt',
  'Null Ahnung',
  'Wie heiß ich',
  'Sir Namenlos',
  'Hä Was',
  'Herr Ähm',
];

export function randomForgottenName(rng: () => number = Math.random): string {
  return FORGOTTEN_NAMES[Math.floor(rng() * FORGOTTEN_NAMES.length)];
}
