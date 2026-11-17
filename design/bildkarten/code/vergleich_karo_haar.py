"""Karo: eine Haarfarbe für die ganze Familie, Varianten. Aufruf: python3 vergleich_karo_haar.py [Ausgabe.png]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import lib
from tiefe_vergleich import spec_of
from final_auswahl import *
VARS=[('Aktuell (Mix)','cd9a32'),('K-a gedämpft','c8963e'),('K-b Honig heller','d4a64a'),('K-c Bronze dunkler','b98a3c'),('K-d Sandblond','d9b25e'),('K-e Amber kupfrig','c4852e')]
KEYS=['karo_bube','karo_dame','karo_koenig']
def main(path,S=6):
    cw=W*S+8; rh=H*S+22
    im=Image.new('RGB',(150+len(KEYS)*cw,16+len(VARS)*rh),BG); d=ImageDraw.Draw(im)
    o=(lib.HAIR['D'],lib.BEARD['D'])
    for ri,(n,h) in enumerate(VARS):
        d.text((6,16+ri*rh+H*S//2-10),n,fill=INK,font=FONT); d.text((6,16+ri*rh+H*S//2+8),'#'+h,fill=INK,font=FONT)
        lib.HAIR['D']=lib.BEARD['D']=hx(h)
        for ci,k in enumerate(KEYS):
            s,r,sp=spec_of(k); b=render(s,r,copy.deepcopy(sp)).resize((W*S,H*S),Image.NEAREST); im.paste(b,(150+ci*cw,16+ri*rh),b)
    lib.HAIR['D'],lib.BEARD['D']=o; im.save(path); print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','karo_haar_vergleich.png'))
