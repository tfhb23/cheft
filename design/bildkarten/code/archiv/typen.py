from comp import *
import textwrap
DRED=hx('8e2b22'); GOLD2=hx('c8902a'); RED2=hx('a02a20')
PALE=dict(S=SKIN_PALE)
def sp(hat,beard='keiner',hair='kurz',extra=(),**pal): return dict(body='platz',hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal)
def grid(title,rowlabels,collabels,cells,suit,rank_of_row,fname,S=5,emph='ohne',note=''):
    pad=14; cw=W*S+10; rh=H*S+34; lw=190
    sheet=Image.new('RGB',(lw+len(collabels)*cw+pad,len(rowlabels)*rh+pad+54),(0xf2,0xe6,0xd0));d=ImageDraw.Draw(sheet)
    d.text((pad,6),title,fill=C['ink'],font=FONTB)
    if note: d.text((pad,28),note,fill=C['ink'],font=FONT)
    for ci,cl in enumerate(collabels): d.multiline_text((lw+ci*cw,50),cl,fill=C['ink'],font=FONT)
    for ri,rl in enumerate(rowlabels):
        y=50+34+ri*rh-14
        d.multiline_text((pad,y+H*S//2-10),rl,fill=C['ink'],font=FONT)
        for ci in range(len(collabels)):
            spec=cells[ri][ci]
            if spec is None: continue
            im=scaled(card(suit,rank_of_row[ri],spec,emph),S); sheet.paste(im,(lw+ci*cw,y+14),im)
    sheet.save(fname); print(fname,sheet.size)

# ---------- KARO mit Fez ----------
FZ=['fez','fez_kurz','fez_band']
fezpal=dict(A=C['red'],a=RED2)
def fez(h,beard,hair='kurz'): return sp(h,beard,hair,**fezpal)
rows=['König\nVollbart','König\nZwirbelbart','König\nohne Bart','Bube\nohne Bart','Bube\nFlaum-Schnurrbart']
cells=[[fez(h,'voll') for h in FZ],[fez(h,'zwirbel') for h in FZ],[fez(h,'keiner') for h in FZ],[fez(h,'keiner') for h in FZ],[fez(h,'flaum') for h in FZ]]
grid('Karo (rot) mit Fez',rows,['A  Quaste seitlich lang','B  Quaste kurz oben','C  goldenes Band,\nohne Quaste'],cells,'D',[13,13,13,11,11],'t_karo_fez.png')

# ---------- HERZ persischer Dichter ----------
dbr=dict(H=DBROWN,B=DBROWN)
gry=dict(H=GRAY_BEARD,B=GRAY_BEARD)
def poet(hat,beard,palx,hair='kurz',extra=(),**more): 
    p=dict(palx); p.update(more); return sp(hat,beard,hair,extra,**p)
hats={'Turban (Referenz)':('turban',dict(A=C['white'],a=SHADE,J=C['red']),'kurz',()),
      'Kolah\n(hohe Filzmütze)':('kolah',dict(A=DRED,a=C['gold']),'kurz',()),
      'Takke\n(kleine Kappe)':('takke',dict(A=C['white'],a=C['gold']),'kurz',()),
      'Locken + Rose\n(barhäuptig)':(None,{},'locken',('rose_ohr',)),
      'Lorbeerkranz':('lorbeer',{},'kurz',())}
cols=list(hats)
def row(beard,bardcol,rankpal):
    out=[]
    for k in cols:
        h,pl,hair,ex=hats[k]; pal=dict(pl); pal.update(bardcol)
        out.append(poet(h if h else [],beard,pal,hair,ex))
    return out
rows=['König\ngrauer Vollbart','König\ndunkler Vollbart','König\nSchnurrbart','König\nohne Bart','Bube\nohne Bart']
cells=[row('lang',gry,None),row('voll',dict(H=DBROWN,B=DBROWN),None),row('schnurr',dict(H=DBROWN,B=DBROWN),None),row('keiner',dict(H=DBROWN),None),row('keiner',dict(H=DBROWN),None)]
grid('Herz (rot): persischer Dichter, nicht nur mit Turban',rows,cols,cells,'H',[13,13,13,13,11],'t_herz_dichter.png',S=4)

# ---------- PIK mit Zylinder ----------
bp=dict(H=BLACK,B=BLACK,S=SKIN_PALE)
ZY=['zylinder','zylinder_gold','zylinder_nieder']
def zy(h,beard,extra=(),hair='schlitz',**k):
    p=dict(bp); p.update(k); return sp(h,beard,hair,extra,**p)
rows=['König\nZwirbelbart + Monokel','König\nVollbart','König\nohne Bart + Monokel','Dame\nkleiner / niedriger Zylinder','Bube\nniedriger Zylinder']
cells=[[zy(h,'zwirbel',['monokel']) for h in ZY],[zy(h,'voll') for h in ZY],[zy(h,'keiner',['monokel']) for h in ZY],
       [zy('zylinder_klein','keiner',(),'lang',M=C['red']),zy('zylinder_klein','keiner',(),'hochsteck',M=C['red']),zy('zylinder_nieder','keiner',(),'lang',M=C['red'])],
       [zy('zylinder_nieder','keiner',(),'pony'),zy('zylinder_nieder','keiner',['monokel'],'pony'),zy('zylinder_nieder','flaum',(),'pony')]]
grid('Pik (schwarz) mit Zylinder',rows,['A  hoch, rotes Band','B  hoch, goldenes Band','C  niedrig, rotes Band'],cells,'S',[13,13,13,12,11],'t_pik_zylinder.png')

# ---------- Weiß sichtbar machen ----------
modes=[('ohne','A  ohne'),('kontur_hell','B  Kontur\nhell (Tinte hell)'),('kontur_dunkel','C  Kontur\ndunkel'),('schlagschatten','D  Schlagschatten\nunten rechts'),('innenschatten','E  Innenschatten\nunten und rechts')]
K1=poet('turban','lang',dict(A=C['white'],a=SHADE,J=C['red'],H=GRAY_BEARD,B=GRAY_BEARD))
K2=poet('takke','voll',dict(A=C['white'],a=C['gold'],H=DBROWN,B=GRAY_BEARD))
D1=sp('schleier','keiner','langoffen',V=hx('f4eee4'),H=DBROWN)
pad=14;S=5;cw=W*S+10;lw=150
sheet=Image.new('RGB',(lw+5*cw+pad,3*(H*S+34)+pad+70),(0xf2,0xe6,0xd0));d=ImageDraw.Draw(sheet)
d.text((pad,6),'Weiß auf Cremekarte: fünf Möglichkeiten',fill=C['ink'],font=FONTB)
for ci,(m,lab) in enumerate(modes): d.multiline_text((lw+ci*cw,34),lab,fill=C['ink'],font=FONT)
for ri,(lab,suit,rank,spec) in enumerate([('Turban +\ngrauer Bart','H',13,K1),('Takke +\nweißer Bart','H',13,K2),('Schleier','H',12,D1)]):
    y=34+34+ri*(H*S+34)
    d.multiline_text((pad,y+H*S//2-10),lab,fill=C['ink'],font=FONT)
    for ci,(m,_) in enumerate(modes):
        im=scaled(card(suit,rank,spec,m),S); sheet.paste(im,(lw+ci*cw,y),im)
sheet.save('t_weiss.png'); print(sheet.size)
