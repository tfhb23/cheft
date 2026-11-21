# Teppich-Hintergrund (Entwurf)

Pixel-Teppich als möglicher Spielhintergrund, nach dem Foto eines echten Teppichs (Medaillon, Ovalkranz, Rankenfeld, Bordüre).
Nur Entwurf, noch nicht in der App eingebaut.

## Dateien

| Datei | Inhalt |
|---|---|
| `teppich_4farben.png` | Der ganze Teppich, **680 × 920 Pixel**, 1 Teppichpixel = 1 Kartenpixel |
| `teppich_4farben_2x.png` | Dasselbe auf das Doppelte hochskaliert (nur zum Anschauen) |

## Farben (vier Töne, vom Dunkelsten zum Hellsten)

| Ton | Wert | Herkunft |
|---|---|---|
| Sand-Mischton | `#decead` | halber Weg von Sand zu Sand dunkel (`#efe2c6` → `#cdbb94`) |
| Sand | `#efe2c6` | `--c-sand` (1.06) |
| Mittelton | `#f2e6d0` | genau der Durchschnitt aus Sand und Sand hell |
| Sand hell | `#f4eadb` | `--c-sand-light` (1.07) |

Die Töne sind überall im gleichen Verhältnis verteilt (20 / 27 / 28 / 25 %), damit der Teppich aus der Ferne überall gleich wirkt.

## Wie er entstanden ist

1. Foto entzerrt (Perspektive und Drehung), bis die Achsen des Medaillons senkrecht und waagerecht liegen.
2. Obere Bordüre auf die gemessene Neigung geradegezogen, damit sie nach dem Spiegeln nicht einknickt.
3. Viertel oben rechts auf das Raster verkleinert und an beiden Achsen gespiegelt (Spiegelachse genau durch die Mitte, Ovale bleiben ganz).
4. Helligkeit und Kontrast lokal herausgerechnet (Fenster ca. 10 Pixel), dann die vier Töne mit festen Anteilen verteilt: So bleiben die Formen, aber Schatten und Helligkeit des Fotos nicht.

## Gedachter Einsatz

- Die Mitte des Teppichs liegt in der Mitte des Tisches (Menüs: Bildschirmmitte).
- Querformat: Bild um 90° gedreht.
- Darstellung mit `image-rendering: pixelated`, Pixelgröße ganzzahlig in Geräte-Pixeln.
- Zuletzt probiert wurde die Darstellung mit halber Größe (1 Teppichpixel = ½ Kartenpixel); der Teppich ist dann auf Tablets und großen Bildschirmen kleiner als der Tisch.
