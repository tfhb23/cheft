from lib import *
import parts as P
SKIN_PALE=hx('f8e3d2'); GRAY_BEARD=HAIR_GRAY; BLACK=C['ink']; BROWN=HAIR['C']; DBROWN=BROWN
GREEN=hx('4f8a3a'); LGREEN=hx('86b868'); POWDER=hx('ebe6de'); SHADE=hx('d8cfbf'); STEEL=C['inkL']; DSTEEL=hx('8a847e'); RUBY=C['red']
def letters(suit,pal):
    ink=inkOf(suit); light=lightOf(suit)
    m=dict(S=SKIN[suit],E=C['ink'],M=C['mouth'],H=HAIR[suit],B=BEARD[suit],G=C['gold'],W=C['white'],V=SHADE,P=POWDER,
           R=ink,L=light,K=C['ink'],N=STEEL,n=DSTEEL,k=C['ink'],T=hx('e0b48c'),v=hx('cdb98e'),O=C['sandD'],q=hx('b08050'),u=hx('c9b27c'),w=hx('6b4a2b'),h=hx('3a2012'),y=hx('f2d43a'),b=hx('3a78c8'),Z=C['red'],Q=GREEN,F=C['orange'],A=ink,a=C['ink'],J=C['red'])
    m.update(pal); return m
EMPH={'ohne':None,'kontur_hell':C['inkL'],'kontur_dunkel':hx('5a3a2c'),'schlagschatten':C['inkL'],'innenschatten':hx('b8ab93')}
def is_light(rgb): return (max(rgb[:3])-min(rgb[:3]))<=40 and sum(rgb[:3])/3>=185
def emphasize(L,mode):
    col=EMPH.get(mode)
    if not col: return L
    src={(x,y) for y in range(H) for x in range(W) if L.p[x,y][3] and is_light(L.p[x,y][:3])}
    occ=lambda x,y: 0<=x<W and 0<=y<H and L.p[x,y][3]>0
    if mode in('kontur_hell','kontur_dunkel'):
        for (x,y) in src:
            for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
                if not occ(x+dx,y+dy): L.put(x+dx,y+dy,col)
    elif mode=='schlagschatten':
        for (x,y) in src:
            if not occ(x+1,y+1) : L.put(x+1,y+1,col)
            if not occ(x+1,y) : L.put(x+1,y,col)
            if not occ(x,y+1) : L.put(x,y+1,col)
    elif mode=='innenschatten':
        for (x,y) in src:
            if not occ(x,y+1) or not occ(x+1,y): L.put(x,y,col)
    return L
def _shift(L,dx):
    n=Layer(); n.im.paste(L.im,(dx,0)); n.p=n.im.load(); return n
def _clip_body(L,xmin,xmax=23):
    """Kleidung (Schulter) links ab xmin und rechts ab xmax abschneiden; rechts zusätzlich 1 Pixel Lücke zum Buchstaben unten rechts (Spalte >=23, Zeile 33 bis 41)."""
    for y in range(H):
        for x in range(W):
            if x<xmin or x>xmax or (x>=23 and 33<=y<=41): L.p[x,y]=(0,0,0,0)

def _map(x,nar):
    """Spalte x -> neue Spalte (None = fällt weg). A: Spalte 7 raus, linke Hälfte rückt nach rechts. B: Spalte 8 raus, rechte Hälfte rückt nach links."""
    if nar=='A': return None if x==7 else (x+1 if x<7 else x)
    return None if x==8 else (x-1 if x>8 else x)
def _move(x,nar):
    """Wie _map, aber ohne Wegfall (für Teile, die ihre Breite behalten: Kamm)."""
    if nar=='A': return x+1 if x<=7 else x
    return x-1 if x>=8 else x
def _crown(center):
    """Kreuz-König-Krone für den schmalen Kopf: 11 breit, Mitte = Kopfmitte, 4 Zacken (2 breit, 1 Abstand), 3 Steine im gleichen Abstand (Mitte, +-3)."""
    rows=['GG.GG.GG.GG','GGGGGGGGGGG','GGGGGGGGGGG','GGJGGJGGJGG','GGGGGGGGGGG']
    out={}
    for i,r in enumerate(rows):
        row=['.']*16
        for k,ch in enumerate(r): row[center-5+k]=ch
        out[9+i]=''.join(row)
    return out
