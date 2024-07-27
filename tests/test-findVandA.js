const { getDate, getLastFromArr, calculateHighLow } = require("../utils/functions");
const { calculateCandleHeight, isBigAndYang, isBigAndYin } = require("../utils/kLineTools");
const { findVandAPoints } = require("../utils/rangeSearch");
const { calculateATR } = require("../utils/atr.js");
const { calculateSimpleMovingAverage } = require("../utils/ma.js");
const fs = require("fs");
const { calculateRSI } = require("../utils/rsi.js");
const { emaMacrossover } = require("../utils/ema_ma_crossover.js");
// const { kLineData } = require("./source/zkUSDT-1m.js");
const { kLineData } = require("./source/dogeUSDT-1m.js");
/**
 *
 *
 * 添加了怎么找不回来的方法，有一点点效果，待更多数据验证
 * 超过9次对冲的，认为是在盘整，突破后可以着补一次(发现这样反而亏钱，还是不着补了)
 * 如下参数是最优的
 *
 *
 */
// let howManyCandle = 1;
const symbol = "eth";
// let times = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
// let times = [1, 4, 7, 10, 13, 16, 19, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60];
// let times = [1, 1.1, 2.2, 4.4, 8.8, 17.6, 35.2, 70.4, 140.8, 281.6, 563.2, 1126.4];
let times = [1, 1.1, 2.2, 4.4, 8.8, 17.6, 35.2, 70.4, 140.8, 281.6, 563.2, 1126.4];

const maPeriod = 60; // ma
let availableMoney = 10;
let profitRate = 4;
let overNumber = times.length;
let isBuyToCover = false; // true false; // 是否着补回来
let modelType = 1;
let gridPoints2 = [];
let initNum = 2;
let howManyNumBegainPlus = 10;

let maArr = [];
const getQuantity = (currentPrice) => {
    return Math.round((availableMoney * times[historyEntryPoints.length - 1]) / currentPrice);
};

let closeOrderHistory = [];
let PERIOD = 14;

let gridPoints = [];
let trend = "";
let currentPointIndex = -2;

let testMoney = 0;
let quantity = 0;
let orderPrice = 0;
let maxMoney = 0;
let minMoney = 0;
let testMoneyHistory = [];
let readyTradingDirection = "hold";
let hasOrder = false;
let historyEntryPoints = [];
let VandA = {};

let curKLines = [];
let prices = [];

const closeTrend = (orderPrice, currentPrice) => {
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
};
const start = () => {
    for (let idx = 260; idx < kLineData.length; idx++) {
        curKLines = kLineData.slice(idx - 260, idx);
        prices = curKLines.map((v) => v.close);

        maArr = [
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 10), maPeriod),
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 5), maPeriod),
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 0), maPeriod),
        ];
        const curkLine = kLineData[idx];

        // 准备开仓：判断 开单方向
        if (!hasOrder) {
            if (readyTradingDirection === "hold") {
                readyTradingDirection = maArr[2] < maArr[3] ? "up" : "down";
            }
            if (readyTradingDirection !== "hold") {
                judgeAndTrading({ maArr, curkLine });
            }
            continue;
        }
        // 有仓位就准备平仓
        else {
            if (modelType === 1) {
                historyEntryPoints.length && startRunGrid(curkLine);
            }
            if (modelType === 2) {
                checkOverGrid2(curkLine);
            }
        }
    }
};
const reset = () => {
    orderPrice = 0;
    trend = "";
    currentPointIndex = -2;
    readyTradingDirection = "hold";
    gridPoints = [];
    historyEntryPoints = [];
    hasOrder = false;
    quantity = 0;
    modelType = 1;
    gridPoints2 = [];
};

