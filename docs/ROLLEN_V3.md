# Rollen-System V3: 5 Spielweisen, Wildcard, Vorlieben, Gegner-Gedächtnis

Stand: Entwurf, vollständig in der Bot-Schicht gebaut und getestet (Branch `ccr-a08d65f5-lqevpy`). **Die App, die Oberfläche und die Namenslisten sind noch nicht umgestellt**,
das bisherige Verhalten der Bots ist bitgleich erhalten (Prüfsumme über 120 Spiele vor und nach dem Umbau gleich, `scripts/regress.ts`). Grundlage und frühere Messungen: [ROLLEN.md](ROLLEN.md).

## 1. Beschlossen

- **5 Spielweisen + Wildcard.** Namen: **Ausgewogen**, **Frühvogel**, **Gerissener**, **Pärchenkönig**, **Glücksritter**, **Wildcard**.
- **Wildcard:** Spielt jede Runde eine zufällig gewählte der fünf Spielweisen (gleichverteilt, Wiederholungen möglich). Während des Spiels wird die Wahl nicht verraten, in der
  Endauswertung steht je Wildcard ein Satz („3× Glücksritter, 2× Gerissener, …“). Wildcard mit normalem Gedächtnis ist der Standard für Bots, die einen Mitspieler ersetzen.
  „Zufällig“ bleibt davon getrennt (verdeckte Wahl für das ganze Spiel, die Wildcard darf dabei herauskommen).
- **Vorlieben** pro Bot und Spiel (zufällig, mit Abneigungen und Aberglaube), nur beim Abwerfen, mit Schutz guter Karten.
- **Gegner-Gedächtnis** über das laufende Spiel, für Menschen und Bots gleich, nach Stufe abgeschwächt und mit Merkfehlern.

## 2. Die Spielweisen (Regler, Messung)

Messung: 800 Spiele zu 5 Runden, ein Platz mit der Rolle (Normal, mit Vorlieben und Gegner-Gedächtnis) gegen drei schlichte Ausgewogene (Normal, ohne beides). Fair wären 25 %; die Zutaten kosten etwa 1,4 Prozentpunkte
(siehe 4); ohne sie liegen die Rollen entsprechend höher. Der Stil ist auf allen Stufen praktisch gleich, die Stufe hebt nur die Stärke (Matrix siehe 6).

| Rolle | Stil | Regler (Abweichung vom Standard) | Sieg | Streuung | Cheft-Runden | Züge bis Erstmeldung |
|---|---|---|---|---|---|---|
| **Ausgewogen** | Referenz | – | 21,7 | 60 | 9 % | 3,8–4,0 |
| **Frühvogel** | Kommt so früh wie möglich raus, nie Cheft, ruhige Runden | `weighOpening` aus, `bold` aus, `ambition` 0, `cheftEagerPairs` 99, `pairTakeAt` 5 | 21,3 | 52 | 4 % | 3,7 |
| **Gerissener** | Wartet auf die große Erstmeldung und hebt damit die Hürde für alle | `ambition` 0,8, `tuning.holdAt0` 0,2 | 21,3 | 65 | 14 % | 4,3 |
| **Pärchenkönig** | Sammelt Paare, sagt Cheft mit 4 Paaren an | `cheftEagerPairs` 4, `pairTakeAt` 3, `pairLove` 1,8, `ambition` 0,5 | 23,2 | 66 | 16 % | 4,0 |
| **Glücksritter** | Cheft schon mit 3 Paaren, hohes Risiko, schmerzhafte Pleiten und Siege | `cheftEagerPairs` 3, `pairTakeAt` 3, `pairLove` 2, `ambition` 0,6 | 18,7 | 83 | 33 % | 4,4 |
| **Wildcard** | Jede Runde eine andere Spielweise | Pool: die fünf Spielweisen, Rollentreue 0 | 20,2 | 66 | 16 % | 4,0 |

- **Unterschied Pärchenkönig und Glücksritter:** Beide gehen auf Cheft, der Glücksritter eine Paarstufe früher (3 statt 4 Paare). Mit 14 Karten kommen 3 Paare viel öfter vor als 4, deshalb 33 statt 16 % Cheft-Runden. Der Zufallsanteil (`gamble`) des alten Zockers
  macht ihn zu schwach (17,8 % bei 0,15, 20,3 % ohne) und ist deshalb 0.
