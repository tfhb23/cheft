"""Vergleich: große Hüte/Frisuren verkleinern (v6) und optional Kinn 1 px kürzer (v7).
Spalte 1 = schmaler Kopf (Variante A) wie bisher | 2 = große Teile kleiner | 3 = zusätzlich Kinn 1 px kürzer.
Aufruf: python3 vergleich_kleiner.py [Ausgabeordner]"""
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from vergleich_layout_symbole import *
# ops: ('sq',y0,y1,[k]) Spalten Mitte±k raus | ('down',[y]) Zeilen raus, oberer Teil rückt nach unten | ('up',[y]) Zeilen raus, unterer Teil rückt nach oben
SHRINK={
 'pik_koenig':[('down',[4,5]),('sq',4,12,[3]),('sq',13,13,[5]),('up',[26,27])],
 'pik_koenig_zwilling':[('down',[7,8]),('sq',6,6,[2]),('sq',7,12,[3]),('sq',13,13,[6])],
 'karo_koenig':[('down',[4,9]),('sq',3,12,[3]),('up',[26,27])],
 'herz_koenig':[('down',[8,11]),('sq',7,13,[3]),('up',[26,27])],
 'karo_bube':[('down',[8,10]),('sq',5,12,[3])],
 'pik_dame':[('sq',12,27,[6]),('up',[25,26])],
 'herz_dame_a':[('sq',6,31,[7]),('up',[28,29])],
}
def variants(k):
    s,r,sp=spec_of(k)
    return s,r,[dict(sp),dict(sp,shrink=SHRINK.get(k,[])),dict(sp,shrink=SHRINK.get(k,[]),chin=True)]
def main(out):
    os.makedirs(out,exist_ok=True); keys=personen(); S=4; cw,ch=W*S,H*S; pad=12; cols=4; rows=(len(keys)+cols-1)//cols; gw=3*cw+12
    im=Image.new('RGB',(pad+cols*(gw+pad),40+rows*(ch+22+pad)),BG); d=ImageDraw.Draw(im)
    d.text((pad,8),'links: bisher (schmaler Kopf A) | Mitte: große Teile kleiner | rechts: zusätzlich Kinn 1 px kürzer',fill=INK,font=FONTB)
    bad=0
    for i,k in enumerate(keys):
        s,r,sps=variants(k); x=pad+(i%cols)*(gw+pad); y=40+(i//cols)*(ch+22+pad)
        for j,sp in enumerate(sps):
            m=card(s,r,sp,'schlagschatten','v5a')
            if j: bad+=bool(check_im(k,m))
            b=m.resize((cw,ch),Image.NEAREST); im.paste(b,(x+j*(cw+6),y),b)
        d.text((x,y+ch+2),k,fill=INK,font=FONT)
    im.save(os.path.join(out,'kleiner_und_kinn_A.png')); print('Probleme:',bad)
    for k in ('pik_koenig','karo_koenig','herz_dame_a','pik_koenig_zwilling'):
        s,r,sps=variants(k); S=8; img=Image.new('RGB',(3*W*S+40,H*S+20),BG)
        for j,sp in enumerate(sps):
            b=card(s,r,sp,'schlagschatten','v5a').resize((W*S,H*S),Image.NEAREST); img.paste(b,(10+j*(W*S+10),10),b)
        img.save(os.path.join(out,'kleiner_detail_%s.png'%k))
def check_im(k,im):
    px=im.convert('RGBA').load(); s,r,_=spec_of(k); ink=inkOf(s)
    return [(x,y) for y in range(11,18) for x in range(3,10) if SH[s][y-11][x-3]=='#' and px[x,y][:3]!=ink]
if __name__=='__main__':
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','images','layout_symbole'))
