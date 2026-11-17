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
- **Rollentreue-Würze** für die fünf Spielweisen (Abschnitt 3): Treue 0,85, Ausweichen nur zu ähnlichen Rollen, Launen 0,2, Stimmung 0,5. Die Rolle bleibt erkennbar (94 % der Erkennbarkeit bleiben).

## 2. Die Spielweisen (Regler, Messung)

Messung (endgültige Fassung mit Würze, Vorlieben und Gegner-Gedächtnis): 600 Spiele zu 7 Runden, ein Platz mit der Rolle (Normal) gegen drei schlichte Ausgewogene (Normal, ohne Zutaten). Fair wären 25 %; die Zutaten kosten etwa
1,4 Prozentpunkte (siehe 4). Messtoleranz bei 600 Spielen etwa ±3,3 Prozentpunkte. Der Stil ist auf allen Stufen praktisch gleich, die Stufe hebt nur die Stärke (Matrix siehe 8).

| Rolle | Stil | Regler (Abweichung vom Standard) | Sieg | Streuung | Cheft-Runden | in x % der Spiele nie Cheft | Züge bis Erstm. |
|---|---|---|---|---|---|---|---|
| **Ausgewogen** | Referenz | – | 21,0 | 62 | 12 % | 39 | 4,0 |
| **Frühvogel** | Kommt so früh wie möglich raus, nie Cheft, ruhige Runden | `weighOpening` aus, `bold` aus, `ambition` 0, `cheftEagerPairs` 99, `pairTakeAt` 5 | 21,5 | 54 | 5 % | 68 | 3,8 |
| **Gerissener** | Wartet auf die große Erstmeldung und hebt damit die Hürde für alle | `ambition` 0,8, `tuning.holdAt0` 0,2 | 17,5 (siehe Hinweis) | 66 | 16 % | 29 | 4,3 |
| **Pärchenkönig** | Sammelt Paare, sagt Cheft mit 4 Paaren an | `cheftEagerPairs` 4, `pairTakeAt` 3, `pairLove` 1,8, `ambition` 0,5 | 20,2 | 67 | 17 % | 25 | 4,1 |
| **Glücksritter** | Vernünftig, solange er führt; sobald er nicht mehr führt, setzt er alles auf Cheft (schon mit 3 Paaren) | wie Pärchenkönig, `pairLove` 2, `ambition` 0,6, `cheftEagerPairs` 3, sobald er nicht führt | 18,8 | 75 | 24 % | 14 | 4,2 |
| **Wildcard** | Jede Runde eine andere Spielweise | Pool: die fünf Spielweisen, Rollentreue 0 | 20,0 | 67 | 15 % | 31 | 4,1 |

- **Unterschied Pärchenkönig und Glücksritter:** Beide gehen auf Cheft, der Glücksritter eine Paarstufe früher (3 statt 4 Paare), aber nur, wenn er nicht führt (siehe 6). Mit 14 Karten kommen 3 Paare viel öfter vor als 4. Der Zufallsanteil (`gamble`) des alten Zockers
  macht ihn zu schwach und ist deshalb 0.
- **Hinweis Gerissener:** Er ist bei 7 Runden reproduzierbar schwächer als der Ausgewogene (800 Spiele, zwei Startindizes, ohne Zutaten: 19,6 und 18,9 % gegen 23,6 und 24,4 %), also etwa 4,5 Punkte. Warten kostet in längeren Spielen mehr Tempo.
  Mit `holdAt0` 0,3 statt 0,2 sind es 21,6 und 20,1 % (etwa 3 Punkte weniger), aber er wartet dann im Schnitt nur noch 4,1 statt 4,4 Züge (Ausgewogen 4,0) und ist kaum noch von der Ausgewogenen zu unterscheiden.
  Empfehlung: 0,2 behalten, damit die Rolle erkennbar bleibt (der Stil ist hier wichtiger als ein Punkt Siegquote); wer ihn fairer will, nimmt 0,3.

## 3. Rollentreue-Würze (Erkennbarkeit)

