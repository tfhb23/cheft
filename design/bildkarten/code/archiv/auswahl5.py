import sys; sys.path.insert(0,'.')
exec(open('auswahl2.py').read().split('# ---------- Herz ----------')[0])
OLD=['..www.','.wwKwG','wwOOw.','wwOOw.','.G.G..']          # die ursprüngliche Falken-Zeichnung, unverändert (Blick nach rechts)
def mirror(rows): return [r[::-1] for r in rows]
rem={(22+x,26+y) for y,r in enumerate(rot(SH['C'])) for x,ch in enumerate(r) if ch=='#' and 22+x>=25}
def bube(x,y,mir=False,shadow=False):
    pl=px(mirror(OLD) if mir else OLD,x,y)
    col=any((a,b) in rem for a,b,_ in pl)
    sp=m2(11,'federkappe','keiner','kurz',px=pl,A=INK,F=GOLD,**KB)
    if not shadow: sp['px_after']=True
    return sp,col
POS=[('F1','Blick rechts, 1 Pixel weiter rechts als zuletzt',20,21,False),
     ('F2','wie F1, 1 Pixel höher',20,20,False),
     ('F3','Blick rechts, tiefer in der Schulter',19,23,False),
     ('F4','Blick rechts, frei schwebend',21,17,False),
     ('F5','Blick links auf der Schulter',20,21,True),
     ('F6','Blick links, 1 Pixel höher',20,20,True),
     ('F7','Blick links, tiefer in der Schulter',19,23,True),
     ('F8','Blick links, frei schwebend',21,17,True),
     ('F9','Blick rechts, frei, weiter außen',22,19,False),
     ('F10','Blick links, frei, weiter außen',22,20,True)]
items=[]
for n,dsc,x,y,m in POS:
    sp,col=bube(x,y,m); print(n,'Kollision:',col)
    items.append((n,dsc,render('C',11,sp)))
grid('Falkner: Vogel wie vorher, nur andere Positionen (immer rechts)',[items[:5],items[5:]],'r26_falke_positionen.png',per=5,S=6)
# Schatten-Vergleich im Detail
S=12; box=(14,12,30,32); tw=(box[2]-box[0])*S; th=(box[3]-box[1])*S
a=render('C',11,bube(20,21,False,shadow=True)[0]).crop(box).resize((tw,th),Image.NEAREST)
b=render('C',11,bube(20,21,False,shadow=False)[0]).crop(box).resize((tw,th),Image.NEAREST)
im=Image.new('RGB',(2*tw+3*pad,th+50),bg); d=ImageDraw.Draw(im)
im.paste(a,(pad,pad)); im.paste(b,(2*pad+tw,pad)); d.text((pad,pad+th+6),'mit Schatten (bisher)',fill=C['ink'],font=FB); d.text((2*pad+tw,pad+th+6),'ohne Schatten, Füße frei',fill=C['ink'],font=FB)
im.save('r26_schatten.png'); print(im.size)
# Kreuz-Auswahl
CBc=m2(11,['federkappe','krause'],'keiner','pagen',A=INK,F=GOLD,**KB)
CBd1=bube(20,21)[0]; CBd2=bube(20,20)[0]
CBj=m2(11,['krone_klein','hermelin'],'keiner','pony_a',**KB)
CBl=m2(11,'seemannsmuetze','keiner','pagen',W=INK,**KB)
CD3=dict(m2(12,'diadem_gross','keiner','hochsteck',J=RED,**KD),acc=['perlen'])
CDf=m2(12,'ohrringe','keiner','zopfkrone',**KD)
kreuz=[[('Referenz','Kreuz König (Master)',ref('kreuz_koenig')),
        ('CB-c Page','Federbarett mit Spitzenkragen',render('C',11,CBc)),
        ('CB-d1 Falkner','Vogel wie vorher, 1 Pixel weiter rechts',render('C',11,CBd1)),
        ('CB-d2 Falkner','wie d1, 1 Pixel höher',render('C',11,CBd2)),
        ('CB-j Hermelinprinz','kleine Krone, Hermelinkragen',render('C',11,CBj)),
        ('CB-l Barett','flaches schwarzes Barett',render('C',11,CBl))],
       [('','',None),
        ('CD3 Hofdame','Hochsteckfrisur, Diadem, Perlenkette',render('C',12,CD3)),
        ('CD-f Zopfkrone','Zöpfe als Krone um den Kopf',render('C',12,CDf))]]
grid('Engere Auswahl: Kreuz',kreuz,'r26_auswahl_kreuz.png',per=6)
