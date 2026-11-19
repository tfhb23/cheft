# Cheft – Das Familienkartenspiel

Cheft als Web-App im Pixel-Look (angelehnt an Windows-3.1-Solitaire, Farbwelt im Cheft-Orange).
Läuft im Browser auf Android, iOS und PC und lässt sich als PWA auf den Homescreen legen.

Solo gegen 2–3 Computergegner (offline) oder online mit Freunden: Raum eröffnen, 3-stelligen Zahlencode
weitergeben, leere Plätze mit Bots auffüllen. Auch in ein laufendes Spiel lässt sich einsteigen, indem man den
Platz eines Bots oder eines länger Abwesenden übernimmt (siehe Mehrspieler-Server).

## Starten

```bash
npm install
npm run dev        # Entwicklung: http://localhost:5173
npm test           # Regel-Tests (Vitest)
npm run build      # Produktions-Build nach dist/
npm run calibrate  # Bot-Gedächtnisse gegeneinander antreten lassen (siehe „Bot-Gedächtnis“)
npm run duel       # zwei Bot-Einstellungen am selben Tisch vergleichen (siehe „Bot-Strategie“)
npm run preview    # Build lokal ansehen
```

Die App läuft unter https://cheft.beigi.eu (HTTPS). Dort im Handy-Browser öffnen und
„Zum Startbildschirm hinzufügen“ wählen. Jeder Push auf `main` wird von Render automatisch gebaut und veröffentlicht.

## Bedienung und Speichern