def _narrow(grid,nar,prot):
    g={}
    for y,row in grid.items():
        r=['.']*16
        for x,ch in enumerate(row):
            nx=_map(x,nar)
            if nx is not None and ch!='.': r[nx]=ch
        g[y]=r
    center=8 if nar=='A' else 7
    for h in prot:
        if h=='krone_ck_final': rows=_crown(center)
        else:
            rows={}
            for y,row in (P.HAT[h] if h in P.HAT else P.EXTRA[h]).items():
                r=['.']*16
                for x,ch in enumerate(row):
                    if ch!='.': r[_move(x,nar)]=ch
                rows[y]=''.join(r)
        for y,row in rows.items():
            r=g.setdefault(y,['.']*16)
            for x,ch in enumerate(row):
                if ch!='.': r[x]=ch
    for y,r in g.items():            # Hutband: Mittelelement 3 px breit (Band 7 breit, Mitte = Bandmitte)
        zs=[i for i,ch in enumerate(r) if ch=='Z']
        if zs and (zs[-1]-zs[0])%2==0 and any(r[i]=='G' for i in range(zs[0],zs[-1]+1)):
            for i in range(zs[0],zs[-1]+1): r[i]='Z'
            m=(zs[0]+zs[-1])//2
            for i in (m-1,m,m+1): r[i]='G'
    return {y:''.join(r) for y,r in g.items()}

def _shrink(g,center,ops,chin):
    """Kopf verkleinern. ops: [('sq',y0,y1,[k..]) Spalten bei Mitte-k und Mitte+k entfernen (Zeilen y0..y1, Außenteile rücken zur Mitte),
    ('down',[y..]) Zeilen löschen, obere Zeilen rücken nach unten (Gesicht bleibt), ('up',[y..]) Zeilen löschen, untere Zeilen rücken nach oben]. chin: Kinnzeile 22 raus (down)."""
    g={y:list(r) for y,r in g.items()}
    for op in ops:
        if op[0]!='sq': continue
        _,y0,y1,ks=op
        for y in range(y0,y1+1):
            if y not in g: continue
            r=g[y]; n=['.']*16
            for x,ch in enumerate(r):
                d=x-center; m=abs(d)
                if ch=='.' or m in ks: continue
                s=sum(1 for k in ks if k<m)
                nx=x+s if d<0 else x-s
                n[nx]=ch
            g[y]=n
    for op in ops:
        if op[0]=='del':                                   # Zellen bei Mitte-k und Mitte+k löschen (ohne Nachrücken)
            _,y0,y1,ks=op
            for y in range(y0,y1+1):
                if y in g:
                    for k in ks:
                        for x in (center-k,center+k):
                            if 0<=x<16: g[y][x]='.'
    for op in ops:
        if op[0]=='put':                                   # Zellen setzen: ('put',y0,y1,[(Versatz zur Mitte, Zeichen)])
            _,y0,y1,items=op
            for y in range(y0,y1+1):
                if y in g:
                    for off,ch in items: g[y][center+off]=ch
    down=[y for op in ops if op[0]=='down' for y in op[1]]+([22] if chin else [])
    up=[y for op in ops if op[0]=='up' for y in op[1]]
    out={}
    for y,r in g.items():
        if y in down or y in up: continue
        ny=y+sum(1 for d in down if d>y)-sum(1 for u in up if u<y)
        out[ny]=''.join(r)
    return out
