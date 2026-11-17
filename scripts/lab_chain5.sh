#!/bin/bash
cd /home/user/cheft
L=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
while [ ! -f $L/chain4.done ]; do sleep 30; done
OUT=$L/v3_opp2.jsonl npx tsx scripts/lab7.ts 1000 7 > $L/v3_opp2.log 2>&1
echo FERTIG > $L/chain5.done
