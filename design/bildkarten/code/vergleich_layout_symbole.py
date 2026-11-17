"""Vergleich Layout v3: Index links oben immer ganz sichtbar, Person 2 px verschoben, Symbol unten links entfernt.
Vorher = Layout 'symm' (freigegebener Stand), Nachher = 'v3'. Aufruf: python3 vergleich_layout_symbole.py [Ausgabeordner]

Änderungen (Nachher):
- Das Index-Symbol links oben ist 7 Pixel breit (Spalte 3 bis 9). Das Personenfenster begann bisher bei Spalte 8 und schnitt 2 Spalten ab.
  Jetzt beginnt das Fenster bei Spalte 10, die Person ist um 2 Pixel verschoben (Hut/Kopf/Vogel unverändert, nur verschoben).
- Kleidung (Schulter): links ab Spalte 10, rechts weiter ab Spalte 23 abgeschnitten (2 Pixel der Schulter fallen rechts weg),
  damit das angeschnittene Symbol unten rechts (sichtbar Spalte 25 bis 28) mit 1 Pixel Lücke frei bleibt.
- Das auf dem Kopf stehende Symbol unten links entfällt.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from final_auswahl import *
from comp import card

def render_old(s, r, sp): return card(s, r, sp, 'schlagschatten', 'symm')
MODE='v4'
def render_v3(s, r, sp): return card(s, r, sp, 'schlagschatten', 'v3')
def render_new(s, r, sp): return card(s, r, sp, 'schlagschatten', MODE)

def spec_of(key):
    if key in MASTERS_V2:
        s, r, em, sp = spec_v2(key); return s, r, sp
    return PERSONEN[key]

def personen():
    seen = []
    for s, r, keys in KARTEN:
        for k in keys:
            if k and k not in seen: seen.append(k)
    return seen

# ---------------- Prüfung: Index vollständig, nichts berührt Buchstaben/Symbole ----------------
def index_pixels(s, r):
    idx = index_layer(s, r); both = Layer(); both.over(idx); both.over(idx.rot()); return both

def check(key, mode):
    """miss = Pixel des Symbols links oben, die nicht sichtbar sind; touch = Figur-Pixel, die ein sichtbares Index-Pixel (auch diagonal) berühren."""
    s, r, sp = spec_of(key)
    im = (render_new if mode == 'new' else render_old)(s, r, sp).convert('RGBA'); px = im.load()
    ink = inkOf(s)
    miss = [(x, y) for y in range(11, 18) for x in range(3, 10) if SH[s][y - 11][x - 3] == '#' and px[x, y][:3] != ink]
    if mode == 'old': return miss, []
    bare = base(); idx = index_layer(s, r); bare.over(idx); bare.over(idx.rot())
    win = Layer(); win.rect(10, 11, 24, 32, C['cream']); bare.over(win); bp = bare.im.load()
    vis = {(x, y) for y in range(H) for x in range(W) if 2 <= x <= 29 and 2 <= y <= 41 and bp[x, y][:3] == ink}   # sichtbare Index-Pixel (ohne Rahmen)
    touch = []
    for y in range(H):
        for x in range(W):
            if px[x, y] != bp[x, y] and (x, y) not in vis:
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if (dx or dy) and (x + dx, y + dy) in vis: touch.append((x, y, x + dx, y + dy))
    return miss, touch

def sheet(path, keys, S=5):
    cw, ch = W * S, H * S; pad = 14; lab = 18
    cols = 6                                   # 6 Personen pro Zeile: je Person Vorher | Nachher
    rows = (len(keys) + cols - 1) // cols
    gw = 2 * cw + 8
    im = Image.new('RGB', (pad + cols * (gw + pad), 40 + rows * (ch + lab + pad)), BG); d = ImageDraw.Draw(im)
    d.text((pad, 8), 'Bildkarten Layout: links v3 (bisher), rechts v4 (Kopf 1 px tiefer, Körper unten 2 px kürzer)', fill=INK, font=FONTB)
    for i, k in enumerate(keys):
        s, r, sp = spec_of(k)
        x = pad + (i % cols) * (gw + pad); y = 40 + (i // cols) * (ch + lab + pad)
        for j, fn in enumerate((render_v3, render_new)):
            b = fn(s, r, sp).resize((cw, ch), Image.NEAREST); im.paste(b, (x + j * (cw + 8), y), b)
        d.text((x, y + ch + 1), k, fill=INK, font=FONT)
    im.save(path)

def detail(path, key, S=12):
    s, r, sp = spec_of(key); cw, ch = W * S, H * S
    im = Image.new('RGB', (2 * cw + 50, ch + 50), BG); d = ImageDraw.Draw(im)
    for j, (t, fn) in enumerate((('v3', render_v3), ('v4', render_new))):
        b = fn(s, r, sp).resize((cw, ch), Image.NEAREST); x = 20 + j * (cw + 10)
        d.text((x, 4), t, fill=INK, font=FONTB); im.paste(b, (x, 28), b)
    im.save(path)

def main(out):
    os.makedirs(out, exist_ok=True)
    keys = personen(); bad = 0
    for k in keys:
        for mode in ('old', 'new'):
            miss, touch = check(k, mode)
            if mode == 'new' and (miss or touch): bad += 1
            if miss or touch: print('%-22s %-4s Symbol links oben fehlt: %d Pixel | Berührung: %d' % (k, mode, len(miss), len(touch)), touch[:3])
    sheet(os.path.join(out, 'layout_v4_vorher_nachher.png'), keys)
    for k in ('herz_bube_a', 'pik_koenig', 'kreuz_bube_a'): detail(os.path.join(out, 'layout_v4_detail_%s.png' % k), k)
    print('Personen:', len(keys), '| Nachher mit Problemen:', bad)

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'images', 'layout_symbole'))
