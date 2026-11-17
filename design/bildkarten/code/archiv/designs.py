from comp import *
import parts as P, textwrap
from PIL import ImageDraw
from masters import KING_DYN,BUBE_DYN,DAME_DYN
bg=(0xf2,0xe6,0xd0); pad=10
from PIL import ImageFont
FONTB2=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',12)
DYN={13:KING_DYN,11:BUBE_DYN,12:DAME_DYN}
LRED=hx('e8a79b'); DIAM=hx('e4f2ff'); GOLD2=hx('c8902a'); DRED=hx('8e2b22'); RED2=hx('a02a20'); DGREEN=hx('3b6a2b'); LAPIS=hx('2f5aa8'); SAND=hx('d8c8a8')
BROWN=hx('5a3a24'); DBROWN=hx('4e2c16'); REDHAIR=hx('b8541f'); BLONDE=hx('d8b060'); GRAYBR=hx('9a8c80')
def spec(hat=(),beard='keiner',hair='glatze',extra=(),px=(),rank=13,**pal):
    d=dict(body='leer',hair=hair,beard=beard,hat=list(hat) if not isinstance(hat,str) else [hat],extra=list(extra),pal=pal,dyn=dict(DYN[rank]))
    d['px']=list(px); return d
def sheet(title,suit,rank,items,fname,S=5,per=4):
    cw=W*S+pad; lab_h=78; rh=H*S+lab_h
    rows=[items[i:i+per] for i in range(0,len(items),per)]
    im=Image.new('RGB',(per*cw+pad,len(rows)*rh+34),bg); d=ImageDraw.Draw(im)
    d.text((pad,6),title,fill=C['ink'],font=FONTB)
    for ri,row in enumerate(rows):
        for ci,(name,desc,sp) in enumerate(row):
            x=pad+ci*cw; y=30+ri*rh
            c=scaled(card(suit,rank,sp,'schlagschatten','cut1'),S); im.paste(c,(x,y),c)
            d.text((x,y+H*S+4),name,fill=C['ink'],font=FONTB2)
            d.multiline_text((x,y+H*S+22),'\n'.join(textwrap.wrap(desc,23)[:4]),fill=C['ink'],font=FONT)
    im.save(fname); print(fname,im.size)

# ============ HERZ BUBE (rank 11): junger persischer Dichter / Liebender ============
HB=[
 ('HB1 Derwisch','Mevlevi-Derwisch mit hoher Filzmütze (Sikke), Rumi lässt grüßen',spec('sikke',hair='glatze',extra=('brauen',),rank=11,A=hx('b08050'),a=hx('8a6035'))),
 ('HB2 Nachtigall','Locken und eine Nachtigall auf der linken Schulter (Rose und Nachtigall)',spec([],hair='locken',px=P.pxart(P.BIRD_NACHTIGALL,6,22),rank=11)),
 ('HB3 Rose + Kolah','hohe rote Mütze, Rose hinterm Ohr',spec('kolah',hair='pony_a',extra=('rose_ohr',),rank=11,A=DRED,a=C['gold'])),
 ('HB4 Schreiber','kleine Kappe (Takke), Feder hinterm Ohr, Kalligraph',spec(['takke','feder_ohr'],hair='kurz',rank=11,A=C['white'],a=C['gold'])),
 ('HB5 Majnun','wilde Haare, Rosenkranz: der vor Liebe Verrückte',spec('rosenkranz',hair='wild',rank=11)),
 ('HB6 Sänger','Locken, goldenes Stirnband mit Juwel, Ohrring',spec(['stirnband','ohrringe'],hair='locken',rank=11,J=C['red'])),
 ('HB7 Kleiner Turban','kleiner weißer Turban mit Juwel, Brauen',spec('turban_klein',hair='glatze',extra=('brauen',),rank=11,A=C['white'],a=SHADE,J=C['red'])),
 ('HB8 Lorbeer','Locken, Lorbeerkranz: Dichter-Schüler',spec('lorbeer',hair='locken',extra=('brauen','nase'),rank=11)),
]
sheet('Herz Bube: junger persischer Dichter','H',11,HB,'d_herz_bube.png')
# ============ HERZ DAME (rank 12): die Geliebte ============
M=dict(M=C['red'])
HD=[
 ('HD1 Layla','Mittelscheitel, Schleier, Stirnkette (Tikka) mit Rubin',spec(['schleier','tikka'],hair='mittelscheitel_lang',rank=12,V=hx('f4eee4'),J=C['red'],**M)),
 ('HD2 Mondgesicht','Mondsichel-Diadem und lange Zöpfe: der Geliebten Gesicht gleicht dem Mond',spec(['mond','ohrringe'],hair='zoepfe',rank=12,**M)),
 ('HD3 Rosengarten','offenes Haar mit Rosenkranz',spec('rosenkranz',hair='langoffen',rank=12,**M)),
 ('HD4 Shirin','kleine Prinzessinnenkrone, Zöpfe, Perlenkette',spec(['krone_d'],hair='zoepfe',rank=12,J=C['red'],**M)),
 ('HD5 Tänzerin','Haarknoten, Münzband, große Ohrringe',spec(['muenzen','ohrringe'],hair='bun',extra=('schminke',),rank=12,**M)),
 ('HD6 Herz-Tikka','Schleier mit rotem Herz auf der Stirn',spec(['schleier','tikka_herz'],hair='mittelscheitel_lang',rank=12,V=hx('f4eee4'),J=C['red'],**M)),
 ('HD7 Nachtigall-Fee','Hochsteckfrisur, kleine Nachtigall auf dem Kopf, Rose',spec([],hair='hochsteck',extra=('rose_ohr',),px=P.pxart(P.BIRD_KOPF,13,6),rank=12,**M)),
 ('HD8 Perlenschleier','Schleier mit Perlenband, offenes Haar',spec(['schleier','perlenband'],hair='langoffen',rank=12,V=hx('f4eee4'),**M)),
]
sheet('Herz Dame: die Geliebte (persisch, Mond, Rose, Nachtigall)','H',12,HD,'d_herz_dame.png')

