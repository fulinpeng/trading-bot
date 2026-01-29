/**
 * Squeeze Box 指标计算
 * 与 Pine Script 的 squeeze_box 计算保持一致
 */

/**
 * 计算 SMA (Simple Moving Average)
 * @param {Array} data - 数据数组
 * @param {number} period - 周期
 * @returns {number|null} SMA 值
 */
function calculateSMA(data, period) {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return sum / period;
}

/**
 * 计算标准差
 * @param {Array} data - 数据数组
 * @param {number} period - 周期
 * @returns {number|null} 标准差
 */
function calculateSTDEV(data, period) {
    if (data.length < period) return null;
    const sma = calculateSMA(data, period);
    if (sma === null) return null;
    
    const slice = data.slice(-period);
    const variance = slice.reduce((acc, val) => {
        const diff = val - sma;
        return acc + diff * diff;
    }, 0) / period;
    
    return Math.sqrt(variance);
}

/**
 * 计算 EMA (Exponential Moving Average)
 * 与 Pine Script 的 ema() 函数保持一致
 * @param {Array} data - 数据数组
 * @param {number} period - 周期
 * @returns {number|null} EMA 值
 */
function calculateEMA(data, period) {
    if (data.length < period) return null;
    
    // Pine Script EMA 公式：multiplier = 2 / (period + 1)
    const multiplier = 2 / (period + 1);
    
    // 初始 EMA 值：使用前 period 个值的 SMA（与 Pine Script 一致）
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i];
    }
    let ema = sum / period;
    
    // 从第 period 根K线开始，逐根计算 EMA
    // Pine Script 公式：EMA = (price - prevEMA) * multiplier + prevEMA
    for (let i = period; i < data.length; i++) {
        ema = (data[i] - ema) * multiplier + ema;
    }
    
    return ema;
}

/**
 * 获取移动平均线值
 * @param {Array} klineData - K线数据数组
 * @param {string} source - 数据源 ('close', 'open', 'high', 'low', 'hlc3', 'hl2')
 * @param {number} period - 周期
 * @param {string} maType - MA类型
 * @returns {number|null} MA 值
 */
function getMA(klineData, source, period, maType) {
    let data = [];
    
    // 根据 source 提取数据
    switch (source) {
        case 'close':
            data = klineData.map(k => k.close);
            break;
        case 'open':
            data = klineData.map(k => k.open);
            break;
        case 'high':
            data = klineData.map(k => k.high);
            break;
        case 'low':
            data = klineData.map(k => k.low);
            break;
        case 'hlc3':
            data = klineData.map(k => (k.high + k.low + k.close) / 3);
            break;
        case 'hl2':
            data = klineData.map(k => (k.high + k.low) / 2);
            break;
        default:
            data = klineData.map(k => k.close);
    }
    
    // 根据 maType 计算 MA
    switch (maType) {
        case 'EMA':
            return calculateEMA(data, period);
        case 'SMA':
            return calculateSMA(data, period);
        default:
            return calculateEMA(data, period); // 默认使用 EMA
    }
}

/**
 * 计算最新的 Squeeze Box 值（直接计算，不依赖增量更新）
 * @param {Array} klineData - K线数据数组
 * @param {Object} params - 参数对象
 * @returns {Object|null} Squeeze Box 结果
 */
