from comp import *
from PIL import ImageDraw
RED2=hx('a02a20'); WHITEHAIR=hx('f3f0ea'); bg=(0xf2,0xe6,0xd0)
def sp(hat,beard='keiner',hair='kurz',extra=(),body='platz',**pal): return dict(body=body,hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal)
def bube(hair): return sp('fez_A','keiner',hair,A=C['red'],a=RED2)
def herz(extra=()): return sp('turban_moghul','lang','kurz',extra,A=C['white'],a=SHADE,J=C['red'],H=GRAY_BEARD,B=GRAY_BEARD)
def pik(mon='monokel_l'): return sp('z_a11','keiner','lang',[mon],H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)
def crop(im,box,S): c=im.crop(box); return c.resize((c.width*S,c.height*S),Image.NEAREST)
def strip(title,items,fname,S=6,cropbox=None,cS=12,lw=0):
    """items: (label,suit,rank,spec,emph,sym). Oben Karten, darunter Kopf-Ausschnitt."""
    pad=14; cw=max(W*S,(cropbox[2]-cropbox[0])*cS if cropbox else 0)+pad
    h=H*S+(((cropbox[3]-cropbox[1])*cS+pad) if cropbox else 0)+60
    sh=Image.new('RGB',(len(items)*cw+pad,h+30),bg);d=ImageDraw.Draw(sh); d.text((pad,6),title,fill=C['ink'],font=FONTB)
    for i,(lab,suit,rank,spec,em,sym) in enumerate(items):
        x=pad+i*cw; y=30
        im=card(suit,rank,spec,em,sym); b=scaled(im,S); sh.paste(b,(x,y),b)
        y2=y+H*S+8
        if cropbox: 
            cr=crop(im,cropbox,cS); sh.paste(cr,(x,y2),cr); y2+=cr.height+6
        d.multiline_text((x,y2),lab,fill=C['ink'],font=FONT)
    sh.save(fname); print(fname,sh.size)

# 1) Karo Bube: Abstand Augen / Frisur
hv=[('Aktuell\n(Pony direkt\nüber den Augen)','pony'),('A  Pony 1 Zeile,\n1 px Luft','pony_a'),('B  kein Pony,\n2 px Luft','pony_b'),('C  Seitenscheitel','pony_c'),('D  Mittelscheitel','pony_d')]
strip('Karo Bube mit Fez: Abstand zwischen Augen und Frisur',[(l,'D',11,bube(h),'ohne','ref') for l,h in hv],'r4_bube.png',S=6,cropbox=(7,8,25,22),cS=7)

# 2) Herz König: Gesicht weniger rechteckig
hk=[('Aktuell','',()),('A  Brauen + Nase',' ',('brauen','nase')),('B  Schläfen +\nBartansatz',' ',('schlaefen',)),('C  Wangenbogen\n(Bart steigt\nzu den Augen)',' ',('wangenbogen','nase')),('D  Turbanschatten,\nSchläfen, Brauen',' ',('turbanschatten','schlaefen','brauen'))]
strip('Herz König: Augen-/Gesichtsausschnitt weniger rechteckig',[(l,'H',13,herz(ex),'schlagschatten','ref') for l,_,ex in hk],'r4_herzkoenig.png',S=6,cropbox=(7,8,25,26),cS=7)

# 3) Pik König: Monokel links + Erklärung der Balken
sh=[]
im=card('S',13,pik('monokel'),'schlagschatten','ref')
big=scaled(im,9).convert('RGBA'); dd=ImageDraw.Draw(big)
x0,y0,x1,y1=24*9,25*9,29*9,33*9
dd.ellipse([x0-8,y0-8,x1+8,y1+8],outline=(0xd9,0x2a,0x2a,255),width=3)
pad=24
sheet=Image.new('RGB',(2*(W*9+pad)+pad,H*9+pad*2+100),bg);d=ImageDraw.Draw(sheet)
sheet.paste(big,(pad,pad),big)
new=scaled(card('S',13,pik('monokel_l'),'schlagschatten','ref'),9); sheet.paste(new,(pad*2+W*9,pad),new)
d.multiline_text((pad,pad+H*9+8),'Vorher: Monokel rechts.\nRot umkreist: die „Balken“ sind das\nPik-Symbol unten rechts (auf dem Kopf,\nStiel zeigt nach oben), vom Figurenfenster\nangeschnitten. Keine Kleidung.',fill=C['ink'],font=FONT)
d.multiline_text((pad*2+W*9,pad+H*9+8),'Neu: Monokel auf dem\nanderen Auge (links)',fill=C['ink'],font=FONT)
sheet.save('r4_pik.png'); print(sheet.size)

# 4) Abstand rechts unten: drei Typen x drei Modi
types=[('Herz König','H',13,herz(),'schlagschatten'),('Karo Bube','D',11,bube('pony_a'),'ohne'),('Pik König','S',13,pik('monokel_l'),'schlagschatten')]
modes=[('Aktuell','ref'),('Option 1\nSymbol unten rechts\n1 px mehr angeschnitten','cut1'),('Option 2\nrechte Schulter\n1 px schmaler','schulter')]
S=6;pad=14;cw=W*S+pad
sh=Image.new('RGB',(3*cw+pad,3*(H*S+pad)+60),bg);d=ImageDraw.Draw(sh)
for ri,(n,suit,rank,spec,em) in enumerate(types):
    pass
# zeilenweise: Spalten = Typen, Zeilen = Modi
sh=Image.new('RGB',(3*cw+pad+10,3*(H*S+58)+pad),bg);d=ImageDraw.Draw(sh)
for mi,(ml,m) in enumerate(modes):
    for ti,(n,suit,rank,spec,em) in enumerate(types):
        x=pad+ti*cw; y=pad+mi*(H*S+58)
        im=scaled(card(suit,rank,spec,em,m),S); sh.paste(im,(x,y),im)
        if ti==0: pass
    d.multiline_text((pad,pad+mi*(H*S+58)+H*S+4),ml.replace('\n',' · '),fill=C['ink'],font=FONT)
sh.save('r4_abstand.png'); print(sh.size)
