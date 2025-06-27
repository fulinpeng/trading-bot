const { getDate, getLastFromArr } = require("../utils/functions.js");
const {
    calculateCandleHeight,
    isBigLine,
    isBigAndYang,
    isBigAndYin,
    isBreakPreHigh,
    isBreakPreLow,
    isCross,
    isUpCross,
    isDownCross,
    isTopFractal,
    isBottomFractal,
    isDownLinesGroup2,
    isUpLinesGroup2,
    isDownLinesGroup3,
    isUpLinesGroup3,
    isDownSwallow,
    isUpSwallow,
    isBreakDown,
    isBreakUp,
    isDownStar,
    isUpStar,
    isHigherHigh,
    isLowerLow,
    isK1Swallow,
    isFourUp,
    isFourDown,
    downPao,
    upPao,
    isDownMa,
    isUpMa,
    isUpMacd,
    isDownMacd,
    isAllDownTail,
    isAllUpTail,
    isYang,
    isYin,
} = require("../utils/kLineTools.js");
const calculateNormalizedMACD = require("../utils/nmacd");
const calculateRSI = require("../utils/rsi_marsi.js");
const { calculateBoll } = require("../utils/boll.js");
const { calculateSimpleMovingAverage, calculateEMA } = require("../utils/ma.js");
const { calculateATR } = require("../utils/atr.js");
const fs = require("fs");
const symbol = "dogeUSDT";

let { kLineData } = require(`./source/renko-${symbol}-1m.js`);
// let { kLineData } = require(`./doge.js`);

let lastRenkoClose = null;
let brickSize=0.0005;

const DefaultAvailableMoney = 10;
let maxAvailableMoney = 0;
let _kLineData = [...kLineData];
console.log("kLineData.length:", _kLineData.length);
let double = 0;
let lossCount = 0;
let maxLossCount = 2;
let availableMoney = DefaultAvailableMoney * (1 + lossCount);
let howManyCandle = 1;
let isProfitRun = 0;
let firstStopProfitRate = 0;
let arriveLastStopLoss = 0;
let B2Period = 11; // boll周期
let B2mult = 1.5; // boll倍数
let firstProtectProfitRate = 0;
let firstStopLossRate = 0;
let profitProtectRate = 0.6;
let howManyCandleForProfitRun = 0.5;
let maxStopLossRate = 0.01;
let invalidSigleStopRate = 0.05;
let slAtrPeriod = 14;
let closeLastOrder = false;

let curStopLoss = 0;
let curStopProfit = 0;

let stopLoss = 0;
let maxLoss = {};
let rsiLowHigh = [20, 80]

const getQuantity = (currentPrice) => {
    availableMoney = DefaultAvailableMoney * (1 + lossCount);
    if (maxAvailableMoney < availableMoney) maxAvailableMoney = availableMoney;
    return Math.round(availableMoney / currentPrice);
};

let TP_SL = [];
let trend = "";

let winNum = 0;
let failNum = 0;
let testMoney = 0;
let quantity = 0;
let orderPrice = 0;
let maxMoney = 0;
let minMoney = 0;
let openHistory = [];
let closeHistory = [];
let trendHistory = [];
let openPriceHistory = [];
let closePriceHistory = [];
let testMoneyHistory = [];
let maxStopLossMoney = 0;
let curTestMoneyHistory = [];
let readyTradingDirection = "hold";
let hasOrder = false;
let candleHeight = 0;

let bollArr = [];
let rsiArr = [];
let nmacdArr = [];
let MA_RSI = { rsiLength: 14, smaLength: 14 };
let NMACD_PARAMS = { sma: 12, lma: 21, tsp: 9, np: 50, type: 1 };

let isUpOpen = false;
let isDownOpen = false;

const EMA_PERIOD = [12, 144, 169];
let emaFast = [];
let ema144 = [];
let ema169 = [];

