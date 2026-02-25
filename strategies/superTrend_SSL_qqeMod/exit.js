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
    const { kLineData } = state;
    
    // 获取最新K线数据
    const [kLine3] = getLastFromArr(kLineData, 1);
    if (!kLine3) {
        state.isJudgeStopLoss = false;
        return;
    }
    
    const { close, low, high } = kLine3;

    // 使用下单时保存的初始止损位
    // 做多：使用 close <= initialLongStopLoss 或者 low <= initialLongStopLoss
    if (trend === "up") {
        const initialStopLoss = state.initialLongStopLoss;
        if (initialStopLoss !== null && initialStopLoss !== undefined) {
            if (close <= initialStopLoss || low <= initialStopLoss) {
                await closeUp();
                state.isJudgeStopLoss = false;
                return;
            }
        }
    }

    // 做空：使用 close >= initialShortStopLoss 或者 high >= initialShortStopLoss
    if (trend === "down") {
        const initialStopLoss = state.initialShortStopLoss;
        if (initialStopLoss !== null && initialStopLoss !== undefined) {
            if (close >= initialStopLoss || high >= initialStopLoss) {
                await closeDown();
                state.isJudgeStopLoss = false;
                return;
            }
        }
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
    
    // 条件3: 中间最大的qqemod > 阈值（检查中间值 qqeModBar1）
    if (qqeModBar1 < qqeModTakeProfitThresholdLong) return false;
    
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
    
    // 条件3: 中间最小的qqemod < -阈值（检查中间值 qqeModBar1）
    if (qqeModBar1 > qqeModTakeProfitThresholdShort) return false;
    
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
        if (kLineData[kLineData.length - 1].openTime === '2025-10-07_20-55-00') {
            console.log("@@@ ~ judgeIndicatorTakeProfitLong ~ fib3:", {close, upper7Tolerance, high} )
        }
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
 * 判断止损（做空）
 */
function judgeStopLossShort(kLineData, effectiveStopLoss) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    if (!kLine3) return false;
    const { close, high } = kLine3;
    return close > effectiveStopLoss// || high > effectiveStopLoss;
}

/**
 * 判断止盈止损（在止盈函数中调用）
 * 包括：普通止损、移动止损、指标止损
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @param {Function} closeUp - 平多函数
 * @param {Function} closeDown - 平空函数
 * @returns {Promise<Boolean>} 返回 true 表示已触发止损并平仓，false 表示未触发止损
 */
async function judgeStopLossInProfitRun(state, config, closeUp, closeDown) {
    if (!state.hasOrder) return false;
    
    const { trend } = state.tradingInfo;
    const { kLineData, superTrendArr, qqeModArr, preHighLowArr, squeezeBoxArr } = state;
    
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    if (!kLine3 || !superTrend3) return false;

    const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';

    if (trend === "up") {
        // 计算当前止损位
        const currentStopLoss = Math.min(superTrend3.up, superTrend3.dn);
        
        // 更新移动止损
        const effectiveStopLoss = updateTrailingStopLoss({
            trend,
            state,
            config,
            currentStopLoss,
            qqeModArr,
            squeezeBoxArr,
        });

        // 1. 止损判断 - 立即市价平仓
        const stopLossHit = judgeStopLossLong(kLineData, effectiveStopLoss);
        if (stopLossHit) {
            console.log(`@@@[做多止损] ${kLineDate}, currentPrice=${state.currentPrice}, effectiveStopLoss=${effectiveStopLoss}`);
            await closeUp();
            return true;
        }

        // 1.5. 指标止损判断 - 立即市价平仓
        const { enableIndicatorStopLoss } = config;
        if (enableIndicatorStopLoss) {
            const indicatorStopLossHit = judgeIndicatorStopLossLong(kLineData, qqeModArr, state, config);
            if (indicatorStopLossHit) {
                console.log(`@@@[做多指标止损] ${kLineDate}, isHighRisk=${state.isHighRisk}, currentKLineCount=${state.currentKLineCount}`);
                await closeUp();
                return true;
            }
        }
    }

    if (trend === "down") {
        // 计算当前止损位
        const currentStopLoss = Math.max(superTrend3.up, superTrend3.dn);
        
        // 更新移动止损
        const effectiveStopLoss = updateTrailingStopLoss({
            trend,
            state,
            config,
            currentStopLoss,
            qqeModArr,
            squeezeBoxArr,
        });

        // 1. 止损判断 - 立即市价平仓
        const stopLossHit = judgeStopLossShort(kLineData, effectiveStopLoss);
        if (stopLossHit) {
            console.log(`@@@[做空止损] ${kLineDate}, currentPrice=${state.currentPrice}, effectiveStopLoss=${effectiveStopLoss}`);
            await closeDown();
            return true;
        }

        // 1.5. 指标止损判断 - 立即市价平仓
        const { enableIndicatorStopLoss } = config;
        if (enableIndicatorStopLoss) {
            const indicatorStopLossHit = judgeIndicatorStopLossShort(kLineData, qqeModArr, state, config);
            if (indicatorStopLossHit) {
                console.log(`@@@[做空指标止损] ${kLineDate}, isHighRisk=${state.isHighRisk}, currentKLineCount=${state.currentKLineCount}`);
                await closeDown();
                return true;
            }
        }
    }

    return false; // 未触发止损
}

