/**
 * K线聚合工具
 * 将低时间框架的K线数据聚合成高时间框架的K线数据
 * 例如：将1分钟K线聚合成5分钟、15分钟、1小时K线
 */

/**
 * 时间框架配置（毫秒）
 */
const TIMEFRAME_MS = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
};

/**
 * 将时间框架字符串转换为毫秒数
 * @param {String} timeframe - 时间框架，如 '5m', '15m', '1h'
 * @returns {Number} 毫秒数
 */
function getTimeframeMs(timeframe) {
    return TIMEFRAME_MS[timeframe] || null;
}

/**
 * 判断一个时间戳是否属于某个时间框架周期的开始
 * @param {Number} timestamp - 时间戳（毫秒）
 * @param {String} timeframe - 时间框架，如 '5m', '15m', '1h'
 * @returns {Boolean}
 */
function isPeriodStart(timestamp, timeframe) {
    const ms = getTimeframeMs(timeframe);
    if (!ms) return false;
    
    // 将时间戳对齐到时间框架周期的开始
    // 例如：5分钟周期，将时间戳对齐到每5分钟的整点（如 10:00, 10:05, 10:10）
    const aligned = Math.floor(timestamp / ms) * ms;
    return timestamp === aligned;
}

/**
 * 聚合K线数据
 * 将1分钟K线聚合成更高时间框架的K线
 * 
 * @param {Object} current1mKline - 当前1分钟K线数据
 *   {
 *     openTime: Number,  // 开盘时间（时间戳）
 *     closeTime: Number, // 收盘时间（时间戳）
 *     open: Number,      // 开盘价
 *     high: Number,      // 最高价
 *     low: Number,       // 最低价
 *     close: Number,     // 收盘价
 *     volume: Number,   // 成交量
 *   }
 * @param {String} targetTimeframe - 目标时间框架，如 '5m', '15m', '1h'
 * @param {Object|null} tempKline - 临时K线对象（用于存储未完成的聚合K线）
 * @returns {Object|null} 如果新K线收盘，返回完整的K线对象；否则返回null
 *   返回格式：{ completed: Object|null, temp: Object }
 *   - completed: 完成的K线（如果新周期开始）或 null
 *   - temp: 更新后的临时K线对象
 */
function aggregateKline(current1mKline, targetTimeframe, tempKline = null) {
    const timeframeMs = getTimeframeMs(targetTimeframe);
    if (!timeframeMs) {
        throw new Error(`Unsupported timeframe: ${targetTimeframe}`);
    }

    const { openTime, closeTime, open, high, low, close, volume } = current1mKline;

    // 计算当前K线所属的周期开始和结束时间
    const periodStart = Math.floor(openTime / timeframeMs) * timeframeMs;
    const periodEnd = periodStart + timeframeMs - 1;
    
    // 如果临时K线不存在，说明是新周期的开始
    if (!tempKline) {
        tempKline = {
            openTime: periodStart,
            closeTime: periodEnd, // 周期结束时间（固定值）
            open: open,
            high: high,
            low: low,
            close: close,
            volume: volume,
        };
        
        // 如果当前K线已经收盘，且收盘时间 >= 周期结束时间，说明这个周期已经完成
        // 这种情况比较少见，通常发生在初始化历史数据时
        if (closeTime >= periodEnd) {
            const completed = { ...tempKline };
            completed.closeTime = periodEnd;
            
            // 检查是否进入下一个周期
            const nextPeriodStart = periodEnd + 1;
            if (closeTime >= nextPeriodStart) {
                const nextPeriodEnd = nextPeriodStart + timeframeMs - 1;
                tempKline = {
                    openTime: nextPeriodStart,
                    closeTime: nextPeriodEnd,
                    open: close,
                    high: high,
                    low: low,
                    close: close,
                    volume: volume,
                };
            } else {
                tempKline = null;
            }
            
            return {
                completed: completed,
                temp: tempKline,
            };
        }
        
        return {
            completed: null,
            temp: tempKline,
        };
    }

    // 更新临时K线
    tempKline.high = Math.max(tempKline.high, high);
    tempKline.low = Math.min(tempKline.low, low);
    tempKline.close = close; // 收盘价总是使用最新的收盘价
    tempKline.volume += volume; // 成交量累加
    // 注意：tempKline.closeTime 保持为周期结束时间，不更新

    // 检查是否到达周期结束时间
    // 如果当前K线的收盘时间 >= 临时K线的周期结束时间，说明周期完成
    if (closeTime >= tempKline.closeTime) {
        const completed = { ...tempKline };
        // 确保 completed 的 closeTime 是周期结束时间
        completed.closeTime = tempKline.closeTime;
        
        // 计算下一个周期的开始时间
        const nextPeriodStart = tempKline.closeTime + 1;
        const nextPeriodEnd = nextPeriodStart + timeframeMs - 1;
        
        // 如果当前K线的收盘时间已经进入下一个周期，创建新的临时K线
        if (closeTime >= nextPeriodStart) {
            tempKline = {
                openTime: nextPeriodStart,
                closeTime: nextPeriodEnd,
                open: close, // 新周期的开盘价是上一个周期的收盘价
                high: high,
                low: low,
                close: close,
                volume: volume,
            };
        } else {
            // 当前K线正好在周期边界，下一个周期还未开始
            tempKline = null;
        }
        
        return {
            completed: completed,
            temp: tempKline,
        };
    }

    // 周期未完成，继续累积
    return {
        completed: null,
        temp: tempKline,
    };
}