- **Der Glücksritter ist strukturell schwächer** (18 bis 21 %, auf Mastermind-Stufe nur 19,7 gegen 29 % der anderen): Wer früh Cheft spielt, zahlt öfter doppelt. Das ist gewollt als „schmerzhafter, spannender Sieg“, die Siegquote bleibt aber unter fair.
- **Rollentreue 0,8, Launen 0,3, Stimmung 0,5** (optional für alle Spielweisen): Der Stil wird weicher (Frühvogel Cheft 4 → 8 %, Glücksritter 34 → 28 %), Stärke unverändert (±1).

## 3. Vorlieben

Jeder Bot bekommt aus Spiel und Platz (Seed) fest zufällige Vorlieben, die über alle Runden gelten und nach einem Neustart gleich bleiben. Bausteine:

| Baustein | Beispiele |
|---|---|
| Farbe, Rot/Schwarz | Herz; alle schwarzen Karten |
| Wertklasse | niedrige (2–6), mittlere (7–10), Bildkarten, Asse |
| Gerade/ungerade (nur Zahlkarten 2–10) | alle ungeraden Zahlen |
| Lieblingswerte | die Sechser und Neuner; Bube und Sieben |
| Einzelkarten | Herz-Bube, Pik-Dame |
| Mischungen | schwarze Bildkarten; Herz ab 8 |
| „Große Spannen“ (mehrere Teile in einer) | alle Sechser, alle Neuner plus Herz-Bube |
| Abneigung | „mag keine Pikkarten“ (der Bot wirft sie lieber ab) |
| Aberglaube | Glückszahl 7, Unglückszahl König |
| Struktur | lieber Sätze, lieber Folgen, lieber Paare (kleine Faktoren) |

Jeder Bot hat 1 bis 3 Vorlieben (45 / 35 / 20 %), mit 40 % eine Abneigung, mit je 25 % eine Glücks- und eine Unglückszahl, mit 50 % eine Strukturvorliebe, und eine eigene Intensität (0,5 bis 1,5, 12 % fast gleichgültig).
Es gibt Tausende Kombinationen (im Test: 1150 von 1200 Paaren aus Spiel und Platz haben verschiedene Vorlieben).

**Regeln, die immer gelten:**

1. **Schutz guter Karten:** Gehört eine Karte zu einer fertigen Kombination (Paar bei Cheft oder vor der Erstmeldung, Satz aus drei Farben, Folge aus drei Karten), zählt die Vorliebe für sie gar nicht; eine fast fertige schützt anteilig.
2. **Bandregel:** Die Vorliebe entscheidet nur zwischen Karten, die ohne sie fast gleich gut zu behalten sind (Band 8 Punkte der Abwurfbewertung), und opfert nie eine fertige Kombination, solange der normale Abwurf keine ist.
   Diese Regel hat ein Test gefunden: Ohne sie verdrängte eine geliebte lose Karte eine gute Karte, die dann abgeworfen wurde (nächstbeste Karte).
3. **Ernstfall:** Ist ein Gegner fast draußen (höchstens 2 Handkarten), gilt keine Vorliebe. Pflichtzüge, Erstmeldung, Joker und Klauen bleiben unberührt.
4. **Deckel:** Der Zuschlag je Karte ist begrenzt (9 Punkte mal Intensität).
5. **Kosten pro Richtung:** Niedrige Karten behalten kostete 6 bis 8 Strafpunkte pro Runde, Bildkarten oder Asse früh abzuwerfen ähnlich. Solche Richtungen bekommen ein deutlich kleineres Gewicht (Faktor 0,15 bzw. 0,3). Bildkarten behalten ist frei.

**Messung (400 Spiele, ein Bot mit fester Vorliebe, Gewicht 5, gegen drei ohne):**