/**
 * 检查高风险条件（做多）
 * 在开仓后第N根K线时检测一次，从开仓到第N根K线，计算区间内收盘价小于开盘价的K线比例
 * @param {Array} kLineData - K线数据数组
 * @param {Number} entryKLineCount - 开仓时的K线计数
 * @param {Number} currentKLineCount - 当前K线计数
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Boolean} 是否标记为高风险
 */
function checkHighRiskLong(kLineData, entryKLineCount, currentKLineCount, state, config) {
    if (!entryKLineCount || entryKLineCount === null) return false;
    if (!kLineData || kLineData.length === 0) return false;
    
    const { indicatorStopLossCheckPeriod = 50, indicatorStopLossRiskRatio = 0.8 } = config;
    
    // 计算检测点：开仓后第N根K线
    const checkKLineCount = entryKLineCount + indicatorStopLossCheckPeriod;
    
    // 如果当前K线计数还没到检测点，返回false
    if (currentKLineCount < checkKLineCount) return false;
    
    // 如果已经标记为高风险，不再重复检测
    if (state.isHighRisk) return true;
    
    // 只在第N根K线时检测一次
    if (currentKLineCount !== checkKLineCount) return false;
    
    // 计算从开仓到第N根K线的区间内收盘价小于开盘价的K线数量
    let bearishCount = 0;
    let totalCount = 0;
    
    // 从数组末尾往前找，找到开仓后的K线
    const entryArrayIndex = kLineData.length - 1 - (currentKLineCount - entryKLineCount);
    // 从开仓后第一根K线开始（entryArrayIndex + 1）到第N根K线（当前K线）
    const startArrayIndex = entryArrayIndex + 1; // 开仓后第一根K线
    const endArrayIndex = kLineData.length - 1; // 当前K线（第N根）
    
    for (let i = startArrayIndex; i <= endArrayIndex && i < kLineData.length; i++) {
        const kLine = kLineData[i];
        if (kLine && kLine.close !== undefined && kLine.open !== undefined) {
            totalCount++;
            if (kLine.close < kLine.open) {
                bearishCount++;
            }
        }
    }
    
    // 如果区间内80%的K线收盘价小于开盘价，标记为高风险
    if (totalCount > 0) {
        const bearishRatio = bearishCount / totalCount;
        return bearishRatio >= indicatorStopLossRiskRatio;
    }
    
    return false;
}

/**
 * 检查高风险条件（做空）
 * 在开仓后第N根K线时检测一次，从开仓到第N根K线，计算区间内收盘价大于开盘价的K线比例
 * @param {Array} kLineData - K线数据数组
 * @param {Number} entryKLineCount - 开仓时的K线计数
 * @param {Number} currentKLineCount - 当前K线计数
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Boolean} 是否标记为高风险
 */