# ============ KARO KÖNIG (rank 13): Orient, Schätze, Gold; blondes Haar ============
KK=[
 ('KK1 Pascha','weißer Turban mit Reiherfeder, riesiger Zwirbelbart',spec(['turban_rund','reiher'],'zwirbel_gross','kurz',('brauen',),rank=13,A=C['white'],a=SHADE,J=C['red'])),
 ('KK2 Pharao','Nemes-Kopftuch in Gold und Lapis, Uräus-Schlange, falscher Zopfbart',spec(['nemes','uraeus'],'pharao','glatze',(),rank=13,n=LAPIS,J=C['red'])),
 ('KK3 Scheich','Kufiya mit schwarzem Ring (Agal), Zwirbelbart',spec('turban_kufiya','zwirbel','glatze',('brauen',),rank=13,A=C['white'],a=SHADE)),
 ('KK4 Kalif','goldener Turban mit Diamant, langer Bart',spec('turban_zweistufig','lang','kurz',('brauen',),rank=13,A=C['gold'],a=GOLD2,J=DIAM)),
 ('KK5 Sultan','große Goldkrone mit Diamanten, Vollbart',spec('krone_k','voll','kurz',('brauen',),rank=13,J=DIAM)),
 ('KK6 Wesir','hoher Turban in Sand, dünner Schnurrbart',spec('turban_osman_hoch','schnurr','glatze',('brauen','nase'),rank=13,A=SAND,a=GOLD2,J=C['red'])),
 ('KK7 Pascha mit Fez','Vater von Bube: roter Fez, Zwirbelbart',spec('fez_A','zwirbel_gross','kurz',(),rank=13,A=C['red'],a=RED2)),
 ('KK8 Karawanenführer','Kufiya, Vollbart, Narbe',spec('turban_kufiya','voll','glatze',('narbe',),rank=13,A=C['white'],a=SHADE)),
]
sheet('Karo König: Orient, Schätze, Gold','D',13,KK,'d_karo_koenig.png')
# ============ KARO DAME (rank 12) ============
KD=[
 ('KD1 Sultanin','roter Schleier, Münzband, Ohrringe',spec(['schleier','muenzen','ohrringe'],hair='langoffen',rank=12,V=LRED,**M)),
 ('KD2 Kleopatra','goldener Bob, Goldband, Uräus, Kajal',spec(['goldband','uraeus','ohrringe'],hair='bob_r2',extra=('kajal',),rank=12,J=C['red'],**M)),
 ('KD3 Prinzessin','hoher Pferdeschwanz, Stirnband mit Juwel',spec(['stirnband','ohrringe'],hair='pferdeschwanz',rank=12,J=DIAM,**M)),
 ('KD4 Juwelenkönigin','großes Diamant-Diadem, Hochsteckfrisur, Perlen',spec(['diadem_gross','ohrringe'],hair='hochsteck',rank=12,J=DIAM,**M)),
 ('KD5 Wüstenrose','Kopftuch in Gold, offenes Haar',spec(['bandana','ohrringe'],hair='langoffen',rank=12,A=C['gold'],a=GOLD2,**M)),
 ('KD6 Perlenprinzessin','Zöpfe und Perlenband',spec(['perlenband','ohrringe'],hair='zoepfe',rank=12,**M)),
 ('KD7 Märchenfürstin','Schleier in Gold-Rosa mit Goldband',spec(['schleier','goldband'],hair='mittelscheitel_lang',rank=12,V=hx('f2d8a8'),**M)),
 ('KD8 Basarhändlerin','Turban klein, goldene Ketten',spec(['turban_klein','ohrringe'],hair='glatze',rank=12,A=C['gold'],a=GOLD2,J=C['red'],**M)),
]
sheet('Karo Dame: Orient, Gold, Juwelen','D',12,KD,'d_karo_dame.png')
# ============ KREUZ KÖNIG (rank 13): Abenteuer, Krieg, Wald; braunes Haar ============
KB=dict(H=BROWN,B=DBROWN)
CK=[
 ('CK1 Wikinger','Hörnerhelm, rotblonder Zopfbart mit Ringen',spec('wikingerhelm','wikinger','glatze',('brauen',),rank=13,H=REDHAIR,B=REDHAIR)),
 ('CK2 Waldkönig','Geweih und Blätterkrone, langer Bart',spec(['geweih','blaetter'],'lang','kurz',('brauen',),rank=13,Q=hx('4f8a3a'),A=hx('4f8a3a'),H=BROWN,B=DBROWN)),
 ('CK3 Pirat','Dreispitz, Augenklappe, Narbe, Papagei',spec(['dreispitz','ohrringe'],'voll','kurz',('augenklappe','narbe'),px=P.pxart(P.BIRD_PAPAGEI,6,21),rank=13,H=BLACK,B=BLACK)),
 ('CK4 Ritterkönig','Krone über Kettenhaube, grauer Bart',spec(['kettenhaube','krone_k'],'voll','glatze',('brauen',),rank=13,B=GRAYBR,J=C['red'])),
 ('CK5 Entdecker','Tropenhelm, Zwirbelbart',spec('tropenhelm','zwirbel','kurz',('brauen',),rank=13,**KB)),
 ('CK6 Shogun','Kabuto-Helm mit goldenem Geweih, dünner Bart',spec('kabuto','schnurr','glatze',('brauen',),rank=13,B=BLACK)),
 ('CK7 Abenteurer','Fedora, Stoppelbart, Narbe',spec('fedora','kurz','kurz',('narbe',),rank=13,A=hx('b08050'),a=hx('6b4a2b'),**KB)),
 ('CK8 Eisenfürst','Wikingerhelm ohne Horn-Look: Eisenhelm mit Nasenschutz, Vollbart',spec('wikinger_klein','voll','glatze',('brauen',),rank=13,**KB)),
]
sheet('Kreuz König: Abenteuer, Krieger, Wald','C',13,CK,'d_kreuz_koenig.png')
# ============ KREUZ BUBE (rank 11) ============
CB=[
 ('CB1 Wikingerjunge','kleiner Eisenhelm, Zopf, Sommersprossen',spec(['wikinger_klein','sommersprossen'],hair='zopf_seite',rank=11,H=REDHAIR)),
 ('CB2 Waldjunge','grüne Federkappe',spec('federkappe',hair='kurz',rank=11,A=hx('4f8a3a'),a=DGREEN,H=BROWN)),
 ('CB3 Schiffsjunge','Tellermütze, Sommersprossen',spec(['seemannsmuetze','sommersprossen'],hair='pony_a',rank=11,H=BROWN)),
 ('CB4 Knappe','Kettenhaube, Sommersprossen',spec(['kettenhaube','sommersprossen'],hair='glatze',rank=11)),
 ('CB5 Entdeckerjunge','Fedora, Sommersprossen',spec(['fedora','sommersprossen'],hair='pony_a',rank=11,A=hx('b08050'),a=hx('6b4a2b'),H=BROWN)),
 ('CB6 Schattenkrieger','Ninja-Kopftuch mit Augenschlitz',spec('ninja',hair='glatze',rank=11)),
 ('CB7 Hofnarr','Narrenkappe mit Glöckchen',spec('narrenkappe',hair='glatze',rank=11,A=C['red'],a=C['gold'])),
 ('CB8 Wolfsjunge','Pelzmütze aus Kapuze, Narbe',spec('kapuze',hair='glatze',extra=('narbe',),rank=11)),
]
sheet('Kreuz Bube: Abenteuer, Jungen, Schalk','C',11,CB,'d_kreuz_bube.png')
# ============ KREUZ DAME (rank 12) ============
CD=[
 ('CD1 Schildmaid','Flügelhelm, Zöpfe, Streifen unter den Augen',spec(['helm_fluegel'],hair='zoepfe',extra=('schminke_streifen',),rank=12,H=BLONDE,Z=C['red'],**M)),
 ('CD2 Waldhexe','Blätterkrone, wildes offenes Haar, Sommersprossen',spec(['blaetter','sommersprossen','ohrringe'],hair='langoffen',rank=12,Q=hx('4f8a3a'),H=BROWN,**M)),
 ('CD3 Piratenkönigin','rotes Kopftuch, Ohrringe, Kajal',spec(['bandana','ohrringe'],hair='langoffen',extra=('kajal',),rank=12,H=BLACK,A=C['red'],a=RED2,**M)),
 ('CD4 Ritterin','Kettenhaube mit Diadem',spec(['kettenhaube','krone_d'],hair='glatze',rank=12,J=C['red'],**M)),
 ('CD5 Forscherin','Fedora, Zöpfe, Sommersprossen',spec(['fedora','sommersprossen'],hair='zoepfe',rank=12,A=hx('b08050'),a=hx('6b4a2b'),H=BROWN,**M)),
 ('CD6 Walküre','Flügelhelm, langes helles Haar',spec(['helm_fluegel'],hair='langoffen',rank=12,H=BLONDE,**M)),
 ('CD7 Wikingerbraut','Zopfkranz, Ohrringe, Kriegsbemalung',spec(['ohrringe'],hair='zoepfe',extra=('schminke_streifen',),rank=12,H=REDHAIR,Z=C['red'],**M)),
 ('CD8 Wolfsmädchen','Pelzkapuze, Zöpfe, Sommersprossen',spec(['kapuze','sommersprossen'],hair='glatze',rank=12,**M)),
]
sheet('Kreuz Dame: Abenteuer, Krieg, Wald','C',12,CD,'d_kreuz_dame.png')

