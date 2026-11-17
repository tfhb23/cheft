"""Vergleich der Tiefe-Varianten (Original, A, B, C, D) für alle Personen. Aufruf: python3 tiefe_vergleich.py [Ausgabeordner]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from final_auswahl import *
S=3; VAR=[None,'A','B','C','D']
def spec_of(k):
    if k in MASTERS_V2: s,r,e,sp=spec_v2(k); return s,r,sp
    return PERSONEN[k]
def rend(k,v):
    s,r,sp=spec_of(k); sp=copy.deepcopy(sp)
    if v: sp['tiefe']=v
    return render(s,r,sp)
def main(out):
    os.makedirs(out,exist_ok=True)
    keys=[k for k in list(MASTERS_V2)+list(PERSONEN)]
    order=['herz_bube_a','herz_bube_b','herz_dame_a','herz_dame_b','herz_koenig','karo_bube','karo_dame','karo_koenig','kreuz_bube_a','kreuz_bube_b','kreuz_dame_a','kreuz_dame_b','kreuz_koenig','pik_bube','pik_dame','pik_koenig','pik_koenig_zwilling']
    assert set(order)==set(keys),set(keys)^set(order)
    for v in VAR[1:]:
        for k in order: rend(k,v).save(os.path.join(out,'%s_tiefe%s_1x.png'%(k,v)))
    for si,chunk in enumerate((order[:6],order[6:12],order[12:])):
        cw=W*S+8; im=Image.new('RGB',(60+len(chunk)*cw,30+len(VAR)*(H*S+8)),BG); d=ImageDraw.Draw(im)
        for ri,v in enumerate(VAR): d.text((6,30+ri*(H*S+8)+H*S//2),v or 'Orig',fill=INK,font=FONTB)
        for ci,k in enumerate(chunk):
            d.text((60+ci*cw,8),k,fill=INK,font=FONT)
            for ri,v in enumerate(VAR):
                b=rend(k,v).resize((W*S,H*S),Image.NEAREST); im.paste(b,(60+ci*cw,30+ri*(H*S+8)),b)
        im.save(os.path.join(out,'tiefe_vergleich_%d.png'%(si+1)))
    print('ok',out)
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','tiefe'))
