import sys; sys.path.insert(0,'.')
from masters_v2 import *
import parts as P, textwrap
from masters import KING_DYN, BUBE_DYN, DAME_DYN
from PIL import ImageDraw, ImageFont
bg=(0xf2,0xe6,0xd0); pad=10
FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',12)
BROWN=hx('5a3a24'); DBROWN=hx('4e2c16'); GOLD=C['gold']; WHITE=C['white']; RED=C['red']; STONE=hx('d8d0c0'); INK=C['ink']; GOLD2=hx('c8902a'); DRED=hx('8e2b22')
def px(rows,x,y): return P.pxart(rows,x,y)
def m2(rank,hat=(),beard='keiner',hair='glatze',extra=(),px=(),acc=(),**pal):
    dyn=dict({13:KING_DYN,11:BUBE_DYN,12:DAME_DYN}[rank]); dyn.update(xmin=8,notch_left=True,lift=1)
    return dict(body='leer',hair=hair,beard=beard,hat=[hat] if isinstance(hat,str) else list(hat),extra=list(extra),acc=list(acc),pal=pal,dyn=dyn,lift=1,px=list(px))
def sheet(title,suit,refname,items,rank,fname,S=5,per=7):
    cw=W*S+pad; lab=92
    allit=[('Referenz','',None)]+items
    rows=[allit[i:i+per] for i in range(0,len(allit),per)]
    im=Image.new('RGB',(per*cw+pad,len(rows)*(H*S+lab)+34),bg); d=ImageDraw.Draw(im); d.text((pad,6),title,fill=C['ink'],font=FONTB)
    for ri,row in enumerate(rows):
        for ci,(n,dsc,sp) in enumerate(row):
            x=pad+ci*cw; y=30+ri*(H*S+lab)
            if sp is None:
                su,rk,em,s2=spec_v2(refname); c=card(su,rk,s2,em,'symm')
            else: c=card(suit,rank,sp,'schlagschatten','symm')
            b=scaled(c,S); im.paste(b,(x,y),b)
            d.text((x,y+H*S+4),n,fill=C['ink'],font=FB)
            d.multiline_text((x,y+H*S+22),'\n'.join(textwrap.wrap(dsc,23)[:4]),fill=C['ink'],font=FONT)
    im.save(fname); print(fname,im.size)
HH=dict(M=RED)
FALKE=px(P.OBJ_FALKE,5,20); GRANAT=px(P.OBJ_GRANAT,7,20)
KERZE=px(P.OBJ_KERZE_FLAMME,10,22)+px(P.OBJ_KERZE,10,25)+px(P.OBJ_MOTTE,6,21)
ZEPTER=px(P.OBJ_ZEPTER_KNAUF,21,16)+[(22,y,'G') for y in range(19,32)]
# ================= Herz Bube =================
HB=[('HB-a Mundschenk','Saki, der Weinschenker: kleiner Turban und goldener Pokal',m2(11,'turban_klein','keiner','glatze',('brauen',),px(P.OBJ_POKAL,9,27),A=WHITE,a=SHADE,J=RED)),
    ('HB-b Falkner','Kolah-Mütze, Jagdfalke auf der Schulter',m2(11,'kolah','keiner','pony_a',(),FALKE,A=DRED,a=GOLD)),
    ('HB-c Erzähler','weiße Kappe, Schriftrolle in der Hand',m2(11,'takke','keiner','kurz',('brauen',),px(P.OBJ_ROLLE,9,28),A=WHITE,a=GOLD)),
    ('HB-d Heiliger','Heiligenschein: der Sufi-Dichter',m2(11,[],'keiner','kurz',('brauen',),px(P.OBJ_HEILIGENSCHEIN,11,7))),
    ('HB-e Motte und Kerze','Locken, Kerze mit Flamme, die Motte der Liebe',m2(11,[],'keiner','locken',(),KERZE)),
    ('HB-f Tulpenbube','Kolah, rote Tulpe am Ohr (Tulpe = Liebe)',m2(11,'kolah','keiner','pony_a',(),px(P.OBJ_TULPE,9,12),A=DRED,a=GOLD)),
    ('HB-g Rosengärtner','weiße Kappe, weiße Rose in der Hand',m2(11,'takke','keiner','kurz',(),(),('rose_w',),A=WHITE,a=GOLD)),
    ('HB-h Flötenspieler','Ney-Flöte, helle Mütze mit Goldband',m2(11,'sikke','keiner','glatze',('brauen',),px=[(x,y,c) for x,y,c in P.OBJ_FLOETE_PX],A=STONE,a=GOLD)),
    ('HB-i Vogel im Haar','Locken, kleine Nachtigall auf dem Kopf',m2(11,[],'keiner','locken',(),px(P.BIRD_KOPF,13,6))),
    ('HB-j Granatapfel','Stirnband, Granatapfel auf der Schulter',m2(11,'stirnband','keiner','locken',(),GRANAT,J=RED)),
    ('HB-k Mondbote','weiße Kappe mit goldenem Mond',m2(11,['takke','mond_klein'],'keiner','kurz',('brauen',),A=WHITE,a=GOLD)),
    ('HB-l Hofdichter','Lorbeerkranz, Locken, Schriftrolle',m2(11,'lorbeer','keiner','locken',('brauen',),px(P.OBJ_ROLLE,9,28)))]
