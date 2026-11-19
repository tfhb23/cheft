# Entwürfe zweite Personen (7 offene Karten)

Stand: Entwürfe zur Auswahl, **nichts davon ist im Spiel**. Gesicht, Brauen, Nase, Mund und Brille bleiben wie bei der ersten Person (Zwillingsregel); Kopfbedeckung, Haar, Bart und Beiwerk wechseln. Alle Entwürfe sind im aktuellen Layout v9 gerendert (Torso 13 breit, Figur 3 px tiefer).

Bilder: `images/entw/<karte>.png` (Karten, 6x) und `images/entw/<karte>_detail.png` (Kopf, 9x). Die erste Kachel ist immer die aktuelle erste Person.

Neu erzeugen: `python3 design/bildkarten/code/entw_herz_koenig.py`, `entw_karo.py`, `entw_kreuz_pik.py`. Die Entwürfe sind ASCII-Art in Endkoordinaten (Hilfen in `paare.py`: Mitte = Spalte 8, Gesicht Spalte 4 bis 12, Augen Zeile 17).

## Herz König

Turbane und Kopfschmuck in Weiß, Gold und Rot, Dichter-Weiser mit Rose; grauer Bart (Token 1.29) bleibt das prägende Merkmal, nur seine Form wechselt. Keine neue Farbe.

- 1 Taj mit rotem Stab
- 2 Kuppel + Rubin
- 3 Kappe + Gold
- 4 Rote Kalpak
- 5 Zwei Goldbänder
- 6 Weiser + Rose
- 7 Gewickelt
- 8 Reiher weiß
- 9 Turban flach + Reif
- 10 Mond-Turban
- 11 Spitzkappe rot
- 12 Tuchende rechts

## Karo König

Gold, Blond, Rot (wie der Fez des Karo Buben) und Diamantweiß. Rot nur bei Turban, Samt und Streifen, Weiß nur beim Kopftuch (Diamantweiß). Keine neue Farbe.

- 1 Zwiebelkrone
- 2 Nemes (Pharao)
- 3 Roter Turban + Reiher
- 4 Bügelkrone Samt
- 5 Zackenkrone + Locken
- 6 Goldpapakha + Rotband
- 7 Kopftuch + Goldringe
- 8 Mähne + Goldreif
- 9 Zweistufiger Turban gold/rot
- 10 Goldhelm mit Rotkamm

## Karo Dame

Gold, Blond, Diamantweiß, Rot für Turban und Binde; Ohrringe bleiben. Keine neue Farbe.

- 1 Zopfkrone + Goldband
- 2 Goldhaube + Stirnjuwel
- 3 Offenes Haar + Reif
- 4 Kleiner roter Turban
- 5 Hochsteck + Münzband
- 6 Kleine Krone + Strähnen
- 7 Hohes Hochsteck + Nadel
- 8 Pagenkopf + Stirnband
- 9 Goldschleier
- 10 Haarturban rot

## Karo Bube

Roter Fez-Familienmotiv in neuen Formen, Gold, Blond. Keine neue Farbe.

- 1 Fez schief + Quaste
- 2 Tarbusch + Goldborte
- 3 Kleiner Turban
- 4 Zipfelmütze
- 5 Locken + Goldstirnband
- 6 Goldtuch mit Knoten
- 7 Hoher Fez + Münze
- 8 Kalpak + goldene Feder
- 9 Pagenkopf + Reif
- 10 Takke + Locken

## Kreuz König

Schwarz, Gold, Weiß (Hermelin, Perlen), braunes Haar, orange Edelsteine wie bei der ersten Krone. Bewusst kein Rot (kein roter Samt), stattdessen schwarz. Keine neue Farbe.

- 1 Bügelkrone mit Kreuz
- 2 Zackenkrone auf Hermelin
- 3 Lorbeer, Glatze, Vollbart
- 4 Zinnenkrone
- 5 Kleine Krone + Locken
- 6 Kurhut mit Hermelin
- 7 Perlenreif auf vollem Haar
- 8 Perlenkrone
- 9 Barett mit weißer Feder
- 10 Breite Eisenkrone mit Perlen
- 11 Kalotte + Goldreif + Kinnbart

## Pik Bube

Schwarz, Weiß, blasse Haut; der orange Hutband-Ton nur beim Mini-Zylinder (wie Pik Dame und Pik König Zwilling). Brille bleibt das prägende Merkmal. Keine neue Farbe.

