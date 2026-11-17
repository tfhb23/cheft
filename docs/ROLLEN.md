# Bot-Rollen: Befund, Vorschlag und Messungen

> Weiterentwicklung (beschlossene 5 Spielweisen + Wildcard, Vorlieben, Gegner-Gedächtnis): [ROLLEN_V3.md](ROLLEN_V3.md).

Stand: Ergebnis der Rollen-Untersuchung (Branch `ccr-a08d65f5-lqevpy`). Alles Folgende ist **Entwurf**: In der App ist nichts umgestellt,
das bisherige Verhalten der Bots ist bitgleich erhalten (geprüft mit 120 Spielen vor und nach dem Umbau, siehe `scripts/regress.ts`).

## 1. Kurzfassung

- Von den 8 bisherigen Spielweisen wirken nur **Cheft-Fan** und **Zocker** merklich. Sprinter, Blocker und Zähler spielen **bitgleich** wie
  Ausgewogen, Handmacher und Jokerjäger kaum anders.
- In diesem Spiel gibt es nur **drei Achsen, die man als Mensch wirklich spürt und die messbar sind**: wie früh/spät ein Bot rauskommt,
  wie gern er Cheft spielt, und wie riskant (schwankend) seine Runden sind. Blockieren, Joker-Jagd, Hand und Jagd auf den Führenden haben
  im Spiel praktisch keine Wirkung (siehe 3).
- **Vorschlag: 6 Rollen** (Ausgewogen, Tempo, Lauerer, Cheft-Fan, Zocker, Wildcard) statt 8. Sie liegen nach der Überarbeitung bei
  **20 bis 26 % Siegen** am Vierertisch (fair 25 %), mit klar unterscheidbarem Stil.
- **Gedächtnis und Rolle sind unabhängige Achsen.** Der Stil ist auf allen vier Stufen gleich, die Stufe hebt nur die Stärke. Eigene
  Gedächtnis-Parameter pro Rolle sind nicht nötig, und die Mastermind-Extras bringen nichts (siehe 5).
- **Zwei Schwächen der Grundstrategie** aller Bots sind aufgefallen (frühes Abwerfen hoher Karten, „Gefahrenmodus“). Sie zu beheben ist
  eine eigene Entscheidung (siehe 7).

## 2. Die bisherigen Rollen (1200 Spiele, 5 Runden, Platz T gegen drei Ausgewogene, Normal; fair 25 %)

| Rolle | Sieg | Strafp./Runde | Streuung | Cheft | Besonderheit |
|---|---|---|---|---|---|
| Ausgewogen (Kontrolle) | 23,8 | 52,4 | 57 | 8 % | |
| Sprinter | 23,8 | 52,4 | 57 | 8 % | **identisch** mit Ausgewogen |
| Blocker | 23,8 | 52,4 | 57 | 8 % | **identisch** (der Abwurfzweig ist toter Code) |
| Zähler | 23,8 | 52,4 | 57 | 8 % | **identisch** |
| Handmacher | 22,9 | 52,5 | 57 | 8 % | Hand 0,1 %, also wie alle |
| Jokerjäger | 23,6 | 52,4 | 57 | 8 % | Joker verbrannt in 0,4 % der Runden |
| Cheft-Fan | 23,5 | 55,7 | 64 | 14 % | wirkt |
| Zocker | **15,0** | **81,9** | 92 | **41 %** | wirkt, aber viel zu schwach |

## 3. Was im Spiel überhaupt Wirkung hat (Parameter-Sweeps, je 500 Spiele, auch absurde Werte)