def compose(suit,spec,emph='ohne'):
    """spec: dict(body,back,hair,beard,hat,extra,acc,pal) -> Layer (nur Figur, kartenabsolut)"""
    pal=spec.get('pal',{}); cm=letters(suit,pal)
    import tiefe as _t; cm['t']=_t.nase(cm['S'])      # Nase per Formel aus der Hautfarbe
    cm['k']=_t.glanz(cm['K'])                       # Zylinder-Glanz per Formel (früher Handfarbe 5a4d44)
    la=spec.get('lip',LIPS[0])                       # Lippen: Rot (1.14) mit Deckkraft über dem Hautton (Frauen intensiver)
    cm['M']=tuple(round(cm['S'][i]*(1-la)+C['red'][i]*la) for i in range(3))
    for _k in 'JZ':                                 # rote Edelsteine und Hutbänder -> Cheft-Orange (1.10)
        if cm[_k]==C['red']: cm[_k]=C['orange']
    cm['w']=_t.hi(cm['H'])                          # Falkenbraun aus dem Haarbraun der Person (Formel)
    cm['h']=_t.lo(cm['H'])                          # dunklere Strähnen aus demselben Braun (Formel)
    cm['V']=_t.fold(cm['W'])                        # Falten in Weiß per Formel (früher d8cfbf)
    if 'a' in pal: cm['a']=_t.fold(cm['A'])         # Fez-/Turbanfalten per Formel (früher a02a20, c8902a, d8cfbf)
    layers=[P.BODY[spec['body']]]
    if spec.get('back'): layers.append(P.BACK[spec['back']])
    layers.append(P.FACE)
    layers.append(P.HAIR[spec.get('hair','glatze')])
    layers.append(P.BEARD[spec.get('beard','keiner')])
    prot=[]
    for h in ([spec['hat']] if isinstance(spec.get('hat'),str) else spec.get('hat',[])):
        if spec.get('narrow') and (h.startswith('kamm') or h=='krone_ck_final'): prot.append(h)     # werden nach dem Schmaler-Machen neu gesetzt
        else: layers.append(P.HAT[h])
    for e in spec.get('extra',[]):
        if spec.get('narrow') and e.startswith('monokel') and e in P.EXTRA: prot.append(e)      # Ring bleibt rund und geschlossen (wird verschoben statt beschnitten)
        else: layers.append(P.EXTRA[e] if e in P.EXTRA else P.HAT[e])
    for a in spec.get('acc',[]): layers.append(P.ACC[a])
    grid=P.merge(*layers)
    st=spec.get('eye',EYE)
    if st and 16 in grid:                       # Augenfarbe (Varianten S1 bis S4, siehe EYE)
        import tiefe as _te
        r=list(grid[16]); eyes=[i for i,chh in enumerate(r) if chh=='E']
        ic=(_te.hsl_shift(HAIR[suit],-0.25,1.0) if suit!='S' else C['ink']) if st=='S1' else EYE_COL[suit]
        cm['#']=ic; cm['!']=C['white']; cm['~']=_te.lo(cm['S'])
        for i in eyes: r[i]='#'
        if st=='S3':
            for i in eyes:
                if r[i-1]=='S': r[i-1]='!'
        grid[16]=''.join(r)
        if st=='S4' and 15 in grid:
            r5=list(grid[15])
            for i in eyes:
                if r5[i]=='S': r5[i]='~'
            grid[15]=''.join(r5)
    if spec.get('mouth2') and 20 in grid:      # Lippen nur 2 px breit (Mitte, Spalten 7 und 8)
        r=list(grid[20]); idx=[i for i,ch in enumerate(r) if ch=='M']
        if idx:
            fill=r[idx[0]-1]
            for i in idx:
                if i not in (7,8): r[i]=fill
            grid[20]=''.join(r)
    if spec.get('narrow'): grid=_narrow(grid,spec['narrow'],prot)
    if spec.get('shrink') or spec.get('chin'): grid=_shrink(grid,8 if spec.get('narrow')=='A' else 7,spec.get('shrink',[]),spec.get('chin'))
    global LAST_GRID; LAST_GRID=dict(grid)
    if not spec.get('dyn'): grid[P.HEM_Y]='G'*16
    import bust
    L=bust.dyn_body(suit,spec['dyn']) if spec.get('dyn') else Layer()
    lift=spec.get('lift',0); dx=spec.get('dx',0)
    F=Layer() if lift else L          # Person (Kopf, Hut, Haare ...) getrennt vom Körper, damit sie angehoben werden kann
    ov={}; td=spec.get('tiefe','B')
    if td and td!='aus':
        import tiefe; ov=tiefe.apply(grid,cm,td)
    for y,row in grid.items():
        for x,ch in enumerate(row):
            if ch!='.' and ch in cm: F.put(8+x,y,ov.get((x,y),cm[ch]))
    PX=Layer()                                  # Objekte (z. B. Vogel) optional erst nach dem Schatteneffekt zeichnen
    for (px_,py_,ch_) in spec.get('px',[]):
        if ch_ in cm: (PX if spec.get('px_after') else F).put(px_,py_+(1 if spec.get('chin') else 0),cm[ch_])
    if lift:
        sh=Layer(); sh.im.paste(F.im,(0,-lift+spec.get('head_down',0))); sh.p=sh.im.load()
        if td and td!='aus':
            import tiefe; tiefe.body(L,lambda x,y: 0<=x<W and 0<=y<H and sh.p[x,y][3]>0,spec['dyn'].get('xmin',8))
        if dx:                                  # Layout v3: Person um dx Pixel verschieben; nur die Kleidung wird links/rechts neu abgeschnitten
            L=_shift(L,dx); _clip_body(L,8+dx); sh=_shift(sh,dx)
            for y in range(H):                  # 1 Pixel Abstand der Person zu den Index-Symbolen (links oben Spalte 3-9, unten rechts sichtbar ab Spalte 25)
                for x in range(W):
                    if (x<=10 and 10<=y<=18) or (x>=24 and y>=25): sh.p[x,y]=(0,0,0,0)
        if spec.get('body_clip'): _clip_body(L,*spec['body_clip'])
        L.over(sh)
    out=emphasize(L,emph)
    if spec.get('px_after'):
        if lift:
            sp2=Layer(); sp2.im.paste(PX.im,(0,-lift+spec.get('head_down',0))); sp2.p=sp2.im.load(); PX=sp2
        if dx: PX=_shift(PX,dx)
        out.over(PX)
    return out
