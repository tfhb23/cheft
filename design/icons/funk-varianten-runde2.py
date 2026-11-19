from PIL import Image, ImageDraw, ImageFont
import sys, json
N=12
def full(left): return [l+l[::-1] for l in left]
LEFT3=['..####','.#....','#.....','...###','..#...','......','....##','...#..','......','.....#','.....#','......']
LEFT2=['..####','.#....','#.....','...###','..#...','......','......','......','......','......','......','......']
def grid(rows): return [list(r) for r in rows]
def out(g): return [''.join(r) for r in g]
def pts(shape,ox,oy): return [(ox+x,oy+y) for y,r in enumerate(shape) for x,c in enumerate(r) if c=='#']
def put(g,P):
    for x,y in P:
        if 0<=x<N and 0<=y<N: g[y][x]='#'
def clear_box(g,x0,x1,y0,y1):
    for y in range(max(0,y0),min(N,y1+1)):
        for x in range(max(0,x0),min(N,x1+1)): g[y][x]='.'
def stamp(base,shape,ox,oy,margin=1):
    """Form setzen; um ihr Umfeld (Rechteck + margin) werden Wellen entfernt: immer mindestens 1 px freie Fläche."""
    g=grid(base); w=max(len(r) for r in shape); hgt=len(shape)
    clear_box(g,ox-margin,ox+w-1+margin,oy-margin,oy+hgt-1+margin)
    P=pts(shape,ox,oy); put(g,P)
    # Einzelne Pixel ohne Nachbarn (Reste eines weggeschnittenen Bogens) entfernen
    for y in range(N):
        for x in range(N):
            if g[y][x]=='#' and (x,y) not in set(P):
                if not any(0<=x+dx<N and 0<=y+dy<N and g[y+dy][x+dx]=='#' for dx in (-1,0,1) for dy in (-1,0,1) if (dx,dy)!=(0,0)): g[y][x]='.'
    # Prüfung: kein Wellen-Pixel näher als 2 (Chebyshev) an der Form
    S=set(P)
    for y in range(N):
        for x in range(N):
            if g[y][x]=='#' and (x,y) not in S:
                d=min(max(abs(x-px),abs(y-py)) for px,py in S)
                assert d>=2, ('zu nah',x,y)
    return out(g)

X5=['#...#','.#.#.','..#..','.#.#.','#...#']
X5B=['##.##','.###.','..#..','.###.','##.##']
EX_BAR=['##','##','##','##','##','##']          # 2 px breit, 6 hoch
EX_TAP=['####','####','.##.','.##.','.##.']      # oben breiter, läuft zu
DOT=['##','##']
V={}
B3=full(LEFT3)
V['3a  X oben rechts, dünn, 1 px Abstand']=stamp(B3,X5,7,0)
V['3b  X oben rechts, fett (gleiche Größe)']=stamp(B3,X5B,7,0)
# 4 Abwandlungen: nur 2 Bögen im Hintergrund
B2=full(LEFT2)
g=stamp(B2,['##']*7,5,1); g=stamp(g,DOT,5,9)
V['4a  2 Bögen, ! schneidet beide Bögen']=g
g=stamp(B2,['####','####','.##.','.##.'],4,5); g=stamp(g,DOT,5,10)
V['4b  2 Bögen ganz, ! statt Punkt']=g
# ! oben rechts wie das X in 3 (gleiche Höhe 5, 1 px Abstand), dahinter 3 bzw. 2 Bögen
EX_C=['##','##','##','..','##','##']
g=stamp(B3,['##','##','##','..','##','##'],9,0)
V['4c  ! oben rechts, 3 Bögen dahinter']=g
json.dump(V,open(sys.argv[1]+'.json','w'),ensure_ascii=False)

INK=(0x23,0x20,0x1f); PANEL=(0xff,0xfa,0xf0); SAND=(0xe9,0xdc,0xc0); MUTED=(0x5a,0x4d,0x44); GREEN=(0x2f,0x6b,0x4a)
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22); fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
W=1000; rowh=160
img=Image.new('RGB',(W,64+rowh*len(V)+16),SAND); d=ImageDraw.Draw(img)
d.text((24,14),'Funk-Icon, Runde 2 (12x12 Pixel)',font=f,fill=INK)
def draw(rows,x,y,s,col):
    for j,r in enumerate(rows):
        for i,ch in enumerate(r):
            if ch=='#': d.rectangle([x+i*s,y+j*s,x+i*s+s-1,y+j*s+s-1],fill=col)
for n,(name,rows) in enumerate(V.items()):
    y=64+n*rowh
    d.rectangle([16,y,W-16,y+rowh-12],fill=PANEL,outline=INK,width=3)
    d.text((30,y+10),name,font=f,fill=INK)
    draw(rows,30,y+44,8,INK)
    draw(rows,170,y+70,2,INK)
    d.text((220,y+62),'Max',font=fs,fill=INK); draw(rows,272,y+62,2,MUTED)
    d.text((330,y+62),'Anna',font=fs,fill=INK)
    d.rectangle([440,y+40,710,y+rowh-38],fill=GREEN)
    d.text((460,y+62),'Max',font=fs,fill=PANEL); draw(rows,512,y+62,2,PANEL)
    d.text((560,y+62),'Anna',font=fs,fill=PANEL)
    d.rectangle([730,y+40,W-36,y+rowh-38],fill=PANEL,outline=INK,width=2)
    d.text((744,y+62),'Max',font=fs,fill=INK); draw(rows,796,y+62,2,INK)
img.save(sys.argv[1])
for k,v in V.items(): print(k); print('\n'.join(v)); print()
