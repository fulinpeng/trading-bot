/**
 * 止盈止损逻辑模块
 * 负责判断止损、止盈和移动止损
 */

const { getLastFromArr } = require("../../utils/functions.js");

/**
 * 止损判断
 * @param {Number} _currentPrice - 当前价格
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @param {Function} closeUp - 平多函数
 * @param {Function} closeDown - 平空函数
 */
async function judgeStopLoss(_currentPrice, state, config, closeUp, closeDown) {
    if (!state.hasOrder) return;
    
    state.isJudgeStopLoss = true;
    const { trend, orderPrice } = state.tradingInfo;
    const { superTrendArr, sellstopLossPrice } = state;
    
    let [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
    if (!superTrend3) {
        state.isJudgeStopLoss = false;
        return;
    }
    
    let max = Math.max(superTrend3.up, superTrend3.dn);
    let min = Math.min(superTrend3.up, superTrend3.dn);

    if (trend === "up" && (
        _currentPrice <= min ||
        (sellstopLossPrice && _currentPrice < sellstopLossPrice)
    )) {
        await closeUp();
        state.isJudgeStopLoss = false;
        return;
    }

    if (trend === "down" && (
        _currentPrice >= max ||
        (sellstopLossPrice && _currentPrice > sellstopLossPrice)
    )) {
        await closeDown();
        state.isJudgeStopLoss = false;
        return;
    }
    
    state.isJudgeStopLoss = false;
}

/**
 * 更新移动止损价格（保本止损）
 * @param {Number} _currentPrice - 当前价格
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
async function updateSellstopLossPrice(_currentPrice, state, config) {
    if (!state.hasOrder) return;
    
    state.isUpdateSellstopLossPrice = true;
    const { trend, orderPrice } = state.tradingInfo;
    const { kLineData, superTrendArr, fibArr } = state;
    const { firstProtectProfitRate } = config;
    
    const [kLine1, kLine2, kLine3] = getLastFromArr(kLineData, 3);
    if (!kLine3) {
        state.isUpdateSellstopLossPrice = false;
        return;
    }
    
    const { open, close, openTime, closeTime, low, high } = kLine3;
    let [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
    let [fib1, fib2, fib3] = getLastFromArr(fibArr, 3);
    
    if (!superTrend3) {
        state.isUpdateSellstopLossPrice = false;
        return;
    }
    
    let max = Math.max(superTrend3.up, superTrend3.dn);
    let min = Math.min(superTrend3.up, superTrend3.dn);

    if (trend === "up") {
        if (close >= max) {
            if (state.downArrivedProfit === undefined) {
                state.downArrivedProfit = 0;
            }
            state.downArrivedProfit = state.downArrivedProfit + 1;
            if (state.downArrivedProfit == 1) {
                state.sellstopLossPrice = orderPrice + Math.abs(_currentPrice - orderPrice) * firstProtectProfitRate;
            }
            if (fib3 && high >= fib3.upper_7 && state.downArrivedProfit >= 1) {
                state.sellstopLossPrice = orderPrice + Math.abs(high - orderPrice) * 0.9;
            }
        }
    }
    if (trend === "down") {
        if (close <= min) {
            if (state.downArrivedProfit === undefined) {
                state.downArrivedProfit = 0;
            }
            state.downArrivedProfit = state.downArrivedProfit + 1;
            if (state.downArrivedProfit == 1) {
                state.sellstopLossPrice = orderPrice - Math.abs(_currentPrice - orderPrice) * firstProtectProfitRate;
            }
            if (fib3 && low <= fib3.lower_7 && state.downArrivedProfit >= 1) {
                state.sellstopLossPrice = orderPrice - Math.abs(low - orderPrice) * 0.9;
            }
        }
    }
    
    state.isUpdateSellstopLossPrice = false;
}

/**
 * 判断固定止盈（做多）
 */
function judgeFixedTakeProfitLong(kLineData, entryPrice, initialLongStopLoss, riskRewardRatio) {
    if (!entryPrice || !initialLongStopLoss) return false;
    const [kLine3] = getLastFromArr(kLineData, 1);
    if (!kLine3) return false;
    const { close, high } = kLine3;
    const takeProfit = entryPrice + (entryPrice - initialLongStopLoss) * riskRewardRatio;
    return close >= takeProfit || high >= takeProfit;
}

/**
 * 判断固定止盈（做空）
 */
function judgeFixedTakeProfitShort(kLineData, entryPrice, initialShortStopLoss, riskRewardRatio) {
    if (!entryPrice || !initialShortStopLoss) return false;
    const [kLine3] = getLastFromArr(kLineData, 1);
    if (!kLine3) return false;
    const { close, low } = kLine3;
    const takeProfit = entryPrice - (initialShortStopLoss - entryPrice) * riskRewardRatio;
    return close <= takeProfit || low <= takeProfit;
}

/**
 * 判断指标止盈（做多）
 */
function judgeIndicatorTakeProfitLong(kLineData, superTrendArr, fibArr, config) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [fib3] = getLastFromArr(fibArr, 1);
    if (!kLine3 || !superTrend3) return false;

    const { close, high } = kLine3;
    let triggered = false;
    const { enableSupertrendTakeProfit, enableFibonacciTakeProfit, priceTolerance } = config;

    // SuperTrend上轨止盈（带容差）
    if (enableSupertrendTakeProfit) {
        const maxSuper = Math.max(superTrend3.up, superTrend3.dn);
        const maxSuperTolerance = calculateTolerancePrice(maxSuper, priceTolerance, 'long');
        if (close > maxSuperTolerance || high > maxSuperTolerance) {
            triggered = true;
        }
    }

    // Fibonacci上轨止盈（带容差）
    if (enableFibonacciTakeProfit && fib3) {
        const upper7Tolerance = calculateTolerancePrice(fib3.upper_7, priceTolerance, 'long');
        if (close > upper7Tolerance || high > upper7Tolerance) {
            triggered = true;
        }
    }

    return triggered;
}

