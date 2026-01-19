/**
 * 开单逻辑模块
 * 负责判断交易方向和计算交易信号
 */

const { getLastFromArr } = require("../../utils/functions.js");
const { 
    detectLongFVGInRange, 
    detectShortFVGInRange,
} = require("../../utils/fvg.js");
const {
    calculatePivotLow,
    calculatePivotHigh,
} = require("../../utils/pivot.js");

/**
 * 通过指标判断交易方向
 * 设置 readyBuy 和 readySell 状态
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function judgeTradingDirection(state, config) {
    const { kLineData, wt5mArr, wt15mArr, wt1hArr, hasOrder } = state;
    
    // 检查数据是否充足
    if (kLineData.length < 5 || wt5mArr.length < 3) {
        state.readyTradingDirection = "hold";
        return;
    }

    const [kLine1, kLine2, kLine3, kLine4, kLine5] = getLastFromArr(kLineData, 5);
    
    // 获取WaveTrend指标值
    const [wt5m1, wt5m2, wt5m3] = getLastFromArr(wt5mArr, 3);
    const [wt15m1, wt15m2, wt15m3] = wt15mArr.length >= 3 ? getLastFromArr(wt15mArr, 3) : [null, null, null];
    const [wt1h1, wt1h2, wt1h3] = wt1hArr.length >= 3 ? getLastFromArr(wt1hArr, 3) : [null, null, null];

    // 使用真实的多时间框架数据，如果数据不足则使用默认值0
    const p5m1 = wt5m3 ? wt5m3.wt1 : 0;
    const p15m1 = wt15m3 ? wt15m3.wt1 : 0; // 使用15m数据
    const p1h1 = wt1h3 ? wt1h3.wt1 : 0; // 使用1h数据

    if (!wt5m1 || !wt5m2 || !wt5m3) {
        state.readyTradingDirection = "hold";
        return;
    }

    // ====== 做多 readyBuy 设置条件 ======
    if (!state.longReadyBuy) {
        const longReadyBuyCondition = 
            p5m1 <= (config.longReadyBuyThreshold || -50) && 
            p15m1 <= (config.longReadyBuyThreshold || -50) && 
            p1h1 < (config.longP1h1UpperLimit || 25);
        
        if (longReadyBuyCondition) {
            state.longReadyBuy = true;
        }
    }

    // longReadyBuy 失效条件
    if (state.longReadyBuy && !hasOrder && p1h1 > (config.longThresholdLevel || 50)) {
        state.longReadyBuy = false;
    }

    // ====== 做空 readySell 设置条件 ======
    if (!state.shortReadySell) {
        const shortReadySellCondition = 
            p5m1 >= (config.shortReadySellThreshold || 50) && 
            p15m1 >= (config.shortReadySellThreshold || 50) && 
            p1h1 > (config.shortP1h1LowerLimit || -25);
        
        if (shortReadySellCondition) {
            state.shortReadySell = true;
        }
    }

    // shortReadySell 失效条件
    if (state.shortReadySell && !hasOrder && p1h1 < (config.shortThresholdLevel || -50)) {
        state.shortReadySell = false;
    }

    // 更新摆动低点/高点 (用于止损计算)
    const pivotLow = calculatePivotLow(kLineData, config.longPivotLength || 7);
    if (pivotLow !== null) {
        state.longLastSwingLow = pivotLow;
    }

    const pivotHigh = calculatePivotHigh(kLineData, config.shortPivotLength || 7);
    if (pivotHigh !== null) {
        state.shortLastSwingHigh = pivotHigh;
    }

    // 注意: readyTradingDirection 的实际设置会在 calculateTradingSignal 中根据FVG确认后设置
    state.readyTradingDirection = "hold";
}

/**
 * 计算交易信号（包含FVG确认）
 * 基于WaveTrend多时间框架策略 + FVG确认
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Object} 交易信号 { trend, stopLoss, stopProfit }
 */
