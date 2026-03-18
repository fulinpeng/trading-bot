/**
 * 止盈止损逻辑模块
 * 负责判断止损、止盈和波动率自适应止损
 */

const { getLastFromArr } = require("../../utils/functions.js");
const { calculateATR } = require("../../utils/atr.js");
const { calculateSmaArr } = require("../../utils/ma.js");

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
            if (close <= initialStopLoss) { //  || low <= initialStopLoss
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
            if (close >= initialStopLoss) { //  || high >= initialStopLoss
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
 * 判断QQE MOD止盈（做多）
 * 条件：qqeMode向上 && 最大的qqemod > 阈值 && close > 开仓价
 * 向上：qqeModBar[2] < qqeModBar[1] < qqeModBar[0]
 * @param {Array} kLineData - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Boolean} 是否触发QQE MOD止盈
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
    
    // 条件2: 向上：qqeModBar[2] < qqeModBar[1] < qqeModBar[0]
    const turnDown = qqeModBar2 < qqeModBar1 && qqeModBar1 < qqeModBar0;
    if (!turnDown) return false;
    
    // 条件3: 最大的qqemod > 阈值（检查最大值 qqeModBar0）
    if (qqeModBar0 < qqeModTakeProfitThresholdLong) return false;
    
    return true;
}

