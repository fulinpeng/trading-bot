// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
// const sendMail=require("./mailer.js");
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const WebSocket = require("ws"); // WebSocket库
// const { HttpsProxyAgent } = require("https-proxy-agent");
// const { SocksProxyAgent } = require("socks-proxy-agent");
const fs = require("fs");
const { getDate, hasUpDownVal, getLastFromArr, getSequenceArr } = require("./utils/functions.js");
const { calculateBollingerBands } = require("./utils/boll.js");
const config = require("./config-superTrend_swim_fee.js");
const { isYang, isYin, } = require("./utils/kLineTools.js");
const { cacleSwimingFreeWma, cacleSwimingFreeEma } = require("./utils/swimingFree.js");
const { calculateLatestSuperTrend } = require("./utils/superTrend.js");
const { calculateLatestSSL } = require("./utils/SSL_CMF_VO/SSLChannel.js");
const { calculateFBB } = require("./utils/fib.js");

let testMoney = 0;
const diff = 2;
const times = getSequenceArr(diff, 100);

let {
    strategyType,
    SYMBOL,
    base,
    availableMoney: DefaultAvailableMoney,
    invariableBalance,
    klineStage,
    logsFolder,
    errorsFolder,
    //////////////////////////////
    brickSize,
    priorityFee,
    slippage, // 滑点(测试)
    B2Period,
    B2mult,
    atrPeriod,
    multiplier,
    swimingFreePeriod,
    sslPeriod,
    howManyCandle, // 初始止盈，盈亏比
    baseLossRate,
    firstProtectProfitRate,
    arriveStopProfitCount,
    isProfitRun, // 是否开启移动止盈
    maxStopLossRate, // 止损小于10%的情况，最大止损5%
    invalidSigleStopRate, // 止损在10%，不开单
    double, // 是否损失后加倍开仓
    maxLossCount, // 损失后加倍开仓，最大倍数
} = config["sol"];

let highArr = [];
let lowArr = [];
let swimingFreeArr = [];
let superTrendArr = [];
let sslArr = [];
let fibArr = [];
// 指标趋势
// let indexTrend = 'hold'; // up down breakAndUp breakAndDown hold
const MOD_HIGH = 'MOD_HIGH'
const MOD_LOW = 'MOD_LOW'
let preAction = '';

let isUpOpen = true;
let isDownOpen = true;

const MA_RSI = { rsiLength: 14, smaLength: 20 };

let availableMoney = DefaultAvailableMoney;
let lossCount = 0;

let downArrivedProfit = 0;
let sellstopLossPrice = 0;

let sslRateUp = -0.0005;
let sslRateDown = 0.00002;

// 环境变量
const B_SYMBOL = SYMBOL.toUpperCase();
const isTest = true; // 将此标志设置为  false/true
const isTestLocal = true; // 使用本地环境（先确保isTest==true）
const api = "https://api.binance.com/api";
const fapi = "https://fapi.binance.com/fapi";
const localApi = 'http://localhost:3000'
const apiKey = process.env.BINANCE_API_KEY; // 获取API密钥
const secretKey = process.env.BINANCE_API_SECRET; // 获取API密钥的密钥

console.log(isTest ? (isTestLocal ? '本地测试环境～～～' : "测试环境～～～") : "正式环境～～～");

// mac clash
// let httpProxyAgent=new HttpsProxyAgent("http://127.0.0.1:7892");
// let socksProxyAgent=new SocksProxyAgent("socks5://127.0.0.1:7891");

// win clash
// let httpProxyAgent=new HttpsProxyAgent("http://127.0.0.1:7890");
// let socksProxyAgent=new SocksProxyAgent("socks5://127.0.0.1:7890");

// mac 小地球仪
// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:31550");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:31550");

// win 小地球仪
// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:15715");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:15715");

// v2ray
// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:10809");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:10808");

// const binance = new Binance().options({
//     APIKEY: apiKey,
//     APISECRET: secretKey,
//     // test: true,
//     family: 0,
//     recvWindow: 6000,
//     useServerTime: false, // 如果你的机器时间不准确，可以设置为 false
// });

// 创建公用的 Axios 实例
const axiosInstance = axios.create({
    // baseURL: "https://api.example.com", // 请替换为实际的 API 地址
    headers: {
        "Content-Type": "application/json",
        "X-MBX-APIKEY": apiKey,
    },
    // httpsAgent: httpProxyAgent, // 设置 SOCKS5 代理
});

