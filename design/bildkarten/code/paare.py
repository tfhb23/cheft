"""Zweite Personen (Zwillinge) für die 7 offenen Karten: Entwürfe in Endkoordinaten.
Basis = Gesicht/Körper/Brauen/Nase/Mund/Brille der ersten Person; Kopfbedeckung, Haar und Bart werden als ASCII-Art in die fertige Figur gezeichnet.
Raster: Spalte 0-15 (Mitte = Spalte 8, Gesicht Spalte 4-12, Torso Spalte 10-22 -> Raster 2-14), Augenzeile 17, Brauen 16, Nase 18, Mund 21, Gesicht Zeile 15-23.
Buchstaben: S Haut, H Haar, B Bart, G Gold, W Weiß (A mit pal), A Hauptfarbe der Kopfbedeckung, a Falte von A, R Kleidungsrot/-schwarz (flach), L helle Stufe von R,
J Edelstein (orange), Z Hutband (orange), K Schwarz, F/Y Feder gold, h dunkle Haarstufe, w helle Haarstufe, '.' löscht, ' ' lässt unverändert."""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import final_layout as F
from final_layout import *
from final_auswahl import *
import masters_v2 as MV
import comp as CP
from PIL import Image, ImageDraw

# ---------- Zeichen-Helfer: jede Funktion liefert {Zeile: 16-Zeichen-String}, ' ' = unverändert
def _blank(): return [' ']*16
def ctr(s,c=8):
    n=len(s); x0=c-n//2; r=_blank()
    for i,ch in enumerate(s):
        if 0<=x0+i<16: r[x0+i]=ch
    return ''.join(r)
def at(x0,s):
    r=_blank()
    for i,ch in enumerate(s):
        if 0<=x0+i<16: r[x0+i]=ch
    return ''.join(r)
def merge(*ds):
    out={}
    for d in ds:
        for y,s in d.items():
            out[y]=''.join(b if b!=' ' else a for a,b in zip(out[y],s)) if y in out else s
    return out
def stack(y0,widths,ch,c=8): return {y0+i:ctr(ch*w,c) for i,w in enumerate(widths)}
def line(y,x0,x1,ch): return {y:at(x0,ch*(x1-x0+1))}
def pix(cells,ch):
    d={}
    for x,y in cells:
        r=list(d.get(y,' '*16)); r[x]=ch; d[y]=''.join(r)
    return d
def rows(y0,*strs):
    """freie Zeilen ab y0, jede Zeile 16 Zeichen oder kürzer (linksbündig ab Spalte 0), ' ' unverändert"""
    return {y0+i:s.ljust(16)[:16] for i,s in enumerate(strs)}
def paint(g,d):
    for y,s in d.items():
        r=list(g.get(y,'.'*16))
        for x,ch in enumerate(s):
            if ch!=' ': r[x]=ch
        g[y]=''.join(r)
    return g
def art(*ds):
    D=merge(*ds)
    return lambda g: paint(dict(g),D)

# ---------- Bausteine Könige (Haarkranz unter dem Hut, Bärte)
def kh(top=True,ch='H',cheek='B'):
    """Haar am Kopf wie bei den ersten Personen: Zeile 15 voll, Seiten Spalte 3 und 13 bis Zeile 18, Wangen-Bart"""
    d=pix([(3,y) for y in (15,16,17,18)]+[(13,y) for y in (15,16,17,18)],ch)
    if top: d=merge(d,line(15,3,13,ch))
    if cheek: d=merge(d,pix([(4,18),(12,18)],cheek))
    return d
def mouth_keep(d,y=21):
    if y in d: r=list(d[y]); r[8]=' '; d[y]=''.join(r)
    return d