Aus drei Zutaten: **Rollentreue** (Chance je Runde, in der Rolle zu spielen; sonst spielt der Bot diese Runde ganz eine andere Spielweise), **Launen** (leichte Schwankung von Ehrgeiz, Abwurfdruck, Blockierwille je Runde), **Stimmung** (nach einer Pleite mutiger, nach einem Sieg vorsichtiger).
**Ausweichen nur zu ähnlichen Rollen**, damit die Rolle erkennbar bleibt: Frühvogel nur zu Ausgewogen, Gerissener zu Ausgewogen und Pärchenkönig, Pärchenkönig zu Ausgewogen, Gerissener und Glücksritter, Glücksritter zu Pärchenkönig, Ausgewogen zu allen.

**Erkennbarkeit gemessen:** Ein einfacher Klassifikator (Merkmale je Spiel: Cheft-Anteil, früh raus, nie raus, Züge bis Erstmeldung, Erstmeldung in Augen) rät aus einem 7-Runden-Spiel, welche Rolle ein Bot hatte. Auch bei reinen Rollen trifft er nur 34,7 % (Zufall 20 %): Frühvogel 62 %, Glücksritter 46 %, Gerissener 44 % sind erkennbar, Ausgewogen und Pärchenkönig kaum. Die Würze kostet davon wenig:

| Variante | Erkennbarkeit bleibt | Runden in der Rolle | Spiele mit mindestens einer Abweichung |
|---|---|---|---|
| nur Launen 0,3 und Stimmung 0,5 (Treue 1) | 103 % | 100 % | 0 % |
| Treue 0,9, Nachbarn | 97 % | 89 % | 56 % |
| **Treue 0,85, Nachbarn, Launen 0,2, Stimmung 0,5 (Empfehlung)** | **94 %** | **84 %** | **72 %** |
| Treue 0,8, Nachbarn | 92 % | 79 % | 84 % |
| Treue 0,7, Nachbarn | 87 % | 70 % | 94 % |
| Treue 0,6, Nachbarn | 83 % | 61 % | 98 % |
| Treue 0,8, alle anderen Rollen (früherer Vorschlag) | 89 % | 79 % | 84 % |
| Treue 0,5, alle anderen Rollen | 70 % | 50 % | 100 % |

Empfehlung `SPICE` in `src/bot/roles.ts`: Treue 0,85 mit Nachbarn, Launen 0,2, Stimmung 0,5. In einem 7-Runden-Spiel weicht der Bot im Schnitt in einer Runde ab. Optional lässt sich in der Endauswertung „5 von 7 Runden in Rolle“ anzeigen (rein aus Seed und Runde berechenbar).

## 4. Vorlieben

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

## 5. Gegner-Gedächtnis (pro Spiel)

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

## 6. Der Glücksritter: „teures Vergnügen“ und haushohe Siege

Wunsch: eine Rolle mit extremen Ergebnissen, die nicht ständig verliert, sondern auch mal haushoch gewinnt. Messung (600 Spiele zu 7 Runden, ein Platz gegen drei Ausgewogene, „haushoch“ = Spiel mit mindestens 100 bzw. 200 Punkten Vorsprung auf den Zweiten; Rückstand = mindestens 200 Punkte hinter dem Besten):

| Rolle | Sieg | Spiele ≥ 100 / ≥ 200 Vorsprung | Spiele ≥ 200 Rückstand | Cheft-Runden (davon selbst gewonnen) |
|---|---|---|---|---|
| Ausgewogen | 23,3 % | 8,2 % / 3,0 % | 35,0 % | 10 % (15 %) |
| Frühvogel | 24,0 % | 8,2 % / 3,3 % | 31,7 % | 4 % (24 %) |
| Pärchenkönig | 21,5 % | 9,7 % / 4,0 % | 38,8 % | 17 % (13 %) |
| Glücksritter (Cheft immer ab 3 Paaren) | 18,5 % | 7,5 % / 3,0 % | **49,0 %** | 28 % (**10 %**) |
| Glücksritter: Cheft ab 3 Paaren nur in der ersten Rundenhälfte | 18,8 % | 7,8 % / 3,7 % | 44,3 % | 25 % (11 %) |
| Glücksritter: nur ab 30 Punkten Rückstand | 20,8 % | 9,0 % / 2,8 % | 45,8 % | 23 % (11 %) |
| **Glücksritter: sobald er nicht führt (gewählt)** | **20,6 %** | **9,8 % / 3,0 %** | **47,2 %** | **24 % (11 %)** |
| Glücksritter: ab 15 Punkten Rückstand | 20,6 % | 9,7 % / 3,0 % | 46,5 % | 24 % (11 %) |
| Glücksritter: ab 15 Punkten 3 Paare, ab 60 schon 2 Paare | 18,4 % | 9,2 % / 2,8 % | 54,7 % | 33 % (9 %) |
| Hasardeur (warten + Cheft ab 3 Paaren) | 15,2 % | 5,7 % / 1,8 % | 58,8 % | 31 % (11 %) |

