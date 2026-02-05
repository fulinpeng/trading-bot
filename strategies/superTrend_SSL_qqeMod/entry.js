/**
 * 开单逻辑模块
 * 负责判断交易方向和计算交易信号
 */

const { getLastFromArr, getDate } = require("../../utils/functions.js");

/**
 * 通过指标判断交易方向
 * 设置 readyTradingDirection 状态
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function judgeTradingDirection(state, config) {
    const { kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, adxArr, fibArr, ssl55Arr, squeezeBoxArr } = state;
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
        isUpOpen,
        isDownOpen,
        isTestLocal,
        enableSSL55Squeeze,
    } = config;

    // 判断做多条件
    const section3Up1 = judgeSSL1LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Up2 = judgeSSL2LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Up3 = judgeADXLongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, config);
    const section3Up4 = enableSSL55Squeeze ? judgeSSL55SqueezeLongEntry(kLineData, superTrendArr, ssl2Arr, ssl55Arr, squeezeBoxArr, config) : false;
    const section3Up5 = judgeTrendReversalLongEntry(qqeModArr, superTrendArr, config);
    const section3Up6 = judgeSuperTrendReversalLongEntry(superTrendArr);
    const section3Up = section3Up3 || section3Up4 || section3Up5 || section3Up6;

    // 判断做空条件
    const section3Down1 = judgeSSL1ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Down2 = judgeSSL2ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
    const section3Down3 = judgeADXShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, config);
    const section3Down4 = enableSSL55Squeeze ? judgeSSL55SqueezeShortEntry(kLineData, superTrendArr, ssl2Arr, ssl55Arr, squeezeBoxArr, config) : false;
    const section3Down5 = judgeTrendReversalShortEntry(qqeModArr, superTrendArr, config);
    const section3Down6 = judgeSuperTrendReversalShortEntry(superTrendArr);
    const section3Down = section3Down3 || section3Down4 || section3Down5 || section3Down6;
        
    // 打印所有指标值
    const [superTrend3] = getLastFromArr(state.superTrendArr, 1);
    const [ssl3] = getLastFromArr(state.sslArr, 1);
    const [ssl23] = getLastFromArr(state.ssl2Arr, 1);
    const [qqeMod3] = getLastFromArr(state.qqeModArr, 1);
    const [adx3] = getLastFromArr(state.adxArr, 1);
    const [fib3] = getLastFromArr(state.fibArr, 1);
    const [preHighLow3] = getLastFromArr(state.preHighLowArr, 1);
    const [swimingFree3] = getLastFromArr(state.swimingFreeArr, 1);
    const [kLine3] = getLastFromArr(state.kLineData, 1);
    const kLineDate = kLine3 ? (isTestLocal ? kLine3.openTime : getDate(kLine3.openTime)) : 'N/A';

    if (isUpOpen && section3Up) {
        section3Up5 && console.log(kLineDate + "@@@ ~ judgeTradingDirection ~ section3Up3 || section3Up4 || section3Up5:", {section3Up3, section3Up4, section3Up5})
        state.readyTradingDirection = "up";
        return;
    }

    if (isDownOpen && section3Down) {
        section3Down5 && console.log(kLineDate + "@@@ ~ judgeTradingDirection ~ section3Down3 || section3Down4 || section3Down5:", {section3Down3, section3Down4, section3Down5})
        state.readyTradingDirection = "down";
        return;
    }

    state.readyTradingDirection = "hold";
}

/**
 * 计算交易信号
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Object} 交易信号 { trend, stopLoss, stopProfit }
 */
