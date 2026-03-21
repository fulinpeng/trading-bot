/**
 * 开单逻辑模块
 * 负责判断交易方向和计算交易信号
 */

const { getLastFromArr, getDate } = require("../../utils/functions.js");
const { calculateSimpleMovingAverage } = require("../../utils/ma.js");
const { calculateATR } = require("../../utils/atr.js");

/**
 * 通过指标判断交易方向
 * 设置 readyTradingDirection 状态
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function judgeTradingDirection(state, config) {
    const { kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, adxArr, fibArr, ssl55Arr, squeezeBoxArr, ema50Arr, ema200Arr, rsiArr, volumeSmaArr, bbKeltnerSqueezeArr, closeDemaArr } = state;
    const {
        qqe_entryThreshold1,
        qqe_entryThreshold2,
        sslSlopeLookback,
        adx_threshold_low,
        adx_threshold_high,
        isUpOpen,
        isDownOpen,
        isTestLocal,
        enableSSL55Squeeze,
        atrEntryThreshold,
        enableAtrZCompressedJudge,
        enableReversalEntry,
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
    let section3Up8 = false;
    let section3Down8 = false;
    let section3Up9 = false;
    let section3Down9 = false;

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

    // 使用 ATR Z-Score 判断当前波动率所处的区间（自动适应市场变化）
    // 这里用 atrZ < -1 来替代原来的 "连续100根K线的ATR都小于atrEntryThreshold" 判断
    let isAtrZCompressed = false; // true 表示 ATR Z-Score < -1，即压缩行情（低波动）
    const [atrZ] = getLastFromArr(state.atrZArr, 1);
    if (atrZ !== null && atrZ !== undefined) {
        // atrZ < -1 视为压缩行情，用于触发反转入场逻辑
        isAtrZCompressed = atrZ < -0.5;
    }

    if (enableAtrZCompressedJudge && allAtrLessThanTarget && isAtrZCompressed) {
        state.readyTradingDirection = "hold";
        return;
    }
    
    // 反转入场： atr < 15 或
    if (enableReversalEntry && (allAtrLessThanTarget || state.longTrendUpperReachCount >= 6 || state.shortTrendLowerReachCount >= 9)) {
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
            // console.log("@@@ ~ judgeTradingDirection 多头趋势反转入场做空", {
            //     isAtrZCompressed,
            //     atr: superTrend3?.atr,
            //     longTrendUpperReachCount: state.longTrendUpperReachCount,
            //     reversalShortCount: state.reversalShortCount,
            //     hasOrder:state.hasOrder,

            // })
            state.readyTradingDirection = "down";
            state.isReversalEntry = true;
            return;
        }

        if (isUpOpen && (section3Up7)) {
            // console.log("@@@ ~ judgeTradingDirection 空头趋势反转入场做多", {
            //     isAtrZCompressed,
            //     atr: superTrend3?.atr,
            //     shortTrendLowerReachCount: state.shortTrendLowerReachCount,
            //     reversalLongCount: state.reversalLongCount,
            //     hasOrder:state.hasOrder,
            // })
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
            // const section3Up1 = judgeSSL1LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, state, config);
            // const section3Up2 = judgeSSL2LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, state, config);
            section3Up3 = judgeADXLongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, state, config);
            section3Up4 = enableSSL55Squeeze ? judgeSSL55SqueezeLongEntry(kLineData, superTrendArr, ssl2Arr, ssl55Arr, squeezeBoxArr, config) : false;
            section3Up7 = judgeLiquiditySweepLongEntry(kLineData, 20);
            // section3Up8 = judgeTrendExplosionLongEntry(kLineData, superTrendArr, ema50Arr, rsiArr, volumeSmaArr, bbKeltnerSqueezeArr, state, config);
            // section3Up5 = judgeTrendReversalLongEntry(qqeModArr, superTrendArr, config);
            // const section3Up6 = judgeSuperTrendReversalLongEntry(superTrendArr);
            // section3Up9 = judgeDemaLongEntry(kLineData, closeDemaArr, ema50Arr, state, config);
            section3Up = section3Up3 || section3Up4 || section3Up7;
        }
        // 如果当前趋势为-1（空头），只判断做空条件
        else if (currentTrend == -1) {
            // const section3Down1 = judgeSSL1ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, state, config);
            // const section3Down2 = judgeSSL2ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, state, config);
            section3Down3 = judgeADXShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, adxArr, fibArr, state, config);
            section3Down4 = enableSSL55Squeeze ? judgeSSL55SqueezeShortEntry(kLineData, superTrendArr, ssl2Arr, ssl55Arr, squeezeBoxArr, config) : false;
            section3Down7 = judgeLiquiditySweepShortEntry(kLineData, 20);
            // section3Down8 = judgeTrendExplosionShortEntry(kLineData, superTrendArr, ema50Arr, rsiArr, volumeSmaArr, bbKeltnerSqueezeArr, state, config);
            // section3Down5 = judgeTrendReversalShortEntry(qqeModArr, superTrendArr, config);
            // const section3Down6 = judgeSuperTrendReversalShortEntry(superTrendArr);
            // section3Down9 = judgeDemaShortEntry(kLineData, closeDemaArr, ema50Arr, state, config);
            section3Down = section3Down3 || section3Down4 || section3Down7;
        }

        if (isUpOpen && (section3Up)) {
            console.log("@@@ ~ judgeTradingDirection ~ section3Up3 || section3Up4 || section3Up7 || section3Up8:", {
                section3Up3, section3Up4, section3Up7, section3Up8,
                atr: superTrend3?.atr,
                longTrendUpperReachCount: state.longTrendUpperReachCount,
            })
            state.readyTradingDirection = "up";
            return;
        }

        if (isDownOpen && (section3Down)) {
            console.log("@@@ ~ judgeTradingDirection ~ section3Down3 || section3Down4 || section3Down7 || section3Down8:", {
                section3Down3, section3Down4, section3Down7, section3Down8,
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
    const { riskRewardRatio, initialStopLossAtrMultiplier = 2.5 } = config;
    
    const [kLine3] = getLastFromArr(kLineData, 1);
    const { close } = kLine3;
    
    let [superTrend3] = getLastFromArr(superTrendArr, 1);
    if (!superTrend3) {
        return { trend: "hold" };
    }

    // 获取各个指标的最新值（当前止损逻辑仅依赖 supertrend 的 atr）

    if (readyTradingDirection === "up") {
        // 多单：ATR 止损（并夹取到当前 supertrend 上下沿内）
        const superTrendLower = Math.min(superTrend3.up, superTrend3.dn);
        const superTrendUpper = Math.max(superTrend3.up, superTrend3.dn);

        let atrForStop = superTrend3?.atr;
        if (atrForStop == null || !isFinite(atrForStop) || atrForStop <= 0) {
            const atrPeriod = config.moveStopAtrPeriod || 14;
            const atrSlice = kLineData.slice(- (atrPeriod + 1));
            if (atrSlice.length >= atrPeriod) {
                const atrResult = calculateATR(atrSlice, atrPeriod);
                atrForStop = atrResult?.atr;
            }
        }

        let stopLoss = superTrendLower;
        if (atrForStop != null && isFinite(atrForStop) && atrForStop > 0) {
            stopLoss = close - atrForStop * initialStopLossAtrMultiplier;
            // 不能超过 supertrend 上下沿：超出则夹取到区间内（取“最优值”）
            stopLoss = Math.min(Math.max(stopLoss, superTrendLower), superTrendUpper);
        }

        return {
            trend: "up",
            stopLoss: stopLoss, // 夹取后的 ATR 初始止损（开仓时保存为 initialLongStopLoss）
            stopProfit: close + (close - stopLoss) * (state.isReversalEntry ? riskRewardRatio * 2 : riskRewardRatio), // 固定止盈，使用当前close（即entryPrice）和stopLoss（即initialLongStopLoss）
        };
    }

    if (readyTradingDirection === "down") {
        // 空单：ATR 止损（并夹取到当前 supertrend 上下沿内）
        const superTrendLower = Math.min(superTrend3.up, superTrend3.dn);
        const superTrendUpper = Math.max(superTrend3.up, superTrend3.dn);

        let atrForStop = superTrend3?.atr;
        if (atrForStop == null || !isFinite(atrForStop) || atrForStop <= 0) {
            const atrPeriod = config.moveStopAtrPeriod || 14;
            const atrSlice = kLineData.slice(- (atrPeriod + 1));
            if (atrSlice.length >= atrPeriod) {
                const atrResult = calculateATR(atrSlice, atrPeriod);
                atrForStop = atrResult?.atr;
            }
        }

        let stopLoss = superTrendUpper;
        if (atrForStop != null && isFinite(atrForStop) && atrForStop > 0) {
            stopLoss = close + atrForStop * initialStopLossAtrMultiplier;
            // 不能超过 supertrend 上下沿：超出则夹取到区间内（取“最优值”）
            stopLoss = Math.min(Math.max(stopLoss, superTrendLower), superTrendUpper);
        }

        return {
            trend: "down",
            stopLoss: stopLoss, // 夹取后的 ATR 初始止损（开仓时保存为 initialShortStopLoss）
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
    const qqe_turnUp = qqeModBar1 < qqeModBar0;
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
    const qqe_turnDown = qqeModBar1 > qqeModBar0;
    // 最大值 > 阈值
    const qqe_maxAboveTh = Math.max(qqeModBar0, qqeModBar1, qqeModBar2) > threshold;

    return qqe_threeBarsGreen && qqe_turnDown && qqe_maxAboveTh;
}

/**
 * 判断SSL1入场条件（做多）
 */
