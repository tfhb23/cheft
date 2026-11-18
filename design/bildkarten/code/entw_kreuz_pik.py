from paare import *
WHITE=C['white']; BLACK=C['ink']
OUT='/home/user/cheft/design/bildkarten/images/entw/'
# ======================= KREUZ KÖNIG (Schwarz, Gold, Weiß, braunes Haar) =======================
KRK=[]
def krk(label,hat,bk='schnurr',pal=None,top=True,extra_d=None):
    d=merge(hat,kh(top=top,cheek=None))
    if bk=='schnurr': d=merge(d,line(20,5,11,'B'))
    elif bk: d=merge(d,beard(bk))
    if extra_d: d=merge(d,extra_d)
    KRK.append((label,art(d),pal or {}))
cross=pix([(8,6),(7,7),(8,7),(9,7),(8,8)],'G')
krk('1 Bügelkrone mit Kreuz',merge(cross,{9:ctr('GGG'),10:ctr('GKKKG'),11:ctr('GKKKKKG'),12:ctr('GKKKKKKKG')},line(13,3,13,'G'),line(14,3,13,'G'),pix([(5,13),(8,13),(11,13)],'J')))
krk('2 Zackenkrone auf Hermelin',merge(pix([(4,9),(6,9),(8,9),(10,9),(12,9)],'G'),line(10,4,12,'G'),{11:at(4,'GJGGJGGJG')},line(12,3,13,'G'),
   line(13,3,13,'W'),{13:at(3,'WKWWWKWWWKW')},line(14,3,13,'W')))
krk('3 Lorbeer, Glatze, Vollbart',merge(stack(11,[5,7,9,9],'S'),pix([(6,11),(8,11),(10,11),(5,12),(11,12),(4,13),(12,13),(4,14),(12,14),(3,15),(13,15)],'G'),
   pix([(7,10),(9,10)],'G')),'voll_kurz',top=False,extra_d=merge(pix([(3,y) for y in (16,17,18)]+[(13,y) for y in (16,17,18)],'H'),line(20,5,11,'B')))
krk('4 Zinnenkrone',merge({9:at(4,'GG.GGG.GG') and at(4,'GG GGG GG')},{10:at(4,'GG GGG GG')},line(11,4,12,'G'),{12:at(4,'GGJGGJGGG')},line(13,4,12,'G'),line(14,3,13,'G')))
krk('5 Kleine Krone + Locken',merge(stack(11,[5,9,11,11],'H'),pix([(6,12),(8,12),(10,12)],'G'),pix([(6,11),(8,11),(10,11)],'G'),line(13,4,12,'G'),pix([(8,13)],'J'),line(14,3,13,'H'),
   pix([(x,y) for y in range(15,23) for x in (2,3,13,14)],'H')),'spitz',top=True)
krk('6 Kurhut mit Hermelin',merge(stack(9,[5,9,11,11],'K'),pix([(8,10)],'G'),pix([(7,11),(9,11)],'G'),{13:at(3,'WKWWWKWWWKW')},line(14,3,13,'W'),pix([(8,12)],'J')),'schnurr')
krk('7 Perlenreif auf vollem Haar',merge(stack(10,[5,9,11,11,11],'H'),line(12,3,13,'W') and {12:at(4,'W W W W W') and at(3,'WHWHWHWHWHW')},line(13,3,13,'G'),pix([(8,13)],'J'),line(14,3,13,'H')),'doppelspitz')
krk('8 Perlenkrone',merge(pix([(4,8),(6,8),(8,8),(10,8),(12,8)],'W'),pix([(4,9),(6,9),(8,9),(10,9),(12,9)],'G'),line(10,4,12,'G'),line(11,4,12,'G'),{11:at(4,'GJGGJGGJG')},line(12,3,13,'G'),line(13,3,13,'G'),line(14,3,13,'G')),'schnurr')
krk('9 Barett mit weißer Feder',merge({10:ctr('KKKKKKK'),11:ctr('KKKKKKKKKKK'),12:ctr('KKKKKKKKKKKKK'),13:ctr('KKKKKKKKKKK'),14:ctr('KKKKKKKKKKK')},
   pix([(10,9),(11,8),(12,8),(13,9),(13,10),(12,11)],'W'),pix([(5,12)],'G'),pix([(6,12)],'J')),'voll_kurz',extra_d=line(20,5,11,'B'))
krk('10 Breite Eisenkrone mit Perlen',merge(line(10,4,12,'G'),{11:at(4,'GWGWGWGWG')},line(12,3,13,'G'),line(13,3,13,'G'),pix([(5,12),(8,12),(11,12)],'J'),line(14,3,13,'G')),'schnurr')
krk('11 Kalotte + Goldreif + Kinnbart',merge(stack(10,[5,9,11,11],'K'),line(13,3,13,'G'),pix([(8,13)],'J'),line(14,3,13,'K')),'schnurr_kinn',extra_d=line(20,5,11,'B'))
# ======================= PIK BUBE =======================
PB=[]
HW=lambda d: d
def pb(label,hat,pal=None,extra=None):
    PB.append((label,art(hat),pal or {},extra))
