from comp import *
import bust
from PIL import ImageDraw
RED2=hx('a02a20'); WHITEHAIR=hx('f3f0ea'); bg=(0xf2,0xe6,0xd0)
def mk(hat,beard,hair,extra,dyn,**pal): return dict(body='leer',hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal,dyn=dyn)
def herz(dyn): return mk('turban_moghul','lang','kurz',('brauen','nase'),dyn,A=C['white'],a=SHADE,J=C['red'],H=GRAY_BEARD,B=GRAY_BEARD)
def bube(dyn): return mk('fez_A','keiner','pony_a',(),dyn,A=C['red'],a=RED2)
def pik(dyn): return mk('z_a11','keiner','lang_z',('monokel_l',),dyn,H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)
TYPES=[('Herz König','H',13,herz,'schlagschatten'),('Karo Bube','D',11,bube,'ohne'),('Pik König','S',13,pik,'schlagschatten')]
def render(t,dyn): n,suit,rank,fn,em=t; return card(suit,rank,fn(dyn),em,'cut1')
NAMES={'sy_halb':'1  Halbkreis','sy_bogen':'2  flacher Bogen','sy_trapez':'3  Trapez 45°','sy_treppe_fein':'4  Treppe fein\n(2 breit, 1 hoch)','sy_treppe_grob':'5  Treppe grob\n(3 breit, 2 hoch)','sy_pyramide':'6  Pyramide\n(3 Stufen)','sy_treppe_breit':'7  Treppe breit\n(Plateau + 2 Stufen)','sy_spitze':'8  Spitze','sy_glocke':'9  Glocke\n(schmal und tief)'}
pad=10;S=4
cw=W*S+pad; rh=H*S+pad
sh=Image.new('RGB',(9*cw+pad,26+3*rh+50),bg);d=ImageDraw.Draw(sh)
d.text((pad,6),'Perfekt symmetrische Büste (links +4), rechts nur abgeschnitten',fill=C['ink'],font=FONTB)
for ci,s in enumerate(bust.SYM_SHAPES):
    x=pad+ci*cw
    for ri,t in enumerate(TYPES):
        im=render(t,dict(xl=4,shape=s,gold='g1')); b=scaled(im,S); sh.paste(b,(x,26+ri*rh),b)
    d.multiline_text((x,26+3*rh+2),NAMES[s],fill=C['ink'],font=FONT)
sh.save('r7_formen.png');print(sh.size)

# Symmetrie-Nachweis mit Geisterbild des abgeschnittenen Teils
S2=8; box=(0,22,32,42); tw=(box[2]-box[0])*S2; th=(box[3]-box[1])*S2
shapes=['sy_halb','sy_treppe_fein','sy_treppe_grob','sy_pyramide','sy_treppe_breit','sy_glocke']
sh=Image.new('RGB',(3*(tw+pad)+pad,2*(th+pad+44)+34),bg);d=ImageDraw.Draw(sh)
d.text((pad,6),'Symmetrie-Nachweis: blau = Kartenmitte, blass = abgeschnittener rechter Teil (Spiegelbild)',fill=C['ink'],font=FONTB)
for i,s in enumerate(shapes):
    p=dict(xl=4,shape=s,gold='g1')
    im=render(TYPES[0],p).crop(box); big=im.resize((tw,th),Image.NEAREST).convert('RGBA')
    ghost=Image.new('RGBA',big.size,(0,0,0,0)); gd=ImageDraw.Draw(ghost)
    body,gold,dark=bust.full_shape(p); cut=body-bust.clipped(body); gcut=gold-bust.clipped(gold)
    for (x,y) in cut:
        if 0<=x<32 and box[1]<=y<box[3]:
            col=(0xf2,0xb5,0x3a,150) if (x,y) in gcut else (0xd2,0x36,0x2a,70)
            gd.rectangle([(x-box[0])*S2,(y-box[1])*S2,(x-box[0]+1)*S2-1,(y-box[1]+1)*S2-1],fill=col)
    big.alpha_composite(ghost)
    dd=ImageDraw.Draw(big); dd.line([(16*S2,0),(16*S2,th)],fill=(0x2a,0x7f,0xd9,255),width=2)
    x=pad+(i%3)*(tw+pad); y=30+(i//3)*(th+pad+44)
    sh.paste(big,(x,y),big); d.multiline_text((x,y+th+6),NAMES[s],fill=C['ink'],font=FONT)
sh.save('r7_symmetrie.png');print(sh.size)

# Goldkante: Varianten an drei Formen
GD=[('G1  1 px','g1'),('G2  2 px','g2'),('G3  Gold +\ndunkles Gold','g3'),('G4  Perlen','g4'),('G5  Doppellinie','g5')]
S3=6; box=(0,22,32,42); tw=(box[2]-box[0])*S3; th=(box[3]-box[1])*S3
sh=Image.new('RGB',(5*(tw+pad)+pad,3*(th+pad+30)+34),bg);d=ImageDraw.Draw(sh)
d.text((pad,6),'Goldkante: G1 1 px, G2 2 px, G3 Gold + dunkles Gold, G4 Perlen, G5 Doppellinie (Formen 1, 5 und 6)',fill=C['ink'],font=FONTB)
for ri,s in enumerate(['sy_halb','sy_treppe_grob','sy_pyramide']):
    for ci,(lab,g) in enumerate(GD):
        im=render(TYPES[0],dict(xl=4,shape=s,gold=g)).crop(box).resize((tw,th),Image.NEAREST)
        x=pad+ci*(tw+pad); y=30+ri*(th+pad+30); sh.paste(im,(x,y))
        d.text((x,y+th+4),'Form '+NAMES[s].split()[0]+' / '+lab.split('  ')[0],fill=C['ink'],font=FONT)
sh.save('r7_gold.png');print(sh.size)
