const { getDate, getLastFromArr, getSequenceArr, calculateHighLow } = require("../utils/functions");
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
const { calculateSimpleMovingAverage } = require("../utils/ma.js");
const fs = require("fs");
const symbol = "dogeUSDT";
let { kLineData } = require(`./source/${symbol}-2h.js`);

const diff = 2;
const DefaultAvailableMoney = 10;
const times = getSequenceArr(diff, 100);
let maxAvailableMoney = 0;
let _kLineData = [...kLineData];
let numForAverage = 12;
let double = 0;
let lossCount = 0;
let maxLossCount = 2;
let availableMoney = DefaultAvailableMoney * (1 + lossCount);
let howManyCandle = 1;
let isProfitRun = 0;
let firstStopProfitRate = 0;
let profitProtectRate = 0.6;
let howManyCandleForProfitRun = 0.01;
let maxStopLossRate = 0.01;
let invalidSigleStopRate = 0.5;
let emaPeriod = 60;
let basePeriod = 25;
let stopLossRatio = 6; // 止损 basePeriod * stopLossRatio
let stopProfitRatio = 10; // 止盈 basePeriod * stopProfitRatio

const getQuantity = (currentPrice) => {
    availableMoney = DefaultAvailableMoney * times[lossCount];
    if (maxAvailableMoney < availableMoney) maxAvailableMoney = availableMoney;
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
let emaArr = [];
let highLowBase = undefined;
let rsiArr = [];

let maxStopLossMoney = 0;
let curTestMoneyHistory = [];

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
    if (curTestMoney <= 0) {
        failNum++;
    } else {
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

const initEveryIndex = (historyClosePrices, curKLines) => {
    const len = historyClosePrices.length;
    for (let i = len - 20; i < len; i++) {
        setEveryIndex(historyClosePrices.slice(0, i), curKLines);
    }
};
const setEveryIndex = (historyClosePrices, curKLines) => {
    setEmaMaArr(historyClosePrices);
    setHighLowBase(curKLines);
};
const setEmaMaArr = (historyClosePrices) => {
    emaArr.length >= 10 && emaArr.shift();
    emaArr.push(calculateSimpleMovingAverage(historyClosePrices, emaPeriod));
};
const setHighLowBase = (curKLines) => {
    highLowBase = calculateHighLow(curKLines, basePeriod);
};

const resetInit = () => {
    _kLineData = [...kLineData];
    howManyCandle = 1;
    isProfitRun = 0;
    double = 0;
    lossCount = 0;
    maxLossCount = 2;
    firstStopProfitRate = 0;
    firstStopLossRate = 0;
    profitProtectRate = 0.6;
    howManyCandleForProfitRun = 0.5;
    maxStopLossRate = 0.01;
    invalidSigleStopRate = 0.02;
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
    emaArr = [];
    highLowBase = undefined;
    rsiArr = [];
    numForAverage = 12;

    targetTime = null;
};
const start = (params) => {
    // 每次需要初始化 ???? 检查初始化是否覆盖所有全局变量
    resetInit();
    if (params) {
        emaPeriod = params.emaPeriod;
        basePeriod = params.basePeriod;
        stopLossRatio = params.stopLossRatio;
        stopProfitRatio = params.stopProfitRatio;

        numForAverage = params.numForAverage;
        howManyCandle = params.howManyCandle;
        isProfitRun = params.isProfitRun;
        firstStopProfitRate = params.firstStopProfitRate;
        firstStopLossRate = params.firstStopLossRate;
        profitProtectRate = params.profitProtectRate;
        howManyCandleForProfitRun = params.howManyCandleForProfitRun;
        maxStopLossRate = params.maxStopLossRate;
        invalidSigleStopRate = params.invalidSigleStopRate;
        double = params.double;
        maxLossCount = params.maxLossCount;
        targetTime = params.targetTime;
    }
    if (targetTime) {
        targetTime = params.targetTime;
        let start = kLineData.findIndex((v) => v.openTime === targetTime);
        _kLineData = [...kLineData].slice(start);
    }
    const preKLines = _kLineData.slice(0, 500);
    const prePrices = preKLines.map((v) => v.close);
    initEveryIndex(prePrices, preKLines);
    for (let idx = 500; idx < _kLineData.length; idx++) {
        const curKLines = _kLineData.slice(idx - 500, idx);
        const historyClosePrices = curKLines.map((v) => v.close);

        candleHeight = calculateCandleHeight(_kLineData.slice(idx - numForAverage, idx));

        // 设置各种指标
        setEveryIndex([...historyClosePrices], curKLines);

        const curkLine = _kLineData[idx];
        const { open, close, openTime, closeTime, low, high } = curkLine;

        let [ema1, ema2, ema3, ema4, ema5] = getLastFromArr(emaArr, 5);

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
                judgeAndTrading(_kLineData.slice(idx - 500, idx), params);
            }
            continue;
        }
        // 有仓位就准备平仓
        else {
            const [point1, point2] = gridPoints;
            // 先判断止损
            if (trend) {
                // 判断止损
                if (trend === "up") {
                    // low 小于 point1 就止损，否则继续持有
                    if (low <= point1) {
                        setProfit(orderPrice, point1, openTime);
                        reset();
                        continue;
                    }

                    if (firstStopProfitRate) {
                        // const firstProfitPrice=orderPrice+Math.abs(orderPrice-point1)*firstStopProfitRate
                        const firstProfitPrice = orderPrice + candleHeight * firstStopProfitRate;
                        if (close > firstProfitPrice) {
                            // 到初始止盈点时，并且该k线是阴线，移动止损到开仓价，避免盈利回撤
                            if (close < open) {
                                // 减少止损
                                gridPoints[0] = orderPrice; //+Math.abs(orderPrice-firstProfitPrice)/2;
                                firstStopProfitRate = 0;
                                continue;
                            }
                        }
                    }
                    if (firstStopLossRate) {
                        const firstStopPrice =
                            orderPrice - Math.abs(orderPrice - point1) * firstStopLossRate;
                        if (close < firstStopPrice) {
                            // 到初始止损点时，并且该k线是阳线，移动止盈到开仓价，避免亏损太多
                            if (close < open) {
                                // 减少止盈利接近开盘价
                                gridPoints[1] = orderPrice; //+Math.abs(orderPrice-firstStopPrice)/25;
                                firstStopLossRate = 0;
                                continue;
                            }
                        }
                    }
                }
                if (trend === "down") {
                    // high 大于 point2 就止损，否则继续持有
                    if (high >= point2) {
                        setProfit(orderPrice, point2, openTime);
                        reset();
                        continue;
                    }
                    if (firstStopProfitRate) {
                        // const firstProfitPrice=orderPrice-Math.abs(orderPrice-point2)*firstStopProfitRate
                        const firstProfitPrice = orderPrice - candleHeight * firstStopProfitRate;
                        if (close < firstProfitPrice) {
                            // 到初始止盈点时，并且该k线是阳线，移动止损到开仓价，避免盈利回撤
                            if (close > open) {
                                // 减少止损
                                gridPoints[1] = orderPrice; //-Math.abs(orderPrice-firstProfitPrice)/25;
                                firstStopProfitRate = 0;
                                continue;
                            }
                        }
                    }
                    if (firstStopLossRate) {
                        const firstStopPrice =
                            orderPrice + Math.abs(orderPrice - point2) * firstStopLossRate;
                        if (close > firstStopPrice) {
                            // 到初始止损点时，并且该k线是阴线，移动止盈到开仓价，避免亏损太多
                            if (close > open) {
                                // 减少止盈利接近开盘价
                                gridPoints[0] = orderPrice; //+Math.abs(orderPrice-firstStopPrice)/25;
                                firstStopLossRate = 0;
                                continue;
                            }
                        }
                    }
                }
            }
            // 判断止盈
            if (trend) {
                if (isProfitRun) {
                    // 移动止盈
                    // 判断止盈：上面没有被止损，那看是否能止盈，high 大于 point2 就止盈利，否则继续持有
                    if (trend === "up" && high >= point2) {
                        gridPoints = [
                            orderPrice + Math.abs(point2 - orderPrice) * profitProtectRate,
                            point2 + candleHeight * howManyCandleForProfitRun,
                        ];
                        continue;
                    }
                    // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
                    if (trend === "down" && low <= point1) {
                        gridPoints = [
                            point1 - candleHeight * howManyCandleForProfitRun,
                            orderPrice - Math.abs(orderPrice - point1) * profitProtectRate,
                        ];
                        continue;
                    }
                } else {
                    // 判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
                    if (trend === "up" && high >= point2) {
                        setProfit(orderPrice, point2, openTime);
                        reset();
                        continue;
                    }
                    // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
                    if (hasOrder && trend === "down" && low <= point1) {
                        setProfit(orderPrice, point1, openTime);
                        reset();
                        continue;
                    }
                }
            }
        }
    }

    // 平仓最后一次
    if (hasOrder) {
        const len = _kLineData.length;
        const curkLine = _kLineData[len - 1];
        const { close, closeTime, low, high } = curkLine;
        const [point1, point2] = gridPoints;
        if (hasOrder) {
            // 判断止损
            if (trend === "up") {
                // low 小于 point1 就止损，否则继续持有
                if (low <= point1) {
                    setProfit(orderPrice, point1, openTime);
                    reset();
                    return;
                }
            }
            if (hasOrder && trend === "down") {
                // high 大于 point2 就止损，否则继续持有
                if (high >= point2) {
                    setProfit(orderPrice, point2, openTime);
                    reset();
                    return;
                }
            }
        }
        if (hasOrder) {
            // 判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
            if (trend === "up" && high >= point2) {
                setProfit(orderPrice, point2, openTime);
                reset();
                return;
            }
            // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
            if (hasOrder && trend === "down" && low <= point1) {
                setProfit(orderPrice, point1, openTime);
                reset();
                return;
            }
        }
    }
};
const reset = () => {
    gridPoints = [];
    readyTradingDirection = "hold";
    trend = "";
    quantity = 0;
    orderPrice = 0;
    isReadyStopProfit = false;
    hasOrder = false;
};
// 指标判断方向 / 交易
const judgeTradingDirection = (kLines) => {
    let [, , kLine1, kLine2, kLine3] = kLines;
    let [ema1, ema2, ema3, ema4, ema5] = getLastFromArr(emaArr, 5);

    let { high, low, open, close } = kLine3;

    // 多头行情
    // 准备条件一：均线上升趋势
    const upTerm1 = ema3 < ema4 && ema4 < ema5;
    if (upTerm1) {
        readyTradingDirection = "up";
        return;
    }
    // 空头行情
    // 准备条件一：均线下降趋势
    const downTerm1 = ema3 > ema4 && ema4 > ema5;
    if (downTerm1) {
        readyTradingDirection = "down";
        return;
    }
};
const judgeBreakTradingDirection = (kLines) => {
    let [, , kLine1, kLine2, kLine3] = kLines;
    let [ema1, ema2, ema3, ema4, ema5] = getLastFromArr(emaArr, 5);

    let { high, low, close } = kLine3;

    // 多头被破坏
    const upTerm1 = ema3 < ema4 && ema4 < ema5;
    if (readyTradingDirection === "up" && !upTerm1) {
        readyTradingDirection = "hold";
        return;
    }
    // 空头被破坏
    const downTerm1 = ema3 > ema4 && ema4 > ema5;
    if (readyTradingDirection === "down" && !downTerm1) {
        readyTradingDirection = "hold";
        return;
    }
};

