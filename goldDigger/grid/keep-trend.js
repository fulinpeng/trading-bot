// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const WebSocket = require("ws"); // WebSocket库
const { HttpsProxyAgent } = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");
// const Binance = require("node-binance-api");
const fs = require("fs");
const { debounce, throttle, getDate } = require("../../common/functions.js");
const config = require("../../params/grid.js");

const {
    SYMBOL,
    base,
    availableMoney,
    invariableBalance,
    leverage,
    gridCount,
    gridHight,
    maxRepeatNum,
    needSellPercent,
    EMA_PERIOD,
    klineStage,
    logsFolder,
    errorsFolder,
} = config["bot6_1"];

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
let store = {}; // 当前仓位信息
let historyClosePrices = []; // 历史收盘价，用来计算EMA
let curGridPoint = undefined; // 当前网格
let timeToGridPoint = 0; // 到达交易点时间
let _gridHight = gridHight;

// 日志
let logStream = null;
let errorStream = null;

// 最新交易信息
let purchaseInfo = {
    trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
    side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
    orderPrice: 0,
    orderTime: 0,
    entryGridPoint: currentPrice,
};

// loading
let loadingPlaceOrder = false; // 下单
let loadingCloseOrder = false; // 平仓
let loadingReverseTrade = false; // 反手
let loadingForehandTrade = false; // 顺手
let loadingNewPoints = false; // 修改网格
const isLoading = () => {
    return loadingPlaceOrder || loadingCloseOrder || loadingReverseTrade || loadingForehandTrade;
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

// 获取EMA（指数移动平均线）值
const getHistoryClosePrices = async () => {
    // 在getKLineData方法中获取至少15分钟内的价格数据
    const kLineData = await getKLineData(B_SYMBOL, "1m", 15);
    console.log("🚀 ~ file: gridBot6.js:154 ~ getHistoryClosePrices ~ kLineData:", kLineData.length);
    // 获取当前时间
    const currentTime = Date.now() + serverTimeOffset;
    // 获取15分钟前的时间
    const fifteenMinutesAgo = currentTime - 15 * 60 * 1000; // 毫秒数
    // 筛选出在15分钟内的价格数据
    historyClosePrices = kLineData
        .filter((data) => data.closeTime >= fifteenMinutesAgo) // closeTime 表示收盘时间
        .map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
    console.log(
        "🚀 ~ file: gridBot6.js:179 ~ getHistoryClosePrices ~ historyClosePrices 1分钟k线收盘价:",
        historyClosePrices,
    );
};
// 获取EMA（指数移动平均线）值
const getCurrentPriceEma = async () => {
    // 传递至calculateEMA函数
    currentPriceEma = await calculateEMA(historyClosePrices, EMA_PERIOD);
    console.log("🚀 ~ file: gridBot5.js:396 ~ ws.on ~ currentPriceEma:", currentPriceEma);
};
// 初始获取获取historyClosePrices后，后面就自己来弄，避免频繁请求太慢，本地实现比http获取更快
const refreshData = () => {
    setTimeout(() => {
        // 刷新 收盘价格
        historyClosePrices.shift();
        historyClosePrices.push(currentPrice);

        // 刷新网格
        if (
            currentPrice <= gridPoints[parseInt(gridCount / 4)] ||
            currentPrice >= gridPoints[parseInt(gridCount - gridCount / 4)]
        ) {
            if (isLoading() || loadingNewPoints) {
                console.log("再下单或者正在修改网格，不能继续操作");
                return;
            } else {
                setGridPointsToCurPriceCenter(currentPrice);
            }
        }
    }, klineStage * 60 * 1000);
};

// 网格交易点计算
const getPrice24hr = async () => {
    try {
        const response = await axios.get(`${api}/v3/ticker/24hr?symbol=${B_SYMBOL}`);
        const ticker = response.data;
        lowPrice = parseFloat(ticker.lowPrice);
        highPrice = parseFloat(ticker.highPrice);
    } catch (error) {
        console.error(
            "getPrice24hr header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error,
        );
        process.exit(1);
    }
};
// 设置网格
const setGridPointsToCurPriceCenter = (_currentPrice) => {
    loadingNewPoints = true;
    // 先清空以前的
    gridPoints = [];
    repeatSamePointMap = {};
    // 保证当前价在网格正中间
    let price = _currentPrice + _gridHight * 0.5 * 0.99999999; // 0.999999999是为了让小数位数够多
    let price2 = price;
    let num = gridCount;
    gridPoints.push(price);
    while (num >= gridCount / 2) {
        price -= _gridHight;
        gridPoints.unshift(price);
        num--;
    }
    while (num > 0) {
        price2 += _gridHight;
        gridPoints.push(price2);
        num--;
    }

    loadingNewPoints = false;
    console.log("重新绘制网格 _currentPrice ， gridPoints:", _currentPrice, gridPoints);
};
const setGridPointsToCurPointBorder = (_curGridPoint) => {
    loadingNewPoints = true;
    // 先清空以前的
    gridPoints = [];
    repeatSamePointMap = {};
    // 保证当前价在网格正中间
    let price = _curGridPoint; // 以上一次的 curGridPoint 为基准缩放
    let price2 = price;
    let num = gridCount;
    gridPoints.push(price);
    while (num >= gridCount / 2) {
        price -= _gridHight;
        gridPoints.unshift(price);
        num--;
    }
    while (num > 0) {
        price2 += _gridHight;
        gridPoints.push(price2);
        num--;
    }

    loadingNewPoints = false;
    console.log("重新绘制网格 _curGridPoint ， gridPoints:", _curGridPoint, gridPoints);
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
// 获取当前仓位信息
const getStoreInfo = async (orderId) => {
    try {
        const timestamp = Date.now() + serverTimeOffset;
        const params = {
            symbol: B_SYMBOL, // 交易对
            timestamp,
            orderId,
        };

        const signedParams = signRequest(params);
        const response = await axiosInstance.get(`${fapi}/v1/order?${signedParams}`);
        store = {
            ...(response.data ? response.data : {}),
        };
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
// 获取持仓风险
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
        console.log(" getPositionRisk ~ response:", response.data);
        // [
        //     {
        //       symbol: 'OPUSDT',
        //       positionAmt: '2.0', // 头寸数量，符号代表多空方向, 正数为多，负数为空
        //       entryPrice: '3.2919', // 订单价
        //       breakEvenPrice: '3.29354595', // 盈亏平衡价
        //       markPrice: '3.30007956',
        //       unRealizedProfit: '0.01635912', // 持仓未实现盈亏
        //       liquidationPrice: '0',
        //       leverage: '1', // 杠杆
        //       maxNotionalValue: '3.0E7',
        //       marginType: 'isolated',// 逐仓模式或全仓模式
        //       isolatedMargin: '6.60084790',
        //       isAutoAddMargin: 'false',
        //       positionSide: 'BOTH',
        //       notional: '6.60015912',
        //       isolatedWallet: '6.58448878',
        //       updateTime: 1707271971169,
        //       isolated: true,
        //       adlQuantile: 2
        //     }
        //   ]
        const { positionAmt, entryPrice } = response.data[0];
        let res = null;
        if (Number(positionAmt) && Number(entryPrice)) {
            res = response.data[0];
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
// 获取交易情况
const getCurrentTrade = async (limit) => {
    const timestamp = Date.now() + serverTimeOffset;
    const params = {
        symbol: B_SYMBOL, // 交易对
        timestamp,
        limit,
        recvWindow: 6000,
    };

    const signedParams = signRequest(params);
    const response = await axiosInstance.get(`${fapi}/v1/trades?${signedParams}`);
    console.log("🚀 ~ file: gridBot6.js:276 ~ getCurrentTrade ~ response:", response);

    return response.data || [];
};
// 获取当前挂单
const getAllOrders = async (limit) => {
    const timestamp = Date.now() + serverTimeOffset;
    const params = {
        symbol: B_SYMBOL, // 交易对
        timestamp,
        apiKey,
        recvWindow: 6000,
        limit,
    };

    const signedParams = signRequest(params);
    const response = await axiosInstance.get(`${fapi}/v1/allOrders?${signedParams}`);
    console.log("🚀 ~ file: gridBot6.js:276 ~ getCurrentTrade ~ response:", response);
    // [
    //     {
    //         orderId: 8741800365,
    //         symbol: "OPUSDT",
    //         status: "FILLED", // 订单状态
    //         clientOrderId: "Fx4uvBfy6rGDyzidkDPBi2",
    //         price: "0",
    //         avgPrice: "3.29190000", // 平均成交价 订单价
    //         origQty: "2",// 原始委托数量，要买多少，有的单子会被拆分
    //         executedQty: "2",// 成交量买了多少，用这个
    //         cumQuote: "6.58380000",
    //         timeInForce: "GTC",
    //         type: "MARKET",
    //         reduceOnly: false,
    //         closePosition: false,
    //         side: "BUY",
    //         positionSide: "BOTH",
    //         stopPrice: "0",
    //         workingType: "CONTRACT_PRICE",
    //         priceMatch: "NONE",
    //         selfTradePreventionMode: "NONE",
    //         goodTillDate: 0,
    //         priceProtect: false,
    //         origType: "MARKET",
    //         time: 1707271971169,
    //         updateTime: 1707271971169,
    //     },
    // ];
    return response.data || [];
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
        console.log(
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
// 下单（开多操作/开空操作）
const placeOrder = async (side, quantity) => {
    if (loadingPlaceOrder) return;
    console.log("🚀 ~ file: gridBot6.js:269 ~ placeOrder ~ side, quantity:", side, quantity);
    loadingPlaceOrder = true;
    try {
        const tempPrice = currentPrice;
        const timestamp = Date.now() + serverTimeOffset;
        let params = {
            symbol: B_SYMBOL, // 交易对
            side, // 指定订单是开多 (BUY) 还是开空 (SELL)
            type: "MARKET", // LIMIT：限价订单，MARKET：市价订单，详见 https://binance-docs.github.io/apidocs/spot/en/#test-new-order-trade
            quantity,
            timestamp,
            recvWindow: 6000, // 请求的超时时间
        };
        console.log("🚀 ~ file: gridBot6.js:267 ~ placeOrder ~ params:", params);
        // [[[[[
        const signedParams = signRequest(params);
        const response = await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
        // ]]]]]
        console.log(
            `Order placed - Symbol: ${B_SYMBOL}, Side: ${side}, Quantity: ${quantity}`,
            "orderId:",
            response.data.orderId,
        );
        // let response = {}; // ]]]]]]]
        // 如果 下单（开多操作/开空操作） 成功需要更新store
        if (response && response.data && response.data.orderId) {
            store = {
                ...(response.data || {}),
            };

            recordPurchaseInfo({
                orderPrice: tempPrice,
                orderTime: Date.now(),
            });

            // >>> 这里是否要优化，因为没有 下单返回的没有 executedQty
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
            // store 保持不变
            store = { ...store };
        }
        // [[[[[[[
        // store = {
        //     ...store,
        //     origQty: quantity,
        //     side,
        // };
        // recordPurchaseInfo({
        //     orderPrice: tempPrice,
        //     orderTime: Date.now(),
        // });
        // ]]]]]]]
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
const closeOrder = async (side) => {
    if (loadingCloseOrder) return;
    loadingCloseOrder = true;
    try {
        const timestamp = Date.now() + serverTimeOffset;
        let params = {
            symbol: B_SYMBOL, // 交易对
            side,
            type: "MARKET",
            quantity: Math.abs(store.origQty),
            timestamp,
            recvWindow: 6000,
            reduceOnly: true,
        };

        const signedParams = signRequest(params);
        const response = await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
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

// 反手交易
const reverseTrade = async () => {
    if (loadingReverseTrade) return;
    loadingReverseTrade = true;
    console.log("🚀 ~ 开始反手:");
    // await getContractBalance(); // 获取当前合约账户中的 USDT 余额
    try {
        // 如果有开多的仓位，执行反手操作
        if (store.side === "BUY") {
            console.log(
                "🚀 ~ file: gridBot6-1.js:510 ~ reverseTrade ~ 有开多的仓位，执行反手操作, currentPrice:",
                currentPrice,
            );
            // 先平多
            await closeOrder("SELL");
            console.log("平多完成");

            // 再开空
            await placeOrder("SELL", getQuantity()); // 调整开仓数量
            console.log("开空完成");
            recordPurchaseInfo({
                trend: "down",
                side: "SELL",
                // entryGridPoint: getEntryGridPoint("down", currentPrice),
            });
        }
        // 如果有开空的仓位，执行反手操作
        else if (store.side === "SELL") {
            console.log(
                "🚀 ~ file: gridBot6-1.js:510 ~ reverseTrade ~ 有开空的仓位，执行反手操作, currentPrice:",
                currentPrice,
            );
            // 先平空
            await closeOrder("BUY");
            console.log("平空完成");

            // 再开多
            await placeOrder("BUY", getQuantity()); // 调整开仓数量
            console.log("开多完成");
            recordPurchaseInfo({
                trend: "up",
                side: "BUY",
                // entryGridPoint: getEntryGridPoint("up", currentPrice),
            });
        } else {
            console.log("无仓位，就新开一个仓位");
            await initializeTrading();
        }
        recordPurchaseInfo({ entryGridPoint: curGridPoint });
        loadingReverseTrade = false;
    } catch (error) {
        console.error("reverseTrade header::", error);
        process.exit(1);
    }
};
// 顺手交易
const forehandTrade = async () => {
    if (loadingForehandTrade) return;
    loadingForehandTrade = true;
    console.log("🚀 ~ 开始顺手:");
    try {
        // 如果有开多的仓位，平仓后继续开多
        if (store.side === "BUY") {
            console.log("forehandTrade ~ 如果有开多的仓位，平仓后继续开多, currentPrice:", currentPrice);
            // 先平多
            await closeOrder("SELL");
            console.log("平多完成");

            // 再开多
            await placeOrder("BUY", getQuantity()); // 调整开仓数量
            console.log("开多完成");
            recordPurchaseInfo({
                trend: "up",
                side: "BUY",
            });
        }
        // 如果有开空的仓位，平空后继续开空
        else if (store.side === "SELL") {
            console.log("forehandTrade ~ 如果有开空的仓位，平空后继续开空, currentPrice:", currentPrice);
            // 先平空
            await closeOrder("BUY");
            console.log("平空完成");
            // 再开空
            await placeOrder("SELL", getQuantity()); // 调整开仓数量
            console.log("开空完成");
            recordPurchaseInfo({
                trend: "down",
                side: "SELL",
            });
        } else {
            console.log("无仓位，就新开一个仓位");
            await initializeTrading();
        }
        loadingForehandTrade = false;
    } catch (error) {
        console.error("forehandTrade header::", error);
        process.exit(1);
    }
};

// 更新购买信息
const recordPurchaseInfo = async (info) => {
    // 更新购买信息
    purchaseInfo = {
        ...purchaseInfo,
        ...info,
    };
    console.log("Purchase Info Updated:", purchaseInfo);
};

const getEntryGridPoint = (trend, price) => {
    if (gridPoints.length) {
        const points = trend === "up" ? [...gridPoints] : [...gridPoints].reverse();
        let targetPoint = points.find((point) => {
            return Math.abs(point - price) < _gridHight;
        });
        console.log("重绘网格后，entryGridPoint：", targetPoint);
        return targetPoint || currentPrice;
    } else {
        console.log(" XXXXXXXXXXXX，还没有绘制网格");
    }
};

// 1. 启动时通过EMA判断价格走势，开多或开空，并记录'购买信息'
const initializeTrading = async () => {
    try {
        await getCurrentPriceEma(); // 获取当前价格的EMA值
        const _currentPrice = currentPrice;
        const isUpTrend = currentPrice > currentPriceEma; // 判断价格趋势
        console.log("🚀 ~ file: gridBot6.js:343 ~ initializeTrading ~ quantity:", getQuantity());
        if (isUpTrend) {
            await placeOrder("BUY", getQuantity()); // 开多
        } else {
            await placeOrder("SELL", getQuantity()); // 开空
        }
        let trend = isUpTrend ? "up" : "down";
        curGridPoint = getEntryGridPoint(trend, _currentPrice);
        // 记录购买信息
        await recordPurchaseInfo({
            trend,
            side: isUpTrend ? "BUY" : "SELL",
            orderPrice: _currentPrice,
            orderTime: Date.now(),
            entryGridPoint: curGridPoint,
        });

        // 启动定时器
        startConfirmationTimer();
    } catch (error) {
        console.error("initializeTrading header::", error);
        process.exit(1);
    }
};

// 3. 启动定时器
const startConfirmationTimer = (time = confirmNum) => {
    console.log("启动3分钟确认定时器");
    clearTimeout(confirmationTimer);
    confirmationTimer = setTimeout(confirmOrder, time * 60 * 1000);
};

// 清除定时器
const clearAllTimer = () => {
    clearTimeout(confirmationTimer);
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
                await getCurrentPriceEma();
                trend = currentPrice > currentPriceEma ? "up" : "down";
                console.log("价格相等用 ema 指标判断走势", trend);
            }

            if (trend !== purchaseInfo.trend) {
                console.log("价格走势和订单多空状态背离需要反手");
                await reverseTrade();
            } else {
                console.log(
                    `价格走势和订单多空状态一致，无需其他操作, curGridPoint: ${curGridPoint}, repeatSamePointMap::`,
                    repeatSamePointMap,
                );
            }
            // 确认后的 entryGridPoint 是当前最新价不是交易点
            // 确认后，改了entryGridPoint，如果再次返回上次交易点，那么就可以立马做出判断空多
            recordPurchaseInfo({
                entryGridPoint: curGridPoint,
                orderPrice: currentPrice, // 也改掉，避免频繁到达交易点时，价格判断不好做
                trend,
                side: trend === "up" ? "BUY" : "SELL",
            });
            // 确定好方向后，再重新绘制网格
            if (repeatSamePointMap[curGridPoint + ""] >= maxRepeatNum) {
                console.log("根据上一次的curGridPoint重新绘制网格");

                setGridPointsToCurPriceCenter(curGridPoint); // 重新绘制网格
                // 重新绘制网格后，把之前的 entryGridPoint 改掉
                curGridPoint = getEntryGridPoint(trend, currentPrice);
                recordPurchaseInfo({
                    entryGridPoint: curGridPoint,
                });
            }
        } else {
            initializeTrading();
        }
        startConfirmationTimer();
    } catch (error) {
        console.error("confirmOrder error::", error);
        process.exit(1);
    }
};

// 初始化
const setInitData = (orderDetail) => {
    let { positionAmt, entryPrice, unRealizedProfit } = orderDetail;
    entryPrice = Number(entryPrice);
    // unRealizedProfit 为实现盈亏
    // positionAmt: '2.0', // 头寸数量，符号代表多空方向, 正数为多，负数为空
    const quantity = Number(positionAmt);
    const side = quantity > 0 ? "BUY" : "SELL";
    let trend = side === "BUY" ? "up" : "down";
    curGridPoint = getEntryGridPoint(trend, entryPrice);
    store = {
        ...store,
        origQty: quantity,
        side,
    };
    recordPurchaseInfo({
        orderTime: Date.now(),
        orderPrice: entryPrice,
        side,
        trend,
        entryGridPoint: curGridPoint,
    });
    console.log(`setInitData初始化数据完成 store:`, store, "purchaseInfo:", purchaseInfo);
    // 启动定时器
    startConfirmationTimer();
};

// 5. 启动交易
const startTrading = async () => {
    try {
        await getServerTimeOffset(); // 同步服务器时间
        await getCurrentPrice(); // 获取当前价格
        if (!currentPrice) {
            console.log("没有获取到价格。。。");
            process.exit(1);
        }
        setGridPointsToCurPriceCenter(currentPrice); // 绘制网格
        await getHistoryClosePrices(); // 初始化 historyClosePrices
        refreshData(); // 持续更新 historyClosePrices
        if (!invariableBalance) {
            await getContractBalance(); // 获取当前合约账户中的 USDT
        }

        // 初始化 store / purchaseInfo
        const positionDetail = await getPositionRisk(); // 获取当前仓位信息
        console.log("🚀 ~ file: gridBot6-1.js:886 ~ startTrading ~ positionDetail:", positionDetail);

        if (positionDetail) setInitData(positionDetail);

        // 如果还没仓位要加仓
        if (!purchaseInfo.orderPrice) {
            console.log("还没仓位要加仓");
            await getCurrentPrice(); // 再获取一次价格
            await initializeTrading(); // 初始交易
        }

        timeToGridPoint = Date.now();

        await startWebSocket(); // 启动websocket，开始跑网格
    } catch (error) {
        console.error("startTrading Error:", error);
        process.exit(1);
    }
};
// 获取下单量
const getQuantity = () => {
    return Math.round((availableMoney * leverage) / currentPrice); // 下单量 >>>>
};
// 到达交易点
const gridPointTrading = async () => {
    clearAllTimer(confirmationTimer); // 凡是经过交易点，立马取消所有定时器
    // 到达不同网格交易点或者还没到过任何交易点，先不平仓好一点更快市场瞬息万变，需要快
    if (purchaseInfo.entryGridPoint !== curGridPoint) {
        console.log("不同交易点：preGridPoint, curGridPoint::", purchaseInfo.entryGridPoint, curGridPoint);
        // >>>>>>
        // sum +=
        //     (((Math.abs(currentPrice - purchaseInfo.orderPrice) / purchaseInfo.orderPrice) * 10) / purchaseInfo.orderPrice) *
        //     10 *
        //     leverage *
        //     (1 - 0.001);
        // 上升趋势
        if (purchaseInfo.entryGridPoint < curGridPoint) {
            console.log("🚀 ~ 现在:👆👆👆👆👆👆👆👆");
            // 如果当前价格趋势是上升，之前开的多单则只改entryGridPoint，若之前开的空单则须反手
            if (purchaseInfo.trend === "down") {
                console.log("原来为:", purchaseInfo.trend);
                // 价格走势和订单多空状态背离
                await reverseTrade();
            } else {
                // 没有背离就顺手操作
                await forehandTrade();
            }
        }
        // 下降趋势
        if (purchaseInfo.entryGridPoint > curGridPoint) {
            console.log("🚀 ~ 现在:👇👇👇👇👇👇👇👇");
            // 如果当前价格趋势是下降，之前开的空单则只改entryGridPoint，若之前开的多单则须反手
            if (purchaseInfo.trend === "up") {
                console.log("原来为:", purchaseInfo.trend);
                // 价格走势和订单多空状态背离
                await reverseTrade();
            } else {
                // 没有背离就顺手操作
                await forehandTrade();
            }
        }
        // 每次到达交易点必须修改 entryGridPoint orderPrice
        recordPurchaseInfo({ entryGridPoint: curGridPoint });
        // 到达新的交易点请空 repeatSamePointMap
        repeatSamePointMap = {};

        // 频繁到达新的交易点，扩大间距，重新绘制网格
        if (timeToGridPoint) {
            const timeDis = Date.now() - timeToGridPoint;
            if (timeDis > 90000 && timeDis <= 300000) {
                timeToGridPoint = Date.now();
                console.log("5分钟就到达交易点，间距太小，重新绘制网格");
                let resH = _gridHight + gridHight / 5;
                if (resH > gridHight * 1.6) {
                    console.log("间距最大为：gridHight * 1.6，当前已经最大");
                } else {
                    _gridHight = resH;
                    console.log("网格间距增大，当前hight：", _gridHight);
                    setGridPointsToCurPointBorder(curGridPoint); // 重新绘制网格
                }
            }
        }
    } else {
        // 避免反手亏太多，重新绘制网格
        recordSamePoint(curGridPoint); // 记录重复进入网格
    }
    // 经过交易点之后（不管是否反手或者下单）都需要3 分钟后确认
    startConfirmationTimer();
};
// 重复到达上一次交易点，重新绘制网格
const recordSamePoint = (point) => {
    const key = point + "";
    if (!repeatSamePointMap[key]) {
        repeatSamePointMap[key] = 1;
    } else {
        repeatSamePointMap[key] += 1;
    }

    console.log("重复到达交易点", point, "repeatSamePointMap::", repeatSamePointMap);
};
// 价格空间上保证订单少亏损（买错了要反手）
const checkOrderBySpace = async () => {
    if (isLoading()) return; // 如果正在执行下单/平仓就直接return
    const isOut = Math.abs(currentPrice - purchaseInfo.orderPrice) > _gridHight / needSellPercent;
    if (isOut) {
        // 开多，开错了 / 开空，开错了，并且超过格子的三分之一
        await getCurrentPriceEma(); // 获取ema
        let isUp = currentPrice > currentPriceEma;
        const isRight = isUp ? purchaseInfo.side === "BUY" : purchaseInfo.side === "SELL";
        if (!isRight) {
            console.log("价格空间上保证订单少亏损--买错了要反手::", currentPrice, purchaseInfo);
            await reverseTrade(); // 反手
            startConfirmationTimer();
        } else {
            // console.log("价格空间上保证订单少亏损--没有买错：：isOut currentPrice , purchaseInfo", isOut, currentPrice, purchaseInfo);
        }
    }
};

// 测试>>>> 插针
// let isNeedle = false;
// let needleRate = gridHi g h t * 10;
// setInterval(() => {
//     setTimeout(() => {
//         isNeedle = true;
//         setTimeout(() => {
//             needleRate = 0 - needleRate;
//             setTimeout(() => {
//                 needleRate = 0;
//                 isNeedle = false;
//             }, 20000);
//         }, 20000);
//     }, 20000);
// }, 5 * 60 * 1000);

// 跑网格
const startRunGrid = async () => {
    // 插针时速度很快可能会垮多个格子，如果是向上插针倒着找，如果是向下插针顺着找
    const points = currentPrice > purchaseInfo.orderPrice ? [...gridPoints].reverse() : [...gridPoints];
    let _curGridPoint = points.find((point) => {
        return (prePrice <= point && point <= currentPrice) || (prePrice >= point && point >= currentPrice);
    });
    // 价格到了某个网格交易点
    if (_curGridPoint) {
        curGridPoint = _curGridPoint;
        console.log("到达交易点 curGridPoint:", curGridPoint, "立马执行判断+交易");
        await gridPointTrading(); // 不防抖，一般都是跨交易点，没有那么频繁，频繁的是相同交易点在 toSamePoint 中处理
        timeToGridPoint = Date.now();
    } else {
        if (timeToGridPoint) {
            // 20分钟都未到达新的交易点，缩短间距，重新绘制网格
            if (Date.now() - timeToGridPoint > 1200000) {
                timeToGridPoint = Date.now();
                console.log("20分钟都未到达交易点，间距太大，重新绘制网格");
                let resH = _gridHight - gridHight / 5;
                if (resH < gridHight * 0.4) {
                    console.log("间距最小为：gridHight * 0.4，当前已经最小");
                } else {
                    _gridHight = resH;
                    console.log("网格间距减小，当前hight：", _gridHight);
                    setGridPointsToCurPointBorder(curGridPoint); // 重新绘制网格
                }
            }
        }
    }
    // 空间上的限制：如果价格反向超出了订单价格的三分之一个格子，也需要反手操作
    // await realCheckOrderBySpace();
};

// socket 更新很快需要节流处
// const realCheckOrderBySpace = throttle(checkOrderBySpace, 1000);
// const realStartRunGrid = throttle(startRunGrid, 1000, true);

// WebSocket 事件
const startWebSocket = async () => {
    console.log("🚀 startWebSocket~~~~~");
    // 添加 'open' 事件处理程序
    ws.on("open", async (data) => {
        console.log("WebSocket connection opened.", data);
    });

    let time = Date.now();
    // 添加 'message' 事件处理程序
    ws.on("message", async (data) => {
        const trade = JSON.parse(data);

        prePrice = currentPrice; // 不能删除
        currentPrice = Number(trade.p) || 0;
        // 测试插针 >>>>>>>
        // if (sum <= -10) {
        //     console.log("爆仓～");
        // }
        // if (isNeedle) {
        //     currentPrice += needleRate * Math.random();
        // } else {
        //     currentPrice = trade.p;
        // }
        // console.log(
        //     "🚀 ~ file: gridBot5.js:366 ~ ws.on ~ symbol: currentPrice, sum",
        //     trade.s,
        //     ": ",
        //     currentPrice,
        //     trade,
        // );

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
        // 重连
        // setTimeout(() => {
        //     console.log("尝试重新连接...");
        //     startWebSocket();
        // }, 5000); // 5 秒后重连，可以根据实际情况调整
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
    await getServerTimeOffset();
    await getPositionRisk();
    // await getCurrentTrade(2);
    // createLogs();
    // startWebSocket();
    // await getAllOrders(1);
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