tufts=pix([(3,15),(3,16),(13,15),(13,16)],'H')
pb('1 Schiebermütze',merge(stack(11,[7,9,11,11],'K'),line(14,3,13,'K'),{14:at(3,'KKKKKKKKKKKK')},tufts))
pb('2 Wuschelkopf',merge(pix([(6,9),(9,9),(12,9),(5,10),(6,10),(8,10),(9,10),(10,10),(12,10)],'H'),{11:ctr('HHH HHHHH',8)},line(12,4,13,'H'),line(13,3,13,'H'),line(14,3,13,'H'),tufts))
pb('3 Seitenscheitel glatt',merge(stack(12,[7,9,11,11],'H'),pix([(6,12),(6,13)],'h'),tufts))
pb('4 Glatze + Mini-Zylinder',merge(stack(8,[5,5,5,5],'K'),{12:ctr('ZZZZZ')},line(13,4,12,'K'),line(14,4,12,'S'),pix([(3,15),(13,15)],'H')))
pb('5 Mütze mit Bommel',merge(pix([(7,9),(8,9),(9,9),(7,10),(8,10),(9,10)],'W'),stack(11,[7,9,11],'K'),line(14,3,13,'W'),tufts))
pb('6 Pilzkopf lang',merge(stack(11,[7,9,11,11],'H'),pix([(x,y) for y in range(15,20) for x in (3,13)],'H')))
pb('7 Hochgekämmt',merge(stack(8,[5,7,9,11,11,11,11],'H'),tufts))
pb('8 Topfschnitt + große Brille',merge(stack(12,[7,9,11,11],'H'),tufts),extra=['brille_l'])
pb('9 Gelehrtenkappe',merge(stack(12,[5,9,11],'K'),line(14,3,13,'K'),pix([(8,11)],'G'),pix([(3,15),(3,16),(13,15),(13,16)],'H')))
pb('10 Haarsträhne links, schwarze Binde',merge(stack(11,[5,9,11],'H'),line(14,3,13,'K'),pix([(4,15),(5,15)],'H'),tufts))
# ======================= PIK DAME =======================
PD=[]
def pd(label,hat,pal=None,extra=None):
    PD.append((label,art(hat),pal or {},extra))
sidehair=lambda ys,xs=(2,3,13,14): pix([(x,y) for y in ys for x in xs],'H')
pd('1 Hochsteck + Fascinator',merge(stack(7,[3,5,7],'H'),stack(10,[9,11,11],'H'),line(13,3,13,'H'),{11:at(8,'KKKKK'),12:at(7,'KKKKKK')},pix([(9,11),(10,11)],'Z'),sidehair(range(14,22))))
pd('2 Mittelscheitel lang + Reif',merge(stack(11,[7,9,11,11],'H'),line(12,3,13,'K'),pix([(8,11),(8,12)],'h'),sidehair(range(14,26))))
pd('3 Damenzylinder + Bob',merge(stack(6,[5,5,5,5,5],'K'),line(11,5,11,'K') and {10:at(6,'ZZZZZ')},line(11,3,13,'K'),stack(12,[9,11,11],'H'),sidehair(range(13,23))))
pd('4 Hexenhut breit',merge(stack(7,[3,5,7,9,9],'K'),{11:at(5,'ZZZZZZZ')},line(12,2,14,'K'),line(13,4,12,'H'),line(14,3,13,'H'),sidehair(range(13,23))))
pd('5 Pixie + schwarze Schleife',merge(stack(11,[7,9,11,11],'H'),pix([(9,10),(10,10)],'H'),pix([(11,11),(12,11),(13,11),(12,12)],'K'),pix([(12,11)],'Z'),sidehair(range(14,19),(3,13))))
pd('6 Weiße Locken',merge(stack(10,[5,9,11,13,13],'H'),pix([(5,11),(8,12),(11,11),(4,13),(8,10),(12,13),(6,14),(10,14),(3,14),(13,14)],'h'),sidehair(range(15,24)),pix([(2,y) for y in (16,19,22)]+[(14,y) for y in (17,20,23)],'h')))
pd('7 Seitenzopf + rote Schleife',merge(stack(11,[7,9,11,11],'H'),pix([(3,15),(3,16),(3,17)],'H'),pix([(x,y) for y in range(15,26) for x in (13,14)],'H'),pix([(13,y) for y in (17,19,21,23)],'h'),pix([(13,15),(14,15)],'Z')))
pd('8 Baskenmütze schief',merge({9:at(8,'K'),10:at(5,'KKKKKKKKK'),11:at(3,'KKKKKKKKKKK'),12:at(3,'KKKKKKKKKKK'),13:at(5,'KKKKKKKK')},line(14,3,13,'H'),sidehair(range(14,22))))
pd('9 Große Schleife + Bob',merge(stack(11,[7,9,11,11],'H'),{8:at(4,'KK    KK'),9:at(3,'KKKK  KKKK'),10:at(4,'KKK ZZ KKK')} and {9:at(4,'KK Z KK'),10:at(3,'KKKK K KKKK'),11:at(4,'KK Z KK')},sidehair(range(14,20))))
pd('10 Fedora schräg + kurzes Haar',merge(stack(8,[5,7,9],'K'),pix([(6,10),(7,10),(8,10),(9,10),(10,10)],'Z') and {11:at(5,'ZZZZZZZ')},line(12,2,14,'K'),line(13,3,13,'H'),line(14,3,13,'H'),sidehair(range(15,19),(3,13))))
pd('11 Zöpfe mit Schleifen',merge(stack(11,[7,9,11,11],'H'),pix([(x,y) for y in range(15,24) for x in (2,3,13,14)],'H'),pix([(x,y) for y in (17,19,21,23) for x in (2,14)],'h'),pix([(2,24),(3,24),(13,24),(14,24)],'K'),pix([(2,25),(3,25),(13,25),(14,25)],'Z')))
if __name__=='__main__':
    sheet('kreuz_koenig',KRK,OUT+'kreuz_koenig.png',title='Kreuz König, zweite Person: Entwürfe')
    sheet('pik_bube',PB,OUT+'pik_bube.png',title='Pik Bube, zweite Person: Entwürfe')
    sheet('pik_dame',PD,OUT+'pik_dame.png',title='Pik Dame, zweite Person: Entwürfe')
