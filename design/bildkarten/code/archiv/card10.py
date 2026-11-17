from PIL import Image, ImageDraw, ImageFont
W,H=32,44
INK=(0x23,0x20,0x1f); CREAM=(0xfb,0xf6,0xea); RED=(0xd2,0x36,0x2a)
G1=['..#..','.##..','..#..','..#..','..#..','..#..','.###.']
G0_OLD=['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.']
G0_NEW=['.###.','#...#','#...#','#...#','#...#','#...#','.###.']
HEART=['.##.##.','#######','#######','#######','.#####.','..###..','...#...']
rot=lambda r:[x[::-1] for x in r][::-1]
def card(pos1,pos0,g0,suit_color=RED):
    im=Image.new('RGBA',(W,H),(0,0,0,0)); p=im.load()
    def put(x,y,c): p[x,y]=c+(255,)
    for y in range(H):
        for x in range(W): 
            if x in(0,W-1) or y in(0,H-1): put(x,y,INK)
            else: put(x,y,CREAM)
    for c in[(0,0),(W-1,0),(0,H-1),(W-1,H-1)]: p[c]=(0,0,0,0)
    for c in[(1,1),(W-2,1),(1,H-2),(W-2,H-2)]: put(*c,INK)
    def shape(rows,x,y,col=RED):
        for ry,r in enumerate(rows):
            for rx,ch in enumerate(r):
                if ch=='#': put(x+rx,y+ry,col)
    shape(G1,pos1,3); shape(g0,pos0,3)
    shape(HEART,3,11)
    shape(rot(G1),W-pos1-5,H-10); shape(rot(g0),W-pos0-5,H-10)
    shape(rot(HEART),W-10,H-18)
    shape(HEART,9,15) if False else None
    for ry,r in enumerate(HEART):
        for rx,ch in enumerate(r):
            if ch=='#':
                for dx in(0,1):
                    for dy in(0,1): put(9+rx*2+dx,15+ry*2+dy,RED)
    return im
old=card(3,9,G0_OLD); new=card(2,7,G0_NEW)
S=12; pad=24
f=ImageFont.load_default()
sheet=Image.new('RGB',(2*W*S+3*pad,H*S+2*pad+70),(0xf2,0xe6,0xd0))
d=ImageDraw.Draw(sheet)
for i,(im,lab) in enumerate([(old,'VORHER'),(new,'NACHHER')]):
    x=pad+i*(W*S+pad)
    sheet.paste(im.resize((W*S,H*S),Image.NEAREST),(x,pad),im.resize((W*S,H*S),Image.NEAREST))
    d.text((x,pad+H*S+10),lab,fill=INK,font=f)
    # 1x/3x preview
    sm=im.resize((W*3,H*3),Image.NEAREST); sheet.paste(sm,(x+W*S-W*3,pad+H*S+8),sm)
d.text((pad,pad+H*S+30),"1 einen Pixel naeher zum Rand, Abstand 1-0 um 1 Pixel kleiner, Schraegstrich in der 0 entfernt",fill=INK,font=f)
sheet.save('karte10_vergleich.png')
# nur Eckmarke Nahaufnahme nicht noetig
