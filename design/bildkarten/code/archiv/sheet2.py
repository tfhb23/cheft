from layouts import *
import sys
def trio_sheet(names,fname,S=4):
    pad=14; cw=W*S
    cols=6; rowh=H*S+34
    sheet=Image.new('RGB',(cols*(cw+8)+2*pad+150,len(names)*rowh+pad),(0xf2,0xe6,0xd0));d=ImageDraw.Draw(sheet)
    for ri,(lab,fn) in enumerate(names):
        y=pad+ri*rowh
        d.text((pad,y+H*S//2-8),lab,fill=C['ink'],font=FONTB)
        for ci,(suit,rank) in enumerate([(s,r) for s in 'HS' for r in (11,12,13)]):
            im=scaled(fn(suit,rank),S); x=pad+150+ci*(cw+8)+(14 if ci>=3 else 0)
            sheet.paste(im,(x,y),im)
    sheet.save(fname); print(fname,sheet.size)
if __name__=='__main__':
    V=dict((l[0],(l,f)) for l,f in VARIANTS)
    trio_sheet([V['A'],V['B'],V['C'],V['D'],V['E']],'sheet2_buste.png')
    trio_sheet([V['A'],V['F'],V['G'],V['H']],'sheet3_kopf.png')
    trio_sheet([V['A'],V['C'],V['I'],V['J']],'sheet4_attribut.png',S=5)
