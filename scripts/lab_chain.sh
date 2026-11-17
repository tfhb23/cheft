#!/bin/bash
cd /home/user/cheft
L=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
while ! grep -q FERTIG $L/lab2_knobs.log; do sleep 20; done
OUT=$L/lab2_loyal.jsonl npx tsx scripts/lab2.ts loyal 500 5 > $L/lab2_loyal.log 2>&1
OUT=$L/lab2_extras.jsonl npx tsx scripts/lab2.ts extras 500 5 > $L/lab2_extras.log 2>&1
OUT=$L/lab2_levels.jsonl npx tsx scripts/lab2.ts levels 400 5 > $L/lab2_levels.log 2>&1
SOAK_EXTREME=1 npx tsx scripts/soak.ts 1200 0 > $L/soak_extreme.log 2>&1
npx tsx scripts/soak.ts 600 0 > $L/soak_normal.log 2>&1
echo ALLES_FERTIG > $L/chain.done
