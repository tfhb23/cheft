# Bots: Stand, Entscheidungen und Werkzeuge (Übergabe)

Dieses Dokument fasst zusammen, was zu den Computergegnern entschieden, gebaut und gemessen wurde. Es ist für den nächsten
Arbeitsschritt gedacht: **Rollen (Spielweisen) neu denken**, inklusive „Wildcard“ und der Mastermind-Extras. Wer es liest, braucht den
alten Chatverlauf nicht. Die Details der einzelnen Regler stehen in der README (Abschnitte „Bot-Gedächtnis“ und „Bot-Strategie“),
hier stehen die Zusammenhänge, die Messergebnisse und was noch offen ist.

## 1. Aufbau

| Datei | Aufgabe |
|---|---|
| `src/bot/bot.ts` | `decideAction(state, pid, opts?)`: nächste regelkonforme Aktion. Reglerwerte der Spielweise (`knobsFor`), Erstmeldung, Anlegen, Klauen, Abwurf. |
| `src/bot/memory.ts` | **Gedächtnis** (die Stufe): Erinnerung (`recall`), Wahrnehmung (`perceive`), Handüberblick (`overlooksAt`), Sorgfalt (`pickByScore`), Gegner-Hinweise (`signals`). |
| `src/bot/strategy.ts` | **Strategie** für alle Stufen: Tabellenstand, Ehrgeiz (`ambition`), Abwägung der Erstmeldung (`weighOpening`), mutiger Modus (`isBold`). |
| `src/bot/names.ts` | Stufen, Spielweisen, Namen, gewichteter Zufall (Vergesslich 40 %, Normal 40 %, Scharfsinnig 20 %, nie Mastermind). |
| `src/bot/simulate.ts` | Bot-gegen-Bot-Spiele für Tests und Messungen. |
| `scripts/calibrate.ts` `duel.ts` `sensitivity.ts` `soak.ts` | Messwerkzeuge (siehe 6). |
| `src/engine/game.ts` | Für die Bots ergänzt: Zugzähler `plies`, Zeitstempel `taken[].at`, Zuordnung `discardedBy` (Karte → Abwerfer). Alles optional, alte Spielstände funktionieren weiter. |

Alles an den Bots ist **eine reine Funktion des Spielzustands**: Es gibt keinen Zufall und keine Uhrzeit. Würfe kommen aus einem Hash von
Seed, Runde, Spieler, Zweck, Karte und eigenem Zug. Derselbe Zustand ergibt immer dieselbe Entscheidung, auch nach einem Serverneustart.
Die Bots speichern nichts; was sie „wissen“, leiten sie jedes Mal aus dem Zustand ab.

## 2. Das Modell: Stufe = Gedächtnis, Spielweise = Charakter

Beschlossen mit dem Auftraggeber:

- Die **Stufe** (Gemütlich/Gerissen heißen jetzt **Vergesslich**, Normal, **Scharfsinnig**, Mastermind) wird **nur über Gedächtnis,
  Wahrnehmung und Sorgfalt** definiert (`MEMORY` in `memory.ts`). Sie setzt keine Spielregler (`knobsFor` ignoriert `profile.level`).
- Die **Spielweise** (Rolle) legt fest, was der Bot aus dem Wahrgenommenen macht (`knobsFor` nach `profile.style`).
- Bots sollen **nie zu 100 % ihrer Rolle folgen** (menschlich, nicht berechenbar). Das Entscheidungsrauschen der Sorgfalt gibt es schon
  pro Stufe; rollenabhängige Unschärfe (z. B. ein Sprinter, der nicht immer bei der Hürde rauskommt) fehlt noch.
- Es gibt **keinen „Anfänger“-Knopf** in der App (ausdrücklich nicht gewünscht). Der Zufall ist stattdessen nach unten gewichtet.
- Der **zeitliche Takt der Bots** (650/1300 ms) bleibt, wie er ist (ausdrücklicher Wunsch).
- **Abwesende Mitspieler** werden mit dem Standardprofil (Normal, Ausgewogen) ersetzt (so gewollt).

