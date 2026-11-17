from masters import *
from PIL import ImageDraw
import copy
bg=(0xf2,0xe6,0xd0); pad=10
names=['pik_koenig','pik_bube','pik_dame','herz_koenig','karo_bube']
labels={'pik_koenig':'Pik König','pik_bube':'Pik Bube','pik_dame':'Pik Dame','herz_koenig':'Herz König','karo_bube':'Karo Bube'}
def variant(n,mode):
    suit,rank,em,spec=MASTERS[n]; sp=copy.deepcopy(spec)
    if mode=='jetzt': return card(suit,rank,sp,em,'cut1')
    sp['dyn']['xmin']=8; sp['dyn']['notch_left']=True
    return card(suit,rank,sp,em,{'A':'symmA','B':'symm','C':'symm0'}[mode])
cols=[('Jetzt\nSchulter links\nab Spalte 5','jetzt'),('A  symmetrisch\nlinks wie rechts,\nohne Symbol','A'),('B  symmetrisch\n+ Symbol unten links\n1 px Lücke beidseitig','B'),('C  symmetrisch\n+ Symbol unten links\nohne Lücke','C')]
S=5; cw=W*S+pad; rh=H*S+pad
im=Image.new('RGB',(len(cols)*cw+pad,len(names)*rh+80),bg); d=ImageDraw.Draw(im)
for ci,(lab,m) in enumerate(cols): d.multiline_text((pad+ci*cw,6),lab,fill=C['ink'],font=FONT)
for ri,n in enumerate(names):
    for ci,(lab,m) in enumerate(cols):
        c=variant(n,m).resize((W*S,H*S),Image.NEAREST); im.paste(c,(pad+ci*cw,56+ri*rh),c)
im.save('r15_symmetrie.png'); print(im.size)
# Nahaufnahme: Unterkante beim Herz König, vier Varianten mit Mittellinie
S2=9; box=(0,20,32,42); tw=32*S2; th=22*S2
im=Image.new('RGB',(2*(tw+pad)+pad,2*(th+pad+20)+20),bg); d=ImageDraw.Draw(im)
for i,(lab,m) in enumerate(cols):
    c=variant('herz_koenig',m).crop(box).resize((tw,th),Image.NEAREST).convert('RGBA'); dd=ImageDraw.Draw(c)
    dd.line([(16*S2,0),(16*S2,th)],fill=(0x2a,0x7f,0xd9,255),width=2)
    x=pad+(i%2)*(tw+pad); y=10+(i//2)*(th+pad+20)
    im.paste(c,(x,y),c); d.text((x,y+th+2),lab.split('\n')[0],fill=C['ink'],font=FONT)
im.save('r15_nahaufnahme.png'); print(im.size)
