const { getDate, getLastFromArr } = require("../utils/functions");
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
} = require("../utils/kLineTools");
const { calculateKDJs } = require("../utils/KDJ");
const { calculateBBKeltnerSqueeze } = require("../utils/BBKeltner");
const calculateRSI = require("../utils/rsi_marsi");
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

// let bollArr = [];
// let rsiArr = [];
let emaShortArr = [];
let emaLongArr = [];
const MA_RSI = { rsiLength: 14, smaLength: 20 };
let EMA_SHORT = 3;
let EMA_LONG = 9;


let kdjPeroid = 20;
let bbkPeroid = 20;
let KDJ = [10, 90];

let kdjs = [];
let bbkRes = {};

let isUpOpen = false;
let isDownOpen = false;

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

const initEveryIndex = (curKLines, historyClosePrices) => {
    const len = historyClosePrices.length;
    for (let i = len - 20; i < len; i++) {
        setEveryIndex(curKLines.slice(0, i), historyClosePrices.slice(0, i));
    }
};
const setEveryIndex = (curKLines, historyClosePrices) => {
    // 计算 boll
    // setBollArr(historyClosePrices);
    // 计算 kdj
    setKDJ(curKLines, historyClosePrices);
    // 计算 ema
    setEmaArr(historyClosePrices);
};
// const setBollArr = (historyClosePrices) => {
//     bollArr.length >= 10 && bollArr.shift();
//     const { B2basis, B2upper, B2lower } = calculateBoll(historyClosePrices, B2Period, B2mult);
//     bollArr.push({
//         B2basis: B2basis[B2basis.length - 1],
//         B2upper: B2upper[B2upper.length - 1],
//         B2lower: B2lower[B2lower.length - 1],
//     });
// };
const setKDJ = (curKLines, historyClosePrices) => {
    kdjs = calculateKDJs(curKLines, kdjPeroid);
    bbkRes = calculateBBKeltnerSqueeze(curKLines, bbkPeroid);
};
const setEmaArr = (historyClosePrices) => {
    emaShortArr.length >= 10 && emaShortArr.shift();
    emaShortArr.push(calculateEMA(historyClosePrices, EMA_SHORT));

    emaLongArr.length >= 10 && emaLongArr.shift();
    emaLongArr.push(calculateEMA(historyClosePrices, EMA_LONG));
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
    }
    if (targetTime) {
        targetTime = params.targetTime;
        let start = kLineData.findIndex((v) => v.openTime === targetTime);
        _kLineData = [...kLineData].slice(start - 30);
    }
    const preKLines = _kLineData.slice(0, 30);
    const prePrices = preKLines.map((v) => v.close);
    initEveryIndex(preKLines, prePrices);
    for (let idx = 31; idx < _kLineData.length; idx++) {
        const curKLines = _kLineData.slice(idx - 30, idx + 1);
        const historyClosePrices = curKLines.map((v) => v.close);

        candleHeight = brickSize * 2; // calculateCandleHeight(_kLineData.slice(idx - 12, idx + 1));

        // 设置各种指标
        setEveryIndex(curKLines, [...historyClosePrices]);

        const curkLine = _kLineData[idx];
        const { open, close, openTime, closeTime, low, high } = curkLine;

        let [kLine0, kLine1, kLine2, kLine3] = getLastFromArr(curKLines, 4);
        // let { B2basis, B2upper, B2lower } = boll5;
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
            // trend === "up" 时收到连续三根阴线，立即平仓
            
            const kdj = kdjs[kdjs.length - 1];
            if (
                hasOrder &&
                trend === "up" &&
                !firstStopProfitRate &&
                (kdj.j < KDJ[1]) //  || (isYin(kLine0) && isYin(kLine1) && isYin(kLine2) && isYin(kLine3))
            ) {
                zhibiaoWinNum += 1;
                setProfit(orderPrice, close, openTime);
                reset();
                continue;
            }
            // trend === "down" 时收到连续三根阳线，立即平仓
            if (
                hasOrder &&
                trend === "down" &&
                !firstStopProfitRate &&
                (kdj.j > KDJ[0]) // ||  (isYang(kLine0) && isYang(kLine1) && isYang(kLine2) && isYang(kLine3))
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
    // let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);
    let [emaShort1, emaShort2, emaShort3, emaShort4, emaShort5] = getLastFromArr(emaShortArr, 5);
    let [emaLong1, emaLong2, emaLong3, emaLong4, emaLong5] = getLastFromArr(emaLongArr, 5);
    
    const kdj = kdjs[kdjs.length - 1];
    const { B2basis, B2upper, B2lower, Kma, Kupper, Klower, squeeze } = bbkRes;
    const len = B2basis.length;
    const curB2basis = B2basis[len - 1];
    const curB2upper = B2upper[len - 1];
    const curB2lower = B2lower[len - 1];
    const curKma = Kma[len - 1];
    const curKupper = Kupper[len - 1];
    const curKlower = Klower[len - 1];
    const isSqueeze = squeeze[len - 1];

    let { openTime, high, low, close } = kLine5;

    // 第一, 挤压
    // 第二, 在挤压的范围内收盘在布林通道的下线, 并且KDJ小于20以下
    // 第三, 此时准备开多
    const upTerm1 = isSqueeze;
    const upTerm2 = close < curB2lower; //  && isBigAndYin(curkLine, 0.4)
    const upTerm3 = kdj.j < KDJ[0];
    if (isUpOpen && upTerm1 && upTerm2 && upTerm3) {
        readyTradingDirection = "up";
        // if (upTerm3 && upTerm4) {
        //     stopLoss = kLine3.low;
        // } else {
        //     stopLoss = 0;
        // }
        return;
    }
    // 第一, 挤压
    // 第二, 在挤压的范围内收盘在布林通道的上线, 并且KDJ大于80以上
    // 第三, 此时准备开空
    const downTerm1 = isSqueeze;
    const downTerm2 = close > curB2upper; // && isBigAndYang(curkLine, 0.4)
    const downTerm3 = kdj.j > KDJ[1];
    if (isDownOpen && downTerm1 && downTerm2 && downTerm3) {
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

    let { openTime, high, low, open, close } = kLine3;

    // let { B2basis, B2upper, B2lower } = boll5;

    
    const kdj = kdjs[kdjs.length - 1];

    let max = Math.max(kLine1.high, kLine2.high, kLine3.high);
    let min = Math.min(kLine1.low, kLine2.low, kLine3.low);

    // 计算ATR
    const atr = 0; // brickSize*2; // calculateATR(kLines, slAtrPeriod).atr;
    // console.log("🚀 ~ calculateTradingSignal ~ atr:", atr)

    const signalUpTerm0 = readyTradingDirection === "up" && close > open;
    const signalUpTerm1 = kdj.j > KDJ[0];

    if (signalUpTerm0 && signalUpTerm1) {
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

    const signalDownTerm0 = readyTradingDirection === "down" && close < open;
    const signalDownTerm1 = kdj.j < KDJ[1];
    if (signalDownTerm0 && signalDownTerm1) {
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
        `./tests/data/${symbol}-renko-bbk.js`,
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
    B2Period: 15, // boll周期
    B2mult: 1.5, // boll倍数
    howManyCandle: 5, // 初始止盈，（盈亏比 4 到 10 收益一样，都走了指标止盈，最低有 3 * 0.4 保底）
    firstStopProfitRate: 3, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
    firstProtectProfitRate: 0.4, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
    firstStopLossRate: 0.1, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
    isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
    profitProtectRate: 0.6, //isProfitRun === 1 时生效，保留多少利润
    howManyCandleForProfitRun: 0.5,
    maxStopLossRate: 0.03, // 止损小于10%的情况，最大止损5%
    invalidSigleStopRate: 0.1, // 止损在10%，不开单
    slAtrPeriod: 14,
    double: 1, // 是否损失后加倍开仓
    maxLossCount: 20, // 损失后加倍开仓，最大倍数
    // targetTime: "2025-01-01_00-00-00",
    closeLastOrder: true, // 最后一单是否平仓
    isUpOpen: true,
    isDownOpen: true,
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