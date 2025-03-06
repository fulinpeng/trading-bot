// 计算 EMA（指数移动平均线）
const ema = (prices, period) => {
    const alpha = 2 / (period + 1);
    const emaValues = [];
    let emaPrev = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period; // 初始值使用 SMA
    emaValues.push(emaPrev);
    for (let i = period; i < prices.length; i++) {
        const emaCurr = (prices[i] - emaPrev) * alpha + emaPrev;
        emaValues.push(emaCurr);
        emaPrev = emaCurr;
    }
    return emaValues;
};

// 计算 WMA（加权移动平均线）
const wma = (prices, period) => {
    const weights = Array.from({length: period}, (_, i) => i + 1);
    const wmaValues = [];
    for (let i = period - 1; i < prices.length; i++) {
        const window = prices.slice(i - period + 1, i + 1);
        const weightedSum = window.reduce((sum, p, idx) => sum + p * weights[idx], 0);
        wmaValues.push(weightedSum / weights.reduce((sum, w) => sum + w, 0));
    }
    return wmaValues;
};

// 计算 SMA（简单移动平均线）
const sma = (prices, period) => {
    const smaValues = [];
    for (let i = period - 1; i < prices.length; i++) {
        const window = prices.slice(i - period + 1, i + 1);
        const avg = window.reduce((sum, p) => sum + p, 0) / period;
        smaValues.push(avg);
    }
    return smaValues;
};

// 计算最高值
const highest = (values, period) => {
    const highestValues = [];
    for (let i = period - 1; i < values.length; i++) {
        const window = values.slice(i - period + 1, i + 1);
        highestValues.push(Math.max(...window));
    }
    return highestValues;
};

// 计算最低值
const lowest = (values, period) => {
    const lowestValues = [];
    for (let i = period - 1; i < values.length; i++) {
        const window = values.slice(i - period + 1, i + 1);
        lowestValues.push(Math.min(...window));
    }
    return lowestValues;
};

/**
 * 归一化 MACD 指标计算
 * @param {Array<number>} prices - 收盘价数组
 * @param {Object} params - 指标参数
 * @param {number} params.sma - 快速移动平均线周期（默认值：12）
 * @param {number} params.lma - 慢速移动平均线周期（默认值：21）
 * @param {number} params.tsp - 触发线（Trigger）周期（默认值：9）
 * @param {number} params.np - 归一化周期（默认值：50）
 * @param {number} params.type - 移动平均线类型（1 = EMA, 2 = WMA, 3 = SMA）
 * @returns {Object} - 返回 { macNorm, trigger, hist } 对应于当前 K 线的值
 */
function calculateNormalizedMACD(prices, params = {sma: 12, lma: 21, tsp: 9, np: 50, type: 1}) {
    const {sma: fastMA, lma: slowMA, tsp: triggerPeriod, np: normalizePeriod, type} = params;

    if (prices.length < Math.max(fastMA, slowMA, normalizePeriod)) {
        throw new Error("价格数据长度不足，无法计算指标");
    }

    // 步骤 1：根据类型计算快速 MA 和慢速 MA
    let shortMA, longMA;
    if (type === 1) {
        shortMA = ema(prices, fastMA);
        longMA = ema(prices, slowMA);
    } else if (type === 2) {
        shortMA = wma(prices, fastMA);
        longMA = wma(prices, slowMA);
    } else {
        shortMA = sma(prices, fastMA);
        longMA = sma(prices, slowMA);
    }

    // 步骤 2：裁剪数组使长度一致
    function alignArrayLengths(arr1, arr2) {
        const lengthDis = Math.abs(arr1.length - arr2.length);
        let res = [];
        if (arr1.length > arr2.length) {
            res = [arr1.slice(lengthDis), arr2];
        } else {
            res = [arr1, arr2.slice(lengthDis)];
        }
        return res;
    }
    [shortMA, longMA] = alignArrayLengths(shortMA, longMA);

    // 步骤 3：计算 ratio 和原始 MAC 值
    let ratio = shortMA.map((sh, i) => Math.min(sh, longMA[i]) / Math.max(sh, longMA[i]));
    let mac = ratio.map((r, i) => (shortMA[i] > longMA[i] ? 2 - r : r) - 1);

    // 步骤 4：归一化 MAC 值
    let lowestMac = lowest(mac, normalizePeriod);
    let highestMac = highest(mac, normalizePeriod);

    // ratio.length, mac.length, lowestMac.length, highestMac.length 80 80 31 31

    [lowestMac, mac] = alignArrayLengths(lowestMac, mac);
    [highestMac, mac] = alignArrayLengths(highestMac, mac);
    let macNorm = mac.map((m, i) => {
        if (normalizePeriod < 2) return m;
        return ((m - lowestMac[i]) / (highestMac[i] - lowestMac[i] + 0.000001)) * 2 - 1;
    });

    // console.log(
    //     "🚀 ~ calculateNormalizedMACD ~ highestMac, mac:",
    //     ratio.length,
    //     mac.length,
    //     lowestMac.length,
    //     highestMac.length,
    //     highestMac.length,
    //     mac.length,
    //     lowestMac.length,
    //     macNorm.length,
    // );
    // return;
    // 步骤 5：触发线（Trigger）的计算
    let trigger = wma(macNorm, triggerPeriod);

    [trigger, macNorm] = alignArrayLengths(trigger, macNorm);

    // 步骤 6：计算直方图
    const hist = macNorm.map((m, i) => m - trigger[i]);
    const hist2 = hist.map((h) => (h > 1 ? 1 : h < -1 ? -1 : h));

    // 返回当前 K 线的指标值
    return {
        macNorm: macNorm[macNorm.length - 1],
        trigger: trigger[trigger.length - 1],
        hist: hist2[hist2.length - 1],
    };
}

module.exports = calculateNormalizedMACD;

// const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
// const params = { sma: 12, lma: 21, tsp: 9, np: 50, type: 1 }; // 使用 EMA
// const result = calculateNormalizedMACD(prices, params);

// console.log(result); // { macNorm: <值>, trigger: <值>, hist: <值> }