function calculateTradingSignal(state, config) {
    const { kLineData, superTrendArr, readyTradingDirection } = state;
    const { riskRewardRatio } = config;
    
    const [kLine3] = getLastFromArr(kLineData, 1);
    const { close } = kLine3;
    
    let [superTrend3] = getLastFromArr(superTrendArr, 1);
    if (!superTrend3) {
        return { trend: "hold" };
    }

    let max = Math.max(superTrend3.up, superTrend3.dn);
    let min = Math.min(superTrend3.up, superTrend3.dn);

    if (readyTradingDirection === "up") {
        return {
            trend: "up",
            stopLoss: min, // 止损（SuperTrend下轨），开仓时保存为initialLongStopLoss
            stopProfit: close + (close - min) * riskRewardRatio, // 固定止盈，使用当前close（即entryPrice）和min（即initialLongStopLoss）
        };
    }

    if (readyTradingDirection === "down") {
        return {
            trend: "down",
            stopLoss: max, // 止损（SuperTrend上轨），开仓时保存为initialShortStopLoss
            stopProfit: close - (max - close) * riskRewardRatio, // 固定止盈，使用当前close（即entryPrice）和max（即initialShortStopLoss）
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
 * 计算SSL斜率（做多）
 * 与Pine Script保持一致：使用sslUp和sslDown计算斜率（等价于smaHigh和smaLow）
 * 做多条件：slopeValue > sslRateUp
 */
function calculateSSLSlopeUp(sslArr, lookback, sslRateUp) {
    if (!sslArr || sslArr.length < lookback + 1) return false;
    const [sslCurrent] = getLastFromArr(sslArr, 1);
    const sslLookback = sslArr[sslArr.length - 1 - lookback];
    if (!sslCurrent || !sslLookback) return false;

    // Pine Script: math.max(smaHigh[sslSlopeLookback], smaLow[sslSlopeLookback])
    // 注意：sslUp和sslDown是smaHigh和smaLow的排列组合，所以math.max(sslUp, sslDown)等价于math.max(smaHigh, smaLow)
    if (!sslLookback.sslUp || !sslLookback.sslDown) return false;
    const wma2 = Math.max(sslLookback.sslUp, sslLookback.sslDown);
    
    // Pine Script: (maxSSL - section3Up1_wma2) / section3Up1_wma2
    const maxSSL = Math.max(sslCurrent.sslUp, sslCurrent.sslDown);
    const slopeValue = (maxSSL - wma2) / wma2;
    return slopeValue > sslRateUp;
}

/**
 * 计算SSL斜率（做空）
 * 与Pine Script保持一致：使用sslUp和sslDown计算斜率（等价于smaHigh和smaLow）
 * 做空条件：slopeValue < sslRateDown
 */
function calculateSSLSlopeDown(sslArr, lookback, sslRateDown) {
    if (!sslArr || sslArr.length < lookback + 1) return false;
    const [sslCurrent] = getLastFromArr(sslArr, 1);
    const sslLookback = sslArr[sslArr.length - 1 - lookback];
    if (!sslCurrent || !sslLookback) return false;

    // Pine Script: math.max(smaHigh[sslSlopeLookback], smaLow[sslSlopeLookback])
    // 注意：sslUp和sslDown是smaHigh和smaLow的排列组合，所以math.max(sslUp, sslDown)等价于math.max(smaHigh, smaLow)
    if (!sslLookback.sslUp || !sslLookback.sslDown) return false;
    const wma2 = Math.max(sslLookback.sslUp, sslLookback.sslDown);
    
    // Pine Script: (maxSSL - section3Down1_wma2) / section3Down1_wma2
    const maxSSL = Math.max(sslCurrent.sslUp, sslCurrent.sslDown);
    const slopeValue = (maxSSL - wma2) / wma2;
    return slopeValue < sslRateDown;
}

/**
 * 计算SSL2斜率（做多）
 * 与Pine Script保持一致：使用sslUp2和sslDown2计算斜率（等价于smaHigh2和smaLow2）
 * 做多条件：slopeValue > ssl2RateUp
 */
function calculateSSL2SlopeUp(ssl2Arr, lookback, ssl2RateUp) {
    if (!ssl2Arr || ssl2Arr.length < lookback + 1) return false;
    const [ssl2Current] = getLastFromArr(ssl2Arr, 1);
    const ssl2Lookback = ssl2Arr[ssl2Arr.length - 1 - lookback];
    if (!ssl2Current || !ssl2Lookback) return false;

    // Pine Script: math.max(smaHigh2[ssl2SlopeLookback], smaLow2[ssl2SlopeLookback])
    // 注意：sslUp2和sslDown2是smaHigh2和smaLow2的排列组合，所以math.max(sslUp2, sslDown2)等价于math.max(smaHigh2, smaLow2)
    if (!ssl2Lookback.sslUp2 || !ssl2Lookback.sslDown2) return false;
    const wma2 = Math.max(ssl2Lookback.sslUp2, ssl2Lookback.sslDown2);
    
    // Pine Script: (maxSSL2 - section3Up2_wma2) / section3Up2_wma2
    const maxSSL2 = Math.max(ssl2Current.sslUp2, ssl2Current.sslDown2);
    const slopeValue = (maxSSL2 - wma2) / wma2;
    return slopeValue > ssl2RateUp;
}

/**
 * 计算SSL2斜率（做空）
 * 与Pine Script保持一致：使用sslUp2和sslDown2计算斜率（等价于smaHigh2和smaLow2）
 * 做空条件：slopeValue < ssl2RateDown
 */
function calculateSSL2SlopeDown(ssl2Arr, lookback, ssl2RateDown) {
    if (!ssl2Arr || ssl2Arr.length < lookback + 1) return false;
    const [ssl2Current] = getLastFromArr(ssl2Arr, 1);
    const ssl2Lookback = ssl2Arr[ssl2Arr.length - 1 - lookback];
    if (!ssl2Current || !ssl2Lookback) return false;

    // Pine Script: math.max(smaHigh2[ssl2SlopeLookback], smaLow2[ssl2SlopeLookback])
    // 注意：sslUp2和sslDown2是smaHigh2和smaLow2的排列组合，所以math.max(sslUp2, sslDown2)等价于math.max(smaHigh2, smaLow2)
    if (!ssl2Lookback.sslUp2 || !ssl2Lookback.sslDown2) return false;
    const wma2 = Math.max(ssl2Lookback.sslUp2, ssl2Lookback.sslDown2);
    
    // Pine Script: (maxSSL2 - section3Down2_wma2) / section3Down2_wma2
    const maxSSL2 = Math.max(ssl2Current.sslUp2, ssl2Current.sslDown2);
    const slopeValue = (maxSSL2 - wma2) / wma2;
    return slopeValue < ssl2RateDown;
}

/**
 * 判断SSL1入场条件（做多）
 */
function judgeSSL1LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config) {
    const [kLine1, kLine2, kLine3, kLine4, kLine5] = getLastFromArr(kLineData, 5);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [ssl1, ssl2, ssl3] = getLastFromArr(sslArr, 3);
    const [ssl21, ssl22, ssl23] = getLastFromArr(ssl2Arr, 3);
    if (!superTrend3 || !ssl1 || !ssl21) return false;

    const { close, low } = kLine5;
    const { low: low1 } = kLine4;

    const maxSSL = Math.max(ssl3.sslUp, ssl3.sslDown);
    const minSSL = Math.min(ssl3.sslUp, ssl3.sslDown);
    const maxSSL2 = Math.max(ssl23.sslUp2, ssl23.sslDown2);
    const minSSL2 = Math.min(ssl23.sslUp2, ssl23.sslDown2);

    const maxSSL1 = Math.max(ssl1.sslUp, ssl1.sslDown);
    const minSSL1 = Math.min(ssl1.sslUp, ssl1.sslDown);
    const maxSSL21 = Math.max(ssl21.sslUp2, ssl21.sslDown2);
    const minSSL21 = Math.min(ssl21.sslUp2, ssl21.sslDown2);

    // section3Up1条件
    const condition1 = minSSL > minSSL2 && maxSSL > maxSSL2;
    const condition2 = superTrend3.trend == 1;
    const condition3 = judgeQQELongCondition(qqeModArr, config.qqe_entryThreshold1);
    const condition4 = close > maxSSL;
    const condition5 = Math.min(low, low1) <= maxSSL;
    // const condition6 = calculateSSLSlopeUp(sslArr, config.sslSlopeLookback, config.sslRateUp);
    const condition6 = !(minSSL1 > minSSL21 && maxSSL1 > maxSSL21);
    const condition7 = superTrendArr[0].trend == -1;

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7;
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
    const condition6 = calculateSSL2SlopeUp(ssl2Arr, config.ssl2SlopeLookback, config.ssl2RateUp);
    const condition7 = superTrendArr[0].trend == -1;
    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7;
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
    const condition8 = superTrendArr[0].trend == -1;

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7 && condition8;
}

/**
 * 判断SSL1入场条件（做空）
 */
function judgeSSL1ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config) {
    const [kLine1, kLine2, kLine3, kLine4, kLine5] = getLastFromArr(kLineData, 5);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [ssl1, ssl2, ssl3] = getLastFromArr(sslArr, 3);
    const [ssl21, ssl22, ssl23] = getLastFromArr(ssl2Arr, 3);
    if (!superTrend3 || !ssl1 || !ssl21) return false;

    const { close, high } = kLine5;
    const { high: high1 } = kLine4;

    const maxSSL = Math.max(ssl3.sslUp, ssl3.sslDown);
    const minSSL = Math.min(ssl3.sslUp, ssl3.sslDown);
    const maxSSL2 = Math.max(ssl23.sslUp2, ssl23.sslDown2);
    const minSSL2 = Math.min(ssl23.sslUp2, ssl23.sslDown2);

    const maxSSL1 = Math.max(ssl1.sslUp, ssl1.sslDown);
    const minSSL1 = Math.min(ssl1.sslUp, ssl1.sslDown);
    const maxSSL21 = Math.max(ssl21.sslUp2, ssl21.sslDown2);
    const minSSL21 = Math.min(ssl21.sslUp2, ssl21.sslDown2);

    // section3Down1条件
    const condition1 = minSSL < minSSL2 && maxSSL < maxSSL2;
    const condition2 = superTrend3.trend == -1;
    const condition3 = judgeQQEShortCondition(qqeModArr, config.qqe_entryThreshold1);
    const condition4 = close < minSSL;
    const condition5 = Math.max(high, high1) >= minSSL;
    // const condition6 = calculateSSLSlopeDown(sslArr, config.sslSlopeLookback, config.sslRateDown);
    const condition6 = !(minSSL1 < minSSL21 && maxSSL1 < maxSSL21);
    const condition7 = superTrendArr[0].trend == 1;
    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7;
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
    const condition6 = calculateSSL2SlopeDown(ssl2Arr, config.ssl2SlopeLookback, config.ssl2RateDown);
    const condition7 = superTrendArr[0].trend == 1;
    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7;
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
    const condition8 = superTrendArr[0].trend == 1;

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7 && condition8;
}

/**
 * 判断SSL55+Squeeze入场条件（做多）
 * Pine Script: section3Up4 = enableSSL55Squeeze and ssl55_squeeze_long_signal and trend == 1 and close > minSSL2
 * 条件：close > SSL55 and ta.crossover(close, BOX_bl) and trend == 1 and close > minSSL2
 */
function judgeSSL55SqueezeLongEntry(kLineData, superTrendArr, ssl2Arr, ssl55Arr, squeezeBoxArr, config) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [ssl23] = getLastFromArr(ssl2Arr, 1);
    const [ssl553] = getLastFromArr(ssl55Arr, 1);
    const [squeezeBox3] = getLastFromArr(squeezeBoxArr, 1);
    const [squeezeBox2] = getLastFromArr(squeezeBoxArr, 2);
    
    if (!superTrend3 || !ssl23 || !ssl553 || !squeezeBox3 || !kLine3) return false;
    
    const { close } = kLine3;
    const { ssl55 } = ssl553;
    const { bl: boxBl } = squeezeBox3;
    const { bl: boxBlPrev } = squeezeBox2 || { bl: null };
    
    const minSSL2 = Math.min(ssl23.sslUp2, ssl23.sslDown2);
    
    // 条件1: trend == 1
    const condition1 = superTrend3.trend == 1;
    
    // 条件2: close > minSSL2
    const condition2 = close > minSSL2;
    
    // 条件3: close > SSL55
    const condition3 = close > ssl55;

    const prevKLine = kLineData[kLineData.length - 2];
    
    // 条件4: ta.crossover(close, BOX_bl) - 当前close上穿BOX_bl，且上一根close <= BOX_bl
    const condition4 = boxBlPrev !== null && boxBl !== null 
        ? (close > boxBl && kLineData.length >= 2 && Math.min(prevKLine.close, prevKLine.open) <= boxBlPrev)
        : (close > boxBl);
    const condition5 = superTrendArr[0].trend == -1 ? (condition2 || condition3) : (condition2 && condition3);
    
    return condition1 && condition4 && condition5;
}

