// 计算简单移动平均线 (SMA)
function sma(values, length) {
    return values.map((val, idx, arr) => {
        // 如果当前索引小于长度，返回 null，因为还无法计算均值
        if (idx < length - 1) return null;
        // 计算指定长度窗口内的均值
        const sum = arr.slice(idx - length + 1, idx + 1).reduce((a, b) => a + b, 0);
        return sum / length;
    });
}
// 计算指数移动平均线 (EMA)
function ema(values, length) {
    const multiplier = 2 / (length + 1); // 计算 EMA 的平滑因子
    return values.map((val, idx, arr) => {
        // 第一个值直接返回，因为没有之前的值进行平滑
        if (idx === 0) return val;
        // 使用之前的 EMA 值和当前值计算新的 EMA
        const prevEma = idx === 1 ? val : arr[idx - 1];
        return val * multiplier + prevEma * (1 - multiplier);
    });
}

// 计算标准差 (Standard Deviation)
function stdev(values, length) {
    return values.map((val, idx, arr) => {
        // 如果当前索引小于长度，返回 null，因为还无法计算标准差
        if (idx < length - 1) return null;
        // 计算均值
        const slice = arr.slice(idx - length + 1, idx + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / length;
        // 计算方差
        const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / length;
        // 返回标准差
        return Math.sqrt(variance);
    });
}

// 计算真实范围 (True Range)
function trueRange(prices) {
    return prices.map((price, idx) => {
        if (idx === 0) return price.high - price.low; // 第一个值的真实范围为高-低
        // 计算最大范围：当前高-低，当前高-前一收盘，当前低-前一收盘
        return Math.max(
            price.high - price.low,
            Math.abs(price.high - prices[idx - 1].close),
            Math.abs(price.low - prices[idx - 1].close),
        );
    });
}

// 非挤压状态
function calculateBBKeltnerSqueeze(prices, length = 20, B2mult = 2.0, Kmult = 1.5) {
    const closePrices = prices.map((price) => price.close); // 获取所有的收盘价

    // 计算布林带 (Bollinger Bands)
    const B2basis = sma(closePrices, length); // 中轨为简单移动平均线 (SMA)
    const B2dev = stdev(closePrices, length).map((val) => val * B2mult); // 上下轨为均值 ± 2倍标准差

    const B2upper = B2basis.map((val, idx) => val + B2dev[idx]); // 上轨
    const B2lower = B2basis.map((val, idx) => val - B2dev[idx]); // 下轨

    // 计算 Keltner 通道
    const Kma = B2basis; // 中轨为指数移动平均线 (EMA)
    const tr = trueRange(prices); // 真实范围 (True Range)
    const Krangema = sma(tr, length); // 真实范围的 EMA

    const Kupper = Kma.map((val, idx) => val + Krangema[idx] * Kmult); // 上轨
    const Klower = Kma.map((val, idx) => val - Krangema[idx] * Kmult); // 下轨

    // 识别布林带和 Keltner 通道交叉 (Squeeze)
    const squeeze = B2upper.map((val, idx) => val > Kupper[idx] && B2lower[idx] < Klower[idx]);

    // 返回计算结果
    return {
        B2basis,
        B2upper,
        B2lower,
        Kma,
        Kupper,
        Klower,
        squeeze,
    };
}

// 计算 BB-Keltner Squeeze
// const result = calculateBBKeltnerSqueeze(prices);

// console.log("B2basis:", result.B2basis);
// console.log("B2upper:", result.B2upper);
// console.log("B2lower:", result.B2lower);
// console.log("Kma:", result.Kma);
// console.log("Kupper:", result.Kupper);
// console.log("Klower:", result.Klower);
// console.log("Squeeze:", result.squeeze);

// 反向开仓的挤压状态
function getFanSqueeze(prices, length = 20, B2mult = 2.0, Kmult = 1.5) {
    const closePrices = prices.map((price) => price.close); // 获取所有的收盘价

    // 计算布林带 (Bollinger Bands)
    const B2basis = sma(closePrices, length); // 中轨为简单移动平均线 (SMA)
    const B2dev = stdev(closePrices, length).map((val) => val * B2mult); // 上下轨为均值 ± 2倍标准差

    const B2upper = B2basis.map((val, idx) => val + B2dev[idx]); // 上轨
    const B2lower = B2basis.map((val, idx) => val - B2dev[idx]); // 下轨

    // 计算 Keltner 通道
    const Kma = B2basis; // 中轨为指数移动平均线 (EMA)
    const tr = trueRange(prices); // 真实范围 (True Range)
    const Krangema = sma(tr, length); // 真实范围的 EMA

    const Kupper = Kma.map((val, idx) => val + Krangema[idx] * Kmult); // 上轨
    const Klower = Kma.map((val, idx) => val - Krangema[idx] * Kmult); // 下轨

    // 识别布林带和 Keltner 通道交叉 (Squeeze)
    const squeeze = B2upper.map((val, idx) => val < Kupper[idx] && B2lower[idx] > Klower[idx]);

    // 返回计算结果
    return {
        B2basis,
        B2upper,
        B2lower,
        Kma,
        Kupper,
        Klower,
        squeeze,
    };
}
module.exports = {
    calculateBBKeltnerSqueeze,
    getFanSqueeze,
};
