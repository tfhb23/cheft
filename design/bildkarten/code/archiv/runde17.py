from comp import *
import parts as P, textwrap
from PIL import ImageDraw, ImageFont
from masters import KING_DYN
bg=(0xf2,0xe6,0xd0); pad=10
FONTB2=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',12)
BROWN=hx('5a3a24'); DBROWN=hx('4e2c16'); REDHAIR=hx('b8541f'); GRAYBR=hx('9a8c80'); RED2=hx('a02a20'); GREEN=hx('4f8a3a')
def v2dyn():
    d=dict(KING_DYN); d.update(xmin=8,notch_left=True,lift=1); return d
def spec(hat,beard='keiner',hair='glatze',extra=(),**pal):
    return dict(body='leer',hair=hair,beard=beard,hat=list(hat) if not isinstance(hat,str) else [hat],extra=list(extra),pal=pal,dyn=v2dyn(),lift=1)
KB=dict(H=BROWN,B=DBROWN)
CK=[
 ('CK-a Reichskrone','Bügelkrone mit Kreuz oben, brauner Vollbart',spec('krone_kreuz','voll','kurz',('brauen',),J=C['red'],**KB)),
 ('CK-b Ritterkönig','Kreuzkrone über Kettenhaube, grauer Bart',spec(['kettenhaube','krone_kreuz'],'voll','glatze',('brauen',),J=C['red'],B=GRAYBR)),
 ('CK-c Klassisch','fünfzackige Goldkrone, Zwirbelbart',spec('krone_k','zwirbel','kurz',('brauen',),J=C['red'],**KB)),
 ('CK-d Wikingerkönig','Eisenkrone mit Rubin, rotblonder Zopfbart',spec('krone_zacken_eisen','wikinger','kurz',('brauen',),J=C['red'],H=REDHAIR,B=REDHAIR)),
 ('CK-e Kronhelm','Hörnerhelm mit goldenem Kronreif',spec(['wikingerhelm','goldring'],'wikinger','glatze',('brauen',),J=C['red'],H=REDHAIR,B=REDHAIR)),
 ('CK-f Waldkönig','Geweih aus Goldkrone, langer Bart',spec(['geweih','goldring'],'lang','kurz',('brauen',),J=C['red'],**KB)),
 ('CK-g Blätterkönig','Krone aus Blättern und Gold, dunkler Bart',spec('krone_blatt','voll','kurz',('brauen',),Q=GREEN,**KB)),
 ('CK-h Piratenkönig','Krone über rotem Kopftuch, Augenklappe, Ohrring',spec(['bandana','krone_k','ohrringe'],'voll','kurz',('augenklappe','narbe'),A=C['red'],a=RED2,J=C['red'],H=hx('1b1b1b'),B=hx('1b1b1b'))),
 ('CK-i Perlenkönig','Goldkrone mit Perlen, dünner Bart',spec('krone_perlen','schnurr','kurz',('brauen','nase'),J=C['red'],**KB)),
 ('CK-j Kaiser','Kaiserkrone mit Perlenschnüren (Fernost), Spitzbart',spec('mian','ziege','glatze',('brauen',),B=hx('2b2b2b'))),
 ('CK-k Eiskönig','Pelzmütze mit kleiner Krone, weißer Bart',spec(['pelz','krone_klein'],'voll','glatze',('brauen',),B=hx('e8e4de'),H=hx('e8e4de'))),
 ('CK-l Schwarzer König','schwarze Krone mit Goldkante und Rubin',spec('krone_schwarz','voll','kurz',('brauen','narbe'),J=C['red'],H=hx('1b1b1b'),B=hx('1b1b1b'))),
]
S=5; per=4; cw=W*S+pad; rh=H*S+78
rows=[CK[i:i+per] for i in range(0,len(CK),per)]
im=Image.new('RGB',(per*cw+pad,len(rows)*rh+34),bg); d=ImageDraw.Draw(im)
d.text((pad,6),'Kreuz König mit Krone: zwölf Vorschläge (Master v2)',fill=C['ink'],font=FONTB)
for ri,row in enumerate(rows):
    for ci,(n,dsc,sp) in enumerate(row):
        x=pad+ci*cw; y=30+ri*rh
        c=scaled(card('C',13,sp,'schlagschatten','symm'),S); im.paste(c,(x,y),c)
        d.text((x,y+H*S+4),n,fill=C['ink'],font=FONTB2)
        d.multiline_text((x,y+H*S+22),'\n'.join(textwrap.wrap(dsc,23)[:4]),fill=C['ink'],font=FONT)
im.save('r17_kreuz_koenig_krone.png'); print(im.size)
