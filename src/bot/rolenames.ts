/**
 * Namen für das Rollen-System V3: 4 Gedächtnisse × 6 Rollen, jede Kombination mit mindestens fünf Namen (nicht einheitlich viele). Die Namen stammen
 * wie bisher aus dem deutschen, türkischen und fernöstlichen Erzählgut, dazu Gäste aus Star Trek: Das nächste Jahrhundert (Q, Data, Picard).
 * Die Stufe färbt die Namen: Vergesslich naive, Normal Alltags-, Scharfsinnig kluge, Mastermind legendäre Figuren.
 *
 * Jeder Name trägt eine Geschlechtskennzeichnung (m, f oder n für geschlechtsneutral: Tiere, Geister, Wesen), damit sich das Verhältnis prüfen und
 * später gezielt ergänzen lässt. Die Rollennamen selbst sind kein Hinweis auf das Geschlecht der Figur.
 *
 * Herkunft (alte Spielweise → Rolle): Ausgewogen wie bisher; Frühvogel aus dem Sprinter (dazu Swinegel, der Igel aus „Hase und Igel“: „Ick bün al hier!“, und
 * der Hahn); Gerissener aus dem Jokerjäger (Schelme und Schlauberger, dazu Nasrudin und Picard mit dem Picard-Manöver); Pärchenkönig aus dem Cheft-Fan
 * (berühmte Liebes- und Geschwisterpaare); Glücksritter aus dem Zocker (Glückskinder und Glücksgötter); Wildcard neu (Gestaltwandler und Unberechenbare).
 */
import type { BotLevel } from '../engine/game';
import type { RoleId } from './roles';

export type Gender = 'm' | 'f' | 'n';
export interface BotName {
  name: string;
  gender: Gender;
}
const m = (name: string): BotName => ({ name, gender: 'm' });
const f = (name: string): BotName => ({ name, gender: 'f' });
const n = (name: string): BotName => ({ name, gender: 'n' });

