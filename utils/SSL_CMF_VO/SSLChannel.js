/**
 * 计算 SSL 通道指标值 (SSL Channel)
 * @param {Array<Object>} klineData - K 线数据数组，每个对象应包含 high, low, close 值
 * @param {Object} params - 指标参数对象
 * @param {number} params.len - SMA 的计算周期
 * @returns {Object} - 返回最新 K 线对应的 sslDown 和 sslUp 指标值
 */
function calculateSSLChannel(klineData, len = 20) {
    // 检查输入数据是否合法
    if (!Array.isArray(klineData) || klineData.length < len) {
        throw new Error("calculateSSLChannel K 线数据长度不足以计算指标或格式不正确");
    }

    // 计算简单移动平均线 (SMA)
    function sma(values, period) {
        if (values.length < period) {
            throw new Error("数据长度不足以计算 SMA");
        }
        const sum = values.slice(-period).reduce((acc, value) => acc + value, 0);
        return sum / period;
    }

    // 计算 high 和 low 的 SMA
    const smaHigh = sma(
        klineData.map((kline) => kline.high),
        len
    );
    const smaLow = sma(
        klineData.map((kline) => kline.low),
        len
    );

    // Hlv 计算逻辑
    let hlv = null;
    const lastClose = klineData[klineData.length - 1].close; // 获取最新的 close 值
    if (lastClose > smaHigh) {
        hlv = 1;
    } else if (lastClose < smaLow) {
        hlv = -1;
    } else {
        // 如果当前 close 值在 smaHigh 和 smaLow 之间，继承上一根 K 线的 Hlv 值
        hlv = klineData.length > 1 ? klineData[klineData.length - 2].hlv || 0 : 0; // 默认值为 0
    }

    // 计算 SSL 通道的上下轨
    const sslDown = hlv < 0 ? smaHigh : smaLow;
    const sslUp = hlv < 0 ? smaLow : smaHigh;

    // 返回最新 K 线对应的 SSL 通道值
    return { sslDown, sslUp };
}
function calculateLatestSSL(data, length = 200) {
    const len = length;
    const lastIndex = data.length - 1;

    if (data.length < len) {
        console.log("🚀 ~ calculateLatestSSL ~ K 线数据长度不足以计算指标或格式不正确", data)
        return null;
    }

    // === 加权移动平均 (WMA) ===
    function wma(series, endIndex, period) {
        if (series.length < period) {
            throw new Error("数据长度不足以计算 WMA");
        }
        let weightedSum = 0;
        let weightTotal = 0;
        for (let i = 0; i < period; i++) {
            const weight = period - i;
            weightedSum += series[endIndex - i] * weight;
            weightTotal += weight;
        }
        return weightedSum / weightTotal;
    }

    // 准备高低数组
    const highSeries = data.map(d => d.high);
    const lowSeries = data.map(d => d.low);
    const closeSeries = data.map(d => d.close);

    // === 计算每根K线的 WMA 和 Hlv 状态（与 Pine Script 一致）===
    // Pine Script: var float Hlv = na
    // Hlv := close > smaHigh ? 1 : close < smaLow ? -1 : Hlv[1]
    let hlv = null; // 初始值为 null（对应 Pine Script 的 na）
    
    // 从能够计算 WMA 的第一根K线开始，逐根计算 Hlv 状态
    for (let i = len - 1; i <= lastIndex; i++) {
        const smaHigh = wma(highSeries, i, len);
        const smaLow = wma(lowSeries, i, len);
        const close = closeSeries[i];
        
        // 根据 Pine Script 逻辑：Hlv := close > smaHigh ? 1 : close < smaLow ? -1 : Hlv[1]
        if (close > smaHigh) {
            hlv = 1;
        } else if (close < smaLow) {
            hlv = -1;
        }
        // 否则保持上一根的值（hlv 不变）
    }

    // === 计算当前 K 线的 WMA 高/低 ===
    const smaHigh = wma(highSeries, lastIndex, len);
    const smaLow = wma(lowSeries, lastIndex, len);

    // === 计算 SSL 通道（与 Pine Script 一致）===
    // Pine Script: sslDown = Hlv < 0 ? smaHigh : smaLow
    //             sslUp   = Hlv < 0 ? smaLow  : smaHigh
    const sslUp = hlv < 0 ? smaLow : smaHigh;
    const sslDown = hlv < 0 ? smaHigh : smaLow;

    return {
        hlv: hlv || 0,  // 如果 hlv 仍为 null，返回 0
        sslUp,         // 上轨
        sslDown        // 下轨
    };
}


