import sys; sys.path.insert(0,'.')
exec(open('auswahl2.py').read().split('# ---------- Herz ----------')[0])
OLD=['..www.','.wwKwG','wwOOw.','wwOOw.','.G.G..']
BLACK=hx('1b1b1b'); SKIN_PALE=hx('f8e3d2')
PK=dict(S=SKIN_PALE,B=BLACK,H=BLACK)
def twin(hat,beard,extra=()): return m2(13,[hat],beard,'glatze',tuple(extra),**PK)
# ---- Hüte (Gesicht: Brauen 2 px außen + klassischer Schnauzer 6 breit)
HATS=[('S2 Basis','Zylinder, 2 Zeilen niedriger','z_s2'),('W1 breit','Krone 10, Krempe 14','z_w1'),('W2 breit','Krone 10, Krempe 12','z_w2'),('W3 Krempe breit','Krone 8, Krempe 14','z_w3'),
      ('Melone M1','Bowler, rund, Krempe 12','bowler1'),('Melone M2','Bowler, oben 6 breit','bowler2'),('Melone M3','Krempe 14, Enden hochgebogen','bowler3'),('Melone M4','sehr rund, 6 Zeilen','bowler4')]
rows=[[('Referenz','Pik König (Master)',ref('pik_koenig'))]+[(n,d,render('S',13,twin(h,'ms_6',('brauen_2a',)))) for n,d,h in HATS]]
grid('Pik König Zwilling: Hut S2, breiter und als Melone (Brauen 2 px, klassischer Schnauzer)',rows,'r31_pik_huete.png',per=9,S=5)
# ---- Gesichter auf zwei Hüten
FACES=[('F1','Schnauzer 6 breit, Brauen außen','ms_6',('brauen_2a',)),('F2','Schnauzer 2 Zeilen dick','ms_6d',('brauen_2a',)),('F3','Schnauzer + Kinnbart (Evil Abed)','ms_goat',('brauen_2a',)),('F4','Brauen innen, Schnauzer dünn','ms_6',('brauen_2i',)),('F5','Schnauzer mit Enden nach unten','ms_6h',('brauen_2a',)),('F6','Brauen 1 Zeile höher, Abstand zu den Augen','ms_6',('brauen_2a_hoch',))]
rows=[[('%s · %s'%(hn,n),d,render('S',13,twin(h,b,ex))) for n,d,b,ex in FACES] for hn,h in (('Hut W1','z_w1'),('Melone M2','bowler2'))]
grid('Pik König Zwilling: Gesichter auf breitem Zylinder (oben) und Melone (unten)',rows,'r31_pik_gesicht.png',per=6,S=5)
S=10; box=(5,2,27,26); tw=(box[2]-box[0])*S; th=(box[3]-box[1])*S
im=Image.new('RGB',(6*(tw+pad)+pad,2*(th+36)+10),bg); d=ImageDraw.Draw(im)
for r_i,(hn,h) in enumerate((('W1','z_w1'),('M2','bowler2'))):
    for i,(n,dsc,b,ex) in enumerate(FACES):
        c=render('S',13,twin(h,b,ex)).crop(box).resize((tw,th),Image.NEAREST); x=pad+i*(tw+pad); y=10+r_i*(th+36); im.paste(c,(x,y)); d.text((x,y+th+6),hn+' '+n,fill=C['ink'],font=FB)
im.save('r31_pik_nah.png'); print(im.size)
# ---- Herz: steilere Feder
def hb5(f): return m2(11,['turban_klein',f],'keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED)
cols=[('aktuell','feder_hoch3','feder_hoch3_l1'),('steil 1','feder_s3','feder_s3_l'),('steiler 2','feder_s4','feder_s4_l'),('fast senkrecht','feder_s6','feder_s6_l')]
rows=[[('%s'%n,'Position wie +3',render('H',11,hb5(a))) for n,a,b in cols],[('%s, links'%n,'1 Pixel nach links',render('H',11,hb5(b))) for n,a,b in cols]]
grid('HB5: Feder steiler nach oben',rows,'r31_feder_steil.png',per=4,S=6)
# ---- Kreuz final
def bube_f(x,y):
    sp=m2(11,'federkappe','keiner','kurz',px=px(OLD,x,y),A=INK,F=GOLD,**KB); sp['px_after']=True; return sp
CBd=bube_f(22,20)
CBj=m2(11,['krone_klein','hermelin'],'keiner','pony_cj2',**KB)
CD3=dict(m2(12,'diadem_gross','keiner','hochsteck',('mund_schmal',),J=RED,**KD),acc=['perlen'])
CDf=m2(12,'ohrringe','keiner','zopfkrone',('mund_schmal',),**KD)
kreuz=[[('Referenz','Kreuz König (Master)',ref('kreuz_koenig')),
        ('CB-d Falkner','Falke 1 Pixel tiefer, FERTIG',render('C',11,CBd)),
        ('CB-j Hermelinprinz','FERTIG',render('C',11,CBj))],
       [('','',None),
        ('CD3 Hofdame','FERTIG',render('C',12,CD3)),
        ('CD-f Zopfkrone','FERTIG',render('C',12,CDf))]]
grid('Kreuz: alle freigegeben',kreuz,'r31_kreuz_final.png',per=3)