const setProfit = (orderPrice, currentPrice, time) => {
    let curTestMoney = 0;
    if (trend === "up") {
        curTestMoney =
            quantity * (currentPrice - orderPrice) -
            quantity * (orderPrice + currentPrice) * 0.0007;
    }
    if (trend === "down") {
        curTestMoney =
            quantity * (orderPrice - currentPrice) -
            quantity * (orderPrice + currentPrice) * 0.0007;
    }
    testMoney += curTestMoney;
    if (double) {
        if (curTestMoney <= 0) {
            lossCount = lossCount + 1 > maxLossCount ? maxLossCount : lossCount + 1;
        } else {
            lossCount = 0;
        }
    }
    if (curTestMoney < -0) {
        failNum++;
    }
    if (curTestMoney > 0) {
        winNum++;
    }
    if (testMoney > maxMoney) maxMoney = testMoney;
    if (testMoney < minMoney) minMoney = testMoney;
    curTestMoneyHistory.push(curTestMoney);
    testMoneyHistory.push(testMoney);
    closeHistory.push(time);
    closePriceHistory.push(currentPrice);
    trendHistory.push(trend);
    // 最大亏损值
    setMinMoney(orderPrice, currentPrice);
    if (maxLoss[lossCount]) {
        maxLoss[lossCount]++;
    } else {
        maxLoss[lossCount] = 1
    }
};
const setMinMoney = (orderPrice, currentPrice, closeTime) => {
    let _testMoney = 0;
    if (trend === "up") {
        _testMoney =
            quantity * (currentPrice - orderPrice) -
            quantity * (orderPrice + currentPrice) * 0.0007;
    }
    if (trend === "down") {
        _testMoney =
            quantity * (orderPrice - currentPrice) -
            quantity * (orderPrice + currentPrice) * 0.0007;
    }
    if (_testMoney < maxStopLossMoney) maxStopLossMoney = _testMoney;
};

const initEveryIndex = (historyClosePrices) => {
    const len = historyClosePrices.length;
    for (let i = len - 20; i < len; i++) {
        setEveryIndex(historyClosePrices.slice(0, i));
    }
};
const setEveryIndex = (historyClosePrices) => {
    // 计算 boll
    setBollArr(historyClosePrices);
    // 计算 rsi
    setRsiArr(historyClosePrices);
    // 计算 nmacd
    setNmacdArr(historyClosePrices);
    // 计算 ema
    setEmaArr(historyClosePrices);
};
const setBollArr = (historyClosePrices) => {
    bollArr.length >= 10 && bollArr.shift();
    const { B2basis, B2upper, B2lower } = calculateBoll(historyClosePrices, B2Period, B2mult);
    bollArr.push({
        B2basis: B2basis[B2basis.length - 1],
        B2upper: B2upper[B2upper.length - 1],
        B2lower: B2lower[B2lower.length - 1],
    });
};
const setRsiArr = (historyClosePrices) => {
    rsiArr.length >= 10 && rsiArr.shift();
    rsiArr.push(calculateRSI(historyClosePrices, MA_RSI));
};
const setNmacdArr = (historyClosePrices) => {
    nmacdArr.length >= 10 && nmacdArr.shift();
    nmacdArr.push(calculateNormalizedMACD(historyClosePrices, NMACD_PARAMS));
};
const setEmaArr = (historyClosePrices) => {
    emaFast.length >= 10 && emaFast.shift();
    ema144.length >= 10 && ema144.shift();
    ema169.length >= 10 && ema169.shift();

    // emaFast.push(calculateEMA(historyClosePrices, EMA_PERIOD[0]));
    ema144.push(calculateEMA(historyClosePrices, EMA_PERIOD[1]));
    // ema169.push(calculateEMA(historyClosePrices, EMA_PERIOD[2]));
};

