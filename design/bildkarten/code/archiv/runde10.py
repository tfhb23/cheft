from comp import *
import bust, parts as P
from PIL import ImageDraw
WHITEHAIR=hx('f3f0ea'); bg=(0xf2,0xe6,0xd0); pad=10
BROWN_GOLD=hx('8a5a1a')
def mk(hat,beard,hair,extra,dyn,**pal): return dict(body='leer',hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal,dyn=dyn)
def king(): return mk('z_a11','keiner','lang_z',('monokel_l',),dict(xl=4,xmin=5,shape='sy_halb',gold='g5'),H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)
def bube(): return mk([],'keiner','topf_b',('brille_m',),dict(xl=4,xmin=5,shape='sy_halb',gold='g1'),H=WHITEHAIR,S=SKIN_PALE)
def dame(gl): return mk([],'keiner','bob_kinn3',(gl,),dict(xl=4,xmin=5,shape='sy_halb',gold='g5u',upper=BROWN_GOLD),H=WHITEHAIR,S=SKIN_PALE,M=C['red'])
def R(rank,spec): return card('S',rank,spec,'schlagschatten','cut1')
def lab(d,x,y,t): d.multiline_text((x,y),t,fill=C['ink'],font=FONT)
VAR=[('A  Version 1\n(obere Kante Zeile 13)','brille_dick_v1'),('B  Version 1,\nKante 1 px tiefer\n(Zeile 14, 5 hoch)','brille_v1b'),('C  hohes Oval 6 px,\ndicker Steg,\nPupille 3. Pixel','brille_6p_dick'),('D  hohes Oval 6 px,\nohne Steg,\nPupille 3. Pixel','brille_6p')]
# 1) Karten
S=6;cw=W*S+pad
im=Image.new('RGB',(len(VAR)*cw+pad,H*S+90),bg);d=ImageDraw.Draw(im)
for i,(l,g) in enumerate(VAR):
    c=scaled(R(12,dame(g)),S); im.paste(c,(pad+i*cw,pad),c); lab(d,pad+i*cw,pad+H*S+6,l)
im.save('r10_dame_varianten.png');print(im.size)
# 2) Kopf-Ausschnitt mit Zeilenzählung von oben an der Brille
S2=14; box=(5,6,27,28); tw=(box[2]-box[0])*S2; th=(box[3]-box[1])*S2
im=Image.new('RGB',(len(VAR)*(tw+pad+20)+pad,th+pad*2+70),bg);d=ImageDraw.Draw(im)
for i,(l,g) in enumerate(VAR):
    x0=pad+i*(tw+pad+20)+20
    c=R(12,dame(g)).crop(box).resize((tw,th),Image.NEAREST); im.paste(c,(x0,pad))
    ys=sorted(P.EXTRA[g]); top=ys[0]
    for n,y in enumerate(ys,1):
        yy=pad+(y-box[1])*S2+S2//2-6
        col=(0xd9,0x2a,0x2a) if y==16 else C['ink']
        d.text((x0-16,yy),str(n),fill=col,font=FONT)
    lab(d,x0-16,pad+th+6,l+'\nrot = Pupillenzeile (Zeile 16)')
im.save('r10_dame_kopf.png');print(im.size)
# 3) Familie
items=[('König (Master)',13,king()),('Bube',11,bube()),('Dame A',12,dame('brille_dick_v1')),('Dame B',12,dame('brille_v1b')),('Dame C',12,dame('brille_6p_dick')),('Dame D',12,dame('brille_6p'))]
S3=5;cw=W*S3+pad
im=Image.new('RGB',(len(items)*cw+pad,H*S3+50),bg);d=ImageDraw.Draw(im)
for i,(l,rank,sp) in enumerate(items):
    c=scaled(R(rank,sp),S3); im.paste(c,(pad+i*cw,pad),c); lab(d,pad+i*cw,pad+H*S3+6,l)
im.save('r10_familie.png');print(im.size)