# ============ HERZ Alternativthema: Minne und Troubadour (mittelalterliche Romantik) ============
HM=[
 ('HB9 Troubadour','Federbarett, Locken, Schnurrflaum: Minnesänger',spec('federkappe',beard='schnurr',hair='locken',rank=11,A=C['red'],a=RED2)),
 ('HB10 Page mit Herz','Pagenkopf, Barett, Herz-Brosche',spec('federkappe',hair='pagen',rank=11,A=C['red'],a=RED2,extra=())),
 ('HB11 Herzensnarr','Narrenkappe mit goldenen Glöckchen',spec('narrenkappe',hair='glatze',rank=11,A=C['red'],a=C['gold'])),
 ('HB12 Ritter der Minne','Kettenhaube, Rose am Kopf',spec(['kettenhaube'],hair='glatze',extra=('rose_ohr',),rank=11)),
 ('HD9 Burgfräulein','Hennin: hoher Kegelhut mit Schleier',spec('hennin',hair='mittelscheitel_lang',rank=12,A=C['red'],V=hx('f4eee4'),**M)),
 ('HD10 Gretchen','Gretchenfrisur mit Schnecken über den Ohren',spec(['perlenband'],hair='schnecken',rank=12,**M)),
 ('HD11 Herzkönigin','Krone mit Rubinen, Zöpfe',spec(['krone_k'],hair='zoepfe',rank=12,J=C['red'],**M)),
 ('HD12 Minnefee','Rosenkranz, Schleier, offenes Haar',spec(['schleier','rosenkranz'],hair='langoffen',rank=12,V=hx('f4eee4'),**M)),
]
def sheet_mixed(title,items,fname,S=5,per=4):
    cw=W*S+pad; lab_h=78; rh=H*S+lab_h
    rows=[items[i:i+per] for i in range(0,len(items),per)]
    im=Image.new('RGB',(per*cw+pad,len(rows)*rh+34),bg); d=ImageDraw.Draw(im)
    d.text((pad,6),title,fill=C['ink'],font=FONTB)
    for ri,row in enumerate(rows):
        for ci,(name,desc,sp) in enumerate(row):
            rank=13 if name.startswith('HK') else (11 if sp['dyn']['gold']=='g1' else 12)
            x=pad+ci*cw; y=30+ri*rh
            c=scaled(card('H',rank,sp,'schlagschatten','cut1'),S); im.paste(c,(x,y),c)
            d.text((x,y+H*S+4),name,fill=C['ink'],font=FONTB2)
            d.multiline_text((x,y+H*S+22),'\n'.join(textwrap.wrap(desc,23)[:4]),fill=C['ink'],font=FONT)
    im.save(fname); print(fname,im.size)
sheet_mixed('Herz, Alternativthema: Minne und Troubadour',HM,'d_herz_minne.png')
