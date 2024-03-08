// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const WebSocket = require("ws"); // WebSocket库
const { HttpsProxyAgent } = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");
// const Binance = require("node-binance-api");
const fs = require("fs");
const {
    debounce,
    throttle,
    getDate,
    isNonEmpty,
    calculateAverage,
    throttleImmediate,
    findFarthestNumber,
} = require("./utils/functions.js");
const config = require("./config.js");

let testMoney = 0;

const {
    SYMBOL,
    base,
    availableMoney,
    invariableBalance,
    leverage,
    maxRepeatNum,
    mixReversetime,
    gridHight,
    gridCount,
    orderCountLimit,
    acrossPointLimit,
    EMA_PERIOD,
    klineStage,
    logsFolder,
    errorsFolder,
} = config["bot6_12"];

// 环境变量
const B_SYMBOL = SYMBOL.toUpperCase();
const isTest = false; // 将此标志设置为 true 使用沙盒环境
const api = "https://api.binance.com/api";
const fapi = "https://fapi.binance.com/fapi";
const apiKey = process.env.BINANCE_API_KEY; // 获取API密钥
const secretKey = process.env.BINANCE_API_SECRET; // 获取API密钥的密钥

console.log(isTest ? "测试环境～～～" : "正式环境～～～");

// clash
// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:7892");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:7891");

// 小地球仪
let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:31550");
let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:31550");

// const binance = new Binance().options({
//     APIKEY: apiKey,
//     APISECRET: secretKey,
//     // test: true,
//     family: 0,
//     recvWindow: 6000,
//     useServerTime: false, // 如果你的机器时间不准确，可以设置为 false
// });
// WebSocket连接，用于获取实时交易信息

// 创建公用的 Axios 实例
const axiosInstance = axios.create({
    // baseURL: "https://api.example.com", // 请替换为实际的 API 地址
    headers: {
        "Content-Type": "application/json",
        "X-MBX-APIKEY": apiKey,
    },
    httpsAgent: httpProxyAgent, // 设置 SOCKS5 代理
});

const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@aggTrade`, { agent: socksProxyAgent });

// const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}m`, { agent: socksProxyAgent });
// {
//     "e": "kline",     // 事件类型
//     "E": 123456789,   // 事件时间
//     "s": "BNBUSDT",    // 交易对
//     "k": {
//       "t": 123400000, // 这根K线的起始时间
//       "T": 123460000, // 这根K线的结束时间
//       "s": "BNBUSDT",  // 交易对
//       "i": "1m",      // K线间隔
//       "f": 100,       // 这根K线期间第一笔成交ID
//       "L": 200,       // 这根K线期间末一笔成交ID
//       "o": "0.0010",  // 这根K线期间第一笔成交价
//       "c": "0.0020",  // 这根K线期间末一笔成交价
//       "h": "0.0025",  // 这根K线期间最高成交价
//       "l": "0.0015",  // 这根K线期间最低成交价
//       "v": "1000",    // 这根K线期间成交量
//       "n": 100,       // 这根K线期间成交笔数
//       "x": false,     // 这根K线是否完结(是否已经开始下一根K线)
//       "q": "1.0000",  // 这根K线期间成交额
//       "V": "500",     // 主动买入的成交量
//       "Q": "0.500",   // 主动买入的成交额
//       "B": "123456"   // 忽略此参数
//     }
//   }
// 全局变量
let kLineData = [];
let historyEntryPoints = [];
let currentPrice = 0; // 记录当前价格
let prePrice = 0; // 记录当前价格的前一个
let gridPoints = []; // 网格每个交易点
let currentPriceEma; // 当前价格的EMA值
let confirmationTimer = null; // 订单确认定时器
let serverTimeOffset = 0; // 服务器时间偏移
let confirmNum = 3; // 下单后确认时间（分钟）
let historyClosePrices = []; // 历史收盘价，用来计算EMA
let curGridPoint = undefined; // 当前网格
let prePointIndex = undefined; // 上一个网格
let currentPointIndex = undefined; // 当前网格
let tradingDatas = {}; // 订单数据
let allPositionDetail = {}; // 当前仓位信息
let keepModel2Time = 10; // 保持模式2的时间，此时间内不切换

const wobvPeriod = 15; // 你想要的移动平均周期
const atrPeriod = 14; // 你想要的 ATR 计算周期

let dynamicWOBVResult = [];
let wobv_maResult = [];
let atrResult = [];

// let preArrivePointTime = 0; // 到达不同网格的时间
// let curArrivePointTime = 0; // 到达不同网格的时间

let reverseTradeTimeMargin = []; // 反手时间间隔
let reverseTradePriceMargin = []; // 反手价格间隔
let preReverseTradeTime = -99999999999999999; // 上一次反手时间
let preReverseTradePrice = 0; // 上一次反手价格

let lastInvokeReverseTime = 0; // 反手执行时间
let reverseTimer = null; // 反手节流的 timer
let clearReverseTimer = null; // 90s的清除反手 timer

let continuouNum = 3; // 连续几次反手就切换成双开模式

let curEma1 = 0;
let curEma2 = 0;
let curRsi = 0;
let curInBollBands = false; // 默认模式为1，所以默认不在布林带

// 这些指标，都不能预测，都马后炮
const THRESHOLD = gridHight * 0.015; // 阈值
const overboughtThreshold = 69.5;
const oversoldThreshold = 31.5;

const STD_MULTIPLIER = 1.2; // 用来确定布林带的宽度
const BOLL_PERIOD = 10;
const RSI_PERIOD = 10; // RSI计算周期

let model = 2; // 模式： 1 单开， 2 双开
let preModel = 1; // 模式： 1 单开， 2 双开
let repeatPointCount = {}; // ema 模糊的次数

let rsiArr = [];
let ema1Arr = [];
let ema2Arr = [];
let ema3Arr = [];

const klineTimeRange = klineStage * 60 * 1000; // k线单位时间
let emaMargin = [];

// 日志
let logStream = null;
let errorStream = null;

// mode === 1 时，最新交易信息
let purchaseInfo = {
    currentPointIndex,
    trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
    side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
    orderPrice: 0,
    quantity: 0,
};

// loading
let loadingPlaceOrder = false; // 下单
let loadingCloseOrder = false; // 平仓
let loadingReverseTrade = false; // 反手
let loadingForehandTrade = false; // 顺手
let loadingNewPoints = false; // 修改网格
let onGridPoint = false; // 网格上
let isSwitch = false;
let loadingInit = false;
let loadingBoth = false;
const isLoading = () => {
    return (
        loadingInit ||
        loadingBoth ||
        isSwitch ||
        // loadingPlaceOrder ||
        // loadingCloseOrder ||
        loadingReverseTrade ||
        loadingForehandTrade ||
        onGridPoint
    );
};

