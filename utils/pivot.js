/**
 * 摆动高低点 (Pivot Points) 指标工具
 * 用于识别价格图表中的关键支撑和阻力位
 */

/**
 * 计算摆动低点 (Pivot Low)
 * 用于识别支撑位，通常用于做多止损计算
 * 
 * 摆动低点定义：在指定周期内，中心K线的最低价是左右各period根K线中的最低价
 * 
 * @param {Array} klines - K线数据数组 (从旧到新)，每个元素包含 {open, high, low, close}
 * @param {Number} period - 周期长度，中心K线左右各period根K线
 * @returns {Number|null} 摆动低点价格，如果没有找到则返回null
 * 
 * @example
 * const pivotLow = calculatePivotLow(klines, 7);
 * if (pivotLow !== null) {
 *     console.log('找到摆动低点:', pivotLow);
 * }
 */
function calculatePivotLow(klines, period) {
    if (!klines || klines.length < period * 2 + 1) {
        return null;
    }
    
    const centerIndex = klines.length - 1 - period;
    const centerKline = klines[centerIndex];
    
    if (!centerKline) {
        return null;
    }
    
    // 检查中心K线是否为最低点（在左右各period根K线范围内）
    for (let i = centerIndex - period; i <= centerIndex + period; i++) {
        if (i !== centerIndex && klines[i] && klines[i].low <= centerKline.low) {
            return null;
        }
    }
    
    return centerKline.low;
}

/**
 * 计算摆动高点 (Pivot High)
 * 用于识别阻力位，通常用于做空止损计算
 * 
 * 摆动高点定义：在指定周期内，中心K线的最高价是左右各period根K线中的最高价
 * 
 * @param {Array} klines - K线数据数组 (从旧到新)，每个元素包含 {open, high, low, close}
 * @param {Number} period - 周期长度，中心K线左右各period根K线
 * @returns {Number|null} 摆动高点价格，如果没有找到则返回null
 * 
 * @example
 * const pivotHigh = calculatePivotHigh(klines, 7);
 * if (pivotHigh !== null) {
 *     console.log('找到摆动高点:', pivotHigh);
 * }
 */
function calculatePivotHigh(klines, period) {
    if (!klines || klines.length < period * 2 + 1) {
        return null;
    }
    
    const centerIndex = klines.length - 1 - period;
    const centerKline = klines[centerIndex];
    
    if (!centerKline) {
        return null;
    }
    
    // 检查中心K线是否为最高点（在左右各period根K线范围内）
    for (let i = centerIndex - period; i <= centerIndex + period; i++) {
        if (i !== centerIndex && klines[i] && klines[i].high >= centerKline.high) {
            return null;
        }
    }
    
    return centerKline.high;
}

/**
 * 计算最近N个摆动低点
 * @param {Array} klines - K线数据数组
 * @param {Number} period - 周期长度
 * @param {Number} count - 需要返回的摆动低点数量
 * @returns {Array} 摆动低点价格数组，按时间从旧到新排序
 */
function calculateRecentPivotLows(klines, period, count = 1) {
    const pivotLows = [];
    const minLength = period * 2 + 1;
    
    if (!klines || klines.length < minLength) {
        return pivotLows;
    }
    
    // 从后往前查找摆动低点
    for (let i = klines.length - 1 - period; i >= period && pivotLows.length < count; i--) {
        const pivotLow = calculatePivotLow(klines.slice(0, i + period + 1), period);
        if (pivotLow !== null) {
            pivotLows.unshift(pivotLow);
        }
    }
    
    return pivotLows;
}

/**
 * 计算最近N个摆动高点
 * @param {Array} klines - K线数据数组
 * @param {Number} period - 周期长度
 * @param {Number} count - 需要返回的摆动高点数量
 * @returns {Array} 摆动高点价格数组，按时间从旧到新排序
 */
function calculateRecentPivotHighs(klines, period, count = 1) {
    const pivotHighs = [];
    const minLength = period * 2 + 1;
    
    if (!klines || klines.length < minLength) {
        return pivotHighs;
    }
    
    // 从后往前查找摆动高点
    for (let i = klines.length - 1 - period; i >= period && pivotHighs.length < count; i--) {
        const pivotHigh = calculatePivotHigh(klines.slice(0, i + period + 1), period);
        if (pivotHigh !== null) {
            pivotHighs.unshift(pivotHigh);
        }
    }
    
    return pivotHighs;
}

module.exports = {
    calculatePivotLow,
    calculatePivotHigh,
    calculateRecentPivotLows,
    calculateRecentPivotHighs,
};

