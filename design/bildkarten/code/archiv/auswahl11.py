import sys,shutil; sys.path.insert(0,'.')
exec(open('auswahl2.py').read().split('# ---------- Herz ----------')[0])
OLD=['..www.','.wwKwG','wwOOw.','wwOOw.','.G.G..']
BLACK=hx('1b1b1b'); SKIN_NEU=hx('f6dfca'); SKIN_ALT=hx('f8e3d2')
def pk(skin,extra,hat='z_w1',beard='ms_6'): return m2(13,[hat],beard,'glatze',tuple(extra),S=skin,B=BLACK,H=BLACK)
# neue Master-Bilder sichern
names=['pik_koenig','pik_bube','pik_dame','herz_koenig','karo_koenig','karo_dame','karo_bube','kreuz_koenig']
for n in names:
    c=ref(n); c.save('masters_v2/%s_1x.png'%n); c.resize((W*10,H*10),Image.NEAREST).save('masters_v2/%s_10x.png'%n)
for f in ['lib.py','parts.py','comp.py','bust.py','masters.py','masters_v2.py']: shutil.copy(f,'masters_v2/code/'+f)
# ---- Zwilling Pik König
V=[('Z1 Brauen unten','3 px, direkt über den Augen',pk(SKIN_NEU,('brauen_3',))),
   ('Z2 Brauen höher','3 px, eine Zeile höher',pk(SKIN_NEU,('brauen_3_hoch',))),
   ('Z3 mit Kinnbart','Brauen höher + kleiner Kinnbart',pk(SKIN_NEU,('brauen_3_hoch',),beard='ms_goat'))]
rows=[[('Referenz','Pik König (Master)',ref('pik_koenig'))]+[(n,d,render('S',13,sp)) for n,d,sp in V]]
grid('Pik König Zwilling: Hut W1 breit, Schnauzer 6 breit, Brauen 3 breit, ohne Gesichtsschatten',rows,'r32_pik_zwilling.png',per=4,S=6)
S=12; box=(5,2,27,26); tw=(box[2]-box[0])*S; th=(box[3]-box[1])*S
im=Image.new('RGB',(3*(tw+pad)+pad,th+40),bg); d=ImageDraw.Draw(im)
for i,(n,dsc,sp) in enumerate(V):
    c=render('S',13,sp).crop(box).resize((tw,th),Image.NEAREST); im.paste(c,(pad+i*(tw+pad),pad)); d.text((pad+i*(tw+pad),pad+th+6),n,fill=C['ink'],font=FB)
im.save('r32_pik_nah.png'); print(im.size)
# ---- Hautfarbe vorher/nachher (alle Pik)
def with_skin(name,skin):
    su,rk,em,sp=spec_v2(name); sp['pal']['S']=skin; return card(su,rk,sp,em,'symm')
S=5; cw=W*S+pad
im=Image.new('RGB',(4*cw+pad,2*(H*S+40)+40),bg); d=ImageDraw.Draw(im)
d.text((pad,6),'Pik-Hautfarbe: oben vorher (mit Schatten im Gesicht), unten nachher',fill=C['ink'],font=FONTB)
items=[('pik_koenig','König'),('pik_bube','Bube'),('pik_dame','Dame')]
for i,(n,l) in enumerate(items):
    for r,skin in enumerate((SKIN_ALT,SKIN_NEU)):
        c=with_skin(n,skin).resize((W*S,H*S),Image.NEAREST); im.paste(c,(pad+i*cw,30+r*(H*S+40)),c)
    d.text((pad+i*cw,30+H*S+4),'Pik '+l,fill=C['ink'],font=FB)
for r,skin in enumerate((SKIN_ALT,SKIN_NEU)):
    c=card('S',13,pk(skin,('brauen_3',)),'schlagschatten','symm').resize((W*S,H*S),Image.NEAREST); im.paste(c,(pad+3*cw,30+r*(H*S+40)),c)
