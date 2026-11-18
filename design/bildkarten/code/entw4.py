from paare import *
WHITE=C['white']; BLACK=C['ink']; HBROWN=HAIR['C']
OUT='/home/user/cheft/design/bildkarten/images/entw/'
# ======================= PIK BUBE v2: ohne Brille, teils schwarzes Haar =======================
PB=[]
BK=dict(H=BLACK)
def pb(label,d,pal=None,extra=()):
    PB.append((label,art(d),pal or {},list(extra)))
tufts=lambda: pix([(3,15),(3,16),(13,15),(13,16)],'H')
pb('1 Schwarzer Scheitel, Koteletten',merge(stack(12,[7,9,11,11],'H'),pix([(6,12),(6,13)],'w'),tufts(),pix([(3,17),(13,17),(3,18),(13,18)],'H')),BK,['brauen_3'])
pb('2 Schwarzer Igel',merge(pix([(5,9),(7,9),(9,9),(11,9),(5,10),(6,10),(7,10),(8,10),(9,10),(10,10),(11,10)],'H'),line(11,4,12,'H'),line(12,4,12,'H'),line(13,3,13,'H'),line(14,3,13,'H'),tufts()),BK,['brauen_3'])
pb('3 Augenklappe + schwarze Tolle',merge(stack(12,[7,9,11,11],'H'),stack(10,[3,5],'H',c=10),tufts()),BK,['augenklappe'])
pb('4 Narbe + weißer Pilz',merge(stack(11,[7,9,11,11],'H'),pix([(x,y) for y in range(15,19) for x in (3,13)],'H')),None,['narbe','brauen_3'])
pb('5 Domino + Mini-Zylinder',merge(stack(8,[5,5,5,5],'K'),{12:ctr('ZZZZZ')},line(13,4,12,'K'),line(14,4,12,'H'),tufts()),BK,['domino'])
pb('6 Schwarze Kapuze',merge(stack(10,[5,9,11,11,11],'K'),pix([(x,y) for y in range(15,21) for x in (3,13)],'K'),pix([(x,y) for y in range(19,22) for x in (4,12)],'K')),None,['brauen_3'])
pb('7 Schwarz mit weißer Strähne',merge(stack(11,[7,9,11,11],'H'),pix([(8,10),(9,10),(9,11),(10,11),(10,12),(10,13)],'W'),tufts()),BK,['brauen_3'])
pb('8 Schiebermütze, Schwarzhaar',merge(stack(11,[7,9,11,11],'K'),{14:at(3,'KKKKKKKKKKKK')},pix([(3,15),(3,16),(13,15),(13,16),(3,17),(13,17)],'H')),BK,['brauen_boese'])
pb('9 Vampir: Fangs + Tolle',merge(stack(12,[7,9,11,11],'H'),stack(10,[3,5],'H',c=7),tufts()),BK,['fangs','brauen_boese'])
pb('10 Weißes Haar kurz, böse Brauen',merge(stack(12,[7,9,11,11],'H'),tufts()),None,['brauen_boese'])
pb('11 Weiß + Narbe + Augenklappe',merge(stack(11,[7,9,11,11],'H'),tufts()),None,['augenklappe','narbe'])
pb('12 Schwarz lang, Mittelscheitel',merge(stack(11,[7,9,11,11],'H'),pix([(8,11),(8,12)],'w'),pix([(x,y) for y in range(15,22) for x in (3,4,12,13)],'H')),BK,['brauen_3'])
# ======================= PIK DAME v2: Baskenmütze, andere/keine Brille, Brauen =======================
PD=[]
def pd(label,d,pal=None,extra=()):
    PD.append((label,art(d),pal or {},list(extra)))