- Karten in der Hand per Drag & Drop sortieren, auf die Ablage ziehen (abwerfen), auf eine Kombination ziehen (anlegen oder Joker klauen) oder markiert in die eigene Auslage ziehen (auslegen). Alles geht auch per Antippen und Knopf.
- Die gezogene Karte erscheint rechts in der Hand und ist grün markiert.
- Bots und Mitspieler sitzen links, oben und rechts; ihre Auslagen liegen aus ihrer Blickrichtung. Am PC sind zusätzlich ihre verdeckten Handkarten zu sehen.
- Der Spielstand wird nach jedem Zug im Browserspeicher des Geräts gesichert (localStorage, ohne Login). „Weiterspielen“ im Menü nimmt ihn wieder auf. Über das Zahnrad lässt sich ein Spielstand-Code kopieren, der im Menü eines anderen Geräts eingefügt werden kann.
- Die Hand wird zu Rundenbeginn nach Farbe sortiert ausgeteilt, gezogene Karten kommen rechts dazu; umsortieren per Drag & Drop.
- Lassen sich gewählte Karten auf mehrere Arten kombinieren (z. B. drei Folgen oder drei Sätze), fragt die App nach.
- Am Rundenende zeigt „Tisch ansehen“ die Auslagen und die aufgedeckten Restkarten aller Spieler.
- **Keine Tipps:** Weder Stapel, Ablage und Teppichkarte noch passende Kombinationen werden hervorgehoben; die Ablage als Rommé-Spieler darf man immer nehmen und muss sie dann verwenden. Ob eine Karte nutzbar ist, sieht jeder selbst. Ziehen geht sofort (keine Vorwahl mehr). Alle drei „Karte nehmen“-Felder sind gleich groß (eine Karte im Hochformat); das der Teppichkarte ist unsichtbar und liegt links neben dem Stapel.
- **Vorübergehende Karten** (Ablagekarte als Rommé-Spieler, Teppichkarte, geklauter Joker) sind rot umrandet und müssen im selben Zug verwendet werden. Die Mitspieler sehen sie offen: am Desktop am Ende des Fächers (untereinander), am Handy als halbe Karte am äußeren Rand der Auslage.
- **Zug zurücksetzen** (Symbol links unten, dazu ein enttäuschter Ton): setzt den Zug auf den Anfang zurück. Eine Stapelkarte bleibt auf der Hand (verdeckte Karten gehen nie zurück), Ablage- oder Teppichkarte gehen auf ihren Platz zurück. Ist schon ausgelegt, angelegt oder geklaut worden, fragt die App erst. Eine Cheft-Ansage bleibt bestehen. Beim Laden eines Spielstands, beim Einspringen des Autopiloten und nach dem Wiederherstellen eines Raums beginnt ein angefangener Zug wieder am Rücksetzpunkt.
- Beim Anlegen mit mehreren möglichen Stellen (auch Joker klauen) zeigt die App die Kombinations-Auswahl mit dem Namen des Spielers statt der Augen.
- Der aktive Spieler steht in einem großen goldenen Pixel-Kreis (schon vor dem Start der Runde beim Startspieler) hinter dem Spielfeld (Durchmesser = (Breite + Höhe) ÷ 2 ÷ φ ÷ φ, Mitte auf der Spielfeldkante). Aktionsleiste: Cheft! | Auslegen | Anlegen | Abwerfen.
- Bots haben ein Gedächtnis (Vergesslich, Normal, Scharfsinnig, Mastermind) und eine Rolle: fünf Spielweisen (Ausgewogen, Frühvogel, Gerissener, Pärchenkönig, Glücksritter) oder die Wildcard, die jede Runde eine andere Spielweise spielt (Standard für Bots, die einen Mitspieler ersetzen). Je Kombination mindestens fünf Namen (`src/bot/rolenames.ts`). Pro Bot wählbar oder „Zufall“ (verdeckt für das ganze Spiel; gewichtet: Vergesslich 40 %, Normal 40 %, Scharfsinnig 20 %, der Mastermind nie). Jeder Bot hat dazu zufällige Vorlieben (z. B. Herzkarten, ungerade Zahlen, Glückszahl 7), die nur beim Abwerfen und nie gegen fertige Kombinationen wirken, und merkt sich im laufenden Spiel, wie die anderen spielen (je nach Gedächtnis). Am Spielende werden Gedächtnis, Rolle (bei der Wildcard die Rollen der Runden) und Vorlieben aufgedeckt. Das Gedächtnis (`src/bot/memory.ts`) bestimmt allein, wie gut ein Bot Karten behält und wahrnimmt, siehe „Bot-Gedächtnis“; die Rollen stehen in [docs/ROLLEN_V3.md](docs/ROLLEN_V3.md).
- Zurück-Geste und Zurück-Taste des Geräts (und Esc) gehen überall eine Ebene zurück: Fenster schließen, Regeln/Design Guide/Setup zum Menü bzw. zur vorherigen Seite. Im laufenden Spiel und in der Lobby erscheint vorher eine Warnung (solo bleibt der Stand gespeichert, online verlässt man den Raum). Nur im Hauptmenü verlässt „Zurück“ die App. Umgesetzt in `src/ui/nav.ts`.
- Einstellungen: Bot-Tempo, Vibration, Sounds.

## Bot-Gedächtnis

Eine Übersicht über Aufbau, Beschlüsse, Messungen und offene Punkte der Bots steht in [docs/BOTS.md](docs/BOTS.md).

Die Stufe eines Bots ist sein Gedächtnis. Sie setzt keine Spielregler, nur diese Werte (`src/bot/memory.ts`). Alles wird bei jeder Entscheidung deterministisch aus dem Spielzustand abgeleitet (Seed, Runde, Spieler, Karte, eigener Zug): derselbe Zustand ergibt immer dieselbe Wahrnehmung, auch nach einem Neustart des Servers.

