# Cheats (nur Solo)

Spaß- und Test-Cheats für das Spiel gegen Bots. Sie werden über **Spielstand-Code einfügen** eingegeben; statt eines
Spielstands steht dort Cheat-Text. Danach öffnet sich "Neues Spiel", und der Cheat gilt **nur für dieses eine Spiel**.

Die Namen in `src/engine/cheatnames.ts` (und die Meldungen dort) sind Platzhalter. Alles Weitere benutzt nur die Cheat-IDs.

## Eingabe

- Cheat-Wörter in beliebiger Reihenfolge, Groß/Klein egal, Leerzeichen im Namen egal (`BIG DADDY` = `bigdaddy`). Trennzeichen
  zwischen Cheats sind nicht nötig (Leerzeichen, Komma, Semikolon gehen).
- Parameter direkt hinter dem Wort: eine Zahl (`RUNDEN 12`, `JOKER 2`) oder ein Rollenname (`AUTOPLAY FRUEHVOGEL`).
  Fehlt der Parameter, gilt der Standard (Joker 1, Autoplay Wildcard).
- `ERSTMELDUNG 21` setzt die Grenze ohne Cheft auf 21, mit Cheft auf 2·21−1 = 41. Zwei Zahlen (`ERSTMELDUNG 21 60`) setzen beide.
- Unbekanntes Wort: Der ganze Code wird abgelehnt (mit dem Wort in der Meldung). Ein Tippfehler aktiviert nichts halb.
- **Wunschhand** `HAND( … )`: Runden durch `/` getrennt, leer = Zufallsrunde, weitere Runden werden abgeschnitten, fehlende
  Karten zufällig aufgefüllt. Ohne Klammer läuft die Hand bis zum Ende des Textes. Karten: Farbe `He` `Ka` `Kr` `Pi` plus
  `A` `2`–`10` `B` `D` `K`; `J` oder `JOKER` ist der Joker. Eine Zeile darf eine **Testhand** enthalten (`PAARE`, `FUENFPAARE`,
  `HANDRUMMEL`, `FASTFERTIG`), zusätzliche Karten ersetzen sie von hinten.
  `HANDRUMMEL`: 14 Karten, die ohne Rest in Kombinationen aufgehen (Hand machen). `FASTFERTIG`: 13 Karten in fertigen Kombinationen mit
  mindestens 51 Augen plus eine Füllkarte (auslegen, in zwei Zügen fertig).

Beispiel: `autoplay zeitreise runden 12 joker 2 hand( HeD KrB PiA Ka3 J He9 Kr10 / / paare )`

## Cheats

| Cheat | Wirkung |
|---|---|
| Joker | Mindestens N Joker (1–14) auf der Hand, jede Runde. Ersetzt nur zufällige Füller. |
| Hand | Wunschhand je Runde, siehe oben. |
| Runden | 1–999 Runden (nur im Spielstand, nie in den Einstellungen). |
| Ausgelegt | Start mit ausgelegter Folge samt Joker; die vertretene Karte liegt auf der Hand (Joker klauen testen). |
| Teppich | Die Teppichkarte ist die zweite Kopie einer Handkarte. |
| Autoplay | Play/Pause und Einzelschritt rechts unten. Ein Mastermind-Bot der gewählten Rolle spielt für mich. Runden laufen von selbst weiter, an der Spielende-Übersicht hält er an. Eigenes Spielen pausiert ihn. |
| Zeitreise | Knopf links unten: mitten im Zug zurück an dessen Anfang (macht auch eine Cheft-Ansage rückgängig), sonst zum Beginn des vorigen Zuges, auch über Rundengrenzen. Gemerkt werden höchstens 120 Zuganfänge. |
| Erstmeldung | Eigene Mindestaugen für die Erstmeldung. "Die vorherige Erstmeldung übertreffen" gilt weiter. |
| Doppelt / Dreifach / Vierfach | Jede Karte 4, 6 oder 8 Kopien statt 2 (also ×2, ×3, ×4), Joker ebenso viele (4, 6, 8). Mehrere Faktoren: der zuerst genannte zählt. |
| Jokerparty | Genau N Joker im Deck (0–60, ohne Zahl 8). Überstimmt die Joker des Faktors; `JOKERPARTY 0` ist ein Spiel ohne Joker. |
| Superfast | Die Bots (und Autoplay) spielen mit maximalem Tempo: keine Pausen, Animationen und Töne, gezeichnet und gespeichert wird nur ab und zu. Zusammen mit Autoplay und vielen Runden zum schnellen Durchspielen (12 Runden dauern etwa 10 Sekunden). |
| Mini | Skatblatt: nur 7, 8, 9, 10, Bube, Dame, König, Ass (64 Karten plus Joker). Kein Ass-2-3, Folgen gehen nur bis Dame-König-Ass. |

