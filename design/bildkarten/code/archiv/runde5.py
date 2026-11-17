from comp import *
from PIL import ImageDraw
RED2=hx('a02a20'); WHITEHAIR=hx('f3f0ea'); bg=(0xf2,0xe6,0xd0)
def mk(hat,beard,hair,extra,dyn,**pal): return dict(body='leer',hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal,dyn=dyn)
def herz(dyn): return mk('turban_moghul','lang','kurz',('brauen','nase'),dyn,A=C['white'],a=SHADE,J=C['red'],H=GRAY_BEARD,B=GRAY_BEARD)
def bube(dyn): return mk('fez_A','keiner','pony_a',(),dyn,A=C['red'],a=RED2)
def pik(dyn,hair='lang_z'): return mk('z_a11','keiner',hair,('monokel_l',),dyn,H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)
TYPES=[('Herz König','H',13,herz,'schlagschatten'),('Karo Bube','D',11,bube,'ohne'),('Pik König','S',13,pik,'schlagschatten')]
def render(t,dyn,sym='cut1'):
    n,suit,rank,fn,em=t; return card(suit,rank,fn(dyn),em,sym)
def grid(title,cols,fname,S=5,note=None,crop=None,cS=9):
    """cols: Liste (Label, dyn). Zeilen = die drei Typen."""
    pad=12; cw=W*S+pad; rh=H*S+pad
    hh=30+len(TYPES)*rh+(46 if note else 36)
    sh=Image.new('RGB',(len(cols)*cw+pad,hh+((crop[3]-crop[1])*cS+pad if crop else 0)),bg);d=ImageDraw.Draw(sh)
    d.text((pad,6),title,fill=C['ink'],font=FONTB)
    for ci,(lab,dyn) in enumerate(cols):
        x=pad+ci*cw
        for ri,t in enumerate(TYPES):
            im=render(t,dyn); b=scaled(im,S); sh.paste(b,(x,26+ri*rh),b)
        d.multiline_text((x,26+len(TYPES)*rh+2),lab,fill=C['ink'],font=FONT)
        if crop:
            cr=render(TYPES[0],dyn).crop(crop); cr=cr.resize((cr.width*cS,cr.height*cS),Image.NEAREST)
            sh.paste(cr,(x,26+len(TYPES)*rh+50),cr)
    sh.save(fname); print(fname,sh.size)

FLACH=dict(xl=8,shape='flach',gold='g1')
# 1) Entscheidungen
pad=24;S=9;cw=W*S+pad
sh=Image.new('RGB',(3*cw+pad,H*S+pad*2+70),bg);d=ImageDraw.Draw(sh)
for i,t in enumerate(TYPES):
    im=scaled(render(t,FLACH),S); sh.paste(im,(pad+i*cw,pad),im)
    d.multiline_text((pad+i*cw,pad+H*S+8),t[0]+'\n'+['Brauen + Nase','Pony 1 Zeile','Haare unter dem Hut, Monokel links'][i]+'\nSymbol unten rechts: Option 1 (1 px mehr angeschnitten)',fill=C['ink'],font=FONT)
sh.save('r5_entscheidung.png');print(sh.size)

# 2) Pik-Haar: Fehler und Korrektur
def pk(hair): return card('S',13,pik(FLACH,hair),'schlagschatten','cut1')
S=12;pad=16
a=pk('lang').crop((4,0,28,26)); b=pk('lang_z').crop((4,0,28,26))
A=a.resize((a.width*S,a.height*S),Image.NEAREST).convert('RGBA'); Bm=b.resize((b.width*S,b.height*S),Image.NEAREST)
dd=ImageDraw.Draw(A)
for cx in (11,20):
    x=(cx-4)*S; y=12*S
    dd.ellipse([x-10,y-10,x+S+10,y+S+10],outline=(0xd9,0x2a,0x2a,255),width=3)
sh=Image.new('RGB',(2*(A.width+pad)+pad,A.height+pad*2+60),bg);d=ImageDraw.Draw(sh)
sh.paste(A,(pad,pad),A); sh.paste(Bm,(pad*2+A.width,pad),Bm)
d.multiline_text((pad,pad+A.height+8),'Vorher: Haar-Pixel stehen neben\nder Hutkrone über der Krempe (rot)',fill=C['ink'],font=FONT)
d.multiline_text((pad*2+A.width,pad+A.height+8),'Nachher: Haar beginnt erst\nunter der Krempe',fill=C['ink'],font=FONT)
sh.save('r5_pikhaar.png');print(sh.size)

# 3) linke Schulter breiter
grid('Linke Schulter breiter (Platz links, kein Symbol und keine Zahl)',[('aktuell\n(x ab 8)',dict(xl=8,shape='flach',gold='g1')),('+2 Pixel',dict(xl=6,shape='flach',gold='g1')),('+4 Pixel',dict(xl=4,shape='flach',gold='g1')),('+6 Pixel',dict(xl=2,shape='flach',gold='g1')),('+7 Pixel\n(bis zum Rand)',dict(xl=1,shape='flach',gold='g1'))],'r5_schulter.png',S=5)
# 4) Unterkante: Halbkreis/Büste ...
SH=[('A  flach\n(aktuell)','flach'),('B  Halbkreis\ntief','halb'),('C  Büste\nflacher Bogen','bueste'),('D  Halbkreis\nflach','halbflach'),('E  Treppe','treppe'),('F  Spitze\n(Schild)','spitze')]
grid('Unterkante: in der Mitte tiefer, links/rechts höher (goldene Kante immer außen)',[(l,dict(xl=4,shape=s,gold='g1')) for l,s in SH],'r5_unterkante.png',S=4)
# 5) Goldkante-Varianten
GD=[('G1  1 px Gold','g1'),('G2  2 px Gold','g2'),('G3  Gold +\ndunkles Gold','g3'),('G4  Gold +\nPerlen','g4'),('G5  Doppelte\nLinie mit Lücke','g5')]
grid('Goldene Kante: Varianten (Form C, links +4)',[(l,dict(xl=4,shape='bueste',gold=g)) for l,g in GD],'r5_gold.png',S=4,crop=(0,22,26,42),cS=5)
# 6) Kombinationen
KB=[('K1  Halbkreis tief\nlinks +4, G1',dict(xl=4,shape='halb',gold='g1')),('K2  Büste\nlinks +4, G3',dict(xl=4,shape='bueste',gold='g3')),('K3  Treppe\nlinks +4, G2',dict(xl=4,shape='treppe',gold='g2')),
    ('K4  Spitze\nlinks +2, G1',dict(xl=6,shape='spitze',gold='g1')),('K5  Halbkreis flach\nlinks +6, G4',dict(xl=2,shape='halbflach',gold='g4'))]
grid('Kombinationen zum Auswählen',KB,'r5_kombi.png',S=5)