import colorsys
def _cream_shadow():
    r,g,b=[v/255 for v in C['cream']]; h,l,s=colorsys.rgb_to_hls(r,g,b)
    r,g,b=colorsys.hls_to_rgb(h,l-0.075,s); return (round(r*255),round(g*255),round(b*255))
LIPS=(0.50,0.90)   # (Männer, Frauen): Deckkraft von Rot auf dem Hautton
EYE='S2'   # Augen (freigegeben: S2). None = Tinte | S1 1 px aus Haarfarbe dunkler | S2 1 px Familienfarbe | S3 2 px Weiß+Iris | S4 1 px Familienfarbe + Lidschatten
EYE_COL=dict(EYE_TOKENS)   # aus den Guide-Tokens 1.30 bis 1.33
WHITE='W2'    # Weiß hervorheben: W1 nur Formel | W2 Innenkante rechts/unten | W3 dünne Außenkontur (4 Seiten) | W4 W2+W3
def white_edge(c,fig):
    if WHITE=='W1': return
    occ=lambda x,y: 0<=x<W and 0<=y<H and fig.p[x,y][3]>0
    def _weiss(p): return (max(p[:3])-min(p[:3]))<=6 and sum(p[:3])/3>=190     # nur Weiß/Hellgrau, nie Haut
    light=lambda x,y: occ(x,y) and _weiss(fig.p[x,y])
    cream=lambda x,y: 0<=x<W and 0<=y<H and c.p[x,y][:3]==C['cream'] and c.p[x,y][3]>0
    if WHITE in ('W2','W4'):
        col=_cream_at(0.16)
        for y in range(H):
            for x in range(W):
                if light(x,y) and (not occ(x+1,y) or not occ(x,y+1)): fig.p[x,y]=col+(255,)
    if WHITE in ('W3','W4'):
        col=_cream_at(0.10); sh=Layer()
        for y in range(H):
            for x in range(W):
                if not light(x,y): continue
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    u,v=x+dx,y+dy
                    if not occ(u,v) and cream(u,v) and 8<=u<=23 and all(occ(a,b) or cream(a,b) for a in (u-1,u,u+1) for b in (v-1,v,v+1)): sh.put(u,v,col)
        c.over(sh)
