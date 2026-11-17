"""Vergleich: Figuren 1 px höher / aktuell / 1 px tiefer, Fernwirkung (klein) und Detail. Aufruf: python3 vergleich_hoehe.py [Ausgabeordner]"""
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from final_layout import *
def r(k,dy):
    s,rk,sp=final_spec(k); return card(s,rk,dict(sp,dy=dy),'schlagschatten',MODE)
def main(out):
    os.makedirs(out,exist_ok=True); keys=personen()
    for name,S,cols in (('hoehe_fern_2x.png',2,6),('hoehe_nah_4x.png',4,3)):
        cw,ch=W*S,H*S; pad=8; gw=3*cw+4; rows=(len(keys)+cols-1)//cols
        im=Image.new('RGB',(pad+cols*(gw+pad+4),30+rows*(ch+16+pad)),BG); d=ImageDraw.Draw(im)
        d.text((pad,6),'je Figur: 1 px höher | aktuell | 1 px tiefer',fill=INK,font=FONTB)
        for i,k in enumerate(keys):
            x=pad+(i%cols)*(gw+pad+4); y=30+(i//cols)*(ch+16+pad)
            for j,dy in enumerate((-1,0,1)):
                b=r(k,dy).resize((cw,ch),Image.NEAREST); im.paste(b,(x+j*(cw+2),y),b)
            d.text((x,y+ch+1),k,fill=INK,font=FONT)
        im.save(os.path.join(out,name))
    # eine Reihe (Könige) als Fernwirkung in Kartengröße 1x, wie im Spiel
    ks=[k for k in keys if k.endswith('koenig') or 'koenig' in k]
if __name__=='__main__':
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','images','final_layout'))
