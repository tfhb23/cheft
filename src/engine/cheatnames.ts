/**
 * Namen und Meldungen der Cheats. Alles, was später frei benannt werden soll, steht NUR hier.
 * Die Namen sind Platzhalter; Groß/Kleinschreibung, Leerzeichen, Bindestriche und Unterstriche im Namen sind beim Eingeben egal
 * ("BIG DADDY" = "bigdaddy"), Umlaute werden als AE/OE/UE geschrieben. Mehrere Namen je Cheat sind möglich (Aliase).
 *
 * Wichtig beim Vergeben: Kein Name darf aus der Aneinanderreihung zweier anderer Namen bestehen, da zwischen Cheats kein
 * Trennzeichen nötig ist (cheats.test.ts prüft das).
 */

export type CheatId = 'jokers' | 'hand' | 'rounds' | 'laidOut' | 'carpet' | 'autoplay' | 'timeTravel' | 'firstMeld' | 'deck2' | 'deck3' | 'deck4' | 'jokerParty' | 'mini' | 'superFast';

export const CHEAT_NAMES: Record<CheatId, string[]> = {
  jokers: ['JOKER'],
  hand: ['HAND'],
  rounds: ['RUNDEN'],
  laidOut: ['AUSGELEGT'],
  carpet: ['TEPPICH'],
  autoplay: ['AUTOPLAY'],
  timeTravel: ['ZEITREISE'],
  firstMeld: ['ERSTMELDUNG'],
  // Deck: jede Karte doppelt/dreifach/vierfach so oft wie im Standardspiel (also 4, 6 oder 8 Kopien), Joker mit
  deck2: ['DOPPELT'],
  deck3: ['DREIFACH'],
  deck4: ['VIERFACH'],
  jokerParty: ['JOKERPARTY'],
  mini: ['MINI'],
  superFast: ['SUPERFAST'],
};

/** Meldung beim Aktivieren eines Cheats (Platzhalter). */
export const CHEAT_MESSAGES: Record<CheatId, string> = {
  jokers: 'Cheat aktiv: Joker in jeder Runde.',
  hand: 'Cheat aktiv: Wunschhand.',
  rounds: 'Cheat aktiv: eigene Rundenzahl.',
  laidOut: 'Cheat aktiv: Du startest mit ausgelegter Kombination.',
  carpet: 'Cheat aktiv: Die Teppichkarte passt zu deiner Hand.',
  autoplay: 'Cheat aktiv: Autoplay.',
  timeTravel: 'Cheat aktiv: Zeitreise.',
  firstMeld: 'Cheat aktiv: niedrigere Erstmeldung.',
  deck2: 'Cheat aktiv: doppelt so viele Karten.',
  deck3: 'Cheat aktiv: dreimal so viele Karten.',
  deck4: 'Cheat aktiv: viermal so viele Karten.',
  jokerParty: 'Cheat aktiv: Jokerparty.',
  mini: 'Cheat aktiv: Mini-Deck (7 bis Ass).',
  superFast: 'Cheat aktiv: Bots spielen mit maximalem Tempo.',
};

/** Testhände, die als Zeile in `HAND( … )` stehen dürfen (Platzhalter-Namen). */
export type PresetId = 'pairs' | 'fivePairs' | 'runs' | 'almost';
export const PRESET_NAMES: Record<PresetId, string[]> = {
  pairs: ['PAARE'],
  fivePairs: ['FUENFPAARE'],
  runs: ['HANDRUMMEL'],
  almost: ['FASTFERTIG'],
};

/** Der Joker als Karte in der Wunschhand. */
export const JOKER_CARD_NAMES = ['J', 'JOKER'];

/** Rollen für Autoplay (und später den Tipp). */
export const ROLE_NAMES: Record<string, string[]> = {
  balanced: ['AUSGEWOGEN'],
  early: ['FRUEHVOGEL'],
  cunning: ['GERISSENER'],
  pairs: ['PAERCHENKOENIG'],
  gambler: ['GLUECKSRITTER'],
  wildcard: ['WILDCARD'],
};