| Regler | Bedeutung |
|---|---|
| Spanne | Wie viele Runden eine abgeworfene oder offen genommene Karte im Schnitt im Kopf bleibt |
| Streuung | Die Spanne schwankt je Karte (Vergesslich: von sofort vergessen bis doppelt so lang) |
| Genauigkeit | Chance, eine Karte beim Einprägen exakt abzuspeichern, sonst gleich eine Stufe verschwommener |
| Tagesform | Gute und schlechte Runden verschieben Spanne, Genauigkeit und Aufmerksamkeit |
| Tisch-Aufmerksamkeit | Chance, eine fremde Auslage in einem Zug zu übersehen; wächst mit der Zahl der ausgelegten Karten |
| Beobachtung | Chance, dass ein offenes Nehmen eines Mitspielers überhaupt registriert wird |
| Sorgfalt | Entscheidungsfehler beim Abwurf: Mit einer Wahrscheinlichkeit, die mit dem Abstand der Bewertungen schnell abfällt, nimmt der Bot auch mal die zweit- oder drittbeste Karte, nie eine deutlich schlechtere (Streuung 0 = immer die beste); ein guter Tag macht sorgfältiger |
| Handüberblick | Grundchance, eine mögliche Kombination, ein Anlegen oder Klauen mit der eigenen Hand zu übersehen; jede Kombination wird einzeln geprüft, einfache (Dreiersatz, Paar) seltener, schwierige (lange Folge, Joker, Ass, Klauen) öfter |

| Gedächtnis | Spanne | Streuung | Genauigkeit | Tagesform | Übersehen (voller Tisch) | Beobachtung | Handüberblick | Sorgfalt (Streuung) |
|---|---|---|---|---|---|---|---|---|
| Vergesslich | 3 Runden | ×0 bis ×2 | 0,75 | ±30 % | 8 % (1 bis 3 Züge) | 40 % | 20 % | 1,5 |
| Normal | 5 Runden | ×0,3 bis ×1,7 | 0,85 | ±20 % | 4 % (1 bis 2 Züge) | 70 % | 12 % | 0,9 |
| Scharfsinnig | 9 Runden | ×0,7 bis ×1,3 | 0,93 | ±10 % | 2 % (1 Zug) | 90 % | 6 % | 0,6 |
| Mastermind | unbegrenzt | keine | 1,0 | keine | 0 % | 100 % | 0 % | 0 |

Vergessen ist eine Treppe: exakt („Herz Bube“), dann eine Achse verschwommen („roter Bube“ oder „Pik-Bildkarte“), dann nur der Eindruck („schwarze Bildkarte“), dann vergessen (bei S = Spanne der einzelnen Karte nach 0,5 S, 1 S und 2,5 S). Bildkarten verwechselt man eher im Wert, Zahlkarten eher in der Farbe (Herz/Karo, Pik/Kreuz). Joker bleiben doppelt so lange im Kopf und werden nie verwechselt, eigene Abwürfe merkt man sich 1,5-mal so lange. Teppichkarte, oberste Ablagekarte und die Auslagen liegen offen und werden nicht vergessen, aber mit der Tisch-Aufmerksamkeit gelegentlich übersehen (eine Blindphase dauert höchstens 1 bis 3 eigene Züge, danach folgt immer ein aufmerksamer Zug). Bei Pflichtzügen (Joker verwenden, genommene Karte nutzen, Paar mit der Teppichkarte) wird nichts übersehen. Übersieht ein Bot eine Kombination der Erstmeldung, legt er die übrigen aus, wenn sie allein regelkonform sind (z. B. noch 51 Augen), sonst wartet er bis zum nächsten Zug.

**Gegner-Gedächtnis:** Beim Abwerfen schätzt der Bot, wie wahrscheinlich der **nächste Spieler** (nur er kann die Karte nehmen) die Karte braucht. Hinweise sind, was er offen genommen hat (er sammelt in diese Richtung, genaue Karte voll, gleicher Wert oder gleiche Farbe in Reichweite einer Folge mit 4/9), was er selbst abgeworfen hat und was er liegen ließ, obwohl er es hätte nehmen können; das zieht das Risiko wieder ab. Die Regeln bestimmen, ob er überhaupt nehmen darf: Von einem Cheft-Spieler nimmt kein Rommé-Spieler eine Karte (Risiko 0), ein Cheft-Spieler nimmt frei (1), ein Rommé-Spieler nur, wenn er sie sofort anlegen kann (0,7, wenn draußen) oder damit rauskommt (0,2). Die Hinweise verblassen wie jede Erinnerung und gehen mit Beobachtung und Spanne der Stufe ein: Der Mastermind kennt sie alle, ein Vergesslicher hat die meisten bald vergessen.

