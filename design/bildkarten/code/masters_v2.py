"""MASTER v2: wie masters.py, aber Version B (symmetrische Schulter + Symbol unten links, 1 px Lücke beidseitig),
Person komplett 1 Pixel höher (Augen jetzt auf y=15), untere Torso-Kante unverändert, Zylinder oben 1 px niedriger (Oberkante = Oberkante des K)."""
import copy
from masters import MASTERS as _M
from comp import *
def spec_v2(name):
    suit,rank,em,spec=_M[name]; sp=copy.deepcopy(spec)
    sp['dyn']['xmin']=8; sp['dyn']['notch_left']=True; sp['dyn']['lift']=1; sp['lift']=1
    if name=='pik_koenig': sp['hat']=['z_a10']
    if name=='pik_dame': sp['hair']='bob_r2_l3'          # Haare +3 Pixel
    if name=='kreuz_koenig': sp['hat']=['krone_ck_final']   # Krone Variante D, Steine weiter außen und eine Zeile tiefer
    if name in ('karo_dame','herz_koenig','karo_koenig','pik_koenig_zwilling'): sp['mouth2']=True   # Lippen 2 px
    if name in ('karo_koenig','pik_koenig_zwilling'): sp['extra']=list(sp['extra'])+['nase_n3']   # Nase (Formel aus Hautfarbe)
    if name.startswith('pik_'): sp['pal']['S']=hx('f6dfca')   # Pik-Hautfarbe: bleibt blass, löst aber keinen Weiß-Schatten mehr im Gesicht aus
    return suit,rank,em,sp
def render_v2(name):
    suit,rank,em,sp=spec_v2(name); return card(suit,rank,sp,em,'symm')
MASTERS_V2={n:spec_v2(n) for n in _M}

# ---- Ergänzung: KK4 (Karo König Kalif) und KD4 (Karo Dame Juwelenkönigin), mit denselben v2-Anpassungen
from masters import KING_DYN, DAME_DYN, mk
GOLD2=hx('c8902a'); DIAM=hx('e4f2ff')
_extra={
 'karo_koenig':('D',13,'schlagschatten',mk('turban_zweistufig','lang','kurz',('brauen',),KING_DYN,A=C['gold'],a=GOLD2,J=DIAM)),
 'karo_dame':  ('D',12,'schlagschatten',mk(['diadem_gross','ohrringe'],'keiner','hochsteck',(),DAME_DYN,J=DIAM,M=C['red'])),
}
for _n,_v in _extra.items():
    _M[_n]=_v
MASTERS_V2={n:spec_v2(n) for n in _M}

# ---- Ergänzung: Kreuz König (CK-c neu): fünfzackige Goldkrone, schmaler Schnurrbart wie CK-i, Brauen und Nase
_BROWN=hx('5a3a24'); _DBROWN=_BROWN
_M['kreuz_koenig']=('C',13,'schlagschatten',mk('krone_k','schnurr','kurz',('brauen','nase'),KING_DYN,H=_BROWN,B=_DBROWN,J=C['red']))
MASTERS_V2={n:spec_v2(n) for n in _M}

# ---- Ergänzung: Pik König Zwilling (freigegeben: Z2) – breiter Zylinder W1, Glatze, Schnurrbart 6 breit, Brauen 3 breit eine Zeile höher, kein Monokel
_M['pik_koenig_zwilling']=('S',13,'schlagschatten',mk('z_w1','ms_6','glatze',('brauen_3_hoch',),KING_DYN,S=hx('f6dfca'),B=BLACK,H=BLACK))
MASTERS_V2={n:spec_v2(n) for n in _M}
