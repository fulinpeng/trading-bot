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
        atrEntryThreshold,
    } = config;

    // reachUpperCount >= 5 或 reachLowerCount >= 5 时，不进行入场
    // if (state.longTrendUpperReachCount >= 8 || state.shortTrendLowerReachCount >= 8) {
    //     state.readyTradingDirection = "hold";
    //     return;
    // }

    // 获取当前趋势
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    const currentTrend = superTrend3?.trend;

    // 根据当前趋势决定执行哪些逻辑
    let section3Up = false;
    let section3Down = false;
    let section3Up3 = false;
    let section3Up4 = false;
    let section3Up5 = false;
    let section3Down3 = false;
    let section3Down4 = false;
    let section3Down5 = false;
    let section3Up7 = false;
    let section3Down7 = false;

    // 检查连续100根K线的ATR都小于atrEntryThreshold
    let allAtrLessThanTarget = false;
    if (superTrendArr.length >= 100) {
        allAtrLessThanTarget = true;
        for (let i = 0; i < 100; i++) {
            const superTrend = superTrendArr[superTrendArr.length - 1 - i];
            if (superTrend && superTrend.atr >= atrEntryThreshold) {
                allAtrLessThanTarget = false;
                break;
            }
        }
    }

    // 反转入场： atr < 15 或 reachUpperCount >= 9 或 reachLowerCount >= 9
    if (allAtrLessThanTarget || state.longTrendUpperReachCount >= 6 || state.shortTrendLowerReachCount >= 6) {
        // 多头趋势反转入场做空
        if (currentTrend == 1) {
            // 趋势反转入场
            section3Down7 = judgeTrendReversalShortEntry2(kLineData, qqeModArr, superTrendArr, state, config);
        }
        // 空头趋势反转入场做多
        else if (currentTrend == -1) {
            // 趋势反转入场
            section3Up7 = judgeTrendReversalLongEntry2(kLineData, qqeModArr, superTrendArr, state, config);
        }

        if (isDownOpen && (section3Down7)) {
            console.log("@@@ ~ judgeTradingDirection 多头趋势反转入场做空", {
                allAtrLessThanTarget,
                atr: superTrend3?.atr,
                longTrendUpperReachCount: state.longTrendUpperReachCount,
                reversalShortCount: state.reversalShortCount,
            })
            state.readyTradingDirection = "down";
            state.isReversalEntry = true;
            return;
        }

        if (isUpOpen && (section3Up7)) {
            console.log("@@@ ~ judgeTradingDirection 空头趋势反转入场做多", {
                allAtrLessThanTarget,
                atr: superTrend3?.atr,
                shortTrendLowerReachCount: state.shortTrendLowerReachCount,
                reversalLongCount: state.reversalLongCount,
            })
            state.readyTradingDirection = "up";
            state.isReversalEntry = true;
            return;
        }
    }
    // 顺势入场
    else {
        if (state.longTrendUpperReachCount >= 6 || state.shortTrendLowerReachCount >= 6) {
            state.readyTradingDirection = "hold";
            return;
        }
        // 如果当前趋势为1（多头），只判断做多条件
        if (currentTrend == 1) {
            // const section3Up1 = judgeSSL1LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
            // const section3Up2 = judgeSSL2LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
            section3Up3 = judgeADXLongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, state, config);
            section3Up4 = enableSSL55Squeeze ? judgeSSL55SqueezeLongEntry(kLineData, superTrendArr, ssl2Arr, ssl55Arr, squeezeBoxArr, config) : false;
            // section3Up5 = judgeTrendReversalLongEntry(qqeModArr, superTrendArr, config);
            // const section3Up6 = judgeSuperTrendReversalLongEntry(superTrendArr);
            section3Up = section3Up3 || section3Up4;
        }
        // 如果当前趋势为-1（空头），只判断做空条件
        else if (currentTrend == -1) {
            // const section3Down1 = judgeSSL1ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
            // const section3Down2 = judgeSSL2ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, config);
            section3Down3 = judgeADXShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, state, config);
            section3Down4 = enableSSL55Squeeze ? judgeSSL55SqueezeShortEntry(kLineData, superTrendArr, ssl2Arr, ssl55Arr, squeezeBoxArr, config) : false;
            // section3Down5 = judgeTrendReversalShortEntry(qqeModArr, superTrendArr, config);
            // const section3Down6 = judgeSuperTrendReversalShortEntry(superTrendArr);
            section3Down = section3Down3 || section3Down4;
        }

        if (isUpOpen && (section3Up)) {
            console.log("@@@ ~ judgeTradingDirection ~ section3Up3 || section3Up4 || section3Up7:", {
                section3Up3, section3Up4,
                atr: superTrend3?.atr,
                longTrendUpperReachCount: state.longTrendUpperReachCount,
            })
            state.readyTradingDirection = "up";
            return;
        }

        if (isDownOpen && (section3Down)) {
            console.log("@@@ ~ judgeTradingDirection ~ section3Down3 || section3Down4 || section3Down7:", {
                section3Down3, section3Down4,
                atr: superTrend3?.atr,
                shortTrendLowerReachCount: state.shortTrendLowerReachCount,
            })
            state.readyTradingDirection = "down";
            return;
        }
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
    const { kLineData, superTrendArr, fibArr, sslArr, ssl2Arr, readyTradingDirection } = state;
    const { riskRewardRatio } = config;
    
    const [kLine3] = getLastFromArr(kLineData, 1);
    const { close } = kLine3;
    
    let [superTrend3] = getLastFromArr(superTrendArr, 1);
    if (!superTrend3) {
        return { trend: "hold" };
    }

    // 获取各个指标的最新值
    const [fib3] = getLastFromArr(fibArr, 1);
    const [ssl3] = getLastFromArr(sslArr, 1);
    const [ssl23] = getLastFromArr(ssl2Arr, 1);

    if (readyTradingDirection === "up") {
        // 多单：(superTrend下轨 + fib下轨 + SSL下轨 + SSL2下轨) / 4
        const superTrendLower = Math.min(superTrend3.up, superTrend3.dn);
        const fibLower = fib3?.lower_7;
        const sslLower = ssl3 ? Math.min(ssl3.sslUp, ssl3.sslDown) : null;
        const ssl2Lower = ssl23 ? Math.min(ssl23.sslUp2, ssl23.sslDown2) : null;
        
        // 计算平均值，如果某个指标不存在则使用其他指标的平均值
        const values = [superTrendLower];
        if (fibLower !== null && fibLower !== undefined) values.push(fibLower);
        // if (sslLower !== null && sslLower !== undefined) values.push(sslLower);
        if (ssl2Lower !== null && ssl2Lower !== undefined) values.push(ssl2Lower);
        
        const stopLoss = superTrendLower // values.reduce((sum, val) => sum + val, 0) / values.length;
        
        return {
            trend: "up",
            stopLoss: stopLoss, // 止损（(superTrend下轨 + fib下轨 + SSL下轨 + SSL2下轨) / 4），开仓时保存为initialLongStopLoss
            stopProfit: close + (close - stopLoss) * (state.isReversalEntry ? riskRewardRatio * 2 : riskRewardRatio), // 固定止盈，使用当前close（即entryPrice）和stopLoss（即initialLongStopLoss）
        };
    }

    if (readyTradingDirection === "down") {
        // 空单：(superTrend上轨 + fib上轨 + SSL上轨 + SSL2上轨) / 4
        const superTrendUpper = Math.max(superTrend3.up, superTrend3.dn);
        const fibUpper = fib3?.upper_7;
        const sslUpper = ssl3 ? Math.max(ssl3.sslUp, ssl3.sslDown) : null;
        const ssl2Upper = ssl23 ? Math.max(ssl23.sslUp2, ssl23.sslDown2) : null;
        
        // 计算平均值，如果某个指标不存在则使用其他指标的平均值
        const values = [superTrendUpper];
        if (fibUpper !== null && fibUpper !== undefined) values.push(fibUpper);
        // if (sslUpper !== null && sslUpper !== undefined) values.push(sslUpper);
        if (ssl2Upper !== null && ssl2Upper !== undefined) values.push(ssl2Upper);
        
        const stopLoss = superTrendUpper // values.reduce((sum, val) => sum + val, 0) / values.length;
        
        return {
            trend: "down",
            stopLoss: stopLoss, // 止损（(superTrend上轨 + fib上轨 + SSL上轨 + SSL2上轨) / 4），开仓时保存为initialShortStopLoss
            stopProfit: close - (stopLoss - close) * (state.isReversalEntry ? riskRewardRatio * 2 : riskRewardRatio), // 固定止盈，使用当前close（即entryPrice）和stopLoss（即initialShortStopLoss）
        };
    }
    
    return {
        trend: "hold",
    };
}

