/***
 *
 * 等差数列：
 * 测试发现非常有效果
 * 根据 howManyNumForAvarageCandleHight 计算 candleHeight ，再计算 gridHeight
 * [1, 0] 之后99%的胜率，先关闭此选项测试出最佳数据，再开启即可
 * 每次盈利超过某个值就关闭仓位
 * 1. 时间维度：1m ， sum > 0.01 关仓
 *            也可以是 15m 60m 等，sum也可以是大于0
 * 2. 空间维度：价格每变化0.02，sum > 0 关仓
 *            也可以是 0.08 0.1 等
 * 3. 在 test-mading4-1.js 基础上加上伸缩，有的币种得到了改善比如：people
 * 
        if (isScale && historyEntryPointsLlen === scaleOverNum) {
            gridPoints[2] += candleHeight * scaleHight;
        }
        最新优化点是把 utils/function.js 的 getSequenceArr 中首次 10 
    ⭐️⭐️⭐️⭐️ 目前最牛逼版本

    isScale = false  ⭐️⭐️⭐️⭐️
 */

const { getLastFromArr, getSequenceArr } = require("../utils/functions");
const { calculateCandleHeight } = require("../utils/kLineTools");
const { calculateSimpleMovingAverage } = require("../utils/ma.js");
const fs = require("fs");
const { calculateBBKeltnerSqueeze } = require("../utils/BBKeltner.js");
// let { kLineData } = require("./source/bomeUSDT-1m.js");
// let { kLineData } = require("./source/zkUSDT-1m.js");
// let { kLineData } = require("./source/dogeUSDT-1m.js");
// let { kLineData } = require("./source/1000pepeUSDT-1m.js");
let { kLineData } = require("./source/peopleUSDT-1m.js");
// let { kLineData } = require("./source/bigtimeUSDT-1m.js");
// let { kLineData } = require("./source/beamxUSDT-1m.js");
// let { kLineData } = require("./source/iotxUSDT-1m.js");
// let { kLineData } = require("./source/zetaUSDT-1m.js");
// let { kLineData } = require("./source/solUSDT-1m.js");
// let { kLineData } = require("./source/ondoUSDT-1m.js");
// let { kLineData } = require("./source/omUSDT-1m.js");
// let { kLineData } = require("./source/opUSDT-1m.js");
// let { kLineData } = require("./source/wldUSDT-1m.js");
// let { kLineData } = require("./source/blurUSDT-1m.js");
// let { kLineData } = require("./source/tUSDT-1m.js");
// let { kLineData } = require("./source/rareUSDT-1m.js");
// let { kLineData } = require("./source/tokenUSDT-1m.js");
// let { kLineData } = require("./source/trxUSDT-1m.js");
// let { kLineData } = require("./source/maticUSDT-1m.js");
// let { kLineData } = require("./source/1000flokiUSDT-1m.js");

//////////////////////////////////////////////////////////////////////////////////////////////////////////
const symbol = "peopleUSDT";
const profitRate = 10000;
let _kLineData = [...kLineData];
const diff = 2; // 1053/1410
let times = getSequenceArr(diff, 100);
let modelType = 1;
let timeDis = 1;
let priceDis = 0.002;
let profit = 1.4;
let howManyCandleHeight = 5;
let howManyNumForAvarageCandleHight = 89;
let availableMoney = 10;
let targetTime = null; // "2024-09-29_21-14-00";
let maPeriod = 60; // ma
let isScale = false;
let scaleOverNum = 20;
let scaleHight = 3;
let BBK_PERIOD = 10;
let RSI_PERIOD = 60;
let bigPositionRate = 5;
let B2mult = 1;
let Kmult = 1.5;
let nextBig = false; // 大仓后下一次开仓延续大仓

let overNumberToRest = 15; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
let canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
let isResting = false; // 启动/停止
let stopLossRate = 0.6;
let protectValue = 500;
let protectProfit = false; // true false; // 更保守的话开启利润保护
let howManyNumBegainPlus = 11;
let judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
//////////////////////////////////////////////////////////////////////////////////////////////////////////

const getQuantity = (currentPrice) => {
    let _availableMoney = availableMoney;
    // 修改time有可能会成功平仓但是不盈利的情况，所以用改availableMoney的方式
    if (nextTimeBig) {
        _availableMoney = availableMoney * bigPositionRate;
    }
    // let q = Math.round((_availableMoney * times[historyEntryPoints.length - 1]) / currentPrice);
    let q = (_availableMoney * times[historyEntryPoints.length - 1]) / currentPrice;
    return q;
};

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
let s_money = [];

