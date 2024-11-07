// 计算RSI的函数
// RSI（相对强弱指数）的一般标准范围是 0 到 100。通常，传统的理解是：
// RSI 小于 30：被认为是超卖状态，可能出现反弹的机会，市场可能过度卖出。
// RSI 大于 70：被认为是超买状态，可能会有下跌的机会，市场可能过度买入。
// 当 RSI 处于 30 到 70 之间时，市场被认为是在正常范围内，没有明显的超买或超卖信号，可能处于横盘状态。

function calculateRSI(prices, period) {
    if (prices.length < period + 1) {
        throw new Error("数据不足，无法计算 RSI");
    }

    let gains = 0;
    let losses = 0;

    // 计算第一期的平均上涨和平均下跌
    for (let i = 1; i <= period; i++) {
        let change = prices[i] - prices[i - 1];
        if (change > 0) {
            gains += change;
        } else {
            losses -= change;
        }
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;

    let RS = averageGain / averageLoss;
    let RSI = 100 - 100 / (1 + RS);

    // 计算后续时期的平均上涨和平均下跌
    for (let i = period + 1; i < prices.length; i++) {
        let change = prices[i] - prices[i - 1];
        if (change > 0) {
            averageGain = (averageGain * (period - 1) + change) / period;
            averageLoss = (averageLoss * (period - 1)) / period;
        } else {
            averageGain = (averageGain * (period - 1)) / period;
            averageLoss = (averageLoss * (period - 1) - change) / period;
        }

        RS = averageGain / averageLoss;
        RSI = 100 - 100 / (1 + RS);
    }

    return RSI;
}

module.exports = {
    calculateRSI,
};
