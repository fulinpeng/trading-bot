/***
 *
 * 网格高度：根据howManyNumForAvarageCandleHight动态计算平均k线高度
 * 等比数列：1.1
 *
 *
 */

const { getLastFromArr, getSequenceArr } = require("../utils/functions");
const { calculateCandleHeight, isBigAndYang, isBigAndYin } = require("../utils/kLineTools");
// const { findVandAPoints } = require("../utils/rangeSearch");
const { calculateATR } = require("../utils/atr.js");
const { calculateKDJ } = require("../utils/KDJ.js");
const { calculateSimpleMovingAverage } = require("../utils/ma.js");
const fs = require("fs");
const { calculateRSI } = require("../utils/rsi.js");
// const { emaMacrossover } = require("../utils/ema_ma_crossover.js");
const { calculateBBKeltnerSqueeze } = require("../utils/BBKeltner.js");
let { kLineData } = require("./source/bomeUSDT-1m.js");
// let { kLineData } = require("./source/zkUSDT-1m.js");
// let { kLineData } = require("./source/dogeUSDT-1m.js");
// let { kLineData } = require("./source/1000pepeUSDT-1m.js");
// let { kLineData } = require("./source/peopleUSDT-1m.js");

// let howManyCandle = 1;
//////////////////////////////////////////////////////////////////////////////////////////////////////////

const symbol = "bomeUSDT3";
const diff = 2;
const profitRate = 5.5;
// let times = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
let times = [1, 1.1, 2.2, 4.4, 8.8, 17.6, 35.2, 70.4, 140.8, 281.6, 563.2, 1126.4];
const maPeriod = 60; // ma
const BBK_PERIOD = 100;
const RSI_PERIOD = 60;
const B2mult = 1;
const Kmult = 1.5;
const howManyCandleHeight = 3;
const howManyNumForAvarageCandleHight = 9;
const availableMoney = 6;
const mostCount = 3; // 是通过 canStop = false 跑出来的结果
let overNumberToRest = 12; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
const canStop = true; // true false; // 开启 启动/停止 模式 ⭐️
let isResting = false; // 启动/停止
const stopLossRate = 0.6;
const protectValue = 500;
const protectProfit = false; // true false; // 更保守的话开启利润保护
const howManyNumBegainPlus = 11;
const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
// //////////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "zkUSDT";
// const diff = 2;
// const profitRate = 5;
// // let times = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
// let times = [1, 1.1, 2.2, 4.4, 8.8, 17.6, 35.2, 70.4, 140.8, 281.6, 563.2, 1126.4];
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const B2mult = 1;
// const Kmult = 1.5;
// const howManyCandleHeight = 2.5;
// const howManyNumForAvarageCandleHight = 9;
// const availableMoney = 6;
// const mostCount = 3; // 是通过 canStop = false 跑出来的结果
// let overNumberToRest = 10; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = true; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = true; //  true false; 根据bbk指标来开单 ⭐️

//////////////////////////////////////////////////////////////////////////////////////////////////

// const symbol = "dogeUSDT";
// const profitRate = 5;
// // let times = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
// let times = [1, 1.1, 2.2, 4.4, 8.8, 17.6, 35.2, 70.4, 140.8, 281.6, 563.2, 1126.4];
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const B2mult = 1;
// const Kmult = 1.5;
// const howManyCandleHeight = 3; // (gridHeight = 平均蜡烛高度 * howManyCandleHeight)
// const howManyNumForAvarageCandleHight = 9;
// const availableMoney = 6;
// const mostCount = 3; // 是通过 canStop = false 跑出来的结果
// let overNumberToRest = 10; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = true; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
//////////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "1000pepeUSDT";
// const diff = 2;
// const profitRate = 4;
// let times = [1, 1.1, 2.2, 4.4, 8.8, 17.6, 35.2, 70.4, 140.8, 281.6, 563.2, 1126.4];
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const B2mult = 1;
// const Kmult = 1.5;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 3; // 3 6 8 不错
// const availableMoney = 6;
// const mostCount = 3; // 是通过 canStop = false 跑出来的结果
// let overNumberToRest = 10; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = true; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
////////////////////////////////////////////////////////////////////////////////////////////////////////