// ========== 辅助函数 ==========

/**
 * 检测和管理trend反转相关的上轨计数（用于多单）
 * 当trend从-1转为1时开始计数，当trend从1转为-1时重置计数
 * 检测达到trend上轨时增加计数
 * 该计数可用于多个入场条件的判断
 * @param {Array} kLineData - K线数据数组
 * @param {Array} superTrendArr - SuperTrend数组
 * @param {Object} state - 策略状态对象
 */
function updateLongTrendUpperReachCount(kLineData, superTrendArr, state) {
    if (!superTrendArr || superTrendArr.length < 2) return;
    if (!kLineData || kLineData.length < 2) return;
    
    // 初始化状态变量
    if (state.longTrendReversalCountActive === undefined) state.longTrendReversalCountActive = false;
    if (state.longTrendUpperReachCount === undefined) state.longTrendUpperReachCount = 0;
    if (state.lastLongTrendUpperReachKLine === undefined) state.lastLongTrendUpperReachKLine = -1;
    
    const [superTrend2, superTrend3] = getLastFromArr(superTrendArr, 2);
    if (!superTrend2 || !superTrend3) return;
    
    // 检测trend反转（-1 ==> 1）：开始计数
    if (superTrend2.trend == -1 && superTrend3.trend == 1) {
        state.longTrendReversalCountActive = true;
        state.longTrendUpperReachCount = 0;
        state.lastLongTrendUpperReachKLine = state.currentKLineCount;

        // 重置趋势反转相关变量
        state.reversalLongCount = 0;
        state.lastReversalLongBreakthroughKLine = state.currentKLineCount;
        state.reversalShortCount = 0;
        state.lastReversalShortBreakthroughKLine = state.currentKLineCount;
        return;
    }
    
    // 检测trend反转（1 ==> -1）：重置计数
    if (superTrend2.trend == 1 && superTrend3.trend == -1) {
        state.longTrendReversalCountActive = false;
        state.longTrendUpperReachCount = 0;
        state.lastLongTrendUpperReachKLine = state.currentKLineCount;

        // 重置趋势反转相关变量
        state.reversalLongCount = 0;
        state.lastReversalLongBreakthroughKLine = state.currentKLineCount;
        state.reversalShortCount = 0;
        state.lastReversalShortBreakthroughKLine = state.currentKLineCount;
        return;
    }
    
    // 检测达到trend上轨并增加计数
    if (state.longTrendReversalCountActive) {
        const [kLinePrev, kLineCurrent] = getLastFromArr(kLineData, 2);
        if (!kLineCurrent || !kLinePrev) return;
        
        const superTrendUpper = Math.max(superTrend3.up, superTrend3.dn);
        
        // 检测达到trend上轨：当前K线突破上轨（close > 上轨），且上一根K线未突破
        const reachUpper = kLinePrev.low < superTrendUpper && kLineCurrent.high > superTrendUpper;
        
        // 检查前10根K线（不包括当前这根）是否都没有突破上轨
        let noBreakthroughInLast10 = true;
        if (reachUpper) {
            // 检查前10根K线（从上一根开始往前数10根，不包括当前这根）
            for (let i = 1; i <= 20 && i < kLineData.length; i++) {
                const kLine = kLineData[kLineData.length - 1 - i];
                const superTrend = superTrendArr[superTrendArr.length - 1 - i];
                if (kLine && superTrend) {
                    // 获取这根K线的上一根K线
                    const kLinePrevIndex = kLineData.length - 1 - i - 1;
                    const kLinePrev = kLinePrevIndex >= 0 ? kLineData[kLinePrevIndex] : kLine;
                    const kLineSuperTrendUpper = Math.max(superTrend.up, superTrend.dn);
                    // 如果前10根中有任何一根突破了上轨，则不算再次突破
                    if (kLinePrev.low < kLineSuperTrendUpper && kLine.high > kLineSuperTrendUpper) {
                        noBreakthroughInLast10 = false;
                        break;
                    }
                }
            }
        }
        
        // 如果达到上轨且前10根K线都没有突破，增加计数（避免同一根K线重复计数）
        if (reachUpper && noBreakthroughInLast10 && state.currentKLineCount !== state.lastLongTrendUpperReachKLine) {
            state.longTrendUpperReachCount++;
            console.log("🚀 ~ updateLongTrendUpperReachCount ~ state.longTrendUpperReachCount:", state.longTrendUpperReachCount)
            state.lastLongTrendUpperReachKLine = state.currentKLineCount;

            // 重置趋势反转相关变量
            state.reversalLongCount = 0;
            state.lastReversalLongBreakthroughKLine = state.currentKLineCount;
            state.reversalShortCount = 0;
            state.lastReversalShortBreakthroughKLine = state.currentKLineCount;
        }
    }
}

