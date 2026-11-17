from layouts2 import *
S=6;pad=16
items=[('N2 schmal\nSymbol ca. {}% sichtbar',N2w(16)),('N2 mittel\nSymbol ca. {}% sichtbar',N2w(18)),('N2 breit\nSymbol ca. {}% sichtbar',N2w(20)),
       ('N7 Querband\n(waagerecht verdeckt)\nSymbol ca. {}% sichtbar',N7),('N3 Medaillon\nSymbol ca. {}% sichtbar',N3)]
cw=W*S+pad
sheet=Image.new('RGB',(len(items)*cw+pad,H*S+pad*2+70),(0xf2,0xe6,0xd0));d=ImageDraw.Draw(sheet)
for i,(lab,fn) in enumerate(items):
    im,p=fn('H',13,ret=True); x=pad+i*cw
    b=scaled(im,S); sheet.paste(b,(x,pad),b)
    d.multiline_text((x,pad+H*S+6),lab.format(round(100*suit_visible(p,'H'))),fill=C['ink'],font=FONT)
sheet.save('sheetS_schnitt.png');print(sheet.size)
