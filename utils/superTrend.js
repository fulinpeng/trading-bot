/**
 * 计算 EMA（指数移动平均线）
 * @param {Array} data K 线收盘价数组
 * @param {Number} period EMA 计算周期
 * @returns {Array} EMA 数组
 */
function calculateEMA(data, period) {
    let ema = [];
    let multiplier = 2 / (period + 1);

    // 计算第一天的 EMA（简单移动平均线）
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i];
    }
    ema[period - 1] = sum / period;

    // 计算后续 EMA
    for (let i = period; i < data.length; i++) {
        ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    return ema;
}

/**
 * 计算 DEMA（双指数移动平均线）
 * @param {Array} data K 线收盘价数组
 * @param {Number} period DEMA 计算周期
 * @returns {Array} DEMA 数组
 */
function calculateDEMA(data, period) {
    let ema1 = calculateEMA(data, period);
    // let ema2 = calculateEMA(ema1.slice(period - 1), period); // 第二次 EMA 计算
    let ema2 = calculateEMA(ema1.filter(v => !!v), period); // 第二次 EMA 计算
    !ema2[ema2.length - 1] && console.log("🚀 ~ calculateDEMA ~ ema2:", ema2[ema2.length - 1], ema1.filter(v => !!v).length)
    let dema = [];

    for (let i = 0; i < ema2.length; i++) {
        dema[i + period - 1] = 2 * ema1[i + period - 1] - ema2[i];
    }
    return dema;
}

/**
 * 计算 ATR（真实波动范围）
 * @param {Array} klineData K 线数据（包含 open、high、low、close）
 * @param {Number} period ATR 计算周期
 * @returns {Array} ATR 数组
 */
function calculateATR(klineData, period) {
    let atr = [];
    let tr = [];

    for (let i = 1; i < klineData.length; i++) {
        let highLow = klineData[i].high - klineData[i].low;
        let highClose = Math.abs(klineData[i].high - klineData[i - 1].close);
        let lowClose = Math.abs(klineData[i].low - klineData[i - 1].close);

        tr[i - 1] = Math.max(highLow, highClose, lowClose);
    }

    // 计算第一天的 ATR
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += tr[i];
    }
    atr[period - 1] = sum / period;

    // 计算后续 ATR
    for (let i = period; i < tr.length; i++) {
        atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }
    return atr;
}

/**
 * 计算 SuperTrend 指标
 * @param {Array} klineData K 线数据
 * @param {Number} atrPeriod ATR 计算周期
 * @param {Number} multiplier ATR 乘数
 * @returns {Object} 包含最新的 SuperTrend 指标值
 */
function calculateSuperTrend(klineData, atrPeriod, multiplier) {
    let atr = calculateATR(klineData, atrPeriod);
    let trend = [];
    let up = [];
    let dn = [];

    for (let i = atrPeriod; i < klineData.length; i++) {
        let midPrice = (klineData[i].high + klineData[i].low) / 2;
        up[i] = midPrice - multiplier * atr[i];
        dn[i] = midPrice + multiplier * atr[i];

        if (i > atrPeriod) {
            up[i] = klineData[i - 1].close > up[i - 1] ? Math.max(up[i], up[i - 1]) : up[i];
            dn[i] = klineData[i - 1].close < dn[i - 1] ? Math.min(dn[i], dn[i - 1]) : dn[i];
        }

        trend[i] =
            i > atrPeriod
                ? trend[i - 1] === -1 && klineData[i].close > dn[i - 1]
                    ? 1
                    : trend[i - 1] === 1 && klineData[i].close < up[i - 1]
                      ? -1
                      : trend[i - 1]
                : 1;
    }
    return {
        trend: trend[trend.length - 1],
        up: up[up.length - 1],
        dn: dn[dn.length - 1],
    };
}

