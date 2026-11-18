from paare import *
BLACK=C['ink']
OUT='/home/user/cheft/design/bildkarten/images/entw/'
BK=dict(H=BLACK)
# ======================= PIK BUBE: nur die Merkmale von 12 (lang, Mittelscheitel) und 6 (Rahmen-Silhouette), als Haar =======================
# Merkmale exakt wie in pik_bube_2:
dome12=lambda part=True: merge(stack(11,[7,9,11,11],'H'),pix([(8,11),(8,12)],'w') if part else {})
dome6 =lambda part=False: merge(stack(10,[5,9,11,11,11],'H'),pix([(8,11),(8,12)],'w') if part else {})
sides12=lambda: pix([(x,y) for y in range(15,22) for x in (3,4,12,13)],'H')                       # 12: 2 breit je Seite, Zeilen 15-21
sides6 =lambda: merge(pix([(x,y) for y in range(15,21) for x in (3,13)],'H'),pix([(x,y) for y in range(19,22) for x in (4,12)],'H'))   # 6: außen 1 breit bis 20, innen Spalte 4/12 Zeilen 19-21
sides12_top6_low=lambda: merge(pix([(x,y) for y in range(15,19) for x in (3,13)],'H'),pix([(x,y) for y in range(19,22) for x in (3,4,12,13)],'H'))
sides6_top12_low=lambda: merge(pix([(x,y) for y in range(15,19) for x in (3,4,12,13)],'H'),pix([(x,y) for y in range(19,21) for x in (3,13)],'H'),pix([(x,y) for y in range(19,22) for x in (4,12)],'H'))
PB=[]
def pb(label,d): PB.append((label,art(d),BK,['brauen_3']))
pb('1 Dach 12 + Seiten 6',merge(dome12(),sides6()))
pb('2 Dach 6 + Seiten 12',merge(dome6(),sides12()))
pb('3 Dach 6 + Scheitel + Seiten 6',merge(dome6(True),sides6()))
pb('4 Dach 6 + Scheitel + Seiten 12',merge(dome6(True),sides12()))
pb('5 Dach 12, ohne Scheitel + Seiten 6',merge(dome12(False),sides6()))
pb('6 Dach 12 + oben Seiten 6, unten 12',merge(dome12(),sides12_top6_low()))
pb('7 Dach 6 + Scheitel + oben 12, unten 6',merge(dome6(True),sides6_top12_low()))
pb('8 Dach 12 + links 12, rechts 6',merge(dome12(),pix([(x,y) for y in range(15,22) for x in (3,4)],'H'),pix([(x,y) for y in range(15,21) for x in (13,)],'H'),pix([(12,y) for y in range(19,22)],'H')))
pb('9 Dach 12 + links 6, rechts 12',merge(dome12(),pix([(x,y) for y in range(15,21) for x in (3,)],'H'),pix([(4,y) for y in range(19,22)],'H'),pix([(x,y) for y in range(15,22) for x in (12,13)],'H')))
pb('10 Dach 6 + Scheitel + links 12, rechts 6',merge(dome6(True),pix([(x,y) for y in range(15,22) for x in (3,4)],'H'),pix([(13,y) for y in range(15,21)],'H'),pix([(12,y) for y in range(19,22)],'H')))
pb('11 Dach 6 + Scheitel + links 6, rechts 12',merge(dome6(True),pix([(3,y) for y in range(15,21)],'H'),pix([(4,y) for y in range(19,22)],'H'),pix([(x,y) for y in range(15,22) for x in (12,13)],'H')))
pb('12 Dach 12 + Seiten 12 + Seiten-Innen von 6',merge(dome12(),sides12(),pix([(5,y) for y in range(19,22)]+[(11,y) for y in range(19,22)],'H')))
# ======================= KREUZ KÖNIG 1 (rund, bis Zeile 24) mit Mund =======================
KRK=[]
dome=lambda: stack(11,[5,7,9,9],'S')
full4=lambda: merge(line(19,4,12,'B'),line(20,4,12,'B'),line(21,4,12,'B'),line(22,4,12,'B'))
bd=lambda: merge(full4(),line(23,5,11,'B'),line(24,6,10,'B'))
def krk(label,mouth,hair=True):
    d=merge(dome(),pix([(3,y) for y in (15,16,17,18)]+[(13,y) for y in (15,16,17,18)],'H'),bd(),line(20,5,11,'B'),mouth)
    KRK.append((label,art(d),{}))
krk('1 Lippen 3 breit',at(7,'MMM') and {21:at(7,'MMM')})
krk('2 Lippen 3 + Unterlippe',merge({21:at(7,'MMM')},{22:at(8,'M')}))
krk('3 Lippen 5 breit',{21:at(6,'MMMMM')})
krk('4 Lächeln (Mundwinkel hoch)',merge({21:at(7,'MMM')},pix([(6,20),(10,20)],'M')))
krk('5 Lippen mit Hautfeld im Bart',merge(line(21,6,10,'S'),line(22,7,9,'S'),{21:at(7,'MMM')}))
krk('6 Offen: Lippen + Zähne',merge({21:at(7,'MMM')},{22:at(7,'WWW')}))
krk('7 Lippen 3, Schnurr unterbrochen',merge(pix([(8,20)],'S'),{21:at(7,'MMM')}))
krk('8 Lippen schmal 2 breit',{21:at(7,'MM')})
if __name__=='__main__':
    sheet('pik_bube',PB,OUT+'pik_bube_4.png',title='Pik Bube: nur Merkmale von 12 und 6 gemischt, als Haar')
    sheet('kreuz_koenig',KRK,OUT+'kreuz_koenig_mund.png',title='Kreuz König 1: Mund-Varianten')
