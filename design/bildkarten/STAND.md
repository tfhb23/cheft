# Bildkarten (Bube, Dame, König): Arbeitsstand und Übergabe

Stand: Übergabe aus dem ersten Design-Chat in einen neuen Chat. Alles Wichtige steht hier und in `code/`, die Bilder in `images/`.

## 0. Regeln für die Weiterarbeit (bitte zuerst lesen)

- **Nichts live veröffentlichen.** Kein Merge nach `main`, kein Pull Request, kein Deploy. In einem anderen Chat wird gerade an der **Bot-Logik** gearbeitet (`src/bot/*`, `docs/BOTS.md`). Diese Dateien nicht anfassen.
- Speichern ist erlaubt: Commits und Push **nur auf den eigenen Entwicklungsbranch** der Sitzung (nicht auf `main`).
- Die App (`src/ui/sprites.ts`, `guide.ts`) wird für die Bildkarten **noch nicht umgebaut**. Bis jetzt entstehen nur Entwürfe und Renderings. Die Integration ins Spiel ist ein späterer Schritt (siehe 6).
- Entwürfe ändern nur, wenn es ausdrücklich verlangt ist. Ein Beispiel für Ärger: Der Vogel (Falke) wurde einmal ungefragt neu gezeichnet. Der Nutzer wollte nur eine andere Position. Die freigegebene Zeichnung `OLD_FALKE` bleibt unverändert.
- Der Nutzer ist Modedesigner, gibt sehr genaues Pixel-Feedback („ein Kästchen nach rechts“, „eine Zeile höher“) und will **zu jeder Idee mehrere Visualisierungen** zum Auswählen. Bilder immer als PNG schicken, nummerierte Varianten (A, B, C), kurze ehrliche Einschätzung dazu. Antworten auf Deutsch.

## 1. Das Projekt

Cheft ist ein Kartenspiel (Pixel-Web-App). Es gibt **zwei Decks**: Jede Karte existiert doppelt. Die Bildkarten sollen deshalb **pro Deck unterschiedliche Personen** zeigen, die aufeinander aufbauen (ähnliche Farben und Ausdrücke), aber nicht identisch sind („Zwillinge“). Es gibt 12 Bildkarten: Herz, Karo, Kreuz, Pik, jeweils Bube, Dame, König. Das sind 24 Personen. Kleidungsdetails kommen später.

Familien-Themen:
- **Herz** (die Guten): persische Dichtkunst, Liebe (Rot, Gold, Weiß, Braun, nicht zu bunt).
- **Karo**: Orient, Schätze, Gold (blondes Haar, goldene Elemente). Bube mit rotem Fez.
- **Kreuz**: klassische Königsfamilie (Schwarz, Gold, Weiß, braunes Haar). Der Kreuz König trägt als einziger König eine Krone.
- **Pik** (die Bösen): weiße Haare, Brille/Monokel/Zylinder, blasse Haut, schwarz.

## 2. Stand der Karten (12 Karten × 2 Personen)

Rendering aller aktuellen Personen: `images/render_aktuell/` (je `…_1x.png` und `…_10x.png`) und `images/render_aktuell/zwischenuebersicht.png`. Neu erzeugen mit `python3 design/bildkarten/code/final_auswahl.py`.

| Karte | Person 1 | Person 2 |
|---|---|---|
| Herz Bube | `herz_bube_a` Turbanform, Gold, Mond, ohne Feder | `herz_bube_b` kleiner Turban mit steiler Feder (feder_s4) |
| Herz Dame | `herz_dame_a` Schleier Rc, Mond und Sterne, schmaler Mund | `herz_dame_b` Goldkamm (gedreht, Spalte 8), schmale Lippen |
| Herz König | `herz_koenig` Master (Moghul-Turban, Feder, grauer Bart) | **fehlt** |
| Karo Bube | `karo_bube` Master (roter Fez, Quaste) | **fehlt** |
| Karo Dame | `karo_dame` Master (Juwelenkönigin, Diamant-Diadem) | **fehlt** |
| Karo König | `karo_koenig` Master (Kalif, Goldturban, langer Bart) | **fehlt** |
| Kreuz Bube | `kreuz_bube_a` Falkner (Falke F9, 1 Pixel tiefer) | `kreuz_bube_b` Hermelinprinz |
| Kreuz Dame | `kreuz_dame_a` Hofdame (Diadem, Perlen) | `kreuz_dame_b` Zopfkrone |
| Kreuz König | `kreuz_koenig` Master (Goldkrone, Schnurrbart) | **fehlt** |
| Pik Bube | `pik_bube` Master (weißer Topfschnitt, runde Brille) | **fehlt** |
| Pik Dame | `pik_dame` Master (weißer Bob, Brille, Melone mit rotem Band) | **fehlt** |
| Pik König | `pik_koenig` Master (Zylinder, Monokel, weißes langes Haar) | `pik_koenig_zwilling` (Z2: breiter Zylinder W1, Glatze, Schnurrbart 6 breit, Brauen 3 breit eine Zeile höher) |

