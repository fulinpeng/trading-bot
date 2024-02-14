// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const WebSocket = require("ws"); // WebSocket库
const { HttpsProxyAgent } = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");
// const Binance = require("node-binance-api");
const fs = require("fs");
const { debounce, throttle, getDate } = require("./utils/functions.js");

const SYMBOL = "seiusdt"; // 交易对
const base = "USDT";
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
// const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@aggTrade`);

let sum = 0;
let availableMoney = 5.1; // 可用的USDT数量
const invariableBalance = true; // 是否使用固定金额建仓，为true时，availableMoney为必填
let leverage = 2; // 杠杆倍数
const priceScale = 0.2; // 价格缩放区间（0.05表示当前价格上下浮动5%）
let gridCount = 55; // 多少个格子
let gridHight = 0; // 格子高度
const needSellPercent = 4; // 为 3 表示买反了并超过三分之一个格子就需要反手
const PERCENTAGE_THRESHOLD = 0.00011; // Math.abs(103.026-103.025) <= 0.0011 ==> 可以匹配（103.024～103.026），多一个1是因为有的数据加起来是无限小数
let currentPrice = 0; // 记录当前价格
let gridPoints = []; // 网格每个交易点
const EMA_PERIOD = 2; // EMA计算周期
let currentPriceEma; // 当前价格的EMA值
let confirmationTimer = null; // 订单确认定时器
let serverTimeOffset = 0; // 服务器时间偏移
let confirmNum = 3; // 下单后确认时间（分钟）
let debounceDelay = 1; // 交易点震荡时间
let store = {}; // 当前仓位信息
const klineStage = 1; //k线级别
let historyClosePrices = []; // 历史收盘价，用来计算EMA
let curGridPoint = undefined; // 当前网格
// 最新交易信息
let purchaseInfo = {
    trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
    side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
    orderPrice: 0,
    orderTime: 0,
    entryGridPoint: currentPrice,
};
const logsFolder = "logs7";
const errorsFolder = "errors7";

// 正在操作中
let loadingPlaceOrder = false; // 下单
let loadingCloseOrder = false; // 平仓
const isLoading = () => {
    return loadingPlaceOrder || loadingCloseOrder;
};