export const ROLE_NAMES: Record<BotLevel, Record<RoleId, BotName[]>> = {
  easy: {
    balanced: [m('Tünnes'), m('Dursun'), m('Bajie'), m('Bolle'), f('Sterntaler'), f('Simcheong'), n('Wichtel'), f('Aschenputtel')],
    early: [m('Hans'), m('Temel'), m('Momotaro'), m('Struwwel'), f('Rotkäppchen'), f('Heidi'), n('Hahn'), f('Pünktchen')],
    cunning: [m('Däumling'), m('Keloğlan'), m('Issun'), n('Pumuckl'), m('Nasrudin'), f('Kluge Else'), n('Gestiefelter Kater'), f('Kleine Hexe')],
    pairs: [m('Moritz'), m('Hacivat'), m('Heungbu'), m('Tahir'), f('Zühre'), f('Gretel'), n('Turteltaube'), f('Leyla')],
    gambler: [m('Hieronymus'), m('Hans im Glück'), m('Lu Da'), m('Kalender'), f('Otafuku'), f('Pechmarie'), n('Maneki-neko')],
    wildcard: [m('Rübezahl'), m('Taugenichts'), f('Momo'), m('Schlemihl'), n('Irrlicht'), f('Nixe'), f('Undine')],
  },
  normal: {
    balanced: [f('Effi'), m('Memed'), m('Genji'), m('Botchan'), f('Lotte'), f('Murasaki'), n('Kodama')],
    early: [m('Till'), m('Bamsı'), m('Kintaro'), m('Hızır'), f('Banu Çiçek'), n('Lerche'), f('Nene Hatun'), f('Kara Fatma')],
    cunning: [m('Krabat'), m('Köroğlu'), m('Gildong'), m('Goemon'), f('Diaochan'), f('Hürrem'), n('Bakeneko'), f('Hwang Jini')],
    pairs: [m('Max'), m('Tamino'), m('Baoyu'), m('Mongryong'), f('Chunhyang'), f('Pamina'), n('Yuanyang'), f('Şirin')],
    gambler: [m('Felix'), m('Kaygusuz'), m('Bahtiyar'), m('Ebisu'), f('Goldmarie'), f('Xifeng'), n('Zashiki-Warashi'), f('Mazu')],
    wildcard: [f('Şahmeran'), f('Kaguya'), m('Karagöz'), m('Peer Gynt'), f('Bai Suzhen'), n('Nöck'), f('Tsuru')],
  },
  hard: {
    balanced: [m('Schäl'), m('Dede'), m('Zhou Yu'), m('Çelebi'), f('Frau Holle'), f('Shōnagon'), n('Heinzelmännchen'), f('Gudrun')],
    early: [n('Swinegel'), m('Ferhat'), m('Musashi'), n('Tengu'), f('Tomoe Gozen'), f('Brunhild'), f('Sun Shangxiang')],
    cunning: [m('Reineke'), m('Rumpelstilz'), m('Nasreddin'), m('Ne Zha'), n('Kitsune'), f('Kösem'), f('Kluge Bauerntochter'), f('Ortrud'), f('Xishi')],
    pairs: [m('Hänsel'), m('Kerem'), m('Niulang'), m('Tristan'), f('Aslı'), f('Zhinü'), f('Daiyu'), n('Falter')],
    gambler: [m('Munk'), m('Köse'), m('Li Kui'), m('Leverkühn'), f('Kichijōten'), f('Lorelei'), n('Daruma'), n('Pixiu')],
    wildcard: [m('Mephisto'), f('Tamamo'), m('Merlin'), n('Loki'), f('Alraune'), f('Melusine')],
  },
  master: {
    balanced: [m('Faust'), m('Danişmend'), m('Sima Yi'), m('Zeami'), n('Data'), f('Hildegard'), n('Simurg'), f('Himiko'), f('Amaterasu')],
    early: [m('Siegfried'), m('Dede Korkut'), m('Lü Bu'), m('Yoshitsune'), f('Mulan'), f('Kriemhild'), n('Zümrüdü Anka'), f('Tomyris')],
    cunning: [m('Eulenspiegel'), m('Aladdin'), n('Tanuki'), m('Zhuge Liang'), m('Picard'), f('Scheherazade'), f('Wu Zetian'), f('Cixi')],
    pairs: [m('Schahriyar'), m('Mecnun'), m('Liang Shanbo'), m('Graf vom Strahl'), f('Käthchen'), f('Zhu Yingtai'), f('Isolde'), f('Zeynep'), n('Fenghuang')],
    gambler: [m('Wallenstein'), m('Fortunatus'), m('Ji Gong'), m('Fukurokuju'), f('Benzaiten'), f('Fortuna'), n('Qilin'), f('Chang\'e')],
    wildcard: [n('Q'), m('Sun Wukong'), m('Proteus'), f('Nüwa'), f('Xi Wangmu'), n('Nue'), f('Yuki-onna'), n('Gumiho')],
  },
};

/** Die Namen einer Kombination als einfache Liste. */
export function roleNames(level: BotLevel, role: RoleId): string[] {
  return ROLE_NAMES[level][role].map((x) => x.name);
}

/** Wählt einen noch freien Namen für die Kombination; sind alle vergeben, darf sich ein Name wiederholen. */
export function pickRoleName(level: BotLevel, role: RoleId, rng: () => number, used: ReadonlySet<string> = new Set()): string {
  const all = roleNames(level, role);
  const free = all.filter((x) => !used.has(x));
  const pool = free.length > 0 ? free : all;
  return pool[Math.floor(rng() * pool.length) % pool.length];
}

/** Anzahl der Namen je Geschlecht (für Prüfungen und Ergänzungen). */
export function genderCounts(names: BotName[]): Record<Gender, number> {
  const c: Record<Gender, number> = { m: 0, f: 0, n: 0 };
  for (const x of names) c[x.gender]++;
  return c;
}
