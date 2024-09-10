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
 * 3. 在test-mading4-1.js的基础上，换成斐波那契价位作为 gridHeight
 *    效果不是很理想
 */

const { getLastFromArr, getSequenceArr } = require("../utils/functions");
const { calculateCandleHeight, isBigAndYang, isBigAndYin } = require("../utils/kLineTools");
const { findMaxAndMin } = require("../utils/rangeSearch");
const { calculateFibonacciLevels } = require("../utils/fib.js");
const { calculateATR } = require("../utils/atr.js");
const { calculateKDJ } = require("../utils/KDJ.js");
const { calculateSimpleMovingAverage } = require("../utils/ma.js");
const fs = require("fs");
const { calculateRSI } = require("../utils/rsi.js");
// const { emaMacrossover } = require("../utils/ema_ma_crossover.js");
const { calculateBBKeltnerSqueeze } = require("../utils/BBKeltner.js");
const dayjs = require("dayjs");
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

// let howManyCandle = 1;
//////////////////////////////////////////////////////////////////////////////////////////////////////////

// const symbol = "bomeUSDT";
// const profitRate = 8;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 1,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 20;
// const nextBig = false; // 大仓后下一次开仓延续大仓

// let overNumberToRest = 25; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = true; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
// //////////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "zkUSDT";
// const profitRate = 6.6;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 1,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 5;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = true; // 大仓后下一次开仓延续大仓

// let overNumberToRest = 13; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = true; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️

//////////////////////////////////////////////////////////////////////////////////////////////////

// const symbol = "dogeUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.002,
//     profit: 0.4,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;
// const availableMoney = 10;
// const howManyCandleHeight = 3.5;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // 大仓后下一次开仓延续大仓

// let overNumberToRest = 16; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
//////////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "1000pepeUSDT";
// const profitRate = 10000;
// const diff = 2; // 1053/1410
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.002,
//     profit: 0.8,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 4;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // 大仓后下一次开仓延续大仓

// let overNumberToRest = 15; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
//////////////////////////////////////////////////////////////////////////////////////////////////////////

const symbol = "peopleUSDT";
const profitRate = 10000;
const diff = 2;
let times = getSequenceArr(diff, 1000);
let modelType = 2;
const model1 = {
    timeDis: 180,
    profit: 1,
};
const model2 = {
    priceDis: 0.002,
    profit: 0.5,
};
const maPeriod = 60; // ma
const BBK_PERIOD = 100;
const RSI_PERIOD = 60;
const bigPositionRate = 5;
const B2mult = 1;
const Kmult = 1.5;

const availableMoney = 10;
const howManyCandleHeight = 3;
const howManyNumForAvarageCandleHight = 180;
const nextBig = false; // 大仓后下一次开仓延续大仓

let overNumberToRest = 16; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
let isResting = false; // 启动/停止
const stopLossRate = 0.6;
const protectValue = 500;
const protectProfit = false; // true false; // 更保守的话开启利润保护
const howManyNumBegainPlus = 11;
const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
//////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "bigtimeUSDT";
// const profitRate = 5;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 1,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 20;
// const nextBig = true; // true / false 大仓后下一次开仓延续大仓

// let overNumberToRest = 16; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = true; // true / false // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️

///////////////////////////////////////////////
// const symbol = "bigtimeUSDT";
// const profitRate = 10;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 1,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 2;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 5;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = true; // true false // 大仓后下一次开仓延续大仓

// let overNumberToRest = 18; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = true; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
// //////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "zetaUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 0.6,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = true; // true false // 大仓后下一次开仓延续大仓

// let overNumberToRest = 12; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
//////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "beamxUSDT";
// const profitRate = 6;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 1,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 20;
// const nextBig = true; // true false // 大仓后下一次开仓延续大仓

// let overNumberToRest = 17; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = true; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
//////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "iotxUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.005,
//     profit: 1,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 100;
// const nextBig = false; // 大仓后下一次开仓延续大仓

// let overNumberToRest = 16; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const symbol = "solUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 0,
// };
// const model2 = {
//     priceDis: 0.02,
//     profit: 0.1,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // 大仓后下一次开仓延续大仓

// let overNumberToRest = 17; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
// ////////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "omUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 2.2,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1;
// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 100;
// const nextBig = false; // 大仓后下一次开仓延续大仓

// let overNumberToRest = 22; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
// ////////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "ondoUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.005,
//     profit: 0.1,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1;
// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // 大仓后下一次开仓延续大仓