// 获取服务器时间偏移
const getServerTimeOffset = async () => {
    try {
        console.log("获取服务器时间偏移");
        // const response = await axiosInstance.get(`${fapi}/v1/time`); // test
        const response = await axiosInstance.get(`${api}/v3/time`);
        const serverTime = response.data.serverTime;
        const localTime = Date.now();
        serverTimeOffset = serverTime - localTime;
        console.log(" Server time offset:", serverTimeOffset);
    } catch (error) {
        console.error("getServerTimeOffset Error fetching server time:", error);
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
        console.error("getKLineData Error fetching K-line data:", error);
        // throw error;
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
const refreshHistoryClosePrices = () => {
    setTimeout(() => {
        historyClosePrices.shift();
        historyClosePrices.push(currentPrice);
    }, klineStage * 60 * 1000);
};

// 网格交易点计算
const calculateGridPoints = async () => {
    try {
        const response = await axios.get(`${api}/v3/ticker/24hr?symbol=${B_SYMBOL}`);
        const ticker = response.data;

        const lowPrice = parseFloat(ticker.lowPrice);
        const highPrice = parseFloat(ticker.highPrice);

        const low = lowPrice * (1 - priceScale);
        const high = highPrice * (1 + priceScale);

        gridHight = (high - low) / gridCount;
        console.log("🚀 ~ file: gridBot7.js:191 ~ calculateGridPoints ~ gridHight:", gridHight);
        gridPoints = Array.from({ length: gridCount + 1 }, (_, index) => low + index * gridHight).map(
            (n) => Math.round(n * 10000000) / 10000000,
        );

        console.log("Grid Points:", gridPoints);
    } catch (error) {
        console.error("Error fetching initial data:", error);
    }
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
        entryPrice: currentPrice,
    };
    // {
    //     orderId: 1044515541,
    //     symbol: "JOEUSDT",
    //     status: "FILLED",
    //     clientOrderId: "fewvNUnoWCisDv8iUiX4tP",
    //     price: "0.0000000",
    //     avgPrice: "0.4566000",
    //     origQty: "13", // 原始委托数量
    //     executedQty: "13", // 成交量
    //     cumQuote: "5.9358000", // 成交金额
    //     timeInForce: "GTC",
    //     type: "MARKET",
    //     reduceOnly: false,
    //     closePosition: false,
    //     side: "SELL",
    //     positionSide: "BOTH",
    //     stopPrice: "0.0000000",
    //     workingType: "CONTRACT_PRICE",
    //     priceProtect: false,
    //     origType: "MARKET",
    //     priceMatch: "NONE",
    //     selfTradePreventionMode: "NONE",
    //     goodTillDate: 0,
    //     time: 1706776951166,
    //     updateTime: 1706776951166,
    // };
};
// 获取持仓风险
const getPositionRisk = async () => {
    const timestamp = Date.now() + serverTimeOffset;
    const params = {
        symbol: B_SYMBOL, // 交易对
        timestamp,
        recvWindow: 6000,
    };

    const signedParams = signRequest(params);
    const response = await axiosInstance.get(`${fapi}/v2/positionRisk?${signedParams}`);
    console.log("🚀 ~ file: gridBot6.js:276 ~ getPositionRisk ~ response:", response);
    // [
    //     {
    //         symbol: "JOEUSDT",
    //         positionAmt: "-22",
    //         entryPrice: "0.4615", // 开仓价
    //         breakEvenPrice: "0.46126925",
    //         markPrice: "0.46290000",
    //         unRealizedProfit: "-0.03080000",
    //         liquidationPrice: "0.67868777", // 强平价
    //         leverage: "2",
    //         maxNotionalValue: "3000000",
    //         marginType: "isolated",
    //         isolatedMargin: "5.04595366",
    //         isAutoAddMargin: "false",
    //         positionSide: "BOTH",
    //         notional: "-10.18380000",
    //         isolatedWallet: "5.07675366",
    //         updateTime: 1706849979117,
    //         isolated: true,
    //         adlQuantile: 2,
    //     },
    // ];
    return response.data || [];
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
const getCurrentOpenOrder = async (limit) => {
    const timestamp = Date.now() + serverTimeOffset;
    const params = {
        symbol: B_SYMBOL, // 交易对
        timestamp,
        limit,
        recvWindow: 6000,
    };

    const signedParams = signRequest(params);
    const response = await axiosInstance.get(`${fapi}/v1/openOrder?${signedParams}`);
    console.log("🚀 ~ file: gridBot6.js:276 ~ getCurrentTrade ~ response:", response);

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
        console.error("Error for getContractBalance information:", error);
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
        console.log("gridBot6.js:323 ~ getCurrentPrice ~ error:", error);
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
    console.log("🚀 ~ file: gridBot6.js:269 ~ placeOrder ~ side, quantity:", side, quantity);
    loadingPlaceOrder = true;
    // await getContractBalance(); // 获取当前合约账户中的 USDT 余额
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

        const signedParams = signRequest(params);
        const response = await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
        console.log(
            `Order placed - Symbol: ${B_SYMBOL}, Side: ${side}, Quantity: ${quantity}`,
            "orderId:",
            response.data.orderId,
        );
        // 如果 下单（开多操作/开空操作） 成功需要更新store
        if (response.data && response.data.orderId) {
            store = {
                ...(response.data || {}),
                entryPrice: tempPrice,
            }; // >>> 这里是否要优化，因为没有 下单返回的没有 executedQty
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
            // store置空
            store = { ...store, entryPrice: tempPrice };
        }
        loadingPlaceOrder = false;
    } catch (error) {
        console.error("Error placeOrder order:", error);
        loadingPlaceOrder = false;
        // throw error;
    }
};
// 平仓
const closeOrder = async (side) => {
    loadingCloseOrder = true;
    try {
        await getStoreInfo(store.orderId);
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
        console.error("Error closeOrder order:", error);
        loadingCloseOrder = false;
    }
};

// 反手交易
const reverseTrade = async () => {
    console.log("反手交易~~~~~");
    // await getContractBalance(); // 获取当前合约账户中的 USDT 余额
    try {
        // 如果有开多的仓位，执行反手操作
        if (store.side === "BUY") {
            // 测试>>>>>
            // sum +=
            //     (Math.abs(currentPrice - store.entryPrice) / store.entryPrice) *
            //     availableMoney *
            //     leverage *
            //     (1 - 0.001);

            // 先平多
            await closeOrder("SELL");
            console.log("平多完成");

            // 再开空
            await placeOrder("SELL", getQuantity()); // 调整开仓数量
            console.log("开空完成");
            recordPurchaseInfo({
                trend: "down",
                side: "SELL",
                orderPrice: currentPrice,
                orderTime: Date.now(),
            });
        }
        // 如果有开空的仓位，执行反手操作
        else if (store.side === "SELL") {
            // 测试>>>>>
            // sum +=
            //     (Math.abs(currentPrice - store.entryPrice) / store.entryPrice) *
            //     availableMoney *
            //     leverage *
            //     (1 - 0.001);
            // 先平空
            await closeOrder("BUY");
            console.log("平空完成");

            // 再开多
            await placeOrder("BUY", getQuantity()); // 调整开仓数量
            console.log("开多完成");
            recordPurchaseInfo({
                trend: "up",
                side: "BUY",
                orderPrice: currentPrice,
                orderTime: Date.now(),
            });
        } else {
            // >>>>>>
            // sum +=
            //     (Math.abs(currentPrice - store.entryPrice) / store.entryPrice) *
            //     availableMoney *
            //     leverage *
            //     (1 - 0.001);
            console.log("无仓位，无需执行反手操作。");
        }
    } catch (error) {
        console.error("reverseTrade Error executing reverse trade:", error);
        // throw error;
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

// 1. 启动时通过EMA判断价格走势，开多或开空，并记录'购买信息'
const initializeTrading = async () => {
    try {
        await getCurrentPrice(); // 下面依赖价格
        await getCurrentPriceEma(); // 获取当前价格的EMA值
        const isUpTrend = currentPrice > currentPriceEma; // 判断价格趋势
        console.log("🚀 ~ file: gridBot6.js:343 ~ initializeTrading ~ quantity:", getQuantity());
        if (isUpTrend) {
            await placeOrder("BUY", getQuantity()); // 开多
        } else {
            await placeOrder("SELL", getQuantity()); // 开空
        }

        // 记录购买信息
        await recordPurchaseInfo({
            trend: isUpTrend ? "up" : "down",
            side: isUpTrend ? "BUY" : "SELL",
            orderPrice: currentPrice,
            orderTime: Date.now(),
            entryGridPoint: currentPrice,
        });

        // 启动定时器
        startConfirmationTimer();
    } catch (error) {
        console.error("initializeTrading Error:", error);
        // throw error;
    }
};

// 3. 启动定时器
const startConfirmationTimer = () => {
    console.log("重新启动3分钟确认定时器");
    clearTimeout(confirmationTimer);
    confirmationTimer = setTimeout(confirmOrder, confirmNum * 60 * 1000);
};

// 4. 确认订单
const confirmOrder = async () => {
    console.log("3分钟时间到，确认订单:");
    try {
        if (purchaseInfo.trend) {
            // >>>>>> 这里需要四舍五入来判断一个范围
            let trend = "";
            if (currentPrice > purchaseInfo.orderPrice) {
                // 当前价格大于上次交易价，走势为：上升
                trend = "up";
                console.log("当前价格大于上次交易价，走势为：上升", trend);
            } else if (currentPrice < purchaseInfo.orderPrice) {
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
                console.log("价格走势和订单多空状态背离，需要反手并再次重置3分钟确认定时器");
                // 价格走势和订单多空状态背离
                await reverseTrade();
                recordPurchaseInfo({ entryGridPoint: currentPrice });
                startConfirmationTimer();
            } else {
                console.log("价格走势和订单多空状态一致，无需其他操作");
            }
            // startConfirmationTimer(); // 每隔3分钟会检测一次是否反手是否需要????>>>>>
        } else {
            initializeTrading();
        }
    } catch (error) {
        console.error("confirmOrder Error:", error);
    }
};

// 全部平仓
const closeAllPositions = async () => {
    try {
        let side = "";
        if (store.side === "BUY") {
            // 平多
            side = "SELL";
        } else if (store.side === "BUY") {
            // 平空
            side = "BUY";
        } else {
            console.log("closeAllPositions 无仓位，无需平仓。");
        }
        await placeOrder(side, Math.abs(store.origQty)); // 已买入的标的
        console.log("closeAllPositions 平多完成");
        store = {};
        recordPurchaseInfo({ trend: "" });
    } catch (error) {
        console.error("closeAllPositions Error closing positions:", error);
        // throw error;
    }
};

// 5. 启动交易
const startTrading = async () => {
    try {
        await getServerTimeOffset(); // 同步服务器时间
        await calculateGridPoints(); // 计算网格交易点
        await getHistoryClosePrices(); // 初始化 historyClosePrices
        refreshHistoryClosePrices(); // 持续更新 historyClosePrices
        return;
        if (!invariableBalance) {
            await getContractBalance(); // 获取当前合约账户中的 USDT
        }

        // 先判断是否有订单
        // const oldOrder = await getPositionRisk()[0];

        // await getCurrentPrice(); // 下面依赖价格
        // // 如果还没仓位要加仓
        // if (false) {
        //     // 强平 < 开仓
        //     const isUpTrend = oldOrder.liquidationPrice < oldOrder.entryPrice;
        //     // 记录购买信息
        //     recordPurchaseInfo({
        //         trend: isUpTrend ? "up" : "down",
        //         side: isUpTrend ? "BUY" : "SELL",
        //         orderPrice: Number(oldOrder.entryPrice),
        //         orderTime: Date.now(),
        //         entryGridPoint: Number(oldOrder.entryPrice),
        //     });
        //     // 记录store
        // } else {
        //     console.log("还没仓位要加仓");
        //     await initializeTrading(); // 初始交易
        // }
        await startWebSocket(); // 启动websocket，开始跑网格
    } catch (error) {
        console.error("startTrading Error:", error);
    }
};
// 获取下单量
const getQuantity = () => {
    return Math.round((availableMoney * leverage) / currentPrice) || 11; // 下单量 >>>>
};
// 到达交易点
const entryGridPoint = async () => {
    // await getCurrentPriceEma(); // 获取当前价格的EMA值 >>>>测试才开启
    // console.log(
    //     `先获取当前价格的EMA值，但是并不使用它，只是测试用 Current Price: ${currentPrice}, EMA: ${currentPriceEma}, Grid Point: ${curGridPoint}`,
    // );
    // 到达不同网格交易点或者还没到过任何交易点，先不平仓好一点更快市场瞬息万变，需要快
    if (purchaseInfo.entryGridPoint !== curGridPoint) {
        // >>>>>>
        // sum +=
        //     (((Math.abs(currentPrice - store.entryPrice) / store.entryPrice) * 10) / store.entryPrice) *
        //     10 *
        //     leverage *
        //     (1 - 0.001);
        if (curGridPoint > purchaseInfo.entryGridPoint) {
            // 如果当前价格趋势是上升，之前开的多单则只改entryGridPoint，若之前开的空单则须反手
            console.log("🚀 ~ :👆👆👆👆👆👆👆👆");
            if (purchaseInfo.trend === "down") {
                // 价格走势和订单多空状态背离
                await reverseTrade();
            }
        } else {
            // 如果当前价格趋势是下降，之前开的空单则只改entryGridPoint，若之前开的多单则须反手
            console.log("🚀 ~ :👇👇👇👇👇👇👇👇");
            if (purchaseInfo.trend === "up") {
                // 价格走势和订单多空状态背离
                await reverseTrade();
            }
        }
    } else {
        // 重复到达上一次交易点，不做平仓操作，也不根据当前价格/ema判断走势，直接重置 3 分钟确认定时器
        console.log(`🚀 ~ 重复到达交易点: ${curGridPoint}:～～～～～～～～～`);
        // 这里不需要任何操作
    }
    // 每次到达交易点必须修改 entryGridPoint orderPrice
    recordPurchaseInfo({ entryGridPoint: curGridPoint, orderPrice: currentPrice });
    // 经过交易点之后（不管是否反手或者下单）都需要3 分钟后确认
    startConfirmationTimer();
};
// 插针/横盘时快速到达交易点（出交易点时才触发交易操作）
const realEntryGridPoint = debounce(entryGridPoint, 2000, false);
// 价格空间上保证订单少亏损（买错了要反手）
const checkOrderBySpace = async () => {
    const isOut = Math.abs(currentPrice - purchaseInfo.orderPrice) > gridHight / needSellPercent;
    // 开多，开错了 / 开空，开错了，并且超过格子的三分之一
    const isWrong =
        purchaseInfo.side === "BUY"
            ? currentPrice < purchaseInfo.orderPrice && isOut
            : currentPrice > purchaseInfo.orderPrice && isOut;
    if (!isLoading() && isWrong) {
        console.log("价格空间上保证订单少亏损--买错了要反手::", currentPrice, purchaseInfo);
        await reverseTrade(); // 反手
        recordPurchaseInfo({ entryGridPoint: currentPrice });
        startConfirmationTimer();
    } else {
        // console.log("价格空间上保证订单少亏损--没有买错：：isOut currentPrice , purchaseInfo", isOut, currentPrice, purchaseInfo);
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
    console.log("currentPrice:", currentPrice);

    // 如果还没仓位要加仓
    if (!purchaseInfo.orderPrice) {
        console.log("还没仓位要加仓");
        await initializeTrading(); // 初始交易
    }

    // 插针时速度很快可能会垮多个格子，如果是向上插针倒着找，如果是向下插针顺着找
    const points = currentPrice > purchaseInfo.orderPrice ? [...gridPoints].reverse() : [...gridPoints];
    let _curGridPoint = points.find((point) => {
        return Math.abs(currentPrice - point) <= PERCENTAGE_THRESHOLD;
    });
    // 价格到了某个网格交易点
    if (_curGridPoint) {
        console.log("价格到网格交易点::", _curGridPoint);
        curGridPoint = _curGridPoint;
        // 可能会在短时间内多次触发，所以需要防抖几秒钟（也别设太大，因为插针就很快）
        await realEntryGridPoint();
    }
    // 空间上的限制：如果价格反向超出了订单价格的三分之一个格子，也需要反手操作
    await checkOrderBySpace();
};

// socket 更新很快需要节流处
const realStartRunGrid = throttle(startRunGrid, 1500);

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
        if (!isLoading()) {
            await realStartRunGrid();
            // await startRunGrid();
        }
    });

    // 添加 'close' 事件处理程序
    ws.on("close", (error) => {
        console.log(`WebSocket 关闭: `, error);
        // 重连
        setTimeout(() => {
            console.log("尝试重新连接...");
            startWebSocket();
        }, 5000); // 5 秒后重连，可以根据实际情况调整
    });

    // 添加 'error' 事件处理程序
    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        // 在这里添加处理错误的逻辑
    });
};

// logs
const createLogs = () => {
    // 创建 logs 文件夹
    if (!fs.existsSync(logsFolder)) {
        fs.mkdirSync(logsFolder);
    }

    // 重定向 console.log 到文件
    const logStream = fs.createWriteStream(`${logsFolder}/${getDate()}.log`, { flags: "a" });
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
    const errorStream = fs.createWriteStream(`${errorsFolder}/${getDate()}.error`, { flags: "a" });
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
    // await getPositionRisk();
    // await getCurrentTrade(2);
    // createLogs();
    startWebSocket();
};
// test();
