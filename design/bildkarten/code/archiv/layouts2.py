from lib import *
import art, art2, math
from PIL import ImageChops

# ---------- Teil 1: H überarbeitet -------------
def kopf2(rank):
    """H überarbeitet: 16 Zeilen, Kopf 1 Zeile tiefer, Körper voll breit bis zur Mitte."""
    k=art.KOPF[rank]
    if rank==13: head=k[:12]; body=['.RRRRWWKWWRRRR.','RRRRRRWWWRRRRRR','RRRGRRRWRRRGRRR','RRRRRRRWRRRRRRR']
    elif rank==12: head=k[:10]; body=['.HHHRRWWWRRHHH.','.HHRRRRWRRRRHH.','HHRRRGRWRGRRRHH','HRRRRRRWRRRRRRH','RRRRRRRWRRRRRRR','RRRRRRRWRRRRRRR']
    else: head=k[:11]; body=['..RRWWKSKWWRR..','.RRRRWWWWWRRRR.','RRRLRRRWRRRLRRR','RRRRRRRWRRRRRRR','RRRRRRRWRRRRRRR']
    rows=head+body
    assert len(rows)==16 and all(len(r)==15 for r in rows),(rank,len(rows),[len(r) for r in rows])
    return rows
def rot_shift(layer,dy):
    r=layer.rot(); n=Layer(); n.im.paste(r.im,(0,dy)); n.p=n.im.load(); return n
def H_alt(suit,rank): return L_kopf_free(suit,rank)
def L_kopf_free(suit,rank):
    t=Layer(); t.art(art.KOPF[rank],13,4,fmap(suit,rank)); return finish_pt(t,suit,rank)
def finish_pt(top,suit,rank,under=None,over=None,shift=0):
    card=base()
    if under: card.over(under)
    card.over(top); card.over(rot_shift(top,shift) if shift else top.rot())
    if over: card.over(over)
    idx=index_layer(suit,rank); card.over(idx); card.over(idx.rot())
    return card.im
def H2a(suit,rank):   # symmetrisch, 2 px Lücke (weiß) in der Mitte
    t=Layer(); t.art(kopf2(rank),13,5,fmap(suit,rank))
    over=Layer(); over.rect(1,21,30,22,C['white'])
    return finish_pt(t,suit,rank,under=None,over=over)
def H2b(suit,rank):   # exakt 1 px weiße Linie, unteres Portrait dafür 1 px höher
    t=Layer(); t.art(kopf2(rank),13,5,fmap(suit,rank))
    over=Layer(); over.rect(1,21,30,21,C['white'])
    card=base(); card.over(t); card.over(rot_shift(t,-1)); card.over(over)
    idx=index_layer(suit,rank); card.over(idx); card.over(idx.rot()); return card.im

# ---------- Teil 2: ohne Spiegelung -------------
def index_both(card,suit,rank):
    idx=index_layer(suit,rank); card.over(idx); card.over(idx.rot())
def suit_visible(portrait,suit):
    tot=hid=0
    for ry,r in enumerate(SH[suit]):
        for rx,ch in enumerate(r):
            if ch=='#':
                tot+=1; hid+= portrait.p[3+rx,11+ry][3]>0
    return 1-hid/tot
def fig_layer(suit,rank,body_rows,y,x=8,cover=None,tint=None):
    t=Layer(); n=len(HEAD_ROWS(rank,body_rows))
    if cover: t.rect(x,y,x+15,y+n-1,C['cream'])
    t.art(HEAD_ROWS(rank,body_rows),x,y,fmap(suit,rank)); return t
def HEAD_ROWS(rank,body_rows): return art2.figure16(rank,body_rows)

def N1(suit,rank,ret=False):  # Figur im cremefarbenen Ausschnitt, kein Rahmen, Symbol ca. 2/3 sichtbar
    p=Layer(); rows=HEAD_ROWS(rank,9); n=len(rows); y=(H-n)//2
    p.rect(8,y,23,y+n-1,C['cream']); p.art(rows,8,y,fmap(suit,rank))
    card=base(); index_both(card,suit,rank); card.over(p)
    return (card.im,p) if ret else card.im