function calculateTradingSignal(state, config) {
    const { kLineData, wt5mArr, wt15mArr, wt1hArr, hasOrder, isUpOpen, isDownOpen } = state;
    
    if (kLineData.length < 5 || wt5mArr.length < 3) {
        return { trend: "hold" };
    }

    const [kLine1, kLine2, kLine3, kLine4, kLine5] = getLastFromArr(kLineData, 5);
    const { open, close, openTime, closeTime, low, high } = kLine5;
    
    // 获取WaveTrend指标值
    const [wt5m1, wt5m2, wt5m3] = getLastFromArr(wt5mArr, 3);
    const [wt15m1, wt15m2, wt15m3] = wt15mArr.length >= 3 ? getLastFromArr(wt15mArr, 3) : [null, null, null];
    const [wt1h1, wt1h2, wt1h3] = wt1hArr.length >= 3 ? getLastFromArr(wt1hArr, 3) : [null, null, null];
    
    if (!wt5m1 || !wt5m2 || !wt5m3) {
        return { trend: "hold" };
    }
    
    // 使用真实的多时间框架数据
    const p5m1 = wt5m3.wt1;
    const p15m1 = wt15m3 ? wt15m3.wt1 : 0; // 使用15m数据，如果数据不足则使用0
    const p1h1 = wt1h3 ? wt1h3.wt1 : 0; // 使用1h数据，如果数据不足则使用0
    
    // 获取前一根K线的指标值
    const p5m1_prev = wt5m2 ? wt5m2.wt1 : p5m1;
    const p15m1_prev = wt15m2 ? wt15m2.wt1 : p15m1;
    const p1h1_prev = wt1h2 ? wt1h2.wt1 : p1h1;

    // ====== 做多开仓条件检查 ======
    if (isUpOpen && state.longReadyBuy && !hasOrder) {
        // 条件1: 当前k线满足 50 > p5m1 > p15m1 > p1h1
        const longCondition1 = (config.longP5UpperLimit || 50) > p5m1 && 
                                p5m1 > p15m1 && 
                                p15m1 > p1h1;
        
        // 条件2: 当前k线满足 0 > p15m1 > p1h1
        const longCondition2 = (config.longP15LowerLimit || 0) > p15m1 && 
                               p15m1 > p1h1;
        
        // 条件3: （当前k线满足 p5m1 > p15m1 并且 前1根k线不满足 p5m1 > p15m1） 
        //        或 (当前k线满足 p15m1 > p1h1 并且 前1根k线不满足 p15m1 > p1h1)
        const longCondition3A = p5m1 > p15m1 && !(p5m1_prev > p15m1_prev);
        const longCondition3B = p15m1 > p1h1 && !(p15m1_prev > p1h1_prev);
        const longCondition3 = longCondition3A || longCondition3B;

        // 如果条件1、2、3都满足，检查FVG
        if (longCondition1 && longCondition2 && longCondition3) {
            // 开启FVG等待窗口
            if (!state.longFvgWindowActive) {
                state.longFvgWindowActive = true;
                state.longFvgWindowStart = kLineData.length - 1;
                state.longFvgLookbackStart = Math.max(0, kLineData.length - 1 - (config.longFvgLookbackBars || 5));
            }

            // 检查FVG
            if (state.longFvgWindowActive && state.longFvgLookbackStart >= 0) {
                const currentIndex = kLineData.length - 1;
                const fvg = detectLongFVGInRange(
                    kLineData,
                    state.longFvgLookbackStart,
                    currentIndex,
                    state.avgCandleHeight,
                    config.longFvgGapMultiplier || 5
                );

                if (fvg && fvg.isValid) {
                    // 如果启用价格检查，当前K线收盘价必须 > FVG区域最小值
                    const priceCheckPassed = !(config.longEnableFvgPriceCheck !== false) || close > fvg.fvgMinPrice;
                    
                    if (priceCheckPassed) {
                        // 计算止损：最近的摆动低点 - 最近N根k线的平均高度
                        const lowest3Bars = Math.min(kLine3.low, kLine4.low, kLine5.low);
                        const baseStopLoss = state.longLastSwingLow && state.longLastSwingLow < close 
                            ? state.longLastSwingLow 
                            : lowest3Bars;
                        const calculatedStopLoss = state.avgCandleHeight 
                            ? baseStopLoss - state.avgCandleHeight 
                            : baseStopLoss;
                        const stopLoss = calculatedStopLoss > 0 ? calculatedStopLoss : lowest3Bars;
                        
                        // 计算止盈：基于盈亏比
                        const riskAmount = close - stopLoss;
                        const stopProfit = close + riskAmount * (config.longRiskRewardRatio || 2.5);

                        // 关闭FVG窗口
                        state.longFvgWindowActive = false;
                        state.longFvgWindowStart = null;
                        state.longFvgLookbackStart = null;
                        state.longReadyBuy = false; // 重置readyBuy状态

                        return {
                            trend: "up",
                            stopLoss: stopLoss,
                            stopProfit: stopProfit,
                        };
                    }
                }

                // 检查是否超过等待窗口
                if (currentIndex - state.longFvgWindowStart > (config.longFvgWaitBars || 0)) {
                    state.longFvgWindowActive = false;
                    state.longFvgWindowStart = null;
                    state.longFvgLookbackStart = null;
                }
            }
        } else {
            // 条件不满足，关闭FVG窗口
            if (state.longFvgWindowActive) {
                state.longFvgWindowActive = false;
                state.longFvgWindowStart = null;
                state.longFvgLookbackStart = null;
            }
        }
    }

    // ====== 做空开仓条件检查 ======
    if (isDownOpen && state.shortReadySell && !hasOrder) {
        // 条件1: 当前k线满足 -50 < p5m1 < p15m1 < p1h1
        const shortCondition1 = (config.shortP5LowerLimit || -50) < p5m1 && 
                                 p5m1 < p15m1 && 
                                 p15m1 < p1h1;
        
        // 条件2: 当前k线满足 0 < p15m1 < p1h1
        const shortCondition2 = (config.shortP15UpperLimit || 0) < p15m1 && 
                                p15m1 < p1h1;
        
        // 条件3: （当前k线满足 p5m1 < p15m1 并且 前1根k线不满足 p5m1 < p15m1） 
        //        或 (当前k线满足 p15m1 < p1h1 并且 前1根k线不满足 p15m1 < p1h1)
        const shortCondition3A = p5m1 < p15m1 && !(p5m1_prev < p15m1_prev);
        const shortCondition3B = p15m1 < p1h1 && !(p15m1_prev < p1h1_prev);
        const shortCondition3 = shortCondition3A || shortCondition3B;

        // 如果条件1、2、3都满足，检查FVG
        if (shortCondition1 && shortCondition2 && shortCondition3) {
            // 开启FVG等待窗口
            if (!state.shortFvgWindowActive) {
                state.shortFvgWindowActive = true;
                state.shortFvgWindowStart = kLineData.length - 1;
                state.shortFvgLookbackStart = Math.max(0, kLineData.length - 1 - (config.shortFvgLookbackBars || 5));
            }

            // 检查FVG
            if (state.shortFvgWindowActive && state.shortFvgLookbackStart >= 0) {
                const currentIndex = kLineData.length - 1;
                const fvg = detectShortFVGInRange(
                    kLineData,
                    state.shortFvgLookbackStart,
                    currentIndex,
                    state.avgCandleHeight,
                    config.shortFvgGapMultiplier || 5
                );

                if (fvg && fvg.isValid) {
                    // 如果启用价格检查，当前K线收盘价必须 < FVG区域最大值
                    const priceCheckPassed = !(config.shortEnableFvgPriceCheck !== false) || close < fvg.fvgMaxPrice;
                    
                    if (priceCheckPassed) {
                        // 计算止损：最近的摆动高点 + 最近N根k线的平均高度
                        const highest3Bars = Math.max(kLine3.high, kLine4.high, kLine5.high);
                        const baseStopLoss = state.shortLastSwingHigh && state.shortLastSwingHigh > close 
                            ? state.shortLastSwingHigh 
                            : highest3Bars;
                        const calculatedStopLoss = state.avgCandleHeight 
                            ? baseStopLoss + state.avgCandleHeight 
                            : baseStopLoss;
                        const stopLoss = calculatedStopLoss > 0 ? calculatedStopLoss : highest3Bars;
                        
                        // 计算止盈：基于盈亏比
                        const riskAmount = stopLoss - close;
                        const stopProfit = close - riskAmount * (config.shortRiskRewardRatio || 2.5);

                        // 关闭FVG窗口
                        state.shortFvgWindowActive = false;
                        state.shortFvgWindowStart = null;
                        state.shortFvgLookbackStart = null;
                        state.shortReadySell = false; // 重置readySell状态

                        return {
                            trend: "down",
                            stopLoss: stopLoss,
                            stopProfit: stopProfit,
                        };
                    }
                }

                // 检查是否超过等待窗口
                if (currentIndex - state.shortFvgWindowStart > (config.shortFvgWaitBars || 0)) {
                    state.shortFvgWindowActive = false;
                    state.shortFvgWindowStart = null;
                    state.shortFvgLookbackStart = null;
                }
            }
        } else {
            // 条件不满足，关闭FVG窗口
            if (state.shortFvgWindowActive) {
                state.shortFvgWindowActive = false;
                state.shortFvgWindowStart = null;
                state.shortFvgLookbackStart = null;
            }
        }
    }

    return { trend: "hold" };
}

module.exports = {
    judgeTradingDirection,
    calculateTradingSignal,
};