/**
 * 判断SSL55+Squeeze入场条件（做空）
 * Pine Script: section3Down4 = enableSSL55Squeeze and ssl55_squeeze_short_signal and trend == -1 and close < maxSSL2
 * 条件：close < SSL55 and ta.crossunder(close, BOX_bh) and trend == -1 and close < maxSSL2
 */
function judgeSSL55SqueezeShortEntry(kLineData, superTrendArr, ssl2Arr, ssl55Arr, squeezeBoxArr, config) {
    const [kLine3] = getLastFromArr(kLineData, 1);
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const [ssl23] = getLastFromArr(ssl2Arr, 1);
    const [ssl553] = getLastFromArr(ssl55Arr, 1);
    const [squeezeBox3] = getLastFromArr(squeezeBoxArr, 1);
    const [squeezeBox2] = getLastFromArr(squeezeBoxArr, 2);
    
    if (!superTrend3 || !ssl23 || !ssl553 || !squeezeBox3 || !kLine3) return false;
    
    const { close } = kLine3;
    const { ssl55 } = ssl553;
    const { bh: boxBh } = squeezeBox3;
    const { bh: boxBhPrev } = squeezeBox2 || { bh: null };
    
    const maxSSL2 = Math.max(ssl23.sslUp2, ssl23.sslDown2);
    
    // 条件1: trend == -1
    const condition1 = superTrend3.trend == -1;
    
    // 条件2: close < maxSSL2
    const condition2 = close < maxSSL2;
    
    // 条件3: close < SSL55
    const condition3 = close < ssl55;

    const prevKLine = kLineData[kLineData.length - 2];
    
    // 条件4: ta.crossunder(close, BOX_bh) - 当前close下穿BOX_bh，且上一根close >= BOX_bh
    const condition4 = boxBhPrev !== null && boxBh !== null
        ? (close < boxBh && kLineData.length >= 2 && Math.max(prevKLine.close, prevKLine.open) >= boxBhPrev)
        : (close < boxBh);
    const condition5 = superTrendArr[0].trend == 1 ? (condition2 || condition3) : (condition2 && condition3);
    
    return condition1 && condition4 && condition5;
}

