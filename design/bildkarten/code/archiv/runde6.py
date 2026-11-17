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
def lowest(shape,xl=4):
    v={x:bust.B(x,shape,xl) for x in range(xl,24) if bust.B(x,shape,xl)>=bust.T(x)}
    m=max(v.values()); return m,[x for x in v if v[x]==m]
def with_guide(im,S,shape=None):
    big=scaled(im,S).convert('RGBA'); d=ImageDraw.Draw(big)
    d.line([(16*S,0),(16*S,H*S)],fill=(0x2a,0x7f,0xd9,200),width=1)       # Kartenmitte
    if shape:
        m,cols=lowest(shape); y=(m+1)*S
        d.line([(cols[0]*S,y+2),((cols[-1]+1)*S,y+2)],fill=(0xd9,0x2a,0x2a,255),width=2)   # tiefster Abschnitt
    return big
pad=12;S=5
FORMS=[('B weit\nHalbkreis tief','halb_sym'),('B rund\nHalbkreis tief,\nmit Flügel links','halb_rund'),('C weit\nflacher Bogen','bueste_sym'),('C rund\nflacher Bogen,\nmit Flügel links','bueste_rund')]
cw=W*S+pad; rh=H*S+pad
sh=Image.new('RGB',(max(len(FORMS)*cw+pad,560),30+3*rh+130),bg);d=ImageDraw.Draw(sh)
d.text((pad,6),'Büste, tiefster Punkt mittig (blau = Kartenmitte, rot = tiefster Abschnitt)',fill=C['ink'],font=FONTB)
for ci,(lab,shape) in enumerate(FORMS):
    x=pad+ci*cw
    for ri,t in enumerate(TYPES):
        im=render(t,dict(xl=4,shape=shape,gold='g1')); g=with_guide(im,S,shape); sh.paste(g,(x,26+ri*rh),g)
    m,cols=lowest(shape)
    d.multiline_text((x,26+3*rh+2),lab+'\ntiefste Zeile %d\nSpalten %d bis %d\nMitte %.1f'%(m,cols[0],cols[-1],(cols[0]+cols[-1]+1)/2),fill=C['ink'],font=FONT)
sh.save('r6_buste.png');print(sh.size)

# Nahaufnahme unten, vorher/nachher
CR=[('B  vorher\n(Mitte bei 15,5)','halb'),('B  neu weit','halb_sym'),('B  neu rund','halb_rund'),('C  vorher\n(Mitte bei 15,5)','bueste'),('C  neu weit','bueste_sym'),('C  neu rund','bueste_rund')]
S2=9; box=(0,22,32,42)
tw=(box[2]-box[0])*S2; th=(box[3]-box[1])*S2
sh=Image.new('RGB',(3*(tw+pad)+pad,2*(th+pad+44)+30),bg);d=ImageDraw.Draw(sh)
d.text((pad,6),'Nahaufnahme Herz König: Unterkante vorher / neu (blau: Kartenmitte)',fill=C['ink'],font=FONTB)
for i,(lab,shape) in enumerate(CR):
    im=render(TYPES[0],dict(xl=4,shape=shape,gold='g1')).crop(box)
    big=im.resize((tw,th),Image.NEAREST).convert('RGBA'); dd=ImageDraw.Draw(big)
    dd.line([(16*S2,0),(16*S2,th)],fill=(0x2a,0x7f,0xd9,255),width=2)
    m,cols=lowest(shape)
    dd.line([(cols[0]*S2,(m+1-22)*S2+3),((cols[-1]+1)*S2,(m+1-22)*S2+3)],fill=(0xd9,0x2a,0x2a,255),width=3)
    x=pad+(i%3)*(tw+pad); y=30+(i//3)*(th+pad+44)
    sh.paste(big,(x,y),big); d.multiline_text((x,y+th+6),lab,fill=C['ink'],font=FONT)
sh.save('r6_nahaufnahme.png');print(sh.size)
