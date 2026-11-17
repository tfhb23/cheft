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
VEIL=dict(V=hx('f3e6c8'),v=hx('cdb98e'))
HH=dict(M=RED)
KB=dict(H=BROWN,B=DBROWN); KD=dict(H=BROWN,M=RED)
FALKE_R=px(['.www..','GwKww.','.wOOww','.wOOww','..G.G.'],18,21)
ZEPTER=px(P.OBJ_ZEPTER_KNAUF,21,16)+[(22,y,'G') for y in range(19,32)]
def render(suit,rank,sp,em='schlagschatten'): return card(suit,rank,sp,em,'symm')
def ref(name): su,rk,em,s2=spec_v2(name); return card(su,rk,s2,em,'symm')
def grid(title,rows,fname,S=5,per=8,lab=84):
    """rows: Liste von Zeilen, jede Zeile Liste von (name,desc,img oder None)"""
    cw=W*S+pad; n=max(len(r) for r in rows)
    im=Image.new('RGB',(max(n,per)*cw+pad,len(rows)*(H*S+lab)+34),bg); d=ImageDraw.Draw(im); d.text((pad,6),title,fill=C['ink'],font=FONTB)
    for ri,row in enumerate(rows):
        for ci,(nm,dsc,img) in enumerate(row):
            x=pad+ci*cw; y=30+ri*(H*S+lab)
            if img is not None:
                b=img.resize((W*S,H*S),Image.NEAREST); im.paste(b,(x,y),b)
            d.text((x,y+H*S+4),nm,fill=C['ink'],font=FB); d.multiline_text((x,y+H*S+22),'\n'.join(textwrap.wrap(dsc,23)[:4]),fill=C['ink'],font=FONT)
    im.save(fname); print(fname,im.size)

