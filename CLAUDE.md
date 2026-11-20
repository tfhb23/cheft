# Arbeitsregeln für Claude

## „Live“ / „veröffentlichen“

Sagt der Nutzer **„live“** oder **„veröffentlichen“**, heißt das, in dieser Reihenfolge:

1. Alles committen (inkl. Doku, Design Guide, Tests passend zur Änderung).
2. Den Arbeitsbranch in `main` mergen und `main` pushen.
3. So veröffentlichen, dass der Nutzer es selbst spielen und testen kann. Render deployt `main` automatisch (`render.yaml`, `autoDeploy: true`); danach kurz sagen, dass das Deployment läuft und worauf er achten soll.

Das ist die ausdrückliche Erlaubnis, auf `main` zu pushen. Ohne eines dieser Wörter bleibt alles auf dem Arbeitsbranch (committen und dorthin pushen ist immer ok).
4. Danach aufräumen: alle in `main` gemergten `claude/…`-Branches auf GitHub löschen. Vorher je Branch prüfen, dass er wirklich in `main` enthalten ist, und am Ende auflisten, welche gelöscht wurden. Nie `main` oder fremde Branches löschen, sonst nichts.
