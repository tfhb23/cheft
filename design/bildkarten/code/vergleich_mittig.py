"""Vergleich: Person wieder mittig (2 px nach links, dx=0) statt 2 px rechts. Prüft pro Figur, ob sie das Symbol links oben (Spalte 3-9, Zeile 11-17) oder den Buchstaben berührt.
Aufruf: python3 vergleich_mittig.py [Ausgabeordner]"""
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from final_layout import *
def render_mid(k): return render_final(k,'v6a')
import colorsys
def hell(p): return colorsys.rgb_to_hls(*[v/255 for v in p[:3]])[1]>0.8      # Weiß/sehr Helles darf anstoßen
def contacts(k):
    s,r,sp=final_spec(k); im=render_mid(k).convert('RGBA'); px=im.load(); ink=inkOf(s)
    bare=base(); idx=index_layer(s,r); bare.over(idx); bare.over(idx.rot())
    win=Layer(); win.rect(10,11,24,32,C['cream']); bare.over(win); bp=bare.im.load()
    vis={(x,y) for y in range(H) for x in range(W) if 2<=x<=29 and 2<=y<=41 and bp[x,y][:3]==ink}
    t=[]
    for y in range(H):
        for x in range(W):
            if px[x,y]!=bp[x,y] and (x,y) not in vis and not hell(px[x,y]):
                if any((dx or dy) and (x+dx,y+dy) in vis for dy in (-1,0,1) for dx in (-1,0,1)): t.append((x,y))
    overlap=[(x,y) for (x,y) in vis if px[x,y][:3]!=ink]    # Symbol wird verdeckt
    return t,overlap
def main(out):
    os.makedirs(out,exist_ok=True); keys=personen(); S=5; cw,ch=W*S,H*S; pad=12; cols=4; rows=(len(keys)+cols-1)//cols; gw=2*cw+8
    im=Image.new('RGB',(pad+cols*(gw+pad),40+rows*(ch+22+pad)),BG); d=ImageDraw.Draw(im)
    d.text((pad,8),'links: Person 2 px rechts (bisher) | rechts: wieder mittig. Blau = berührt (nur Dunkles zählt) das Symbol links oben',fill=INK,font=FONTB)
    for i,k in enumerate(keys):
        t,ov=contacts(k); x=pad+(i%cols)*(gw+pad); y=40+(i//cols)*(ch+22+pad)
        for j,m in enumerate((render_final(k,'v5a'),render_mid(k))):
            b=m.resize((cw,ch),Image.NEAREST); im.paste(b,(x+j*(cw+8),y),b)
        x2=x+cw+8
        for (px_,py_) in t+ov: d.rectangle([x2+px_*S,y+py_*S,x2+px_*S+S-1,y+py_*S+S-1],outline=(0,120,255))
        d.text((x,y+ch+2),k+('  KOLLISION %d px'%len(t+ov) if t+ov else '  ok'),fill=(0xb0,0x30,0x30) if t+ov else INK,font=FONT)
        print('%-22s %s'%(k,'Berührung/Überdeckung: %s'%sorted(t+ov) if t+ov else 'ok'))
    im.save(os.path.join(out,'mittig_vergleich.png'))
if __name__=='__main__':
    main(sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','images','final_layout'))