def N2(suit,rank,ret=False,w=16):  # Figur auf getönter Fläche (Hochformat-Panel)
    p=Layer(); rows=HEAD_ROWS(rank,9); n=len(rows); y=(H-n)//2
    x0=(W-w)//2; p.rect(x0,y-3,x0+w-1,y+n+2,lightOf(suit)); p.art(rows,8,y,fmap(suit,rank))
    card=base(); index_both(card,suit,rank); card.over(p)
    return (card.im,p) if ret else card.im
def N3(suit,rank,ret=False):  # Medaillon: runder Ring, Kopf darin; Symbol praktisch frei
    p=Layer(); rows=HEAD_ROWS(rank,3)[:16] if False else art2.figure16(rank,3)
    n=len(rows); y=(H-n)//2+1
    fm=fmap(suit,rank); lt=lightOf(suit)
    fig=Layer(); fig.art(rows,8,y,fm)
    for yy in range(H):
        for xx in range(W):
            d=math.hypot(xx+.5-16,yy+.5-22)
            if d<=10.0:
                p.put(xx,yy,C['cream'])
                if fig.p[xx,yy][3]: p.p[xx,yy]=fig.p[xx,yy]
            elif d<=11.0: p.put(xx,yy,lt)
    card=base(); index_both(card,suit,rank); card.over(p)
    return (card.im,p) if ret else card.im
def N4(suit,rank,ret=False):  # Vollfigur, frei, ohne Fenster
    p=Layer(); rows=HEAD_ROWS(rank,22); n=len(rows); y=(H-n)//2
    p.art(rows,8,y,fmap(suit,rank))
    card=base(); index_both(card,suit,rank); card.over(p)
    return (card.im,p) if ret else card.im
EMB={11:['..........FF....','.........FF.....','....RRRRRRRR....','..RRRRRRRRRRRR..','.RRRRRRRRRRRRRR.','RRRRRRRRRRRRRRRR','GGGGGGGGGGGGGGGG','.RRRRRRRRRRRRRR.'],}
def emblem(rank):
    if rank==11: return EMB[11]
    rows=art2.crown(3 if rank==13 else 1)
    rows=[list(r) for r in rows]
    if rank==13:
        for x in (2,7,8,13): rows[-2][x]='R'
    else:
        for x in (1,2,7,8,13,14): rows[0][x]='W'
        rows[-2][7]='R'; rows[-2][8]='R'
    return [''.join(r) for r in rows]
def big_suit(L,suit,x,y):
    rows=[]
    for r in SH[suit]:
        d=''.join(c*2 for c in r); rows+= [d,d]
    L.mask(rows,x,y,inkOf(suit))
def N5(suit,rank,ret=False):  # Emblem (Krone/Hut) + großes Farbsymbol, keine Figur
    p=Layer(); e=emblem(rank); fm=fmap(suit,rank)
    ey=8; p.art(e,8,ey,fm)
    big_suit(p,suit,9,22)
    card=base(); index_both(card,suit,rank); card.over(p)
    return (card.im,p) if ret else card.im
def N6(suit,rank,ret=False):  # Rundbogenfenster, getönt, Figur steht unten
    p=Layer(); rows=HEAD_ROWS(rank,9); n=len(rows); lt=lightOf(suit)
    top,bot=5,38
    for yy in range(top,bot+1):
        for xx in range(8,24):
            if yy>=top+8 or math.hypot(xx+.5-16,yy+.5-(top+8))<=8: p.put(xx,yy,lt)
    p.art(rows,8,bot-n+1,fmap(suit,rank))
    card=base(); index_both(card,suit,rank); card.over(p)
    return (card.im,p) if ret else card.im
def N7(suit,rank,ret=False):  # Querband über die ganze Karte, Kopf bricht oben aus
    p=Layer(); rows=art2.figure16(rank,3); n=len(rows)
    p.rect(1,15,30,28,lightOf(suit)); p.art(rows,8,28-n+1,fmap(suit,rank))
    card=base(); index_both(card,suit,rank); card.over(p)
    return (card.im,p) if ret else card.im

NOMIRROR=[('N1  Fenster\nohne Rahmen',N1),('N2  Fläche\nHochformat',N2),('N3  Medaillon',N3),('N4  Vollfigur\nfrei',N4),
          ('N5  Emblem +\ngroßes Symbol',N5),('N6  Rundbogen\ngetönt',N6),('N7  Querband',N7)]

def N2w(w): return lambda s,r,ret=False: N2(s,r,ret,w)