- 1 Schiebermütze
- 2 Wuschelkopf
- 3 Seitenscheitel glatt
- 4 Glatze + Mini-Zylinder
- 5 Mütze mit Bommel
- 6 Pilzkopf lang
- 7 Hochgekämmt
- 8 Topfschnitt + große Brille
- 9 Gelehrtenkappe
- 10 Haarsträhne links, schwarze Binde

## Pik Dame

Schwarz, Weiß, blasse Haut, oranger Akzent wie beim Hutband der ersten Dame. Brille bleibt. Keine neue Farbe.

- 1 Hochsteck + Fascinator
- 2 Mittelscheitel lang + Reif
- 3 Damenzylinder + Bob
- 4 Hexenhut breit
- 5 Pixie + schwarze Schleife
- 6 Weiße Locken
- 7 Seitenzopf + rote Schleife
- 8 Baskenmütze schief
- 9 Große Schleife + Bob
- 10 Fedora schräg + kurzes Haar
- 11 Zöpfe mit Schleifen

# Runde 2 (nach Rückmeldung)

Bilder in `images/entw/<name>.png` und `<name>_detail.png`. Skripte: `entw2.py`, `entw3.py`, `entw4.py`. Keine neuen Farben: schwarzes Haar beim Pik Buben ist das Familien-Schwarz (1.01), das braune Stirnband beim Herz König das Herz-Haarbraun (1.26), Gold/Rot/Weiß wie zuvor.

Zusätzlich: Pik Dame (erste Person), Hutkrempe an der Saumkante links und rechts je 1 Pixel breiter, Vergleich in `images/entw/pik_dame_hut_breiter.png` (in `masters_v2.py` eingetragen, noch nicht live).

## Karo König: Nemes-Varianten (Haar und Bart wie Nemes 2, keine Streifen) (`karo_koenig_nemes`)

- 1 Nemes glatt
- 2 Nemes + dunkle Stirnlinie
- 3 Nemes kurz, rund
- 4 Nemes + Stirnjuwel
- 5 Reifkrone, Haar frei
- 6 Goldhaube mit Ohrklappen
- 7 Weiße Hedjet-Krone
- 8 Federkrone, zwei Federn
- 9 Spitzkuppel (Kalif)
- 10 Turban + Tuchende rechts
- 11 Stirnreif + Haarflut
- 12 Sonnenscheibe
- 13 Doppelhaube: Gold unten, Weiß oben

## Herz König: ohne Vollbart, Rose, Variante 6 mit Stirnband (`herz_koenig_2`)

- 6A wie 6, Goldband
- 6B wie 6, braunes Band
- 6C wie 6, schwarzes Band
- 6D wie 6, Gold + brauner Rand
- 6E Goldband, Schnurr + Kinn
- 6F braunes Band, Backenbart
- 6G schwarzes Band, Ziegenbart
- R1 Turban, Rose als Brosche
- R2 Turban, Rose seitlich am Band
- R3 Haar mit Rose überm Ohr
- R4 Rosenkranz im Goldband
- R5 Rose oben auf dem Turban
- R6 Zwei Rosen am Turbanband
- R7 Langes Haar, braunes Band, Rose am Ohr
- R8 Hoher Turban, Rose oben links
- R9 Roter Turban, weiße Rose
- R10 Glatze, Goldband, Rose am Ohr

## Karo Dame: deutlich anders als die Vorlage (`karo_dame_2`)

- 1 Yashmak weiß + Goldtuch
- 2 Yashmak gold + Haarflut
- 3 Lange Zöpfe vorn + Goldmütze
- 4 Seitendutt rechts, rotes Band
- 5 Tantur mit Schleier
- 6 Haarnetz mit Goldfäden
- 7 Pagen asymmetrisch + Rubin
- 8 Münzkrone + Seitenscheitel
- 9 Federdiadem
- 10 Goldtuch, Knoten rechts
- 11 Sonnenscheibe + Haar offen
- 12 Reifohrringe + Kurzhaar

## Karo Bube 10: mehr Locken und Schwung (`karo_bube_locken`)

- 1 wie 10 (Referenz)
- 2 Ringellocken, 2 Spalten
- 3 Zickzack-Locken
- 4 Schwung links lang, rechts kurz
- 5 Stirnlocken + Seiten
- 6 Buschig, 3 breit
- 7 Schwung rechts mit Spirale
- 8 Locken + Goldringe
- 9 Locken quellen unter der Takke
- 10 Locken + Quaste

