from comp import *
import bust, parts as P
from PIL import ImageDraw
WHITEHAIR=hx('f3f0ea'); bg=(0xf2,0xe6,0xd0); pad=10; BROWN_GOLD=hx('8a5a1a')
def mk(hat,beard,hair,extra,dyn,**pal): return dict(body='leer',hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal,dyn=dyn)
def king(): return mk('z_a11','keiner','lang_z',('monokel_m',),dict(xl=4,xmin=5,shape='sy_halb',gold='g5'),H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)
def bube(): return mk([],'keiner','topf_b',('brille_m',),dict(xl=4,xmin=5,shape='sy_halb',gold='g1'),H=WHITEHAIR,S=SKIN_PALE)
def dame(hat): return mk(hat,'keiner','bob_r2',('brille_6p','mund_schmal'),dict(xl=4,xmin=5,shape='sy_halb',gold='g5u',upper=BROWN_GOLD),H=WHITEHAIR,S=SKIN_PALE,M=C['red'],Z=C['red'],G=C['gold'])
def R(rank,spec): return card('S',rank,spec,'schlagschatten','cut1')
def lab(d,x,y,t): d.multiline_text((x,y),t,fill=C['ink'],font=FONT)
def strip(items,fname,S=6,crop=None,cS=12,title=None,per=None):
    per=per or len(items); rows=[items[i:i+per] for i in range(0,len(items),per)]
    cw=max(W*S,(crop[2]-crop[0])*cS if crop else 0)+pad
    rh=H*S+(((crop[3]-crop[1])*cS+pad) if crop else 0)+70
    im=Image.new('RGB',(per*cw+pad,len(rows)*rh+(26 if title else 6)),bg);d=ImageDraw.Draw(im)
    if title: d.text((pad,4),title,fill=C['ink'],font=FONTB)
    for ri,row in enumerate(rows):
        y0=(26 if title else 6)+ri*rh
        for i,(l,rank,sp) in enumerate(row):
            x=pad+i*cw; c=R(rank,sp); b=scaled(c,S); im.paste(b,(x,y0),b); y=y0+H*S+6
            if crop:
                z=c.crop(crop).resize(((crop[2]-crop[0])*cS,(crop[3]-crop[1])*cS),Image.NEAREST); im.paste(z,(x,y)); y+=z.height+6
            lab(d,x,y,l)
    im.save(fname);print(fname,im.size)
V=[('A1  Mini-Melone\ngerade, schwarz','melone_a'),('A2  gerade,\nrotes Band','melone_a_rot'),('A3  gerade,\ngoldenes Band','melone_a_gold'),
   ('B1  leicht schief\nnach rechts','melone_b'),('B2  leicht schief,\nrotes Band','melone_b_rot'),('C1  stärker schief\nnach rechts','melone_c'),('C2  stärker schief,\nrotes Band','melone_c_rot'),('D  größere Melone\nrotes Band, gerade','melone_gross')]
strip([(l,12,dame(h)) for l,h in V],'r12_dame_melone.png',S=6,crop=(3,3,27,27),cS=7,title='Dame D, Frisur R2, mit Melone',per=4)
strip([('König\nMonokel 5x5 + Kette',13,king()),('Bube\nBrille M, Topfschnitt B',11,bube()),('Dame mit A2',12,dame('melone_a_rot')),('Dame mit B2',12,dame('melone_b_rot'))],'r12_familie.png',S=6,title='Pik-Familie')
