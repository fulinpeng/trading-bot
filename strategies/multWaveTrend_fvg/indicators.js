/**
 * 指标获取逻辑模块
 * 负责计算和更新各种技术指标
 */

const { calculateLatestWaveTrend } = require("../../utils/waveTrend.js");
const { calculateAvgCandleHeight } = require("../../utils/fvg.js");

/**
 * 初始化指标计算
 * @param {Array} historyClosePrices - 历史收盘价数组
 * @param {Array} kLineData - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function initEveryIndex(historyClosePrices, kLineData, state, config) {
    const len = historyClosePrices.length;
    for (let i = len - 10; i < len; i++) {
        setEveryIndex(historyClosePrices.slice(0, i), kLineData.slice(0, i), state, config);
    }
}

/**
 * 设置所有指标
 * @param {Array} historyClosePrices - 历史收盘价数组
 * @param {Array} curKLine - 当前K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setEveryIndex(historyClosePrices, curKLine, state, config) {
    // 使用1分钟K线数据计算5分钟WaveTrend（基于1分钟K线聚合）
    setWaveTrend5m(curKLine, state, config);
    
    // 使用多时间框架K线数据计算15分钟和1小时WaveTrend
    if (state.kline15m && state.kline15m.length > 0) {
        setWaveTrend15m(state.kline15m, state, config);
    }
    if (state.kline1h && state.kline1h.length > 0) {
        setWaveTrend1h(state.kline1h, state, config);
    }
    
    // 计算平均K线高度（使用1分钟K线）
    setAvgCandleHeight(curKLine, state, config);
}

/**
 * 计算5分钟WaveTrend指标
 * 使用1分钟K线数据计算（因为1分钟K线更频繁更新）
 * @param {Array} klines - 1分钟K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setWaveTrend5m(klines, state, config) {
    if (!klines || klines.length < Math.max(config.wtChannelLength || 10, config.wtAverageLength || 21)) {
        return; // 数据不足，跳过计算
    }
    
    if (state.wt5mArr.length >= 10) {
        state.wt5mArr.shift();
    }
    const wt = calculateLatestWaveTrend(
        klines,
        config.wtChannelLength || 10,
        config.wtAverageLength || 21
    );
    if (wt) {
        state.wt5mArr.push(wt);
    }
}

/**
 * 计算15分钟WaveTrend指标
 * 使用15分钟K线数据计算
 * @param {Array} klines - 15分钟K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setWaveTrend15m(klines, state, config) {
    if (!klines || klines.length < Math.max(config.wtChannelLength || 10, config.wtAverageLength || 21)) {
        return; // 数据不足，跳过计算
    }
    
    if (state.wt15mArr.length >= 10) {
        state.wt15mArr.shift();
    }
    const wt = calculateLatestWaveTrend(
        klines,
        config.wtChannelLength || 10,
        config.wtAverageLength || 21
    );
    if (wt) {
        state.wt15mArr.push(wt);
    }
}

/**
 * 计算1小时WaveTrend指标
 * 使用1小时K线数据计算
 * @param {Array} klines - 1小时K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setWaveTrend1h(klines, state, config) {
    if (!klines || klines.length < Math.max(config.wtChannelLength || 10, config.wtAverageLength || 21)) {
        return; // 数据不足，跳过计算
    }
    
    if (state.wt1hArr.length >= 10) {
        state.wt1hArr.shift();
    }
    const wt = calculateLatestWaveTrend(
        klines,
        config.wtChannelLength || 10,
        config.wtAverageLength || 21
    );
    if (wt) {
        state.wt1hArr.push(wt);
    }
}

/**
 * 计算平均K线高度
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setAvgCandleHeight(klines, state, config) {
    const avgHeight = calculateAvgCandleHeight(
        klines,
        Math.max(config.longAvgHeightLength || 21, config.shortAvgHeightLength || 21)
    );
    if (avgHeight !== null) {
        state.avgCandleHeight = avgHeight;
    }
}

module.exports = {
    initEveryIndex,
    setEveryIndex,
    setWaveTrend5m,
    setWaveTrend15m,
    setWaveTrend1h,
    setAvgCandleHeight,
};

