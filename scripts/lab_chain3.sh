#!/bin/bash
cd /home/user/cheft
L=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
OUT=$L/v3_roles.jsonl npx tsx scripts/lab5.ts roles 600 5 > $L/v3_roles.log 2>&1
OUT=$L/v3_tastes.jsonl npx tsx scripts/lab5.ts tastes 500 5 > $L/v3_tastes.log 2>&1
OUT=$L/v3_opp.jsonl npx tsx scripts/lab5.ts opp 600 7 > $L/v3_opp.log 2>&1
npx tsx scripts/lab_infer.ts 150 7 > $L/v3_infer.log 2>&1
OUT=$L/v3_human.jsonl npx tsx scripts/lab5.ts human 500 5 > $L/v3_human.log 2>&1
OUT=$L/v3_matrix.jsonl npx tsx scripts/lab5.ts matrix 300 5 > $L/v3_matrix.log 2>&1
OUT=$L/v3_tables.jsonl npx tsx scripts/lab5.ts tables 400 5 > $L/v3_tables.log 2>&1
SOAK_EXTREME=1 npx tsx scripts/soak.ts 1000 0 > $L/v3_soak_extreme.log 2>&1
npx tsx scripts/soak.ts 500 0 > $L/v3_soak_normal.log 2>&1
echo FERTIG > $L/chain3.done
