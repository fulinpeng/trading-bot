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
    !ema2[ema2.length - 1] && console.log("🚀 ~ calculateDEMA ~ ema2:", ema2[ema2.length - 1], ema1.filter(v => !!v).length);
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

// RMA (Relative Moving Average / Wilder's Smoothing)
// 完全按照 Pine Script 标准实现
// Pine Script 定义：
//   pine_sma(x, y) =>
//       sum = 0.0
//       for i = 0 to y - 1
//           sum := sum + x[i] / y
//       sum
//   
//   pine_rma(src, length) =>
//       alpha = 1/length
//       sum = 0.0
//       sum := na(sum[1]) ? pine_sma(src, length) : alpha * src + (1 - alpha) * nz(sum[1])
function calculateRMA0(values, period) {
    const alpha = 1 / period;
    const rma = [];
    let sum = null; // 使用 null 表示 na，而不是 0
    
    // 辅助函数：计算 SMA（与 Pine Script 的 pine_sma 完全一致）
    // Pine Script: pine_sma(x, y) => for i = 0 to y - 1, sum := sum + x[i] / y
    // 其中 x[i] 表示历史值：x[0] 是当前值，x[1] 是前一个值，x[2] 是前两个值...
    // 在我们的数组中，values[i] 是第 i 个元素，values[i-1] 是前一个元素
    // 所以当我们在索引 idx 处计算 SMA 时，需要取 values[idx], values[idx-1], ..., values[idx-length+1]
    function calculateSMA(arr, endIdx, length) {
        let smaSum = 0.0;
        for (let i = 0; i < length; i++) {
            const idx = endIdx - i; // 从当前索引往前取
            if (idx >= 0) {
                smaSum = smaSum + arr[idx] / length;
            }
        }
        return smaSum;
    }
    
    for (let i = 0; i < values.length; i++) {
        // na(sum[1]) ? pine_sma(src, length) : alpha * src + (1 - alpha) * nz(sum[1])
        if (sum === null) {
            // sum[1] 是 na，需要初始化
            if (i < period - 1) {
                // 前 period-1 个值，sum 仍然是 na
                rma.push(null);
            } else {
                // 第 period 个值：使用 pine_sma(src, length) 初始化
                // 计算前 period 个值的 SMA（从 i 往前取 period 个值）
                sum = calculateSMA(values, i, period);
                rma.push(sum);
            }
        } else {
            // 后续K线：alpha * src + (1 - alpha) * nz(sum[1])
            sum = alpha * values[i] + (1 - alpha) * sum;
            rma.push(sum);
        }
    }
    
    return rma;
}
function calculateRMA(series, length) {
    const alpha = 1 / length;
    const rma = new Array(series.length).fill(null);

    for (let i = 0; i < series.length; i++) {
        if (i < length - 1) {
            rma[i] = null; // Pine 中前期为 na
        } else if (i === length - 1) {
            // 用 SMA 初始化
            let sum = 0;
            for (let j = 0; j < length; j++) {
                sum += series[i - j];
            }
            rma[i] = sum / length;
        } else {
            rma[i] = alpha * series[i] + (1 - alpha) * rma[i - 1];
        }
    }

    return rma;
}