const resetInit = () => {
    _kLineData = [...kLineData];
    howManyCandle = 1;
    isProfitRun = 0;
    double = 0;
    lossCount = 0;
    maxLossCount = 2;
    firstStopProfitRate = 0;
    B2Period = 11; // boll周期
    B2mult = 1.5; // boll倍数
    firstProtectProfitRate = 0;
    firstStopLossRate = 0;
    profitProtectRate = 0.6;
    howManyCandleForProfitRun = 0.5;
    maxStopLossRate = 0.01;
    invalidSigleStopRate = 0.02;
    TP_SL = [];
    trend = "";
    winNum = 0;
    failNum = 0;
    testMoney = 0;
    quantity = 0;
    orderPrice = 0;
    maxMoney = 0;
    minMoney = 0;
    openHistory = [];
    closeHistory = [];
    trendHistory = [];
    testMoneyHistory = [];
    readyTradingDirection = "hold";
    hasOrder = false;
    candleHeight = 0;
    ema144 = [];
    ema169 = [];
    targetTime = null;
    slAtrPeriod = 14;
    rsiLowHigh = [20, 80]
};
let arriveLastStopProfit = 0;
let arrivefirstStopProfit = 0;
let arriveFirstStopLoss = 0;
let zhibiaoWinNum = 0;
let isArriveLastStopProfit = false;
const start = (params) => {
    // 每次需要初始化 ???? 检查初始化是否覆盖所有全局变量
    resetInit();
    if (params) {
        brickSize = params.brickSize;
        howManyCandle = params.howManyCandle;
        isProfitRun = params.isProfitRun;
        B2Period = params.B2Period;
        B2mult = params.B2mult;
        firstStopProfitRate = params.firstStopProfitRate;
        firstProtectProfitRate = params.firstProtectProfitRate;
        firstStopLossRate = params.firstStopLossRate;
        profitProtectRate = params.profitProtectRate;
        howManyCandleForProfitRun = params.howManyCandleForProfitRun;
        maxStopLossRate = params.maxStopLossRate;
        invalidSigleStopRate = params.invalidSigleStopRate;
        slAtrPeriod = params.slAtrPeriod;
        double = params.double;
        maxLossCount = params.maxLossCount;
        targetTime = params.targetTime;
        closeLastOrder = params.closeLastOrder;
        isUpOpen = params.isUpOpen;
        isDownOpen = params.isDownOpen;
        rsiLowHigh = params.rsiLowHigh;
    }
    if (targetTime) {
        targetTime = params.targetTime;
        let start = kLineData.findIndex((v) => v.openTime === targetTime);
        _kLineData = [...kLineData].slice(start - 200);
    }
    const preKLines = _kLineData.slice(0, 200);
    const prePrices = preKLines.map((v) => v.close);
    initEveryIndex(prePrices);
    for (let idx = 201; idx < _kLineData.length; idx++) {
        const curKLines = _kLineData.slice(idx - 200, idx + 1);
        const historyClosePrices = curKLines.map((v) => v.close);

        candleHeight = brickSize * 2; // calculateCandleHeight(_kLineData.slice(idx - 12, idx));

        // 设置各种指标
        setEveryIndex([...historyClosePrices]);

        const curkLine = _kLineData[idx];
        const { open, close, openTime, closeTime, low, high } = curkLine;

        let [kLine0, kLine1, kLine2, kLine3] = getLastFromArr(curKLines, 4);
        let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);
        let { B2basis, B2upper, B2lower } = boll5;
        // console.log("🚀 ~ start ~ B2basis, B2upper, B2lower:", B2basis, B2upper, B2lower)

        // 准备开仓
        if (readyTradingDirection === "hold") {
            // 判断趋势
            judgeTradingDirection(getLastFromArr(curKLines, 5));
        } else {
            // 趋势是否被破坏
            // judgeBreakTradingDirection(getLastFromArr(curKLines, 5));
        }
        if (!hasOrder) {
            // 开仓：没有仓位就根据 readyTradingDirection 开单
            // 开单完成后会重置 readyTradingDirection
            if (readyTradingDirection !== "hold") {
                judgeAndTrading(curKLines, params);
            }
            continue;
        }
        // 有仓位就准备平仓
        else {

            const [point1, point2] = TP_SL;
            // 判断止损
            if (trend) {
                // 判断止损
                if (trend === "up") {
                    // low 小于 point1 就止损，否则继续持有
                    if (low <= point1) {
                        arriveLastStopLoss++;
                        setProfit(orderPrice, point1, openTime);
                        reset();
                        continue;
                    }
                    // 初次止盈
                    if (firstStopProfitRate) {
                        const firstProfitPrice =
                            orderPrice + Math.abs(orderPrice - point1) * firstStopProfitRate;
                        if (close > firstProfitPrice) {
                            // 到初始止盈点时，并且该k线是阴线，移动止损到开仓价，避免盈利回撤
                            // if (close<open) {
                            // 减少止损
                            TP_SL[0] =
                                orderPrice +
                                Math.abs(orderPrice - firstProfitPrice) * firstProtectProfitRate;
                            firstStopProfitRate = 0;
                            firstStopLossRate = 0; // 防止同时触发止损
                            arrivefirstStopProfit++;
                            continue;
                            // }
                        }
                    }
                    // 初次止损
                    if (firstStopLossRate) {
                        const firstStopPrice =
                            orderPrice - Math.abs(orderPrice - point1) * firstStopLossRate;
                        if (close < firstStopPrice) {
                            // 到初始止损点时，并且该k线是大阴线，移动止损到该k线的下方，避免亏损太多
                            // 仓位还在，说明没有 low 没有触发止损，所以low在point1上方
                            // 0.8还是比较苛刻，比较难触发，所以不会频繁触发
                            // 这里不再修改止盈点，避免打破策略的平衡
                            // if (isBigAndYin(curkLine, 0.8)) {
                            // 移动止损到low下方
                            TP_SL[0] = Math.abs(close + point1) / 2; // 取currentPrice 、 point1的中间值
                            firstStopLossRate = 0;
                            arriveFirstStopLoss++;
                            continue;
                            // }
                        }
                    }
                }
                if (trend === "down") {
                    // high 大于 point2 就止损，否则继续持有
                    if (high >= point2) {
                        arriveLastStopLoss++;
                        setProfit(orderPrice, point2, openTime);
                        reset();
                        continue;
                    }
                    // 初次止盈
                    if (firstStopProfitRate) {
                        const firstProfitPrice = orderPrice - Math.abs(orderPrice - point2) * firstStopProfitRate;
                        if (close < firstProfitPrice) {
                            // 到初始止盈点时，并且该k线是阳线，移动止损到开仓价，避免盈利回撤
                            // if (close>open) {
                            // 减少止损
                            TP_SL[1] =
                                orderPrice -
                                Math.abs(orderPrice - firstProfitPrice) * firstProtectProfitRate;
                            firstStopProfitRate = 0;
                            firstStopLossRate = 0; // 防止同时触发止损
                            arrivefirstStopProfit++;
                            continue;
                            // }
                        }
                    }
                    // 初次止损
                    if (firstStopLossRate) {
                        const firstStopPrice =
                            orderPrice + Math.abs(orderPrice - point2) * firstStopLossRate;
                        if (close > firstStopPrice) {
                            // 到初始止损点时，并且该k线是大阳线，移动止损到该k线的上方，避免亏损太多
                            // 仓位还在，说明没有 high 没有触发止损，所以high在point2下方
                            // 0.8还是比较苛刻，比较难触发，所以不会频繁触发
                            // 这里不再修改止盈点，避免打破策略的平衡
                            // if (isBigAndYang(curkLine, 0.8)) {
                            // 减少止损
                            TP_SL[1] = Math.abs(close + point2) / 2; // 取currentPrice 、 point2的中间值
                            firstStopLossRate = 0;
                            arriveFirstStopLoss++;
                            continue;
                            // }
                        }
                    }
                }
            }

            // 修复止损
            // if (trend) {
            //     // 如果：上涨了两根k线，就移动止损到开仓价
            //     if (trend === "up") {
            //         if (close > orderPrice + brickSize * 2) {
            //             TP_SL[0] = TP_SL[0] < orderPrice ? orderPrice : TP_SL[0];
            //         }
            //     }
            //     // 如果：下跌了两根k线，就移动止损到开仓价
            //     if (trend === "down") {
            //         if (close < orderPrice - brickSize * 2) {
            //             TP_SL[1] = TP_SL[1] > orderPrice ? orderPrice : TP_SL[1];
            //         }
            //     }
            // }

            // 判断止盈
            if (trend) {
                if (isProfitRun) {
                    // 移动止盈
                    // 判断止盈：上面没有被止损，那看是否能止盈，high 大于 point2 就止盈利，否则继续持有
                    if (trend === "up" && close >= point2) {
                        TP_SL = [
                            orderPrice + Math.abs(point2 - orderPrice) * profitProtectRate,
                            point2 + candleHeight * howManyCandleForProfitRun,
                        ];
                        if (curStopProfit && close >= curStopProfit) {
                            curStopProfit = 0;
                            curStopLoss = 0;
                            if (!isArriveLastStopProfit) {
                                arriveLastStopProfit++;
                                isArriveLastStopProfit = true;
                                // setProfit(orderPrice, close, openTime);
                                // reset();
                                // continue;
                            }
                        }
                        continue;
                    }
                    // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
                    if (trend === "down" && close <= point1) {
                        TP_SL = [
                            point1 - candleHeight * howManyCandleForProfitRun,
                            orderPrice - Math.abs(orderPrice - point1) * profitProtectRate,
                        ];
                        if (curStopProfit && close <= curStopProfit) {
                            curStopProfit = 0;
                            curStopLoss = 0;
                            if (!isArriveLastStopProfit) {
                                arriveLastStopProfit++;
                                isArriveLastStopProfit = true;
                                // setProfit(orderPrice, close, openTime);
                                // reset();
                                // continue;
                            }
                        }
                        continue;
                    }
                } else {
                    // 判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
                    if (trend === "up" && close >= point2) {
                        setProfit(orderPrice, point2, openTime);
                        reset();
                        arriveLastStopProfit++;
                        continue;
                    }
                    // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
                    if (hasOrder && trend === "down" && close <= point1) {
                        setProfit(orderPrice, point1, openTime);
                        reset();
                        arriveLastStopProfit++;
                        continue;
                    }
                }
            }

            //////////////////////////// 指标止盈 /////////////////////////// start
            // trend === "up" 再次触碰上轨
            if (
                hasOrder &&
                trend === "up" &&
                !firstStopProfitRate &&
                (low < B2lower) //  || (isYin(kLine0) && isYin(kLine1) && isYin(kLine2) && isYin(kLine3))
            ) {
                zhibiaoWinNum += 1;
                setProfit(orderPrice, close, openTime);
                reset();
                continue;
            }
            // trend === "down"  再次触碰下轨
            if (
                hasOrder &&
                trend === "down" &&
                !firstStopProfitRate &&
                (high > B2upper ) // ||  (isYang(kLine0) && isYang(kLine1) && isYang(kLine2) && isYang(kLine3))
            ) {
                zhibiaoWinNum += 1;
                setProfit(orderPrice, close, openTime);
                reset();
                continue;
            }
            //////////////////////////// 指标止盈 /////////////////////////// end
        }
    }

    // 平仓最后一次
    if (hasOrder && closeLastOrder) {
        const len = _kLineData.length;
        const curkLine = _kLineData[len - 1];
        const { close, closeTime, openTime, low, high } = curkLine;
        setProfit(orderPrice, close, openTime);
        reset();
        return;
    }
};
const reset = () => {
    TP_SL = [];
    readyTradingDirection = "hold";
    trend = "";
    quantity = 0;
    orderPrice = 0;
    hasOrder = false;
};
// 指标判断方向 / 交易
const judgeTradingDirection = (kLines) => {
    let [kLine1, kLine2, kLine3, kLine4, kLine5] = kLines;
    let [rsi1, rsi2, rsi3, rsi4, rsi5] = getLastFromArr(rsiArr, 5);
    let [nmacd1, nmacd2, nmacd3, nmacd4, nmacd5] = getLastFromArr(nmacdArr, 5);
    let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);

    let { openTime, high, low, close } = kLine5;

    // let [ema12_0, preEma12, curEma12] = getLastFromArr(emaFast, 3);
    let [ema144_0, preEma144, curEma144] = getLastFromArr(ema144, 3);
    // let [ema169_0, preEma169, curEma169] = getLastFromArr(ema169, 3);

    // 反转做多
    // 准备条件: rsi 金叉
    // 准备条件: macd 金叉
    const upTerm1 = rsi5.rsi > rsi5.smoothedRsi && (rsi4.rsi < rsi4.smoothedRsi || rsi3.rsi < rsi3.smoothedRsi || rsi2.rsi < rsi2.smoothedRsi || rsi1.rsi < rsi1.smoothedRsi);
    const upTerm2 = (nmacd4.hist < 0 || nmacd3.hist < 0 || nmacd2.hist < 0 || nmacd1.hist < 0) && nmacd5.hist > 0;
    const upTerm3 = nmacd5.macNorm < 0 && nmacd5.trigger < 0;
    const upTerm4 = close > curEma144; // 趋势向上

    if (isUpOpen && (upTerm1 && upTerm2 && upTerm3) && upTerm4) {
        // console.log("🚀 ~ judgeTradingDirection up ~ rsi5.rsi:", rsi5.rsi)
        readyTradingDirection = "up";
        // if (upTerm3 && upTerm4) {
        //     stopLoss = kLine3.low;
        // } else {
        //     stopLoss = 0;
        // }
        return;
    }
    // 反转做空
    // 准备条件: rsi 死叉
    // 准备条件: macd 死叉
    const downTerm1 = rsi5.rsi < rsi5.smoothedRsi && (rsi4.rsi > rsi4.smoothedRsi || rsi3.rsi > rsi3.smoothedRsi || rsi2.rsi > rsi2.smoothedRsi || rsi1.rsi > rsi1.smoothedRsi);
    const downTerm2 = (nmacd4.hist > 0 || nmacd3.hist > 0 || nmacd2.hist > 0 || nmacd1.hist > 0) && nmacd5.hist < 0;
    const downTerm3 = nmacd5.macNorm > 0 && nmacd5.trigger > 0;
    const downTerm4 = close < curEma144; // 趋势向下

    if (isDownOpen && (downTerm1 && downTerm2 && downTerm3) && downTerm4) {
        // console.log("🚀 ~ judgeTradingDirection down ~ rsi5.rsi:", rsi5.rsi)
        readyTradingDirection = "down";
        // if (downTerm3 && downTerm4 && downTerm5) {
        //     console.log("🚀 ~ judgeTradingDirection ~ kLine5:", kLine5)
        //     stopLoss = kLine4.high;
        // } else {
        //     stopLoss = 0;
        // }
        return;
    }
    readyTradingDirection = "hold";
};
const judgeBreakTradingDirection = (kLines) => {
    let [, , kLine1, kLine2, kLine3] = kLines;
    let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);

    let { openTime, high, low, close } = kLine3;

    let { B2basis, B2upper, B2lower } = boll5;

    if (readyTradingDirection === "up") {
        // 多头被破坏
        const upTerm1 = close > B2basis;
        if (upTerm1) {
            readyTradingDirection = "hold";
            return;
        }
    }
    if (readyTradingDirection === "down") {
        // 空头被破坏
        const downTerm1 = close < B2basis;

        if (downTerm1) {
            readyTradingDirection = "hold";
            return;
        }
    }
};

