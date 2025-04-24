const { getDate, getLastFromArr, getSequenceArr } = require("../utils/functions.js");
const {
    isYang,
    isYin,
} = require("../utils/kLineTools.js");
const calculateRSI = require("../utils/rsi_marsi.js");
const { calculateBollingerBands } = require("../utils/boll.js");
const { calculateSimpleMovingAverage, calculateEMA } = require("../utils/ma.js");
const { calculateTSI } = require("../utils/tsi.js");
const { getSmaRatio } = require("../utils/renko.js");
const { calculateWilliamsR } = require("../utils/williams.js");
const { calculateMACD } = require("../utils/macd.js");
const fs = require("fs");
const symbol = "1000pepeUSDT"; // 1000pepeUSDT

let { kLineData } = require(`./source/renko-${symbol}-1m.js`);
// let { kLineData } = require(`./${symbol}2.js`);

let lastRenkoClose = null;
let brickSize = 0.0005;
let priorityFee = 0.0007

const DefaultAvailableMoney = 10;
let maxAvailableMoney = 0;
let _kLineData = [...kLineData];
console.log("kLineData.length:", _kLineData.length);
let double = 0;
let lossCount = 0;
let maxLossCount = 2;
let availableMoney = 0;
let howManyCandle = 1;
let isProfitRun = 0;
let firstStopProfitRate = 0;
let slippage = 0;
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
let compoundInterest = 0;

let curStopLoss = 0; // 如果达到最终止损就计数一次,每次开单后重置未当前止损点
let curStopProfit = 0; // 如果达到最终止盈就计数一次,每次开单后重置未当前止盈点

let stopLoss = 0;
let maxLoss = {};

// const getQuantity = (currentPrice) => {
//     availableMoney = DefaultAvailableMoney * (1 + lossCount);
//     if (maxAvailableMoney < availableMoney) maxAvailableMoney = availableMoney;
//     return Math.round(availableMoney / currentPrice);
// };

const times = getSequenceArr(2, 150); // [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536] //

