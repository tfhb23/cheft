"""Freigegebene zweite Personen (Zwillinge). Wird von export_ts.py importiert und trägt sie in final_auswahl.PERSONEN / KARTEN ein.
Neue Freigabe: hier eine Zeile `reg(...)` ergänzen (Entwurf-Funktion aus entw*.py)."""
import final_auswahl as FA
from paare import twin_spec
import entw3, entw4
def reg(key,suit,rank,first,fn,pal=None,extra=None):
    FA.PERSONEN[key]=twin_spec(first,fn,pal,extra)
    for (s,r,keys) in FA.KARTEN:
        if (s,r)==(suit,rank): keys[1]=key
reg('karo_bube_b','D',11,'karo_bube',entw3.KB[4][1],entw3.KB[4][2])                              # Takke + Stirnlocken (freigegeben)
reg('pik_dame_b','S',12,'pik_dame',entw4.PD[9][1],entw4.PD[9][2],entw4.PD[9][3])                 # Beret + Schönheitspunkt (freigegeben)
