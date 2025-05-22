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
const { convertToRenko } = require("./utils/renko.js");
const config = require("./config-boll.js");
const { isYang, isYin, } = require("./utils/kLineTools.js");

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
    howManyCandle, // 初始止盈，盈亏比
    baseLossRate,
    firstStopProfitRate: DefaultFirstStopProfitRate, // 是否开启初始止盈(比例基于止损)（到初始止盈点时，移动止损到开仓价）
    firstProtectProfitRate,
    firstStopLossRate: DefaultFirstStopLossRate, // 是否开启初始止损（到初始止损点时，移动止盈到开仓价）
    isProfitRun, // 是否开启移动止盈
    profitProtectRate, // 移动止盈，保留盈利比例
    howManyCandleForProfitRun,
    maxStopLossRate, // 止损小于10%的情况，最大止损5%
    invalidSigleStopRate, // 止损在10%，不开单
    double, // 是否损失后加倍开仓
    maxLossCount, // 损失后加倍开仓，最大倍数
} = config["ada"];

let highArr = [];
let lowArr = [];
// 指标趋势
// let indexTrend = 'hold'; // up down breakAndUp breakAndDown hold
const MOD_HIGH = 'MOD_HIGH'
const MOD_LOW = 'MOD_LOW'
let preAction = '';

let isUpOpen = true;
let isDownOpen = true;

const MA_RSI = { rsiLength: 14, smaLength: 20 };

let availableMoney = DefaultAvailableMoney;
let firstStopProfitRate = DefaultFirstStopProfitRate;
let firstStopLossRate = DefaultFirstStopLossRate;
let lossCount = 0;
let isArriveLastStopProfit = false;
let isFirstArriveBBK = false;

let preRenkoClose = null;
let preRenkoData = null;
let preDirection = null;

let bollArrConsole = []

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
let idx = 0;
let orderIndex = 0;

// 以下参数会在程序启动时初始化
let historyClosePrices = []; // 历史收盘价，用来计算EMA
let serverTimeOffset = 0; // 服务器时间偏移
let allPositionDetail = {}; // 当前仓位信息

let bollArr = [];
let rsiArr = [];

const maxKLinelen = isTestLocal ? 30 : 450; // 储存kLine最大数量
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
        isJudgeForceLossProtect
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
    // 在getKLineData方法中获取至少15分钟内的价格数据
    const kLines = await getKLineData(B_SYMBOL, `${klineStage}`, maxKLinelen);
    if (isTestLocal) {
        kLineData = kLines;
        historyClosePrices = kLineData.map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
    } else {
        console.log("🚀 ~ getHistoryClosePrices ~ kLines.length:", kLines.length);
        kLines.forEach((v) => {
            const { renkoData, newRenkoClose, newRenkoData } = convertToRenko({
                klineData: v,
                brickSize,
                preRenkoClose,
                preRenkoData,
            });
            preRenkoClose = newRenkoClose;
            preRenkoData = newRenkoData;
            renkoData.length && kLineData.push(...renkoData);
        });
        console.log("🚀 ~ getHistoryClosePrices ~ kLineData:", kLineData.length);

        historyClosePrices = kLineData.map((data) => data.close);
        console.log(
            "初始化k线收盘价:kLineData.length, historyClosePrices.length",
            kLineData.length,
            historyClosePrices.length
        );
    }
};

