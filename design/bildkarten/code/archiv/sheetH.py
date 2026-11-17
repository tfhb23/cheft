from layouts2 import *
import sheet2 as s2
items=[('H  alt\n(Auswahl)',H_alt),('H2a  2 px\nweiß, symmetrisch',H2a),('H2b  1 px weiß,\nunten 1 px höher',H2b)]
S=8;pad=18;cw=W*S
sheet=Image.new('RGB',(3*(cw+pad)+pad,H*S+pad*2+44),(0xf2,0xe6,0xd0));d=ImageDraw.Draw(sheet)
for i,(lab,fn) in enumerate(items):
    x=pad+i*(cw+pad); im=scaled(fn('H',13),S); sheet.paste(im,(x,pad),im)
    d.multiline_text((x,pad+H*S+6),lab,fill=C['ink'],font=FONTB)
sheet.save('sheetH_koenig.png')
V=[('H alt',H_alt),('H2a',H2a),('H2b',H2b)]
s2.trio_sheet(V,'sheetH_trios.png',S=5)
