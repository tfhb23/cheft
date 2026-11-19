from paare import *
GOLD2=hx('c8902a'); RED=C['red']; HB=HAIR['H']
OUT='/home/user/cheft/design/bildkarten/images/entw/'
HK=[]
BR=dict(H=HB,B=HB)     # braunes Haar (Token 1.26); Standard der Basis ist graues Haar (1.29)
def hk(label,hat,bk='keiner',pal=None,top=True,extra=None):
    d=merge(hat,kh(top=top,cheek=None),beard2(bk))
    if extra: d=merge(d,extra)
    HK.append((label,art(d),pal or {}))
quill=lambda: merge(pix([(14,8),(14,9),(14,10),(13,11),(13,12),(13,13)],'F'),pix([(13,14)],'Y'))
hk('1 Rote Kolah, braunes Haar',merge(stack(7,[5,7,7,7,9,9],'A'),line(13,3,13,'G'),pix([(8,13)],'J'),line(14,3,13,'H')),'schnurr_lang',pal=dict(A=RED,**BR))
hk('2 Dreibogen-Goldkrone, graues Haar',merge(pix([(8,7),(8,8),(4,9),(8,9),(12,9)],'G'),line(10,4,5,'G'),line(10,7,9,'G'),line(10,11,12,'G'),line(11,4,12,'G'),line(12,3,13,'G'),pix([(6,12),(8,12),(10,12)],'J'),line(13,3,13,'G'),line(14,3,13,'H')),'schnurr')
hk('3 Braunes Haar, Goldreif, Rose + Schreibfeder',merge(stack(10,[5,9,11,11,11],'H'),line(12,4,12,'G'),pix([(8,12)],'J'),rose(3,17),quill()),pal=BR,top=True)
hk('4 Rote Takke, Goldstickerei, Rose',merge(stack(10,[5,9,11,11],'A'),pix([(6,12),(8,12),(10,12)],'G'),line(14,4,12,'G'),rose(12,11)),'kinn',pal=dict(A=RED))
hk('5 Roter Turban, goldene Feder links',merge(rows(5,'    F           ','    FF          ','     FF         ','      F         '),stack(9,[5,9,11,11],'A'),line(12,3,13,'G'),line(13,3,13,'a'),pix([(8,13)],'J'),line(14,3,13,'G')),'schnurr_kinn',pal=dict(A=RED))
hk('6 Rosenkranz auf braunem Haar',merge(stack(10,[5,9,11,11],'H'),{13:at(3,'GRGRGRGRGRG')},line(14,3,13,'H')),'keiner',pal=BR)
hk('7 Rote Kappe mit goldenem Halbmond',merge(stack(9,[5,9,11,11,11],'A'),pix([(6,11),(10,11)],'G'),pix([(7,12),(8,12),(9,12)],'G'),line(14,3,13,'H')),'schnurr_kinn',pal=dict(A=RED,**BR))
hk('8 Nachtigall auf dem Goldreif + Rose',merge(stack(11,[5,9,11,11],'H'),line(13,4,12,'G'),pix([(6,8),(7,8)],'q'),pix([(7,8)],'K'),pix([(5,9)],'G'),pix([(6,9),(7,9),(8,9),(9,9)],'q'),pix([(10,9),(11,9)],'h'),pix([(7,10),(8,10),(9,10)],'T'),rose(12,12)),'kinn')
hk('9 Hohe rote Kolah, goldene Feder links',merge(rows(5,'    F           ','    F           ','    FF          ','     F          '),stack(6,[5,7,7,7,9,9,9],'A'),line(13,3,13,'G'),pix([(8,13)],'J'),line(14,3,13,'H')),'ziege',pal=dict(A=RED))
hk('10 Federfächer (drei Schreibfedern)',merge(pix([(4,8),(4,9),(5,10),(5,11)],'F'),pix([(8,6),(8,7),(8,8),(8,9),(8,10)],'F'),pix([(12,8),(12,9),(11,10),(11,11)],'F'),stack(11,[7,9,11,11],'H'),line(12,4,12,'G'),pix([(8,12)],'J')),'keiner',pal=BR)
hk('11 Goldkrone mit roten Rosen',merge(pix([(4,10),(6,10),(8,10),(10,10),(12,10)],'G'),line(11,4,12,'G'),{12:at(4,'GRGRGRGRG')},line(13,3,13,'G'),line(14,3,13,'H')),'kinn')
hk('12 Braune Kappe + Rose am Ohr',merge(stack(11,[7,9,11,11],'H'),line(14,3,13,'H'),rose(13,17)),'schnurr_lang',pal=BR)
hk('13 Graues Haar, Band rot, Feder am Ohr',merge(stack(11,[7,9,11,11],'H'),line(13,3,13,'R'),line(14,3,13,'H'),quill()),'ziege')
hk('14 Haar braun lang + Goldreif + Rose',merge(stack(11,[7,9,11,11],'H'),line(13,4,12,'G'),pix([(8,13)],'J'),pix([(x,y) for y in range(15,24) for x in (2,3,13,14)],'H'),rose(12,12)),'schnurr',pal=BR,top=True)
if __name__=='__main__':
    sheet('herz_koenig',HK,OUT+'herz_koenig_3.png',title='Herz König Person 2: persische Dichtkunst, kein weißes Tuch, wenig Bart')
