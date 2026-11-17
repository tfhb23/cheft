from comp import *
from PIL import ImageDraw
RED2=hx('a02a20'); WHITEHAIR=hx('f3f0ea')
def sp(hat,beard='keiner',hair='kurz',extra=(),body='platz',**pal): return dict(body=body,hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal)
HERZ=sp('turban_moghul','lang','kurz',A=C['white'],a=SHADE,J=C['red'],H=GRAY_BEARD,B=GRAY_BEARD)
def bube(h): return sp(h,'keiner','pony',A=C['red'],a=RED2)
PIK=sp('z_a11','keiner','lang',['monokel'],H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)
bg=(0xf2,0xe6,0xd0)
# --- Bild 1: die drei Typen groß
S=9;pad=24;cw=W*S+pad
sh=Image.new('RGB',(3*cw+pad,H*S+pad*2+50),bg);d=ImageDraw.Draw(sh)
items=[('Herz König\nTurban C (Moghul, Juwel + Feder)','H',13,HERZ,'schlagschatten'),
       ('Karo Bube\nFez (hoch, eckig, 1 px Rundung)','D',11,bube('fez_A'),'ohne'),
       ('Pik König\nZylinder A, Monokel, ohne Bart','S',13,PIK,'schlagschatten')]
for i,(lab,suit,rank,spec,em) in enumerate(items):
    x=pad+i*cw; im=scaled(card(suit,rank,spec,em),S); sh.paste(im,(x,pad),im)
    d.multiline_text((x,pad+H*S+10),lab,fill=C['ink'],font=FONT)
sh.save('r3_typen.png');print(sh.size)
# --- Bild 2: Fez-Details (Kopf-Ausschnitt, stark vergrößert)
def crop(suit,rank,spec,em='ohne',box=(6,1,26,26),S=14):
    im=card(suit,rank,spec,em).crop(box); return im.resize((im.width*S,im.height*S),Image.NEAREST)
fez=[('B  Original\n(Referenz)','fez_kurz'),('B4  bisher\n(Kordel falsch)','fez_old'),('B4 neu\nKordel wie B','fez_B4'),('A  eckig,\n1 px Rundung','fez_A'),('C  konisch +\nRundung (2 Stufen)','fez_C')]
import parts as P
# alte B4 zum Vergleich (alte Kordel)
P.HAT['fez_old']=P.fez_rows(9,1)
S2=11;pad=16
tiles=[crop('D',11,bube(h),S=S2) for _,h in fez]
tw,th=tiles[0].size
sh=Image.new('RGB',(len(tiles)*(tw+pad)+pad,th+pad*2+44),bg);d=ImageDraw.Draw(sh)
for i,((lab,_),t) in enumerate(zip(fez,tiles)):
    x=pad+i*(tw+pad); sh.paste(t,(x,pad),t); d.multiline_text((x,pad+th+8),lab,fill=C['ink'],font=FONT)
sh.save('r3_fez.png');print(sh.size)
# --- Bild 3: Zylinder, Oberkante auf Höhe des K
tiles=[('vorher (4 px unter K-Oberkante)','z_gerade'),('neu (Oberkante = K)','z_a11')]
S3=11
imgs=[]
for lab,h in tiles:
    spec=sp(h,'keiner','lang',['monokel'],H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)
    im=card('S',13,spec,'schlagschatten').crop((0,0,32,28)); big=im.resize((32*S3,28*S3),Image.NEAREST).convert('RGBA')
    dd=ImageDraw.Draw(big); y=3*S3
    dd.line([(0,y),(32*S3,y)],fill=(0x2a,0x7f,0xd9,255),width=2)
    imgs.append((lab,big))
sh=Image.new('RGB',(2*(32*S3+pad)+pad,28*S3+pad*2+30),bg);d=ImageDraw.Draw(sh)
for i,(lab,b) in enumerate(imgs):
    x=pad+i*(32*S3+pad); sh.paste(b,(x,pad),b); d.text((x,pad+28*S3+8),lab,fill=C['ink'],font=FONT)
sh.save('r3_zylinder.png');print(sh.size)
