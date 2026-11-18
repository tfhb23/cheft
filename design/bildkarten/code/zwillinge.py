"""Freigegebene zweite Personen (Zwillinge). Wird von export_ts.py importiert und trägt sie in final_auswahl.PERSONEN / KARTEN ein.
Neue Freigabe: hier eine Zeile `reg(...)` ergänzen (Entwurf-Funktion aus entw*.py)."""
import final_auswahl as FA
from paare import twin_spec
import entw3, entw4, entw5, entw6
def reg(key,suit,rank,first,fn,pal=None,extra=None):
    FA.PERSONEN[key]=twin_spec(first,fn,pal,extra)
    for (s,r,keys) in FA.KARTEN:
        if (s,r)==(suit,rank): keys[1]=key
reg('karo_bube_b','D',11,'karo_bube',entw3.KB[4][1],entw3.KB[4][2])                              # Takke + Stirnlocken (freigegeben)
reg('pik_dame_b','S',12,'pik_dame',entw4.PD[9][1],entw4.PD[9][2],entw4.PD[9][3])                 # Beret + Schönheitspunkt (freigegeben)
reg('karo_koenig_b','D',13,'karo_koenig',entw5.KF[4][1],entw5.KF[4][2])                         # Federkrone, minus 2 Zeilen (freigegeben)
reg('karo_dame_b','D',12,'karo_dame',entw5.KD[7][1],entw5.KD[7][2],entw5.KD[7][3])                # Sonnenscheibe, wellig mit Goldbändern (freigegeben)
reg('kreuz_koenig_b','C',13,'kreuz_koenig',entw6.KRK[0][1],entw6.KRK[0][2])                      # Glatze, runder Bart, Mund 3 breit (freigegeben)
reg('pik_bube_b','S',11,'pik_bube',entw6.PB[8][1],entw6.PB[8][2],entw6.PB[8][3])                # Dach 12 + links 6, rechts 12 (freigegeben)
