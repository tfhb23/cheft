#!/bin/bash
cd /home/user/cheft
L=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
while [ ! -f $L/chain.done ]; do sleep 30; done
OUT=$L/lab3_v2_default.jsonl npx tsx scripts/lab3.ts v2 600 5 > $L/lab3_v2_default.log 2>&1
BASE='{"shedPre":0,"dangerHand":0}' OUT=$L/lab3_v2_base.jsonl npx tsx scripts/lab3.ts v2 600 5 > $L/lab3_v2_base.log 2>&1
echo FERTIG > $L/chain2.done
