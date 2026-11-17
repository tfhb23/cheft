"""Augenfarben: Pixel-Beispiele S0-S4. Aufruf: python3 vergleich_augen.py [Ausgabe.png]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import comp
from tiefe_vergleich import spec_of
from final_auswahl import *
STY=[('S0 Tinte (bisher)',None),('S1 1 px, Haarfarbe dunkler',"S1"),('S2 1 px, Familienfarbe',"S2"),('S3 2 px: Weiß + Iris',"S3"),('S4 1 px + Lidschatten',"S4")]
KEYS=['herz_bube_a','herz_dame_a','karo_dame','karo_koenig','kreuz_bube_b','kreuz_koenig','pik_bube','pik_koenig_zwilling']
def main(path,S=16):
    crop=(11,11,22,20); cw=11*S+6; rh=9*S+8
    im=Image.new('RGB',(200+len(KEYS)*cw,34+len(STY)*rh),BG); d=ImageDraw.Draw(im)
    d.text((6,8),'Augenfarben (Familienfarben S2: Herz #4b2e18, Karo #3f5a3a, Kreuz #2f4a6b, Pik #4a5a6e)',fill=INK,font=FONT)
    for ci,k in enumerate(KEYS): d.text((200+ci*cw,20),k,fill=INK,font=FONT)
    for ri,(n,st) in enumerate(STY):
        d.text((6,34+ri*rh+rh//2-8),n,fill=INK,font=FONT)
        comp.EYE=st
        for ci,k in enumerate(KEYS):
            s,r,sp=spec_of(k); b=render(s,r,copy.deepcopy(sp)).crop(crop).resize((11*S,9*S),Image.NEAREST); im.paste(b,(200+ci*cw,34+ri*rh),b)
    comp.EYE=None; im.save(path); print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','augen_vergleich.png'))
