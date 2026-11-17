from fams import *
S=5;pad=14;cw=W*S+pad
rows=3; cols=4
sheet=Image.new('RGB',(cols*cw+pad+120,rows*(H*S+pad)+pad+24),(0xf2,0xe6,0xd0));d=ImageDraw.Draw(sheet)
for ci,(name,suit,cs) in enumerate(FAMS):
    d.text((pad+ci*cw+120,4),name,fill=C['ink'],font=FONTB)
    for ri,(title,desc,spec) in enumerate(cs):
        im=scaled(card(suit,13,spec[13]),S); x=pad+120+ci*cw; y=24+ri*(H*S+pad)
        sheet.paste(im,(x,y),im)
        ey=y+int((P_EYE:=16.5)*S)
        d2=ImageDraw.Draw(sheet); d2.line([(x+6*S,ey),(x+W*S-6*S,ey)],fill=(0x2a,0x7f,0xd9),width=1)
        if ci==0: d.text((pad,y+H*S//2-8),'Entwurf %d'%(ri+1),fill=C['ink'],font=FONTB)
sheet.save('fam_koenige.png');print(sheet.size)
