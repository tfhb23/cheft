"""Grundfarben der Personen (ohne Formel-Schatten, ohne Weiß-Innenkante, ohne Nasen-Formelton). Aufruf: python3 farben_uebersicht.py [Ausgabe.png]"""
import os,sys,copy,collections
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import comp
from tiefe_vergleich import spec_of
from final_auswahl import *
KEYS=['herz_bube_a','herz_bube_b','herz_dame_a','herz_dame_b','herz_koenig','karo_bube','karo_dame','karo_koenig','kreuz_bube_a','kreuz_bube_b','kreuz_dame_a','kreuz_dame_b','kreuz_koenig','pik_bube','pik_dame','pik_koenig','pik_koenig_zwilling']
INFO={ # hex: (Gruppe, Element)
'f2b53a':('Metall','Gold: Saumlinien, Kronen, Diademe, Kordeln, Ohrringe, Monokelrand'),
'23201f':('Neutral','Tinte/Schwarz: Kleidung Kreuz und Pik, Zylinder, Augen, Brillen, Brauen, Federkappe'),
'd2362a':('Neutral','Rot: Kleidung Herz und Karo, Fez, Zylinderband, Edelsteine'),
'ffffff':('Weiß','Turbane, Schleier, Hermelin, Perlen, alle Pik-Haare'),
'f3cfae':('Haut','Haut Herz, Karo, Kreuz'),
'f6dfca':('Haut','Haut Pik (blass)'),
'd05a4a':('Haut','Lippen'),
'e0b48c':('Haut','Nase der Könige (Herz, Kreuz)'),
'6b3f22':('Haar','Braunes Haar Herz (Bube, Dame), Brauen'),
'5a3a24':('Haar','Braunes Haar Kreuz (Bube, Dame, König)'),
'e8b23a':('Haar','Blondes Haar Karo (Bube, Dame, König)'),
'cfc8bd':('Haar','Grauer Bart Herz König'),
'b3832a':('Haar','Bart Karo König (dunkles Gold)'),
'4e2c16':('Haar','Schnurrbart Kreuz König (dunkelbraun)'),
'3a2012':('Haar','Dunkelbraune Strähnen Kreuz Dame B'),
'1b1b1b':('Haar','Schnurrbart/Brauen Pik König Zwilling (fast Schwarz)'),
'f06a2d':('Akzent','Orange: Federn (Herz Bube B, Herz König)'),
'e4f2ff':('Akzent','Diamant-Weiß: Juwelen Karo Dame, Karo König'),
'6b4a2b':('Akzent','Falke: Körper (Kreuz Bube A)'),
'e8dcc0':('Akzent','Falke: Brust/Auge (Kreuz Bube A)'),
'514a48':('Formel','Zylinder-Glanz (Schwarz heller)'),
'484341':('Formel','Zylinder-Glanz Pik König Zwilling'),
'cccccc':('Formel','Falten in Weiß (Turbane, Schleier)'),
'a12219':('Formel','Fez-Falte Karo Bube (Rot dunkler)'),
'e59b04':('Formel','Turban-Falten Karo König (Gold dunkler)'),
}
def collect():
    use=collections.defaultdict(set)
    for k in KEYS:
        s,r,sp=spec_of(k); sp=copy.deepcopy(sp); sp['tiefe']='aus'
        if 'nase_n3' in sp['extra']: sp['extra']=[e for e in sp['extra'] if e!='nase_n3']
        L=comp.compose(s,sp,'ohne')
        for y in range(H):
            for x in range(W):
                p=L.p[x,y]
                if p[3]: use['%02x%02x%02x'%p[:3]].add(k)
    return use
def main(path):
    use=collect(); missing=[c for c in use if c not in INFO]; assert not missing,missing
    order=['Neutral','Metall','Weiß','Haut','Haar','Akzent','Formel']
    rows=[(g,c) for g in order for c in sorted(INFO,key=lambda c:-len(use.get(c,()))) if INFO[c][0]==g and c in use]
    rh=30; im=Image.new('RGB',(900,70+len(rows)*rh+60),BG); d=ImageDraw.Draw(im)
    d.text((10,8),'Grundfarben der Personen (ohne Formel-Schatten): %d'%len(rows),fill=INK,font=FONTB)
    d.text((10,34),'Farbe / Hex / Personen / Gruppe / Element',fill=INK,font=FONT)
    for i,(g,c) in enumerate(rows):
        y=64+i*rh; d.rectangle([10,y,50,y+rh-6],fill=hx(c),outline=INK)
        d.text((60,y+4),'#'+c,fill=INK,font=FONT); d.text((140,y+4),'%2d x'%len(use[c]),fill=INK,font=FONT)
        d.text((190,y+4),g,fill=INK,font=FONTB); d.text((330,y+4),INFO[c][1],fill=INK,font=FONT)
    n_hand=sum(1 for g,c in rows if g=='Formel')
    d.text((10,64+len(rows)*rh+8),'Davon %d per Formel abgeleitet (früher Handschatten) -> %d echte Grundfarben.'%(n_hand,len(rows)-n_hand),fill=INK,font=FONTB)
    im.save(path); print(len(rows),n_hand)
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','farben_uebersicht.png'))
