const { getSmaArr } = require("./ma.js");
const { calcStdev } = require("./stdev.js");

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
    const B2basis = getSmaArr(closePrices, length); // 中轨为简单移动平均线 (SMA)
    const B2dev = calcStdev(closePrices, length).map((val) => val * B2mult); // 上下轨为均值 ± 2倍标准差

    const B2upper = B2basis.map((val, idx) => val + B2dev[idx]); // 上轨
    const B2lower = B2basis.map((val, idx) => val - B2dev[idx]); // 下轨

    // 计算 Keltner 通道
    const Kma = B2basis; // 中轨为指数移动平均线 (EMA)
    const tr = trueRange(prices); // 真实范围 (True Range)
    const Krangema = getSmaArr(tr, length); // 真实范围的 EMA

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
function getReverseSqueeze(prices, length = 20, B2mult = 2.0, Kmult = 1.5) {
    const closePrices = prices.map((price) => price.close); // 获取所有的收盘价

    // 计算布林带 (Bollinger Bands)
    const B2basis = getSmaArr(closePrices, length); // 中轨为简单移动平均线 (SMA)
    const B2dev = calcStdev(closePrices, length).map((val) => val * B2mult); // 上下轨为均值 ± 2倍标准差

    const B2upper = B2basis.map((val, idx) => val + B2dev[idx]); // 上轨
    const B2lower = B2basis.map((val, idx) => val - B2dev[idx]); // 下轨

    // 计算 Keltner 通道
    const Kma = B2basis; // 中轨为指数移动平均线 (EMA)
    const tr = trueRange(prices); // 真实范围 (True Range)
    const Krangema = getSmaArr(tr, length); // 真实范围的 EMA

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
    getReverseSqueeze,
};
