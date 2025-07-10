const { getDate, getLastFromArr, getSequenceArr } = require("../utils/functions.js");
const {
    isYang,
    isYin,
    isDownSwallow, isUpSwallow
} = require("../utils/kLineTools.js");
const calculateRSI = require("../utils/rsi_marsi.js");
const { calculateBollingerBands } = require("../utils/boll.js");
const { calculateSimpleMovingAverage, calculateEMA } = require("../utils/ma.js");
const { calculateSuperTrendOnRenko } = require("../utils/renkoSuperTrend.js");
const { calculateTSI } = require("../utils/tsi.js");
const { getSmaRatio } = require("../utils/renko.js");
const { calculateWilliamsR } = require("../utils/williams.js");
const { calculateMACD } = require("../utils/macd.js");
const { calculateFBB } = require("../utils/fib.js");
const { cacleSwimingFreeWma, cacleSwimingFreeEma } = require("../utils/swimingFree.js");
const { calculateLatestSuperTrend } = require("../utils/superTrend.js");
const { calculateLatestSSL } = require("../utils/SSL_CMF_VO/SSLChannel.js");
// const { convertCsvDataToTrainingSet } = require("../models/DNN/optimizer-superTrend_swim_free/tranCsvData.js");
// const { predict } = require("../models/DNN/optimizer-superTrend_swim_free/src/predict.js");

const fs = require("fs");
const path = require('path');
const symbol = "solUSDT";

let { kLineData } = require(`./source/${symbol}-5m.js`);
// let { kLineData } = require(`./source/renko-${symbol}-1m.js`);

let lastRenkoClose = null;
let brickSize = 0.0005;
let priorityFee = 0.0007;

const DefaultAvailableMoney = 10;
let maxAvailableMoney = 0;
let _kLineData = [...kLineData];
let double = 0;
let lossCount = 0;
let maxLossCount = 2;
let availableMoney = 0;
let howManyCandle = 1;
let isProfitRun = 0;
let arriveStopProfitCount = 0;
let firstStopProfitRate = 0;
let slippage = 0;
let arriveLastStopLoss = 0;
let B2Period = 11; // boll周期
let B2mult = 1.5; // boll倍数
let firstProtectProfitRate = 0;
let swimingFreePeriod = 50;
let sslPeriod = 200;
let middlePositionRate = 0.6;
let superTrendRate = 0.9;
let fibProtectProfitRate = 0.9;
let openXieLv = 1;
let firstStopLossRate = 0;
let profitProtectRate = 0.6;
let howManyCandleForProfitRun = 0.5;
let maxStopLossRate = 0.01;
let baseLossRate = 0.5;
let invalidSigleStopRate = 0.05;
let slAtrPeriod = 14;
let closeLastOrder = false;
let compoundInterest = 0;

let curStopLoss = 0; // 如果达到最终止损就计数一次,每次开单后重置未当前止损点
let curStopProfit = 0; // 如果达到最终止盈就计数一次,每次开单后重置未当前止盈点

let stopLoss = 0;
let maxLoss = {};
// let csvData = []
// const getQuantity = (currentPrice) => {
//     availableMoney = DefaultAvailableMoney * (1 + lossCount);
//     if (maxAvailableMoney < availableMoney) maxAvailableMoney = availableMoney;
//     return Math.round(availableMoney / currentPrice);
// };

const times = getSequenceArr(2, 150); // [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536] //