## Pik Bube: ohne Brille, teils schwarzes Haar (`pik_bube_2`)

- 1 Schwarzer Scheitel, Koteletten
- 2 Schwarzer Igel
- 3 Augenklappe + schwarze Tolle
- 4 Narbe + weißer Pilz
- 5 Domino + Mini-Zylinder
- 6 Schwarze Kapuze
- 7 Schwarz mit weißer Strähne
- 8 Schiebermütze, Schwarzhaar
- 9 Vampir: Fangs + Tolle
- 10 Weißes Haar kurz, böse Brauen
- 11 Weiß + Narbe + Augenklappe
- 12 Schwarz lang, Mittelscheitel

## Pik Dame mit Baskenmütze: andere oder keine Brille, Brauen (`pik_dame_2`)

- 1 Beret, keine Brille, schwarze Brauen
- 2 Beret, weiße Brauen
- 3 Beret, böse Brauen
- 4 Beret, kleine Brille
- 5 Beret, Monokel
- 6 Beret, Domino-Maske
- 7 Beret + roter Stiel, Brauen
- 8 Beret schief links, lange Haare
- 9 Beret + Zopf rechts, Brauen
- 10 Beret + Schönheitspunkt
- 11 Beret, runde Brille + Brauen

## Kreuz König 3: ohne Lorbeer, längere Bärte (`kreuz_koenig_bart`)

- 1 wie 3, Vollbart kurz (Referenz)
- 2 Vollbart lang
- 3 Vollbart extra lang
- 4 Gabelbart lang
- 5 Spitzbart sehr lang
- 6 Kinnbart lang + Schnurr
- 7 Geflochten (Zopfbart)
- 8 Zwei Zöpfe
- 9 Backen + langer Kinnbart
- 10 Welliger Vollbart lang
- 11 Lang mit weißen Strähnen
- 12 Sehr schmal und lang

# Runde 3

Freigegeben und in `zwillinge.py` eingetragen (wird von `export_ts.py` importiert, noch nicht exportiert, nichts live): Karo Bube Person 2 (Takke + Stirnlocken), Pik Dame Person 2 (Beret + Schönheitspunkt). Vergleich: `images/entw/zwillinge_freigegeben.png`.

Neue Entwürfe (`entw5.py`): `karo_koenig_krone2` (Federkrone 1 bis 2 px niedriger), `karo_dame_haare` (lang, wellig, asymmetrisch), `pik_bube_3` (Mischung 12 und 6 als Haar, Vorhang-Fransen), `kreuz_koenig_bart2` (Bart zwischen kurz und lang).

# Runde 4

Freigegeben und in `zwillinge.py` eingetragen (noch nicht exportiert, nichts live): Karo König Person 2 (Federkrone minus 2 Zeilen), Karo Dame Person 2 (wellig mit Goldbändern), Kreuz König Person 2 (runder Bart, Mund vorläufig 3 breit, Auswahl offen).
Neue Entwürfe (`entw6.py`): `pik_bube_4` (nur Merkmale von 12 und 6, als Haar) und `kreuz_koenig_mund` (Mund-Varianten).

# Runde 5

Freigegeben und eingetragen (`zwillinge.py`, noch nicht exportiert): Kreuz König Person 2 (Mund 3 breit), Pik Bube Person 2 (Dach 12, links 6, rechts 12). Es fehlt nur noch die zweite Person beim Herz König. Übersicht: `images/final_layout_v10/uebersicht_final.png`.

Licht/Schatten: `tiefe.py` hat jetzt die Option `TWO` für 2 Pixel breite Flächen (None = bisher flach, 'rechts', 'beide'), Standard bleibt None. Vergleich: `images/entw/licht_2breit.png`.

# Runde 6 (live)

Freigegeben und live: Karo Bube, Karo Dame, Karo König, Kreuz König (Glatze, runder Bart, Goldspange, Mund 3 breit), Pik Bube und Pik Dame Person 2 (siehe `zwillinge.py`). Schattenregel: 2 Pixel breite Flächen bekommen einen dunkleren rechten Pixel (`tiefe.TWO='rechts'`). Es fehlt nur noch Person 2 beim Herz König (bis dahin steht dort die erste Person doppelt).
