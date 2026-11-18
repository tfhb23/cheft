from paare import *
GOLD2=hx('c8902a'); RED=C['red']; WHITE=C['white']; BLACK=C['ink']
OUT='/home/user/cheft/design/bildkarten/images/entw/'
GOLDF=dict(F=C['gold'],Y=GOLD2)
# ======================= KARO DAME v2: deutlich anders als die Vorlage =======================
KD=[]
def kd(label,d,pal=None,extra=None): KD.append((label,art(d),pal or {},extra))
sideH=lambda ys,xs: pix([(x,y) for y in ys for x in xs],'H')
dframe=lambda end=18,top=True: merge(line(15,3,13,'H') if top else {},sideH(range(15,end+1),(3,4,12,13)))
# 1/2 Yashmak (Schleier über dem Unterkopf)
kd('1 Yashmak weiß + Goldtuch',merge(stack(10,[7,9,11,11],'G'),line(14,3,13,'G'),sideH(range(15,19),()),pix([(x,y) for y in range(15,20) for x in (3,4,12,13)],'G'),pix([(8,15)],'J'),
   line(19,4,12,'V'),line(20,4,12,'W'),line(21,4,12,'W'),line(22,5,11,'W'),line(23,7,9,'W')))
kd('2 Yashmak gold + Haarflut',merge(stack(11,[7,9,11,11],'H'),line(13,4,12,'G'),pix([(8,13)],'J'),sideH(range(15,24),(2,3,13,14)),
   line(19,4,12,'G'),line(20,4,12,'G'),line(21,4,12,'G'),line(22,5,11,'G'),line(23,7,9,'G'),pix([(6,20),(8,20),(10,20),(7,21),(9,21)],'J')))
kd('3 Lange Zöpfe vorn + Goldmütze',merge(stack(11,[7,9,11,11],'G'),pix([(8,12)],'J'),line(14,3,13,'H'),sideH(range(15,18),(3,4,12,13)),
   wave(18,26,2,3,'H','h',1) ,wave(18,26,13,14,'H','h',1),pix([(2,27),(3,27),(13,27),(14,27)],'G')))
kd('4 Seitendutt rechts, rotes Band',merge(stack(12,[7,9,11],'H'),line(13,3,13,'R'),stack(9,[3,5,5],'H',c=12),line(14,3,13,'H'),sideH(range(15,22),(3,4)),sideH(range(15,17),(13,))))
kd('5 Tantur mit Schleier',merge(stack(6,[1,3,3,5,5,7,9,11],'G'),pix([(8,10),(8,12)],'J'),line(14,3,13,'H'),sideH(range(15,19),(3,4,12,13)),
   pix([(9,7),(10,8),(11,9),(12,10),(13,11),(14,12),(14,13)],'W') ,pix([(x,y) for y in range(14,23) for x in (14,)],'W'),pix([(13,y) for y in range(15,23)],'W')))
kd('6 Haarnetz mit Goldfäden',merge(stack(6,[3,5,7,9,9,11,11],'H'),pix([(7,7),(9,7),(6,8),(8,8),(10,8),(7,9),(9,9),(6,10),(8,10),(10,10),(5,11),(7,11),(9,11),(11,11),(4,12),(6,12),(8,12),(10,12),(12,12)],'G'),line(13,3,13,'G'),line(14,3,13,'H'),sideH(range(15,19),(3,4,12,13))))
kd('7 Pagen asymmetrisch + Rubin',merge(stack(12,[7,9,11],'H'),line(13,4,12,'G'),pix([(8,13)],'R'),line(14,3,13,'H'),sideH(range(15,23),(3,4)),sideH(range(15,18),(12,13)),pix([(3,20),(4,20),(3,21),(4,21)],'G'),pix([(13,20),(12,20),(13,21),(12,21)],'G')),extra=['schoenheitspunkt'])
kd('8 Münzkrone + Seitenscheitel',merge(stack(11,[7,9,11,11],'H'),{13:at(3,'GHGHGHGHGHG')},line(14,3,13,'H'),sideH(range(15,24),(3,4)),sideH(range(15,19),(12,13)),pix([(8,14)],'J'),pix([(5,15),(6,15),(6,16)],'H')))
kd('9 Federdiadem',merge(rows(5,'     F  F  F    ','     F  F  F    ','     F  FF F    ','      FFFFF     ','       FFF      '),stack(10,[7,9,11,11],'H'),line(12,4,12,'G'),pix([(8,12)],'J'),line(14,3,13,'H'),sideH(range(15,19),(3,4,12,13)),pix([(3,20),(3,21),(13,20),(13,21)],'G')),pal=GOLDF)
kd('10 Goldtuch, Knoten rechts',merge(stack(10,[7,9,11,11],'G'),pix([(8,11)],'J'),line(14,3,13,'G'),pix([(13,12),(14,13),(14,14),(13,15),(14,16),(14,17)],'G'),sideH(range(15,23),(3,4)),pix([(12,15),(12,16),(13,16)],'H')))
kd('11 Sonnenscheibe + Haar offen',merge(stack(6,[3,5,5,5,3],'G'),pix([(8,8)],'J'),stack(11,[7,9,11,11],'H'),line(13,4,12,'G'),sideH(range(15,24),(2,3,13,14)),pix([(3,20),(3,21),(13,20),(13,21)],'G')))
kd('12 Reifohrringe + Kurzhaar',merge(stack(11,[7,9,11,11],'H'),pix([(7,10),(8,10),(9,10)],'H'),line(14,3,13,'H'),sideH(range(15,19),(3,4,12,13)),
   pix([(3,19),(2,20),(2,21),(3,22),(13,19),(14,20),(14,21),(13,22)],'G')),extra=['schminke'])
