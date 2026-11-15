# Cheft – Das Familienkartenspiel

Cheft als Web-App im Pixel-Look (angelehnt an Windows-3.1-Solitaire, Farbwelt im Cheft-Orange).
Läuft im Browser auf Android, iOS und PC und lässt sich als PWA auf den Homescreen legen.

Solo gegen 2–3 Computergegner (offline) oder online mit Freunden: Raum eröffnen, 4-stelligen Code
weitergeben, leere Plätze mit Bots auffüllen. Während eines laufenden Spiels kann niemand einsteigen.

## Starten

```bash
npm install
npm run dev        # Entwicklung: http://localhost:5173
npm test           # Regel-Tests (Vitest)
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
```

Für die Installation am Handy muss die App über HTTPS erreichbar sein. Der Workflow
`.github/workflows/pages.yml` veröffentlicht jeden Push auf `main` automatisch auf GitHub Pages:
https://tobiasfmueller.github.io/cheft/ . Dort im Handy-Browser öffnen und
„Zum Startbildschirm hinzufügen“ wählen.

## Bedienung und Speichern

- Karten in der Hand per Drag & Drop sortieren, auf die Ablage ziehen (abwerfen), auf eine Kombination ziehen (anlegen oder Joker klauen) oder markiert in die eigene Auslage ziehen (auslegen). Alles geht auch per Antippen und Knopf.
- Die gezogene Karte erscheint rechts in der Hand und ist grün markiert.
- Gegner sitzen links, oben und rechts; ihre Auslagen liegen aus ihrer Blickrichtung. Am PC sind zusätzlich ihre verdeckten Handkarten zu sehen.
- Der Spielstand wird nach jedem Zug im Browserspeicher des Geräts gesichert (localStorage, ohne Login). „Weiterspielen“ im Menü nimmt ihn wieder auf. Über das Zahnrad lässt sich ein Spielstand-Code kopieren, der im Menü eines anderen Geräts eingefügt werden kann.
- Die Hand wird zu Rundenbeginn nach Farbe sortiert ausgeteilt, gezogene Karten kommen rechts dazu; umsortieren per Drag & Drop.
- Lassen sich gewählte Karten auf mehrere Arten kombinieren (z. B. drei Folgen oder drei Sätze), fragt die App nach.
- Am Rundenende zeigt „Tisch ansehen“ die Auslagen und die aufgedeckten Restkarten aller Spieler.
- Eine genommene Ablage- oder Teppichkarte ist orange markiert und lässt sich zurücklegen, solange nichts ausgelegt wurde.
- Bots haben Rollen aus Stufe (Gemütlich, Normal, Gerissen) und Spielweise (Ausgewogen, Sprinter, Cheft-Fan, Handmacher, Blocker, Zähler, Jokerjäger, Zocker), je Rolle drei Namen (`src/bot/names.ts`). Pro Gegner wählbar oder „Überraschung“; Rollen werden am Spielende aufgedeckt.
- Einstellungen: Bot-Tempo, Vibration, Sounds.

## Mehrspieler-Server

Der Server (`server/`) hält den Spielzustand je Raum, führt die Regeln aus, spielt die Bots und
liefert zusätzlich die gebaute App aus. Die Clients sehen nur ihre eigene Hand; fremde Hände und
der Nachziehstapel werden maskiert übertragen. Verliert ein Spieler die Verbindung, kann er über
„Zurück in den Raum“ wieder einsteigen; nach 45 Sekunden ohne Verbindung spielt ein Bot für ihn weiter.

```bash
npm run build && npm run server   # http://localhost:8080 (App + WebSocket unter /ws)
```

Betrieb im Internet: Das Repo enthält ein `Dockerfile` und eine `render.yaml`. Auf Render.com
genügt „New → Blueprint“ mit diesem Repo; der kostenlose Plan reicht zum Testen (er schläft nach
15 Minuten ohne Besuch ein und braucht beim ersten Aufruf etwa eine Minute). Die App auf GitHub
Pages verbindet sich mit dem Server, dessen Adresse als Repository-Variable `CHEFT_SERVER_URL`
(z. B. `wss://cheft.onrender.com/ws`) hinterlegt oder in der App unter „Server-Adresse“ eingetragen wird.
Läuft die App direkt vom Server (eigene Domain), ist keine Einstellung nötig.

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
src/ui/       Oberfläche: Sprite-Atlas (Pixelkarten per Canvas), Spielfeld, Menü, Regeln
scripts/      Icon-Generator
```

## Umgesetzte Regeln (Regelwerk V6 + Vereinbarungen)

- Spielrichtung gegen den Uhrzeigersinn.
- Rauskommen im ersten Zug: vor jedem Spiel wählbar (Standard: erlaubt).
- Joker als Teppichkarte: Der Startspieler bekommt den Joker (ersetzt eine seiner 14 Karten), die nächste Karte wird Teppichkarte.
- Abwurf-Sperre nur gegenüber dem nächsten Spieler, wenn dieser draußen ist. Wäre jede Handkarte anlegbar, darf trotzdem abgeworfen werden (sonst Sackgasse).
- Ablagestapel: Ein Rommé-Spieler darf die Karte nur nehmen, wenn er damit sofort rauskommt, und nie, wenn ein Cheft-Spieler sie abgeworfen hat. Ein Cheft-Spieler darf sie immer nehmen. Wer die Teppichkarte nimmt, wird dadurch Cheft-Spieler.
- Cheft-Paare: Joker + Karte und Joker + Joker sind Paare. Joker dürfen auch aus Cheft-Paaren geklaut werden, nicht aus Joker-Joker-Paaren.
- Nach 5 Paaren: Die restlichen Karten als 2 Paare auf einmal (= 7) oder als Rommé-Kombinationen/Anlegen. Ein einzelnes 6. Paar ist nicht erlaubt.
- Nachziehstapel leer: Der Spieler, der die letzte Karte zieht, beendet seinen Zug normal; danach endet die Runde ohne Gewinner.
- Weitere Kombinationen im Zug des Rauskommens zählen zur Erstmeldung, solange dazwischen nicht bei anderen angelegt wurde.
- Strafpunkte und Verdopplungen wie im Regelwerk (Extrembeispiel 1.600 ist als Test hinterlegt).