### Die vier Gedächtnisse

| Gedächtnis | Spanne (Runden) | Streuung | Genauigkeit | Tagesform | Tisch übersehen (voll) | Beobachtung | Handüberblick | Sorgfalt (Streuung) |
|---|---|---|---|---|---|---|---|---|
| Vergesslich | 3 | ×0 bis ×2 | 0,75 | ±30 % | 8 % (1 bis 3 Züge) | 40 % | 20 % | 1,5 |
| Normal | 5 | ×0,3 bis ×1,7 | 0,85 | ±20 % | 4 % (1 bis 2 Züge) | 70 % | 12 % | 0,9 |
| Scharfsinnig | 9 | ×0,7 bis ×1,3 | 0,93 | ±10 % | 2 % (1 Zug) | 90 % | 6 % | 0,6 |
| Mastermind | unbegrenzt | keine | 1,0 | keine | 0 % | 100 % | 0 % | 0 |

- **Treppe des Vergessens** (S = Spanne der einzelnen Karte): exakt (< 0,5 S), eine Achse unscharf (< 1 S: „roter Bube“ oder
  „Pik-Bildkarte“), nur der Eindruck (< 2,5 S: „schwarze Bildkarte“), vergessen. Bildkarten verwechselt man im Wert, Zahlkarten in der
  Farbe. Joker bleiben doppelt so lange im Kopf und werden nie verwechselt, eigene Abwürfe 1,5-mal so lange.
- **Was offen liegt** (Auslagen, Teppichkarte, oberste Ablagekarte) wird nicht vergessen, aber mit „Tisch übersehen“ in Blindphasen
  (1 bis 1 + `missExtra` eigene Züge, danach immer ein aufmerksamer Zug) übersehen, mehr bei vollem Tisch. Eigene Auslagen nie.
- **Handüberblick**: Grundchance, eine mögliche Kombination, ein Anlegen oder Klauen zu übersehen, **mal Schwierigkeit** (Dreiersatz und
  Paar leicht, lange Folge, Joker, Ass und Klauen schwer; `comboDifficulty`, `layOffDifficulty`, Skalen kalibriert auf Mittel 1).
  Paar-Erstmeldungen (Cheft) gelten ganz oder gar nicht und werden mit einem Wurf geprüft.
- **Sorgfalt**: Der Abwurf wird per Softmax mit Streuung `noise` gewählt: Eine fast gleich gute Karte wird mal genommen, eine deutlich
  schlechtere (z. B. Joker, −500) nie. Ein guter Tag senkt die Streuung.
- **Pflichtzüge** (Joker verwenden, genommene Karte nutzen, Paar mit der Teppichkarte) übersehen nie etwas und sind sorgfältig, sonst
  bliebe ein Bot stecken.
- **Gegner-Gedächtnis**: Nur der nächste Spieler kann den Abwurf nehmen. Sein Risiko (0 bis 1) kommt aus Hinweisen („nimmt“, „wirft ab“,
  „ließ liegen“; verblassen wie jede Erinnerung) mal Erlaubnis nach den Regeln (von Cheft nimmt kein Rommé-Spieler; Cheft frei; Rommé
  draußen 0,7, sonst 0,2). Der Abwurfwert sinkt um 9 × Risiko (`nextPlayerRisk`).

## 3. Strategie für alle Stufen und Rollen

- **Ehrgeiz** (`ambition`, 0 bis 1): Ausgangswert der Rolle (Knob `ambition`, Standard 0,4) + Tabellenstand: hinten liegen bis +0,5 (bei
  100 Punkten Rückstand), Endspurt +0,2, Führender mit Runden vor sich +0,1, Führender kurz vor Schluss −0,2.