const closeTrend = (orderPrice, currentPrice) => {
    if (isResting) return;
    if (trend === "up") {
        let dis = quantity * (currentPrice - orderPrice) - quantity * (orderPrice + currentPrice) * 0.0007;
        s_money.push(dis);
        testMoney = testMoney + dis;
    }
    if (trend === "down") {
        let dis = quantity * (orderPrice - currentPrice) - quantity * (orderPrice + currentPrice) * 0.0007;
        s_money.push(dis);
        testMoney = testMoney + dis;
    }
    if (testMoney > maxMoney) maxMoney = testMoney;
};
let curkLine = {};
let crossGrideLength = [];
let availableMoneyArr = [];
let issqueeze = false;
let issqueezeArr = [];
let rsi = 0;
let rsiArr = [];
let candleHeight = 0;

let curB2upper = 0;
let curB2lower = 0;

let positionType = [];
let nextTimeBig = false; // 上一轮回是否是休息后的
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
let s_count = -1;
let s_prePrice = 0;
let needContinue = true;
const start = (params) => {
    // const symbol = s;
    gridPoints2 = [];
    maArr = [];
    closeOrderHistory = [];
    gridPoints = [];
    trend = "";
    currentPointIndex = -2;
    testMoney = 0;
    maxMoney = 0;
    minMoney = 0;
    quantity = 0;
    orderPrice = 0;
    testMoneyHistory = [];
    readyTradingDirection = "hold";
    hasOrder = false;
    historyEntryPoints = [];
    date = [];
    gridHeight = 0;
    curKLines = [];
    prices = [];
    s_money = [];
    curkLine = {};
    crossGrideLength = [];
    availableMoneyArr = [];
    issqueeze = false;
    issqueezeArr = [];
    rsi = 0;
    rsiArr = [];
    candleHeight = 0;
    s_count = -1;
    s_prePrice = 0;
    needContinue = true;
    if (params) {
        timeDis = params.timeDis;
        profit = params.profit;
        howManyCandleHeight = params.howManyCandleHeight;
        howManyNumForAvarageCandleHight = params.howManyNumForAvarageCandleHight;

        if (params.targetTimeNum) {
            targetTimeNum = params.targetTimeNum;
            targetTime = `2024-0${targetTimeNum}-01_14-14-00`;
        }
    }

    if (targetTime) {
        let index = kLineData.findIndex((v) => v.openTime === targetTime);
        _kLineData = [...kLineData].slice(index);
    }
    for (let idx = 100; idx < _kLineData.length; idx++) {
        s_count++;
        if (getStop()) {
            testMoneyHistory.push(testMoney);
            date.push(curkLine.closeTime);
            return;
        }
        curKLines = _kLineData.slice(idx - 100, idx);
        prices = curKLines.map((v) => v.close);

        maArr = [
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 10), maPeriod),
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 5), maPeriod),
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 0), maPeriod),
        ];
        curkLine = _kLineData[idx];
        if (judgeByBBK) {
            let { B2basis, B2upper, B2lower, Kma, Kupper, Klower, squeeze } = calculateBBKeltnerSqueeze(
                curKLines,
                BBK_PERIOD,
                B2mult,
                Kmult,
            );

            curB2upper = getLastFromArr(B2upper, 1)[0];
            curB2lower = getLastFromArr(B2lower, 1)[0];
            issqueeze = getLastFromArr(squeeze, 1)[0];
        }

        candleHeight = calculateCandleHeight(getLastFromArr(curKLines, howManyNumForAvarageCandleHight));

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
                    // if (!closeOrderHistory.length) {
                    //     console.log("🚀 ~ readyTradingDirection:", readyTradingDirection, curkLine.openTime);
                    // }
                }
            }
            if (readyTradingDirection !== "hold") {
                judgeAndTrading({ maArr, curkLine });
                s_count = 0;
                s_prePrice = curkLine.close;
                needContinue = true;
            }
            continue;
        }
        // 有仓位就准备平仓
        else {
            if (hasOrder) {
                if (modelType === 1) {
                    if (s_count % timeDis === 0) {
                        s_prePrice = curkLine.close;
                        needContinue = beforStartRunGrid(curkLine, profit);
                    }
                }
                if (modelType === 2) {
                    if (Math.abs(s_prePrice - curkLine.close) / s_prePrice >= priceDis) {
                        s_prePrice = curkLine.close;
                        needContinue = beforStartRunGrid(curkLine, profit);
                    }
                }
                needContinue && startRunGrid(curkLine);
            }
        }
    }

    testMoneyHistory.length && (testMoney = testMoneyHistory[testMoneyHistory.length - 1]);
    closeOrderHistory.push([...historyEntryPoints]);

    // if (params && params.targetTimeNum) {
    //     console.log(symbol, "🚀 ~ res & params::", {
    //         testMoney,
    //         maxMoney,
    //         minMoney,
    //     });
    // }
    return {
        testMoney,
        maxMoney,
        minMoney,
    };
};
let s_moneyArr = [];
const reset = () => {
    // 如果上一次轮回是大仓位成交，下一次就继续大仓，前提是必须得让测试数据尽量少达到overNumberToRest比较好
    if (nextBig) {
        if (historyEntryPoints.length === 2) {
            nextTimeBig = true;
        } else {
            nextTimeBig = false;
        }
    }

    s_money.unshift(curkLine.closeTime);
    s_moneyArr.push(s_money);

    orderPrice = 0;
    trend = "";
    currentPointIndex = -2;
    readyTradingDirection = "hold";
    gridPoints = [];
    hasOrder = false;
    quantity = 0;
    gridPoints2 = [];
    candleHeight = 0;
    gridHeight = 0;
    isResting = false;
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
        // isResting 的时候，gridPoints会在 0/3 处被 重置
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
        // isResting 的时候，gridPoints会在 0/3 处被 重置
    }
};
const teadeBuy = (_currentPrice) => {
    orderPrice = _currentPrice;
    trend = "up";
    readyTradingDirection = "hold";
    hasOrder = true;
    quantity = getQuantity(_currentPrice);
};
const teadeSell = (_currentPrice) => {
    orderPrice = _currentPrice;
    trend = "down";
    readyTradingDirection = "hold";
    hasOrder = true;
    quantity = getQuantity(_currentPrice);
};

