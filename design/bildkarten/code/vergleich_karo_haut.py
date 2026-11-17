"""Karo-Hautton: Varianten mit allen Karo-Charakteren. Aufruf: python3 vergleich_karo_haut.py [Ausgabe.png]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import lib
from tiefe_vergleich import spec_of
from final_auswahl import *
VARS=[('K1 (Satz B)','ecbf8f'),('K2 hell neutral','f3cfae'),('K3 rosig','e8b896'),('K4 sandig dunkler','dcae86'),('K5 bronze','d4a075'),('K6 hell rosig','f0c4a8')]
KEYS=['karo_bube','karo_dame','karo_koenig']
def main(path,S=6):
    cw=W*S+8; rh=H*S+22
    im=Image.new('RGB',(130+len(KEYS)*cw,16+len(VARS)*rh),BG); d=ImageDraw.Draw(im)
    old=lib.SKIN['D']
    for ri,(n,h) in enumerate(VARS):
        d.text((6,16+ri*rh+H*S//2-10),n,fill=INK,font=FONT); d.text((6,16+ri*rh+H*S//2+8),'#'+h,fill=INK,font=FONT)
        lib.SKIN['D']=hx(h)
        for ci,k in enumerate(KEYS):
            s,r,sp=spec_of(k); b=render(s,r,copy.deepcopy(sp)).resize((W*S,H*S),Image.NEAREST); im.paste(b,(130+ci*cw,16+ri*rh),b)
    lib.SKIN['D']=old; im.save(path); print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','karo_haut_vergleich.png'))