- **Erstmeldung abwägen** (`weighOpening`, Modus `v2`): Nutzen des Wartens (Hand-Chance, erwartete Verbesserung auf dem Weg von der Hürde zum
  Ziel Hürde + 10 + 40 × Ehrgeiz) gegen Zeitdruck (Stapel). Sicherheitsbremsen: nie warten bei Pflichtzug, Hand, Gegner schon draußen,
  Cheft-Hürde (101), Stapel unter 16 oder aufgebrauchter Geduld (1 + 5 × Ehrgeiz eigene Züge). Gilt auch beim „Ablagekarte nehmen, um
  rauszukommen“. Der alte getrennte Modus bleibt als `tuning.mode: 'v1'` zum Vergleichen.
- **Mutiger Modus** (Ehrgeiz ≥ 0,7, also etwa 60 Punkte Rückstand): auf Hand spielen, Cheft schon mit vier Paaren ansagen, Paare früher
  nehmen. Warten ohne Aussicht (`boldHold`) ist **aus**, weil es Siege kostet.
- Regler für Rollen: `knobs.ambition`, `knobs.bold`, `knobs.weighOpening`, `knobs.oppModel`, `knobs.tuning` (siehe `Tuning` in `strategy.ts`).
  Sie lassen sich in `decideAction(state, pid, { knobs, memory })` überschreiben (auch für Tests und Simulationen).

## 4. Regeln, die die Bots betreffen

- **Teppichkarte**: bildet ihr Paar **nur mit der genau gleichen Karte, nie mit einem Joker** (einzige Stelle, an der ein Joker nicht
  einspringt). Beim Nehmen zusätzlich vier weitere Paare (Joker dürfen dort helfen). Erst im letzten Zug bei leerem Stapel zählt sie wie
  eine normale Stapelkarte. Diese Regel war in der Engine falsch (Joker erlaubt) und ist behoben (`checkDraw`, `checkLay`).
- **App-Standard**: Rauskommen im ersten eigenen Zug **gesperrt**, **7 Runden**. Die Messwerkzeuge nehmen das als Standard
  (`FIRST_TURN=open` erlaubt den ersten Zug).

## 5. Messungen und Erkenntnisse

**Stufen am gemischten Tisch** (App-Standard: Erstzug gesperrt, 7 Runden, 1280 Spiele, ±2 Punkte): Vergesslich 16,5 %, Normal 24,3 %,
Scharfsinnig 26,9 %, Mastermind 32,3 %; Strafpunkte pro Runde 58,4 / 53,4 / 51,2 / 48,8. Bei erlaubtem Erstzug und 5 Runden (1920 Spiele):
17,0 / 22,0 / 28,5 / 32,6 %. Ziel war etwa 20 / 24 / 27 / 30 %. Die Siegquote rauscht stark (Kartenglück): **Strafpunkte sind das genauere
Maß**, und Vergleiche sollten auf **denselben Spielen** laufen (gleicher Startindex).

**Was sich gezeigt hat:**

- **Pauschales Warten mit der Erstmeldung verliert** (Siegquote 42 bis 46 % gegen „immer sofort legen“), weil der Tempoverlust mehr kostet,
  als die höhere Hürde bringt. Deshalb wartet die Abwägung selten (rund jede zwölfte Entscheidung). Beim ersten möglichen Rauskommen ist in
  54 % der Fälle schon ein Gegner draußen, und die Bots haben dann meist 5 bis 9 Restkarten (eine Hand ist selten). Die erste Erstmeldung
  einer Runde liegt im Median bei 61 Augen, nur 14 % erreichen 80.
- **Hand und früher Cheft beim Zurückliegen** sind neutral bis leicht positiv und machen das Spiel abwechslungsreicher (Cheft in etwa 18 bis
  25 % der Runden statt 11 bis 13 %).
- **Das Zählen (Gedächtnis) allein macht nicht stärker oder schwächer.** Ein Bot ohne jedes Gedächtnis spielt etwa gleich gut wie ein
  perfekter. Die Stärke kommt aus **Handüberblick** und **Sorgfalt**; das Gedächtnis macht die Bots menschlich.