const beforStartRunGrid = (curkLine, profit) => {
    let _currentPrice = 0;
    if (isResting) return;
    let dis = 0;
    let sum = s_money.reduce((sum, cur) => sum + cur, 0);
    if (trend === "up") {
        _currentPrice = curkLine.close;
        dis = quantity * (_currentPrice - orderPrice) - quantity * (orderPrice + _currentPrice) * 0.0007;
    }
    if (trend === "down") {
        _currentPrice = curkLine.close;
        dis = quantity * (orderPrice - _currentPrice) - quantity * (orderPrice + _currentPrice) * 0.0007;
    }
    if (sum < minMoney) minMoney = sum;
    if (sum + dis >= profit) {
        closeOrderHistory.push([...historyEntryPoints, -1]);
        closeTrend(orderPrice, _currentPrice);
        reset();
        historyEntryPoints = [];
        s_count = -1;
        s_money = [];
        return false;
    }
    return true;
};
let overGrid = 0;
const startRunGrid = (curkLine) => {
    let _currentPointIndex = -1;
    const { low, high } = curkLine;
    for (let index = 0; index < gridPoints.length; index++) {
        const point = gridPoints[index];
        if (low <= gridPoints[1] && high >= gridPoints[2]) {
            overGrid++;
            if (curkLine.close > curkLine.open) {
                // up
                _currentPointIndex = 2;
                beforeGridPointTrading2(_currentPointIndex);
            } else {
                // down
                _currentPointIndex = 1;
                beforeGridPointTrading2(_currentPointIndex);
            }

            break;
        }
        if (low <= point && point <= high) {
            _currentPointIndex = index;
            beforeGridPointTrading2(_currentPointIndex);
            break;
        }
    }
};

const beforeGridPointTrading2 = (_currentPointIndex) => {
    // 价格到了某个网格交易点
    if (_currentPointIndex !== -1) {
        if (currentPointIndex !== _currentPointIndex) {
            currentPointIndex = _currentPointIndex;

            setHistoryEntryPoints(currentPointIndex); // 实时交易点历史记录
            if (historyEntryPoints.length >= 80) {
                // console.log(
                //     "@@@@@@@@穿过交易点次数太多了, historyEntryPointsLen, testMoney::",
                //     historyEntryPoints.length,
                //     testMoney,
                // );
                reset();
                historyEntryPoints = [];
                testMoney = -99999;
                s_count = -1;
                s_money = [];
                return;
            }
            gridPointTrading2(); // 交易
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
        }
        reset();

        if (protectProfit && testMoney / maxMoney < stopLossRate) {
            stop = true;
        }
        return;
    } else if (_currentPointIndex === 3) {
        if (isResting) {
        } else {
            closeOrderHistory.push([..._historyEntryPoints]);
            closeTrend(orderPrice, _currentPrice);
        }
        reset();

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
            isResting = true;
        }

        if (!isResting) {
            teadeSell(_currentPrice);
        }
        if (isScale && historyEntryPointsLlen === scaleOverNum) {
            gridPoints[2] += candleHeight * scaleHight;
        }
    } else if (_currentPointIndex === 2) {
        if (!isResting) {
            closeTrend(orderPrice, _currentPrice);
        }

        // 休息
        if (canStop && !isResting && historyEntryPointsLlen == overNumberToRest) {
            closeOrderHistory.push(_historyEntryPoints.map((v) => 0));
            isResting = true;
        }
        if (!isResting) {
            teadeBuy(_currentPrice);
        }
        if (isScale && historyEntryPointsLlen === scaleOverNum) {
            gridPoints[1] -= candleHeight * scaleHight;
        }
    }
    testMoneyHistory.push(testMoney);
    date.push(curkLine.closeTime);
};

// start();
// start({
//     timeDis: 1, profit: 1.5,
//     howManyCandleHeight: 5,
//     howManyNumForAvarageCandleHight: 90,
//     targetTimeNum: 9,
// });

module.exports = {
    evaluateStrategy: start,
};
