from comp import *
import parts as P, textwrap
from PIL import ImageDraw, ImageFont
from masters import KING_DYN
bg=(0xf2,0xe6,0xd0); pad=10
BROWN=hx('5a3a24'); DBROWN=hx('4e2c16')
def v2dyn():
    d=dict(KING_DYN); d.update(xmin=8,notch_left=True,lift=1); return d
def spec(hat,beard,extra,**pal):
    return dict(body='leer',hair='kurz',beard=beard,hat=[hat],extra=list(extra),pal=pal,dyn=v2dyn(),lift=1)
KB=dict(H=BROWN,B=DBROWN,J=C['red'])
V=[('CK-c alt','breiter Zwirbelbart',spec('krone_k','zwirbel',('brauen',),**KB)),
   ('CK-i (Referenz)','Perlenkrone, Schnurrbart',spec('krone_perlen','schnurr',('brauen','nase'),**KB)),
   ('A  CK-c neu','Goldkrone, Schnurrbart wie CK-i',spec('krone_k','schnurr',('brauen','nase'),**KB)),
   ('B  ohne Nase','Schnurrbart, nur Brauen',spec('krone_k','schnurr',('brauen',),**KB)),
   ('C  schmaler','Schnurrbart nur 6 breit',spec('krone_k','schnurr_schmal',('brauen','nase'),**KB)),
   ('D  mit Kinnbart','Schnurrbart + kleiner Kinnbart',spec('krone_k','schnurr_ziege',('brauen','nase'),**KB))]
S=6; cw=W*S+pad
FB2=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',12)
im=Image.new('RGB',(len(V)*cw+pad,H*S+104),bg); d=ImageDraw.Draw(im)
for i,(n,dsc,sp) in enumerate(V):
    x=pad+i*cw; c=scaled(card('C',13,sp,'schlagschatten','symm'),S); im.paste(c,(x,pad),c)
    d.text((x,pad+H*S+4),n,fill=C['ink'],font=FB2); d.multiline_text((x,pad+H*S+22),'\n'.join(textwrap.wrap(dsc,22)[:3]),fill=C['ink'],font=FONT)
im.save('r18_kreuz_koenig.png'); print(im.size)
# Nahaufnahme der Gesichter
S2=14; box=(7,3,25,26); tw=(box[2]-box[0])*S2; th=(box[3]-box[1])*S2
im=Image.new('RGB',(len(V)*(tw+pad)+pad,th+pad*2+24),bg); d=ImageDraw.Draw(im)
for i,(n,dsc,sp) in enumerate(V):
    c=card('C',13,sp,'schlagschatten','symm').crop(box).resize((tw,th),Image.NEAREST); im.paste(c,(pad+i*(tw+pad),pad)); d.text((pad+i*(tw+pad),pad+th+4),n,fill=C['ink'],font=FB2)
im.save('r18_gesichter.png'); print(im.size)