// WebSocket连接，用于获取实时交易信息
// const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}`, { agent: socksProxyAgent });
const ws = isTestLocal ? new WebSocket(`ws://localhost:3000/ws/${SYMBOL}@kline_${klineStage}`) : new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}`);
// 全局变量
let kLineData = [];
let currentPrice = 0; // 记录当前价格
let prePrice = 0; // 记录当前价格的前一个
let readyTradingDirection = "hold"; // 是否准备开单
let TP_SL = []; // TP_SL
let hasOrder = false; // 是否有订单
let tradingInfo = {
    trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'hold' || '' 表示无趋势
    side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
    orderPrice: 0,
    quantity: 0,
    times: 0,
};

// 以下参数会在程序启动时初始化
let historyClosePrices = []; // 历史收盘价，用来计算EMA
let serverTimeOffset = 0; // 服务器时间偏移
let allPositionDetail = {}; // 当前仓位信息

let bollArr = [];
let rsiArr = [];

const maxKLinelen = 250; // 储存kLine最大数量
// 日志
let logStream = null;
let errorStream = null;

// loading
let loadingTrading = false; // 下单
let loadingPlaceOrder = false; // 下单
let loadingCloseOrder = false; // 平仓
let onGridPoint = false; // TP/SL上
let loadingInit = false;
let isOrdering = false; // 是否在收盘后的计算中
let isJudgeStopLoss = false;
let isUpdateSellstopLossPrice = false
let isJudgeFirstProfit = false;
let isJudgeFirstLoss = false;
let isJudgeProfitRunOrProfit = false;
let isJudgeIndexProfit = false;
let isJudgeIndexLoss = false;
let isJudgeForceLossProtect = false;

const isLoading = () => {
    return (
        loadingInit ||
        isOrdering ||
        isJudgeStopLoss ||
        isJudgeFirstProfit ||
        isJudgeFirstLoss ||
        isJudgeProfitRunOrProfit ||
        isJudgeIndexProfit ||
        isJudgeIndexLoss ||
        loadingTrading ||
        loadingPlaceOrder ||
        loadingCloseOrder ||
        onGridPoint ||
        isJudgeForceLossProtect ||
        isUpdateSellstopLossPrice
    );
};

const resetTradingDatas = () => {
    tradingInfo = {
        trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
        side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
        orderPrice: 0,
        quantity: 0,
        times: 0,
    };
};
// 获取服务器时间偏移
const getServerTimeOffset = async () => {
    if (isTestLocal) return;
    try {
        console.log("获取服务器时间偏移");
        const response = await axiosInstance.get(`${api}/v3/time`);
        const serverTime = response.data.serverTime;
        const localTime = Date.now();
        serverTimeOffset = serverTime - localTime;
        console.log(" Server time offset:", serverTimeOffset);
    } catch (error) {
        console.error(
            "getServerTimeOffset header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error
        );
        process.exit(1);
    }
};

// 签名请求
const signRequest = (params) => {
    const timestamp = Date.now() + serverTimeOffset;
    const queryString = Object.entries({ ...params, timestamp })
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
    const signature = crypto.createHmac("sha256", secretKey).update(queryString).digest("hex");
    return `${queryString}&signature=${signature}`;
};

// >>>>???? 后续，将该函数抽离，所有策略适用该函数都有问题
// 获取K线数据
const getKLineData = async (symbol, interval, limit) => {
    try {
        let response = null;
        if (isTestLocal) {
            response = await axios.get(`${localApi}/v1/klines`, {
                params: {
                    symbol,
                    klineStage,
                    limit,
                },
            });
        } else {
            response = await axios.get(`${fapi}/v1/klines`, {
                params: {
                    symbol,
                    interval,
                    limit,
                },
            });
        }

        let ks = response.data || [];

        if (isTestLocal) {
            return ks
        } else {
            // 此时间未收盘
            if (ks[ks.length - 1][6] > Date.now()) {
                ks.pop();
            }
            // 解析K线数据
            return ks.map((item) => ({
                openTime: getDate(item[0]), // 开盘时间
                open: parseFloat(item[1]), // 开盘价
                high: parseFloat(item[2]), // 最高价
                low: parseFloat(item[3]), // 最低价
                close: parseFloat(item[4]), // 收盘价(当前K线未结束的即为最新价)
                volume: parseFloat(item[5]), // 成交量
                closeTime: getDate(item[6]), // 收盘时间
                quoteAssetVolume: parseFloat(item[7]), // 成交额
                numberOfTrades: item[8], // 成交笔数
                takerBuyBaseAssetVolume: parseFloat(item[9]), // 主动买入成交量
                takerBuyQuoteAssetVolume: parseFloat(item[10]), // 主动买入成交额
            }));
        }
    } catch (error) {
        console.error(
            "getKLineData header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error
        );
        process.exit(1);
    }
};

// 获取收盘价
const getHistoryClosePrices = async () => {
    const kLines = await getKLineData(B_SYMBOL, `${klineStage}`, maxKLinelen);
    kLineData = kLines;
    historyClosePrices = kLineData.map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
};

const initEveryIndex = (historyClosePrices) => {
    const len = historyClosePrices.length;
    for (let i = len - 10; i < len; i++) {
        setEveryIndex(historyClosePrices.slice(0, i), kLineData.slice(0, i));
    }
};
const setEveryIndex = (historyClosePrices, curKLine) => {
    // setBollArr(historyClosePrices, curKLine);
    // setRsiArr(historyClosePrices);
    setSperTrendArr(curKLine);
    setSwimingFreeArr(curKLine);
    setSslArr(curKLine);
    setFibArr(curKLine);
};
const setBollArr = (historyClosePrices, curKLine) => {
    bollArr.length >= 6 && bollArr.shift();
    const boll = calculateBollingerBands(historyClosePrices, B2Period, B2mult);
    if (!boll) return;
    bollArr.push(boll);
    
    // 计算高低点
    // setHighLowArr(boll, curKLine)
};

// 储存高低点
const setHighLowArr = (boll, curKline) => {
    const { B2basis, B2upper, B2lower } = boll;
    const { close, openTime } = curKline;
    const preHigh = highArr[highArr.length - 1] || close; // 可能不合适，后续修改
    const preLow = lowArr[lowArr.length - 1] || close; // 可能不合适，后续修改
    if (close >= B2upper) {
        // 本次创了高点，但是上一次操作是更新低点，认为是新的高点
        if (preAction !== MOD_HIGH) {
            highArr.push(close);
            preAction = MOD_HIGH;
            return;
        }
    }
    
    // 和上次一样的操作，认为是调整高点
    if (preAction === MOD_HIGH) {
        if (close > preHigh) {
            highArr[highArr.length - 1] = close;
            preAction = MOD_HIGH;
            return;
        }
    }
    if (close <= B2lower) {
        // 本次创了低点，但是上一次操作是更新高点，认为是新的低点
        if (preAction !== MOD_LOW) {
            lowArr.push(close);
            preAction = MOD_LOW;
            return;
        }
    }
    // 和上次一样的操作，认为是调整低点
    if (preAction === MOD_LOW) {
        if (close < preLow) {
            lowArr[lowArr.length - 1] = close;
            preAction = MOD_LOW;
            return;
        }
    }
}
const setRsiArr = (historyClosePrices) => {
    rsiArr.length >= 10 && rsiArr.shift();
    rsiArr.push(calculateRSI(historyClosePrices, MA_RSI));
};
const setSperTrendArr = (klines) => {
    superTrendArr.length >= 10 && superTrendArr.shift();
    const superTrend = calculateLatestSuperTrend(klines, atrPeriod, multiplier);

    superTrendArr.push(superTrend);
};
const setSwimingFreeArr = (klines) => {
    swimingFreeArr.length >= 10 && swimingFreeArr.shift();
    const swimingFree = cacleSwimingFreeEma(klines, swimingFreePeriod, 2.5);

    swimingFreeArr.push(swimingFree);
};
const setSslArr = (klines) => {
    sslArr.length >= 10 && sslArr.shift();
    const ssl = calculateLatestSSL(klines, sslPeriod);

    sslArr.push(ssl);
};

const setFibArr = (klines) => {
    fibArr.length >= 10 && fibArr.shift();
    const fib = calculateFBB(klines);

    fibArr.push(fib);
};
// 更新kLine信息
const setKLinesTemp = (curKLine) => {
    kLineData.length >= maxKLinelen && kLineData.shift();
    historyClosePrices.length >= maxKLinelen && historyClosePrices.shift();

    kLineData.push(curKLine);
    historyClosePrices.push(curKLine.close);

    // console.log(
    //     "更新kLine信息:kLineData.length, historyClosePrices.length",
    //     kLineData.length,
    //     historyClosePrices.length
    // );
};
const refreshKLineAndIndex = (curKLine) => {
    // 更新kLine信息
    setKLinesTemp(curKLine);

    // 设置各种指标
    setEveryIndex([...historyClosePrices], kLineData);

};

// 开仓
const kaiDanDaJi = async () => {
    isOrdering = true;
    // if (!bollArr.length) return;

    if (readyTradingDirection === "hold") {
        // 判断趋势
        judgeTradingDirection();
        // 指标判断趋势
        // judgeTradingDirectionByIndex();
    }
    // if (!hasOrder && readyTradingDirection !== "hold") {
    //     // 趋势是否被破坏
    //     judgeBreakTradingDirection();
    // }
    // 没有仓位，准备开仓
    if (!hasOrder) {
        // 开仓：没有仓位就根据 readyTradingDirection 开单
        // 开单完成后会重置 readyTradingDirection
        if (readyTradingDirection !== "hold") {
            let [fib1, fib2, fib3] = getLastFromArr(fibArr, 3);
            // console.log("@@🚀 ~ kaiDanDaJi ~ hasOrder:", fib3)
            await judgeAndTrading();
        }
    }

    isOrdering = false;
};

// 设置止损位置
// 一般先于第一次止损和第一次止盈，多一点胜率（测试胜率高于50%）
const judgeIndexLoss = async (currentPrice) => {
    if (!hasOrder) return;
    isJudgeIndexLoss = true;
    const { open, close, openTime, closeTime, low, high } = kLineData[kLineData.length - 1];
    const { B2upper, B2lower } = bollArr[bollArr.length - 1];
    const { trend, orderPrice } = tradingInfo;
    

    isJudgeIndexLoss = false;
}
// 止损
const judgeStopLoss = async (_currentPrice, isFast) => {
    if (!hasOrder) return;
    isJudgeStopLoss = true;
    const { trend, orderPrice } = tradingInfo;
    const [point1, point2] = TP_SL;
    let [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
    let [ssl1, ssl2, ssl3] = getLastFromArr(sslArr, 3);
    let [swimingFree1, swimingFree2, swimingFree3] = getLastFromArr(swimingFreeArr, 3);
    
    let max = Math.max(superTrend3.up, superTrend3.dn);
    let min = Math.min(superTrend3.up, superTrend3.dn);

    if (trend === "up" && (
        _currentPrice <= min ||
        (sellstopLossPrice && _currentPrice < sellstopLossPrice)
    )) {
        await closeUp();
        isJudgeStopLoss = false;
        return;
    }

    if (trend === "down" && (
        _currentPrice >= max ||
        (sellstopLossPrice && _currentPrice > sellstopLossPrice)
    )) {
        await closeDown();
        isJudgeStopLoss = false;
        return;
    }
    isJudgeStopLoss = false;
};
const updateSellstopLossPrice = async (_currentPrice) => {
    if (!hasOrder) return;
    isUpdateSellstopLossPrice = true;
    const { trend, orderPrice } = tradingInfo;
    const [kLine1, kLine2, kLine3] = getLastFromArr(kLineData, 3);
    const { open, close, openTime, closeTime, low, high } = kLine3
    // let [boll1, boll2, boll3, boll4, boll5] = getLastFromArr(bollArr, 5);
    let [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
    let [ssl1, ssl2, ssl3] = getLastFromArr(sslArr, 3);
    let [swimingFree1, swimingFree2, swimingFree3] = getLastFromArr(swimingFreeArr, 3);
    let [fib1, fib2, fib3] = getLastFromArr(fibArr, 3);
    
    let max = Math.max(superTrend3.up, superTrend3.dn);
    let min = Math.min(superTrend3.up, superTrend3.dn);

    if (trend === "up") {
        if (close >= max) {
            downArrivedProfit = downArrivedProfit + 1
            if (downArrivedProfit == 1) {
                sellstopLossPrice = orderPrice + Math.abs(_currentPrice - orderPrice) * firstProtectProfitRate
            }
            if (high >= fib3.upper_7 && downArrivedProfit >= 1) {
                sellstopLossPrice = orderPrice + Math.abs(high - orderPrice) * 0.9
            }
        }
    }
    if (trend === "down") {
        if (close <= min) {
            downArrivedProfit = downArrivedProfit + 1
            if (downArrivedProfit == 1) {
                sellstopLossPrice = orderPrice - Math.abs(_currentPrice - orderPrice) * firstProtectProfitRate
            }
            if (low <= fib3.lower_7 && downArrivedProfit >= 1) {
                sellstopLossPrice = orderPrice - Math.abs(low - orderPrice) * 0.9
            }
        }
    }
    isUpdateSellstopLossPrice = false;
};
// 强制保本损
const judgeForceLossProtect = async (currentPrice) => {
    if (!hasOrder) return;
    isJudgeForceLossProtect = true;
    const { trend, orderPrice } = tradingInfo;
    const [point1, point2] = TP_SL;
    const [kLine1, kLine2, kLine3] = getLastFromArr(kLineData, 3);
    let [boll5] = getLastFromArr(bollArr, 1);
    let { B2basis, B2upper, B2lower } = boll5;
    if (trend === "up") {
    }
    if (trend === "down") {
    }
    isJudgeForceLossProtect = false;
}
// 首次亏损保护
const judgeFirstLossProtect = async (currentPrice) => {
    if (!hasOrder) return;
    isJudgeFirstLoss = true;
    const { trend, orderPrice } = tradingInfo;
    const [point1, point2] = TP_SL;

    if (trend === "up") {
    }
    if (trend === "down") {
    }
    isJudgeFirstLoss = false;
};
// 首次盈利保护
const judgeFirstProfitProtect = async (currentPrice) => {
    if (!hasOrder) return;
    isJudgeFirstProfit = true;
    const { trend, orderPrice } = tradingInfo;
    const [point1, point2] = TP_SL;
    let [boll5] = getLastFromArr(bollArr, 1);
    let { B2basis, B2upper, B2lower } = boll5;

    if (trend === "up") {
    }
    if (trend === "down") {
    }
    isJudgeFirstProfit = false;
};

// 止盈 | 移动止盈
const judgeProfitRunOrProfit = async (currentPrice) => {
    if (!hasOrder) return;
    isJudgeProfitRunOrProfit = true;
    const { trend, orderPrice } = tradingInfo;
    const [point1, point2] = TP_SL;
    const [kLine1, kLine2, kLine3] = getLastFromArr(kLineData, 3);
    let [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
    let [ssl1, ssl2, ssl3] = getLastFromArr(sslArr, 3);
    let [swimingFree1, swimingFree2, swimingFree3] = getLastFromArr(swimingFreeArr, 3);
    const { open, close, openTime, closeTime, low, high } = kLine3;
    
    let max = Math.max(superTrend3.up, superTrend3.dn);
    let min = Math.min(superTrend3.up, superTrend3.dn);

    if (trend === "up" && (
        close <= min ||
        // superTrend3.trend == -1 ||
        (downArrivedProfit >= arriveStopProfitCount && high >= max) ||
        (sellstopLossPrice && close < sellstopLossPrice)
    )) {
        await closeUp();
        isJudgeProfitRunOrProfit = false;
        return;
    }

    if (trend === "down" && (
        close >= max ||
        // superTrend3.trend == 1 ||
        (downArrivedProfit >= arriveStopProfitCount && low <= min) ||
        (sellstopLossPrice && close > sellstopLossPrice)
    )) {
        await closeDown();
        isJudgeProfitRunOrProfit = false;
        return;
    }
    isJudgeProfitRunOrProfit = false;
};
// 指标止盈
const judgeIndexProfit = async (currentPrice) => {
    if (!bollArr.filter(v => v).length) return;
    if (!hasOrder) return;
    isJudgeIndexProfit = true;
    const { open, close, openTime, closeTime, low, high } = kLineData[kLineData.length - 1];
    const { B2upper, B2lower } = bollArr[bollArr.length - 1];
    const { trend, orderPrice } = tradingInfo;
    if (
        trend === "up" &&
        (currentPrice <= B2lower) // boll值变化不大可以直接对比
    ) {
        // 平多
        console.log("🚀 ~ 指标止盈:平多");
        await closeUp();
        isJudgeIndexProfit = false;
        return;
    }
    if (
        trend === "down" &&
        (currentPrice >= B2upper) // boll值变化不大可以直接对比
        // 这里是否需要判断 high 和 close 是否大于 B2upper
    ) {
        // 平空
        console.log("🚀 ~ 指标止盈:平空");
        await closeDown();
        isJudgeIndexProfit = false;
        return;
    }
    isJudgeIndexProfit = false;
};

// 通过指标判断交易方向
const judgeTradingDirection = () => {
    const [kLine1, kLine2, kLine3, kLine4, kLine5] = getLastFromArr(kLineData, 5);
    const [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
    const [ssl1, ssl2, ssl3] = getLastFromArr(sslArr, 3);
    const [swimingFree1, swimingFree2, swimingFree3] = getLastFromArr(swimingFreeArr, 3);

    const { openTime, high, low, open, close } = kLine5;

    const maxSSL = Math.max(ssl3.sslUp, ssl3.sslDown);
    const minSSL = Math.min(ssl3.sslUp, ssl3.sslDown);
    const maxSSL1 = Math.max(ssl1.sslUp, ssl1.sslDown);
    const minSSL1 = Math.min(ssl1.sslUp, ssl1.sslDown);

    //  trend == 1 and longCond and (close > open and close > math.max(close[1], open[1])) and close > maxSSL and math.min(low, low[1]) <= maxSSL and (maxSSL - math.max(smaHigh[2], smaLow[2]))/math.max(smaHigh[2], smaLow[2]) > sslRateUp
    // 做多
    const upTerm1 = superTrend3.trend == 1 && swimingFree3.trend === 'up';
    const upTerm2 = close > open// && close > Math.max(kLine4.close, kLine4.open);
    const upTerm3 = close > maxSSL && Math.min(low, kLine4.low) <= maxSSL  && (maxSSL - maxSSL1)/maxSSL1 > sslRateUp;

    if (isUpOpen && upTerm1 && upTerm2 && upTerm3) {
        readyTradingDirection = "up";
        return;
    }

    // trend == -1 and shortCond and (close < open and close < math.min(close[1], open[1])) and close < minSSL and math.max(high, high[1]) >= minSSL and (maxSSL - math.max(smaHigh[2], smaLow[2]))/math.max(smaHigh[2], smaLow[2]) < sslRateDown
    // 做空
    const downTerm1 = superTrend3.trend == -1 && swimingFree3.trend === 'down';
    const downTerm2 = close < open// && close < Math.min(kLine4.close, kLine4.open);
    const downTerm3 = close < minSSL && Math.max(high, kLine4.high) >= minSSL  && (minSSL - minSSL1)/minSSL1 < sslRateDown;

    if (isDownOpen && downTerm1 && downTerm2 && downTerm3) {
        readyTradingDirection = "down";
        return;
    }
    readyTradingDirection = "hold";
};

// 判断+交易
const judgeAndTrading = async () => {
    loadingTrading = true;

    // 根据指标判断是否可以开单
    const { trend, stopLoss, stopProfit } = calculateTradingSignal();
    console.log("预备开仓信息： Trading trend, stopLoss, stopProfit:", trend, stopLoss, stopProfit);
    // 开单
    switch (trend) {
        case "up":
            await teadeBuy();
            // setTP_SL("up", stopLoss, stopProfit);
            hasOrder = true;
            break;
        case "down":
            await teadeSell();
            // setTP_SL("down", stopLoss, stopProfit);
            break;
        default:
            break;
    }

    saveGlobalVariables();
    loadingTrading = false;
};

const calculateTradingSignal = () => {
    const [kLine1, kLine2, kLine3] = getLastFromArr(kLineData, 3);
    const { open, close, openTime, closeTime, low, high } = kLine3;
    
    let [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);
    let [ssl1, ssl2, ssl3] = getLastFromArr(sslArr, 3);
    let [swimingFree1, swimingFree2, swimingFree3] = getLastFromArr(swimingFreeArr, 3);

    // let max = Math.max(kLine1.high, kLine2.high, kLine3.high);
    // let min = Math.min(kLine1.low, kLine2.low, kLine3.low);
    let max = Math.max(superTrend3.up, superTrend3.dn);
    let min = Math.min(superTrend3.up, superTrend3.dn);

    // 计算ATR
    // const atr = brickSize * baseLossRate; // calculateATR(kLines, slAtrPeriod).atr;

    const signalUpTerm0 = readyTradingDirection === "up" && close > open;
    const signalUpTerm1 = true;// isNewLine 

    if (signalUpTerm0 && signalUpTerm1) {
        // min = min - atr; // stopLoss ? stopLoss : min - atr;
        // if (min < close * (1 - invalidSigleStopRate)) {
        //     return {
        //         trend: "hold",
        //     };
        // }
        // if (min < close * (1 - maxStopLossRate)) min = close * (1 - maxStopLossRate);
        return {
            trend: "up",
            stopLoss: min, // 止损
            // stopProfit: close + brickSize * howManyCandle, // 止盈
            stopProfit: close + (close - min) * howManyCandle, // 止盈
        };
    }

    const signalDownTerm0 = readyTradingDirection === "down" && close < open;
    const signalDownTerm1 = true;// isNewLine
    if (signalDownTerm0 && signalDownTerm1) {
        // max = max + atr; // stopLoss ? stopLoss : max + atr;
        // if (max > close * (1 + invalidSigleStopRate)) {
        //     return {
        //         trend: "hold",
        //     };
        // }
        // if (max > close * (1 + maxStopLossRate)) max = close * (1 + maxStopLossRate);
        return {
            trend: "down",
            stopLoss: max, // 止损
            // stopProfit: close - brickSize * howManyCandle, // 止盈
            stopProfit: close - (max - close) * howManyCandle, // 止盈
        };
    }
    return {
        trend: "hold",
    };
};

// 获取持仓风险，这里要改成村本地
const getPositionRisk = async () => {
    try {
        const timestamp = Date.now() + serverTimeOffset;
        const params = {
            symbol: B_SYMBOL, // 交易对
            timestamp,
            recvWindow: 6000,
        };

        const signedParams = signRequest(params);
        const response = await axiosInstance.get(`${fapi}/v2/positionRisk?${signedParams}`);
        const data = response.data;
        console.log(" getPositionRisk ~ response:", data);
        let upData = {};
        let downData = {};
        if (data[0].positionSide === "LONG") {
            upData = data[0];
            downData = data[1];
        } else {
            upData = data[1];
            downData = data[0];
        }

        let res = null;
        if (Number(upData.positionAmt) || Number(downData.positionAmt)) {
            res = {};
            if (Number(upData.positionAmt)) {
                res.up = {
                    trend: "up", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
                    side: "BUY", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
                    orderPrice: Number(upData.entryPrice),
                    quantity: Math.abs(upData.positionAmt),
                    breakEvenPrice: upData.breakEvenPrice,
                };
            }
            if (Number(downData.positionAmt)) {
                res.down = {
                    trend: "down", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
                    side: "SELL", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
                    orderPrice: Number(downData.entryPrice),
                    quantity: Math.abs(downData.positionAmt),
                    breakEvenPrice: downData.breakEvenPrice,
                };
            }
        }
        return res;
    } catch (error) {
        console.error(
            "getPositionRisk header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error
        );
        process.exit(1);
    }
};

// 获取当前合约账户中的 USDT 余额
const getContractBalance = async () => {
    try {
        let timestamp = Date.now() + serverTimeOffset;
        const params = {
            recvWindow: 6000, // 请求的超时时间
            timestamp,
        };
        const signedParams = signRequest(params);
        // 获取账户信息
        const response = await axiosInstance.get(`${fapi}/v2/balance?${signedParams}`);
        // {
        //     accountAlias: 'SgsRmYFzoCTiAuXq', // 帐户别名，通常用于标识不同的帐户。
        //     asset: 'USDT', // 资产的标识符，例如 'USDT' 表示 Tether。
        //     balance: '16.32611622', // 帐户中特定资产的总余额。
        //     crossWalletBalance: '16.32611622', // 跨帐户余额，即帐户中包含的特定资产的总余额。
        //     crossUnPnl: '0.00000000', // 跨帐户未实现盈亏。在交易中，盈亏可能是已实现（已结算）或未实现（仍在持有的仓位中）。
        //     availableBalance: '16.32611622', // 可用余额，表示可以用于交易或提取的资产数量。
        //     maxWithdrawAmount: '16.32611622', // 最大可提取金额，表示可以从该帐户提取的最大金额。
        //     marginAvailable: true, // 表示帐户是否有杠杆交易的资格，如果为 true，则说明该帐户支持杠杆交易。
        //     updateTime: 1706267841896 // 数据更新时间戳，以毫秒为单位。这表示返回数据的时间。
        //   }
        // 提取 USDT 余额
        const balances = response.data || [];
        const baseBalance = balances.find((balance) => balance.asset === base);

        if (baseBalance) {
            availableMoney = baseBalance.availableBalance / 10;
            console.log(`Contract ${base} Balance: ${baseBalance.availableBalance}`);
        } else {
            console.log(`No ${base} balance found in the contract account.`);
        }
    } catch (error) {
        console.error(
            "getPositionRisk header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error
        );
        process.exit(1);
    }
};
// 获取当前价格
const getCurrentPrice = async () => {
    try {
        let timestamp = Date.now() + serverTimeOffset;
        const params = {
            recvWindow: 6000, // 请求的超时时间
            timestamp,
            symbol: B_SYMBOL,
        };
        const signedParams = signRequest(params);
        // 获取账户信息
        const response = await axiosInstance.get(`${fapi}/v2/ticker/price?${signedParams}`);
        currentPrice = response.data ? Number(response.data.price) : 0;
    } catch (error) {
        console.error(
            "getCurrentPrice header:",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error
        );
    }
};

// 下单（开多操作/开空操作）
const placeOrder = async (side, quantity) => {
    console.log(
        `下单（开${side === "SELL" ? "空" : "多"}操作）placeOrder ~ side, quantity:`,
        side,
        quantity
    );
    try {
        loadingPlaceOrder = true;
        const _currentPrice = currentPrice;
        const timestamp = Date.now() + serverTimeOffset;
        let params = {
            symbol: B_SYMBOL, // 交易对
            side, // 指定订单是开多 (BUY) 还是开空 (SELL)
            type: "MARKET", // LIMIT：限价订单，MARKET：市价订单，详见 https://binance-docs.github.io/apidocs/spot/en/#test-new-order-trade
            quantity,
            positionSide: side === "BUY" ? "LONG" : "SHORT",
            timestamp,
            recvWindow: 6000, // 请求的超时时间
        };
        console.log("下单 params:", params);
        const signedParams = signRequest(params);

        let response = null;
        if (isTest) {
            response = {
                data: {
                    orderId: "xxx",
                    origQty: quantity,
                },
            };
        } else {
            response = await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
        }

        console.log(
            `Order placed - Symbol: ${B_SYMBOL}, Side: ${side}, Quantity: ${quantity}`,
            "orderId:",
            response.data.orderId
        );
        // 如果 下单（开多操作/开空操作） 成功需要更新PurchaseInfo
        if (response && response.data && response.data.orderId) {
            const { origQty, orderId } = response.data;
            const trend = side === "BUY" ? "up" : "down";
            await recordRradingInfo({
                orderId,
                trend,
                side,
                orderPrice: _currentPrice,
                quantity: Math.abs(origQty),
                orderTime: kLineData[kLineData.length - 1].openTime,
            });

            // 更新交易状态
            hasOrder = true;
            readyTradingDirection = "hold";

            saveGlobalVariables();
            console.log("placeOrder ~ 下单成功 tradingInfo:", tradingInfo);
        } else {
            console.error("下单失败！！！！！");
        }
        loadingPlaceOrder = false;
    } catch (error) {
        console.error(
            "placeOrder header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error
        );
        process.exit(1);
    }
};
// 平仓
const closeOrder = async (side, quantity, cb) => {
    try {
        loadingCloseOrder = true;
        const timestamp = Date.now() + serverTimeOffset;
        let params = {
            symbol: B_SYMBOL, // 交易对
            side,
            type: "MARKET",
            quantity,
            positionSide: side === "BUY" ? "SHORT" : "LONG",
            timestamp,
            recvWindow: 6000,
        };

        const signedParams = signRequest(params);
        let response = null;
        if (isTest) {
            response = {
                data: {
                    origQty: quantity,
                },
            };
        } else {
            response = await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
        }

        if (response && response.data && response.data.origQty) {
            cb && cb();
            readyTradingDirection = "hold";
            hasOrder = false;
            sellstopLossPrice = 0;
            downArrivedProfit = 0;
            resetTradingDatas();
            TP_SL = [];
            saveGlobalVariables();
        } else {
            console.log(
                "🚀 ~ 平仓：平",
                side === "BUY" ? "空" : "多",
                "！！！！！！！！！！！！！！！！！！！！！！！！失败",
                response,
                tradingInfo
            );
        }
        loadingCloseOrder = false;
    } catch (error) {
        console.error(
            "closeOrder header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error
        );
        process.exit(1);
    }
};

// 开多
const teadeBuy = async () => {
    try {
        await placeOrder("BUY", getQuantity()); // 调整开仓数量
        console.log("开多完成");
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};

// 开空
const teadeSell = async () => {
    try {
        await placeOrder("SELL", getQuantity()); // 调整开仓数量
        console.log("开空完成");
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};

// 更新购买信息
const recordRradingInfo = async (info) => {
    // 更新购买信息
    Object.assign(tradingInfo, info);
    console.log("Purchase Info Updated:", tradingInfo);
};

/**
 * 初始化
 */
const getHistoryData = () => {
    if (fs.existsSync(`./data/${isTest ? "test" : "prod"}-${strategyType}-${isUpOpen ? 'up' : 'down'}-${SYMBOL}.js`)) {
        let historyDatas = require(
            `./data/${isTest ? "test" : "prod"}-${strategyType}-${isUpOpen ? 'up' : 'down'}-${SYMBOL}.js`
        );
        const {
            currentPrice: __currentPrice, // 记录当前价格
            prePrice: __prePrice, // 记录当前价格的前一个
            tradingInfo: __tradingInfo,
        } = historyDatas;
        console.log("上一次停止程序时，交易情况", historyDatas);

        if (
            __currentPrice != 0 &&
            __prePrice != 0
        ) {
            return historyDatas;
        } else {
            return null;
        }
    } else {
        return null;
    }
};
const recoverHistoryData = async (historyDatas) => {
    const {
        currentPrice: __currentPrice, // 记录当前价格
        prePrice: __prePrice, // 记录当前价格的前一个
        tradingInfo: __tradingInfo,
        isProfitRun: __isProfitRun,
        TP_SL: __TP_SL,
        testMoney: __testMoney,
        readyTradingDirection: __readyTradingDirection, // 是否准备开单
        hasOrder: __hasOrder,

        availableMoney: __availableMoney,
        lossCount: __lossCount,
    } = historyDatas;

    prePrice = __prePrice; // 记录当前价格的前一个
    tradingInfo = __tradingInfo;
    testMoney = __testMoney;
    TP_SL = __TP_SL;
    isProfitRun = __isProfitRun;
    hasOrder = __hasOrder;
    readyTradingDirection = __readyTradingDirection; // 是否准备开单

    availableMoney = __availableMoney;
    lossCount = __lossCount;
};
const recoverHistoryDataByPosition = async (historyDatas, { up, down }) => {
    //
    // 从数据库拿出上次的数据，并且与现在的比较，如果数据和的上就用以前的，数据和不上就解析出
    loadingInit = true;
    await recoverHistoryData(historyDatas);
    if (__isProfitRun) {
        console.log("上次停止程序时处于利润奔跑模式，当前重启后继续奔跑");
        // await closeOrder(tradingInfo.side, tradingInfo.quantity);
    } else {
        await checkOverGrid({ up, down });
    }
    loadingInit = false;
};

const checkOverGrid = async ({ up, down }) => {
    await getCurrentPrice();
    if (currentPrice <= TP_SL[0] || currentPrice >= TP_SL[1]) {
        console.log(`初始化时，价格超出TP/SL区间，重置仓位（盈利）`);
        await closeAllOrders({ up, down });

        prePrice = currentPrice; // 记录当前价格的前一个
    }
};

// 设置TP/SL
const setTP_SL = (trend, stopLoss, stopProfit) => {
    const _currentPrice = currentPrice;
    console.log("开始设置TP/SL~ trend, _currentPrice:", trend, _currentPrice);

    loadingNewPoints = true;

    if (trend === "up") {
        let _stopLoss = stopLoss; // 止损
        let _stopProfit = stopProfit; // 止盈
        TP_SL = [_stopLoss, _stopProfit];
    }

    if (trend === "down") {
        let _stopLoss = stopLoss; // 止损
        let _stopProfit = stopProfit; // 止盈
        TP_SL = [_stopProfit, _stopLoss];
    }

    saveGlobalVariables();

    loadingNewPoints = false;
    console.log("设置TP/SL _currentPrice, TP_SL :", currentPrice, TP_SL);
};

// 5. 启动交易
const startTrading = async () => {
    try {
        // 同步服务器时间
        await getServerTimeOffset();

        // 初始化 historyClosePrices
        await getHistoryClosePrices();

        // 初始化指标
        initEveryIndex(historyClosePrices);

        // 设置开仓金额
        if (!invariableBalance) {
            await getContractBalance();
        }

        // 获取历史仓位数据
        const historyDatas = getHistoryData();
        console.log("🚀 获取历史仓位数据 ~ allPositionDetail:", historyDatas);
        // 测试
        if (isTest) {
            !isTestLocal && await getCurrentPrice();
            historyDatas && (await recoverHistoryData(historyDatas));
        } else {
            // 初始化
            allPositionDetail = await getPositionRisk(); // 获取当前仓位信息

            if (hasUpDownVal(allPositionDetail)) {
                console.log("🚀 已有仓位 ~ allPositionDetail:", allPositionDetail);
                // 已有仓位，两边仓位信息一致，立即恢复数据
                if (historyDatas && historyDatas.tradingInfo && historyDatas.tradingInfo.quantity) {
                    await recoverHistoryDataByPosition(historyDatas, allPositionDetail);
                } else {
                    console.log("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
                    console.error("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
                    return;
                }
            } else {
                // 如果还没仓位要加仓
                console.log("还没仓位，开始运行策略");
            }
        }
        await startWebSocket(); // 启动websocket更新价格
    } catch (error) {
        console.error("startTrading Error:", error);
        process.exit(1);
    }
};
// 获取下单量
// const getQuantity = () => {
//     availableMoney = DefaultAvailableMoney * (1 + lossCount);
//     return Math.round(availableMoney / currentPrice);
// };

const getQuantity = () => {
    availableMoney = DefaultAvailableMoney * times[lossCount];
    let q = Math.round((availableMoney / currentPrice) * 10000) / 10000;
    // q = q * 1000 % 2 === 0 ? q : q + 0.002;
    return q;
};

const closeAllOrders = async ({ up, down }) => {
    let promises = [];
    if (up) {
        // 平多
        const upPromise = closeOrder("SELL", up.quantity, () => {
            // 测试
            const curTestMoney =
                up.quantity * currentPrice -
                up.orderPrice * up.quantity -
                (up.quantity * currentPrice + up.orderPrice * up.quantity) * priorityFee;

            testMoney += curTestMoney;
            setLossCount(curTestMoney);
            console.log("平多 closeAllOrders ~ curTestMoney:",curTestMoney, testMoney);
            console.log("平多完成");

            // 发送邮件
            // sendMail({
            //     subject: `${up.orderPrice < currentPrice ? "✅" : "❌"}${B_SYMBOL}平多完成`,
            //     text: JSON.stringify({
            //         profitMoney: testMoney,
            //         up: { ...up },
            //         TP_SL: [...TP_SL],
            //     }),
            // });
        });
        promises.push(upPromise);
    }
    if (down) {
        // 平空
        const downPromise = closeOrder("BUY", down.quantity, () => {
            // 测试
            const curTestMoney =
                down.quantity * down.orderPrice -
                down.quantity * currentPrice -
                (down.quantity * down.orderPrice + down.quantity * currentPrice) * priorityFee;

            testMoney += curTestMoney;
            setLossCount(curTestMoney);

            console.log("平空 closeAllOrders ~ curTestMoney:", curTestMoney, testMoney);
            console.log("平空完成");

            // 发送邮件
            // sendMail({
            //     subject: `${down.orderPrice > currentPrice ? "✅" : "❌"}${B_SYMBOL}平空完成`,
            //     text: JSON.stringify({
            //         profitMoney: testMoney,
            //         down: { ...down },
            //         TP_SL: [...TP_SL],
            //     }),
            // });
        });
        promises.push(downPromise);
    }
    await Promise.all(promises);
};

// 平多
const closeUp = async (testCurrentPrice) => {
    let _currentPrice = testCurrentPrice || currentPrice;
    await closeOrder("SELL", tradingInfo.quantity, () => {
        // 测试
        const curTestMoney =
            tradingInfo.quantity * (_currentPrice - tradingInfo.orderPrice) -
            tradingInfo.quantity * (_currentPrice + tradingInfo.orderPrice) * priorityFee;

        testMoney += curTestMoney;
        setLossCount(curTestMoney);
        console.log(
            "@@closeUp:",
            tradingInfo.orderTime,
            kLineData[kLineData.length - 1].openTime,
            {
                orderP: tradingInfo.orderPrice,
                orderQ: tradingInfo.quantity,
                curTtM: curTestMoney,
                tM: testMoney,
                lossCount
            }
        );
        console.log("平多完成");

        // 发送邮件
        // sendMail({
        //     subject: `${tradingInfo.orderPrice < _currentPrice ? "✅" : "❌"}${B_SYMBOL}有一单平仓`,
        //     text: JSON.stringify({
        //         profitMoney: testMoney,
        //         tradingInfo: { ...tradingInfo },
        //         TP_SL: [...TP_SL],
        //     }),
        // });
    });
};
const setLossCount = (curTestMoney) => {
    if (double) {
        if (curTestMoney <= 0) {
            lossCount = lossCount + 1 > maxLossCount ? maxLossCount : lossCount + 1;
        } else {
            lossCount = 0;
        }
    }
};
// 平空
const closeDown = async (testCurrentPrice) => {
    let _currentPrice = testCurrentPrice || currentPrice;
    await closeOrder("BUY", tradingInfo.quantity, () => {
        // 测试
        const curTestMoney =
            tradingInfo.quantity * (tradingInfo.orderPrice - _currentPrice) -
            tradingInfo.quantity * (_currentPrice + tradingInfo.orderPrice) * priorityFee;

        testMoney += curTestMoney;
        setLossCount(curTestMoney);
        console.log(
            "@@closeDown:",
            tradingInfo.orderTime,
            kLineData[kLineData.length - 1].openTime,
            {
                orderP: tradingInfo.orderPrice,
                orderQ: tradingInfo.quantity,
                curTtM: curTestMoney,
                tM: testMoney,
                lossCount
            }
        );
        console.log("平空完成");

        // 发送邮件
        // sendMail({
        //     subject: `${tradingInfo.orderPrice > _currentPrice ? "✅" : "❌"}${B_SYMBOL}有一单平仓`,
        //     text: JSON.stringify({
        //         profitMoney: testMoney,
        //         tradingInfo: { ...tradingInfo },
        //         TP_SL: [...TP_SL],
        //     }),
        // });
    });
};
// 是否到达止损点/平仓
const gridPointClearTrading = async (currentPrice) => {
    if (!hasOrder) return;

    onGridPoint = true;

    // 止盈 | 移动止盈
    await judgeProfitRunOrProfit(currentPrice);

    // 高频判断止损
    // await judgeStopLoss(currentPrice);

    // 首次盈利保护
    await updateSellstopLossPrice(currentPrice);

    // 首次亏损保护
    // await judgeFirstLossProtect(currentPrice);


    // 指标止盈
    // await judgeIndexProfit(currentPrice);

    // 强制保本损
    // await judgeForceLossProtect(currentPrice);

    onGridPoint = false;
};

// WebSocket 事件
const startWebSocket = async () => {
    console.log("🚀 startWebSocket~~~~~");
    // 添加 'open' 事件处理程序
    ws.on("open", async () => {
        console.log("WebSocket connection opened.");
        reconnectAttempts = 0;
    });

    // 添加 'message' 事件处理程序
    ws.on("message", async (data) => {
        let realData = {};
        if (isTestLocal) {
            // 将 Buffer 转换为字符串
            const jsonString = data.toString("utf-8");
            try {
                // 解析 JSON 数据
                const parsedData = JSON.parse(jsonString);
                realData = {
                    k: {
                        t: parsedData.openTime,
                        T: parsedData.closeTime,
                        o: parsedData.open,
                        c: parsedData.close,
                        h: parsedData.high,
                        l: parsedData.low,
                        v: parsedData.volume,
                        x: true, // ?????????????????? parsedData.isNewLine || false,
                    }
                }
            } catch (error) {
                console.error("JSON 解析失败:", error);
            }
        } else {
            realData = JSON.parse(data);
        }
        if ((isTestLocal && !realData) || (!isTestLocal && realData.e !== "kline")) {
            console.error("🚀 ~ ws.on ~ data:", data, data.toString('utf8'))
            return;
        }
        const {
            k: {
                t: openTime, // 这根K线的起始时间
                T: closeTime, // 这根K线的结束时间
                o: open, // 这根K线期间第一笔成交价
                c: close, // 这根K线期间末一笔成交价
                h: high, // 这根K线期间最高成交价
                l: low, // 这根K线期间最低成交价
                v: volume, // 这根K线期间成交量
                x: isNewLine, // 这根K线是否完结(是否已经开始下一根K线)
                V: takerBuyBaseAssetVolume, // 主动买入的成交量
            },
        } = realData
        
        if (isTestLocal && (realData.error || !openTime)) {
            console.log('end data')
            process.exit(0);
        }
        prePrice = currentPrice; // 不能删除
        currentPrice = Number(close) || 0;

        // 测试时就没有这种高频检测，正式情况不一样，需要实时监测
        // if (hasOrder && !isLoading()) {
        //     // 每秒会触发4次左右，但是需要快速判断是否进入交易点，所以不节流
        //     // 下面两个需要实时，要快，甚至需要平仓，或者需要在renkonk线中执行判断

        //     // 更新止损位
        //     // await updateSellstopLossPrice(currentPrice);
        //     // 应该是要疯狂执行才对，才快嘛
        //     await judgeStopLoss(currentPrice, true);
        // }

        const curKLine = {
            openTime: isTestLocal ? openTime : getDate(openTime), // 这根K线的起始时间
            closeTime: isTestLocal ? closeTime : getDate(closeTime), // 这根K线的结束时间
            open: Number(open), // 这根K线期间第一笔成交价
            close: Number(close), // 这根K线期间末一笔成交价
            high: Number(high), // 这根K线期间最高成交价
            low: Number(low), // 这根K线期间最低成交价
            volume: Number(volume), // 这根K线期间成交量
            isNewLine, // 这根K线是否完结(是否已经开始下一根K线)
            takerBuyBaseAssetVolume: Number(takerBuyBaseAssetVolume), // 主动买入的成交量
        };
        if (isNewLine) {
            // 更新k线和指标数据
            refreshKLineAndIndex(curKLine);
            if (!hasOrder) {
                await kaiDanDaJi();
                isTestLocal && ws.send('hello');
                return;
            }
            // 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
            // 没有订单也不继续了
            if (isLoading() || prePrice === currentPrice) {
            } else {
                await gridPointClearTrading(currentPrice);
            }
        }
        isTestLocal && ws.send('hello');
    });
    // 添加 'close' 事件处理程序
    ws.on("close", (code) => {
        console.log(`WebSocket 关闭: `, code);
        process.exit(code);
    });

    // 添加 'error' 事件处理程序
    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        // 在这里添加处理错误的逻辑
        process.exit(error);
    });
    // 可能不需要ping/pong因为服务器一直在推送数据，所以socket不能因为休眠关闭
    ws.on("ping", (data) => {
        // const str = data.toString('utf8');
        // console.log("🚀 ~ ws.on ~ ping data:", data, str)
        ws.pong(data);
    });
    if (isTestLocal) {
        ws.send('hello');
    }
};
// 自定义函数将 Error 对象转为字符串
function errorToString(error) {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}\n${error.stack}`;
    }
    return error;
}
// logs
const createLogs = () => {
    // 创建 logs 文件夹
    if (!fs.existsSync(logsFolder)) {
        fs.mkdirSync(logsFolder);
    }

    // 重定向 console.log 到文件
    logStream = fs.createWriteStream(
        `${logsFolder}/${isTest ? "test" : "prod"}-${strategyType}-${isUpOpen ? 'up' : 'down'}-${SYMBOL}-${getDate()}.log`,
        {
            flags: "a",
        }
    );
    // 保存原始的 console.log 函数
    const originalConsoleLog = console.log;

    // 重写 console.log
    console.log = function (...args) {
        if (isTestLocal) {
            if (args[0].indexOf('@@') < 0) {
                return;
            }
        }
        // originalConsoleLog.apply(console, args); // 保留原始 console.log 的功能
        // 将 log 写入文件
        const date = isTestLocal ? '' : getDate() + ': ';
        logStream.write(
            `${date}${args
                .map((v) => {
                    if (typeof v === "object") {
                        return JSON.stringify(v);
                    } else {
                        return v;
                    }
                })
                .join("，")}\n`
        );
    };

    // ~~~~~~~~~~~~~~~~error~~~~~~
    // 创建 error 文件夹
    if (!fs.existsSync(errorsFolder)) {
        fs.mkdirSync(errorsFolder);
    }
    // 重定向 console.error 到文件
    errorStream = fs.createWriteStream(
        `${errorsFolder}/${isTest ? "test" : "prod"}-${strategyType}-${isUpOpen ? 'up' : 'down'}-${SYMBOL}-${getDate()}.error`,
        { flags: "a" }
    );
    // 保存原始的 console.error 函数
    const originalConsoleError = console.error;

    // 重写 console.error
    console.error = function (...args) {
        originalConsoleError.apply(console, args); // 保留原始 console.error 的功能
        // 将 error 写入文件
        errorStream.write(
            `${getDate()}: ${args
                .map((v) => {
                    if (v instanceof Error) {
                        return errorToString(v);
                    } else if (typeof v === "object") {
                        return JSON.stringify(v);
                    } else {
                        return v;
                    }
                })
                .join("，")}\n`
        );
        // // 发送邮件
        // sendMail({
        // 	subject: `❌❌❌ ${B_SYMBOL}仓位发生错误，请手动处理`,
        // 	text: JSON.stringify({
        // 		currentPrice,
        // 		tradingInfo: {...tradingInfo},
        // 		TP_SL: [...TP_SL],
        // 	}),
        // });
    };
};