// 设置网格
const setTP_SL = (trend, stopLoss, stopProfit, _currentPrice) => {
    if (trend === "up") {
        let _stopLoss = stopLoss; // 止损
        let _stopProfit = stopProfit; // 止盈
        TP_SL = [_stopLoss, _stopProfit];
        orderPrice = _currentPrice;
        quantity = getQuantity(_currentPrice);
    }

    if (trend === "down") {
        let _stopLoss = stopLoss; // 止损
        let _stopProfit = stopProfit; // 止盈
        orderPrice = _currentPrice;
        TP_SL = [_stopProfit, _stopLoss];
        quantity = getQuantity(_currentPrice);
    }
};
// 判断+交易
const judgeAndTrading = (kLines, params) => {
    // 根据指标判断是否可以开单
    const curkLine = kLines[kLines.length - 1];
    const trendInfo = calculateTradingSignal(kLines);
    const { stopLoss, stopProfit } = trendInfo;

    curStopLoss = stopLoss;
    curStopProfit = stopProfit;
    // 开单
    switch (trendInfo.trend) {
        case "up":
            trend = "up";
            setTP_SL("up", stopLoss, stopProfit, curkLine.close);
            readyTradingDirection = "hold";
            hasOrder = true;
            openHistory.push(curkLine.openTime); // 其实开单时间是：curkLine.closeTime，binance的时间显示的是open Time，方便调试这里记录openTime
            openPriceHistory.push(curkLine.close);
            firstStopProfitRate = params.firstStopProfitRate;
            firstStopLossRate = params.firstStopLossRate;
            isArriveLastStopProfit = false;
            break;
        case "down":
            trend = "down";
            setTP_SL("down", stopLoss, stopProfit, curkLine.close);
            readyTradingDirection = "hold";
            hasOrder = true;
            openHistory.push(curkLine.openTime); // 其实开单时间是：curkLine.closeTime，binance的时间显示的是open Time，方便调试这里记录openTime
            openPriceHistory.push(curkLine.close);
            firstStopProfitRate = params.firstStopProfitRate;
            firstStopLossRate = params.firstStopLossRate;
            isArriveLastStopProfit = false;
            break;
        default:
            break;
    }
};
const calculateTradingSignal = (kLines) => {
    let [kLine1, kLine2, kLine3] = getLastFromArr(kLines, 3);
    let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);
    let [rsi1, rsi2, rsi3, rsi4, rsi5] = getLastFromArr(rsiArr, 5);
    let [nmacd1, nmacd2, nmacd3, nmacd4, nmacd5] = getLastFromArr(nmacdArr, 5);

    let { openTime, high, low, open, close } = kLine3;

    let { B2basis, B2upper, B2lower } = boll5;

    let max = Math.max(kLine1.high, kLine2.high, kLine3.high, boll5.B2upper);
    let min = Math.min(kLine1.low, kLine2.low, kLine3.low, boll5.B2lower);

    // 计算ATR
    const atr = 0// brickSize * 2; // calculateATR(kLines, slAtrPeriod).atr;
    // console.log("🚀 ~ calculateTradingSignal ~ atr:", atr)

    const signalUpTerm0 = readyTradingDirection === "up" && close > open // && rsi5.rsi > rsiLowHigh[0];
    const signalUpTerm1 = rsi5.rsi > rsi5.smoothedRsi;
    const signalUpTerm2 = nmacd5.hist > 0 && nmacd5.macNorm < 0 && nmacd5.trigger < 0;

    if (signalUpTerm0 && signalUpTerm1 && signalUpTerm2) {
        min = stopLoss ? stopLoss : min - atr;
        if (min < close * (1 - invalidSigleStopRate)) {
            return {
                trend: "hold",
            };
        }
        if (min < close * (1 - maxStopLossRate)) min = close * (1 - maxStopLossRate);
        return {
            trend: "up",
            stopLoss: min, // 止损
            stopProfit: close + (close - min) * howManyCandle, // 止盈
        };
    }

    const signalDownTerm0 = readyTradingDirection === "down" && close < open // && rsi5.rsi < rsiLowHigh[1];
    const signalDownTerm1 = rsi5.rsi < rsi5.smoothedRsi;
    const signalDownTerm2 = nmacd5.hist < 0 && nmacd5.macNorm > 0 && nmacd5.trigger > 0;
    if (signalDownTerm0 && signalDownTerm1 && signalDownTerm2) {
        max = stopLoss ? stopLoss : max + atr;
        if (max > close * (1 + invalidSigleStopRate)) {
            return {
                trend: "hold",
            };
        }
        if (max > close * (1 + maxStopLossRate)) max = close * (1 + maxStopLossRate);
        return {
            trend: "down",
            stopLoss: max, // 止损
            stopProfit: close - (max - close) * howManyCandle, // 止盈
        };
    }
    return {
        trend: "hold",
    };
};
function writeInFile(fileName, str) {
    fs.writeFileSync(fileName, str, {
        flag: "w",
    });
}