/**
 * 检测和管理trend反转相关的下轨计数（用于空单）
 * 当trend从1转为-1时开始计数，当trend从-1转为1时重置计数
 * 检测达到trend下轨时增加计数
 * 该计数可用于多个入场条件的判断
 * @param {Array} kLineData - K线数据数组
 * @param {Array} superTrendArr - SuperTrend数组
 * @param {Object} state - 策略状态对象
 */
function updateShortTrendLowerReachCount(kLineData, superTrendArr, state) {
    if (!superTrendArr || superTrendArr.length < 2) return;
    if (!kLineData || kLineData.length < 2) return;
    
    // 初始化状态变量
    if (state.shortTrendReversalCountActive === undefined) state.shortTrendReversalCountActive = false;
    if (state.shortTrendLowerReachCount === undefined) state.shortTrendLowerReachCount = 0;
    if (state.lastShortTrendLowerReachKLine === undefined) state.lastShortTrendLowerReachKLine = -1;
    
    const [superTrend2, superTrend3] = getLastFromArr(superTrendArr, 2);
    if (!superTrend2 || !superTrend3) return;
    
    // 检测trend反转（1 ==> -1）：开始计数
    if (superTrend2.trend == 1 && superTrend3.trend == -1) {
        state.shortTrendReversalCountActive = true;
        state.shortTrendLowerReachCount = 0;
        state.lastShortTrendLowerReachKLine = state.currentKLineCount;

        // 重置趋势反转相关变量
        state.reversalLongCount = 0;
        state.lastReversalLongBreakthroughKLine = state.currentKLineCount;
        state.reversalShortCount = 0;
        state.lastReversalShortBreakthroughKLine = state.currentKLineCount;
        return;
    }
    
    // 检测trend反转（-1 ==> 1）：重置计数
    if (superTrend2.trend == -1 && superTrend3.trend == 1) {
        state.shortTrendReversalCountActive = false;
        state.shortTrendLowerReachCount = 0;
        state.lastShortTrendLowerReachKLine = state.currentKLineCount;

        // 重置趋势反转相关变量
        state.reversalLongCount = 0;
        state.lastReversalLongBreakthroughKLine = state.currentKLineCount;
        state.reversalShortCount = 0;
        state.lastReversalShortBreakthroughKLine = state.currentKLineCount;
        return;
    }
    
    // 检测达到trend下轨并增加计数
    if (state.shortTrendReversalCountActive) {
        const [kLinePrev, kLineCurrent] = getLastFromArr(kLineData, 2);
        if (!kLineCurrent || !kLinePrev) return;
        
        const superTrendLower = Math.min(superTrend3.up, superTrend3.dn);
        
        // 检测达到trend下轨：当前K线突破下轨（close < 下轨），且上一根K线未突破
        const reachLower = kLinePrev.high >= superTrendLower && kLineCurrent.low <= superTrendLower;
        
        // 检查前10根K线（不包括当前这根）是否都没有突破下轨
        let noBreakthroughInLast10 = true;
        if (reachLower) {
            // 检查前10根K线（从上一根开始往前数10根，不包括当前这根）
            for (let i = 1; i <= 20 && i < kLineData.length; i++) {
                const kLine = kLineData[kLineData.length - 1 - i];
                const superTrend = superTrendArr[superTrendArr.length - 1 - i];
                if (kLine && superTrend) {
                    // 获取这根K线的上一根K线
                    const kLinePrevIndex = kLineData.length - 1 - i - 1;
                    const kLinePrev = kLinePrevIndex >= 0 ? kLineData[kLinePrevIndex] : kLine;
                    const kLineSuperTrendLower = Math.min(superTrend.up, superTrend.dn);
                    // 如果前10根中有任何一根突破了下轨，则不算再次突破
                    if (kLinePrev.high >= kLineSuperTrendLower && kLine.low <= kLineSuperTrendLower) {
                        noBreakthroughInLast10 = false;
                        break;
                    }
                }
            }
        }
        
        // 如果达到下轨且前10根K线都没有突破，增加计数（避免同一根K线重复计数）
        if (reachLower && noBreakthroughInLast10 && state.currentKLineCount !== state.lastShortTrendLowerReachKLine) {
            state.shortTrendLowerReachCount++;
            console.log("🚀 ~ updateShortTrendLowerReachCount ~ state.shortTrendLowerReachCount:", state.shortTrendLowerReachCount)
            state.lastShortTrendLowerReachKLine = state.currentKLineCount;
            
            // 重置趋势反转相关变量
            state.reversalLongCount = 0;
            state.lastReversalLongBreakthroughKLine = state.currentKLineCount;
            state.reversalShortCount = 0;
            state.lastReversalShortBreakthroughKLine = state.currentKLineCount;
        }
    }
}

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
function judgeADXLongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, state, config) {
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
    // 条件：达到trend上轨计数 < 配置值（根据ATR值动态设置）
    // 检查所有K线的ATR是否都小于阈值
    const { adxReachCountAtrThreshold = 15, adxReachCountWhenLow = 1, adxReachCountWhenHigh = 3 } = config;
    let allATRBelowThreshold = true;
    for (let i = 0; i < superTrendArr.length; i++) {
        const superTrend = superTrendArr[i];
        if (superTrend && superTrend.atr !== null && superTrend.atr !== undefined) {
            if (superTrend.atr >= adxReachCountAtrThreshold) {
                allATRBelowThreshold = false;
                break;
            }
        } else {
            // 如果ATR值为null或undefined，视为不满足条件
            allATRBelowThreshold = false;
            break;
        }
    }
    const maxCount = allATRBelowThreshold ? adxReachCountWhenLow : adxReachCountWhenHigh;
    const condition8 = state.longTrendUpperReachCount < maxCount;

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
function judgeADXShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, state, config) {
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
    // 条件：达到trend下轨计数 < 配置值（根据ATR值动态设置）
    // 检查所有K线的ATR是否都小于阈值
    const { adxReachCountAtrThreshold = 15, adxReachCountWhenLow = 1, adxReachCountWhenHigh = 3 } = config;
    let allATRBelowThreshold = true;
    for (let i = 0; i < superTrendArr.length; i++) {
        const superTrend = superTrendArr[i];
        if (superTrend && superTrend.atr !== null && superTrend.atr !== undefined) {
            if (superTrend.atr >= adxReachCountAtrThreshold) {
                allATRBelowThreshold = false;
                break;
            }
        } else {
            // 如果ATR值为null或undefined，视为不满足条件
            allATRBelowThreshold = false;
            break;
        }
    }
    const maxCount = allATRBelowThreshold ? adxReachCountWhenLow : adxReachCountWhenHigh;
    const condition8 = state.shortTrendLowerReachCount < maxCount;

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
    
    return condition1 && condition4 && (condition3);
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
    
    return condition1 && condition4 && (condition3);
}