// 获取服务器时间偏移
const getServerTimeOffset = async () => {
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
            error && error.response ? error.response.data : error,
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

// 获取K线数据
const getKLineData = async (symbol, interval, limit) => {
    try {
        const response = await axios.get(`${api}/v3/klines`, {
            params: {
                symbol,
                interval,
                limit,
            },
        });
        // 解析K线数据
        return response.data.map((item) => ({
            openTime: item[0], // 开盘时间
            open: parseFloat(item[1]), // 开盘价
            high: parseFloat(item[2]), // 最高价
            low: parseFloat(item[3]), // 最低价
            close: parseFloat(item[4]), // 收盘价(当前K线未结束的即为最新价)
            volume: parseFloat(item[5]), // 成交量
            closeTime: item[6], // 收盘时间
            quoteAssetVolume: parseFloat(item[7]), // 成交额
            numberOfTrades: item[8], // 成交笔数
            takerBuyBaseAssetVolume: parseFloat(item[9]), // 主动买入成交量
            takerBuyQuoteAssetVolume: parseFloat(item[10]), // 主动买入成交额
        }));
    } catch (error) {
        console.error(
            "getKLineData header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error,
        );
        process.exit(1);
    }
};

// 获取收盘价
const getHistoryClosePrices = async () => {
    // 在getKLineData方法中获取至少15分钟内的价格数据
    kLineData = await getKLineData(B_SYMBOL, `${klineStage}m`, 20);
    console.log("🚀 ~ file: gridBot6.js:154 ~ getHistoryClosePrices ~ kLineData:", kLineData);
    historyClosePrices = kLineData.map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
    // console.log("k线收盘价:", historyClosePrices);

    // let preCloseTime = kLineData[kLineData.length - 1].closeTime;
    // let nextCloseTime = preCloseTime + klineStage * 30000;
    // let x = nextCloseTime - Date.now();

    // console.log("k线最后一个蜡烛的收盘时间差 preCloseTime, nextCloseTime, x:", preCloseTime, nextCloseTime, x);

    // setTimeout(() => {
    //     refreshPrice();
    //     refreshHistoryClosePrices(); // 开始刷新最新价格，这一步非常重要
    // }, x);
    // initRsi();
};
const initRsi = () => {
    for (let i = RSI_PERIOD + 1; i <= historyClosePrices.length; i++) {
        const prices = historyClosePrices.slice(0, i);
        rsiArr.push(calculateRSI(prices, RSI_PERIOD));
    }
    console.log(" initRsi ~ rsiArr:", rsiArr);
};
// 获取EMA（指数移动平均线）值
const getCurrentPriceEma = async () => {
    // 传递至calculateEMA函数
    currentPriceEma = await setEmaArr(historyClosePrices, EMA_PERIOD);
    console.log("🚀 ~ file: gridBot5.js:396 ~ ws.on ~ currentPriceEma:", currentPriceEma);
};

const setEveryIndexData = (curKLine) => {
    const dynamicWOBV = "";
    const wobv_ma = "";
    const atr = "";
    const rsi = "";
    const macd = "";

    kLineData.length >= 30 && kLineData.shift();
    historyClosePrices.length >= 30 && historyClosePrices.shift();
    dynamicWOBVResult.length >= 30 && dynamicWOBVResult.shift();
    wobv_maResult.length >= 30 && wobv_maResult.shift();
    atrResult.length >= 30 && atrResult.shift();

    kLineData.push(curKLine);
    historyClosePrices.push(curKLine.close);
    dynamicWOBVResult.push(dynamicWOBV);
    wobv_maResult.push(wobv_ma);
    atrResult.push(atr);

    console.log("封盘时间到，当前kLineData:", {
        kLineData,
        historyClosePrices,
        dynamicWOBVResult,
        wobv_maResult,
        atrResult,
    });
};

const refreshPrice = (curKLine) => {
    kLineData.length >= 30 && kLineData.shift();
    historyClosePrices.length >= 30 && historyClosePrices.shift();
    atrResult.length >= 30 && atrResult.shift();

    kLineData.push(curKLine);
    historyClosePrices.push(curKLine.close);

    const atr = calculateATR(kLineData, atrPeriod);

    atrResult.push(atr);

    console.log("封盘时间到，当前kLineData:", {
        kLineData,
        historyClosePrices,
        atrResult,
    });

    // 更新ema
    // setEmaArr(historyClosePrices, EMA_PERIOD);
    // 更新rsi
    // setRsiArr(); // 测试>>>>> 好看rsi数据
    // judgeAndTrading(); // model1 才放开
};

// 初始获取获取historyClosePrices后，后面就自己来弄，避免频繁请求太慢，本地实现比http获取更快
const _refreshPrice = () => {
    // 刷新 收盘价格
    historyClosePrices.shift();
    historyClosePrices.push(currentPrice);

    console.log("封盘时间到，当前currentPrice:", currentPrice, "historyClosePrices:", historyClosePrices);
};
const refreshHistoryClosePrices = () => {
    setTimeout(() => {
        _refreshPrice();
        refreshHistoryClosePrices();
    }, klineTimeRange / 2);
};

// 查询持仓模式
const getPositionSideModel = async () => {
    // await getServerTimeOffset(); // 测试后删除
    let timestamp = Date.now() + serverTimeOffset;
    const params = {
        recvWindow: 6000, // 请求的超时时间
        timestamp,
    };
    const signedParams = signRequest(params);
    const positionResponse = await axiosInstance.get(`${fapi}/v1/positionSide/dual?${signedParams}`);
    // "true": 双向持仓模式；"false": 单向持仓模式
    console.log("🚀 ~ file: gridBot6.js:200 ~ getPositionSideModel ~ positionResponse:", positionResponse.data);
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
            error && error.response ? error.response.data : error,
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
            availableMoney = baseBalance.availableBalance;
            console.log(`Contract ${base} Balance: ${baseBalance.availableBalance}`);
        } else {
            console.log(`No ${base} balance found in the contract account.`);
        }
    } catch (error) {
        console.error(
            "getPositionRisk header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error,
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
        console.log("🚀 ~ file: gridBot6-1.js:362 ~ getCurrentPrice ~ currentPrice:", currentPrice);
    } catch (error) {
        console.error(
            "getCurrentPrice header:",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error,
        );
    }
};

