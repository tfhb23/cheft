#!/bin/bash
cd /home/user/cheft
L=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
while ! grep -q FERTIG $L/v4_recog.log 2>/dev/null; do sleep 20; done
npx tsx scripts/lab8.ts 600 7 > $L/v4_extreme.log 2>&1
echo FERTIG > $L/chain8.done
