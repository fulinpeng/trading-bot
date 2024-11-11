const { calculateSimpleMovingAverage, calculateEMA } = require("./ma.js");

// 计算 EMA 和 SMA 的交叉点
function emaMaCrossover(closePrices, LengthMA = 10, LengthEMA = 10) {
    // 验证输入数据长度
    if (closePrices.length < Math.max(LengthMA, LengthEMA)) {
        throw new Error("价格数组的长度必须大于周期长度");
    }

    // 计算 SMA
    let smaValues = [];
    for (let i = 0; i < closePrices.length; i++) {
        if (i >= LengthMA - 1) {
            let smaValue = calculateSimpleMovingAverage(closePrices.slice(i - LengthMA + 1, i + 1), LengthMA);
            smaValues.push(smaValue);
        } else {
            smaValues.push(null);
        }
    }

    // 计算 EMA
    let emaValues = [];
    for (let i = 0; i < smaValues.length; i++) {
        if (i >= LengthEMA - 1 && smaValues[i] !== null) {
            let emaValue = calculateEMA(smaValues.slice(i - LengthEMA + 1, i + 1), LengthEMA);
            emaValues.push(emaValue);
        } else {
            emaValues.push(null);
        }
    }

    // 合并结果，并选择最后的 10 个值
    let result = smaValues.slice(-10).map((smaValue, index) => ({
        sma: smaValue,
        ema: emaValues.slice(-10)[index],
    }));

    return result;
}

module.exports = {
    emaMaCrossover,
};
