from paare import *
OUT='/home/user/cheft/design/bildkarten/images/entw/'
# ======================= KREUZ KÖNIG B: Kopfbedeckung, die die Glatze sichtbar lässt =======================
KG=[]
frame=lambda: merge(pix([(3,y) for y in (15,16,17,18)]+[(13,y) for y in (15,16,17,18)],'H'),
    line(19,4,12,'B'),line(20,4,12,'B'),line(21,4,12,'B'),line(22,4,12,'B'),line(23,5,11,'B'),line(24,6,10,'B'),line(20,5,11,'B'),{21:at(7,'MMM')})
dome=lambda: stack(11,[5,7,9,9],'S')
def kg(label,hat,dm=None): KG.append((label,art(merge(dm if dm is not None else dome(),hat,frame())),{}))
kg('1 Schmaler Goldreif mit Stein',merge(line(14,4,12,'G'),pix([(8,14)],'J')))
kg('2 Reif mit kleinen Zacken',merge(pix([(5,13),(7,13),(9,13),(11,13)],'G'),line(14,4,12,'G'),pix([(6,14),(8,14),(10,14)],'J')))
kg('3 Offene Bügelkrone (Haut scheint durch)',merge(pix([(8,8),(7,9),(8,9),(9,9)],'G'),pix([(6,10),(10,10),(5,11),(11,11),(4,12),(12,12)],'G'),pix([(8,10)],'G'),line(13,3,13,'G'),line(14,3,13,'G'),pix([(5,13),(8,13),(11,13)],'J')))
kg('4 Perlenschnur über der Glatze',merge(pix([(5,12),(7,12),(9,12),(11,12)],'W'),pix([(4,13),(12,13)],'W'),line(14,4,12,'G'),pix([(8,14)],'J')))
kg('5 Kleine Krone seitlich aufgesetzt',merge(pix([(9,10),(11,10),(10,11),(12,11)],'G') and merge(pix([(9,10),(11,10),(13,10)],'G'),line(11,9,13,'G'),line(12,9,13,'G'),pix([(10,11),(12,11)],'J'))))
kg('6 Heiligenschein-Reif über dem Kopf',merge(line(8,6,10,'G'),pix([(5,9),(11,9)],'G'),line(10,4,4,'G') if False else {},pix([(5,10),(11,10)],'G'),line(11,6,10,'G') if False else {},pix([(6,11),(10,11)],'G') if False else {}),
   dm=stack(12,[5,7,9],'S'))
kg('7 Krone hinten: nur Zacken am Rand',merge(pix([(4,11),(5,11),(11,11),(12,11),(4,12),(12,12)],'G'),line(14,4,12,'G'),pix([(4,13),(12,13)],'G')))
kg('8 Diadem tief, 3 Zacken an der Stirn',merge(pix([(6,13),(8,12),(10,13)],'G'),line(14,5,11,'G'),pix([(8,13)],'J')))
kg('9 Offene Bügel + Kreuz',merge(pix([(8,6),(7,7),(8,7),(9,7),(8,8)],'G'),pix([(8,9),(7,10),(9,10),(6,11),(10,11),(5,12),(11,12)],'G'),line(13,3,13,'G'),line(14,3,13,'G'),pix([(5,13),(8,13),(11,13)],'J')))
kg('10 Goldspange quer über die Stirn',merge(line(13,4,12,'G'),line(14,4,12,'G'),pix([(6,13),(8,13),(10,13)],'J')))
kg('11 Zwei Goldbänder (Doppelreif)',merge(line(12,4,12,'G'),line(14,4,12,'G'),pix([(8,12)],'J')))
kg('12 Ohrbügel-Krone (Reif von Ohr zu Ohr)',merge(pix([(3,13),(3,14),(13,13),(13,14),(4,12),(12,12),(5,11),(11,11),(6,10),(10,10),(7,10),(9,10),(8,10)],'G'),pix([(8,10)],'J')))
if __name__=='__main__':
    sheet('kreuz_koenig',KG,OUT+'kreuz_koenig_glatze.png',title='Kreuz König B: Kopfbedeckung, Glatze bleibt sichtbar')
