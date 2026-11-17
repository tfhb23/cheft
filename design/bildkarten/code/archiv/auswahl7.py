import sys; sys.path.insert(0,'.')
exec(open('auswahl2.py').read().split('# ---------- Herz ----------')[0])
WV=dict(V=WHITE)
OLD=['..www.','.wwKwG','wwOOw.','wwOOw.','.G.G..']
# ---------------- Herz Bube ----------------
HB_A=m2(11,['turbm_a','mond_klein'],'keiner','kurz',('brauen',),A=WHITE,a=SHADE)                          # Kompromiss A ohne Feder
HB5F=m2(11,['turban_klein','feder_ohr'],'keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED)              # Kalifensohn mit Feder am Turban
# ---------------- Herz Dame ----------------
HD_neu=m2(12,['fall_rc','mond_rc','sterne_schleier'],'keiner','rund_scheitel',('mund_schmal',),J=RED,**HH)  # neuer Charakter: Rc + Mond + Sterne, schmaler Mund
HD_neu_normal=m2(12,['fall_rc','mond_rc','sterne_schleier'],'keiner','rund_scheitel',J=RED,**HH)
HDc=m2(12,['schleier','sterne_schleier'],'keiner','mittelscheitel_lang',**WV,**HH)
HDa=m2(12,['schleier','mond'],'keiner','mittelscheitel_lang',**WV,**HH)
HDl=m2(12,['schleier_r','tikka'],'keiner','rund_scheitel',J=RED,**WV,**HH)
HDk6=m2(12,['kamm5_8_rot_u','ohrringe'],'keiner','hochsteck',**HH)
herz=[[('Referenz','Herz König (Master)',ref('herz_koenig')),
       ('HB-A Kompromiss','Turbanform HB5, Gold, Mond, ohne Feder',render('H',11,HB_A)),
       ('HB5 + Feder','Kalifensohn, Feder am Turban',render('H',11,HB5F))],
      [('Neu: Mond + Sterne','Schleier Rc, beide Goldelemente, schmaler Mund',render('H',12,HD_neu)),
       ('HD-g Goldkamm','Kamm K6, Spalte 8',render('H',12,HDk6)),
       ('HD-c Sternenschleier','Vorlage, weißer Schleier',render('H',12,HDc)),
       ('HD-a Mond + Schleier','Vorlage, weißer Schleier',render('H',12,HDa)),
       ('HD2 Layla','Vorlage, runder Kopf',render('H',12,HDl))]]
grid('Engere Auswahl: Herz',herz,'r28_auswahl_herz.png',per=5)
# ---------------- Kreuz ----------------
def bube_f(x,y):
    sp=m2(11,'federkappe','keiner','kurz',px=px(OLD,x,y),A=INK,F=GOLD,**KB); sp['px_after']=True; return sp
CBc=m2(11,['federkappe','krause'],'keiner','pagen',A=INK,F=GOLD,**KB)
CBd=bube_f(22,19)
CBj=m2(11,['krone_klein','hermelin'],'keiner','pony_a',**KB)
CD3=dict(m2(12,'diadem_gross','keiner','hochsteck',J=RED,**KD),acc=['perlen'])
CDf=m2(12,'ohrringe','keiner','zopfkrone',**KD)
kreuz=[[('Referenz','Kreuz König (Master)',ref('kreuz_koenig')),
        ('CB-c Page','Federbarett mit Spitzenkragen',render('C',11,CBc)),
        ('CB-d Falkner','Falke F9',render('C',11,CBd)),
        ('CB-j Hermelinprinz','kleine Krone, Hermelinkragen',render('C',11,CBj))],
       [('','',None),
        ('CD3 Hofdame','Hochsteckfrisur, Diadem, Perlenkette',render('C',12,CD3)),
        ('CD-f Zopfkrone','Zöpfe als Krone um den Kopf',render('C',12,CDf))]]
grid('Engere Auswahl: Kreuz (CB-l gestrichen)',kreuz,'r28_auswahl_kreuz.png',per=4)
# Mund-Vergleich der neuen Dame
S=12; box=(6,3,28,26); tw=(box[2]-box[0])*S; th=(box[3]-box[1])*S
im=Image.new('RGB',(2*tw+3*pad,th+50),bg); d=ImageDraw.Draw(im)
for i,(n,sp) in enumerate([('Mund wie bisher',HD_neu_normal),('Mund schmaler',HD_neu)]):
    c=render('H',12,sp).crop(box).resize((tw,th),Image.NEAREST); im.paste(c,(pad+i*(tw+pad),pad)); d.text((pad+i*(tw+pad),pad+th+6),n,fill=C['ink'],font=FB)
im.save('r28_neue_dame.png'); print(im.size)
# ---------------- Übersicht Decks ----------------
def blank(suit,rank):
    c=base(); idx=index_layer(suit,rank); c.over(idx); c.over(idx.rot()); return c.im
def dim(im,a=0.45):
    r=im.copy(); al=r.split()[3].point(lambda v:int(v*a)); r.putalpha(al); return r
ROWS=[('H','Herz','Bube',11,[('Kompromiss A',render('H',11,HB_A)),('HB5 + Feder',render('H',11,HB5F))]),
      ('H','Herz','Dame',12,[('Mond+Sterne',render('H',12,HD_neu)),('Kamm',render('H',12,HDk6)),('HD-c',render('H',12,HDc)),('HD-a',render('H',12,HDa)),('HD2 Layla',render('H',12,HDl))]),
      ('H','Herz','König',13,[('Master',ref('herz_koenig'))]),
      ('D','Karo','Bube',11,[('Master',ref('karo_bube'))]),
      ('D','Karo','Dame',12,[('Master',ref('karo_dame'))]),
      ('D','Karo','König',13,[('Master',ref('karo_koenig'))]),
      ('C','Kreuz','Bube',11,[('CB-c',render('C',11,CBc)),('CB-d',render('C',11,CBd)),('CB-j',render('C',11,CBj))]),
      ('C','Kreuz','Dame',12,[('CD3',render('C',12,CD3)),('CD-f',render('C',12,CDf))]),
      ('C','Kreuz','König',13,[('Master',ref('kreuz_koenig'))]),
      ('S','Pik','Bube',11,[('Master',ref('pik_bube'))]),
      ('S','Pik','Dame',12,[('Master',ref('pik_dame'))]),
      ('S','Pik','König',13,[('Master',ref('pik_koenig'))])]
S=3; cw=W*S+8; rh=H*S+34; lw=120; maxc=5; sw=190
im=Image.new('RGB',(lw+maxc*cw+sw+pad,len(ROWS)*rh+60),bg); d=ImageDraw.Draw(im)
d.text((pad,6),'Zwei Decks: pro Karte Soll 2 Personen',fill=C['ink'],font=FONTB)
d.text((pad,28),'durchgezogen = in der Auswahl oder Master, blass = fehlt noch',fill=C['ink'],font=FONT)
totals=dict(ok=0,viel=0,fehlt=0)
for ri,(suit,sn,rn,rank,cands) in enumerate(ROWS):
    y=56+ri*rh
    d.text((pad,y+H*S//2-8),sn+' '+rn,fill=C['ink'],font=FB)
    n=len(cands)
    for ci,(lab,img) in enumerate(cands):
        b=img.resize((W*S,H*S),Image.NEAREST); x=lw+ci*cw; im.paste(b,(x,y),b); d.text((x,y+H*S+2),lab,fill=C['ink'],font=FONT)
    for k in range(max(0,2-n)):
        ci=n+k; b=dim(blank(suit,rank)).resize((W*S,H*S),Image.NEAREST); x=lw+ci*cw; im.paste(b,(x,y),b); d.text((x,y+H*S+2),'fehlt',fill=(0xb0,0x30,0x30),font=FONT)
    if n<2: txt='%d fehlt'%(2-n); col=(0xb0,0x30,0x30); totals['fehlt']+=2-n
    elif n==2: txt='ok: 2 von 2'; col=(0x2f,0x7a,0x3a); totals['ok']+=1
    else: txt='%d zu viel'%(n-2); col=(0xc0,0x70,0x10); totals['viel']+=n-2
    d.text((lw+maxc*cw+8,y+H*S//2-8),txt,fill=col,font=FB)
im.save('r28_decks_uebersicht.png'); print(im.size,totals)
