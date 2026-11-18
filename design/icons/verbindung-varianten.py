from PIL import Image, ImageDraw, ImageFont
V = {
 '1  Stecker': [
  '..#....#..',
  '..#....#..',
  '.########.',
  '.########.',
  '.########.',
  '..######..',
  '...####...',
  '....##....',
  '....##....',
  '....##....'],
 '2  Stecker und Dose getrennt': [
  '...####...',
  '..######..',
  '...#..#...',
  '...#..#...',
  '..........',
  '..........',
  '.########.',
  '.##.##.##.',
  '.########.',
  '..........'],
 '3  Funksignal': [
  '..######..',
  '.#......#.',
  '#..####..#',
  '..#....#..',
  '...#..#...',
  '....##....',
  '....##....',
  '..........',
  '..........',
  '..........'],
}
INK=(0x23,0x20,0x1f); PANEL=(0xff,0xfa,0xf0); SAND=(0xe9,0xdc,0xc0); MUTED=(0x5a,0x4d,0x44)
try:
    f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22); fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
except: f=fs=ImageFont.load_default()
W=980; rowh=150
img=Image.new('RGB',(W,60+rowh*len(V)+20),SAND); d=ImageDraw.Draw(img)
d.text((24,14),'Plug-Icon: Verbindung verloren (10x10, wie die vorhandenen Piktogramme)',font=f,fill=INK)
def draw(rows,x,y,s,col):
    for j,r in enumerate(rows):
        for i,ch in enumerate(r):
            if ch=='#': d.rectangle([x+i*s,y+j*s,x+i*s+s-1,y+j*s+s-1],fill=col)
for n,(name,rows) in enumerate(V.items()):
    y=60+n*rowh
    d.rectangle([16,y,W-16,y+rowh-12],fill=PANEL,outline=INK,width=3)
    d.text((30,y+12),name,font=f,fill=INK)
    draw(rows,30,y+44,8,INK)           # gross
    draw(rows,150,y+60,2,INK)          # Originalgroesse x2
    # in der Lobby-Zeile
    d.text((200,y+52),'Max',font=fs,fill=INK); draw(rows,252,y+54,2,MUTED)
    d.text((310,y+52),'Anna',font=fs,fill=INK)
    # im Spiel neben dem Namen
    d.rectangle([420,y+40,700,y+rowh-30],fill=(0x2f,0x6b,0x4a))
    d.text((440,y+52),'Max',font=fs,fill=PANEL); draw(rows,492,y+54,2,PANEL)
    d.text((540,y+52),'Anna',font=fs,fill=PANEL)
    # Platzauswahl
    d.rectangle([720,y+40,W-36,y+rowh-30],fill=PANEL,outline=INK,width=2)
    d.text((734,y+52),'Max',font=fs,fill=INK); draw(rows,786,y+54,2,INK)
img.save(f'{__import__("sys").argv[1]}')