const getQuantity = (currentPrice) => {
    // 额外资金
    const extraMoney = (compoundInterest && testMoney > 0 ? (testMoney > 5000 ? 5000: testMoney) : 0);
    availableMoney = DefaultAvailableMoney * times[lossCount] + extraMoney;
    // 修改time有可能会成功平仓但是不盈利的情况，所以用改availableMoney的方式
    if (availableMoney > maxAvailableMoney) maxAvailableMoney = availableMoney;
    let q = Math.round(availableMoney / currentPrice);
    // q = q * 1000 % 2 === 0 ? q : q + 0.002;
    return q;
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
let maxLossMoney = 0;
let maxLossMoneyPercent = 0;
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

let bollArr = [];
let bollDisArr= [];
let ratioArr=[];
let rsiArr = [];
let macdArr = [];
let tsiArr = [];
let volArr = [];
let williamsArr = [];
let emaShortArr = [];
let emaLongArr = [];
const MA_RSI = { rsiLength: 9, smaLength: 9 };
const MACD = [9 * 1, 26 * 1, 9 * 1];
let EMA_SHORT = 9;
let EMA_LONG = 20;

let highArr = [];
let lowArr = [];
// 指标趋势
let indexTrend = 'hold'; // up down breakAndUp breakAndDown hold
const MOD_HIGH = 'MOD_HIGH';
const MOD_LOW = 'MOD_LOW';
let preAction = '';

let isUpOpen = false;
let isDownOpen = true;

const highLowTimes = [];
const highLowPrices = [];

const setProfit = (orderPrice, currentPrice, time) => {
    let curTestMoney = 0;
    if (trend === "up") {
        curTestMoney =
            quantity * (currentPrice - orderPrice) -
            quantity * (orderPrice + currentPrice) * priorityFee;
    }
    if (trend === "down") {
        curTestMoney =
            quantity * (orderPrice - currentPrice) -
            quantity * (orderPrice + currentPrice) * priorityFee;
    }
    testMoney += curTestMoney;
    if (double) {
        if (curTestMoney <= 0) {
            lossCount = lossCount + 1 > maxLossCount ? maxLossCount : lossCount + 1;
        } else {
            // lossCount = lossCount > 1 ? lossCount - 1 : 0;
            lossCount = 0;
        }
    }
    if (curTestMoney < 0) {
        failNum++;
        minMoney = minMoney + curTestMoney;
        if (minMoney < maxLossMoney) {
            maxLossMoney = minMoney;
            maxLossMoneyPercent = (maxLossMoney / (DefaultAvailableMoney * times[0] + testMoney)) * 100;
        }
    }
    if (curTestMoney > 0) {
        winNum++;
        minMoney = 0;
    }
    if (testMoney > maxMoney) maxMoney = testMoney;
    curTestMoneyHistory.push(curTestMoney);
    testMoneyHistory.push(testMoney);
    closeHistory.push(time);
    closePriceHistory.push(currentPrice);
    trendHistory.push(trend);
    // 最大亏损值
    setMinMoney(curTestMoney);
    if (maxLoss[lossCount]) {
        maxLoss[lossCount]++;
    } else {
        maxLoss[lossCount] = 1;
    }
};
const setMinMoney = (curTestMoney) => {
    if (curTestMoney < maxStopLossMoney) maxStopLossMoney = curTestMoney;
};

const initEveryIndex = (historyClosePrices, klines) => {
    const len = historyClosePrices.length;
    for (let i = len - 10; i <= len; i++) {
        setEveryIndex(historyClosePrices.slice(i - 20, i), klines.slice(i - 20, i)); // 其他策略，这里也有问题??????对比一下
    }
};
const setEveryIndex = (historyClosePrices, klines) => {
    // 计算 boll
    setBollArr(historyClosePrices, klines);
    // 计算 rsi
    setRsiArr(historyClosePrices);
    // 计算 ema
    setEmaArr(historyClosePrices);
    // 计算tsi
    // setTsiArr(historyClosePrices);
    // 计算vol
    // setVolArr(klines);
    // 计算Williams
    // setWilliamsArr(klines);
    setMacdArr(historyClosePrices);
};
const setBollArr = (historyClosePrices, klines) => {
    const boll = calculateBollingerBands(historyClosePrices, B2Period, B2mult);
    if (!boll) return;
    bollArr.length >= 10 && bollArr.shift();
    bollArr.push(boll);
    bollDisArr.push(boll.B2upper - boll.B2lower);
    const ratio = getSmaRatio(getLastFromArr(bollArr, 3).map(v => v.B2basis));
    ratioArr.push(ratio);

    // 计算高低点
    // setHighLowArr(boll, klines[klines.length - 1]);
};
// 储存高低点
const setHighLowArr = (boll, curKline) => {
    const { B2basis, B2upper, B2lower } = boll;
    const { close, openTime } = curKline;
    const preHigh = highArr[highArr.length - 1] || close; // 可能不合适，后续修改
    const preLow = lowArr[lowArr.length - 1] || close; // 可能不合适，后续修改
    if (close >= B2upper) {
        // 本次创了高点，但是上一次操作是更新低点，认为是新的高点
        if (preAction !== MOD_HIGH) {
            highArr.push(close);
            // ---------highLowTimes/highLowPrices-------------start
            highLowTimes.push(openTime);
            highLowPrices.push(['high', close]);
            // ---------highLowTimes/highLowPrices-------------end
            preAction = MOD_HIGH;
            return;
        }
    }

    // 和上次一样的操作，认为是调整高点
    if (preAction === MOD_HIGH) {
        if (close > preHigh) {
            highArr[highArr.length - 1] = close;
            // ---------highLowTimes/highLowPrices-------------start
            highLowTimes[highLowTimes.length - 1] = openTime;
            highLowPrices[highLowPrices.length - 1] = ['high', close];
            // ---------highLowTimes/highLowPrices-------------end
            preAction = MOD_HIGH;
            return;
        }
    }
    if (close <= B2lower) {
        // 本次创了低点，但是上一次操作是更新高点，认为是新的低点
        if (preAction !== MOD_LOW) {
            lowArr.push(close);
            // ---------highLowTimes/highLowPrices-------------start
            highLowTimes.push(openTime);
            highLowPrices.push(['low', close]);
            // ---------highLowTimes/highLowPrices-------------end
            preAction = MOD_LOW;
            return;
        }
    }
    // 和上次一样的操作，认为是调整低点
    if (preAction === MOD_LOW) {
        if (close < preLow) {
            lowArr[lowArr.length - 1] = close;
            // ---------highLowTimes/highLowPrices-------------start
            highLowTimes[highLowTimes.length - 1] = openTime;
            highLowPrices[highLowPrices.length - 1] = ['low', close];
            // ---------highLowTimes/highLowPrices-------------end
            preAction = MOD_LOW;
            return;
        }
    }
};
const setRsiArr = (historyClosePrices) => {
    // rsiArr.length >= 10 && rsiArr.shift(); // 正式环境放开
    rsiArr.push(calculateRSI(historyClosePrices, MA_RSI));
};
const setMacdArr = (historyClosePrices) => {
    // macdArr.length >= 10 && macdArr.shift(); // 正式环境放开
    macdArr.push(calculateMACD(historyClosePrices, MACD));
};
const setTsiArr = (historyClosePrices) => {
    tsiArr.length >= 10 && tsiArr.shift();
    const tsis = calculateTSI(historyClosePrices);
    tsiArr.push(tsis[tsis.length - 1]);
};
const setWilliamsArr = (klines) => {
    williamsArr.length >= 10 && williamsArr.shift();
    const williams = calculateWilliamsR(klines, 14);
    williamsArr.push(williams);
};
const setVolArr = (klines) => {
    const volumes = klines.map(v => v.volume);
    volArr.length >= 10 && volArr.shift();
    // 计算成交量均值
    const volMA = calculateSimpleMovingAverage(volumes, 5);
    volArr.push(volMA);
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
    compoundInterest = 0;
    double = 0;
    lossCount = 0;
    maxLossCount = 2;
    firstStopProfitRate = 0;
    slippage = 0;
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
        priorityFee = params.priorityFee;
        howManyCandle = params.howManyCandle;
        isProfitRun = params.isProfitRun;
        compoundInterest = params.compoundInterest;
        B2Period = params.B2Period;
        B2mult = params.B2mult;
        firstStopProfitRate = params.firstStopProfitRate;
        slippage = params.slippage;
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
        _kLineData = [...kLineData].slice(start - 10);
    }
    const preKLines = _kLineData.slice(0, 30);
    const prePrices = preKLines.map((v) => v.close);
    initEveryIndex(prePrices, preKLines);
    for (let idx = 31; idx < _kLineData.length; idx++) {
        const curKLines = _kLineData.slice(idx - 30, idx);
        const historyClosePrices = curKLines.map((v) => v.close);

        // 设置各种指标
        setEveryIndex([...historyClosePrices], [...curKLines]);

        const curkLine = _kLineData[idx];
        const { open, close, openTime, closeTime, low, high } = curkLine;

        let [kLine0, kLine1, kLine2, kLine3] = getLastFromArr(curKLines, 4);
        let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);
        let { B2basis, B2upper, B2lower } = boll5;
        // console.log("🚀 ~ start ~ B2basis, B2upper, B2lower:", B2basis, B2upper, B2lower)

        // 准备开仓
        if (readyTradingDirection === "hold") {
            // 初略判断趋势
            judgeTradingDirection(curKLines);
            // 指标判断趋势
            // judgeTradingDirectionByIndex(getLastFromArr(curKLines, 5));
        }
        if (!hasOrder && readyTradingDirection !== "hold") {
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

            //////////////////////////// 指标移动止损位置 /////////////////////////// start
            // trend === "up" 时，close超出上轨，就移动止损点
            // if (
            //     hasOrder &&
            //     trend === "up" &&
            //     firstStopLossRate &&
            //     (close >= B2upper) // || (isYin(kLine0) && isYin(kLine1) && isYin(kLine2) && isYin(kLine3))
            // ) {
            //     TP_SL[0] = orderPrice - brickSize * 1.5;
            //     firstStopLossRate = 0;
            //     continue;
            // }
            // // trend === "down" ，close超出下轨，就移动止损点
            // if (
            //     hasOrder &&
            //     trend === "down" &&
            //     firstStopLossRate &&
            //     (close <= B2lower) // || (isYang(kLine0) && isYang(kLine1) && isYang(kLine2) && isYang(kLine3))
            // ) {
            //     TP_SL[1] = orderPrice + brickSize * 1.5;
            //     firstStopLossRate = 0;
            //     continue;
            // }
            //////////////////////////// 指标移动止损位置 /////////////////////////// end

            // 判断止损
            if (trend) {
                // 判断止损
                if (trend === "up") {
                    // low 小于 point1 就止损，否则继续持有
                    if (close <= point1) {
                        firstStopProfitRate && (arriveLastStopLoss++);
                        setProfit(orderPrice, point1*(1-slippage), openTime);
                        reset();
                        continue;
                    }
                    // 初次止盈
                    if (typeof firstStopProfitRate !== "undefined" && firstStopProfitRate) {
                        // const firstProfitPrice = orderPrice + Math.abs(orderPrice - point1) * firstStopProfitRate; // (开仓价 - 止损)* 初始止盈倍数
                        const firstProfitPrice = orderPrice + brickSize * firstStopProfitRate;
                        if (close >= firstProfitPrice) {
                            TP_SL[0] =
                                orderPrice +
                                Math.abs(orderPrice - firstProfitPrice) * firstProtectProfitRate;
                            firstStopProfitRate = 0;
                            firstStopLossRate = 0; // 防止同时触发止损
                            arrivefirstStopProfit++;
                            continue;
                        }
                    }
                    // 初次止损
                    if (firstStopLossRate) {
                        const firstStopPrice = orderPrice - Math.abs(orderPrice - point1) * firstStopLossRate;
                        if (close <= firstStopPrice) {
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
                    if (close >= point2) { // || Math.abs(close - point2) < 0.000001
                        firstStopProfitRate && (arriveLastStopLoss++);
                        setProfit(orderPrice, point2*(1+slippage), openTime);
                        reset();
                        continue;
                    }
                    // 初次止盈
                    if (typeof firstStopProfitRate !== "undefined" && firstStopProfitRate) {
                        // const firstProfitPrice = orderPrice - Math.abs(orderPrice - point2) * firstStopProfitRate; // (开仓价 - 止损)* 初始止盈倍数
                        const firstProfitPrice = orderPrice - brickSize * firstStopProfitRate;
                        if (close <= firstProfitPrice) {
                            TP_SL[1] = orderPrice - Math.abs(orderPrice - firstProfitPrice) * firstProtectProfitRate;
                            firstStopProfitRate = 0;
                            firstStopLossRate = 0; // 防止同时触发止损
                            arrivefirstStopProfit++;
                            continue;
                        }
                    }
                    // 初次止损
                    if (firstStopLossRate) {
                        const firstStopPrice =
                            orderPrice + Math.abs(orderPrice - point2) * firstStopLossRate;
                        if (close >= firstStopPrice) {
                            TP_SL[1] = Math.abs(close + point2) / 2; // 取currentPrice 、 point2的中间值
                            firstStopLossRate = 0;
                            arriveFirstStopLoss++;
                            continue;
                        }
                    }
                }
            }

            // 判断止盈
            if (trend) {
                if (isProfitRun) {
                    // 移动止盈
                    // 判断止盈：上面没有被止损，那看是否能止盈，high 大于 point2 就止盈利，否则继续持有
                    if (trend === "up" && (close >= point2)) { //  || Math.abs(close - point2) < 0.000001
                        TP_SL = [
                            orderPrice + Math.abs(point2 - orderPrice) * profitProtectRate, // 止损(这个收益高点)
                            // point2 - brickSize * howManyCandleForProfitRun, // 止损
                            point2 + brickSize * howManyCandleForProfitRun, // 止盈
                        ];
                        // -------------辅助统计------------start
                        if (curStopProfit && close >= curStopProfit) {
                            curStopProfit = 0;
                            curStopLoss = 0;
                            if (!isArriveLastStopProfit) {
                                arriveLastStopProfit++;
                                isArriveLastStopProfit = true;
                            }
                        }
                        // -------------辅助统计------------end
                        continue;
                    }
                    // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
                    if (trend === "down" && (close <= point1)) { //  || Math.abs(close - point1) < 0.000001
                        TP_SL =
                        TP_SL = [
                            point1 - brickSize * howManyCandleForProfitRun, // 止盈
                            orderPrice - Math.abs(orderPrice - point1) * profitProtectRate, // 止损(这个收益高点)
                            // point1 + brickSize * howManyCandleForProfitRun, // 止损
                        ];
                        // -------------辅助统计------------start
                        if (curStopProfit && close <= curStopProfit) {
                            curStopProfit = 0;
                            curStopLoss = 0;
                            if (!isArriveLastStopProfit) {
                                arriveLastStopProfit++;
                                isArriveLastStopProfit = true;
                            }
                        }
                        // -------------辅助统计------------end
                        continue;
                    }
                } else {
                    // 判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
                    if (trend === "up" && (close >= point2)) { // || Math.abs(close - point2) < 0.000001
                        TP_SL =
                        setProfit(orderPrice, close, openTime);
                        reset();
                        arriveLastStopProfit++;
                        isArriveLastStopProfit = true;
                        continue;
                    }
                    // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
                    if (hasOrder && trend === "down" && (close <= point1)) { // || Math.abs(close - point1) < 0.000001
                        setProfit(orderPrice, close, openTime);
                        reset();
                        arriveLastStopProfit++;
                        isArriveLastStopProfit = true;
                        continue;
                    }
                }
            }

            //////////////////////////// 指标止盈 /////////////////////////// start
            // trend === "up" 时收到连续三根阴线，立即平仓
            if (
                hasOrder &&
                trend === "up" &&
                !firstStopProfitRate &&
                // isArriveLastStopProfit &&
                (close <= B2lower) //  || Math.abs(close - B2lower) < 0.000001
            ) {
                zhibiaoWinNum += 1;
                setProfit(orderPrice, close, openTime); // 正式环境可能此时还没有收盘 ???? 但是boll值变化不大可以直接对比
                reset();
                continue;
            }
            // trend === "down" 时收到连续三根阳线，立即平仓
            if (
                hasOrder &&
                trend === "down" &&
                !firstStopProfitRate &&
                // isArriveLastStopProfit &&
                (close >= B2upper)//   || Math.abs(close - B2upper) < 0.000001
            ) {
                zhibiaoWinNum += 1;
                setProfit(orderPrice, close, openTime); // 正式环境可能此时还没有收盘 ???? 但是boll值变化不大可以直接对比
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
const judgeTradingDirection = (curKLines) => {
    const lines = curKLines;
    let [kLine1, kLine2, kLine3, kLine4, kLine5] = getLastFromArr(lines, 5);
    let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);
    let [high3, high4, high5] = getLastFromArr(highArr, 3);
    let [low3, low4, low5] = getLastFromArr(lowArr, 3);
    let [rsi1, rsi2, rsi3, rsi4, rsi5] = getLastFromArr(rsiArr, 5);
    let [bollDis1, bollDis2, bollDis3, bollDis4, bollDis5] = getLastFromArr(bollDisArr, 5);
    let [ratio1, ratio2, ratio3, ratio4, ratio5] = getLastFromArr(ratioArr, 5);
    let [macd1, macd2, macd3, macd4, macd5] = getLastFromArr(macdArr, 5);
    let [emaShor1, emaShor2, emaShor3, emaShor4, emaShor5] = getLastFromArr(emaShortArr, 5);
    let [emaLong1, emaLong2, emaLong3, emaLong4, emaLong5] = getLastFromArr(emaLongArr, 5);

    let { openTime, closeTime, high, low, close } = kLine5;
    let { B2basis, B2upper, B2lower } = boll5;

    // 反转做多
    const upTerm1 = isYin(kLine3) && isYin(kLine4) && isYang(kLine5);
    const upTerm2 = false // isYang(kLine2) && isYin(kLine3) && isYang(kLine4) && isYang(kLine5) && kLine1.open < boll1.B2basis && kLine4.close > boll4.B2basis;
    // const upTerm3 = macd4 && macd5.macd > macd4.macd;
    // const upTerm4 = rsi5.rsi < rsi5.smoothedRsi && rsi5.rsi > 50;
 
    if (isUpOpen && (upTerm1 || upTerm2)) { // && upTerm2 && upTerm4
        readyTradingDirection = "up";
        return;
    }
    // 反转做空
    const downTerm1 = isYang(kLine3) && isYang(kLine4) && isYin(kLine5);
    const downTerm2 = false // isYin(kLine2) && isYang(kLine3) && isYin(kLine4) && isYin(kLine5) && kLine1.open > boll1.B2basis && kLine4.close < boll4.B2basis;
    // const downTerm3 = macd4 && macd5.macd < macd4.macd;
    // const downTerm4 = rsi5.rsi > rsi5.smoothedRsi && rsi5.rsi < 50;

    if (isDownOpen && (downTerm1 || downTerm2)) {//  && downTerm2 && downTerm4
        readyTradingDirection = "down";
        return;
    }
    readyTradingDirection = "hold";
};
// 指标确认趋势
const judgeTradingDirectionByIndex = (kLines) => {
    let [kLine1, kLine2, kLine3, kLine4, kLine5] = kLines;
    let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);

    let { openTime, open, high, low, close } = kLine5;
    let { B2basis, B2upper, B2lower } = boll5;

    const max = Math.max(kLine5.open, kLine5.close, kLine4.open, kLine4.close, kLine3.open, kLine3.close, kLine2.open, kLine2.close, kLine1.open, kLine1.close);
    const min = Math.min(kLine5.open, kLine5.close, kLine4.open, kLine4.close, kLine3.open, kLine3.close, kLine2.open, kLine2.close, kLine1.open, kLine1.close);

    const [high5] = getLastFromArr(highArr, 1);
    const [low5] = getLastFromArr(lowArr, 1);
    // 可能high/low还没有形成
    if (isUpOpen && readyTradingDirection === "up") {

        // // 价格结构为顶顶高+底底高 ==> 多头
        // if (
        //     max >= high5 && high5 > high4 && // 顶顶高
        //     close > low5 && low5 > low4 // 底底高 low5不能下破low4
        // ) {
        //     readyTradingDirection = "up";
        //     return;
        // }
        // // 横盘-已经有最新高点的突破单(右侧交易，要确认)
        // if (
        //     high5 > high4 && Math.abs(high5 - high4) > brickSize * 3 && // 突破
        //     Math.abs(high3 - high4) <= brickSize * 3 && // 顶 high3,high4 接近 (确认横盘)
        //     Math.abs(low5 - low4) <= brickSize * 3 && // 低 low5,ow4 接近 (确认横盘)
        //     Math.abs(min - high4) <= brickSize * 3 && // 没有下破前高，支撑有效
        //     close >= high4 // 确认突破
        // ) {
        //     readyTradingDirection = "up";
        //     return;
        // }
        // // 横盘-没有最新高点的突破单(右侧交易，要确认)
        // if (
        //     max >= high5 && Math.abs(high5 - high4) > brickSize * 3 && // 突破
        //     Math.abs(high3 - high4) <= brickSize * 3 && // 顶 high3,high4 接近 (确认横盘)
        //     Math.abs(low5 - low4) <= brickSize * 3 && // 低 low5,ow4 接近 (确认横盘)
        //     Math.abs(min - high4) <= brickSize * 3 && // 没有下破前高，支撑有效
        //     close >= high4 // 确认突破
        // ) {
        //     readyTradingDirection = "up";
        //     return;
        // }
        // W底(左侧交易，不用确认)
        if (
            // (Math.abs(low5 - low4) <= brickSize*2 || Math.abs(low5 - open) <= brickSize*2 ) && // /w底
            close < low5 + Math.abs(high5 - low5) / 2 // 折价区做多
            // close > low5 &&
            // close > B2lower && close < B2basis // 在布林带下方
        ) {
            readyTradingDirection = "up";
            return;
        }
    }

    if (isDownOpen && readyTradingDirection === "down") {

        // // 价格结构为顶顶低+底底低 ==> 空头
        // if (
        //     high3 > high4 && high4 > high5 && // 顶顶低
        //     low3 > low4 && low4 > low3 && // 顶顶低
        //     Math.abs(high4 - high3) > brickSize * 3 && // 高点高度差要大一点
        //     Math.abs(high5 - high4) > brickSize * 3 &&
        //     Math.abs(low5 - low4) > brickSize * 3 && // 低点高度差要大一点
        //     Math.abs(low4 - low3) > brickSize * 3
        // ) {
        //     readyTradingDirection = "down";
        //     return;
        // }

        // 价格结构为突破顶顶高+底底高 ==> 多转空
        // high4 high5 可以相等（M顶）
        // if (
        //     low1 > low2 && low2 > low3 && low3 && // low1,low2,low3底底低
        //     high1 > high2 && high2 > high3 && // high1,high2,high3顶顶低
        //     Math.abs(low1 - low2) > brickSize * 3 && // 高点高度差要大一点
        //     Math.abs(low2 - low3) > brickSize * 3 &&
        //     Math.abs(high1 - high2) > brickSize * 3 && // 低点高度差要大一点
        //     Math.abs(high2 - high3) > brickSize * 3 &&
        //     Math.abs(low5 - high4) <= brickSize * 3 && // low5和high4要接近
        //     high5 > high4 && Math.abs(high5 - high4) >= brickSize * 2 // high5要突破前高high4
        // ) {
        //     readyTradingDirection = "down";
        //     return;
        // }
        // 头肩底
        // if ((high2 > high3 && high2 > high4 && high5 > high4 && high5 > high3) && (low3 < Math.min(high3, high4) && low5 < Math.min(high3, high4) && low4 < Math.min(low3, low5)) && high5 < high2 && low2 > low5 && low2 > low3) {
        //     readyTradingDirection = "down";
        //     return;
        // }
        // M顶(左侧交易，不用确认)
        if (
            // (Math.abs(high5 - high4) <= brickSize*2 || Math.abs(high5 - open) <= brickSize*2 )&& // M顶
            close > high5 - Math.abs(high5 - low5) / 2 // 溢价区做空
            // close < high5 &&
            // close < B2upper && close > B2basis // 在布林带上方
        ) {
            readyTradingDirection = "down";
            return;
        }
    }

    readyTradingDirection = "hold";
};
const judgeBreakTradingDirection = (kLines) => {
    let [kLine1, kLine2, kLine3, kLine4, kLine5] = kLines;
    let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);

    let { openTime, high, low, close } = kLine5;
    let { B2basis, B2upper, B2lower } = boll5;

    const max = Math.max(kLine5.open, kLine5.close, kLine4.open, kLine4.close, kLine3.open, kLine3.close, kLine2.open, kLine2.close, kLine1.open, kLine1.close);
    const min = Math.min(kLine5.open, kLine5.close, kLine4.open, kLine4.close, kLine3.open, kLine3.close, kLine2.open, kLine2.close, kLine1.open, kLine1.close);

    const [high1, high2, high3, high4, high5] = getLastFromArr(highArr, 5);
    const [low1, low2, low3, low4, low5] = getLastFromArr(lowArr, 5);

    if (readyTradingDirection === "up") {
        // 不能买在成本区，要买在溢价区(分割线是斐波拉契中间位置)，只做深度回调
        const upTerm1 = max >= high5 && high5 > high4 && close > low5 && low5 > low4; // 底底高
        // 均线向下
        const upTerm2 = boll5.B2basis < boll4.B2basis && boll4.B2basis < boll3.B2basis;
        // M顶看空，不能做多
        const upTerm3 = Math.abs(high4 - high5) <= brickSize * 3 && close < low4;
        if ((upTerm1 || upTerm2)) {
            readyTradingDirection = "hold";
            return;
        }
    }
    if (readyTradingDirection === "down") {
        // 不能买在成本区，要买在溢价区(分割线是斐波拉契中间位置)，只做深度回调
        const downTerm1 = Math.abs(low5 - low4) <= brickSize * 2 && close >= low5; // w底
        const downTerm2 = max >= high5 && high5 > high4 && close > low5 && low5 > low4; // 底底高
        const downTerm3 = false;

        if (downTerm1 || downTerm2 || downTerm3) {
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
    const [curkLine] = kLines.slice(-1);
    const trendInfo = calculateTradingSignal(kLines);
    const { trend: _trend, stopLoss, stopProfit } = trendInfo;
    curStopLoss = stopLoss;
    curStopProfit = stopProfit;

    if (curkLine.openTime === '2025-04-15_00-59-5921') {
        console.log("🚀🚀🚀🚀🚀🚀🚀", curkLine, stopLoss, stopProfit)
    }
    // 开单
    switch (_trend) {
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

    let { openTime, high, low, open, close, isNewLine } = kLine3;

    let { B2basis, B2upper, B2lower } = boll5;

    // let max = Math.max(kLine1.high, kLine2.high, kLine3.high);
    // let min = Math.min(kLine1.low, kLine2.low, kLine3.low);
    let max = Math.max(kLine1.close, kLine2.close, kLine3.close, kLine1.open, kLine2.open, kLine3.open);
    let min = Math.min(kLine1.close, kLine2.close, kLine3.close, kLine1.open, kLine2.open, kLine3.open);

    // 计算ATR
    const atr = brickSize * 0.5; // calculateATR(kLines, slAtrPeriod).atr;
    // console.log("🚀 ~ calculateTradingSignal ~ atr:", atr)

    const signalUpTerm0 = readyTradingDirection === "up" && close > open;
    const signalUpTerm1 = true// isNewLine 

    if (signalUpTerm0 && signalUpTerm1) {
        min = min - atr; // stopLoss ? stopLoss : min - atr;
        if (min < close * (1 - invalidSigleStopRate)) {
            return {
                trend: "hold",
            };
        }
        if (min < close * (1 - maxStopLossRate)) min = close * (1 - maxStopLossRate);
        return {
            trend: "up",
            stopLoss: min, // 止损
            stopProfit: close + brickSize * howManyCandle // (close - min) * howManyCandle, // 止盈
        };
    }

    const signalDownTerm0 = readyTradingDirection === "down" && close < open;
    const signalDownTerm1 = true// isNewLine
    if (signalDownTerm0 && signalDownTerm1) {
        max = max + atr; // stopLoss ? stopLoss : max + atr;
        if (max > close * (1 + invalidSigleStopRate)) {
            return {
                trend: "hold",
            };
        }
        if (max > close * (1 + maxStopLossRate)) max = close * (1 + maxStopLossRate);
        return {
            trend: "down",
            stopLoss: max, // 止损
            stopProfit: close - brickSize * howManyCandle // (max - close) * howManyCandle, // 止盈
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
        maxLossMoney: "最大回撤: " + maxLossMoney.toFixed(2) + "U" + '（' + (maxLossMoneyPercent).toFixed(2) + '%）',
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
        `./tests/data/${symbol}-renko-boll.js`,
        `
        var openHistory = ${JSON.stringify(openHistory, null, 2)}
        var closeHistory = ${JSON.stringify(closeHistory, null, 2)}
        var trendHistory = ${JSON.stringify(trendHistory, null, 2)}
        var openPriceHistory = ${JSON.stringify(openPriceHistory, null, 2)}
        var closePriceHistory = ${JSON.stringify(closePriceHistory, null, 2)}
        var curTestMoneyHistory = ${JSON.stringify(curTestMoneyHistory, null, 2)}
        var highLowTimes = ${JSON.stringify(highLowTimes, null, 2)}
        var highLowPrices = ${JSON.stringify(highLowPrices, null, 2)}
        var rsiArr = ${JSON.stringify(rsiArr, null, 2)}
        var macdArr = ${JSON.stringify(macdArr, null, 2)}
        var bollDisArr = ${JSON.stringify(bollDisArr, null, 2)}
        var ratioArr = ${JSON.stringify(ratioArr, null, 2)}
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
            curTestMoneyHistory,
            highLowPrices,
            highLowTimes,
            rsiArr,
            macdArr,
            bollDisArr,
            ratioArr,
        }
    `
    );
}

// let brickSize=0.0001; // 1000pepeUSDT 47.248%           676.6745428774299
// let brickSize=0.001; // dogeUSDT 41.099%                334.79242481879885
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
// let brickSize=0.25; // solUSDT     49.934%               296.88816265062336（本金太少）
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
    brickSize: 0.00006,
    priorityFee: 0.0007,
    slippage: 0.0002, // 滑点
    B2Period: 10, // boll周期
    B2mult: 1.5, // boll倍数
    howManyCandle: 3, // 初始止盈
    firstStopProfitRate: 1,// 2, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
    firstProtectProfitRate: 0.95, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
    firstStopLossRate: 0.5, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
    isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
    profitProtectRate: 0.95, //isProfitRun === 1 时生效，保留多少利润
    howManyCandleForProfitRun: 1,
    maxStopLossRate: 0.1, // 止损小于10%的情况，最大止损5%
    invalidSigleStopRate: 0.3, // 止损在10%，不开单
    double: 1, // 是否损失后加倍开仓
    maxLossCount: 20, // 损失后加倍开仓，最大倍数
    // targetTime: "2024-12-31_23-53-5921", // 1000pepe
    // targetTime: "2024-02-29_02-05-5921", // 1000pepe
    // targetTime: "2025-04-09_06-36-002", // doge
    closeLastOrder: true, // 最后一单是否平仓
    isUpOpen: true,
    isDownOpen: false,
    compoundInterest: 1, // 复利
});
module.exports = {
    evaluateStrategy: start,
};
