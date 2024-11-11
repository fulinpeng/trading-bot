// 计算简单移动平均线
function calculateSimpleMovingAverage(prices, period) {
    if (prices.length < period) {
        throw new Error("Not enough data points for the specified period.");
    }

    const slice = prices.slice(prices.length - period);
    const sum = slice.reduce((acc, price) => acc + price, 0);
    return sum / period;
}

// 计算简单移动平均线 (SMA)
function getSmaArr(values, period) {
    return values.map((val, idx, arr) => {
        // 如果当前索引小于长度，返回 null，因为还无法计算均值
        if (idx < period - 1) return null;
        // 计算指定长度窗口内的均值
        return calculateSimpleMovingAverage(arr.slice(idx - period + 1, idx + 1), period);
    });
}

// 计算指数移动平均 EMA = α × Price + (1−α) × EMA‘（EMA‘为上一次的EMA）
// ​α 是平滑系数，通常是 2/(N - 1)，其中 N 是选定的时间周期
// 斜率 Slope = (EMA[t] - EMA[t-n])/n ，其中 n 是计算斜率的时间跨度
// 趋势方向： 当EMA斜率为正时，表示价格趋势向上；当EMA斜率为负时，表示价格趋势向下。
// 趋势强度： 斜率的绝对值可以表示趋势的强弱。绝对值越大，趋势越强烈。
// 零线交叉： 当EMA斜率从负数变为正数时，可能标志着价格从下跌趋势切换到上升趋势，反之亦然。
// 斜率的平滑性： 由于EMA本身是通过平滑计算得到的，其斜率相对于简单移动平均线的斜率更加平滑，对市场噪音有较好的过滤效果。
const calculateEMA = (prices, period) => {
    if (prices.length < period) {
        throw new Error("Not enough data points for the specified period.");
    }
    let sum = 0;

    // 计算前 N 个价格的平均值
    for (let i = 0; i < period; i++) {
        sum += prices[i];
    }

    const initialEMA = sum / period;

    const multiplier = 2 / (period + 1);
    let ema = initialEMA;

    // 使用EMA的更新公式进行计算
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
};
module.exports = {
    calculateSimpleMovingAverage,
    calculateEMA,
    getSmaArr,
};