/**
 * 判断指标止盈（做空）
 */
function judgeIndicatorTakeProfitShort(kLineData, superTrendArr, fibArr, config) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [fib3] = getLastFromArr(fibArr, 1);
    if (!kLine3 || !superTrend3) return false;

    const { close, low } = kLine3;
    let triggered = false;
    const { enableSupertrendTakeProfit, enableFibonacciTakeProfit, priceTolerance } = config;

    // SuperTrend下轨止盈（带容差）
    if (enableSupertrendTakeProfit) {
        const minSuper = Math.min(superTrend3.up, superTrend3.dn);
        const minSuperTolerance = calculateTolerancePrice(minSuper, priceTolerance, 'short');
        if (close < minSuperTolerance || low < minSuperTolerance) {
            triggered = true;
        }
    }

    // Fibonacci下轨止盈（带容差）
    if (enableFibonacciTakeProfit && fib3) {
        const lower7Tolerance = calculateTolerancePrice(fib3.lower_7, priceTolerance, 'short');
        if (close < lower7Tolerance || low < lower7Tolerance) {
            triggered = true;
        }
    }

    return triggered;
}

/**
 * 判断止损（做多）
 */
function judgeStopLossLong(kLineData, effectiveStopLoss) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    if (!kLine3) return false;
    const { close, low } = kLine3;
    return close < effectiveStopLoss || low < effectiveStopLoss;
}

/**
 * 判断止损（做空）
 */
function judgeStopLossShort(kLineData, effectiveStopLoss) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    if (!kLine3) return false;
    const { close, high } = kLine3;
    return close > effectiveStopLoss || high > effectiveStopLoss;
}

/**
 * 判断移动止损触发（做多）
 */
function judgeTrailingStopLong(qqeModArr, config) {
    const { enableTrailingStop, qqeTrailingThresholdLong } = config;
    if (!enableTrailingStop) return false;
    if (!qqeModArr || qqeModArr.length === 0) return false;
    const [qqeMod3] = getLastFromArr(qqeModArr, 1);
    if (!qqeMod3 || !qqeMod3.current) return false;
    return qqeMod3.current.qqeModBar > qqeTrailingThresholdLong;
}

/**
 * 判断移动止损触发（做空）
 */
