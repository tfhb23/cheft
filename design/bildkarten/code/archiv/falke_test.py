import sys; sys.path.insert(0,'.')
exec(open('auswahl2.py').read().split('# ---------- Herz ----------')[0])
# Kandidaten für die neue Falken-Zeichnung (Blick nach rechts), Zeichen: h dunkel, q hell-braun, w mittelbraun, W weiß, G Gold, K Auge
ARTS={
 'alt':['..www.','.wwKwG','wwOOw.','wwOOw.','.G.G..'],
 'A':['.hhh..','hqKqG.','hwWWq.','hwWWh.','hwqqh.','.hGhG.'],
 'B':['..hhh..','.hqqKG.','hqqWWG.','hwwWW..','hwwqq..','.hhGhG.'],
 'C':['.hhh..','hqKhG.','hqWWG.','wwWWq.','hwWWh.','.h.G.G'[:6]],
}
S=12; pad=10
bgc=(0xf2,0xe6,0xd0)
im=Image.new('RGB',(len(ARTS)*(16*S+pad)+pad,16*S+50),bgc); d=ImageDraw.Draw(im)
for i,(n,art) in enumerate(ARTS.items()):
    # Vorschau: Schulter (schwarz) + Vogel darauf, 16x16 Pixel
    c=Image.new('RGBA',(16,16),(0xfb,0xf6,0xea,255)); p=c.load()
    for x in range(0,16):
        for y in range(11,16): p[x,y]=(0x23,0x20,0x1f,255)
    cm=letters('C',{})
    for ry,row in enumerate(art):
        for rx,ch in enumerate(row):
            if ch!='.' and ch in cm: p[4+rx,6+ry]=cm[ch]+(255,)
    big=c.resize((16*S,16*S),Image.NEAREST); im.paste(big,(pad+i*(16*S+pad),pad),big); d.text((pad+i*(16*S+pad),16*S+pad+4),n,fill=C['ink'],font=FB)
im.save('t_falke_arts.png')
