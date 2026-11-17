from comp import *
DRED=hx('8e2b22'); GOLD2=hx('c8902a'); DIAM=hx('e4f2ff'); LRED=hx('e8a79b'); DGREEN=hx('3b6a2b')
PALE=dict(S=SKIN_PALE)
def pal(**k): return k
# ===== HERZ: die Guten. Hafez, Dichtung und Liebe (Rosen, Nachtigall, Herz) =====
HERZ=[
 ('H1  Hafez, der Dichter','Turban, langer grauer Bart, Kaftan mit Goldborte; Dame mit Schleier und Rose; Bube als Dichter mit Lorbeer und Feder',
  {13:dict(body='kaftan',hair='kurz',beard='lang',hat='turban',pal=pal(A=C['white'],a=SHADE,J=C['red'],B=GRAY_BEARD,H=GRAY_BEARD)),
   12:dict(body='kleid',hair='langoffen',hat='schleier',acc=['rose_w'],pal=pal(H=DBROWN,V=hx('f4eee4'),M=C['red'])),
   11:dict(body='wams',hair='pony',hat='lorbeer',acc=['feder'],pal=pal(H=DBROWN))}),
 ('H2  Rosengarten','Goldener Turban und dunkler Bart; Dame mit Rosenkranz im offenen Haar; Bube mit hoher Kolah-Mütze und Rose',
  {13:dict(body='kaftan',hair='kurz',beard='voll',hat='turban',acc=['rose_w'],pal=pal(A=C['gold'],a=GOLD2,J=C['red'],B=DBROWN)),
   12:dict(body='kleid',hair='langoffen',hat='rosenkranz',pal=pal(H=DBROWN,M=C['red'])),
   11:dict(body='wams',hair='pony',hat='kolah',acc=['rose_w'],pal=pal(A=DRED,a=C['gold'],H=DBROWN))}),
 ('H3  Herzenshof','Klassisch mit Krone, freundlicher Schnurrbart und Herz-Brosche; Dame mit Herz-Diadem; Bube mit Federkappe',
  {13:dict(body='koenig',hair='kurz',beard='kurz',hat='krone_k',acc=['herz'],pal=pal(B=DBROWN,J=C['red'])),
   12:dict(body='kleid',hair='hochsteck',hat='krone_d',acc=['herz','perlen'],pal=pal(H=DBROWN,J=C['white'],M=C['red'])),
   11:dict(body='wams',hair='pony',hat='federkappe',acc=['herz'],pal=pal(A=C['red'],a=hx('a02a20'),J=C['white'],H=DBROWN))}),
]
# ===== KARO: Reichtum und Pracht; goldenes Haar =====
KARO=[
 ('K1  Sonnenkönig (Barock)','Allonge-Perücke mit Krone, Hermelin; Dame mit Puderturm und Schönheitspunkt; Bube mit Dreispitz',
  {13:dict(body='koenig',hair='glatze',beard='schnurr',hat=['allonge','krone_k'],pal=pal(J=C['red'])),
   12:dict(body='kleid',hair='glatze',hat='turm',extra=['schoenheitspunkt','schminke'],acc=['perlen'],pal=pal(M=C['red'])),
   11:dict(body='wams',hair='schlicht',hat='dreispitz')}),
 ('K2  Prunk-Hof','Große Goldkrone mit Diamant, blonder Vollbart; Dame mit Diadem und Hochsteckfrisur; Bube mit Goldkappe',
  {13:dict(body='koenig',hair='kurz',beard='voll',hat='krone_k',pal=pal(J=DIAM)),
   12:dict(body='kleid',hair='hochsteck',hat='krone_d',acc=['perlen'],pal=pal(J=DIAM,M=C['red'])),
   11:dict(body='wams',hair='pony',hat='federkappe',pal=pal(A=C['gold'],a=GOLD2,J=DIAM))}),
 ('K3  Maharadscha und Händler','Goldturban mit Diamant, Schnurrbart; Dame mit Schleier und Goldketten; Bube mit rotem Fez',
  {13:dict(body='kaftan',hair='kurz',beard='schnurr',hat='turban',acc=['ketten'],pal=pal(A=C['gold'],a=GOLD2,J=DIAM)),
   12:dict(body='kleid',hair='langoffen',hat='schleier',acc=['ketten'],pal=pal(V=LRED,M=C['red'])),
   11:dict(body='wams',hair='pony',hat='fez',pal=pal(A=C['red'],a=hx('a02a20')))}),
]
# ===== KREUZ: Abenteuer, Ritter, Wald; braunes Haar, grüne Akzente =====
KREUZ=[
 ('C1  Ritter','Krone über Kettenhaube, Kreuz auf dem Wappenrock; Dame mit Wimpel und Diadem; Bube mit Helm und Federbusch',
  {13:dict(body='kette',hair='glatze',beard='voll',hat=['kettenhaube','krone_k'],acc=['kreuz'],pal=pal(H=BROWN,B=hx('8a847e'),J=C['red'])),
   12:dict(body='kleid',hair='glatze',hat=['schleier','krone_d'],acc=['kreuz'],pal=pal(V=hx('e4e0da'),J=C['red'],M=C['red'])),
   11:dict(body='kette',hair='glatze',hat='helm',pal=pal(H=BROWN))}),
 ('C2  Pascha','Roter Fez mit Quaste, Zwirbelbart, Schärpe; Dame mit rotem Schleier; Bube mit kleinem Turban',
  {13:dict(body='kaftan',hair='kurz',beard='zwirbel',hat='fez',pal=pal(A=C['red'],a=hx('a02a20'),H=BROWN,B=BROWN)),
   12:dict(body='kleid',hair='langoffen',hat='schleier',acc=['ketten'],pal=pal(V=LRED,H=BROWN,M=C['red'])),
   11:dict(body='wams',hair='pony',hat='turban',pal=pal(A=C['red'],a=hx('a02a20'),J=C['gold'],H=BROWN))}),
 ('C3  Waldkönig','Blätterkrone, langer Bart, Umhang mit grünem Futter; Dame mit Blütenkranz; Bube mit grüner Federkappe',
  {13:dict(body='umhang',hair='kurz',beard='lang',hat='blaetter',pal=pal(Z=GREEN,H=BROWN,B=DBROWN,A=GREEN)),
   12:dict(body='kleid',hair='langoffen',hat='rosenkranz',pal=pal(H=BROWN,M=C['red'],Z=hx('f0a0c0'))),
   11:dict(body='wams',hair='pony',hat='federkappe',pal=pal(A=GREEN,a=DGREEN,H=BROWN))}),
]
# ===== PIK: die Bösen; schwarzes Haar, blasse Haut =====
PIK=[
 ('P1  Dandy-Schurken','Zylinder und Monokel, Zwirbelbart; Dame mit Hörnerkrone und roten Lippen; Bube mit Augenklappe und Tuch',
  {13:dict(body='frack',hair='schlitz',beard='zwirbel',hat='zylinder',extra=['monokel'],pal=pal(H=BLACK,B=BLACK,**PALE)),
   12:dict(body='umhang',back='hochkragen_rot',hair='lang',hat='hoerner',pal=pal(H=BLACK,M=C['red'],**PALE)),
   11:dict(body='pirat',hair='pony',hat='bandana',extra=['augenklappe','narbe'],pal=pal(H=BLACK,A=C['red'],a=hx('a02a20'),**PALE))}),
 ('P2  Piraten','Dreispitz, Augenklappe, Narbe und Ohrring; Dame mit rotem Kopftuch; Bube mit Maske',
  {13:dict(body='pirat',hair='kurz',beard='voll',hat='dreispitz',extra=['augenklappe','narbe','ohrring'],pal=pal(H=BLACK,B=BLACK,**PALE)),
   12:dict(body='kleid',hair='langoffen',hat='bandana',extra=['ohrring','schminke'],acc=['ketten'],pal=pal(H=BLACK,A=C['red'],a=hx('a02a20'),M=C['red'],**PALE)),
   11:dict(body='pirat',hair='pony',hat='bandana',extra=['domino'],pal=pal(H=BLACK,A=C['ink'],a=C['ink'],**PALE))}),
 ('P3  Vampire und Düsternis','Schlitzhaar, Fangzähne, Hochkragen mit rotem Futter; Dame mit Witwenhut und Netz; Bube mit Kapuze',
  {13:dict(body='umhang',back='hochkragen_rot',hair='schlitz',extra=['fangs'],pal=pal(H=BLACK,M=C['red'],**PALE)),
   12:dict(body='kleid',hair='lang',hat='witwenhut',extra=['netz'],pal=pal(H=BLACK,M=C['red'],**PALE)),
   11:dict(body='wams',hair='glatze',hat='kapuze',extra=['narbe','fangs'],pal=pal(H=BLACK,**PALE))}),
]
FAMS=[('Herz','H',HERZ),('Karo','D',KARO),('Kreuz','C',KREUZ),('Pik','S',PIK)]
