#!/bin/bash

# forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-avax.js
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-doge.js
# forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-eth.js
# forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-fil.js
# forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-inj.js
# forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-om.js
# forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-op.js
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-people.js
# forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-uni.js
# forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-wif.js
# forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-wld.js
# forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-ygg.js
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-zk.js
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-1000pepe.js
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-beamx.js
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-bigtime.js
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-bome.js
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-iotx.js
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-zeta.js

ps -ef | grep node