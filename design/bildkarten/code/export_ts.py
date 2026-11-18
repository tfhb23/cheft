"""Exportiert die 12 Bildkarten (je 2 Personen) als Pixeldaten nach src/ui/face-art.ts.

Aufruf: python3 design/bildkarten/code/export_ts.py
- Karten ohne zweite Person verwenden die erste Person doppelt (Platzhalter, später austauschen).
- Farben, die einem Guide-Token (tokens.ts, Palette 1.xx) entsprechen, werden als Token-Name geschrieben, alle anderen
  (per Formel abgeleitete Töne wie Schatten, Lippen, Nase) als Hex-Wert. Ändert sich ein Token: dieses Skript neu ausführen.
"""
import os,sys,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from final_auswahl import *
import zwillinge   # freigegebene zweite Personen eintragen
from final_layout import render_final   # aktueller Layout-Stand (mittig, schmaler Kopf, Kinn kürzer, Schultern schmaler)
import lib
OUT=os.path.join(lib._ROOT if os.path.exists(os.path.join(lib._ROOT,'src')) else '/home/user/cheft','src','ui','face-art.ts')
CHARS="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~"
tok=open(lib._TOK).read()
by_hex={}
for i,css,n,v in re.findall(r"\{ id: '(1\.\d\d)', css: '--c-([^']+)', name: '([^']+)', value: '(#[0-9a-fA-F]{6})'",tok): by_hex.setdefault(v.lower(),css)
def sprites():
    out={}
    for s,r,keys in KARTEN:
        if r<11: continue
        a=keys[0]; b=keys[1] or keys[0]
        out['%s%d'%(s,r)]=[render_final(a),render_final(b)]
    return out
def main():
    sp=sprites(); order=[]
    for im2 in sp.values():
        for im in im2:
            px=im.convert('RGBA').load()
            for y in range(H):
                for x in range(W):
                    if px[x,y][3]:
                        h='#%02x%02x%02x'%px[x,y][:3]
                        if h not in order: order.append(h)
    assert len(order)<=len(CHARS),len(order)
    ch={h:CHARS[i] for i,h in enumerate(order)}
    refs=[by_hex.get(h,h) for h in order]
    L=['/**','* Bildkarten-Figuren (12 Karten × 2 Personen) als fertige 32 × 44-Pixelbilder.','* ERZEUGT von design/bildkarten/code/export_ts.py – nicht von Hand ändern.','* Schlüssel: Farbe + Rang (H11 = Herz Bube, S13 = Pik König). Wert: [Person Deck 1, Person Deck 2].','* Zeichen "." = transparent; alle anderen Zeichen stehen in FACE_CHARS und zeigen auf FACE_REFS (Token-Name aus tokens.ts oder Hex-Wert).','* Karten ohne zweite Person verwenden die erste Person doppelt (Platzhalter).','*/'.replace('*/','*/')]
    L=[x if x.startswith('/**') or x=='*/' else ' '+x for x in L]
    L.append("export const FACE_CHARS = %s;"%repr(CHARS[:len(order)]).replace("'",'"') if '"' not in CHARS else "export const FACE_CHARS = %r;"%CHARS[:len(order)])
    L.append('export const FACE_REFS: string[] = [%s];'%', '.join("'%s'"%r for r in refs))
    L.append('export const FACE_ART: Record<string, [string[], string[]]> = {')
    for k,(a,b) in sp.items():
        def rows(im):
            px=im.convert('RGBA').load()
            return [''.join('.' if px[x,y][3]==0 else ch['#%02x%02x%02x'%px[x,y][:3]] for x in range(W)) for y in range(H)]
        ra,rb=rows(a),rows(b)
        L.append("  %s: [\n    [%s],\n    [%s],\n  ],"%(k,',\n     '.join("'%s'"%r for r in ra),',\n     '.join("'%s'"%r for r in rb)))
    L.append('};')
    open(OUT,'w').write('\n'.join(L)+'\n')
    print('geschrieben:',OUT,len(order),'Farben,',sum(1 for r in refs if not r.startswith('#')),'davon Token-Farben')
if __name__=='__main__': main()
