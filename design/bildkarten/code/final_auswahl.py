"""Rendert den freigegebenen Stand der Bildkarten (Master v2 + gewählte Personen) und die Zwischenübersicht.

Aufruf (aus beliebigem Verzeichnis):
    python3 design/bildkarten/code/final_auswahl.py [Ausgabeordner]
Voraussetzung: pip install pillow
Standard-Ausgabe: design/bildkarten/images/render_aktuell/
"""
import os, sys, textwrap
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from masters_v2 import *          # comp, lib, parts, bust, MASTERS_V2, spec_v2, render_v2 ...
from masters import KING_DYN, BUBE_DYN, DAME_DYN
import parts as P

BG=(0xf2,0xe6,0xd0)
WHITE=C['white']; RED=C['red']; GOLD=C['gold']; INK=C['ink']
BROWN=HAIR['C']; DBROWN=BROWN; BLACK=C['ink']; SKIN_PIK=hx('f6dfca')
HH=dict(M=RED); KB=dict(H=BROWN,B=DBROWN); KD=dict(H=BROWN,M=RED)
OLD_FALKE=['..www.','.wwKwG','wwOOw.','wwOOw.','.G.G..']      # Falken-Zeichnung (freigegeben, NICHT ändern)

def px(rows,x,y): return P.pxart(rows,x,y)
def m2(rank,hat=(),beard='keiner',hair='glatze',extra=(),px=(),acc=(),**pal):
    """Spec im Master-v2-Stil (Körper symmetrisch, Person 1 Pixel angehoben, Aussparung links wie rechts)."""
    dyn=dict({13:KING_DYN,11:BUBE_DYN,12:DAME_DYN}[rank]); dyn.update(xmin=8,notch_left=True,lift=1)
    return dict(body='leer',hair=hair,beard=beard,hat=[hat] if isinstance(hat,str) else list(hat),extra=list(extra),acc=list(acc),pal=pal,dyn=dyn,lift=1,px=list(px))
def render(suit,rank,sp,emph='schlagschatten'): return card(suit,rank,sp,emph,'symm')

# ---------------- freigegebene neue Personen (zweite Person je Karte) ----------------
def _falke(x,y):
    sp=m2(11,'federkappe','keiner','kurz',('nase_n3',),px=px(OLD_FALKE,x,y),A=INK,**KB); sp['px_after']=True   # Vogel ohne Schatten
    return sp
def _falke_kopf(x0,y0=6):
    """Falke sitzt auf dem Kopf (Kappe ohne Feder). Rückgängig: _falke(22,20) mit 'federkappe'."""
    sp=m2(11,'kappe_ohne_feder','keiner','kurz',('nase_n3',),px=px(OLD_FALKE,x0,y0),A=INK,**KB); sp['px_after']=True
    return sp
PERSONEN={
 # Herz Bube
 'herz_bube_a':('H',11,m2(11,['turbm_a','mond_klein'],'keiner','kurz_b',('brauen',),A=WHITE,a=SHADE)),
 'herz_bube_b':('H',11,m2(11,['turban_klein','feder_s4'],'keiner','glatze',('brauen','nase_n3'),A=WHITE,a=SHADE,J=RED)),
 # Herz Dame
 'herz_dame_a':('H',12,m2(12,['fall_rc','mond_rc','sterne_schleier'],'keiner','rund_scheitel',('mund_schmal',),J=RED,**HH)),
 'herz_dame_b':('H',12,m2(12,['kamm5_8_rot_u','ohrringe'],'keiner','hochsteck',('mund_schmal',),**HH)),
 # Kreuz Bube
 'kreuz_bube_a':('C',11,_falke_kopf(13)),
 'kreuz_bube_b':('C',11,m2(11,['krone_klein','hermelin'],'keiner','pony_cj2',**KB)),
 # Kreuz Dame
 'kreuz_dame_a':('C',12,dict(m2(12,'diadem_gross','keiner','hochsteck',('mund_schmal',),J=RED,**KD),acc=['perlen'])),
 'kreuz_dame_b':('C',12,m2(12,'ohrringe','keiner','zopfkrone',('mund_schmal',),**KD)),
}
# Pik König Zwilling steht in masters_v2.py (pik_koenig_zwilling)

# Zuordnung für die Übersicht: je Karte zwei Plätze (Person 1, Person 2); None = fehlt noch
def slot(key):
    if key in MASTERS_V2: return render_v2(key)
    s,r,sp=PERSONEN[key]; return render(s,r,sp)
KARTEN=[('H',11,['herz_bube_a','herz_bube_b']),('H',12,['herz_dame_a','herz_dame_b']),('H',13,['herz_koenig',None]),
        ('D',11,['karo_bube',None]),('D',12,['karo_dame',None]),('D',13,['karo_koenig',None]),
        ('C',11,['kreuz_bube_a','kreuz_bube_b']),('C',12,['kreuz_dame_a','kreuz_dame_b']),('C',13,['kreuz_koenig',None]),
        ('S',11,['pik_bube',None]),('S',12,['pik_dame',None]),('S',13,['pik_koenig','pik_koenig_zwilling'])]

def blank(suit,rank):
    c=base(); idx=index_layer(suit,rank); c.over(idx); c.over(idx.rot()); return c.im
def dim(img,a=0.45):
    r=img.copy(); al=r.split()[3].point(lambda v:int(v*a)); r.putalpha(al); return r

def main(out):
    os.makedirs(out,exist_ok=True)
    keys=list(MASTERS_V2)+list(PERSONEN)
    for k in keys:
        im=slot(k); im.save(os.path.join(out,k+'_1x.png')); im.resize((W*10,H*10),Image.NEAREST).save(os.path.join(out,k+'_10x.png'))
    S=4; cw=W*S+6; gw=2*cw+14; lw=70
    im=Image.new('RGB',(lw+3*gw+10,4*(H*S+34)+84),BG); d=ImageDraw.Draw(im)
    d.text((10,6),'Zwischenübersicht: je Karte zwei Personen (blass = fehlt noch)',fill=INK,font=FONTB)
    for ci,rn in enumerate(('Bube','Dame','König')): d.text((lw+ci*gw,34),rn,fill=INK,font=FONTB)
    fehlt=0
    for ri,(s,sn) in enumerate((('H','Herz'),('D','Karo'),('C','Kreuz'),('S','Pik'))):
        y=58+ri*(H*S+34); d.text((10,y+H*S//2-8),sn,fill=INK,font=FONTB)
        for ci,rk in enumerate((11,12,13)):
            keys2=[k for (ss,rr,k) in KARTEN if ss==s and rr==rk][0]
            for i,k in enumerate(keys2):
                x=lw+ci*gw+i*cw
                if k: b=slot(k).resize((W*S,H*S),Image.NEAREST)
                else: b=dim(blank(s,rk)).resize((W*S,H*S),Image.NEAREST); d.text((x,y+H*S+2),'fehlt',fill=(0xb0,0x30,0x30),font=FONT); fehlt+=1
                im.paste(b,(x,y),b)
    im.save(os.path.join(out,'zwischenuebersicht.png'))
    print('gerendert:',len(keys),'Personen; fehlende zweite Personen:',fehlt,'; Ausgabe:',out)

if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','render_aktuell'))