const getQuantity = (currentPrice) => {
    let q = Math.round((availableMoney * times[historyEntryPoints.length - 1]) / currentPrice);
    return q;
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
let gridHeight = 0;

let curKLines = [];
let prices = [];

const closeTrend = (orderPrice, currentPrice) => {
    if (isResting) return;
    let preTestMoney = testMoney;
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
let candleHeight = 0;

let positionType = [];
const checkTrad = () => {
    return judgeByBBK ? !issqueeze : true;
};
const getStop = () => {
    // 未开启利润保护，返回false，表示永不停歇
    if (!protectProfit) return false;
    // 开启利润保护，如果 maxMoney >= protectValue 就开启保护模式
    if (maxMoney >= protectValue) {
        return testMoney <= maxMoney * 0.8; // 利润回撤小于 stopLossRate 了，停止交易，并发送邮件
    }
    // 开启利润保护，如果 maxMoney < protectValue 就继续持有，表示暂时不停歇
    else {
        return false;
    }
};

const start = () => {
    // let index = kLineData.findIndex((v) => v.openTime === "2024-05-24_00-00-00");
    // kLineData = kLineData.slice(index);
    let num = 0;
    for (let idx = 260; idx < kLineData.length; idx++) {
        if (getStop()) {
            testMoneyHistory.push(testMoney);
            date.push(curkLine.closeTime);
            return;
        }
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

        candleHeight = calculateCandleHeight(getLastFromArr(curKLines, howManyNumForAvarageCandleHight));

        // 设置 candleHeight 的上下限
        // if (candleHeight < 0.0000675) {
        //     candleHeight = 0.0000675;
        // } else if (candleHeight > 0.00011333) {
        //     candleHeight = 0.00011333;
        // }

        // rsi = calculateRSI(prices, RSI_PERIOD);

        // curKupper < curB2upper && curKlower > curB2lower
        if (issqueeze) {
            num++;
        }

        // 准备开仓：判断 开单方向
        if (!hasOrder && !isResting) {
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
                hasOrder && startRunGrid(curkLine);
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
    candleHeight = 0;
    gridHeight = 0;
};

// 设置网格
const setGridPoints = (trend, _currentPrice, curkLine, _profitRate = profitRate) => {
    gridHeight = candleHeight * howManyCandleHeight;

    if (trend === "up") {
        const point2 = _currentPrice;
        const point1 = point2 - gridHeight;
        const point3 = point2 + gridHeight * _profitRate;
        const point0 = point1 - gridHeight * _profitRate;

        gridPoints = [point0, point1, point2, point3];
        if (!historyEntryPoints.length) {
            historyEntryPoints = [2];
            currentPointIndex = 2;
        }
        // isResting 的时候，gridPoints会在 0/3 处被reset重置
    }

    if (trend === "down") {
        const point1 = _currentPrice;
        const point2 = point1 + gridHeight;
        const point0 = point1 - gridHeight * _profitRate;
        const point3 = point2 + gridHeight * _profitRate;

        gridPoints = [point0, point1, point2, point3];
        if (!historyEntryPoints.length) {
            historyEntryPoints = [1];
            currentPointIndex = 1;
        }
        // isResting 的时候，gridPoints会在 0/3 处被reset重置
    }

    // let maxProfitMoney = Math.min(
    //     ((gridPoints[3] - gridPoints[2]) / gridPoints[2]) * availableMoney * 5.5,
    //     ((gridPoints[1] - gridPoints[0]) / gridPoints[0]) * availableMoney * 5.5,
    // );
    // let everyFailMoney =
    //     ((gridPoints[2] - gridPoints[1]) / gridPoints[1]) * availableMoney * 5.5 + availableMoney * 1.1 * 0.0007 * 2;

    // overNumberToRest = maxProfitMoney / everyFailMoney;
    // console.log("🚀 ~ file: test-mading2.js:249 ~ setGridPoints ~ overNumberToRest:", overNumberToRest);
};
const teadeBuy = (_currentPrice) => {
    orderPrice = _currentPrice;
    trend = "up";
    readyTradingDirection = "hold";
    hasOrder = true;
    quantity = getQuantity(_currentPrice);

    // setLine 辅助指标线
    setLinesOpen();
};
const teadeSell = (_currentPrice) => {
    orderPrice = _currentPrice;
    trend = "down";
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
        if (closeOrderHistory.length >= 2 && typeof closeOrderHistory[closeOrderHistory.length - 2][0] === "string") {
            return true;
        }
    }
    return false;
};
let candleHeightAndGridPoints = [];
const gridPointTrading2 = () => {
    const _currentPrice = gridPoints[currentPointIndex];
    const _currentPointIndex = currentPointIndex;
    const _historyEntryPoints = historyEntryPoints;
    const gridH = gridPoints[2] - gridPoints[1];
    const historyEntryPointsLlen = _historyEntryPoints.length;
    if (_currentPointIndex === 0) {
        if (isResting) {
        } else {
            closeOrderHistory.push([..._historyEntryPoints]);
            closeTrend(orderPrice, _currentPrice);
            setLinesClose("success");
        }
        reset();

        isResting = false;

        if (protectProfit && testMoney / maxMoney < stopLossRate) {
            stop = true;
        }
        return;
    } else if (_currentPointIndex === 3) {
        if (isResting) {
        } else {
            closeOrderHistory.push([..._historyEntryPoints]);
            closeTrend(orderPrice, _currentPrice);
            setLinesClose("success");
        }
        reset();

        isResting = false;

        if (protectProfit && testMoney / maxMoney < stopLossRate) {
            stop = true;
        }
        return;
    } else if (_currentPointIndex === 1) {
        if (!isResting) {
            closeTrend(orderPrice, _currentPrice);
        }

        // 休息
        if (canStop && !isResting && historyEntryPointsLlen == overNumberToRest) {
            closeOrderHistory.push(_historyEntryPoints.map((v) => 0));
            setLinesClose("warning");
            isResting = true;
        }

        if (!isResting) {
            teadeSell(_currentPrice);
        }
    } else if (_currentPointIndex === 2) {
        if (!isResting) {
            closeTrend(orderPrice, _currentPrice);
        }

        // 休息
        if (canStop && !isResting && historyEntryPointsLlen == overNumberToRest) {
            closeOrderHistory.push(_historyEntryPoints.map((v) => 0));
            setLinesClose("warning");
            isResting = true;
        }
        if (!isResting) {
            teadeBuy(_currentPrice);
        }
    }
};

function setLinesClose(type) {
    if (isResting) return;
    testMoneyHistory.push(testMoney);
    date.push(curkLine.openTime);
    let lastTrendInfo = closeOrderHistory[closeOrderHistory.length - 1];
    availableMoneyArr.push(times[lastTrendInfo.length - 2] * availableMoney);
    crossGrideLength.push(lastTrendInfo.length);
    positionType.push(type === "success" ? 1 : -1);
    candleHeightAndGridPoints.push({
        date: curkLine.openTime,
        trend,
        orderPrice,
        candleHeight,
        gridHeight,
        gridPoints,
        closeOrderHistory: lastTrendInfo,
    });
}
function setLinesOpen() {
    if (!judgeByBBK || isResting) return;
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

const mostCountMap = {};
const maxPosition = closeOrderHistory
    .map((v) => {
        let len = v.length;
        if (mostCountMap[len]) {
            mostCountMap[len]++;
        } else {
            mostCountMap[len] = 1;
        }
        return len;
    })
    .reduce((max, cur) => (max = max < cur ? cur : max), 0);
let mostCountKey = 1;
let mostCountValue = 0;
Object.entries(mostCountMap).map(([key, value]) => {
    if (value > mostCountValue) {
        mostCountKey = key;
        mostCountValue = value;
    }
});

let maxCandleHeight = 0;
for (let i = 0; i < candleHeightAndGridPoints.length; i++) {
    const itemInfo = candleHeightAndGridPoints[i];
    if (maxCandleHeight < itemInfo.candleHeight) {
        maxCandleHeight = itemInfo.candleHeight;
    }
}
let transformDatasRate_candleHeight = maxMoney / maxCandleHeight / 2;

setLinesClose(); // 添加最后的仓位情况

const result = {
    profitRate,
    overNumberToRest,
    howManyNumForAvarageCandleHight,
    testMoney,
    maxMoney,
    minMoney,
    tradeCount,
    closeOrderHistory,
    mostCountMap,
    mostCountKey,
    mostCountValue,
    candleHeightAndGridPoints,
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
            //     max: 800,
            //     min: -800,
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
            {
                name: "仓位类型",
                data: positionType,
                type: "bar",
                // valueFormatter: (value) => (value == 100 ? "盘整区" : "趋势中"),
            },
            {
                name: `candleHeight`,
                data: candleHeightAndGridPoints.map((v) => v.candleHeight * transformDatasRate_candleHeight),
                type: "line",
            },
        ],
    },
};

console.log("最终结果::", {
    profitRate,
    overNumberToRest,
    howManyNumForAvarageCandleHight,
    testMoney,
    maxMoney,
    minMoney,
    tradeCount,
    mostCountKey,
    mostCountValue,
    mostCountMap: JSON.stringify(mostCountMap),
    maxPosition,
    maxPositionMoney: availableMoney * times[maxPosition - 1],
});

// https://echarts.apache.org/examples/zh/editor.html?c=line-simple
writeInFile(`./tests/data/mading-${symbol}.js`, {
    ...result,
});
