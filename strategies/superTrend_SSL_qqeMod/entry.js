/**
 * 开单逻辑模块
 * 负责判断交易方向和计算交易信号
 */

const { getLastFromArr } = require("../../utils/functions.js");

/**
 * 通过指标判断交易方向
 * 设置 readyTradingDirection 状态
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function judgeTradingDirection(state, config) {
    const { kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, adxArr, fibArr, isUpOpen, isDownOpen } = state;
    const {
        qqe_entryThreshold1,
        qqe_entryThreshold2,
        sslRateUp,
        sslRateDown,
        ssl2RateUp,
        ssl2RateDown,
        sslSlopeLookback,
        ssl2SlopeLookback,
        adx_threshold_low,
        adx_threshold_high,
    } = config;

    // 判断做多条件
    const section3Up1 = judgeSSL1LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Up2 = judgeSSL2LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Up3 = judgeADXLongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, config);
    const section3Up = section3Up1 || section3Up2 || section3Up3;

    // 判断做空条件
    const section3Down1 = judgeSSL1ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Down2 = judgeSSL2ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Down3 = judgeADXShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, config);
    const section3Down = section3Down1 || section3Down2 || section3Down3;

    if (isUpOpen && section3Up) {
        state.readyTradingDirection = "up";
        return;
    }

    if (isDownOpen && section3Down) {
        state.readyTradingDirection = "down";
        return;
    }

    state.readyTradingDirection = "hold";
}

/**
 * 计算交易信号
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Object} 交易信号 { trend, stopLoss, stopProfit, entryType }
 */
function calculateTradingSignal(state, config) {
    const { kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, adxArr, fibArr, readyTradingDirection } = state;
    const { riskRewardRatio } = config;
    
    const [kLine3] = getLastFromArr(kLineData, 1);
    if (!kLine3) {
        return { trend: "hold" };
    }
    
    const { open, close } = kLine3;
    
    let [superTrend3] = getLastFromArr(superTrendArr, 1);
    if (!superTrend3) {
        return { trend: "hold" };
    }

    let max = Math.max(superTrend3.up, superTrend3.dn);
    let min = Math.min(superTrend3.up, superTrend3.dn);

    // 判断入场方式
    const section3Up1 = judgeSSL1LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Up2 = judgeSSL2LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Up3 = judgeADXLongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, config);
    const section3Down1 = judgeSSL1ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Down2 = judgeSSL2ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Down3 = judgeADXShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, config);

    const signalUpTerm0 = readyTradingDirection === "up" && close > open;
    if (signalUpTerm0) {
        let _entryType = 'SSL1';
        if (section3Up3) _entryType = 'ADX';
        else if (section3Up2) _entryType = 'SSL2';
        
        return {
            trend: "up",
            stopLoss: min, // 止损（SuperTrend下轨）
            stopProfit: close + (close - min) * riskRewardRatio, // 固定止盈
            entryType: _entryType,
        };
    }

    const signalDownTerm0 = readyTradingDirection === "down" && close < open;
    if (signalDownTerm0) {
        let _entryType = 'SSL1';
        if (section3Down3) _entryType = 'ADX';
        else if (section3Down2) _entryType = 'SSL2';
        
        return {
            trend: "down",
            stopLoss: max, // 止损（SuperTrend上轨）
            stopProfit: close - (max - close) * riskRewardRatio, // 固定止盈
            entryType: _entryType,
        };
    }
    
    return {
        trend: "hold",
    };
}

// ========== 辅助函数 ==========

/**
 * 判断QQE条件（做多）
 */
function judgeQQELongCondition(qqeModArr, threshold) {
    if (!qqeModArr || qqeModArr.length < 3) return false;
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;

    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;

    // 最近三根K线都是红色
    const qqe_threeBarsRed = qqeMod0.qqeModRed0 && qqeMod1.qqeModRed0 && qqeMod2.qqeModRed0;
    // 拐头向上：qqeModBar[2] > qqeModBar[1] < qqeModBar[0]
    const qqe_turnUp = qqeModBar2 > qqeModBar1 && qqeModBar1 < qqeModBar0;
    // 最小值 < -阈值
    const qqe_minBelowTh = Math.min(qqeModBar0, qqeModBar1, qqeModBar2) < -threshold;

    return qqe_threeBarsRed && qqe_turnUp && qqe_minBelowTh;
}

