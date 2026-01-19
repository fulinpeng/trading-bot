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
    
    // 新策略的止损逻辑：使用移动止损价格
    if (trend === "up" && state.sellstopLossPrice && _currentPrice < state.sellstopLossPrice) {
        await closeUp();
        state.isJudgeStopLoss = false;
        return;
    }

    if (trend === "down" && state.sellstopLossPrice && _currentPrice > state.sellstopLossPrice) {
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
    const [kLine1, kLine2, kLine3] = getLastFromArr(state.kLineData, 3);
    const { open, close, openTime, closeTime, low, high } = kLine3;
    
    // 获取WaveTrend指标值
    const [wt5m1, wt5m2, wt5m3] = getLastFromArr(state.wt5mArr, 3);
    if (!wt5m3) {
        state.isUpdateSellstopLossPrice = false;
        return;
    }
    
    const p5m1 = wt5m3.wt1;
    // 获取15m数据
    const [wt15m1, wt15m2, wt15m3] = state.wt15mArr.length >= 3 ? getLastFromArr(state.wt15mArr, 3) : [null, null, null];
    const p15m1 = wt15m3 ? wt15m3.wt1 : 0;

    // 做多移动止损逻辑
    if (trend === "up") {
        // 当p5m1大于等于设定阈值，并且 close > 开仓价格*保本系数 时，把止损移动到保本位置
        if (!state.longMovedToBreakeven && 
            p5m1 >= (config.longPartialCloseLevel || 55) && 
            close > orderPrice * (config.longBreakevenFactor || 1.001)) {
            state.sellstopLossPrice = orderPrice * (config.longBreakevenFactor || 1.001);
            state.longMovedToBreakeven = true;
        }
    }
    
    // 做空移动止损逻辑
    if (trend === "down") {
        // 当p5m1小于等于设定阈值，并且 close < 开仓价格*保本系数 时，把止损移动到保本位置
        if (!state.shortMovedToBreakeven && 
            p5m1 <= (config.shortPartialCloseLevel || -55) && 
            close < orderPrice * (config.shortBreakevenFactor || 0.999)) {
            state.sellstopLossPrice = orderPrice * (config.shortBreakevenFactor || 0.999);
            state.shortMovedToBreakeven = true;
        }
    }
    
    state.isUpdateSellstopLossPrice = false;
}

/**
 * 止盈 | 移动止盈
 * @param {Number} currentPrice - 当前价格
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @param {Function} closeUp - 平多函数
 * @param {Function} closeDown - 平空函数
 */
async function judgeProfitRunOrProfit(currentPrice, state, config, closeUp, closeDown) {
    if (!state.hasOrder) return;
    
    state.isJudgeProfitRunOrProfit = true;
    const { trend, orderPrice } = state.tradingInfo;
    const [kLine1, kLine2, kLine3] = getLastFromArr(state.kLineData, 3);
    const { open, close, openTime, closeTime, low, high } = kLine3;
    
    // 获取WaveTrend指标值
    const [wt5m1, wt5m2, wt5m3] = getLastFromArr(state.wt5mArr, 3);
    if (!wt5m3) {
        state.isJudgeProfitRunOrProfit = false;
        return;
    }
    
    const p5m1 = wt5m3.wt1;
    // 获取15m数据
    const [wt15m1, wt15m2, wt15m3] = state.wt15mArr.length >= 3 ? getLastFromArr(state.wt15mArr, 3) : [null, null, null];
    const p15m1 = wt15m3 ? wt15m3.wt1 : 0;
    
    // 计算初始止盈价格（基于盈亏比）
    const initialStopLoss = state.tradingInfo.initialStopLoss || orderPrice;
    const riskAmount = Math.abs(orderPrice - initialStopLoss);
    const longInitialTakeProfit = orderPrice + riskAmount * (config.longRiskRewardRatio || 2.5);
    const shortInitialTakeProfit = orderPrice - riskAmount * (config.shortRiskRewardRatio || 2.5);

    // 做多止盈条件
    if (trend === "up") {
        // 条件1: 盈亏比满足全部止盈
        if (close >= longInitialTakeProfit) {
            await closeUp();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }
        
        // 条件2: 当 p5m1 和 p15m1 都大于阈值立即全部平仓
        if ((config.longEnableProfitTarget2 !== false) && 
            p5m1 > (config.longThresholdLevel || 50) && 
            p15m1 > (config.longThresholdLevel || 50)) {
            await closeUp();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }
        
        // 移动止损触发
        if (state.sellstopLossPrice && close < state.sellstopLossPrice) {
            await closeUp();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }
    }

    // 做空止盈条件
    if (trend === "down") {
        // 条件1: 盈亏比满足全部止盈
        if (close <= shortInitialTakeProfit) {
            await closeDown();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }
        
        // 条件2: 当 p5m1 和 p15m1 都小于阈值立即全部平仓
        if ((config.shortEnableProfitTarget2 !== false) && 
            p5m1 < (config.shortThresholdLevel || -50) && 
            p15m1 < (config.shortThresholdLevel || -50)) {
            await closeDown();
            state.isJudgeProfitRunOrProfit = false;
            return;
        }
        
        // 移动止损触发
        if (state.sellstopLossPrice && close > state.sellstopLossPrice) {
            await closeDown();
            state.isJudgeProfitRunOrProfit = false;
            return;
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
 */
async function gridPointClearTrading(currentPrice, state, config, closeUp, closeDown) {
    if (!state.hasOrder) return;

    state.onGridPoint = true;

    // 止盈 | 移动止盈
    await judgeProfitRunOrProfit(currentPrice, state, config, closeUp, closeDown);

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