| Regler | Bereich getestet | Wirkung |
|---|---|---|
| `ambition` (Ehrgeiz) | −1 bis 3 | **Sauber und kostenlos**: Cheft-Anteil 4 → 15 %, Streuung 52 → 62, Siegquote flach (23 bis 24 %). Ab 1 sättigt er. |
| Cheft-Neigung (`cheftEagerPairs`/`pairTakeAt`) | 99 bis 0 | Treppe: ab 4 Paaren Cheft 15 % (Sieg 24 %), ab 3: 26 % (20,5 %), ab 2: 45 % (11,6 %), ab 1: 54 % (8,4 %) |
| Warten mit der Erstmeldung (`tuning.holdAt0`, `boldHold`) | bis „immer warten“ | Züge bis Erstmeldung 4,0 → 5,2, früh geöffnet 59 → 36 %, kostet 3 bis 5 Punkte Siegquote |
| `pairLove` (Paare behalten) | −2 bis 20 | Cheft 5 → 11 %, kostet nichts. Ab 0 sinkt die Erstmeldung nicht |
| `blockWeight` | −9 bis 200 | **Null Wirkung** (Blockieren spielt in diesem Spiel keine Rolle, Rommé-Spieler dürfen kaum nehmen) |
| `huntLeader` | −1 bis 10 | **Null Wirkung** (Joker-Klau passiert nur 0,11-mal pro Runde) |
| `handHunter`/`handReach` | 0 bis 14 | Hand bleibt bei 0,1 %. Längeres Warten kostet nur Siege (22 → 18 %) |
| `master`, `patient`, `burn`, `jokerHunter` | an/aus | Siegquote unverändert (22,5 bis 23,2), Verbrennen gelingt in 0,4 % der Runden |
| `shedPre` (Hochkarten vor der Erstmeldung abwerfen) | −0,5 bis 30 | **Stark**: Je höher, desto schlechter (30 → 10 % Siege). Negativ (hohe Karten behalten) ist besser: 28,4 % |
| `dangerHand` (Gefahrenmodus) | −1 bis 14 | **Stark**: Aus (0) gibt 27,6 % statt 23,4 %, früh einschalten (6) nur 18,5 % |
| `layAll` aus / `takeDiscardToOpen` aus / `steal` aus | | Siegquote 13 % / 15 % / 20 %: das sind Fehler, keine Charakterzüge |

Auch im Spiel selbst fällt auf: **In etwa 41 % der Spieler-Runden kommt ein Spieler nie raus** (100 Strafpunkte). Die Runde wird fast
ganz davon bestimmt, wer wann die Erstmeldung schafft. Deshalb tragen „Tempo bei der Erstmeldung“ und „Cheft“ als Achsen, alles
Spätere (Blocken, Joker, Hand) kommt kaum vor.

## 4. Vorschlag: 6 Rollen

Die Werte stehen als Entwurf in `src/bot/personas.ts` (`CAND`), Messung: 600 Spiele, 5 Runden, Platz T gegen drei Ausgewogene (Normal). Die zweite
Spalte jeder Zahl gilt mit verbesserter Grundstrategie (siehe 7), sie ändert die Rangfolge nicht.

| Rolle | Stil in einem Satz | Regler (Abweichung vom Standard) | Sieg | Strafp. | Streuung | Cheft | Züge bis Erstm. | früh offen |
|---|---|---|---|---|---|---|---|---|
| **Ausgewogen** | Referenz | – | 22,8 / 25,4 | 52,8 | 58 | 8 % | 4,0 | 59 % |
| **Tempo** | Raus, so schnell es geht; nie Cheft; ruhige Runden | `weighOpening` aus, `bold` aus, `ambition` 0, `cheftEagerPairs` 99, `pairTakeAt` 5 | 22,2 / 25,6 | 50,3 | 52 | 4 % | 3,8 | 61 % |
| **Lauerer** | Wartet auf die große Erstmeldung, kommt später raus | `ambition` 0,8, `tuning.holdAt0` 0,2 | 21,8 / 22,6 | 56,7 | 63 | 14 % | 4,4 | 54 % |
| **Cheft-Fan** | Sammelt Paare, sagt gern Cheft an | `cheftEagerPairs` 4, `pairTakeAt` 3, `pairLove` 1,8, `ambition` 0,5 | 21,9 / 21,3 | 56,4 | 65 | 16 % | 4,1 | 57 % |
| **Zocker** | Cheft schon mit drei Paaren, hohes Risiko, schmerzhafte Siege und Pleiten | `cheftEagerPairs` 3, `pairTakeAt` 3, `pairLove` 2, `ambition` 0,6 | 20,3 / 20,2 | 64,2 | 77 | 27 % | 4,4 | 54 % |
| **Wildcard** | Wählt jede Runde eine andere Rolle (Rollentreue 0 bis 0,5, Launen 0,3) | Pool: Ausgewogen, Tempo, Lauerer, Cheft-Fan, Zocker | 21,6 bis 22,7 / 22,5 bis 23,6 | 54 bis 56 | 60 bis 64 | 12 bis 15 % | 4,1 bis 4,3 | 54 bis 57 % |

Abstufungen, falls man mehr Härte will (nicht empfohlen als Standard, aber als Wahl): **Lauerer mittel/stark** (Sieg 19,9 / 18,0, Züge 4,9 / 5,2),
**Cheft-Fan stark** (20,2), **Zocker wild** (16,8, Cheft 37 %), **Hasardeur** (Cheft schon mit 3 Paaren und Warten, 16,5, Streuung 80).
Sie wären „Extremstufen“ für Spieler, die wirklich unberechenbare Gegner wollen.

