#!/bin/bash
cd /home/user/cheft
L=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
npx tsx scripts/bench.ts 30 9 > $L/v5_bench.log 2>&1
OUT=$L/v5_final.jsonl npx tsx scripts/lab5.ts final 600 7 > $L/v5_final.log 2>&1
SOAK_EXTREME=1 npx tsx scripts/soak.ts 500 2000 > $L/v5_soak_extreme.log 2>&1
npx tsx scripts/soak.ts 200 2000 > $L/v5_soak_normal.log 2>&1
npx vitest run > $L/v5_vitest.log 2>&1
echo FERTIG > $L/chain9.done
