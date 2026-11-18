# Baukasten für Bildkarten (Layout N1): Figur 16 px breit, Fenster x8..23, y11..32, Augen immer auf y=16, goldener Abschluss y=32.
EYE_Y=16; HEM_Y=32; WIN=(8,11,23,32)
def mir(l):
    assert len(l)==8,(l,len(l)); return l+l[::-1]
def raw(s):
    assert len(s)==16,(s,len(s)); return s
def part(y0,rows,sym=True):
    d={}
    for i,r in enumerate(rows):
        d[y0+i]=mir(r) if (sym and len(r)==8) else raw(r)
    return d
def merge(*ps):
    d={}
    for p in ps:
        for y,r in p.items():
            if y in d:
                d[y]=''.join(b if b!='.' else a for a,b in zip(d[y],r))
            else: d[y]=r
    return d
def sides(ch,y0,y1,c0,c1):
    """senkrechte Streifen links (c0..c1) und rechts (gespiegelt)"""
    d={}
    for y in range(y0,y1+1):
        row=['.']*16
        for c in range(c0,c1+1): row[c]=ch; row[15-c]=ch
        d[y]=''.join(row)
    return d
def hat(rows,bottom=13): return part(bottom-len(rows)+1,rows)

# ---- Gesicht (fest): 10 breit (Spalten 3..12), Augen y=16, Mund y=20
FACE=part(14,['...SSSSS','...SSSSS','...SSESS','...SSSSS','...SSSSS','...SSSSS','...SSSMM','....SSSS','.....SSS','......SS'])
# ---- Haar vorn
_top=['...HHHHH','..HHHHHH','..HHHHHH']
HAIR={
 'kurz':  part(12,_top+['..HH....','..HH....','..H.....']),
 'schlicht': part(12,_top+['..HH....','..HH....','..H.....']),
 'pony':  part(12,_top+['..HHHHHH','..HH....','..H.....']),
 'lang':  merge(part(12,_top),sides('H',15,28,1,2),sides('H',21,27,1,3)),
 'langoffen': merge(part(12,_top),sides('H',15,29,1,2),sides('H',20,27,1,3)),
 'hochsteck': merge(part(7,['......HH','.....HHH','....HHHH','...HHHHH','..HHHHHH','..HHHHHH','..HHHHHH','..HHHHHH']),part(12,_top),sides('H',15,17,2,3)),
 'schlitz': merge(part(12,_top),part(15,['..HH..HH','..HH...H','..H.....'])),
 'glatze': {},
}
# ---- Bärte / Schnurrbärte
BEARD={
 'voll': part(17,['...B....','...BBBBB','...BBBBB','...BBBMM','...BBBBB','....BBBB','.....BBB','.....BBB','......BB']),
 'lang': part(17,['...B....','...BBBBB','...BBBBB','...BBBMM','...BBBBB','....BBBB','....BBBB','.....BBB','.....BBB','.....BBB','......BB','......BB']),
 'kurz': part(19,['...BBBBB','...BBBMM','....BBBB','......BB']),
 'schnurr': part(19,['....BBBB']),
 'zwirbel': part(18,['..B.....','...BBBBB']),
 'flaum': part(19,['....BBBB']),
 'ziege': part(21,['....SSSS','.....BBB','......BB','......BB']),
 'keiner': {},
}
# ---- Hüte
HAT={
 'krone_k': hat(['..GG.GG.','..GGGGGG','..GGGGJG','..GGGGGG']),
 'krone_d': hat(['....GG.G','....GGGG','...GGGJG']),
 'turban': part(5,['.....AAA','...AAAAA','..AAAAAA','..aaaaaa','.AAAAAAA','.AAAAAAA','.aaaaaaa','.AAAAAAJ','..AAAAAA']),
 'fez': merge(hat(['.......A','....AAAA','...AAAAA','...AAAAA','...AAAAA','...aaaaa','...AAAAA']),
              {7:'........GGGGGG..',8:'.............G..',9:'.............G..',10:'.............G..',11:'.............G..',12:'.............G..',13:'.............G..',14:'.............G..',15:'.............GG.'}),
 'zylinder': hat(['....KKKK']*7+['....ZZZZ','....KKKK','..KKKKKK']),
 'bandana': merge(hat(['....AAAA','...AAAAA','...aaaaa']),{12:'...AAAAAAAAAAAAA',13:'...aaaaaaaaaaaaa',14:'..............AA'}),
 'hoerner': hat(['.K......','.K......','.KK.....','..KK....','..KKK.GG','...KKKGG','....KKKK','....KKKK']),
 'schleier': merge(part(11,['....VVVV','...VVVVV','..VVVVVV']),sides('V',14,22,0,2),sides('V',23,27,0,4),part(13,['..GGGGGG'])),
 'rosenkranz': part(12,['....Z.Z.','...ZQZQZ']),
 'lorbeer': part(11,['....G.G.','...G.GG.','..GG.G..','..G.G...']),
 'federkappe': merge(hat(['....AAAA','..AAAAAA','.AAAAAAA']),{8:'...........FF...',9:'..........FFF...',10:'........FFF.....'}),
 'dreispitz': hat(['.....KKK','...KKKKK','..KKKKKK','.KKKKKKK','.GGGGGGG'])  ,
 'allonge': merge(part(11,['....PPPP','..PPPPPP','.PPPPPPP']),sides('P',14,20,0,2),sides('P',21,26,0,3),part(26,['.PVPVP..'])),
 'turm': part(3,['.......P','......PP','.....PPP','....PPPP','....PPPP','...PPPPP','...PPPPP','..PPPPPP','..PPPPPP','..PPPPPP','.PPZZPPP'][:11]),
 'kolah': hat(['....AAAA','...AAAAA','...AAAAA','...AAAAA','...AAAAA','...AAAAA','...aaaaa']),
 'kettenhaube': merge(part(12,['....NNNN','...NnNnN','..NnNnNn']),sides('N',14,24,1,2),sides('n',15,23,1,1)),
 'helm': merge(part(8,['.......Z','......ZZ','.....NNN','...NNNNN','..NNNNNN','..NnNnNn','..NNNNNN']),sides('N',15,19,1,2)),
 'blaetter': part(10,['....Q.Q.','...QQQQQ','..QQQQQQ','..GGGGGG']),
 'kapuze': merge(part(10,['.....KKK','...KKKKK','..KKKKKK','..KKKKKK']),sides('K',14,26,1,2),sides('K',20,27,0,2)),
 'witwenhut': merge(part(11,['....KKKK','...KKKKK','.KKKKKKK']),{8:'..........K.....',9:'.........KK.....',10:'.........KKK....'},{15:'....K.K.K.K.K...',17:'.....K.K.K.K....'}),
 'zopf': {},
 'fez_kurz': merge(hat(['.......A','....AAAA','...AAAAA','...AAAAA','...AAAAA','...aaaaa','...AAAAA']),{7:'........GGG.....',8:'..........G.....',9:'..........G.....',10:'.........GG.....'}),
 'fez_band': hat(['.......A','....AAAA','...AAAAA','...AAAAA','...AAAAA','...GGGGG','...AAAAA']),
 'zylinder_gold': hat(['....KKKK']*7+['....GGGG','....KKKK','..KKKKKK']),
 'zylinder_nieder': hat(['....KKKK']*4+['....ZZZZ','....KKKK','..KKKKKK']),
 'zylinder_klein': hat(['.....KKK','.....KKK','.....ZZZ','...KKKKK']),
 'takke': hat(['.....AAA','..AAAAAA','..aaaaaa']),
 'locken': merge(part(10,['....H.H.','..HHHHHH','.HHHHHHH','.HHHHHHH']),sides('H',14,18,0,2),part(19,['.H......'])),

}
# ---- Gesichts-Extras
EXTRA={
 'monokel': {15:'.........GGG....',16:'.........G.G....',17:'.........GGG....',18:'...........G....',19:'...........G....',20:'............G...',21:'............G...',22:'............G...'},
 'augenklappe': {14:'......KKKK......',15:'....KKK.........',16:'....KKK.........',17:'....KKK.........',13:'..........KK....'},
 'narbe': {17:'..........W.....',18:'.........W......',19:'..........W.....'},
 'fangs': {21:'......W..W......'},
 'ohrring': {19:'..G.............',20:'..G.............'},
 'schminke': {18:'.....M....M.....'},
 'schoenheitspunkt': {18:'..........K.....'},
 'rose_ohr': {15:'............ZZ..',16:'............ZZZ.',17:'.............Z..'},
 'netz': {15:'....K.K.K.K.....',17:'.....K.K.K.K....'},
 'domino': {15:'....KKKKKKKK....',16:'....KWKKKKWK....',17:'....KKKKKKKK....'},
}
# ---- Körper (y24..32, letzte Zeile Gold)
def body(rows):
    assert len(rows)==9; return part(24,rows)
