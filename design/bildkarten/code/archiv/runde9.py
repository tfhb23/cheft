from comp import *
import bust
from PIL import ImageDraw
WHITEHAIR=hx('f3f0ea'); bg=(0xf2,0xe6,0xd0); pad=10
def mk(hat,beard,hair,extra,dyn,**pal): return dict(body='leer',hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal,dyn=dyn)
def king(xmin=5): return mk('z_a11','keiner','lang_z',('monokel_l',),dict(xl=4,xmin=xmin,shape='sy_halb',gold='g5'),H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)
def bube(xmin=5): return mk([],'keiner','topf_b',('brille_m',),dict(xl=4,xmin=xmin,shape='sy_halb',gold='g1'),H=WHITEHAIR,S=SKIN_PALE)
def dame(gl='brille_dick_v1',hair='bob_kinn2',upper=hx('b9b3ad'),xmin=5): return mk([],'keiner',hair,(gl,),dict(xl=4,xmin=xmin,shape='sy_halb',gold='g5u',upper=upper),H=WHITEHAIR,S=SKIN_PALE,M=C['red'])
def R(rank,spec): return card('S',rank,spec,'schlagschatten','cut1')
def lab(d,x,y,t): d.multiline_text((x,y),t,fill=C['ink'],font=FONT)
# A) Master mit allen Änderungen
S=6; cw=W*S+pad
items=[('König (Master)\nlinke Schulter -1 px',13,king()),('Bube\nTopfschnitt B, Brille M',11,bube()),('Dame Version 1\nBrille dick, Kante 1 px tiefer',12,dame()),('Dame Version 2\nobere Kante 2 px dick',12,dame('brille_dick_v2'))]
im=Image.new('RGB',(len(items)*cw+pad,H*S+80),bg);d=ImageDraw.Draw(im)
for i,(l,rank,sp) in enumerate(items):
    c=scaled(R(rank,sp),S); im.paste(c,(pad+i*cw,pad),c); lab(d,pad+i*cw,pad+H*S+6,l)
im.save('r9_master.png');print(im.size)
# B) linke Schulter vorher/nachher
S2=9; box=(0,20,32,42); tw=(box[2]-box[0])*S2; th=(box[3]-box[1])*S2
im=Image.new('RGB',(2*(tw+pad)+pad,th+pad*2+50),bg);d=ImageDraw.Draw(im)
for i,(l,xm) in enumerate([('vorher: Körper beginnt in Spalte 4',4),('nachher: 1 Pixel mehr abgeschnitten, ab Spalte 5',5)]):
    c=R(13,king(xm)).crop(box).resize((tw,th),Image.NEAREST); im.paste(c,(pad+i*(tw+pad),pad)); lab(d,pad+i*(tw+pad),pad+th+6,l)
    dd=ImageDraw.Draw(im); x=pad+i*(tw+pad)+xm*S2; dd.line([(x,pad),(x,pad+th)],fill=(0x2a,0x7f,0xd9),width=2)
im.save('r9_links.png');print(im.size)
# C) Dame Brille: vorher / V1 / V2 (Kopf-Ausschnitt)
S3=12; box=(6,8,26,28); tw=(box[2]-box[0])*S3; th=(box[3]-box[1])*S3
V=[('vorher\nBob kinnlang,\nobere Kante Zeile 12','bob_kinn','brille_l_dick'),('Version 1\nBob 1 px länger,\nobere Kante Zeile 13','bob_kinn2','brille_dick_v1'),('Version 2\nobere Kante 2 px dick\n(Zeile 13 und 14)','bob_kinn2','brille_dick_v2')]
im=Image.new('RGB',(3*(tw+pad)+pad,th+pad*2+60),bg);d=ImageDraw.Draw(im)
for i,(l,h,g) in enumerate(V):
    c=R(12,dame(g,h)).crop(box).resize((tw,th),Image.NEAREST); im.paste(c,(pad+i*(tw+pad),pad)); lab(d,pad+i*(tw+pad),pad+th+6,l)
im.save('r9_dame_brille.png');print(im.size)
# D) Dame: obere Linie nicht gold
UP=[('grau','b9b3ad'),('dunkelgrau','8a847e'),('rot','d2362a'),('weiß','ffffff'),('dunkles Gold-Braun','8a5a1a')]
S4=6; cw=W*S4+pad
im=Image.new('RGB',(len(UP)*cw+pad,H*S4+110),bg);d=ImageDraw.Draw(im)
d.text((pad,4),'Dame: untere Linie Gold, obere Linie in anderer Farbe',fill=C['ink'],font=FONTB)
for i,(n,h) in enumerate(UP):
    c=scaled(R(12,dame(upper=hx(h))),S4); im.paste(c,(pad+i*cw,26),c)
    z=R(12,dame(upper=hx(h))).crop((4,30,28,40)).resize((24*3,10*3),Image.NEAREST); im.paste(z,(pad+i*cw,26+H*S4+8))
    lab(d,pad+i*cw,26+H*S4+8+30+4,'obere Linie:\n'+n)
im.save('r9_dame_gold.png');print(im.size)
