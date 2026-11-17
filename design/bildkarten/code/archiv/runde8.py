from comp import *
import bust
from PIL import ImageDraw
WHITEHAIR=hx('f3f0ea'); bg=(0xf2,0xe6,0xd0)
def mk(hat,beard,hair,extra,dyn,**pal): return dict(body='leer',hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal,dyn=dyn)
KING=mk('z_a11','keiner','lang_z',('monokel_l',),dict(xl=4,shape='sy_halb',gold='g5'),H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)
def bube(hair,gl): return mk([],'keiner',hair,(gl,),dict(xl=4,shape='sy_halb',gold='g1'),H=WHITEHAIR,S=SKIN_PALE)
def dame(hair,gl,gold='g2'): return mk([],'keiner',hair,(gl,),dict(xl=4,shape='sy_halb',gold=gold),H=WHITEHAIR,S=SKIN_PALE,M=C['red'])
def R(rank,spec): return card('S',rank,spec,'schlagschatten','cut1')
GL=[('S  klein','brille_s'),('M  mittel','brille_m'),('L  hohes Oval','brille_l'),('L dick  Oval +\nBrauensteg','brille_l_dick'),('XL  rund 7x7','brille_xl')]
pad=10
def sheet(title,rowlabels,cols,cell,rank,fname,S=5,lw=150):
    cw=W*S+pad; rh=H*S+pad
    im=Image.new('RGB',(lw+len(cols)*cw+pad,56+len(rowlabels)*rh+10),bg);d=ImageDraw.Draw(im)
    d.text((pad,6),title,fill=C['ink'],font=FONTB)
    for ci,(cl,_) in enumerate(cols): d.multiline_text((lw+ci*cw,20),cl,fill=C['ink'],font=FONT)
    for ri,rl in enumerate(rowlabels):
        d.multiline_text((pad,56+ri*rh+H*S//2-10),rl,fill=C['ink'],font=FONT)
        for ci,(cl,g) in enumerate(cols):
            c=scaled(R(rank,cell(ri,g)),S); im.paste(c,(lw+ci*cw,56+ri*rh),c)
    im.save(fname); print(fname,im.size)
# Bube
HB=['topf_a','topf_b','topf_c']
sheet('Pik Bube: Topfschnitt in Weiß, runde schwarze Brille',['Topfschnitt A\ngroß und rund','Topfschnitt B\neng','Topfschnitt C\nmit Spitze unten'],GL,lambda ri,g: bube(HB[ri],g),11,'r8_bube.png')
# Dame
HD=['bob_wange','bob_kinn','bob_lang']
GLD=[GL[1],GL[2],GL[3],GL[4]]
sheet('Pik Dame: weißer Bob, große Brille (Vorbild Edna Mode)',['Bob wangenlang','Bob kinnlang','Bob schulterlang'],GLD,lambda ri,g: dame(HD[ri],g),12,'r8_dame.png')
# Dame Goldkante
GE=[('G2  zwei\nGoldlinien','g2'),('G3  Gold +\ndunkles Gold','g3'),('G5  zwei Linien\nmit Lücke','g5'),('G6  Gold +\ngrauer Ton','g6'),('G7  Gold +\nroter Ton','g7')]
cw=W*6+pad
im=Image.new('RGB',(len(GE)*cw+pad,H*6+90),bg);d=ImageDraw.Draw(im)
d.text((pad,6),'Pik Dame: Goldkante als zwei Linien oder mit tonalem Akzent',fill=C['ink'],font=FONTB)
for i,(lab,g) in enumerate(GE):
    c=scaled(R(12,dame('bob_kinn','brille_l',g)),6); im.paste(c,(pad+i*cw,30),c)
    d.multiline_text((pad+i*cw,30+H*6+6),lab,fill=C['ink'],font=FONT)
im.save('r8_dame_gold.png');print(im.size)
# Familie: drei Vorschläge
FAM=[('Vorschlag 1\nBube M, Dame L','topf_a','brille_m','bob_kinn','brille_l'),
     ('Vorschlag 2\nBube L, Dame XL','topf_b','brille_l','bob_kinn','brille_xl'),
     ('Vorschlag 3\nBube S, Dame L dick','topf_c','brille_s','bob_wange','brille_l_dick')]
S=5;cw=W*S+pad;lw=190
im=Image.new('RGB',(lw+3*cw+pad,50+3*(H*S+pad)+10),bg);d=ImageDraw.Draw(im)
d.text((pad,6),'Pik-Familie: König (freigegebener Master), Bube, Dame',fill=C['ink'],font=FONTB)
for ci,t in enumerate(['König (Master)','Bube','Dame']): d.text((lw+ci*cw,30),t,fill=C['ink'],font=FONT)
for ri,(lab,hb,gb,hd,gd) in enumerate(FAM):
    y=50+ri*(H*S+pad); d.multiline_text((pad,y+H*S//2-10),lab,fill=C['ink'],font=FONT)
    for ci,(rank,spec) in enumerate([(13,KING),(11,bube(hb,gb)),(12,dame(hd,gd,'g2'))]):
        c=scaled(R(rank,spec),S); im.paste(c,(lw+ci*cw,y),c)
im.save('r8_familie.png');print(im.size)
