import sys; sys.path.insert(0,'.')
exec(open('auswahl2.py').read().split('# ---------- Herz ----------')[0])
WV=dict(V=WHITE)    # Schleierfarbe: reines Weiß
HB4=m2(11,['takke','feder_ohr'],'keiner','kurz',A=WHITE,a=GOLD)
HB5=m2(11,'turban_klein','keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED)
HBk=m2(11,['takke_rund','mond_klein'],'keiner','kurz',('brauen',),A=WHITE,a=GOLD)
HDc=m2(12,['schleier','sterne_schleier'],'keiner','mittelscheitel_lang',**WV,**HH)
HDa=m2(12,['schleier','mond'],'keiner','mittelscheitel_lang',**WV,**HH)
HDl=m2(12,['schleier_r','tikka'],'keiner','rund_scheitel',J=RED,**WV,**HH)
HDg=m2(12,['kamm5_9_o','ohrringe'],'keiner','hochsteck',**HH)
HDk6=m2(12,['kamm5_9_rot_u','ohrringe'],'keiner','hochsteck',**HH)
def neu(extra): return m2(12,['fall_cb']+extra,'keiner','rund_scheitel',J=RED,**HH)
herz=[[('Referenz','Herz König (Master)',ref('herz_koenig')),
       ('HB4 Schreiber','Takke, orange Feder',render('H',11,HB4)),
       ('HB5 Kalifensohn','kleiner Turban wie der König',render('H',11,HB5)),
       ('HB-k Mondbote','runderer Kopf',render('H',11,HBk))],
      [('HD-c Sternenschleier','Vorlage, Schleier jetzt weiß',render('H',12,HDc)),
       ('HD-a Mond + Schleier','Vorlage, Schleier jetzt weiß',render('H',12,HDa)),
       ('HD2 Layla','Vorlage, runder Kopf, Schleier weiß',render('H',12,HDl)),
       ('HD-g Goldkamm','Kamm seitlich wie im ersten Entwurf',render('H',12,HDg)),
       ('HD-g K6 gedreht','Kamm um 180° gedreht, 1 px tiefer',render('H',12,HDk6))],
      [('Neu: Layla','Haube wie Fall C, unten wie Fall B',render('H',12,neu(['tikka']))),
       ('Neu: Mond','Haube wie Fall C, unten wie Fall B',render('H',12,neu(['mond']))),
       ('Neu: Sterne','Haube wie Fall C, unten wie Fall B',render('H',12,neu(['sterne_schleier']))),
       ('Neu: ohne Schmuck','Haube wie Fall C, unten wie Fall B',render('H',12,neu([])))]]
grid('Engere Auswahl: Herz',herz,'r24_auswahl_herz.png',per=5)
# Kamm-Positionen
rows=[]
for orient,suf,lbl in (('aufrecht','o','aufrecht'),('gedreht','rot_u','um 180° gedreht, 1 px tiefer')):
    r=[]
    for c0 in (7,8,9,10):
        nm='%s, Spalte %d'%('K' if orient=='aufrecht' else 'K6',c0)
        dsc=('Zinken oben, Kamm ab Spalte %d'%c0) if orient=='aufrecht' else ('gedreht, Kamm ab Spalte %d'%c0)
        r.append((nm,dsc,render('H',12,m2(12,['kamm5_%d_%s'%(c0,suf),'ohrringe'],'keiner','hochsteck',**HH))))
    rows.append(r)
grid('Goldkamm seitlich: vier Positionen (Spalte 9 entspricht dem ersten Entwurf)',rows,'r24_kamm.png',per=4,S=6)
# Kreuz
CBc=m2(11,['federkappe','krause'],'keiner','pagen',A=INK,F=GOLD,**KB)
FALKE_2=px(P.OBJ_FALKE,19,21)   # Blick nach rechts, 1 Kästchen weiter rechts, Schnabel in Spalte 24
CBd=m2(11,'federkappe','keiner','kurz',px=FALKE_2,A=INK,F=GOLD,**KB)
CBj=m2(11,['krone_klein','hermelin'],'keiner','pony_a',**KB)
CBl=m2(11,'seemannsmuetze','keiner','pagen',W=INK,**KB)
CD3=dict(m2(12,'diadem_gross','keiner','hochsteck',J=RED,**KD),acc=['perlen'])
CDf=m2(12,'ohrringe','keiner','zopfkrone',**KD)
kreuz=[[('Referenz','Kreuz König (Master)',ref('kreuz_koenig')),
        ('CB-c Page','Federbarett mit Spitzenkragen',render('C',11,CBc)),
        ('CB-d Falkner','Falke blickt nach rechts, ein Kästchen weiter rechts',render('C',11,CBd)),
        ('CB-j Hermelinprinz','kleine Krone, Hermelinkragen',render('C',11,CBj)),
        ('CB-l Barett','flaches schwarzes Barett',render('C',11,CBl))],
       [('','',None),
        ('CD3 Hofdame','Hochsteckfrisur, Diadem, Perlenkette',render('C',12,CD3)),
        ('CD-f Zopfkrone','Zöpfe als Krone um den Kopf',render('C',12,CDf))]]
grid('Engere Auswahl: Kreuz',kreuz,'r24_auswahl_kreuz.png',per=5)
# Falke im Detail
S=12; box=(8,4,28,30); tw=(box[2]-box[0])*S; th=(box[3]-box[1])*S
im=Image.new('RGB',(max(tw+2*pad,470),th+50),bg); d=ImageDraw.Draw(im)
im.paste(render('C',11,CBd).crop(box).resize((tw,th),Image.NEAREST),(pad,pad)); d.text((pad,pad+th+6),'Falkner: Schnabel in Spalte 24, nichts abgeschnitten',fill=C['ink'],font=FB)
im.save('r24_falke.png'); print(im.size)
