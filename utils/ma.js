// 计算简单移动平均线
function calculateSimpleMovingAverage(prices, period) {
    if (prices.length < period) {
        throw new Error("Not enough data points for the specified period.");
    }

    const slice = prices.slice(prices.length - period);
    const sum = slice.reduce((acc, price) => acc + price, 0);
    return sum / period;
}

// 计算指数移动平均 EMA
const calculateEMA = (prices, period) => {
    // 计算初始的简单移动平均（SMA）
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += prices[i];
    }
    let ema = sum / period; // 初始 EMA 是前 N 天的简单平均

    // 计算 EMA 的 multiplier
    const multiplier = 2 / (period + 1);

    // 从第 period 天开始计算 EMA
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema; // 更新 EMA
    }

    return ema;
};

module.exports = {
    calculateSimpleMovingAverage,
    calculateEMA,
};