// 完全按照 Pine Script 的逻辑实现
// 参考: E:\tradingview-stratagys\strategies\SuperTrend & ssl\SuperTrend & ssl-7.pine
// Pine Script: calcSuperTrendBands(int periods, float multiplier, series float src, bool changeATR)
// inertiaRatio: 趋势惯性，越大越没有考虑极端行情。当 inertiaRatio = 0 时，使用标准 TR 计算（与 Pine Script 一致）
// ★★★★ 注意如果 supertrend计算总是和tradingview不对，需要把data数据多传入一些
//      TODO 看看后续是否可以用传入上一次数据来做优化，因为 trend/up/dn 都是累积的
function calculateLatestSuperTrend(data, period = 15, multiplier = 6, useATR = true, inertiaRatio = 0) {
    // === 计算 TR（与 Pine Script 的 ta.tr 完全一致）===
    // Pine Script: ta.tr = max(high - low, abs(high - close[1]), abs(low - close[1]))
    // 或者根据 ta.atr 的定义：
    //   trueRange = na(high[1])? high-low : math.max(math.max(high - low, math.abs(high - close[1])), math.abs(low - close[1]))
    const trList = [];
    for (let i = 0; i < data.length; i++) {
        const curr = data[i];
        const prev = data[i - 1];
        
        if (i === 0) {
            // 第一根K线：na(high[1]) 为真，TR = high - low
            trList.push(curr.high - curr.low);
        } else {
            // 标准 TR 计算（与 Pine Script 的 ta.tr 完全一致）
            // math.max(math.max(high - low, abs(high - close[1])), abs(low - close[1]))
            const tr2 = Math.max(
                curr.high - curr.low,
                Math.abs(curr.high - prev.close),
                Math.abs(curr.low - prev.close)
            );
            
            // 如果 inertiaRatio > 0，使用加权计算
            // 当 inertiaRatio = 0 时，只使用标准 TR（tr2），不影响原逻辑
            if (inertiaRatio > 0) {
                const tr1 = Math.max(
                    Math.abs(curr.close - curr.open),
                    Math.abs(curr.close - prev.open),
                    Math.abs(prev.close - prev.open)
                );
                trList.push(tr1 * inertiaRatio + tr2 * (1 - inertiaRatio));
            } else {
                // inertiaRatio = 0 时，使用标准 TR（与 Pine Script 一致）
                trList.push(tr2);
            }
        }
    }

    // === 计算 ATR（与 Pine Script 完全一致）===
    // Pine Script 逻辑：
    //   float atr2 = ta.sma(ta.tr, periods)  // SMA 计算
    //   float atr = changeATR ? ta.atr(periods) : atr2
    // 
    // 所以：
    //   当 changeATR = true 时，使用 ta.atr(periods) → ta.rma(trueRange, length) → RMA (Wilder's smoothing)
    //   当 changeATR = false 时，使用 atr2 → ta.sma(ta.tr, periods) → SMA
    // 
    // JavaScript 对应：
    //   useATR = true  → changeATR = true  → 使用 RMA (ta.rma(trueRange, length))
    //   useATR = false → changeATR = false → 使用 SMA (ta.sma(ta.tr, periods))
    let atrArr = [];
    if (useATR) {
        // 使用 RMA (Wilder's smoothing) - 对应 Pine Script 的 ta.atr(periods) = ta.rma(trueRange, length)
        atrArr = calculateRMA(trList, period);
    } else {
        // 使用 SMA - 对应 Pine Script 的 ta.sma(ta.tr, periods)
        for (let i = 0; i < trList.length; i++) {
            if (i < period - 1) {
                atrArr.push(null);
            } else {
                let sum = 0;
                for (let j = i - period + 1; j <= i; j++) {
                    sum += trList[j];
                }
                atrArr.push(sum / period);
            }
        }
    }
    // console.log('@@atrArr', atrArr.length, atrArr)

    // === 计算 SuperTrend（与 Pine Script 完全一致）===
    // Pine Script:
    // lowerBand = src - multiplier * atr
    // lowerBand1 = nz(lowerBand[1], lowerBand)
    // lowerBand := close[1] > lowerBand1 ? math.max(lowerBand, lowerBand1) : lowerBand
    // 
    // upperBand = src + multiplier * atr
    // upperBand1 = nz(upperBand[1], upperBand)
    // upperBand := close[1] < upperBand1 ? math.min(upperBand, upperBand1) : upperBand
    
    const lowerBandList = []; // 上升趋势的下轨（支撑线）
    const upperBandList = []; // 下降趋势的上轨（阻力线）
    const trendList = [];
    
    // 初始化趋势为 1（上升趋势）
    let trend = 1;

    // i = period 开始，因为atr[period - 1] = null
    for (let i = period; i < data.length; i++) {
        const curr = data[i];
        const prev = data[i - 1];
        const atr = atrArr[i];
        
        // src = hl2 = (high + low) / 2
        const src = (curr.high + curr.low) / 2;
        
        // 计算基础上下轨
        let lowerBand = src - multiplier * atr;
        let upperBand = src + multiplier * atr;
        
        // 获取上一根K线的上下轨
        // trend := nz(trend[1], trend)
        // lowerBand1 = nz(lowerBand[1], lowerBand)
        // upperBand1 = nz(upperBand[1], upperBand)
        trend = trendList[trendList.length - 1] ?? trend;
        const lowerBand1 = lowerBandList[lowerBandList.length - 1] ?? lowerBand;
        const upperBand1 = upperBandList[upperBandList.length - 1] ?? upperBand;
        
        // 更新上下轨（与 Pine Script 完全一致）
        // lowerBand := close[1] > lowerBand1 ? math.max(lowerBand, lowerBand1) : lowerBand
        if (prev && prev.close > lowerBand1) {
            lowerBand = Math.max(lowerBand, lowerBand1);
        }
        
        // upperBand := close[1] < upperBand1 ? math.min(upperBand, upperBand1) : upperBand
        if (prev && prev.close < upperBand1) {
            upperBand = Math.min(upperBand, upperBand1);
        }

            
        // 更新趋势（与 Pine Script 完全一致）
        // trend := (trend == -1 and close > upperBand1) ? 1 : (trend == 1 and close < lowerBand1 ? -1 : trend)
        if (trend === -1 && curr.close > upperBand1) {
            trend = 1;
        } else if (trend === 1 && curr.close < lowerBand1) {
            trend = -1;
        }
        lowerBandList.push(lowerBand);
        upperBandList.push(upperBand);
        trendList.push(trend);
    }

    // 返回最新值
    // 注意：Pine Script 中，当 trend == 1 时使用 lowerBand，当 trend == -1 时使用 upperBand
    // 但为了兼容性，我们返回 up 和 dn
    const latestLowerBand = lowerBandList[lowerBandList.length - 1];
    const latestUpperBand = upperBandList[upperBandList.length - 1];
    const latestTrend = trendList[trendList.length - 1];

    return {
        trend: latestTrend,
        up: latestLowerBand,  // 上升趋势的下轨（支撑线）
        dn: latestUpperBand,  // 下降趋势的上轨（阻力线）
        tr: trList[trList.length - 1],
        atr: atrArr[atrArr.length - 1],
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


    let demaShort = demaShorts[demaShorts.length - 1];
    let demaLong = demaLongs[demaLongs.length - 1];
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
    calculateLatestSuperTrend: calculateLatestSuperTrend,
    calculateATR,
    calculateDema,
    calculateCloseDema,
};
