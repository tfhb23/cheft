import sys; sys.path.insert(0,'.')
from masters_v2 import *
import parts as P, textwrap
from masters import KING_DYN, BUBE_DYN, DAME_DYN
from PIL import ImageDraw, ImageFont
bg=(0xf2,0xe6,0xd0); pad=10
FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',12)
BROWN=hx('5a3a24'); DBROWN=hx('4e2c16'); GOLD=C['gold']; WHITE=C['white']; RED=C['red']; INK=C['ink']
def px(rows,x,y): return P.pxart(rows,x,y)
def m2(rank,hat=(),beard='keiner',hair='glatze',extra=(),px=(),acc=(),**pal):
    dyn=dict({13:KING_DYN,11:BUBE_DYN,12:DAME_DYN}[rank]); dyn.update(xmin=8,notch_left=True,lift=1)
    return dict(body='leer',hair=hair,beard=beard,hat=[hat] if isinstance(hat,str) else list(hat),extra=list(extra),acc=list(acc),pal=pal,dyn=dyn,lift=1,px=list(px))
HH=dict(M=RED); VW=dict(V=hx('f4eee4'))
KB=dict(H=BROWN,B=DBROWN); KD=dict(H=BROWN,M=RED)
def render(suit,rank,sp): return card(suit,rank,sp,'schlagschatten','symm')
def ref(name): su,rk,em,s2=spec_v2(name); return card(su,rk,s2,em,'symm')
def grid(title,rows,fname,S=5,per=6,lab=84):
    cw=W*S+pad; n=max(len(r) for r in rows)
    im=Image.new('RGB',(max(n,per)*cw+pad,len(rows)*(H*S+lab)+34),bg); d=ImageDraw.Draw(im); d.text((pad,6),title,fill=C['ink'],font=FONTB)
    for ri,row in enumerate(rows):
        for ci,(nm,dsc,img) in enumerate(row):
            x=pad+ci*cw; y=30+ri*(H*S+lab)
            if img is not None:
                b=img.resize((W*S,H*S),Image.NEAREST); im.paste(b,(x,y),b)
            d.text((x,y+H*S+4),nm,fill=C['ink'],font=FB); d.multiline_text((x,y+H*S+22),'\n'.join(textwrap.wrap(dsc,23)[:4]),fill=C['ink'],font=FONT)
    im.save(fname); print(fname,im.size)
