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
            throw new Error("数据长度不足以计算 SMA");
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

    // === 计算当前 WMA 高/低 ===
    const smaHigh = wma(highSeries, lastIndex, len);
    const smaLow = wma(lowSeries, lastIndex, len);

    // === HLV 状态计算（取上一根值）
    let hlvPrev = null;
    for (let i = lastIndex - 1; i >= len - 1; i--) {
        const prevSmaHigh = wma(highSeries, i, len);
        const prevSmaLow = wma(lowSeries, i, len);
        const prevClose = closeSeries[i];
        if (prevClose > prevSmaHigh) {
            hlvPrev = 1;
            break;
        } else if (prevClose < prevSmaLow) {
            hlvPrev = -1;
            break;
        }
    }
    const currClose = closeSeries[lastIndex];
    let hlv = hlvPrev;
    if (currClose > smaHigh) hlv = 1;
    else if (currClose < smaLow) hlv = -1;

    // === 计算 SSL 通道 ===
    const sslUp = hlv < 0 ? smaLow : smaHigh;
    const sslDown = hlv < 0 ? smaHigh : smaLow;

    return {
        hlv,           // 趋势方向（1 多头，-1 空头）
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

    // === 计算当前 WMA 高/低 ===
    const smaHigh2 = wma(highSeries, lastIndex, len2);
    const smaLow2 = wma(lowSeries, lastIndex, len2);

    // === HLV2 状态计算（取上一根值）
    let hlv2Prev = null;
    for (let i = lastIndex - 1; i >= len2 - 1; i--) {
        const prevSmaHigh2 = wma(highSeries, i, len2);
        const prevSmaLow2 = wma(lowSeries, i, len2);
        const prevClose = closeSeries[i];
        if (prevClose > prevSmaHigh2) {
            hlv2Prev = 1;
            break;
        } else if (prevClose < prevSmaLow2) {
            hlv2Prev = -1;
            break;
        }
    }
    const currClose = closeSeries[lastIndex];
    let hlv2 = hlv2Prev;
    if (currClose > smaHigh2) hlv2 = 1;
    else if (currClose < smaLow2) hlv2 = -1;

    // === 计算 SSL2 通道 ===
    const sslUp2 = hlv2 < 0 ? smaLow2 : smaHigh2;
    const sslDown2 = hlv2 < 0 ? smaHigh2 : smaLow2;

    return {
        hlv2,           // 趋势方向（1 多头，-1 空头）
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