// let overNumberToRest = 11; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
// ////////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "opUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.005,
//     profit: 0.5,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1;
// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // 大仓后下一次开仓延续大仓

// let overNumberToRest = 17; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
////////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "wldUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 0.5,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1;
// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // 大仓后下一次开仓延续大仓

// let overNumberToRest = 20; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
//////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "tUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 1,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // true false // 大仓后下一次开仓延续大仓

// let overNumberToRest = 23; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
// // //////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "blurUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.02,
//     profit: 0,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 6;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // true false // 大仓后下一次开仓延续大仓

// let overNumberToRest = 18; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
//////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "rareUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 1,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 6;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 3;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // true false // 大仓后下一次开仓延续大仓

// let overNumberToRest = 18; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
// ////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "tokenUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 1,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 6;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 4;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // true false // 大仓后下一次开仓延续大仓

// let overNumberToRest = 18; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "trxUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.005,
//     profit: 0.7,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 6;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 3.1;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // true false // 大仓后下一次开仓延续大仓

// let overNumberToRest = 18; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "maticUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 200);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.005,
//     profit: 0.5,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 6;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 4;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // true false // 大仓后下一次开仓延续大仓

// let overNumberToRest = 18; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
////////////////////////////////////////////////////////////////////////////////////////////////////////////
// const symbol = "1000flokiUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 200);
// let modelType = 2;
// const model1 = {
//     timeDis: 180,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.005,
//     profit: 0.5,
// };
// const maPeriod = 60; // ma
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 6;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 3.5;
// const howManyNumForAvarageCandleHight = 180;
// const nextBig = false; // true false // 大仓后下一次开仓延续大仓

// let overNumberToRest = 18; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
// let isResting = false; // 启动/停止
// const stopLossRate = 0.6;
// const protectValue = 500;
// const protectProfit = false; // true false; // 更保守的话开启利润保护
// const howManyNumBegainPlus = 11;
// const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

// const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
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
    if (testMoney < minMoney) minMoney = testMoney;

    // console.log("minMoney:", minMoney,testMoney, historyEntryPoints.length, curkLine.closeTime);
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
let fibs = [];
const start = () => {
    // let index = kLineData.findIndex((v) => v.openTime === "2024-08-14_00-00-00");
    // kLineData = kLineData.slice(index);
    let num = 0;
    for (let idx = 1440; idx < kLineData.length; idx++) {
        s_count++;
        if (getStop()) {
            testMoneyHistory.push(testMoney);
            date.push(curkLine.closeTime);
            return;
        }
        curKLines = kLineData.slice(idx - 1440, idx);
        prices = curKLines.map((v) => v.close);

        maArr = [
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 10), maPeriod),
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 5), maPeriod),
            calculateSimpleMovingAverage(prices.slice(0, prices.length - 0), maPeriod),
        ];
        curkLine = kLineData[idx];

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

        // 每天算一次
        // if (idx % 1440 === 0) {
        const { minK, maxK } = findMaxAndMin(curKLines);
        if (Date(minK.open) < Date(maxK.close)) {
            fibs = calculateFibonacciLevels(maxK.high, minK.low, "up");
        } else {
            fibs = calculateFibonacciLevels(maxK.high, minK.low, "down");
        }
        // }

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
                    // readyTradingDirection = maArr[2] < maArr[3] ? "up" : "down";
                    if (curkLine.close >= fibs[4]) {
                        readyTradingDirection = "up";
                    }
                    if (curkLine.close <= fibs[2]) {
                        readyTradingDirection = "down";
                    }
                    !closeOrderHistory.length && console.log("🚀 ~ readyTradingDirection:", curkLine.openTime);
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
                // needContinue = beforBeforStartRunGrid(curkLine, 0.2);
                if (modelType === 1) {
                    if (s_count % model1.timeDis === 0) {
                        s_prePrice = curkLine.close;
                        needContinue = beforStartRunGrid(curkLine, model1.profit);
                    }
                }
                if (modelType === 2) {
                    if (Math.abs(s_prePrice - curkLine.close) / s_prePrice >= model2.priceDis) {
                        s_prePrice = curkLine.close;
                        needContinue = beforStartRunGrid(curkLine, model2.profit);
                    }
                }
                needContinue && startRunGrid(curkLine);
            }
        }
    }

    testMoney = testMoneyHistory[testMoneyHistory.length - 1];
    closeOrderHistory.push([...historyEntryPoints]);

    judgeByBBK && console.log("🚀 ~ 挤压k数量，总k数量，挤压/总k:", num, kLineData.length, num / kLineData.length);
};
const reset = () => {
    // 如果上一次轮回是大仓位成交，下一次就继续大仓，前提是必须得让测试数据尽量少达到overNumberToRest比较好
    if (nextBig) {
        if (historyEntryPoints.length === 2) {
            nextTimeBig = true;
        } else {
            nextTimeBig = false;
        }
    }
    orderPrice = 0;
    trend = "";
    currentPointIndex = -2;
    readyTradingDirection = "hold";
    gridPoints = [];
    historyEntryPoints = [];
    hasOrder = false;
    quantity = 0;
    gridPoints2 = [];
    candleHeight = 0;
    gridHeight = 0;
    s_count = -1;
    s_money = [];
    isResting = false;
};

