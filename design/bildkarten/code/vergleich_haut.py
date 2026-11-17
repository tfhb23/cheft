"""Hauttöne pro Familie: Vorschläge im Vergleich. Aufruf: python3 vergleich_haut.py [Ausgabe.png]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import comp, lib
from tiefe_vergleich import spec_of
from final_auswahl import *
SETS=[('Aktuell',dict(H='f3cfae',D='f3cfae',C='f3cfae',S='f6dfca')),
 ('A sanft',dict(H='eec4a0',D='f0c79a',C='f4d4b6',S='f9e9de')),
 ('B deutlich',dict(H='e3b58c',D='ecbf8f',C='f3d1b5',S='f8e8dc'))]
KEYS=['herz_bube_a','herz_koenig','karo_bube','karo_koenig','kreuz_bube_b','kreuz_koenig','pik_bube','pik_koenig_zwilling']
def main(path,S=5):
    cw=W*S+6; rh=H*S+26
    im=Image.new('RGB',(110+len(KEYS)*cw,30+len(SETS)*rh),BG); d=ImageDraw.Draw(im)
    old=dict(lib.SKIN)
    for ri,(n,t) in enumerate(SETS):
        d.text((6,30+ri*rh+60),n,fill=INK,font=FONT)
        d.text((6,30+ri*rh+80),' '.join('%s:%s'%(k,v) for k,v in t.items() if k in 'HS'),fill=INK,font=FONT) if False else None
        for k,v in t.items(): lib.SKIN[k]=hx(v)
        for ci,k in enumerate(KEYS):
            s,r,sp=spec_of(k); b=render(s,r,copy.deepcopy(sp)).resize((W*S,H*S),Image.NEAREST); im.paste(b,(110+ci*cw,30+ri*rh),b)
        d.text((110,30+ri*rh+H*S+4),'Herz %s · Karo %s · Kreuz %s · Pik %s'%(t['H'],t['D'],t['C'],t['S']),fill=INK,font=FONT)
    lib.SKIN.update(old); im.save(path); print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','hauttoene_vergleich.png'))
