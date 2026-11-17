import sys; sys.path.insert(0,'.')
exec(open('auswahl2.py').read().split('# ---------- Herz ----------')[0])
WV=dict(V=WHITE); OLD=['..www.','.wwKwG','wwOOw.','wwOOw.','.G.G..']
BLACK=hx('1b1b1b'); SKIN_PALE=hx('f8e3d2'); WHITEHAIR=hx('f3f0ea')
# ---------------- Herz ----------------
HB_A=m2(11,['turbm_a','mond_klein'],'keiner','kurz_b',('brauen',),A=WHITE,a=SHADE)
HB5F=m2(11,['turban_klein','feder_hoch2'],'keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED)
HD_neu=m2(12,['fall_rc','mond_rc','sterne_schleier'],'keiner','rund_scheitel',('mund_schmal',),J=RED,**HH)
HD_kamm=m2(12,['kamm5_8_rot_u','ohrringe'],'keiner','hochsteck',('mund_schmal',),**HH)
herz=[[('Referenz','Herz König (Master)',ref('herz_koenig')),
       ('HB-A Kompromiss','Haar-Pixel am Gold entfernt, ohne Feder',render('H',11,HB_A)),
       ('HB5 + Feder','Feder sitzt 2 Pixel höher',render('H',11,HB5F))],
      [('Neu: Mond + Sterne','Schleier Rc, schmaler Mund',render('H',12,HD_neu)),
       ('HD-g Goldkamm','Kamm K6, Spalte 8, schmale Lippen',render('H',12,HD_kamm))]]
grid('Engere Auswahl: Herz (abgeschlossen)',herz,'r29_auswahl_herz.png',per=3)
# Federhöhe
rows=[[(('HB5, Feder +%d'%k),'Pixel höher als bisher',render('H',11,m2(11,['turban_klein','feder_hoch%d'%k],'keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED))) for k in (1,2,3)]]
rows[0].insert(0,('HB5 bisher','Feder wie zuletzt',render('H',11,m2(11,['turban_klein','feder_ohr'],'keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED))))
grid('HB5: Federhöhe',rows,'r29_feder_hoehe.png',per=4,S=6)
# ---------------- Kreuz ----------------
def bube_f(x,y):
    sp=m2(11,'federkappe','keiner','kurz',px=px(OLD,x,y),A=INK,F=GOLD,**KB); sp['px_after']=True; return sp
CBd=bube_f(22,19)
CBj_alt=m2(11,['krone_klein','hermelin'],'keiner','pony_a',**KB)
CBj=m2(11,['krone_klein','hermelin'],'keiner','pony_cj',**KB)
CD3=dict(m2(12,'diadem_gross','keiner','hochsteck',J=RED,**KD),acc=['perlen'])
CDf=m2(12,'ohrringe','keiner','zopfkrone',**KD)
CBc=m2(11,['federkappe','krause'],'keiner','pagen',A=INK,F=GOLD,**KB)
kreuz=[[('Referenz','Kreuz König (Master)',ref('kreuz_koenig')),
        ('CB-d Falkner','Falke F9',render('C',11,CBd)),
        ('CB-j Hermelinprinz','Augenbereich jetzt wie CB-c',render('C',11,CBj)),
        ('Zum Vergleich: CB-c','Vorlage der Frisur',render('C',11,CBc)),
        ('CB-j vorher','alte Frisur',render('C',11,CBj_alt))],
       [('','',None),
        ('CD3 Hofdame','Hochsteckfrisur, Diadem, Perlenkette',render('C',12,CD3)),
        ('CD-f Zopfkrone','Zöpfe als Krone um den Kopf',render('C',12,CDf))]]
grid('Engere Auswahl: Kreuz (abgeschlossen)',kreuz,'r29_auswahl_kreuz.png',per=5)
# ---------------- Pik König Zwilling ----------------
PK=dict(S=SKIN_PALE,B=BLACK,H=BLACK)
def twin(hat,beard,mon,extra=()):
    return m2(13,[hat],beard,'glatze',(mon,)+tuple(extra),**PK)
hat_rows=[[('Referenz','Pik König (Master)',ref('pik_koenig'))]+
          [('Hut R%d'%i,d,render('S',13,twin(h,'m_zwirbel','monokel_r5'))) for i,(h,d) in enumerate([('z_r1','Ecken 1 Pixel gerundet'),('z_r2','weicher Halbkreis (4,6,8)'),('z_r4','Kuppel (2,4,6,8)')],1)]]
grid('Pik König Zwilling: Zylinder oben gerundet, gleiche Höhe (schwarzes Monokel rechts, ohne Kette, ohne Haare)',hat_rows,'r29_pik_hut.png',per=4)
mu=[('m_zwirbel','Zwirbelbart hochgedreht'),('m_gross','Zwirbelbart groß, Spitzen hoch'),('m_haengend','Schnurrbart hängend (Fu-Manchu)'),('m_bleistift','Bleistiftbart mit Spitzen'),('m_walross','Walross-Schnauzer dick')]
rows=[[(('B%d'%i),d,render('S',13,twin('z_r2',b,'monokel_r5'))) for i,(b,d) in enumerate(mu,1)]]
rows.append([('B1 mit kleinem Monokel','3 x 3 statt 5 x 5',render('S',13,twin('z_r2','m_zwirbel','monokel_r3'))),
             ('B3 mit kleinem Monokel','3 x 3 statt 5 x 5',render('S',13,twin('z_r2','m_haengend','monokel_r3'))),
             ('B2 mit Kuppel-Hut','Hut R3',render('S',13,twin('z_r4','m_gross','monokel_r5'))),
             ('B3 mit Kuppel-Hut','Hut R3',render('S',13,twin('z_r4','m_haengend','monokel_r5')))])
grid('Pik König Zwilling: Schnurrbart-Varianten (Hut R2, schwarzes Monokel rechts)',rows,'r29_pik_bart.png',per=5)
# Nahaufnahme Gesichter
S=12; box=(5,2,27,26); tw=(box[2]-box[0])*S; th=(box[3]-box[1])*S
im=Image.new('RGB',(5*(tw+pad)+pad,th+40),bg); d=ImageDraw.Draw(im)
for i,(b,dsc) in enumerate(mu):
    c=render('S',13,twin('z_r2',b,'monokel_r5')).crop(box).resize((tw,th),Image.NEAREST); im.paste(c,(pad+i*(tw+pad),pad)); d.text((pad+i*(tw+pad),pad+th+6),'B%d  %s'%(i+1,dsc),fill=C['ink'],font=FB)
im.save('r29_pik_nah.png'); print(im.size)