# ======================= KARO BUBE: mehr Locken (Takke bleibt) =======================
KB=[]
takke=lambda: merge(stack(10,[5,9,11,11],'A'),pix([(6,12),(8,12),(10,12)],'G'),line(14,4,12,'G'))
def kb(label,hair,extra_hat=None):
    KB.append((label,art(merge(takke(),hair,extra_hat or {})),dict(A=RED)))
base_h=lambda end=19: merge(line(15,4,12,'H'),pix([(4,y) for y in range(15,end+1)]+[(12,y) for y in range(15,end+1)],'H'),pix([(3,y) for y in (15,16,17)]+[(13,y) for y in (15,16,17)],'H'))
kb('1 wie 10 (Referenz)',merge(base_h(19),pix([(3,y) for y in range(18,22)]+[(13,y) for y in range(18,22)],'H')))
kb('2 Ringellocken, 2 Spalten',merge(line(15,4,12,'H'),wave(15,24,2,3,'H','h',2),wave(15,24,13,14,'H','h',2),pix([(4,y) for y in range(15,19)]+[(12,y) for y in range(15,19)],'H')))
kb('3 Zickzack-Locken',merge(line(15,4,12,'H'),pix([(4,y) for y in range(15,19)]+[(12,y) for y in range(15,19)],'H'),
   pix([(3,15),(3,16),(2,17),(2,18),(3,19),(3,20),(2,21),(2,22),(3,23)],'H'),pix([(13,15),(13,16),(14,17),(14,18),(13,19),(13,20),(14,21),(14,22),(13,23)],'H'),
   pix([(2,19),(3,18),(2,23),(3,22)],'h'),pix([(14,19),(13,18),(14,23),(13,22)],'h')))
kb('4 Schwung links lang, rechts kurz',merge(base_h(18),pix([(2,y) for y in range(17,25)]+[(3,y) for y in range(19,26)],'H'),pix([(2,20),(3,22),(2,24)],'h'),pix([(14,17),(14,18)],'H')))
kb('5 Stirnlocken + Seiten',merge({15:at(4,'HhHhHhHhH')},pix([(5,16),(8,16),(11,16),(5,17)] if False else [(5,16),(8,16),(11,16)],'H'),pix([(x,y) for y in range(16,21) for x in (3,4,12,13)],'H'),pix([(3,21),(2,21),(13,21),(14,21)],'H')))
kb('6 Buschig, 3 breit',merge(line(15,4,12,'H'),wave(15,22,2,4,'H','h',2),wave(15,22,12,14,'H','h',2)))
kb('7 Schwung rechts mit Spirale',merge(base_h(17),pix([(x,y) for y in range(18,24) for x in (12,13,14)],'H'),pix([(14,24),(13,24),(12,24),(11,24),(11,23)],'H'),pix([(13,20),(12,22)],'h'),pix([(3,18),(3,19)],'H')))
kb('8 Locken + Goldringe',merge(line(15,4,12,'H'),wave(15,23,2,3,'H','h',2),wave(15,23,13,14,'H','h',2),pix([(4,y) for y in range(15,19)]+[(12,y) for y in range(15,19)],'H'),pix([(2,24),(3,24),(13,24),(14,24)],'G'),pix([(3,20),(13,20)],'G')))
kb('9 Locken quellen unter der Takke',merge(pix([(4,13),(12,13),(3,14),(13,14),(3,13),(13,13)],'H'),line(15,4,12,'H'),wave(15,22,2,3,'H','h',2),wave(15,22,13,14,'H','h',2),pix([(4,y) for y in range(15,18)]+[(12,y) for y in range(15,18)],'H')))
kb('10 Locken + Quaste',merge(base_h(18),wave(18,23,2,3,'H','h',2),wave(18,23,13,14,'H','h',2),pix([(13,11),(14,12),(14,13),(14,14)],'G')))
if __name__=='__main__':
    sheet('karo_dame',KD,OUT+'karo_dame_2.png',title='Karo Dame: neue Entwürfe, deutlich anders als die Vorlage')
    sheet('karo_bube',KB,OUT+'karo_bube_locken.png',title='Karo Bube 10: mehr Locken und Schwung')
