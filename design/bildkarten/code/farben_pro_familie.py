"""Farbübersicht pro Familie (Kartensymbol) als Bild. Aufruf: python3 farben_pro_familie.py [Ausgabe.png]"""
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from lib import hx, FONT, FONTB, C
BG=(0xf2,0xe6,0xd0); INK=C['ink']
D={ # Familie: [(hex, Element, Personen, formel?)]
'Herz':[('d2362a','Rot: Kleidung, Mund der Damen, Edelsteine','alle',0),('23201f','Schwarz: Augen','alle',0),('f2b53a','Gold: Saumlinien, Turbanborte, Haarkamm, Ohrringe','alle',0),
 ('ffffff','Weiß: Turbane, Schleier','Bube A, Bube B, Dame A, König',0),('f3cfae','Haut','alle',0),('d05a4a','Lippen','Bube A, Bube B, König',0),('e0b48c','Nase','König',0),
 ('6b3f22','Braunes Haar und Brauen','Bube A, Bube B, Dame A, Dame B',0),('cfc8bd','Grauer Bart','König',0),('f06a2d','Orange: Federn','Bube B, König',0),
 ('a12219','Rot −0,13: Saumschattenlinien','Bube A, Bube B, Dame A, Dame B',1),('cccccc','Weiß −0,20: Turban- und Schleierfalten','Bube B, Dame A, König',1)],
'Karo':[('d2362a','Rot: Kleidung, Fez, Mund der Dame','alle',0),('23201f','Schwarz: Augen, Brauen','alle',0),('f2b53a','Gold: Saumlinien, Turban, Diadem, Fezquaste, Ohrringe','alle',0),
 ('e8b23a','Blondes Haar','Bube, Dame, König',0),('b3832a','Bart (dunkles Gold)','König',0),('f3cfae','Haut','alle',0),('d05a4a','Lippen','Bube, König',0),
 ('e4f2ff','Diamantweiß: Juwelen im Diadem und Turban','Dame, König',0),
 ('a12219','Rot −0,13: Fezfalte, Saumschattenlinien','Bube, Dame',1),('e59b04','Gold −0,13: Turbanfalten','König',1)],
'Kreuz':[('23201f','Schwarz: Kleidung, Augen, Federkappe','alle',0),('f2b53a','Gold: Saumlinien, Krone, Diadem, Falkenzeichnung','alle',0),
 ('d2362a','Rot: Edelsteine, Mund der Damen','Dame A, Dame B, König',0),('ffffff','Weiß: Hermelin, Perlen','Bube B, Dame A',0),
 ('5a3a24','Braunes Haar und Brauen','alle',0),('4e2c16','Schnurrbart (dunkelbraun)','König',0),('3a2012','Dunkelbraune Strähnen Zopfkrone','Dame B',0),
 ('6b4a2b','Falke: Körper','Bube A',0),('e8dcc0','Falke: Brust und Auge','Bube A',0),('f3cfae','Haut','alle',0),('d05a4a','Lippen','Bube A, Bube B, König',0),('e0b48c','Nase','König',0),
 ('484341','Schwarz +0,14: Saumschattenlinien','Bube A, Bube B, Dame A, Dame B',1)],
'Pik':[('23201f','Schwarz: Kleidung, Zylinder, Melone, Brillen, Augen, Brauen','alle',0),('ffffff','Weiß: Haare','Bube, Dame, König',0),
 ('f2b53a','Gold: Saumlinien, Monokelrand, Zylinderschnalle','alle',0),('d2362a','Rot: Hutbänder, Mund der Dame','Dame, König, König Zwilling',0),
 ('f6dfca','Haut (blass)','alle',0),('d05a4a','Lippen','Bube, König, König Zwilling',0),('1b1b1b','Fast Schwarz: Schnurrbart und Brauen','König Zwilling',0),
 ('484341','Schwarz +0,14: Saumschattenlinien','Bube, Dame',1),('514a48','Schwarz +0,17: Zylinderglanz','Dame, König, König Zwilling',1)],
}
def main(path):
    rh=26; hh=34; gap=12; W_=980
    H_=70+sum(hh+18+len(v)*rh+gap for v in D.values())+60
    im=Image.new('RGB',(W_,H_),BG); d=ImageDraw.Draw(im)
    d.text((14,10),'Farbcodes pro Familie',fill=INK,font=FONTB)
    d.text((14,34),'Formel = aus einer Grundfarbe per HSL abgeleitet (kein eigener Master-Wert)',fill=INK,font=FONT)
    y=64
    for fam,rows in D.items():
        d.rectangle([10,y,W_-10,y+hh-6],fill=INK); d.text((20,y+7),fam,fill=(255,255,255),font=FONTB); y+=hh
        d.text((70,y-2),'Farbcode',fill=INK,font=FONT); d.text((170,y-2),'Element',fill=INK,font=FONT); d.text((640,y-2),'Personen',fill=INK,font=FONT)
        y+=18
        for hexv,el,pers,fo in rows:
            d.rectangle([14,y,48,y+rh-8],fill=hx(hexv),outline=INK)
            d.text((60,y+3),'#'+hexv,fill=INK,font=FONT)
            d.text((170,y+3),('Formel · ' if fo else '')+el,fill=INK,font=FONTB if fo else FONT)
            d.text((640,y+3),pers,fill=INK,font=FONT); y+=rh
        y+=gap-18+18
    im.crop((0,0,W_,y+10)).save(path); print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','farben_pro_familie.png'))