createLogs();
startTrading(); // 开始启动

const test = async () => {
    await getHistoryClosePrices(); // 初始化 historyClosePrices
};
// test();

// 在服务停止时执行的清理工作
function cleanup() {
    console.log("Cleaning up before exit.");
    logStream && logStream.end();
    errorStream && errorStream.end();
}

// 监听进程的 exit 事件
process.on("exit", (code) => {
    console.log("on exit...");
    cleanup();
});

// 监听中断信号（如 Ctrl+C）
process.on("SIGINT", (e) => {
    console.log("Received SIGINT. Cleaning up...");
    process.exit();
});

// 监听未捕获异常
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    // 退出进程
    process.exit(1);
});

// 保存全局变量到文件
function saveGlobalVariables() {
    setTimeout(() => {
        // 创建 data 文件夹
        if (!fs.existsSync("data")) {
            fs.mkdirSync("data");
        }
        if (currentPrice !== 0 && prePrice !== 0) {
            const data = JSON.stringify({
                currentPrice, // 记录当前价格
                prePrice, // 记录当前价格的前一个
                tradingInfo, // 订单数据
                testMoney,
                hasOrder,
                isProfitRun: isProfitRun,
                TP_SL: TP_SL, // TP_SL
                readyTradingDirection, // 是否准备开单
                availableMoney,
                lossCount,
            });
            fs.writeFileSync(
                `data/${isTest ? "test" : "prod"}-${strategyType}-${isUpOpen ? 'up' : 'down'}-${SYMBOL}.js`,
                `module.exports = ${data}`,
                {
                    flag: "w",
                }
            );
        }
    }, 0);
}