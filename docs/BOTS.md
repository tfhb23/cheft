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

## 6. Werkzeuge

| Befehl | Zweck |
|---|---|
| `npm test` | alle Tests (gut 300), darunter Gedächtnis, Strategie, Teppichkarten-Regel, „kein Mogeln“, Spiele aller Rollen |
| `npm run calibrate -- 1920 7 balanced full [Startindex]` | alle vier Stufen am selben Tisch (rotierende Plätze/Geber), Varianten `memory`, `perception`, `none`; `CALIB_OVERRIDE='{"easy":{"noise":1.2}}'` probiert Werte aus |
| `npm run duel -- 1920 7 '{A}' '{B}' master [Startindex]` | zwei Einstellungen (JSON der Regler) am selben Tisch gegeneinander |
| `npm run sensitivity -- 640 7` | ein veränderter Testbot gegen drei perfekte: Wie stark schadet ein Regler? |
| `npm run soak -- 5000 [Start]` | Dauertest mit zufälligen Einstellungen (2 bis 4 Spieler, 1 bis 9 Runden, Erstzug gesperrt/erlaubt, alle Stufen und Rollen); prüft Regeln, Kartenzahl, Reinheit, Determinismus, „kein Mogeln“, Neustart aus JSON, Erinnerung, Teppichkarte, Rechenzeit |

## 7. Offen: für die Rollen (nächster Chat)

1. **Spielweisen kritisch hinterfragen** (so war es vereinbart, sobald die Stufen klar sind). Bekannte Befunde:
   - **`blocker` und `counter` haben derzeit keine Wirkung auf den Abwurf.** Sie wirken nur im alten Abwurfzweig (`chooseDiscard`, Zeilen
     nach `if (k.counting) return ...`), der seit der Umstellung nie mehr erreicht wird, weil alle Stufen über das Gedächtnis abwerfen. Das
     Blocken übernimmt jetzt für alle das Gegner-Gedächtnis. Der Zweig kann gelöscht oder die Rollen können neu belebt werden.
   - `sprinter` setzt nur Werte, die ab Normal ohnehin Standard sind (ist praktisch identisch mit Ausgewogen).
   - Wirksam sind `cheft` (cheftEagerPairs, pairTakeAt), `hand` (handHunter), `joker` (jokerHunter, burn, steal) und `gambler`
     (Zufall bei Cheft-Entscheidungen), außerdem `openMargin`, `takeDiscardToOpen`, `layAll`, `steal`, `master` (Erstmeldung ohne Joker),
     `patient` (auf die Teppichkarte warten), `ambition`, `bold`, `weighOpening`, `tuning`.
2. **Wildcard**: eine Rolle, die in jeder Runde komplett andere Werte hat (unberechenbar). Passt zu `ambition`, `tuning` und den
   Gedächtnis-Überschreibungen (`opts.memory`), die pro Runde gewürfelt werden könnten.
3. **Rollenabhängige Unschärfe** („nie zu 100 % die Rolle“): z. B. ein Sprinter kommt nicht bei jedem Mal an der Hürde raus, sondern
   sammelt früh auch mal mehr oder spielt (selten) auf Hand oder Cheft, je nach Handkarten.
4. **Mastermind-Extras über Rollen**: Joker schonen bei der Erstmeldung (`master`), auf die Teppichkarte warten (`patient`) und das
   Spielende vorausahnen (läuft jetzt für alle über den Abwurf). Sie hingen früher an der Stufe und sind jetzt Knobs, standardmäßig aus.
5. **Warten mit der Erstmeldung als Charakterzug** (`boldHold`, `tuning`): kostet Siege, taugt aber für „Taktiker“ oder „Zocker“.
6. Neue Rollenwerte immer mit `duel`/`calibrate` gegen Ausgewogen messen (gleicher Startindex) und Stärke so halten, dass die vier
   Stufen weiter in etwa 17 / 23 / 28 / 32 % landen.
7. Nicht bedacht oder bewusst offen: echte menschliche Spieler als Maßstab (alle Messungen sind Bot gegen Bot), Hinweise auf den
   Spielstil der Mitspieler über Runden hinweg (das Gegner-Gedächtnis gilt nur innerhalb der Runde).
