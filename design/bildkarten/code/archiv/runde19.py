from masters_v2 import *
import copy
from PIL import ImageDraw, ImageFont
bg=(0xf2,0xe6,0xd0); pad=10
FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',12)
def lab(d,x,y,t,f=FONT): d.multiline_text((x,y),t,fill=C['ink'],font=f)
def show(items,fname,title,crop,cS=11,S=6):
    cw=max(W*S,(crop[2]-crop[0])*cS)+pad; h=H*S+(crop[3]-crop[1])*cS+pad+100
    im=Image.new('RGB',(len(items)*cw+pad,h+24),bg); d=ImageDraw.Draw(im); d.text((pad,4),title,fill=C['ink'],font=FONTB)
    for i,(n,dsc,suit,rank,em,sp) in enumerate(items):
        x=pad+i*cw; y=26; c=card(suit,rank,sp,em,'symm'); b=scaled(c,S); im.paste(b,(x,y),b)
        z=c.crop(crop).resize(((crop[2]-crop[0])*cS,(crop[3]-crop[1])*cS),Image.NEAREST); im.paste(z,(x,y+H*S+6))
        lab(d,x,y+H*S+12+z.height,n,FB); lab(d,x,y+H*S+30+z.height,dsc)
    im.save(fname); print(fname,im.size)
# Kreuz König
suit,rank,em,base=spec_v2('kreuz_koenig')
def with_crown(name):
    sp=copy.deepcopy(base); sp['hat']=[name]; return sp
K=[('aktuell (CK-c neu)','Krone 4 Zeilen, 2 Steine','C',13,em,base),
   ('A','Band +1 Zeile\n3 Steine','C',13,em,with_crown('krone_ck_a')),
   ('B','Zacken +1 Zeile\n4 Steine','C',13,em,with_crown('krone_ck_b')),
   ('C','Zacken +1 Zeile\n3 Steine','C',13,em,with_crown('krone_ck_c')),
   ('D','Band +1 Zeile\n4 Steine','C',13,em,with_crown('krone_ck_d'))]
show(K,'r19_kreuz_koenig_krone.png','Kreuz König: Krone 1 px höher, mehr Steine',(5,3,27,16),cS=12,S=6)
# Pik Dame
suit,rank,em,dbase=spec_v2('pik_dame')
def with_hair(name):
    sp=copy.deepcopy(dbase); sp['hair']=name; return sp
D=[('aktuell','Haar bis Zeile 24','S',12,em,dbase),
   ('+1 Pixel','Haar bis Zeile 25','S',12,em,with_hair('bob_r2_l1')),
   ('+2 Pixel','Haar bis Zeile 26','S',12,em,with_hair('bob_r2_l2')),
   ('+3 Pixel','Haar bis Zeile 27','S',12,em,with_hair('bob_r2_l3'))]
show(D,'r19_pik_dame_haar.png','Pik Dame: Haare länger',(2,8,30,34),cS=8,S=6)