function calculateLatestSuperTrend(data, period = 15, multiplier = 6, useTrueATR = true) {
    if (data.length < period + 1) return null;

    const lastIndex = data.length - 1;
    const curr = data[lastIndex];
    const prev = data[lastIndex - 1];

    // === Step 1: 计算 TR 和 ATR ===
    const tr = (bar, prevBar) => {
        return Math.max(
            bar.high - bar.low,
            Math.abs(bar.high - prevBar.close),
            Math.abs(bar.low - prevBar.close)
        );
    };

    // 计算 period 个 TR
    let atr;
    if (useTrueATR) {
        // Wilder's Smoothing
        let sumTr = 0;
        for (let i = lastIndex - period + 1; i <= lastIndex; i++) {
            sumTr += tr(data[i], data[i - 1]);
        }
        const prevAtr = sumTr / period;
        const currTr = tr(curr, prev);
        atr = (prevAtr * (period - 1) + currTr) / period;
    } else {
        // Simple Moving Average
        let sumTr = 0;
        for (let i = lastIndex - period + 1; i <= lastIndex; i++) {
            sumTr += tr(data[i], data[i - 1]);
        }
        atr = sumTr / period;
    }

    const hl2 = (curr.high + curr.low) / 2;

    // === Step 2: 计算上下轨 ===
    const up = hl2 - multiplier * atr;
    const dn = hl2 + multiplier * atr;

    const prevHl2 = (prev.high + prev.low) / 2;
    const prevAtr = atr; // 近似处理：使用当前 atr 代替 prevAtr，误差可忽略
    const prevUp = prevHl2 - multiplier * prevAtr;
    const prevDn = prevHl2 + multiplier * prevAtr;

    const adjustedUp = prev.close > prevUp ? Math.max(up, prevUp) : up;
    const adjustedDn = prev.close < prevDn ? Math.min(dn, prevDn) : dn;

    // === Step 3: 趋势判断 ===
    let trend = -1; // 初始默认多头
    if (prev.close < prevDn) trend = -1;
    if (prev.close > prevUp) trend = 1;

    if (trend === -1 && curr.close > prevDn) trend = 1;
    else if (trend === 1 && curr.close < prevUp) trend = -1;

    return {
        hl2,
        atr,
        up: adjustedUp,
        dn: adjustedDn,
        trend // 1 = 多头，-1 = 空头
    };
}

/**
 * 计算所有指标，并返回最新 K 线的指标值
 * @param {Array} klineData K 线数据（包含 open、high、low、close）
 * @param {Object} params 配置参数
 * @returns {Object} 最新 K 线的指标值
 */

function calculateIndicators(
    klineData,
    demaShortPeriod = 144,
    demaLongPeriod = 169,
    atrPeriod = 10,
    multiplier = 3,
    demaSource = "close"
) {
    let closePrices =
        demaSource === "hl2"
            ? klineData.map((k) => (k.high + k.low) / 2)
            : klineData.map((k) => k.close);

    let demaShort = calculateDEMA(closePrices, demaShortPeriod);
    let demaLong = calculateDEMA(closePrices, demaLongPeriod);
    let superTrend = calculateSuperTrend(klineData, atrPeriod, multiplier);

    return {
        latestClose: closePrices[closePrices.length - 1],
        demaShort: demaShort[demaShort.length - 1],
        demaLong: demaLong[demaLong.length - 1],
        superTrend: superTrend.trend,
        up: superTrend.up,
        dn: superTrend.dn,
    };
}
function calculateDema(
    klineData,
    demaShortPeriod = 144,
    demaLongPeriod = 169,
    demaSource = "close"
) {
    let closePrices =
        demaSource === "hl2"
            ? klineData.map((k) => (k.high + k.low) / 2)
            : klineData.map((k) => k.close);

    let demaShort = calculateDEMA(closePrices, demaShortPeriod);
    let demaLong = calculateDEMA(closePrices, demaLongPeriod);

    return {
        demaShort: demaShort[demaShort.length - 1],
        demaLong: demaLong[demaLong.length - 1],
    };
}
function calculateCloseDema(
    closePrices,
    demaShortPeriod = 144,
    demaLongPeriod = 169
) {

    let demaShorts = calculateDEMA(closePrices, demaShortPeriod);
    let demaLongs = calculateDEMA(closePrices, demaLongPeriod);


    let demaShort=  demaShorts[demaShorts.length - 1];
    let demaLong=demaLongs[demaLongs.length - 1];
    // demaLong && console.log("🚀 ~ demaShortPeriod:", demaShort, demaLong)

    return {
        demaShort: demaShort[demaShort.length - 1],
        demaLong: demaLong[demaLong.length - 1],
        hist: demaShort - demaLong,
    };
}

module.exports = {
    calculateIndicators,
    calculateSuperTrend,
    calculateLatestSuperTrend,
    calculateATR,
    calculateDema,
    calculateCloseDema,
};
