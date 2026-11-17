from fams import *
import textwrap
def fam_sheet(name,suit,concepts,fname,S=6):
    pad=16; cw=W*S+10; lab_h=68
    rowh=H*S+lab_h+pad
    sheet=Image.new('RGB',(3*cw+pad*2,len(concepts)*rowh+pad+30),(0xf2,0xe6,0xd0));d=ImageDraw.Draw(sheet)
    d.text((pad,6),name,fill=C['ink'],font=FONTB)
    for ri,(title,desc,spec) in enumerate(concepts):
        y=30+ri*rowh
        for ci,rank in enumerate((11,12,13)):
            im=card(suit,rank,spec[rank]); b=scaled(im,S); sheet.paste(b,(pad+ci*cw,y),b)
        d.text((pad,y+H*S+4),title,fill=C['ink'],font=FONTB)
        d.multiline_text((pad,y+H*S+24),'\n'.join(textwrap.wrap(desc,62)),fill=C['ink'],font=FONT)
    sheet.save(fname); print(fname,sheet.size)
if __name__=='__main__':
    for name,suit,cs in FAMS: fam_sheet('Familie '+name,suit,cs,'fam_%s.png'%name.lower())
