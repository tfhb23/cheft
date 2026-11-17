import sys; sys.path.insert(0,'.')
from masters_v2 import *
import parts as P, textwrap, copy
from masters import KING_DYN, BUBE_DYN, DAME_DYN
from PIL import ImageDraw, ImageFont
bg=(0xf2,0xe6,0xd0); pad=10
FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',12)
BROWN=hx('5a3a24'); DBROWN=hx('4e2c16'); GOLD=C['gold']; WHITE=C['white']; RED=C['red']; STONE=hx('d8d0c0')
def m2(rank,hat=(),beard='keiner',hair='glatze',extra=(),px=(),**pal):
    dyn=dict({13:KING_DYN,11:BUBE_DYN,12:DAME_DYN}[rank]); dyn.update(xmin=8,notch_left=True,lift=1)
    return dict(body='leer',hair=hair,beard=beard,hat=[hat] if isinstance(hat,str) else list(hat),extra=list(extra),pal=pal,dyn=dyn,lift=1,px=list(px))
def sheet(title,suit,ref,items,rank,fname,S=5):
    cw=W*S+pad; lab=84
    allit=[('Referenz',ref[0],ref[1])]+items
    im=Image.new('RGB',(len(allit)*cw+pad,H*S+lab+36),bg); d=ImageDraw.Draw(im); d.text((pad,6),title,fill=C['ink'],font=FONTB)
    for i,(n,dsc,sp) in enumerate(allit):
        x=pad+i*cw; y=30
        if i==0:
            su,rk,em,s2=spec_v2(ref[1]); c=card(su,rk,s2,em,'symm')
        else: c=card(suit,rank,sp,'schlagschatten','symm')
        b=scaled(c,S); im.paste(b,(x,y),b)
        d.text((x,y+H*S+4),n,fill=C['ink'],font=FB)
        d.multiline_text((x,y+H*S+22),'\n'.join(textwrap.wrap(dsc,23)[:4]),fill=C['ink'],font=FONT)
    im.save(fname); print(fname,im.size)
Z=dict(Z=RED)
# ---- Herz Bube: Dichter-Schüler / Liebender
HB=[('HB1 Nachtigall','Locken, Nachtigall auf der linken Schulter',m2(11,[],'keiner','locken',px=P.pxart(P.BIRD_NACHTIGALL,6,21))),
    ('HB2 Majnun','wilde Haare, Rosenkranz (Blätter in Gold)',m2(11,'rosenkranz','keiner','wild',Q=GOLD)),
    ('HB3 Schreiber','kleine weiße Kappe, goldene Feder hinterm Ohr',m2(11,['takke','feder_ohr'],'keiner','kurz',A=WHITE,a=GOLD,F=GOLD)),
    ('HB4 Derwisch','hohe helle Filzmütze mit Goldband (Rumi)',m2(11,'sikke','keiner','glatze',('brauen',),A=STONE,a=GOLD)),
    ('HB5 Kalifensohn','kleiner weißer Turban wie beim König',m2(11,'turban_klein','keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED)),
    ('HB6 Rosenbote','rote Kolah-Mütze, Rose hinterm Ohr',m2(11,'kolah','keiner','pony_a',('rose_ohr',),A=hx('8e2b22'),a=GOLD))]
sheet('Herz Bube: persische Dichtkunst','H',('','herz_koenig'),HB,11,'b_herz_bube.png')
# ---- Herz Dame: die Geliebte
HD=[('HD1 Mondgesicht','Mondsichel-Diadem, lange Zöpfe',m2(12,['mond','ohrringe'],'keiner','zoepfe',M=RED)),
    ('HD2 Layla','Schleier und Stirnkette mit Rubin',m2(12,['schleier','tikka'],'keiner','mittelscheitel_lang',V=hx('f4eee4'),J=RED,M=RED)),
    ('HD3 Perlenschleier','Schleier mit Perlenband',m2(12,['schleier','perlenband'],'keiner','langoffen',V=hx('f4eee4'),M=RED)),
    ('HD4 Shirin','kleine Goldkrone, Zöpfe, Perlenkette',m2(12,['krone_d'],'keiner','zoepfe',acc=None,J=RED,M=RED) if False else dict(m2(12,['krone_d'],'keiner','zoepfe',J=RED,M=RED),acc=['perlen'])),
    ('HD5 Rosengarten','Rosenkranz (Blätter in Gold), offenes Haar',m2(12,'rosenkranz','keiner','langoffen',Q=GOLD,M=RED)),
    ('HD6 Herz-Tikka','Schleier mit rotem Herz auf der Stirn',m2(12,['schleier','tikka_herz'],'keiner','mittelscheitel_lang',V=hx('f4eee4'),J=RED,M=RED))]
sheet('Herz Dame: persische Dichtkunst','H',('','herz_koenig'),HD,12,'b_herz_dame.png')
# ---- Kreuz Bube: Prinz / Page
KB=dict(H=BROWN,B=DBROWN)
CB=[('CB1 Prinz mit Goldreif','Pagenfrisur, schmaler Goldreif',m2(11,'goldring','keiner','pagen',J=RED,**KB)),
    ('CB2 Kronprinz','kleine Krone wie beim Vater, Pony',m2(11,'krone_klein','keiner','pony_a',**KB)),
    ('CB3 Page','schwarzes Federbarett mit goldener Feder',m2(11,'federkappe','keiner','pagen',A=C['ink'],F=GOLD,**KB)),
    ('CB4 Knappe','Kettenhaube, Brauen',m2(11,'kettenhaube','keiner','glatze',('brauen',),**KB)),
    ('CB5 Prinz mit Perlen','Locken, Perlenband',m2(11,'perlenband','keiner','locken',**KB)),
    ('CB6 Thronfolger','Diadem und kurzes Haar',m2(11,'krone_d','keiner','kurz',J=RED,**KB))]
sheet('Kreuz Bube: klassische Königsfamilie','C',('','kreuz_koenig'),CB,11,'b_kreuz_bube.png')
# ---- Kreuz Dame: Königin
KD=dict(H=BROWN,M=RED)
CD=[('CD1 Königin','Goldkrone, Zöpfe, Perlenkette',dict(m2(12,'krone_d','keiner','zoepfe',J=RED,**KD),acc=['perlen'])),
    ('CD2 Königin mit Schleier','Krone und weißer Schleier, offenes Haar',m2(12,['schleier','krone_d'],'keiner','langoffen',V=hx('f4eee4'),J=RED,**KD)),
    ('CD3 Hofdame','Hochsteckfrisur, Diadem, Perlenkette',dict(m2(12,'diadem_gross','keiner','hochsteck',J=RED,**KD),acc=['perlen'])),
    ('CD4 Bügelkrone','Bügelkrone mit Kreuz, offenes Haar',m2(12,'krone_kreuz','keiner','langoffen',J=RED,**KD)),
    ('CD5 Kronreif','Kronreif, offenes Haar, Ohrringe',m2(12,['goldring','ohrringe'],'keiner','langoffen',J=RED,**KD)),
    ('CD6 Perlenkrone','Krone mit Perlen, Zöpfe',m2(12,['krone_perlen'],'keiner','zoepfe',J=RED,**KD))]
sheet('Kreuz Dame: klassische Königsfamilie','C',('','kreuz_koenig'),CD,12,'b_kreuz_dame.png')