// 计算指数移动平均 EMA = α × Price + (1−α) × EMA‘（EMA‘为上一次的EMA）
// ​α 是平滑系数，通常是 2/(N - 1)，其中 N 是选定的时间周期
// 斜率 Slope = (EMA[t] - EMA[t-n])/n ，其中 n 是计算斜率的时间跨度
// 趋势方向： 当EMA斜率为正时，表示价格趋势向上；当EMA斜率为负时，表示价格趋势向下。
// 趋势强度： 斜率的绝对值可以表示趋势的强弱。绝对值越大，趋势越强烈。
// 零线交叉： 当EMA斜率从负数变为正数时，可能标志着价格从下跌趋势切换到上升趋势，反之亦然。
// 斜率的平滑性： 由于EMA本身是通过平滑计算得到的，其斜率相对于简单移动平均线的斜率更加平滑，对市场噪音有较好的过滤效果。
const calculateEMA = (prices, period) => {
    let sum = 0;

    // 计算前 N 个价格的平均值
    for (let i = 0; i < period; i++) {
        sum += prices[i];
    }

    const initialEMA = sum / period;

    const multiplier = 2 / (period + 1);
    let ema = initialEMA;

    // 使用EMA的更新公式进行计算
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
};
const setEmaArr = (prices, [period1, period2]) => {
    if (ema1Arr.length >= 10) {
        ema1Arr.shift();
        ema2Arr.shift();
        // ema3Arr.shift();
    }
    // if (emaMargin.length >= 3) {
    //     emaMargin.shift();
    // }
    ema1Arr.push(calculateEMA(prices, period1));
    ema2Arr.push(calculateEMA(prices, period2));
    // ema3Arr.push(calculateEMA(prices, period1 + period2));

    // emaMargin.push(ema1Arr[ema1Arr.length - 1] - ema2Arr[ema2Arr.length - 1]);
    // console.log("setEmaArr: ema1Arr, ema2Arr", ema1Arr, ema2Arr);
    // console.log("setEmaArr: emaMargin", emaMargin);
};
const setRsiArr = () => {
    if (rsiArr.length >= 15) {
        rsiArr.shift();
    }
    rsi = calculateRSI(historyClosePrices, RSI_PERIOD);
    rsiArr.push(rsi);
    console.log("setRsiArr ~ rsiArr:", rsiArr);
};
// 下单（开多操作/开空操作）
const placeOrder = async (side, quantity) => {
    console.log(`下单（开${side === "SELL" ? "空" : "多"}操作）placeOrder ~ side, quantity:`, side, quantity);
    try {
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
                    origQty: getQuantity(),
                },
            };
        } else {
            response = await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
        }

        console.log(
            `Order placed - Symbol: ${B_SYMBOL}, Side: ${side}, Quantity: ${quantity}`,
            "orderId:",
            response.data.orderId,
        );
        // 如果 下单（开多操作/开空操作） 成功需要更新PurchaseInfo
        if (response && response.data && response.data.orderId) {
            const { origQty } = response.data;
            const trend = side === "BUY" ? "up" : "down";
            if (model === 2) {
                await recordTradingDatas(currentPointIndex, trend, {
                    trend,
                    side,
                    orderPrice: _currentPrice,
                    quantity: Math.abs(origQty),
                    // orderTime: Date.now(),
                });
            } else {
                purchaseInfo = {
                    currentPointIndex,
                    trend,
                    side,
                    orderPrice: _currentPrice,
                    quantity: Math.abs(origQty),
                };
                console.log("placeOrder ~ purchaseInfo:", purchaseInfo);
            }

            // {
            //     orderId: 1044552751,
            //     symbol: 'JOEUSDT',
            //     status: 'NEW',
            //     clientOrderId: 'x1T2kiflWgcl4rPDwPWYpi',
            //     price: '0.0000000',
            //     avgPrice: '0.00',
            //     origQty: '13',
            //     executedQty: '0',
            //     cumQty: '0',
            //     cumQuote: '0.0000000',
            //     timeInForce: 'GTC',
            //     type: 'MARKET',
            //     reduceOnly: false,
            //     closePosition: false,
            //     side: 'SELL',
            //     positionSide: 'BOTH',
            //     stopPrice: '0.0000000',
            //     workingType: 'CONTRACT_PRICE',
            //     priceProtect: false,
            //     origType: 'MARKET',
            //     priceMatch: 'NONE',
            //     selfTradePreventionMode: 'NONE',
            //     goodTillDate: 0,
            //     updateTime: 1706779095560
            //   }
        } else {
            console.error("下单失败！！！！！");
        }
    } catch (error) {
        console.error(
            "placeOrder header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error,
        );
        process.exit(1);
    }
};
// 平仓
const closeOrder = async (side, quantity, cb) => {
    try {
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
                    origQty: getQuantity(),
                },
            };
        } else {
            response = await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
        }

        if (response && response.data && response.data.origQty) {
            cb && cb();
            purchaseInfo = {};
            console.log("🚀 ~ 平仓：平", side === "BUY" ? "空" : "多", response.data.origQty);
        } else {
            console.log(
                "🚀 ~ 平仓：平",
                side === "BUY" ? "空" : "多",
                "！！！！！！！！！！！！！！！！！！！！！！！！失败",
            );
        }
    } catch (error) {
        console.error(
            "closeOrder header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error,
        );
        process.exit(1);
    }
};
// 全部平仓 并调用init函数
const closeAllPositionsAndInit = async () => {
    try {
        // 记录方便调试
        let _currentPrice = currentPrice;
        let res = Object.values(tradingDatas)
            .filter((v) => v.up || v.down)
            .map((v) => [v.up, v.down])
            .map(([up, down]) => {
                let res = [];
                if (up) res.push(up);
                if (down) res.push(down);
                return res;
            })
            .reduce((res, cur) => [...res, ...cur], []);
        res.map((v) => {
            if (v.trend == "up") {
                testMoney += _currentPrice - v.orderPrice;
            } else {
                testMoney += v.orderPrice - _currentPrice;
            }
        });

        console.log("closeAllPositionsAndInit 全部平仓 ~ testMoney:", testMoney);

        if (isTest) {
            // 测试
            tradingDatas = {};
            historyEntryPoints = [];
            purchaseInfo = {};

            console.log("全部仓完成，重新开始");
            await initializeTrading();
            return;
        }

        allPositionDetail = await getPositionRisk(); // 获取当前仓位信息
        console.log("全部仓位信息 allPositionDetail:", allPositionDetail);
        const { up, down } = allPositionDetail;
        let closeFetchs = [];
        if (up) {
            // 平多
            closeFetchs.push(closeOrder("SELL", up.quantity));
        }
        if (down) {
            // 平空
            closeFetchs.push(closeOrder("BUY", down.quantity));
        }
        tradingDatas = {};
        historyEntryPoints = [];
        purchaseInfo = {};

        console.log("全部仓完成，重新开始");
        await Promise.all([...closeFetchs, initializeTrading()]); // 买/卖 并发
    } catch (error) {
        console.error("closeAllPositionsAndInit Error:", error);
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

// 双向开单
const teadeBoth = async () => {
    loadingBoth = true;
    const promises = [];
    // 当前是否有多单
    if (!(tradingDatas[currentPointIndex] && tradingDatas[currentPointIndex].up)) {
        console.log("当前currentPointIndex没有多单，开多", currentPointIndex);
        promises.push(teadeBuy());
    }
    // 当前是否有空单
    if (!(tradingDatas[currentPointIndex] && tradingDatas[currentPointIndex].down)) {
        console.log("当前currentPointIndex没有空单，开空", currentPointIndex);
        promises.push(teadeSell());
    }
    await Promise.all(promises);
    loadingBoth = false;
};
// 单向开单
const teadeBothByEma = async (trend) => {
    const promises = [];
    if (trend) {
        if (trend == "up") {
            // 当前是否有多单
            if (!(tradingDatas[currentPointIndex] && tradingDatas[currentPointIndex].up)) {
                console.log("当前currentPointIndex没有多单，开多", currentPointIndex);
                promises.push(teadeBuy());
            }
        } else {
            // 当前是否有空单
            if (!(tradingDatas[currentPointIndex] && tradingDatas[currentPointIndex].down)) {
                console.log("当前currentPointIndex没有空单，开空", currentPointIndex);
                promises.push(teadeSell());
            }
        }
    } else {
        promises.push(teadeBoth());
    }
    await Promise.all(promises);
};

// 更新购买信息
const recordTradingDatas = async (index, trend, info) => {
    if (currentPointIndex === undefined) return;
    // 更新购买信息
    if (tradingDatas[index]) {
        if (tradingDatas[index][trend]) {
            tradingDatas[index][trend] = {
                ...tradingDatas[index][trend],
                ...info,
            };
        } else {
            tradingDatas[index][trend] = { ...info };
        }
    } else {
        tradingDatas[index] = {
            [trend]: { ...info },
        };
    }
    console.log("Purchase Info Updated:", tradingDatas);
};
// 启动时通过EMA判断价格走势
const initializeTrading = async () => {
    try {
        loadingInit = true;
        const len = historyClosePrices.length;
        if (!len || !currentPrice) {
            console.log("ema1Arr / currentPrice 为空", historyClosePrices, currentPrice);
            throw new Error("ema1Arr / currentPrice 为空，请重新启动");
        }

        await teadeWrap();
        loadingInit = false;
    } catch (error) {
        console.error("initializeTrading header::", error);
        process.exit(1);
    }
};

// 清除所有延时下单/反手/平仓等交易定时器
const clearAllTimer = () => {
    clearTimeout(reverseTimer);
    clearTimeout(clearReverseTimer);
};

// 初始化
const setInitData = ({ up, down }) => {
    // 从数据库拿出上次的数据，并且与现在的比较，如果数据和的上就用以前的，数据和不上就解析出
    tradingDatas = {
        12: {
            up: { trend: "up", side: "BUY", orderPrice: 0.007255, quantity: 827 },
            down: { trend: "down", side: "SELL", orderPrice: 0.007272, quantity: 825 },
        },
        13: {
            up: { trend: "up", side: "BUY", orderPrice: 0.007416, quantity: 809 },
            down: { trend: "down", side: "SELL", orderPrice: 0.007416, quantity: 809 },
        },
    };
    historyEntryPoints = [12, 13, 12, 13];
    currentPointIndex = 12;
    console.log(
        `setInitData初始化数据完成 当前 currentPointIndex historyEntryPoints tradingDatas:`,
        currentPointIndex,
        historyEntryPoints,
        tradingDatas,
    );
};

// 设置网格
const setGridPointsToCurPriceCenter = (_currentPrice) => {
    loadingNewPoints = true;

    // 保证当前价在网格正中间
    let price = _currentPrice + gridHight * 0.99999999;
    let price2 = price;
    let num = gridCount;
    gridPoints.push(price);
    while (num >= gridCount / 2) {
        price -= gridHight;
        gridPoints.unshift(price);
        num--;
        if (price <= 0) {
            console.log("价格网格为负数了");
        }
    }
    while (num > 0) {
        price2 += gridHight;
        gridPoints.push(price2);
        num--;
    }
    currentPointIndex = gridCount / 2;
    // curArrivePointTime = Date.now();
    setHistoryEntryPoints(currentPointIndex);

    loadingNewPoints = false;
    console.log(
        "绘制网格 _currentPrice ， gridPoints currentPointIndex:",
        _currentPrice,
        gridPoints,
        currentPointIndex,
    );
};
// 进入交易点的历史记录
const setHistoryEntryPoints = (point) => {
    if (historyEntryPoints.length < 50) {
        historyEntryPoints.push(point);
    } else {
        historyEntryPoints.shift();
        historyEntryPoints.push(point);
    }
    console.log("进入交易点的历史记录 historyEntryPoints:", historyEntryPoints);
};
// 进入交易点的历史时间
const setHistoryArrivePointTimeGaps = (point) => {
    const last = preArrivePointTime;
    const now = Date.now();
    if (historyArrivePointTimeGaps.length < 10) {
        historyArrivePointTimeGaps.push(point);
    } else {
        historyArrivePointTimeGaps.shift();
        historyArrivePointTimeGaps.push(point);
    }
    console.log("进入交易点的时间记录 historyEntryPoints:", historyEntryPoints);
};
// 5. 启动交易
const startTrading = async () => {
    try {
        await getServerTimeOffset(); // 同步服务器时间
        await getCurrentPrice();
        await getHistoryClosePrices(); // 初始化 historyClosePrices
        // setEmaArr(historyClosePrices, EMA_PERIOD);

        if (isTest) {
            // 测试
            setGridPointsToCurPriceCenter(currentPrice);
            await initializeTrading();
            await startWebSocket();
            return;
        }

        if (!invariableBalance) {
            await getContractBalance(); // 获取当前合约账户中的 USDT
        }
        setGridPointsToCurPriceCenter(currentPrice); // 绘制网格
        // 初始化 tradingDatas
        allPositionDetail = await getPositionRisk(); // 获取当前仓位信息
        console.log("🚀 ~ file: gridBot6-1.js:886 ~ startTrading ~ allPositionDetail:", allPositionDetail);
        if (allPositionDetail) {
            setInitData(allPositionDetail);
        }
        // 如果还没仓位要加仓
        else if (!isNonEmpty(allPositionDetail)) {
            console.log("还没仓位要加仓");
            await getCurrentPrice(); // 获取当前价格
            await initializeTrading(); // 初始交易
        }
        await startWebSocket(); // 启动websocket更新价格
    } catch (error) {
        console.error("startTrading Error:", error);
        process.exit(1);
    }
};
// 获取下单量
const getQuantity = (_currentPrice) => {
    return Math.round((availableMoney * leverage) / (_currentPrice || currentPrice));
};

// 把tradingDataArr的都平了
const closeAllPointsOrderAndBuy = async (_currentPointIndex, pointIndexHistory) => {
    const promises = [];
    const len = pointIndexHistory.length;
    console.log(`跨${len}个交易点，平掉所有不是本交易点的订单`);
    promises.push(closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex));

    promises.push(teadeBoth());

    await Promise.all(promises);
};

// 交易点所有订单平仓
const closePointOrders = async (pointIndex) => {
    if (tradingDatas[pointIndex]) {
        if (tradingDatas[pointIndex].up) {
            // 平多
            await closeOrder("SELL", tradingDatas[pointIndex].up.quantity, () => {
                if (isTest) {
                    //测试
                    testMoney += currentPrice - tradingDatas[pointIndex].up.orderPrice;
                    console.log("平多 closePointOrders ~ testMoney:", testMoney);
                }
                tradingDatas[pointIndex].up = null;
                console.log("平多完成, tradingDatas", tradingDatas);
            });
        }
        if (tradingDatas[pointIndex].down) {
            // 平空
            await closeOrder("BUY", tradingDatas[pointIndex].down.quantity, () => {
                if (isTest) {
                    // 测试
                    testMoney += tradingDatas[pointIndex].down.orderPrice - currentPrice;
                    console.log("平空 closePointOrders ~ testMoney:", testMoney);
                }
                tradingDatas[pointIndex].down = null;
                console.log("平空完成, tradingDatas", tradingDatas);
            });
        }
    } else {
        console.error("该交易点没有任何订单", pointIndex);
        process.exit(1);
    }
};
// 其他交易点所有正向订单平仓
const closeOtherPointYesOrders = async (pointIndexHistory, curIndex) => {
    let promises = [];
    pointIndexHistory.forEach((index) => {
        if (index !== curIndex) {
            if (index < curIndex) {
                if (tradingDatas[index].up) {
                    // 平多
                    promises.push(
                        closeOrder("SELL", tradingDatas[index].up.quantity, () => {
                            if (isTest) {
                                // 测试
                                testMoney += currentPrice - tradingDatas[index].up.orderPrice;
                                console.log("低于当前交易点的 平多 closePointOrders ~ testMoney:", testMoney);
                            }
                            tradingDatas[index].up = null;
                            console.log("平多完成, tradingDatas", tradingDatas);
                        }),
                    );
                }
            } else {
                if (tradingDatas[index].down) {
                    // 平空
                    promises.push(
                        closeOrder("BUY", tradingDatas[index].down.quantity, () => {
                            if (isTest) {
                                // 测试
                                testMoney += tradingDatas[index].down.orderPrice - currentPrice;
                                console.log("高于当前交易点的 平空 closePointOrders ~ testMoney:", testMoney);
                            }
                            tradingDatas[index].down = null;
                            console.log("平空完成, tradingDatas", tradingDatas);
                        }),
                    );
                }
            }
        }
    });
    await Promise.all(promises);
};
// 其他交易点所有订单平仓
const closeOtherPointAllOrders = async (pointIndexHistory, curIndex) => {
    let promises = [];
    pointIndexHistory.forEach((index) => {
        if (index !== curIndex) {
            promises.push(closePointOrders(index));
        }
    });
    await Promise.all(promises);
};

// 3. 启动3分钟确认定时器
const startConfirmationTimer = (orderInfo, time = confirmNum) => {
    console.log("启动3分钟确认定时器");
    clearTimeout(confirmationTimer);
    confirmationTimer = setTimeout(() => confirmOrder(orderInfo), time * 60 * 1000);
};

// 4. 确认订单
const confirmOrder = async (orderInfo) => {
    console.log("3分钟时间到，确认订单:");
    try {
        let trend = "";
        if (orderInfo.trend) {
            if (currentPrice > orderInfo.orderPrice) {
                // 当前价格大于上次交易价，走势为：上升
                trend = "up";
                console.log("当前价格大于上次交易价，走势为：上升", trend);
            } else if (currentPrice < orderInfo.orderPrice) {
                // 当前价格小于上次交易价，走势为：下降
                trend = "down";
                console.log("当前价格小于上次交易价，走势为：下降", trend);
            } else {
                // // 如果价格相等用 ema 指标判断走势
                // const ema1 = calculateEMA([...historyClosePrices, currentPrice], EMA_PERIOD[0]);
                // const ema2 = calculateEMA([...historyClosePrices, currentPrice], EMA_PERIOD[1]);
                // trend = ema1 > ema2 ? "up" : "down";
                console.log("3分钟确认时，价格相等================");
            }

            if (trend !== orderInfo.trend) {
                console.log("价格走势和订单多空状态背离需要反手");
                await reverseTrade(orderInfo.trend);
            } else {
                console.log(`价格走势和订单多空状态一致，无需其他操作, curGridPoint: ${curGridPoint}`);
            }
        } else {
            initializeTrading();
        }
        // startConfirmationTimer();
    } catch (error) {
        console.error("confirmOrder error::", error);
        process.exit(1);
    }
};
// 反手交易
const reverseTrade = async (originTrend) => {
    let fetchs = [];
    if (originTrend === "up") {
        fetchs.push(
            closeOrder("SELL", purchaseInfo.quantity, () => {
                if (isTest) {
                    testMoney += currentPrice - purchaseInfo.orderPrice;
                    console.log("👌👌👌 平多 reverseTrade ~ testMoney:", testMoney);
                }
            }),
        ); // 平多
        fetchs.push(placeOrder("SELL", getQuantity())); // 开空
    } else {
        fetchs.push(
            closeOrder("BUY", purchaseInfo.quantity, () => {
                if (isTest) {
                    testMoney += purchaseInfo.orderPrice - currentPrice;
                    console.log("👌👌👌 平空 reverseTrade ~  testMoney:", testMoney);
                }
            }),
        ); // 平空
        fetchs.push(placeOrder("BUY", getQuantity())); // 开多
    }
    await Promise.all(fetchs);
};
// 顺手交易
const forehandTrade = async (originTrend) => {
    let fetchs = [];
    if (originTrend === "up") {
        fetchs.push(closeOrder("SELL", purchaseInfo.quantity)); // 平多
        fetchs.push(placeOrder("BUY", getQuantity())); // 开多
    } else {
        fetchs.push(closeOrder("BUY", purchaseInfo.quantity)); // 平空
        fetchs.push(placeOrder("SELL", getQuantity())); // 开空
    }
    await Promise.all(fetchs);
};
const setRepeatPointCount = () =>
    (repeatPointCount[currentPointIndex] = repeatPointCount[currentPointIndex]
        ? repeatPointCount[currentPointIndex] + 1
        : 1);

// 记录反手时间间隔
const setReverseTimeMargin = () => {
    const nowtime = Date.now();
    if (reverseTradeTimeMargin.length < 5) {
        reverseTradeTimeMargin.push(nowtime - preReverseTradeTime);
    } else {
        reverseTradeTimeMargin.shift();
        reverseTradeTimeMargin.push(nowtime - preReverseTradeTime);
    }
    preReverseTradeTime = nowtime;
    console.log("反手时间间隔 reverseTradeTimeMargin:", reverseTradeTimeMargin);
};
// 记录反手价格间隔
const setReversePriceMargin = () => {
    const _currentPrice = currentPrice;
    if (reverseTradePriceMargin.length < 5) {
        reverseTradePriceMargin.push(Math.abs(_currentPrice - preReverseTradePrice));
    } else {
        reverseTradePriceMargin.shift();
        reverseTradePriceMargin.push(Math.abs(_currentPrice - preReverseTradePrice));
    }
    preReverseTradePrice = _currentPrice;
    console.log("反手价格间隔 reverseTradePriceMargin:", reverseTradePriceMargin);
};
const wrapReverse = async () => {
    const { trend } = await calcEma1Ema2({ threshold: 0 });
    if (trend) {
        // 不符合趋势才反手
        if (purchaseInfo.trend !== trend) {
            console.log("反手节流时间到，确认需要反手，立即执行");
            await reverseTrade(purchaseInfo.trend);
        } else {
            console.log("反手节流时间到，确认不需要反手");
        }
    } else {
        console.log("反手节流时间到，90s趋势都还不明确多半横盘了，不反手");
    }
};

const throttleReverseTrade = async () => {
    // lastInvokeReverseTime 反手执行时间
    // reverseTimer  反手节流的 timer
    // clearReverseTimer 90s的清除节流定时器
    let delay = 180000; // 3分钟
    const now = Date.now();
    const elapsedTime = now - lastInvokeReverseTime;

    const shouldInvoke = elapsedTime >= delay;

    // clearTimeout(clearReverseTimer);

    if (shouldInvoke) {
        lastInvokeReverseTime = now;
        try {
            await wrapReverse(); // 用ema判断后再反手
            // // 了1分钟后后执行（相当于加强版的立即执行）
            // clearReverseTimer = setTimeout(async () => {
            //     await wrapReverse(); // 用ema判断后再反手
            // }, delay / 2);
        } catch (error) {
            console.error("throttleReverseTrade 1 ~ error:", error);
            process.exit(1);
        }
    } else {
        // 如果在 3分钟 时间内再次触发，清除之前的定时器，重新设置
        clearTimeout(reverseTimer);
        reverseTimer = setTimeout(async () => {
            try {
                lastInvokeReverseTime = Date.now(); // immediate ? Date.now() : lastInvokeReverseTime;
                await wrapReverse(); // 用ema判断后再反手
            } catch (error) {
                console.error("throttleReverseTrade 2 ~ error:", error);
                process.exit(1);
            }
        }, delay);
    }
};
// 封盘时间到，判断+交易
const judgeAndTrading = async () => {
    if (purchaseInfo.orderPrice) {
        const len = ema1Arr.length;
        const isUpTrend = ema1Arr[len - 1] > ema2Arr[len - 1]; // 判断价格趋势
        // 上升趋势
        if (isUpTrend) {
            console.log("🚀 ~ 现在:👆");
            // 如果当前价格趋势是上升，若之前开的空单则须反手
            if (purchaseInfo.trend === "down") {
                console.log("价格走势和订单多空状态背离，需要反手，原来为:", purchaseInfo.trend);
                setReverseTimeMargin();
                setReversePriceMargin();
                // 这里反手因该是节流不能防抖，不能防抖，不能防抖
                await throttleReverseTrade();
            } else {
                // 没有背离就看看是否有订单，如果没得要怎么办???????
                console.log("订单空多情况和市场走势一致，无需操作");
            }
        } else {
            console.log("🚀 ~ 现在:👇");
            // 如果当前价格趋势是下降，若之前开的多单则须反手
            if (purchaseInfo.trend === "up") {
                console.log("价格走势和订单多空状态背离，需要反手，原来为:", purchaseInfo.trend);
                setReverseTimeMargin();
                setReversePriceMargin();
                // 这里反手因该是节流不能防抖，不能防抖，不能防抖
                await throttleReverseTrade();
            } else {
                // 没有背离就看看是否有订单，如果没得要怎么办??????
                console.log("订单空多情况和市场走势一致，无需操作");
            }
        }
    } else {
        await initializeTrading();
    }
};

// const ema1SubEma2Arrs = [];

// // 设置 ema1 - ema2 差值数组
// const setEma1SubEma2Arrs = (val) => {
//     if (ema1SubEma2Arrs.length < 14) {
//         ema1SubEma2Arrs.push(val);
//     } else {
//         ema1SubEma2Arrs.shift();
//         ema1SubEma2Arrs.push(val);
//     }
//     console.log("设置 ema1 - ema2 差值数组 ema1SubEma2Arrs:", ema1SubEma2Arrs);
// };

const teadeWrap = async () => {
    // const { trend } = await calcEma1Ema2();
    // 指标周期别太长，因为是短线高频
    const needEma = false; // ema指标清晰 && rsi斜率很大时 && atr指标清晰 && obv指标清晰 && macd指标清晰
    if (needEma) {
        await teadeBothByEma();
    } else {
        await teadeBoth();
    }
};
// 双向开单模式
const gridPointTrading2 = async () => {
    onGridPoint = true;
    const _currentPointIndex = currentPointIndex;
    const tradingDataArr = Object.entries(tradingDatas).filter(([k, v]) => v.up || v.down);

    let pointIndexHistoryNoCur = tradingDataArr.map(([k]) => Number(k));
    let pointIndexHistory = Array.from(new Set([...pointIndexHistoryNoCur, _currentPointIndex]));

    const len = pointIndexHistory.length;
    console.log(
        "🚀 ~ file: gridBot6-10.js:719 ~ teadeBothByEma ~ pointIndexHistory tradingDataArr:",
        pointIndexHistory,
        tradingDataArr,
    );
    if (len === 1) {
        console.log(`跨${len}个交易点，啥都不用干`);
        return;
    } else if (len > 1 && len < acrossPointLimit) {
        // 到了第 2 个交易点
        console.log(`跨${len}个交易点，平掉所有不是本交易点的顺势订单`);
        await Promise.all([closeOtherPointYesOrders(pointIndexHistory, _currentPointIndex), teadeWrap()]);
    }
    // 到了第 acrossPointLimit 个交易点
    else if (len === acrossPointLimit) {
        // 平掉最远端的订单
        console.log(`跨${len}个交易点，平掉最远的订单`);
        const farIndex = findFarthestNumber(pointIndexHistoryNoCur, _currentPointIndex);
        await Promise.all([
            closeOtherPointYesOrders(pointIndexHistory, _currentPointIndex),
            closePointOrders(farIndex),
            teadeWrap(),
        ]);
    } else {
        console.log(
            "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@跨交易点太多了，啥都不干直接等爆仓吧，开始下一个币",
            pointIndexHistory,
            tradingDatas,
            tradingDataArr,
        );
        console.error(
            "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@跨交易点太多了，啥都不干直接等爆仓吧，开始下一个币",
            pointIndexHistory,
            tradingDatas,
            tradingDataArr,
        );
        process.exit(1);
    }
    // await closeAllPointsOrderAndBuy(_currentPointIndex, pointIndexHistory, trend);

    onGridPoint = false;
};

// 切换模式
const changeModel = async (newModel) => {
    if (model !== newModel) {
        if (newModel === 2) {
            // 清除所有延时下单/反手/平仓等交易定时器
            clearAllTimer();
        }
        preModel = model;
        model = newModel;
        console.log("changeModel ~ 切换模式，先平仓:");
        await closeAllPositionsAndInit(); // 全平仓>>>>>>后面需要改为平半仓
        if (model === 2) {
            console.log("切换为双开模式");
        }
        if (model === 1) {
            console.log("切换为单开模式");
        }
    }
};
// 进入单开模式前的判断
const beforeGridPointTrading1 = async () => {
    // 频繁反手
    const isTooManyReversByTime = reverseTradeTimeMargin.filter((t) => t <= mixReversetime).length >= continuouNum;
    // 反手时价格差距连续很小
    const isTooManyReversBySpace = reverseTradePriceMargin.filter((s) => s < gridHight).length >= continuouNum;
    // 重复到达交易点超过maxRepeatNum
    const isOverRepeatNum = repeatPointCount[currentPointIndex] >= maxRepeatNum;
    // 当发现横盘，就切换为双开模式
    if (isTooManyReversByTime || isTooManyReversBySpace || isOverRepeatNum) {
        console.log(
            "beforeGridPointTrading1 ~ isTooManyReversByTime, isTooManyReversBySpace, isOverRepeatNum:",
            isTooManyReversByTime,
            isTooManyReversBySpace,
            isOverRepeatNum,
        );
        setGridPointsToCurPriceCenter(currentPrice); // 重新画格子
        repeatPointCount = {}; // 重置 repeatPointCount
        reverseTradeTimeMargin = [];
        reverseTradePriceMargin = [];
        await changeModel(2);
        return false;
    }
    return true;
};
// 进入双开模式前的判断
const beforeGridPointTrading2 = async () => {
    if (currentPointIndex === undefined) return true;

    if (tradingDatas[currentPointIndex] && tradingDatas[currentPointIndex].up && tradingDatas[currentPointIndex].down) {
        return false; // 单子满了，退出交易
    } else {
        return true; // 单子未满，不管交易点是否相同，都可以继续交易
    }
};

const calcEma1Ema2ByHistoryPrice = async () => {
    const len = ema1Arr.length;
    const ema1 = ema1Arr[len - 1];
    const ema2 = ema2Arr[len - 1];
    const emaGap = Math.abs(ema1 - ema2) > THRESHOLD; // THRESHOLD 这里还需要调整参与对比才行？？？？?????>>>>>

    let trend = "";

    if (emaGap && currentPrice > ema1 && ema1 > ema2) {
        trend = "up";
    }
    if (emaGap && currentPrice < ema1 && ema1 < ema2) {
        trend = "down";
    }
    return {
        ema1,
        ema2,
        trend,
    };
};
const calcEma1Ema2 = async (params = {}) => {
    const initParams = { emaPeriod1: EMA_PERIOD[0], emaPeriod2: EMA_PERIOD[1], threshold: THRESHOLD };
    const { emaPeriod1, emaPeriod2, threshold } = { ...initParams, ...params };
    let ema1 = calculateEMA([...historyClosePrices, currentPrice], emaPeriod1);
    let ema2 = calculateEMA([...historyClosePrices, currentPrice], emaPeriod2);

    // let curRsi = calculateRSI([...historyClosePrices, currentPrice], RSI_PERIOD);

    // // 计算布林带
    // const bollingerBands = calculateBollingerBands([...historyClosePrices, currentPrice], BOLL_PERIOD, STD_MULTIPLIER);
    // curInBollBands = isPriceInBollingerBands(currentPrice, bollingerBands);

    const emaGap = Math.abs(ema1 - ema2) > threshold; // threshold 这里还需要调整参与对比才行？？？？?????>>>>>

    let trend = "";

    if (emaGap && currentPrice > ema1 && ema1 > ema2) {
        trend = "up";
    }
    if (emaGap && currentPrice < ema1 && ema1 < ema2) {
        trend = "down";
    }

    return {
        ema1,
        ema2,
        trend,
    };
};
const gridPointSwitch = async () => {
    isSwitch = true;

    // 如果是双向开单
    if (model === 2) {
        // 交易前，校验是否需要切换模式
        const valid = await beforeGridPointTrading2();
        console.log("gridPointSwitch 中 beforeGridPointTrading2 ~ valid:", valid);
        if (valid) {
            await gridPointTrading2();
        }
    }
    // 如果是单向开单
    else {
        // 交易前，校验是否需要切换模式
        const valid = await beforeGridPointTrading1();
        console.log("gridPointSwitch 中 beforeGridPointTrading1 ~ valid:", valid);
    }
    isSwitch = false;
};
// 10s记录一次
const throttleRecordSamePoint = throttleImmediate(setRepeatPointCount, 10000);
const throttleBeforeGridPointTrading1 = throttleImmediate(beforeGridPointTrading1, 5000);
// 跑网格
const startRunGrid = async () => {
    // 插针时速度很快可能会垮多个格子>>>>>>
    const _prePrice = prePrice;
    const _currentPrice = currentPrice;
    let _currentPointIndex = 0;
    let _curGridPoint = 0;

    for (let index = 0; index < gridPoints.length; index++) {
        const point = gridPoints[index];

        if ((_prePrice <= point && point <= _currentPrice) || (_prePrice >= point && point >= _currentPrice)) {
            _currentPointIndex = index;
            _curGridPoint = point;
            break;
        }
    }
    // 价格到了某个网格交易点
    if (_curGridPoint) {
        if (currentPointIndex !== _currentPointIndex) {
            console.log(
                "🚀 ~ file: gridBot6-11.js:1405 ~ startRunGrid ~ prePointIndex:",
                prePointIndex,
                currentPointIndex,
                _currentPointIndex,
            );
            curGridPoint = _curGridPoint;
            prePointIndex = currentPointIndex;
            currentPointIndex = _currentPointIndex;

            // preArrivePointTime = curArrivePointTime;
            // curArrivePointTime = Date.now();

            setHistoryEntryPoints(currentPointIndex); // 实时交易点历史记录
        } else {
            // 相同交易点
            // throttleRecordSamePoint();
        }
        await gridPointSwitch(); // 判断+交易
    } else {
        // 每隔5s判断一次是否需要立马切换到moedle2   // model2不需要
        // throttleBeforeGridPointTrading1();
    }
};

const consolePrice = throttle(() => {
    console.log("currentPrice:", currentPrice);
}, 3000);

// 判断是否横盘
const angleBetweenVectors = (arr1, arr2) => {
    if (arr1.length !== arr2.length) {
        throw new Error("Array lengths must be the same");
    }

    const dotProduct = arr1.reduce((acc, val, i) => acc + val * arr2[i], 0);
    const magnitude1 = Math.sqrt(arr1.reduce((acc, val) => acc + val * val, 0));
    const magnitude2 = Math.sqrt(arr2.reduce((acc, val) => acc + val * val, 0));

    const cosTheta = dotProduct / (magnitude1 * magnitude2);
    const theta = Math.acos(cosTheta);

    return theta; // Angle in radians
};
// 计算RSI的函数
// RSI（相对强弱指数）的一般标准范围是 0 到 100。通常，传统的理解是：
// RSI 小于 30：被认为是超卖状态，可能出现反弹的机会，市场可能过度卖出。
// RSI 大于 70：被认为是超买状态，可能会有下跌的机会，市场可能过度买入。
// 当 RSI 处于 30 到 70 之间时，市场被认为是在正常范围内，没有明显的超买或超卖信号，可能处于横盘状态。
function calculateRSI(prices, period) {
    const changes = [];
    const gains = [];
    const losses = [];
    const len = prices.length;

    // 检查数组长度是否足够
    if (len <= period) {
        throw new Error("数组长度不足以计算RSI。");
    }

    // 计算价格变动
    for (let i = 1; i < len; i++) {
        changes.push(prices[i] - prices[i - 1]);
    }

    // 将正数和负数分别存入gains和losses数组
    changes.forEach((change) => {
        if (change > 0) {
            gains.push(change);
            losses.push(0);
        } else {
            gains.push(0);
            losses.push(-change);
        }
    });

    // 计算平均增益和平均损失
    const avgGain = calculateAverage(gains, period);
    const avgLoss = calculateAverage(losses, period);

    // 计算相对强弱指数
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
}

// 计算简单移动平均线
function calculateSimpleMovingAverage(prices, period) {
    if (prices.length < period) {
        throw new Error("Not enough data points for the specified period.");
    }

    const slice = prices.slice(prices.length - period);
    const sum = slice.reduce((acc, price) => acc + price, 0);
    return sum / period;
}

// 计算标准差
function calculateStandardDeviation(prices, period) {
    if (prices.length < period) {
        throw new Error("Not enough data points for the specified period.");
    }

    const sma = calculateSimpleMovingAverage(prices, period);

    const squaredDifferences = prices.slice(prices.length - period).map((price) => Math.pow(price - sma, 2));

    const meanSquaredDifference = squaredDifferences.reduce((acc, val) => acc + val, 0) / period;

    return Math.sqrt(meanSquaredDifference);
}

// 计算布林带
function calculateBollingerBands(prices, period, multiplier) {
    const sma = calculateSimpleMovingAverage(prices, period);
    const stdDev = calculateStandardDeviation(prices, period);

    const upperBand = sma + multiplier * stdDev;
    const lowerBand = sma - multiplier * stdDev;

    return { upperBand, sma, lowerBand };
}

// 判断当前价格是否在布林带之间
function isPriceInBollingerBands(price, bands) {
    return price >= bands.lowerBand && price <= bands.upperBand;
}

// 计算 MACD 指标
function calculateMACD(historyClosePrices, periods) {
    const [shortPeriod, longPeriod, signalPeriod] = periods;
    // 计算短期EMA
    const shortEMA = calculateEMA(historyClosePrices, shortPeriod);
    // 计算长期EMA
    const longEMA = calculateEMA(historyClosePrices, longPeriod);
    // 计算 DIF（快速线）
    const dif = shortEMA.map((value, index) => value - longEMA[index]);
    // 计算 DEA（慢速线）
    const dea = calculateEMA(dif, signalPeriod);
    // 计算 MACD 柱状图
    const macd = dif.map((value, index) => value - dea[index]);
    return { dif, dea, macd };
}
function calculateTradingSignal(dif, dea, macd, priceTrend, macdHistogram, currentPrice) {
    // 定义权重
    const weights = {
        difDeaCross: 2, // DIF 与 DEA 交叉点权重
        difZeroCross: 1.5, // DIF、DEA 与零轴交叉权重
        macdZeroCross: 1, // MACD 柱状图与零轴交叉权重
        macdHistogramTrend: 1, // MACD 柱状图趋势权重
        priceTrend: 1, // 价格趋势权重
        priceAndDifRelation: 2, // 价格和 DIF 关系权重
    };

    // 初始化信号值
    let signalValue = 0;

    // DIF 与 DEA 交叉点
    if (dif > dea) {
        signalValue += weights.difDeaCross;
    } else {
        signalValue -= weights.difDeaCross;
    }

    // DIF、DEA 与零轴交叉
    if (dif > 0 && dea > 0) {
        signalValue += weights.difZeroCross;
    } else {
        signalValue -= weights.difZeroCross;
    }

    // MACD 柱状图与零轴交叉
    if (macd > 0) {
        signalValue += weights.macdZeroCross;
    } else {
        signalValue -= weights.macdZeroCross;
    }

    // MACD 柱状图趋势
    if (macdHistogram > 0) {
        signalValue += weights.macdHistogramTrend;
    } else {
        signalValue -= weights.macdHistogramTrend;
    }

    // 价格趋势
    if (priceTrend === "up") {
        signalValue += weights.priceTrend;
    } else {
        signalValue -= weights.priceTrend;
    }

    // 价格和 DIF 关系
    if (currentPrice > dif) {
        signalValue += weights.priceAndDifRelation;
    } else {
        signalValue -= weights.priceAndDifRelation;
    }

    // 根据信号值判断买入或卖出
    if (signalValue > 0) {
        return "up"; // 买入信号
    } else if (signalValue < 0) {
        return "down"; // 卖出信号
    } else {
        return "hold"; // 无明显信号，持有状态
    }
}

// 价格趋势（当前价格和3分钟内平均价格比较）
// const priceTrend = "up";
// MACD 柱状趋势（当前价格和3分钟内平均价格比较）越大信号较强
// const macdHistogramValue = 0.0005;

// const { dif, dea, macd } = calculateMACD(historyClosePrices, [12, 26, 9]);

// const signal = calculateTradingSignal(dif, dea, macd, priceTrend, macdHistogramValue, currentPrice);
// console.log("Trading Signal:", signal);

function calculateDynamicWOBV(klines) {
    let wobv = 0;

    for (let i = 0; i < klines.length; i++) {
        const open = klines[i].open;
        const close = klines[i].close;
        const high = klines[i].high;
        const low = klines[i].low;
        const volume = klines[i].volume;

        // 计算权重
        const weight = Math.abs((close - open) / (high - low));

        // 如果当前收盘价高于当前的开盘价，则加上成交量乘以权重
        if (close > open) {
            wobv += volume * weight;
        }
        // 如果当前收盘价低于当前的开盘价，则加上成交量乘以负权重
        else if (close < open) {
            wobv -= volume * weight;
        }
        // 如果当前收盘价等于当前的开盘价，则 WOBV 保持不变
        // （这一步可以省略，因为 wobv 默认为 0，所以加减 0 效果相同）
    }

    return wobv;
}

function calculateWOBV_MA(klines, period) {
    const wobvArray = []; // 存储每日的 WOBV
    const wobv_maArray = []; // 存储 WOBV 移动平均值

    for (let i = 0; i < klines.length; i++) {
        const open = klines[i].open;
        const close = klines[i].close;
        const high = klines[i].high;
        const low = klines[i].low;
        const volume = klines[i].volume;

        const weight = Math.abs((close - open) / (high - low));

        if (close > open) {
            wobvArray.push(volume * weight);
        } else if (close < open) {
            wobvArray.push(-volume * weight);
        } else {
            wobvArray.push(0);
        }

        // 计算移动平均值
        if (wobvArray.length > period) {
            const sum = wobvArray.slice(-period).reduce((acc, val) => acc + val, 0);
            const wobv_ma = sum / period;
            wobv_maArray.push(wobv_ma);
        }
    }

    return wobv_maArray;
}

function calculateATR(klines, period) {
    const atr = [];

    for (let i = 0; i < klines.length; i++) {
        const high = klines[i].high;
        const low = klines[i].low;
        const close = klines[i].close;

        if (i === 0) {
            atr.push(high - low); // 初始 ATR 为当日的高低价差
        } else {
            const tr = Math.max(high - low, Math.abs(high - klines[i - 1].close), Math.abs(low - klines[i - 1].close));

            atr = (atr * (period - 1) + tr) / period;
        }
    }

    return atr;
}

// WebSocket 事件
const startWebSocket = async () => {
    console.log("🚀 startWebSocket~~~~~");
    // 添加 'open' 事件处理程序
    ws.on("open", async (data) => {
        console.log("WebSocket connection opened.", data);
    });

    // 添加 'message' 事件处理程序
    // ws.on("message", async (data) => {
    //     const {
    //         k: {
    //             t: openTime, // 这根K线的起始时间
    //             T: closeTime, // 这根K线的结束时间
    //             o: open, // 这根K线期间第一笔成交价
    //             c: close, // 这根K线期间末一笔成交价
    //             h: high, // 这根K线期间最高成交价
    //             l: low, // 这根K线期间最低成交价
    //             v: volume, // 这根K线期间成交量
    //             x: isNewLine, // 这根K线是否完结(是否已经开始下一根K线)
    //             V: takerBuyBaseAssetVolume, // 主动买入的成交量
    //         },
    //     } = JSON.parse(data);

    //     prePrice = currentPrice; // 不能删除
    //     currentPrice = Number(close) || 0;

    //     if (isNewLine) {
    //         const curKLine = {
    //             openTime, // 这根K线的起始时间
    //             closeTime, // 这根K线的结束时间
    //             open: Number(open), // 这根K线期间第一笔成交价
    //             close: Number(close), // 这根K线期间末一笔成交价
    //             high: Number(high), // 这根K线期间最高成交价
    //             low: Number(low), // 这根K线期间最低成交价
    //             volume: Number(volume), // 这根K线期间成交量
    //             isNewLine, // 这根K线是否完结(是否已经开始下一根K线)
    //             takerBuyBaseAssetVolume: Number(takerBuyBaseAssetVolume), // 主动买入的成交量
    //         };
    //         // setEveryIndexData(curKLine);
    //     }

    //     // 拦截
    //     // 如果正在下单，任何事情都别影响它
    //     // 正在修改网格，不能去尝试匹配网格
    //     // 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
    //     if (isLoading() || prePrice === currentPrice) return;

    //     await startRunGrid(prePrice, currentPrice); // ws每250ms触发一次
    // });
    ws.on("message", async (data) => {
        const trade = JSON.parse(data);

        prePrice = currentPrice; // 不能删除
        currentPrice = Number(trade.p) || 0;
        // 拦截
        // 如果正在下单，任何事情都别影响它
        // 正在修改网格，不能去尝试匹配网格
        // 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
        if (isLoading() || prePrice === currentPrice) return;

        await startRunGrid(prePrice, currentPrice); // 每秒会触发十次左右，但是需要快速判断是否进入交易点，所以不节流
    });

    // 添加 'close' 事件处理程序
    ws.on("close", (error) => {
        console.log(`WebSocket 关闭: `, error);
    });

    // 添加 'error' 事件处理程序
    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        // 在这里添加处理错误的逻辑
        process.exit(1);
    });
};