SHADOW='S0'   # S0 ohne | S1 verlaufend (3 Stufen, alle Teile) | S2 verlaufend nur bei hellen Flächen | S3 schmal (2 Stufen, alle)
STEPS={'S1':[0.075,0.05,0.025],'S2':[0.075,0.05,0.025],'S3':[0.06,0.03]}
def _cream_at(dl):
    r,g,b=[v/255 for v in C['cream']]; h,l,s=colorsys.rgb_to_hls(r,g,b)
    r,g,b=colorsys.hls_to_rgb(h,l-dl,s); return (round(r*255),round(g*255),round(b*255))
def outer_shadow(c,fig):
    """Verlaufender Schlagschatten außen (rechts/unten), in abgedunkeltem Kartencreme statt Grau; berührt keine Buchstaben/Symbole."""
    if SHADOW=='S0': return
    steps=STEPS[SHADOW]; n=len(steps)
    occ=lambda x,y: 0<=x<W and 0<=y<H and fig.p[x,y][3]>0
    cream=lambda x,y: 0<=x<W and 0<=y<H and c.p[x,y][:3]==C['cream'] and c.p[x,y][3]>0
    only_light=(SHADOW=='S2'); best={}
    for y in range(H):
        for x in range(W):
            if not occ(x,y): continue
            if only_light and not is_light(fig.p[x,y][:3]): continue
            for dy in range(0,n+1):
                for dx in range(0,n+1):
                    d=max(dx,dy)
                    if d==0 or d>n: continue
                    u,v=x+dx,y+dy
                    if occ(u,v) or not cream(u,v) or not 8<=u<=23: continue
                    s=steps[d-1]
                    if s>best.get((u,v),0): best[(u,v)]=s
    sh=Layer()
    for (u,v),s in best.items():
        if all(occ(a,b) or cream(a,b) for a in (u-1,u,u+1) for b in (v-1,v,v+1)): sh.put(u,v,_cream_at(s))
    c.over(sh)
def card(suit,rank,spec,emph='ohne',sym='ref'):
    spec=dict(spec,lip=LIPS[1 if rank==12 else 0])
    if sym=='v6a': spec=dict(spec,narrow='A',head_down=1,dyn=dict(spec['dyn'],cut=2,notch_left=False)); sym='v6'   # v6 = wie v4/v5a, aber Person wieder mittig (kein Versatz)
    if sym in ('v5a','v5b'): spec=dict(spec,narrow=sym[-1].upper()); sym='v4'
    if sym=='v4': sym='v3'; spec=dict(spec,head_down=1,dyn=dict(spec['dyn'],cut=2))   # v4 = v3 + Kopf 1 px tiefer + Körper unten 2 px kürzer
    c=base(); idx=index_layer(suit,rank); c.over(idx); c.over(idx.rot())
    x0,y0,x1,y1=P.WIN
    if sym in ('cut1','symmA','symm','symm0','v3','v6'): x1=24 if sym!='symm0' else 23
    if sym=='v6': x0=10; x1=23; spec=dict(spec,body_clip=(9,22))   # Schultern rechts/links 1 px schmaler, Symbol unten rechts sichtbar ab Spalte 24 (5 von 7 Spalten)                                                    # Fenster beginnt hinter dem Symbol links oben (Spalte 3 bis 9)
    if sym=='v3':                                                           # Layout v3: Index links oben ganz sichtbar (Symbol 7 breit, Spalte 3 bis 9) -> Fenster beginnt erst ab Spalte 10
        x0=10; spec=dict(spec,dx=2,dyn=dict(spec['dyn'],notch_left=False))   # Person 2 Pixel verschoben, kein Symbol unten links
    if sym in ('symm','symm0'):
        sl=Layer(); sl.mask(rot(SH[suit]),3,26,inkOf(suit)); c.over(sl)   # Symbol unten links, spiegelbildlich zum Symbol unten rechts
    win=Layer(); win.rect(x0,y0,x1,y1,C['cream'])
    if sym=='symm': win.rect(7,24,8,32,C['cream'])                          # links unten ebenfalls 1 Pixel Lücke (wie rechts), oben links bleibt unverändert
    c.over(win)
    fig=compose(suit,spec,'ohne' if emph!='alt' else 'schlagschatten')
    if emph!='alt': outer_shadow(c,fig); white_edge(c,fig)
    if sym=='schulter':
        for yy in range(H): fig.p[23,yy]=(0,0,0,0)
    c.over(fig); return c.im
