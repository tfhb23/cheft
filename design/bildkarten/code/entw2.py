from paare import *
GOLD2=hx('c8902a'); RED=C['red']; WHITE=C['white']; BLACK=C['ink']; HBROWN=HAIR['H']
OUT='/home/user/cheft/design/bildkarten/images/entw/'
# ======================= KARO KÖNIG: Nemes-Varianten (Haar und Bart bleiben, keine Streifen) =======================
KN=[]
def frame(): return merge(kh(top=False),beard('schnurr_kinn'))
def kn(label,hat,pal=None,fr=None): KN.append((label,art(merge(hat,fr if fr is not None else frame())),pal or {}))
lap=lambda y0,y1,ch='A',xs=(2,3,13,14): pix([(x,y) for y in range(y0,y1+1) for x in xs],ch)
kn('1 Nemes glatt',merge(stack(9,[7,9,11,11,11,11],'A'),lap(15,22),pix([(8,10)],'J')))
kn('2 Nemes + dunkle Stirnlinie',merge(stack(9,[7,9,11,11,11],'A'),line(14,3,13,'a'),lap(15,22),pix([(8,10)],'J')))
kn('3 Nemes kurz, rund',merge(stack(8,[5,9,11,11,11,11,11],'A'),lap(15,19),pix([(8,10)],'J')))
kn('4 Nemes + Stirnjuwel',merge(stack(9,[7,9,11,11,11,11],'A'),lap(15,22),pix([(8,11),(7,12),(8,12),(9,12),(8,13)],'J')))
kn('5 Reifkrone, Haar frei',merge(pix([(4,9),(6,9),(8,9),(10,9),(12,9)],'G'),line(10,4,12,'G'),{11:at(4,'GJGGJGGJG')},line(12,4,12,'G'),line(13,3,13,'H'),line(14,3,13,'H')),fr=merge(kh(top=True),beard('schnurr_kinn')))
kn('6 Goldhaube mit Ohrklappen',merge(stack(10,[7,9,11,11],'A'),pix([(8,12)],'J'),lap(14,20,'A',(3,4,12,13))))
kn('7 Weiße Hedjet-Krone',merge(stack(5,[3,5,5,5],'A'),stack(9,[7,9,11,11],'A'),line(13,3,13,'G'),line(14,3,13,'G'),pix([(8,12)],'J'),lap(15,22,'A',(2,3,13,14)) if False else {}),pal=dict(A=WHITE))
kn('8 Federkrone, zwei Federn',merge(rows(5,'      F   F     ','      F   F     ','      FF FF     '),stack(8,[7,9,11,11,11,11,11],'A'),pix([(8,10)],'J'),lap(15,20)),pal=dict(F=C['gold'],Y=GOLD2))
kn('9 Spitzkuppel (Kalif)',merge(stack(5,[1,3,5,7,9,11,11,11,11,11],'A'),pix([(8,10),(8,12)],'J'),lap(15,20)))
kn('10 Turban + Tuchende rechts',merge(stack(8,[5,9,11,11,11,11,11],'A'),pix([(8,11)],'J'),pix([(x,y) for y in range(15,23) for x in (13,14)],'A')))
kn('11 Stirnreif + Haarflut',merge(stack(11,[7,9,11,11],'H'),line(13,4,12,'G'),pix([(8,13)],'J'),pix([(x,y) for y in range(15,24) for x in (2,3,13,14)],'H')),fr=merge(beard('schnurr_kinn'),pix([(4,18),(12,18)],'B')))
kn('12 Sonnenscheibe',merge(stack(5,[3,5,5,5,3],'A'),pix([(8,7)],'J'),stack(10,[7,9,11,11,11],'A'),lap(15,22),pix([(8,12)],'J')))
kn('13 Doppelhaube: Gold unten, Weiß oben',merge(stack(8,[5,9],'A'),line(10,3,13,'G'),stack(11,[9,11,11,11],'A'),lap(15,21,'A',(2,3,13,14))),pal=dict(A=WHITE))
# ======================= HERZ KÖNIG v2 =======================
HK=[]
def hk(label,hat,bk,pal=None,hair=True,top=True,longhair=False):
    d=merge(hat,kh(top=top,cheek=None) if hair else {},beard(bk) if bk=='lang' else beard2(bk))
    if longhair: d=merge(d,sidecols(range(19,23),(3,13),'H'))
    HK.append((label,art(d),pal or {}))