/**
 * 判断QQE MOD止盈（做空）
 * 条件：qqeMode向下 && 最小的qqemod < -阈值 && close < 开仓价
 * 向下：qqeModBar[2] > qqeModBar[1] > qqeModBar[0]
 * @param {Array} kLineData - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Boolean} 是否触发QQE MOD止盈
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
    
    // 条件2: 向上拐头：qqeModBar[2] > qqeModBar[1] > qqeModBar[0]
    const turnUp = qqeModBar2 > qqeModBar1 && qqeModBar1 > qqeModBar0;
    if (!turnUp) return false;
    
    // 条件3: 最小的qqemod < -阈值
    if (qqeModBar0 > qqeModTakeProfitThresholdShort) return false;
    
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

    // QQE MOD止盈
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

    // QQE MOD止盈
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
    if (!state.hasOrder) return;
    
    const { trend } = state.tradingInfo;
    const { kLineData, superTrendArr, qqeModArr, preHighLowArr, squeezeBoxArr, sslArr, ssl2Arr } = state;
    
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    if (!kLine3 || !superTrend3) return;

    const kLineDate = kLine3.closeTime || kLine3.openTime || 'N/A';

    if (trend === "up") {
        // 计算当前止损位
        const currentStopLoss = Math.min(superTrend3.up, superTrend3.dn);
        
        // 更新波动率自适应止损
        const effectiveStopLoss = updateVolatilityTrailingStop({
            trend,
            state,
            config,
            currentStopLoss,
            kLineData,
        });

        // 1. 止损判断 - 立即市价平仓
        const stopLossHit = judgeStopLossLong(kLineData, effectiveStopLoss);
        if (stopLossHit) {
            console.log(`@@@[做多 市价平仓] ${kLineDate}, currentPrice=${state.currentPrice}, effectiveStopLoss=${effectiveStopLoss}`);
            await closeUp();
            return;
        }

        // 1.5. 高风险止损判断 - 立即市价平仓
        const { enableIndicatorStopLoss } = config;
        if (enableIndicatorStopLoss) {
            const indicatorStopLossHit = judgeIndicatorStopLossLong(kLineData, qqeModArr, sslArr, ssl2Arr, state, config);
            if (indicatorStopLossHit) {
                console.log(`@@@[做多高风险止损] ${kLineDate}, qqeModBar0=${qqeModArr[qqeModArr.length - 1].qqeModBar0}`);
                await closeUp();
                return;
            }
        }
    }

    if (trend === "down") {
        // 计算当前止损位
        const currentStopLoss = Math.max(superTrend3.up, superTrend3.dn);
        
        // 更新波动率自适应止损
        const effectiveStopLoss = updateVolatilityTrailingStop({
            trend,
            state,
            config,
            currentStopLoss,
            kLineData,
        });

        // 1. 止损判断 - 立即市价平仓
        const stopLossHit = judgeStopLossShort(kLineData, effectiveStopLoss);
        if (stopLossHit) {
            console.log(`@@@[做空 市价平仓] ${kLineDate}, currentPrice=${state.currentPrice}, effectiveStopLoss=${effectiveStopLoss}`);
            await closeDown();
            // 需要冷却
            state.close_longTrendUpperReachCount = state.longTrendUpperReachCount;
            state.close_shortTrendLowerReachCount = state.shortTrendLowerReachCount;
            state.close_trend = superTrend3.trend ?? null;
            return;
        }

        // 1.5. 高风险止损判断 - 立即市价平仓
        const { enableIndicatorStopLoss } = config;
        if (enableIndicatorStopLoss) {
            const indicatorStopLossHit = judgeIndicatorStopLossShort(kLineData, qqeModArr, sslArr, ssl2Arr, state, config);
            if (indicatorStopLossHit) {
                console.log(`@@@[做空高风险止损] ${kLineDate},qqeModBar0=${qqeModArr[qqeModArr.length - 1].qqeModBar0}`);
                await closeDown();
                // 需要冷却
                state.close_longTrendUpperReachCount = state.longTrendUpperReachCount;
                state.close_shortTrendLowerReachCount = state.shortTrendLowerReachCount;
                state.close_trend = superTrend3.trend ?? null;
                return;
            }
        }
    }

    return; // 未触发止损
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
    if ((currentKLineCount - entryKLineCount) % indicatorStopLossCheckPeriod !== 0) return false;

    // 计算从开仓到第N根K线的区间内收盘价小于开盘价的K线数量
    let bearishCount = 0;
    let totalCount = 0;

    const entryArrayIndex = kLineData.length - 1 - (currentKLineCount - entryKLineCount);
    const startArrayIndex = entryArrayIndex + 1;
    const endArrayIndex = kLineData.length - 1;

    for (let i = startArrayIndex; i <= endArrayIndex && i < kLineData.length; i++) {
        const kLine = kLineData[i];
        if (kLine && kLine.close !== undefined && kLine.open !== undefined) {
            totalCount++;
            if (kLine.close < kLine.open) {
                bearishCount++;
            }
        }
    }

    if (totalCount > 0) {
        const bearishRatio = bearishCount / totalCount;
        console.log(`@@@[做多高风险检测], bearishRatio=${bearishRatio}, totalCount=${totalCount}, bearishCount=${bearishCount}`);
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

    const checkKLineCount = entryKLineCount + indicatorStopLossCheckPeriod;

    if (currentKLineCount < checkKLineCount) return false;

    if (state.isHighRisk) return true;

    if ((currentKLineCount - entryKLineCount) % indicatorStopLossCheckPeriod !== 0) return false;

    let bullishCount = 0;
    let totalCount = 0;

    const entryArrayIndex = kLineData.length - 1 - (currentKLineCount - entryKLineCount);
    const startArrayIndex = entryArrayIndex + 1;
    const endArrayIndex = kLineData.length - 1;

    for (let i = startArrayIndex; i <= endArrayIndex && i < kLineData.length; i++) {
        const kLine = kLineData[i];
        if (kLine && kLine.close !== undefined && kLine.open !== undefined) {
            totalCount++;
            if (kLine.close > kLine.open) {
                bullishCount++;
            }
        }
    }

    if (totalCount > 0) {
        const bullishRatio = bullishCount / totalCount;
        console.log(`@@@[做空高风险检测], bullishRatio=${bullishRatio}, totalCount=${totalCount}, bullishCount=${bullishCount}`);
        return bullishRatio >= indicatorStopLossRiskRatio;
    }

    return false;
}

/**
 * 判断指标止损（做多）
 * 条件：高风险标记 && QQE MOD > 阈值
 * @param {Array} kLineData - K线数据数组
 * @param {Array} qqeModArr - QQE MOD指标数组
 * @param {Array} sslArr - SSL指标数组
 * @param {Array} ssl2Arr - SSL2指标数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Boolean} 是否触发指标止损
 */
function judgeIndicatorStopLossLong(kLineData, qqeModArr, sslArr, ssl2Arr, state, config) {
    if (!kLineData || kLineData.length < 1) return false;
    if (!qqeModArr || qqeModArr.length < 1) return false;
    if (!state || !config) return false;
    
    // 如果已经标记为高风险，跳过检测
    if (!state.isHighRisk) {
        const isHighRisk = checkHighRiskLong(kLineData, state.entryKLineCount, state.currentKLineCount, state, config);
        if (isHighRisk) {
            state.isHighRisk = true;
        }
    }
    if (state.isHighRisk) {
        // 获取当前K线的QQE MOD数据
        const [qqeMod0] = getLastFromArr(qqeModArr, 1);
        if (!qqeMod0) return false;
        
        const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
        
        // 高风险 && QQE MOD > 阈值
        const { indicatorStopLossQQEModThresholdLong = 10 } = config;
        return qqeModBar0 > indicatorStopLossQQEModThresholdLong;
    }
    return false;
}