# ---------------- Auswahl Herz ----------------
HB4=m2(11,['takke','feder_ohr'],'keiner','kurz',A=WHITE,a=GOLD)
HB3=m2(11,['takke','feder_ohr'],'keiner','kurz',A=WHITE,a=GOLD,F=GOLD)
HB5=m2(11,'turban_klein','keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED)
HBk=m2(11,['takke_rund','mond_klein'],'keiner','kurz',('brauen',),A=WHITE,a=GOLD)
HDc=m2(12,['vl_haube','sterne_schleier'],'keiner','rund_scheitel',**VEIL,**HH)
HDa=m2(12,['vl_haube','mond'],'keiner','rund_scheitel',**VEIL,**HH)
HDg=m2(12,['kamm_mitte','ohrringe'],'keiner','hochsteck',**HH)
HDl=m2(12,['vl_haube','tikka'],'keiner','rund_scheitel',J=RED,**VEIL,**HH)
herz_rows=[[('Referenz','Herz König (Master)',ref('herz_koenig')),
            ('HB4 Schreiber','ganz früher Entwurf: Takke, orange Feder',render('H',11,HB4)),
            ('HB3 Schreiber','neuer Entwurf: goldene Feder',render('H',11,HB3)),
            ('HB5 Kalifensohn','kleiner Turban wie der König',render('H',11,HB5)),
            ('HB-k Mondbote','Kopf oben jetzt runder und höher',render('H',11,HBk))],
           [('','',None),
            ('HD-c Sternenschleier','luftiger Schleier, Scheitel, rundere Kopfform',render('H',12,HDc)),
            ('HD-a Mond + Schleier','luftiger Schleier, Mondsichel',render('H',12,HDa)),
            ('HD-g Goldkamm','Kamm jetzt genau mittig',render('H',12,HDg)),
            ('HD2 Layla','luftiger Schleier, runder Kopf, Stirnkette',render('H',12,HDl))]]
grid('Engere Auswahl Herz','',None) if False else None
grid('Engere Auswahl: Herz (Bube oben, Dame unten)',herz_rows,'r22_auswahl_herz.png',per=5)
# ---------------- Auswahl Kreuz ----------------
CB3=m2(11,'federkappe','keiner','pagen',A=INK,F=GOLD,**KB)
CB2=m2(11,'krone_klein','keiner','pony_a',**KB)
CBc=m2(11,['federkappe','krause'],'keiner','pagen',A=INK,F=GOLD,**KB)
CBd=m2(11,'federkappe','keiner','kurz',px=FALKE_R,A=INK,F=GOLD,**KB)
CBj=m2(11,['krone_klein','hermelin'],'keiner','pony_a',**KB)
CBb=m2(11,'krone_klein','keiner','pony_a',px=ZEPTER,J=RED,**KB)
CBl=m2(11,'seemannsmuetze','keiner','pagen',W=INK,**KB)
CD3=dict(m2(12,'diadem_gross','keiner','hochsteck',J=RED,**KD),acc=['perlen'])
CDg=m2(12,'diadem_gross','keiner','hochsteck',J=RED,**KD)
CDf=m2(12,'ohrringe','keiner','zopfkrone',**KD)
kreuz_rows=[[('Referenz','Kreuz König (Master)',ref('kreuz_koenig')),
             ('CB3 Page','Federbarett, Pagenfrisur',render('C',11,CB3)),
             ('CB2 Kronprinz','kleine Krone',render('C',11,CB2)),
             ('CB-c Page','Federbarett mit Spitzenkragen',render('C',11,CBc)),
             ('CB-d Falkner','Falke jetzt auf der rechten Schulter',render('C',11,CBd)),
             ('CB-j Hermelinprinz','kleine Krone, Hermelinkragen',render('C',11,CBj)),
             ('CB-b Kronprinz','kleine Krone und Zepter',render('C',11,CBb)),
             ('CB-l Barett','flaches schwarzes Barett',render('C',11,CBl))],
            [('','',None),
             ('CD3 Hofdame','Hochsteckfrisur, Diadem, Perlenkette',render('C',12,CD3)),
             ('CD-g Hofdame','wie CD3, ohne Fächer und ohne Brustelement',render('C',12,CDg)),
             ('CD-f Zopfkrone','Zöpfe als Krone um den Kopf',render('C',12,CDf))]]
grid('Engere Auswahl: Kreuz (Bube oben, Dame unten)',kreuz_rows,'r22_auswahl_kreuz.png',per=8)
# ---------------- Schleier-Studie ----------------
base=dict(hair='rund_scheitel')
W_=[('W1 Hauch','lang, sehr locker, fällt über die Schultern',m2(12,['vl_hauch'],'keiner','rund_scheitel',**VEIL,**HH)),
    ('W2 Haube luftig','anliegend, leicht gewellt',m2(12,['vl_haube'],'keiner','rund_scheitel',**VEIL,**HH)),
    ('W3 Kurz','endet am Kinn',m2(12,['vl_kurz'],'keiner','rund_scheitel',**VEIL,**HH)),
    ('W4 Weiter Bogen','weit ausgestellt, bis zum Kartenrand',m2(12,['vl_bogen'],'keiner','rund_scheitel',**VEIL,**HH)),
    ('W5 Nur Kontur','nur ein feiner Umriss, kein Stoff',m2(12,['vl_kontur'],'keiner','rund_scheitel',**VEIL,**HH)),
    ('W6 Kopftuch','locker gebunden, Knoten rechts, Haar darunter',m2(12,['vl_kopftuch'],'keiner','rund_scheitel',**VEIL,**HH)),
    ('W7 Nur hinten','Schleier fällt hinter dem Kopf, Gesicht frei',m2(12,['vl_hinten'],'keiner','rund_scheitel',**VEIL,**HH)),
    ('W8 Mantilla','Goldkamm in der Mitte, Schleier fließt herab',m2(12,['kamm_mitte','vl_mantilla'],'keiner','hochsteck',**VEIL,**HH))]
rows=[[(n,d,render('H',12,s)) for n,d,s in W_[:4]],[(n,d,render('H',12,s)) for n,d,s in W_[4:]]]
grid('Schleier und Kopftuch: luftig, Haar sichtbar, nicht eckig',rows,'r22_schleier.png',per=4,S=6)
# ---------------- Kombinationen ----------------
def trio(rowname,desc,suit,k,b,d): return [(rowname+' Bube','',render(suit,11,b)),(rowname+' Dame','',render(suit,12,d)),(rowname+' König','',ref(k))]
combos=[
 ('H1 Wunsch','Kalifensohn und Mond',[('Bube HB5',render('H',11,HB5)),('Dame HD-a',render('H',12,HDa)),('König',ref('herz_koenig'))]),
 ('H2 Schreiber','Schreiber und Layla',[('Bube HB3',render('H',11,HB3)),('Dame HD2',render('H',12,HDl)),('König',ref('herz_koenig'))]),
 ('H3 Mond','Mondbote und Sternenschleier',[('Bube HB-k',render('H',11,HBk)),('Dame HD-c',render('H',12,HDc)),('König',ref('herz_koenig'))]),
 ('K1 Krone','Kronprinz und Hofdame',[('Bube CB2',render('C',11,CB2)),('Dame CD3',render('C',12,CD3)),('König',ref('kreuz_koenig'))]),
 ('K2 Hof','Page und Zopfkrone',[('Bube CB-c',render('C',11,CBc)),('Dame CD-f',render('C',12,CDf)),('König',ref('kreuz_koenig'))]),
 ('K3 Jagd','Falkner und Hofdame',[('Bube CB-d',render('C',11,CBd)),('Dame CD-g',render('C',12,CDg)),('König',ref('kreuz_koenig'))]),
]
S=4; cw=W*S+pad; blockw=3*cw+30
im=Image.new('RGB',(2*blockw+pad,3*(H*S+50)+34),bg); d=ImageDraw.Draw(im); d.text((pad,6),'Kombinationen: links Herz, rechts Kreuz',fill=C['ink'],font=FONTB)
for i,(nm,dsc,cards) in enumerate(combos):
    col=0 if i<3 else 1; row=i%3; x0=pad+col*blockw; y=30+row*(H*S+50)
    for j,(lab,img) in enumerate(cards):
        b=img.resize((W*S,H*S),Image.NEAREST); im.paste(b,(x0+j*cw,y),b)
    d.text((x0,y+H*S+4),nm+': '+dsc,fill=C['ink'],font=FB)
im.save('r22_kombinationen.png'); print(im.size)
# ---------------- Änderungen im Detail ----------------
def crop(img,box,S): c=img.crop(box); return c.resize((c.width*S,c.height*S),Image.NEAREST)
items=[]
# Mondbote vorher/nachher
old=m2(11,['takke','mond_klein'],'keiner','kurz',('brauen',),A=WHITE,a=GOLD)
items+= [('Mondbote vorher','flach',crop(render('H',11,old),(5,3,27,18),8)),('Mondbote nachher','runder, höher',crop(render('H',11,HBk),(5,3,27,18),8))]
oldL=m2(12,['schleier','tikka'],'keiner','mittelscheitel_lang',V=hx('f4eee4'),J=RED,**HH)
items+= [('Layla vorher','flacher Kopf, eckiger Schleier',crop(render('H',12,oldL),(0,3,32,30),6)),('Layla nachher','runder Kopf, luftiger Schleier',crop(render('H',12,HDl),(0,3,32,30),6))]
oldK=m2(12,['kamm','ohrringe'],'keiner','hochsteck',**HH)
def with_center(img):
    d=ImageDraw.Draw(img); return img
k_old=crop(render('H',12,oldK),(5,2,27,16),8).convert('RGBA'); k_new=crop(render('H',12,HDg),(5,2,27,16),8).convert('RGBA')
for k in (k_old,k_new):
    dd=ImageDraw.Draw(k); dd.line([(11*8,0),(11*8,k.height)],fill=(0x2a,0x7f,0xd9,255),width=2)
items+= [('Kamm vorher','nicht mittig',k_old),('Kamm nachher','mittig (blau: Kartenmitte)',k_new)]
oldF=m2(11,'federkappe','keiner','kurz',px=px(P.OBJ_FALKE,5,20),A=INK,F=GOLD,**KB)
items+= [('Falkner vorher','Falke links',crop(render('C',11,oldF),(0,3,32,30),6)),('Falkner nachher','Falke rechts',crop(render('C',11,CBd),(0,3,32,30),6))]
cw2=max(i[2].width for i in items)+pad; rows_n=2
im=Image.new('RGB',(4*cw2+pad,2*(max(i[2].height for i in items)+50)+10),bg); d=ImageDraw.Draw(im)
mh=max(i[2].height for i in items)+50
for i,(nm,dsc,img) in enumerate(items):
    x=pad+(i%4)*cw2; y=10+(i//4)*mh
    im.paste(img,(x,y)); d.text((x,y+img.height+4),nm,fill=C['ink'],font=FB); d.text((x,y+img.height+22),dsc,fill=C['ink'],font=FONT)
im.save('r22_aenderungen.png'); print(im.size)
