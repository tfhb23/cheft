from comp import *
RED2=hx('a02a20'); WHITEHAIR=hx('f3f0ea')
def sp(hat,beard='keiner',hair='kurz',extra=(),body='platz',**pal): return dict(body=body,hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal)
def sheet(title,collabels,rowlabels,cell,suit_of_row,rank_of_row,fname,S=4,emph='ohne',lw=170,note=''):
    pad=12; cw=W*S+8; rh=H*S+16
    top=70+(18 if note else 0)
    im=Image.new('RGB',(lw+len(collabels)*cw+pad,top+len(rowlabels)*rh+pad),(0xf2,0xe6,0xd0));d=ImageDraw.Draw(im)
    d.text((pad,6),title,fill=C['ink'],font=FONTB)
    if note: d.text((pad,28),note,fill=C['ink'],font=FONT)
    for ci,cl in enumerate(collabels): d.multiline_text((lw+ci*cw,top-42),cl,fill=C['ink'],font=FONT)
    for ri,rl in enumerate(rowlabels):
        y=top+ri*rh
        d.multiline_text((pad,y+H*S//2-10),rl,fill=C['ink'],font=FONT)
        for ci in range(len(collabels)):
            spec=cell(ri,ci)
            if spec is None: continue
            c=scaled(card(suit_of_row[ri],rank_of_row[ri],spec,emph),S); im.paste(c,(lw+ci*cw,y),c)
    im.save(fname); print(fname,im.size)

# ---- 1. Turban-Formen, weiß + Schlagschatten D, grauer Vollbart; Herz (rot) und Kreuz (schwarz) zum Vergleich
TB=[('rund','A  Rund\n(klassisch)'),('osman_hoch','B  Osmanisch\nhoch'),('moghul','C  Moghul\nJuwel + Feder'),('safawid','D  Safawidisch\nroter Stab'),
    ('sikh','E  Sikh-Dastar\nglatt, Spitze'),('zwiebel','F  Zwiebel-\nkuppel'),('kufiya','G  Kopftuch\nmit Ring'),('zweistufig','H  Zweistufig\n(Sultan)')]
gray=dict(A=C['white'],a=SHADE,J=C['red'],H=GRAY_BEARD,B=GRAY_BEARD)
def tcell(ri,ci):
    k=TB[ci][0]
    pal=dict(gray)
    if ri==1: pal.update(H=GRAY_BEARD,B=GRAY_BEARD)
    return sp('turban_'+k,'lang','kurz',**pal)
sheet('Turban-Formen: weiß mit Schlagschatten (D), grauer Vollbart',[l for _,l in TB],['Herz (rot)','Kreuz (schwarz)'],tcell,['H','C'],[13,13],'r2_turban.png',S=4,emph='schlagschatten',lw=110)

# ---- 2. Fez höher und eckiger (Variante B als Grundlage)
FZ=[('fez_kurz','B  Original\n(Referenz)'),('fez_h9','B1  hoch,\neckig'),('fez_h10','B2  höher,\neckig'),('fez_h11','B3  sehr hoch,\neckig'),('fez_h9k','B4  hoch,\nleicht konisch')]
fezpal=dict(A=C['red'],a=RED2)
def fcell(ri,ci):
    h=FZ[ci][0]
    return sp(h,['voll','zwirbel','keiner','keiner'][ri],'kurz',**fezpal)
sheet('Karo mit Fez: höher und eckiger',[l for _,l in FZ],['König\nVollbart','König\nZwirbelbart','König\nohne Bart','Bube\nohne Bart'],fcell,['D']*4,[13,13,13,11],'r2_fez.png',S=5,lw=110)

# ---- 3. Pik: Zylinder-Formen, weiße Haare, ohne Bube
ZY=[('z_gerade','A  hoch, gerade'),('z_kegel','B  Kegelstumpf\n(oben breiter)'),('z_sanduhr','C  Sanduhr\n(Taille)'),('z_lincoln','D  sehr hoch\n(Lincoln)'),('z_krempe','E  niedrig,\nKrempe aufgebogen'),('z_breit','F  breit,\nwuchtig')]
bp=dict(H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)
def zcell(ri,ci):
    k=ZY[ci][0]
    if ri==0: return sp(k,'zwirbel','lang',['monokel'],**bp)
    if ri==1: return sp(k,'keiner','lang',['monokel'],**bp)
    if ri==2: return sp(k,'schnurr','schlitz',(),**bp)
    d=dict(bp); d['M']=C['red']
    return sp(k+'_d','keiner','lang',(),**d)
sheet('Pik: Zylinder-Formen, weiße Haare (Schlagschatten D)',[l for _,l in ZY],['König\nZwirbelbart, Monokel,\nlanges Haar','König\nohne Bart, Monokel,\nlanges Haar','König\nSchnurrbart,\nglatt zurück','Dame\nniedrige Variante,\nlanges Haar'],zcell,['S']*4,[13,13,13,12],'r2_zylinder.png',S=4,emph='schlagschatten',lw=185)
