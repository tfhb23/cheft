"""Hautton Karo heller / Kreuz dunkler: Varianten. Aufruf: python3 vergleich_haut2.py [Ausgabe.png]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import lib
from tiefe_vergleich import spec_of
from final_auswahl import *
VARS=[('Aktuell',dict(D='f3cfae',C='f3d1b5')),('H1 sanft',dict(D='f5d4b9',C='eec6a6')),('H2 mittel',dict(D='f6d7bd',C='ebc29f')),('H3 deutlich',dict(D='f7dbc4',C='e8bc96'))]
KEYS=['herz_bube_a','karo_bube','karo_dame','karo_koenig','kreuz_bube_a','kreuz_dame_a','kreuz_koenig','pik_bube']
def main(path,S=4):
    cw=W*S+6; rh=H*S+22
    im=Image.new('RGB',(110+len(KEYS)*cw,16+len(VARS)*rh),BG); d=ImageDraw.Draw(im)
    old=dict(lib.SKIN)
    for ri,(n,t) in enumerate(VARS):
        d.text((6,16+ri*rh+H*S//2-16),n,fill=INK,font=FONT); d.text((6,16+ri*rh+H*S//2),'Karo #'+t['D'],fill=INK,font=FONT); d.text((6,16+ri*rh+H*S//2+16),'Kreuz #'+t['C'],fill=INK,font=FONT)
        for k,v in t.items(): lib.SKIN[k]=hx(v)
        for ci,k in enumerate(KEYS):
            s,r,sp=spec_of(k); b=render(s,r,copy.deepcopy(sp)).resize((W*S,H*S),Image.NEAREST); im.paste(b,(110+ci*cw,16+ri*rh),b)
    lib.SKIN.update(old); im.save(path); print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','haut_karo_kreuz_vergleich.png'))