sh=lambda ys,xs=(2,3,13,14): pix([(x,y) for y in ys for x in xs],'H')
beret=lambda: merge({9:at(8,'K'),10:at(5,'KKKKKKKKK'),11:at(3,'KKKKKKKKKKK'),12:at(3,'KKKKKKKKKKK'),13:at(5,'KKKKKKKK')})
bh=lambda end=21: merge(line(14,3,13,'H'),sh(range(14,end+1)))
M='mund_schmal'
pd('1 Beret, keine Brille, schwarze Brauen',merge(beret(),bh()),None,[M,'brauen_3'])
pd('2 Beret, weiße Brauen',merge(beret(),bh()),None,[M,'brauen'])
pd('3 Beret, böse Brauen',merge(beret(),bh()),None,[M,'brauen_boese'])
pd('4 Beret, kleine Brille',merge(beret(),bh()),None,[M,'brille_s'])
pd('5 Beret, Monokel',merge(beret(),bh()),None,[M,'monokel_m'])
pd('6 Beret, Domino-Maske',merge(beret(),bh()),None,[M,'domino'])
pd('7 Beret + roter Stiel, Brauen',merge(beret(),pix([(8,8)],'Z'),bh()),None,[M,'brauen_3'])
pd('8 Beret schief links, lange Haare',merge({10:at(3,'KKKKKKKKK'),11:at(2,'KKKKKKKKKKK'),12:at(2,'KKKKKKKKKKK'),13:at(4,'KKKKKKKK'),9:at(6,'KK')},bh(25)),None,[M,'brauen_3','schminke'])
pd('9 Beret + Zopf rechts, Brauen',merge(beret(),line(14,3,13,'H'),sh(range(14,19),(2,3)),pix([(x,y) for y in range(14,25) for x in (13,14)],'H'),pix([(13,y) for y in (16,18,20,22)],'h'),pix([(13,25),(14,25)],'Z')),None,[M,'brauen_3'])
pd('10 Beret + Schönheitspunkt',merge(beret(),bh()),None,[M,'brauen_3','schoenheitspunkt'])
pd('11 Beret, runde Brille + Brauen',merge(beret(),bh()),None,[M,'brille_m'])
# ======================= Kreuz König 3: ohne Lorbeer, längere Bärte =======================
KRK=[]
dome=lambda: merge(stack(11,[5,7,9,9],'S'))
def krk(label,beardd,pal=None,hairx=None,mou=True):
    d=merge(dome(),pix([(3,y) for y in (15,16,17,18)]+[(13,y) for y in (15,16,17,18)],'H'),pix([(3,15),(13,15)],'S') if False else {},beardd)
    if mou: d=merge(d,line(20,5,11,'B'))
    if hairx: d=merge(d,hairx)
    KRK.append((label,art(d),pal or {}))
krk('1 wie 3, Vollbart kurz (Referenz)',beard('voll_kurz'))
krk('2 Vollbart lang',beard('lang'))
krk('3 Vollbart extra lang',merge(beard('lang'),line(26,6,10,'B'),line(27,7,9,'B'),line(28,8,8,'B')))
krk('4 Gabelbart lang',merge(beard('gabel'),line(25,5,6,'B'),line(25,10,11,'B'),line(26,5,5,'B'),line(26,11,11,'B'),line(27,4,5,'B') if False else {}))
krk('5 Spitzbart sehr lang',merge(line(19,4,12,'B'),line(20,4,12,'B'),line(21,4,12,'B'),line(22,5,11,'B'),line(23,6,10,'B'),line(24,7,9,'B'),line(25,7,9,'B'),line(26,8,8,'B'),line(27,8,8,'B'),line(28,8,8,'B')),mou=False)
krk('6 Kinnbart lang + Schnurr',merge(line(22,7,9,'B'),line(23,7,9,'B'),line(24,7,9,'B'),line(25,7,9,'B'),line(26,8,8,'B'),line(27,8,8,'B')))
krk('7 Geflochten (Zopfbart)',merge(line(19,4,12,'B'),line(20,4,12,'B'),line(21,4,12,'B'),line(22,5,11,'B'),line(23,6,10,'B'),wave(24,29,7,9,'B','h',1)))
krk('8 Zwei Zöpfe',merge(line(19,4,12,'B'),line(20,4,12,'B'),line(21,4,12,'B'),line(22,5,11,'B'),wave(23,29,5,6,'B','h',1),wave(23,29,10,11,'B','h',1)))
krk('9 Backen + langer Kinnbart',merge(pix([(4,y) for y in range(18,24)]+[(12,y) for y in range(18,24)],'B'),line(22,6,10,'B'),line(23,7,9,'B'),line(24,7,9,'B'),line(25,7,9,'B'),line(26,8,8,'B'),line(27,8,8,'B'),line(28,8,8,'B')))
krk('10 Welliger Vollbart lang',merge(line(19,4,12,'B'),line(20,4,12,'B'),line(21,4,12,'B'),line(22,4,12,'B'),line(23,5,11,'B'),line(24,4,12,'B'),line(25,5,11,'B'),line(26,6,10,'B'),line(27,7,9,'B'),line(28,8,8,'B')))
krk('11 Lang mit weißen Strähnen',merge(beard('lang'),pix([(6,23),(10,23),(7,25),(9,25),(5,21),(11,21)],'w')))
krk('12 Sehr schmal und lang',merge(line(21,6,10,'B'),line(22,6,10,'B'),line(23,7,9,'B'),line(24,7,9,'B'),line(25,7,9,'B'),line(26,7,9,'B'),line(27,8,8,'B'),line(28,8,8,'B'),line(29,8,8,'B')))
if __name__=='__main__':
    sheet('pik_bube',PB,OUT+'pik_bube_2.png',title='Pik Bube: ohne Brille, teils schwarzes Haar')
    sheet('pik_dame',PD,OUT+'pik_dame_2.png',title='Pik Dame Baskenmütze: andere oder keine Brille, Brauen')
    sheet('kreuz_koenig',KRK,OUT+'kreuz_koenig_bart.png',title='Kreuz König 3: ohne Lorbeer, längere Bärte')
