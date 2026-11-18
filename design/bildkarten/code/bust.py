
import math
from lib import *
GOLD2=hx('c8902a')
def T(x):
    if 12<=x<=19: return 24
    if x in (10,11,20,21): return 25
    if x in (8,9,22,23): return 26
    return 26+(8-x+1)//2
def B(x,shape,xl):
    cx=16.0; dx=(x+0.5)-cx; ar=8.5; al=max(8.5,cx-xl+0.5)
    a=al if dx<0 else ar
    t=max(0,1-(dx/a)**2)**.5
    if shape in ('halb_sym','bueste_sym'):
        # Symmetrisch zur Kartenmitte x=16,0 (zwischen Pixel 15 und 16): gleiche Halbachse links und rechts.
        # Links läuft die Kurve bis zur breiten Schulter (xl), rechts schneidet die Abstandsregel sie ab.
        a=16.5-xl; t=max(0,1-(dx/a)**2)**.5
        b=round(28+8*t) if shape=='halb_sym' else round(30+6*t)
    elif shape in ('halb_rund','bueste_rund'):
        # Enger, runder Bogen (Halbachse 8,5) symmetrisch zur Kartenmitte; links schließt die Schulter als Flügel an.
        cy,bb=(28,8) if shape=='halb_rund' else (30,6)
        t=max(0,1-(dx/8.5)**2)**.5 if abs(dx)<=8.5 else 0
        b=round(cy+bb*t)
    elif shape=='flach': b=32
    elif shape=='halb': b=round(28+8*t)
    elif shape=='bueste': b=round(30+6*t)
    elif shape=='halbflach': b=round(30+4*t)
    elif shape=='treppe':
        d=abs(dx); b=36 if d<=3 else (34 if d<=6 else 32)
    elif shape=='spitze': b=round(30+max(0,8.5-abs(dx))*0.95)
    else: raise ValueError(shape)
    if x==23: b=min(b,32)     # Abstand zum Buchstaben unten rechts (Buchstabe beginnt in Zeile 34, Spalte 24)
    return b
def dyn_body(suit,p):
    xl=p.get('xl',8); shape=p.get('shape','flach'); gold=p.get('gold','g1')
    robe=inkOf(suit); L=Layer()
    cols=[x for x in range(xl,24) if B(x,shape,xl)>=T(x)]
    bot={x:B(x,shape,xl) for x in cols}
    body=set()
    for x in cols:
        for y in range(T(x),bot[x]+1): body.add((x,y))
    for (x,y) in body: L.put(x,y,robe)
    gold_px=set(); dark=set()
    for x in cols:
        gold_px.add((x,bot[x]))
        for xn in (x-1,x+1):
            if xn in bot:
                for y in range(bot[xn]+1,bot[x]+1):
                    if (x,y) in body: gold_px.add((x,y))
    for x in cols:
        b=bot[x]
        if gold=='g2' and (x,b-1) in body: gold_px.add((x,b-1))
        if gold=='g3' and (x,b-1) in body: dark.add((x,b-1))
        if gold=='g4' and x%2==0 and (x,b-1) in body: gold_px.add((x,b-1))
        if gold=='g5' and (x,b-2) in body: gold_px.add((x,b-2))
    for (x,y) in dark: L.put(x,y,GOLD2)
    for (x,y) in gold_px: L.put(x,y,C['gold'])
    return L

