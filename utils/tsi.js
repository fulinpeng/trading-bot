/**
 * 计算整个序列的 EMA，返回与原始数组同长度，数据不足时前面填充 null
 * @param {Array<number>} data - 数值数组
 * @param {number} period - 平滑周期
 * @returns {Array<number|null>}
 */
function calculateEMAForArray(data, period) {
    let ema = new Array(data.length).fill(null);
    if (data.length < period) return ema;
    // 计算初始EMA值：使用前 period 个数据的简单平均
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i];
    }
    ema[period - 1] = sum / period;
    let alpha = 2 / (period + 1);
    for (let i = period; i < data.length; i++) {
        ema[i] = alpha * data[i] + (1 - alpha) * ema[i - 1];
    }
    return ema;
}

/**
 * 计算 TSI 指标
 * @param {Array<number>} prices - 价格数组
 * @param {number} r - 第一次 EMA 平滑周期
 * @param {number} s - 第二次 EMA 平滑周期
 * @returns {Array<number|null>} - TSI 序列，与 prices 数组同长度
 */
function calculateTSI(prices, r=10, s=5) {
    const n = prices.length;
    // 计算 delta 和 absDelta
    let delta = new Array(n).fill(null);
    let absDelta = new Array(n).fill(null);
    for (let i = 1; i < n; i++) {
        delta[i] = prices[i] - prices[i - 1];
        absDelta[i] = Math.abs(delta[i]);
    }

    // 第一次 EMA 平滑（参数 r）
    let emaDelta_r = calculateEMAForArray(delta, r);
    let emaAbsDelta_r = calculateEMAForArray(absDelta, r);

    // 第二次 EMA 平滑（参数 s），需要对第一次EMA结果进行二次平滑
    let emaDelta_rs = calculateEMAForArray(emaDelta_r, s);
    let emaAbsDelta_rs = calculateEMAForArray(emaAbsDelta_r, s);

    // 计算 TSI = 100 * (EMA(EMA(delta, r), s) / EMA(EMA(|delta|, r), s))
    let tsi = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
        if (emaAbsDelta_rs[i] === null || emaAbsDelta_rs[i] === 0 || emaDelta_rs[i] === null) {
            tsi[i] = null;
        } else {
            tsi[i] = 100 * (emaDelta_rs[i] / emaAbsDelta_rs[i]);
        }
    }
    return tsi;
}


module.exports = {
    calculateTSI,
};
