#!/bin/bash
cd /home/user/cheft
L=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
while [ ! -f $L/chain3.done ]; do sleep 30; done
npx tsx scripts/lab6.ts 400 > $L/v3_vis.log 2>&1
echo FERTIG > $L/chain4.done