Fertig sind 5 von 12 Paaren (Herz Bube, Herz Dame, Kreuz Bube, Kreuz Dame, Pik König). **Es fehlen 7 zweite Personen**: Herz König, Karo Bube, Karo Dame, Karo König, Kreuz König, Pik Bube, Pik Dame.

Erste Zwillingsideen (noch nicht entworfen):
- Pik Bube: anderer Haarschnitt oder andere Brillengröße. Pik Dame: Melone gerade oder schief, andere Brille.
- Herz König: anderer Turban (safawidisch mit rotem Stab). Karo König: Pharao oder Sultan-Krone. Karo Dame: Zopfkrone statt Diadem. Karo Bube: Fez in anderer Form. Kreuz König: Bügelkrone mit Kreuz oder Zackenkrone.
- Zwillingsregel: Farben, Gesichtsausdruck und das prägende Merkmal (Bart, Brille, Krone) bleiben, Kopfbedeckung/Frisur/Beiwerk ändern sich.
- Ideen-Archiv mit vielen Varianten pro Familie: `images/archiv_entwuerfe/` (`d_*` = erste Runde, `c_*`/`b_*` = weitere Ideen, `fam_*` = Familienübersichten).

## 3. Master-Regeln (verbindlich für alle Personen)

Karte 32 × 44 Pixel. Layout „N1“ ohne Spiegelung, Person in einem Fenster ohne Rahmen:
- Person 16 Pixel breit (Spalten 8 bis 23), Gesicht 10 breit. **Augen auf Zeile 15** (alle Personen gleich, nach dem Anheben um 1 Pixel).
- Büste: symmetrische Halbkreis-Form („Form 1“), Mitte der Karte ist x=16,0. Körper von Spalte 8 bis 23, links wie rechts abgeschnitten (Aussparung auch links, 1 Pixel Rand zu Buchstabe/Symbol). Der Körper ist 1 Pixel höher als die Person angehoben (Person `lift=1`, untere Kante bleibt).
- **Symbole**: oben links Index (Buchstabe + Farbsymbol) wie bisher. Unten rechts: Symbol und Buchstabe auf dem Kopf, Symbol 3 Spalten angeschnitten. **Unten links zusätzlich ein auf dem Kopf stehendes Farbsymbol**, links und rechts mit je 1 Pixel Lücke zur Schulter. Buchstaben dürfen **nie** berührt werden (auch nicht diagonal).
- **Goldkante** unten: König zwei Goldlinien mit Lücke (G5), Bube eine Goldlinie (G1), Dame untere Goldlinie plus obere Linie in dunklem Gold-Braun `#8a5a1a` (G5u). Immer symmetrisch, rechts nur abgeschnitten.
- Weiß muss auf der cremefarbenen Karte lesbar sein: Weiß bekommt automatisch einen Schlagschatten (`emph='schlagschatten'`). Die Pik-Hautfarbe ist deshalb `#f6dfca`: blass, aber so, dass das Gesicht **keinen** Schatten bekommt (`#f8e3d2` löste Schatten aus).
- Farben bewusst eingeschränkt (nicht zu bunt). Neue Farbwerte nur nach Absprache.
- Die Pik-Master haben Haut `#f6dfca`. Das ist in `masters_v2.py` für alle `pik_*` gesetzt.

## 4. Technik (Python/Pillow, im Ordner `code/`)

Voraussetzung: `pip install pillow` (`requirements.txt`). Schrift DejaVu optional (Fallback vorhanden). `lib.py` liest `GLYPHS` und `SUIT_SHAPES` aus `src/ui/sprites.ts` (dort ist die schmale 0 schon enthalten).