// 设置网格
const setGridPoints = (trend, _currentPrice, curkLine, _profitRate = profitRate) => {
    // gridHeight = candleHeight * howManyCandleHeight;
    gridHeight = fibs[5] - fibs[1];
    // console.log("🚀 gridHeight 3*candleHeight:", gridHeight, candleHeight * howManyCandleHeight);
    if (trend === "up") {
        // fibs.slice(2, 4);
        const point2 = fibs[6];
        const point1 = fibs[4];
        // const point3 = point2 + gridHeight * _profitRate;
        // const point0 = point1 - gridHeight * _profitRate;
        const point3 = fibs[6] + (fibs[6] - fibs[0]) * _profitRate;
        const point0 = fibs[0] - (fibs[6] - fibs[0]) * _profitRate;

        gridPoints = [point0, point1, point2, point3];
        if (!historyEntryPoints.length) {
            historyEntryPoints = [2];
            currentPointIndex = 2;
        }
        // isResting 的时候，gridPoints会在 0/3 处被 重置
    }

    if (trend === "down") {
        // fibs.slice(3, 5);
        const point2 = fibs[2];
        const point1 = fibs[0];
        // const point0 = point1 - gridHeight * _profitRate;
        // const point3 = point2 + gridHeight * _profitRate;
        const point3 = fibs[6] + (fibs[6] - fibs[0]) * _profitRate;
        const point0 = fibs[0] - (fibs[6] - fibs[0]) * _profitRate;

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

const beforStartRunGrid = (curkLine, profit) => {
    let _currentPrice = 0;
    if (isResting) return;
    let dis = 0;
    let _money = [...s_money];
    if (trend === "up") {
        _currentPrice = curkLine.close;
        dis = quantity * (_currentPrice - orderPrice) - quantity * (orderPrice + _currentPrice) * 0.0007;
        _money.push(dis);
    }
    if (trend === "down") {
        _currentPrice = curkLine.close;
        dis = quantity * (orderPrice - _currentPrice) - quantity * (orderPrice + _currentPrice) * 0.0007;
        _money.push(dis);
    }
    let sum = _money.reduce((sum, cur) => sum + cur, 0);

    if (sum >= profit) {
        closeOrderHistory.push([...historyEntryPoints, -1]);
        closeTrend(orderPrice, _currentPrice);
        setLinesClose("success");
        reset();
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
            gridPointTrading2(); // 交易
        }
    }
};

// 进入交易点的历史记录
const setHistoryEntryPoints = (point) => {
    historyEntryPoints.push(point);
    // if (historyEntryPoints.length >= 100) throw new Error("historyEntryPoints.length 超标：");
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
let lastPosition = historyEntryPoints.length;
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

closeOrderHistory.length && setLinesClose(); // 添加最后的仓位情况

const result = {
    // profitRate,
    // overNumberToRest,
    // howManyCandleHeight,
    // howManyNumForAvarageCandleHight,
    // nextBig,
    // testMoney,
    // maxMoney,
    // minMoney,
    // tradeCount,
    // closeOrderHistory,
    // mostCountMap,
    // mostCountKey,
    // mostCountValue,
    // candleHeightAndGridPoints,
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

console.log(`${symbol}最终结果::`, {
    profitRate,
    overNumberToRest,
    howManyCandleHeight,
    howManyNumForAvarageCandleHight,
    overGrid,
    nextBig,
    testMoney,
    maxMoney,
    minMoney,
    tradeCount,
    mostCountKey,
    mostCountValue,
    mostCountMap: JSON.stringify(mostCountMap),
    maxPosition,
    lastPosition,
    modelType,
    model1,
    model2,
    maxPositionMoney: availableMoney * times[maxPosition - 1],
});

// https://echarts.apache.org/examples/zh/editor.html?c=line-simple
writeInFile(`./tests/data/mading-${symbol}.js`, {
    ...result,
});