- **Sorgfalt ist ein starker Hebel**: Streuung 3 allein kostet gegen perfekte Gegner etwa 5,7 Strafpunkte pro Runde.
- **Gegner-Gedächtnis** gegen die alte Blockierwertung: 51,6 % (±2,2), 1,2 Strafpunkte weniger pro Runde.
- Die Bots **schauen nicht in verdeckte Karten** (Test: fremde Hände und Stapelreihenfolge vertauschen ändert keine Entscheidung).
- Rechenzeit einer Entscheidung: Median 0,2 ms, 99 % unter 22 ms, Maximum rund 100 ms.

## 5a. Dauertest (letzter Stand)

`npm run soak` spielt Spiele mit zufälligen Einstellungen (2 bis 4 Spieler, 1 bis 9 Runden, Erstzug gesperrt oder erlaubt, alle Stufen
und Rollen gemischt) und prüft in jedem Zug unter anderem: Regelkonformität, 106 Karten, Reinheit, Determinismus, „kein Mogeln“,
Neustart aus JSON, Erinnerung (Mastermind gleich Referenzrechnung), Teppichkarte nie mit Joker, Rechenzeit.

- **Normal-Modus**: 5000 Spiele, rund 24 000 Runden, 1,92 Millionen Entscheidungen, **keine Verstöße**.
- **Extrem-Modus** (`SOAK_EXTREME=1`: pro Platz zufällige, auch absurde Werte für Gedächtnis und alle Regler, wie spätere Rollen sie
  setzen könnten): 2000 Spiele, rund 960 000 Entscheidungen. Er fand **eine echte Lücke**, die jetzt behoben ist: Eine genommene
  Ablagekarte, die nur durch Klauen eines Jokers verwendbar war, wurde nicht zum Klauen benutzt, wenn es eine zweite Klaumöglichkeit gab;
  die Karte blieb als letzte Karte übrig und der Bot kam nicht weiter (`err.mustUseTaken`). Seitdem keine Verstöße.
- **Rechenzeit einer Entscheidung** (ohne Last): Median 0,16 ms, 99 % unter 11 ms, 99,9 % unter 30 ms, Maximum rund 300 ms (11 von 27 700
  Entscheidungen über 60 ms, meist Ziehentscheidungen eines Spielers, der noch nicht draußen ist). Die Zeit steckt zu über 70 % in der
  Partitionssuche der Engine (`findPartition`). Ein Zwischenspeicher dafür brachte nichts (verworfen). Auf dem schwachen Render-Server
  können einzelne Entscheidungen deshalb bis etwa eine Sekunde dauern; falls das stört, wäre die Suche in `canOpenRommeWith` und
  `holdsOpeningWith` der Ansatzpunkt.

## 5b. Prüflauf (17.11.2026)

- `npm test`: 337 Tests grün.
- Dauertest normal (1500 Spiele, 7572 Runden, 591 710 Entscheidungen) und extrem (`SOAK_EXTREME=1`, 1500 Spiele, 7622 Runden, 860 354 Entscheidungen): **keine Verstöße**. Rechenzeit: Maximum 2,3 s bzw. 1,2 s unter Volllast (zwei Dauertests parallel auf 4 Kernen), 81 bzw. 49 Entscheidungen über 250 ms.
- Kalibrierung (Ausgewogen, voll, 3 × 960 Spiele; 7 Runden gesperrt / 5 Runden Erstzug erlaubt / 7 Runden, andere Startindizes):

| Stufe | 7 R. (Start 0) | 5 R. offen (Start 20000) | 7 R. (Start 40000) | Mittel |
|---|---|---|---|---|
| Vergesslich | 20,4 % | 18,9 % | 19,8 % | 19,7 % |
| Normal | 21,4 % | 23,5 % | 23,1 % | 22,7 % |
| Scharfsinnig | 25,6 % | 26,3 % | 28,4 % | 26,8 % |
| Mastermind | 32,6 % | 31,3 % | 28,7 % | 30,9 % |

  Alle Mittelwerte liegen im Zielband, die Stufen sind sauber gestaffelt (Strafpunkte/Runde 57 / 54 / 51 / 49). Einzelne Läufe schwanken um die Messtoleranz (±2,5 bis 3 Punkte); Werte wurden deshalb nicht verändert.