function calculateLatestSqueezeBox(klineData, params = {}) {
    const {
        period = 24,
        deviation = 2,
        threshold = 50,
        source = 'hl2',
        maType = 'EMA',
    } = params;
    
    if (!klineData || klineData.length < period) {
        return null;
    }
    
    // 计算 basis (移动平均线)
    const basis = getMA(klineData, source, period, maType);
    if (basis === null) return null;
    
    // 提取源数据
    let sourceData = [];
    switch (source) {
        case 'close':
            sourceData = klineData.map(k => k.close);
            break;
        case 'open':
            sourceData = klineData.map(k => k.open);
            break;
        case 'high':
            sourceData = klineData.map(k => k.high);
            break;
        case 'low':
            sourceData = klineData.map(k => k.low);
            break;
        case 'hlc3':
            sourceData = klineData.map(k => (k.high + k.low + k.close) / 3);
            break;
        case 'hl2':
            sourceData = klineData.map(k => (k.high + k.low) / 2);
            break;
        default:
            sourceData = klineData.map(k => k.close);
    }
    
    // 计算标准差
    const stdev = calculateSTDEV(sourceData, period);
    if (stdev === null) return null;
    
    // 计算上下轨（与 Pine Script 一致）
    const bu = basis + stdev * deviation;
    const bd = basis - stdev * deviation;
    const bw = bu - bd;
    
    // 计算历史最高/最低（与 Pine Script 一致：highest(bu, per) 和 lowest(bd, per)）
    // 只计算最近 period 根K线的上下轨，然后取最大值和最小值
    const buSlice = [];
    const bdSlice = [];
    for (let i = Math.max(0, klineData.length - period); i < klineData.length; i++) {
        const klineSlice = klineData.slice(Math.max(0, i - period + 1), i + 1);
        const dataSlice = sourceData.slice(Math.max(0, i - period + 1), i + 1);
        if (klineSlice.length < period) continue;
        
        const ma = getMA(klineSlice, source, period, maType);
        const stdevVal = calculateSTDEV(dataSlice, period);
        if (ma !== null && stdevVal !== null) {
            buSlice.push(ma + stdevVal * deviation);
            bdSlice.push(ma - stdevVal * deviation);
        }
    }
    
    if (buSlice.length === 0 || bdSlice.length === 0) {
        return null;
    }
    
    const buh = Math.max(...buSlice);
    const bdl = Math.min(...bdSlice);
    const brng = buh - bdl;
    
    // 计算挤压百分比
    const sqp = brng !== 0 ? 100 * bw / brng : 100;
    const sqz = sqp < threshold;
    
    // 计算 Box 上下轨（与 Pine Script 一致）
    // Pine Script: boxh = sqz ? highest(src, per) : src
    // Pine Script: boxl = sqz ? lowest(src, per) : src
    let boxh, boxl;
    if (sqz) {
        // 挤压状态：使用最近 period 根K线的最高/最低值
        boxh = Math.max(...sourceData.slice(-period));
        boxl = Math.min(...sourceData.slice(-period));
    } else {
        // 非挤压状态：使用当前源数据值
        boxh = sourceData[sourceData.length - 1];
        boxl = sourceData[sourceData.length - 1];
    }
    
    // 保持 Squeeze Box 的上下轨值（与 Pine Script 一致）
    // Pine Script: bh = valuewhen(sqz, boxh, 1) - 获取最近一次 sqz 为 true 时的 boxh 值
    // Pine Script: bl = valuewhen(sqz, boxl, 1) - 获取最近一次 sqz 为 true 时的 boxl 值
    // 由于不使用增量更新，我们需要遍历历史数据找到最近一次挤压时的值
    let bh, bl;
    if (sqz) {
        // 当前是挤压状态：使用当前的 boxh 和 boxl
        bh = boxh;
        bl = boxl;
    } else {
        // 非挤压状态：查找最近一次挤压时的 boxh 和 boxl
        // 需要重新计算历史数据来找到最近一次挤压
        let lastSqzBoxh = null;
        let lastSqzBoxl = null;
        
        // 从倒数第二根K线开始向前查找最近一次挤压
        for (let i = klineData.length - 2; i >= period - 1; i--) {
            const klineSlice = klineData.slice(i - period + 1, i + 1);
            const dataSlice = sourceData.slice(i - period + 1, i + 1);
            if (klineSlice.length < period) break;
            
            const histMA = getMA(klineSlice, source, period, maType);
            const histStdev = calculateSTDEV(dataSlice, period);
            if (histMA === null || histStdev === null) continue;
            
            const histBu = histMA + histStdev * deviation;
            const histBd = histMA - histStdev * deviation;
            const histBw = histBu - histBd;
            
            // 计算历史最高/最低（只考虑最近 period 根）
            const histBuSlice = [];
            const histBdSlice = [];
            for (let j = Math.max(0, i - period + 1); j <= i; j++) {
                const jKlineSlice = klineData.slice(Math.max(0, j - period + 1), j + 1);
                const jDataSlice = sourceData.slice(Math.max(0, j - period + 1), j + 1);
                if (jKlineSlice.length < period) continue;
                
                const jMA = getMA(jKlineSlice, source, period, maType);
                const jStdev = calculateSTDEV(jDataSlice, period);
                if (jMA !== null && jStdev !== null) {
                    histBuSlice.push(jMA + jStdev * deviation);
                    histBdSlice.push(jMA - jStdev * deviation);
                }
            }
            
            if (histBuSlice.length > 0 && histBdSlice.length > 0) {
                const histBuh = Math.max(...histBuSlice);
                const histBdl = Math.min(...histBdSlice);
                const histBrng = histBuh - histBdl;
                const histSqp = histBrng !== 0 ? 100 * histBw / histBrng : 100;
                const histSqz = histSqp < threshold;
                
                if (histSqz) {
                    // 找到最近一次挤压
                    const histSrcSlice = sourceData.slice(i - period + 1, i + 1);
                    lastSqzBoxh = Math.max(...histSrcSlice);
                    lastSqzBoxl = Math.min(...histSrcSlice);
                    break;
                }
            }
        }
        
        // 如果找到了最近一次挤压的值，使用它；否则使用当前值
        bh = lastSqzBoxh !== null ? lastSqzBoxh : boxh;
        bl = lastSqzBoxl !== null ? lastSqzBoxl : boxl;
    }
    
    return {
        basis,
        bh,
        bl,
        sqz,
        sqp,
    };
}

module.exports = {
    calculateLatestSqueezeBox,
};

