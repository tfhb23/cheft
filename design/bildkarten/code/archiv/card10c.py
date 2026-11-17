import re
from PIL import Image, ImageDraw, ImageFont
src=open('/home/user/cheft/src/ui/sprites.ts').read()
G={}
for m in re.finditer(r"^\s+'?(\w)'?: \[((?:'[.#]+',? ?)+)\]",src,re.M):
    G[m.group(1)]=re.findall(r"'([.#]+)'",m.group(2))
W,H=32,44
INK=(0x23,0x20,0x1f); CREAM=(0xfb,0xf6,0xea); RED=(0xd2,0x36,0x2a)
HEART=['.##.##.','#######','#######','#######','.#####.','..###..','...#...']
G0N=['.###.','#...#','#...#','#...#','#...#','#...#','.###.']
G0S=['.##.','#..#','#..#','#..#','#..#','#..#','.##.']
rot=lambda r:[x[::-1] for x in r][::-1]
def card(glyphs):  # list of (rows,x)
    im=Image.new('RGBA',(W,H),(0,0,0,0)); p=im.load()
    put=lambda x,y,c:p.__setitem__((x,y),c+(255,))
    for y in range(H):
        for x in range(W): put(x,y,INK if x in(0,W-1) or y in(0,H-1) else CREAM)
    for c in[(0,0),(W-1,0),(0,H-1),(W-1,H-1)]: p[c]=(0,0,0,0)
    for c in[(1,1),(W-2,1),(1,H-2),(W-2,H-2)]: put(*c,INK)
    def shape(rows,x,y):
        for ry,r in enumerate(rows):
            for rx,ch in enumerate(r):
                if ch=='#': put(x+rx,y+ry,RED)
    for rows,x in glyphs:
        shape(rows,x,3); shape(rot(rows),W-x-len(rows[0]),H-10)
    shape(HEART,3,11); shape(rot(HEART),W-10,H-18)
    for ry,r in enumerate(HEART):
        for rx,ch in enumerate(r):
            if ch=='#':
                for dx in(0,1):
                    for dy in(0,1): put(9+rx*2+dx,15+ry*2+dy,RED)
    return im
one=lambda k:card([(G[k],3)])
cards=[('A',one('A')),('2',one('2')),('4',one('4')),('8',one('8')),('9',one('9')),
       ('10 alt',card([(G['1'],3),(G['0'],9)])),
       ('10 breit',card([(G['1'],2),(G0N,7)])),
       ('10 schmal',card([(G['1'],2),(G0S,7)])),
       ('B',one('D'.replace('D','B'))),('D',one('D')),('K',one('K'))]
S=6;pad=14
sheet=Image.new('RGB',(len(cards)*(W*S+pad)+pad,H*S+2*pad+20),(0xf2,0xe6,0xd0))
d=ImageDraw.Draw(sheet);f=ImageFont.load_default()
for i,(lab,im) in enumerate(cards):
    x=pad+i*(W*S+pad)
    big=im.resize((W*S,H*S),Image.NEAREST);sheet.paste(big,(x,pad),big)
    d.text((x,pad+H*S+6),lab,fill=INK,font=f)
sheet.save('karte10_vs_alle.png');print(sheet.size)