**Befund:**

- Wer schon mit 3 Paaren auf Cheft geht, gewinnt nur etwa jede zehnte dieser Runden (der Frühvogel mit seinem seltenen, späten Cheft dagegen jede vierte). Das Risiko zahlt sich nicht aus: Er verliert haushoch deutlich öfter (47 bis 49 % der Spiele mit mindestens 200 Punkten Rückstand gegen 32 bis 39 % der anderen Rollen), gewinnt aber **nicht** häufiger haushoch (7 bis 10 % der Spiele, wie alle anderen).
- Die Regler (Paar-Liebe, Ehrgeiz, Tempo, Zufallsanteil) ändern daran nichts; entscheidend ist allein, ab wie vielen Paaren er sich auf Cheft festlegt.
- **Gewählte Fassung:** Cheft ab 3 Paaren nur, wenn er nicht führt (er „jagt dem Verlust hinterher“), sonst wie der Pärchenkönig (ab 4 Paaren). Das bringt ihn von 18,5 auf 20,6 %, mit der höchsten Quote haushoher Siege (9,8 %; Unterschiede dieser Größe liegen aber noch im Messrauschen von etwa ±1,1 Punkten), und passt zur Figur.
- **Ehrlich zur Erwartung:** Eine Rolle, die haushoch gewinnt, lässt sich mit Bot-Reglern in diesem Spiel kaum erzwingen. Haushohe Siege kommen bei allen Rollen in 7 bis 10 % der Spiele vor, meist durch Glück (Gegner ohne Erstmeldung zahlen je 100 Punkte, Cheft-Siege verdoppeln). Mehr Extreme gibt es nur über mehr Verlust.
  Eine weitere „extreme“ Rolle würde deshalb nur noch öfter verlieren (Hasardeur 15,2 %), ohne öfter haushoch zu gewinnen. Empfehlung: keine weitere Rolle. Wer haushohe Siege häufiger will, müsste sie über die Regeln fördern (z. B. Bonus für Cheft, früheres Rauskommen).

## 7. Tests und Extremfälle

- **Neue Tests** (`src/bot/roles.test.ts`, 22): Vorlieben (fest je Spiel und Platz, Vielfalt, Beschreibungen, Passen, Deckel auch bei Gewicht 1e9, Schutz fertiger Kombinationen, Ernstfall), Profile (aus dem Protokoll,
  vollständig), Gegner-Gedächtnis (exakt beim Mastermind, schwächer bei den anderen, Lücken, Merkfehler, stabil, kaputte Profile), Wildcard (gleichverteilt, deterministisch, Wiederholungen), vollständige Spiele aller Rollen auf allen Stufen,
  „Kein Mogeln“ (verdeckte Karten und JSON-Neustart ändern keine Entscheidung). Zwei echte Lücken fanden die Tests: die Bandregel (siehe 3) und eine Absturzstelle bei negativer Bandbreite (behoben).
- **Dauertest, Extrem-Modus** (jetzt mit allen neuen Reglern, Rollen, absurden Vorlieben, Gegner-Gedächtnis, 2 bis 4 Spielern und absichtlich beschädigten Rundenprofilen): 1000 Spiele, 4830 Runden, rund 550 000 Entscheidungen, **keine Verstöße**; nach den letzten Änderungen (Kostenfaktoren der Vorlieben, Glücksritter, Nachbar-Ausweichrollen) nochmals 500 Spiele, rund 300 000 Entscheidungen, und der Normal-Modus mit 200 Spielen: **keine Verstöße**.
- **Sweeps mit absurden Werten** (Skala −5 und 100, Band 0 bis 1e9, Schutz 0 bis 1e9, Gewicht 1000, Intensität 5, Gegner-Gedächtnis ×5 und ×−1): alle laufen, die Stärke sinkt höchstens auf etwa 20 %.
  Auffällig: Band 0 und 2 zeigen scheinbar höhere Siegquoten (28 und 26 %), weil dann nur eine Karte zur Wahl steht und das Entscheidungsrauschen der Stufe entfällt (Messartefakt, kein Nutzen).
