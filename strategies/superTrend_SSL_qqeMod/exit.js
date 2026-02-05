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
 * 判断QQE MOD拐头止盈（做多）
 * 条件：qqeMode向下拐头 && 中间最大的qqemod > 阈值 && close > 开仓价
 * 向下拐头：qqeModBar[2] < qqeModBar[1] > qqeModBar[0]
 * @param {Array} kLineData - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Boolean} 是否触发QQE MOD拐头止盈
 */
function judgeQQEModTakeProfitLong(kLineData, state, config) {
    const { enableQQEModTakeProfit, qqeModTakeProfitThresholdLong } = config;
    if (!enableQQEModTakeProfit) return false;
    
    const { entryPrice, qqeModArr } = state;
    if (!entryPrice || !qqeModArr || qqeModArr.length < 3) return false;
    
    const [kLine3] = getLastFromArr(kLineData, 1);
    const { close } = kLine3;
    
    // 条件1: close > 开仓价
    if (close <= entryPrice) return false;
    
    // 获取最近三根K线的QQE MOD数据
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;
    
    // 条件2: 向下拐头：qqeModBar[2] < qqeModBar[1] > qqeModBar[0]
    const turnDown = qqeModBar2 < qqeModBar1 && qqeModBar1 > qqeModBar0;
    if (!turnDown) return false;
    
    // 条件3: 中间最大的qqemod > 阈值
    const maxQQEMod = Math.max(qqeModBar0, qqeModBar1, qqeModBar2);
    if (maxQQEMod <= qqeModTakeProfitThresholdLong) return false;
    
    return true;
}

/**
 * 判断QQE MOD拐头止盈（做空）
 * 条件：qqeMode向上拐头 && 中间最小的qqemod < -阈值 && close < 开仓价
 * 向上拐头：qqeModBar[2] > qqeModBar[1] < qqeModBar[0]
 * @param {Array} kLineData - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Boolean} 是否触发QQE MOD拐头止盈
 */
function judgeQQEModTakeProfitShort(kLineData, state, config) {
    const { enableQQEModTakeProfit, qqeModTakeProfitThresholdShort } = config;
    if (!enableQQEModTakeProfit) return false;
    
    const { entryPrice, qqeModArr } = state;
    if (!entryPrice || !qqeModArr || qqeModArr.length < 3) return false;
    
    const [kLine3] = getLastFromArr(kLineData, 1);
    const { close } = kLine3;
    
    // 条件1: close < 开仓价
    if (close >= entryPrice) return false;
    
    // 获取最近三根K线的QQE MOD数据
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;
    
    // 条件2: 向上拐头：qqeModBar[2] > qqeModBar[1] < qqeModBar[0]
    const turnUp = qqeModBar2 > qqeModBar1 && qqeModBar1 < qqeModBar0;
    if (!turnUp) return false;
    
    // 条件3: 中间最小的qqemod < -阈值
    const minQQEMod = Math.min(qqeModBar0, qqeModBar1, qqeModBar2);
    if (minQQEMod >= qqeModTakeProfitThresholdShort) return false;
    
    return true;
}

/**
 * 判断指标止盈（做多）
 * 源代码中直接访问全局变量 enableSupertrendTakeProfit, enableFibonacciTakeProfit, priceTolerance
 */
function judgeIndicatorTakeProfitLong(kLineData, superTrendArr, fibArr, state, config) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [fib3] = getLastFromArr(fibArr, 1);
    if (!kLine3 || !superTrend3) return false;

    const { close, high } = kLine3;
    let triggered = false;
    // 源代码中直接访问全局变量，这里通过 config 参数传递
    const { enableSupertrendTakeProfit, enableFibonacciTakeProfit, enableProfitPercentTakeProfit, profitPercentTakeProfit, priceTolerance } = config;

    // SuperTrend上轨止盈（带容差）
    if (!triggered && enableSupertrendTakeProfit) {
        const maxSuper = Math.max(superTrend3.up, superTrend3.dn);
        const maxSuperTolerance = calculateTolerancePrice(maxSuper, priceTolerance, 'long');
        if (close > maxSuperTolerance || high > maxSuperTolerance) {
            triggered = true;
        }
    }

    // Fibonacci上轨止盈（带容差）
    if (!triggered && enableFibonacciTakeProfit && fib3) {
        const upper7Tolerance = calculateTolerancePrice(fib3.upper_7, priceTolerance, 'long');
        if (close > upper7Tolerance || high > upper7Tolerance) {
            triggered = true;
        }
    }

    // QQE MOD拐头止盈
    if (!triggered && judgeQQEModTakeProfitLong(kLineData, state, config)) {
        triggered = true;
    }

    // 盈利百分比止盈
    if (!triggered && enableProfitPercentTakeProfit) {
        const { entryPrice } = state;
        if (entryPrice) {
            const takeProfitPrice = entryPrice * (1 + profitPercentTakeProfit);
            if (close >= takeProfitPrice || high >= takeProfitPrice) {
                triggered = true;
            }
        }
    }

    return triggered;
}

