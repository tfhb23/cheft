from paare import *
GOLD2=hx('c8902a'); RED=C['red']; WHITE=C['white']; BLACK=C['ink']
OUT='/home/user/cheft/design/bildkarten/images/entw/'
BK=dict(H=BLACK)
def cut_rows(d,removed):
    """Zeilen entfernen, die oberen Zeilen rücken nach unten (untere Kante bleibt)"""
    out={}
    for y,s in d.items():
        if y in removed: continue
        out[y+sum(1 for r in removed if r>y)]=s
    return out
# ======================= KARO KÖNIG 8 (Federkrone): Krone 1 bis 2 px niedriger, obere Kante bleibt =======================
KF=[]
fr=lambda: merge(kh(top=False),beard('schnurr_kinn'))
fk_full=lambda: merge(rows(5,'      F   F     ','      F   F     ','      FF FF     '),stack(8,[7,9,11,11,11,11,11],'A'),pix([(8,10)],'J'))
lap=lambda y0,y1: pix([(x,y) for y in range(y0,y1+1) for x in (2,3,13,14)],'A')
def kf(label,removed):
    KF.append((label,art(merge(cut_rows(fk_full(),removed),lap(15,20),fr())),dict(F=C['gold'],Y=GOLD2)))
kf('1 wie 8 (Referenz)',[])
kf('2 minus 1 (Zeile 12)',[12])
kf('3 minus 1 (Zeile 13)',[13])
kf('4 minus 1 (Zeile 11)',[11])
kf('5 minus 2 (Zeilen 11, 12)',[11,12])
kf('6 minus 2 (Zeilen 12, 13)',[12,13])
kf('7 minus 2 (Zeilen 11, 13)',[11,13])
kf('8 minus 2 (Zeilen 10, 12)',[10,12])
# ======================= KARO DAME 11: Haar länger, unten wellig/asymmetrisch =======================
KD=[]
sun=lambda: merge(stack(6,[3,5,5,5,3],'G'),pix([(8,8)],'J'),stack(11,[7,9,11,11],'H'),line(13,4,12,'G'))
ear=lambda: pix([(3,20),(3,21),(13,20),(13,21)],'G')
def side(left,y0,y1,x0f,w=2,ch='H',acc='h',accstep=3):
    """Haarsträhne: für jede Zeile y Startspalte x0f(y), Breite w; Spiegel für rechts (left=False): Spalte 16-x0-w"""
    d={}
    for y in range(y0,y1+1):
        x0=x0f(y); cells=[x0+i for i in range(w)] if left else [16-x0-w+i for i in range(w)]
        c=acc if ((y-y0)//accstep)%2==1 else ch
        for x in cells:
            if 2<=x<=14: d=merge(d,pix([(x,y)],c))
    return d
seq=lambda base,sh: (lambda y: base+sh[(y-21)%len(sh)] if y>=21 else base)
def kd(label,hair,extra=None): KD.append((label,art(merge(sun(),hair,ear())),{},extra))
W1=[0,0,1,2,2,1]; W2=[0,1,2,2,1,0]
kd('1 lang wellig, symmetrisch',merge(side(True,15,28,seq(2,W1)),side(False,15,28,seq(2,W1))))
kd('2 asymmetrisch: links lang, rechts kurz mit Welle',merge(side(True,15,28,seq(2,[0,0,1,2,2,1,0,0,1,2])),side(False,15,25,seq(2,[0,1,1,0,1,1]))))
kd('3 Locken-Enden',merge(side(True,15,26,seq(2,W1)),side(False,15,26,seq(2,W2)),pix([(3,27),(4,27),(4,28),(3,28),(12,27),(13,27),(12,28),(13,28)],'H'),pix([(3,28),(13,28)],'h')))
kd('4 Haar über rechte Schulter',merge(side(True,15,23,seq(2,[0,0])),side(False,15,28,seq(2,[0,0,1,1,2,2,1,1]),3),pix([(11,23),(11,24)],'H')))
kd('5 Fall verbreitert sich, wellig',merge(side(True,15,20,lambda y:2),side(True,21,28,lambda y:2-(1 if y>=24 else 0)+[0,1,1,0,0,1,1,0][y-21],3 if False else 2),side(False,15,20,lambda y:2),side(False,21,28,lambda y:2-(1 if y>=24 else 0)+[1,0,0,1,1,0,0,1][y-21],2)))
kd('6 gestufte Spitzen',merge(side(True,15,22,lambda y:2),pix([(2,23),(3,23),(2,24),(3,24),(2,25),(3,25),(2,26),(2,27)],'H'),side(False,15,22,lambda y:2),pix([(13,23),(14,23),(13,24),(14,24),(13,25),(14,25),(14,26),(14,27),(14,28)],'H')))
kd('7 Seitenscheitel, links kurz',merge(side(True,15,19,lambda y:3),side(False,15,28,seq(2,[0,1,2,1,0,1]),2),pix([(5,14),(5,15),(6,15)],'H')))
kd('8 wellig mit Goldbändern',merge(side(True,15,28,seq(2,W1)),side(False,15,28,seq(2,W2)),pix([(2,24),(3,24),(13,24),(14,24)],'G'),pix([(3,27),(13,27)],'G')))
# ======================= PIK BUBE: Mischung aus 12 (lang, Mittelscheitel) und 6 (rahmendes Haar), als Haar =======================
PB=[]
def pb(label,d,pal=None,extra=()): PB.append((label,art(d),pal or BK,list(extra)))
# Dach mit Mittelscheitel: Vorhang-Fransen lassen die Stirn frei (Dreieck), damit es als Haar und nicht als Kapuze liest
roof=lambda: merge(stack(10,[5,9,11],'H'),line(13,3,13,'H'),pix([(8,10),(8,11),(8,12)],'w'),pix([(4,11),(6,11),(10,11),(12,11)],'w'))
curtain=lambda w=3: merge(line(14,3,6,'H'),line(14,10,13,'H'),pix([(x,15) for x in range(3,3+w)]+[(x,15) for x in range(14-w,14)],'H'),pix([(3,16),(13,16)],'H'))
def strands(L,R,ch='H',hl=((3,18),(14,19),(2,21))):
    return merge(pix([(x,y) for y in range(15,L+1) for x in (2,3)],ch),pix([(x,y) for y in range(15,R+1) for x in (13,14)],ch),pix(list(hl),'w'))
pb('1 Vorhang-Mittelscheitel, lang',merge(roof(),curtain(),strands(22,22),pix([(2,23),(14,23)],'H')),extra=['brauen_3'])
pb('2 Vorhang kurz, Strähnen ungleich lang',merge(roof(),curtain(2),strands(21,23),pix([(3,22),(13,22),(13,24)],'H')),extra=['brauen_3'])
pb('3 Seitenscheitel links, rechts länger',merge(stack(10,[5,9,11],'H'),line(13,3,13,'H'),pix([(5,10),(5,11),(5,12),(4,13)],'w'),line(14,3,5,'H'),line(14,7,13,'H'),line(15,3,4,'H'),pix([(8,15),(9,15)],'H'),strands(20,23),pix([(13,24)],'H')),extra=['brauen_3'])
pb('4 Pagenschnitt, Spitzen nach innen',merge(roof(),curtain(),strands(21,21),pix([(4,22),(5,22),(11,22),(12,22),(3,22),(13,22)],'H')),extra=['brauen_3'])
pb('5 Lang, wellig, Vorhang',merge(roof(),curtain(),side(True,15,24,seq(2,[0,0,1,1,0,0,1]),2),side(False,15,24,seq(2,[1,0,0,1,1,0,0]),2),pix([(3,18),(14,19)],'w')),extra=['brauen_3'])
pb('6 Vorhang + weiße Strähne',merge(roof(),curtain(),strands(22,22),pix([(5,10),(5,11),(4,12),(4,13)],'W')),extra=['brauen_3'])
pb('7 Struppig: Vorhang + Spitzen',merge(roof(),curtain(),strands(21,22),pix([(2,22),(3,23),(14,23),(13,22),(1+2,24),(14,24)],'H'),pix([(7,9),(10,9)],'H')),extra=['brauen_3'])
pb('8 Vorhang + orange Spange',merge(roof(),curtain(),strands(22,22),pix([(12,12),(13,12)],'Z')),extra=['brauen_3'])
pb('9 Dicker Pagenkopf, Vorhang',merge(roof(),curtain(),pix([(x,y) for y in range(15,21) for x in (2,3,4,12,13,14)],'H'),pix([(3,18),(13,17),(2,19)],'w')),extra=['brauen_3'])
pb('10 Vorhang + Strähne vor die Schulter',merge(roof(),curtain(),strands(21,21),pix([(4,22),(4,23),(5,23),(4,24)],'H')),extra=['brauen_3'])
pb('11 Vorhang + Narbe',merge(roof(),curtain(),strands(22,22)),extra=['narbe','brauen_3'])
pb('12 Hoher Bogen, sehr lang (bis Schulter)',merge(stack(9,[3,7,9,11],'H'),line(13,3,13,'H'),pix([(8,9),(8,10),(8,11),(8,12)],'w'),curtain(),strands(24,24),pix([(2,25),(14,25)],'H')),extra=['brauen_3'])
# ======================= KREUZ KÖNIG: Mischung aus 1 (Vollbart kurz) und 2 (lang) =======================
KRK=[]
dome=lambda: stack(11,[5,7,9,9],'S')
def krk(label,beardd,hairx=None):
    d=merge(dome(),pix([(3,y) for y in (15,16,17,18)]+[(13,y) for y in (15,16,17,18)],'H'),beardd,line(20,5,11,'B'))
    if hairx: d=merge(d,hairx)
    KRK.append((label,art(d),{}))
full4=lambda: merge(line(19,4,12,'B'),line(20,4,12,'B'),line(21,4,12,'B'),line(22,4,12,'B'))
krk('1 rund, bis Zeile 24',merge(full4(),line(23,5,11,'B'),line(24,6,10,'B')))
krk('2 rund, bis Zeile 25',merge(full4(),line(23,5,11,'B'),line(24,6,10,'B'),line(25,7,9,'B')))
krk('3 gestuft, bis 25',merge(line(19,4,12,'B'),line(20,4,12,'B'),line(21,4,12,'B'),line(22,5,11,'B'),line(23,5,11,'B'),line(24,6,10,'B'),line(25,7,9,'B')))
krk('4 leicht spitz, bis 25',merge(full4(),line(23,5,11,'B'),line(24,7,9,'B'),line(25,8,8,'B')))
krk('5 eckig, bis 24',merge(full4(),line(23,4,12,'B'),line(24,5,11,'B')))
krk('6 unten schmal, bis 25',merge(full4(),line(23,6,10,'B'),line(24,6,10,'B'),line(25,7,9,'B')))
krk('7 unten geteilt, bis 25',merge(full4(),line(23,5,11,'B'),line(24,5,7,'B'),line(24,9,11,'B'),line(25,5,6,'B'),line(25,10,11,'B')))
krk('8 Schnurr abgesetzt (dunkler), bis 25',merge(full4(),line(23,5,11,'B'),line(24,6,10,'B'),line(25,7,9,'B'),line(20,5,11,'h')))
if __name__=='__main__':
    sheet('karo_koenig',KF,OUT+'karo_koenig_krone2.png',title='Karo König 8 (Federkrone): 1 bis 2 px niedriger, Pixel aus der Mitte')
    sheet('karo_dame',KD,OUT+'karo_dame_haare.png',title='Karo Dame 11: lange, wellige, asymmetrische Haare')
    sheet('pik_bube',PB,OUT+'pik_bube_3.png',title='Pik Bube: Mischung aus 12 und 6, als Haar')
    sheet('kreuz_koenig',KRK,OUT+'kreuz_koenig_bart2.png',title='Kreuz König: Bart zwischen kurz (1) und lang (2)')