## 5c. Feinschliff-Durchlauf (18.11.2026): Ergebnis „Werte bleiben“

Alle Messungen mit dem Stand von `main` (keine Werteänderung), 7 Runden, Erstzug gesperrt, wenn nicht anders genannt.

**Matrix Rolle × Gedächtnis** (800 Spiele je Zelle, ein Platz gegen drei schlichte Ausgewogene Normal, Siegquote %, Toleranz ±3):

| | Vergesslich | Normal | Scharfsinnig | Mastermind | Ø | Cheft-Runden | nie Cheft |
|---|---|---|---|---|---|---|---|
| Ausgewogen | 21,6 | 23,8 | 28,6 | 30,4 | 26,1 | 12 % | 43 % |
| Frühvogel | 22,3 | 22,6 | 28,5 | 31,1 | 26,1 | 5 % | 68 % |
| Gerissener | 20,1 | 22,1 | 26,5 | 27,3 | 24,0 | 16 % | 30 % |
| Pärchenkönig | 18,9 | 23,1 | 25,8 | 29,7 | 24,4 | 17 % | 28 % |
| Glücksritter | 19,1 | 22,6 | 26,6 | 29,7 | 24,5 | 23 % | 16 % |
| Wildcard | 20,6 | 22,3 | 28,0 | 31,0 | 25,5 | 15 % | 32 % |

Die Stufen sind in jeder Zeile gestaffelt (die frühere Auffälligkeit Glücksritter/Mastermind ist mit größerer Stichprobe verschwunden), die Rollenstile bleiben deutlich verschieden (Cheft-Anteil 5 bis 23 %, Erstmeldung 56 bis 67 Augen).

**Rollen direkt am selben Tisch** (Normal, je 2000 Spiele, ±1,9): Tisch 1 Ausgewogen 26,8 / Frühvogel 24,6 / Gerissener 24,1 / Pärchenkönig 24,6; Tisch 2 Glücksritter 24,1 / Wildcard 22,1 / Ausgewogen 25,3 / Frühvogel 28,5; Tisch 3 Gerissener 26,6 / Pärchenkönig 24,7 / Glücksritter 23,0 / Wildcard 25,7.
Alle Rollen liegen zwischen 22 und 28 %, ohne Muster, das über das Messrauschen hinausgeht (derselbe Rollenvergleich schwankt zwischen Tischen um bis zu 3,6 Punkte).

**Extremtische** (800 Spiele je Tisch, auch 3 Runden und 9 Runden mit erlaubtem Erstzug): Vier Wildcards 24,3 bis 25,9 %; vier verschiedene Rollen und vier Glücksritter 22 bis 28 % (Glücksritter mit der höchsten Streuung, 75 bis 81 Strafpunkte, Cheft 24 %);
gemischte Stufen wie vorgesehen (Frühvogel Mastermind 31 bis 37 %, Pärchenkönig Scharfsinnig 27 bis 28 %, Glücksritter Normal 21 %, Gerissener Vergesslich 15 bis 19 %); 2 Spieler: Pärchenkönig Mastermind 62 bis 65 % gegen Frühvogel Vergesslich; 3 Spieler: Wildcard Mastermind 36 bis 41 %.

**Beschluss:** Kein Regler wurde verändert. Die Unterschiede zwischen den Rollen (Ø 24,0 bis 26,1 % in der Matrix, ±1,5) sind höchstens knapp außerhalb des Rauschens und passen zur Absicht (Gerissener, Pärchenkönig und Glücksritter etwas riskanter und damit leicht unter der Ausgewogenen); ein Nachregeln auf Messrauschen würde die Stile eher verwischen
(vgl. Abschnitt 2: `holdAt0` 0,3 macht den Gerissenen schwächer erkennbar). Zusammen mit den Dauertests aus 5b (normal und extrem, 3000 Spiele, keine Verstöße) und der Kalibrierung der Stufen (Mittel 19,7 / 22,7 / 26,8 / 30,9 %) ist damit der „lange Durchlauf“ in der Breite erledigt.

