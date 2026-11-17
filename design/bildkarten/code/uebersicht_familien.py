"""Übersicht pro Familie (Kartensymbol): je 3 Karten (Bube, Dame, König) mit beiden Personen. Aufruf: python3 uebersicht_familien.py [Ausgabeordner] [Skalierung]"""
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from final_auswahl import *
NAMES={'H':'Herz','D':'Karo','C':'Kreuz','S':'Pik'}
def main(out,S=6):
    os.makedirs(out,exist_ok=True)
    cw=W*S+8; gw=2*cw+22; top=46
    for s,sn in NAMES.items():
        im=Image.new('RGB',(3*gw+10,top+H*S+34),BG); d=ImageDraw.Draw(im)
        d.text((10,8),'%s – Person 1 und Person 2 je Karte'%sn,fill=INK,font=FONTB)
        for ci,(rk,rn) in enumerate(((11,'Bube'),(12,'Dame'),(13,'König'))):
            keys=[k for (ss,rr,k) in KARTEN if ss==s and rr==rk][0]
            d.text((10+ci*gw,top-20),rn,fill=INK,font=FONTB)
            for i,k in enumerate(keys):
                x=10+ci*gw+i*cw
                if k: b=slot(k).resize((W*S,H*S),Image.NEAREST)
                else: b=dim(blank(s,rk)).resize((W*S,H*S),Image.NEAREST); d.text((x,top+H*S+4),'fehlt',fill=(0xb0,0x30,0x30),font=FONT)
                im.paste(b,(x,top),b)
        im.save(os.path.join(out,'familie_%s.png'%sn.lower()))
    print('ok')
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','images','familien'), int(sys.argv[2]) if len(sys.argv)>2 else 6)
