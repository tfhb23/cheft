"""Lippen als Rot-Deckkraft auf dem Hautton (Männer/Frauen). Aufruf: python3 vergleich_lippen.py [Ausgabe.png]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import comp
from tiefe_vergleich import spec_of
from final_auswahl import *
VARS=[('V0 wie bisher',(0.76,1.0)),('V1',(0.60,0.90)),('V2',(0.50,0.85)),('V3',(0.40,0.75))]
KEYS=['herz_bube_a','herz_koenig','herz_dame_a','karo_koenig','karo_dame','kreuz_koenig','kreuz_dame_b','pik_bube','pik_dame','pik_koenig_zwilling']
def main(path,S=12):
    cw=17*S+6; rh=14*S+8
    im=Image.new('RGB',(150+len(KEYS)*cw,30+len(VARS)*rh),BG); d=ImageDraw.Draw(im)
    for ri,(n,l) in enumerate(VARS): d.text((6,30+ri*rh+rh//3),n,fill=INK,font=FONT)
    old=comp.LIPS
    for ci,k in enumerate(KEYS):
        d.text((150+ci*cw,8),k,fill=INK,font=FONT)
        for ri,(n,l) in enumerate(VARS):
            comp.LIPS=l; s,r,sp=spec_of(k); b=render(s,r,copy.deepcopy(sp)).crop((8,11,25,25)).resize((17*S,14*S),Image.NEAREST); im.paste(b,(150+ci*cw,30+ri*rh),b)
    comp.LIPS=old; im.save(path); print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','lippen_vergleich.png'))
