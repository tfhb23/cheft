from paare import *
GOLD2=hx('c8902a'); RED=C['red']; WHITE=C['white']
OUT='/home/user/cheft/design/bildkarten/images/entw/'
# ======================= KARO KÖNIG =======================
KK=[]
def kk(label,hat,bk='lang',pal=None,top=True,extra_d=None):
    d=merge(hat,kh(top=top))
    if bk: d=merge(d,beard(bk))
    if extra_d: d=merge(d,extra_d)
    KK.append((label,art(d),pal or {}))
FEATHER=dict(F=C['gold'],Y=GOLD2)
kk('1 Zwiebelkrone',merge(stack(6,[1,3,5,7,5,7,9,11],'A'),line(14,3,13,'G'),pix([(8,11),(8,13)],'J')),'lang')
kk('2 Nemes (Pharao)',merge(stack(9,[7,9,11,11,11,11],'A'),line(12,3,13,'R'),pix([(8,10)],'J'),line(14,3,13,'G'),
    pix([(2,y) for y in range(15,23)]+[(3,y) for y in range(15,23)]+[(13,y) for y in range(15,23)]+[(14,y) for y in range(15,23)],'A'),
    pix([(x,y) for y in (17,20) for x in (2,3,13,14)],'R')),'schnurr_kinn',top=False)
kk('3 Roter Turban + Reiher',merge(rows(6,'          F     ','         FF     ','         FF     ','        FF      '),stack(10,[5,9,11,11],'A'),line(12,3,13,'a'),pix([(8,13)],'J'),line(14,3,13,'G')),'doppelspitz',pal=dict(A=RED,**FEATHER))
kk('4 Bügelkrone Samt',merge(rows(8,'        G       '),stack(9,[3],'G'),
    {10:ctr('GRRRG'),11:ctr('GRRRRRG'),12:ctr('GRRRRRRRG')},line(13,3,13,'G'),line(14,3,13,'G'),pix([(5,13),(8,13),(11,13)],'J')),'rund')
kk('5 Zackenkrone + Locken',merge(pix([(4,9),(6,9),(8,9),(10,9),(12,9),(4,10),(6,10),(8,10),(10,10),(12,10)],'G'),line(11,4,12,'G'),at(4,'GJGGJGGJG') and {12:at(4,'GJGGJGGJG')},line(13,4,12,'G'),line(14,3,13,'H'),
    pix([(x,y) for y in range(15,24) for x in (2,3,13,14)],'H')),'kurz',top=True)
kk('6 Goldpapakha + Rotband',merge(stack(8,[7,9,9,9,11],'A'),line(13,3,13,'R'),pix([(8,13)],'J'),line(14,3,13,'G')),'spitz')
kk('7 Kopftuch + Goldringe',merge(stack(10,[7,9,11,11],'A'),line(12,3,13,'G'),line(14,3,13,'G'),
    pix([(x,y) for y in range(15,21) for x in (2,3,13,14)],'A')),'gabel',pal=dict(A=WHITE),top=False)
kk('8 Mähne + Goldreif',merge(stack(10,[5,9,11,11,11],'H'),line(12,4,12,'G'),pix([(8,12)],'J'),
    pix([(x,y) for y in range(15,25) for x in (2,3,13,14)],'H')),'lang',top=False)
kk('9 Zweistufiger Turban gold/rot',merge(stack(7,[5,7,9],'A'),line(10,3,13,'G'),stack(11,[9,11,11],'R'),pix([(8,12)],'J'),line(14,3,13,'G')),'lang')
# ======================= KARO DAME =======================
KD=[]
def dh(top=True,sidew=2,end=18,ch='H'):
    d={}
    if top: d=merge(d,line(15,3,13,ch))
    for y in range(15,end+1):
        for k in range(sidew): d=merge(d,pix([(3+k,y),(13-k,y)],ch))
    return d
EAR=pix([(3,20),(3,21),(13,20),(13,21)],'G')
def kd(label,hat,pal=None,hair=None,ear=True):
    d=merge(hat,hair if hair is not None else dh())
    if ear: d=merge(d,EAR)
    KD.append((label,art(d),pal or {}))
kd('1 Zopfkrone + Goldband',merge(stack(9,[3,5],'H'),{11:ctr('hHhHhHh'),12:ctr('HhHhHhHhH'),13:ctr('hHhHhHhHhHh')},line(14,3,13,'G'),pix([(8,14)],'J')))
kd('2 Goldhaube + Stirnjuwel',merge(stack(9,[5,9,11,11,11],'G'),pix([(5,12),(8,12),(11,12)],'J'),line(14,3,13,'H'),pix([(8,14)],'G'),pix([(8,15)],'J')))
kd('3 Offenes Haar + Reif',merge(stack(11,[7,9,11,11],'H'),line(13,4,12,'G'),pix([(8,13)],'J')),hair=merge(dh(sidew=2,end=18),pix([(x,y) for y in range(19,25) for x in (2,3,13,14)],'H')),ear=False)
kd('4 Kleiner roter Turban',merge(stack(9,[5,9,11,11],'A'),line(12,3,13,'a'),pix([(7,13),(9,13)],'G'),pix([(8,13)],'J'),line(14,3,13,'G')),pal=dict(A=RED,a=GOLD2))
kd('5 Hochsteck + Münzband',merge(stack(8,[3,5,7,9],'H'),line(12,3,13,'H'),line(13,3,13,'H'),at(3,'GHGHGHGHGHG') and {14:at(3,'GHGHGHGHGHG')}))
kd('6 Kleine Krone + Strähnen',merge(pix([(6,11),(8,11),(10,11)],'G'),line(12,4,12,'G'),pix([(6,12),(8,12),(10,12)],'J'),line(13,3,13,'H'),line(14,3,13,'H')),
   hair=merge(dh(),pix([(3,y) for y in (16,18,20)]+[(13,y) for y in (16,18,20)],'J')))