Kalibrierung: `npm run calibrate -- 480 5 balanced full` lässt alle vier Gedächtnisse am selben Tisch gegeneinander spielen (rotierende Plätze und Geber, parallel auf allen Kernen). Varianten `memory`, `perception` und `none` messen den Beitrag einzelner Regler und die Kontrolle. Zielwerte am Vierertisch (fair = 25 %): Vergesslich ≈ 20 %, Normal ≈ 24 %, Scharfsinnig ≈ 27 %, Mastermind ≈ 30 %. Gemessen (1920 Spiele, ±2 %): 17,0 / 22,0 / 28,5 / 32,6 %, Strafpunkte pro Runde 55,7 / 51,7 / 47,7 / 45,8; über 5760 Spiele gemittelt 16,7 / 22,9 / 28,3 / 32,1 %. Die Siegquote ist stark vom Kartenglück verrauscht, die Strafpunkte sind das genauere Maß; Vergleiche gelingen am besten auf denselben Spielen (gleicher Startindex). Die Sorgfalt wirkt stark: Allein Streuung 3 kostet gegen perfekte Gegner etwa 5,7 Strafpunkte pro Runde, deshalb sind Handüberblick und Tisch gegenüber der Sorgfalt-losen Fassung abgesenkt (`npm run sensitivity`).

## Bot-Strategie: Erstmeldung abwägen, hinten mutig sein

Unabhängig vom Gedächtnis wägen alle Bots ab (`src/bot/strategy.ts`), auch der Mastermind: Wer die Erstmeldung legt, setzt die Hürde für alle Nachfolger (letzte Erstmeldung + 1); wer sie verpasst, zahlt 100 Strafpunkte. Der **Ehrgeiz** (0 bis 1) ergibt sich aus der Spielweise und dem Tabellenstand: Wer hinten liegt, wagt mehr (bis +0,5 bei 100 Punkten Rückstand, im Endspurt noch +0,2); wer mit Vorsprung noch viele Runden vor sich hat, will Abstand gewinnen (+0,1), wer kurz vor Schluss führt, sichert (−0,2).

- **Erstmeldung abwägen:** Der Bot vergleicht in einem Wert, was Warten bringt, mit dem, was es kostet. Nutzen: die **Chance auf eine Hand** (alle Karten bis auf eine in Kombinationen, aus dem, was er noch weiß; bei mehr als drei Restkarten praktisch 0) und die **erwartete Verbesserung der Erstmeldung** auf dem Weg von der Hürde zum Ziel (Hürde + 10 + 40 × Ehrgeiz, also etwa 77 bis 97 Augen). Kosten: der **Zeitdruck** aus dem Stapel (0 zu Rundenbeginn, 1 kurz vor dem Ende). Ehrgeizige warten schon bei einem kleineren Wert. Er legt nie später, wenn ein Gegner schon draußen ist, die Cheft-Hürde (101) gilt, der Stapel unter 16 Karten ist, es eine Hand ist oder ein Pflichtzug, und die Geduld (1 + 5 × Ehrgeiz eigene Züge) ist begrenzt. Das gilt auch für „Ablagekarte nehmen und sofort rauskommen“.
- **Mutig, wenn man hinten liegt** (Ehrgeiz ab 0,7, also etwa 60 Punkte Rückstand): auf Hand spielen (alle Karten auf einmal) und Cheft schon mit vier statt fünf Paaren ansagen bzw. Paare für Cheft nehmen. Hinten zählt nicht die beste Durchschnittsrunde, sondern die Siegchance.
- **Gemessen** (1920 Spiele gegen Bots, die immer sofort legen): rund 50 bis 51 % Siege (±2,2), 18 bis 24 % Runden mit Cheft statt 11 bis 13 %. Reines Warten verliert dagegen: Wer immer wartet, gewinnt nur 42 bis 45 %, weil der Tempoverlust mehr kostet, als die höhere Hürde bringt. Die Abwägung wartet deshalb nur selten (rund jede zwölfte Entscheidung): Beim ersten möglichen Rauskommen ist meist schon ein Gegner draußen (54 %), oder es fehlen noch fünf bis neun Karten zur Hand; die erste Erstmeldung einer Runde liegt im Median bei 61 Augen, nur 14 % erreichen 80. Mit `npm run duel` lassen sich zwei Einstellungen am selben Tisch vergleichen; `tuning` (siehe `Tuning` in `strategy.ts`) stellt Geduld, Ziel und Schwellen ein, `boldHold` lässt einen Mutigen auch ohne Aussicht warten (als Charakterzug für Rollen gedacht).

