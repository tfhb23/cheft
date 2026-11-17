"""Vergleich: Weiß hervorheben (W1-W4) und Pik-Haare (P0-P3). Aufruf: python3 vergleich_weiss.py [Ausgabeordner]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import comp, tiefe
from vergleich_schatten_nasen import sheet
from tiefe_vergleich import spec_of
from final_auswahl import *
def rend(k,w='W1',soft=False,hair=None):
    comp.WHITE=w; tiefe.SOFT=soft
    s,r,sp=spec_of(k); sp=copy.deepcopy(sp)
    if hair: sp['pal']['H']=hex_(hair)
    out=render(s,r,sp); comp.WHITE='W1'; tiefe.SOFT=False; return out
def hex_(h): return hx(h)
def main(out):
    os.makedirs(out,exist_ok=True)
    wk=['herz_bube_a','herz_bube_b','herz_dame_a','herz_koenig','kreuz_bube_b','pik_bube','pik_dame','pik_koenig']
    sheet(os.path.join(out,'weiss_vergleich.png'),wk,[(w,(lambda k,w=w: rend(k,w))) for w in ('W1','W2','W3','W4')],5,'')
    pk=['pik_bube','pik_dame','pik_koenig']
    rows=[('P0',lambda k: rend(k)),('P1',lambda k: rend(k,soft=True)),('P2',lambda k: rend(k,soft=True,hair='ffffff')),('P3',lambda k: rend(k,'W3',True,'ffffff'))]
    sheet(os.path.join(out,'pik_haare_vergleich.png'),pk,rows,6,'')
    print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','schatten_nasen'))