BODY={
 'platz':  body(['....RRRR','..RRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','GGGGGGGG']),
 'koenig': body(['....WWWW','..WWKWWW','RRRRRRRW','RRRGRRRW','RRRRRRRW','RRRRRRRW','RRRGRRRW','RRRRRRRW','GGGGGGGG']),
 'kaftan': body(['....RRGG','..RRRRRG','RRRRRRRG','RGRRRRRG','RRRRRRRG','RRRRGRRG','RRRRRRRG','RGRRRRRG','GGGGGGGG']),
 'kleid':  body(['....RRSS','..RRRRSG','RRRRRRRR','RRRRRRRR','GGGGGGGG','RRRRRRRR','RRRRRRRR','RRRRRRRR','GGGGGGGG']),
 'frack':  body(['....WWZZ','..RRWWZZ','RRRRLWZZ','RRRRRLWW','RRRRRRLW','RRRGRRRL','RRRRRRRR','RRRGRRRR','GGGGGGGG']),
 'umhang': body(['...ZZWWW','..ZZRWWW','ZZRRRRWW','ZRRRRRRW','RRRRRRRW','RRRRRRRR','RRRRRRRR','RRRRRRRR','GGGGGGGG']),
 'pirat':  body(['....WWWW','..RRWWWW','RRRRnWWW','RRRRRnWW','RRRRRRnW','RRGRRRRn','RRRRRRRR','RRGRRRRR','GGGGGGGG']),
 'kette':  body(['....NnNn','..NnNnNn','NnNRRRRR','NnNRRRRR','NnNRRRRR','NnNRRRRR','NnNRRRRR','NnNRRRRR','GGGGGGGG']),
 'wams':   body(['....WWWW','..RRRRWW','RRRRRRRW','RRRRRRRR','GGGGGGGG','RRRRRRRR','RRRRRRRR','RRRRRRRR','GGGGGGGG']),
}
# Hohe Kragen / Umhang hinter dem Kopf
BACK={
 'hochkragen': {21:'KK............KK',22:'KKK..........KKK',23:'KKKK........KKKK',24:'KKKKK......KKKKK'},
 'hochkragen_rot': {20:'Z..............Z',21:'ZK............KZ',22:'ZKK..........KKZ',23:'ZKKK........KKKZ',24:'ZKKKK......KKKKZ'},
}
# ---- Accessoires am Körper
ACC={
 'rose': {26:'..........ZZZ...',27:'..........ZJZ...',28:'..........ZZZ...',29:'...........Q....',30:'...........Q....'},
 'rose_w': {26:'..........WWW...',27:'..........WZW...',28:'..........WWW...',29:'...........Q....',30:'...........Q....'},
 'herz': {26:'.....J.J........',27:'.....JJJ........',28:'......J.........'},
 'kreuz': {26:'.......WW.......',27:'......WWWW......',28:'.......WW.......',29:'.......WW.......'},
 'feder': {24:'.............FF.',25:'............FF..',26:'...........FF...',27:'..........WW....'},
 'ketten': {25:'.....GGGGGG.....'},
 'perlen': {25:'.....WWWWWW.....',26:'......W..W......'},
 'schaerpe': {27:'RRRRRRRRRRRRRRRR'},
 'orden': {27:'..W.............',28:'..G.............'},
}
HAIR['locken']=HAT.pop('locken')