/**
 * 计算 SSL2（SSL的3倍周期）
 * @param {Array} data - K线数据数组
 * @param {number} sslPeriod - SSL周期
 * @returns {Object} - { sslUp2, sslDown2, smaHigh2, smaLow2, hlv2 }
 */
function calculateLatestSSL2(data, sslPeriod = 200) {
    const len2 = sslPeriod * 3;  // SSL2的周期是SSL的3倍
    const lastIndex = data.length - 1;

    if (data.length < len2) {
        return null;
    }

    // === 加权移动平均 (WMA) ===
    function wma(series, endIndex, period) {
        if (series.length < period) {
            throw new Error("数据长度不足以计算 WMA");
        }
        let weightedSum = 0;
        let weightTotal = 0;
        for (let i = 0; i < period; i++) {
            const weight = period - i;
            weightedSum += series[endIndex - i] * weight;
            weightTotal += weight;
        }
        return weightedSum / weightTotal;
    }

    // 准备高低数组
    const highSeries = data.map(d => d.high);
    const lowSeries = data.map(d => d.low);
    const closeSeries = data.map(d => d.close);

    // === 计算每根K线的 WMA 和 Hlv2 状态（与 Pine Script 一致）===
    // Pine Script: var float Hlv2 = na
    // Hlv2 := close > smaHigh2 ? 1 : close < smaLow2 ? -1 : Hlv2[1]
    let hlv2 = null; // 初始值为 null（对应 Pine Script 的 na）
    
    // 从能够计算 WMA 的第一根K线开始，逐根计算 Hlv2 状态
    for (let i = len2 - 1; i <= lastIndex; i++) {
        const smaHigh2 = wma(highSeries, i, len2);
        const smaLow2 = wma(lowSeries, i, len2);
        const close = closeSeries[i];
        
        // 根据 Pine Script 逻辑：Hlv2 := close > smaHigh2 ? 1 : close < smaLow2 ? -1 : Hlv2[1]
        if (close > smaHigh2) {
            hlv2 = 1;
        } else if (close < smaLow2) {
            hlv2 = -1;
        }
        // 否则保持上一根的值（hlv2 不变）
    }

    // === 计算当前 K 线的 WMA 高/低 ===
    const smaHigh2 = wma(highSeries, lastIndex, len2);
    const smaLow2 = wma(lowSeries, lastIndex, len2);

    // === 计算 SSL2 通道（与 Pine Script 一致）===
    // Pine Script: sslDown2 = Hlv2 < 0 ? smaHigh2 : smaLow2
    //             sslUp2   = Hlv2 < 0 ? smaLow2  : smaHigh2
    const sslUp2 = hlv2 < 0 ? smaLow2 : smaHigh2;
    const sslDown2 = hlv2 < 0 ? smaHigh2 : smaLow2;

    return {
        hlv2: hlv2 || 0,  // 如果 hlv2 仍为 null，返回 0
        sslUp2,         // 上轨
        sslDown2,       // 下轨
        smaHigh2,       // WMA 高点
        smaLow2,        // WMA 低点
    };
}

module.exports = {
    calculateSSL: calculateSSLChannel,
    calculateLatestSSL,
    calculateLatestSSL2,
};
