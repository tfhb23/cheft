from paare import *
import entw8
OUT='/home/user/cheft/design/bildkarten/images/entw/'
hat=merge(line(13,4,12,'G'),line(14,4,12,'G'),pix([(6,13),(8,13),(10,13)],'J'))
base=lambda mouth,halo=None: merge(stack(11,[5,7,9,9],'S'),hat,
    pix([(3,y) for y in (15,16,17,18)]+[(13,y) for y in (15,16,17,18)],'H'),
    line(19,4,12,'B'),line(20,4,12,'B'),line(21,4,12,'B'),line(22,4,12,'B'),line(23,5,11,'B'),line(24,6,10,'B'),line(20,5,11,'B'),halo or {},mouth)
KM=[]
def km(label,mouth,halo=None): KM.append((label,art(base(mouth,halo)),{}))
km('1 Lippen 1 breit (wie die anderen Könige)',{21:at(8,'M')})
km('2 Lippen 2 breit (Mitte + rechts)',{21:at(8,'MM')})
km('3 Lippen 2 breit (links + Mitte)',{21:at(7,'MM')})
km('4 Lippen 1 breit + Hautfeld im Bart',{21:at(8,'M')},merge(line(21,7,9,'S'),line(22,8,8,'S')))
km('5 Lippen 2 breit + Hautfeld',{21:at(8,'MM')},merge(line(21,7,10,'S'),line(22,8,9,'S')))
km('6 Lippen 3 breit, nur Mitte kräftig (Seiten Hautton)',{21:at(7,'SMS')})
if __name__=='__main__':
    sheet('kreuz_koenig',KM,OUT+'kreuz_koenig_lippen.png',title='Kreuz König B 10 (Goldspange): kleinere Lippen')