function run(params) {
    start(params);
    const result = {
        ...params,
        xxx: "---------------------------------------------------",
        symbol,
        maxLoss: maxLoss,
        arrivefirstStopProfit: "初次止盈" + arrivefirstStopProfit + "次",
        arriveLastStopProfit: "最终止盈" + arriveLastStopProfit + "次",
        arriveFirstStopLoss: "初次止损" + arriveFirstStopLoss + "次",
        arriveLastStopLoss: "最终止损" + arriveLastStopLoss + "次",
        zhibiaoWinNum: "指标止盈" + zhibiaoWinNum + "次",
        availableMoney,
        maxAvailableMoney,
        winNum,
        failNum,
        testMoney,
        maxMoney,
        minMoney,
        maxStopLossMoney,
        winRate: ((winNum / (winNum + failNum)) * 100).toFixed(3) + "%",
    };
    console.log("最终结果::", result);
    console.log("length::", openHistory.length, closeHistory.length, trendHistory.length);
    // https://echarts.apache.org/examples/zh/editor.html?c=line-simple
    writeInFile(
        `./tests/data/${symbol}-renko-nmacd_boll_rsi.js`,
        `
        var openHistory = ${JSON.stringify(openHistory, null, 2)}
        var closeHistory = ${JSON.stringify(closeHistory, null, 2)}
        var trendHistory = ${JSON.stringify(trendHistory, null, 2)}
        var openPriceHistory = ${JSON.stringify(openPriceHistory, null, 2)}
        var closePriceHistory = ${JSON.stringify(closePriceHistory, null, 2)}
        var curTestMoneyHistory = ${JSON.stringify(curTestMoneyHistory, null, 2)}
        var valueFormatter = (value, index) => '[openTime:' + openHistory[index] + ']' + '\\n\\r' + 
        '[closeTime:' + closeHistory[index] + ']' + '\\n\\r' + 
        '[trend:' + trendHistory[index] + ']' + '\\n\\r' +
        '[openPrice:' + openPriceHistory[index] + ']' + '\\n\\r' +
        '[closePriceHistory:' + closePriceHistory[index] + ']' + '\\n\\r' +
        '[testMoney:' + value + ']' + '\\n\\r';


        var option = {
            xAxis: {
                type: "category",
                data: ${JSON.stringify(closeHistory, null, 2)},
            },
            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "cross",
                },
                valueFormatter,
                extraCssText: 'width:300px; white-space:pre-wrap' // 保留空格并支持换行
            },
            yAxis: {
                type: "value",
            },
            series: [
                {
                    name: "当前盈利",
                    data: ${JSON.stringify(testMoneyHistory, null, 2)},
                    type: "line",
                    markPoint: {
                        data: [
                            {
                                type: "max",
                                name: "Max",
                            },
                            {
                                type: "min",
                                name: "Min",
                            },
                        ],
                    },
                },
            ],
        }
        
        module.exports={
            option,
            openHistory,
            closeHistory,
            trendHistory,
            openPriceHistory,
            closePriceHistory,
            curTestMoneyHistory
        }
    `
    );
}