- **Extremtische:** Vier Wildcards am Tisch (Cheft 17 bis 19 %, Siegquote 22,5 bis 26,9 %), vier Glücksritter am Tisch (Cheft 38 %, 83 Strafpunkte pro Runde, aber Siegquoten 21 bis 30 %: wild, aber fair), gemischte Stufen (Frühvogel Mastermind 35,2 %, Gerissener Vergesslich 18,8 %),
  2 Spieler (Pärchenkönig Mastermind 64,8 % gegen Frühvogel Vergesslich 35,2 %), 3 Spieler.

## 8. Matrix: Rolle × Gedächtnis (300 Spiele je Zelle, Siegquote %, gegen drei schlichte Ausgewogene Normal)

| | Vergesslich | Normal | Scharfsinnig | Mastermind |
|---|---|---|---|---|
| Ausgewogen | 22,3 | 21,7 | 24,0 | 29,5 |
| Frühvogel | 22,7 | 21,3 | 24,8 | 29,5 |
| Gerissener | 19,8 | 21,3 | 21,3 | 26,8 |
| Pärchenkönig | 22,3 | 23,2 | 23,7 | 29,0 |
| Glücksritter | 16,2 | 18,7 | 21,0 | 19,7 |
| Wildcard | 23,0 | 20,2 | 23,7 | 27,5 |

Cheft-Anteil und Züge bis zur Erstmeldung sind in jeder Zeile über alle Stufen gleich (z. B. Pärchenkönig 16 / 16 / 17 / 16 %): Rolle und Gedächtnis sind unabhängige Achsen.

## 9. Namen (24 Kombinationen)

Tabelle in `src/bot/rolenames.ts` (`ROLE_NAMES`), geprüft in `rolenames.test.ts` (jede Kombination mindestens vier Namen, kein Name doppelt, `Q` und `Data` enthalten). Die Stufe färbt die Namen: Vergesslich naive, Normal Alltags-, Scharfsinnig kluge, Mastermind legendäre Figuren.
Am Tisch sitzen höchstens drei Bots, die Namenswahl vergibt keinen Namen doppelt; vier Namen je Kombination reichen dafür immer. Für mehr Abwechslung über viele Spiele wären fünf bis sechs je Kombination schöner.

| | Vergesslich | Normal | Scharfsinnig | Mastermind |
|---|---|---|---|---|
| **Ausgewogen** | Tünnes, Dursun, Bajie, Bolle | Effi, Memed, Genji, Botchan | Schäl, Dede, Zhou Yu, Çelebi | Faust, Danişmend, Sima Yi, Zeami, **Data** |
| **Frühvogel** | Hans, Temel, Momotaro, Struwwel | Till, Bamsı, Kintaro, Hızır | Swinegel, Ferhat, Musashi, Tengu | Siegfried, Dede Korkut, Lü Bu, Yoshitsune |
| **Gerissener** | Däumling, Keloğlan, Issun, Pumuckl | Krabat, Köroğlu, Gildong, Goemon | Reineke, Rumpelstilz, Nasreddin, Ne Zha, Kitsune | Eulenspiegel, Aladdin, Tanuki, Zhuge Liang |
| **Pärchenkönig** | Moritz, Hacivat, Heungbu, Tahir | Max, Tamino, Baoyu, Mongryong | Hänsel, Kerem, Niulang, Tristan | Schahriyar, Mecnun, Liang Shanbo, Graf vom Strahl |
| **Glücksritter** | Hieronymus, Hans im Glück, Lu Da, Kalender | Felix, Kaygusuz, Bahtiyar, Ebisu | Munk, Köse, Li Kui, Leverkühn | Wallenstein, Fortunatus, Ji Gong, Fukurokuju |
| **Wildcard** | Rübezahl, Taugenichts, Momo, Schlemihl | Şahmeran, Kaguya, Karagöz, Peer Gynt | Mephisto, Tamamo, Merlin, Loki | **Q**, Sun Wukong, Proteus, Nüwa |