/**
 * 批量聚合K线
 * 将多个1分钟K线聚合成目标时间框架的K线数组
 * 
 * @param {Array} klines1m - 1分钟K线数组
 * @param {String} targetTimeframe - 目标时间框架
 * @returns {Array} 聚合后的K线数组
 */
function aggregateKlines(klines1m, targetTimeframe) {
    if (!klines1m || klines1m.length === 0) {
        return [];
    }

    const timeframeMs = getTimeframeMs(targetTimeframe);
    if (!timeframeMs) {
        throw new Error(`Unsupported timeframe: ${targetTimeframe}`);
    }

    const result = [];
    let tempKline = null;

    for (const kline of klines1m) {
        const { completed, temp } = aggregateKline(kline, targetTimeframe, tempKline);
        if (completed) {
            result.push(completed);
        }
        tempKline = temp;
    }

    return result;
}

/**
 * 多时间框架聚合器类
 * 用于管理多个时间框架的K线聚合状态
 */
class MultiTimeframeAggregator {
    constructor(timeframes = ['5m', '15m', '1h']) {
        this.timeframes = timeframes;
        // 存储每个时间框架的临时K线
        this.tempKlines = {};
        // 存储每个时间框架的完整K线数组
        this.aggregatedKlines = {};
        
        // 初始化
        this.timeframes.forEach(tf => {
            this.tempKlines[tf] = null;
            this.aggregatedKlines[tf] = [];
        });
    }

    /**
     * 处理新的1分钟K线
     * @param {Object} kline1m - 1分钟K线数据
     * @returns {Object} 返回每个时间框架新完成的K线（如果有）
     *   { '5m': Object|null, '15m': Object|null, '1h': Object|null }
     */
    processKline(kline1m) {
        const result = {};
        
        this.timeframes.forEach(tf => {
            const { completed, temp } = aggregateKline(kline1m, tf, this.tempKlines[tf]);
            
            if (completed) {
                // 新K线完成，添加到数组
                this.aggregatedKlines[tf].push(completed);
                // 限制数组长度，保留最近1000条
                if (this.aggregatedKlines[tf].length > 1000) {
                    this.aggregatedKlines[tf].shift();
                }
                result[tf] = completed;
            } else {
                result[tf] = null;
            }
            
            this.tempKlines[tf] = temp;
        });
        
        return result;
    }

    /**
     * 获取指定时间框架的K线数组
     * @param {String} timeframe - 时间框架
     * @returns {Array} K线数组
     */
    getKlines(timeframe) {
        return this.aggregatedKlines[timeframe] || [];
    }

    /**
     * 初始化历史数据
     * @param {Array} klines1m - 历史1分钟K线数组
     */
    initHistory(klines1m) {
        this.timeframes.forEach(tf => {
            this.aggregatedKlines[tf] = aggregateKlines(klines1m, tf);
            // 处理最后一个临时K线
            if (klines1m.length > 0) {
                const lastKline = klines1m[klines1m.length - 1];
                const { temp } = aggregateKline(lastKline, tf, null);
                this.tempKlines[tf] = temp;
            }
        });
    }

    /**
     * 重置所有数据
     */
    reset() {
        this.timeframes.forEach(tf => {
            this.tempKlines[tf] = null;
            this.aggregatedKlines[tf] = [];
        });
    }
}

module.exports = {
    aggregateKline,
    aggregateKlines,
    MultiTimeframeAggregator,
    getTimeframeMs,
    isPeriodStart,
};

