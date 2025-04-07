function calculateEmaArr(prices, period) {
    const k = 2 / (period + 1);
    let emaArray = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
        const ema = prices[i] * k + emaArray[i - 1] * (1 - k);
        emaArray.push(ema);
    }
    return emaArray;
}

const MACD_PERIOD = [9 * 1, 26 * 1, 9 * 1];
// 计算 MACD 指标
function calculateMACD(prices, periods) {
    const [shortPeriod, longPeriod, signalPeriod] = periods || MACD_PERIOD;
    if (prices.length < longPeriod) {
        // throw new Error("价格数组的长度必须大于长周期");
        return null;
    }

    const shortEMA = calculateEmaArr(prices, shortPeriod);
    const longEMA = calculateEmaArr(prices, longPeriod);

    const macdLine = shortEMA.map((value, index) => value - longEMA[index]);

    const signalLine = calculateEmaArr(macdLine.slice(longPeriod - shortPeriod), signalPeriod);
    const histogram = macdLine
        .slice(longPeriod - shortPeriod)
        .map((value, index) => value - signalLine[index]);

    // 返回最新一组MACD值
    // DIF 对应 macdLine：这是快线，即短周期EMA与长周期EMA的差。
    // DEA 对应 signalLine：这是慢线，即DIF的信号线（DIF的EMA）。
    // MACD 对应 histogram：这是柱状图，即DIF与DEA的差。
    return {
        dif: macdLine[macdLine.length - 1],
        dea: signalLine[signalLine.length - 1],
        macd: histogram[histogram.length - 1],
    };
}
module.exports = {
    calculateMACD
};
