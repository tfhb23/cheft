import sys; sys.path.insert(0,'.')
exec(open('auswahl2.py').read().split('# ---------- Herz ----------')[0])
OLD=['..www.','.wwKwG','wwOOw.','wwOOw.','.G.G..']
BLACK=hx('1b1b1b'); SKIN_PALE=hx('f8e3d2')
PK=dict(S=SKIN_PALE,B=BLACK,H=BLACK)
def twin(hat,beard,extra=()): return m2(13,[hat],beard,'glatze',tuple(extra),**PK)
# ---- Pik König Zwilling: Hutgrößen
sizes=[('R1 Größe','bisher, Referenz','z_r1'),('S1','1 Zeile niedriger','z_s1'),('S2','2 Zeilen niedriger','z_s2'),('N1','Krone 6 breit, gleiche Höhe','z_n1'),('N2','schmaler + 1 Zeile niedriger','z_n2'),('N3','schmaler + 2 Zeilen niedriger','z_n3')]
rows=[[('Referenz','Pik König (Master)',ref('pik_koenig'))]+[(n,d,render('S',13,twin(h,'m_gross'))) for n,d,h in sizes]]
grid('Pik König Zwilling: Hut R1 etwas kleiner, Zwirbelbart groß, kein Monokel, keine Haare',rows,'r30_pik_hutgroesse.png',per=7,S=5)
# ---- Varianten auf der Basis (Hut S1)
V=[('V1 Basis','Hut S1, Zwirbelbart groß',twin('z_s1','m_gross')),
   ('V2 lange Spitzen','Spitzen 2 Zeilen hoch',twin('z_s1','m_lang')),
   ('V3 dicker','Bart zweizeilig, Enden hängen',twin('z_s1','m_dick')),
   ('V4 mit Spitzbart','Zwirbelbart + schwarzer Kinnbart',twin('z_s1','m_gross_ziege')),
   ('V5 böse Brauen','schräge schwarze Brauen',twin('z_s1','m_gross',('brauen_boese',))),
   ('V6 Hutband Gold','goldenes Band statt rot',twin('z_s1_gold','m_gross')),
   ('V7 schmaler Hut','Hut N2',twin('z_n2','m_gross')),
   ('V8 böse + lang','lange Spitzen + schräge Brauen',twin('z_s1','m_lang',('brauen_boese',)))]
grid('Pik König Zwilling: Varianten auf der Basis',[[(n,d,render('S',13,sp)) for n,d,sp in V[:4]],[(n,d,render('S',13,sp)) for n,d,sp in V[4:]]],'r30_pik_varianten.png',per=4,S=6)
S=10; box=(5,2,27,26); tw=(box[2]-box[0])*S; th=(box[3]-box[1])*S
im=Image.new('RGB',(4*(tw+pad)+pad,2*(th+40)+10),bg); d=ImageDraw.Draw(im)
for i,(n,dsc,sp) in enumerate(V):
    c=render('S',13,sp).crop(box).resize((tw,th),Image.NEAREST); x=pad+(i%4)*(tw+pad); y=10+(i//4)*(th+40); im.paste(c,(x,y)); d.text((x,y+th+6),n,fill=C['ink'],font=FB)
im.save('r30_pik_nah.png'); print(im.size)
# ---- Herz Auswahl
HB_A=m2(11,['turbm_a','mond_klein'],'keiner','kurz_b',('brauen',),A=WHITE,a=SHADE)
def hb5(f): return m2(11,['turban_klein',f],'keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED)
HD_neu=m2(12,['fall_rc','mond_rc','sterne_schleier'],'keiner','rund_scheitel',('mund_schmal',),J=RED,**HH)
HD_kamm=m2(12,['kamm5_8_rot_u','ohrringe'],'keiner','hochsteck',('mund_schmal',),**HH)
herz=[[('Referenz','Herz König (Master)',ref('herz_koenig')),
       ('HB-A Kompromiss','ohne Feder',render('H',11,HB_A)),
       ('HB5 Feder +3','Feder 3 Pixel höher',render('H',11,hb5('feder_hoch3'))),
       ('HB5 Feder +3, links','zusätzlich 1 Pixel nach links',render('H',11,hb5('feder_hoch3_l1')))],
      [('Neu: Mond + Sterne','Schleier Rc, schmaler Mund',render('H',12,HD_neu)),
       ('HD-g Goldkamm','Kamm K6, Spalte 8, schmale Lippen',render('H',12,HD_kamm))]]
grid('Engere Auswahl: Herz',herz,'r30_auswahl_herz.png',per=4)
# ---- Kreuz Auswahl
def bube_f(x,y):
    sp=m2(11,'federkappe','keiner','kurz',px=px(OLD,x,y),A=INK,F=GOLD,**KB); sp['px_after']=True; return sp
CBd=bube_f(22,19)
CBj_alt=m2(11,['krone_klein','hermelin'],'keiner','pony_cj',**KB)
CBj=m2(11,['krone_klein','hermelin'],'keiner','pony_cj2',**KB)
CD3=dict(m2(12,'diadem_gross','keiner','hochsteck',('mund_schmal',),J=RED,**KD),acc=['perlen'])
CDf=m2(12,'ohrringe','keiner','zopfkrone',('mund_schmal',),**KD)
CD3_alt=dict(m2(12,'diadem_gross','keiner','hochsteck',J=RED,**KD),acc=['perlen'])
kreuz=[[('Referenz','Kreuz König (Master)',ref('kreuz_koenig')),
        ('CB-d Falkner','Falke F9',render('C',11,CBd)),
        ('CB-j Hermelinprinz','Seitenhaar 1 Pixel länger',render('C',11,CBj)),
        ('CB-j vorher','Haar eine Zeile kürzer',render('C',11,CBj_alt))],
       [('CD3 Hofdame','schmale Lippen',render('C',12,CD3)),
        ('CD-f Zopfkrone','schmale Lippen',render('C',12,CDf)),
        ('CD3 vorher','Lippen 4 breit',render('C',12,CD3_alt))]]
grid('Engere Auswahl: Kreuz',kreuz,'r30_auswahl_kreuz.png',per=4)
