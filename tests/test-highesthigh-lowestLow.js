const { getDate, getLastFromArr, calculateHighLow } = require("../utils/functions");
const { calculateCandleHeight, isBigAndYang, isBigAndYin } = require("../utils/kLineTools");
const { calculateATR } = require("../utils/atr.js");
const { calculateSimpleMovingAverage } = require("../utils/ma.js");
const fs = require("fs");
const { calculateRSI } = require("../utils/rsi.js");

const symbol = "ethUSDT";
let { kLineData } = require(`./source/${symbol}-4h.js`);
let availableMoney = 10000;
// let howManyCandle = 1;
// let flagKlineCount = 0;
const maPeriod = 60; // ma
const basePeriod = 25; // 开单
const stopLossRatio = 6; // 止损
const stopProfitRatio = 10; // 止盈

const profitRate = 1;
const overNumber = 14; // 14 73.33%

const getQuantity = (currentPrice) => {
    return Math.round(availableMoney / currentPrice);
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
let dateHistory = [];
let testMoneyHistory = [];
let readyTradingDirection = "hold";
let hasOrder = false;
let candleHeight = 0;

const setProfit = (orderPrice, currentPrice, closeTime) => {
    if (trend === "up") {
        testMoney =
            testMoney + quantity * (currentPrice - orderPrice) - quantity * (orderPrice + currentPrice) * 0.00051;
    }
    if (trend === "down") {
        testMoney =
            testMoney + quantity * (orderPrice - currentPrice) - quantity * (orderPrice + currentPrice) * 0.00051;
    }
    if (testMoney > maxMoney) maxMoney = testMoney;
    if (testMoney < minMoney) minMoney = testMoney;
    testMoneyHistory.push(testMoney);
    dateHistory.push(closeTime);
};
const start = () => {
    for (let idx = 260; idx < kLineData.length; idx++) {
        const curKLines = kLineData.slice(idx - 260, idx);
        const prices = curKLines.map((v) => v.close);

        const maArr = [
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 2), maPeriod),
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 1), maPeriod),
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 0), maPeriod),
        ];
        const highLowBase = calculateHighLow(curKLines, basePeriod);

        candleHeight = calculateCandleHeight(kLineData.slice(idx - 9, idx));
        const curkLine = kLineData[idx];
        const { close, closeTime, low, high } = curkLine;

        // 准备开仓：判断 开单方向
        if (!hasOrder) {
            if (readyTradingDirection === "hold") {
                judgeTradingDirection({ maArr, highLowBase, curkLine });
                // if (readyTradingDirection !== "hold") flagKlineCount = 0;
            } else {
                // flagKlineCount++;
            }
            // 开仓：没有仓位就根据 readyTradingDirection 开单
            // 开单完成后会重置 readyTradingDirection
            if (readyTradingDirection !== "hold") {
                judgeAndTrading({ maArr, highLowBase, curkLine, curKLines });
                // if (flagKlineCount < overNumber) {
                // } else {
                //     reset();
                // }
            }
            continue;
        }
        // 有仓位就准备平仓
        else {
            // 更新止盈点
            if (trend) {
                const highLowStopProfit = calculateHighLow(curKLines, basePeriod * stopProfitRatio);
                if (trend === "up") {
                    gridPoints[1] = highLowStopProfit.maxHigh;
                }
                if (trend === "down") {
                    gridPoints[1] = highLowStopProfit.minLow;
                }
            }

            const [point1, point2] = gridPoints;
            // 有仓位就先判断是否止损
            if (trend) {
                if (trend === "up") {
                    // low 小于 point1 就止损，否则继续持有
                    if (close <= point1) {
                        setProfit(orderPrice, close, closeTime);
                        failNum++;
                        reset();
                        continue;
                    }
                }
                if (trend === "down") {
                    // high 大于 point2 就止损，否则继续持有
                    if (close >= point2) {
                        setProfit(orderPrice, close, closeTime);
                        failNum++;
                        reset();
                        continue;
                    }
                }
            }
            if (trend) {
                // 第二次判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
                if (trend && close >= point2) {
                    setProfit(orderPrice, close, closeTime);
                    winNum++;
                    reset();
                    continue;
                }
                // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
                if (trend && close <= point1) {
                    setProfit(orderPrice, close, closeTime);
                    winNum++;
                    reset();
                    continue;
                }
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
const judgeTradingDirection = ({ maArr, highLowBase, curkLine }) => {
    const [ma1, ma2, ma3] = maArr;
    if (ma1 < ma2 && ma2 < ma3) {
        // 有订单时候只设置 下一个订单方向 还不能开单
        readyTradingDirection = "up";
        return;
    }
    if (ma1 > ma2 && ma2 > ma3) {
        // 有订单时候只设置 下一个订单方向 还不能开单
        readyTradingDirection = "down";
        return;
    }
};

// 设置网格
const setGridPoints = (trend, stopLoss, stopProfit, _currentPrice) => {
    if (trend === "up") {
        let _stopLoss = stopLoss; // 止损
        let _stopProfit = stopProfit; // 止盈
        gridPoints = [_stopLoss, _stopProfit];
        // console.log("up ~ gridPoints:", gridPoints);
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
const judgeAndTrading = ({ maArr, highLowBase, curkLine, curKLines }) => {
    // 根据指标判断是否可以开单
    const trendInfo = calculateTradingSignal({ maArr, highLowBase, curkLine, curKLines });
    const { stopLoss, stopProfit } = trendInfo;
    // 开单
    switch (trendInfo.trend) {
        case "up":
            trend = "up";
            setGridPoints("up", stopLoss, stopProfit, curkLine.close);
            readyTradingDirection = "hold";
            isReadyStopProfit = false;
            hasOrder = true;
            break;
        case "down":
            trend = "down";
            setGridPoints("down", stopLoss, stopProfit, curkLine.close);
            readyTradingDirection = "hold";
            isReadyStopProfit = false;
            hasOrder = true;
            break;
        default:
            break;
    }
};
const calculateTradingSignal = ({ maArr, highLowBase, curkLine, curKLines }) => {
    const { close, closeTime, low, high } = curkLine;
    // 阳k，low > sma, rsi在[50,70]范围
    if (readyTradingDirection === "up" && isBigAndYin(curkLine, 0.1) && curkLine.close < highLowBase.minLow) {
        // 计算atr
        // const { atr } = calculateATR(curKLines, 14);
        const highLowStopLoss = calculateHighLow(curKLines, basePeriod * stopLossRatio);
        const highLowStopProfit = calculateHighLow(curKLines, basePeriod * stopProfitRatio);
        return {
            trend: "up",
            stopLoss: highLowStopLoss.minLow, // >>>>>> 这里有插针后引线过长导致止损过长的问题
            // stopProfit: close + (close - sma) * profitRate, // 止盈 // 这个曲线低一点
            stopProfit: highLowStopProfit.maxHigh, // 止盈 // 这个曲线高一点
        };
    }
    // 阴k，high < sma, rsi在[30,50]范围
    if (readyTradingDirection === "down" && isBigAndYang(curkLine, 0.1) && curkLine.close > highLowBase.maxHigh) {
        // 计算atr
        // const { atr } = calculateATR(curKLines, 14);
        const highLowStopLoss = calculateHighLow(curKLines, basePeriod * stopLossRatio);
        const highLowStopProfit = calculateHighLow(curKLines, basePeriod * stopProfitRatio);
        return {
            trend: "down",
            stopLoss: highLowStopLoss.minLow, // >>>>>> 这里有插针后引线过长导致止损过长的问题
            // stopProfit: close - (sma - close) * profitRate, // 止盈 // 这个曲线低一点
            stopProfit: highLowStopProfit.maxHigh, // 止盈 // 这个曲线高一点
        };
    }
    return {
        trend: "hold",
    };
};
function writeInFile(fileName, data) {
    fs.writeFileSync(fileName, `var result = ${JSON.stringify(data)}`, {
        flag: "w",
    });
}

start();
const result = {
    availableMoney,
    winNum,
    failNum,
    profitRate,
    testMoney,
    maxMoney,
    minMoney,
    winRate: ((winNum / (winNum + failNum)) * 100).toFixed(3) + "%",
};
console.log("最终结果::", result);

// https://echarts.apache.org/examples/zh/editor.html?c=line-simple
writeInFile(`./tests/data/${symbol}-test-BBK-2.js`, {
    ...result,
    dateHistory,
    testMoneyHistory,
});
