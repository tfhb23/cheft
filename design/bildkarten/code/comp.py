from lib import *
import parts as P
SKIN_PALE=hx('f8e3d2'); GRAY_BEARD=hx('cfc8bd'); BLACK=hx('1b1b1b'); BROWN=hx('5a3a24'); DBROWN=hx('4e2c16')
GREEN=hx('4f8a3a'); LGREEN=hx('86b868'); POWDER=hx('ebe6de'); SHADE=hx('d8cfbf'); STEEL=hx('b9b3ad'); DSTEEL=hx('8a847e'); RUBY=hx('d2362a')
def letters(suit,pal):
    ink=inkOf(suit); light=lightOf(suit)
    m=dict(S=C['skin'],E=C['ink'],M=C['mouth'],H=HAIR[suit],B=BEARD[suit],G=C['gold'],W=C['white'],V=SHADE,P=POWDER,
           R=ink,L=light,K=C['ink'],N=STEEL,n=DSTEEL,k=hx('5a4d44'),T=hx('e0b48c'),v=hx('cdb98e'),O=hx('e8dcc0'),q=hx('b08050'),u=hx('c9b27c'),w=hx('6b4a2b'),h=hx('3a2012'),y=hx('f2d43a'),b=hx('3a78c8'),Z=C['red'],Q=GREEN,F=C['orange'],A=ink,a=C['ink'],J=C['red'])
    m.update(pal); return m
EMPH={'ohne':None,'kontur_hell':hx('b9b3ad'),'kontur_dunkel':hx('5a3a2c'),'schlagschatten':hx('b9b3ad'),'innenschatten':hx('b8ab93')}
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
def compose(suit,spec,emph='ohne'):
    """spec: dict(body,back,hair,beard,hat,extra,acc,pal) -> Layer (nur Figur, kartenabsolut)"""
    pal=spec.get('pal',{}); cm=letters(suit,pal)
    import tiefe as _t; cm['t']=_t.lo(cm['S'])      # Nase per Formel aus der Hautfarbe
    layers=[P.BODY[spec['body']]]
    if spec.get('back'): layers.append(P.BACK[spec['back']])
    layers.append(P.FACE)
    layers.append(P.HAIR[spec.get('hair','glatze')])
    layers.append(P.BEARD[spec.get('beard','keiner')])
    for h in ([spec['hat']] if isinstance(spec.get('hat'),str) else spec.get('hat',[])): layers.append(P.HAT[h])
    for e in spec.get('extra',[]): layers.append(P.EXTRA[e] if e in P.EXTRA else P.HAT[e])
    for a in spec.get('acc',[]): layers.append(P.ACC[a])
    grid=P.merge(*layers)
    if spec.get('mouth2') and 20 in grid:      # Lippen nur 2 px breit (Mitte, Spalten 7 und 8)
        r=list(grid[20]); idx=[i for i,ch in enumerate(r) if ch=='M']
        if idx:
            fill=r[idx[0]-1]
            for i in idx:
                if i not in (7,8): r[i]=fill
            grid[20]=''.join(r)
    if not spec.get('dyn'): grid[P.HEM_Y]='G'*16
    import bust
    L=bust.dyn_body(suit,spec['dyn']) if spec.get('dyn') else Layer()
    lift=spec.get('lift',0)
    F=Layer() if lift else L          # Person (Kopf, Hut, Haare ...) getrennt vom Körper, damit sie angehoben werden kann
    ov={}; td=spec.get('tiefe','B')
    if td and td!='aus':
        import tiefe; ov=tiefe.apply(grid,cm,td)
    for y,row in grid.items():
        for x,ch in enumerate(row):
            if ch!='.' and ch in cm: F.put(8+x,y,ov.get((x,y),cm[ch]))
    PX=Layer()                                  # Objekte (z. B. Vogel) optional erst nach dem Schatteneffekt zeichnen
    for (px_,py_,ch_) in spec.get('px',[]):
        if ch_ in cm: (PX if spec.get('px_after') else F).put(px_,py_,cm[ch_])
    if lift:
        sh=Layer(); sh.im.paste(F.im,(0,-lift)); sh.p=sh.im.load()
        if td and td!='aus':
            import tiefe; tiefe.body(L,lambda x,y: 0<=x<W and 0<=y<H and sh.p[x,y][3]>0,spec['dyn'].get('xmin',8))
        L.over(sh)
    out=emphasize(L,emph)
    if spec.get('px_after'):
        if lift:
            sp2=Layer(); sp2.im.paste(PX.im,(0,-lift)); sp2.p=sp2.im.load(); PX=sp2
        out.over(PX)
    return out
import colorsys
def _cream_shadow():
    r,g,b=[v/255 for v in C['cream']]; h,l,s=colorsys.rgb_to_hls(r,g,b)
    r,g,b=colorsys.hls_to_rgb(h,l-0.075,s); return (round(r*255),round(g*255),round(b*255))
WHITE='W1'    # Weiß hervorheben: W1 nur Formel | W2 Innenkante rechts/unten | W3 dünne Außenkontur (4 Seiten) | W4 W2+W3
def white_edge(c,fig):
    if WHITE=='W1': return
    occ=lambda x,y: 0<=x<W and 0<=y<H and fig.p[x,y][3]>0
    light=lambda x,y: occ(x,y) and is_light(fig.p[x,y][:3])
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
    c=base(); idx=index_layer(suit,rank); c.over(idx); c.over(idx.rot())
    x0,y0,x1,y1=P.WIN
    if sym in ('cut1','symmA','symm','symm0'): x1=24 if sym!='symm0' else 23
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