function judgeTrailingStopShort(qqeModArr, config) {
    const { enableTrailingStop, qqeTrailingThresholdShort } = config;
    if (!enableTrailingStop) return false;
    if (!qqeModArr || qqeModArr.length === 0) return false;
    const [qqeMod3] = getLastFromArr(qqeModArr, 1);
    if (!qqeMod3 || !qqeMod3.current) return false;
    return qqeMod3.current.qqeModBar < qqeTrailingThresholdShort;
}

/**
 * 更新移动止损（做多）
 */
function updateTrailingStopLong(state, currentStopLoss, preLow) {
    if (!state.longTrailActive) {
        state.longTrailActive = true;
        state.longTrailStop = Math.max(currentStopLoss, preLow || currentStopLoss);
    }
    return state.longTrailStop;
}

/**
 * 更新移动止损（做空）
 */
function updateTrailingStopShort(state, currentStopLoss, preHigh) {
    if (!state.shortTrailActive) {
        state.shortTrailActive = true;
        state.shortTrailStop = Math.min(currentStopLoss, preHigh || currentStopLoss);
    }
    return state.shortTrailStop;
}

/**
 * 计算容差价格（做多向下放宽，做空向上放宽）
 */
function calculateTolerancePrice(targetPrice, priceTolerance, direction) {
    if (direction === 'long') {
        return targetPrice * (1 - priceTolerance);
    } else {
        return targetPrice * (1 + priceTolerance);
    }
}

/**
 * 判断是否在冷却期内
 */
function isInCoolingPeriod(lastBarCount, currentKLineCount) {
    if (lastBarCount === null) return false;
    return (currentKLineCount - lastBarCount) < 5;
}

/**
 * 止盈 | 移动止盈
 * @param {Number} currentPrice - 当前价格
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @param {Function} closeUp - 平多函数
 * @param {Function} closeDown - 平空函数
 * @param {Function} closeOrder - 平仓函数（支持部分平仓）
 */
