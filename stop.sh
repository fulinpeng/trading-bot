#!/bin/bash
forever stop -a gridBot-avax.js
forever stop -a gridBot-doge.js
forever stop -a gridBot-eth.js
forever stop -a gridBot-fil.js
forever stop -a gridBot-inj.js
forever stop -a gridBot-om.js
forever stop -a gridBot-op.js
forever stop -a gridBot-people.js
forever stop -a gridBot-uni.js
forever stop -a gridBot-wif.js
forever stop -a gridBot-wld.js
forever stop -a gridBot-ygg.js
forever stop -a gridBot-zk.js

echo "------------------------------------------------------"
ps -ef | grep no[d]e