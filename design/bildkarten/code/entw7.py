from paare import *
OUT='/home/user/cheft/design/bildkarten/images/entw/'
# ======================= KREUZ KÖNIG B (Glatze, runder Bart, Mund): Kopfbedeckung =======================
KH=[]
frame=lambda: merge(pix([(3,y) for y in (15,16,17,18)]+[(13,y) for y in (15,16,17,18)],'H'),
    line(19,4,12,'B'),line(20,4,12,'B'),line(21,4,12,'B'),line(22,4,12,'B'),line(23,5,11,'B'),line(24,6,10,'B'),line(20,5,11,'B'),{21:at(7,'MMM')})
dome=lambda: stack(11,[5,7,9,9],'S')
def kh_(label,hat,withdome=True):
    KH.append((label,art(merge(dome() if withdome else {},hat,frame())),{}))
cross=pix([(8,6),(7,7),(8,7),(9,7),(8,8)],'G')
kh_('1 Bügelkrone mit Kreuz',merge(cross,{9:ctr('GGG'),10:ctr('GKKKG'),11:ctr('GKKKKKG'),12:ctr('GKKKKKKKG')},line(13,3,13,'G'),line(14,3,13,'G'),pix([(5,13),(8,13),(11,13)],'J')))
kh_('2 Zackenkrone auf Hermelin',merge(pix([(4,9),(6,9),(8,9),(10,9),(12,9)],'G'),line(10,4,12,'G'),{11:at(4,'GJGGJGGJG')},line(12,3,13,'G'),{13:at(3,'WKWWWKWWWKW')},line(14,3,13,'W')))
kh_('3 Kurhut mit Hermelin',merge(stack(9,[5,9,11,11],'K'),pix([(8,10)],'G'),pix([(7,11),(9,11)],'G'),pix([(8,12)],'J'),{13:at(3,'WKWWWKWWWKW')},line(14,3,13,'W')))
kh_('4 Zinnenkrone',merge({9:at(4,'GG GGG GG'),10:at(4,'GG GGG GG')},line(11,4,12,'G'),{12:at(4,'GGJGGJGGG')},line(13,4,12,'G'),line(14,3,13,'G')))
kh_('5 Breite Eisenkrone mit Perlen',merge(line(10,4,12,'G'),{11:at(4,'GWGWGWGWG')},line(12,3,13,'G'),line(13,3,13,'G'),pix([(5,12),(8,12),(11,12)],'J'),line(14,3,13,'G')))
kh_('6 Perlenkrone',merge(pix([(4,8),(6,8),(8,8),(10,8),(12,8)],'W'),pix([(4,9),(6,9),(8,9),(10,9),(12,9)],'G'),line(10,4,12,'G'),{11:at(4,'GJGGJGGJG')},line(12,3,13,'G'),line(13,3,13,'G'),line(14,3,13,'G')))
kh_('7 Barett mit weißer Feder',merge({10:ctr('KKKKKKK'),11:ctr('KKKKKKKKKKK'),12:ctr('KKKKKKKKKKKKK'),13:ctr('KKKKKKKKKKK'),14:ctr('KKKKKKKKKKK')},pix([(10,9),(11,8),(12,8),(13,9),(13,10),(12,11)],'W'),pix([(5,12)],'G'),pix([(6,12)],'J')))
kh_('8 Kalotte + Goldreif',merge(stack(10,[5,9,11,11],'K'),line(13,3,13,'G'),pix([(8,13)],'J'),line(14,3,13,'K')))
kh_('9 Goldhaube mit schwarzem Kreuz',merge(stack(10,[5,9,11,11,11],'G'),pix([(8,11),(7,12),(8,12),(9,12),(8,13)],'K')))
kh_('10 Pelzhut hoch, Hermelinrand',merge(stack(8,[7,9,9,9,11],'K'),pix([(8,10)],'J'),{13:at(3,'WKWWWKWWWKW')},line(14,3,13,'W')))
kh_('11 Weiße Haube + Goldreif',merge(stack(10,[5,9,11,11],'W'),line(13,3,13,'G'),pix([(8,13)],'J'),line(14,3,13,'W')))
kh_('12 Kleine Krone auf Glatze',merge(pix([(5,11),(7,11),(9,11),(11,11)],'G'),line(12,4,12,'G'),pix([(6,12),(8,12),(10,12)],'J'),line(13,4,12,'G')))
if __name__=='__main__':
    sheet('kreuz_koenig',KH,OUT+'kreuz_koenig_hut.png',title='Kreuz König B: Kopfbedeckung (Glatze, runder Bart, Mund)')
