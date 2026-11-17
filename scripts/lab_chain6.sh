#!/bin/bash
cd /home/user/cheft
L=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
while [ ! -f $L/chain5.done ]; do sleep 30; done
npx tsx scripts/lab_infer.ts 150 7 > $L/v3_infer_default.log 2>&1
TASTE_KNOBS='{"tasteScale":3,"tasteBand":12,"tasteProt":20}' npx tsx scripts/lab_infer.ts 150 7 > $L/v3_infer_strong.log 2>&1
echo FERTIG > $L/chain6.done
