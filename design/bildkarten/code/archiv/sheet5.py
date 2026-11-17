from layouts import *
pad=14
n=len(VARIANTS)
sheet=Image.new('RGB',(n*(W*3+pad)+pad,H*3+H*2+70),(0xf2,0xe6,0xd0));d=ImageDraw.Draw(sheet)
for i,(lab,fn) in enumerate(VARIANTS):
    x=pad+i*(W*3+pad)
    for r,yy in ((13,pad),):
        a=scaled(fn('H',12),3); sheet.paste(a,(x,yy),a)
    b=scaled(fn('S',13),2); sheet.paste(b,(x,pad+H*3+8),b)
    c=scaled(fn('H',11),2); sheet.paste(c,(x+W*2+4,pad+H*3+8),c) if W*2+4+W*2<=W*3+pad+10 else None
    d.text((x,pad+H*3+H*2+14),lab.split(chr(10))[0].split()[0],fill=C['ink'],font=FONTB)
sheet.save('sheet5_klein.png');print(sheet.size)
