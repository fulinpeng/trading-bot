const { getDate, getLastFromArr } = require("../../../common/functions");
const { calculateKDJs } = require("../../../klineIndex/KDJ");
const { calculateBBKeltnerSqueeze } = require("../../../klineIndex/BBKeltner");
const { calculateCandleHeight, isBigAndYang, isBigAndYin } = require("../../../klineIndex/kLineTools");
const { calculateATR } = require("../../../klineIndex/atr.js");
const fs = require("fs");
// let { kLineData } = require("../../../source/ethUSDT-15m.js");
let { kLineData } = require("../../../source/opUSDT-15m.js");

let symbol = "op";
let KDJ = [20, 80];

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
let isReadyStopProfit = false;
let howManeyCandleForIndex = 100;
let peoridForKdj = 25;
let peoridForBBK = 20;
let peoridForAtr = 14;
let stopLossRate = 1;
let profitRate = 3000;
let howManyNumForAvarageCandleHight = 9;
let howManyCandleHeight = 12;

let candleHeight = 0;
let availableMoney = 100;
const getQuantity = (currentPrice) => {
    return Math.round(availableMoney / currentPrice);
};

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
    dateHistory.push(closeTime);
};
const start = () => {
    // let index = kLineData.findIndex((v) => v.openTime === "2024-05-23_00-00-00");
    // kLineData = kLineData.slice(index);
    for (let idx = 100; idx < kLineData.length; idx++) {
        const curKLines = kLineData.slice(idx - howManeyCandleForIndex, idx);
        const kdjs = calculateKDJs(curKLines, peoridForKdj);
        const kdj = kdjs[kdjs.length - 1];
        const { B2basis, B2upper, B2lower, Kma, Kupper, Klower, squeeze } = calculateBBKeltnerSqueeze(
            curKLines,
            peoridForBBK,
        );
        const len = B2basis.length;
        const curB2basis = B2basis[len - 1];
        const curB2upper = B2upper[len - 1];
        const curB2lower = B2lower[len - 1];
        const curKma = Kma[len - 1];
        const curKupper = Kupper[len - 1];
        const curKlower = Klower[len - 1];
        const isSqueeze = squeeze[len - 1];

        candleHeight = calculateCandleHeight(kLineData.slice(idx - howManyNumForAvarageCandleHight, idx));
        const curkLine = kLineData[idx];
        const { close, closeTime, low, high } = curkLine;

        // 准备开仓：挤压状态时，判断 开单方向
        // 已有仓位的情况，不好办，还是算了吧
        if (!hasOrder) {
            if (isSqueeze && readyTradingDirection === "hold") {
                judgeTradingDirection(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj);
            }
            // 开仓：没有仓位就根据 readyTradingDirection 开单
            // 开单完成后会重置 readyTradingDirection
            if (readyTradingDirection !== "hold") {
                judgeAndTrading(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj, curKLines);
            }
            continue;
        }
        // 平仓：已有仓位就根据kdj指标平仓
        else {
            const [point1, point2] = gridPoints;
            // 有仓位就先判断是否止损
            if (trend) {
                if (trend === "up") {
                    // low 小于 point1 就止损，否则继续持有
                    if (low <= point1) {
                        setProfit(orderPrice, point1, closeTime);
                        setFailAndWinNum(curkLine);
                        reset();
                        continue;
                    }
                }
                if (trend === "down") {
                    // high 大于 point2 就止损，否则继续持有
                    if (high >= point2) {
                        setProfit(orderPrice, point2, closeTime);
                        setFailAndWinNum(curkLine);
                        reset();
                        continue;
                    }
                }
            }
            // 第一次判断止盈：上面没有碰到止损，那下面看看是否止盈
            if (trend) {
                // isReadyStopProfit === false 表示没有准备止盈，就先判断并准备止盈
                if (!isReadyStopProfit) {
                    judgeReadyStopProfit(kdj);
                }
                // 准备止盈后，根据kdj指标平仓，此时是否需要采用网格止盈+利润奔跑要快点能抓取更多利润，避免1h级别后续利润回吐太多
                // 已经在平仓了（网格先判断出平仓并正在平仓）就不再进入下面逻辑
                if (isReadyStopProfit) {
                    judgeClosePosition(kdjs, curkLine);
                }
            }
            // 第二次判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
            if (trend) {
                if (trend && high >= point2) {
                    setProfit(orderPrice, point2, closeTime);
                    setFailAndWinNum(curkLine);
                    reset();
                    continue;
                }
                // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
                if (trend && low <= point1) {
                    setProfit(orderPrice, point1, closeTime);
                    setFailAndWinNum(curkLine);
                    reset();
                    continue;
                }
            }
        }
    }
    console.log(kLineData[0].closeTime, kLineData[kLineData.length - 1].closeTime);
    // 处理最后一根k
    hasOrder &&  setProfit(orderPrice, kLineData[kLineData.length - 1], kLineData[kLineData.length - 1].closeTime);
};
// 准备止盈
const judgeReadyStopProfit = (kdj) => {
    if (trend === "up") {
        // 当KDJ蓝色信号线大于80以上位阶, 做好停利的准备
        if (kdj.j > KDJ[1]) {
            isReadyStopProfit = true;
        }
    }
    if (trend === "down") {
        // 当KDJ蓝色信号线小于20以下位阶, 做好停利的准备
        if (kdj.j < KDJ[0]) {
            isReadyStopProfit = true;
        }
    }
};