const getQuantity = (currentPrice) => {
    availableMoney = DefaultAvailableMoney * times[lossCount] + (compoundInterest && testMoney > 0 ? (testMoney > 1000 ? 1000 : testMoney) : 0);
    // 修改time有可能会成功平仓但是不盈利的情况，所以用改availableMoney的方式
    if (availableMoney > maxAvailableMoney) maxAvailableMoney = availableMoney;
    let q = Math.round((availableMoney / currentPrice) * 10000) / 10000;
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
let orderIndex = 0;

let bollArr = [];
let bollDisArr = [];
let bollAllArr = [];
let ratioArr = [];
let rsiArr = [];
let macdArr = [];
let tsiArr = [];
let volArr = [];
let williamsArr = [];
let emaShortArr = [];
let emaLongArr = [];
const MA_RSI = { rsiLength: 14, smaLength: 5 };
const MACD = [9 * 1, 26 * 1, 9 * 1];
let EMA_SHORT = 3;
let EMA_LONG = 9;

let highArr = [];
let lowArr = [];

let swimingFreeArr = [];
let superTrendArr = [];
let sslArr = [];
let fibArr = [];

let sslRateUp = -0.0005;
let sslRateDown = 0.00002;

let totalSuperTrendArr = [];
let atrPeriod = 15;
let multiplier = 6;
// 指标趋势
let indexTrend = 'hold'; // up down breakAndUp breakAndDown hold
const MOD_HIGH = 'MOD_HIGH';
const MOD_LOW = 'MOD_LOW';
let preAction = '';

let isUpOpen = true;
let isDownOpen = true;

const highLowTimes = [];
const highLowPrices = [];

let downArrivedProfit = 0;
let sellstopLossPrice = 0;

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
        // csvData
        // csvData[csvData.length - 1].result.isWin = false;
    }
    if (curTestMoney > 0) {
        winNum++;
        minMoney = 0;
        // csvData
        // csvData[csvData.length - 1].result.isWin = true;
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
        setEveryIndex(historyClosePrices.slice(len - i), klines.slice(len - i)); // 其他策略，这里也有问题??????对比一下
    }
};
const setEveryIndex = (historyClosePrices, klines) => {
    // 计算 boll
    // setBollArr(historyClosePrices, klines);
    // 计算 rsi
    // setRsiArr(historyClosePrices);
    // 计算 ema
    // setEmaArr(historyClosePrices);
    // 计算tsi
    // setTsiArr(historyClosePrices);
    // 计算vol
    // setVolArr(klines);
    // 计算Williams
    // setWilliamsArr(klines);
    // setMacdArr(historyClosePrices);
    setSperTrendArr(klines);
    setSwimingFreeArr(klines);
    setSslArr(klines);
    setFibArr(klines);
};
const setBollArr = (historyClosePrices, klines) => {
    bollArr.length >= 10 && bollArr.shift();
    const boll = calculateBollingerBands(historyClosePrices, B2Period, B2mult);
    bollArr.push(boll);
    bollAllArr.push(boll);
    if (!boll) return;
    bollDisArr.push(boll.B2upper - boll.B2lower);
    const ratio = getSmaRatio(getLastFromArr(bollArr, 3).map(v => v ? v.B2basis : null));
    ratioArr.push(ratio);

    // 计算高低点
    // setHighLowArr(boll, klines[klines.length - 1]);
};
const setSperTrendArr = (klines) => {
    superTrendArr.length >= 10 && superTrendArr.shift();
    const superTrend = calculateLatestSuperTrend(klines, atrPeriod, multiplier);

    superTrendArr.push(superTrend);

    totalSuperTrendArr.push(superTrend);
};
const setSwimingFreeArr = (klines) => {
    swimingFreeArr.length >= 10 && swimingFreeArr.shift();
    const swimingFree = cacleSwimingFreeEma(klines, swimingFreePeriod, 2.5);

    swimingFreeArr.push(swimingFree);
};
const setSslArr = (klines) => {
    sslArr.length >= 10 && sslArr.shift();
    const ssl = calculateLatestSSL(klines, sslPeriod);

    sslArr.push(ssl);
};
const setFibArr = (klines) => {
    fibArr.length >= 10 && fibArr.shift();
    const fib = calculateFBB(klines);

    fibArr.push(fib);
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
    // volArr.length >= 10 && volArr.shift();
    // 计算成交量均值
    const volMA = calculateSimpleMovingAverage(volumes, 3);
    volArr.push([volumes[volumes.length - 1], volMA]);
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
    arriveStopProfitCount = 0;
    slippage = 0;
    B2Period = 11; // boll周期
    B2mult = 1.5; // boll倍数
    firstProtectProfitRate = 0;
    swimingFreePeriod = 50;
    sslPeriod = 50;
    middlePositionRate= 0.6
    superTrendRate= 0.9
    fibProtectProfitRate= 0.9
    openXieLv= 1
    firstStopLossRate = 0;
    profitProtectRate = 0.6;
    howManyCandleForProfitRun = 0.5;
    maxStopLossRate = 0.01;
    baseLossRate = 0.5;
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
    atrPeriod = 10;
    multiplier = 3;
};
let arriveLastStopProfit = 0;
let arrivefirstStopProfit = 0;
let arriveFirstStopLoss = 0;
let zhibiaoWinNum = 0;
let isArriveLastStopProfit = false;
const start = async (params) => {
    params = {
        brickSize: 0.5,
        priorityFee: 0.0007, // 0.0007,
        slippage: 0.0002, // 滑点
        B2Period: 20, // boll周期
        B2mult: 1.5, // boll倍数
        atrPeriod: 9,
        multiplier: 8,
        baseLossRate: 0.5, // 基础止损
        howManyCandle: 6, // 止盈
        firstStopProfitRate: 2, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
        firstProtectProfitRate: 0.9, // 0.9, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
        swimingFreePeriod: 50,
        sslPeriod: 200,
        middlePositionRate: 0.6,
        superTrendRate: 0.9,
        fibProtectProfitRate: 0.9,
        openXieLv: 1,
        firstStopLossRate: 0, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
        isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
        profitProtectRate: 0.9, //isProfitRun === 1 时生效，保留多少利润
        howManyCandleForProfitRun: 1,
        maxStopLossRate: 0.01, // 止损小于10%的情况，最大止损5%
        invalidSigleStopRate: 0.1, // 止损在10%，不开单
        double: 1, // 是否损失后加倍开仓
        maxLossCount: 20, // 损失后加倍开仓，最大倍数
        // targetTime: "2025-06-01_00-00-00",
        closeLastOrder: true, // 最后一单是否平仓
        isUpOpen: true,
        isDownOpen: true,
        compoundInterest: 0, // 复利
        ...params,
    }
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
        arriveStopProfitCount = params.arriveStopProfitCount;
        slippage = params.slippage;
        firstProtectProfitRate = params.firstProtectProfitRate;
        swimingFreePeriod = params.swimingFreePeriod;
        sslPeriod = params.sslPeriod;
        middlePositionRate = params.middlePositionRate
        superTrendRate = params.superTrendRate
        fibProtectProfitRate = params.fibProtectProfitRate
        openXieLv = params.openXieLv
        firstStopLossRate = params.firstStopLossRate;
        profitProtectRate = params.profitProtectRate;
        howManyCandleForProfitRun = params.howManyCandleForProfitRun;
        maxStopLossRate = params.maxStopLossRate;
        baseLossRate = params.baseLossRate;
        invalidSigleStopRate = params.invalidSigleStopRate;
        slAtrPeriod = params.slAtrPeriod;
        atrPeriod = params.atrPeriod;
        multiplier = params.multiplier;
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
        _kLineData = [...kLineData].slice(start - 250);
    }
    const preKLines = _kLineData.slice(0, 250);
    const prePrices = preKLines.map((v) => v.close);
    initEveryIndex(prePrices, preKLines);
    for (let idx = 250; idx < _kLineData.length; idx++) {
        const curKLines = _kLineData.slice(idx - 250, idx + 1);
        const historyClosePrices = curKLines.map((v) => v.close);

        // 设置各种指标
        setEveryIndex([...historyClosePrices], [...curKLines]);

        const curkLine = _kLineData[idx];
        const { open, close, openTime, closeTime, low, high } = curkLine;

        let [kLine0, kLine1, kLine2, kLine3] = getLastFromArr(curKLines, 4);
        let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);
        let [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
        let [ssl1, ssl2, ssl3] = getLastFromArr(sslArr, 3);
        let [fib1, fib2, fib3] = getLastFromArr(fibArr, 3);
        let [swimingFree1, swimingFree2, swimingFree3] = getLastFromArr(swimingFreeArr, 3);
        // let { B2basis, B2upper, B2lower } = boll5;

        // 准备开仓
        if (readyTradingDirection === "hold") {
            // 初略判断趋势
            judgeTradingDirection(curKLines);
        }
        
        if (!hasOrder && readyTradingDirection !== "hold") {
            // 趋势是否符合模型
            // await judgeTradingDirectionSecond(curKLines);
        }
        if (!hasOrder) {
            // 开仓：没有仓位就根据 readyTradingDirection 开单
            // 开单完成后会重置 readyTradingDirection
            if (readyTradingDirection !== "hold") {
                judgeAndTrading(curKLines, params, idx);
                // 添加csvData数据
                // csvData.push({
                //     // kLineData是最近5条k线数据
                //     kLineData: getLastFromArr(curKLines, 5),
                //     indicatorData: {
                //         superTrendArr: getLastFromArr(superTrendArr, 5),
                //         swimingFreeArr: getLastFromArr(swimingFreeArr, 5),
                //         sslArr: getLastFromArr(sslArr, 5),
                //         fibArr: getLastFromArr(fibArr, 5),
                //     },
                //     result: {
                //         readyTradingDirection
                //     }
                // });
            }
            continue;
        }
        // 有仓位就准备平仓
        else {

            let max = Math.max(superTrend3.up, superTrend3.dn);
            let min = Math.min(superTrend3.up, superTrend3.dn);

            //////////////////////////// 指标移动止损位置 /////////////////////////// start
            // if (
            //     hasOrder &&
            //     trend === "up" &&
            //     firstStopLossRate &&
            //     (close >= B2upper)
            // ) {
            //     TP_SL[0] = orderPrice - brickSize * 0;
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
            //     TP_SL[1] = orderPrice + brickSize * 0;
            //     firstStopLossRate = 0;
            //     continue;
            // }
            //////////////////////////// 指标移动止损位置 /////////////////////////// end

            // 判断止损
            // if (trend) {
            //     // 判断止损
            //     if (trend === "up") {
            //         // 强制保本损
            //         if (idx - orderIndex === 3 && !isAriveForceLossProtect && firstStopProfitRate) {
            //             TP_SL[0] += brickSize * 0.25;
            //             isAriveForceLossProtect = true;
            //             continue;
            //         }
            //         // low 小于 point1 就止损，否则继续持有
            //         if (close <= point1) {
            //             firstStopProfitRate && (arriveLastStopLoss++);
            //             let curPrice = point1 * (1 - slippage);
            //             setProfit(orderPrice, curPrice, openTime);
            //             reset();
            //             continue;
            //         }
            //         // 初次止盈
            //         if (firstStopProfitRate) {
            //             const firstProfitPrice = orderPrice + brickSize * firstStopProfitRate; // (开仓价 - 止损)* 初始止盈倍数
            //             if (close >= firstProfitPrice || (close >= boll5.B2upper)) {
            //                 TP_SL[0] = orderPrice + Math.abs(orderPrice - close) * firstProtectProfitRate; // brickSize * firstProtectProfitRate //
            //                 firstStopProfitRate = 0;
            //                 firstStopLossRate = 0; // 防止同时触发止损
            //                 arrivefirstStopProfit++;
            //                 continue;
            //             }
            //         }
            //         // 初次止损
            //         if (firstStopLossRate) {
            //             const firstStopPrice = orderPrice - Math.abs(orderPrice - point1) * firstStopLossRate;
            //             if (close < firstStopPrice) {
            //                 // 到初始止损点时，并且该k线是大阴线，移动止损到该k线的下方，避免亏损太多
            //                 // 仓位还在，说明没有 low 没有触发止损，所以low在point1上方
            //                 // 0.8还是比较苛刻，比较难触发，所以不会频繁触发
            //                 // 这里不再修改止盈点，避免打破策略的平衡
            //                 // if (isBigAndYin(curkLine, 0.8)) {
            //                 // 移动止损到low下方
            //                 TP_SL[0] = Math.abs(close + point1) / 2; // 取currentPrice 、 point1的中间值
            //                 firstStopLossRate = 0;
            //                 arriveFirstStopLoss++;
            //                 continue;
            //                 // }
            //             }
            //         }
            //     }
            //     if (trend === "down") {
            //         // 强制保本损
            //         if (idx - orderIndex === 3 && !isAriveForceLossProtect && firstStopProfitRate) {// && close < Kupper
            //             TP_SL[1] -= brickSize * 0.25;
            //             isAriveForceLossProtect = true;
            //             continue;
            //         }
            //         // high 大于 point2 就止损，否则继续持有
            //         if (close >= point2) {
            //             firstStopProfitRate && (arriveLastStopLoss++);
            //             let curPrice = point2 * (1 + slippage);
            //             setProfit(orderPrice, curPrice, openTime);
            //             reset();
            //             continue;
            //         }
            //         // 初次止盈
            //         if (firstStopProfitRate) {
            //             const firstProfitPrice = orderPrice - brickSize * firstStopProfitRate; // (开仓价 - 止损)* 初始止盈倍数
            //             if (close <= firstProfitPrice || (close <= boll5.B2lower)) {
            //                 TP_SL[1] = orderPrice - Math.abs(orderPrice - close) * firstProtectProfitRate; // brickSize * firstProtectProfitRate// 
            //                 firstStopProfitRate = 0;
            //                 firstStopLossRate = 0; // 防止同时触发止损
            //                 arrivefirstStopProfit++;
            //                 continue;
            //             }
            //         }
            //         // 初次止损
            //         if (firstStopLossRate) {
            //             const firstStopPrice = orderPrice + Math.abs(orderPrice - point2) * firstStopLossRate;
            //             if (close > firstStopPrice) {
            //                 TP_SL[1] = Math.abs(close + point2) / 2; // 取currentPrice 、 point2的中间值
            //                 firstStopLossRate = 0;
            //                 arriveFirstStopLoss++;
            //                 continue;
            //             }
            //         }
            //     }
            // }

            // 判断止盈
            if (trend) {
                // if (isProfitRun) {
                    // // 移动止盈
                    // // 判断止盈：上面没有被止损，那看是否能止盈，high 大于 point2 就止盈利，否则继续持有
                    // if (trend === "up" && (close >= point2)) {
                    //     TP_SL = [
                    //         orderPrice + Math.abs(point2 - orderPrice) * profitProtectRate, // brickSize * profitProtectRate, // 
                    //         // point2 - brickSize * howManyCandleForProfitRun,
                    //         point2 + brickSize * howManyCandleForProfitRun,
                    //     ];
                    //     // -------------辅助统计------------start
                    //     if (curStopProfit && close >= curStopProfit) {
                    //         curStopProfit = 0;
                    //         curStopLoss = 0;
                    //         if (!isArriveLastStopProfit) {
                    //             arriveLastStopProfit++;
                    //             isArriveLastStopProfit = true;
                    //         }
                    //     }
                    //     // -------------辅助统计------------end
                    //     continue;
                    // }
                    // if (trend === "up" && (!firstStopProfitRate && close <= boll5.B2lower)) {
                    //     TP_SL = [
                    //         orderPrice + Math.abs(close - orderPrice) * profitProtectRate, // brickSize * profitProtectRate, // 
                    //         // point2 - brickSize * howManyCandleForProfitRun,
                    //         close + brickSize * howManyCandleForProfitRun,
                    //     ];
                    //     // -------------辅助统计------------start
                    //     if (curStopProfit && close >= curStopProfit) {
                    //         curStopProfit = 0;
                    //         curStopLoss = 0;
                    //         if (!isArriveLastStopProfit) {
                    //             arriveLastStopProfit++;
                    //             isArriveLastStopProfit = true;
                    //         }
                    //     }
                    //     // -------------辅助统计------------end
                    //     continue;
                    // }
                    // // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
                    // if (trend === "down" && (close <= point1)) {
                    //     TP_SL = [
                    //         point1 - brickSize * howManyCandleForProfitRun,
                    //         orderPrice - Math.abs(orderPrice - point1) * profitProtectRate, // brickSize * profitProtectRate, // 
                    //         // point1 + brickSize * howManyCandleForProfitRun,
                    //     ];
                    //     // -------------辅助统计------------start
                    //     if (curStopProfit && close <= curStopProfit) {
                    //         curStopProfit = 0;
                    //         curStopLoss = 0;
                    //         if (!isArriveLastStopProfit) {
                    //             arriveLastStopProfit++;
                    //             isArriveLastStopProfit = true;
                    //         }
                    //     }
                    //     // -------------辅助统计------------end
                    //     continue;
                    // }
                    // if (trend === "down" && (!firstStopProfitRate && close >= boll5.B2upper)) {
                    //     TP_SL = [
                    //         close - brickSize * howManyCandleForProfitRun,
                    //         orderPrice - Math.abs(orderPrice - close) * profitProtectRate, // brickSize * profitProtectRate, // 
                    //         // point1 + brickSize * howManyCandleForProfitRun,
                    //     ];
                    //     // -------------辅助统计------------start
                    //     if (curStopProfit && close <= curStopProfit) {
                    //         curStopProfit = 0;
                    //         curStopLoss = 0;
                    //         if (!isArriveLastStopProfit) {
                    //             arriveLastStopProfit++;
                    //             isArriveLastStopProfit = true;
                    //         }
                    //     }
                    //     // -------------辅助统计------------end
                    //     continue;
                    // }
                // } else {
                    // close <= minSuper or trend == -1 or (upArrivedProfit >= arriveStopProfitCount and high >= maxSuper) or (bool(buystopLossPrice) and close < buystopLossPrice)
                    if (trend === "up" && (
                        close <= min ||
                        // superTrend3.trend == -1 ||
                        (downArrivedProfit >= arriveStopProfitCount && high >= max) ||
                        (sellstopLossPrice && close < sellstopLossPrice)
                    )) {
                        setProfit(orderPrice, close, openTime);
                        reset();
                        arriveLastStopProfit++;
                        isArriveLastStopProfit = true;
                        continue;
                    }
                    // close >= maxSuper or trend == 1 or (downArrivedProfit >= arriveStopProfitCount and low <= minSuper) or (bool(sellstopLossPrice) and close > sellstopLossPrice)
                    if (trend === "down" && (
                        close >= max ||
                        // superTrend3.trend == 1 ||
                        (downArrivedProfit >= arriveStopProfitCount && low <= min) ||
                        (sellstopLossPrice && close > sellstopLossPrice)
                    )) {
                        setProfit(orderPrice, close, openTime);
                        reset();
                        arriveLastStopProfit++;
                        isArriveLastStopProfit = true;
                        continue;
                    }
            if (hasOrder) {
                // if (trend === 'up' && high >= max) {
                if (trend === 'up' && close >= min + Math.abs(superTrend3.up - superTrend3.dn) * superTrendRate) {
                    downArrivedProfit = downArrivedProfit + 1
                    if (downArrivedProfit == 1) {
                        sellstopLossPrice = orderPrice + Math.abs(close - orderPrice) * firstProtectProfitRate
                        continue;
                    }
                }
                if (trend === 'up' && high >= fib3.upper_7 && downArrivedProfit >= 1) {
                    sellstopLossPrice = orderPrice + Math.abs(high - orderPrice) * fibProtectProfitRate
                    continue;
                }
                
                // if (trend === 'down' && low <= min) {
                if (trend === 'down' && close <= max - Math.abs(superTrend3.up - superTrend3.dn) * superTrendRate) {
                    downArrivedProfit = downArrivedProfit + 1
                    if (downArrivedProfit == 1) {
                        sellstopLossPrice = orderPrice - Math.abs(close - orderPrice) * firstProtectProfitRate
                        continue;
                    }
                }
                if (trend === 'down' && low <= fib3.lower_7 && downArrivedProfit >= 1) {
                    sellstopLossPrice = orderPrice - Math.abs(low - orderPrice) * fibProtectProfitRate
                    continue;
                }
            }
                // }
            }

            //////////////////////////// 指标止盈 /////////////////////////// start
            // trend === "up" 时收到连续三根阴线，立即平仓
            // if (
            //     hasOrder &&
            //     trend === "up" &&
            //     !firstStopProfitRate &&
            //     // isArriveLastStopProfit &&
            //     (close <= B2lower)
            // ) {
            //     zhibiaoWinNum += 1;
            //     setProfit(orderPrice, close, openTime); // 正式环境可能此时还没有收盘 ???? 但是boll值变化不大可以直接对比
            //     reset();
            //     continue;
            // }
            // // trend === "down" 时收到连续三根阳线，立即平仓
            // if (
            //     hasOrder &&
            //     trend === "down" &&
            //     !firstStopProfitRate &&
            //     // isArriveLastStopProfit &&
            //     (close <= B2lower) // ||  (isYang(kLine0) && isYang(kLine1) && isYang(kLine2) && isYang(kLine3))
            // ) {
            //     zhibiaoWinNum += 1;
            //     setProfit(orderPrice, close, openTime); // 正式环境可能此时还没有收盘 ???? 但是boll值变化不大可以直接对比
            //     reset();
            //     continue;
            // }
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
        // return;
    }
    // const timeRange = `${_kLineData[0].openTime} ~ ${_kLineData[_kLineData.length - 1].closeTime}`;
        // console.log(
        //     "🚀 targetTime, testMoney, maxMoney, minMoney::",
        //     symbol,
        //     // withAllDatas,
        //     // timeRange,
        //     Math.round(testMoney * 100) / 100,
        //     Math.round(maxMoney * 100) / 100,
        //     Math.round(minMoney * 100) / 100
        // );
    return {
        targetTime,
        lastKlineTime: _kLineData[_kLineData.length - 1].closeTime,
        // maxLoss: maxLoss,
        // availableMoney,
        maxAvailableMoney,
        // winNum,
        // failNum,
        testMoney,
        maxMoney,
        minMoney,
        // maxStopLossMoney,
        winRate: winNum / (winNum + failNum),
    };
};
const reset = () => {
    TP_SL = [];
    readyTradingDirection = "hold";
    trend = "";
    quantity = 0;
    orderPrice = 0;
    hasOrder = false;
    sellstopLossPrice = 0;
    downArrivedProfit = 0;
};
// 指标判断方向 / 交易
const judgeTradingDirection = (curKLines) => {
    let [kLine1, kLine2, kLine3, kLine4, kLine5] = getLastFromArr(curKLines, 5);
    let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);
    let [high1, high2, high3, high4, high5] = getLastFromArr(highArr, 5);
    let [low1, low2, low3, low4, low5] = getLastFromArr(lowArr, 5);
    let rsiArrSlice = getLastFromArr(rsiArr, 12);
    let [rsi1, rsi2, rsi3, rsi4, rsi5] = getLastFromArr(rsiArr, 5);
    // let [macd4, macd5] = getLastFromArr(macdArr, 2);
    // if (!macd4) return;
    let [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
    let [ssl1, ssl2, ssl3] = getLastFromArr(sslArr, 3);
    let [swimingFree1, swimingFree2, swimingFree3] = getLastFromArr(swimingFreeArr, 3);

    const { openTime, high, low, open, close } = kLine5;

    const maxSSL = Math.max(ssl3.sslUp, ssl3.sslDown);
    const minSSL = Math.min(ssl3.sslUp, ssl3.sslDown);
    const maxSSL1 = Math.max(ssl1.sslUp, ssl1.sslDown);
    const minSSL1 = Math.min(ssl1.sslUp, ssl1.sslDown);

    //  trend == 1 and longCond and (close > open and close > math.max(close[1], open[1])) and close > maxSSL and math.min(low, low[1]) <= maxSSL and (maxSSL - math.max(smaHigh[2], smaLow[2]))/math.max(smaHigh[2], smaLow[2]) > sslRateUp
    // 做多
    const upTerm1 = superTrend3.trend == 1 && swimingFree3.trend === 'up';
    const upTerm2 = close > open// && close > Math.max(kLine4.close, kLine4.open);
    const upTerm3 = close > maxSSL && Math.min(low, kLine4.low) <= maxSSL  && (openXieLv ? (maxSSL - maxSSL1)/maxSSL1 > sslRateUp : true);
    const upTerm4 = middlePositionRate ? close < Math.min(superTrend3.up, superTrend3.dn) + Math.abs(superTrend3.up - superTrend3.dn) * middlePositionRate : true;

    if (isUpOpen && upTerm1 && upTerm2 && upTerm3 && upTerm4) {
        readyTradingDirection = "up";
        return;
    }

    // trend == -1 and shortCond and (close < open and close < math.min(close[1], open[1])) and close < minSSL and math.max(high, high[1]) >= minSSL and (maxSSL - math.max(smaHigh[2], smaLow[2]))/math.max(smaHigh[2], smaLow[2]) < sslRateDown
    // 做空
    const downTerm1 = superTrend3.trend == -1 && swimingFree3.trend === 'down';
    const downTerm2 = close < open// && close < Math.min(kLine4.close, kLine4.open);
    const downTerm3 = close < minSSL && Math.max(high, kLine4.high) >= minSSL && (openXieLv ? (minSSL - minSSL1)/minSSL1 < sslRateDown : true);
    // section3Down4 = close > math.max(up, dn) - math.abs(up - dn)*0.6 // supertrend中线附近才行
    const downTerm4 = middlePositionRate ? close > Math.max(superTrend3.up, superTrend3.dn) - Math.abs(superTrend3.up - superTrend3.dn) * middlePositionRate : true// supertrend中线附近才行

    if (isDownOpen && downTerm1 && downTerm2 && downTerm3 && downTerm4) {
        readyTradingDirection = "down";
        return;
    }
    readyTradingDirection = "hold";
};
// 指标判断方向 / 交易
const judgeTradingDirectionSecond = async (kLineData) => {
    const k = kLineData.at(-1);
    const superTrend = superTrendArr.at(-1);
    const swim = swimingFreeArr.at(-1);
    const ssl = sslArr.at(-1);
    const fib = fibArr.at(-1);

    // 构造特征向量
    const features = [
        k.open, k.high, k.low, k.close, k.volume,
        superTrend.trend, superTrend.up, superTrend.dn,
        swim.filt, swim.hiBand, swim.loBand,
        swim.trend === 'up' ? 1 : swim.trend === 'down' ? -1 : 0,
        swim.longCondition ? 1 : 0,
        swim.shortCondition ? 1 : 0,
        ssl.hlv, ssl.sslUp, ssl.sslDown,
        fib.basis,
        fib.upper_3, fib.upper_4, fib.upper_5, fib.upper_6, fib.upper_7,
        fib.lower_3, fib.lower_4, fib.lower_5, fib.lower_6, fib.lower_7
    ];

    let threshold = await predict(features)
    console.log("🚀 ~ judgeTradingDirectionSecond ~ threshold:", threshold)
    if (threshold < 0.5) {
        readyTradingDirection = "hold";
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
const judgeAndTrading = (kLines, params, idx) => {
    // 根据指标判断是否可以开单
    const curkLine = kLines[kLines.length - 1];
    const trendInfo = calculateTradingSignal(kLines);
    const { trend: _trend, stopLoss, stopProfit } = trendInfo;
    curStopLoss = stopLoss;
    curStopProfit = stopProfit;
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
            orderIndex = idx;
            isAriveForceLossProtect = false;
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
            orderIndex = idx;
            isAriveForceLossProtect = false;
            break;
        default:
            break;
    }
};
const calculateTradingSignal = (kLines) => {
    let [kLine1, kLine2, kLine3] = getLastFromArr(kLines, 3);
    let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);

    let { openTime, high, low, open, close, isNewLine } = kLine3;
    let [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
    let [ssl1, ssl2, ssl3] = getLastFromArr(sslArr, 3);
    let [swimingFree1, swimingFree2, swimingFree3] = getLastFromArr(swimingFreeArr, 3);

    // let { B2basis, B2upper, B2lower } = boll5;

    // let max = Math.max(kLine1.high, kLine2.high, kLine3.high);
    // let min = Math.min(kLine1.low, kLine2.low, kLine3.low);
    let max = Math.max(superTrend3.up, superTrend3.dn);
    let min = Math.min(superTrend3.up, superTrend3.dn);

    // 计算ATR
    // const atr = brickSize * baseLossRate; // calculateATR(kLines, slAtrPeriod).atr;
    // console.log("🚀 ~ calculateTradingSignal ~ atr:", atr)

    const signalUpTerm0 = readyTradingDirection === "up" && close > open;
    const signalUpTerm1 = true;// isNewLine 

    if (signalUpTerm0 && signalUpTerm1) {
        // min = min - atr; // stopLoss ? stopLoss : min - atr;
        // if (min < close * (1 - invalidSigleStopRate)) {
        //     return {
        //         trend: "hold",
        //     };
        // }
        // if (min < close * (1 - maxStopLossRate)) min = close * (1 - maxStopLossRate);
        return {
            trend: "up",
            stopLoss: min, // 止损
            // stopProfit: close + brickSize * howManyCandle, // 止盈
            stopProfit: close + (close - min) * howManyCandle, // 止盈
        };
    }

    const signalDownTerm0 = readyTradingDirection === "down" && close < open;
    const signalDownTerm1 = true;// isNewLine
    if (signalDownTerm0 && signalDownTerm1) {
        // max = max + atr; // stopLoss ? stopLoss : max + atr;
        // if (max > close * (1 + invalidSigleStopRate)) {
        //     return {
        //         trend: "hold",
        //     };
        // }
        // if (max > close * (1 + maxStopLossRate)) max = close * (1 + maxStopLossRate);
        return {
            trend: "down",
            stopLoss: max, // 止损
            // stopProfit: close - brickSize * howManyCandle, // 止盈
            stopProfit: close - (max - close) * howManyCandle, // 止盈
        };
    }
    return {
        trend: "hold",
    };
};
function writeInFile(fileName, str) {
    const dir = path.dirname(fileName);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
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
    // convertCsvDataToTrainingSet(csvData, symbol)
    writeInFile(
        `./tests/data/${symbol}-superTrend_swim_free.js`,
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
        var bollAllArr = ${JSON.stringify(bollAllArr, null, 2)}
        var volArr = ${JSON.stringify(volArr, null, 2)}
        var ratioArr = ${JSON.stringify(ratioArr, null, 2)}
        var totalSuperTrendArr = ${JSON.stringify(totalSuperTrendArr, null, 2)}
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
            bollAllArr,
            volArr,
            ratioArr,
            totalSuperTrendArr,
        }
    `
    );
}

// sol
// run({
//     priorityFee: 0.0007, // 0.0007,
//     slippage: 0.0002, // 滑点
//     atrPeriod: 11,
//     multiplier: 15,
//     firstProtectProfitRate: 0.5, // 0.9, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
//     arriveStopProfitCount: 3, // 达到止盈次数
//     swimingFreePeriod: 60,
//     sslPeriod: 200,
//     middlePositionRate: 1,
//     superTrendRate: 1,
//     fibProtectProfitRate: 0.5,
//     openXieLv: 1,

//     isUpOpen: true,
//     isDownOpen: true,
//     maxLossCount: 20, // 损失后加倍开仓，最大倍数
//     compoundInterest: 0, // 复利
//     brickSize: 0.5,
//     baseLossRate: 0.5, // 基础止损
//     howManyCandle: 6, // 止盈
//     firstStopProfitRate: 2, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
//     firstStopLossRate: 0, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
//     isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
//     profitProtectRate: 0.9, //isProfitRun === 1 时生效，保留多少利润
//     howManyCandleForProfitRun: 1,
//     maxStopLossRate: 0.01, // 止损小于10%的情况，最大止损5%
//     invalidSigleStopRate: 0.1, // 止损在10%，不开单
//     double: 0, // 是否损失后加倍开仓
//     // targetTime: "2025-06-01_00-00-00",
//     closeLastOrder: true, // 最后一单是否平仓
// });

module.exports = {
    evaluateStrategy: start,
};