#!/bin/bash
cd /home/user/cheft
L=/tmp/claude-0/-home-user-cheft/7f21bab0-7eb5-5b1b-bc14-7dbf188c162b/scratchpad/lab
npx tsx scripts/lab13.ts roles 600 7 > $L/v7_roles.log 2>&1
npx tsx scripts/lab13.ts levels 600 7 > $L/v7_levels.log 2>&1
echo FERTIG > $L/chain10.done