Was sich gegenüber den alten Listen geändert hat und warum:

- **Frühvogel** (alter Sprinter): Der Fuchs Reineke ist ein Schlauberger und ging zum Gerissenen; dafür kam **Swinegel** („Ick bün al hier!“, der Igel aus „Hase und Igel“, der schon am Ziel ist).
- **Gerissener** (alter Jokerjäger): lauter Schelme und Schlauberger. Neu dabei **Reineke** und **Zhuge Liang** (statt Sarutahiko, der weniger bekannt ist).
- **Pärchenkönig** (alter Cheft-Fan): Die Namen waren schon berühmte Paare (Max und Moritz, Hacivat und Karagöz, Tahir und Zühre, Hänsel und Gretel, Kerem und Aslı). Weil „Pärchenkönig“ männlich ist, stehen jetzt die männlichen Hälften der Paare darin; die weiblichen (Zühre, Chunhyang, Gretel, Aslı, Daiyu, Zhinü, Mulan, Zeynep, Scheherazade, Käthchen) sind frei und lassen sich für eine
  weibliche Variante nutzen. Neu: Tamino (Zauberflöte), Mongryong, Niulang (Weberin und Kuhhirte), Tristan, **Schahriyar** (der König, dem Scheherazade erzählt), Liang Shanbo, Graf vom Strahl.
- **Glücksritter** (alter Zocker): neu **Hans im Glück**, **Ebisu** und **Fukurokuju** (Glücksgötter), **Fortunatus** (Volksbuch mit dem Glückssäckel) statt Hasan Sabbah (Gründer der Assassinen, für eine Familienrunde ungünstig), Bahtiyar bedeutet „der Glückliche“.
- **Wildcard** (neu): Gestaltwandler und Unberechenbare; Rübezahl, Mephisto, Sun Wukong, Proteus, Tamamo (Fuchsgeist), Şahmeran (Schlangenkönigin), dazu **Q** aus Star Trek: Das nächste Jahrhundert (allmächtiger Verwandler und Unberechenbarer) als Mastermind-Wildcard.
- **Data** (Star Trek TNG): Mastermind-Ausgewogener. Er passt dort am besten: perfektes Gedächtnis (Mastermind), nüchtern ohne Gefühlsschwankung und ohne Vorliebe für Risiko (Ausgewogen); als Gerissener wäre er zu listig, als Frühvogel zu hastig.
- Nicht mehr verwendet (frei für spätere Rollen): die Namen der gestrichenen Spielweisen Blocker (z. B. Hagen, Brunhild, Guan Yu, Nobunaga), Zähler (Humboldt, Piri Reis, Kongming, Emil) und Handmacher (Siddhartha, Parzival, Miyamoto, Wotan).

## 10. Vorschlag zur Übernahme

**Übernehmen:**

1. Die 5 Spielweisen und die Wildcard wie in 2 (Regler als `STYLE_KNOBS` in `src/bot/roles.ts`), Glücksritter ohne Zufallsanteil.
2. Vorlieben als Standard für alle Bots (Skala 2, Band 8, Schutz 14), mit dem Aufdecken in der Endauswertung.
3. Gegner-Gedächtnis als Charakterfunktion für Normal, Scharfsinnig und Mastermind (kostenlos, nicht stärker).
4. Wildcard-Anzeige am Spielende; Wildcard (Normal) als Ersatzbot.
5. **Rollentreue-Würze `SPICE`** für die fünf Spielweisen: Treue 0,85 mit Ausweichen nur zu ähnlichen Rollen, Launen 0,2, Stimmung 0,5 (94 % der Erkennbarkeit bleiben, Abschnitt 3).

**Nicht übernehmen:** Handmacher, Jokerjäger, Blocker, Zähler, Sprinter, Königsjäger, Heißsporn (ohne Wirkung), den Zufallsanteil des Zockers, die Mastermind-Extras (`master`, `patient`, `burn`).

**Zur Entscheidung (nicht eingebaut):**

