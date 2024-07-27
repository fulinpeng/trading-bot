const { calculateSimpleMovingAverage, calculateEMA } = require("../utils/ma.js");

//  HPotter 版权 v1.0 2014/06/20
// 移动平均交叉交易策略可能是交易世界中最受欢迎的交易策略。
// 第一批策略是在20世纪中期编写的，当时商品交易策略变得流行。
// 该策略是所谓传统策略的一个很好的例子。
// 传统策略总是长仓或短仓。这意味着它们从不退出市场。
// 拥有始终是长仓或短仓的策略的概念可能会令人恐惧，
// 特别是在今天的市场中，您不知道在任何一个市场上会发生什么风险。
// 但是很多交易者相信这个概念仍然有效，特别是对于那些做自己研究或自行交易的交易者。
// 此版本使用移动平均线及其指数移动平均线的交叉。
////////////////////////////////////////////////////////////

// 示例K线数据
// const klineData = [];

// 从K线数据中提取收盘价
// const closePrices = klineData.map((kline) => parseFloat(kline[4]));
// Function to calculate EMA & MA Crossover
function emaMacrossover(closePrices, LengthMA = 10, LengthEMA = 10) {
    // Validate input length
    if (closePrices.length < Math.max(LengthMA, LengthEMA)) {
        throw new Error("价格数组的长度必须大于周期长度");
    }

    // Calculate SMA for each closing price
    let smaValues = [];
    for (let i = 0; i < closePrices.length; i++) {
        if (i >= LengthMA - 1) {
            let smaValue = calculateSimpleMovingAverage(closePrices.slice(0, i + 1), LengthMA);
            smaValues.push(smaValue);
        } else {
            smaValues.push(null);
        }
    }

    // Calculate EMA based on SMA values
    let emaValues = [];
    for (let i = 0; i < smaValues.length; i++) {
        if (i >= LengthEMA - 1 && smaValues[i] !== null) {
            let emaValue = calculateEMA(smaValues.slice(0, i + 1), LengthEMA);
            emaValues.push(emaValue);
        } else {
            emaValues.push(null);
        }
    }

    // Combine the results and select the last 10 values
    let result = smaValues.slice(-10).map((smaValue, index) => ({
        sma: smaValue,
        ema: emaValues.slice(-10)[index],
    }));

    return result;
}

// 计算EMA & MA Crossover并返回最近10根K线的结果
// const crossoverData = emaMacrossover(closePrices.slice(-20), 10, 10);

// 输出结果
// console.log(crossoverData);

module.exports = {
    emaMacrossover,
};
