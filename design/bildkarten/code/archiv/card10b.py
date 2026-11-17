from PIL import Image, ImageDraw, ImageFont
W,H=32,44
INK=(0x23,0x20,0x1f); CREAM=(0xfb,0xf6,0xea); RED=(0xd2,0x36,0x2a)
G1=['..#..','.##..','..#..','..#..','..#..','..#..','.###.']
G0_OLD=['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.']
G0_NEW=['.###.','#...#','#...#','#...#','#...#','#...#','.###.']
G0_NARROW=['.##.','#..#','#..#','#..#','#..#','#..#','.##.']
HEART=['.##.##.','#######','#######','#######','.#####.','..###..','...#...']
rot=lambda r:[x[::-1] for x in r][::-1]
def card(pos1,pos0,g0):
    im=Image.new('RGBA',(W,H),(0,0,0,0)); p=im.load()
    def put(x,y,c): p[x,y]=c+(255,)
    for y in range(H):
        for x in range(W): put(x,y,INK if x in(0,W-1) or y in(0,H-1) else CREAM)
    for c in[(0,0),(W-1,0),(0,H-1),(W-1,H-1)]: p[c]=(0,0,0,0)
    for c in[(1,1),(W-2,1),(1,H-2),(W-2,H-2)]: put(*c,INK)
    def shape(rows,x,y):
        for ry,r in enumerate(rows):
            for rx,ch in enumerate(r):
                if ch=='#': put(x+rx,y+ry,RED)
    shape(G1,pos1,3); shape(g0,pos0,3); shape(HEART,3,11)
    shape(rot(G1),W-pos1-5,H-10); shape(rot(g0),W-pos0-len(g0[0]),H-10)
    shape(rot(HEART),W-10,H-18)
    for ry,r in enumerate(HEART):
        for rx,ch in enumerate(r):
            if ch=='#':
                for dx in(0,1):
                    for dy in(0,1): put(9+rx*2+dx,15+ry*2+dy,RED)
    return im
cards=[(card(3,9,G0_OLD),'VORHER'),(card(2,7,G0_NEW),'NACHHER (0 breit, 5 px)'),(card(2,7,G0_NARROW),'NEU: 0 schmaler (4 px)')]
S=12;pad=24
f=ImageFont.load_default()
sheet=Image.new('RGB',(3*W*S+4*pad,H*S+2*pad+50),(0xf2,0xe6,0xd0))
d=ImageDraw.Draw(sheet)
for i,(im,lab) in enumerate(cards):
    x=pad+i*(W*S+pad)
    big=im.resize((W*S,H*S),Image.NEAREST); sheet.paste(big,(x,pad),big)
    d.text((x,pad+H*S+10),lab,fill=INK,font=f)
    sm=im.resize((W*3,H*3),Image.NEAREST); sheet.paste(sm,(x+W*S-W*3,pad+H*S+8),sm)
sheet.save('karte10_vergleich2.png')