kd('7 Hohes Hochsteck + Nadel',merge(stack(6,[3,5,7,9],'H'),stack(10,[9,11,11],'H'),line(13,4,12,'G'),pix([(8,13)],'J'),pix([(11,7),(11,8),(11,9)],'G'),line(14,3,13,'H')))
kd('8 Pagenkopf + Stirnband',merge(stack(12,[7,9,11],'H'),line(13,4,12,'G'),pix([(8,13)],'J')),hair=dh(sidew=2,end=21))
kd('9 Goldschleier',merge(stack(10,[5,9,11,11],'G'),pix([(x,y) for y in range(14,23) for x in (2,3,13,14)],'G'),pix([(8,14)],'J')),hair=merge(line(15,5,11,'H'),pix([(4,y) for y in (15,16,17,18)]+[(12,y) for y in (15,16,17,18)],'H')))
kd('10 Haarturban rot',merge(stack(8,[5,9,11,11],'H'),line(12,3,13,'R'),line(13,3,13,'R'),pix([(8,12)],'J'),pix([(3,12),(3,13)],'L'),line(14,3,13,'H')),hair=dh(sidew=2,end=18))
# ======================= KARO BUBE =======================
KB=[]
def bh(top=True,end=19,outer=True,ch='H'):
    d={}
    if top: d=merge(d,line(15,4,12,ch))
    for y in range(15,end+1): d=merge(d,pix([(4,y),(12,y)],ch))
    if outer: d=merge(d,pix([(3,y) for y in (15,16,17)]+[(13,y) for y in (15,16,17)],ch))
    return d
def kb(label,hat,pal=None,hair=None):
    KB.append((label,art(merge(hat,hair if hair is not None else bh())),pal or {}))
kb('1 Fez schief + Quaste',merge(stack(9,[5,7],'A',c=10),stack(11,[7,7],'A',c=9),stack(13,[7,9],'A',c=8),pix([(13,9),(14,10),(14,11)],'G')),pal=dict(A=RED))
kb('2 Tarbusch + Goldborte',merge(stack(9,[7,7,7],'A'),line(12,4,12,'G'),stack(13,[9,9],'A')),pal=dict(A=RED))
kb('3 Kleiner Turban',merge(stack(8,[3,5,7,9,9],'A'),line(11,4,12,'a'),stack(13,[11],'A'),line(14,4,12,'G'),pix([(8,12)],'J')),pal=dict(A=RED))
kb('4 Zipfelmütze',merge(pix([(9,5),(10,5)],'G'),pix([(9,6)],'A'),stack(7,[1,3,5,7,9,11],'A') and {7:ctr('A'),8:ctr('AAA'),9:ctr('AAAAA'),10:ctr('AAAAAAA'),11:ctr('AAAAAAAAA'),12:ctr('AAAAAAAAAAA'),13:ctr('AAAAAAAAAAA')},line(14,4,12,'G')),pal=dict(A=RED))
kb('5 Locken + Goldstirnband',merge(stack(9,[5,9,11,11,11],'H'),line(14,4,12,'G'),pix([(8,14)],'J'),pix([(x,y) for y in range(15,20) for x in (3,13)],'H')),hair=merge(pix([(4,y) for y in range(15,20)]+[(12,y) for y in range(15,20)],'H')))
kb('6 Goldtuch mit Knoten',merge(stack(11,[9,11,11],'G'),line(14,3,13,'G'),pix([(13,12),(14,13),(14,14),(14,15),(13,16)],'G')))
kb('7 Hoher Fez + Münze',merge(stack(7,[5,7,7,7,7,7,9],'A'),pix([(8,11)],'G'),pix([(7,11),(9,11)],'G'),line(14,4,12,'A')),pal=dict(A=RED))
kb('8 Kalpak + goldene Feder',merge(rows(5,'          F     ','         FF     ','         FF     ','        FF      '),stack(9,[7,7,7,7,9],'A'),line(14,4,12,'G')),pal=dict(A=RED,**FEATHER))
kb('9 Pagenkopf + Reif',merge(stack(12,[7,9,11],'H'),line(13,4,12,'G'),pix([(8,13)],'J')),hair=bh(end=21))
kb('10 Takke + Locken',merge(stack(10,[5,9,11,11],'A'),pix([(6,12),(8,12),(10,12)],'G'),line(14,4,12,'G')),pal=dict(A=RED),hair=merge(bh(end=19),pix([(3,y) for y in range(18,22)]+[(13,y) for y in range(18,22)],'H')))
kk('10 Goldhelm mit Rotkamm',merge(stack(6,[1,3],'R'),stack(8,[5,9,11,11,11],'A'),line(13,3,13,'G'),pix([(8,11)],'J'),line(14,3,13,'A'),
    pix([(3,y) for y in range(15,20)]+[(13,y) for y in range(15,20)],'G')),'spitz',top=True)
if __name__=='__main__':
    sheet('karo_koenig',KK,OUT+'karo_koenig.png',title='Karo König, zweite Person: Entwürfe')
    sheet('karo_dame',KD,OUT+'karo_dame.png',title='Karo Dame, zweite Person: Entwürfe')
    sheet('karo_bube',KB,OUT+'karo_bube.png',title='Karo Bube, zweite Person: Entwürfe')