// let brickSize=0.00002; // 1000pepeUSDT 47.248%          676.6745428774299
// let brickSize=0.0005; // dogeUSDT 41.099%               334.79242481879885
// let brickSize=0.00022; // 1000flokiUSDT 52.291%         541.600737809018
// let brickSize=0.000025; // 1000shibUSDT 46.660%         576.1370031946369
// let brickSize=0.00002; // beamxUSDT 65.126%             809.614389214726
// let brickSize=0.00018; // bigtimeUSDT 69.971%           1037.5753243390354
// let brickSize=0.000005; // bomeUSDT 71.923%             1041.5386245702257
// let brickSize=0.000005; // ensUSDT 39.819%              696.3238596332271
// let brickSize=4.72; // ethUSDT 46.339%                  129.15324711808792（本金太少）
// let brickSize=0.00004; // iotxUSDT 61.466%              543.3166869659751
// let brickSize=0.03; // neoUSDT 51.911%                  432.3458672598648
// let brickSize=0.01635; // omUSDT 58.513%                279.67351464103785
// let brickSize=0.0026; // ondoUSDT 60.569%               648.5621767047146
// let brickSize=0.0026; // opUSDT 56.942%                 419.36635540227365
// let brickSize=0.00005; // peopleUSDT 69.289%            1231.2492383602412
// let brickSize=0.00012; // rareUSDT 65.894%              443.25436215309156 (不到一年)
// let brickSize=0.00025; // reefUSDT 78.947%              19.832373682214275
// let brickSize=0.4; // solUSDT     49.934%               296.88816265062336（本金太少）
// let brickSize=0.00005; // tokenUSDT   9.988%            573.4673581498979
// let brickSize=0.00022; // trxUSDT   48.461%             44.99995777755712
// let brickSize=0.0000092; // turboUSDT   71.311%         777.946767154285
// let brickSize=0.00003; // tUSDT   58.474%               492.0707743489717
// let brickSize=0.002; // wifUSDT   75.104%               1574.674446427944
// let brickSize=0.0031; // wldUSDT   69.746%              980.7008940285489
// let brickSize=0.00024; // wooUSDT   59.104%             425.1831198021458
// let brickSize=0.0006; // zetaUSDT   67.704%             921.1533628456452
// let brickSize=0.00022; // zkUSDT   60.924%              430.31042108253496
run({
    brickSize: 0.0005,
    B2Period: 30, // boll周期
    B2mult: 2, // boll倍数
    rsiLowHigh: [30, 70],
    howManyCandle: 4, // 初始止盈
    firstStopProfitRate: 3, // 1.5, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
    firstProtectProfitRate: 0.5, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
    firstStopLossRate: 0.1, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
    isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
    profitProtectRate: 0.5, //0.5, //isProfitRun === 1 时生效，保留多少利润
    howManyCandleForProfitRun: 1,
    maxStopLossRate: 0.03, // 止损小于10%的情况，最大止损5%
    invalidSigleStopRate: 0.1, // 止损在10%，不开单
    slAtrPeriod: 14,
    double: 1, // 是否损失后加倍开仓
    maxLossCount: 20, // 损失后加倍开仓，最大倍数
    // targetTime: "2025-01-01_00-00-00",
    closeLastOrder: true, // 最后一单是否平仓
    isUpOpen:true ,
    isDownOpen: false, // 这个策略不适合做空
});
// run({
//     brickSize: 0.0005,
//     B2Period: 20, // boll周期
//     B2mult: 2, // boll倍数
//     howManyCandle: 4, // 初始止盈，（盈亏比 4 到 10 收益一样，都走了指标止盈，最低有 3 * 0.4 保底）
//     firstStopProfitRate: 3, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
//     firstProtectProfitRate: 0.5, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
//     firstStopLossRate: 0.1, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
//     isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
//     profitProtectRate: 0.6, //isProfitRun === 1 时生效，保留多少利润
//     howManyCandleForProfitRun: 1,
//     maxStopLossRate: 0.03, // 止损小于10%的情况，最大止损5%
//     invalidSigleStopRate: 0.1, // 止损在10%，不开单
//     slAtrPeriod: 14,
//     double: 1, // 是否损失后加倍开仓
//     maxLossCount: 20, // 损失后加倍开仓，最大倍数
//     // targetTime: "2025-02-01_00-00-00",
//     closeLastOrder: true, // 最后一单是否平仓
// });
module.exports = {
    evaluateStrategy: start,
};


// 一种优化方式是，多空双开，处理，一个单子还未平，但是有了新的信号得问题，是不是可以一个制作多一个制作空啊