Noch offen: Rollen-Varianten (`lab14.ts`) und Vorlieben/Erkennbarkeit nach künftigen Änderungen erneut messen.

## 5d. Wirken Vorlieben und „menschliche Faktoren“ wirklich? (18.11.2026)

Messung mit `lab6`, `lab_recog`, `lab5 tastes` und einer Entscheidungsprobe (60 Spiele zu 5 Runden, Mastermind-Tisch; je Entscheidung wird dieselbe Lage mit und ohne den Faktor entschieden und verglichen):

| Faktor | Abwürfe anders | alle Entscheidungen anders |
|---|---|---|
| Vorlieben (auto, Skala 2) | 23,0 % | 10,2 % |
| Gegner-Gedächtnis (oppUse 1) | 4,8 % | 2,2 % |
| Launen (jitter 0,2) | 11,8 % | 5,3 % |
| Rollentreue 0,85 (Ausweichen in 15 % der Runden) | 0,6 % | 0,4 % |
| **Stimmung (tilt 0,5)** | **0,0 %** | **0,0 %** (Stimmung ±4: 0,3 %) |
| alles zusammen (App-Standard) | 29,8 % | 13,4 % |
| Rollen pur gegen Ausgewogen: Pärchenkönig / Glücksritter / Gerissener / Frühvogel | 7,9 / 9,2 / 1,2 / 0,1 % | 3,9 / 5,3 / 1,7 / 0,5 % |

- **Vorlieben wirken deutlich und kosten nichts:** Der Anteil passender Abwürfe sinkt um etwa 30 % (Herz 24,7 → 17,1 %, Bildkarten 22,0 → 14,6 %, Sieben und Buben 13,9 → 9,4 %), die Strafpunkte bleiben gleich oder besser. Sweeps über Skala 0,5 bis 8, Schutz 6 bis 1e9 und absurde Werte (Skala 100, −5, Gewicht 1000) ändern die Siegquote nicht über das Rauschen hinaus.
- **Erkennbarkeit der Rollen mit Würze:** Der Klassifikator trifft 34,1 % bei reinen Rollen, mit Treue 0,85, Launen 0,2 und Stimmung 0,5 noch 30,6 % (90 % Erhalt), 84 % der Runden in der eigenen Rolle, 72 % der Spiele mit mindestens einer Abweichung.
- **Befund Stimmung:** Sie verschiebt nur den Ehrgeiz, und der entscheidet nur über „Erstmeldung jetzt oder noch warten“ in seltenen Lagen. Selbst eine absurd starke Stimmung ändert weniger als 0,5 % der Entscheidungen; das Ausweichen der Rollentreue ebenfalls kaum (0,4 %), weil die Nachbarrollen der Ausgewogenen ähnlich spielen. Die Stimmung ist damit praktisch unsichtbar. Möglicher Ausbau (nicht umgesetzt): nach einer Pleite zusätzlich Cheft früher ansagen oder den Abwurfdruck erhöhen, danach Stärke und Erkennbarkeit neu messen.

## 5e. Stimmung wird Endspurt-Neigung (18.11.2026)

**Warum:** Die alte Stimmung (nach einer Pleite mutiger) änderte praktisch keine Entscheidung (5d). Neu (`resolvePersona` in `personas.ts`, Regler `tilt`, Standard in `SPICE` jetzt 1): Der Bot misst seinen Rückstand an dem, was in den verbleibenden Runden noch aufzuholen ist (etwa 45 Punkte je Runde), gewichtet mit dem Spielfortschritt. Wer hinten liegt, wird mutiger (Ehrgeiz höher, ab mittlerem Druck Cheft schon mit 4, ab hohem Druck mit 3 Paaren, Paare früher nehmen; der mutige Modus sucht dann auch die Hand); wer deutlich führt, wird vorsichtiger. Der Frühvogel (Cheft 99 = nie) bleibt bei „nie Cheft“, wird aber ehrgeiziger.

