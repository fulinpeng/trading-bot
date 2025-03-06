const { calculateSimpleMovingAverage, calculateEMA } = require("../utils/ma.js");

function emaMacrossover(closePrices, LengthMA = 10, LengthEMA = 10) {
    // Validate input length
    if (closePrices.length < Math.max(LengthMA, LengthEMA)) {
        throw new Error("价格数组的长度必须大于周期长度");
    }

    let smaValue = calculateSimpleMovingAverage(closePrices, LengthMA);

    let emaValue = calculateEMA(closePrices, LengthEMA);

    return {
        sma: smaValue,
        ema: emaValue,
        hist: emaValue - smaValue,
    };
}

module.exports = {
    emaMacrossover,
};
