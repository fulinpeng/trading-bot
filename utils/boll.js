const { calculateSmaArr: sma } = require("./ma.js");

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

// 非挤压状态
function calculateBoll(closePrices, length = 20, B2mult = 2.0) {
    // 计算布林带 (Bollinger Bands)
    const B2basis = sma(closePrices, length); // 中轨为简单移动平均线 (SMA)
    const B2dev = stdev(closePrices, length).map((val) => val * B2mult); // 上下轨为均值 ± 2倍标准差

    const B2upper = B2basis.map((val, idx) => val + B2dev[idx]); // 上轨
    const B2lower = B2basis.map((val, idx) => val - B2dev[idx]); // 下轨

    // 返回计算结果
    return {
        B2basis,
        B2upper,
        B2lower,
    };
}

/**
 * 计算布林带指标
 * @param {number[]} closePrices 收盘价数组（时间顺序由旧到新）
 * @param {number} [period=20] 计算周期，默认20
 * @param {number} [multiplier=2] 标准差乘数，默认2
 * @returns {Object|null} 返回最新K线的布林带值 { basis, upper, lower } 或 null
 */
function calculateBollingerBands(closePrices, period = 20, multiplier = 2) {
    // 参数校验
    if (closePrices.length < period) {
        console.log('closePrices.length < period!!!!!!!!!!!!!!!!!!!!', closePrices.length, period)
        return null;
    }

    // 获取最近period个收盘价（倒序截取）
    const recentCloses = closePrices.slice(-period);

    // 计算移动平均线(SMA)
    const sum = recentCloses.reduce((acc, val) => acc + val, 0);
    const basis = sum / period;

    // 计算标准差
    const variance = recentCloses.reduce((acc, val) => {
        return acc + Math.pow(val - basis, 2);
    }, 0) / period;
    const stdDev = Math.sqrt(variance);

    // 计算上下轨
    const upper = basis + (stdDev * multiplier);
    const lower = basis - (stdDev * multiplier);

    return {
        B2basis: basis,  // 保留8位小数
        B2upper: upper,
        B2lower: lower
    };
}
module.exports = {
    calculateBoll,
    calculateBollingerBands,
};