| Vorliebe | Anteil der Abwürfe (Kontrolle → Bot), Skala 1 | Skala 2, Band 8 | Kosten Strafpunkte pro Runde |
|---|---|---|---|
| Herz | 24,4 → 18,1 % | 16,8 % | +0,3 bis +1,4 |
| Bildkarten | 27,1 → 21,5 % | 19,3 % | −0,9 bis −0,4 (hilft sogar) |
| Sieben und Buben | 15,0 → 11,1 % | 10,1 % | +0,3 bis +0,6 |
| niedrige Karten (Gewicht 2,5, jetzt Faktor 0,15) | 34,2 → 25,0 % | 21,8 % | +6,5 bis +8 (daher entschärft) |

Standard: Skala 2, Band 8, Schutz 14. Einfluss und Kosten sättigen: Selbst mit Skala 100 ohne Schutz steigt der Einfluss nur von 0,40 auf 0,55 Punkte, die Kosten bleiben bei etwa +2,7 Strafpunkten. Mit Vorlieben insgesamt:
etwa −1,4 Prozentpunkte Siegquote (wie ein Mensch mit Eigenheiten: weniger perfekt).

**Aufdecken:** Rolle und Vorlieben je Bot in der Endauswertung (`describeTasteSet`: „mag Herzkarten“, „mag keine Siebener und Könige“, „Glückszahl Sieben“, „sammelt lieber Folgen“).

## 4. Gegner-Gedächtnis (pro Spiel)

Der Spielstand speichert am Rundenende je Spieler ein kleines öffentliches Profil (`engine/profile.ts`: Cheft oder Rommé, Züge bis zur Erstmeldung, Augen der Erstmeldung, als Erster draußen, abgeworfene und offen genommene Karten, Joker-Klau).
Es lebt nur im Spielstand, ein neues Spiel beginnt ohne Erinnerung. Ältere Spielstände ohne Profile bleiben lesbar. Ob Mensch oder Bot, ist dem Gedächtnis egal. Das Bild (`bot/opponents.ts`) enthält Cheft-Neigung, früh/spät/nie raus,
mittlere Erstmeldung und die Zuneigung zu Farben und Wertklassen (aus dem, was der Spieler abwirft und offen nimmt).

| Gedächtnis | Runden registriert | Detail | Rückblick | Merkfehler |
|---|---|---|---|---|
| Vergesslich | – (keine) | – | – | – |
| Normal | 60 % | grob: Cheft, früh/spät, nie raus | 3 Runden | 25 % verwässert |
| Scharfsinnig | 85 % | dazu Farbe/Wertklasse | 5 Runden | 10 % |
| Mastermind | 100 % | alles bis zur einzelnen Farbe | ganzes Spiel | keine |

**Messung der Erkennung** (150 Spiele zu 7 Runden, drei Gegner mit Vorlieben, Beobachter nach jeder Runde):

- **Cheft-Neigung:** Fehler des Mastermind 0,00, Scharfsinnig 0,04 bis 0,08, Normal 0,12 bis 0,21 (Betrag; 0 = exakt).
- **Hauptvorliebe** (Farbe, Wertklasse oder Rot/Schwarz) wird getroffen: Mastermind 48 % nach einer Runde, 65 bis 70 % ab Runde 3 (Zufall 25 bis 50 %); Scharfsinnig ähnlich (57 bis 68 %, gröber).
  Die Korrelation über alle Kartensorten bleibt klein (0,11 → 0,22), weil viele Vorlieben (Einzelkarten, Lieblingswerte, gerade/ungerade) nicht als Farbe oder Klasse sichtbar sind.
- Der Gegner-Einfluss auf den Bot wirkt nur sanft: Abwurfwahl (Risiko, dass der Nachbar die Karte braucht, mit seiner Cheft-Neigung und seinen Vorlieben) und eine kleine Ehrgeiz-Verschiebung gegen schnelle oder langsame Gegner.

**Stärke:** Kein messbarer Vorteil und kein Nachteil (1000 Spiele zu 7 Runden: 23,4 / 23,3 / 23,5 % gegen 23,0 % für den identischen Bot ohne Gegner-Gedächtnis, Strafpunkte gleich). Der Grund: Das Spiel bietet wenig,
was man mit solchem Wissen gewinnen kann (Blockieren und Abwurf-Lesen hatten schon vorher keine Wirkung). Das Gegner-Gedächtnis ist damit eine **Charakterfunktion** („der merkt sich, was ich sammle“), kein Stärke-Hebel.

