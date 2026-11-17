import sys,shutil; sys.path.insert(0,'.')
from masters_v2 import *
from PIL import ImageDraw, ImageFont
bg=(0xf2,0xe6,0xd0); pad=14; S=7
FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',14)
def blank(suit,rank):
    c=base(); idx=index_layer(suit,rank); c.over(idx); c.over(idx.rot()); return c.im
FINAL={('H',13):'herz_koenig',('D',11):'karo_bube',('D',12):'karo_dame',('D',13):'karo_koenig',('C',13):'kreuz_koenig',('S',11):'pik_bube',('S',12):'pik_dame',('S',13):'pik_koenig'}
suits=[('H','Herz'),('D','Karo'),('C','Kreuz'),('S','Pik')]; ranks=[(11,'Bube'),(12,'Dame'),(13,'König')]
cw=W*S+pad; rh=H*S+pad; lw=80
im=Image.new('RGB',(lw+3*cw+pad,4*rh+50),bg); d=ImageDraw.Draw(im)
for ci,(r,rn) in enumerate(ranks): d.text((lw+ci*cw,10),rn,fill=C['ink'],font=FB)
for ri,(s,sn) in enumerate(suits):
    y=36+ri*rh; d.text((pad,y+H*S//2-8),sn,fill=C['ink'],font=FB)
    for ci,(r,rn) in enumerate(ranks):
        key=FINAL.get((s,r))
        c=render_v2(key) if key else blank(s,r)
        b=c.resize((W*S,H*S),Image.NEAREST); im.paste(b,(lw+ci*cw,y),b)
im.save('r20_uebersicht_12.png'); print(im.size)
# Master-Dateien aktualisieren
for n in ['pik_koenig','pik_bube','pik_dame','herz_koenig','karo_koenig','karo_dame','karo_bube','kreuz_koenig']:
    c=render_v2(n); c.save('masters_v2/%s_1x.png'%n); c.resize((W*10,H*10),Image.NEAREST).save('masters_v2/%s_10x.png'%n)
for f in ['lib.py','parts.py','comp.py','bust.py','masters.py','masters_v2.py','uebersicht.py']: shutil.copy(f,'masters_v2/code/'+f)
shutil.copy('r20_uebersicht_12.png','masters_v2/UEBERSICHT_12_Bildkarten.png')
# Nahaufnahme der Krone und der Dame
S2=12
k=render_v2('kreuz_koenig').crop((5,2,27,16)).resize((22*S2,14*S2),Image.NEAREST)
dm=render_v2('pik_dame').crop((2,8,30,34)).resize((28*8,26*8),Image.NEAREST)
im2=Image.new('RGB',(k.width+dm.width+3*pad,max(k.height,dm.height)+80),bg); d2=ImageDraw.Draw(im2)
im2.paste(k,(pad,pad)); im2.paste(dm,(2*pad+k.width,pad))
d2.multiline_text((pad,pad+max(k.height,dm.height)+6),'Kreuz König:\nSteine bei Spalte 3, 6, 9, 12,\neine Zeile tiefer',fill=C['ink'],font=FONT)
d2.multiline_text((2*pad+k.width,pad+max(k.height,dm.height)+6),'Pik Dame:\nHaar +3 Pixel',fill=C['ink'],font=FONT)
im2.save('r20_details.png'); print(im2.size)
