"""Aktueller Layout-Stand (Bildkarten): v3 (Index links oben ganz, Person 2 px rechts, kein Symbol unten links), Kopf 1 px höher/tiefer wie v4,
Körper unten 2 px kürzer, Kopf 1 px schmaler (Variante A), Kinn 1 px kürzer, große Hüte/Frisuren kleiner.
Aufruf: python3 final_layout.py [Ausgabeordner]  ->  Übersicht aller Karten + Einzelbilder (1x, 10x)."""
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from vergleich_layout_symbole import *
# ops: ('sq',y0,y1,[k]) Spalten Mitte±k raus | ('del',y0,y1,[k]) Zellen Mitte±k leeren | ('down',[y]) Zeilen raus, oberer Teil rückt nach unten | ('up',[y]) Zeilen raus, unterer Teil rückt nach oben
SHRINK={
 'pik_koenig':[('down',[4,5]),('up',[26,27])],                       # Zylinder 2 px niedriger (Breite wie vorher), Haar 2 px kürzer
 'pik_koenig_zwilling':[('down',[7,8])],                              # Zylinder 2 px niedriger (Breite wie vorher)
 'karo_koenig':[('down',[4,9]),('sq',3,12,[3]),('up',[26,27])],
 'herz_koenig':[('down',[8,11]),('sq',7,13,[3]),('up',[26,27])],
 'karo_bube':[('down',[8,10]),('sq',5,13,[3]),('del',13,17,[5])],    # Fez-Unterkante gleich breit wie der Fez, Haar nicht breiter als das Gesicht
 'pik_dame':[('up',[25,26])],                                         # Bob wieder volle Breite (je 1 weißer Pixel links/rechts), nur 2 px kürzer
 'herz_dame_a':[('sq',6,31,[7]),('up',[28,29])],
 'kreuz_bube_a':[('del',13,13,[6])],                                  # Hutkrempe links/rechts 1 px kürzer (stößt sonst ans Symbol)
  'kreuz_dame_b':[('del',11,13,[6]),('del',15,15,[6])],              # Zopfkrone/Haarkante links/rechts 1 px kürzer

 'herz_dame_b':[('put',18,18,[(-4,'S'),(4,'S'),(-5,'.'),(5,'.')]),('put',19,20,[(-4,'G'),(4,'G'),(-5,'.'),(5,'.')])],   # Ohr + Ohrring 1 px näher am Kopf (Spalte 4/12 statt 3/13), keine "Backen" mehr
}
SHRINK['pik_koenig_zwilling']=SHRINK['pik_koenig_zwilling']+[('del',13,13,[6])]   # Zylinderkrempe 1 px kürzer
MODE='v6a'      # Person mittig (v5a = 2 px nach rechts)
def final_spec(k):
    s,r,sp=spec_of(k); return s,r,dict(sp,shrink=SHRINK.get(k,[]),chin=True)
def render_final(k,mode=None):
    s,r,sp=final_spec(k); return card(s,r,sp,'schlagschatten',mode or MODE)
def blank_card(s,r):
    c=base(); idx=index_layer(s,r); c.over(idx); c.over(idx.rot()); return c.im
def main(out):
    os.makedirs(out,exist_ok=True); keys=personen(); bad=0
    for k in keys:
        im=render_final(k); s,r,_=spec_of(k)
        if check_sym(k,im): bad+=1; print('Symbol links oben nicht ganz sichtbar:',k)
        im.save(os.path.join(out,k+'_1x.png')); im.resize((W*10,H*10),Image.NEAREST).save(os.path.join(out,k+'_10x.png'))
    S=5; cw=W*S+6; gw=2*cw+14; lw=70
    im=Image.new('RGB',(lw+3*gw+10,4*(H*S+30)+84),BG); d=ImageDraw.Draw(im)
    d.text((10,6),'Bildkarten, aktueller Layout-Stand: je Karte zwei Personen (blass = zweite Person fehlt noch)',fill=INK,font=FONTB)
    for ci,rn in enumerate(('Bube','Dame','König')): d.text((lw+ci*gw,34),rn,fill=INK,font=FONTB)
    for ri,(s,sn) in enumerate((('H','Herz'),('D','Karo'),('C','Kreuz'),('S','Pik'))):
        y=58+ri*(H*S+30); d.text((10,y+H*S//2-8),sn,fill=INK,font=FONTB)
        for ci,rk in enumerate((11,12,13)):
            ks=[k for (ss,rr,k) in KARTEN if ss==s and rr==rk][0]
            for i,k in enumerate(ks):
                x=lw+ci*gw+i*cw
                if k: b=render_final(k).resize((W*S,H*S),Image.NEAREST)
                else:
                    b=blank_card(s,rk); al=b.split()[3].point(lambda v:int(v*0.45)); b.putalpha(al); b=b.resize((W*S,H*S),Image.NEAREST)
                    d.text((x,y+H*S+2),'fehlt',fill=(0xb0,0x30,0x30),font=FONT)
                im.paste(b,(x,y),b)
    im.save(os.path.join(out,'uebersicht_final.png')); print('Personen:',len(keys),'| Probleme:',bad)
def check_sym(k,im):
    px=im.convert('RGBA').load(); s,r,_=spec_of(k); ink=inkOf(s)
    return [(x,y) for y in range(11,18) for x in range(3,10) if SH[s][y-11][x-3]=='#' and px[x,y][:3]!=ink]
if __name__=='__main__':
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','images','final_layout'))