function judgeSSL1LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, state, config) {
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
    const condition6 = !(minSSL1 > minSSL21 && maxSSL1 > maxSSL21);
    const condition7 = state.longTrendUpperReachCount <= 2;

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7;
}

/**
 * 判断SSL2入场条件（做多）
 */
function judgeSSL2LongEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, state, config) {
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
    const condition7 = state.longTrendUpperReachCount <= 1;
    return condition1 && condition2 && condition3 && condition4 && condition5 && condition7;
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
    const condition9 = close < (superTrend3.minSuper + superTrend3.maxSuper) / 2;

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7 && condition8// && condition9;
}

/**
 * 判断SSL1入场条件（做空）
 */
function judgeSSL1ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, state, config) {
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
    const condition6 = !(minSSL1 < minSSL21 && maxSSL1 < maxSSL21);
    const condition7 = state.shortTrendLowerReachCount <= 2;
    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7;
}

/**
 * 判断SSL2入场条件（做空）
 */
function judgeSSL2ShortEntry(kLineData, superTrendArr, sslArr, ssl2Arr, qqeModArr, state, config) {
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
    const condition7 = state.shortTrendLowerReachCount <= 1;
    return condition1 && condition2 && condition3 && condition4 && condition5 && condition7;
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
    const condition9 = close > (superTrend3.minSuper + superTrend3.maxSuper) / 2;

    return condition1 && condition2 && condition3 && condition4 && condition5 && condition6 && condition7 && condition8// && condition9;
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

/**
 * 判断成交量过滤条件（只交易强突破）
 * 条件：volume > SMA(volume, 20) * 1.5
 * @param {Array} kLineData - K线数据数组
 * @param {Array} volumeSmaArr - Volume SMA数组
 * @returns {boolean} 是否满足成交量过滤条件
 */
function judgeVolumeFilter(kLineData, volumeSmaArr) {
    if (!kLineData || kLineData.length < 1) {
        return false;
    }

    // 从 state 中获取 volume SMA
    const [smaVolume] = getLastFromArr(volumeSmaArr, 1);
    if (smaVolume === null || smaVolume === undefined) {
        return false;
    }

    // 获取当前K线的成交量
    const [currentKLine] = getLastFromArr(kLineData, 1);
    if (!currentKLine || !currentKLine.volume) {
        return false;
    }

    const currentVolume = currentKLine.volume;
    
    // 判断：volume > SMA(volume, 20) * 1.5
    return currentVolume > smaVolume * 1.5;
}

/**
 * 判断 DEMA 入场条件（做多） section3Up9
 * 条件：
 * 1. longSignal 有效（最近发生过 ta.crossover，且未超过 demaSignalHoldBars）
 * 2. close > DEMA50
 * 3. low <= DEMA50
 * 4. close > open
 */
function judgeDemaLongEntry(kLineData, closeDemaArr, ema50Arr, state, config) {
    if (!kLineData || kLineData.length < 1) return false;
    if (!closeDemaArr || closeDemaArr.length < 2) return false;

    const holdBars = config.demaSignalHoldBars || 50;

    // 获取当前和上一根K线的DEMA数据
    const [dema1, dema2, dema3] = getLastFromArr(closeDemaArr, 3);
    if (!dema1 || !dema2 || !dema3) return false;

    // if (!state.demaLongSignalStartKLine) {
    //     const crossCondition = dema3.demaShort > dema3.demaLong && dema1.demaShort < dema1.demaLong;
    //     if (crossCondition) {
    //         state.demaLongSignalStartKLine = state.currentKLineCount;
    //     } else {
    //         if (state.currentKLineCount - state.demaLongSignalStartKLine > holdBars) {
    //             state.demaLongSignalStartKLine = null;
    //             return false;
    //         }
    //     }
    // }

    const [currentKLine] = getLastFromArr(kLineData, 1);
    if (!currentKLine) return false;

    const { open, close, low } = currentKLine;

    const condition0 = dema3.demaShort > dema3.demaLong && dema1.demaShort < dema1.demaLong;
    const condition1 = close > dema3.demaShort;
    const condition2 = low <= dema3.demaShort;
    const condition3 = close > open;

    return condition0;
}

/**
 * 判断 DEMA 入场条件（做空） section3Down9
 * 条件：
 * 1. shortSignal 有效（最近发生过 ta.crossunder，且未超过 demaSignalHoldBars）
 * 2. close < dema3.demaShort
 * 3. high >= dema3.demaShort
 * 4. close < open
 */
function judgeDemaShortEntry(kLineData, closeDemaArr, ema50Arr, state, config) {
    if (!kLineData || kLineData.length < 1) return false;
    if (!closeDemaArr || closeDemaArr.length < 2) return false;

    const holdBars = config.demaSignalHoldBars || 50;

    // 获取当前和上一根K线的DEMA数据
    const [dema1, dema2, dema3] = getLastFromArr(closeDemaArr, 3);
    if (!dema1 || !dema2 || !dema3) return false;

    // if (!state.demaShortSignalStartKLine) {
    //     const crossCondition = dema3.demaShort < dema3.demaLong && dema1.demaShort > dema1.demaLong;
    //     if (crossCondition) {
    //         state.demaShortSignalStartKLine = state.currentKLineCount;
    //     } else {
    //         if (state.currentKLineCount - state.demaShortSignalStartKLine > holdBars) {
    //             state.demaShortSignalStartKLine = null;
    //             return false;
    //         }
    //     }
    // }

    const [currentKLine] = getLastFromArr(kLineData, 1);
    if (!currentKLine) return false;

    const { open, close, high } = currentKLine;

    const condition0 = dema3.demaShort < dema3.demaLong && dema1.demaShort > dema1.demaLong;
    const condition1 = close < dema3.demaShort;
    const condition2 = high >= dema3.demaShort;
    const condition3 = close < open;

    return condition0// && condition1 && condition2 && condition3;
}

/**
 * 判断流动性扫单检测入场条件（做多）
 * 扫低点：low < lowest(low,20) AND close > lowest(low,20)
 * 识别假突破，扫了下方流动性后价格反弹向上
 * @param {Array} kLineData - K线数据数组
 * @param {number} lookback - 回看周期，默认20
 * @returns {boolean} 是否满足流动性扫单做多条件
 */
function judgeLiquiditySweepLongEntry(kLineData, lookback = 20) {
    if (!kLineData || kLineData.length < lookback + 1) {
        return false;
    }

    const [currentKLine] = getLastFromArr(kLineData, 1);
    if (!currentKLine) {
        return false;
    }

    // 获取过去lookback根K线的最低价
    const recentLows = kLineData.slice(-lookback - 1, -1).map(kLine => kLine.low);
    const lowestLow = Math.min(...recentLows);

    // 条件1：low < lowest(low,20) - 当前K线的最低价低于过去20根K线的最低价
    const condition1 = currentKLine.low < lowestLow;
    
    // 条件2：close > lowest(low,20) - 收盘价高于过去20根K线的最低价
    const condition2 = currentKLine.close > lowestLow;

    return condition1 && condition2;
}

/**
 * 判断流动性扫单检测入场条件（做空）
 * 扫高点：high > highest(high,20) AND close < highest(high,20)
 * 识别假突破，扫了上方流动性后价格回落向下
 * @param {Array} kLineData - K线数据数组
 * @param {number} lookback - 回看周期，默认20
 * @returns {boolean} 是否满足流动性扫单做空条件
 */
function judgeLiquiditySweepShortEntry(kLineData, lookback = 20) {
    if (!kLineData || kLineData.length < lookback + 1) {
        return false;
    }

    const [currentKLine] = getLastFromArr(kLineData, 1);
    if (!currentKLine) {
        return false;
    }

    // 获取过去lookback根K线的最高价
    const recentHighs = kLineData.slice(-lookback - 1, -1).map(kLine => kLine.high);
    const highestHigh = Math.max(...recentHighs);

    // 条件1：high > highest(high,20) - 当前K线的最高价高于过去20根K线的最高价
    const condition1 = currentKLine.high > highestHigh;
    
    // 条件2：close < highest(high,20) - 收盘价低于过去20根K线的最高价
    const condition2 = currentKLine.close < highestHigh;

    return condition1 && condition2;
}

/**
 * 判断趋势密度校验条件
 * 趋势密度 = count(close > EMA200, 50) / 50
 * 做多条件：trendDensity > 0.6
 * 做空条件：trendDensity < 0.4
 * @param {Array} kLineData - K线数据数组
 * @param {Array} ema200Arr - EMA200数组
 * @param {string} direction - 交易方向 "up" 或 "down"
 * @param {number} emaPeriod - EMA周期，默认200
 * @param {number} lookback - 回看周期，默认50
 * @returns {boolean} 是否通过趋势密度校验
 */
function judgeTrendDensity(kLineData, ema200Arr, direction, emaPeriod = 200, lookback = 50) {
    if (!kLineData || kLineData.length < emaPeriod + lookback) {
        return false;
    }

    if (!ema200Arr || ema200Arr.length < lookback) {
        return false;
    }

    if (direction !== "up" && direction !== "down") {
        return false;
    }

    // 统计过去lookback根K线中，有多少根的 close > 对应的 EMA200
    let count = 0;
    
    // 从当前K线往前数lookback根
    for (let i = 0; i < lookback; i++) {
        const kLineIndex = kLineData.length - 1 - i;
        const kLine = kLineData[kLineIndex];
        const ema200Index = ema200Arr.length - 1 - i;
        const ema200 = ema200Arr[ema200Index];
        
        if (!kLine || ema200 === null || ema200 === undefined) {
            continue;
        }

        // 判断该K线的 close 是否 > EMA200
        if (kLine.close > ema200) {
            count++;
        }
    }

    // 计算趋势密度
    const trendDensity = count / lookback;

    // 做多条件：trendDensity > 0.6
    if (direction === "up") {
        return trendDensity > 0.6;
    }
    
    // 做空条件：trendDensity < 0.4
    if (direction === "down") {
        return trendDensity < 0.4;
    }

    return false;
}

/**
 * 市场状态识别（Regime Map）
 * 识别当前市场状态：趋势上涨、趋势下跌、震荡市场
 * @param {Array} kLineData - K线数据数组
 * @param {Array} adxArr - ADX指标数组
 * @param {Array} ema200Arr - EMA200数组
 * @param {Array} rsiArr - RSI数组
 * @param {number} adxPeriod - ADX周期，默认14
 * @param {number} emaPeriod - EMA周期，默认200
 * @param {number} rsiPeriod - RSI周期，默认14
 * @param {number} atrPeriod - ATR周期，默认14
 * @param {number} atrSmaPeriod - ATR的SMA周期，默认50
 * @returns {Object} 市场状态对象 { regime, allowTrading, allowedDirections }
 */
function judgeRegimeMap(kLineData, adxArr, ema200Arr, rsiArr, adxPeriod = 14, emaPeriod = 200, rsiPeriod = 14, atrPeriod = 14, atrSmaPeriod = 50) {
    // 默认返回值
    const defaultResult = {
        regime: "UNKNOWN",
        allowTrading: false,
        allowedDirections: "none"
    };

    if (!kLineData || kLineData.length < Math.max(emaPeriod, atrPeriod + atrSmaPeriod)) {
        return defaultResult;
    }

    if (!adxArr || adxArr.length < 1) {
        return defaultResult;
    }

    // 获取当前K线数据
    const [currentKLine] = getLastFromArr(kLineData, 1);
    if (!currentKLine) {
        return defaultResult;
    }

    // 获取ADX数据
    const [adxData] = getLastFromArr(adxArr, 1);
    if (!adxData || !adxData.ADX0) {
        return defaultResult;
    }

    const adx = adxData.ADX0;
    const close = currentKLine.close;

    // 从 state 中获取EMA200
    const [ema200] = getLastFromArr(ema200Arr, 1);
    if (ema200 === null || ema200 === undefined) {
        return defaultResult;
    }

    // 从 state 中获取RSI
    const [rsi] = getLastFromArr(rsiArr, 1);
    if (rsi === null || rsi === undefined) {
        return defaultResult;
    }

    // 判断趋势上涨（TREND_UP）
    // 条件：ADX(14) > 25 AND close > EMA200 AND RSI > 55
    if (adx > 25 && close > ema200 && rsi > 55) {
        return {
            regime: "TREND_UP",
            allowTrading: true,
            allowedDirections: "both" // 允许做空、做多
        };
    }

    // 判断趋势下跌（TREND_DOWN）
    // 条件：ADX > 25 AND close < EMA200 AND RSI < 45
    if (adx > 25 && close < ema200 && rsi < 45) {
        return {
            regime: "TREND_DOWN",
            allowTrading: true,
            allowedDirections: "down" // 只做空
        };
    }

    // 判断震荡市场（RANGE）
    // 条件：ADX < 20 AND ATR < SMA(ATR,50)
    if (adx < 20) {
        // 计算ATR
        const atrResult = calculateATR(kLineData, atrPeriod);
        if (atrResult && atrResult.atr !== null && atrResult.atr !== undefined) {
            const currentATR = atrResult.atr;
            
            // 计算SMA(ATR,50)
            // 需要获取过去50根K线的ATR值来计算SMA
            if (kLineData.length >= atrPeriod + atrSmaPeriod) {
                const atrValues = [];
                // 计算过去atrSmaPeriod根K线对应的ATR值
                for (let i = 0; i < atrSmaPeriod; i++) {
                    const kLineSlice = kLineData.slice(0, kLineData.length - i);
                    if (kLineSlice.length >= atrPeriod) {
                        const atrSliceResult = calculateATR(kLineSlice, atrPeriod);
                        if (atrSliceResult && atrSliceResult.atr !== null && atrSliceResult.atr !== undefined) {
                            atrValues.push(atrSliceResult.atr);
                        }
                    }
                }
                
                if (atrValues.length >= atrSmaPeriod) {
                    const smaATR = calculateSimpleMovingAverage(atrValues, atrSmaPeriod);
                    if (smaATR !== null && smaATR !== undefined && currentATR < smaATR) {
                        return {
                            regime: "RANGE",
                            allowTrading: false,
                            allowedDirections: "none" // 不交易
                        };
                    }
                }
            }
        }
    }

    // 其他情况返回UNKNOWN
    return defaultResult;
}

/**
 * 检测趋势爆发（Trend Explosion）
 * 根据建议总结.md中的定义：
 * - 压缩阶段：BB_upper < KC_upper AND BB_lower > KC_lower (squeezeOn)
 * - 释放阶段：BB_upper > KC_upper OR BB_lower < KC_lower (squeezeRelease)
 * - 爆发确认：ATR > ATR_MA * 1.3 AND volume > SMA(volume,20)*1.8
 * - 最终：trendExplosion = squeezeRelease AND volatilityExpansion AND volumeExplosion
 * @param {Array} kLineData - K线数据数组
 * @param {Array} superTrendArr - SuperTrend数组（包含ATR）
 * @param {Array} volumeSmaArr - Volume SMA数组
 * @param {Array} bbKeltnerSqueezeArr - BBKeltner Squeeze数组
 * @returns {Object} 返回 { squeezeOn, squeezeRelease, trendExplosion }
 */
function detectTrendExplosion(kLineData, superTrendArr, volumeSmaArr, bbKeltnerSqueezeArr) {
    const defaultResult = {
        squeezeOn: false,
        squeezeRelease: false,
        trendExplosion: false
    };

    if (!kLineData || kLineData.length < 50) {
        return defaultResult;
    }

    if (!superTrendArr || superTrendArr.length < 1) {
        return defaultResult;
    }

    // 获取当前K线数据
    const [currentKLine] = getLastFromArr(kLineData, 1);
    if (!currentKLine) {
        return defaultResult;
    }

    // 从 state 中获取 keltnerResult 对象
    const [keltnerResult] = getLastFromArr(bbKeltnerSqueezeArr, 1);
    
    // 检查值是否有效
    if (!keltnerResult || !keltnerResult.squeeze || keltnerResult.squeeze.length === 0) {
        return defaultResult;
    }

    // 提取最后一个 squeeze 值
    const squeeze = keltnerResult.squeeze[keltnerResult.squeeze.length - 1];
    
    // 检查 squeeze 值是否有效
    if (squeeze === null || squeeze === undefined) {
        return defaultResult;
    }

    // 压缩阶段：squeeze 为 true
    const squeezeOn = squeeze;

    // 释放阶段：squeeze 为 false
    const squeezeRelease = !squeeze;

    // 获取当前ATR
    const [superTrend3] = getLastFromArr(superTrendArr, 1);
    if (!superTrend3 || !superTrend3.atr) {
        return { squeezeOn, squeezeRelease, trendExplosion: false };
    }

    const currentATR = superTrend3.atr;

    // 计算ATR的移动平均（需要至少50根K线）
    let atrMA = null;
    if (superTrendArr.length >= 50) {
        const atrValues = [];
        for (let i = 0; i < 50; i++) {
            const superTrend = superTrendArr[superTrendArr.length - 1 - i];
            if (superTrend && superTrend.atr !== null && superTrend.atr !== undefined) {
                atrValues.push(superTrend.atr);
            }
        }
        if (atrValues.length >= 50) {
            atrMA = calculateSimpleMovingAverage(atrValues, 50);
        }
    }

    // 从 state 中获取成交量的移动平均
    const [volumeSMA] = getLastFromArr(volumeSmaArr, 1);

    // 爆发确认：ATR > ATR_MA * 1.3 AND volume > SMA(volume,20)*1.8
    const volatilityExpansion = atrMA !== null && currentATR > atrMA * 1.3;
    const volumeExplosion = volumeSMA !== null && volumeSMA !== undefined && currentKLine.volume > volumeSMA * 1.8;

    // 最终：trendExplosion = squeezeRelease AND volatilityExpansion AND volumeExplosion
    const trendExplosion = squeezeRelease && volatilityExpansion && volumeExplosion;

    return {
        squeezeOn,
        squeezeRelease,
        trendExplosion
    };
}

/**
 * 判断趋势爆发入场条件（做多）
 * 条件：
 * 1. trendExplosion == true（趋势爆发确认）
 * 2. close > EMA50
 * 3. RSI > 55
 * 4. 突破结构：highest(close,10) > highest(high,30)
 * @param {Array} kLineData - K线数据数组
 * @param {Array} superTrendArr - SuperTrend数组
 * @param {Array} ema50Arr - EMA50数组
 * @param {Array} rsiArr - RSI数组
 * @param {Array} volumeSmaArr - Volume SMA数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {boolean} 是否满足做多条件
 */
function judgeTrendExplosionLongEntry(kLineData, superTrendArr, ema50Arr, rsiArr, volumeSmaArr, bbKeltnerSqueezeArr, state, config) {
    if (!kLineData || kLineData.length < 50) {
        return false;
    }

    // 检测趋势爆发
    const explosionResult = detectTrendExplosion(kLineData, superTrendArr, volumeSmaArr, bbKeltnerSqueezeArr);
    if (!explosionResult.trendExplosion) {
        return false;
    }

    // 获取当前K线
    const [currentKLine] = getLastFromArr(kLineData, 1);

    const { close } = currentKLine;

    // 从 state 中获取EMA50
    const [ema50] = getLastFromArr(ema50Arr, 1);
    if (ema50 === null || ema50 === undefined) {
        return false;
    }

    // 条件1：close > EMA50
    if (close <= ema50) {
        return false;
    }

    // 从 state 中获取RSI
    const [rsi] = getLastFromArr(rsiArr, 1);
    console.log("@@@ ~ judgeTrendExplosionLongEntry ~ close >= ema50:", {
        close, ema50, rsi
    });
    if (rsi === null || rsi === undefined) {
        return false;
    }

    // 条件2：RSI > 55
    if (rsi <= 55) {
        return false;
    }

    // 条件3：突破结构 - close > highest(high,30)
    if (kLineData.length < 30) {
        return false;
    }

    // 获取最近30根K线的最高价
    const recent30Highs = kLineData.slice(-20).map(k => k.high);
    const highestHigh30 = Math.max(...recent30Highs);

    // 突破结构：close > highest(high,30)
    if (close > highestHigh30) {
        return false;
    }

    return true;
}

/**
 * 判断趋势爆发入场条件（做空）
 * 条件：
 * 1. trendExplosion == true（趋势爆发确认）
 * 2. close < EMA50
 * 3. RSI < 45
 * 4. 突破结构：close < lowest(low,30)
 * @param {Array} kLineData - K线数据数组
 * @param {Array} superTrendArr - SuperTrend数组
 * @param {Array} ema50Arr - EMA50数组
 * @param {Array} rsiArr - RSI数组
 * @param {Array} volumeSmaArr - Volume SMA数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {boolean} 是否满足做空条件
 */
function judgeTrendExplosionShortEntry(kLineData, superTrendArr, ema50Arr, rsiArr, volumeSmaArr, bbKeltnerSqueezeArr, state, config) {
    if (!kLineData || kLineData.length < 50) {
        return false;
    }

    // 检测趋势爆发
    const explosionResult = detectTrendExplosion(kLineData, superTrendArr, volumeSmaArr, bbKeltnerSqueezeArr);
    if (!explosionResult.trendExplosion) {
        return false;
    }

    // 获取当前K线
    const [currentKLine] = getLastFromArr(kLineData, 1);

    const { close } = currentKLine;

    // 从 state 中获取EMA50
    const [ema50] = getLastFromArr(ema50Arr, 1);
    if (ema50 === null || ema50 === undefined) {
        return false;
    }

    // 条件1：close < EMA50
    if (close >= ema50) {
        return false;
    }

    // 从 state 中获取RSI
    const [rsi] = getLastFromArr(rsiArr, 1);
    console.log("@@@ ~ judgeTrendExplosionShortEntry ~ close >= ema50:", {
        close, ema50, rsi
    });
    if (rsi === null || rsi === undefined) {
        return false;
    }

    // 条件2：RSI < 45
    if (rsi >= 45) {
        return false;
    }

    // 条件3：突破结构 - close < lowest(low,30)
    if (kLineData.length < 30) {
        return false;
    }

    // 获取最近30根K线的最低价
    const recent30Lows = kLineData.slice(-20).map(k => k.low);
    const lowestLow30 = Math.min(...recent30Lows);

    // 突破结构：close < lowest(low,30)
    if (close < lowestLow30) {
        return false;
    }

    return true;
}

module.exports = {
    judgeTradingDirection,
    calculateTradingSignal,
    updateLongTrendUpperReachCount,
    updateShortTrendLowerReachCount,
    judgeVolumeFilter,
    judgeLiquiditySweepLongEntry,
    judgeLiquiditySweepShortEntry,
    judgeTrendDensity,
    judgeRegimeMap,
};
