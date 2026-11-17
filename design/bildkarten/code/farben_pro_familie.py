"""Farbübersicht pro Familie (Kartensymbol) als Bild. Aufruf: python3 farben_pro_familie.py [Ausgabe.png]"""
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from lib import hx, FONT, FONTB, C, SKIN as SKIN_LIB
import tiefe
h6=lambda c:'%02x%02x%02x'%tuple(c[:3])
SKIN=hx('f3cfae'); SKINP=hx('f6dfca'); BR=hx('645144')
BG=(0xf2,0xe6,0xd0); INK=C['ink']
D={ # Familie: [(hex, Element, Personen, formel?)]
'Herz':[('d2362a','Rot: Kleidung','alle',0),('23201f','Schwarz: Augen','alle',0),('f2b53a','Gold: Saumlinien, Turbanborte, Haarkamm, Ohrringe','alle',0),
 ('ffffff','Weiß: Turbane, Schleier','Bube A, Bube B, Dame A, König',0),('f3cfae','Haut','alle',0),('d05a4a','Lippen','Bube A, Bube B, König',0),('%s'%h6(tiefe.lo(SKIN)),'Haut −0,13: Nase (aus dem Hautton)','König, Bube B',1),
 ('7a4526','Braunes Haar und Brauen','Bube A, Bube B, Dame A, Dame B',0),('ddd8cf','Grauer Bart und Haar','König',0),('f06a2d','Cheft-Orange 1.10: Federn, Edelsteine','Bube B, Dame A, König',0),
 ('a12219','Rot −0,13: Saumschattenlinien','Bube A, Bube B, Dame A, Dame B',1),('cccccc','Weiß −0,20: Turban- und Schleierfalten','Bube B, Dame A, König',1)],
'Karo':[('d2362a','Rot: Kleidung, Fez, Mund der Dame','alle',0),('23201f','Schwarz: Augen, Brauen','alle',0),('f2b53a','Gold: Saumlinien, Turban, Diadem, Fezquaste, Ohrringe','alle',0),
 ('d7ad54','Haar, Bart und Brauen (Sandblond)','Bube, Dame, König',0),('%s'%h6(tiefe.lo(SKIN)),'Haut −0,13: Nase','König',1),('f3cfae','Haut','alle',0),('d05a4a','Lippen','Bube, König',0),
 ('f0f0f0','Weiß 1.24 −0,06: Juwelen im Diadem und Turban','Dame, König',1),
 ('a12219','Rot −0,13: Fezfalte, Saumschattenlinien','Bube, Dame',1),('e59b04','Gold −0,13: Turbanfalten','König',1)],
'Kreuz':[('23201f','Schwarz: Kleidung, Augen, Federkappe','alle',0),('f2b53a','Gold: Saumlinien, Krone, Diadem, Falkenzeichnung','alle',0),
 ('f06a2d','Cheft-Orange 1.10: Edelsteine','Dame A, König',0),('ffffff','Weiß: Hermelin, Perlen','Bube B, Dame A',0),
 ('645144','Braunes Haar, Brauen und Schnurrbart (ein Braun)','alle',0),('%s'%h6(tiefe.lo(BR)),'Braun −0,13: Strähnen der Zopfkrone','Dame B',1),('%s'%h6(tiefe.hi(BR)),'Braun +0,12: Falke Körper','Bube A',1),('cdbb94','Falke: Brust (Guide 1.08 Sand dunkel)','Bube A',0),('f3cfae','Haut','alle',0),('d05a4a','Lippen','Bube A, Bube B, König',0),('%s'%h6(tiefe.lo(SKIN)),'Haut −0,13: Nase (aus dem Hautton)','König, Bube A',1),
 ('514a48','Schwarz +0,17: Saum + Zylinderglanz','Bube A, Bube B, Dame A, Dame B',1)],
'Pik':[('23201f','Schwarz: Kleidung, Zylinder, Melone, Brillen, Augen, Schnurrbart','alle',0),('ffffff','Weiß: Haare','Bube, Dame, König',0),
 ('f2b53a','Gold: Saumlinien, Monokelrand, Zylinderschnalle','alle',0),('f06a2d','Cheft-Orange 1.10: Hutbänder','Dame, König, König Zwilling',0),
 ('f6dfca','Haut (blass)','alle',0),('d05a4a','Lippen','Bube, König, König Zwilling',0),('%s'%h6(tiefe.lo(SKINP)),'Haut −0,13: Nase','König Zwilling',1), ('514a48','Schwarz +0,17: Saum + Zylinderglanz','Bube, Dame, König, König Zwilling',1)],
}
SUIT={'Herz':'H','Karo':'D','Kreuz':'C','Pik':'S'}
PERS=dict( # Lippen Männer, Lippen Damen, Nase
 Herz=('Bube A, Bube B, König','Dame A, Dame B','König, Bube B'),Karo=('Bube, König','Dame','König'),
 Kreuz=('Bube A, Bube B, König','Dame A, Dame B','König, Bube A'),Pik=('Bube, König, König Zwilling','Dame','König Zwilling'))
def mix(sk,al): return tuple(round(sk[i]*(1-al)+C['red'][i]*al) for i in range(3))
def rows_for(fam):
    import comp
    sk=SKIN_LIB[SUIT[fam]]; pm,pf,pn=PERS[fam]; out=[]
    for hexv,el,pers,fo in D[fam]:
        if el.startswith('Haut') and not fo:
            out.append((h6(sk),'Haut (Hautton der Familie)','alle',0))
            out.append((h6(comp.EYE_COL[SUIT[fam]]),'Augen (Familienfarbe, 1 px)','alle',0))
            out.append((h6(tiefe.nase(sk)),'Haut −0,18: Nase','%s'%pn,1))
            out.append((h6(mix(sk,comp.LIPS[0])),'Rot 1.14, %d %% auf Haut: Lippen'%round(comp.LIPS[0]*100),pm,1))
            out.append((h6(mix(sk,comp.LIPS[1])),'Rot 1.14, %d %% auf Haut: Lippen'%round(comp.LIPS[1]*100),pf,1))
        elif el.startswith('Lippen') or 'Nase' in el: continue
        else: out.append((hexv,el.replace(', Mund der Damen','').replace(', Mund der Dame','').replace('Rot: Hutbänder, Mund der Dame','Rot: Hutbänder'),pers,fo))
    return out
def main(path):
    rh=26; hh=34; gap=12; W_=980
    H_=70+sum(hh+18+(len(v)+3)*rh+gap for v in D.values())+60
    im=Image.new('RGB',(W_,H_),BG); d=ImageDraw.Draw(im)
    d.text((14,10),'Farbcodes pro Familie',fill=INK,font=FONTB)
    d.text((14,34),'Formel = aus einer Grundfarbe per HSL abgeleitet (kein eigener Master-Wert)',fill=INK,font=FONT)
    y=64
    for fam in D:
        rows=rows_for(fam)
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
