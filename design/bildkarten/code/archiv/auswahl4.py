import sys; sys.path.insert(0,'.')
exec(open('auswahl2.py').read().split('# ---------- Herz ----------')[0])
WV=dict(V=WHITE)
# Kollisionsprüfung Vogel gegen die sichtbaren Reste des Symbols unten rechts (Kreuz)
rem={(22+x,26+y) for y,r in enumerate(rot(SH['C'])) for x,ch in enumerate(r) if ch=='#' and 22+x>=25}
print('Symbolreste (Kreuz):',len(rem))
def collide(pxl): return any((x,y) in rem for x,y,_ in pxl)
# ---------- Kreuz Falkner ----------
KBn=dict(H=BROWN,B=DBROWN)
def falk(art,x,y,mirrored=False):
    rows=P.mirror(art) if mirrored else art
    return px(rows,x,y)
def bube_f(pxl): return m2(11,'federkappe','keiner','kurz',px=pxl,A=INK,F=GOLD,**KBn)
POS=[('F1','Blick rechts, 1 Pixel weiter rechts',P.FALKE_A,20,21,False),
     ('F2','wie F1, 1 Pixel höher',P.FALKE_A,20,20,False),
     ('F3','sitzt tiefer in der Schulter',P.FALKE_A,19,23,False),
     ('F4','frei schwebend, Blick rechts',P.FALKE_A,21,17,False),
     ('F5','Blick nach links auf der Schulter',P.FALKE_A,20,21,True),
     ('F6','frei schwebend, Blick links',P.FALKE_A,21,17,True),
     ('F7','größerer Vogel, Blick rechts, frei',P.FALKE_B,21,18,False),
     ('F8','größerer Vogel, Blick links, frei',P.FALKE_B,21,19,True)]
items=[]
for n,dsc,art,x,y,mir in POS:
    pl=falk(art,x,y,mir); col=collide(pl)
    print(n,'Kollision mit Symbol:',col)
    items.append((n,dsc+(' (Achtung Symbol)' if col else ''),render('C',11,bube_f(pl))))
grid('Falkner: Positionen (Vogel immer rechts, nichts angeschnitten)',[items[:4],items[4:]],'r25_falke_positionen.png',per=4,S=6)
# ---------- Herz Auswahl ----------
HB4=m2(11,['takke','feder_ohr'],'keiner','kurz',A=WHITE,a=GOLD)
HB5=m2(11,'turban_klein','keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED)
HBk=m2(11,['takke_rund','mond_klein'],'keiner','kurz',('brauen',),A=WHITE,a=GOLD)
HDc=m2(12,['schleier','sterne_schleier'],'keiner','mittelscheitel_lang',**WV,**HH)
HDa=m2(12,['schleier','mond'],'keiner','mittelscheitel_lang',**WV,**HH)
HDl=m2(12,['schleier_r','tikka'],'keiner','rund_scheitel',J=RED,**WV,**HH)
HDk6=m2(12,['kamm5_8_rot_u','ohrringe'],'keiner','hochsteck',**HH)
def neu(top,extra): return m2(12,[top]+extra,'keiner','rund_scheitel',J=RED,**HH)
herz=[[('Referenz','Herz König (Master)',ref('herz_koenig')),
       ('HB4 Schreiber','Takke, orange Feder',render('H',11,HB4)),
       ('HB5 Kalifensohn','kleiner Turban wie der König',render('H',11,HB5)),
       ('HB-k Mondbote','runderer Kopf',render('H',11,HBk))],
      [('HD-c Sternenschleier','Vorlage, Schleier weiß',render('H',12,HDc)),
       ('HD-a Mond + Schleier','Vorlage, Schleier weiß',render('H',12,HDa)),
       ('HD2 Layla','Vorlage, runder Kopf, Schleier weiß',render('H',12,HDl)),
       ('HD-g Goldkamm','gedreht, 1 px tiefer, Spalte 8',render('H',12,HDk6))]]
grid('Engere Auswahl: Herz',herz,'r25_auswahl_herz.png',per=5)
# ---------- Hauben nach oben verlängert ----------
cols=[('aktuell','fall_cb',None),('+1 Zeile','fall_d1','mond_d1'),('+2, spitz','fall_d2a','mond_d2a'),('+2, rund','fall_d2b','mond_d2b'),('+3, spitz','fall_d3a','mond_d3a'),('+3, rund','fall_d3b','mond_d3b')]
rows=[]
for rn,extra in (('Layla',['tikka']),('Mond','M'),('Sterne',['sterne_schleier']),('ohne',[])):
    r=[]
    for cn,top,mond in cols:
        if extra=='M':
            ex=['mond'] if mond is None else [mond]
        else: ex=extra
        r.append((rn+' · '+cn,'Haube nach oben verlängert' if cn!='aktuell' else 'bisheriger Stand',render('H',12,neu(top,ex))))
    rows.append(r)
grid('Neuer Schleier: Haube nach oben verlängert, rund',rows,'r25_haube.png',per=6,S=5,lab=70)
# ---------- Kreuz Auswahl ----------
CBc=m2(11,['federkappe','krause'],'keiner','pagen',A=INK,F=GOLD,**KBn)
CBd1=bube_f(falk(P.FALKE_A,20,21)); CBd2=bube_f(falk(P.FALKE_A,20,20))
CBj=m2(11,['krone_klein','hermelin'],'keiner','pony_a',**KBn)
CBl=m2(11,'seemannsmuetze','keiner','pagen',W=INK,**KBn)
CD3=dict(m2(12,'diadem_gross','keiner','hochsteck',J=RED,**KD),acc=['perlen'])
CDf=m2(12,'ohrringe','keiner','zopfkrone',**KD)
kreuz=[[('Referenz','Kreuz König (Master)',ref('kreuz_koenig')),
        ('CB-c Page','Federbarett mit Spitzenkragen',render('C',11,CBc)),
        ('CB-d1 Falkner','Vogel 1 Pixel weiter rechts',render('C',11,CBd1)),
        ('CB-d2 Falkner','wie d1, 1 Pixel höher',render('C',11,CBd2)),
        ('CB-j Hermelinprinz','kleine Krone, Hermelinkragen',render('C',11,CBj)),
        ('CB-l Barett','flaches schwarzes Barett',render('C',11,CBl))],
       [('','',None),
        ('CD3 Hofdame','Hochsteckfrisur, Diadem, Perlenkette',render('C',12,CD3)),
        ('CD-f Zopfkrone','Zöpfe als Krone um den Kopf',render('C',12,CDf))]]
grid('Engere Auswahl: Kreuz',kreuz,'r25_auswahl_kreuz.png',per=6)
