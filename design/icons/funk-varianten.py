from PIL import Image, ImageDraw, ImageFont
import sys
N=12
LEFT=[ '..####','.#....','#.....','...###','..#...','......','....##','...#..','......','.....#','.....#','......']
def full(left): return [l+l[::-1] for l in left]
def grid(rows): return [list(r) for r in rows]
def out(g): return [''.join(r) for r in g]
def put(g,pts,ch='#'):
    for x,y in pts:
        if 0<=x<N and 0<=y<N: g[y][x]=ch
def clear_rect(g,x0,x1,y0,y1):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1): g[y][x]='.'
BASE=full(LEFT)
V={}
# 1 durchgestrichen (Strich oben links nach unten rechts, mit Lücke)
g=grid(BASE)
diag=[(i,i) for i in range(N)]
for x,y in diag:
    for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,-1),(-1,1)]:
        put(g,[(x+dx,y+dy)],'.')
put(g,diag); put(g,[(i+1,i) for i in range(N-1)])
V['1  Durchgestrichen']=out(g)
# 2 X unten rechts, Punkt links unten
g=grid(BASE); clear_rect(g,4,8,8,11)
put(g,[(3,9),(4,9),(3,10),(4,10)])
put(g,[(7,8),(10,8),(8,9),(9,9),(8,10),(9,10),(7,11),(10,11)])
V['2  X unten rechts']=out(g)
# 3 X oben rechts (äußerer Bogen rechts weg)
g=grid(BASE); clear_rect(g,7,11,0,4)
put(g,[(7,0),(11,0),(8,1),(10,1),(9,2),(8,3),(10,3),(7,4),(11,4)])
V['3  X oben rechts']=out(g)
# 4 Ausrufezeichen
g=grid(BASE); clear_rect(g,4,7,0,7); clear_rect(g,4,7,9,10)
put(g,[(x,y) for y in range(1,7) for x in (5,6)]); put(g,[(5,9),(6,9),(5,10),(6,10)])
V['4  Ausrufezeichen']=out(g)
# 5 X statt Punkt
g=grid(BASE); clear_rect(g,5,6,9,10)
put(g,[(4,8),(7,8),(5,9),(6,9),(5,10),(6,10),(4,11),(7,11)])
V['5  X statt Punkt']=out(g)
# 6 ausgegraut (Raster-Bögen)
g=grid(BASE)
for y in range(0,8):
    for x in range(N):
        if g[y][x]=='#' and (x+y)%2==1: g[y][x]='.'
V['6  Ausgegraut (Raster)']=out(g)
# 7 Bögen links halb + Kreuz groß in der Mitte unten? -> dicker Strich gegenläufig
g=grid(BASE)
diag=[(N-1-i,i) for i in range(N)]
for x,y in diag:
    for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1)]:
        put(g,[(x+dx,y+dy)],'.')
put(g,diag); put(g,[(N-2-i,i) for i in range(N-1)])
V['7  Durchgestrichen (gegenläufig)']=out(g)

INK=(0x23,0x20,0x1f); PANEL=(0xff,0xfa,0xf0); SAND=(0xe9,0xdc,0xc0); MUTED=(0x5a,0x4d,0x44); GREEN=(0x2f,0x6b,0x4a)
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22); fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
W=1000; rowh=150
img=Image.new('RGB',(W,64+rowh*len(V)+16),SAND); d=ImageDraw.Draw(img)
d.text((24,14),'Funk-Icon: Verbindung verloren (12x12 Pixel, einfarbig in Textfarbe)',font=f,fill=INK)
def draw(rows,x,y,s,col):
    for j,r in enumerate(rows):
        for i,ch in enumerate(r):
            if ch=='#': d.rectangle([x+i*s,y+j*s,x+i*s+s-1,y+j*s+s-1],fill=col)
for n,(name,rows) in enumerate(V.items()):
    y=64+n*rowh
    d.rectangle([16,y,W-16,y+rowh-12],fill=PANEL,outline=INK,width=3)
    d.text((30,y+10),name,font=f,fill=INK)
    draw(rows,30,y+42,7,INK)
    draw(rows,150,y+58,2,INK)
    d.text((200,y+52),'Max',font=fs,fill=INK); draw(rows,252,y+52,2,MUTED)
    d.text((310,y+52),'Anna',font=fs,fill=INK)
    d.rectangle([430,y+36,710,y+rowh-34],fill=GREEN)
    d.text((450,y+52),'Max',font=fs,fill=PANEL); draw(rows,502,y+52,2,PANEL)
    d.text((550,y+52),'Anna',font=fs,fill=PANEL)
    d.rectangle([730,y+36,W-36,y+rowh-34],fill=PANEL,outline=INK,width=2)
    d.text((744,y+52),'Max',font=fs,fill=INK); draw(rows,796,y+52,2,INK)
img.save(sys.argv[1])
import json; json.dump(V,open(sys.argv[1]+'.json','w'),ensure_ascii=False)
