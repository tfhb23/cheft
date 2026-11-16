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
- Eine genommene Ablage- oder Teppichkarte ist orange markiert und lässt sich zurücklegen, solange nichts ausgelegt wurde.
- Bots haben Rollen aus Stufe (Gemütlich, Normal, Gerissen, Mastermind) und Spielweise (Ausgewogen, Sprinter, Cheft-Fan, Handmacher, Blocker, Zähler, Jokerjäger, Zocker), je Rolle drei Namen (`src/bot/names.ts`). Pro Bot wählbar oder „Zufall“; Rollen werden am Spielende aufgedeckt.
- Einstellungen: Bot-Tempo, Vibration, Sounds.

## Mehrspieler-Server

Der Server (`server/`) hält den Spielzustand je Raum, führt die Regeln aus, spielt die Bots und
liefert zusätzlich die gebaute App aus. Die Clients sehen nur ihre eigene Hand; fremde Hände und
der Stapel werden maskiert übertragen. Verliert ein Spieler die Verbindung, kann er über
„Zurück in den Raum“ wieder einsteigen; nach 45 Sekunden ohne Verbindung spielt ein Bot für ihn weiter.

- **Neue Runde nur mit allen:** Nach der Rundenauswertung muss jeder Mensch „Nächste Runde“ bestätigen, nach dem Austeilen
  jeder wieder „Bereit“. Bots bestätigen von selbst, ebenso Spieler, die länger als 45 Sekunden weg sind.
- **Einsteigen und übernehmen:** Wer mit dem Raumcode in ein laufendes Spiel kommt, sieht die Plätze, die ein Bot spielt oder
  deren Spieler länger als 45 Sekunden weg ist, und spielt mit der aktuellen Hand weiter. Das gilt für alle, auch für den Gastgeber.
  Ist der Gastgeber weg, übernimmt der nächste verbundene Spieler die Gastgeber-Rechte, bis er zurück ist.
- **Pause:** Im Zahnrad-Menü lässt sich das Spiel anhalten. Es geht erst weiter, wenn alle verbundenen Spieler auf „Weiter“ getippt haben. Sind alle Menschen getrennt, pausiert das Spiel
  von selbst (auch die Endauswertung) und läuft weiter, sobald alle wieder verbunden sind. Währenddessen spielen keine Bots für Abwesende.
- **Server schläft ein:** Der Server schickt jedem Spieler eine verschlüsselte Kopie des Raums mit (Schlüssel `CHEFT_SECRET`,
  auf Render automatisch erzeugt). Schläft ein kostenloser Server nach einer langen Pause ein, stellt die erste Wiederverbindung den Raum
  mit gleichem Code und gleichen Plätzen wieder her. Dann braucht der Server etwa eine Minute zum Aufwachen.
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
- Ablage: Ein Rommé-Spieler, der noch drin ist, darf die Karte nur nehmen, wenn er damit sofort rauskommt. Wer schon draußen ist, darf sie nehmen, wenn er sie sofort anlegen, auslegen oder damit einen Joker klauen kann (es muss eine Karte zum Abwerfen bleiben). Nie, wenn ein Cheft-Spieler sie abgeworfen hat. Ein Cheft-Spieler darf sie immer nehmen. Wer die Teppichkarte nimmt, wird dadurch Cheft-Spieler.
- Cheft-Paare: Joker + Karte und Joker + Joker sind Paare. Joker dürfen auch aus Cheft-Paaren geklaut werden, nicht aus Joker-Joker-Paaren.
- Nach 5 Paaren: Die restlichen Karten als 2 Paare auf einmal (= 7) oder als Rommé-Kombinationen/Anlegen. Ein einzelnes 6. Paar ist nicht erlaubt.
- Stapel leer: Der Spieler, der die letzte Karte zieht, beendet seinen Zug normal. Liegt nur noch die Teppichkarte da, darf der nächste Spieler sie wie eine Stapelkarte nehmen (ohne Paar, ohne Cheft, ohne Zwang zum Rauskommen); nach seinem Zug endet die Runde ohne Gewinner. Ohne Teppichkarte endet sie sofort.
- Weitere Kombinationen im Zug des Rauskommens zählen zur Erstmeldung, solange dazwischen nicht bei anderen angelegt wurde.
- Strafpunkte und Verdopplungen wie im Regelwerk (Extrembeispiel 1.600 ist als Test hinterlegt).
