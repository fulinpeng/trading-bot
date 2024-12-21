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
 */

const { getLastFromArr, getSequenceArr } = require("../utils/functions");
// const { getLastFromArr } = require("../utils/functions");
const { calculateCandleHeight, isBigAndYang, isBigAndYin } = require("../utils/kLineTools");
// const { findVandAPoints } = require("../utils/rangeSearch");
const { calculateATR } = require("../utils/atr.js");
const { calculateKDJ } = require("../utils/KDJ.js");
const { calculateSimpleMovingAverage } = require("../utils/ma.js");
const fs = require("fs");
const { calculateRSI } = require("../utils/rsi.js");
// const { emaMacrossover } = require("../utils/ema_ma_crossover.js");
const { calculateBBKeltnerSqueeze } = require("../utils/BBKeltner.js");
// let { kLineData } = require("./source/bomeUSDT-1m.js");
// let { kLineData } = require("./source/zkUSDT-1m.js");
// let { kLineData } = require("./source/dogeUSDT-1m.js");
// let { kLineData } = require("./source/1000pepeUSDT-1m.js");
// let { kLineData } = require("./source/peopleUSDT-1m.js");
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
let { kLineData } = require("./source/turboUSDT-1m.js");
// let { kLineData } = require("./source/tUSDT-1m.js");
// let { kLineData } = require("./source/rareUSDT-1m.js");
// let { kLineData } = require("./source/tokenUSDT-1m.js");
// let { kLineData } = require("./source/trxUSDT-1m.js");
// let { kLineData } = require("./source/maticUSDT-1m.js");
// let { kLineData } = require("./source/1000flokiUSDT-1m.js");
// let { kLineData } = require("./source/ethUSDT-1m.js");

// let howManyCandle = 1;
//////////////////////////////////////////////////////////////////////////////////////////////////////////

// const symbol = "bomeUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 100);
// let modelType = 1;
// const model1 = {
//     timeDis: 1,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.005,
//     profit: 0.1,
// };
// let targetTime = null;
// const isScale = false;
// const scaleOverNum = 20;
// const scaleHight = 3;
// const maPeriod = 60; // ma
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 5;
// const howManyNumForAvarageCandleHight = 90;
// const nextBig = false; // 大仓后下一次开仓延续大仓

// let overNumberToRest = 25; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
// const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const diff = 2; // 1053/1410
// let times = getSequenceArr(diff, 100);
// let modelType = 1;
// const model1 = {
//     timeDis: 1,
//     profit: 1.5,
// };
// const model2 = {
//     priceDis: 0.002,
//     profit: 0.8,
// };

// const availableMoney = 10;
// const howManyCandleHeight = 5;
// const howManyNumForAvarageCandleHight = 86;
// const targetTime = null; // "2024-09-29_21-14-00";
// const maPeriod = 60; // ma
// const isScale = false;
// const scaleOverNum = 20;
// const scaleHight = 3;
// const BBK_PERIOD = 10;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

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

// const symbol = "1000pepeUSDT";
// const profitRate = 10000;
// const diff = 2; // 1053/1410
// function getSequenceArr(diff, num) {
//     let arr = [10];
//     for (let i = 0; i < num; i++) {
//         let item = arr[arr.length - 1];
//         arr.push(item + diff);
//     }
//     return arr;
// }

// let times = getSequenceArr(diff, 100);
// let modelType = 1;
// const model1 = {
//     timeDis: 6,
//     profit: 0.3,
// };
// const model2 = {
//     priceDis: 0.002,
//     profit: 0.8,
// };

// const availableMoney = 10;
// const howManyCandleHeight = 6;
// const howManyNumForAvarageCandleHight = 6;
// const targetTime = null // "2024-05-02_11-42-00";
// const maPeriod = 60; // ma
// const isScale = false;
// const scaleOverNum = 20;
// const scaleHight = 3;
// const BBK_PERIOD = 10;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

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