# ======== Runde 7: perfekt symmetrische Büste, rechts nur abgeschnitten ========
def T2(x): return T(min(x,31-x))
def BS(dx,shape):
    """Unterkante in Abhängigkeit vom Abstand dx zur Kartenmitte (x=16,0), spiegelsymmetrisch."""
    f=math.floor
    if shape=='sy_halb':   a=12.5; return round(28+8*max(0,1-(dx/a)**2)**.5)
    if shape=='sy_bogen':  a=12.5; return round(30+6*max(0,1-(dx/a)**2)**.5)
    if shape=='sy_trapez': return 36-max(0,round(dx-4.5))
    if shape=='sy_treppe_fein': return 36-int(dx//2)
    if shape=='sy_treppe_grob': return 36-2*int(dx//3)
    if shape=='sy_pyramide':
        for lim,b in ((2,38),(5,36),(8,34),(11,32)):
            if dx<lim: return b
        return 30
    if shape=='sy_treppe_breit':
        return 36 if dx<4 else (33 if dx<8 else 30)
    if shape=='sy_spitze': return round(38-0.8*dx)
    if shape=='sy_glocke': return round(28+9*math.exp(-(dx/5)**2))
    raise ValueError(shape)
SYM_SHAPES=['sy_halb','sy_bogen','sy_trapez','sy_treppe_fein','sy_treppe_grob','sy_pyramide','sy_treppe_breit','sy_spitze','sy_glocke']
EXTRA_ROW=0   # Test: eine zusätzliche Zeile Kleidung unter der untersten Goldlinie (1 = an)
SHADE_PX=set()
def full_shape(p):
    SHADE_PX.clear()
    xl=p.get('xl',4); shape=p['shape']
    xs=range(xl,32-xl)
    cut=p.get('cut',0)
    cx=p.get('cx',16.0); S2=int(2*cx-1)                                   # cx=16,5: Mitte auf Pixelspalte 16 (ungerade Breite, wie der Kopf)
    T2=lambda x: T(min(x,S2-x))
    bot={x:BS(abs(x+0.5-cx),shape)-cut for x in xs if BS(abs(x+0.5-cx),shape)-cut>=T2(x)}
    lift=p.get('lift',0)
    body={(x,y) for x in bot for y in range(T2(x)-lift,bot[x]+1)}
    extra={(x,bot[x]+1) for x in bot} if EXTRA_ROW else set()
    gold=set(); dark=set(); g=p.get('gold','g1')
    for x in bot:
        gold.add((x,bot[x]))
        for xn in (x-1,x+1):
            if xn in bot:
                for y in range(bot[xn]+1,bot[x]+1):
                    if (x,y) in body: gold.add((x,y))
        b=bot[x]
        if g=='g2' and (x,b-1) in body: gold.add((x,b-1))
        if g in ('g3','g6','g7') and (x,b-1) in body: dark.add((x,b-1))
        if g=='g4' and x%2==0 and (x,b-1) in body: gold.add((x,b-1))
        if g=='g5' and (x,b-2) in body: gold.add((x,b-2))
        if g=='g5u' and (x,b-2) in body: dark.add((x,b-2))
        if g=='g1s':
            for dy in (2,4):
                if (x,b-dy) in body: SHADE_PX.add((x,b-dy))
        if g=='g5s':
            if (x,b-2) in body: gold.add((x,b-2))
            if (x,b-4) in body: SHADE_PX.add((x,b-4))
        if g=='g5k':
            for dy in (2,4):
                if (x,b-dy) in body: gold.add((x,b-dy))
    return body|extra,gold,dark-gold
def clipped(pix,xmin=4,notch_left=False):
    """Rechts abschneiden: ab Spalte 24 (Symbol/Fenster) und ein Pixel Rand um den Buchstaben unten rechts (Spalte >=23, Zeile 33 bis 41)."""
    return {(x,y) for (x,y) in pix if xmin<=x<=23 and not (x>=23 and 33<=y<=41) and not (notch_left and x<=8 and 33<=y<=41)}
_old_dyn=dyn_body
def dyn_body(suit,p):
    if str(p.get('shape','')).startswith('sy_'):
        body,gold,dark=full_shape(p); L=Layer(); robe=inkOf(suit); xm=p.get('xmin',4); nl=p.get('notch_left',False)
        for (x,y) in clipped(body,xm,nl): L.put(x,y,robe)
        dcol={'g3':GOLD2,'g6':C['inkL'],'g7':C['red'],'g5u':p.get('upper',C['inkL'])}.get(p.get('gold','g1'),GOLD2)
        for (x,y) in clipped(dark,xm,nl): L.put(x,y,dcol)
        if SHADE_PX:   # Schattenlinien: bei dunkler Kleidung aufgehellt, bei heller abgedunkelt (Formel)
            from tiefe import hsl_shift, glanz
            import colorsys
            lum=colorsys.rgb_to_hls(*[v/255 for v in robe[:3]])[1]
            sc=glanz(robe) if lum<0.3 else hsl_shift(robe,-0.13,1.10)
            for (x,y) in clipped(set(SHADE_PX),xm,nl): L.put(x,y,sc)
        for (x,y) in clipped(gold,xm,nl): L.put(x,y,C['gold'])
        return L
    return _old_dyn(suit,p)