const setFailAndWinNum = (curkLine) => {
    if (curkLine.close > orderPrice) {
        winNum++;
    } else {
        failNum++;
    }
};
// 止盈
const judgeClosePosition = (kdjs, curkLine) => {
    const [preKdj, curKdj] = getLastFromArr(kdjs, 2);
    if (trend === "up") {
        // 等到KDJ蓝色信号线从80以上位阶下穿到小于80以下时, 进行多单平仓
        if (preKdj.j >= KDJ[1] && curKdj.j < KDJ[1]) {
            setProfit(orderPrice, curkLine.close, curkLine.closeTime);
            setFailAndWinNum(curkLine);
            reset();
            return;
        }
    }
    if (trend === "down") {
        // 等到KDJ蓝色信号线从20以下位阶上穿到大于20以上时, 进行空单平仓
        if (preKdj.j <= KDJ[0] && curKdj.j > KDJ[0]) {
            setProfit(orderPrice, curkLine.close, curkLine.closeTime);
            setFailAndWinNum(curkLine);
            reset();
            return;
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
// 通过 BBK-KDJ 指标判断方向 / 交易
const judgeTradingDirection = (curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj) => {
    // 第一, 出现蓝底范围, 视为挤压
    // 第二, 在挤压的范围内某一根K棒收盘后收在布林通道的下线, 并且KDJ蓝色信号线小于20以下位阶
    // 第三, 此时准备开多

    //  && isBigAndYin(curkLine, 0.4)
    if (curkLine.close < curB2lower && kdj.j < KDJ[0]) {
        // 有订单时候只设置 下一个订单方向 还不能开单
        readyTradingDirection = "up";
        return;
    }
    // 第一, 出现蓝底范围, 视为挤压
    // 第二, 在挤压的范围内某一根K棒收盘后收在布林通道的上线, 并且KDJ蓝色信号线大于80以上位阶
    // 第三, 此时准备开空

    // && isBigAndYang(curkLine, 0.4)
    if (curkLine.close > curB2upper && kdj.j > KDJ[1]) {
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
const judgeAndTrading = (curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj, curKLines) => {
    // 根据指标判断是否可以开单
    const trendInfo = calculateTradingSignal(
        curB2basis,
        curB2upper,
        curB2lower,
        curKma,
        curkLine,
        isSqueeze,
        kdj,
        curKLines,
    );
    const { stopLoss, stopProfit } = trendInfo;
    // 开单
    switch (trendInfo.trend) {
        case "up":
            // 当KDJ蓝色信号线大于20以上位阶
            // 并且K棒要收涨

            //  && isBigAndYang(curkLine, 0.4)
            if (kdj.j > KDJ[0]) {
                trend = "up";
                setGridPoints("up", stopLoss, stopProfit, curkLine.close);
                readyTradingDirection = "hold";
                isReadyStopProfit = false;
                hasOrder = true;
            }
            break;
        case "down":
            // 当KDJ蓝色信号线小于80以下位阶
            // 并且K棒要收跌

            //  && isBigAndYin(curkLine, 0.4)
            if (kdj.j < KDJ[1]) {
                trend = "down";
                setGridPoints("down", stopLoss, stopProfit, curkLine.close);
                readyTradingDirection = "hold";
                isReadyStopProfit = false;
                hasOrder = true;
            }
            break;
        default:
            break;
    }
};
const calculateTradingSignal = (curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj, curKLines) => {
    const [kLine1, kLine2, kLine3] = getLastFromArr(curKLines, 3);
    const max = Math.max(kLine1.close, kLine2.close, kLine3.close, kLine1.open, kLine2.open, kLine3.open);
    const min = Math.min(kLine1.close, kLine2.close, kLine3.close, kLine1.open, kLine2.open, kLine3.open);

    // const max = Math.max(kLine1.high, kLine2.high, kLine3.high);
    // const min = Math.min(kLine1.low, kLine2.low, kLine3.low);
    const curPrice = kLine3.close;
    // 当KDJ蓝色信号线大于20以上位阶, 并且K棒要收涨, 收盘价进场
    if (readyTradingDirection === "up" && kdj.j > KDJ[0] && kLine3.close > kLine3.open) {
        // 计算atr
        const { atr } = calculateATR(curKLines, peoridForAtr);
        // console.log("🚀 ~ file:", kLine3.closeTime, "up", min - atr, kLine3.close - kLine3.close * 0.01);
        return {
            trend: "up",
            stopLoss: min - atr * stopLossRate, // kLine3.low, // kLine3.close - kLine3.close * 0.01, // min - atr,
            // stopProfit: curPrice + (curPrice - (min - atr)) * profitRate, // 止盈大一点
            // stopLoss: kLine3.low, // kLine3.close - kLine3.close * 0.01, // min - atr,
            stopProfit: kLine3.close + candleHeight * howManyCandleHeight, // 止盈大一点
        };
    }
    // 当KDJ蓝色信号线小于80以上位阶, 并且K棒要收跌, 收盘价进场
    if (readyTradingDirection === "down" && kdj.j < KDJ[1] && kLine3.close < kLine3.open) {
        // 计算atr
        const { atr } = calculateATR(curKLines, peoridForAtr);
        // console.log("🚀 ~ file:", kLine3.closeTime, "down", max + atr, kLine3.close + kLine3.close * 0.01);
        return {
            trend: "down",
            stopLoss: max + atr * stopLossRate, // kLine3.high, // kLine3.close + kLine3.close * 0.01, // max + atr,
            // stopProfit: curPrice - (max + atr - curPrice) * profitRate, // 止盈大一点
            // stopLoss: kLine3.high, // kLine3.close + kLine3.close * 0.01, // max + atr,
            stopProfit: kLine3.close - candleHeight * howManyCandleHeight, // 止盈大一点
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

console.log("最终结果::", {
    availableMoney,
    stopLossRate,
    profitRate,
    howManyNumForAvarageCandleHight,
    howManyCandleHeight,
    winNum,
    failNum,
    testMoney,
    maxMoney,
    minMoney,
    winRate: ((winNum / (winNum + failNum)) * 100).toFixed(3) + "%",
});

const result = {
    availableMoney,
    winNum,
    failNum,
    testMoney,
    maxMoney,
    minMoney,
    winRate: ((winNum / (winNum + failNum)) * 100).toFixed(3) + "%",
    option: {
        xAxis: {
            type: "category",
            data: dateHistory,
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
            // {
            //     name: "对冲次数",
            //     data: crossGrideLength,
            //     type: "line",
            //     markPoint: {
            //         data: [{ type: "max", name: "Max" }],
            //     },
            // },
        ],
    },
};

// https://echarts.apache.org/examples/zh/editor.html?c=line-simple
// writeInFile(`./tests/data/test-BBK-${symbol}.js`, result);