function checkHighRiskShort(kLineData, entryKLineCount, currentKLineCount, state, config) {
    if (!entryKLineCount || entryKLineCount === null) return false;
    if (!kLineData || kLineData.length === 0) return false;
    
    const { indicatorStopLossCheckPeriod = 50, indicatorStopLossRiskRatio = 0.8 } = config;
    
    // 计算检测点：开仓后第N根K线
    const checkKLineCount = entryKLineCount + indicatorStopLossCheckPeriod;
    
    // 如果当前K线计数还没到检测点，返回false
    if (currentKLineCount < checkKLineCount) return false;
    
    // 如果已经标记为高风险，不再重复检测
    if (state.isHighRisk) return true;
    
    // 只在第N根K线时检测一次
    if (currentKLineCount !== checkKLineCount) return false;
    
    // 计算从开仓到第N根K线的区间内收盘价大于开盘价的K线数量
    let bullishCount = 0;
    let totalCount = 0;
    
    // 从数组末尾往前找，找到开仓后的K线
    const entryArrayIndex = kLineData.length - 1 - (currentKLineCount - entryKLineCount);
    // 从开仓后第一根K线开始（entryArrayIndex + 1）到第N根K线（当前K线）
    const startArrayIndex = entryArrayIndex + 1; // 开仓后第一根K线
    const endArrayIndex = kLineData.length - 1; // 当前K线（第N根）
    
    for (let i = startArrayIndex; i <= endArrayIndex && i < kLineData.length; i++) {
        const kLine = kLineData[i];
        if (kLine && kLine.close !== undefined && kLine.open !== undefined) {
            totalCount++;
            if (kLine.close > kLine.open) {
                bullishCount++;
            }
        }
    }
    
    // 如果区间内80%的K线收盘价大于开盘价，标记为高风险
    if (totalCount > 0) {
        const bullishRatio = bullishCount / totalCount;
        return bullishRatio >= indicatorStopLossRiskRatio;
    }
    
    return false;
}

/**
 * 判断指标止损（做多）
 * 条件：高风险标记 && QQE MOD > 阈值
 * @param {Array} kLineData - K线数据数组
 * @param {Array} qqeModArr - QQE MOD指标数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Boolean} 是否触发指标止损
 */
