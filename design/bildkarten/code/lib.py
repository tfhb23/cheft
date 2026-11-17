import re
from PIL import Image, ImageDraw, ImageFont
W,H=32,44
def hx(s): s=s.lstrip('#'); return tuple(int(s[i:i+2],16) for i in (0,2,4))
import os as _os
# Farben kommen aus dem Design Guide der App (src/ui/tokens.ts, Palette 1.xx). Ändert sich dort ein Wert, ändern sich die Figuren mit.
_TOK=_os.path.join(_os.path.abspath(_os.path.join(_os.path.dirname(_os.path.abspath(__file__)),'..','..','..')),'src','ui','tokens.ts')
if not _os.path.exists(_TOK): _TOK='/home/user/cheft/src/ui/tokens.ts'
_PAL=dict(re.findall(r"\{ id: '(1\.\d\d)', css: '[^']+', name: '[^']+', value: '(#[0-9a-fA-F]{6})'",open(_TOK).read()))
def T(i): return hx(_PAL[i])
GUIDE_IDS=dict(ink='1.01',cream='1.05',orange='1.10',orangeD='1.11',sand='1.06',gold='1.13',red='1.14',inkL='1.20',redL='1.21',skin='1.22',mouth='1.23',white='1.24')
C={k:T(v) for k,v in GUIDE_IDS.items()}
HAIR=dict(H=T('1.26'),D=T('1.27'),C=T('1.28'),S=T('1.29'))
BEARD=dict(H=T('1.30'),D=T('1.31'),C=T('1.32'),S=T('1.33'))

import os
_ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','..'))
_SPR=os.path.join(_ROOT,'src','ui','sprites.ts')
if not os.path.exists(_SPR): _SPR='/home/user/cheft/src/ui/sprites.ts'
src=open(_SPR).read()
def grab(name):
    m=re.search(r"export const %s(?:: Record<[^>]+>)? = \[(.*?)\];"%name,src,re.S)
    return re.findall(r"'([^']+)'",m.group(1))
OLD={11:grab('JACK'),12:grab('QUEEN'),13:grab('KING')}
GL={}
for m in re.finditer(r"^  '?(\w)'?: \[((?:'[.#]+',? ?)+)\],?$",src[src.index('export const GLYPHS'):src.index('export const SUIT_SHAPES')],re.M):
    GL[m.group(1)]=re.findall(r"'([.#]+)'",m.group(2))
SH={}
blk=src[src.index('export const SUIT_SHAPES'):src.index('export const STAR')]
for m in re.finditer(r"^  (\w): \[(.*?)\],$",blk,re.M):
    SH[m.group(1)]=re.findall(r"'([.#]+)'",m.group(2))
rot=lambda r:[x[::-1] for x in r][::-1]
RANK={11:'B',12:'D',13:'K'}

class Layer:
    def __init__(s): s.im=Image.new('RGBA',(W,H),(0,0,0,0)); s.p=s.im.load()
    def put(s,x,y,c):
        if 0<=x<W and 0<=y<H: s.p[x,y]=tuple(c)+(255,)
    def rect(s,x0,y0,x1,y1,c):  # inclusive
        for y in range(y0,y1+1):
            for x in range(x0,x1+1): s.put(x,y,c)
    def art(s,rows,x,y,cmap):
        for ry,r in enumerate(rows):
            for rx,ch in enumerate(r):
                if ch in cmap and cmap[ch] is not None: s.put(x+rx,y+ry,cmap[ch])
    def mask(s,rows,x,y,c):
        for ry,r in enumerate(rows):
            for rx,ch in enumerate(r):
                if ch=='#': s.put(x+rx,y+ry,c)
    def rot(s):
        n=Layer(); n.im=s.im.rotate(180); n.p=n.im.load(); return n
    def over(s,o): s.im.alpha_composite(o.im)

def base():
    L=Layer()
    for y in range(H):
        for x in range(W): L.put(x,y,C['ink'] if x in(0,W-1) or y in(0,H-1) else C['cream'])
    for c in[(0,0),(W-1,0),(0,H-1),(W-1,H-1)]: L.p[c]=(0,0,0,0)
    for c in[(1,1),(W-2,1),(1,H-2),(W-2,H-2)]: L.put(*c,C['ink'])
    return L

def inkOf(suit): return C['red'] if suit in 'HD' else C['ink']
def lightOf(suit): return C['redL'] if suit in 'HD' else C['inkL']

def fmap(suit,rank):
    ink=inkOf(suit); light=lightOf(suit)
    return dict(S=C['skin'],H=HAIR[suit],G=C['gold'],R=ink,W=C['white'],K=C['ink'],E=C['ink'],M=C['mouth'],
                B=BEARD[suit] if rank==13 else ink,F=C['orange'],L=light,Y=C['orangeD'],N=C['inkL'])

def index_layer(suit,rank):
    ink=inkOf(suit); L=Layer()
    x=3
    for ch in RANK[rank]: L.mask(GL[ch],x,3,ink); x+=6
    L.mask(SH[suit],3,11,ink)
    return L

def finish(top, suit, rank, extra_under=None):
    """top: Layer with the top-right quadrant (portrait). Adds rot copy + index."""
    card=base()
    if extra_under: card.over(extra_under)
    card.over(top); card.over(top.rot())
    idx=index_layer(suit,rank); card.over(idx); card.over(idx.rot())
    return card.im

def current(suit,rank):
    card=base(); ink=inkOf(suit); light=lightOf(suit)
    idx=index_layer(suit,rank); card.over(idx); card.over(idx.rot())
    card.rect(7,12,24,32,light); card.rect(8,13,23,31,C['cream'])
    card.art(OLD[rank],8,13,fmap(suit,rank))
    return card.im

def scaled(im,s): return im.resize((W*s,H*s),Image.NEAREST)
def _font(bold,size):
    for pth in ('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf'%('-Bold' if bold else ''),'/usr/share/fonts/dejavu/DejaVuSans%s.ttf'%('-Bold' if bold else '')):
        try: return ImageFont.truetype(pth,size)
        except Exception: pass
    return ImageFont.load_default()
FONT=_font(False,13)
FONTB=_font(True,15)
