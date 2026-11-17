"""Tiefe per Formel: Licht links/oben, Schatten rechts/unten – nur Helligkeit/Sättigung (HSL), keine eigenen Farben.
Wirkt auf Haare, Bärte, Kopfbedeckung (Buchstaben unten). Bereits handschattierte Flächen (Zylinder 'k', Fez 'a') bleiben unberührt."""
import colorsys
REGION='HBAKGWN'                 # Haar, Bart, Hut-Hauptfarben, Gold, Weiß, Stahl
HANDSHADE={'K':'k','A':'a'}      # Flächen mit Handschatten -> überspringen
# Formel: Delta-Helligkeit / Sättigungsfaktor
FORM=dict(hi=(+0.12,0.92), lo=(-0.13,1.10), lo2=(-0.07,1.05))
def hsl_shift(rgb,dl,fs):
    r,g,b=[v/255 for v in rgb[:3]]; h,l,s=colorsys.rgb_to_hls(r,g,b)
    l=min(1,max(0,l+dl)); s=min(1,max(0,s*fs))
    r,g,b=colorsys.hls_to_rgb(h,l,s); return (round(r*255),round(g*255),round(b*255))
def hi(c): return hsl_shift(c,*FORM['hi'])
def lo(c): return hsl_shift(c,*FORM['lo'])
def lo2(c): return hsl_shift(c,*FORM['lo2'])
VERT='HAKGWN'     # Haar/Hut: dürfen oben hell / unten dunkel werden (Bart nicht: zu unruhig)
CAST='HAKGWN'     # wirft Schatten auf die Haut
# Varianten: A Kanten | B Kanten+oben/unten | C Kanten+Wurfschatten | D alles (B+C+breitere Schattenzone)
VARS=dict(A=dict(),B=dict(vert=1,skin=1),C=dict(cast=1),D=dict(vert=1,cast=1,wide=1))
def apply(grid,cm,variant):
    """grid: {y:row}; cm: Buchstabe->RGB. Rückgabe: {(spaltenindex,y):RGB}"""
    v=VARS[variant]
    ch=lambda x,y: grid[y][x] if y in grid and 0<=x<16 else '.'
    skip={c for c,s in HANDSHADE.items() if any(s in r for r in grid.values())}
    out={}
    for y,row in grid.items():
        x=0
        while x<16:
            c=row[x]
            if c not in REGION or c in skip or c not in cm: x+=1; continue
            x1=x
            while x1+1<16 and row[x1+1]==c: x1+=1
            n=x1-x+1
            if n>=3:
                base=cm[c]
                for xx in range(x,x1+1):
                    col=None
                    if xx==x: col=hi(base)                       # linke Kante hell
                    elif xx==x1: col=lo(base)                    # rechte Kante dunkel
                    elif v.get('wide') and n>=7 and xx==x1-1: col=lo2(base)
                    if v.get('vert') and c in VERT and n>=4 and x<xx<x1:
                        if ch(xx,y-1) in '.S': col=hi(base)      # Oberkante hell
                        elif ch(xx,y+1) in '.S': col=lo2(base)   # Unterkante dunkel
                    if col: out[(xx,y)]=col
            x=x1+1
    if v.get('skin') and 'S' in cm:      # Haut: nur äußere Silhouette (links hell, rechts dunkel), Gesichtszüge bleiben
        for y,row in grid.items():
            for x in range(16):
                if row[x]!='S': continue
                if ch(x-1,y)=='.': out[(x,y)]=hi(cm['S'])
                elif ch(x+1,y)=='.': out[(x,y)]=lo(cm['S'])
    if v.get('cast'):   # Wurfschatten auf die Haut: Licht links oben -> Schatten rechts unten neben/unter Haar und Hut
        for y,row in grid.items():
            for x in range(16):
                if row[x]=='S' and 'S' in cm and ch(x-1,y-1) in CAST and ch(x-1,y-1) in cm and ch(x,y-1)!='S':
                    out[(x,y)]=lo2(cm['S'])
    return out

def body(L,fig_alpha,xmin=8):
    """Kleidung: Schulterkante links hell / rechts dunkel, Schatten unter Hals/Kopf, linke Randspalte hell, rechte dunkel.
    L: Körper-Layer (wird verändert), fig_alpha(x,y)->bool: Person darüber."""
    pts=[(x,y) for y in range(L.im.size[1]) for x in range(L.im.size[0]) if L.p[x,y][3]]
    S=set(pts); new={}
    for (x,y) in pts:
        c=L.p[x,y][:3]; f=None
        if (x,y-1) not in S:
            f=lo2 if fig_alpha(x,y-1) else (hi if x<16 else lo)
        elif x==xmin: f=hi
        elif x>=22: f=lo2 if x==22 else lo
        if f: new[(x,y)]=f(c)
    for (x,y),c in new.items(): L.p[x,y]=tuple(c)+(255,)