// 设置网格
const setGridPoints = (trend, _currentPrice) => {
    // 经过测试发现：
    // 1. 顺势开单比条件开单更好
    // 0.01*当前价，收益比较好，但是回撤非常大
    // 0.01*当前价，收益和回撤都是candleHeight网格的两倍
    // 所以结论是优化 0.01*当前价 的网格模式

    // 优化：
    // 将profitRate设置为2，亏损时是巨大的，是盈利的5倍，非常可怕，必须杜绝
    // 发现不管参数怎么设置，只要不大单止损，都是盈利的, profitRate=1.5最合适，太大/太小都是咔咔的亏（大单止损）
    // 其实很期望 profitRate = 2，的表现，不过需要优化大单止损问题

    const gridHeight = _currentPrice * 0.01; // 收益：38

    if (trend === "up") {
        const point2 = _currentPrice;
        const point1 = point2 - gridHeight;
        const point3 = point2 + gridHeight * profitRate;
        const point0 = point1 - gridHeight * profitRate;

        gridPoints = [point0, point1, point2, point3];
        if (!historyEntryPoints.length) historyEntryPoints = [2];
    }

    if (trend === "down") {
        const point1 = _currentPrice;
        const point2 = point1 + gridHeight;
        const point0 = point1 - gridHeight * profitRate;
        const point3 = point2 + gridHeight * profitRate;

        gridPoints = [point0, point1, point2, point3];
        if (!historyEntryPoints.length) historyEntryPoints = [1];
    }
};
const teadeBuy = (_currentPrice) => {
    orderPrice = _currentPrice;
    trend = "up";
    currentPointIndex = 2;
    readyTradingDirection = "hold";
    hasOrder = true;
    quantity = getQuantity(_currentPrice);
};
const teadeSell = (_currentPrice) => {
    orderPrice = _currentPrice;
    trend = "down";
    currentPointIndex = 1;
    readyTradingDirection = "hold";
    hasOrder = true;
    quantity = getQuantity(_currentPrice);
};

const startRunGrid = (curkLine) => {
    let _currentPointIndex = -1;
    const { low, high } = curkLine;

    for (let index = 0; index < gridPoints.length; index++) {
        const point = gridPoints[index];
        if (low <= point && point <= high) {
            _currentPointIndex = index;
            break;
        }
    }

    // 价格到了某个网格交易点
    if (_currentPointIndex !== -1) {
        if (currentPointIndex !== _currentPointIndex) {
            currentPointIndex = _currentPointIndex;

            setHistoryEntryPoints(currentPointIndex); // 实时交易点历史记录
            gridPointTrading2(); // 交易
        }
    }
};
const checkOverGrid2 = (curkLine) => {
    const [point1, point2] = gridPoints2;
    if (trend === "up") {
        if (curkLine.low <= point1) {
            // 止损平多
            closeTrend(orderPrice, point1);
            closeOrderHistory.push(["up-fail-1"]);
            reset();
        }
        if (curkLine.high >= point2) {
            // 止盈平多
            closeTrend(orderPrice, point2);
            closeOrderHistory.push(["up-success-2"]);
            reset();
        }
    }
    if (trend === "down") {
        if (curkLine.high >= point2) {
            // 止损平空
            closeTrend(orderPrice, point2);
            closeOrderHistory.push(["down-fail-2"]);
            reset();
        }
        if (curkLine.low <= point1) {
            // 止盈平空
            closeTrend(orderPrice, point1);
            closeOrderHistory.push(["down-success-1"]);
            reset();
        }
    }
};

