from layouts import *
S=6;pad=16;per=5
rows=[VARIANTS[:per],VARIANTS[per:]]
cw=W*S+pad; rh=H*S+70
sheet=Image.new('RGB',(per*cw+pad,2*rh+pad),(0xf2,0xe6,0xd0));d=ImageDraw.Draw(sheet)
for ri,row in enumerate(rows):
    for i,(lab,fn) in enumerate(row):
        im=fn('H',13); x=pad+i*cw; y=pad+ri*rh
        b=scaled(im,S); sheet.paste(b,(x,y),b)
        d.multiline_text((x,y+H*S+4),lab,fill=C['ink'],font=FONTB)
        s3=scaled(im,3); sheet.paste(s3,(x,y+H*S+24),s3) if False else None
sheet.save('sheet1_koenig.png');print(sheet.size)