/**
 * 判断QQE条件（做空）
 */
function judgeQQEShortCondition(qqeModArr, threshold) {
    if (!qqeModArr || qqeModArr.length < 3) return false;
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;

    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;

    // 最近三根K线都是绿色
    const qqe_threeBarsGreen = qqeMod0.qqeModGreen0 && qqeMod1.qqeModGreen0 && qqeMod2.qqeModGreen0;
    // 拐头向下：qqeModBar[2] < qqeModBar[1] > qqeModBar[0]
    const qqe_turnDown = qqeModBar2 < qqeModBar1 && qqeModBar1 > qqeModBar0;
    // 最大值 > 阈值
    const qqe_maxAboveTh = Math.max(qqeModBar0, qqeModBar1, qqeModBar2) > threshold;

    return qqe_threeBarsGreen && qqe_turnDown && qqe_maxAboveTh;
}

/**
 * 计算SSL斜率
 */
function calculateSSLSlope(sslArr, lookback, sslRate) {
    if (!sslArr || sslArr.length < lookback + 1) return false;
    const [sslCurrent] = getLastFromArr(sslArr, 1);
    const sslLookback = sslArr[sslArr.length - 1 - lookback];
    if (!sslCurrent || !sslLookback) return false;

    const maxSSL = Math.max(sslCurrent.sslUp, sslCurrent.sslDown);
    const maxSSLLookback = Math.max(sslLookback.sslUp, sslLookback.sslDown);
    
    if (maxSSLLookback === 0) return false;
    const slopeValue = (maxSSL - maxSSLLookback) / maxSSLLookback;
    return slopeValue > sslRate;
}

/**
 * 计算SSL2斜率
 */
function calculateSSL2Slope(ssl2Arr, lookback, ssl2Rate) {
    if (!ssl2Arr || ssl2Arr.length < lookback + 1) return false;
    const [ssl2Current] = getLastFromArr(ssl2Arr, 1);
    const ssl2Lookback = ssl2Arr[ssl2Arr.length - 1 - lookback];
    if (!ssl2Current || !ssl2Lookback) return false;

    const maxSSL2 = Math.max(ssl2Current.sslUp2, ssl2Current.sslDown2);
    const maxSSL2Lookback = Math.max(ssl2Lookback.sslUp2, ssl2Lookback.sslDown2);
    
    if (maxSSL2Lookback === 0) return false;
    const slopeValue = (maxSSL2 - maxSSL2Lookback) / maxSSL2Lookback;
    return slopeValue > ssl2Rate;
}

/**
 * 判断SSL1入场条件（做多）
 */
function judgeSSL1LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config) {
    const [kLine1, kLine2, kLine3, kLine4, kLine5] = getLastFromArr(kLineData, 5);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [ssl3] = getLastFromArr(sslArr, 1);
    const [ssl23] = getLastFromArr(ssl2Arr, 1);
    if (!superTrend3 || !ssl3 || !ssl23) return false;

    const { close, low } = kLine5;
    const { low: low1 } = kLine4;

    const maxSSL = Math.max(ssl3.sslUp, ssl3.sslDown);
    const minSSL = Math.min(ssl3.sslUp, ssl3.sslDown);
    const maxSSL2 = Math.max(ssl23.sslUp2, ssl23.sslDown2);
    const minSSL2 = Math.min(ssl23.sslUp2, ssl23.sslDown2);

    // section3Up1条件
    const condition1 = maxSSL > minSSL2;
    const condition2 = superTrend3.trend == 1;
    const condition3 = judgeQQELongCondition(qqeModArr, config.qqe_entryThreshold1);
    const condition4 = close > maxSSL;
    const condition5 = minSSL > minSSL2 && maxSSL > maxSSL2 && Math.min(low, low1) <= maxSSL;
    const condition6 = calculateSSLSlope(sslArr, config.sslSlopeLookback, config.sslRateUp);

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6;
}