## 5. Tests und Extremfälle

- **Neue Tests** (`src/bot/roles.test.ts`, 22): Vorlieben (fest je Spiel und Platz, Vielfalt, Beschreibungen, Passen, Deckel auch bei Gewicht 1e9, Schutz fertiger Kombinationen, Ernstfall), Profile (aus dem Protokoll,
  vollständig), Gegner-Gedächtnis (exakt beim Mastermind, schwächer bei den anderen, Lücken, Merkfehler, stabil, kaputte Profile), Wildcard (gleichverteilt, deterministisch, Wiederholungen), vollständige Spiele aller Rollen auf allen Stufen,
  „Kein Mogeln“ (verdeckte Karten und JSON-Neustart ändern keine Entscheidung). Zwei echte Lücken fanden die Tests: die Bandregel (siehe 3) und eine Absturzstelle bei negativer Bandbreite (behoben).
- **Dauertest, Extrem-Modus** (jetzt mit allen neuen Reglern, Rollen, absurden Vorlieben, Gegner-Gedächtnis, 2 bis 4 Spielern und absichtlich beschädigten Rundenprofilen): 1000 Spiele, 4830 Runden, rund 550 000 Entscheidungen, **keine Verstöße**.
- **Sweeps mit absurden Werten** (Skala −5 und 100, Band 0 bis 1e9, Schutz 0 bis 1e9, Gewicht 1000, Intensität 5, Gegner-Gedächtnis ×5 und ×−1): alle laufen, die Stärke sinkt höchstens auf etwa 20 %.
  Auffällig: Band 0 und 2 zeigen scheinbar höhere Siegquoten (28 und 26 %), weil dann nur eine Karte zur Wahl steht und das Entscheidungsrauschen der Stufe entfällt (Messartefakt, kein Nutzen).
- **Extremtische:** Vier Wildcards am Tisch (Cheft 17 bis 19 %, Siegquote 22,5 bis 26,9 %), vier Glücksritter am Tisch (Cheft 38 %, 83 Strafpunkte pro Runde, aber Siegquoten 21 bis 30 %: wild, aber fair), gemischte Stufen (Frühvogel Mastermind 35,2 %, Gerissener Vergesslich 18,8 %),
  2 Spieler (Pärchenkönig Mastermind 64,8 % gegen Frühvogel Vergesslich 35,2 %), 3 Spieler.

## 6. Matrix: Rolle × Gedächtnis (300 Spiele je Zelle, Siegquote %, gegen drei schlichte Ausgewogene Normal)

| | Vergesslich | Normal | Scharfsinnig | Mastermind |
|---|---|---|---|---|
| Ausgewogen | 22,3 | 21,7 | 24,0 | 29,5 |
| Frühvogel | 22,7 | 21,3 | 24,8 | 29,5 |
| Gerissener | 19,8 | 21,3 | 21,3 | 26,8 |
| Pärchenkönig | 22,3 | 23,2 | 23,7 | 29,0 |
| Glücksritter | 16,2 | 18,7 | 21,0 | 19,7 |
| Wildcard | 23,0 | 20,2 | 23,7 | 27,5 |

Cheft-Anteil und Züge bis zur Erstmeldung sind in jeder Zeile über alle Stufen gleich (z. B. Pärchenkönig 16 / 16 / 17 / 16 %): Rolle und Gedächtnis sind unabhängige Achsen.

## 7. Vorschlag zur Übernahme

**Übernehmen:**

1. Die 5 Spielweisen und die Wildcard wie in 2 (Regler als `STYLE_KNOBS` in `src/bot/roles.ts`), Glücksritter ohne Zufallsanteil.
2. Vorlieben als Standard für alle Bots (Skala 2, Band 8, Schutz 14), mit dem Aufdecken in der Endauswertung.
3. Gegner-Gedächtnis als Charakterfunktion für Normal, Scharfsinnig und Mastermind (kostenlos, nicht stärker).
4. Wildcard-Anzeige am Spielende; Wildcard (Normal) als Ersatzbot.
5. Optional: Rollentreue 0,8, Launen 0,3, Stimmung 0,5 für die fünf Spielweisen (weicherer Stil, gleiche Stärke).