**Verlauf von Spielen** (1200 Spiele, 7 Runden, vier Ausgewogene Normal; `Führender` = nach Runde k vorn):

| nach Runde | Führender gewinnt | wer ≥100 Pkt hinten liegt, gewinnt | wer ≥50 hinten, gewinnt |
|---|---|---|---|
| 2 | 46 % | 9 % | 13 % |
| 3 | 55 % | 6,5 % | 10 % |
| 4 | 61 % | 4,6 % | 8,4 % |
| 5 | 71 % | 2,6 % | 5,8 % |
| 6 | 80 % | 0,5 % | 3,2 % |

Mit Stimmung 1 (nach Runde 5): Führender 66 % statt 71 %, Aufholsieg bei ≥100 Rückstand 3,9 % statt 2,6 %, der mittlere Abstand der Spitze wächst leicht (86 statt 80 Punkte): mehr Dramatik, aber das Spiel kippt nicht. Bei 9 Runden ist es offener (nach Runde 6 gewinnt der Führende 68 %, ≥100 hinten 4,3 %), bei 5 Runden früher entschieden (nach Runde 3 gewinnt der Führende 62 %).
Stärke: Siegquote mit Stimmung 1 gegen drei ohne (je 1000 Spiele): Ausgewogen 25,7 (Ø der drei ohne 24,8), Pärchenkönig 26,6 (24,5), Glücksritter 25,9 (24,7), Gerissener 24,5 (25,2), Frühvogel 26,4 (24,6): kein Verlust, dafür etwa 2 Strafpunkte mehr und mehr Streuung. Dauertest extrem (600 Spiele): keine Verstöße.

*Hinweis zu den Messungen:* Bots ohne Persona-Angabe in den Laborskripten spielen automatisch als Ausgewogen mit allen Zutaten (Vorlieben, Gegner-Gedächtnis, Würze), deshalb war „ohne Vorlieben“ im Vorlieben-Sweep identisch mit „Skala 2“ (der Standard).

## 6. Werkzeuge

| Befehl | Zweck |
|---|---|
| `npm test` | alle Tests (gut 300), darunter Gedächtnis, Strategie, Teppichkarten-Regel, „kein Mogeln“, Spiele aller Rollen |
| `npm run calibrate -- 1920 7 balanced full [Startindex]` | alle vier Stufen am selben Tisch (rotierende Plätze/Geber), Varianten `memory`, `perception`, `none`; `CALIB_OVERRIDE='{"easy":{"noise":1.2}}'` probiert Werte aus |
| `npm run duel -- 1920 7 '{A}' '{B}' master [Startindex]` | zwei Einstellungen (JSON der Regler) am selben Tisch gegeneinander |
| `npm run sensitivity -- 640 7` | ein veränderter Testbot gegen drei perfekte: Wie stark schadet ein Regler? |
| `npm run soak -- 5000 [Start]` | Dauertest mit zufälligen Einstellungen (2 bis 4 Spieler, 1 bis 9 Runden, Erstzug gesperrt/erlaubt, alle Stufen und Rollen); prüft Regeln, Kartenzahl, Reinheit, Determinismus, „kein Mogeln“, Neustart aus JSON, Erinnerung, Teppichkarte, Rechenzeit |

## 7. Rollen: erledigt, und was später ansteht

