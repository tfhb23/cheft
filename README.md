# Cheft – Das Familienkartenspiel

Cheft als Web-App im Pixel-Look (angelehnt an Windows-3.1-Solitaire, Farbwelt im Cheft-Orange).
Läuft im Browser auf Android, iOS und PC und lässt sich als PWA auf den Homescreen legen.

**Phase 1 (dieser Stand):** Solo gegen 2–3 Computergegner, komplett offline.
**Phase 2 (geplant):** Online-Mehrspieler mit Raumcode, bis zu 4 Spieler, Bots füllen leere Plätze.

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
- Beim Start wählbar: Handkarten selbst sortieren (Drag & Drop) oder automatisch nach Farbe einsortieren.
- Lassen sich gewählte Karten auf mehrere Arten kombinieren (z. B. drei Folgen oder drei Sätze), fragt die App nach.
- Am Rundenende zeigt „Tisch ansehen“ die Auslagen und die aufgedeckten Restkarten aller Spieler.
- Einstellungen: Bot-Tempo, Vibration, Sounds.

## Aufbau

```
src/engine/   Regeln und Spielzustand (ohne DOM, wiederverwendbar für den Server)
  cards.ts      Karten, Werte, Mischen
  melds.ts      Folgen, Sätze, Cheft-Paare, Joker, Partitionssuche
  game.ts       Spielablauf, Prüfungen, Wertung
  actions.ts    Einheitliche Aktionen (Oberfläche, Bots, später Netzwerk)
src/bot/      Computergegner
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
- Strafpunkte und Verdopplungen wie im Regelwerk (Extrembeispiel 1.600 ist als Test hinterlegt).