WH=dict(q=HBROWN)
def weiser(band,bk,pal=None,rosepos=None,longhair=True,label=''):
    d=merge(stack(10,[5,9,11],'H'),band,rose(12,12) if rosepos is None else rosepos,line(14,3,13,'H') if False else {})
    return d
base6=lambda: stack(10,[5,9,11],'H')
band2=lambda ch: merge(line(13,3,13,ch),line(14,3,13,ch))
hk('6A wie 6, Goldband',merge(base6(),band2('G'),rose(12,12)),'lang',top=False,longhair=True)
hk('6B wie 6, braunes Band',merge(base6(),band2('q'),rose(12,12)),'lang',pal=WH,top=False,longhair=True)
hk('6C wie 6, schwarzes Band',merge(base6(),band2('K'),rose(12,12)),'lang',top=False,longhair=True)
hk('6D wie 6, Gold + brauner Rand',merge(base6(),line(13,3,13,'G'),line(14,3,13,'q'),rose(12,12)),'lang',pal=WH,top=False,longhair=True)
hk('6E Goldband, Schnurr + Kinn',merge(base6(),band2('G'),rose(12,12)),'schnurr_kinn',top=False,longhair=True)
hk('6F braunes Band, Backenbart',merge(base6(),band2('q'),rose(12,12)),'backen_kinn',pal=WH,top=False,longhair=True)
hk('6G schwarzes Band, Ziegenbart',merge(base6(),band2('K'),rose(12,12)),'ziege',top=False,longhair=True)
hk('R1 Turban, Rose als Brosche',merge(stack(10,[5,9,11,11],'A'),line(13,3,13,'a'),line(14,3,13,'G'),rose(8,12)),'schnurr_lang')
hk('R2 Turban, Rose seitlich am Band',merge(stack(10,[5,9,11,11],'A'),line(13,3,13,'a'),line(14,3,13,'G'),rose(12,12)),'kinn')
hk('R3 Haar mit Rose überm Ohr',merge(stack(10,[5,9,11,11],'H'),line(13,4,12,'G'),line(14,3,13,'H'),rose(13,17)),'schnurr_kinn',top=True,longhair=True)
hk('R4 Rosenkranz im Goldband',merge(stack(10,[5,9,11,11],'A'),line(13,3,13,'a'),{14:at(3,'GRGRGRGRGRG')}),'kinn')
hk('R5 Rose oben auf dem Turban',merge(stack(9,[7,9,11,11,11],'A'),line(14,3,13,'G'),line(12,3,13,'a'),rose(8,7)),'ziege')
hk('R6 Zwei Rosen am Turbanband',merge(stack(10,[5,9,11,11],'A'),line(13,3,13,'a'),line(14,3,13,'G'),rose(4,12),rose(12,12)),'backen')
hk('R7 Langes Haar, braunes Band, Rose am Ohr',merge(stack(10,[5,9,11],'H'),band2('q'),rose(3,17)),'schnurr_lang',pal=WH,top=False,
   longhair=True)
hk('R8 Hoher Turban, Rose oben links',merge(stack(7,[3,5,9,11,11,11],'A'),line(13,3,13,'a'),line(14,3,13,'G'),rose(6,9)),'kinn')
hk('R9 Roter Turban, weiße Rose',merge(stack(10,[5,9,11,11],'A'),line(13,3,13,'G'),line(14,3,13,'G'),pix([(7,12),(8,11),(9,12),(8,13)],'W'),pix([(8,12)],'V')),'schnurr_lang',pal=dict(A=RED))
hk('R10 Glatze, Goldband, Rose am Ohr',merge(stack(11,[5,7,9,9],'S'),band2('G') if False else line(14,4,12,'G'),rose(13,15)),'ziege',hair=False)
if __name__=='__main__':
    sheet('karo_koenig',KN,OUT+'karo_koenig_nemes.png',title='Karo König: Nemes-Varianten (Haar und Bart wie Nemes 2, keine Streifen)')
    sheet('herz_koenig',HK,OUT+'herz_koenig_2.png',title='Herz König: ohne Vollbart, Rose, 6 mit Stirnband')