// const symbol = "peopleUSDT";
// const profitRate = 10000;
// const diff = 2;
// let times = getSequenceArr(diff, 1000);
// let modelType = 1;
// const model1 = {
//     timeDis: 1,
//     profit: 2.1,
// };
// const model2 = {
//     priceDis: 0.001,
//     profit: 0.5,
// };
// const availableMoney = 10;
// const howManyCandleHeight = 5;
// const howManyNumForAvarageCandleHight = 90;
// // 2024-09-29_22-54-00
// const targetTime = "2024-09-29_21-14-00";
// const maPeriod = 60; // ma
// const isScale = false;
// const scaleOverNum = 22;
// const scaleHight = 3;
// const BBK_PERIOD = 100;
// const RSI_PERIOD = 60;
// const bigPositionRate = 5;
// const B2mult = 1;
// const Kmult = 1.5;

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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// let modelType = 1;
// const model1 = {
//     timeDis: 1,
//     profit: 1,
// };
// const model2 = {
//     priceDis: 0.01,
//     profit: 1,
// };
// let targetTime = null;
// const maPeriod = 60; // ma
// const isScale = false;
// const scaleOverNum = 20;
// const scaleHight = 3;
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 2;
// const B2mult = 1;
// const Kmult = 1.5;

// const availableMoney = 10;
// const howManyCandleHeight = 5;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
const symbol = "turboUSDT";
const profitRate = 10000;
const diff = 2;
let times = getSequenceArr(diff, 100);
let modelType = 1;
const model1 = {
    timeDis: 4,
    profit: 2.4,
};
const model2 = {
    priceDis: 0.02,
    profit: 0,
};
const maPeriod = 60; // ma
const isScale = false;
const scaleOverNum = 20;
const scaleHight = 3;
const BBK_PERIOD = 2;
const RSI_PERIOD = 60;
const bigPositionRate = 6;
const B2mult = 1;
const Kmult = 1.5;

const availableMoney = 10;
const howManyCandleHeight = 6;
const howManyNumForAvarageCandleHight = 8;
const nextBig = false; // true false // 大仓后下一次开仓延续大仓

const targetTime = null; //  "2024-10-29_21-14-00";
let overNumberToRest = 18; // 对冲次数超过 overNumberToRest ，就停止交易，空档跑网格
const canStop = false; // true false; // 开启 启动/停止 模式 ⭐️
let isResting = false; // 启动/停止
const stopLossRate = 0.6;
const protectValue = 500;
const protectProfit = false; // true false; // 更保守的话开启利润保护
const howManyNumBegainPlus = 11;
const overNumberHistory = []; // 对冲次数超过 overNumberToRest ，就记录一次当前 historyEntryPoints.length

