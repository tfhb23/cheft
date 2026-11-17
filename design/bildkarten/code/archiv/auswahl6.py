import sys; sys.path.insert(0,'.')
exec(open('auswahl2.py').read().split('# ---------- Herz ----------')[0])
WV=dict(V=WHITE)
# ---------------- Herz Bube: Kompromiss ----------------
HB4=m2(11,['takke','feder_ohr'],'keiner','kurz',A=WHITE,a=GOLD)
HB5=m2(11,'turban_klein','keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED)
HBk=m2(11,['takke_rund','mond_klein'],'keiner','kurz',('brauen',),A=WHITE,a=GOLD)
def hb_neu(t): return m2(11,[t,'mond_klein','feder_ohr'],'keiner','kurz',('brauen',),A=WHITE,a=SHADE)
rows=[[('Referenz','Herz König (Master)',ref('herz_koenig')),
       ('HB4 Schreiber','Basis: Feder',render('H',11,HB4)),
       ('HB5 Kalifensohn','Basis: Turbanform',render('H',11,HB5)),
       ('HB-k Mondbote','Basis: goldene Elemente',render('H',11,HBk)),
       ('Kompromiss A','Turbanform HB5, Gold, Mond, Feder, keine graue Linie',render('H',11,hb_neu('turbm_a'))),
       ('Kompromiss B','wie A, graue Linie über dem Mond',render('H',11,hb_neu('turbm_b'))),
       ('Kompromiss C','wie A, graue Linie links und rechts vom Mond',render('H',11,hb_neu('turbm_c')))]]
grid('Herz Bube: Kompromiss aus Mondbote, Kalifensohn und Schreiber',rows,'r27_herz_bube.png',per=7,S=5)
# Detail: die drei Kompromisse groß
S=12; box=(6,3,28,24); tw=(box[2]-box[0])*S; th=(box[3]-box[1])*S
im=Image.new('RGB',(3*(tw+pad)+pad,th+50),bg); d=ImageDraw.Draw(im)
for i,(n,t) in enumerate([('A','turbm_a'),('B','turbm_b'),('C','turbm_c')]):
    c=render('H',11,hb_neu(t)).crop(box).resize((tw,th),Image.NEAREST); im.paste(c,(pad+i*(tw+pad),pad)); d.text((pad+i*(tw+pad),pad+th+6),'Kompromiss '+n,fill=C['ink'],font=FB)
im.save('r27_herz_bube_detail.png'); print(im.size)
# ---------------- Runde Haube ----------------
OPT=[('aktuell',None),('Ra  6,10,12,12',[6,10,12,12]),('Rb  +1: 6,10,12,12,12',[6,10,12,12,12]),('Rc  +1 breit: 8,10,12,12,12',[8,10,12,12,12]),('Rd  +2: 4,8,10,12,12,12',[4,8,10,12,12,12]),('Re  +2 flach: 6,10,12,12,12,12',[6,10,12,12,12,12])]
for i,(n,w) in enumerate(OPT):
    if w is None: continue
    P.HAT['fall_R%d'%i]=P._fall_cap(w); P.HAT['mond_R%d'%i]=P._shift(P.HAT['mond'],-(len(w)-4))
def neu(i,extra): return m2(12,['fall_cb' if OPT[i][1] is None else 'fall_R%d'%i]+extra,'keiner','rund_scheitel',J=RED,**HH)
rows=[]
for rn,extra in (('Layla',['tikka']),('Mond','M'),('Sterne',['sterne_schleier']),('ohne',[])):
    r=[]
    for i,(n,w) in enumerate(OPT):
        ex=(['mond'] if OPT[i][1] is None else ['mond_R%d'%i]) if extra=='M' else extra
        r.append((rn+' · '+n.split('  ')[0],'' if w is None else 'Breiten pro Zeile: '+n.split('  ')[1],render('H',12,neu(i,ex))))
    rows.append(r)
grid('Neuer Schleier: rundliche Haube oben (keine Spitze)',rows,'r27_haube_rund.png',per=6,S=5,lab=70)
# ---------------- Kreuz Auswahl mit F9 ----------------
OLD=['..www.','.wwKwG','wwOOw.','wwOOw.','.G.G..']
def bube_f(x,y):
    sp=m2(11,'federkappe','keiner','kurz',px=px(OLD,x,y),A=INK,F=GOLD,**KB); sp['px_after']=True; return sp
CBc=m2(11,['federkappe','krause'],'keiner','pagen',A=INK,F=GOLD,**KB)
CBd=bube_f(22,19)
CBj=m2(11,['krone_klein','hermelin'],'keiner','pony_a',**KB)
CBl=m2(11,'seemannsmuetze','keiner','pagen',W=INK,**KB)
CD3=dict(m2(12,'diadem_gross','keiner','hochsteck',J=RED,**KD),acc=['perlen'])
CDf=m2(12,'ohrringe','keiner','zopfkrone',**KD)
kreuz=[[('Referenz','Kreuz König (Master)',ref('kreuz_koenig')),
        ('CB-c Page','Federbarett mit Spitzenkragen',render('C',11,CBc)),
        ('CB-d Falkner','Position F9: frei, weiter außen, Blick rechts',render('C',11,CBd)),
        ('CB-j Hermelinprinz','kleine Krone, Hermelinkragen',render('C',11,CBj)),
        ('CB-l Barett','flaches schwarzes Barett',render('C',11,CBl))],
       [('','',None),
        ('CD3 Hofdame','Hochsteckfrisur, Diadem, Perlenkette',render('C',12,CD3)),
        ('CD-f Zopfkrone','Zöpfe als Krone um den Kopf',render('C',12,CDf))]]
grid('Engere Auswahl: Kreuz',kreuz,'r27_auswahl_kreuz.png',per=5)