/**
 * 判断SSL2入场条件（做多）
 */
function judgeSSL2LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config) {
    const [kLine1, kLine2, kLine3, kLine4, kLine5] = getLastFromArr(kLineData, 5);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [ssl3] = getLastFromArr(sslArr, 1);
    const [ssl23] = getLastFromArr(ssl2Arr, 1);
    if (!superTrend3 || !ssl3 || !ssl23) return false;

    const { close, low } = kLine5;
    const { low: low1 } = kLine4;

    const maxSSL = Math.max(ssl3.sslUp, ssl3.sslDown);
    const minSSL = Math.min(ssl3.sslUp, ssl3.sslDown);
    const maxSSL2 = Math.max(ssl23.sslUp2, ssl23.sslDown2);
    const minSSL2 = Math.min(ssl23.sslUp2, ssl23.sslDown2);

    // section3Up2条件
    const condition1 = maxSSL > minSSL2;
    const condition2 = superTrend3.trend == 1;
    const condition3 = judgeQQELongCondition(qqeModArr, config.qqe_entryThreshold2);
    const condition4 = close > maxSSL2;
    const condition5 = minSSL > minSSL2 && maxSSL > maxSSL2 && Math.min(low, low1) <= maxSSL2;
    const condition6 = calculateSSL2Slope(ssl2Arr, config.ssl2SlopeLookback, config.ssl2RateUp);

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6;
}

/**
 * 判断ADX入场条件（做多）
 */
function judgeADXLongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, config) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [ssl3] = getLastFromArr(sslArr, 1);
    const [ssl23] = getLastFromArr(ssl2Arr, 1);
    const [adx3] = getLastFromArr(adxArr, 1);
    const [fib3] = getLastFromArr(fibArr, 1);
    if (!superTrend3 || !ssl3 || !ssl23 || !adx3 || !fib3) return false;

    const { close } = kLine3;

    const minSSL = Math.min(ssl3.sslUp, ssl3.sslDown);
    const maxSSL2 = Math.max(ssl23.sslUp2, ssl23.sslDown2);

    // section3Up3条件
    const condition1 = minSSL > maxSSL2;
    const condition2 = superTrend3.trend == 1;
    const condition3 = close > maxSSL2;
    
    // ADX 上穿 DIPlus 形成金叉
    const condition4 = adx3.ADX0 > adx3.DIPlus0 && adx3.ADX1 <= adx3.DIPlus1;
    // ADX > ADX[1] > ADX[2]
    const condition5 = adx3.ADX0 > adx3.ADX1 && adx3.ADX1 > adx3.ADX2;
    // DIPlus > 20 and DIMinus < 20 and 20 < ADX < 40
    const condition6 = adx3.DIPlus0 > config.adx_threshold_low && 
                       adx3.DIMinus0 < config.adx_threshold_low && 
                       adx3.ADX0 > config.adx_threshold_low && 
                       adx3.ADX0 < config.adx_threshold_high;
    
    // 最近10根K线不能有 close > upper_6
    let condition7 = true;
    for (let i = 0; i < 10 && i < kLineData.length; i++) {
        const kLine = kLineData[kLineData.length - 1 - i];
        const fib = fibArr[fibArr.length - 1 - i];
        if (fib && kLine.close > fib.upper_6) {
            condition7 = false;
            break;
        }
    }

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7;
}

/**
 * 判断SSL1入场条件（做空）
 */