## Mehrspieler-Server

Der Server (`server/`) hält den Spielzustand je Raum, führt die Regeln aus, spielt die Bots und
liefert zusätzlich die gebaute App aus. Die Clients sehen nur ihre eigene Hand; fremde Hände und
der Stapel werden maskiert übertragen. Verliert ein Spieler die Verbindung, kann er über
„Zurück in den Raum“ wieder einsteigen. Nach 45 Sekunden ohne Verbindung pausiert das Spiel („Max hat die Verbindung verloren“); sagen die
anderen „Weiter“, spielt ein Autopilot für ihn, bis er von selbst zurückkommt.

- **Neue Runde nur mit allen:** Nach der Rundenauswertung muss jeder Mensch „Nächste Runde“ bestätigen, nach dem Austeilen
  jeder wieder „Bereit“. Bots bestätigen von selbst, ebenso Spieler, die der Autopilot vertritt.
- **Einsteigen und übernehmen:** Wer mit dem Raumcode in ein laufendes Spiel kommt, sieht die Plätze, die ein Bot spielt, und spielt mit der aktuellen Hand weiter.
  Der Platz eines Abwesenden bleibt für ihn reserviert (Sperrzeit: 2 Minuten je verbleibender Runde, mindestens 3, höchstens 10, gerechnet ab „Weiter“
  nach der Pause) und erscheint erst danach in der Auswahl, mit dem Funksymbol (mit X) statt eines Textes. Wer von selbst zurückkommt, sitzt sofort wieder an seinem Platz.
  Wer einen Platz übernehmen will, fragt an und braucht die Zustimmung des Spielleiters (Zulassen/Ablehnen, nach einer Minute ohne Antwort läuft die Anfrage ab).
- **Spielleitung:** Der Gastgeber kann die Spielleitung bewusst und dauerhaft übergeben (Lobby und Einstellungen). Der Spielleiter sieht im Spiel die Spielerliste mit
  einem X hinter jedem Menschen (nicht hinter sich selbst, und nicht hinter dem Gastgeber, solange der nur vertreten wird) und im Pausenmenü bei den Abwesenden.
  Wer entfernt wird, verliert alle Raumdaten und gilt als Unbekannter; sein Platz wird ein Bot „Botname (Max)“ mit derselben Hand, den ein Neuer (mit Zustimmung) sofort übernehmen kann.
  Ist der Gastgeber weg, leitet ihn der am längsten anwesende verbundene Mensch (nie ein Bot) vorübergehend; kommt der Gastgeber zurück,
  leitet er sofort wieder. Plätze haben feste Kennungen, die Rolle bleibt also auch beim Entfernen und Umsortieren erhalten.
- **Raum neu eröffnen:** Gibt es einen Raum (z. B. `/232`) nicht mehr, bietet die App an, ihn mit demselben Code neu zu eröffnen; man wird Gastgeber.
  So bleibt ein alter Familienraum beim gleichen Link. Direkt nach dem Aufwachen des Servers wartet die App zuerst kurz (45 s), weil Mitspieler
  ein laufendes Spiel wiederherstellen könnten.
- **Lobby-Karenz:** Bricht in der Lobby die Verbindung ab (z. B. kurzer Wechsel in eine andere App), bleibt der Sitz 3 Minuten reserviert.
  „Raum verlassen“ gibt ihn sofort frei. Danach geht die Gastgeber-Rolle dauerhaft an den nächsten Menschen.