/**
 * 判断指标止损（做空）
 * 条件：高风险标记 && QQE MOD < 阈值
 * @param {Array} kLineData - K线数据数组
 * @param {Array} qqeModArr - QQE MOD指标数组
 * @param {Array} sslArr - SSL指标数组
 * @param {Array} ssl2Arr - SSL2指标数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Boolean} 是否触发指标止损
 */
function judgeIndicatorStopLossShort(kLineData, qqeModArr, sslArr, ssl2Arr, state, config) {
    if (!kLineData || kLineData.length < 1) return false;
    if (!qqeModArr || qqeModArr.length < 1) return false;
    if (!state || !config) return false;
    
    // 如果已经标记为高风险，跳过检测
    if (!state.isHighRisk) {
        const isHighRisk = checkHighRiskShort(kLineData, state.entryKLineCount, state.currentKLineCount, state, config);
        if (isHighRisk) {
            state.isHighRisk = true;
        }
    }

    if (state.isHighRisk) {
        // 获取当前K线的QQE MOD数据
        const [qqeMod0] = getLastFromArr(qqeModArr, 1);
        if (!qqeMod0) return false;
        
        const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
        
        // 高风险 && QQE MOD < 阈值
        const { indicatorStopLossQQEModThresholdShort = -10 } = config;
        return qqeModBar0 < indicatorStopLossQQEModThresholdShort;
    }
    return false;
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
 * 更新波动率自适应止损
 * @param {Object} params - 参数对象
 * @param {String} params.trend - 交易方向 'up' 或 'down'
 * @param {Object} params.state - 策略状态对象
 * @param {Object} params.config - 配置对象
 * @param {Number} params.currentStopLoss - 当前止损价格（superTrend止损）
 * @param {Array} params.kLineData - K线数据数组
 * @returns {Number} 有效止损价格
 */
function updateVolatilityTrailingStop(params) {
    const { trend, state, config, currentStopLoss, kLineData } = params;
    const { enableVolatilityTrailingStop, volatilityATRPeriod, volatilitySMAPeriod, indicatorTPFirstCloseCount, enableBreakEvenStopLoss } = config;
    
    // 检查是否启用波动率自适应止损
    if (!enableVolatilityTrailingStop) {
        // 检查是否启用保本止损，他们公用的 trailStop
        if (enableBreakEvenStopLoss && state.trailActive) {
            return state.trailStop || currentStopLoss;
        }
        return currentStopLoss;
    }
    
    // 检查是否已经触发过第一次指标止盈（波动率止损和保本止损都应该在第一次指标止盈后才运行）
    if (state.indicatorTPCount < indicatorTPFirstCloseCount) {
        // 如果已经有止损，继续使用
        if (state.trailActive && state.trailStop !== null) {
            return state.trailStop;
        }
        return currentStopLoss;
    }
    
    const isLong = trend === 'up';
    
    // 获取K线数据用于计算ATR
    // 需要至少 volatilitySMAPeriod + volatilityATRPeriod 根K线来计算SMA(ATR,50)
    const minRequiredKLines = volatilitySMAPeriod + volatilityATRPeriod;
    if (!kLineData || kLineData.length < minRequiredKLines) {
        // 如果数据不足，使用当前止损或已有止损
        if (state.trailActive && state.trailStop !== null) {
            return state.trailStop;
        }
        return currentStopLoss;
    }
    
    // 计算最近 volatilitySMAPeriod 根K线的ATR(14)值数组
    // 为了计算SMA(ATR,50)，需要计算每根K线的ATR(14)
    const atrValues = [];
    for (let i = 0; i < volatilitySMAPeriod; i++) {
        // 从后往前，计算每根K线的ATR(14)
        const kLinesForATR = kLineData.slice(0, kLineData.length - i);
        if (kLinesForATR.length >= volatilityATRPeriod + 1) {
            const atrResult = calculateATR(kLinesForATR, volatilityATRPeriod);
            const atrValue = atrResult.atr || (atrResult.atrArr && atrResult.atrArr[atrResult.atrArr.length - 1]);
            if (atrValue && atrValue > 0) {
                atrValues.unshift(atrValue); // 从前面插入，保持时间顺序
            }
        }
    }
    
    // 如果ATR数组长度不足，使用当前止损或已有止损
    if (atrValues.length < volatilitySMAPeriod) {
        if (state.trailActive && state.trailStop !== null) {
            return state.trailStop;
        }
        return currentStopLoss;
    }
    
    // 计算 ATR(14) - 当前K线的ATR(14)值（数组最后一个值）
    const recentATR = atrValues[atrValues.length - 1];
    
    // 计算 SMA(ATR, 50) - 使用最近 volatilitySMAPeriod 根K线的ATR值的简单移动平均
    const smaATR = atrValues.reduce((sum, val) => sum + val, 0) / atrValues.length;
    
    // 计算波动率比率
    const atrRatio = smaATR > 0 ? recentATR / smaATR : 1;
    
    // 根据波动率确定止损倍数
    let stopMultiplier;
    if (atrRatio < 0.8) {
        stopMultiplier = 2.5;
    } else if (atrRatio >= 0.8 && atrRatio <= 1.2) {
        stopMultiplier = 3.0;
    } else {
        stopMultiplier = 3.5;
    }
    
    // 获取当前价格（使用最新K线的收盘价）
    const [latestKLine] = getLastFromArr(kLineData, 1);
    if (!latestKLine) {
        if (state.trailActive && state.trailStop !== null) {
            return state.trailStop;
        }
        return currentStopLoss;
    }
    
    const currentPrice = latestKLine.close;
    
    // 计算波动率自适应止损价格
    let volatilityStopPrice;
    if (isLong) {
        // 做多：当前价格 - stopMultiplier * ATR
        volatilityStopPrice = currentPrice - stopMultiplier * recentATR;
    } else {
        // 做空：当前价格 + stopMultiplier * ATR
        volatilityStopPrice = currentPrice + stopMultiplier * recentATR;
    }
    
    // 如果已经有止损或保本止损，取更有利的那个
    if (state.trailActive && state.trailStop !== null) {
        if (isLong) {
            // 做多：取较大值（更有利）
            state.trailStop = Math.max(state.trailStop, volatilityStopPrice);
        } else {
            // 做空：取较小值（更有利）
            state.trailStop = Math.min(state.trailStop, volatilityStopPrice);
        }
    } else {
        state.trailActive = true;
        state.trailStop = volatilityStopPrice;
    }
    
    return state.trailStop;
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
    const { enableBreakEvenStopLoss, breakEvenStopLossRatio, tpCountForStopLoss } = config;
    
    // 检查是否启用保本止损
    if (!enableBreakEvenStopLoss) return false;
    
    // 检查是否有开仓价格
    if (!state.entryPrice) return false;
    
    // 检查是否已经触发过第一次指标止盈（保本止损应该在第一次指标止盈后才运行）
    if (state.indicatorTPCount < tpCountForStopLoss || tpCountForStopLoss === 0) {
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

    // 首次触发止损（基于preLow/preHigh）
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
        closeQuantity = absInitialSize * indicatorTPFirstCloseRatio;
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

        if (action === '第一次平仓') {
            // 第一次指标达到 但是却亏损了，则全部平仓
            if ((isLong ? close < state.tradingInfo.orderPrice : close > state.tradingInfo.orderPrice)) {
                await closePosition(); // 全部平仓
                return true;
            }
            // 如果是反转入场，则立即平仓
            if (state.isReversalEntry) {
                // await closePosition(); // 全部平仓
                // return true;
                await closePosition(closeQuantity);
                return false;
            } else {
                await closePosition(closeQuantity);
                return false; // 部分平仓，继续持有
            }
        } else if (closeQuantity !== null) {
            await closePosition(closeQuantity);
            return false; // 部分平仓，继续持有
        } else {
            await closePosition(); // 全部平仓
            return true; // 已全部平仓
        }
    }

    // 第一/二次平仓后，设置保本止损
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
    
    // 指标止损 | 波动率自适应止损
    await judgeStopLossInProfitRun(state, config, closeUp, closeDown);

    // 止盈 | 移动止盈
    await judgeProfitRunOrProfit(currentPrice, state, config, closeUp, closeDown);

    state.onGridPoint = false;
}

module.exports = {
    judgeStopLoss,
    // @exit.js (771-772) 这个函数没有在@strategies/superTrend_SSL_qqeMod/index.js 中调用，需要高频判断的啊
    // 适应极端行情close和实际止损相差很大的情况
    judgeProfitRunOrProfit,
    gridPointClearTrading,
};
