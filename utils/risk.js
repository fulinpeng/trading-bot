/**
 * 风控模块：计算单次开仓数量，保证单次亏损不超过账户总额的1%
 * 
 * 风控逻辑：
 * - 单次亏损 ≤ 账户总额的1%
 * - 止损百分比 = abs(开仓价 - 止损价) / 开仓价
 * - 最大允许亏损 = 账户价值 × 1%
 * - 开仓金额 = 最大允许亏损 / 止损百分比
 * - 开仓数量 = 开仓金额 / 开仓价
 */

/**
 * 计算单次开仓数量
 * @param {Object} params - 参数对象
 * @param {number} params.entryPrice - 开仓价
 * @param {number} params.stopLossPrice - 止损价
 * @param {string} params.direction - 交易方向: 'up' (做多) 或 'down' (做空)
 * @param {number} params.accountValue - 账户价值，默认100
 * @param {number} params.riskPercent - 单次风险百分比，默认0.01 (1%)
 * @returns {number} 开仓数量（Quantity）
 * 
 * @example
 * // 做多示例：开仓价100，止损价95
 * calculatePositionSize({
 *   entryPrice: 100,
 *   stopLossPrice: 95,
 *   direction: 'up',
 *   accountValue: 100,
 *   riskPercent: 0.01
 * })
 * // 止损百分比 = 5/100 = 5%
 * // 最大允许亏损 = 100 * 0.01 = 1
 * // 开仓金额 = 1 / 0.05 = 20
 * // 开仓数量 = 20 / 100 = 0.2
 */
function calculatePositionSize(params) {
    const {
        entryPrice,
        stopLossPrice,
        direction,
        accountValue = 100,
        riskPercent = 0.01
    } = params;

    // 参数验证
    if (!entryPrice || !stopLossPrice || !direction) {
        throw new Error('缺少必要参数: entryPrice, stopLossPrice, direction');
    }

    if (entryPrice <= 0 || stopLossPrice <= 0) {
        throw new Error('开仓价和止损价必须大于0');
    }

    if (accountValue <= 0) {
        throw new Error('账户价值必须大于0');
    }

    if (riskPercent <= 0 || riskPercent > 1) {
        throw new Error('风险百分比必须在0到1之间');
    }

    if (direction !== 'up' && direction !== 'down') {
        throw new Error('交易方向必须是 "up" 或 "down"');
    }

    // 计算止损百分比
    let stopLossPercent;
    if (direction === 'up') {
        // 做多：开仓价应该高于止损价
        if (entryPrice <= stopLossPrice) {
            throw new Error('做多时开仓价必须高于止损价');
        }
        stopLossPercent = (entryPrice - stopLossPrice) / entryPrice;
    } else {
        // 做空：开仓价应该低于止损价
        if (entryPrice >= stopLossPrice) {
            throw new Error('做空时开仓价必须低于止损价');
        }
        stopLossPercent = (stopLossPrice - entryPrice) / entryPrice;
    }

    // 防止止损百分比为0或异常
    if (stopLossPercent <= 0) {
        throw new Error('止损百分比计算错误，必须大于0');
    }

    // 计算最大允许亏损
    const maxAllowedLoss = accountValue * riskPercent;

    // 计算开仓金额
    const positionValue = maxAllowedLoss / stopLossPercent;

    // 计算开仓数量
    const quantity = positionValue / entryPrice;

    return quantity;
}

module.exports = {
    calculatePositionSize
};