# ---------- Herz ----------
HB4=m2(11,['takke','feder_ohr'],'keiner','kurz',A=WHITE,a=GOLD)
HB5=m2(11,'turban_klein','keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED)
HBk=m2(11,['takke_rund','mond_klein'],'keiner','kurz',('brauen',),A=WHITE,a=GOLD)
HDc=m2(12,['schleier','sterne_schleier'],'keiner','mittelscheitel_lang',**VW,**HH)       # wie nominiert (Vorlage)
HDa=m2(12,['schleier','mond'],'keiner','mittelscheitel_lang',**VW,**HH)                 # wie nominiert (Vorlage)
HDg=m2(12,['kamm6_o','ohrringe'],'keiner','hochsteck',**HH)
HDl=m2(12,['schleier_r','tikka'],'keiner','rund_scheitel',J=RED,**VW,**HH)             # Layla mit runderem Kopf
herz=[[('Referenz','Herz König (Master)',ref('herz_koenig')),
       ('HB4 Schreiber','Takke, orange Feder',render('H',11,HB4)),
       ('HB5 Kalifensohn','kleiner Turban wie der König',render('H',11,HB5)),
       ('HB-k Mondbote','runderer Kopf',render('H',11,HBk))],
      [('','',None),
       ('HD-c Sternenschleier','wie nominiert, Vorlage unverändert',render('H',12,HDc)),
       ('HD-a Mond + Schleier','wie nominiert, Vorlage unverändert',render('H',12,HDa)),
       ('HD-g Goldkamm','Kamm mittig, Höhe wie im Original',render('H',12,HDg)),
       ('HD2 Layla','Vorlage mit rundem Kopf oben',render('H',12,HDl))]]
grid('Engere Auswahl: Herz (HB3 gestrichen)',herz,'r23_auswahl_herz.png',per=5)
# ---------- Goldkamm ----------
K=[('K1','6 breit, Höhe wie Original','kamm6_o'),('K2','6 breit, 1 Pixel tiefer','kamm6_u'),('K3','4 breit, Höhe wie Original','kamm4_o'),('K4','4 breit, 1 Pixel tiefer','kamm4_u'),('K5','um 180° gedreht, Höhe wie Original','kamm6_rot_o'),('K6','um 180° gedreht, 1 Pixel tiefer','kamm6_rot_u')]
rows=[[(n,d,render('H',12,m2(12,[k,'ohrringe'],'keiner','hochsteck',**HH))) for n,d,k in K]]
grid('Goldkamm: genau mittig, Varianten',rows,'r23_goldkamm.png',per=6,S=5)
# ---------- Schleier-Studie ----------
cols=[('Layla',['tikka']),('Mond',['mond']),('Sterne',['sterne_schleier']),('ohne Schmuck',[])]
orig=[('Vorlage Layla','Schleier wie ursprünglich',render('H',12,m2(12,['schleier_r','tikka'],'keiner','rund_scheitel',J=RED,**VW,**HH))),
      ('Vorlage Mond','Schleier wie ursprünglich',render('H',12,HDa)),('Vorlage Sterne','Schleier wie ursprünglich',render('H',12,HDc)),
      ('Vorlage ohne','Schleier wie ursprünglich',render('H',12,m2(12,['schleier_r'],'keiner','rund_scheitel',**VW,**HH)))]
rows=[orig]
for nm,part_,dsc in [('Fall A','symmetrisch, rund über die Schultern, Haar oben sichtbar','fall_a'),('Fall B','rechts länger nach vorn über die Schulter gelegt','fall_b'),('Fall C','weiche Haube, Haar am Scheitel und Schläfen','fall_c')][:0]: pass
for nm,dsc,part_ in [('Fall A','symmetrisch, rund über die Schultern','fall_a'),('Fall B','rechts länger über die Schulter nach vorn','fall_b'),('Fall C','weiche Haube mit welliger Kante','fall_c')]:
    r=[]
    for cn,extra in cols:
        r.append((nm+' · '+cn,dsc,render('H',12,m2(12,[part_]+extra,'keiner','rund_scheitel',J=RED,**HH))))
    rows.append(r)
grid('Weiße Schleier mit Fall: drei neue Formen (je mit Layla, Mond, Sternen, ohne Schmuck)',rows,'r23_schleier.png',per=4,S=5)
# ---------- Kreuz ----------
CBc=m2(11,['federkappe','krause'],'keiner','pagen',A=INK,F=GOLD,**KB)
FALKE_1=px(['.www.','GwKww','.wOOw','.wOOw','..G.G'],19,21)          # Blick nach links, 1 Pixel nach rechts
FALKE_2=px(P.OBJ_FALKE,18,21)                                          # Blick nach rechts
CBd1=m2(11,'federkappe','keiner','kurz',px=FALKE_1,A=INK,F=GOLD,**KB)
CBd2=m2(11,'federkappe','keiner','kurz',px=FALKE_2,A=INK,F=GOLD,**KB)
CBj=m2(11,['krone_klein','hermelin'],'keiner','pony_a',**KB)
CBl=m2(11,'seemannsmuetze','keiner','pagen',W=INK,**KB)
CD3=dict(m2(12,'diadem_gross','keiner','hochsteck',J=RED,**KD),acc=['perlen'])
CDf=m2(12,'ohrringe','keiner','zopfkrone',**KD)
kreuz=[[('Referenz','Kreuz König (Master)',ref('kreuz_koenig')),
        ('CB-c Page','Federbarett mit Spitzenkragen',render('C',11,CBc)),
        ('CB-d1 Falkner','Falke 1 Pixel weiter rechts, Blick nach links',render('C',11,CBd1)),
        ('CB-d2 Falkner','Falke blickt nach rechts',render('C',11,CBd2)),
        ('CB-j Hermelinprinz','kleine Krone, Hermelinkragen',render('C',11,CBj)),
        ('CB-l Barett','flaches schwarzes Barett',render('C',11,CBl))],
       [('','',None),
        ('CD3 Hofdame','Hochsteckfrisur, Diadem, Perlenkette',render('C',12,CD3)),
        ('CD-f Zopfkrone','Zöpfe als Krone um den Kopf',render('C',12,CDf))]]
grid('Engere Auswahl: Kreuz (CB3, CB2, CB-b, CD-g gestrichen)',kreuz,'r23_auswahl_kreuz.png',per=6)
# ---------- Falke im Detail ----------
FALKE_alt=px(['.www..','GwKww.','.wOOww','.wOOww','..G.G.'],18,21)
S=11; box=(8,4,28,30)
items=[('bisher','Blick nach links',m2(11,'federkappe','keiner','kurz',px=FALKE_alt,A=INK,F=GOLD,**KB)),('Option 1','1 Pixel weiter rechts',CBd1),('Option 2','Blick nach rechts',CBd2)]
tw=(box[2]-box[0])*S; th=(box[3]-box[1])*S
im=Image.new('RGB',(3*(tw+pad)+pad,th+60),bg); d=ImageDraw.Draw(im)
for i,(n,dsc,sp) in enumerate(items):
    c=render('C',11,sp).crop(box).resize((tw,th),Image.NEAREST); im.paste(c,(pad+i*(tw+pad),pad)); d.text((pad+i*(tw+pad),pad+th+6),n+': '+dsc,fill=C['ink'],font=FB)
im.save('r23_falke.png'); print(im.size)