- **Grundstrategie:** Zwei Gewohnheiten aller Bots schaden ihnen (Hochkarten vor der Erstmeldung abwerfen, Gefahrenmodus, siehe ROLLEN.md Abschnitt 7). Beheben würde die Stufen neu kalibrieren.
- **Glücksritter** bleibt unter fair (etwa 19 bis 21 %) und gewinnt nicht öfter haushoch als die anderen (Abschnitt 6). Ich empfehle keine weitere „extreme“ Rolle.

**Was beim Einbau zu tun ist:**

1. `BotStyle` und Listen auf die 6 Einträge ändern (`engine/game.ts`, `bot/names.ts`, `i18n/de.ts`, Auswahl in der Oberfläche); 6 Rollen × 4 Stufen × 4 Namen; alte Spielstände auf die nächste neue Rolle abbilden (balanced/sprinter → Ausgewogen oder Frühvogel, cheft → Pärchenkönig, gambler → Glücksritter, übrige → Ausgewogen).
2. `knobsFor(profile)` durch `rolePersona(...)` ersetzen (Wildcard: `rolePersona('wildcard')`), Standard der Ersatzbots auf Wildcard (Normal) (`server/room.ts`).
3. Endauswertung: Je Bot Rolle, bei der Wildcard die Runden-Rollen (rein aus Seed und Runde berechenbar, `resolvePersona`), und die Vorlieben (`describeTasteSet(tastesFor(seed, platz))`).
4. Spielstand: `history[].profiles` ist neu (optional). Spielstand-Code und Server-Kopie werden etwas größer (siehe 8).
5. Danach `npm run calibrate` kontrollieren (Ziel für die Stufen etwa 17 / 23 / 28 / 32 %).

## 11. Technische Anmerkungen

- **Rechenzeit** (Ruhezustand, 9 Runden, 4 Bots): Median 0,6 ms je Entscheidung, 99 % unter 11 ms, 99,9 % unter 31 ms, Maximum 130 bis 334 ms. Das Gegner-Gedächtnis macht keinen Unterschied (0,58 gegen 0,60 ms). Die 874 ms im Dauertest waren Last durch parallele Läufe.
- **Spielstandgröße:** Die Rundenprofile machen den Spielstand (JSON) bei 9 Runden um etwa 5,8 KB größer (17,7 statt 11,9 KB), bei 7 Runden etwa 4,5 KB. Der Spielstand-Code im Menü und die verschlüsselte Server-Kopie werden entsprechend größer.
- Alle Funktionen sind reine Funktionen des Spielstands (Seed, Runde, Spieler): deterministisch, ohne eigenen Speicher, nach einem Serverneustart gleich.
- Das Gegner-Gedächtnis liest nur öffentliche Daten (verdeckte Karten und Stapelreihenfolge ändern keine Entscheidung, getestet auch nach JSON-Neustart).
- Neue Regler in `Knobs` (Standard = bisheriges Verhalten): `shedPre`, `shedOpen`, `blockWeight`, `handReach`, `dangerHand`, `pairLove`, `huntLeader`, `setLove`, `runLove`, `taste`, `tasteScale`, `tasteBand`, `tasteProt`, `oppUse`, `oppTempo`.
  Neue Gedächtniswerte: `oppObserve`, `oppDetail`, `oppSpan`, `oppAccuracy`.

## 12. Werkzeuge

| Befehl | Zweck |
|---|---|
| `npx tsx scripts/lab5.ts roles\|tastes\|opp\|human\|matrix\|tables [Spiele] [Runden]` | Messreihen zum Rollen-System |
| `npx tsx scripts/lab6.ts` | Sichtbarkeit und Kosten der Vorlieben |
| `npx tsx scripts/lab7.ts` | Gegner-Gedächtnis: Abwurfwahl und Ehrgeiz-Verschiebung getrennt |
| `npx tsx scripts/lab_infer.ts` | Wie gut erkennt das Gegner-Gedächtnis Vorlieben und Cheft-Neigung? (`TASTE_KNOBS` für andere Stärken) |
| `SOAK_EXTREME=1 npx tsx scripts/soak.ts 1000` | Dauertest mit absurden Werten, jetzt auch für Rollen, Vorlieben, Gegner-Gedächtnis und beschädigte Profile |
| `npx tsx scripts/regress.ts` | Prüfsumme über 120 Spiele (vor und nach einem Umbau gleich) |