sheet('Herz Bube: zwölf weitere Ideen (persische Dichtkunst)','H','herz_koenig',HB,11,'c_herz_bube.png')
# ================= Herz Dame =================
V=dict(V=hx('f4eee4'))
HD=[('HD-a Mond + Schleier','Mondsichel über dem Schleier',m2(12,['schleier','mond'],'keiner','mittelscheitel_lang',**V,**HH)),
    ('HD-b Tulpenkranz','Kranz aus roten Tulpen, offenes Haar',m2(12,'tulpenkranz','keiner','langoffen',**HH)),
    ('HD-c Sternenschleier','Schleier mit goldenen Sternen',m2(12,['schleier','sterne_schleier'],'keiner','mittelscheitel_lang',**V,**HH)),
    ('HD-d Nachtigall','Rose am Ohr, Nachtigall auf der Schulter',m2(12,[],'keiner','mittelscheitel_lang',('rose_ohr',),FALKE and px(P.BIRD_NACHTIGALL,6,21),**HH)),
    ('HD-e Handspiegel','Zöpfe, Stirnband, goldener Handspiegel',m2(12,'stirnband','keiner','zoepfe',(),px(P.OBJ_SPIEGEL,9,26)+[(11,31,'G')],J=RED,**HH)),
    ('HD-f Rosenschleier','Schleier mit Rosenkranz',m2(12,['schleier','rosenkranz'],'keiner','langoffen',Q=GOLD,**V,**HH)),
    ('HD-g Goldkamm','Hochsteckfrisur mit goldenem Kamm',m2(12,['kamm','ohrringe'],'keiner','hochsteck',**HH)),
    ('HD-h Perlennetz','Perlen im Haar und Perlenband',m2(12,['perlen_haar','perlenband'],'keiner','langoffen',**HH)),
    ('HD-i Motte','Perlenband, eine Motte im Haar',m2(12,'perlenband','keiner','langoffen',(),px(P.OBJ_MOTTE,9,12),**HH)),
    ('HD-j Goldzöpfe','Zöpfe mit Goldfäden, Stirnband',m2(12,'stirnband','keiner','zoepfe_gold',J=RED,**HH)),
    ('HD-k Kopftuch','goldenes Kopftuch, Stirnkette',m2(12,['bandana','ohrringe','tikka'],'keiner','langoffen',A=GOLD,a=GOLD2,J=RED,**HH)),
    ('HD-l Zypresse','hohe Frisur: schlank wie eine Zypresse',m2(12,'turm','keiner','langoffen',P=hx('6b3f22'),Z=GOLD,**HH))]