Die Deck-Cheats sind miteinander kombinierbar (z. B. `VIERFACH MINI JOKERPARTY 12`). Sie ändern nur, welche Karten es gibt;
alles andere (Wunschhand, Teppich, Ausgelegt, Joker) nimmt seine Karten weiterhin aus diesem Deck. Gibt es eine Wunschkarte nicht
(Mini-Deck ohne 2, dritte Kopie im Standarddeck), wird sie zufällig ersetzt. Joker-Cheat und `AUSGELEGT` gehen ohne Joker im Deck leer aus,
jeweils mit Hinweis.

## Rangfolge beim Austeilen

Wer höher steht, bekommt seine Karten zuerst; was nicht mehr geht, wird zufällig ersetzt oder entfällt (mit Hinweis beim
Rundenstart): 1. Wunschhand und Testhand, 2. Ausgelegt, 3. Teppich, 4. Joker, 5. Rest der Hand, Gegner und Stapel zufällig.

## Bot-Tempo

Das frühere Bot-Tempo ist aus den Einstellungen entfernt (solo und online): Bots spielen immer im normalen Tempo. Schneller geht es nur mit dem
Cheat Superfast. Alte gespeicherte Einstellungen und Raum-Kopien werden beim Laden bereinigt.

## Deck technisch

`DeckConfig` (Kopien, Joker, Werte) in `engine/cards.ts`, aus den Cheats gebildet von `deckConfigOf` (`engine/cheats.ts`). Ohne Cheats ist es das
Standarddeck. Die Karten-Id ist Blatt × 52 + Farbe × 13 + (Wert − 1), Joker folgen ab 52 × Kopien; für das Standarddeck sind das die bisherigen
Ids. Rücken und Bildkarten richten sich nach dem geraden/ungeraden Blatt (`deckParity`). Die Bots lesen die Kopienzahl aus dem Spiel
(Gedächtnis `bot/memory.ts`, Rundenfortschritt `bot/strategy.ts`, Zähler `bot/bot.ts`).

Mit vielen Jokern tritt ein Fall auf, der mit zwei Jokern fast nie vorkommt: Ein Satz aus einer echten Karte und Jokern (Ass, Joker, Joker) wird von
der Engine als Folge A-2-3 gelesen, wenn die Kartenreihenfolge zufällig eine Folge ergibt. Die Bots legen Sätze deshalb in einer Reihenfolge aus,
die keine Folge ergibt (`groupsOf` in `bot/bot.ts`). Als Notausgang gibt es `bot/fallback.ts`: Lehnt die Engine einen Bot-Zug ab (sollte nie passieren),
spielt die App den einfachsten erlaubten Zug, statt stehen zu bleiben.

## Regeln, die immer gelten

- Karten werden nie erzeugt, nur aus dem gemischten Deck genommen: Es sind immer genau 106 Karten im Spiel (Test in `cheats.test.ts`).
- Gegner und Stapel bleiben zufällig; derselbe Code ergibt in jedem Spiel andere Verteilungen.
- Ist die Teppichkarte ein Joker und der Cheat-Spieler beginnt mit 14 festgelegten Karten, geht der Joker zurück in den Stapel
  (neu gemischt) und es wird eine neue Teppichkarte gezogen.
- Die Cheats liegen in `GameState.cheats`, nie in den Einstellungen. Mehrspieler kennt sie nicht: Der Server erzeugt keine, entfernt sie
  aus jeder geladenen Raum-Kopie, und die Spieler-Sicht enthält sie nie. Im Spiel zeigt eine orange Wunschlampe neben der Rundenzahl, dass Cheats aktiv sind; bei dreistelliger Rundenzahl (kein Platz) steht sie stattdessen in der Punkteübersicht (Symbol links oben). Am Spielende steht ein Vermerk.

## Todo (später)

- **Anzeige-Cheats:** monochrom, invertiert, Game-Boy-Grün, CGA, Bernstein, Scanlines. Nur einer gleichzeitig, der zuerst genannte zählt.
- **Tipp-Knopf**, rollenbasiert (Rolle als Parameter): zeigt den klügsten Zug sichtbar (Ziehstelle pulsiert, Karten hervorgehoben, Textzeile). Erst nach dem Design Guide.
- **Namen und Meldungen** der Cheats vergeben (klassische Cheat-Codes der frühen Konsolen- und PC-Zeit).
