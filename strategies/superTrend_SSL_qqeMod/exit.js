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
    const { trend } = state.tradingInfo;
    const { superTrendArr } = state;
    
    let [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
    if (!superTrend3) {
        state.isJudgeStopLoss = false;
        return;
    }
    
    let max = Math.max(superTrend3.up, superTrend3.dn);
    let min = Math.min(superTrend3.up, superTrend3.dn);

    // 与Pine Script保持一致：只使用SuperTrend上下轨作为止损，不使用sellstopLossPrice
    if (trend === "up" && _currentPrice <= min) {
        await closeUp();
        state.isJudgeStopLoss = false;
        return;
    }

    if (trend === "down" && _currentPrice >= max) {
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
    const { kLineData, superTrendArr, sslArr, swimingFreeArr, fibArr } = state;
    const { firstProtectProfitRate } = config;
    
    const [kLine1, kLine2, kLine3] = getLastFromArr(kLineData, 3);
    const { open, close, openTime, closeTime, low, high } = kLine3;
    // let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);
    let [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
    let [ssl1, ssl2, ssl3] = getLastFromArr(sslArr, 3);
    let [swimingFree1, swimingFree2, swimingFree3] = getLastFromArr(swimingFreeArr, 3);
    let [fib1, fib2, fib3] = getLastFromArr(fibArr, 3);
    
    let max = Math.max(superTrend3.up, superTrend3.dn);
    let min = Math.min(superTrend3.up, superTrend3.dn);

    if (trend === "up") {
        if (close >= max) {
            state.downArrivedProfit = state.downArrivedProfit + 1;
            if (state.downArrivedProfit == 1) {
                state.sellstopLossPrice = orderPrice + Math.abs(_currentPrice - orderPrice) * firstProtectProfitRate;
            }
            if (high >= fib3.upper_7 && state.downArrivedProfit >= 1) {
                state.sellstopLossPrice = orderPrice + Math.abs(high - orderPrice) * 0.9;
            }
        }
    }
    if (trend === "down") {
        if (close <= min) {
            state.downArrivedProfit = state.downArrivedProfit + 1;
            if (state.downArrivedProfit == 1) {
                state.sellstopLossPrice = orderPrice - Math.abs(_currentPrice - orderPrice) * firstProtectProfitRate;
            }
            if (low <= fib3.lower_7 && state.downArrivedProfit >= 1) {
                state.sellstopLossPrice = orderPrice - Math.abs(low - orderPrice) * 0.9;
            }
        }
    }
    
    state.isUpdateSellstopLossPrice = false;
}

/**
 * 判断固定止盈（做多）
 * 源代码中直接访问全局变量 entryPrice, initialLongStopLoss, riskRewardRatio
 */
function judgeFixedTakeProfitLong(kLineData, state, config) {
    const { entryPrice, initialLongStopLoss } = state;
    const { riskRewardRatio } = config;
    if (!entryPrice || !initialLongStopLoss) return false;
    const [kLine3] = getLastFromArr(kLineData, 1);
    const { close, high } = kLine3;
    const takeProfit = entryPrice + (entryPrice - initialLongStopLoss) * riskRewardRatio;
    return close >= takeProfit || high >= takeProfit;
}

/**
 * 判断固定止盈（做空）
 * 源代码中直接访问全局变量 entryPrice, initialShortStopLoss, riskRewardRatio
 */
function judgeFixedTakeProfitShort(kLineData, state, config) {
    const { entryPrice, initialShortStopLoss } = state;
    const { riskRewardRatio } = config;
    if (!entryPrice || !initialShortStopLoss) return false;
    const [kLine3] = getLastFromArr(kLineData, 1);
    const { close, low } = kLine3;
    const takeProfit = entryPrice - (initialShortStopLoss - entryPrice) * riskRewardRatio;
    return close <= takeProfit || low <= takeProfit;
}

/**
 * 判断指标止盈（做多）
 * 源代码中直接访问全局变量 enableSupertrendTakeProfit, enableFibonacciTakeProfit, priceTolerance
 */
function judgeIndicatorTakeProfitLong(kLineData, superTrendArr, fibArr, config) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [fib3] = getLastFromArr(fibArr, 1);
    if (!kLine3 || !superTrend3) return false;

    const { close, high } = kLine3;
    let triggered = false;
    // 源代码中直接访问全局变量，这里通过 config 参数传递
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
 * 源代码中直接访问全局变量 enableSupertrendTakeProfit, enableFibonacciTakeProfit, priceTolerance
 */
function judgeIndicatorTakeProfitShort(kLineData, superTrendArr, fibArr, config) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [fib3] = getLastFromArr(fibArr, 1);
    if (!kLine3 || !superTrend3) return false;

    const { close, low } = kLine3;
    let triggered = false;
    // 源代码中直接访问全局变量，这里通过 config 参数传递
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
 * @param {Array} qqeModArr - QQE指标数组
 * @param {Object} config - 配置对象（包含 enableTrailingStop 和 qqeTrailingThresholdLong）
 */
function judgeTrailingStopLong(qqeModArr, config) {
    // 源代码中直接使用全局变量 enableTrailingStop 和 qqeTrailingThresholdLong
    // 在模块化代码中，通过 config 参数传递
    const { enableTrailingStop, qqeTrailingThresholdLong } = config;
    if (!enableTrailingStop) return false;
    if (!qqeModArr || qqeModArr.length === 0) return false;
    const [qqeMod3] = getLastFromArr(qqeModArr, 1);
    if (!qqeMod3 || !qqeMod3.current) return false;
    return qqeMod3.current.qqeModBar > qqeTrailingThresholdLong;
}

/**
 * 判断移动止损触发（做空）
 * @param {Array} qqeModArr - QQE指标数组
 * @param {Object} config - 配置对象（包含 enableTrailingStop 和 qqeTrailingThresholdShort）
 */
function judgeTrailingStopShort(qqeModArr, config) {
    // 源代码中直接使用全局变量 enableTrailingStop 和 qqeTrailingThresholdShort
    // 在模块化代码中，通过 config 参数传递
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
 * 源代码中直接访问全局变量 currentKLineCount
 * @param {Number} lastBarCount - 上次触发指标止盈的K线计数
 * @param {Object} state - 策略状态对象（用于访问 currentKLineCount）
 */
function isInCoolingPeriod(lastBarCount, state) {
    if (lastBarCount === null) return false;
    // 源代码中使用全局变量 currentKLineCount，这里通过 state 访问
    return (state.currentKLineCount - lastBarCount) < 5;
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

    // 记录初始仓位大小（如果还没有记录，在持仓的第一根K线记录）- 与Pine Script保持一致
    if (trend === "up" && state.initialLongPositionSize === null) {
        state.initialLongPositionSize = quantity;
    }
    if (trend === "down" && state.initialShortPositionSize === null) {
        state.initialShortPositionSize = quantity;
    }

    if (trend === "up") {
        // 计算当前止损位
        const currentStopLoss = Math.min(superTrend3.up, superTrend3.dn);
        let effectiveStopLoss = currentStopLoss;

        // 移动止损逻辑（与Pine Script保持一致）
        const { enableTrailingStop, qqeTrailingThresholdLong } = config;
        if (enableTrailingStop && state.entryPrice !== null) {
            // 触发条件：QQE柱子值 > 阈值时启动移动止损
            const [qqeMod3] = getLastFromArr(qqeModArr, 1);
            const trigger = qqeMod3 && qqeMod3.current && qqeMod3.current.qqeModBar > qqeTrailingThresholdLong;
            
            // 第一次触发：满足条件时移动一次止损位置到 max(原止损价, preLow)
            if (!state.longTrailActive && trigger) {
                state.longTrailActive = true;
                state.longTrailStop = Math.max(currentStopLoss, preHighLow3?.preLow || currentStopLoss);
                effectiveStopLoss = state.longTrailStop;
            }
            // 已经启动后，使用移动后的止损价
            else if (state.longTrailActive) {
                effectiveStopLoss = state.longTrailStop;
            }
            else {
                effectiveStopLoss = currentStopLoss;
            }
        }

        // 1. 止损判断 - 立即市价平仓
        if (judgeStopLossLong(kLineData, effectiveStopLoss)) {
            await closeUp();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 2. 固定止盈判断 - 立即市价平仓
        if (judgeFixedTakeProfitLong(kLineData, state, config)) {
            await closeUp();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 3. 指标止盈判断（带计数和冷却期）- 使用市价单
        const isInCooling = isInCoolingPeriod(state.lastLongIndicatorTPKLineCount, state);
        if (!isInCooling && judgeIndicatorTakeProfitLong(kLineData, superTrendArr, fibArr, config)) {
            state.longIndicatorTPCount++;
            state.lastLongIndicatorTPKLineCount = state.currentKLineCount;

            // 首次触发移动止损
            if (!state.longTrailActive) {
                updateTrailingStopLong(state, currentStopLoss, preHighLow3?.preLow);
            }

            // 首次指标止盈：部分平仓（市价单）
            if (state.longIndicatorTPCount === 1 && indicatorTPPartialRatio > 0) {
                // initialLongPositionSize 已在函数开始时记录（与Pine Script一致）
                // Pine Script使用 math.abs(initialLongPositionSize)，这里也使用绝对值保持一致
                const partialQty = Math.abs(state.initialLongPositionSize) * indicatorTPPartialRatio;
                await closeOrder("SELL", partialQty, () => {
                    state.tradingInfo.quantity -= partialQty;
                });
                // 部分平仓后不重置hasOrder，继续持有剩余仓位
            }
            // 指标止盈计数大于等于阈值（且不是第一次），立即全部平仓 - 与Pine Script保持一致
            else if (state.longIndicatorTPCount >= indicatorTPCountThreshold) {
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

        // 移动止损逻辑（与Pine Script保持一致）
        const { enableTrailingStop, qqeTrailingThresholdShort } = config;
        if (enableTrailingStop && state.entryPrice !== null) {
            // 触发条件：QQE柱子值 < 阈值时启动移动止损
            const [qqeMod3] = getLastFromArr(qqeModArr, 1);
            const trigger = qqeMod3 && qqeMod3.current && qqeMod3.current.qqeModBar < qqeTrailingThresholdShort;
            
            // 第一次触发：满足条件时移动一次止损位置到 min(原止损价, preHigh)
            if (!state.shortTrailActive && trigger) {
                state.shortTrailActive = true;
                state.shortTrailStop = Math.min(currentStopLoss, preHighLow3?.preHigh || currentStopLoss);
                effectiveStopLoss = state.shortTrailStop;
            }
            // 已经启动后，使用移动后的止损价
            else if (state.shortTrailActive) {
                effectiveStopLoss = state.shortTrailStop;
            }
            else {
                effectiveStopLoss = currentStopLoss;
            }
        }

        // 1. 止损判断 - 立即市价平仓
        if (judgeStopLossShort(kLineData, effectiveStopLoss)) {
            await closeDown();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 2. 固定止盈判断 - 立即市价平仓
        if (judgeFixedTakeProfitShort(kLineData, state, config)) {
            await closeDown();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 3. 指标止盈判断（带计数和冷却期）- 使用市价单
        const isInCooling = isInCoolingPeriod(state.lastShortIndicatorTPKLineCount, state);
        if (!isInCooling && judgeIndicatorTakeProfitShort(kLineData, superTrendArr, fibArr, config)) {
            state.shortIndicatorTPCount++;
            state.lastShortIndicatorTPKLineCount = state.currentKLineCount;

            // 首次触发移动止损
            if (!state.shortTrailActive) {
                updateTrailingStopShort(state, currentStopLoss, preHighLow3?.preHigh);
            }

            // 首次指标止盈：部分平仓（市价单）
            if (state.shortIndicatorTPCount === 1 && indicatorTPPartialRatio > 0) {
                // initialShortPositionSize 已在函数开始时记录（与Pine Script一致）
                const partialQty = state.initialShortPositionSize * indicatorTPPartialRatio;
                await closeOrder("BUY", partialQty, () => {
                    state.tradingInfo.quantity -= partialQty;
                });
                // 部分平仓后不重置hasOrder，继续持有剩余仓位
            }
            // 指标止盈计数大于等于阈值（且不是第一次），立即全部平仓 - 与Pine Script保持一致
            else if (state.shortIndicatorTPCount >= indicatorTPCountThreshold) {
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
    // 注释：Pine Script中没有此逻辑，保持与Pine Script一致
    // await updateSellstopLossPrice(currentPrice, state, config);

    // 首次亏损保护
    // await judgeFirstLossProtect(currentPrice);

    state.onGridPoint = false;
}

module.exports = {
    judgeStopLoss,
    updateSellstopLossPrice,
    judgeProfitRunOrProfit,
    gridPointClearTrading,
};
