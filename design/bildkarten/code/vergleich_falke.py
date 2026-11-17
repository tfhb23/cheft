"""Falke: Bauchfarbe (Guide-Sand/Grau) und Position auf dem Kopf statt Feder. Aufruf: python3 vergleich_falke.py [Ausgabe.png]"""
import os,sys,copy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import lib
from final_auswahl import *
def kopf(x0,y0=6):
    sp=m2(11,'kappe_ohne_feder','keiner','kurz',('nase_n3',),px=px(OLD_FALKE,x0,y0),A=INK,**KB); sp['px_after']=True; return sp
def main(path,S=9):
    crop=(6,0,26,34); cw=20*S+6; ch=34*S+22
    cols=[('Aktuell: Feder, Falke rechts',None,'1.06 Sand (vorher)'),('Bauch 1.08 Sand dunkel',None,'1.08'),('Bauch 1.09 Grau',None,'1.09')]
    heads=[('Kopf A (links)',12),('Kopf B (Mitte)',13),('Kopf C (rechts)',14)]
    im=Image.new('RGB',(6*cw+10,2*ch+10),BG); d=ImageDraw.Draw(im)
    def put(sp,belly,col,row,label):
        if belly: sp['pal']['O']=lib.C[belly]
        b=render('C',11,sp).crop(crop).resize((20*S,34*S),Image.NEAREST); im.paste(b,(col*cw,row*ch+20),b); d.text((col*cw+4,row*ch+2),label,fill=INK,font=FONT)
    for i,(n,_,bel) in enumerate(cols):
        sp=copy.deepcopy(PERSONEN['kreuz_bube_a'][2]); put(sp,{'1.06 Sand (vorher)':'sand','1.08':'sandD','1.09':'grau'}[bel],i,0,n)
    for i,(n,x0) in enumerate(heads):
        put(kopf(x0),'sandD',i,1,n+' · Bauch 1.08')
    im.save(path); print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','falke_vergleich.png'))