- **Verbindungsprüfung:** Der Server prüft alle 10 Sekunden; nach zwei verpassten Antworten gilt eine stille Verbindung als getrennt.
- **Pause:** Im Zahnrad-Menü lässt sich das Spiel anhalten, und es pausiert von selbst, wenn jemand länger als 45 Sekunden die Verbindung verliert (kurze Aussetzer
  bleiben unsichtbar, das Funksymbol am Namen erscheint nach 10 Sekunden). Es geht weiter, wenn alle verbundenen Spieler „Weiter“ getippt haben;
  der Spielleiter hat zusätzlich „Für alle fortsetzen“. Kommt der Abwesende vorher zurück, geht es ohne Bestätigung weiter. Währenddessen spielt niemand für Abwesende,
  danach der Autopilot, aber ohne weitere Pause für dieselbe Abwesenheit. Nach der letzten Runde gibt es keine Pause mehr.
- **Server schläft ein:** Der Server schickt jedem Spieler eine verschlüsselte Kopie des Raums mit (Schlüssel `CHEFT_SECRET`,
  auf Render automatisch erzeugt). Schläft ein kostenloser Server nach einer langen Pause ein, stellt die erste Wiederverbindung den Raum
  mit gleichem Code und gleichen Plätzen wieder her. Dann braucht der Server etwa eine Minute zum Aufwachen.
  Wiederhergestellt werden nur laufende Spiele (nicht Lobbys, nicht die Endauswertung nach der letzten Runde), und nur bis 72 Stunden nach dem
  letzten Spielzug; danach gibt es ein frisches Spiel ohne Historie. Ein laufendes Spiel hat Vorrang vor einem inzwischen frisch eröffneten
  Raum, in dem noch nicht gespielt wird: Dessen Besucher bekommen die Platzauswahl.
- **Sitzordnung und Start:** Der Gastgeber zieht die Spieler in der Lobby per Griff in die gewünschte Reihenfolge oder stellt „Sitzplätze: zufällig“ ein (auch im Solospiel). Wer die erste Runde beginnt, wird immer ausgelost. Der Einlader wählt 3, 5, 7 oder 9 Runden.
- **Spielende:** Nach der letzten Runde muss jeder Mensch die Endauswertung bestätigen, erst dann geht es für alle zurück in die Lobby.
- **Rückblick auf Abwürfe (nicht regelkonform, abschaltbar):** Wer an der Reihe ist, kann lange auf die Ablage drücken und sieht die letzten Abwürfe der anderen (zu viert drei, zu dritt zwei). Die Karten gleiten in Richtung des Spielers, der sie abgeworfen hat, und tragen seinen Namen. Die Ansicht bleibt nach dem Loslassen stehen, ein Tippen irgendwo beendet sie. Gastgeber und Solospieler stellen vor dem Start ein, ob das erlaubt ist.
- **Bildschirm anlassen:** Im Zahnrad-Menü (Standard: an) hält die App den Bildschirm während des Spiels wach, sofern der Browser das
  unterstützt. Ein gesperrtes Handy trennt die Verbindung; die 45 Sekunden laufen ab dem Moment der Trennung.
- **Vorwärmen:** Beim Start der App wird ein schlafender Server im Hintergrund geweckt, wenn er auf einer anderen Adresse liegt.

```bash
npm run build && npm run server   # http://localhost:8080 (App + WebSocket unter /ws)
```

Betrieb im Internet: Das Repo enthält ein `Dockerfile` und eine `render.yaml`. Auf Render.com
genügt „New → Blueprint“ mit diesem Repo; der kostenlose Plan reicht zum Testen (er schläft nach
15 Minuten ohne Verkehr ein und braucht beim ersten Aufruf etwa eine Minute; offene Spiele bleiben dank Kopie erhalten). Der Server
liefert die App selbst aus, App und Mehrspieler laufen unter derselben Adresse. Wird die App ausnahmsweise auf einer anderen Adresse
gehostet, lässt sich die Server-Adresse beim Bauen als `VITE_SERVER_URL` oder in der App unter „Server-Adresse“ eintragen.