**Nicht übernehmen:** Handmacher, Jokerjäger, Blocker, Zähler, Sprinter, Königsjäger, Heißsporn (ohne Wirkung), den Zufallsanteil des Zockers, die Mastermind-Extras (`master`, `patient`, `burn`).

**Zur Entscheidung (nicht eingebaut):**

- **Grundstrategie:** Zwei Gewohnheiten aller Bots schaden ihnen (Hochkarten vor der Erstmeldung abwerfen, Gefahrenmodus, siehe ROLLEN.md Abschnitt 7). Beheben würde die Stufen neu kalibrieren.
- **Glücksritter** bleibt unter fair (18 bis 21 %). Wer ihn ebenbürtig will, müsste Cheft belohnen (Regel) oder ihn mit leichtem Ehrgeiz-Bonus ausstatten; ich würde ihn als „teures Vergnügen“ so lassen.

**Was beim Einbau zu tun ist:**

1. `BotStyle` und Listen auf die 6 Einträge ändern (`engine/game.ts`, `bot/names.ts`, `i18n/de.ts`, Auswahl in der Oberfläche); 6 Rollen × 4 Stufen × 4 Namen; alte Spielstände auf die nächste neue Rolle abbilden (balanced/sprinter → Ausgewogen oder Frühvogel, cheft → Pärchenkönig, gambler → Glücksritter, übrige → Ausgewogen).
2. `knobsFor(profile)` durch `rolePersona(...)` ersetzen (Wildcard: `rolePersona('wildcard')`), Standard der Ersatzbots auf Wildcard (Normal) (`server/room.ts`).
3. Endauswertung: Je Bot Rolle, bei der Wildcard die Runden-Rollen (rein aus Seed und Runde berechenbar, `resolvePersona`), und die Vorlieben (`describeTasteSet(tastesFor(seed, platz))`).
4. Spielstand: `history[].profiles` ist neu (optional). Spielstand-Code und Server-Kopie werden etwas größer (siehe 8).
5. Danach `npm run calibrate` kontrollieren (Ziel für die Stufen etwa 17 / 23 / 28 / 32 %).

## 8. Technische Anmerkungen

- Alle Funktionen sind reine Funktionen des Spielstands (Seed, Runde, Spieler): deterministisch, ohne eigenen Speicher, nach einem Serverneustart gleich.
- Das Gegner-Gedächtnis liest nur öffentliche Daten (verdeckte Karten und Stapelreihenfolge ändern keine Entscheidung, getestet auch nach JSON-Neustart).
- Neue Regler in `Knobs` (Standard = bisheriges Verhalten): `shedPre`, `shedOpen`, `blockWeight`, `handReach`, `dangerHand`, `pairLove`, `huntLeader`, `setLove`, `runLove`, `taste`, `tasteScale`, `tasteBand`, `tasteProt`, `oppUse`, `oppTempo`.
  Neue Gedächtniswerte: `oppObserve`, `oppDetail`, `oppSpan`, `oppAccuracy`.

## 9. Werkzeuge

| Befehl | Zweck |
|---|---|
| `npx tsx scripts/lab5.ts roles\|tastes\|opp\|human\|matrix\|tables [Spiele] [Runden]` | Messreihen zum Rollen-System |
| `npx tsx scripts/lab6.ts` | Sichtbarkeit und Kosten der Vorlieben |
| `npx tsx scripts/lab7.ts` | Gegner-Gedächtnis: Abwurfwahl und Ehrgeiz-Verschiebung getrennt |
| `npx tsx scripts/lab_infer.ts` | Wie gut erkennt das Gegner-Gedächtnis Vorlieben und Cheft-Neigung? (`TASTE_KNOBS` für andere Stärken) |
| `SOAK_EXTREME=1 npx tsx scripts/soak.ts 1000` | Dauertest mit absurden Werten, jetzt auch für Rollen, Vorlieben, Gegner-Gedächtnis und beschädigte Profile |
| `npx tsx scripts/regress.ts` | Prüfsumme über 120 Spiele (vor und nach einem Umbau gleich) |
