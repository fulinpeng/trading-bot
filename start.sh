#!/bin/bash

forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-mading.js 1000pepeUSDT
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-1000pepe.js
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-1000pepe.js
ps -ef | grep no[d]e