const initEveryIndex = (historyClosePrices) => {
    const len = historyClosePrices.length;
    for (let i = len - 10; i < len; i++) {
        setEveryIndex(historyClosePrices.slice(0, i), kLineData[i]);
    }
};
const setEveryIndex = (historyClosePrices, curKLine) => {
    setBollArr(historyClosePrices, curKLine);
    // setRsiArr(historyClosePrices);
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

// 更新kLine信息
const setKLinesTemp = (curKLine) => {
    kLineData.length >= 30 && kLineData.shift();
    historyClosePrices.length >= 30 && historyClosePrices.shift();

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
    setEveryIndex([...historyClosePrices], curKLine);

};

// 开仓
const kaiDanDaJi = async () => {
    isOrdering = true;
    if (!bollArr.length) return;

    if (readyTradingDirection === "hold") {
        // 判断趋势
        judgeTradingDirection();
        // 指标判断趋势
        // judgeTradingDirectionByIndex();
        console.log("🚀 ~ judgeTradingDirection ~ 判断趋势:", readyTradingDirection);
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
    // trend === "up" 时，close超出上轨，就移动到开仓价
    if (
        trend === "up" &&
        firstStopLossRate &&
        (currentPrice >= B2upper) //  || (isYin(kLine0) && isYin(kLine1) && isYin(kLine2) && isYin(kLine3))
    ) {
        TP_SL[0] = orderPrice - brickSize * 1.5;
        firstStopLossRate = 0;
        isJudgeIndexLoss = false;
        return;
    }
    // trend === "down" ，close超出下轨，就移动到开仓价
    if (
        trend === "down" &&
        firstStopLossRate &&
        (currentPrice <= B2lower) // ||  (isYang(kLine0) && isYang(kLine1) && isYang(kLine2) && isYang(kLine3))
    ) {
        TP_SL[1] = orderPrice + brickSize * 1.5;
        firstStopLossRate = 0;
        isJudgeIndexLoss = false;
        return;
    }
    isJudgeIndexLoss = false;
}
// 止损
const judgeStopLoss = async (_currentPrice, isFast) => {
    if (!hasOrder) return;
    isJudgeStopLoss = true;
    const { trend, orderPrice } = tradingInfo;
    const [point1, point2] = TP_SL;
    const [kLine1, kLine2, kLine3] = getLastFromArr(kLineData, 3);
    let [boll5] = getLastFromArr(bollArr, 1);
    let { B2basis, B2upper, B2lower } = boll5;

    if (trend === "up") {
        // low 小于 point1 就止损，否则继续持有
        if (_currentPrice <= point1) {
            // 这里非常关键point1/_currentPrice
            _currentPrice = isTestLocal ? point1 * (1 - slippage) : _currentPrice;
            console.log(
                `🚀 ~ judgeStopLoss testMoney up ~ ${_currentPrice > orderPrice ? '止盈' : '止损'}/平多:currentPrice, point1, 滑点:`,
                _currentPrice,
                point1,
                `, 滑点:`, (point1 - _currentPrice)/_currentPrice, '是否盈利:', _currentPrice > orderPrice
            );
            // 止损/平多
            await closeUp(_currentPrice);
            isJudgeStopLoss = false;
            return;
        }
    }
    if (trend === "down") {
        // high 大于 point2 就止损，否则继续持有
        if (_currentPrice >= point2) {
            // 这里非常关键point2/_currentPrice
            _currentPrice = isTestLocal ? point2 * (1 + slippage) : _currentPrice;
            // 止损/平空
            console.log(
                `🚀 ~ judgeStopLoss testMoney down ~  ${_currentPrice < orderPrice ? '止盈' : '止损'}/平空:currentPrice, point2`,
                _currentPrice,
                point2,
                `, 滑点:`, (_currentPrice - point2)/point2, '是否盈利:', _currentPrice < orderPrice
            );
            await closeDown(_currentPrice);
            isJudgeStopLoss = false;
            return;
        }
    }
    isJudgeStopLoss = false;
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
        if (idx - orderIndex === 2 && !isFirstArriveBBK && firstStopProfitRate) { //  && close > Klower
            TP_SL[0] += brickSize * 0.25;
            isFirstArriveBBK = true;
            isJudgeForceLossProtect = false;
            return;
        }
    }
    if (trend === "down") {
        if (idx - orderIndex === 2 && !isFirstArriveBBK && firstStopProfitRate) {// && close < Kupper
            TP_SL[1] -= brickSize * 0.25;
            isFirstArriveBBK = true;
            isJudgeForceLossProtect = false;
            return;
        }
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
        if (firstStopLossRate) {
            const firstStopPrice = orderPrice - Math.abs(orderPrice - point1) * firstStopLossRate;
            if (currentPrice <= firstStopPrice) {
                // 到初始止损点时，并且该k线是大阴线，移动止损到该k线的下方，避免亏损太多
                // 仓位还在，说明没有 low 没有触发止损，所以low在point1上方
                // 0.8还是比较苛刻，比较难触发，所以不会频繁触发
                // 这里不再修改止盈点，避免打破策略的平衡
                // 减少止盈利接近开盘价
                TP_SL[0] = Math.abs(currentPrice + point1) / 2; // 取currentPrice 、 point1的中间值
                firstStopLossRate = 0;
                isJudgeFirstLoss = false;
                console.log("🚀 ~ judgeFirstProfitProtect up ~ 到初始止损点:TP_SL", TP_SL);
                return;
            }
        }
    }
    if (trend === "down") {
        if (firstStopLossRate) {
            const firstStopPrice = orderPrice + Math.abs(orderPrice - point2) * firstStopLossRate;
            if (currentPrice >= firstStopPrice) {
                // 到初始止损点时，并且该k线是阴线，移动止盈到开仓价，避免亏损太多
                // 减少止损
                console.log("🚀 ~ judgeFirstProfitProtect down ~ 到初始止损点:TP_SL", TP_SL);
                TP_SL[1] = Math.abs(currentPrice + point2) / 2; // 取currentPrice 、 point2的中间值
                firstStopLossRate = 0;
                isJudgeFirstLoss = false;
                return;
            }
        }
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
        if (firstStopProfitRate) {
            // const firstProfitPrice = orderPrice + Math.abs(orderPrice - point1) * firstStopProfitRate; // (开仓价 - 止损)* 初始止盈倍数
            const firstProfitPrice = orderPrice + brickSize * firstStopProfitRate;
            if (currentPrice >= firstProfitPrice || (currentPrice >= boll5.B2upper)) {
                // 到初始止盈点时，避免盈利回撤
                TP_SL[0] = orderPrice + Math.abs(orderPrice - firstProfitPrice) * firstProtectProfitRate;
                firstStopProfitRate = 0;
                firstStopLossRate = 0; // 防止同时触发止损
                isJudgeFirstProfit = false;
                console.log("🚀 ~ judgeFirstProfitProtect up ~ 到初始止盈点:TP_SL", TP_SL);
                return;
            }
        }
    }
    if (trend === "down") {
        if (firstStopProfitRate) {
            // const firstProfitPrice = orderPrice - Math.abs(orderPrice - point2) * firstStopProfitRate; // (开仓价 - 止损)* 初始止盈倍数
            const firstProfitPrice = orderPrice - brickSize * firstStopProfitRate;
            if (currentPrice <= firstProfitPrice || (currentPrice <= boll5.B2lower)) {
                // 到初始止盈点时，并且该k线是阳线，移动止损到开仓价，避免盈利回撤
                // 减少止损
                TP_SL[1] = orderPrice - Math.abs(orderPrice - firstProfitPrice) * firstProtectProfitRate;
                firstStopProfitRate = 0;
                firstStopLossRate = 0; // 防止同时触发止损
                isJudgeFirstProfit = false;
                console.log("🚀 ~ judgeFirstProfitProtect down ~ 到初始止盈点:TP_SL", TP_SL);
                return;
            }
        }
    }
    isJudgeFirstProfit = false;
};

// 止盈 | 移动止盈
const judgeProfitRunOrProfit = async (currentPrice) => {
    if (!hasOrder) return;
    isJudgeProfitRunOrProfit = true;
    const { trend, orderPrice } = tradingInfo;
    const [point1, point2] = TP_SL;
    let [boll5] = getLastFromArr(bollArr, 1);
    let { B2basis, B2upper, B2lower } = boll5;

    if (isProfitRun) {
        // 移动止盈
        // 判断止盈：high 大于 point2 就止盈利，否则继续持有
        if (trend === "up" && (currentPrice >= point2 || (!firstStopProfitRate && currentPrice >= boll5.B2upper))) {
            TP_SL = [
                orderPrice + Math.abs(point2 - orderPrice) * profitProtectRate, // 止损(这个收益高点)
                // point2 - brickSize * howManyCandleForProfitRun, // 止损
                point2 + brickSize * howManyCandleForProfitRun, // 止盈
            ];
            isArriveLastStopProfit = true;
            isJudgeProfitRunOrProfit = false;
            console.log("🚀 ~ judgeProfitRunOrProfit up ~ 移动止盈");
            return;
        }
        // low 小于 point1 就止盈利，否则继续持有
        if (trend === "down" && (currentPrice <= point1 || (!firstStopProfitRate && currentPrice <= boll5.B2lower))) {
            TP_SL = [
                point1 - brickSize * howManyCandleForProfitRun, // 止盈
                orderPrice - Math.abs(orderPrice - point1) * profitProtectRate, // 止损(这个收益高点)
                // point1 + brickSize * howManyCandleForProfitRun, // 止损
            ];
            isArriveLastStopProfit = true;
            isJudgeProfitRunOrProfit = false;
            console.log("🚀 ~ judgeProfitRunOrProfit down ~ 移动止盈");
            return;
        }
    } else {
        // 判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
        if (hasOrder && trend === "up" && (currentPrice >= point2 || (!firstStopProfitRate && currentPrice >= boll5.B2upper))) {
            // 平多
            console.log("🚀 ~ judgeProfitRunOrProfit ~ 止盈平多");
            await closeUp();
            isArriveLastStopProfit = true;
            isJudgeProfitRunOrProfit = false;
            return;
        }
        // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
        if (hasOrder && trend === "down" && (currentPrice <= point1 || (!firstStopProfitRate && currentPrice <= boll5.B2lower))) {
            // 平空
            console.log("🚀 ~ judgeProfitRunOrProfit ~ 止盈平空");
            await closeDown();
            isArriveLastStopProfit = true;
            isJudgeProfitRunOrProfit = false;
            return;
        }
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
        !firstStopProfitRate &&
        // isArriveLastStopProfit && // 效果好一点点
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
        !firstStopProfitRate &&
        // isArriveLastStopProfit && // 效果好一点点
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

    const { close, low, high } = kLine5;

    let [boll5] = getLastFromArr(bollArr, 1);
    // let [rsi1, rsi2, rsi3, rsi4, rsi5] = getLastFromArr(rsiArr, 5);
    
    let { B2basis, B2upper, B2lower } = boll5;
    
    // 反转做多
    const upTerm1 = kLine5.close < boll5.B2basis && isYin(kLine4) && isYang(kLine5);
    const upTerm2 = true;

    if (isUpOpen && upTerm1) {
        readyTradingDirection = "up";
        return;
    }
    // 反转做空
    const downTerm1 = kLine5.close > boll5.B2basis && isYang(kLine4) && isYin(kLine5);
    const downTerm2 = true

    if (isDownOpen && downTerm1 && downTerm2) {
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
            setTP_SL("up", stopLoss, stopProfit); // 这里下设置止盈止损 ????
            readyTradingDirection = "hold";
            firstStopProfitRate = DefaultFirstStopProfitRate;
            firstStopLossRate = DefaultFirstStopLossRate;
            isArriveLastStopProfit = false;
            orderIndex = idx;
            isFirstArriveBBK = false;
            break;
        case "down":
            await teadeSell();
            setTP_SL("down", stopLoss, stopProfit); // 这里下设置止盈止损 ????
            firstStopProfitRate = DefaultFirstStopProfitRate;
            firstStopLossRate = DefaultFirstStopLossRate;
            readyTradingDirection = "hold";
            isArriveLastStopProfit = false;
            orderIndex = idx;
            isFirstArriveBBK = false;
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

    // let [boll5] = getLastFromArr(bollArr,1);
    // let { B2basis, B2upper, B2lower } = boll5;

    // let max = Math.max(kLine1.high, kLine2.high, kLine3.high);
    // let min = Math.min(kLine1.low, kLine2.low, kLine3.low);
    let max = Math.max(kLine1.close, kLine2.close, kLine3.close, kLine1.open, kLine2.open, kLine3.open);
    let min = Math.min(kLine1.close, kLine2.close, kLine3.close, kLine1.open, kLine2.open, kLine3.open);
    
    // 计算ATR
    const atr = brickSize * baseLossRate;

    if (readyTradingDirection === "up" && close > open) {
        min = min - atr;
        if (min < close * (1 - invalidSigleStopRate)) {
            return {
                trend: "hold",
            };
        }
        if (min < close * (1 - maxStopLossRate)) min = close * (1 - maxStopLossRate);
        const stopLoss = min;
        return {
            trend: "up",
            stopLoss, // 止损
            stopProfit: close + brickSize * howManyCandle // (close - stopLoss) * howManyCandle, // 止盈 //
        };
    }

    if (readyTradingDirection === "down" && close < open) {
        max = max + atr;
        if (max > close * (1 + invalidSigleStopRate)) {
            return {
                trend: "hold",
            };
        }
        if (max > close * (1 + maxStopLossRate)) max = close * (1 + maxStopLossRate);
        const stopLoss = max;
        return {
            trend: "down",
            stopLoss, // 止损
            stopProfit: close - brickSize * howManyCandle // (stopLoss - close) * howManyCandle, // 止盈 // 
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
            firstStopProfitRate = DefaultFirstStopProfitRate;
            firstStopLossRate = DefaultFirstStopLossRate;
            readyTradingDirection = "hold";
            hasOrder = false;
            resetTradingDatas();
            TP_SL = [];
            saveGlobalVariables();
            console.log("🚀 ~ 平仓：平", side === "BUY" ? "空" : "多", response.data.origQty);
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
        firstStopProfitRate: __firstStopProfitRate,
        firstStopLossRate: __firstStopLossRate,
        lossCount: __lossCount,
        bollArr: __bollArr,
    } = historyDatas;

    prePrice = __prePrice; // 记录当前价格的前一个
    tradingInfo = __tradingInfo;
    testMoney = __testMoney;
    TP_SL = __TP_SL;
    isProfitRun = __isProfitRun;
    hasOrder = __hasOrder;
    readyTradingDirection = __readyTradingDirection; // 是否准备开单

    availableMoney = __availableMoney;
    firstStopProfitRate = __firstStopProfitRate;
    firstStopLossRate = __firstStopLossRate;
    lossCount = __lossCount;
    bollArr = __bollArr;
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
    let q = Math.round(availableMoney / currentPrice);
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
            console.log("平多 closeAllOrders ~ curTestMoney testMoney:",curTestMoney, testMoney);
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

            console.log("平空 closeAllOrders ~ curTestMoney testMoney:", curTestMoney, testMoney);
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
            "closeUp ~ testMoney:",
            tradingInfo.orderTime,
            kLineData[kLineData.length - 1].openTime,
            tradingInfo.orderPrice,
            _currentPrice,
            curTestMoney,
            testMoney,
            lossCount
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
            "closeDown ~ testMoney:",
            tradingInfo.orderTime,
            kLineData[kLineData.length - 1].openTime,
            tradingInfo.orderPrice,
            _currentPrice,
            curTestMoney,
            testMoney,
            lossCount
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

    // 止损 / 移动盈利的平仓
    await judgeStopLoss(currentPrice);

    // 首次盈利保护
    await judgeFirstProfitProtect(currentPrice);

    // 首次亏损保护
    // await judgeFirstLossProtect(currentPrice);

    // 止盈 | 移动止盈
    await judgeProfitRunOrProfit(currentPrice);

    // 指标止盈
    // await judgeIndexProfit(currentPrice);

    // 强制保本损
    await judgeForceLossProtect(currentPrice);

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
                        x: parsedData.isNewLine || false,
                    }
                }
            } catch (error) {
                console.error("JSON 解析失败:", error);
            }
        } else {
            realData = JSON.parse(data);
        }
        if ((isTestLocal && !realData) || (!isTestLocal && realData.e !== "kline")) {
            console.log("🚀 ~ ws.on ~ data:", data, data.toString('utf8'))
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

        if (isTestLocal && realData.error) {
            process.exit(0);
        }
        prePrice = currentPrice; // 不能删除
        currentPrice = Number(close) || 0;

        // 测试时就没有这种高频检测，正式情况不一样，需要实时监测
        if (hasOrder) {
            // 每秒会触发4次左右，但是需要快速判断是否进入交易点，所以不节流
            // 下面两个需要实时，要快，甚至需要平仓，或者需要在renkonk线中执行判断

            // 止损的要快，大概率都是要损的就尽量少损点
            // 止盈保护的可以不用那么快，在gridPointClearTrading去执行
            if (firstStopProfitRate) {
                await judgeStopLoss(currentPrice, true);
            }
        }

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

        const { renkoData, newRenkoClose, newRenkoData, newDirection } = convertToRenko({
            klineData: curKLine,
            brickSize,
            preRenkoClose,
            preRenkoData,
            preDirection,
        });
        // renkoData.length && console.log("🚀 ~ ws.on ~ , preRenkoClose, newRenkoClose:", preRenkoClose, newRenkoClose)
        preRenkoClose = newRenkoClose;
        preRenkoData = newRenkoData;
        preDirection = newDirection;
        // renkoData 这个值可能大于1，是插针，一般不会??????
        // renko 不怕插针，只是怕流动性不足，会导致不成单
        if (renkoData.length) {
            for (let i = 0; i < renkoData.length; i++) {
                idx++;
                const line = renkoData[i];
                console.log("🚀 ~ ws.on ~ renkoData:", (Math.abs(currentPrice - line.close)/currentPrice).toFixed(4), renkoData.length, renkoData);
                // 更新k线和指标数据
                refreshKLineAndIndex(line);
                // 最后一个开单
                if (i === renkoData.length - 1) {
                    if (!hasOrder) {
                        await kaiDanDaJi();
                        isTestLocal && ws.send('hello');
                        return;
                    }
                }
            }
        }
        // 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
        // 没有订单也不继续了
        if (isLoading() || prePrice === currentPrice) {
        } else {
            if (renkoData.length){
                // renko所以没有滞后得说法????
                let curClose = renkoData[renkoData.length - 1].close;
                console.log("🚀 ~ ws.on ~ renkoData[renkoData.length - 1].close:", (currentPrice - curClose)/curClose)
                await gridPointClearTrading(isTest ? renkoData[renkoData.length - 1].close : currentPrice);
            }
            // 所有执行完再存一次
            saveGlobalVariables();
        }
        isTestLocal && ws.send('hello');
    });
    // 添加 'close' 事件处理程序
    ws.on("close", (code) => {
        console.log(`WebSocket 关闭: `, code, {
            kLineData, bollArrConsole
        });
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
            if (args[0].indexOf('testMoney') < 0) {
                return;
            }
        }
        // originalConsoleLog.apply(console, args); // 保留原始 console.log 的功能
        // 将 log 写入文件
        const date = kLineData.length && isTestLocal ? kLineData[kLineData.length - 1].openTime : getDate();
        logStream.write(
            `${date}: ${args
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
    console.log("on exit...", {kLineData, bollArrConsole});
    cleanup();
});

// 监听中断信号（如 Ctrl+C）
process.on("SIGINT", (e) => {
    console.log("Received SIGINT. Cleaning up...", {kLineData, bollArrConsole});
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
                firstStopProfitRate,
                firstStopLossRate,
                lossCount,
                bollArr,
            });
            fs.writeFileSync(
                `data/${isTest ? "test" : "prod"}-${strategyType}-${isUpOpen ? 'up' : 'down'}-${SYMBOL}.js`,
                `module.exports = ${data}`,
                {
                    flag: "w",
                }
            );
            console.log(`Global variables saved to data/${SYMBOL}.js`);
        }
    }, 0);
}