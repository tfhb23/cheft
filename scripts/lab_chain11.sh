#!/bin/bash
cd /home/user/cheft
L=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
while [ ! -f $L/chain10.done ]; do sleep 20; done
npx tsx scripts/lab14.ts 500 7 > $L/v7_traits.log 2>&1
echo FERTIG > $L/chain11.done