d.text((pad+3*cw,30+H*S+4),'Zwilling König',fill=C['ink'],font=FB)
im.save('r32_pik_haut.png'); print(im.size)
# ---- Zwischenübersicht
def blank(suit,rank):
    c=base(); idx=index_layer(suit,rank); c.over(idx); c.over(idx.rot()); return c.im
def dim(img,a=0.45):
    r=img.copy(); al=r.split()[3].point(lambda v:int(v*a)); r.putalpha(al); return r
HB_A=m2(11,['turbm_a','mond_klein'],'keiner','kurz_b',('brauen',),A=WHITE,a=SHADE)
HB5F=m2(11,['turban_klein','feder_s4'],'keiner','glatze',('brauen',),A=WHITE,a=SHADE,J=RED)
HD_neu=m2(12,['fall_rc','mond_rc','sterne_schleier'],'keiner','rund_scheitel',('mund_schmal',),J=RED,**HH)
HD_kamm=m2(12,['kamm5_8_rot_u','ohrringe'],'keiner','hochsteck',('mund_schmal',),**HH)
def bube_f(x,y):
    sp=m2(11,'federkappe','keiner','kurz',px=px(OLD,x,y),A=INK,F=GOLD,**KB); sp['px_after']=True; return sp
CBd=bube_f(22,20); CBj=m2(11,['krone_klein','hermelin'],'keiner','pony_cj2',**KB)
CD3=dict(m2(12,'diadem_gross','keiner','hochsteck',('mund_schmal',),J=RED,**KD),acc=['perlen']); CDf=m2(12,'ohrringe','keiner','zopfkrone',('mund_schmal',),**KD)
TW=pk(SKIN_NEU,('brauen_3_hoch',))
GRID={('H',11):[render('H',11,HB_A),render('H',11,HB5F)],('H',12):[render('H',12,HD_neu),render('H',12,HD_kamm)],('H',13):[ref('herz_koenig')],
      ('D',11):[ref('karo_bube')],('D',12):[ref('karo_dame')],('D',13):[ref('karo_koenig')],
      ('C',11):[render('C',11,CBd),render('C',11,CBj)],('C',12):[render('C',12,CD3),render('C',12,CDf)],('C',13):[ref('kreuz_koenig')],
      ('S',11):[ref('pik_bube')],('S',12):[ref('pik_dame')],('S',13):[ref('pik_koenig'),render('S',13,TW)]}
S=4; cw=W*S+6; gw=2*cw+14; lw=70
im=Image.new('RGB',(lw+3*gw+pad,4*(H*S+34)+84),bg); d=ImageDraw.Draw(im)
d.text((pad,6),'Zwischenübersicht: je Karte zwei Personen (blass = fehlt noch)',fill=C['ink'],font=FONTB)
fehlt=0; ok=0
for ci,rn in enumerate(('Bube','Dame','König')): d.text((lw+ci*gw,34),rn,fill=C['ink'],font=FB)
for ri,(s,sn) in enumerate((('H','Herz'),('D','Karo'),('C','Kreuz'),('S','Pik'))):
    y=58+ri*(H*S+34); d.text((pad,y+H*S//2-8),sn,fill=C['ink'],font=FB)
    for ci,rk in enumerate((11,12,13)):
        c=GRID[(s,rk)]
        for k in range(2):
            x=lw+ci*gw+k*cw
            if k<len(c): b=c[k].resize((W*S,H*S),Image.NEAREST); im.paste(b,(x,y),b)
            else:
                b=dim(blank(s,rk)).resize((W*S,H*S),Image.NEAREST); im.paste(b,(x,y),b); d.text((x,y+H*S+2),'fehlt',fill=(0xb0,0x30,0x30),font=FONT); fehlt+=1
        if len(c)==2: ok+=1
im.save('r32_zwischenuebersicht.png'); print(im.size,'vollständige Paare:',ok,'fehlende Personen:',fehlt)