/**
 * 判断QQE MOD趋势反转入场条件（做多）
 * 条件：QQE MOD拐头向上 && 中间那个QQE MOD < 阈值（默认0）&& SuperTrend趋势为1
 * 拐头向上：qqeModBar[2] > qqeModBar[1] < qqeModBar[0]
 */
function judgeTrendReversalLongEntry(qqeModArr, superTrendArr, config) {
    if (!qqeModArr || qqeModArr.length < 3) return false;
    if (!superTrendArr || superTrendArr.length < 1) return false;
    if (!config) return false;
    
    let { qqeModTrendReversalThreshold = 0 } = config;
    
    // 获取最近三根K线的QQE MOD数据
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;
    
    // 拐头向上：qqeModBar[2] > qqeModBar[1] < qqeModBar[0]
    const turnUp = qqeModBar2 > qqeModBar1 && qqeModBar1 < qqeModBar0;
    // 中间那个QQE MOD < 阈值
    const middleBelowThreshold = qqeModBar1 < -qqeModTrendReversalThreshold;
    const condition0 = turnUp && middleBelowThreshold;
    // 保证是SuperTrend趋势 前期阶段
    const condition1 = superTrendArr.length > 100 ? (
        superTrendArr[superTrendArr.length - 100].trend == -1 && superTrendArr[superTrendArr.length - 99].trend == 1
    ) : false;
    
    return condition0 && condition1;
}
function judgeTrendReversalLongEntry2(kLineData, qqeModArr, superTrendArr, state, config) {
    if (!qqeModArr || qqeModArr.length < 3) return false;
    if (!superTrendArr || superTrendArr.length < 2) return false;
    if (!kLineData || kLineData.length < 2) return false;
    if (!config) return false;
    
    // 初始化状态变量
    if (state.reversalLongCount === undefined) state.reversalLongCount = 0;
    if (state.lastReversalLongBreakthroughKLine === undefined) state.lastReversalLongBreakthroughKLine = -1;
    
    const { qqeModTrendReversalThreshold2 = 0, qqeModTrendReversalCount = 3 } = config;
    
    // 获取当前K线和SuperTrend数据
    const [kLineCurrent] = getLastFromArr(kLineData, 1);
    const [kLinePrev] = getLastFromArr(kLineData, 2);
    const [superTrendCurrent] = getLastFromArr(superTrendArr, 1);
    const [superTrendPrev] = getLastFromArr(superTrendArr, 2);
    
    if (!kLineCurrent || !kLinePrev || !superTrendCurrent || !superTrendPrev) return false;
    
    // 获取最近三根K线的QQE MOD数据
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;
    
    // 拐头向上：qqeModBar[2] > qqeModBar[1] < qqeModBar[0]
    const turnUp = qqeModBar2 < qqeModBar1 && qqeModBar1 < qqeModBar0;
    // 中间那个QQE MOD < 阈值
    const middleBelowThreshold = qqeModBar1 < -qqeModTrendReversalThreshold2;
    const isTurnUp = turnUp && middleBelowThreshold;
    
    // 如果出现拐头，增加计数（避免同一根K线重复计数）
    if (isTurnUp && state.lastReversalLongTurnUpKLine !== state.currentKLineCount) {
        state.reversalLongCount++;
        state.lastReversalLongTurnUpKLine = state.currentKLineCount;
    }
    
    // 如果达到指定次数，返回true
    return state.reversalLongCount >= qqeModTrendReversalCount;
}