const judgeByBBK = false; //  true false; 根据bbk指标来开单 ⭐️
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// const isScale = false
// const scaleOverNum = 20;
// const scaleHight = 3;
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
// let modelType = 1;
// const model1 = {
//     timeDis: 1,
//     profit: 2,
// };
// const model2 = {
//     priceDis: 0.005,
//     profit: 1.1,
// };
// const availableMoney = 10;
// const howManyCandleHeight = 4;
// const howManyNumForAvarageCandleHight = 90;
// const targetTime = "2024-09-29_21-14-00";
// const maPeriod = 60; // ma
// const isScale = false;
// const scaleOverNum = 20;
// const scaleHight = 3;
// const BBK_PERIOD = 2;
// const RSI_PERIOD = 60;
// const bigPositionRate = 6;
// const B2mult = 1;
// const Kmult = 1.5;

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
    // let q = (_availableMoney * times[historyEntryPoints.length - 1]) / currentPrice;
    // q = (q * 1000) % 2 === 0 ? q : q + 0.002;
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
const start = () => {
    if (targetTime) {
        let index = kLineData.findIndex((v) => v.openTime === targetTime);
        console.log("🚀 ~ file: test-mading4-3.js:1004 ~ start ~ index:", index);
        kLineData = kLineData.slice(index);
    }
    let num = 0;
    for (let idx = 100; idx < kLineData.length; idx++) {
        s_count++;
        if (getStop()) {
            testMoneyHistory.push(testMoney);
            date.push(curkLine.closeTime);
            return;
        }
        curKLines = kLineData.slice(idx - 100, idx);
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
                    readyTradingDirection = "down"; // "up";
                    !closeOrderHistory.length &&
                        console.log("🚀 ~ readyTradingDirection:", readyTradingDirection, curkLine.openTime);
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

    // judgeByBBK && console.log("🚀 ~ 挤压k数量，总k数量，挤压/总k:", num, kLineData.length, num / kLineData.length);
    console.log(symbol, "🚀 ~ maxMoney:", {
        maxMoney,
        minMoney,
        model1,
        howManyCandleHeight,
        howManyNumForAvarageCandleHight,
    });
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

        let profit = 0;
        if (modelType === 1) {
            profit = model1.profit;
        }
        if (modelType === 2) {
            profit = model2.profit;
        }
        let tartgetPrice = ((1 + 0.0007) * quantity * orderPrice + 1.1 * profit) / ((1 - 0.0007) * quantity);

        gridPoints[3] = tartgetPrice;
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
        let profit = 0;
        if (modelType === 1) {
            profit = model1.profit;
        }
        if (modelType === 2) {
            profit = model2.profit;
        }
        let tartgetPrice = ((1 - 0.0007) * quantity * orderPrice - 1.1 * profit) / (1.0007 * quantity);

        gridPoints[0] = tartgetPrice;
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
        setLinesClose("success");
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
                console.log(
                    "@@@@@@@@穿过交易点次数太多了, historyEntryPointsLen, testMoney::",
                    historyEntryPoints.length,
                    testMoney,
                );
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

            let sum = s_money.reduce((sum, cur) => sum + cur, 0);
            let profit = 0;
            if (modelType === 1) {
                profit = model1.profit;
            }
            if (modelType === 2) {
                profit = model2.profit;
            }
            let tartgetPrice = (sum + (1 - 0.0007) * quantity * orderPrice - 1.1 * profit) / (1.0007 * quantity);

            gridPoints[0] = tartgetPrice;
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
            setLinesClose("warning");
            isResting = true;
        }
        if (!isResting) {
            teadeBuy(_currentPrice);

            let sum = s_money.reduce((sum, cur) => sum + cur, 0);
            let profit = 0;
            if (modelType === 1) {
                profit = model1.profit;
            }
            if (modelType === 2) {
                profit = model2.profit;
            }
            let tartgetPrice = (-sum + (1 + 0.0007) * quantity * orderPrice + 1.1 * profit) / ((1 - 0.0007) * quantity);

            gridPoints[3] = tartgetPrice;
        }
        if (isScale && historyEntryPointsLlen === scaleOverNum) {
            gridPoints[1] -= candleHeight * scaleHight;
        }
    }
    testMoneyHistory.push(testMoney);
    date.push(curkLine.closeTime);
};

function setLinesClose(type) {
    if (isResting) return;
    testMoneyHistory.push(testMoney);
    date.push(curkLine.closeTime);
    let lastTrendInfo = closeOrderHistory[closeOrderHistory.length - 1];
    availableMoneyArr.push(times[lastTrendInfo.length - 2] * availableMoney);
    crossGrideLength.push(lastTrendInfo.length);
    positionType.push(type === "success" ? 1 : -1);
    candleHeightAndGridPoints.push({
        date: curkLine.closeTime,
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

let s_moneySumMap = {};
s_moneyArr.forEach((arr) => {
    let _s_money = arr.slice(1);
    let len = _s_money.length;
    if (s_moneySumMap[len]) {
        s_moneySumMap[len] += _s_money[len - 1];
    } else {
        s_moneySumMap[len] = _s_money[len - 1];
    }
});

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
    s_moneyArr: s_moneyArr.sort((a, b) => a.length - b.length),
    s_moneySumMap: s_moneySumMap,
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
