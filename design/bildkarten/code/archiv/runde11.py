from comp import *
import bust, parts as P
from PIL import ImageDraw
WHITEHAIR=hx('f3f0ea'); bg=(0xf2,0xe6,0xd0); pad=10; BROWN_GOLD=hx('8a5a1a')
def mk(hat,beard,hair,extra,dyn,**pal): return dict(body='leer',hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal,dyn=dyn)
def king(mon='monokel_l'): return mk('z_a11','keiner','lang_z',(mon,),dict(xl=4,xmin=5,shape='sy_halb',gold='g5'),H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)
def bube(): return mk([],'keiner','topf_b',('brille_m',),dict(xl=4,xmin=5,shape='sy_halb',gold='g1'),H=WHITEHAIR,S=SKIN_PALE)
def dame(hair,mund=True): return mk([],'keiner',hair,('brille_6p',)+(('mund_schmal',) if mund else ()),dict(xl=4,xmin=5,shape='sy_halb',gold='g5u',upper=BROWN_GOLD),H=WHITEHAIR,S=SKIN_PALE,M=C['red'])
def R(rank,spec): return card('S',rank,spec,'schlagschatten','cut1')
def lab(d,x,y,t): d.multiline_text((x,y),t,fill=C['ink'],font=FONT)
def strip(items,fname,S=6,crop=None,cS=12,title=None):
    cw=max(W*S,(crop[2]-crop[0])*cS if crop else 0)+pad
    h=H*S+(((crop[3]-crop[1])*cS+pad) if crop else 0)+80
    im=Image.new('RGB',(len(items)*cw+pad,h+(22 if title else 0)),bg);d=ImageDraw.Draw(im)
    if title: d.text((pad,4),title,fill=C['ink'],font=FONTB)
    y0=pad+(22 if title else 0)
    for i,(l,rank,sp) in enumerate(items):
        x=pad+i*cw; c=R(rank,sp); b=scaled(c,S); im.paste(b,(x,y0),b); y=y0+H*S+6
        if crop:
            z=c.crop(crop).resize(((crop[2]-crop[0])*cS,(crop[3]-crop[1])*cS),Image.NEAREST); im.paste(z,(x,y)); y+=z.height+6
        lab(d,x,y,l)
    im.save(fname);print(fname,im.size)
# Dame D: schmaler Mund, runderes Haar
strip([('aktuell\nKuppel 6,8,12,14\nMund 4 breit',12,dame('bob_kinn3',False)),('R1  Kuppel\n6,8,10,12,14\nMund 2 breit',12,dame('bob_r1')),('R2  Kuppel\n6,10,12,14,14',12,dame('bob_r2')),('R3  Kuppel\n8,10,12,14,14\n(flach rund)',12,dame('bob_r3'))],'r11_dame.png',S=6,crop=(5,6,27,28),cS=9,title='Dame D: schmalerer Mund und rundere Frisur oben')
# König: Monokel groß
strip([('König aktuell\nMonokel 3 x 3',13,king('monokel_l')),('Monokel 5 x 5\n(wie Brille Bube)\nmit Kette',13,king('monokel_m')),('Monokel 5 x 5\nohne Kette',13,king('monokel_m_ohne')),('Bube zum Größenvergleich\nBrille M 5 x 5',11,bube())],'r11_koenig.png',S=6,crop=(0,8,26,28),cS=8,title='König: größeres Monokel')
# Familie
strip([('König\nMonokel 5x5, Kette',13,king('monokel_m')),('Bube',11,bube()),('Dame R1',12,dame('bob_r1')),('Dame R3',12,dame('bob_r3'))],'r11_familie.png',S=6,title='Pik-Familie')
