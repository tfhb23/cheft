"""Haar-Varianten: Herz grau heller, Herz/Kreuz Braun unterscheiden. Aufruf: python3 vergleich_haar.py [Ausgabeordner]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import lib
from tiefe_vergleich import spec_of
from final_auswahl import *
def hair_sheet(path,keys,rows,S,crop,labels_fn):
    cw=(crop[2]-crop[0])*S+8; rh=(crop[3]-crop[1])*S+8
    im=Image.new('RGB',(190+len(keys)*cw,16+len(rows)*rh),BG); d=ImageDraw.Draw(im)
    for ri,row in enumerate(rows):
        for li,t in enumerate(labels_fn(row)): d.text((6,16+ri*rh+rh//2-18+li*16),t,fill=INK,font=FONT)
        for ci,k in enumerate(keys):
            s,r,sp=spec_of(k); sp=copy.deepcopy(sp); row['apply'](k,sp)
            b=render(s,r,sp).crop(crop).resize(((crop[2]-crop[0])*S,(crop[3]-crop[1])*S),Image.NEAREST); im.paste(b,(190+ci*cw,16+ri*rh),b)
    im.save(path)
def grau(hexv):
    def f(k,sp):
        if hexv: sp['pal']['H']=sp['pal']['B']=hx(hexv)
    return dict(apply=f,name=hexv)
def braun(herz,kreuz):
    def f(k,sp):
        if k.startswith('herz') and herz: lib.HAIR['H']=hx(herz)
        if k.startswith('kreuz'): sp['pal']['H']=hx(kreuz); sp['pal']['B']=hx(kreuz)
    return dict(apply=f,name=(herz,kreuz),herz=herz)
def main(out):
    os.makedirs(out,exist_ok=True)
    G=[('Aktuell','cfc8bd'),('G1','d6d0c6'),('G2','ddd8cf'),('G3','e4dfd7'),('G4 neutral','dcd9d4')]
    rows=[dict(grau(h),label=n) for n,h in G]
    hair_sheet(os.path.join(out,'herz_grau_vergleich.png'),['herz_koenig'],rows,12,(8,0,24,26),lambda r:[r['label'],'#'+r['name']])
    # Braun: Herz und Kreuz unterscheiden (Herz-Wert wird pro Zeile gesetzt, danach zurück)
    B=[('Aktuell','6b3f22','5a3a24'),('P1 Kreuz aschbraun','6b3f22','4a3a30'),('P2 Kreuz Espresso','6b3f22','4e3322'),('P3 Herz rötlicher','7a4526','5a3a24'),
       ('P4 Herz rötlich + Kreuz asch','7a4526','4a3a30'),('P5 Kreuz Graubraun hell','6b3f22','5c4b3f'),('P6 Herz heller + Kreuz Espresso','7f4d2b','4e3322')]
    old=lib.HAIR['H']; keys=['herz_bube_a','herz_dame_b','kreuz_bube_b','kreuz_dame_b','kreuz_koenig']
    cw=16*6+8; rh=24*6+8
    im=Image.new('RGB',(260+len(keys)*cw,16+len(B)*rh),BG); d=ImageDraw.Draw(im)
    for ri,(n,h,k_) in enumerate(B):
        d.text((6,16+ri*rh+rh//2-22),n,fill=INK,font=FONT); d.text((6,16+ri*rh+rh//2-4),'Herz #'+h,fill=INK,font=FONT); d.text((6,16+ri*rh+rh//2+12),'Kreuz #'+k_,fill=INK,font=FONT)
        lib.HAIR['H']=hx(h)
        for ci,k in enumerate(keys):
            s,r,sp=spec_of(k); sp=copy.deepcopy(sp)
            if k.startswith('kreuz'): sp['pal']['H']=hx(k_); sp['pal']['B']=hx(k_)
            b=render(s,r,sp).crop((8,2,24,26)).resize((16*6,24*6),Image.NEAREST); im.paste(b,(260+ci*cw,16+ri*rh),b)
    lib.HAIR['H']=old; im.save(os.path.join(out,'braun_vergleich.png')); print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','haar'))
