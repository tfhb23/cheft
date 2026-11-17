/**
 * Namen für das Rollen-System V3: 4 Gedächtnisse × 6 Rollen. Jede Kombination hat mindestens vier Namen; die Namen stammen wie bisher aus
 * dem deutschen, türkischen und fernöstlichen Erzählgut (dazu zwei Gäste aus Star Trek: Das nächste Jahrhundert). Die Stufe färbt die Namen:
 * Vergesslich eher naive Figuren, Normal Alltagsfiguren, Scharfsinnig kluge, Mastermind legendäre.
 *
 * Wo die Namen herkommen (alte Spielweise → neue Rolle):
 *   Ausgewogen    wie bisher (Ausgewogen); Mastermind dazu Data
 *   Frühvogel     aus dem Sprinter (der Fuchs Reineke ging zum Gerissenen, dafür kam Swinegel aus „Hase und Igel“: „Ick bün al hier!“)
 *   Gerissener    aus dem Jokerjäger (lauter Schelme und Schlauberger), dazu Reineke und Zhuge Liang
 *   Pärchenkönig  aus dem Cheft-Fan (berühmte Liebes- und Geschwisterpaare), auf männliche Namen umgestellt, weil „Pärchenkönig“ männlich ist
 *   Glücksritter  aus dem Zocker (Hans im Glück, Fortunatus, die Glücksgötter Ebisu und Fukurokuju)
 *   Wildcard      neu: Gestaltwandler und Unberechenbare (Rübezahl, Sun Wukong, Proteus); Mastermind unter anderem Q
 */
import type { BotLevel } from '../engine/game';
import type { RoleId } from './roles';

export const ROLE_NAMES: Record<BotLevel, Record<RoleId, string[]>> = {
  easy: {
    balanced: ['Tünnes', 'Dursun', 'Bajie', 'Bolle'],
    early: ['Hans', 'Temel', 'Momotaro', 'Struwwel'],
    cunning: ['Däumling', 'Keloğlan', 'Issun', 'Pumuckl'],
    pairs: ['Moritz', 'Hacivat', 'Heungbu', 'Tahir'],
    gambler: ['Hieronymus', 'Hans im Glück', 'Lu Da', 'Kalender'],
    wildcard: ['Rübezahl', 'Taugenichts', 'Momo', 'Schlemihl'],
  },
  normal: {
    balanced: ['Effi', 'Memed', 'Genji', 'Botchan'],
    early: ['Till', 'Bamsı', 'Kintaro', 'Hızır'],
    cunning: ['Krabat', 'Köroğlu', 'Gildong', 'Goemon'],
    pairs: ['Max', 'Tamino', 'Baoyu', 'Mongryong'],
    gambler: ['Felix', 'Kaygusuz', 'Bahtiyar', 'Ebisu'],
    wildcard: ['Şahmeran', 'Kaguya', 'Karagöz', 'Peer Gynt'],
  },
  hard: {
    balanced: ['Schäl', 'Dede', 'Zhou Yu', 'Çelebi'],
    early: ['Swinegel', 'Ferhat', 'Musashi', 'Tengu'],
    cunning: ['Reineke', 'Rumpelstilz', 'Nasreddin', 'Ne Zha', 'Kitsune'],
    pairs: ['Hänsel', 'Kerem', 'Niulang', 'Tristan'],
    gambler: ['Munk', 'Köse', 'Li Kui', 'Leverkühn'],
    wildcard: ['Mephisto', 'Tamamo', 'Merlin', 'Loki'],
  },
  master: {
    balanced: ['Faust', 'Danişmend', 'Sima Yi', 'Zeami', 'Data'],
    early: ['Siegfried', 'Dede Korkut', 'Lü Bu', 'Yoshitsune'],
    cunning: ['Eulenspiegel', 'Aladdin', 'Tanuki', 'Zhuge Liang'],
    pairs: ['Schahriyar', 'Mecnun', 'Liang Shanbo', 'Graf vom Strahl'],
    gambler: ['Wallenstein', 'Fortunatus', 'Ji Gong', 'Fukurokuju'],
    wildcard: ['Q', 'Sun Wukong', 'Proteus', 'Nüwa'],
  },
};

/** Wählt einen noch freien Namen für die Kombination; sind alle vergeben, darf sich ein Name wiederholen. */
export function pickRoleName(level: BotLevel, role: RoleId, rng: () => number, used: ReadonlySet<string> = new Set()): string {
  const all = ROLE_NAMES[level][role];
  const free = all.filter((n) => !used.has(n));
  const pool = free.length > 0 ? free : all;
  return pool[Math.floor(rng() * pool.length) % pool.length];
}
