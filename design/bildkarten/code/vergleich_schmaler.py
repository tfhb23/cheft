"""Vergleich v5: Kopf 1 px schmaler (Mitte raus). v4 | A (Spalte 7 raus) | B (Spalte 8 raus). Aufruf: python3 vergleich_schmaler.py [Ausgabeordner]"""
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from vergleich_layout_symbole import *
def main(out):
    os.makedirs(out,exist_ok=True); keys=personen(); S=4; cw,ch=W*S,H*S; pad=12; cols=4; rows=(len(keys)+cols-1)//cols; gw=3*cw+12
    im=Image.new('RGB',(pad+cols*(gw+pad),40+rows*(ch+22+pad)),BG); d=ImageDraw.Draw(im)
    d.text((pad,8),'Kopf 1 px schmaler: links v4 (bisher) | A: Spalte 7 raus | B: Spalte 8 raus',fill=INK,font=FONTB)
    for i,k in enumerate(keys):
        s,r,sp=spec_of(k); x=pad+(i%cols)*(gw+pad); y=40+(i//cols)*(ch+22+pad)
        for j,m in enumerate(('v4','v5a','v5b')):
            b=card(s,r,sp,'schlagschatten',m).resize((cw,ch),Image.NEAREST); im.paste(b,(x+j*(cw+6),y),b)
        d.text((x,y+ch+2),k,fill=INK,font=FONT)
    im.save(os.path.join(out,'kopf_schmaler_korrigiert_v4_A_B.png'))
    for k in ('herz_bube_a','pik_koenig','kreuz_koenig'):
        s,r,sp=spec_of(k); S=10; img=Image.new('RGB',(3*W*S+40,H*S+20),BG)
        for j,m in enumerate(('v4','v5a','v5b')):
            b=card(s,r,sp,'schlagschatten',m).resize((W*S,H*S),Image.NEAREST); img.paste(b,(10+j*(W*S+10),10),b)
        img.save(os.path.join(out,'kopf_schmaler_korrigiert_detail_%s.png'%k))
if __name__=='__main__':
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','images','layout_symbole'))
