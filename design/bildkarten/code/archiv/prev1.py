from lib import *
import art
S=14
fig=[]
for suit in 'HS':
    for r in (11,12,13):
        a=art.BUSTE[r]; im=Image.new('RGBA',(19,20),C['cream']+(255,)); p=im.load()
        for y,row in enumerate(a):
            for x,ch in enumerate(row):
                m=fmap(suit,r)
                if ch in m: p[x,y]=m[ch]+(255,)
        fig.append(im.resize((19*S,20*S),Image.NEAREST))
sheet=Image.new('RGB',(3*(19*S+20)+20,2*(20*S+20)+20),(0xf2,0xe6,0xd0))
for i,f in enumerate(fig): sheet.paste(f,(20+(i%3)*(19*S+20),20+(i//3)*(20*S+20)))
sheet.save('prev_buste.png')