function judgeSSL1ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config) {
    const [kLine1, kLine2, kLine3, kLine4, kLine5] = getLastFromArr(kLineData, 5);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [ssl3] = getLastFromArr(sslArr, 1);
    const [ssl23] = getLastFromArr(ssl2Arr, 1);
    if (!superTrend3 || !ssl3 || !ssl23) return false;

    const { close, high } = kLine5;
    const { high: high1 } = kLine4;

    const maxSSL = Math.max(ssl3.sslUp, ssl3.sslDown);
    const minSSL = Math.min(ssl3.sslUp, ssl3.sslDown);
    const maxSSL2 = Math.max(ssl23.sslUp2, ssl23.sslDown2);
    const minSSL2 = Math.min(ssl23.sslUp2, ssl23.sslDown2);

    // section3Down1条件
    const condition1 = minSSL < maxSSL2;
    const condition2 = superTrend3.trend == -1;
    const condition3 = judgeQQEShortCondition(qqeModArr, config.qqe_entryThreshold1);
    const condition4 = close < minSSL;
    const condition5 = minSSL < minSSL2 && maxSSL < maxSSL2 && Math.max(high, high1) >= minSSL;
    const condition6 = calculateSSLSlope(sslArr, config.sslSlopeLookback, config.sslRateDown);

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6;
}

/**
 * 判断SSL2入场条件（做空）
 */
function judgeSSL2ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config) {
    const [kLine1, kLine2, kLine3, kLine4, kLine5] = getLastFromArr(kLineData, 5);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [ssl3] = getLastFromArr(sslArr, 1);
    const [ssl23] = getLastFromArr(ssl2Arr, 1);
    if (!superTrend3 || !ssl3 || !ssl23) return false;

    const { close, high } = kLine5;
    const { high: high1 } = kLine4;

    const maxSSL = Math.max(ssl3.sslUp, ssl3.sslDown);
    const minSSL = Math.min(ssl3.sslUp, ssl3.sslDown);
    const maxSSL2 = Math.max(ssl23.sslUp2, ssl23.sslDown2);
    const minSSL2 = Math.min(ssl23.sslUp2, ssl23.sslDown2);

    // section3Down2条件
    const condition1 = minSSL < maxSSL2;
    const condition2 = superTrend3.trend == -1;
    const condition3 = judgeQQEShortCondition(qqeModArr, config.qqe_entryThreshold2);
    const condition4 = close < minSSL2;
    const condition5 = minSSL < minSSL2 && maxSSL < maxSSL2 && Math.max(high, high1) >= minSSL2;
    const condition6 = calculateSSL2Slope(ssl2Arr, config.ssl2SlopeLookback, config.ssl2RateDown);

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6;
}

/**
 * 判断ADX入场条件（做空）
 */
function judgeADXShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, config) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [ssl3] = getLastFromArr(sslArr, 1);
    const [ssl23] = getLastFromArr(ssl2Arr, 1);
    const [adx3] = getLastFromArr(adxArr, 1);
    const [fib3] = getLastFromArr(fibArr, 1);
    if (!superTrend3 || !ssl3 || !ssl23 || !adx3 || !fib3) return false;

    const { close } = kLine3;

    const maxSSL = Math.max(ssl3.sslUp, ssl3.sslDown);
    const minSSL2 = Math.min(ssl23.sslUp2, ssl23.sslDown2);

    // section3Down3条件
    const condition1 = maxSSL < minSSL2;
    const condition2 = superTrend3.trend == -1;
    const condition3 = close < minSSL2;
    
    // ADX 上穿 DIMinus 形成金叉
    const condition4 = adx3.ADX0 > adx3.DIMinus0 && adx3.ADX1 <= adx3.DIMinus1;
    // ADX > ADX[1] > ADX[2]
    const condition5 = adx3.ADX0 > adx3.ADX1 && adx3.ADX1 > adx3.ADX2;
    // DIMinus > 20 and DIPlus < 20 and 20 < ADX < 40
    const condition6 = adx3.DIMinus0 > config.adx_threshold_low && 
                       adx3.DIPlus0 < config.adx_threshold_low && 
                       adx3.ADX0 > config.adx_threshold_low && 
                       adx3.ADX0 < config.adx_threshold_high;
    
    // 最近10根K线不能有 close < lower_6
    let condition7 = true;
    for (let i = 0; i < 10 && i < kLineData.length; i++) {
        const kLine = kLineData[kLineData.length - 1 - i];
        const fib = fibArr[fibArr.length - 1 - i];
        if (fib && kLine.close < fib.lower_6) {
            condition7 = false;
            break;
        }
    }

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7;
}

module.exports = {
    judgeTradingDirection,
    calculateTradingSignal,
};