def beard(kind,ch='B'):
    if kind=='lang': d=merge(line(19,4,12,ch),line(20,4,12,ch),line(21,4,12,ch),line(22,4,12,ch),line(23,5,11,ch),line(24,6,10,ch),line(25,6,10,ch),line(26,7,9,ch))
    elif kind=='mittel': d=merge(line(19,4,12,ch),line(20,4,12,ch),line(21,4,12,ch),line(22,4,12,ch),line(23,5,11,ch),line(24,6,10,ch),line(25,7,9,ch))
    elif kind=='kurz': d=merge(line(19,4,12,ch),line(20,4,12,ch),line(21,4,12,ch),line(22,5,11,ch),line(23,7,9,ch))
    elif kind=='rund': d=merge(line(19,4,12,ch),line(20,4,12,ch),line(21,4,12,ch),line(22,4,12,ch),line(23,5,11,ch),line(24,7,9,ch))
    elif kind=='spitz': d=merge(line(19,5,11,ch),line(20,5,11,ch),line(21,5,11,ch),line(22,6,10,ch),line(23,7,9,ch),line(24,8,8,ch),line(25,8,8,ch))
    elif kind=='gabel': d=merge(line(19,4,12,ch),line(20,4,12,ch),line(21,4,12,ch),line(22,4,12,ch),line(23,5,11,ch),line(24,5,7,ch),line(24,9,11,ch),line(25,5,6,ch),line(25,10,11,ch))
    elif kind=='doppelspitz': d=merge(line(19,4,12,ch),line(20,4,12,ch),line(21,4,12,ch),line(22,4,12,ch),line(23,4,7,ch),line(23,9,12,ch),line(24,5,6,ch),line(24,10,11,ch))
    elif kind=='schnurr_kinn': d=merge(line(20,5,11,ch),line(22,7,9,ch),line(23,7,9,ch),line(24,8,8,ch))
    elif kind=='voll_kurz': d=merge(line(19,4,12,ch),line(20,4,12,ch),line(21,4,12,ch),line(22,4,12,ch),line(23,5,11,ch))
    else: raise ValueError(kind)
    return mouth_keep(d)

# ---------- Rendern
def base_spec(name):
    s,r,em,sp=MV.spec_v2(name)
    sp=copy.deepcopy(sp)
    sp['hat']=[]; sp['hair']='glatze'; sp['beard']='keiner'; sp.pop('hair_px',None); sp.pop('grid_fn',None)
    return s,r,sp
def render_art(name,fn,pal=None,extra=None):
    s,r,sp=base_spec(name)
    if pal: sp['pal'].update(pal)
    if extra is not None: sp['extra']=list(extra)
    sp=dict(sp,shrink=[],chin=True,trim=F.TRIM,flat=True,flat_cut=True,dy=F.DY,grid_fn=fn)
    return card(s,r,sp,'schlagschatten',F.MODE)

def sheet(name,variants,out,cols=5,S=6,title=None):
    """variants: [(Label, fn, pal)] ; erstes Feld links oben = aktuelle erste Person (Referenz)"""
    tiles=[('Person 1 (aktuell)',render_final(name))]
    for v in variants:
        im=render_art(name,v[1],v[2],v[3] if len(v)>3 else None); tiles.append((v[0],im))
        g=CP.LAST_GRID; ys=[y for y,r in g.items() if set(r)-{'.'}]; top=min(ys)
        gaps=[y for y in range(top,16) if not (set(g.get(y,'.'*16))-{'.'})]
        if gaps: print('LÜCKE',name,v[0],'Zeilen',gaps)
        if top<5: print('ZU HOCH',name,v[0],'oberste Zeile',top)
        w=[x for r in g.values() for x,ch in enumerate(r) if ch!='.']
        if min(w)<2 or max(w)>14: print('ZU BREIT',name,v[0],min(w),max(w))
    cw=W*S+10; chh=H*S+26; rowsn=(len(tiles)+cols-1)//cols
    sh=Image.new('RGB',(cols*cw+10,rowsn*chh+34),BG); d=ImageDraw.Draw(sh)
    d.text((8,6),title or name,fill=INK,font=FONTB)
    for i,(lb,im) in enumerate(tiles):
        x=8+(i%cols)*cw; y=34+(i//cols)*chh
        d.text((x,y),lb,fill=INK,font=FONT)
        sh.paste(im.resize((W*S,H*S),Image.NEAREST),(x,y+20))
    sh.save(out)
    Z=9; bw,bh=16*Z+10,26*Z+32; cols2=5; r2=(len(tiles)+cols2-1)//cols2
    dt=Image.new('RGB',(cols2*bw+10,r2*bh+34),BG); d2=ImageDraw.Draw(dt); d2.text((8,6),(title or name)+' (Detail)',fill=INK,font=FONTB)
    for i,(lb,im) in enumerate(tiles):
        x=8+(i%cols2)*bw; y=34+(i//cols2)*bh
        import textwrap
        for li,tl in enumerate(textwrap.wrap(lb,19)[:2]): d2.text((x,y+li*14),tl,fill=INK,font=FONT)
        dt.paste(im.crop((9,6,25,32)).resize((16*Z,26*Z),Image.NEAREST),(x,y+30))
    dt.save(out.replace('.png','_detail.png')); return sh
