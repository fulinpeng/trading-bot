const { getLastFromArr, getSequenceArr } = require("../utils/functions");
// const { calculateCandleHeight, isBigAndYang, isBigAndYin } = require("../utils/kLineTools");
// const { findVandAPoints } = require("../utils/rangeSearch");
const { calculateATR } = require("../utils/atr.js");
const { calculateKDJ } = require("../utils/KDJ.js");
const { calculateSimpleMovingAverage } = require("../utils/ma.js");
const fs = require("fs");
const { calculateRSI } = require("../utils/rsi.js");
// const { emaMacrossover } = require("../utils/ema_ma_crossover.js");
const { calculateBBKeltnerSqueeze } = require("../utils/BBKeltner.js");
let { kLineData } = require("./source/zkUSDT-1m.js");
// let { kLineData } = require("./source/1000pepeUSDT-1m.js");
// let { kLineData } = require("./source/peopleUSDT-1m.js");

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
const symbol = "zkUSDT";

//////////////////////////////////////////////////////////////////////////////////////////////////////////

// 经过测试发现，着补回来的回撤很大，还不如不着补
// judgeByBBK = true 时，对冲在20次左右就盈利出了，不需要开启 profitRate缩放
//                   回撤小一点
// 看指标/缩放 两个的对比，本次看不出来

// 不看指标，不缩放：
// 不看指标，缩放：
// 看指标，不缩放：
// 看指标，缩放：

const diff = 10;
let times = getSequenceArr(diff, 100);
const maPeriod = 60; // ma
const BBK_PERIOD = 100;
const RSI_PERIOD = 60;
const B2mult = 1;
const Kmult = 1.5;
const atrRate = 0.01;
const availableMoney = 6;
const profitRate = 5;
const scaleProfitRateNum = 20;
const isScaleProfitRate = true; // true false; // 保守一点的话，开启 profitRate缩放 ⭐️
const isBuyToCover = false; // true false; // 是否着补回来
const stopLossRate = 0.6;
const protectValue = 500;
const protectProfit = false; // true false; // 更保守的话开启利润保护
const howManyNumBegainPlus = 10;
const initNum = 10; // parseInt(times.length / 3);
const shortPointLen = 10; // shortPointLen 个对冲次数盈利说明趋势明显，不是盘整

const judgeByBBK = true; //  true false; 根据bbk指标来开单 ⭐️
let curProfitRate = profitRate;
let curDiff = diff;

//////////////////////////////////////////////////////////////////////////////////////////////////////////

const getQuantity = (currentPrice) => {
    return Math.round((availableMoney * times[historyEntryPoints.length - 1]) / currentPrice);
};

let modelType = 1;
let gridPoints2 = [];
let maArr = [];
let closeOrderHistory = [];

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
let date = [];

let curKLines = [];
let prices = [];

const closeTrend = (orderPrice, currentPrice) => {
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
};
let curkLine = {};
let crossGrideLength = [];
let availableMoneyArr = [];
let issqueeze = false;
let issqueezeArr = [];
let rsi = 0;
let rsiArr = [];
let stop = false;
const checkTrad = () => {
    return judgeByBBK ? !issqueeze : true;
};
const getStop = () => {
    // 未开启利润保护，返回false，表示永不停歇
    if (!protectProfit) return false;
    // 开启利润保护，如果 maxMoney >= protectValue 就开启保护模式
    if (maxMoney >= protectValue) {
        return testMoney * stopLossRate <= protectValue; // 利润回撤小于 stopLossRate 了，停止交易，并发送邮件
    }
    // 开启利润保护，如果 maxMoney < protectValue 就继续持有，表示暂时不停歇
    else {
        return false;
    }
};

