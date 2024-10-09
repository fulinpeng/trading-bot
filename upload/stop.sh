#!/bin/bash
forever stop -a gridBot-mading-speed-small-avax.js
forever stop -a gridBot-mading-speed-small-doge.js
forever stop -a gridBot-mading-speed-small-eth.js
forever stop -a gridBot-mading-speed-small-fil.js
forever stop -a gridBot-mading-speed-small-inj.js
forever stop -a gridBot-mading-speed-small-om.js
forever stop -a gridBot-mading-speed-small-op.js
forever stop -a gridBot-mading-speed-small-people.js
forever stop -a gridBot-mading-speed-small-uni.js
forever stop -a gridBot-mading-speed-small-wif.js
forever stop -a gridBot-mading-speed-small-wld.js
forever stop -a gridBot-mading-speed-small-ygg.js
forever stop -a gridBot-mading-speed-small-zk.js
forever stop -a gridBot-mading-speed-small-zeta.js

ps -ef | grep node