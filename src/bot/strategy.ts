/**
 * Strategische Abwägung der Bots: Sofort rauskommen oder noch warten?
 *
 * Wer bei 51 Augen immer sofort rauskommt, spielt wie eine Maschine, und Cheft hat nie eine Chance, weil keiner Zeit
 * für fünf Paare lässt. Die Hürde für alle Nachfolger ist die letzte Erstmeldung + 1: Wer hoch rauskommt, macht es den
 * Gegnern schwer, und wer ihre Erstmeldung verpasst, zahlt 100 Strafpunkte. Das Warten kostet aber auch etwas:
 * Kommt ein Gegner zuerst raus, steigt die eigene Hürde.
 *
 * Die Abwägung hängt ab von
 *   - dem Tabellenstand: Wer hinten liegt, muss mehr riskieren; wer vorn liegt und Abstand gewinnen will, ebenso;
 *     wer kurz vor Spielende führt, sichert (Ehrgeiz, `ambition`);
 *   - der Erstmeldung selbst: Eine hohe Erstmeldung hebt die Hürde schon und wird sofort gelegt;
 *   - den Chancen, die Erstmeldung beim nächsten Zug noch deutlich zu erhöhen (aus dem, was der Bot noch weiß);
 *   - der Lage am Tisch: Ist ein Gegner schon draußen, gibt es nichts mehr abzuwarten;
 *   - dem Spielverlauf: Der Stapel wird leer, oder die Geduld (eigene Züge) ist aufgebraucht.
 * Alles ist eine reine Funktion des Spielzustands (keine eigene Erinnerung).
 */
import { Card, isJoker } from '../engine/cards';
import { GameState, deckConfig, thresholdFor } from '../engine/game';
import { deckSize } from '../engine/cards';
import { Meld, ROMME_TYPES, addOptions, findPartition, interpretMeld, meldAugen } from '../engine/melds';
import { Unseen } from './memory';

export interface Standing {
  /** Strafpunkte Rückstand auf den Besten (0 = ganz vorn). */
  behind: number;
  /** Vorsprung vor dem Zweiten, nur wenn man führt. */
  lead: number;
  leading: boolean;
  /** Wie viele Runden nach der laufenden noch gespielt werden. */
  roundsLeft: number;
}

export function standing(state: GameState, pid: number): Standing {
  const totals = state.totals;
  const mine = totals[pid];
  const best = Math.min(...totals);
  const others = totals.filter((_, i) => i !== pid);
  const leading = mine <= Math.min(...others);
  return {
    behind: mine - best,
    lead: leading ? Math.min(...others) - mine : 0,
    leading,
    roundsLeft: Math.max(0, state.settings.rounds - state.history.length - 1),
  };
}

/**
 * Ehrgeiz 0..1: Wie viel Risiko geht der Bot gerade ein? Ausgangswert ist die Spielweise (`base`).
 * Hinten liegen erhöht ihn, ein knapper Endspurt noch mehr; wer führt und noch Runden vor sich hat, will Abstand gewinnen,
 * wer kurz vor Schluss führt, spielt auf Sicherheit.
 */
export function ambition(state: GameState, pid: number, base: number): number {
  const s = standing(state, pid);
  let a = base + 0.5 * Math.min(1, s.behind / 100);
  if (s.leading && s.lead > 0) a += s.roundsLeft >= 2 ? 0.1 : -0.2;
  if (s.behind >= 40 && s.roundsLeft <= 1) a += 0.2;
  return Math.min(1, Math.max(0, a));
}

// ---------------------------------------------------------------- Wachstumschancen

/** Wert einer Karte beim Anlegen oder Ergänzen (Ass 11, Bildkarten 10). */
const augen = (rank: number) => (rank === 1 ? 11 : rank >= 10 ? 10 : rank);

const SUITS = ['H', 'D', 'C', 'S'] as const;

export interface Growth {
  /** Wahrscheinlichkeit, dass die nächste Karte die Erstmeldung um mindestens `minGain` Augen erhöht. */
  chance: number;
  /** Erwartete Zunahme der Augen durch die nächste Karte. */
  expected: number;
}

