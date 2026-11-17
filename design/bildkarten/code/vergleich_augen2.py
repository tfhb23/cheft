"""Augenfarben pro Familie in verschiedenen Intensitäten. Aufruf: python3 vergleich_augen2.py [Ausgabe.png]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import comp
from tiefe_vergleich import spec_of
from final_auswahl import *
SETS=[('Dezent',dict(H='3d2412',D='3a4a30',C='2c3a4f',S='3f4856')),
      ('Mittel (aktuell)',dict(H='4b2e18',D='3f5a3a',C='2f4a6b',S='4a5a6e')),
      ('Kräftig',dict(H='6a3a14',D='3f7a3a',C='2f62a0',S='4a6f94')),
      ('Intensiv',dict(H='8a4a12',D='2f9a4a',C='2f78c8',S='4a86b8'))]
KEYS=['herz_bube_a','herz_dame_a','karo_dame','karo_koenig','kreuz_bube_b','kreuz_koenig','pik_bube','pik_koenig_zwilling']
def main(path,S=14):
    crop=(11,12,22,20); cw=11*S+6; rh=8*S+30
    im=Image.new('RGB',(150+len(KEYS)*cw,30+len(SETS)*rh),BG); d=ImageDraw.Draw(im)
    for ci,k in enumerate(KEYS): d.text((150+ci*cw,8),k,fill=INK,font=FONT)
    old=dict(comp.EYE_COL)
    for ri,(n,t) in enumerate(SETS):
        d.text((6,30+ri*rh+10),n,fill=INK,font=FONTB)
        for j,(f,nm) in enumerate((('H','Herz'),('D','Karo'),('C','Kreuz'),('S','Pik'))): d.text((6,30+ri*rh+34+j*16),'%s #%s'%(nm,t[f]),fill=INK,font=FONT)
        for f,v in t.items(): comp.EYE_COL[f]=hx(v)
        for ci,k in enumerate(KEYS):
            s,r,sp=spec_of(k); b=render(s,r,copy.deepcopy(sp)).crop(crop).resize((11*S,8*S),Image.NEAREST); im.paste(b,(150+ci*cw,30+ri*rh),b)
    comp.EYE_COL.update(old); im.save(path); print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','augenfarben_intensitaet.png'))
