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
} = require("./utils/functions.js");
const config = require("./config.js");

let testMoney = 0;
let testPoints = [];

const {
    SYMBOL,
    base,
    availableMoney,
    invariableBalance,
    leverage,
    maxRepeatNum,
    gridHight,
    gridCount,
    orderCountLimit,
    EMA_PERIOD,
    klineStage,
    logsFolder,
    errorsFolder,
} = config["bot6_7"];

// 环境变量
const B_SYMBOL = SYMBOL.toUpperCase();
const isTest = false; // 将此标志设置为 true 使用沙盒环境
const api = isTest ? "https://testnet.binance.vision/api" : "https://api.binance.com/api";
const fapi = isTest ? "https://testnet.binancefuture.com/fapi" : "https://fapi.binance.com/fapi";
const apiKey = isTest ? process.env.TEST_BINANCE_API_KEY : process.env.BINANCE_API_KEY; // 获取API密钥
const secretKey = isTest ? process.env.TEST_BINANCE_API_SECRET : process.env.BINANCE_API_SECRET; // 获取API密钥的密钥

console.log(isTest ? "测试环境～～～" : "正式环境～～～", apiKey);

// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:7892");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:7891");

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

// 全局变量
let repeatSamePointMap = {};
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

let preSwitchTime = Date.now(); // 上次切换时的时间点
let suretime = 5; // 每次出布林带，preSwitchTime就延长此时间

let curEma1 = 0;
let curEma2 = 0;
let curRsi = 0;
let curInBollBands = false; // 默认模式为1，所以默认不在布林带

// 这些指标，都不能预测，都马后炮
const threshold = 0.0001; // 阈值
const overboughtThreshold = 69.5;
const oversoldThreshold = 31.5;

const STD_MULTIPLIER = 1.2; // 用来确定布林带的宽度
const BOLL_PERIOD = 10;
const RSI_PERIOD = 10; // RSI计算周期

let model = 1; // 模式： 1 单开， 2 双开
let preModel = 1; // 模式： 1 单开， 2 双开