**Eigene Domain (z. B. https://cheft.beigi.eu):** Im Render-Dienst unter Settings, Custom Domains die Domain eintragen und beim DNS-Anbieter einen
CNAME-Eintrag auf die `onrender.com`-Adresse des Dienstes setzen. Der Docker-Build lädt die Dateien absolut ab `/` (Umgebungsvariable `CHEFT_BASE=/`),
dadurch öffnen Raumlinks wie `https://cheft.beigi.eu/232` den Raum direkt. Jeder Push auf `main` wird von Render automatisch neu gebaut und veröffentlicht.

## Aufbau

```
src/engine/   Regeln und Spielzustand (ohne DOM, wiederverwendbar für den Server)
  cards.ts      Karten, Werte, Mischen
  melds.ts      Folgen, Sätze, Cheft-Paare, Joker, Partitionssuche
  game.ts       Spielablauf, Prüfungen, Wertung
  actions.ts    Einheitliche Aktionen (Oberfläche, Bots, später Netzwerk)
src/bot/      Computergegner (Profile, Namen)
src/net/      WebSocket-Client
src/engine/view.ts  Spieler-Sicht mit maskierten Karten
server/       Mehrspieler-Server (Räume, Protokoll, Bots)
src/i18n/     Texte (de.ts; weitere Sprachen als eigene Datei mit gleichen Schlüsseln)
src/ui/       Oberfläche
  tokens.ts     Design-Tokens: Farben, Schriften, Abstände, Maße, Ebenen, Zeiten (einzige Quelle, nummeriert)
  styles.css    Stile, nur mit Variablen aus tokens.ts (ein Test prüft das)
  components.ts Gemeinsame Bausteine: Buttons, „Zurück“, Fenster, Toast, Sitz-Beschriftung, Kombination
  icons.ts      Pixel-Piktogramme
  sprites.ts    Sprite-Atlas (Pixelkarten per Canvas)
  sound.ts      Töne und Vibration samt Katalog
  guide.ts      Design Guide (Menü → „Design Guide“)
  app.ts        Menü, Spielfeld, Dialoge, Einstellungen
scripts/      Icon-Generator (liest die Farben aus tokens.ts)
```

## Design Guide und Design-Tokens

Im Menü zwischen „Regeln“ und „Einstellungen“ liegt der **Design Guide**. Er zeigt alle Elemente der App mit fester
Nummer (Kapitel.Zähler, z. B. `4.02` = Button Primär): Farben, Schriften, Abstände, Buttons, alle Karten und Grafiken,
Spielfeld-Elemente, Fenster, Seiten, Töne und Vibrationen, dazu die Navigationslogik und eine Liste, welcher Abstand wo
wirkt. Die Werte unter jedem Muster sind live aus dem echten Element gelesen. Mit „Nummern im Spiel“ erscheinen die
Nummern als kleine gelbe Punkte an den Elementen (Antippen zeigt und kopiert die Nummer), damit man bei Änderungen sofort sagen kann, welches Element gemeint ist.

- **Ändern:** Alles Gestalterische steht in `src/ui/tokens.ts`. Eine Palettenfarbe ändern (`1.xx`) färbt alle Rollen, die
  auf sie zeigen; eine Rolle (`1.4x`–`1.7x`) umhängen ändert alle Stellen, an denen sie benutzt wird. Abstände sind Stufen
  der Skala `3.11`–`3.18` (1 u = 1 Pixel × Maßstab), Rollen `3.21`–`3.37` geben ihnen Bedeutung. `styles.css` enthält
  keine festen Werte; `npm test` schlägt fehl, wenn dort wieder eine Farbe oder ein Pixelmaß auftaucht.
- **Neues Element:** Baustein in `components.ts` (oder Klasse in `styles.css`) anlegen und in `guide.ts` unter `chapters()`
  mit neuer Nummer eintragen; mit `sel` findet es auch die Nummern-Punkte.
- **Zurück:** Es gibt genau einen Weg, ein Fenster oder eine Seite zu verlassen: `App.back()`. Der Knopf „Zurück“
  (`backBtn`), ein Tipp neben ein Anzeige-Fenster und die Esc-Taste rufen sie auf. „Abbrechen“ verwirft eine offene Entscheidung.

## Umgesetzte Regeln (Regelwerk V6 + Vereinbarungen)

- Spielrichtung gegen den Uhrzeigersinn.
- Rauskommen im ersten Zug: vor jedem Spiel wählbar (Standard: gesperrt). Wer die erste Runde beginnt, wird ausgelost. Runden: 3, 5, 7 oder 9.
- Joker als Teppichkarte: Der Startspieler bekommt den Joker (ersetzt eine seiner 14 Karten), die nächste Karte wird Teppichkarte.
- Abwurf-Sperre nur gegenüber dem nächsten Spieler, wenn dieser draußen ist: Verboten ist jede Karte, die er anlegen oder mit der er einen ausgelegten Joker klauen könnte. Wäre jede Handkarte betroffen, darf trotzdem abgeworfen werden (sonst Sackgasse).
- Ablage: Ein Rommé-Spieler, der noch drin ist, darf die Karte nur nehmen, wenn er damit sofort rauskommt. Wer schon draußen ist, darf sie nehmen, wenn er sie sofort anlegen, auslegen oder damit einen Joker klauen kann (es muss eine Karte zum Abwerfen bleiben). Nie, wenn ein Cheft-Spieler sie abgeworfen hat. Ein Cheft-Spieler darf sie immer nehmen. Als Mensch darf man die Ablagekarte als Rommé-Spieler immer nehmen (außer gesperrt, siehe oben) und muss sie in diesem Zug verwenden (Erstmeldung, anlegen, auslegen, Joker klauen), sonst setzt man den Zug zurück; die Bots nehmen sie nur, wenn es sofort geht. „Cheft!“ nach dem Nehmen ist erlaubt: Dann ist die Karte eine normale Handkarte. Die Cheft-Ansage lässt sich nie zurücknehmen.
- Cheft-Paare: Joker + Karte und Joker + Joker sind Paare. Joker dürfen auch aus Cheft-Paaren geklaut werden, nicht aus Joker-Joker-Paaren.
- Die Teppichkarte ist die einzige Ausnahme: Sie bildet ihr Paar nur mit der genau gleichen Karte, nie mit einem Joker. Beim Nehmen müssen außerdem die übrigen Karten noch vier weitere Paare ergeben (hier dürfen Joker einspringen). Wer noch Rommé spielt und die Teppichkarte antippt (er hat Zwilling und vier Paare), bekommt „Cheft ansagen?“; nur mit „Cheft ansagen“ wird sie genommen. Ein Cheft-Spieler, der schon fünf Paare ausgelegt hat, darf sie nur nehmen, wenn er genau vier Handkarten hat: den Zwilling (kein Joker) und ein weiteres Paar (Joker erlaubt, vierte Karte zum Abwerfen); beide Paare müssen in diesem Zug auf einmal liegen. Ein Rommé-Spieler, der schon draußen ist, darf sie nie nehmen. Nur im letzten Zug bei leerem Stapel zählt sie wie eine normale Stapelkarte.
- Nach 5 Paaren: Die restlichen Karten als 2 Paare auf einmal (= 7) oder als Rommé-Kombinationen/Anlegen. Ein einzelnes 6. Paar ist nicht erlaubt.
- Stapel leer: Der Spieler, der die letzte Karte zieht, beendet seinen Zug normal. Liegt nur noch die Teppichkarte da, darf der nächste Spieler sie wie eine Stapelkarte nehmen (ohne Paar, ohne Cheft, ohne Zwang zum Rauskommen); nach seinem Zug endet die Runde ohne Gewinner. Ohne Teppichkarte endet sie sofort.
- Weitere Kombinationen im Zug des Rauskommens zählen zur Erstmeldung, solange dazwischen nicht bei anderen angelegt wurde.
- Strafpunkte und Verdopplungen wie im Regelwerk (Extrembeispiel 1.600 ist als Test hinterlegt).
