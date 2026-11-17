from lib import *
import art

def buste19(rank):  # 19x19: eine Robenzeile weniger
    a=art.BUSTE[rank]; return a[:18]+a[19:]

def L_bleed(suit,rank):      # Büste ohne Rahmen, Körper stoßen an der Mittellinie zusammen
    t=Layer(); t.art(art.BUSTE[rank],11,2,fmap(suit,rank)); return finish(t,suit,rank)
def L_frame(suit,rank):      # Büste im hellen Rahmenfenster
    t=Layer(); t.rect(10,1,30,21,lightOf(suit)); t.rect(11,2,29,20,C['cream'])
    t.art(buste19(rank),11,2,fmap(suit,rank)); return finish(t,suit,rank)
def L_tint(suit,rank):       # Büste auf getönter Eckfläche, bis an den Kartenrand
    t=Layer(); t.rect(10,1,30,21,lightOf(suit))
    t.art(buste19(rank),11,2,fmap(suit,rank)); return finish(t,suit,rank)
def L_kopf_frame(suit,rank):
    t=Layer(); t.rect(12,3,28,19,lightOf(suit)); t.rect(13,4,27,18,C['cream'])
    t.art(art.KOPF[rank],13,4,fmap(suit,rank)); return finish(t,suit,rank)
def L_kopf_tint(suit,rank):
    t=Layer(); t.rect(10,1,30,21,lightOf(suit))
    t.art(art.KOPF[rank],13,4,fmap(suit,rank)); return finish(t,suit,rank)
def L_kopf_free(suit,rank):
    t=Layer(); t.art(art.KOPF[rank],13,4,fmap(suit,rank)); return finish(t,suit,rank)
def L_band(suit,rank):       # Büste frei + Mittelband über die ganze Karte
    t=Layer(); t.art(buste19(rank),11,2,fmap(suit,rank))
    under=Layer(); under.rect(1,21,30,22,lightOf(suit))
    return finish(t,suit,rank,under)
def attr19(rank): a=art.ATTR[rank]; return a[:18]+a[19:]
def _attr(t,suit,rank,x=11,y=2):
    t.art(attr19(rank),x,y,fmap(suit,rank))
def L_attr_frame(suit,rank):
    t=Layer(); t.rect(10,1,30,21,lightOf(suit)); t.rect(11,2,29,20,C['cream'])
    t.art(buste19(rank),11,2,fmap(suit,rank)); _attr(t,suit,rank); return finish(t,suit,rank)
def L_attr_tint(suit,rank):
    t=Layer(); t.rect(10,1,30,21,lightOf(suit))
    t.art(buste19(rank),11,2,fmap(suit,rank)); _attr(t,suit,rank); return finish(t,suit,rank)
def L_cur(suit,rank): return current(suit,rank)

VARIANTS=[
 ('A  Aktuell',L_cur),
 ('B  Büste\nfrei',L_bleed),
 ('C  Büste\nim Rahmen',L_frame),
 ('D  Büste\nauf Fläche',L_tint),
 ('E  Büste\n+ Mittelband',L_band),
 ('F  Kopf\nim Rahmen',L_kopf_frame),
 ('G  Kopf\nauf Fläche',L_kopf_tint),
 ('H  Kopf\nfrei',L_kopf_free),
 ('I  Attribut\nim Rahmen',L_attr_frame),
 ('J  Attribut\nauf Fläche',L_attr_tint),
]