**Warum 6 und nicht mehr:** Es gibt nur zwei unabhängige Spielstil-Achsen mit echter Wirkung (Tempo der Erstmeldung, Cheft-Neigung), dazu
das Risiko, das aus beiden folgt. Tempo, Lauerer, Cheft-Fan und Zocker besetzen die vier Ecken, Ausgewogen die Mitte, die Wildcard
mischt sie. Weitere Rollen wären nur Zwischenstufen oder ohne messbare Wirkung.

**Was entfällt:** Blocker, Zähler, Handmacher, Jokerjäger (ohne Wirkung, siehe 2 und 3), Sprinter (ersetzt durch Tempo), Königsjäger und
Heißsporn (als neue Ideen getestet, ohne Wirkung).

**Rollentreue, Launen, Stimmung („nie zu 100 % die Rolle“):**

- Der Stil schwankt auch ohne Zutat schon von Runde zu Runde, weil er von den Handkarten abhängt: Ein Cheft-Fan sagt in 41 % der 5-Runden-Spiele
  nie Cheft an, ein Zocker in 21 %, kein Bot spielt in allen Runden Cheft. Das wirkt menschlich.
- **Rollentreue** (Chance, in der Rolle zu spielen, sonst eine ganze Runde lang eine andere) mischt den Stil gleichmäßig: Cheft-Anteil des Cheft-Fans
  bei Treue 1 / 0,6 / 0: 16 / 14 / 12 %. Empfehlung **0,8** als dezente Würze für alle Rollen.
- **Launen** (leichte Schwankung von Ehrgeiz, Abwurfdruck je Runde) und **Stimmung** (nach einer Pleite mutiger, nach einem Sieg vorsichtiger) ändern in
  den Zahlen fast nichts (Cheft-Anteil 8 → 6/10 %), sind aber kostenlos und machen Verläufe unberechenbarer. Empfehlung: Launen 0,3, Stimmung +0,5.
- **Wildcard:** Der Pool bestimmt Stärke und Stil. Mit allen alten Rollen im Pool sinkt sie auf 18 bis 20 % (Zocker und Hürdenbauer ziehen sie herunter),
  nur riskante Rollen: 18,4 % bei Streuung 72, nur ruhige Rollen: 23,2 % bei Streuung 54. Deshalb ein **kuratierter Pool**.

## 5. Gedächtnis × Rolle und die Mastermind-Extras

Alle Rollen auf allen vier Stufen (400 Spiele je Zelle): Stil-Kennzahlen (Cheft-Anteil, Züge bis Erstmeldung) sind **auf allen Stufen praktisch gleich**
(z. B. Cheft-Fan 16,4 / 15,6 / 15,4 / 16,3 %). Die Stufe hebt nur die Stärke aller Rollen gleichmäßig an (Ausgewogen 21,1 / 24,2 / 25,8 / 31,0 %),
der Abstand zwischen den Rollen bleibt. Gedächtnisabhängige Rollen (Blocker, Zähler) gewinnen mit besserem Gedächtnis **nicht** dazu.

- **Keine eigenen Gedächtnis-Parameter pro Rolle nötig.**
- **Mastermind-Extras** (Joker schonen, auf die Teppichkarte warten, Joker verbrennen, Joker jagen) ändern auf keiner Stufe etwas (Easy 20,5 bis 20,9 %,
  Normal 22,5 bis 23,4 %). Der Mastermind bleibt ein reiner Gedächtnis-Gegner, und die Knobs `master`/`patient` können bleiben oder entfallen.
- Wer will, kann die **Tagesform je Runde** (Stufe wechselt rundenweise) als Charakterzug nutzen: Ausgewogen mit Stufen Easy/Master abwechselnd: 26,4 %, Easy/Hard 23,7 %.
  Als Rolle taugt es nicht, weil es keinen sichtbaren Stil ändert.

## 6. Robustheit (absurde Werte)

- **Dauertest, Extrem-Modus** (jetzt mit allen neuen Reglern und der Rollen-Schicht, auch negative und riesige Werte, Rollentreue, Launen bis 5,
  Stimmung bis ±5, wechselnde Stufen je Runde): 1200 Spiele, 5858 Runden, rund 680 000 Entscheidungen, **keine Verstöße** (Regeln, 106 Karten, Reinheit,
  Determinismus, kein Mogeln, JSON-Neustart, Erinnerung, Teppichkarte). Normal-Modus 600 Spiele ebenfalls ohne Verstöße. Größte Rechenzeit einer Entscheidung 0,5 bis 0,6 s (unter Last).
- **Regressionsprüfung:** Mit den Standardwerten spielt der Code Spiel für Spiel bitgleich wie vorher.

## 7. Aufgefallene Schwächen der Grundstrategie (eigene Entscheidung)