async function judgeProfitRunOrProfit(currentPrice, state, config, closeUp, closeDown, closeOrder) {
    if (!state.hasOrder) return;
    
    state.isJudgeProfitRunOrProfit = true;
    const { trend, orderPrice, quantity } = state.tradingInfo;
    const { kLineData, superTrendArr, fibArr, qqeModArr, preHighLowArr } = state;
    const { riskRewardRatio, indicatorTPCountThreshold, indicatorTPPartialRatio } = config;
    
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [preHighLow3] = getLastFromArr(preHighLowArr, 1);
    if (!kLine3 || !superTrend3) {
        state.isJudgeProfitRunOrProfit = false;
        return;
    }

    if (trend === "up") {
        // 计算当前止损位
        const currentStopLoss = Math.min(superTrend3.up, superTrend3.dn);
        let effectiveStopLoss = currentStopLoss;

        // 移动止损逻辑
        if (judgeTrailingStopLong(qqeModArr, config) || state.longTrailActive) {
            effectiveStopLoss = updateTrailingStopLong(state, currentStopLoss, preHighLow3?.preLow);
        }

        // 1. 止损判断 - 立即市价平仓
        if (judgeStopLossLong(kLineData, effectiveStopLoss)) {
            await closeUp();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 2. 固定止盈判断 - 立即市价平仓
        if (judgeFixedTakeProfitLong(kLineData, state.entryPrice, state.initialLongStopLoss, riskRewardRatio)) {
            await closeUp();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 3. 指标止盈判断（带计数和冷却期）- 使用市价单
        const isInCooling = isInCoolingPeriod(state.lastLongIndicatorTPKLineCount, state.currentKLineCount);
        if (!isInCooling && judgeIndicatorTakeProfitLong(kLineData, superTrendArr, fibArr, config)) {
            if (state.longIndicatorTPCount === undefined) {
                state.longIndicatorTPCount = 0;
            }
            state.longIndicatorTPCount++;
            state.lastLongIndicatorTPKLineCount = state.currentKLineCount;

            // 首次触发移动止损
            if (!state.longTrailActive) {
                updateTrailingStopLong(state, currentStopLoss, preHighLow3?.preLow);
            }

            // 首次指标止盈：部分平仓（市价单）
            if (state.longIndicatorTPCount === 1 && indicatorTPPartialRatio > 0) {
                if (state.initialLongPositionSize === null || state.initialLongPositionSize === undefined) {
                    state.initialLongPositionSize = quantity;
                }
                const partialQty = state.initialLongPositionSize * indicatorTPPartialRatio;
                await closeOrder("SELL", partialQty, () => {
                    state.tradingInfo.quantity -= partialQty;
                });
                // 部分平仓后不重置hasOrder，继续持有剩余仓位
            }

            // 计数达到阈值：全部平仓（市价单）
            if (state.longIndicatorTPCount >= indicatorTPCountThreshold) {
                await closeUp();
                state.isJudgeProfitRunOrProfit = false;
                return;
            }
        }
    }

    if (trend === "down") {
        // 计算当前止损位
        const currentStopLoss = Math.max(superTrend3.up, superTrend3.dn);
        let effectiveStopLoss = currentStopLoss;

        // 移动止损逻辑
        if (judgeTrailingStopShort(qqeModArr, config) || state.shortTrailActive) {
            effectiveStopLoss = updateTrailingStopShort(state, currentStopLoss, preHighLow3?.preHigh);
        }

        // 1. 止损判断 - 立即市价平仓
        if (judgeStopLossShort(kLineData, effectiveStopLoss)) {
            await closeDown();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 2. 固定止盈判断 - 立即市价平仓
        if (judgeFixedTakeProfitShort(kLineData, state.entryPrice, state.initialShortStopLoss, riskRewardRatio)) {
            await closeDown();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 3. 指标止盈判断（带计数和冷却期）- 使用市价单
        const isInCooling = isInCoolingPeriod(state.lastShortIndicatorTPKLineCount, state.currentKLineCount);
        if (!isInCooling && judgeIndicatorTakeProfitShort(kLineData, superTrendArr, fibArr, config)) {
            if (state.shortIndicatorTPCount === undefined) {
                state.shortIndicatorTPCount = 0;
            }
            state.shortIndicatorTPCount++;
            state.lastShortIndicatorTPKLineCount = state.currentKLineCount;

            // 首次触发移动止损
            if (!state.shortTrailActive) {
                updateTrailingStopShort(state, currentStopLoss, preHighLow3?.preHigh);
            }

            // 首次指标止盈：部分平仓（市价单）
            if (state.shortIndicatorTPCount === 1 && indicatorTPPartialRatio > 0) {
                if (state.initialShortPositionSize === null || state.initialShortPositionSize === undefined) {
                    state.initialShortPositionSize = quantity;
                }
                const partialQty = state.initialShortPositionSize * indicatorTPPartialRatio;
                await closeOrder("BUY", partialQty, () => {
                    state.tradingInfo.quantity -= partialQty;
                });
                // 部分平仓后不重置hasOrder，继续持有剩余仓位
            }

            // 计数达到阈值：全部平仓（市价单）
            if (state.shortIndicatorTPCount >= indicatorTPCountThreshold) {
                await closeDown();
                state.isJudgeProfitRunOrProfit = false;
                return;
            }
        }
    }

    state.isJudgeProfitRunOrProfit = false;
}

/**
 * 是否到达止损点/平仓
 * @param {Number} currentPrice - 当前价格
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @param {Function} closeUp - 平多函数
 * @param {Function} closeDown - 平空函数
 * @param {Function} closeOrder - 平仓函数（支持部分平仓）
 */
async function gridPointClearTrading(currentPrice, state, config, closeUp, closeDown, closeOrder) {
    if (!state.hasOrder) return;

    state.onGridPoint = true;

    // 止盈 | 移动止盈
    await judgeProfitRunOrProfit(currentPrice, state, config, closeUp, closeDown, closeOrder);

    // 首次盈利保护（更新移动止损）
    await updateSellstopLossPrice(currentPrice, state, config);

    state.onGridPoint = false;
}

module.exports = {
    judgeStopLoss,
    updateSellstopLossPrice,
    judgeProfitRunOrProfit,
    gridPointClearTrading,
};
