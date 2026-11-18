from paare import *
R_=C['red']
def A_(*ds): return art(*ds)
HK=[]
def hk(label,hat,beard_kind='lang',pal=None,extra_hair=None,top=True):
    d=merge(hat,kh(top=top),beard(beard_kind))
    if extra_hair: d=merge(d,extra_hair)
    HK.append((label,art(d),pal or {}))
band=lambda: line(14,3,13,'G')
# 1 Safawiden-Taj: weißer Turban um roten Stab
hk('1 Taj mit rotem Stab',merge(rows(5,'        R       ','       LRR      ','       LRR      ','       LRR      ','       LRR      '),
   stack(10,[7,9,11,11],'A'),line(12,3,13,'a'),pix([(8,13)],'J'),band()),'lang')
# 2 Kuppelturban, Rubin in Goldfassung
hk('2 Kuppel + Rubin',merge(stack(8,[3,7,9,11,11],'A'),line(13,3,13,'a'),pix([(7,11),(9,11)],'G'),pix([(8,11)],'J'),band()),'gabel')
# 3 Kappe mit Goldstickerei
hk('3 Kappe + Gold',merge(stack(11,[5,7,9],'A'),line(14,3,13,'G'),rows(13,'  AAAAAAAAAAA   '),pix([(5,12),(7,12),(9,12),(11,12)],'G') if False else {},pix([(6,13),(8,13),(10,13)],'G')),'rund')
# 4 rote Kalpak mit weißem Pelzband
hk('4 Rote Kalpak',merge(stack(9,[7,9,9,9],'A'),line(13,3,13,'W'),pix([(8,11)],'J'),band()),'spitz',pal=dict(A=R_))
# 5 weißer Turban, zwei Goldbänder
hk('5 Zwei Goldbänder',merge(stack(10,[5,9,11],'A'),line(13,3,13,'G'),line(12,3,13,'a') if False else {},pix([(8,11)],'J'),line(14,3,13,'G')),'doppelspitz')
# 6 Dichter-Weiser: graues Haar, Goldreif, rote Rose
hk('6 Weiser + Rose',merge(stack(10,[5,9,11],'H'),line(13,4,12,'G'),pix([(11,12),(12,12)],'R'),pix([(12,13)],'R'),pix([(12,11)],'L'),line(14,3,13,'H'),
   {y:at(3,'H')+' '*9+at(13,'H')[13:] for y in range(19,23)} if False else {}, pix([(3,y) for y in range(19,23)]+[(13,y) for y in range(19,23)],'H')),'lang',extra_hair=None,top=False)
# 7 gewickelter Turban, Stufen
hk('7 Gewickelt',merge(stack(7,[3,5,7,9,11],'A'),line(9,6,10,'a'),line(11,4,12,'a'),line(13,3,13,'a'),pix([(8,12)],'J'),band()),'mittel')
# 8 Turban mit weißer Reiherfeder
hk('8 Reiher weiß',merge(rows(6,'          W     ','         WW     ','        WW      ','        W       '),stack(10,[7,9,11,11],'A'),line(12,3,13,'a'),pix([(8,13)],'J'),band()),'gabel',pal=dict())
# 9 Niedriger Turban, Goldkrone-Reif
hk('9 Turban flach + Reif',merge(stack(11,[7,9,11],'A'),line(14,3,13,'G'),line(13,3,13,'a'),pix([(5,12),(8,12),(11,12)],'G')),'kurz')
# 10 Mond-Turban: goldene Mondsichel vorn
hk('10 Mond-Turban',merge(stack(9,[5,9,11,11],'A'),line(13,3,13,'a'),pix([(6,11),(10,11)],'G'),pix([(7,12),(8,12),(9,12)],'G'),band()),'lang')
# 11 Dichterkappe: spitz zulaufend, rot mit Goldrand
hk('11 Spitzkappe rot',merge(stack(7,[1,3,5,7,9,11],'A'),line(13,3,13,'G'),pix([(8,11)],'J'),line(14,3,13,'W')),'mittel',pal=dict(A=R_))
# 12 Turban mit herabhängendem Tuchende rechts (asymmetrisch)
hk('12 Tuchende rechts',merge(stack(10,[7,9,11,11],'A'),line(12,3,13,'a'),pix([(8,13)],'J'),band(),
   pix([(x,y) for y in range(15,20) for x in (13,14)]+[(12,19),(12,20)],'A')),'gabel')
if __name__=='__main__':
    sheet('herz_koenig',HK,'/home/user/cheft/design/bildkarten/images/entw/herz_koenig.png',title='Herz König, zweite Person: Entwürfe')