Beim Sweep zeigte sich, dass zwei Gewohnheiten **aller** Bots ihnen schaden:

1. **Hochkarten vor der Erstmeldung abwerfen** (`shedPre` 0,12): Mit 0 statt 0,12 steigt die Siegquote eines einzelnen Bots von 23,4 auf 25,6 %, mit −0,5 auf 28,4 %.
2. **Gefahrenmodus** (sobald ein Gegner draußen ist und ≤ 2 Karten hat, zählt jeder Strafpunkt): Ohne ihn 27,6 % statt 23,4 %. Der Modus wirkt auch bei Spielern, die noch nicht draußen sind, und nimmt ihnen die hohen Karten.

Beides zusammen als neuer Standard (alle Plätze) hebt die Qualität, ändert aber die kalibrierten Siegquoten der vier Stufen (Ziel etwa 17 / 23 / 28 / 32 %) und
müsste mit `npm run calibrate` neu abgestimmt werden. Die Rollen-Rangfolge bleibt in beiden Fällen gleich (siehe Spalte 2 in 4). Der Mensch am Tisch würde die Bots
dann als etwas klüger erleben.

## 8. Ideen, die bisher fehlten (Blick von außen)

- **Das Spiel hat wenig Spielraum für Rollen jenseits der Erstmeldung:** 41 % der Spieler-Runden enden ohne Erstmeldung, Hände (0,1 %), Joker-Verbrennen (0,4 %) und Klauen
  (0,1 pro Runde) kommen kaum vor. Wenn Hand und Joker-Verbrennen als Spannungspunkte gewünscht sind, müsste man sie über die **Regeln** häufiger machen
  (z. B. Bonus, früheres Rauskommen), nicht über Bot-Regler.
- **Sichtbarer Charakter ohne Strategiewirkung:** Kleine Sprüche oder Symbole bei Cheft-Ansagen, langem Warten oder Joker-Klau (aus dem Verhalten abgeleitet) machen
  Rollen erlebbar, ohne Stärke zu kosten. Nicht getestet.
- **Der Mensch als Maßstab fehlt weiter:** Alle Zahlen sind Bot gegen Bot. Ob ein Lauerer sich für Menschen „zäh“ anfühlt, zeigt nur ein Test am Tisch.
- **Schmerzhafte Siege:** Aufholsiege (nach der Hälfte hinten, am Ende vorn) sind bei allen Rollen ähnlich häufig (8 bis 10 %), die Streuung der Zocker-Runden
  (77 gegen 52 bei Tempo) sorgt aber für deutlich größere Ausschläge in einer einzelnen Runde.

## 9. Was zur Übernahme in die App nötig wäre

1. `BotStyle` und die Rollenliste auf 6 Einträge ändern (`engine/game.ts`, `bot/names.ts`, `i18n/de.ts`, Auswahl in der Oberfläche, Namen: 6 Rollen × 4 Stufen × 4 Namen; die frei
   werdenden Namen von Blocker, Zähler, Handmacher, Jokerjäger lassen sich neu verteilen).
2. `knobsFor(profile)` durch eine zustandsabhängige Auflösung ersetzen (`resolvePersona` aus `personas.ts`, Rollentreue/Launen/Stimmung je Runde), Wildcard mit kuratiertem Pool.
3. Alte Spielstände mit den entfallenden Rollen auf die nächstliegende neue Rolle abbilden.
4. Optional: Grundstrategie verbessern (7) und die Stufen neu kalibrieren.

## 10. Werkzeuge

| Befehl | Zweck |
|---|---|
| `npx tsx scripts/roles.ts '<JSON mit 4 Specs>' [Spiele] [Runden]` | Rollen-Labor: vier Konfigurationen am selben Tisch, Stärke, Risiko, Stil-Kennzahlen, Abwechslung |
| `npx tsx scripts/lab2.ts knobs\|loyal\|levels\|extras` | Parameter-Sweeps (auch absurde Werte) |
| `BASE='{"shedPre":0,"dangerHand":0}' npx tsx scripts/lab3.ts v2` | überarbeitete Rollen, optional mit gemeinsamer Grundeinstellung |
| `npx tsx scripts/regress.ts` | Prüfsumme über 120 Spiele (muss vor und nach einem Umbau gleich sein) |
| `SOAK_EXTREME=1 npm run soak` | Dauertest mit absurden Werten, jetzt auch für Rollen-Schicht und neue Regler |

Messfehler: bei 600 Spielen etwa ±3,5 Prozentpunkte Siegquote, bei 1200 etwa ±2,5. Strafpunkte pro Runde sind genauer. Rohdaten (JSON je Messung) liegen im Scratchpad der Sitzung.