// logs
const createLogs = () => {
    // 创建 logs 文件夹
    if (!fs.existsSync(logsFolder)) {
        fs.mkdirSync(logsFolder);
    }

    // 重定向 console.log 到文件
    logStream = fs.createWriteStream(`${logsFolder}/${SYMBOL}-${getDate()}.log`, { flags: "a" });
    // 保存原始的 console.log 函数
    const originalConsoleLog = console.log;

    // 重写 console.log
    console.log = function (...args) {
        // originalConsoleLog.apply(console, args); // 保留原始 console.log 的功能
        // 将 log 写入文件
        logStream.write(
            `${getDate()}: ${args
                .map((v) => {
                    if (typeof v === "object") {
                        return JSON.stringify(v);
                    } else {
                        return v;
                    }
                })
                .join("，")}\n`,
        );
    };

    // ~~~~~~~~~~~~~~~~error~~~~~~
    // 创建 error 文件夹
    if (!fs.existsSync(errorsFolder)) {
        fs.mkdirSync(errorsFolder);
    }
    // 重定向 console.error 到文件
    errorStream = fs.createWriteStream(`${errorsFolder}/${SYMBOL}-${getDate()}.error`, { flags: "a" });
    // 保存原始的 console.error 函数
    const originalConsoleError = console.error;

    // 重写 console.error
    console.error = function (...args) {
        originalConsoleError.apply(console, args); // 保留原始 console.error 的功能
        // 将 error 写入文件
        errorStream.write(
            `${getDate()}: ${args
                .map((v) => {
                    if (typeof v === "object") {
                        return JSON.stringify(v);
                    } else {
                        return v;
                    }
                })
                .join("，")}\n`,
        );
    };
};

createLogs();
startTrading(); // 开始启动

const test = async () => {
    await getServerTimeOffset(); // 同步服务器时间
    await getCurrentPrice();
    await getHistoryClosePrices(); // 初始化 historyClosePrices
    // closeOrder("SELL", 500);
};
// test();

// 在服务停止时执行的清理工作
function cleanup() {
    console.log("Cleaning up before exit.");
    logStream && logStream.end();
    errorStream && errorStream.end();
}

// 监听进程的 exit 事件
process.on("exit", cleanup);

// 监听中断信号（如 Ctrl+C）
process.on("SIGINT", () => {
    console.log("Received SIGINT. Cleaning up...");
    cleanup();
    process.exit();
});
