/**
 * 前高点和前低点计算
 * 用于移动止损逻辑
 */

const { calculatePivotHigh, calculatePivotLow } = require("./pivot.js");

/**
 * 计算前高点和前低点
 * @param {Array} klines - K线数据数组，每个元素包含 {high, low}
 * @param {number} swingLength - 摆动长度，默认21
 * @returns {Object} - { preHigh, preLow }
 */
function calculatePreHighLow(klines, swingLength = 21) {
    if (!klines || klines.length < swingLength * 2 + 1) {
        return { preHigh: null, preLow: null };
    }

    // 计算最近的摆动高点
    let preHigh = null;
    for (let i = klines.length - 1 - swingLength; i >= swingLength; i--) {
        const pivotHigh = calculatePivotHigh(klines.slice(0, i + swingLength + 1), swingLength);
        if (pivotHigh !== null) {
            preHigh = pivotHigh;
            break;
        }
    }

    // 计算最近的摆动低点
    let preLow = null;
    for (let i = klines.length - 1 - swingLength; i >= swingLength; i--) {
        const pivotLow = calculatePivotLow(klines.slice(0, i + swingLength + 1), swingLength);
        if (pivotLow !== null) {
            preLow = pivotLow;
            break;
        }
    }

    return {
        preHigh,
        preLow,
    };
}

/**
 * 计算最新 K 线的前高点和前低点
 * @param {Array} klines - K线数据数组
 * @param {number} swingLength - 摆动长度
 * @returns {Object} - { preHigh, preLow }
 */
function calculateLatestPreHighLow(klines, swingLength = 21) {
    return calculatePreHighLow(klines, swingLength);
}

module.exports = {
    calculatePreHighLow,
    calculateLatestPreHighLow,
};

