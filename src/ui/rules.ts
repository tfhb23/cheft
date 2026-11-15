/** Regeltext für die Hilfe im Spiel (Regelwerk V6 plus vereinbarte Hausregeln). */
export interface RuleSection {
  title: string;
  items: string[];
}

export const RULES_DE: RuleSection[] = [
  {
    title: 'Überblick',
    items: [
      'Cheft basiert auf den türkischen Rommé-Spielen Elli Bir und Yüzbir Okey. Der Name kommt von türkisch „Çifte“ (Paar).',
      '3 bis 4 Spieler, 106 Karten (zwei Blätter plus 2 Joker), 14 Handkarten. Gespielt wird gegen den Uhrzeigersinn.',
      '3, 5, 7 oder 9 Runden (vor dem Start wählbar). Wer am Ende die wenigsten Strafpunkte hat, gewinnt.',
      'Jeder Spieler entscheidet pro Runde selbst, ob er Rommé (Folgen und Sätze) oder Cheft (identische Paare) spielt.',
    ],
  },
  {
    title: 'Kartenwerte',
    items: [
      '2 bis 10: aufgedruckter Wert. Bube, Dame, König: 10.',
      'Ass: 11 Augen, oder 1 als kleinste Karte einer Folge (A-2-3). Strafpunkte immer 11.',
      'Joker: Augen der ersetzten Karte. Strafpunkte 25.',
    ],
  },
  {
    title: 'Spielablauf',
    items: [
      'Der Startspieler wird ausgelost, bekommt eine 15. Karte und beginnt. Die Teppichkarte liegt offen unter dem Stapel. Ist sie ein Joker, bekommt der Startspieler ihn und die nächste Karte wird Teppichkarte.',
      'Schritt 1: Karte ziehen, verdeckt vom Stapel oder offen von der Ablage.',
      'Schritt 2 (optional): Mit Kombinationen rauskommen oder Karten an Kombinationen anlegen, auch bei Mitspielern.',
      'Schritt 3: Genau eine Karte abwerfen. Die letzte Handkarte muss immer abgeworfen werden.',
      'Ist der nächste Spieler bereits draußen, darf man keine Karte abwerfen, die er direkt anlegen oder mit der er einen ausgelegten Joker klauen könnte. Ist er noch drin, darf alles abgeworfen werden. Sind alle Handkarten betroffen, darf trotzdem abgeworfen werden.',
    ],
  },
  {
    title: 'Modus Rommé',
    items: [
      'Folge: mindestens 3 aufeinanderfolgende Karten einer Farbe. Das Ass kann unten (A-2-3) oder oben (D-K-A) liegen, König-Ass-2 ist verboten.',
      'Satz: 3 oder 4 gleiche Werte in verschiedenen Farben (Drilling oder Vierling).',
      'Erstmeldung: mindestens 51 Augen. Sobald jemand Cheft angesagt hat, brauchen alle Rommé-Spieler, die noch drin sind, 101 Augen. Jede weitere Erstmeldung muss die vorherige um mindestens 1 Auge übertreffen. Weitere Kombinationen im selben Zug zählen zur Erstmeldung dazu, solange dazwischen nicht bei anderen angelegt wurde.',
      'Die Ablagekarte darf ein Rommé-Spieler, der noch drin ist, nur nehmen, wenn er damit sofort rauskommt. Wer schon draußen ist, darf sie nehmen, wenn er sie sofort anlegen, auslegen oder damit einen Joker klauen kann. Wurde sie von einem Cheft-Spieler abgeworfen, darf ein Rommé-Spieler sie nie nehmen.',
      'Nach der Erstmeldung darf man weitere Kombinationen legen und Karten anlegen, auch bei Mitspielern, aber nie an Cheft-Paare.',
    ],
  },
  {
    title: 'Modus Cheft',
    items: [
      'Ein Cheft-Paar sind zwei exakt gleiche Karten (Wert und Farbe). Ein Joker kann eine Karte ersetzen, zwei Joker gelten ebenfalls als Paar.',
      'Wer von der Ablage zieht, ohne damit als Rommé-Spieler sofort rauszukommen, sagt damit unwiderruflich Cheft an. Cheft kann auch per Knopf angesagt werden.',
      'Rauskommen mit genau 5 Paaren (10 Karten) oder 7 Paaren (Hand machen). 6 Paare gibt es nicht: Nach 5 Paaren werden die restlichen 4 Karten als 2 weitere Paare auf einmal oder als Rommé-Kombinationen bzw. Anlegen bei fremden Rommé-Kombinationen verwertet.',
      'Ein Cheft-Spieler darf immer die oberste Ablagekarte nehmen.',
      'Die Teppichkarte darf nur ein Cheft-Spieler nehmen, und nur, wenn er damit im selben Zug ein Paar vervollständigt und rauskommt.',
    ],
  },
  {
    title: 'Hand machen',
    items: [
      'Mit allen 14 Karten in einem einzigen Zug rauskommen und die 15. abwerfen, ohne bei anderen anzulegen. Es gilt keine Mindestgrenze.',
      'Bei Cheft: 7 Paare, oder 5 Paare plus Rommé-Kombinationen aus den restlichen Karten.',
    ],
  },
  {
    title: 'Joker',
    items: [
      'Ein Joker ersetzt in jeder Kombination eine beliebige Karte.',
      'Klauen: Wer bereits draußen ist und genau die Karte hat, die ein ausgelegter Joker vertritt, darf den Joker nehmen, auch aus der eigenen Auslage. Er muss sofort weiterverwendet werden (neue Kombination oder anlegen).',
      'Aus einem Satz darf der Joker nur geklaut werden, wenn der Satz ein Vierling ist (3 echte Karten plus Joker). Aus Cheft-Paaren darf geklaut werden, nicht aus einem Joker-Joker-Paar.',
      'Joker verbrennen: Einen Joker als letzte Karte abwerfen ist erlaubt und verdoppelt die Strafpunkte aller anderen.',
    ],
  },
  {
    title: 'Rundenende und Strafpunkte',
    items: [
      'Die Runde endet, wenn ein Spieler seine letzte Karte abwirft oder der Stapel aufgebraucht ist (dann ohne Gewinner). Liegt bei leerem Stapel nur noch die Teppichkarte da, darf der nächste Spieler sie wie eine Stapelkarte nehmen, ohne rauskommen zu müssen. Nach diesem Zug endet die Runde.',
      'Wer nicht draußen ist, bekommt 100 Strafpunkte. Wer draußen ist, zählt die Augen seiner Handkarten (Ass 11, Joker 25).',
      'Verdopplungen (multiplizieren sich): Cheft gespielt und gewonnen (alle Verlierer), Cheft angesagt und verloren (nur dieser Spieler), mit Hand beendet, wenn noch niemand draußen war (alle Verlierer), Joker verbrannt (alle Verlierer).',
      'Extrembeispiel: 100 × 2 × 2 × 2 × 2 = 1.600 Strafpunkte.',
    ],
  },
  {
    title: 'Bedienung',
    items: [
      'Ziehen: Auf den Stapel, die oberste Ablagekarte oder die Teppichkarte tippen. Die neue Karte erscheint rechts in der Hand und ist grün markiert. Zu Rundenbeginn ist die Hand nach Farbe sortiert.',
      'Zurücklegen: Eine genommene Ablage- oder Teppichkarte ist orange markiert und kann mit „Zurücklegen“ zurückgegeben werden, solange noch nichts ausgelegt wurde. Danach gilt: gelegt ist gelegt.',
      'Bots: Jeder Bot hat eine Stufe (Gemütlich, Normal, Gerissen, Mastermind) und eine Spielweise (Ausgewogen, Sprinter, Cheft-Fan, Handmacher, Blocker, Zähler, Jokerjäger, Zocker). Bei „Zufall“ siehst du nur den Namen (der Mastermind wird nie zufällig gewählt); die Rollen werden am Spielende aufgedeckt. Der Mastermind zählt alle gespielten Karten, rechnet mit Wahrscheinlichkeiten und geht klug mit Jokern um.',
      'Hand sortieren: Karten mit dem Finger an eine beliebige Stelle ziehen. Die Reihenfolge bleibt erhalten.',
      'Auslegen: Karten antippen und dann „Auslegen“ drücken, oder die markierten Karten gemeinsam in die eigene Auslage ziehen. Die App teilt die Auswahl automatisch in gültige Kombinationen auf.',
      'Anlegen: Eine Karte auf eine Kombination am Tisch ziehen, oder markieren und auf die Kombination tippen.',
      'Joker klauen: Die passende Karte auf die Kombination mit dem Joker ziehen. Der Joker landet markiert in der Hand und muss sofort angelegt werden.',
      'Abwerfen: Eine Karte auf die Ablage ziehen, oder markieren und „Abwerfen“ drücken.',
      'Rückblick: Wer an der Reihe ist, kann lange auf die Ablage drücken und sieht die letzten Abwürfe der anderen (zu viert drei, zu dritt zwei) mit dem Namen des Spielers. Die Ansicht bleibt nach dem Loslassen stehen; ein Tippen irgendwo beendet sie. Der Gastgeber bzw. das Setup legt vor dem Start fest, ob das erlaubt ist.',
      'Mehrspieler: Der Gastgeber eröffnet einen Raum und gibt den dreistelligen Raumcode weiter. Er legt die Sitzordnung fest (ziehen oder zufällig) und wählt Runden und Bots. Nach jeder Runde und nach dem Spielende bestätigt jeder Mensch die Auswertung. Wer später kommt, übernimmt den Platz eines Bots oder eines länger Abwesenden und spielt mit dessen Hand weiter. Über „Pause“ in den Einstellungen wartet das Spiel für alle.',
      'Speichern: Der Spielstand wird automatisch auf dem Gerät gesichert. Über das Zahnrad lässt sich ein Spielstand-Code kopieren und im Menü auf einem anderen Gerät einfügen.',
    ],
  },
];
