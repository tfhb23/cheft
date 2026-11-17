from masters import *
from PIL import ImageDraw
import copy
bg=(0xf2,0xe6,0xd0); pad=10
names=['pik_koenig','pik_bube','pik_dame','herz_koenig','karo_bube']
labels={'pik_koenig':'Pik König','pik_bube':'Pik Bube','pik_dame':'Pik Dame','herz_koenig':'Herz König','karo_bube':'Karo Bube'}
def variant(n,lift):
    suit,rank,em,spec=MASTERS[n]; sp=copy.deepcopy(spec)
    sp['dyn']['xmin']=8; sp['dyn']['notch_left']=True
    if lift:
        sp['lift']=1; sp['dyn']['lift']=1
        if n=='pik_koenig': sp['hat']=['z_a10']
    return card(suit,rank,sp,em,'symm')
# neue Master als Dateien sichern
import os
os.makedirs('masters_v2',exist_ok=True)
for n in names:
    im=variant(n,True); im.save('masters_v2/%s_1x.png'%n); im.resize((W*10,H*10),Image.NEAREST).save('masters_v2/%s_10x.png'%n)
S=6; cw=W*S+pad
# 1) Vergleich B bisher / B + 1 px hoch
sh=Image.new('RGB',(5*cw*2//1+pad,0),bg) if False else None
cols=[(False,'B bisher'),(True,'B, Person 1 px höher')]
im=Image.new('RGB',(len(names)*cw+pad,2*(H*S+pad+24)+14),bg); d=ImageDraw.Draw(im)
for ci,n in enumerate(names):
    for ri,(lift,lab) in enumerate(cols):
        c=variant(n,lift).resize((W*S,H*S),Image.NEAREST)
        y=10+ri*(H*S+pad+24); im.paste(c,(pad+ci*cw,y),c)
        if ci==0: pass
    d.text((pad+ci*cw,10+2*(H*S+pad+24)-14),labels[n],fill=C['ink'],font=FONT)
d.text((pad,2),'oben: B bisher, unten: B mit Person 1 px höher',fill=C['ink'],font=FONT)
im.save('r16_vergleich.png'); print(im.size)
# 2) Neue Master groß
S2=8; cw2=W*S2+pad
im=Image.new('RGB',(5*cw2+pad,H*S2+60),bg); d=ImageDraw.Draw(im)
for i,n in enumerate(names):
    c=variant(n,True).resize((W*S2,H*S2),Image.NEAREST); im.paste(c,(pad+i*cw2,pad),c); d.text((pad+i*cw2,pad+H*S2+6),labels[n],fill=C['ink'],font=FONT)
im.save('r16_master_neu.png'); print(im.size)
# 3) Zylinder und Augenlinie: Hilfslinien (K-Oberkante y=3, Augen y=15, Torso-Unterkante bleibt)
S3=10; box=(0,0,32,42); 
im=Image.new('RGB',(2*(32*S3+pad)+pad,34*S3+50),bg); d=ImageDraw.Draw(im)
for i,(lift,lab) in enumerate(cols):
    c=variant('pik_koenig',lift).crop((0,0,32,34)).resize((32*S3,34*S3),Image.NEAREST).convert('RGBA'); dd=ImageDraw.Draw(c)
    dd.line([(0,3*S3),(32*S3,3*S3)],fill=(0x2a,0x7f,0xd9,255),width=2)           # Oberkante K
    ey=(15 if lift else 16)*S3; dd.line([(0,ey+S3//2),(32*S3,ey+S3//2)],fill=(0xd9,0x2a,0x2a,160),width=1)   # Augenzeile
    im.paste(c,(pad+i*(32*S3+pad),pad),c); d.text((pad+i*(32*S3+pad),pad+34*S3+6),lab+'  (blau: Oberkante K, rot: Augenzeile)',fill=C['ink'],font=FONT)
im.save('r16_zylinder.png'); print(im.size)