/**
 * 判断QQE MOD趋势反转入场条件（做空）
 * 条件：QQE MOD拐头向下 && 中间那个QQE MOD > 阈值（默认0）&& SuperTrend趋势为1
 * 拐头向下：qqeModBar[2] < qqeModBar[1] > qqeModBar[0]
 */
function judgeTrendReversalShortEntry(qqeModArr, superTrendArr, config) {
    if (!qqeModArr || qqeModArr.length < 3) return false;
    if (!superTrendArr || superTrendArr.length < 1) return false;
    if (!config) return false;
    
    let { qqeModTrendReversalThreshold = 0 } = config;
    
    // 获取最近三根K线的QQE MOD数据
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;
    
    // 拐头向下：qqeModBar[2] < qqeModBar[1] > qqeModBar[0]
    const turnDown = qqeModBar2 < qqeModBar1 && qqeModBar1 > qqeModBar0;
    // 中间那个QQE MOD > 阈值
    const middleAboveThreshold = qqeModBar1 > qqeModTrendReversalThreshold;
    const condition0 = turnDown && middleAboveThreshold;
    // 保证是SuperTrend趋势 前期阶段
    const condition1 = superTrendArr.length > 100 ? (
        superTrendArr[superTrendArr.length - 100].trend == 1 && superTrendArr[superTrendArr.length - 99].trend == -1
    ) : false;
    
    return condition0 && condition1;
}
function judgeTrendReversalShortEntry2(kLineData, qqeModArr, superTrendArr, state, config) {
    if (!qqeModArr || qqeModArr.length < 3) return false;
    if (!superTrendArr || superTrendArr.length < 2) return false;
    if (!kLineData || kLineData.length < 2) return false;
    if (!config) return false;
    
    // 初始化状态变量
    if (state.reversalShortCount === undefined) state.reversalShortCount = 0;
    if (state.lastReversalShortBreakthroughKLine === undefined) state.lastReversalShortBreakthroughKLine = -1;
    
    const { qqeModTrendReversalThreshold2 = 0, qqeModTrendReversalCount = 3 } = config;
    
    // 获取当前K线和SuperTrend数据
    const [kLineCurrent] = getLastFromArr(kLineData, 1);
    const [kLinePrev] = getLastFromArr(kLineData, 2);
    const [superTrendCurrent] = getLastFromArr(superTrendArr, 1);
    const [superTrendPrev] = getLastFromArr(superTrendArr, 2);
    
    if (!kLineCurrent || !kLinePrev || !superTrendCurrent || !superTrendPrev) return false;

    // 获取最近三根K线的QQE MOD数据
    const [qqeMod2, qqeMod1, qqeMod0] = getLastFromArr(qqeModArr, 3);
    if (!qqeMod2 || !qqeMod1 || !qqeMod0) return false;
    
    const qqeModBar0 = qqeMod0.qqeModBar0 || 0;
    const qqeModBar1 = qqeMod1.qqeModBar0 || 0;
    const qqeModBar2 = qqeMod2.qqeModBar0 || 0;
    
    // 拐头向下：qqeModBar[2] < qqeModBar[1] > qqeModBar[0]
    const turnDown = qqeModBar2 > qqeModBar1 && qqeModBar1 > qqeModBar0;
    // 中间那个QQE MOD > 阈值
    const middleAboveThreshold = qqeModBar1 > qqeModTrendReversalThreshold2;
    const isTurnDown = turnDown && middleAboveThreshold;
    
    // 如果出现拐头，增加计数（避免同一根K线重复计数）
    if (isTurnDown && state.lastReversalShortTurnDownKLine !== state.currentKLineCount) {
        state.reversalShortCount++;
        console.log("🚀 ~ judgeTrendReversalShortEntry2 ~ state.reversalShortCount:", state.reversalShortCount, {
            qqeModBar2, qqeModBar1, qqeModBar0
        })
        state.lastReversalShortTurnDownKLine = state.currentKLineCount;
    }
    
    // 如果达到指定次数，返回true
    return state.reversalShortCount >= qqeModTrendReversalCount;
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
    updateLongTrendUpperReachCount,
    updateShortTrendLowerReachCount,
};
