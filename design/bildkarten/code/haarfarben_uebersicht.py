"""Haarfarben pro Familie (Haar, Bart, Brauen) mit Personen und Bezug zum Design Guide. Aufruf: python3 haarfarben_uebersicht.py [Ausgabe.png]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from final_auswahl import *
import lib
from tiefe_vergleich import spec_of
# (Hex, Element, Personen, Guide-Bezug, Hinweis)
HAAR={
'Herz':[('6b3f22','Haar und Brauen','Bube A, Bube B (nur Brauen), Dame A, Dame B','1.26 Haar Herz',''),
        ('cfc8bd','Haar, Bart und Brauen (grau)','König','–','Ausnahme: Alter, bewusst grau')],
'Karo':[('cd9a32','Haar, Bart und Brauen (Mix aus Blond und Bart)','Bube, Dame, König','Mix aus 1.27 und 1.31','Ein Wert für die ganze Familie; rückgängig: KARO_MIX in lib.py')],
'Kreuz':[('5a3a24','Haar, Brauen und Schnurrbart','alle (5 Personen)','–  (Guide 1.28 = #2b2b2b)','Strähnen der Zopfkrone per Formel (−0,13)')],
'Pik':[('ffffff','Haar (weiß)','Bube, Dame, König','–  (Guide 1.29 = #8a4a2a)',''),
       ('23201f','Schnurrbart und Brauen (Tinte 1.01)','König Zwilling (Glatze)','1.01 Tinte','Ausnahme: Glatze, Schnurrbart braucht Kontrast')],
}
KEYS={'Herz':['herz_bube_a','herz_bube_b','herz_dame_a','herz_dame_b','herz_koenig'],'Karo':['karo_bube','karo_dame','karo_koenig'],
      'Kreuz':['kreuz_bube_a','kreuz_bube_b','kreuz_dame_a','kreuz_dame_b','kreuz_koenig'],'Pik':['pik_bube','pik_dame','pik_koenig','pik_koenig_zwilling']}
def main(path):
    S=7; hw,hh=16*S,24*S; W_=1260; top=70; gap=16
    blocks=[]; 
    H_=top+sum(34+max(hh+10,len(v)*46+24)+gap for v in HAAR.values())+20
    im=Image.new('RGB',(W_,H_),BG); d=ImageDraw.Draw(im)
    d.text((14,10),'Haarfarben pro Familie',fill=INK,font=FONTB)
    d.text((14,36),'Regel: eine Haarfarbe pro Familie (Haar, Bart, Brauen). Abweichungen sind als Ausnahme begründet.',fill=INK,font=FONT)
    y=top
    for fam,rows in HAAR.items():
        d.rectangle([10,y,W_-10,y+28],fill=INK); d.text((20,y+5),fam,fill=(255,255,255),font=FONTB); y+=34
        for i,(hexv,el,pers,gd,note) in enumerate(rows):
            yy=y+i*46
            d.rectangle([14,yy,54,yy+34],fill=hx(hexv),outline=INK); d.text((64,yy+1),'#'+hexv+'  '+el,fill=INK,font=FONTB)
            d.text((64,yy+20),pers+'   ·   Guide: '+gd,fill=INK,font=FONT)
            if note: d.text((64,yy+36),note,fill=(0xb0,0x30,0x30),font=FONT)
        for ci,k in enumerate(KEYS[fam]):
            s,r,sp=spec_of(k); b=render(s,r,copy.deepcopy(sp)).crop((8,2,24,26)).resize((hw,hh),Image.NEAREST)
            im.paste(b,(560+ci*(hw+6),y),b)
        y+=max(hh+10,len(rows)*46+24)+gap
    im.crop((0,0,W_,y)).save(path); print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','haarfarben_uebersicht.png'))
