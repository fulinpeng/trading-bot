/**
 * SSL55 指标计算
 * 使用 HMA (Hull Moving Average) 计算 SSL55
 * 与 Pine Script 的 ssl55_fn_ssl 函数保持一致
 */

/**
 * 计算 WMA (Weighted Moving Average)
 * @param {Array} data - 数据数组
 * @param {number} period - 周期
 * @returns {Array} WMA 结果数组
 */
function calculateWMA(data, period) {
    if (data.length < period) {
        return Array(data.length).fill(null);
    }
    
    const wmaResults = [];
    const divisor = (period * (period + 1)) / 2;
    
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            wmaResults.push(null);
            continue;
        }
        
        let weightedSum = 0;
        for (let j = 0; j < period; j++) {
            weightedSum += data[i - j] * (period - j);
        }
        wmaResults.push(weightedSum / divisor);
    }
    
    return wmaResults;
}

/**
 * 计算 HMA (Hull Moving Average)
 * @param {Array} data - 数据数组
 * @param {number} length - 周期
 * @returns {Array} HMA 结果数组
 */
function calculateHMA(data, length) {
    const halfLength = Math.round(length / 2);
    const sqrtLength = Math.round(Math.sqrt(length));
    
    const wma1 = calculateWMA(data, halfLength);
    const wma2 = calculateWMA(data, length);
    
    // 计算 diff = 2 * wma1 - wma2
    const diff = wma1.map((val, idx) => {
        if (val === null || wma2[idx] === null) return null;
        return 2 * val - wma2[idx];
    });
    
    return calculateWMA(diff, sqrtLength);
}

/**
 * 计算 SSL55 指标（直接计算，不依赖增量更新）
 * @param {Array} klineData - K线数据数组，每个元素包含 {high, low, close}
 * @param {number} length - SSL55 周期，默认 55
 * @returns {Object|null} SSL55 结果 {ssl55, hlv} 或 null
 */
function calculateLatestSSL55(klineData, length = 55) {
    if (!klineData || klineData.length < length) {
        return null;
    }
    
    const highSeries = klineData.map(k => k.high);
    const lowSeries = klineData.map(k => k.low);
    const closeSeries = klineData.map(k => k.close);
    
    // 计算 HMA
    const hh = calculateHMA(highSeries, length);
    const ll = calculateHMA(lowSeries, length);
    
    const lastIndex = klineData.length - 1;
    
    // HMA 的第一个有效值出现在：length + sqrt(length) - 1 位置
    // 但为了简化，我们从 length - 1 开始计算 Hlv 状态
    // 计算 Hlv 状态（与 Pine Script 一致）
    // Pine Script: var int Hlv_ssl55 = na
    // Hlv_ssl55 := close > hh ? 1 : close < ll ? -1 : Hlv_ssl55[1]
    let hlv = null;
    
    // 从能够计算 HMA 的第一根K线开始，逐根计算 Hlv 状态
    // HMA 的第一个有效值出现在：length + sqrt(length) - 1 位置
    // 但为了确保准确性，我们从 length - 1 开始，跳过 null 值
    for (let i = length - 1; i <= lastIndex; i++) {
        const currentHH = hh[i];
        const currentLL = ll[i];
        const close = closeSeries[i];
        
        // 跳过 HMA 值仍为 null 的情况（数据不足）
        if (currentHH === null || currentLL === null) continue;
        
        if (close > currentHH) {
            hlv = 1;
        } else if (close < currentLL) {
            hlv = -1;
        }
        // 否则保持上一根的值（hlv 不变）
    }
    
    // 如果 hlv 仍为 null，说明没有足够的数据，返回 null
    if (hlv === null) {
        return null;
    }
    
    // 获取当前K线的 HMA 值（最后一个有效值）
    const currentHH = hh[lastIndex];
    const currentLL = ll[lastIndex];
    
    if (currentHH === null || currentLL === null) {
        return null;
    }
    
    // 计算 SSL55 值（使用当前K线的 HMA 值）
    // Pine Script: ssl55 = Hlv_ssl55 < 0 ? hh : ll
    const ssl55 = hlv < 0 ? currentHH : currentLL;
    
    return {
        ssl55,
        hlv,
    };
}

module.exports = {
    calculateLatestSSL55,
};

