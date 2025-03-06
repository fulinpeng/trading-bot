const { getDate, getSequenceArr, getLastFromArr } = require("../utils/functions");
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
} = require("../utils/kLineTools");
const { calculateATR } = require("../utils/atr.js");
const { calculateRSI } = require("../utils/rsi.js");
const { emaMacrossover } = require("../utils/ema_ma_crossover.js");
const fs = require("fs");
const symbol = "dogeUSDT";
let { kLineData } = require(`./source/${symbol}-1h.js`);

// const DefaultAvailableMoney=10
// const times=getSequenceArr(diff, 100);
let maxAvailableMoney = 0;
let numForAverage = 0;
let _kLineData = [...kLineData];
let double = 0;
let lossCount = 0;
let maxLossCount = 2;
let availableMoney = 0;
let howManyCandle = 1;
let isProfitRun = 0;
let firstStopProfitRate = 0;
let firstProtectProfitRate = 0;
let profitProtectRate = 0.6;
let maxStopLossRate = 0.01;
let invalidSigleStopRate = 0.02;
let howManyCandleForProfitRun = 0.5;
let emaPeriod = 10;
let smaPeriod = 10;
let rsiPeriod = 14;

const getQuantity = (availableMoney, currentPrice) => {
    // availableMoney=DefaultAvailableMoney*times[lossCount]
    // if (maxAvailableMoney<availableMoney) maxAvailableMoney=availableMoney
    // return Math.round(availableMoney/currentPrice);
    return availableMoney / currentPrice;
};

let gridPoints = [];
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
let readyTradingDirection = "hold";
let hasOrder = false;
let candleHeight = 0;
let emaMaArr = [];
let rsiArr = [];

let maxStopLossMoney = 100000000000;
let curTestMoneyHistory = [];

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 初始化参数
const n = 3; // 计算极值的 K 线数量
const diff = 1;
const DefaultAvailableMoney = 10;
const times = getSequenceArr(diff, 100);
const initialSize = DefaultAvailableMoney; // 初始每次开仓100u
const addSize = (n) => times[n]; // 每次加仓10u
const profitTarget = 0; // 目标浮盈，单位为U
const isLongOpen = true;
const isShortOpen = false;
let longPositions = [];
let shortPositions = [];
let maxHigh = 0;
let minLow = 0;
let maxLongSize = 0;
let maxShortSize = 0;

// 模拟获取历史数据并计算极值
function getMarketData(candles) {
    try {
        const highs = candles.map((candle) => parseFloat(candle.high));
        const lows = candles.map((candle) => parseFloat(candle.low));

        // 计算最大值和最小值
        const maxHigh = Math.max(...highs);
        const minLow = Math.min(...lows);

        return { maxHigh, minLow };
    } catch (error) {
        console.error("Error fetching market data:", error);
        return { maxHigh: null, minLow: null };
    }
}

// 计算浮动盈亏
function calcLongPositionsProfit(currentPrice, longPositions) {
    return longPositions.reduce((sum, { price: orderPrice, quantity }) => {
        return (
            sum +
            (currentPrice - orderPrice) * quantity -
            quantity * (orderPrice + currentPrice) * 0.0007
        );
    }, 0);
}
function calcShortPositionsProfit(currentPrice, shortPositions) {
    return shortPositions.reduce((sum, { price: orderPrice, quantity }) => {
        return (
            sum +
            (orderPrice - currentPrice) * quantity -
            quantity * (orderPrice + currentPrice) * 0.0007
        );
    }, 0);
}
// 平多单
function closeLongPositions(currentPrice, time, totalProfit) {
    longPositions = [];
    testMoney += totalProfit;
    testMoneyHistory.push(testMoney);
    closeHistory.push(time);
    closePriceHistory.push(currentPrice);
}
// 平空单
function closeShortPositions(currentPrice, time, totalProfit) {
    shortPositions = [];
    testMoney += totalProfit;
    testMoneyHistory.push(testMoney);
    closeHistory.push(time);
    closePriceHistory.push(currentPrice);
}