/**
 * 判断QQE MOD趋势反转入场条件（做多）
 * 条件：QQE MOD拐头向上 && 中间那个QQE MOD < 阈值（默认0）&& SuperTrend趋势为1
 * 拐头向上：qqeModBar[2] < qqeModBar[1] < qqeModBar[0]
 */
function judgeTrendReversalLongEntry(qqeModArr, superTrendArr, config) {
    if (!qqeModArr || qqeModArr.length < 3) return false;
    if (!superTrendArr || superTrendArr.length < 1) return false;
    if (!config) return false;
    
    let { qqeModTrendReversalThreshold = 0 } = config;

    qqeModTrendReversalThreshold = superTrendArr[0].trend == -1 ? qqeModTrendReversalThreshold : qqeModTrendReversalThreshold * 2;
    
    // 获取最近三根K线的QQE MOD数据
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;
    
    // 拐头向上：qqeModBar[2] < qqeModBar[1] < qqeModBar[0]
    const turnUp = qqeModBar2 < qqeModBar1 && qqeModBar1 < qqeModBar0;
    // 中间那个QQE MOD < 阈值
    const middleBelowThreshold = qqeModBar1 < qqeModTrendReversalThreshold;
    const condition0 = turnUp && middleBelowThreshold;
    // SuperTrend趋势为1（趋势为上升）
    const condition1 = superTrendArr[superTrendArr.length - 1].trend == 1;
    
    return condition0 && condition1;
}