- `lib.py`: Karte, Glyphen, Symbole, Index (Buchstabe + Symbol), Farbtabellen.
- `parts.py`: Baukasten aus Hüten, Haaren, Bärten, Extras (jeweils ASCII-Zeilen mit Farbbuchstaben), Objekte (Falke, Wappen …). `HAT`, `HAIR`, `BEARD`, `EXTRA`, `ACC`, Funktionen wie `part`, `mir`, `rows_raw`, `zyl`, `bowler`, `_fall_cap`.
- `bust.py`: Körper (Büste) mit symmetrischer Kurve, Goldkante, Aussparungen (`dyn_body`).
- `comp.py`: `compose(suit, spec, emph)` und `card(suit, rank, spec, emph, sym)`. Ein **Spec** ist ein dict: `hat` (Liste von Teilen), `hair`, `beard`, `extra`, `acc`, `px` (absolute Pixel-Objekte), `pal` (Farb-Überschreibungen), `dyn` (Körperparameter), `lift`. `px_after=True` zeichnet Objekte (Vogel) nach dem Schatteneffekt.
- `masters.py` / `masters_v2.py`: die Master (v2 ist der aktuelle Stand mit allen Anpassungen aus 3). `spec_v2(name)` / `render_v2(name)`.
- `final_auswahl.py`: **freigegebene Personen** (`PERSONEN` plus `MASTERS_V2`) und die Zwischenübersicht. Hier werden neue Personen ergänzt. Hilfsfunktion `m2(rank, hat, beard, hair, extra, px, acc, **pal)`.
- `archiv/`: alle Entwurfs-Skripte der Sitzung (nur zur Nachvollziehbarkeit, nicht lauffähig ohne die damalige Arbeitsumgebung).

Neue Person anlegen: Spec in `final_auswahl.py` (`PERSONEN`) eintragen, Slot in `KARTEN` zuweisen, `python3 final_auswahl.py` ausführen, PNG prüfen. Für Varianten ein eigenes kleines Skript mit mehreren Specs nebeneinander rendern und als PNG schicken.

Fallen:
- Teile sind 16 Spalten breit (Spalte 0 = Karten-x 8). Gesicht Spalten 3 bis 12, Augen bei Spalte 5 und 10. Vor dem Anheben gilt: Augen Zeile 16, Hut unten Zeile 13.
- Vogel/Objekte rechts: nichts darf an Symbol oder Buchstaben stoßen (Symbolreste ab Spalte 25, Zeile 26).
- Weiße Teile bekommen Schatten. Teile, die keinen wollen, brauchen eine nicht-„helle“ Farbe (max−min > 40) oder `px_after`.

## 5. Entscheidungsprotokoll (Kurzfassung)

- Layout N1 (Fenster ohne Rahmen), keine Punktspiegelung, Büste mit goldener Kante, symmetrische Form 1 (Halbkreis tief).
- Linke Schulter symmetrisch zur rechten, Symbol unten links dazu, Person 1 Pixel höher.
- Master: Pik König/Bube/Dame, Herz König, Karo Bube/König/Dame, Kreuz König (Krone Variante D, Steine bei Spalte 3, 6, 9, 12, eine Zeile tiefer, Schnurrbart wie CK-i).
- Pik Dame: Haare +3 Pixel, Melone mit rotem Band (A2). Pik Bube: Topfschnitt B, Brille M.
- Zwei Decks: pro Karte zwei Personen (Zwillinge). Auswahlen für Herz Bube/Dame, Kreuz Bube/Dame sind abgeschlossen (Tabelle in 2).

## 6. Nächste Schritte

1. **Zwillinge für die 7 fehlenden Karten entwerfen**, je Karte 3 bis 4 Vorschläge zum Auswählen (Vorschlag: mit Karo beginnen, da dort alle drei fehlen).
2. Danach beide Decks nebeneinander prüfen (jede Karte als Paar).
3. Später: Kleidungsdetails ergänzen.
4. **Integration ins Spiel** (noch nicht begonnen, nur mit ausdrücklichem Auftrag): `src/ui/sprites.ts` zeichnet die Bildkarten bisher aus `KING/QUEEN/JACK`-Arrays. Der Atlas hat 56 Zellen (52 Karten, Joker, zwei Rückseiten, Platzhalter). Für zwei Decks mit unterschiedlichen Personen braucht es zusätzliche Atlas-Zellen oder zwei Atlanten und eine Zuordnung über `card.id` (≥ 52 = zweites Deck, vgl. `backOf`). Auch `src/ui/guide.ts` (Design Guide, Eintrag 5.20) müsste angepasst werden. Das ist ein eigenes Vorhaben und kein Teil dieser Übergabe.

## 7. Test- und Build-Stand

Zum Zeitpunkt der Übergabe: `npx tsc --noEmit` ohne Fehler, `npx vitest run` 306 Tests grün. Im Code ist bisher nur die freigegebene schmale Ziffer 0 (4 × 7) und die enger gesetzte 10 geändert (`sprites.ts`, `guide.ts`).