/**
 * Wie gut kann die Erstmeldung mit der nächsten gezogenen Karte noch wachsen? Betrachtet werden das Ergänzen der
 * geplanten Kombinationen (z. B. die vierte Karte eines Satzes, die nächste Karte einer Folge) und das Vervollständigen
 * einer neuen Kombination aus zwei übrigen Karten. Die Wahrscheinlichkeiten kommen aus dem, was der Bot noch weiß.
 */
export function growth(hand: Card[], groups: number[][], unseen: Unseen, minGain = 8, draws = 1): Growth {
  const used = new Set(groups.flat());
  const melds: Meld[] = [];
  groups.forEach((g, i) => {
    const shape = interpretMeld(g.map((id) => hand.find((c) => c.id === id)!));
    if (shape && shape.type !== 'pair') melds.push({ ...shape, id: -(i + 1), owner: -1 });
  });
  const rest = hand.filter((c) => !used.has(c.id) && !isJoker(c));
  const U = Math.max(8, unseen.total);
  let chance = 0;
  let expected = 0;
  for (const key of unseen.copies.keys()) {
    const copies = unseen.copies.get(key) ?? 0;
    if (copies <= 0) continue;
    let gain = 0;
    if (key === 'J') gain = 8; // ein Joker passt fast überall, aber ohne feste Werte
    else {
      const suit = key[0] as (typeof SUITS)[number];
      const rank = Number(key.slice(1));
      const probe: Card = { id: -1000, suit, rank };
      // Eine geplante Kombination um diese Karte verlängern
      if (melds.some((m) => addOptions(m, probe).length > 0)) gain = augen(rank);
      // Aus zwei übrigen Karten und dieser eine neue Kombination bilden
      for (let i = 0; i < rest.length; i++) {
        for (let j = i + 1; j < rest.length; j++) {
          const shape = interpretMeld([rest[i], rest[j], probe], ['run', 'set']);
          if (shape) gain = Math.max(gain, meldAugen(shape));
        }
      }
    }
    if (gain <= 0) continue;
    const p = Math.min(1, copies / U);
    expected += p * gain;
    if (gain >= minGain) chance += p;
  }
  // Über mehrere Züge: mindestens einmal der gewünschte Zuwachs (unabhängige Züge als Näherung)
  const once = Math.min(1, chance);
  return { chance: 1 - Math.pow(1 - once, Math.max(1, draws)), expected: expected * Math.max(1, draws) };
}

// ---------------------------------------------------------------- Abwägung

export interface OpeningWeighing {
  hold: boolean;
  /** Kurzer Grund (für Tests und Fehlersuche). */
  why: string;
  ambition: number;
  augen: number;
  target: number;
  chance: number;
  /** Nur bei mode 'v2': Chance auf eine Hand, Zeitdruck 0..1 und der zusammengeführte Wert, der das Warten entscheidet. */
  pHand?: number;
  time?: number;
  score?: number;
}

export interface WeighParams {
  /** Ausgangs-Ehrgeiz der Spielweise (0..1). */
  base: number;
  /** Rommé-Erstmeldung: Kombinationen als Kartenlisten. */
  groups: number[][];
  /** Die Hand, aus der gelegt würde (bei „Ablagekarte nehmen“ inklusive dieser Karte). */
  hand: Card[];
  unseen: Unseen;
  /** Pflichtzug: Hier darf nicht gewartet werden. */
  forced?: boolean;
  tuning?: Partial<Tuning>;
}