/**
 * 判断QQE MOD趋势反转入场条件（做空）
 * 条件：QQE MOD拐头向下 && 中间那个QQE MOD > 阈值（默认0）&& SuperTrend趋势为1
 * 拐头向下：qqeModBar[2] > qqeModBar[1] > qqeModBar[0]
 */
function judgeTrendReversalShortEntry(qqeModArr, superTrendArr, config) {
    if (!qqeModArr || qqeModArr.length < 3) return false;
    if (!superTrendArr || superTrendArr.length < 1) return false;
    if (!config) return false;
    
    let { qqeModTrendReversalThreshold = 0 } = config;
    qqeModTrendReversalThreshold = superTrendArr[0].trend == 1 ? qqeModTrendReversalThreshold : qqeModTrendReversalThreshold * 2;
    
    // 获取最近三根K线的QQE MOD数据
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;
    
    // 拐头向下：qqeModBar[2] > qqeModBar[1] > qqeModBar[0]
    const turnDown = qqeModBar2 > qqeModBar1 && qqeModBar1 > qqeModBar0;
    // 中间那个QQE MOD > 阈值
    const middleAboveThreshold = qqeModBar1 > qqeModTrendReversalThreshold;
    const condition0 = turnDown && middleAboveThreshold;
    // SuperTrend趋势为-1（趋势为下降）
    const condition1 = superTrendArr[superTrendArr.length - 1].trend == -1;
    
    return condition0 && condition1;
}

