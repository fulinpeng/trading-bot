'use strict';

function scoreShort(input) {
    var var0;
    var0 = sigmoid(-1.791759469228055);
    return [1.0 - var0, var0];
}
function sigmoid(x) {
    if (x < 0.0) {
        var z = Math.exp(x);
        return z / (1.0 + z);
    }
    return 1.0 / (1.0 + Math.exp(-x));
}


module.exports = { scoreShort };
