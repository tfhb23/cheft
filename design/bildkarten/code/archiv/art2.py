# 16 Pixel breite Figuren für Layouts ohne Spiegelung: gerade Breite, damit sie exakt auf der Kartenmitte (zwischen Pixel 15 und 16) sitzen.
# Halbzeilen links (8 Zeichen) werden gespiegelt. Schlüssel wie bisher.
def mir(h): return h+h[::-1]
HEAD={}
HEAD[13]=[mir(x) for x in ['..GG.GG.','..GGGGGG','..GGGGRG','.KHHHHHH','.KHSSSSS','.KHSSESS','.KHSSSSS','.KHBSSSS','.KHBBBBB','.KHBBBMM','..KBBBBB','...KBBBB','....KBBB']]
HEAD[12]=[mir(x) for x in ['....GG.G','....GGGG','...HGGGR','..HHHHHH','.HHHSSSS','.HHHSESS','.HHHSSSS','.HHHSSSM','.HHHHSSS','.HHHHKSS','.HHHHHKS','.HHHHHHS','.HHHHRWW']]
HEAD[11]=['..........FF....','.........FF.....']+[mir(x) for x in ['..RRRRRR','.RRRRRRR','..HHHHHH','..HHSSSS','..HHSESS','..HHSSSS','..HHSSSM','...KSSSS','....KSSS','.....KSS','.....KSS']]
# Körper (ab Zeile 13), Halbzeilen links
BODY_TOP={13:['..RRRWWW','.RRRRRRW'], 12:['.HHHRRWW','.HHRRRRW'], 11:['..RRRWWK','.RRRRRRW']}
BODY_MID=['RRRRRRRW','RRRGRRRW','RRRRRRRW','RRRRRRRW','RRRRRRGG','RRRRRRRW','RRRGRRRW','RRRRRRRW']
BODY_HEM=['GGGGGGGG']
def figure16(rank,body_rows=8):
    rows=list(HEAD[rank])
    top=[mir(x) for x in BODY_TOP[rank]]
    rows+=top
    mid=[mir(BODY_MID[i%len(BODY_MID)]) for i in range(max(0,body_rows-len(top)-1))]
    rows+=mid
    if body_rows>len(top): rows.append(mir(BODY_HEM[0]))
    for r in rows: assert len(r)==16,(rank,r,len(r))
    return rows
for k in (11,12,13): assert all(len(r)==16 for r in HEAD[k]),k
assert len(HEAD[13])==len(HEAD[12])==len(HEAD[11])==13,[len(HEAD[k]) for k in HEAD]

# Embleme (16 breit)
def crown(peaks_rows=3, pearls=False, jewel=True):
    # Spitzen bei Spaltenpaaren
    cols=[(0,1),(4,5),(7,8),(10,11),(14,15)] if peaks_rows==3 else [(1,2),(7,8),(13,14)]
    h=[0]*16
    for a,b in cols:
        for c in(a,b): h[c]=3 if (a,b)!=(7,8) else 4
    band=3; top=max(h)+band
    rows=[]
    for y in range(top+0):
        row=''
        for x in range(16):
            above=top-y  # Höhe dieser Zeile von unten
            col_h=h[x]+band
            row+='G' if above<=col_h else '.'
        rows.append(row)
    return rows