/**
 * 判断SuperTrend趋势反转入场条件（做多）
 * 条件：trend[1] == -1 and trend == 1
 * 上一根K线的trend == -1 且 当前K线的trend == 1
 */
function judgeSuperTrendReversalLongEntry(superTrendArr) {
    if (!superTrendArr || superTrendArr.length < 2) return false;
    
    const [superTrend1, superTrend0] = getLastFromArr(superTrendArr, 2);
    if (!superTrend1 || !superTrend0) return false;
    
    // trend[1] == -1 and trend == 1
    return superTrend1.trend == -1 && superTrend0.trend == 1;
}

/**
 * 判断SuperTrend趋势反转入场条件（做空）
 * 条件：trend[1] == 1 and trend == -1
 * 上一根K线的trend == 1 且 当前K线的trend == -1
 */
function judgeSuperTrendReversalShortEntry(superTrendArr) {
    if (!superTrendArr || superTrendArr.length < 2) return false;
    
    const [superTrend1, superTrend0] = getLastFromArr(superTrendArr, 2);
    if (!superTrend1 || !superTrend0) return false;
    
    // trend[1] == 1 and trend == -1
    return superTrend1.trend == 1 && superTrend0.trend == -1;
}

module.exports = {
    judgeTradingDirection,
    calculateTradingSignal,
};