let rsiArr = [];
let ema1Arr = [];
let ema2Arr = [];
let ema3Arr = [];
let preRefreshTime = Date.now();
const klineTimeRange = klineStage * 60 * 1000;

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
const isLoading = () => {
    return (
        isSwitch || loadingPlaceOrder || loadingCloseOrder || loadingReverseTrade || loadingForehandTrade || onGridPoint
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
            openTime: item[0],
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5]),
            closeTime: item[6],
            quoteAssetVolume: parseFloat(item[7]),
            numberOfTrades: item[8],
            takerBuyBaseAssetVolume: parseFloat(item[9]),
            takerBuyQuoteAssetVolume: parseFloat(item[10]),
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
    let kLineData = await getKLineData(B_SYMBOL, `${klineStage}m`, 20);
    console.log("🚀 ~ file: gridBot6.js:154 ~ getHistoryClosePrices ~ kLineData:", kLineData);
    historyClosePrices = kLineData.map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
    console.log("k线收盘价:", historyClosePrices);

    let t1 = kLineData[kLineData.length - 2].closeTime;
    let t2 = kLineData[kLineData.length - 1].closeTime;
    let t3 = t1 + 2 * klineTimeRange;
    let x = (t1 + t3 - 2 * t2) / 2;
    console.log("🚀 ~ file: gridBot6-4.js:180 ~ getHistoryClosePrices ~ x:", x);

    preRefreshTime = t2;

    if (x > 100) {
        preRefreshTime = t2 + x;
        setTimeout(() => {
            historyClosePrices[historyClosePrices.length - 1] = currentPrice;
            console.log("修正后，k线收盘价:", historyClosePrices);
        }, x);
    }
    initRsi();
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
// 初始获取获取historyClosePrices后，后面就自己来弄，避免频繁请求太慢，本地实现比http获取更快
const refreshHistoryClosePrices = () => {
    setTimeout(() => {
        let nowTime = Date.now();

        // consolePrice();
        if (nowTime - preRefreshTime >= klineTimeRange) {
            preRefreshTime = nowTime;

            // 刷新 收盘价格
            historyClosePrices.shift();
            historyClosePrices.push(currentPrice);

            console.log("封盘时间到，当前currentPrice:", currentPrice, "historyClosePrices:", historyClosePrices);

            setTimeout(() => {
                // 更新ema
                setEmaArr(historyClosePrices, EMA_PERIOD);
                // 更新rsi
                // setRsiArr(); // 测试>>>>> 好看rsi数据

                // 计算 ema rsi boll
                calcEveryDatas();
            }, 0);
        }
        refreshHistoryClosePrices();
    }, 500);
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
        ema3Arr.shift();
    }
    ema1Arr.push(calculateEMA(prices, period1));
    ema2Arr.push(calculateEMA(prices, period2));
    ema3Arr.push(calculateEMA(prices, period1 + period2));
    console.log("🚀 ~ file: gridBot6-4.js:528 ~ setEmaArr ~ emaArr:", ema1Arr, ema2Arr, ema3Arr);
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
    if (loadingPlaceOrder) return;
    console.log("下单（开多操作/开空操作）placeOrder ~ side, quantity:", side, quantity);
    loadingPlaceOrder = true;
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
        // 请放开
        // const response = await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);

        // >>>>>>>>测试
        const response = {
            data: {
                orderId: "xxx",
                origQty: 13,
            },
        };

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
        loadingPlaceOrder = false;
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
const closeOrder = async (side, quantity) => {
    if (loadingCloseOrder) return;
    loadingCloseOrder = true;
    try {
        const timestamp = Date.now() + serverTimeOffset;
        let params = {
            symbol: B_SYMBOL, // 交易对
            side,
            type: "MARKET",
            quantity,
            positionSide: side === "BUY" ? "LONG" : "SHORT",
            timestamp,
            recvWindow: 6000,
            reduceOnly: true,
        };

        const signedParams = signRequest(params);
        // 请放开
        // const response = await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);

        // >>>>>>>测试
        const response = {
            data: {
                origQty: 13,
            },
        };
        console.log("🚀 ~ 平仓：", response && response.data ? response.data.origQty : "failed!");
        loadingCloseOrder = false;
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
// 全部平仓
const closeAllPositions = async () => {
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

        console.log("🚀 ~ file: gridBot6-6.js:552 ~ res.map ~ testMoney:", testMoney);

        // 测试 >>>>
        tradingDatas = {};
        testPoints = [];
        purchaseInfo = {};

        console.log("全部仓完成，重新开始");
        await initializeTrading();
        return;

        // end

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
        testPoints = [];
        purchaseInfo = {};

        console.log("全部仓完成，重新开始");
        await Promise.call([...closeFetchs, initializeTrading()]); // 买/卖 并发
    } catch (error) {
        console.error("closeAllPositions Error closing positions:", error);
        process.exit(1);
    }
};
// 平反仓
const closePartPositions = async (ema1, ema2) => {
    try {
        let isUp = ema1 > ema2;
        let _currentPrice = currentPrice;

        // 测试 >>>>
        tradingDatas = {};
        let upPositionAmt = 0;
        let downPositionAmt = 0;
        Object.keys(tradingDatas).map((k) => {
            const v = tradingDatas[k];
            if (isUp) {
                if (v.trend == "down") {
                    testMoney += v.orderPrice - _currentPrice;
                    tradingDatas[k].down = null;
                }
                if (v.trend == "up") {
                    upPositionAmt += Math.abs(v.upPositionAmt);
                }
            } else {
                if (v.trend === "up") {
                    testMoney += _currentPrice - v.orderPrice;
                    tradingDatas[k].up = null;
                }
                if (v.trend == "down") {
                    downPositionAmt += Math.abs(v.upPositionAmt);
                }
            }
        });
        if (isUp) {
            if (upPositionAmt) {
                purchaseInfo = {
                    currentPointIndex,
                    trend: "up",
                    side: "BUY",
                    orderPrice: _currentPrice,
                    quantity: upPositionAmt,
                };
            } else {
                await placeOrder("BUY", getQuantity(_currentPrice));
            }
        } else {
            if (downPositionAmt) {
                purchaseInfo = {
                    currentPointIndex,
                    trend: "down",
                    side: "SELL",
                    orderPrice: _currentPrice,
                    quantity: downPositionAmt,
                };
            } else {
                await placeOrder("SELL", getQuantity(_currentPrice));
            }
        }

        testPoints = [];
        tradingDatas = {};

        console.log("🚀 ~ file: gridBot6-6.js:552 ~ res.map ~ testMoney:", testMoney);
        console.log("完成部分平仓，重新开始");
        if (isUp) {
            placeOrder("BUY", getQuantity(_currentPrice));
        } else {
        }
        return;

        // end

        allPositionDetail = await getPositionRisk(); // 获取当前仓位信息
        console.log("全部仓位信息 allPositionDetail:", allPositionDetail);
        const { up, down } = allPositionDetail;
        let fetchs = [];
        tradingDatas = {};
        testPoints = [];
        if (isUp) {
            // 平空
            if (down) {
                fetchs.push(closeOrder("BUY", down.quantity));
            }
            if (up) {
                purchaseInfo = {
                    currentPointIndex,
                    trend: "up",
                    side: "BUY",
                    orderPrice: up.breakEvenPrice,
                    quantity: Math.abs(up.positionAmt),
                };
            } else {
                // 开多
                fetchs.push(placeOrder("BUY", getQuantity(_currentPrice)));
            }
        } else {
            // 平多
            if (up) {
                fetchs.push(closeOrder("SELL", up.quantity));
            }
            if (down) {
                purchaseInfo = {
                    currentPointIndex,
                    trend: "down",
                    side: "SELL",
                    orderPrice: down.breakEvenPrice,
                    quantity: Math.abs(down.positionAmt),
                };
            } else {
                // 开空
                fetchs.push(placeOrder("SELL", getQuantity(_currentPrice)));
            }
        }

        console.log("全部仓完成，重新开始");
        await Promise.call(fetchs); // 买/卖 并发
    } catch (error) {
        console.error("closeAllPositions Error closing positions:", error);
        process.exit(1);
    }
};
// 开多
const teadeBuy = async (_currentPrice, quantity) => {
    try {
        await placeOrder("BUY", getQuantity()); // 调整开仓数量
        console.log("开多完成");
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};
// 开空
const teadeSell = async (_currentPrice, quantity) => {
    try {
        await placeOrder("SELL", getQuantity()); // 调整开仓数量
        console.log("开空完成");
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};

// 双向开单
const teadeBoth = async (_currentPrice) => {
    // 当前是否有多单
    if (!(tradingDatas[currentPointIndex] && tradingDatas[currentPointIndex].up)) {
        console.log("当前没有多单，开多");
        await teadeBuy(_currentPrice, getQuantity(_currentPrice));
    }
    // 当前是否有空单
    if (!(tradingDatas[currentPointIndex] && tradingDatas[currentPointIndex].down)) {
        console.log("当前没有空单，开空");
        await teadeSell(_currentPrice, getQuantity(_currentPrice));
    }
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

// 1. 启动时通过EMA判断价格走势，开多或开空，并记录'购买信息'
const initializeTrading = async () => {
    try {
        const len = ema1Arr.length;
        if (!len) throw new Error("emaArr 为空，请重新启动");
        const isUpTrend = ema1Arr[len - 1] > ema3Arr[len - 1]; // 判断价格趋势
        const _currentPrice = currentPrice;
        console.log("🚀 ~ file: gridBot6.js:343 ~ initializeTrading ~ quantity:", getQuantity());
        if (isUpTrend) {
            await placeOrder("BUY", getQuantity(_currentPrice)); // 开多
        } else {
            await placeOrder("SELL", getQuantity(_currentPrice)); // 开空
        }
    } catch (error) {
        console.error("initializeTrading header::", error);
        process.exit(1);
    }
};

// 清除定时器
const clearAllTimer = () => {
    clearTimeout(confirmationTimer);
};

// 初始化
const setInitData = ({ up, down }) => {
    if (up) {
        recordTradingDatas(gridCount / 2, "up", up);
    }
    if (down) {
        recordTradingDatas(gridCount / 2, "down", down);
    }
    console.log(`setInitData初始化数据完成 TradingDatas:`, tradingDatas);
};

// 设置网格
const setGridPointsToCurPriceCenter = (_currentPrice) => {
    loadingNewPoints = true;

    // 保证当前价在网格正中间
    // let price = _currentPrice + gridHight * 0.5 * 0.99999999; // 0.999999999是为了让小数位数够多
    // >>>>>测试
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

    loadingNewPoints = false;
    console.log("重新绘制网格 _currentPrice ， gridPoints:", _currentPrice, gridPoints);
};
// 5. 启动交易
const startTrading = async () => {
    try {
        await getServerTimeOffset(); // 同步服务器时间
        await getHistoryClosePrices(); // 初始化 historyClosePrices
        setEmaArr(historyClosePrices, EMA_PERIOD);

        // 测试
        await getCurrentPrice(); // >>>>
        setGridPointsToCurPriceCenter(currentPrice); // >>>>
        await initializeTrading(); //  >>>>
        await startWebSocket(); // //  >>>>
        refreshHistoryClosePrices(); //  >>>>
        return; //  >>>>

        if (!invariableBalance) {
            await getContractBalance(); // 获取当前合约账户中的 USDT
        }
        // 初始化 tradingDatas
        allPositionDetail = await getPositionRisk(); // 获取当前仓位信息
        console.log("🚀 ~ file: gridBot6-1.js:886 ~ startTrading ~ allPositionDetail:", allPositionDetail);
        if (allPositionDetail) {
            setInitData(allPositionDetail);
            let _currentPrice = Number(allPositionDetail.up.orderPrice || allPositionDetail.down.orderPrice);
            setGridPointsToCurPriceCenter(_currentPrice); // 绘制网格
        }
        // 如果还没仓位要加仓
        else if (!isNonEmpty(allPositionDetail)) {
            console.log("还没仓位要加仓");
            await getCurrentPrice(); // 获取当前价格
            let _currentPrice = currentPrice;
            await initializeTrading(); // 初始交易
            setGridPointsToCurPriceCenter(_currentPrice); // 绘制网格
        }
        await startWebSocket(); // 启动websocket更新价格
        refreshHistoryClosePrices();
    } catch (error) {
        console.error("startTrading Error:", error);
        process.exit(1);
    }
};
// 获取下单量
const getQuantity = (_currentPrice) => {
    return Math.round((availableMoney * leverage) / (_currentPrice || currentPrice));
};

// 把邻居能平的都平了
const closeNeighbourOrder = async () => {
    // 上面的交易点有开空
    if (tradingDatas[currentPointIndex + 1] && tradingDatas[currentPointIndex + 1].down) {
        //>>>> 测试
        testMoney += tradingDatas[currentPointIndex + 1].down.orderPrice - currentPrice;
        console.log("平空 closeNeighbourOrder ~ testMoney:", testMoney);
        // 平空
        await closeOrder("BUY", tradingDatas[currentPointIndex + 1].down.quantity);
        tradingDatas[currentPointIndex + 1].down = null;
    }
    // 下面的交易点有开多
    if (tradingDatas[currentPointIndex - 1] && tradingDatas[currentPointIndex - 1].up) {
        //>>>> 测试
        testMoney += currentPrice - tradingDatas[currentPointIndex - 1].up.orderPrice;
        console.log("平多 closeNeighbourOrder ~ testMoney:", testMoney);
        // 平多
        await closeOrder("SELL", tradingDatas[currentPointIndex - 1].up.quantity);
        tradingDatas[currentPointIndex - 1].up = null;
    }
};

// 3. 启动定时器
const startConfirmationTimer = (time = confirmNum) => {
    console.log("启动3分钟确认定时器");
    clearTimeout(confirmationTimer);
    confirmationTimer = setTimeout(confirmOrder, time * 60 * 1000);
};

// 4. 确认订单
const confirmOrder = async () => {
    console.log("3分钟时间到，确认订单:");
    try {
        let trend = "";
        if (purchaseInfo.trend) {
            if (currentPrice > curGridPoint) {
                // 当前价格大于上次交易价，走势为：上升
                trend = "up";
                console.log("当前价格大于上次交易价，走势为：上升", trend);
            } else if (currentPrice < curGridPoint) {
                // 当前价格小于上次交易价，走势为：下降
                trend = "down";
                console.log("当前价格小于上次交易价，走势为：下降", trend);
            } else {
                // 如果价格相等用 ema 指标判断走势
                const ema1 = calculateEMA([...historyClosePrices, currentPrice], EMA_PERIOD[0]);
                const ema2 = calculateEMA([...historyClosePrices, currentPrice], EMA_PERIOD[1]);
                trend = ema1 > ema2 ? "up" : "down";
                console.log("价格相等用 ema 指标判断走势", trend);
            }

            if (trend !== purchaseInfo.trend) {
                console.log("价格走势和订单多空状态背离需要反手");
                await reverseTrade();
            } else {
                console.log(`价格走势和订单多空状态一致，无需其他操作, curGridPoint: ${curGridPoint}`);
            }
            // 确认后的 entryGridPoint 是当前最新价不是交易点
            // 确认后，改了entryGridPoint，如果再次返回上次交易点，那么就可以立马做出判断空多
            purchaseInfo = {
                ...purchaseInfo,
                orderPrice: currentPrice, // 也改掉，避免频繁到达交易点时，价格判断不好做
                trend,
                side: trend === "up" ? "BUY" : "SELL",
            };
        } else {
            initializeTrading();
        }
        startConfirmationTimer();
    } catch (error) {
        console.error("confirmOrder error::", error);
        process.exit(1);
    }
};
// 反手交易
const reverseTrade = async (originTrend) => {
    let fetchs = [];
    if (originTrend === "up") {
        fetchs.push(closeOrder("SELL", purchaseInfo.quantity)); // 平多
        fetchs.push(placeOrder("SELL", getQuantity())); // 开空
    } else {
        fetchs.push(closeOrder("BUY", purchaseInfo.quantity)); // 平空
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
// 到达交易点
const gridPointTrading1 = async () => {
    console.log("gridPointTrading1 ~ 进入单开模式");
    clearAllTimer(confirmationTimer); // 凡是经过交易点，立马取消所有定时器
    if (purchaseInfo.currentPointIndex !== currentPointIndex) {
        console.log("单开模式，到达不同交易点：", currentPointIndex, purchaseInfo);

        // 上升趋势
        if (purchaseInfo.currentPointIndex < currentPointIndex) {
            console.log("🚀 ~ 现在:👆👆👆👆👆👆👆👆，原来为:", purchaseInfo.trend);
            // 如果当前价格趋势是上升，之前开的多单则只改entryGridPoint，若之前开的空单则须反手
            if (purchaseInfo.trend === "down") {
                // 价格走势和订单多空状态背离
                await reverseTrade("down");
            } else {
                // 没有背离就顺手操作
                await forehandTrade("up");
            }
        }
        // 下降趋势
        if (purchaseInfo.currentPointIndex > currentPointIndex) {
            console.log("🚀 ~ 现在:👇👇👇👇👇👇👇👇, 原来为:", purchaseInfo.trend);
            // 如果当前价格趋势是下降，之前开的空单则只改entryGridPoint，若之前开的多单则须反手
            if (purchaseInfo.trend === "up") {
                // 价格走势和订单多空状态背离
                await reverseTrade("up");
            } else {
                // 没有背离就顺手操作
                await forehandTrade("down");
            }
        }
    } else {
        console.log("单开模式，重复到达交易点：", currentPointIndex, purchaseInfo);
    }
    // 经过交易点之后（不管是否反手或者下单）都需要3 分钟后确认
    // startConfirmationTimer();
};

// 双向开单模式
const gridPointTrading2 = async (ema1, ema2) => {
    console.log("gridPointTrading2 ~ 进入双开模式");
    onGridPoint = true;
    clearAllTimer(confirmationTimer); // 凡是经过交易点，立马取消所有定时器;

    let isUp = ema1 > ema2;

    // 到了交易点，先把邻居可以平的平掉
    const closeFetch = closeNeighbourOrder();

    const emaGap = Math.abs(ema1 - ema2) > threshold; // threshold 这里还需要调整参与对比才行？？？？?????>>>>>
    // ????价格差是不是也可以参与计算
    // 上升趋势
    if (isUp) {
        console.log("🚀 ~ 现在:👆👆👆👆👆👆👆👆");
        if (emaGap) {
            console.log("🚀 ~ 确定现在:👆");
            // 当前交易点是否有多单，没有就加
            if (!tradingDatas[currentPointIndex] || !tradingDatas[currentPointIndex].up) {
                const promises = [
                    closeFetch,
                    teadeBuy(currentPrice, getQuantity(currentPrice)), // 开多
                ];
                await Promise.all(promises);
            }
        } else {
            console.log("上升趋势不够明显，双向开单", tradingDatas);
            const promises = [closeFetch, teadeBoth(currentPrice)];
            await Promise.all(promises);
        }
    } else {
        console.log("🚀 ~ 现在:👇👇👇👇👇👇👇👇");
        // 在确认期内保持一致
        if (emaGap) {
            console.log("🚀 ~ 确定现在:👇");
            if (!tradingDatas[currentPointIndex] || !tradingDatas[currentPointIndex].down) {
                await Promise.all([
                    closeFetch,
                    teadeSell(currentPrice, getQuantity(currentPrice)), // 开空
                ]);
            }
        } else {
            console.log("下降趋势不够明显，双向开单", tradingDatas);
            const promises = [closeFetch, teadeBoth(currentPrice)];
            await Promise.all(promises);
        }
    }
    onGridPoint = false;
};
// 判断上升趋势是否在确认期内保持一致
const confirmationUpTrend = (ema1Arr, ema2Arr, confirmationPeriod) => {
    const len = ema1Arr.length;
    for (let i = 1; i <= confirmationPeriod; i++) {
        if (!(ema1Arr[len - i] > ema2Arr[len - i])) {
            return false;
        }
    }
    return true;
};

// 判断下降趋势是否在确认期内保持一致
const confirmationDownTrend = (ema1Arr, ema2Arr, confirmationPeriod) => {
    const len = ema1Arr.length;
    for (let i = 1; i <= confirmationPeriod; i++) {
        if (!(ema1Arr[len - i] < ema2Arr[len - i])) {
            return false;
        }
    }
    return true;
};

// 进入双开模式前的判断
const beforeGridPointTrading2 = async () => {
    if (prePointIndex === currentPointIndex) {
        console.log("双开模式，重复到达交易点：", currentPointIndex, curGridPoint);
        if (
            tradingDatas[currentPointIndex] &&
            tradingDatas[currentPointIndex].up &&
            tradingDatas[currentPointIndex].down
        ) {
            return false; // 单子满了，退出函数
        }
    } else {
        testPoints.push(currentPointIndex);
        console.log("双开模式，到达不同交易点：", currentPointIndex, curGridPoint);
        if (
            Object.values(tradingDatas).reduce((res, { up, down }) => {
                up && res.push(up);
                down && res.push(down);
                return res;
            }, []).length > orderCountLimit
        ) {
            console.log("到达不同交易点，并且：orderCount === orderCountLimit，要全平仓", testPoints, tradingDatas);
            await closeAllPositions(); // 全平仓
            return false;
        }
    }
    return true;
};
const switchModel = async (ema1, ema2, rsi) => {
    let _model = model === 1 ? 2 : 1;

    if (model !== _model) {
        preModel = model;
        model = _model;
        console.log("gridPointSwitch ~ 切换模式，先平仓:");
        if (model === 2) {
            console.log("切换为双开模式");
            await closeAllPositions(); // 全平仓
        }
        if (model === 1) {
            console.log("切换为单开开模式");
            await closePartPositions(ema1, ema2); // 平反仓
        }
    }
};
const realSwitchModel = throttleImmediate(async (ema1, ema2, rsi, boll) => {
    console.log("realSwitchModel - ema1, ema2, rsi, boll:", ema1, ema2, rsi, boll);
    if (model === 2) {
        if (Date.now() - preSwitchTime < keepModel2Time) {
            console.log(`realSwitchModel - 双单模式持续时间在 ${keepModel2Time} 分钟内，不会在此更改模式`);
            return;
        }
    }
    // 出了布林带，而且rsi超出正常范围
    if (!boll && (rsi < oversoldThreshold || rsi > overboughtThreshold)) {
        console.log("realSwitchModel - 出布林带，而且rsi超出正常范围");
        // 本来就是单仓模式下，又遇到了该开单仓的情况，重置时间，再加 ${suretime} 分钟
        if (model === 1) {
            console.log(
                `realSwitchModel - 本来就是单仓模式下，又再次出了布林带，重置时间，再加 ${suretime} 分钟确认, rsi::`,
            );
            preSwitchTime += suretime * 60 * 1000;
            return;
        }
        // 如果本来是2， 突然rsi降了或者升了，它刚好开双会抵消就是不赚钱呗，可能是插针，那么也能够适配
    }
    // 连续 ${switchModelTime} 分钟都没有出布林带，就自动切换为双单模式
    if (Date.now() - preSwitchTime > suretime * 60 * 1000) {
        console.log(`realSwitchModel - 连续 ${suretime} 分钟都没有出布林带，就自动切换为双单模式`);
        preSwitchTime = Date.now();
        await switchModel(ema1, ema2, rsi);
    }
}, 1000);
const gridPointSwitch = async (ema1, ema2) => {
    isSwitch = true;

    // 如果是双向开单
    if (model === 2) {
        const valid = await beforeGridPointTrading2();
        if (valid) {
            await gridPointTrading2(ema1, ema2);
        }
    }
    // 如果是单向开单
    else {
        await gridPointTrading1();
    }
    isSwitch = false;
};

const calcEveryDatas = () => {
    curEma1 = calculateEMA([...historyClosePrices, currentPrice], EMA_PERIOD[0]);
    curEma2 = calculateEMA([...historyClosePrices, currentPrice], EMA_PERIOD[1]);

    curRsi = calculateRSI([...historyClosePrices, currentPrice], RSI_PERIOD);

    // 计算布林带
    const bollingerBands = calculateBollingerBands([...historyClosePrices, currentPrice], BOLL_PERIOD, STD_MULTIPLIER);
    // 判断当前价格是否在布林带之间
    curInBollBands = isPriceInBollingerBands(currentPrice, bollingerBands);
};
// 跑网格
const startRunGrid = async () => {
    // 插针时速度很快可能会垮多个格子>>>>>>
    let _currentPointIndex = 0;
    let _curGridPoint = gridPoints.find((point, index) => {
        if ((prePrice <= point && point <= currentPrice) || (prePrice >= point && point >= currentPrice)) {
            _currentPointIndex = index;
            return true;
        } else {
            return false;
        }
    });
    // 价格到了某个网格交易点
    if (_curGridPoint) {
        curGridPoint = _curGridPoint;
        prePointIndex = currentPointIndex;
        currentPointIndex = _currentPointIndex;

        await realSwitchModel(curEma1, curEma2, curRsi, curInBollBands);
        await gridPointSwitch(curEma1, curEma2); // 判断+交易
    } else {
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

// WebSocket 事件
const startWebSocket = async () => {
    console.log("🚀 startWebSocket~~~~~");
    // 添加 'open' 事件处理程序
    ws.on("open", async (data) => {
        console.log("WebSocket connection opened.", data);
    });

    // 添加 'message' 事件处理程序
    ws.on("message", async (data) => {
        const trade = JSON.parse(data);

        prePrice = currentPrice; // 不能删除
        currentPrice = Number(trade.p) || 0;
        // 拦截
        // 如果正在下单，任何事情都别影响它
        // 正在修改网格，不能去尝试匹配网格
        // 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
        if (isLoading() || loadingNewPoints || prePrice === currentPrice) return;

        await startRunGrid(); // 每秒会触发十次左右，但是需要快速判断是否进入交易点，所以不节流
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
    await getHistoryClosePrices(); // 初始化 historyClosePrices
    await setEmaArr(historyClosePrices, EMA_PERIOD);
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
