#!/bin/bash
# Messreihe 1: jede Rolle als Platz T gegen drei Ausgewogene (Normal), rotierende Plätze
cd /home/user/cheft
OUTD=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
export OUT=$OUTD/lab1.jsonl
G=${1:-1200}
C='{"name":"Kontrolle","level":"normal"}'
run() { npx tsx scripts/roles.ts "[$1,$C,$C,$C]" $G 5 0; }
run '{"name":"ausgewogen(Spiegel)","level":"normal"}'
for st in sprinter cheft hand blocker counter joker gambler; do run "{\"name\":\"ALT $st\",\"level\":\"normal\",\"style\":\"$st\"}"; done
for pe in tempo cheft hand joker huerde blocker zocker vorsicht jaeger; do run "{\"name\":\"NEU $pe\",\"level\":\"normal\",\"persona\":\"$pe\"}"; done
run '{"name":"NEU heissporn","level":"normal","persona":"ausgewogen","tilt":1,"jitter":0.3}'
run '{"name":"NEU kuehl","level":"normal","persona":"ausgewogen","tilt":-1,"jitter":0.3}'
run '{"name":"NEU wildcard","level":"normal","persona":"ausgewogen","loyalty":0,"jitter":0.4,"pool":["ausgewogen","tempo","cheft","hand","joker","huerde","blocker","zocker","vorsicht","jaeger"]}'
echo FERTIG