const start = () => {
    // let index = kLineData.findIndex((v) => v.openTime === "2024-07-01_00-00-00");
    // kLineData = kLineData.slice(index);
    let num = 0;
    for (let idx = 260; idx < kLineData.length; idx++) {
        if (getStop()) return;
        curKLines = kLineData.slice(idx - 260, idx);
        prices = curKLines.map((v) => v.close);

        maArr = [
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 10), maPeriod),
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 5), maPeriod),
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 0), maPeriod),
        ];
        curkLine = kLineData[idx];

        let { B2basis, B2upper, B2lower, Kma, Kupper, Klower, squeeze } = calculateBBKeltnerSqueeze(
            curKLines,
            BBK_PERIOD,
            B2mult,
            Kmult,
        );

        const curB2upper = getLastFromArr(B2upper, 1)[0];
        const curKupper = getLastFromArr(Kupper, 1)[0];
        const curB2lower = getLastFromArr(B2lower, 1)[0];
        const curKlower = getLastFromArr(Klower, 1)[0];
        issqueeze = getLastFromArr(squeeze, 1)[0];

        // rsi = calculateRSI(prices, RSI_PERIOD);

        // curKupper < curB2upper && curKlower > curB2lower
        if (issqueeze) {
            num++;
        }

        // 准备开仓：判断 开单方向
        if (!hasOrder) {
            if (readyTradingDirection === "hold") {
                if (judgeByBBK) {
                    if (checkTrad()) {
                        if (curkLine.close > curB2upper) {
                            readyTradingDirection = "up";
                        }
                        if (curkLine.close < curB2lower) {
                            readyTradingDirection = "down";
                        }
                    }
                } else {
                    readyTradingDirection = maArr[2] < maArr[3] ? "up" : "down";
                }
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

    testMoney = testMoneyHistory[testMoneyHistory.length - 1];
    judgeByBBK && console.log("🚀 ~ 挤压k数量，总k数量，挤压/总k:", num, kLineData.length, num / kLineData.length);
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
const setGridPoints = (trend, _currentPrice, curkLine, _atrRate = atrRate) => {
    const gridHeight = _currentPrice * _atrRate;

    if (trend === "up") {
        const point2 = _currentPrice;
        const point1 = point2 - gridHeight;
        const point3 = point2 + gridHeight * curProfitRate;
        const point0 = point1 - gridHeight * curProfitRate;

        gridPoints = [point0, point1, point2, point3];
        if (!historyEntryPoints.length) historyEntryPoints = [2];
    }

    if (trend === "down") {
        const point1 = _currentPrice;
        const point2 = point1 + gridHeight;
        const point0 = point1 - gridHeight * curProfitRate;
        const point3 = point2 + gridHeight * curProfitRate;

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

    // setLine 辅助指标线
    setLinesOpen();
};
const teadeSell = (_currentPrice) => {
    orderPrice = _currentPrice;
    trend = "down";
    currentPointIndex = 1;
    readyTradingDirection = "hold";
    hasOrder = true;
    quantity = getQuantity(_currentPrice);

    // setLine 辅助指标线
    setLinesOpen();
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
            setGridPoints("up", curkLine.close, curkLine);
            teadeBuy(curkLine.close);
            break;
        case "down":
            setGridPoints("down", curkLine.close, curkLine);
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
        if (closeOrderHistory.length >= 2 && typeof closeOrderHistory[closeOrderHistory.length - 2][0] === "string") {
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
    const historyEntryPointsLlen = _historyEntryPoints.length;
    if (_currentPointIndex === 0) {
        closeOrderHistory.push([..._historyEntryPoints]);
        closeTrend(orderPrice, _currentPrice);
        reset();

        if (
            isScaleProfitRate &&
            historyEntryPointsLlen <= shortPointLen &&
            (curProfitRate < profitRate || curDiff < diff)
        ) {
            if (curProfitRate + 1 <= profitRate) {
                curProfitRate += 1;
            } else {
                curProfitRate = profitRate;
            }
            if (curDiff + 2 <= diff) {
                curDiff += 2;
            } else {
                curDiff = diff;
            }
            times = getSequenceArr(curDiff, 100);
        }

        if (isBuyToCover && checkHistoryEntryPoints(_historyEntryPoints)) {
            historyEntryPoints = [...new Array(initNum).fill(-1), 1];
        }
        // if (checkTrad()) {
        //     // 非条件开单，就是延续趋势开单
        //     setGridPoints("up", _currentPrice);
        //     teadeBuy(_currentPrice);
        // }
        setLinesClose();
        if (protectProfit && testMoney / maxMoney < stopLossRate) {
            stop = true;
        }
        return;
    } else if (_currentPointIndex === 3) {
        closeOrderHistory.push([..._historyEntryPoints]);
        closeTrend(orderPrice, _currentPrice);
        reset();

        if (
            isScaleProfitRate &&
            historyEntryPointsLlen <= shortPointLen &&
            (curProfitRate < profitRate || curDiff < diff)
        ) {
            if (curProfitRate + 1 <= profitRate) {
                curProfitRate += 1;
            } else {
                curProfitRate = profitRate;
            }
            if (curDiff + 2 <= diff) {
                curDiff += 2;
            } else {
                curDiff = diff;
            }
            times = getSequenceArr(curDiff, 100);
        }

        if (isBuyToCover && checkHistoryEntryPoints(_historyEntryPoints)) {
            historyEntryPoints = [...new Array(initNum).fill(-1), 2];
        }
        // if (checkTrad()) {
        //     // 非条件开单，就是延续趋势开单
        //     setGridPoints("down", _currentPrice);
        //     teadeSell(_currentPrice);
        // }
        setLinesClose();
        if (protectProfit && testMoney / maxMoney < stopLossRate) {
            stop = true;
        }
        return;
    } else if (_currentPointIndex === 1) {
        closeTrend(orderPrice, _currentPrice);

        // 缩放止盈比例
        if (
            isScaleProfitRate &&
            (historyEntryPointsLlen === scaleProfitRateNum ||
                ((curProfitRate !== profitRate || curDiff !== diff) &&
                    (historyEntryPointsLlen - scaleProfitRateNum) % 3 === 0))
        ) {
            if (curProfitRate - 1 >= 2) {
                curProfitRate -= 1;
            } else {
                curProfitRate = 2;
            }
            if (curDiff - 2 >= 1) {
                curDiff -= 2;
            } else {
                curDiff = 1;
            }
            console.log("🚀 ~ file: curProfitRate,curDiff:", curProfitRate, curDiff);
            times = getSequenceArr(curDiff, 100);
            setGridPoints("down", _currentPrice, undefined, curProfitRate);
            teadeSell(_currentPrice);
            // 反手
            // historyEntryPoints[historyEntryPointsLlen - 1] *= -1;
            // currentPointIndex *= -1;
            // closeOrderHistory.push([..._historyEntryPoints.map((v) => v + "")]);
            // reset();
            // setLinesClose();
        } else {
            setGridPoints("down", _currentPrice);
            teadeSell(_currentPrice);
        }
    } else if (_currentPointIndex === 2) {
        closeTrend(orderPrice, _currentPrice);

        // 缩放止盈比例
        if (
            isScaleProfitRate &&
            (historyEntryPointsLlen === scaleProfitRateNum ||
                ((curProfitRate !== profitRate || curDiff !== diff) &&
                    (historyEntryPointsLlen - scaleProfitRateNum) % 3 === 0))
        ) {
            if (curProfitRate - 1 >= 2) {
                curProfitRate -= 1;
            } else {
                curProfitRate = 2;
            }
            if (curDiff - 2 >= 1) {
                curDiff -= 2;
            } else {
                curDiff = 1;
            }
            times = getSequenceArr(curDiff, 100);
            setGridPoints("up", _currentPrice, undefined, curProfitRate);
            teadeSell(_currentPrice);
            // 反手
            // historyEntryPoints[historyEntryPointsLlen - 1] *= -1;
            // currentPointIndex *= -1;

            // closeOrderHistory.push([..._historyEntryPoints.map((v) => v + "")]);
            // reset();
            // setLinesClose();
        } else {
            setGridPoints("up", _currentPrice);
            teadeBuy(_currentPrice);
        }
    }
};

function setLinesClose() {
    testMoneyHistory.push(testMoney);
    date.push(curkLine.openTime);
    let lastTrendInfo = closeOrderHistory[closeOrderHistory.length - 1];
    availableMoneyArr.push(times[lastTrendInfo.length - 2] * availableMoney);
    crossGrideLength.push(lastTrendInfo.length - 1);
}
function setLinesOpen() {
    if (!judgeByBBK) return;
    issqueezeArr.push(issqueeze === true ? 0.1 : -0.1);
    rsiArr.push(rsi);
}

function writeInFile(fileName, data) {
    fs.writeFileSync(fileName, `var result = ${JSON.stringify(data)}`, {
        flag: "w",
    });
}
start();

const tradeCount = testMoneyHistory.length;
const result = {
    testMoney,
    maxMoney,
    minMoney,
    tradeCount,
    closeOrderHistory,
    option: {
        xAxis: {
            type: "category",
            data: date,
        },
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "cross",
            },
            valueFormatter: (value, index) => index + "-" + value,
        },
        yAxis: {
            type: "value",
        },
        series: [
            {
                name: "当前盈利",
                data: testMoneyHistory,
                type: "line",
                markPoint: {
                    data: [
                        { type: "max", name: "Max" },
                        { type: "min", name: "Min" },
                    ],
                },
                valueFormatter: (value) => value,
            },
            {
                name: "对冲次数",
                data: crossGrideLength,
                type: "line",
                // valueFormatter: (value) => (value / 20).toFixed(0),
                markPoint: {
                    data: [{ type: "max", name: "Max" }],
                },
            },
            // {
            //     name: "rsi",
            //     data: rsiArr,
            //     type: "line",
            //     // valueFormatter: (value) => (value == 100 ? "盘整区" : "趋势中"),
            // },
        ],
    },
};

const maxPosition = closeOrderHistory.map((v) => v.length).reduce((max, cur) => (max = max < cur ? cur : max), 0);

console.log("最终结果::", {
    testMoney,
    maxMoney,
    minMoney,
    tradeCount,
    maxPosition,
    maxPositionMoney: availableMoney * times[maxPosition - 1],
});

// https://echarts.apache.org/examples/zh/editor.html?c=line-simple
writeInFile(`./tests/data/mading-${symbol}.js`, {
    ...result,
});