/**
 * 判断指标止盈（做空）
 * 源代码中直接访问全局变量 enableSupertrendTakeProfit, enableFibonacciTakeProfit, priceTolerance
 */
function judgeIndicatorTakeProfitShort(kLineData, superTrendArr, fibArr, state, config) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [fib3] = getLastFromArr(fibArr, 1);
    if (!kLine3 || !superTrend3) return false;

    const { close, low } = kLine3;
    let triggered = false;
    // 源代码中直接访问全局变量，这里通过 config 参数传递
    const { enableSupertrendTakeProfit, enableFibonacciTakeProfit, enableProfitPercentTakeProfit, profitPercentTakeProfit, priceTolerance } = config;

    // SuperTrend下轨止盈（带容差）
    if (!triggered && enableSupertrendTakeProfit) {
        const minSuper = Math.min(superTrend3.up, superTrend3.dn);
        const minSuperTolerance = calculateTolerancePrice(minSuper, priceTolerance, 'short');
        if (close < minSuperTolerance || low < minSuperTolerance) {
            triggered = true;
        }
    }

    // Fibonacci下轨止盈（带容差）
    if (!triggered && enableFibonacciTakeProfit && fib3) {
        const lower7Tolerance = calculateTolerancePrice(fib3.lower_7, priceTolerance, 'short');
        if (close < lower7Tolerance || low < lower7Tolerance) {
            triggered = true;
        }
    }

    // QQE MOD拐头止盈
    if (!triggered && judgeQQEModTakeProfitShort(kLineData, state, config)) {
        triggered = true;
    }

    // 盈利百分比止盈
    if (!triggered && enableProfitPercentTakeProfit) {
        const { entryPrice } = state;
        if (entryPrice) {
            const takeProfitPrice = entryPrice * (1 - profitPercentTakeProfit);
            if (close <= takeProfitPrice || low <= takeProfitPrice) {
                triggered = true;
            }
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
    return close < effectiveStopLoss// || low < effectiveStopLoss;
}

/**
 * 判断指标止损（做多）
 * 条件：当前低点低于前低 && QQE MOD向下拐头
 * @param {Array} kLineData - K线数据数组
 * @param {Array} preHighLowArr - 前高点/前低点数组
 * @param {Array} qqeModArr - QQE MOD指标数组
 * @returns {Boolean} 是否触发指标止损
 */
function judgeIndicatorStopLossLong(kLineData, preHighLowArr, qqeModArr) {
    if (!kLineData || kLineData.length < 2) return false;
    if (!preHighLowArr || preHighLowArr.length < 2) return false;
    if (!qqeModArr || qqeModArr.length < 3) return false;
    
    // 获取当前K线
    const [kLineCurrent] = getLastFromArr(kLineData, 1);
    if (!kLineCurrent || !preHighLowArr[preHighLowArr.length - 1]) return false;
    
    const currentLow = preHighLowArr[preHighLowArr.length - 1].preLow;
    if (!currentLow) return false;
    
    // 从后往前找第一个preLow不等于当前preLow的值作为前低
    let prevLow = null;
    for (let i = preHighLowArr.length - 2; i >= 0; i--) {
        const item = preHighLowArr[i];
        if (item && item.preLow !== null && item.preLow !== undefined && item.preLow !== currentLow) {
            prevLow = item.preLow;
            break;
        }
    }
    
    // 如果找不到前低，不触发止损
    if (prevLow === null) return false;
    
    // 获取最近三根K线的QQE MOD数据
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;
    
    // 向下拐头：qqeModBar[2] < qqeModBar[1] > qqeModBar[0] && qqeModBar[1] > 0
    const turnDown = qqeModBar2 < qqeModBar1 && qqeModBar1 > qqeModBar0 && qqeModBar1 > 0;
    // 当前低点低于前低 && QQE MOD向下拐头，触发止损
    return currentLow < prevLow && turnDown;
}

/**
 * 判断指标止损（做空）
 * 条件：当前高点高于前高 && QQE MOD向上拐头
 * @param {Array} kLineData - K线数据数组
 * @param {Array} preHighLowArr - 前高点/前低点数组
 * @param {Array} qqeModArr - QQE MOD指标数组
 * @returns {Boolean} 是否触发指标止损
 */
function judgeIndicatorStopLossShort(kLineData, preHighLowArr, qqeModArr) {
    if (!kLineData || kLineData.length < 2) return false;
    if (!preHighLowArr || preHighLowArr.length < 2) return false;
    if (!qqeModArr || qqeModArr.length < 3) return false;
    
    // 获取当前K线
    const [kLineCurrent] = getLastFromArr(kLineData, 1);
    if (!kLineCurrent || !preHighLowArr[preHighLowArr.length - 1]) return false;
    
    const currentHigh = preHighLowArr[preHighLowArr.length - 1].preHigh;
    if (!currentHigh) return false;
    
    // 从后往前找第一个preHigh不等于当前preHigh的值作为前高
    let prevHigh = null;
    for (let i = preHighLowArr.length - 2; i >= 0; i--) {
        const item = preHighLowArr[i];
        if (item && item.preHigh !== null && item.preHigh !== undefined && item.preHigh !== currentHigh) {
            prevHigh = item.preHigh;
            break;
        }
    }
    
    // 如果找不到前高，不触发止损
    if (prevHigh === null) return false;
    
    // 获取最近三根K线的QQE MOD数据
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;
    
    // 向上拐头：qqeModBar[2] > qqeModBar[1] < qqeModBar[0] && qqeModBar[1] < 0
    const turnUp = qqeModBar2 > qqeModBar1 && qqeModBar1 < qqeModBar0 && qqeModBar1 < 0;
    // 当前高点高于前高 && QQE MOD向上拐头，触发止损
    return currentHigh > prevHigh && turnUp;
}

/**
 * 判断止损（做空）
 */
function judgeStopLossShort(kLineData, effectiveStopLoss) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    if (!kLine3) return false;
    const { close, high } = kLine3;
    return close > effectiveStopLoss// || high > effectiveStopLoss;
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
 * @param {Function} closeUp - 平多函数（支持部分平仓，quantity参数可选）
 * @param {Function} closeDown - 平空函数（支持部分平仓，quantity参数可选）
 */
async function judgeProfitRunOrProfit(currentPrice, state, config, closeUp, closeDown) {
    if (!state.hasOrder) return;
    
    state.isJudgeProfitRunOrProfit = true;
    const { trend, orderPrice, quantity } = state.tradingInfo;
    const { kLineData, superTrendArr, fibArr, qqeModArr, preHighLowArr } = state;
    const { riskRewardRatio, indicatorTPCountThreshold, indicatorTPPartialCount, indicatorTPPartialRatio } = config;
    
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [preHighLow3] = getLastFromArr(preHighLowArr, 1);
    if (!kLine3 || !superTrend3) {
        state.isJudgeProfitRunOrProfit = false;
        return;
    }

    // 记录初始仓位大小（如果还没有记录，在持仓的第一根K线记录）- 与Pine Script保持一致
    // 注意：Pine Script使用 strategy.position_size（实时持仓），这里使用 state.tradingInfo.quantity（实时持仓）
    // 部分平仓后，quantity 会被更新，所以需要使用实时值
    if (trend === "up" && state.initialLongPositionSize === null) {
        state.initialLongPositionSize = state.tradingInfo.quantity;
    }
    if (trend === "down" && state.initialShortPositionSize === null) {
        state.initialShortPositionSize = state.tradingInfo.quantity;
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
                // state.longTrailStop = Math.max(currentStopLoss, preHighLow3?.preLow || currentStopLoss);
                state.longTrailStop = Math.max(currentStopLoss, state.squeezeBoxArr[state.squeezeBoxArr.length - 1].bl);
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
        const stopLossHit = judgeStopLossLong(kLineData, effectiveStopLoss);
        if (stopLossHit) {
            const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
            console.log(`@@@[做多止损] ${kLineDate}, currentPrice=${state.currentPrice}, effectiveStopLoss=${effectiveStopLoss}`);
            await closeUp();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 1.5. 指标止损判断 - 立即市价平仓
        const { enableIndicatorStopLoss } = config;
        if (enableIndicatorStopLoss) {
            const indicatorStopLossHit = judgeIndicatorStopLossLong(kLineData, preHighLowArr, qqeModArr);
            if (indicatorStopLossHit) {
                const [kLinePrev] = getLastFromArr(kLineData, 2);
                const [preHighLowPrev] = getLastFromArr(preHighLowArr, 2);
                const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
                console.log(`@@@[做多指标止损] ${kLineDate}, currentLow=${kLine3.low}, prevLow=${preHighLowPrev?.preLow || 'N/A'}`);
                await closeUp();
                state.isJudgeProfitRunOrProfit = false;
                return;
            }
        }

        // 2. 固定止盈判断 - 立即市价平仓
        const fixedTPHit = judgeFixedTakeProfitLong(kLineData, state, config);
        if (fixedTPHit) {
            const takeProfit = state.entryPrice + (state.entryPrice - state.initialLongStopLoss) * config.riskRewardRatio;
            const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
            console.log(`@@@[做多固定止盈] ${kLineDate}, currentPrice=${state.currentPrice}, takeProfit=${takeProfit}, entryPrice=${state.entryPrice}, initialStopLoss=${state.initialLongStopLoss}`);
            await closeUp();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 4. 指标止盈判断（带计数和冷却期）- 使用市价单
        // 与Pine Script保持一致：需要同时检查价格条件和持仓状态
        // Pine Script: bool longIndicatorTPTriggered = (longTakeProfit2 or longTakeProfit3) and strategy.position_size > 0
        const isInCooling = isInCoolingPeriod(state.lastLongIndicatorTPKLineCount, state);
        const indicatorTPTriggered = judgeIndicatorTakeProfitLong(kLineData, superTrendArr, fibArr, state, config) && 
                                     state.hasOrder && 
                                     state.tradingInfo.quantity > 0; // 确保还有持仓
        if (!isInCooling && indicatorTPTriggered) {
            state.longIndicatorTPCount++;
            state.lastLongIndicatorTPKLineCount = state.currentKLineCount;

            // 首次触发移动止损
            if (!state.longTrailActive) {
                updateTrailingStopLong(state, currentStopLoss, preHighLow3?.preLow);
            }

            // 首次指标止盈：部分平仓（市价单）
            // 注意：Pine Script中，部分平仓后如果条件继续满足，计数会继续增加
            const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
            if (state.longIndicatorTPCount === indicatorTPPartialCount && indicatorTPPartialRatio > 0) {
                // initialLongPositionSize 已在函数开始时记录（与Pine Script一致）
                // Pine Script使用 math.abs(initialLongPositionSize)，这里也使用绝对值保持一致
                const partialQty = Math.abs(state.initialLongPositionSize) * indicatorTPPartialRatio;
                console.log(`@@@[做多指标止盈-部分平仓] ${kLineDate}, count=${state.longIndicatorTPCount}, partialQty=${partialQty}, initialSize=${state.initialLongPositionSize}, remainingQty=${state.tradingInfo.quantity - partialQty}`);
                // 使用 closeUp 进行部分平仓，testMoney 和可视化日志会在 closeUp 中处理
                await closeUp(partialQty);
                // 部分平仓后不重置hasOrder，继续持有剩余仓位
                // 注意：部分平仓后，如果指标止盈条件继续满足（且不在冷却期），计数会继续增加
            }
            // 指标止盈计数大于等于阈值（且不是第一次），立即全部平仓 - 与Pine Script保持一致
            else if (state.longIndicatorTPCount >= indicatorTPCountThreshold) {
                console.log(`@@@[做多指标止盈-全部平仓] ${kLineDate}, count=${state.longIndicatorTPCount}, threshold=${indicatorTPCountThreshold}`);
                await closeUp();
                state.isJudgeProfitRunOrProfit = false;
                return;
            } else {
                // 计数增加但未达到阈值（可能是count=1但indicatorTPPartialRatio=0，或者count=2但threshold>2）
                console.log(`@@@[做多指标止盈-计数增加但未达到阈值] ${kLineDate}, count=${state.longIndicatorTPCount}, threshold=${indicatorTPCountThreshold}, partialRatio=${indicatorTPPartialRatio}`);
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
                // state.shortTrailStop = Math.min(currentStopLoss, preHighLow3?.preHigh || currentStopLoss);
                state.shortTrailStop = Math.min(currentStopLoss, state.squeezeBoxArr[state.squeezeBoxArr.length - 1].bh);
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
        const stopLossHit = judgeStopLossShort(kLineData, effectiveStopLoss);
        if (stopLossHit) {
            const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
            console.log(`@@@[做空止损] ${kLineDate}, currentPrice=${state.currentPrice}, effectiveStopLoss=${effectiveStopLoss}`);
            await closeDown();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 1.5. 指标止损判断 - 立即市价平仓
        const { enableIndicatorStopLoss } = config;
        if (enableIndicatorStopLoss) {
            const indicatorStopLossHit = judgeIndicatorStopLossShort(kLineData, preHighLowArr, qqeModArr);
            if (indicatorStopLossHit) {
                const [kLinePrev] = getLastFromArr(kLineData, 2);
                const [preHighLowPrev] = getLastFromArr(preHighLowArr, 2);
                const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
                console.log(`@@@[做空指标止损] ${kLineDate}, currentHigh=${kLine3.high}, prevHigh=${preHighLowPrev?.preHigh || 'N/A'}`);
                await closeDown();
                state.isJudgeProfitRunOrProfit = false;
                return;
            }
        }

        // 2. 固定止盈判断 - 立即市价平仓
        const fixedTPHit = judgeFixedTakeProfitShort(kLineData, state, config);
        if (fixedTPHit) {
            const takeProfit = state.entryPrice - (state.initialShortStopLoss - state.entryPrice) * config.riskRewardRatio;
            const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
            console.log(`@@@[做空固定止盈] ${kLineDate}, currentPrice=${state.currentPrice}, takeProfit=${takeProfit}, entryPrice=${state.entryPrice}, initialStopLoss=${state.initialShortStopLoss}`);
            await closeDown();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 4. 指标止盈判断（带计数和冷却期）- 使用市价单
        // 与Pine Script保持一致：需要同时检查价格条件和持仓状态
        // Pine Script: bool shortIndicatorTPTriggered = (shortTakeProfit2 or shortTakeProfit3) and strategy.position_size < 0
        const isInCooling = isInCoolingPeriod(state.lastShortIndicatorTPKLineCount, state);
        const indicatorTPTriggered = judgeIndicatorTakeProfitShort(kLineData, superTrendArr, fibArr, state, config) && 
                                     state.hasOrder && 
                                     state.tradingInfo.quantity > 0; // 确保还有持仓
        if (!isInCooling && indicatorTPTriggered) {
            state.shortIndicatorTPCount++;
            state.lastShortIndicatorTPKLineCount = state.currentKLineCount;

            // 首次触发移动止损
            if (!state.shortTrailActive) {
                updateTrailingStopShort(state, currentStopLoss, preHighLow3?.preHigh);
            }

            // 首次指标止盈：部分平仓（市价单）
            // 注意：Pine Script中，部分平仓后如果条件继续满足，计数会继续增加
            const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
            if (state.shortIndicatorTPCount === indicatorTPPartialCount && indicatorTPPartialRatio > 0) {
                // initialShortPositionSize 已在函数开始时记录（与Pine Script一致）
                const partialQty = state.initialShortPositionSize * indicatorTPPartialRatio;
                console.log(`@@@${kLineDate}[做空指标止盈-部分平仓] , count=${state.shortIndicatorTPCount}, partialQty=${partialQty}, initialSize=${state.initialShortPositionSize}, remainingQty=${state.tradingInfo.quantity - partialQty}`);
                // 使用 closeDown 进行部分平仓，testMoney 和可视化日志会在 closeDown 中处理
                await closeDown(partialQty);
                // 部分平仓后不重置hasOrder，继续持有剩余仓位
                // 注意：部分平仓后，如果指标止盈条件继续满足（且不在冷却期），计数会继续增加
            }
            // 指标止盈计数大于等于阈值（且不是第一次），立即全部平仓 - 与Pine Script保持一致
            else if (state.shortIndicatorTPCount >= indicatorTPCountThreshold) {
                console.log(`@@@ ${kLineDate}[做空指标止盈-全部平仓], count=${state.shortIndicatorTPCount}, threshold=${indicatorTPCountThreshold}`);
                await closeDown();
                state.isJudgeProfitRunOrProfit = false;
                return;
            } else {
                // 计数增加但未达到阈值（可能是count=1但indicatorTPPartialRatio=0，或者count=2但threshold>2）
                console.log(`@@@[做空指标止盈-计数增加但未达到阈值] ${kLineDate}, count=${state.shortIndicatorTPCount}, threshold=${indicatorTPCountThreshold}, partialRatio=${indicatorTPPartialRatio}`);
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
 * @param {Function} closeUp - 平多函数（支持部分平仓，quantity参数可选）
 * @param {Function} closeDown - 平空函数（支持部分平仓，quantity参数可选）
 */
async function gridPointClearTrading(currentPrice, state, config, closeUp, closeDown) {
    if (!state.hasOrder) return;

    state.onGridPoint = true;

    // 止盈 | 移动止盈
    await judgeProfitRunOrProfit(currentPrice, state, config, closeUp, closeDown);

    // 首次亏损保护
    // await judgeFirstLossProtect(currentPrice);

    state.onGridPoint = false;
}

module.exports = {
    judgeStopLoss,
    judgeProfitRunOrProfit,
    gridPointClearTrading,
};
