"""MASTER-Referenzen (Stand: freigegeben). Layout N1 ohne Spiegelung, Fenster x8..23 / y11..32, Symbol unten rechts Option 1 (sym='cut1'),
Büste Form 1 (Halbkreis, symmetrisch zur Kartenmitte, linke Schulter ab Spalte 5, rechts abgeschnitten), Augen immer auf y=16.
König: Kante G5 (zwei Goldlinien mit Lücke). Bube: G1 (eine Goldlinie). Dame: untere Goldlinie, obere Linie dunkles Gold-Braun (G5u)."""
from comp import *
WHITEHAIR=hx('ffffff'); BROWN_GOLD=hx('8a5a1a'); RED2=hx('a02a20')
def mk(hat,beard,hair,extra,dyn,**pal): return dict(body='leer',hair=hair,beard=beard,hat=hat,extra=list(extra),pal=pal,dyn=dyn)
KING_DYN=dict(xl=4,xmin=5,shape='sy_halb',gold='g5k')
BUBE_DYN=dict(xl=4,xmin=5,shape='sy_halb',gold='g1')
DAME_DYN=dict(xl=4,xmin=5,shape='sy_halb',gold='g5u',upper=C['gold'])
MASTERS={
 'pik_koenig': ('S',13,'schlagschatten',mk('z_a11','keiner','lang_z',('monokel_m',),KING_DYN,H=WHITEHAIR,B=WHITEHAIR,S=SKIN_PALE)),
 'pik_bube':   ('S',11,'schlagschatten',mk([],'keiner','topf_b',('brille_m',),BUBE_DYN,H=WHITEHAIR,S=SKIN_PALE)),
 'pik_dame':   ('S',12,'schlagschatten',mk('melone_a_rot','keiner','bob_r2',('brille_6p','mund_schmal'),DAME_DYN,H=WHITEHAIR,S=SKIN_PALE,M=C['red'],Z=C['red'],G=C['gold'])),
 'herz_koenig':('H',13,'schlagschatten',mk('turban_moghul','lang','kurz',('brauen','nase'),KING_DYN,A=C['white'],a=SHADE,J=C['red'],H=GRAY_BEARD,B=GRAY_BEARD)),
 'karo_bube':  ('D',11,'ohne',mk('fez_A','keiner','pony_a',(),BUBE_DYN,A=C['red'],a=RED2)),
}
def render(name):
    suit,rank,em,spec=MASTERS[name]; return card(suit,rank,spec,em,'cut1')
