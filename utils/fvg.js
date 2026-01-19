/**
 * FVG (Fair Value Gap) 检测工具
 * 基于 TradingView Pine Script 的 FVG 策略实现
 */

/**
 * 计算最近N根K线的平均高度
 * @param {Array} klines - K线数据数组
 * @param {Number} period - 计算周期
 * @returns {Number} 平均K线高度
 */
function calculateAvgCandleHeight(klines, period = 21) {
    if (!klines || klines.length < period) {
        return null;
    }

    const recentKlines = klines.slice(-period);
    const heights = recentKlines.map(k => k.high - k.low);
    const sum = heights.reduce((acc, height) => acc + height, 0);
    return sum / period;
}

/**
 * 检测多头FVG (Bullish Fair Value Gap)
 * FVG判定规则:
 * - 时间维度: 第3根K线的开盘时间比第1根K线的开盘时间要早
 * - 多头FVG: 第3根K线的最高价 < 第1根K线的最低价
 * - gap要求: FVG的gap必须大于当前平均K线高度的1/倍数
 * 
 * @param {Array} klines - K线数据数组 (从旧到新)
 * @param {Number} offset - 偏移量，0表示当前K线，1表示前1根K线
 * @param {Number} avgCandleHeight - 平均K线高度
 * @param {Number} gapMultiplier - gap倍数，默认5
 * @returns {Object|null} 如果检测到FVG，返回 {isValid: true, fvgMinPrice: 最小值}, 否则返回null
 */
function detectLongBullishFVG(klines, offset = 0, avgCandleHeight, gapMultiplier = 5) {
    if (!klines || klines.length < 3 + offset) {
        return null;
    }

    // 第1根K线 (较新，索引为 offset)
    const kline1 = klines[klines.length - 1 - offset];
    // 第2根K线 (中间，索引为 offset + 1)
    const kline2 = klines[klines.length - 1 - (offset + 1)];
    // 第3根K线 (较旧，索引为 offset + 2)
    const kline3 = klines[klines.length - 1 - (offset + 2)];

    // 检查时间维度: 第3根K线的开盘时间应该比第1根K线早
    if (kline3.openTime >= kline1.openTime) {
        return null;
    }

    // 多头FVG: 第3根K线的最高价 < 第1根K线的最低价
    const isFvgPattern = kline3.high < kline1.low;

    if (!isFvgPattern) {
        return null;
    }

    // 计算FVG gap: 第1根K线的最低价 - 第3根K线的最高价
    const fvgGap = kline1.low - kline3.high;

    // FVG gap必须大于当前平均K线高度的1/倍数
    const minGapRequired = avgCandleHeight && avgCandleHeight > 0 
        ? avgCandleHeight / gapMultiplier 
        : 0;
    
    const isGapValid = fvgGap > minGapRequired;

    if (!isGapValid) {
        return null;
    }

    // FVG区域最小值: 第1根K线的最低价
    const fvgMinPrice = kline1.low;

    return {
        isValid: true,
        fvgMinPrice: fvgMinPrice,
        fvgGap: fvgGap,
        kline1Index: klines.length - 1 - offset,
        kline3Index: klines.length - 1 - (offset + 2),
    };
}

/**
 * 检测空头FVG (Bearish Fair Value Gap)
 * FVG判定规则:
 * - 时间维度: 第3根K线的开盘时间比第1根K线的开盘时间要早
 * - 空头FVG: 第3根K线的最低价 > 第1根K线的最高价
 * - gap要求: FVG的gap必须大于当前平均K线高度的1/倍数
 * 
 * @param {Array} klines - K线数据数组 (从旧到新)
 * @param {Number} offset - 偏移量，0表示当前K线，1表示前1根K线
 * @param {Number} avgCandleHeight - 平均K线高度
 * @param {Number} gapMultiplier - gap倍数，默认5
 * @returns {Object|null} 如果检测到FVG，返回 {isValid: true, fvgMaxPrice: 最大值}, 否则返回null
 */
