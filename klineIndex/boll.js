const { getSmaArr } = require("./ma.js");
const { calcStdev } = require("./calcStdev.js");

// 计算标准差 (Standard Deviation)
function calcStdev(values, length) {
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

function calculateBoll(prices, length = 20, B2mult = 2.0) {
    const closePrices = prices.map((price) => price.close); // 获取所有的收盘价

    // 计算布林带 (Bollinger Bands)
    const B2basis = getSmaArr(closePrices, length); // 中轨为简单移动平均线 (SMA)
    const B2dev = calcStdev(closePrices, length).map((val) => val * B2mult); // 上下轨为均值 ± 2倍标准差

    const B2upper = B2basis.map((val, idx) => val + B2dev[idx]); // 上轨
    const B2lower = B2basis.map((val, idx) => val - B2dev[idx]); // 下轨

    // 返回计算结果
    return {
        B2basis,
        B2upper,
        B2lower,
    };
}
module.exports = {
    calculateBoll,
};