sheet('Herz Dame: zwölf weitere Ideen (persische Dichtkunst)','H','herz_koenig',HD,12,'c_herz_dame.png')
# ================= Kreuz Bube =================
KB=dict(H=BROWN,B=DBROWN)
CB=[('CB-a Prinz','Pagenfrisur, Goldreif, Spitzenkragen',m2(11,['goldring','krause'],'keiner','pagen',J=RED,**KB)),
    ('CB-b Kronprinz','kleine Krone und Zepter',m2(11,'krone_klein','keiner','pony_a',px=ZEPTER,J=RED,**KB)),
    ('CB-c Page','schwarzes Federbarett, Spitzenkragen',m2(11,['federkappe','krause'],'keiner','pagen',A=INK,F=GOLD,**KB)),
    ('CB-d Falkner','Federbarett, königlicher Falke',m2(11,'federkappe','keiner','kurz',px=FALKE,A=INK,F=GOLD,**KB)),
    ('CB-e Hofnarr','Narrenkappe in Schwarz und Gold',m2(11,'narrenkappe','keiner','glatze',A=INK,a=GOLD,**KB)),
    ('CB-f Lorbeerprinz','Lorbeerkranz, Locken',m2(11,'lorbeer','keiner','locken',**KB)),
    ('CB-g Wappenträger','Goldreif, Wappenschild mit Kreuz',m2(11,'goldring','keiner','pagen',px=px(P.OBJ_WAPPEN,9,25),J=RED,**KB)),
    ('CB-h Knappe','offener Helm mit Goldfeder, Brauen',m2(11,'helm','keiner','glatze',('brauen',),Z=GOLD,**KB)),
    ('CB-i Puderperücke','weiße Perücke und Goldreif',m2(11,['allonge','goldring'],'keiner','glatze',J=RED,**KB)),
    ('CB-j Hermelinprinz','kleine Krone und Hermelinkragen',m2(11,['krone_klein','hermelin'],'keiner','pony_a',**KB)),
    ('CB-k Sommersprossen','kleine Krone, Sommersprossen',m2(11,['krone_klein','sommersprossen'],'keiner','kurz',**KB)),
    ('CB-l Barett','flaches schwarzes Barett mit Goldrand',m2(11,'seemannsmuetze','keiner','pagen',W=INK,**KB))]
sheet('Kreuz Bube: zwölf weitere Ideen (Königsfamilie)','C','kreuz_koenig',CB,11,'c_kreuz_bube.png')
# ================= Kreuz Dame =================
KD=dict(H=BROWN,M=RED)
CD=[('CD-a Krause','Krone, Zöpfe, Spitzenkragen',m2(12,['krone_d','krause'],'keiner','zoepfe',J=RED,**KD)),
    ('CD-b Prinzessin','kleine Krone, hoher Pferdeschwanz',m2(12,'krone_klein','keiner','pferdeschwanz',**KD)),
    ('CD-c Hohe Frisur','Turmfrisur mit kleiner Krone',m2(12,['turm','krone_klein'],'keiner','glatze',P=BROWN,Z=GOLD,**KD)),
    ('CD-d Schleier + Perlen','Schleier, Perlen, Krone',m2(12,['schleier','perlen_haar','krone_d'],'keiner','langoffen',V=hx('f4eee4'),J=RED,**KD)),
    ('CD-e Königin mit Zepter','Krone, offenes Haar, Zepter',m2(12,'krone_d','keiner','langoffen',px=ZEPTER,J=RED,**KD)),
    ('CD-f Zopfkrone','Zöpfe als Krone um den Kopf',m2(12,'ohrringe','keiner','zopfkrone',**KD)),
    ('CD-g Hofdame','Hochsteckfrisur, Diadem, Fächer',m2(12,'diadem_gross','keiner','hochsteck',px=px(P.OBJ_FAECHER,8,27),J=RED,**KD)),
    ('CD-h Witwe','schwarzer Schleier mit kleiner Krone',m2(12,['schleier','krone_klein'],'keiner','mittelscheitel_lang',V=INK,**KD)),
    ('CD-i Hermelin','Krone, Zöpfe, Hermelinkragen',m2(12,['krone_d','hermelin'],'keiner','zoepfe',J=RED,**KD)),
    ('CD-j Perlen','Krone, Perlenohrringe, offenes Haar',m2(12,['krone_d','ohrperlen'],'keiner','langoffen',J=RED,**KD)),
    ('CD-k Jagd','Federbarett, Zöpfe',m2(12,'federkappe','keiner','zoepfe',A=INK,F=GOLD,**KD)),
    ('CD-l Schleife','große goldene Schleife, Zöpfe',m2(12,'schleife','keiner','zoepfe',**KD))]
sheet('Kreuz Dame: zwölf weitere Ideen (Königsfamilie)','C','kreuz_koenig',CD,12,'c_kreuz_dame.png')
