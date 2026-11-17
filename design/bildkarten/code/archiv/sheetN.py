from layouts2 import *
import sheet2 as s2
S=6;pad=16;per=4
cw=W*S+pad; rh=H*S+80
rows=[NOMIRROR[:per],NOMIRROR[per:]]
sheet=Image.new('RGB',(per*cw+pad,2*rh+pad),(0xf2,0xe6,0xd0));d=ImageDraw.Draw(sheet)
for ri,row in enumerate(rows):
    for i,(lab,fn) in enumerate(row):
        im,p=fn('H',13,ret=True); x=pad+i*cw; y=pad+ri*rh
        b=scaled(im,S); sheet.paste(b,(x,y),b)
        d.multiline_text((x,y+H*S+4),lab+'\nSymbol ca. %d%% sichtbar'%round(100*suit_visible(p,'H')),fill=C['ink'],font=FONT)
sheet.save('sheetN_koenig.png');print(sheet.size)
def wrap(fn): return lambda s,r: fn(s,r)
s2.trio_sheet([(l.replace('\n',' '),f) for l,f in NOMIRROR[:4]],'sheetN_trios1.png',S=5)
s2.trio_sheet([(l.replace('\n',' '),f) for l,f in NOMIRROR[4:]],'sheetN_trios2.png',S=5)