// 执行交易：开仓、加仓、平仓
function executeTrade(_candles, curkLine) {
    try {
        const { open, close, openTime, closeTime, low, high } = curkLine;
        const price = close;
        let candles = getLastFromArr(_candles.slice(0, -1), n);

        // 初始化时开多仓和空仓
        if (isLongOpen && longPositions.length === 0) {
            // 开多仓
            longPositions.push({
                price,
                quantity: getQuantity(initialSize, price),
            });
            availableMoney = initialSize;
            // 重置 maxHigh minLow
            const value = getMarketData(candles);
            maxHigh = value.maxHigh;
            minLow = value.minLow;
        }
        if (isShortOpen && shortPositions.length === 0) {
            // 开空仓
            shortPositions.push({
                price,
                quantity: getQuantity(initialSize, price),
            });
            availableMoney = initialSize;
            // 重置 maxHigh minLow
            const value = getMarketData(candles);
            maxHigh = value.maxHigh;
            minLow = value.minLow;
        }

        // 多仓加仓
        if (isLongOpen && longPositions.length > 0 && price < minLow) {
            let size = addSize(longPositions.length);
            if (size > maxLongSize) maxLongSize = size;
            longPositions.push({
                price,
                quantity: getQuantity(size, price),
            });
            if (availableMoney + size > maxAvailableMoney)
                maxAvailableMoney = availableMoney + size;
            availableMoney += size;
            if (close < minLow) minLow = close;
        }

        // 空仓加仓
        if (isShortOpen && shortPositions.length > 0 && price > maxHigh) {
            let size = addSize(shortPositions.length);
            if (size > maxShortSize) maxShortSize = size;
            shortPositions.push({
                price,
                quantity: getQuantity(size, price),
            });
            if (availableMoney + size > maxAvailableMoney)
                maxAvailableMoney = availableMoney + size;
            availableMoney += size;
            if (close > maxHigh) maxHigh = close;
        }

        // 计算浮动盈亏
        const longProfit = calcLongPositionsProfit(high, longPositions);
        const shortProfit = calcShortPositionsProfit(low, shortPositions);
        const totalProfit = longProfit + shortProfit;

        if (testMoney + totalProfit > maxMoney) maxMoney = testMoney + totalProfit;
        if (testMoney + totalProfit < minMoney) minMoney = testMoney + totalProfit;
        if (totalProfit < maxStopLossMoney) maxStopLossMoney = totalProfit;

        // 平仓条件
        if (longProfit > profitTarget) {
            closeLongPositions(price, closeTime, longProfit);
        }
        if (shortProfit > profitTarget) {
            closeShortPositions(price, closeTime, shortProfit);
        }
    } catch (error) {
        console.error("Error executing trade:", error);
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const initEveryIndex = (historyClosePrices) => {
    const len = historyClosePrices.length;
    for (let i = len - 20; i < len; i++) {
        setEveryIndex(historyClosePrices.slice(0, i));
    }
};
const setEveryIndex = (historyClosePrices) => {
    // 计算 ema
    setEmaMaArr(historyClosePrices);
    // 计算 rsi
    setRsiArr(historyClosePrices);
};
const setEmaMaArr = (historyClosePrices) => {
    emaMaArr.length >= 10 && emaMaArr.shift();
    emaMaArr.push(emaMacrossover(historyClosePrices, smaPeriod, emaPeriod));
};
const setRsiArr = (historyClosePrices) => {
    rsiArr.length >= 10 && rsiArr.shift();
    rsiArr.push(calculateRSI(historyClosePrices, rsiPeriod));
};

const resetInit = () => {
    _kLineData = [...kLineData];
    howManyCandle = 1;
    isProfitRun = 0;
    double = 0;
    lossCount = 0;
    maxLossCount = 2;
    firstStopProfitRate = 0;
    firstProtectProfitRate = 0;
    firstStopLossRate = 0;
    profitProtectRate = 0.6;
    howManyCandleForProfitRun = 0.5;
    maxStopLossRate = 0.01;
    invalidSigleStopRate = 0.02;
    fastPeriod = 12;
    gridPoints = [];
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
    emaMaArr = [];
    rsiArr = [];
    emaPeriod = 10;
    smaPeriod = 10;
    rsiPeriod = 14;
    numForAverage = 12;
    pinBarThreshold = 2.1;
    tp = 1.07;
    dp = 0.97;
    buyStopLossRate = 0.95;
    sellStopLossRate = 1.01;
    roc = 1;

    targetTime = null;
};
let arriveFirstStopLoss = 0;
const start = (params) => {
    // 每次需要初始化 ???? 检查初始化是否覆盖所有全局变量
    resetInit();
    if (params) {
        numForAverage = params.numForAverage;
        howManyCandle = params.howManyCandle;
        isProfitRun = params.isProfitRun;
        firstStopProfitRate = params.firstStopProfitRate;
        firstProtectProfitRate = params.firstProtectProfitRate;
        firstStopLossRate = params.firstStopLossRate;
        profitProtectRate = params.profitProtectRate;
        howManyCandleForProfitRun = params.howManyCandleForProfitRun;
        maxStopLossRate = params.maxStopLossRate;
        invalidSigleStopRate = params.invalidSigleStopRate;
        double = params.double;
        maxLossCount = params.maxLossCount;
        targetTime = params.targetTime;
        emaPeriod = params.emaPeriod;
        smaPeriod = params.smaPeriod;
        rsiPeriod = params.rsiPeriod;
        pinBarThreshold = params.pinBarThreshold;
        tp = params.tp;
        dp = params.dp;
        buyStopLossRate = params.buyStopLossRate;
        sellStopLossRate = params.sellStopLossRate;
        roc = params.roc;
    }
    if (targetTime) {
        targetTime = params.targetTime;
        let start = kLineData.findIndex((v) => v.openTime === targetTime);
        _kLineData = [...kLineData].slice(start);
    }
    const preKLines = _kLineData.slice(0, 100);
    const prePrices = preKLines.map((v) => v.close);
    initEveryIndex(prePrices);
    for (let idx = 100; idx < _kLineData.length; idx++) {
        const curKLines = _kLineData.slice(idx - 100, idx);
        // const historyClosePrices=curKLines.map((v) => v.close);

        // candleHeight=calculateCandleHeight(_kLineData.slice(idx-numForAverage, idx));

        // 设置各种指标
        // setEveryIndex([...historyClosePrices]);

        const curkLine = curKLines[curKLines.length - 1];

        // let [emaMa1, emaMa2, emaMa3, emaMa4, emaMa5]=getLastFromArr(emaMaArr, 5);
        // let [rsi1, rsi2, rsi3, rsi4, rsi5]=getLastFromArr(rsiArr, 5);
        executeTrade(curKLines, curkLine);
    }

    // 平仓最后一次
    const curkLine = _kLineData[_kLineData.length - 1];
    const { close, openTime, closeTime, low, high } = curkLine;
    const longProfit = calcLongPositionsProfit(high, longPositions);
    const shortProfit = calcShortPositionsProfit(low, shortPositions);

    // isNaN(longProfit)&&console.log("🚀 ~ start ~ totalProfit:", high, longPositions)

    const totalProfit = longProfit + shortProfit;

    if (testMoney + totalProfit > maxMoney) maxMoney = testMoney + totalProfit;
    if (testMoney + totalProfit < minMoney) minMoney = testMoney + totalProfit;
    if (totalProfit < maxStopLossMoney) maxStopLossMoney = totalProfit;

    longProfit && closeLongPositions(close, closeTime, longProfit);
    shortProfit && closeShortPositions(close, closeTime, shortProfit);

    const timeRange = `${_kLineData[0].openTime} ~ ${_kLineData[_kLineData.length - 1].closeTime}`;
    // if (params&&params.targetTime) {
    // 	console.log(
    // 		"🚀 targetTime, testMoney, maxMoney, minMoney::",
    // 		symbol,
    // 		withAllDatas,
    // 		timeRange,
    // 		Math.round(testMoney*100)/100,
    // 		Math.round(maxMoney*100)/100,
    // 		Math.round(minMoney*100)/100,
    // 	);
    // }
    return {
        timeRange,
        testMoney,
        maxMoney,
        minMoney,
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
        howManyCandle,
        firstStopProfitRate,
        firstProtectProfitRate,
        firstStopLossRate,
        isProfitRun,
        profitProtectRate,
        howManyCandleForProfitRun,
        maxStopLossRate,
        invalidSigleStopRate,
        double,
        maxLossCount,
        xxx: "-----------------------------------------------------",
        arriveFirstStopLoss: arriveFirstStopLoss + "次",
        availableMoney,
        maxAvailableMoney,
        maxLongSize: maxLongSize + "次多仓",
        maxShortSize: maxShortSize + "次空仓",
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
        `./tests/data/${symbol}-updown.js`,
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
run({
    howManyCandle: 1,
    firstStopProfitRate: 0, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
    firstProtectProfitRate: 0, // -0.2, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
    firstStopLossRate: 0, //  当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
    isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
    profitProtectRate: 0.9,
    howManyCandleForProfitRun: 0.1,
    maxStopLossRate: 0.03,
    invalidSigleStopRate: 0.1,
    double: 0,
    maxLossCount: 20,
    emaPeriod: 10,
    smaPeriod: 10,
    rsiPeriod: 14,
    pinBarThreshold: 2,
    tp: 1.07,
    dp: 0.95,
    buyStopLossRate: 0.97,
    sellStopLossRate: 1.03,
    roc: 1,
    targetTime: "2025-01-01_00-00-00",
});
module.exports = {
    evaluateStrategy: start,
};
