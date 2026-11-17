#!/bin/bash
cd /home/user/cheft
L=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
while [ ! -f $L/chain6.done ]; do sleep 30; done
OUT=$L/v3_final.jsonl npx tsx scripts/lab5.ts roles 800 5 > $L/v3_final.log 2>&1
npx tsx scripts/lab6.ts 300 > $L/v3_vis2.log 2>&1
echo FERTIG > $L/chain7.done
