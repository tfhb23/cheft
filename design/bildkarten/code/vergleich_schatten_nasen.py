"""Vergleich: Außenschatten-Modi (S0-S3) und Nasen-Varianten (N1-N3). Aufruf: python3 vergleich_schatten_nasen.py [Ausgabeordner]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import comp
from tiefe_vergleich import spec_of
from final_auswahl import *
def rend(k,shadow='S1',nose=None):
    comp.SHADOW=shadow
    s,r,sp=spec_of(k); sp=copy.deepcopy(sp)
    if nose: sp['extra']=list(sp['extra'])+['nase_'+nose.lower()]
    return render(s,r,sp)
def sheet(path,keys,rows,S,label):
    cw=W*S+8; rh=H*S+8
    im=Image.new('RGB',(70+len(keys)*cw,30+len(rows)*rh),BG); d=ImageDraw.Draw(im)
    for ri,(name,fn) in enumerate(rows): d.text((6,30+ri*rh+H*S//2),name,fill=INK,font=FONTB)
    for ci,k in enumerate(keys):
        d.text((70+ci*cw,8),k,fill=INK,font=FONT)
        for ri,(name,fn) in enumerate(rows):
            b=fn(k).resize((W*S,H*S),Image.NEAREST); im.paste(b,(70+ci*cw,30+ri*rh),b)
    im.save(path)
def main(out):
    os.makedirs(out,exist_ok=True)
    wk=['herz_bube_a','herz_dame_a','herz_koenig','kreuz_bube_b','pik_bube','pik_dame','pik_koenig','pik_koenig_zwilling','karo_koenig']
    sheet(os.path.join(out,'schatten_vergleich.png'),wk,[(s,(lambda k,s=s: rend(k,s))) for s in ('S0','S1','S2','S3')],5,'')
    nk=['herz_bube_a','herz_bube_b','karo_bube','kreuz_bube_a','kreuz_bube_b','karo_koenig','pik_koenig_zwilling']
    sheet(os.path.join(out,'nasen_vergleich.png'),nk,[('ohne',lambda k: rend(k)),('N1',lambda k: rend(k,nose='N1')),('N2',lambda k: rend(k,nose='N2')),('N3',lambda k: rend(k,nose='N3'))],5,'')
    comp.SHADOW='S1'; print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','schatten_nasen'))