function judgeIndicatorStopLossLong(kLineData, qqeModArr, state, config) {
    if (!kLineData || kLineData.length < 1) return false;
    if (!qqeModArr || qqeModArr.length < 1) return false;
    if (!state || !config) return false;
    
    // 如果已经标记为高风险，跳过检测
    if (!state.isHighRisk) {
        // 检查高风险条件
        const isHighRisk = checkHighRiskLong(kLineData, state.entryKLineCount, state.currentKLineCount, state, config);
        if (!isHighRisk) return false;
        // 更新高风险标记
        state.isHighRisk = true;
    }
    
    // 获取当前K线的QQE MOD数据
    const [qqeMod0] = getLastFromArr(qqeModArr, 1);
    if (!qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    
    // 高风险 && QQE MOD > 阈值
    const { indicatorStopLossQQEModThresholdLong = 10 } = config;
    return qqeModBar0 > indicatorStopLossQQEModThresholdLong;
}

/**
 * 判断指标止损（做空）
 * 条件：高风险标记 && QQE MOD < 阈值
 * @param {Array} kLineData - K线数据数组
 * @param {Array} qqeModArr - QQE MOD指标数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Boolean} 是否触发指标止损
 */
function judgeIndicatorStopLossShort(kLineData, qqeModArr, state, config) {
    if (!kLineData || kLineData.length < 1) return false;
    if (!qqeModArr || qqeModArr.length < 1) return false;
    if (!state || !config) return false;
    
    // 如果已经标记为高风险，跳过检测
    if (!state.isHighRisk) {
        // 检查高风险条件
        const isHighRisk = checkHighRiskShort(kLineData, state.entryKLineCount, state.currentKLineCount, state, config);
        if (!isHighRisk) return false;
        // 更新高风险标记
        state.isHighRisk = true;
    }
    
    // 获取当前K线的QQE MOD数据
    const [qqeMod0] = getLastFromArr(qqeModArr, 1);
    if (!qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    
    // 高风险 && QQE MOD < 阈值
    const { indicatorStopLossQQEModThresholdShort = -10 } = config;
    return qqeModBar0 < indicatorStopLossQQEModThresholdShort;
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
 * 更新移动止损
 * @param {Object} state - 策略状态对象
 * @param {Number} currentStopLoss - 当前止损价格
 * @param {Number} referencePrice - 参考价格（做多为preLow，做空为preHigh）
 * @param {String} direction - 方向 'long' 或 'short'
 */
function updateTrailingStop(state, currentStopLoss, referencePrice, direction) {
    if (!state.trailActive) {
        state.trailActive = true;
        if (direction === 'long') {
            state.trailStop = Math.max(currentStopLoss, referencePrice || currentStopLoss);
        } else {
            state.trailStop = Math.min(currentStopLoss, referencePrice || currentStopLoss);
        }
    }
    return state.trailStop;
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
 * 更新移动止损
 * @param {Object} params - 参数对象
 * @param {String} params.trend - 交易方向 'up' 或 'down'
 * @param {Object} params.state - 策略状态对象
 * @param {Object} params.config - 配置对象
 * @param {Number} params.currentStopLoss - 当前止损价格（superTrend止损）
 * @param {Array} params.qqeModArr - QQE MOD指标数组
 * @param {Array} params.squeezeBoxArr - Squeeze Box指标数组
 * @returns {Number} 有效止损价格
 */
function updateTrailingStopLoss(params) {
    const { trend, state, config, currentStopLoss, qqeModArr, squeezeBoxArr } = params;
    const { enableTrailingStop, qqeTrailingThresholdLong, qqeTrailingThresholdShort, indicatorTPFirstCloseCount } = config;
    
    // 检查是否启用移动止损
    if (!enableTrailingStop || state.entryPrice === null) {
        return currentStopLoss;
    }
    
    // 检查是否已经触发过第一次指标止盈（移动止损和保本止损都应该在第一次指标止盈后才运行）
    if (state.indicatorTPCount < indicatorTPFirstCloseCount) {
        // 如果已经有移动止损，继续使用
        if (state.trailActive && state.trailStop !== null) {
            return state.trailStop;
        }
        return currentStopLoss;
    }
    
    const isLong = trend === 'up';
    
    // 获取QQE MOD值
    const [qqeMod3] = getLastFromArr(qqeModArr, 1);
    if (!qqeMod3 || !qqeMod3.current) {
        // 如果没有QQE MOD数据，使用当前止损或已有移动止损
        if (state.trailActive && state.trailStop !== null) {
            return state.trailStop;
        }
        return currentStopLoss;
    }
    
    const qqeModBar = qqeMod3.current.qqeModBar;
    
    // 检查触发条件
    let trigger = false;
    if (isLong) {
        // 多单：QQE柱子值 > 阈值时触发
        trigger = qqeModBar > qqeTrailingThresholdLong;
    } else {
        // 空单：QQE柱子值 < 阈值时触发
        trigger = qqeModBar < qqeTrailingThresholdShort;
    }
    
    if (trigger) {
        // 计算移动止损价格
        let trailingStopPrice;
        if (isLong) {
            // 多单：max(squeeze_box下轨, superTrend下轨)
            const squeezeBoxLower = squeezeBoxArr[squeezeBoxArr.length - 1]?.bl;
            const superTrendLower = currentStopLoss; // superTrend下轨就是currentStopLoss
            trailingStopPrice = Math.max(squeezeBoxLower || currentStopLoss, superTrendLower);
        } else {
            // 空单：min(squeeze_box上轨, superTrend上轨)
            const squeezeBoxUpper = squeezeBoxArr[squeezeBoxArr.length - 1]?.bh;
            const superTrendUpper = currentStopLoss; // superTrend上轨就是currentStopLoss
            trailingStopPrice = Math.min(squeezeBoxUpper || currentStopLoss, superTrendUpper);
        }
        
        // 如果已经有移动止损或保本止损，取更有利的那个
        if (state.trailActive && state.trailStop !== null) {
            if (isLong) {
                // 多单：取较大值（更有利）
                state.trailStop = Math.max(state.trailStop, trailingStopPrice);
            } else {
                // 空单：取较小值（更有利）
                state.trailStop = Math.min(state.trailStop, trailingStopPrice);
            }
        } else {
            state.trailActive = true;
            state.trailStop = trailingStopPrice;
        }
        return state.trailStop;
    }
    
    // 已经启动后，使用移动后的止损价
    if (state.trailActive && state.trailStop !== null) {
        return state.trailStop;
    }
    
    return currentStopLoss;
}

/**
 * 判断是否在冷却期内
 * 源代码中直接访问全局变量 currentKLineCount
 * @param {Number} lastBarCount - 上次触发指标止盈的K线计数
 * @param {Object} state - 策略状态对象（用于访问 currentKLineCount）
 * @param {Object} config - 配置对象（用于获取冷静期配置）
 */
function isInCoolingPeriod(lastBarCount, state, config) {
    if (lastBarCount === null) return false;
    const { indicatorTPCoolingPeriod = 5 } = config || {};
    // 源代码中使用全局变量 currentKLineCount，这里通过 state 访问
    return (state.currentKLineCount - lastBarCount) < indicatorTPCoolingPeriod;
}

/**
 * 设置保本止损
 * @param {Object} params - 参数对象
 * @param {String} params.trend - 交易方向 'up' 或 'down'
 * @param {Object} params.state - 策略状态对象
 * @param {Object} params.config - 配置对象
 * @param {Number} params.currentStopLoss - 当前止损价格
 * @returns {Boolean} 是否成功设置保本止损
 */
function setBreakEvenStopLoss(params) {
    const { trend, state, config, currentStopLoss } = params;
    const { enableBreakEvenStopLoss, breakEvenStopLossRatio, indicatorTPFirstCloseCount } = config;
    
    // 检查是否启用保本止损
    if (!enableBreakEvenStopLoss) return false;
    
    // 检查是否有开仓价格
    if (!state.entryPrice) return false;
    
    // 检查是否已经触发过第一次指标止盈（保本止损应该在第一次指标止盈后才运行）
    if (state.indicatorTPCount !== indicatorTPFirstCloseCount) {
        return false;
    }
    
    const isLong = trend === 'up';
    
    // 计算保本止损价格
    // 多单保本：开仓价 * (1 + ratio)
    // 空单保本：开仓价 * (1 - ratio)
    const breakEvenPrice = isLong 
        ? state.entryPrice * (1 + breakEvenStopLossRatio)
        : state.entryPrice * (1 - breakEvenStopLossRatio);
    
    // 保本止损应该比当前止损更有利（多单时更高，空单时更低）
    // 如果保本止损不如当前止损有利，则不设置
    let shouldSetBreakEven = false;
    if (isLong) {
        // 做多：保本止损应该 >= 当前止损（更有利）
        shouldSetBreakEven = breakEvenPrice >= currentStopLoss;
    } else {
        // 做空：保本止损应该 <= 当前止损（更有利）
        shouldSetBreakEven = breakEvenPrice <= currentStopLoss;
    }
    
    if (shouldSetBreakEven) {
        // 如果已经有移动止损，取更有利的那个（多单时取较大值，空单时取较小值）
        if (state.trailActive && state.trailStop !== null) {
            if (isLong) {
                // 做多：取较大值（更有利）
                state.trailStop = Math.max(state.trailStop, breakEvenPrice);
            } else {
                // 做空：取较小值（更有利）
                state.trailStop = Math.min(state.trailStop, breakEvenPrice);
            }
        } else {
            // 如果没有移动止损，直接设置保本止损
            state.trailActive = true;
            state.trailStop = breakEvenPrice;
        }
        
        const trendText = isLong ? '做多' : '做空';
        console.log(`@@@[${trendText}保本止损] entryPrice=${state.entryPrice}, breakEvenPrice=${breakEvenPrice.toFixed(4)}, currentStopLoss=${currentStopLoss.toFixed(4)}, finalTrailStop=${state.trailStop.toFixed(4)}`);
        return true;
    }
    
    return false;
}

/**
 * 处理指标止盈分批平仓逻辑（模块化）
 * @param {Object} params - 参数对象
 * @param {String} params.trend - 交易方向 'up' 或 'down'
 * @param {Object} params.state - 策略状态对象
 * @param {Object} params.config - 配置对象
 * @param {Number} params.currentStopLoss - 当前止损价格
 * @param {Object} params.preHighLow3 - 前高/前低数据
 * @param {String} params.kLineDate - K线日期字符串
 * @param {Function} params.closePosition - 平仓函数（closeUp 或 closeDown）
 * @returns {Promise<Boolean>} 返回 true 表示已全部平仓，false 表示部分平仓或未平仓
 */
async function handleIndicatorTakeProfitPartialClose(params) {
    const { trend, state, config, currentStopLoss, preHighLow3, kLineDate, closePosition } = params;
    const {
        indicatorTPFirstCloseCount,
        indicatorTPSecondCloseCount,
        indicatorTPFinalCloseCount,
        indicatorTPFirstCloseRatio,
        indicatorTPSecondCloseRatio,
    } = config;

    const isLong = trend === 'up';
    const tpCount = state.indicatorTPCount;
    const initialPositionSize = state.initialPositionSize;
    const currentQuantity = state.tradingInfo.quantity;
    
    // 获取当前K线的收盘价
    const kLineData = state.kLineData || [];
    const [kLine3] = getLastFromArr(kLineData, 1);
    const close = kLine3?.close || state.currentPrice;

    // 首次触发移动止损
    if (!state.trailActive) {
        const referencePrice = isLong ? preHighLow3?.preLow : preHighLow3?.preHigh;
        updateTrailingStop(state, currentStopLoss, referencePrice, isLong ? 'long' : 'short');
    }

    // 计算平仓数量
    const absInitialSize = Math.abs(initialPositionSize);
    let closeQuantity = null;
    let action = '';

    if (tpCount === indicatorTPFirstCloseCount) {
        // 第一次平仓：如果是反转入场，则平仓初始仓位的100%，否则按比例部分平仓
        closeQuantity = absInitialSize * (state.isReversalEntry ? 1 : indicatorTPFirstCloseRatio);
        action = '第一次平仓';
        
    } else if (tpCount === indicatorTPSecondCloseCount) {
        // 第二次平仓：按比例部分平仓
        closeQuantity = absInitialSize * indicatorTPSecondCloseRatio;
        action = '第二次平仓';
    } else if (tpCount >= indicatorTPFinalCloseCount) {
        // 最终平仓：平仓剩余所有仓位
        closeQuantity = null; // null 表示全部平仓
        action = '最终平仓';
    }
    // 执行平仓
    // closeQuantity 可能等于 0 的
    if ((closeQuantity !== null && closeQuantity > 0) || action === '最终平仓') {
        const trendText = isLong ? '做多' : '做空';
        const remainingQty = closeQuantity !== null ? currentQuantity - closeQuantity : 0;
        
        console.log(`@@@[${trendText}指标止盈-${action}] , count=${tpCount}, ` +
            `${closeQuantity !== null ? `partialQty=${closeQuantity}, ` : ''}` +
            `initialSize=${initialPositionSize}, remainingQty=${remainingQty}`);

        if (action === '第一次平仓' && (isLong ? close < state.tradingInfo.orderPrice : close > state.tradingInfo.orderPrice)) {
            await closePosition(); // 全部平仓
            return true;
        } else if (closeQuantity !== null) {
            await closePosition(closeQuantity);
            return false; // 部分平仓，继续持有
        } else {
            await closePosition(); // 全部平仓
            return true; // 已全部平仓
        }
    }

    // 第一次平仓后，设置保本止损
    setBreakEvenStopLoss({
        trend,
        state,
        config,
        currentStopLoss,
    });
    return false; // 未达到平仓条件
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
    const { riskRewardRatio } = config;
    
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
    if (state.initialPositionSize === null) {
        state.initialPositionSize = state.tradingInfo.quantity;
    }

    if (trend === "up") {
        // 2. 固定止盈判断 - 立即市价平仓
        const fixedTPHit = judgeFixedTakeProfitLong(kLineData, state, config);
        if (fixedTPHit) {
            const takeProfit = state.entryPrice + (state.entryPrice - state.initialLongStopLoss) * config.riskRewardRatio;
            const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
            console.log(`@@@[做多固定止盈], currentPrice=${state.currentPrice}, takeProfit=${takeProfit}, entryPrice=${state.entryPrice}, initialStopLoss=${state.initialLongStopLoss}`);
            await closeUp();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 4. 指标止盈判断（带计数和冷却期）- 使用市价单
        // 与Pine Script保持一致：需要同时检查价格条件和持仓状态
        // Pine Script: bool longIndicatorTPTriggered = (longTakeProfit2 or longTakeProfit3) and strategy.position_size > 0
        const isInCooling = isInCoolingPeriod(state.lastIndicatorTPKLineCount, state, config);
        const indicatorTPTriggered = judgeIndicatorTakeProfitLong(kLineData, superTrendArr, fibArr, state, config) && state.hasOrder && state.tradingInfo.quantity > 0; // 确保还有持仓
        if (!isInCooling && indicatorTPTriggered) {
            state.indicatorTPCount++;
            state.lastIndicatorTPKLineCount = state.currentKLineCount;

            const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
            // 计算当前止损位（用于指标止盈时的移动止损）
            const currentStopLoss = Math.min(superTrend3.up, superTrend3.dn);
            
            const allClosed = await handleIndicatorTakeProfitPartialClose({
                trend: 'up',
                state,
                config,
                currentStopLoss,
                preHighLow3,
                kLineDate,
                closePosition: closeUp,
            });

            if (allClosed) {
                state.isJudgeProfitRunOrProfit = false;
                return;
            }
        }
    }

    if (trend === "down") {
        // 2. 固定止盈判断 - 立即市价平仓
        const fixedTPHit = judgeFixedTakeProfitShort(kLineData, state, config);
        if (fixedTPHit) {
            const takeProfit = state.entryPrice - (state.initialShortStopLoss - state.entryPrice) * config.riskRewardRatio;
            const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
            console.log(`@@@[做空固定止盈], currentPrice=${state.currentPrice}, takeProfit=${takeProfit}, entryPrice=${state.entryPrice}, initialStopLoss=${state.initialShortStopLoss}`);
            await closeDown();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }

        // 4. 指标止盈判断（带计数和冷却期）- 使用市价单
        // 与Pine Script保持一致：需要同时检查价格条件和持仓状态
        // Pine Script: bool shortIndicatorTPTriggered = (shortTakeProfit2 or shortTakeProfit3) and strategy.position_size < 0
        const isInCooling = isInCoolingPeriod(state.lastIndicatorTPKLineCount, state, config);
        const indicatorTPTriggered = judgeIndicatorTakeProfitShort(kLineData, superTrendArr, fibArr, state, config) && state.hasOrder && state.tradingInfo.quantity > 0; // 确保还有持仓
        if (!isInCooling && indicatorTPTriggered) {
            state.indicatorTPCount++;
            state.lastIndicatorTPKLineCount = state.currentKLineCount;

            const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';
            // 计算当前止损位（用于指标止盈时的移动止损）
            const currentStopLoss = Math.max(superTrend3.up, superTrend3.dn);
            
            const allClosed = await handleIndicatorTakeProfitPartialClose({
                trend: 'down',
                state,
                config,
                currentStopLoss,
                preHighLow3,
                kLineDate,
                closePosition: closeDown,
            });

            if (allClosed) {
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
 * @param {Function} closeUp - 平多函数（支持部分平仓，quantity参数可选）
 * @param {Function} closeDown - 平空函数（支持部分平仓，quantity参数可选）
 */
async function gridPointClearTrading(currentPrice, state, config, closeUp, closeDown) {
    if (!state.hasOrder) return;

    state.onGridPoint = true;

    // 判断固定止损（是否达到初始止损）
    await judgeStopLoss(currentPrice, state, config, closeUp, closeDown);
    
    // 指标止损 | 移动止损
    await judgeStopLossInProfitRun(state, config, closeUp, closeDown);

    // 止盈 | 移动止盈
    await judgeProfitRunOrProfit(currentPrice, state, config, closeUp, closeDown);

    // 首次亏损保护
    // await judgeFirstLossProtect(currentPrice);

    state.onGridPoint = false;
}

module.exports = {
    judgeStopLoss,
    // @exit.js (771-772) 这个函数没有在@strategies/superTrend_SSL_qqeMod/index.js 中调用，需要高频判断的啊
    // 适应极端行情close和实际止损相差很大的情况
    judgeProfitRunOrProfit,
    gridPointClearTrading,
};