function detectShortBearishFVG(klines, offset = 0, avgCandleHeight, gapMultiplier = 5) {
    if (!klines || klines.length < 3 + offset) {
        return null;
    }

    // 第1根K线 (较新，索引为 offset)
    const kline1 = klines[klines.length - 1 - offset];
    // 第2根K线 (中间，索引为 offset + 1)
    const kline2 = klines[klines.length - 1 - (offset + 1)];
    // 第3根K线 (较旧，索引为 offset + 2)
    const kline3 = klines[klines.length - 1 - (offset + 2)];

    // 检查时间维度: 第3根K线的开盘时间应该比第1根K线早
    if (kline3.openTime >= kline1.openTime) {
        return null;
    }

    // 空头FVG: 第3根K线的最低价 > 第1根K线的最高价
    const isFvgPattern = kline3.low > kline1.high;

    if (!isFvgPattern) {
        return null;
    }

    // 计算FVG gap: 第3根K线的最低价 - 第1根K线的最高价
    const fvgGap = kline3.low - kline1.high;

    // FVG gap必须大于当前平均K线高度的1/倍数
    const minGapRequired = avgCandleHeight && avgCandleHeight > 0 
        ? avgCandleHeight / gapMultiplier 
        : 0;
    
    const isGapValid = fvgGap > minGapRequired;

    if (!isGapValid) {
        return null;
    }

    // FVG区域最大值: 第1根K线的最高价
    const fvgMaxPrice = kline1.high;

    return {
        isValid: true,
        fvgMaxPrice: fvgMaxPrice,
        fvgGap: fvgGap,
        kline1Index: klines.length - 1 - offset,
        kline3Index: klines.length - 1 - (offset + 2),
    };
}

/**
 * 在指定范围内检测多头FVG
 * @param {Array} klines - K线数据数组
 * @param {Number} lookbackStart - 起始K线索引 (从当前往前推)
 * @param {Number} currentIndex - 当前K线索引
 * @param {Number} avgCandleHeight - 平均K线高度
 * @param {Number} gapMultiplier - gap倍数
 * @returns {Object|null} 检测到的FVG信息
 */
function detectLongFVGInRange(klines, lookbackStart, currentIndex, avgCandleHeight, gapMultiplier) {
    if (!klines || lookbackStart < 0 || currentIndex < 0 || lookbackStart >= currentIndex) {
        return null;
    }

    // 限制最大检查偏移为20，避免检查过多历史K线
    const maxOffset = Math.min(currentIndex - lookbackStart, 20);
    
    for (let offset = 0; offset <= maxOffset; offset++) {
        const fvg = detectLongBullishFVG(klines, offset, avgCandleHeight, gapMultiplier);
        if (fvg && fvg.isValid) {
            return fvg;
        }
    }
    
    return null;
}

/**
 * 在指定范围内检测空头FVG
 * @param {Array} klines - K线数据数组
 * @param {Number} lookbackStart - 起始K线索引 (从当前往前推)
 * @param {Number} currentIndex - 当前K线索引
 * @param {Number} avgCandleHeight - 平均K线高度
 * @param {Number} gapMultiplier - gap倍数
 * @returns {Object|null} 检测到的FVG信息
 */
function detectShortFVGInRange(klines, lookbackStart, currentIndex, avgCandleHeight, gapMultiplier) {
    if (!klines || lookbackStart < 0 || currentIndex < 0 || lookbackStart >= currentIndex) {
        return null;
    }

    // 限制最大检查偏移为20，避免检查过多历史K线
    const maxOffset = Math.min(currentIndex - lookbackStart, 20);
    
    for (let offset = 0; offset <= maxOffset; offset++) {
        const fvg = detectShortBearishFVG(klines, offset, avgCandleHeight, gapMultiplier);
        if (fvg && fvg.isValid) {
            return fvg;
        }
    }
    
    return null;
}

module.exports = {
    calculateAvgCandleHeight,
    detectLongBullishFVG,
    detectShortBearishFVG,
    detectLongFVGInRange,
    detectShortFVGInRange,
};