# ======== Runde 2: Turban-Formen, Fez hoch/eckig, Zylinder-Formen ========
def rows_raw(y0,rows): return {y0+i:raw(r) for i,r in enumerate(rows)}
TURBAN={
 'rund':      part(5,['.....AAA','...AAAAA','..AAAAAA','..aaaaaa','.AAAAAAA','.AAAAAAA','.aaaaaaa','.AAAAAAJ','..AAAAAA']),
 'osman_hoch':part(3,['....AAAA','...AAAAA','...AAAAA','...aaaaa','..AAAAAA','..AAAAAA','..aaaaaa','..AAAAAA','..AAAAAJ','..AAAAAA']),
 'moghul':    merge(part(7,['....AAAA','..AAAAAA','.AAAAAAA','.aaaaaaa','.AAAAAAA','.AAAAAAJ','.GGGGGGG']),{3:'..........F.....',4:'.........FF.....',5:'.........FF.....',6:'........FF......'}),
 'safawid':   merge(part(4,['.......Z','......ZZ','......ZZ','.....ZZZ','.....ZZZ']),part(9,['...AAAAA','..AAAAAA','..aaaaaa','..AAAAAA','..AAAAAJ'])),
 'sikh':      part(6,['.......A','.....AAA','...AAAAA','..AAaAAA','..AaAAaA','.AAAAAAA','.AaAaAaA','.AAAAAAJ']),
 'zwiebel':   part(3,['.......G','......AA','.....AAA','....AAAA','...AAAAA','..AAAAAA','..AAAAAA','..aaaaaa','..AAAAAJ','..AAAAAA']),
 'kufiya':    merge(part(10,['...AAAAA','..AAAAAA','..KKKKKK','..AAAAAA']),sides('A',14,22,0,2),sides('A',23,27,0,3),{13:'..AAAAAAAAAAAA..'}),
 'zweistufig':merge(part(3,['......AA','.....AAA','.....AAA','....aaaa']),part(7,['...AAAAA','..AAAAAA','..AAAAAA','..aaaaaa','.AAAAAAA','.AAAAAAJ'])),
}
HAT.update({'turban_'+k:v for k,v in TURBAN.items()})
def fez_rows(h,taper=0,tassel_len=4):
    """Fez: h Zeilen hoch, unten bei y=13. taper=0 eckig, 1 leicht konisch. Rechte Seite 'a' = Schatten."""
    y0=13-h+1; d={}
    for i in range(h):
        w=10 if taper==0 else (8 if i<h//3 else 10)
        l=(16-w)//2
        row=['.']*16
        for c in range(l,l+w): row[c]='A'
        row[l+w-1]='a'
        d[y0+i]=''.join(row)
    # Quaste: Kordel von der Mitte nach rechts, kurz herunter
    cord=['.']*16
    for c in range(7,11): cord[c]='G'
    d[y0]=''.join(a if b=='.' else b for a,b in zip(d[y0],cord))
    for k in range(1,tassel_len+1):
        row=list(d[y0+k]); row[10]='G'
        if k==tassel_len: row[11]='G'
        d[y0+k]=''.join(row)
    return d
HAT.update({'fez_h9':fez_rows(9),'fez_h11':fez_rows(11,tassel_len=5),'fez_h9k':fez_rows(9,1),'fez_h10':fez_rows(10,tassel_len=5)})
def zyl(rows_top,band_i,brim,hi=True,bandcol='Z'):
    """rows_top: Liste Halbzeilen (8) der Krone von oben nach unten; band_i: Index der Bandzeile; brim: Halbzeile der Krempe (letzte Zeile bei y=13)"""
    allr=[]
    for i,r in enumerate(rows_top):
        r=r if i!=band_i else r.replace('K',bandcol).replace(bandcol+bandcol,bandcol+'G') if False else r
        allr.append(r)
    full=[mir(r) for r in allr]+[mir(brim)]
    out=[]
    for i,r in enumerate(full[:-1]):
        r=list(r)
        if i==band_i:
            r=[('Z' if ch=='K' else ch) for ch in r]
            mid=[j for j,ch in enumerate(r) if ch=='Z']
            c=(mid[0]+mid[-1])//2
            r[c]='G'; r[c+1]='G'
        elif hi:
            first=next((j for j,ch in enumerate(r) if ch=='K'),None)
            if first is not None and i>0: r[first+1]='k'
        out.append(''.join(r))
    out.append(full[-1])
    y0=13-len(out)+1
    return {y0+i:raw(r) for i,r in enumerate(out)}
ZYL={
 'z_gerade':  zyl(['....KKKK']*7+['....KKKK','....KKKK'],7,'..KKKKKK'),
 'z_kegel':   zyl(['...KKKKK']*3+['....KKKK']*5+['....KKKK'],7,'..KKKKKK'),
 'z_sanduhr': zyl(['...KKKKK']*2+['....KKKK']*5+['...KKKKK','...KKKKK'],7,'.KKKKKKK'),
 'z_lincoln': zyl(['....KKKK']*10+['....KKKK'],9,'..KKKKKK'),
 'z_krempe':  zyl(['....KKKK']*5+['....KKKK'],5,'K.KKKKKK'),
 'z_flach':   zyl(['....KKKK']*3+['....KKKK'],3,'..KKKKKK'),
}
# Zylinder gekippt: Zeilen nach rechts verschoben
def tilt(d,step=3):
    out={}; ys=sorted(d)
    for y in ys:
        sh=(13-y)//step
        r=d[y]; r=('.'*sh+r)[:16] if sh>0 else r
        out[y]=r
    return out
ZYL['z_breit']=zyl(['..KKKKKK']*8,7,'.KKKKKKK')
HAT.update(ZYL)
def shorten(d,n): 
    ys=sorted(d)[n:]; return {y:d[y] for y in ys}
for k in list(ZYL): HAT[k+'_d']=shorten(ZYL[k],3 if len(ZYL[k])>5 else 1)

# ======== Runde 3 ========
def fez_w(widths,cord=True):
    """Fez mit Zeilenbreiten (gerade Zahlen, zentriert), rechts 'a' als Seitenschatten. Kordel exakt wie Version B:
    von der Mitte nach rechts, an Spalte 10 zwei Zeilen herunter, Ende zeigt nach links (Spalten 9..10)."""
    h=len(widths); y0=13-h+1; d={}
    for i,w in enumerate(widths):
        l=(16-w)//2; row=['.']*16
        for c in range(l,l+w): row[c]='A'
        row[l+w-1]='a'; d[y0+i]=''.join(row)
    if cord:
        def put(y,cols):
            r=list(d[y])
            for c in cols: r[c]='G'
            d[y]=''.join(r)
        put(y0,(8,9,10)); put(y0+1,(10,)); put(y0+2,(10,)); put(y0+3,(9,10))
    return d
HAT['fez_A']=fez_w([8,10,10,10,10,10,10,10,10])          # eckig, nur 1 Pixel Rundung oben
HAT['fez_B4']=fez_w([8,8,8,10,10,10,10,10,10])           # B4 wie bisher (leicht konisch), Kordel korrigiert
HAT['fez_C']=fez_w([6,8,8,10,10,10,10,10,10])            # konisch + abgerundet (zwei Stufen), nur zum Vergleich
HAT['z_a11']=zyl(['....KKKK']*10,8,'..KKKKKK')           # Zylinder A, 1 Pixel höher: Oberkante y=3 wie das K

# ======== Runde 4 ========
HAIR['pony_a']=part(12,['...HHHHH','..HHHHHH','..HHHHHH','..HH....','..HH....','..H.....'])   # Pony nur 1 Zeile, 1 px Luft zu den Augen
HAIR['pony_b']=part(12,['...HHHHH','..HHHHHH','..HH....','..HH....','..H.....'])             # kein Pony, nur Seiten: 2 px Luft
HAIR['pony_c']=rows_raw(12,['...HHHHHHHHHH...','..HHHHHHHHHHHH..','..HHHHHHHHH..HH.','..HH..........H.','..HH............','..H.............'])  # Seitenscheitel
HAIR['pony_d']=part(12,['...HHHHH','..HHHHHH','..HHHH..','..HH....','..HH....','..H.....'])   # Mittelscheitel
EXTRA['monokel_l']={15:'....GGG.........',16:'....G.G.........',17:'....GGG.........',18:'....G...........',19:'....G...........',20:'...G............',21:'...G............',22:'...G............'}
EXTRA['brauen']={15:'....HHH..HHH....'}
EXTRA['nase']={17:'.......tt.......'}      # Nase per Formel aus der Hautfarbe (t)
EXTRA['schlaefen']={14:'...H........H...',15:'...H........H...',16:'...H........H...',17:'...BB......BB...'}
EXTRA['wangenbogen']={15:'...B........B...',16:'...BB......BB...',17:'...BBB....BBB...'}
EXTRA['turbanschatten']={14:'....TTTTTTTT....'}

# ======== Runde 5 ========
BODY['leer']={}
# Lange Haare unter einem Hut mit schmaler Krone: keine Haar-Pixel über der Krempe (y12 entfällt)
HAIR['lang_z']=merge(part(13,['..HHHHHH','..HHHHHH']),sides('H',15,28,1,2),sides('H',21,27,1,3))

# ======== Runde 8: Pik-Familie (Bube Topfschnitt, Dame Bob) + Brillen ========
_ring_top='....KKK..KKK....'; _r2='...K...KK...K...'; _r3='..K....KK....K..'
EXTRA['brille_s']=rows_raw(15,['....KKK..KKK....','....K.KKKK.K....','....KKK..KKK....'])
EXTRA['brille_m']=rows_raw(14,[_ring_top,_r2,_r2,_r2,_ring_top])
EXTRA['brille_l']=rows_raw(13,[_ring_top,_r2,_r3,_r3,_r3,_r2,_ring_top])
EXTRA['brille_l_dick']=rows_raw(13,['...KKKKKKKKKK...',_r2,_r3,_r3,_r3,_r2,_ring_top])
EXTRA['brille_xl']=rows_raw(12,['...KKKKKKKKKK...','..K....KK....K..']+['.K....K..K....K.']*5+['..K....KK....K..','...KKKKKKKKKK...'])
HAIR['topf_a']=part(11,['....HHHH','..HHHHHH','.HHHHHHH','.HHHHHHH','.HH.....','.HH.....'])
HAIR['topf_b']=part(11,['....HHHH','...HHHHH','..HHHHHH','..HHHHHH','..HH....','..HH....'])
HAIR['topf_c']=part(11,['...HHHHH','..HHHHHH','.HHHHHHH','.HHHHHHH','.HH.....','.HH.....','.H......'])
HAIR['bob_wange']=merge(part(11,['....HHHH','..HHHHHH','.HHHHHHH','.HHHHHHH']),sides('H',15,19,1,2),part(20,['.HHH....']))
HAIR['bob_kinn']=merge(part(11,['....HHHH','..HHHHHH','.HHHHHHH','.HHHHHHH']),sides('H',15,21,1,2),part(22,['.HHHH...']))
HAIR['bob_lang']=merge(part(11,['....HHHH','..HHHHHH','.HHHHHHH','.HHHHHHH']),sides('H',15,25,1,2),part(26,['.HHHH...']))

# Brillen neu: Augen bleiben bei Spalte 5 und 10 (Zeile 16)
EXTRA['brille_l']=rows_raw(13,[_ring_top,_r2,_r2,_r2,_r2,_r2,_ring_top])                      # hohes Oval 5 x 7
EXTRA['brille_xl']=rows_raw(13,[_ring_top,_r2,'..K...K..K...K..','..K...K..K...K..','..K...K..K...K..',_r2,_ring_top])  # 7 x 7, Mitte offen
EXTRA['brille_l_dick']=rows_raw(12,['...KKKKKKKKKK...',_r2,_r2,_r2,_r2,_r2,_ring_top])        # hohes Oval mit dickem Brauensteg
EXTRA['brille_xl']=rows_raw(13,[_ring_top,_r2,'..K..........K..','..K....KK....K..','..K..........K..',_r2,_ring_top])   # 7 x 7 rund, Gläser berühren sich mittig

# ======== Runde 9 ========
HAIR['bob_kinn2']=merge(part(11,['....HHHH','..HHHHHH','.HHHHHHH','.HHHHHHH']),sides('H',15,22,1,2),part(23,['.HHHH...']))   # Bob kinnlang, 1 Pixel länger
EXTRA['brille_dick_v1']=rows_raw(13,['...KKKKKKKKKK...',_r2,_r2,_r2,_r2,_ring_top])            # obere Kante 1 Pixel tiefer
EXTRA['brille_dick_v2']=rows_raw(13,['...KKKKKKKKKK...','...KKKKKKKKKK...',_r2,_r2,_r2,_ring_top])  # obere Kante 2 Pixel dick

# ======== Runde 10 ========
HAIR['bob_kinn3']=merge(part(10,['.....HHH','....HHHH','..HHHHHH','.HHHHHHH','.HHHHHHH']),sides('H',15,23,1,2),part(24,['.HHHH...']))  # oben +1, unten +1
_bar='...KKKKKKKKKK...'
EXTRA['brille_v1b']=rows_raw(14,[_bar,_r2,_r2,_r2,_ring_top])          # Version 1, Oberkante nochmal 1 Pixel tiefer (5 hoch, Pupille 3. Pixel)
EXTRA['brille_6p_dick']=rows_raw(14,[_bar,_r2,_r2,_r2,_r2,_ring_top])  # hohes Oval 6 hoch mit dickem Steg, Pupille 3. Pixel
EXTRA['brille_6p']=rows_raw(14,[_ring_top,_r2,_r2,_r2,_r2,_ring_top])  # hohes Oval 6 hoch ohne Steg, Pupille 3. Pixel

# ======== Runde 11 ========
def _bob(dome): return merge(part(10,dome),sides('H',15,23,1,2),part(24,['.HHHH...']))
HAIR['bob_r1']=_bob(['.....HHH','....HHHH','...HHHHH','..HHHHHH','.HHHHHHH'])   # Kuppel 6,8,10,12,14 (1 px Stufen)
HAIR['bob_r2']=_bob(['.....HHH','...HHHHH','..HHHHHH','.HHHHHHH','.HHHHHHH'])   # 6,10,12,14,14
HAIR['bob_r3']=_bob(['....HHHH','...HHHHH','..HHHHHH','.HHHHHHH','.HHHHHHH'])   # 8,10,12,14,14 (flach rund)
EXTRA['mund_schmal']={20:'......SMMS......'}
EXTRA['monokel_m']={14:'....GGG.........',15:'...G...G........',16:'...G...G........',17:'...G...G........',18:'....GGG.........',19:'....G...........',20:'...G............',21:'...G............',22:'...G............'}
EXTRA['monokel_m_ohne']={k:v for k,v in EXTRA['monokel_m'].items() if k<=18}

# ======== Runde 12: Melone (Bowler) für die Dame ========
def _melone(band='K'):
    r=lambda s: s.replace('B',band)
    return rows_raw(8,['......KKKK......','.....kKKKKK.....',r('....BBBBBBBB....'),'...KKKKKKKKKK...'])
HAT['melone_a']=_melone('K')
HAT['melone_a_rot']=_melone('Z')
HAT['melone_a_gold']=_melone('G')
def _melone_tilt(shift,drop,band='K'):
    """Neigung nach rechts: Kuppel um 'shift' nach rechts, linkes Krempenende um 'drop' Zeilen tiefer."""
    sp=lambda s,n: ('.'*n+s)[:16]
    rows={8:sp('.....KKKK.....'+'.',shift)[:16],9:sp('....kKKKKK....'+'..',shift),10:sp('...'+band*8+'.....',shift)}
    rows={y:r.ljust(16,'.')[:16] for y,r in rows.items()}
    rows[8]=sp('......KKKK......',shift); rows[9]=sp('.....kKKKKK.....',shift)
    rows[10]=sp('....'+band*8+'....',shift)
    rows[11]=sp('...KKKKKKKKKK...',shift)
    # linkes Krempenende tiefer: die linken 3 Pixel der Krempe wandern 'drop' Zeilen nach unten
    left=rows[11][:5+shift]
    rows[11]=('.'*len(left))+rows[11][len(left):]
    for k in range(1,drop+1):
        rows[11+k]=('.'*16)
    ys=11+drop
    rows[ys]=''.join(('K' if c!='.' else '.') for c in left).ljust(16,'.')[:16] if False else ''.join('K' if 0<=i<len(left) and left[i]!='.' else '.' for i in range(16))
    return {y:r[:16].ljust(16,'.') for y,r in rows.items()}
HAT['melone_b']=_melone_tilt(1,1,'K')
HAT['melone_b_rot']=_melone_tilt(1,1,'Z')
HAT['melone_c']=_melone_tilt(2,2,'K')
HAT['melone_c_rot']=_melone_tilt(2,2,'Z')
HAT['melone_gross']=rows_raw(7,['......KKKK......','.....kKKKKK.....','....KKKKKKKK....','....ZZZZZZZZ....','..KKKKKKKKKKKK..'])

# Neigung sauber von Hand (überschreibt die Hilfsfunktion oben)
def _tilt_b(band):
    return rows_raw(8,['.......KKKK.....','......kKKKKK....','.....'+band*8+'...','....KKKKKKKKKK..','...KK...........'])
def _tilt_c(band):
    return rows_raw(8,['........KKKK....','.......kKKKKK...','......'+band*8+'..','.....KKKKKKKKKK.','....KKK.........','...KK...........'])
HAT['melone_b']=_tilt_b('K'); HAT['melone_b_rot']=_tilt_b('Z')
HAT['melone_c']=_tilt_c('K'); HAT['melone_c_rot']=_tilt_c('Z')

# ======================= Runde 13: neue Teile für die offenen Charaktere =======================
def pxart(rows,x0,y0):
    return [(x0+i,y0+j,ch) for j,r in enumerate(rows) for i,ch in enumerate(r) if ch!='.']
# ---- Haare
HAIR['wild']=merge(rows_raw(8,['....H..H..H.H...','...H..H...H..H..','..HHH.HH.HHH.HH.','.HHHHHHHHHHHHHH.','.HHHHHHHHHHHHHH.','.HHHHHHHHHHHHHH.','.HHHHHHHHHHHHHH.']),sides('H',15,22,1,2))
HAIR['bun']=merge(part(7,['.....HHH','....HHHH','....HHHH','.....HHH']),part(11,['....HHHH','...HHHHH','..HHHHHH','..HHHHHH','..HH....','..HH....']))
HAIR['zoepfe']=merge(part(11,['....HHHH','...HHHHH','..HHHHHH','..HHHHHH']),{y:('..'+('H' if y%2 else 'h')*2+'.'*8+('H' if y%2 else 'h')*2+'..') for y in range(15,29)},rows_raw(29,['..GG........GG..']))
HAIR['mittelscheitel_lang']=merge(part(11,['....HHHH','...HHHHH','..HHHHHH','..HHHH..','..HHH...']),sides('H',15,27,1,2),sides('H',21,26,1,3))
HAIR['pferdeschwanz']=merge(part(11,['....HHHH','..HHHHHH','..HHHHHH','..HHHHHH','..HH....','..H.....']),rows_raw(7,['.........HH.....','........HHHH....','.......HHHHHH...','.......HHHHHHH..']),{y:'.............HH.' for y in range(11,22)},rows_raw(22,['.............H..']))
HAIR['zopf_seite']=merge(HAIR['kurz'],{y:'.............HH.' for y in range(15,23)},rows_raw(23,['.............GG.']))
HAIR['pagen']=merge(part(11,['....HHHH','..HHHHHH','..HHHHHH','..HHHHHH','..HHH...','..HHH...']))
# ---- Hüte und Kopfschmuck
HAT['sikke']=part(5,['.....AAA','.....AAA','....AAAA','....AAAA','....AAAA','....AAAA','....AAAA','....AAAA','...aaaaa'])
HAT['stirnband']=part(13,['...GGGGJ'])
HAT['turban_klein']=part(8,['......AA','....AAAA','...AAAAA','...aaaaa','...AAAAA','...AAAAJ'])
HAT['feder_ohr']=rows_raw(11,['..............W.','.............WF.','.............FF.','............FF..','............F...','............Y...'])
HAT['tikka']=rows_raw(12,['.......GG.......','.......GG.......','.......JJ.......'])
HAT['tikka_herz']=rows_raw(12,['.....JJ..JJ.....','.....JJJJJJ.....','......JJJJ......','.......JJ.......'])
HAT['mond']=rows_raw(5,['.......GG.......','....G......G....','....GG....GG....','.....GG..GG.....','......GGGG......'])
HAT['muenzen']=rows_raw(13,['...GGGGGGGGGG...','...G.G.GG.G.G...'])
HAT['ohrringe']=rows_raw(19,['..G..........G..','..G..........G..'])
HAT['ohrringe_2x2']=rows_raw(19,['..GG........GG..','..GG........GG..'])   # 2x2 Pixel, Richtung Gesicht (nicht nach außen)
HAT['perlenband']=rows_raw(13,['...WWWWWWWWWW...'])
HAT['diadem_gross_v2']=part(9,['.......J','....J.GG','....GGGG','...GGGJG','...GGGGG'])   # markierte Pixel (Spitzen, Mittelspitze, Eckpixel links) 1 px runter, 2 Steine im Band
HAT['diadem_gross']=part(8,['.......J','....J.GG','....G.GG','...GGGGG','...GGGJG','...GGGGG'])
HAT['goldband']=rows_raw(13,['...GGGGGGGGGG...'])
HAT['uraeus']=rows_raw(10,['.......GG.......','.......JJ.......','.......GG.......'])
HAT['kajal']=rows_raw(15,['...K........K...','....K......K....'])
HAT['schminke_streifen']=rows_raw(18,['....ZZZZZZZZ....'])
HAT['sommersprossen']=rows_raw(18,['....w.w..w.w....'])
HAT['nemes']=merge(part(10,['....GGGG','...nnnnn','..GGGGGG','..nnnnnn']),{y:('.GG' if y%2==0 else '.nn').ljust(3,'.')+'.'*10+('GG.' if y%2==0 else 'nn.') for y in range(14,22)},rows_raw(22,['.GGG........GGG.','GGGG........GGGG','nnnn........nnnn','GGGG........GGGG']))
HAT['reiher']=rows_raw(1,['.......FF.......','......FFF.......','.......FF.......','.......FJ.......'])
HAT['geweih']=part(3,['.O..O...','.O..O...','.OO.O...','..OOO...','..OO....','..OO....','...OO...','...OO...','....OO..','....OOO.'])
HAT['wikingerhelm']=merge(part(10,['.....NNN','....NNNN','...NNNNN','..nnnnnn']),{y:'.......NN.......' for y in range(14,18)},rows_raw(6,['.O............O.','.O............O.','.OO..........OO.','..OO........OO..']),part(10,['..OOO...','...OO...','...O....'])) 
HAT['wikinger_klein']=merge(part(10,['.....NNN','....NNNN','...NNNNN','..nnnnnn']),{y:'.......NN.......' for y in range(14,17)})
HAT['helm_fluegel']=merge(part(10,['.....NNN','....NNNN','...NNNNN','..nnnnnn']),{y:'.......NN.......' for y in range(14,17)},rows_raw(6,['.W............W.','.WW..........WW.','.WWW........WWW.','..WWW......WWW..','..WWW......WWW..','...WW......WW...']))
HAT['tropenhelm']=part(8,['.......a','.....uuu','....uuuu','...uuuuu','...aaaaa','.uuuuuuu'])
HAT['kabuto']=merge(rows_raw(5,['...G........G...','....G......G....','.....G....G.....','......G..G......','.......GG.......']),part(10,['....nnnn','...nnnnn','..nnnnnn']),part(13,['..NNNNNN']),sides('n',14,19,1,2))
HAT['seemannsmuetze']=part(10,['..WWWWWW','.WWWWWWW','..KKKKKG'])
HAT['fedora']=part(9,['....qqqq','...qqwqq','...qqwqq','...aaaaa','.qqqqqqq'])
HAT['narrenkappe']=part(6,['.......G','.......A','......AA','..G..AAA','..aaAAAA','...AAAAA','...aAAAA','...AAAAA'])
HAT['ninja']=merge(part(11,['....KKKK','...KKKKK','...KKKKK','...KKKKK']),part(18,['...KKKKK','...KKKKK','...KKKKK','....KKKK','.....KKK']),rows_raw(13,['.........KK.....']),rows_raw(14,['...ZZZZZZZZZZ...']))
HAT['kapuze_k']=HAT['kapuze']
# ---- Bärte / Gesichtsbehaarung
BEARD['zwirbel_gross']=rows_raw(17,['.B............B.','.BB..........BB.','..BBBBBBBBBBBB..'])
BEARD['wikinger']=merge(part(17,['...B....','...BBBBB','...BBBBB','...BBBMM','...BBBBB','....BBBB','....BBBB']),part(24,['.....BB.','.....BB.','.....GG.','.....BB.','.....BB.','.....GG.']))
BEARD['pharao']=rows_raw(21,['.......GG.......','.......nn.......','.......GG.......','.......nn.......','........GG......'])
BEARD['grau_lang']=BEARD['lang']
# ---- Absolut-Pixel-Teile (Karte-Koordinaten) werden in comp.compose über spec['px'] gezeichnet
BIRD_NACHTIGALL=['..www.','.wwwKF','wwOOw.','.wOO..']
BIRD_PAPAGEI=['..ZZ.','.ZZKG','bZZZ.','bbyy.','b.F.F']
BIRD_KOPF=['..www.','.wwwKF','wwOOw.','.wOO..']

HAT['mond']=rows_raw(7,['.......GG.......','....G......G....','....GG....GG....','.....GG..GG.....','......GGGG......'])

# ---- Runde 14
HAT['hennin']=merge(part(3,['.......A','......AA','......AA','.....AAA','.....AAA','....AAAA','....AAAA','...AAAAA','...AAAAA','..AAAAAA','..GGGGGG']),
                    rows_raw(3,['.........VVV....','..........VVV...','..........VVV...','...........VV...','...........VV...','...........VV...','............V...']))
HAIR['schnecken']=merge(part(11,['....HHHH','...HHHHH','..HHHHHH','..HHHHHH']),rows_raw(15,['..HH........HH..','.HHHH......HHHH.','.HhHH......HHhH.','.HHHH......HHHH.','..HH........HH..']))

# ---- Runde 16: Zylinder 1 Pixel niedriger (oben), weil die Person 1 Pixel höher rutscht
HAT['z_a10']={y:r for y,r in HAT['z_a11'].items() if y>min(HAT['z_a11'])}

# ======== Runde 17: Kronen für den Kreuz König ========
HAT['krone_kreuz']=part(5,['.......G','......GG','.......G','.....GGG','....G...','...G....','...GGGGG','...GGJGG','...GGGGG'])
HAT['krone_zacken_eisen']=part(10,['..N..N.N','..NNNNNN','..nnnJnn','..NNNNNN'])
HAT['krone_perlen']=part(10,['..W.W.W.','..GGGGGG','..GGGJGG','..GGGGGG'])
HAT['goldring']=part(12,['...GGGGG','...GGJGG'])
HAT['krone_klein']=part(9,['....G.G.','...GGGGG'])
HAT['pelz']=part(11,['...qqqqq','..qqOqqq','..qqqqqq'])
HAT['mian']=rows_raw(9,['..GGGGGGGGGGGG..','..KKKKKKKKKKKK..','...W.W.WW.W.W...','...W.W.WW.W.W...','...W.W.WW.W.W...'])
HAT['krone_schwarz']=part(10,['..G..G.G','..KKKKKK','..KKKJKK','..GGGGGG'])
HAT['krone_blatt']=part(10,['..Q.G.Q.','..QQQQQQ','..QGQQGQ','..GGGGGG'])
# Bügelkrone mit rotem Samtfutter innen (statt leerem Raum unter dem Bügel)
HAT['krone_kreuz']=part(5,['.......G','......GG','.......G','.....GGG','....GZZZ','...GZZZZ','...GGGGG','...GGJGG','...GGGGG'])

# ---- Runde 18: schmalere Bärte
BEARD['schnurr_schmal']=part(19,['.....BBB'])
BEARD['schnurr_ziege']=merge(BEARD['schnurr'],part(21,['.....BBB','......BB']))

# ======== Runde 19: Krone Kreuz König (1 px höher, mehr Steine) und längere Dame-Haare ========
HAT['krone_ck_a']=hat(['..GG.GG.','..GGGGGG','..GGJGGJ','..GGGGGG','..GGGGGG'])   # Band +1 Zeile, 3 Steine (außen + Mitte)
HAT['krone_ck_b']=hat(['..GG.GG.','..GG.GG.','..GGGGGG','..GGJGJG','..GGGGGG'])   # Zacken +1 Zeile, 4 Steine
HAT['krone_ck_c']=hat(['..GG.GG.','..GG.GG.','..GGGGGG','..GGJGGJ','..GGGGGG'])   # Zacken +1 Zeile, 3 Steine
HAT['krone_ck_d']=hat(['..GG.GG.','..GGGGGG','..GGJGJG','..GGGGGG','..GGGGGG'])   # Band +1 Zeile, 4 Steine
def _bob_len(dome,extra_len):
    return merge(part(10,dome),sides('H',15,23+extra_len,1,2),part(24+extra_len,['.HHHH...']))
_R2=['.....HHH','...HHHHH','..HHHHHH','.HHHHHHH','.HHHHHHH']
HAIR['bob_r2_l1']=_bob_len(_R2,1); HAIR['bob_r2_l2']=_bob_len(_R2,2); HAIR['bob_r2_l3']=_bob_len(_R2,3)

# ---- Runde 20: Kreuz König Krone final: Band +1 Zeile, 4 Steine gleichmäßig (Spalten 3, 6, 9, 12), eine Zeile tiefer
HAT['krone_ck_final']=hat(['..GG.GG.','..GGGGGG','..GGGGGG','..GJGGJG','..GGGGGG'])

# ======================= Runde 21: kreative Zusatzteile für Herz Bube/Dame und Kreuz Bube/Dame =======================
HAT['kamm']=rows_raw(8,['.........G.G.G..','.........GGGGG..'])
HAT['sterne_schleier']=rows_raw(15,['.G............G.','................','................','..G..........G..','................','................','.G............G.'])
HAT['schleife']=rows_raw(9,['....GGG..GGG....','....GGGGGGGG....','....GGG..GGG....'])
HAT['ohrperlen']=rows_raw(19,['..W..........W..','..W..........W..'])
HAT['mond_klein']=rows_raw(11,['......G..G......','.......GG.......'])
HAT['perlen_haar']=rows_raw(12,['...W.W.WW.W.W...','..W.W.W..W.W.W..','................','................','.W............W.','................','..W..........W..','................','.W............W.'])
HAT['tulpenkranz']=rows_raw(12,['...Z.Z.ZZ.Z.Z...','...ZGZGZZGZGZ...'])
HAT['krause']=rows_raw(24,['...WVWVWVWVWV...','..WVWVWVWVWVWV..'])
HAT['hermelin']=rows_raw(24,['...WWWWWWWWWW...','..WWKWWWWWWKWW..','.WWWWWKWWKWWWWW.'])
HAIR['zopfkrone']=merge(part(9,['....HhHh','..HhHhHh','.HhHhHhH','.HHHHHHH']),part(13,['.HHHHHHH','..HHHHHH']),sides('H',15,17,1,2))
HAIR['zoepfe_gold']=merge(part(11,['....HHHH','...HHHHH','..HHHHHH','..HHHHHH']),{y:('..'+('H' if y%2 else 'G')*2+'.'*8+('H' if y%2 else 'G')*2+'..') for y in range(15,29)},rows_raw(29,['..GG........GG..']))
# Absolut-Pixel-Objekte (Kartenkoordinaten vor dem Anheben um 1 Pixel)
OBJ_FALKE=['..www.','.wwKwG','wwOOw.','wwOOw.','.G.G..']
OBJ_POKAL=['GGGGG','.GGG.','..G..','..G..','.GGG.']
OBJ_ROLLE=['GWWWWG','GWVVWG','GWWWWG']
OBJ_KERZE_FLAMME=['.G.','GFG','.G.']
OBJ_KERZE=['WW','WW','WW','WW']
OBJ_MOTTE=['W.W','.W.']
OBJ_ZEPTER_KNAUF=['GGG','GJG','GGG']
OBJ_WAPPEN=['GGGGGG','GKWWKG','GWWWWG','GKWWKG','GKWWKG','.GKKG.','..GG..']
OBJ_SPIEGEL=['.GGG.','GVVVG','GVVVG','GVVVG','.GGG.']
OBJ_FAECHER=['.GGGGG.','GWGWGWG','.GWWWG.']
OBJ_GRANAT=['.G.G','ZZZZ','ZZZZ','.ZZ.']
OBJ_TULPE=['Z.Z','ZZZ','.G.','.G.']
OBJ_HEILIGENSCHEIN=['..GGGGGG..','.G......G.','..GGGGGG..']
OBJ_FLOETE_PX=[(15,21,'G'),(16,22,'O'),(17,23,'O'),(18,24,'O'),(19,25,'O'),(20,26,'G'),(21,27,'O')]

# ======================= Runde 22: rundere Köpfe, luftige Schleier, Kamm mittig =======================
HAT['takke_rund']=part(9,['......AA','.....AAA','....AAAA','...AAAAA','..aaaaaa'])      # runde Kappe, 1-Pixel-Stufen
HAT['takke_rund_hoch']=part(8,['.......A','......AA','.....AAA','....AAAA','...AAAAA','..aaaaaa'])
HAIR['rund_scheitel']=merge(part(9,['......HH','.....HHH','....HHHH','...HHHHH','..HHHHHH']),part(14,['..HHH...','..HH....']),sides('H',14,26,1,2),sides('H',21,26,1,3),rows_raw(10,['.......SS.......','.......SS.......','.......SS.......','.......SS.......']))
HAT['kamm_mitte']=rows_raw(5,['.....G.GG.G.....','.....GGGGGG.....'])
def veil_rows(profile,dither=True,mode='fill'):
    rows={}
    for y,(o,i) in profile.items():
        row=['.']*16
        for x in range(o,i+1):
            for xx in (x,15-x):
                if mode=='outline':
                    if x==o: row[xx]='v'
                else:
                    if x==o: row[xx]='v'
                    elif (x+y)%2==0 or not dither: row[xx]='V'
        rows[y]=''.join(row)
    return rows
def _prof(d): return {y:v for y,v in d.items()}
HAT['vl_hauch']=veil_rows(_prof({11:(4,5),12:(3,4),13:(2,3),14:(1,2),15:(1,2),16:(0,2),17:(0,2),18:(0,2),19:(0,2),20:(0,2),21:(0,3),22:(0,3),23:(0,4),24:(0,5),25:(0,6),26:(0,6),27:(0,6)}))
HAT['vl_haube']=veil_rows(_prof({11:(4,5),12:(3,4),13:(2,3),14:(1,2),15:(1,2),16:(1,2),17:(1,2),18:(1,2),19:(1,2),20:(1,2),21:(1,3),22:(2,3),23:(2,4),24:(3,4)}))
HAT['vl_kurz']=veil_rows(_prof({11:(4,5),12:(3,4),13:(2,3),14:(1,2),15:(1,2),16:(1,2),17:(1,2),18:(1,3),19:(2,3),20:(2,4)}))
HAT['vl_bogen']=veil_rows(_prof({11:(3,5),12:(2,4),13:(1,3),14:(0,2),15:(0,2),16:(0,2),17:(0,2),18:(0,2),19:(0,2),20:(0,2),21:(0,3),22:(0,3),23:(0,4),24:(0,4)}))
HAT['vl_kontur']=veil_rows(_prof({11:(4,5),12:(3,4),13:(2,3),14:(1,2),15:(1,2),16:(0,2),17:(0,2),18:(0,2),19:(0,2),20:(0,2),21:(0,3),22:(0,3),23:(0,4),24:(0,5),25:(0,6),26:(0,6),27:(0,6)}),mode='outline')
HAT['vl_hinten']=veil_rows(_prof({13:(2,3),14:(1,2),15:(0,1),16:(0,1),17:(0,1),18:(0,1),19:(0,1),20:(0,1),21:(0,1),22:(0,1),23:(0,2),24:(0,2),25:(0,3),26:(0,3)}))
HAT['vl_mantilla']=veil_rows(_prof({8:(5,6),9:(4,5),10:(3,5),11:(2,4),12:(1,4),13:(1,3),14:(0,2),15:(0,2),16:(0,2),17:(0,2),18:(0,2),19:(0,2),20:(0,2),21:(0,3),22:(0,3),23:(0,4),24:(0,4)}))
HAT['vl_kopftuch']=rows_raw(10,['.....vVVVVv.....','....vVVVVVVv....','...vVVVVVVVVv...','...vVvVVVVvVv...','.............vV.','............vVV.','............vVv.','.............vV.','............vV..','...........vV...'])

# ======================= Runde 23: weiße Schleier mit Fall, Kamm-Varianten =======================
HAT['schleier_r']=merge(part(9,['......VV','.....VVV','....VVVV','...VVVVV','..VVVVVV']),sides('V',14,22,0,2),sides('V',23,27,0,4),part(13,['..GGGGGG']))
def _rows_from_halves(left,right):
    ys=sorted(set(left)|set(right)); out={}
    for y in ys:
        l=left.get(y,'........'); r=right.get(y,'........')
        assert len(l)==8 and len(r)==8,(y,l,r)
        out[y]=l+r[::-1]
    return out
_VA={10:'....WW..',11:'...WWW..',12:'..WWWV..',13:'.WWWV...',14:'.WW.....',15:'WWV.....',16:'WWV.....',17:'WWV.....',18:'WWV.....',19:'.WV.....',20:'.WV.....',21:'.WWV....',22:'..WWV...',23:'..WWWV..',24:'.WWWWV..',25:'.WWWWWV.',26:'.WWVWWV.',27:'..WWWV..',28:'...WW...'}
HAT['fall_a']=_rows_from_halves(_VA,_VA)                                    # symmetrisch, rund über die Schultern gelegt
_VA_short={y:r for y,r in _VA.items() if y<=23}; _VA_short.update({24:'.WWW....',25:'.WW.....'})
_VA_long=dict(_VA); _VA_long.update({27:'..WWWV..',28:'..WWWV..',29:'...WWV..',30:'...WW...',31:'....W...'})
HAT['fall_b']=_rows_from_halves(_VA_short,_VA_long)                          # rechts länger über die Schulter nach vorn gelegt
_cap={9:'.....WWW',10:'....WWWW',11:'...WWWWW',12:'..WVWVWV'}
_VC=dict({y:r for y,r in _VA.items() if y>=13}); _VC.update(_cap); _VC[13]='.WWWV...'
HAT['fall_c']=_rows_from_halves(_VC,_VC)                                    # Haube vorn mit welliger Kante, Haar darunter sichtbar
# Kämme (mittig)
def _comb(width,teeth_row,base_row,rot=False):
    if width==6: t='.....G.GG.G.....'; b='.....GGGGGG.....'
    else:        t='......G..G......'; b='......GGGG......'
    return ({teeth_row:b,base_row:t} if rot else {teeth_row:t,base_row:b})
HAT['kamm6_o']=_comb(6,8,9); HAT['kamm6_u']=_comb(6,9,10)
HAT['kamm4_o']=_comb(4,8,9); HAT['kamm4_u']=_comb(4,9,10)
HAT['kamm6_rot_o']=_comb(6,8,9,True); HAT['kamm6_rot_u']=_comb(6,9,10,True)

# ======================= Runde 24: Kamm seitlich (5 breit), Schleier Fall C oben + Fall B unten =======================
def _comb5(c0,y_teeth,rot=False):
    t='.'*c0+'G.G.G'+'.'*(16-c0-5); b='.'*c0+'GGGGG'+'.'*(16-c0-5)
    return {y_teeth:b,y_teeth+1:t} if rot else {y_teeth:t,y_teeth+1:b}
for _c in (7,8,9,10):
    HAT['kamm5_%d_o'%_c]=_comb5(_c,8)                 # aufrecht, Höhe wie im allerersten Entwurf
    HAT['kamm5_%d_rot_u'%_c]=_comb5(_c,9,True)        # um 180° gedreht, 1 Pixel tiefer
_capC={9:'.....WWW',10:'....WWWW',11:'...WWWWW',12:'..WVWVWV'}
_L=dict(_capC); _L[13]='.WWWV...'; _L.update({y:r for y,r in _VA_short.items() if y>=14})
_R=dict(_capC); _R[13]='.WWWV...'; _R.update({y:r for y,r in _VA_long.items() if y>=14})
HAT['fall_cb']=_rows_from_halves(_L,_R)               # oben Fall C (runde Haube), unten Fall B (rechts länger nach vorn)

# ======================= Runde 25: Falke neu gezeichnet, höhere runde Hauben =======================
FALKE_A=['.hhh..','hqKqG.','hwWWq.','hwWWh.','hwqqh.','.hGhG.']      # Blick nach rechts, 6 x 6
FALKE_B=['..hhh..','.hqqKG.','hqqWWG.','hwwWW..','hwwqq..','.hhGhG.']  # Blick nach rechts, 7 x 6
def mirror(rows): return [r[::-1] for r in rows]
def _shift(d,dy): return {y+dy:r for y,r in d.items()}
def _fall_cap(widths):
    cap={}; n=len(widths)
    for i,w in enumerate(widths):
        y=12-(n-1-i)
        cap[y]='..WVWVWV' if i==n-1 else '.'*(8-w//2)+'W'*(w//2)
    L=dict(cap); L.update({y:r for y,r in _L.items() if y>=13})
    R=dict(cap); R.update({y:r for y,r in _R.items() if y>=13})
    return _rows_from_halves(L,R)
DOMES={'d1':[4,6,8,10,12],'d2a':[2,4,6,8,10,12],'d2b':[4,6,8,10,12,12],'d3a':[2,4,6,8,10,12,12],'d3b':[4,6,8,10,12,12,12]}
for _k,_w in DOMES.items():
    HAT['fall_'+_k]=_fall_cap(_w)
    HAT['mond_'+_k]=_shift(HAT['mond'],-(len(_w)-4))
for _c in (8,):
    pass

# ======================= Runde 27: Herz Bube Kompromiss, runde Hauben =======================
HAT['turbm_a']=part(8,['......AA','....AAAA','...AAAAA','...AAAAA','...AAAAA','...GGGGG'])   # Turbanform HB5, goldenes Band, keine graue Linie
HAT['turbm_b']=part(8,['......AA','....AAAA','...aaaaa','...AAAAA','...AAAAA','...GGGGG'])   # graue Linie eine Zeile höher (y10), damit sie dem Mond nicht in die Quere kommt
HAT['turbm_c']=part(8,['......AA','....AAAA','...AAAAA','...aaaAA','...AAAAA','...GGGGG'])   # graue Linie in Zeile 11, in der Mitte für den Mond unterbrochen

# ---- Runde 28: Schleier Rc fest übernommen (Haube 8,10,12,12,12), Mond passend verschoben
HAT['fall_rc']=_fall_cap([8,10,12,12,12])
HAT['mond_rc']=_shift(HAT['mond'],-1)

# ======================= Runde 29: Auswahl-Feinschliff, Pik-König-Zwilling =======================
HAIR['kurz_b']=part(12,['...HHHHH','...HHHHH','..HHHHHH','..HH....','..HH....','..H.....'])        # kein Haar-Pixel neben dem goldenen Band (Zeile 13)
HAIR['pony_cj']=merge(part(12,['...HHHHH','..HHHHHH','..HHHHHH']),part(15,['..HHH...','..HHH...']))   # Augenbereich wie bei CB-c (Seiten 3 breit), oben wie bisher
HAT['feder_hoch1']=_shift(HAT['feder_ohr'],-1); HAT['feder_hoch2']=_shift(HAT['feder_ohr'],-2); HAT['feder_hoch3']=_shift(HAT['feder_ohr'],-3)
# Zylinder oben gerundet, gleiche Gesamthöhe wie z_a10 (Kronenzeilen 9 + Krempe)
def _zr(top): return zyl(top+['....KKKK']*(9-len(top)),7,'..KKKKKK')
HAT['z_r1']=_zr(['.....KKK'])                          # Ecken 1 Pixel abgerundet (Breiten 6, 8, 8 ...)
HAT['z_r2']=_zr(['......KK','.....KKK'])               # Breiten 4, 6, 8, 8 ...  (weicher Halbkreis)
HAT['z_r3']=_zr(['......KK','.....KKK','....KKKK'][:2]+['....KKKK'])  # wie r2, Ausgangsform für Vergleich
HAT['z_r4']=_zr(['.......K','......KK','.....KKK'])   # Breiten 2, 4, 6, 8: runder, kuppelförmig
# schwarzes Monokel rechts (Spalte 10), ohne Kette
EXTRA['monokel_r5']={14:'.........KKK....',15:'........K...K...',16:'........K...K...',17:'........K...K...',18:'.........KKK....'}
EXTRA['monokel_r3']={15:'.........KKK....',16:'.........K.K....',17:'.........KKK....'}
# böse Schnurrbärte (Farbe über B)
BEARD['m_zwirbel']=BEARD['zwirbel']
BEARD['m_gross']=BEARD['zwirbel_gross']
BEARD['m_haengend']=rows_raw(19,['...BBBBBBBBBB...','...BB......BB...','...B........B...','...B........B...'])
BEARD['m_bleistift']=rows_raw(18,['....B......B....','....BBBBBBBB....'])
BEARD['m_walross']=rows_raw(18,['....BBBBBBBB....','...BBBBBBBBBB...'])

# ======================= Runde 30: Pik-König-Zwilling kleiner Hut, Varianten =======================
_B='....KKKK'; _N='.....KKK'
HAT['z_s1']=zyl(['.....KKK']+[_B]*7,6,'..KKKKKK')          # R1, 1 Zeile niedriger
HAT['z_s2']=zyl(['.....KKK']+[_B]*6,5,'..KKKKKK')          # R1, 2 Zeilen niedriger
HAT['z_n1']=zyl(['......KK']+[_N]*8,7,'...KKKKK')          # R1, Krone 6 breit, Krempe 10 breit, gleiche Höhe
HAT['z_n2']=zyl(['......KK']+[_N]*7,6,'...KKKKK')          # schmaler + 1 Zeile niedriger
HAT['z_n3']=zyl(['......KK']+[_N]*6,5,'...KKKKK')          # schmaler + 2 Zeilen niedriger
HAT['z_s1_gold']=zyl(['.....KKK']+[_B]*7,6,'..KKKKKK',bandcol='G')
EXTRA['brauen_boese']={14:'....K......K....',15:'.....KK..KK.....'}
BEARD['m_lang']=rows_raw(16,['.B............B.','.B............B.','.BB..........BB.','..BBBBBBBBBBBB..'])
BEARD['m_dick']=rows_raw(17,['.B............B.','.BB..........BB.','..BBBBBBBBBBBB..','...BBB....BBB...'])
BEARD['m_gross_ziege']=merge(BEARD['zwirbel_gross'],part(21,['....SSSS','.....BBB','......BB','......BB']))
HAT['feder_hoch3_l1']={y:r[1:]+'.' for y,r in HAT['feder_hoch3'].items()}
HAIR['pony_cj2']=merge(part(12,['...HHHHH','..HHHHHH','..HHHHHH']),part(15,['..HHH...','..HHH...','..HHH...']))   # Seitenhaar 1 Pixel länger

# ======================= Runde 31: Melone (Bowler), breitere Zylinder, klassischer Schnauzer, steilere Feder =======================
def _half(w): return '.'*(8-w//2)+'K'*(w//2)
def bowler(crown,brim_w,band_i,curl=False,gloss=True):
    out=[]
    for i,w in enumerate(crown):
        r=list(mir(_half(w)))
        if i==band_i:
            r=['Z' if c=='K' else c for c in r]; mid=[j for j,c in enumerate(r) if c=='Z']; m=(mid[0]+mid[-1])//2; r[m]='G'; r[m+1]='G'
        elif gloss and i>0 and w>=6:
            f=next(j for j,c in enumerate(r) if c=='K'); r[f+1]='k'
        out.append(r)
    brim=list(mir(_half(brim_w)))
    if curl:
        ks=[j for j,c in enumerate(brim) if c=='K']; out[-1][ks[0]]='K'; out[-1][ks[-1]]='K'
    rows=[''.join(r) for r in out]+[''.join(brim)]
    y0=13-len(rows)+1
    return {y0+i:r for i,r in enumerate(rows)}
HAT['bowler1']=bowler([4,6,8,10,10],12,4)
HAT['bowler2']=bowler([6,8,10,10,10],12,4)
HAT['bowler3']=bowler([4,6,8,10,10],14,4,curl=True)
HAT['bowler4']=bowler([2,4,6,8,10,10],12,5)
HAT['z_w1']=zyl(['....KKKK']+['...KKKKK']*6,5,'.KKKKKKK')      # S2, Krone 10 breit, Krempe 14
HAT['z_w2']=zyl(['....KKKK']+['...KKKKK']*6,5,'..KKKKKK')      # S2, Krone 10 breit, Krempe 12
HAT['z_w3']=zyl(['.....KKK']+['....KKKK']*6,5,'.KKKKKKK')      # S2, Krone 8 breit, Krempe 14
EXTRA['brauen_2a']={15:'....KK....KK....'}      # waagerechte Brauen, je 2 Pixel, außen
EXTRA['brauen_2i']={15:'.....KK..KK.....'}      # innen
BEARD['ms_6']=rows_raw(19,['.....BBBBBB.....'])
BEARD['ms_6d']=rows_raw(18,['......BBBB......','.....BBBBBB.....'])
BEARD['ms_goat']=merge(BEARD['ms_6'],rows_raw(21,['......BBBB......','.......BB.......']))
BEARD['ms_6h']=merge(BEARD['ms_6'],rows_raw(20,['....B......B....']))
def feder_steil(s,shift=0):
    rows={13:['.']*16}; rows[13][12+shift]='Y'
    for k in range(1,8):
        y=13-k; r=['.']*16; c=min(12+(k-1)//s,14)
        if k==1: r[c+shift]='F'
        elif k==7: r[c+1+shift]='W'
        else: r[c+shift]='F'; r[c+1+shift]='F'
        rows[y]=r
    return {y:''.join(r) for y,r in rows.items()}
for _s in (3,4,6):
    HAT['feder_s%d'%_s]=feder_steil(_s); HAT['feder_s%d_l'%_s]=feder_steil(_s,-1)
EXTRA['brauen_2a_hoch']={14:'....KK....KK....'}   # Brauen eine Zeile höher, Abstand zu den Augen
EXTRA['brauen_2i_hoch']={14:'.....KK..KK.....'}

# ======================= Runde 32 =======================
EXTRA['brauen_3']={15:'....KKK..KKK....'}        # Brauen 3 Pixel, mittig über den Augen (Spalten 4-6 und 9-11)
EXTRA['brauen_3_hoch']={14:'....KKK..KKK....'}    # eine Zeile höher
EXTRA['brauen_3_li_runter']={14:'.........KKK....',15:'....KKK.........'}   # linke Braue (Betrachter) stößt ans Auge, rechte bleibt oben
EXTRA['brauen_3_re_runter']={14:'....KKK.........',15:'.........KKK....'}   # rechte Braue stößt ans Auge, linke bleibt oben

# Nasen-Varianten (Buben etc.): N1 2 px in Nasenfarbe T, N2 1 px (rechts der Mitte, Licht links), N3 2 px per Formel aus der Hautfarbe (t)
EXTRA['nase_n1']={17:'.......TT.......'}
EXTRA['nase_n2']={17:'........T.......'}
EXTRA['nase_n3']={17:'.......tt.......'}

# Kappe ohne Feder (für den Falken auf dem Kopf)
HAT['kappe_ohne_feder']=hat(['....AAAA','..AAAAAA','.AAAAAAA'])
