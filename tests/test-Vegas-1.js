const { getDate, getLastKlines } = require("../utils/functions");
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
const { calculateEMA } = require("../utils/ma.js");
const fs = require("fs");
let { kLineData } = require("./source/solUSDT-4h.js");

const symbol = "solUSDT";
let availableMoney = 10000;
let howManyCandle = 1;
const invalidNumber = 144;
const isProfitRun = 0;
const profitProtectRate = 0.9;
const howManyCandleForProfitRun = 0.5;

const getQuantity = (currentPrice) => {
    return Math.round(availableMoney / currentPrice);
};

let gridPoints = [];
let trend = "";

let flagKlineCount = 0;
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
let testMoneyHistory = [];
let readyTradingDirection = "hold";
let hasOrder = false;
let candleHeight = 0;
let preEma = [0, 0, 0];
let curEma = [0, 0, 0];

const setProfit = (orderPrice, currentPrice, closeTime) => {
    if (trend === "up") {
        testMoney =
            testMoney + quantity * (currentPrice - orderPrice) - quantity * (orderPrice + currentPrice) * 0.0007;
    }
    if (trend === "down") {
        testMoney =
            testMoney + quantity * (orderPrice - currentPrice) - quantity * (orderPrice + currentPrice) * 0.0007;
    }
    if (testMoney > maxMoney) maxMoney = testMoney;
    if (testMoney < minMoney) minMoney = testMoney;
    testMoneyHistory.push(testMoney);
    closeHistory.push(closeTime);
    trendHistory.push(trend);
};
const start = () => {
    const preKLines = kLineData.slice(0, 200);
    const prePrices = preKLines.map((v) => v.close / 2);
    preEma = [calculateEMA(prePrices, 12), calculateEMA(prePrices, 144), calculateEMA(prePrices, 169)];
    for (let idx = 201; idx < kLineData.length; idx++) {
        const curKLines = kLineData.slice(idx - 200, idx);
        const prices = curKLines.map((v) => v.close / 2);

        candleHeight = calculateCandleHeight(kLineData.slice(idx - 12, idx));
        // const rsi = calculateRSI(prices, RSI_PERIOD);
        const curkLine = kLineData[idx];
        const { close, closeTime, low, high } = curkLine;
        curEma = [calculateEMA(prices, 12), calculateEMA(prices, 144), calculateEMA(prices, 169)];
        // 准备开仓：判断 开单方向
        if (!hasOrder) {
            if (readyTradingDirection === "hold") {
                judgeTradingDirection({ preEma, curEma, kLines: getLastKlines(curKLines, 3) });
                if (readyTradingDirection !== "hold") flagKlineCount = 0;
            } else {
                flagKlineCount++;
            }
            // 开仓：没有仓位就根据 readyTradingDirection 开单
            // 开单完成后会重置 readyTradingDirection
            if (readyTradingDirection !== "hold") {
                if (flagKlineCount < invalidNumber) {
                    judgeAndTrading({ preEma, curEma, kLines: getLastKlines(curKLines, 3) });
                } else {
                    reset();
                }
            }
            preEma = curEma;
            continue;
        }
        // 有仓位就准备平仓
        else {
            const [point1, point2] = gridPoints;
            if (trend) {
                // 判断止损
                if (trend === "up") {
                    // low 小于 point1 就止损，否则继续持有
                    if (low <= point1) {
                        setProfit(orderPrice, point1, closeTime);
                        failNum++;
                        reset();
                        preEma = curEma;
                        continue;
                    }
                }
                if (trend === "down") {
                    // high 大于 point2 就止损，否则继续持有
                    if (high >= point2) {
                        setProfit(orderPrice, point2, closeTime);
                        failNum++;
                        reset();
                        preEma = curEma;
                        continue;
                    }
                }
            }
            if (trend) {
                if (isProfitRun) {
                    // 移动止盈
                    // 判断止盈：上面没有被止损，那看是否能止盈，high 大于 point2 就止盈利，否则继续持有
                    if (trend === "up" && high >= point2) {
                        gridPoints = [
                            orderPrice + Math.abs(point2 - orderPrice) * profitProtectRate,
                            point2 + candleHeight * howManyCandleForProfitRun,
                        ];
                        preEma = curEma;
                        continue;
                    }
                    // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
                    if (trend === "down" && low <= point1) {
                        gridPoints = [
                            point1 - candleHeight * howManyCandleForProfitRun,
                            orderPrice - Math.abs(orderPrice - point1) * profitProtectRate,
                        ];
                        preEma = curEma;
                        continue;
                    }
                } else {
                    // 判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
                    if (trend === "up" && high >= point2) {
                        setProfit(orderPrice, point2, closeTime);
                        winNum++;
                        reset();
                        preEma = curEma;
                        continue;
                    }
                    // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
                    if (hasOrder && trend === "down" && low <= point1) {
                        setProfit(orderPrice, point1, closeTime);
                        winNum++;
                        reset();
                        preEma = curEma;
                        continue;
                    }
                }
            }

            preEma = curEma;
        }
    }

    // 平仓最后一次
    if (hasOrder) {
        const len = kLineData.length;
        const curkLine = kLineData[len - 1];
        const { close, closeTime, low, high } = curkLine;
        const [point1, point2] = gridPoints;
        if (hasOrder) {
            // 判断止损
            if (trend === "up") {
                // low 小于 point1 就止损，否则继续持有
                if (low <= point1) {
                    setProfit(orderPrice, point1, closeTime);
                    failNum++;
                    reset();
                    return;
                }
            }
            if (hasOrder && trend === "down") {
                // high 大于 point2 就止损，否则继续持有
                if (high >= point2) {
                    setProfit(orderPrice, point2, closeTime);
                    failNum++;
                    reset();
                    return;
                }
            }
        }
        if (hasOrder) {
            // 判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
            if (trend === "up" && high >= point2) {
                setProfit(orderPrice, point2, closeTime);
                winNum++;
                reset();
                return;
            }
            // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
            if (hasOrder && trend === "down" && low <= point1) {
                setProfit(orderPrice, point1, closeTime);
                winNum++;
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
    flagKlineCount = 0;
};
// 指标判断方向 / 交易
const judgeTradingDirection = ({ preEma, curEma, kLines }) => {
    let [kLine1, kLine2, kLine3] = kLines;
    let [curEma12, curEma144, curEma169] = curEma;
    let [preEma12, preEma144, preEma169] = preEma;
    // 多头行情
    // 准备条件一： curEma12 > curEma144 > curEma169 && preEma12 > preEma144 > preEma169
    // 准备条件二: kLine3.low <= curEma144 && kLine3.low >= curEma169
    if (
        // 准备条件一
        curEma12 > curEma144 &&
        curEma144 > curEma169 &&
        preEma12 > preEma144 &&
        preEma144 > preEma169 &&
        // 准备条件二
        kLine3.low <= curEma144 &&
        kLine3.low >= curEma169
    ) {
        // 有订单时候只设置 下一个订单方向 还不能开单
        readyTradingDirection = "up";
        return;
    }
    // 多头行情
    // 准备条件一： curEma12 < curEma144 < curEma169 && preEma12 < preEma144 < preEma169
    // 准备条件二: kLine3.high >= curEma144 && kLine3.high <= curEma169
    if (
        // 准备条件一
        curEma12 < curEma144 &&
        curEma144 < curEma169 &&
        preEma12 < preEma144 &&
        preEma144 < preEma169 &&
        // 准备条件二
        kLine3.high >= curEma144 &&
        kLine3.high <= curEma169
    ) {
        // 有订单时候只设置 下一个订单方向 还不能开单
        readyTradingDirection = "down";
        return;
    }
    return "hold";
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
const judgeAndTrading = ({ preEma, curEma, kLines }) => {
    // 根据指标判断是否可以开单
    const [, , curkLine] = kLines;
    const trendInfo = calculateTradingSignal({ preEma, curEma, kLines });
    const { stopLoss, stopProfit } = trendInfo;

    // 开单
    switch (trendInfo.trend) {
        case "up":
            trend = "up";
            setGridPoints("up", stopLoss, stopProfit, curkLine.close);
            readyTradingDirection = "hold";
            isReadyStopProfit = false;
            hasOrder = true;
            openHistory.push(curkLine.openTime + "   " + JSON.stringify(curEma)); // 其实开单时间是：curkLine.closeTime，binance的时间显示的是open Time，方便调试这里记录openTime
            break;
        case "down":
            trend = "down";
            setGridPoints("down", stopLoss, stopProfit, curkLine.close);
            readyTradingDirection = "hold";
            isReadyStopProfit = false;
            hasOrder = true;
            openHistory.push(curkLine.openTime + "   " + JSON.stringify(curEma)); // 其实开单时间是：curkLine.closeTime，binance的时间显示的是open Time，方便调试这里记录openTime
            break;
        default:
            break;
    }
};
const calculateTradingSignal = ({ preEma, curEma, kLines }) => {
    const [kLine1, kLine2, kLine3] = kLines;
    const { open, close, closeTime, low, high } = kLine3;
    let [curEma12, curEma144, curEma169] = curEma;
    let [preEma12, preEma144, preEma169] = preEma;
    const max = Math.max(kLine1.high, kLine2.high, kLine3.high);
    const min = Math.min(kLine1.low, kLine2.low, kLine3.low);
    if (
        readyTradingDirection === "up" &&
        close > open &&
        curEma12 > curEma144 &&
        curEma144 > curEma169 &&
        (isBottomFractal(kLine1, kLine2, kLine3) || // 是否底分形态
            isBigAndYang(kLine3, 0.85) ||
            (isUpLinesGroup2(kLine2, kLine3) && (isUpCross(kLine1) || isBigAndYang(kLine1, 0.6))) || // 是否两个k形成垂线
            (isUpLinesGroup3(kLine1, kLine2, kLine3) && (isBigAndYang(kLine3, 0.6) || isUpCross(kLine3, 0.4))) || // 是否三个k形成垂线
            (isUpSwallow(kLine2, kLine3) && kLine3.high > kLine1.high) || // 看涨吞没
            (isUpSwallow(kLine1, kLine2) && isBigAndYang(kLine3, 0.6)) || // 看涨吞没 + 大阳k
            (isUpLinesGroup2(kLine1, kLine2) && (isUpCross(kLine3) || isBigLine(kLine3, 0.6))) || // k1，k2刺透, k3垂线
            isUpStar(kLine1, kLine2, kLine3) || // 启明星
            isBreakUp(kLine1, kLine2, kLine3) || // k3 突破k1/k2，k3是光k
            upPao(kLine1, kLine2, kLine3)) &&
        curEma12 > preEma12 &&
        close > curEma12 &&
        curEma12 >= low &&
        low > curEma144
    ) {
        // 计算atr
        // const { atr } = calculateATR(curKLines, 14);
        return {
            trend: "up",
            stopLoss: min, // 止损
            stopProfit: close + candleHeight * howManyCandle, // 止盈
            // stopProfit: close + (close - min) * howManyCandle, // 止盈
        };
    }
    if (
        readyTradingDirection === "down" &&
        close < open &&
        curEma12 < curEma144 &&
        curEma144 < curEma169 &&
        ((isLowerLow(kLine1, kLine2, kLine3) && isBigLine(kLine3, 0.6)) || // 顶顶高 k3是光k / 三小连阳
            isBigAndYin(kLine3, 0.85) ||
            isTopFractal(kLine1, kLine2, kLine3) || // 是否顶分形态
            (isDownLinesGroup2(kLine2, kLine3) && (isDownCross(kLine1) || isBigAndYin(kLine1, 0.6))) || // 是否两个k形成垂线/光头阴
            (isDownLinesGroup3(kLine1, kLine2, kLine3) && (isBigAndYin(kLine3, 0.6) || isDownCross(kLine3, 0.4))) || // 是否三个k形成垂线
            (isDownSwallow(kLine2, kLine3) && kLine3.low < kLine1.low) || // 看跌吞没
            (isDownSwallow(kLine1, kLine2) && isBigAndYin(kLine3, 0.6)) || // 看跌吞没 + 大阴k
            (isDownLinesGroup2(kLine1, kLine2) && (isDownCross(kLine3) || isBigLine(kLine3, 0.6))) || // k1，k2刺透, k3垂线/大k
            isDownStar(kLine1, kLine2, kLine3) || // 启明星
            isBreakDown(kLine1, kLine2, kLine3) || // k3 突破k1/k2，k3是光k
            downPao(kLine1, kLine2, kLine3)) &&
        curEma12 < preEma12 &&
        close < curEma12 &&
        curEma12 <= high &&
        high < curEma144
    ) {
        // 计算atr
        // const { atr } = calculateATR(curKLines, 14);
        return {
            trend: "down",
            stopLoss: max, // 止损
            stopProfit: close - candleHeight * howManyCandle, // 止盈
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

function run() {
    start();
    const result = {
        availableMoney,
        winNum,
        failNum,
        testMoney,
        maxMoney,
        minMoney,
        winRate: ((winNum / (winNum + failNum)) * 100).toFixed(3) + "%",
    };
    console.log("最终结果::", result);
    console.log("length::", openHistory.length, closeHistory.length, trendHistory.length);
    // https://echarts.apache.org/examples/zh/editor.html?c=line-simple
    writeInFile(
        `./tests/data/${symbol}-test-vegas.js`,
        `
var openHistory = ${JSON.stringify(openHistory, null, 2)}
var closeHistory = ${JSON.stringify(closeHistory, null, 2)}
var trendHistory = ${JSON.stringify(trendHistory, null, 2)}
var valueFormatter = (value, index) => '[openTime:' + openHistory[index] + ']' + '\\n\\r' + '[closeTime:' + closeHistory[index] + ']' + '\\n\\r' + '[trend:' + trendHistory[index] + ']' + '\\n\\r' +'[testMoney:' + value + ']'

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
    `,
    );
}
run();
module.exports = {
    evaluateStrategy: start,
};