// 设置网格
const setGridPoints = (trend, stopLoss, stopProfit, _currentPrice) => {
    if (trend === "up") {
        let _stopLoss = stopLoss; // 止损
        let _stopProfit = stopProfit; // 止盈
        gridPoints = [_stopLoss, _stopProfit];
        orderPrice = _currentPrice;
        quantity = getQuantity(_currentPrice);
    }

    if (trend === "down") {
        let _stopLoss = stopLoss; // 止损
        let _stopProfit = stopProfit; // 止盈
        orderPrice = _currentPrice;
        gridPoints = [_stopProfit, _stopLoss];
        quantity = getQuantity(_currentPrice);
    }
};
// 判断+交易
const judgeAndTrading = (kLines, params) => {
    // 根据指标判断是否可以开单
    const curkLine = kLines[kLines.length - 1];
    const trendInfo = calculateTradingSignal(kLines);
    const { stopLoss, stopProfit } = trendInfo;

    // 开单
    switch (trendInfo.trend) {
        case "up":
            trend = "up";
            setGridPoints("up", stopLoss, stopProfit, curkLine.close);
            // readyTradingDirection = "hold";
            isReadyStopProfit = false;
            hasOrder = true;
            openHistory.push(curkLine.openTime); // 其实开单时间是：curkLine.closeTime，binance的时间显示的是open Time，方便调试这里记录openTime
            openPriceHistory.push(curkLine.close);
            firstStopProfitRate = params.firstStopProfitRate;
            firstStopLossRate = params.firstStopLossRate;
            break;
        case "down":
            trend = "down";
            setGridPoints("down", stopLoss, stopProfit, curkLine.close);
            // readyTradingDirection = "hold";
            isReadyStopProfit = false;
            hasOrder = true;
            openHistory.push(curkLine.openTime); // 其实开单时间是：curkLine.closeTime，binance的时间显示的是open Time，方便调试这里记录openTime
            openPriceHistory.push(curkLine.close);
            firstStopProfitRate = params.firstStopProfitRate;
            firstStopLossRate = params.firstStopLossRate;
            break;
        default:
            break;
    }
};
const calculateTradingSignal = (kLines) => {
    // const [kLine_fu1, kLine_0, kLine1, kLine2, kLine3] = kLines;
    const curLkine = kLines[kLines.length - 1];
    const { open, close, openTime, closeTime, low, high } = curLkine;
    // let [ema1, ema2, ema3, ema4, ema5] = getLastFromArr(emaArr, 5);

    // let max = Math.max(kLine1.high, kLine2.high, kLine3.high);
    // let min = Math.min(kLine1.low, kLine2.low, kLine3.low);
    // let maxBody = Math.max(kLine1.open, kLine1.close, kLine2.open, kLine2.close, kLine3.open, kLine3.close);
    // let minBody = Math.min(kLine1.open, kLine1.close, kLine2.open, kLine2.close, kLine3.open, kLine3.close);

    const signalUpTerm1 = close < open;
    const signalUpTerm2 = low <= highLowBase.minLow;
    if (readyTradingDirection === "up" && signalUpTerm1 && signalUpTerm2) {
        const highLowStopLoss = calculateHighLow(kLines, basePeriod * stopLossRatio);
        const highLowStopProfit = calculateHighLow(kLines, basePeriod * stopProfitRatio);
        let min = highLowStopLoss.minLow;
        if (min < close * (1 - invalidSigleStopRate)) {
            return {
                trend: "hold",
            };
        }
        if (min < close * (1 - maxStopLossRate)) min = close * (1 - maxStopLossRate);
        return {
            trend: "up",
            stopLoss: min, // 止损
            stopProfit: highLowStopProfit.maxHigh, // 止盈
            // stopProfit: close + (close - highLowStopLoss.minLow) * howManyCandle, // 止盈
        };
    }

    const signalDownTerm1 = close > open;
    const signalDownTerm2 = high >= highLowBase.maxHigh;
    if (readyTradingDirection === "down" && signalDownTerm1 && signalDownTerm2) {
        const highLowStopLoss = calculateHighLow(kLines, basePeriod * stopLossRatio);
        const highLowStopProfit = calculateHighLow(kLines, basePeriod * stopProfitRatio);
        let max = highLowStopLoss.maxHigh;
        if (max > close * (1 + invalidSigleStopRate)) {
            return {
                trend: "hold",
            };
        }
        if (max > close * (1 + maxStopLossRate)) max = close * (1 + maxStopLossRate);
        return {
            trend: "down",
            stopLoss: highLowStopLoss.maxHigh, // 止损
            stopProfit: highLowStopProfit.minLow, // 止盈
            // stopProfit: close - (max - close) * howManyCandle, // 止盈
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
        emaPeriod,
        basePeriod,
        stopLossRatio,
        stopProfitRatio,
        isProfitRun,
        firstStopProfitRate,
        firstStopLossRate,
        profitProtectRate,
        howManyCandleForProfitRun,
        maxStopLossRate,
        invalidSigleStopRate,
        double,
        maxLossCount,
        xxxx: "--------------------------------",
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
        `./tests/data/${symbol}-highesthigh-lowestLow.js`,
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
    emaPeriod: 60,
    basePeriod: 15,
    stopLossRatio: 6, // 6
    stopProfitRatio: 12, // 10
    // targetTime: "2024-09-01_00-00-00",
    // howManyCandle: 5, // 止盈，盈亏比(该策略不用此参数)
    isProfitRun: 1, // 是否开启移动止盈
    firstStopProfitRate: 2, // 是否开启初始止盈(比例基于止损)（到初始止盈点时，移动止损到开仓价）
    firstStopLossRate: 0.6, // 是否开启初始止损（到初始止损点时，移动止盈到开仓价）
    profitProtectRate: 0.7, // 移动止盈，保留盈利比例
    howManyCandleForProfitRun: 0.5,
    maxStopLossRate: 0.05, // 止损小于10%的情况，最大止损5%
    invalidSigleStopRate: 0.1, // 止损在10%，不开单
    double: 1, // 是否损失后加倍开仓
    maxLossCount: 20, // 损失后加倍开仓，最大倍数
});
module.exports = {
    evaluateStrategy: start,
};