// 进入交易点的历史记录
const setHistoryEntryPoints = (point) => {
    historyEntryPoints.push(point);
};
// 判断+交易
const judgeAndTrading = ({ maArr, curkLine }) => {
    // 开单
    switch (readyTradingDirection) {
        case "up":
            setGridPoints("up", curkLine.close);
            teadeBuy(curkLine.close);
            break;
        case "down":
            setGridPoints("down", curkLine.close);
            teadeSell(curkLine.close);
            break;
        default:
            break;
    }
};
const checkHistoryEntryPoints = (_historyEntryPoints) => {
    let len = _historyEntryPoints.filter((v) => v !== -1).length;
    let lastOnePointIndex = _historyEntryPoints[len - 1];
    if (lastOnePointIndex === 0 || lastOnePointIndex === 3) {
        if (len >= howManyNumBegainPlus) {
            return true;
        }
        if (typeof closeOrderHistory[closeOrderHistory.length - 2][0] === "string") {
            return true;
        }
    }
    return false;
};
const gridPointTrading2 = () => {
    const _currentPrice = gridPoints[currentPointIndex];
    const _currentPointIndex = currentPointIndex;
    const _historyEntryPoints = historyEntryPoints;
    const gridH = gridPoints[2] - gridPoints[1];
    if (_currentPointIndex === 0) {
        closeOrderHistory.push([..._historyEntryPoints]);
        closeTrend(orderPrice, _currentPrice);
        reset();

        // ****start
        // const rsi = calculateRSI(prices, PERIOD);
        // const { atr } = calculateATR(curKLines, PERIOD);
        // const lastKline = curKLines[curKLines.length - 1];
        // closeOrderHistory[closeOrderHistory.length - 1].push({
        //     rsi: rsi.toFixed(5),
        //     atr: atr.toFixed(5),
        // });
        // *****end

        if (isBuyToCover && checkHistoryEntryPoints(_historyEntryPoints)) {
            historyEntryPoints = [...new Array(initNum).fill(-1), 1];
        }
        // 非条件开单，就是延续趋势开单
        setGridPoints("up", _currentPrice);
        teadeBuy(_currentPrice);
        return;
    } else if (_currentPointIndex === 3) {
        closeOrderHistory.push([..._historyEntryPoints]);
        closeTrend(orderPrice, _currentPrice);
        reset();

        // ****start
        // const rsi = calculateRSI(prices, PERIOD);
        // const { atr } = calculateATR(curKLines, PERIOD);
        // const lastKline = curKLines[curKLines.length - 1];
        // closeOrderHistory[closeOrderHistory.length - 1].push({
        //     rsi: rsi.toFixed(5),
        //     atr: atr.toFixed(5),
        // });
        // *****end

        if (isBuyToCover && checkHistoryEntryPoints(_historyEntryPoints)) {
            historyEntryPoints = [...new Array(initNum).fill(-1), 2];
        }
        // 非条件开单，就是延续趋势开单
        setGridPoints("down", _currentPrice);
        teadeSell(_currentPrice);
        return;
    } else if (_currentPointIndex === 1) {
        closeTrend(orderPrice, _currentPrice);

        // 固定对冲次数止损
        if (_historyEntryPoints.length > overNumber) {
            closeOrderHistory.push([..._historyEntryPoints.map((v) => v + "")]);
            reset();
            if (isBuyToCover && checkHistoryEntryPoints(_historyEntryPoints)) {
                historyEntryPoints = [...new Array(initNum).fill(-1), 1];
            }
        }
        setGridPoints("down", _currentPrice);
        teadeSell(_currentPrice);
    } else if (_currentPointIndex === 2) {
        closeTrend(orderPrice, _currentPrice);
        // 固定对冲次数止损
        if (_historyEntryPoints.length > overNumber) {
            closeOrderHistory.push([..._historyEntryPoints.map((v) => v + "")]);
            reset();
            if (isBuyToCover && checkHistoryEntryPoints(_historyEntryPoints)) {
                historyEntryPoints = [...new Array(initNum).fill(-1), 2];
            }
        }
        setGridPoints("up", _currentPrice);
        teadeBuy(_currentPrice);
    }
};

function writeInFile(fileName, data) {
    fs.writeFileSync(fileName, `var result = ${JSON.stringify(data)}`, {
        flag: "w",
    });
}

start();
const result = {
    testMoney,
    maxMoney,
    minMoney,
    testMoneyHistory,
    closeOrderHistory,
    crossGrideLength: closeOrderHistory.map((v) => v.length - 1),
    availableMoney: closeOrderHistory.map((v) => times[v.length - 2] * availableMoney),
};
// console.log("最终结果::", result);

// https://echarts.apache.org/examples/zh/editor.html?c=line-simple
writeInFile(`./tests/data/${symbol}-test-findVandA.js`, {
    ...result,
});