/** Stellschrauben der Abwägung (zum Abstimmen per Simulation; die Standardwerte stehen in DEFAULT_TUNING). */
export interface Tuning {
  /** Stapelgröße, ab der das Rundenende naht und das Warten nicht mehr lohnt. */
  endgameStock: number;
  /** Erforderliche Chance auf einen Zuwachs, damit Warten sich lohnt. */
  minChance: number;
  /** Nötiger Zuwachs der Erstmeldung (Augen), der als lohnend zählt. */
  minGain: number;
  /** Wie viele Züge die Wachstumschance vorausschaut. */
  draws: number;
  /** Geduld in eigenen Zügen: w0 + w1 × Ehrgeiz. */
  w0: number;
  w1: number;
  /** Ziel-Erstmeldung: Hürde + t0 + t1 × Ehrgeiz. Ab dort wird sofort gelegt. */
  t0: number;
  t1: number;
  /** Warten auch ohne Aussicht auf Zuwachs (nur zum Vergleichen). */
  ignoreGrowth: boolean;
  /** Ab diesem Ehrgeiz spielt der Bot mutig (hinten liegend zählt die Siegchance, nicht der Durchschnitt). */
  boldAt: number;
  /** Mutiger Modus: Mit der Erstmeldung warten, auch wenn kein Zuwachs absehbar ist. Standard aus: In Simulationen kostet das Siege (Tempoverlust), taugt aber als Charakterzug einer Rolle. */
  boldHold: boolean;
  /** Mutiger Modus: Auf Hand spielen (alle Karten auf einmal) wie ein Handmacher. */
  boldHand: boolean;
  /** Mutiger Modus: Cheft schon mit vier Paaren ansagen. */
  boldCheft: boolean;
  /** 'v2' (Standard): Hand-Chance, Höhe der Erstmeldung und Zeitdruck in einem Wert gegeneinander abgewogen. 'v1': getrennte Regeln (nur zum Vergleichen). */
  mode: 'v1' | 'v2';
  /** v2: Gewicht der Hand-Chance, der erwarteten Verbesserung der Erstmeldung und des Zeitdrucks. */
  wHand: number;
  wBar: number;
  wTime: number;
  /** v2: Der Wert, ab dem gewartet wird: holdAt0 − holdAt1 × Ehrgeiz (ehrgeizige warten früher). */
  holdAt0: number;
  holdAt1: number;
}

export const DEFAULT_TUNING: Tuning = { endgameStock: 16, minChance: 0.25, minGain: 8, draws: 2, w0: 1, w1: 5, t0: 10, t1: 40, ignoreGrowth: false, boldAt: 0.7, boldHold: false, boldHand: true, boldCheft: true, mode: 'v2', wHand: 0.7, wBar: 0.8, wTime: 1.2, holdAt0: 0.4, holdAt1: 0.3 };


// ---------------------------------------------------------------- Hand-Chance und Zeitdruck (v2)

/**
 * Wie wahrscheinlich ist eine Hand (alle Karten bis auf eine in Kombinationen) in den nächsten Zügen? Betrachtet wird,
 * welche Restkarte der Bot abwirft und welche gezogene Karte danach alles aufgehen lässt. Bei mehr als drei Restkarten
 * ist eine Hand in den nächsten Zügen unrealistisch (0). Die Wahrscheinlichkeiten kommen aus dem, was der Bot noch weiß.
 */
export function handChance(hand: Card[], groups: number[][], unseen: Unseen, draws = 1): number {
  const used = new Set(groups.flat());
  const left = hand.filter((c) => !used.has(c.id));
  const n = hand.length;
  if (left.length <= 1) return 1;
  if (left.length > 3) return 0;
  const U = Math.max(8, unseen.total);
  let best = 0;
  for (const drop of left) {
    const rest = hand.filter((c) => c.id !== drop.id);
    let p = 0;
    for (const [key, copies] of unseen.copies) {
      if (copies <= 0) continue;
      const probe: Card = key === 'J' ? { id: -1000, suit: 'J', rank: 0 } : { id: -1000, suit: key[0] as Card['suit'], rank: Number(key.slice(1)) };
      const part = findPartition([...rest, probe], { types: ROMME_TYPES, allowSkip: true });
      if (part && part.used >= n - 1) p += Math.min(1, copies / U);
    }
    best = Math.max(best, Math.min(1, p));
  }
  return 1 - Math.pow(1 - best, Math.max(1, draws));
}

/** Wie weit ist die Runde? 0 = Rundenbeginn, 1 = der Stapel ist bis auf `endgameStock` Karten leer. */
export function roundProgress(state: GameState, endgameStock: number): number {
  const n = state.players.length;
  const start = deckSize(deckConfig(state)) - 1 - 14 * n - 1; // Stapel nach dem Austeilen
  const left = state.round.stock.length;
  return Math.min(1, Math.max(0, (start - left) / Math.max(1, start - endgameStock)));
}