**Erledigt** (Details in [ROLLEN_V3.md](ROLLEN_V3.md)): Die alten acht Spielweisen sind durch fünf Spielweisen und die Wildcard ersetzt (Ausgewogen, Frühvogel, Gerissener, Pärchenkönig, Glücksritter, Wildcard), mit Rollentreue-Würze, Vorlieben, Gegner-Gedächtnis pro Spiel,
Namenstabelle (188 Namen) und Aufdecken am Spielende. Beide Schwächen der Grundstrategie sind behoben (Gefahrenmodus nur für Spieler draußen, kein Abwerfen von Hochkarten vor der Erstmeldung). Alte Spielstände und Einstellungen mit den alten Spielweisen werden abgebildet
(Sprinter → Frühvogel, Cheft-Fan → Pärchenkönig, Jokerjäger → Gerissener, übrige → Ausgewogen).

**Später (Notiz): langer Durchlauf zum Feinschliff.** Nicht in einem Chat nebenbei, sondern als eigener Lauf aller Bot-Varianten mit möglichst vielen, auch extremen Situationen:

- Alle Rollen × alle vier Gedächtnisse × Tischgrößen 2, 3 und 4 × 3/5/7/9 Runden × Erstzug erlaubt und gesperrt, je Zelle deutlich mehr Spiele als bisher (mindestens 2000, dann etwa ±1 Prozentpunkt Messtoleranz statt ±3).
- Extremlagen: hoher Rückstand und Vorsprung von Anfang an, Tische nur mit einer Rolle, nur Wildcards, Mastermind gegen Vergesslich, Spiele mit abwesendem Spieler (Ersatzbot), absurde Reglerwerte (Dauertest `SOAK_EXTREME=1`), Neustart mitten im Spiel.
- Werte zum Feinschliff: Rollen-Regler (`STYLE_KNOBS` in `src/bot/roles.ts`), Würze `SPICE` (Treue 0,85, Launen 0,2, Stimmung 0,5), Vorlieben (Skala 2, Band 8, Schutz 14, Kostenfaktoren je Richtung), Gegner-Gedächtnis (`oppObserve`, `oppDetail`, `oppSpan`, `oppAccuracy`), Glücksritter (früh Cheft ab 3 Paaren, sobald er nicht führt), Gerissener (`holdAt0` 0,2; mit 0,3 etwa 3 statt 4,5 Punkte schwächer, aber kaum noch erkennbar).
- Stufen mit dem neuen System neu kalibrieren (`npm run calibrate`, Ziel etwa 17 / 23 / 28 / 32 %); die Messungen bisher: Der neue Ausgewogene liegt auf jeder Stufe gleichauf mit den früheren Bots (Vergesslich 24,6 %, Normal 25,8 %, Scharfsinnig 25,3 %, Mastermind 25,3 % gegen drei frühere Bots derselben Stufe).
- Stand der Messung der Rollen-Eigenschaften (`scripts/lab14.ts`, abgebrochen): Der „Eile“-Hebel beim Frühvogel (mehr Entscheidungsfehler) kostet nur Stärke (27,9 → 24,7 → 20,4 → 17,8 %), ohne den Stil sichtbarer zu machen: nicht übernommen. Die Varianten für Gerissener (längeres Warten), Pärchenkönig (mehr Paarliebe) und Glücksritter (immer ab 3 Paaren) sind noch nicht ausgewertet.
- Erkennbarkeit der Rollen (`scripts/lab_recog.ts`) und Sichtbarkeit der Vorlieben (`scripts/lab6.ts`) nach Änderungen wiederholen; Namen überarbeiten (`rolenames.ts`, Geschlechterverhältnis wird im Test geprüft).
- Offene Fragen: Hand und Joker-Verbrennen kommen fast nie vor (0,1 % / 0,4 % der Runden), mit Bot-Reglern nicht zu ändern; haushohe Siege des Glücksritters sind nicht häufiger als bei den anderen Rollen.

**Beobachtung außerhalb der Bots:** Die Spieler-Sicht (`engine/view.ts`) schickt `seed` mit. Wer den Mischalgorithmus kennt, könnte im Mehrspielermodus daraus verdeckte Karten ableiten. Das ist unabhängig von den Bots und sollte separat geprüft werden (z. B. Seed aus der Sicht entfernen, die Vorlieben-Anzeige am Spielende bräuchte ihn dann aus einer anderen Quelle).