/**
 * Soll der Bot seine mögliche Rommé-Erstmeldung jetzt legen oder noch warten und die Hürde für die anderen erhöhen?
 * Wartet nie bei Pflichtzügen, bei einer Hand (alle Karten auf einmal), wenn ein Gegner schon draußen ist oder die
 * Cheft-Hürde (101) gilt, bei naher Rundenende, bei hoher Erstmeldung oder wenn nichts zu gewinnen ist.
 */
export function weighOpening(state: GameState, pid: number, w: WeighParams): OpeningWeighing {
  const r = state.round;
  const p = r.players[pid];
  const a = ambition(state, pid, w.base);
  const hand = w.hand;
  const total = w.groups.reduce((sum, g) => {
    const shape = interpretMeld(g.map((id) => hand.find((c) => c.id === id)!));
    return sum + (shape ? meldAugen(shape) : 0);
  }, 0);
  const t: Tuning = { ...DEFAULT_TUNING, ...w.tuning };
  const th = thresholdFor(state, pid);
  const target = th + t.t0 + t.t1 * a;
  const out = (hold: boolean, why: string, chance = 0): OpeningWeighing => ({ hold, why, ambition: a, augen: total, target, chance });

  if (w.forced) return out(false, 'forced');
  if (p.mode !== 'romme' || p.opened) return out(false, 'not-romme-opening');
  if (w.groups.some((g) => g.length < 3)) return out(false, 'pairs'); // Cheft-Paare werden hier nicht abgewogen
  if (w.groups.flat().length >= hand.length - 1) return out(false, 'hand'); // alle Karten auf einmal: sofort
  if (r.players.some((q, i) => i !== pid && q.opened)) return out(false, 'opponent-open');
  if (r.cheftAnnounced) return out(false, 'cheft-bar');
  if (r.stock.length < t.endgameStock) return out(false, 'endgame');
  if (p.turns >= Math.round(t.w0 + t.w1 * a)) return out(false, 'patience-used');
  // v1: Eine hohe Erstmeldung wird immer sofort gelegt. v2 wägt weiter ab: Bei hoher Erstmeldung fällt nur der Hürden-Anteil weg, die Hand-Chance kann noch zum Warten führen.
  if (t.mode !== 'v2' && total >= target) return out(false, 'high-enough');
  if (t.ignoreGrowth || (t.boldHold && a >= t.boldAt)) return out(true, 'wait-no-check');
  if (t.mode === 'v2') {
    // Alles gegeneinander: Was bringt das Warten (Hand-Chance, höhere Erstmeldung) und was kostet es (die Runde läuft weiter)?
    const gr = growth(hand, w.groups, w.unseen, t.minGain, t.draws);
    const pHand = handChance(hand, w.groups, w.unseen, t.draws);
    // Wie viel vom Weg von der Hürde bis zum Ziel würde die nächste Karte im Schnitt zurücklegen (höchstens bis zum Ziel)?
    const need = Math.max(0, target - total);
    const barValue = need > 0 ? Math.min(1, Math.min(gr.expected, need) / Math.max(10, target - th)) : 0;
    const time = roundProgress(state, t.endgameStock);
    const score = t.wBar * barValue + t.wHand * pHand - t.wTime * time;
    const holdAt = t.holdAt0 - t.holdAt1 * a;
    const res = out(score >= holdAt, score >= holdAt ? 'wait-v2' : 'open-v2', gr.chance);
    return { ...res, pHand, time, score };
  }
  const g = growth(hand, w.groups, w.unseen, t.minGain, t.draws);
  if (g.chance < t.minChance) return out(false, 'no-growth', g.chance);
  return out(true, 'wait-for-more', g.chance);
}

/**
 * Spielt der Bot gerade mutig? Wer deutlich hinten liegt, muss die Varianz suchen: Eine gute Durchschnittsrunde reicht
 * nicht, nur ein Sieg zählt. Gilt für alle Gedächtnisse; die Spielweise verschiebt den Ausgangs-Ehrgeiz.
 */
export function isBold(state: GameState, pid: number, base: number, tuning?: Partial<Tuning>): boolean {
  const t = { ...DEFAULT_TUNING, ...tuning };
  return ambition(state, pid, base) >= t.boldAt;
}
