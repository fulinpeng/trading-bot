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
const config = require("./config.js");

const {
    SYMBOL,
    base,
    availableMoney,
    invariableBalance,
    leverage,
    repeatNum,
    needSellPercent,
    EMA_PERIOD,
    klineStage,
    logsFolder,
    errorsFolder,
} = config["bot6_4"];

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
let currentPriceEma; // 当前价格的EMA值
let confirmationTimer = null; // 订单确认定时器
let serverTimeOffset = 0; // 服务器时间偏移
let confirmNum = 3; // 下单后确认时间（分钟）
let store = {}; // 当前仓位信息
let historyClosePrices = []; // 历史收盘价，用来计算EMA
let timeToGridPoint = 0; // 到达交易点时间

let emaArr = [];
let preRefreshTime = Date.now();
const klineTimeRange = klineStage * 60 * 1000;

// 日志
let logStream = null;
let errorStream = null;

// 最新交易信息
let purchaseInfo = {
    trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
    side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
    orderPrice: 0,
    orderTime: 0,
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

        consolePrice();
        if (nowTime - preRefreshTime >= klineTimeRange) {
            preRefreshTime = nowTime;

            // 刷新 收盘价格
            historyClosePrices.shift();
            historyClosePrices.push(currentPrice);

            console.log("封盘时间到，当前currentPrice:", currentPrice, "historyClosePrices:", historyClosePrices);

            setTimeout(() => {
                setEmaArr(historyClosePrices, EMA_PERIOD);
                judgeAndTrading();
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
    emaArr = [calculateEMA(prices, period1), calculateEMA(prices, period2)];
    console.log("🚀 ~ file: gridBot6-4.js:528 ~ setEmaArr ~ emaArr:", emaArr);
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
    console.log("🚀 ~ 开始反手");
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
            });
        } else {
            console.log("无仓位，就新开一个仓位");
            await initializeTrading();
        }
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

// 1. 启动时通过EMA判断价格走势，开多或开空，并记录'购买信息'
const initializeTrading = async () => {
    try {
        if (!emaArr.length) throw new Error("emaArr 为空，请重新启动");
        const isUpTrend = emaArr[0] > emaArr[1]; // 判断价格趋势
        console.log("🚀 ~ file: gridBot6.js:343 ~ initializeTrading ~ quantity:", getQuantity());
        if (isUpTrend) {
            await placeOrder("BUY", getQuantity()); // 开多
        } else {
            await placeOrder("SELL", getQuantity()); // 开空
        }
        let trend = isUpTrend ? "up" : "down";
        // 记录购买信息
        await recordPurchaseInfo({
            trend,
            side: isUpTrend ? "BUY" : "SELL",
            orderPrice: currentPrice,
            orderTime: Date.now(),
        });
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
const setInitData = (orderDetail) => {
    let { positionAmt, entryPrice, unRealizedProfit } = orderDetail;
    entryPrice = Number(entryPrice);
    // unRealizedProfit 为实现盈亏
    // positionAmt: '2.0', // 头寸数量，符号代表多空方向, 正数为多，负数为空
    const quantity = Number(positionAmt);
    const side = quantity > 0 ? "BUY" : "SELL";
    let trend = side === "BUY" ? "up" : "down";
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
    });
    // 更新完信息，需要重新判断订单方向走势是否符合当前走势
    judgeAndTrading();
    console.log(`setInitData初始化数据完成 store:`, store, "purchaseInfo:", purchaseInfo);
};

// 5. 启动交易
const startTrading = async () => {
    try {
        await startWebSocket(); // 启动websocket更新价格
        await getServerTimeOffset(); // 同步服务器时间
        await getCurrentPrice(); // 获取当前价格
        await getHistoryClosePrices(); // 初始化 historyClosePrices
        setEmaArr(historyClosePrices, EMA_PERIOD);

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
            await getCurrentPrice(); // 获取当前价格
            await initializeTrading(); // 初始交易
        }
        refreshHistoryClosePrices();
    } catch (error) {
        console.error("startTrading Error:", error);
        process.exit(1);
    }
};
// 获取下单量
const getQuantity = () => {
    return Math.round((availableMoney * leverage) / currentPrice); // 下单量 >>>>
};
// 到达1分钟，判断+交易
const judgeAndTrading = async () => {
    let isUp = emaArr[0] > emaArr[1];
    // 上升趋势
    if (isUp) {
        console.log("🚀 ~ 现在:👆👆👆👆👆👆👆👆");
        // 如果当前价格趋势是上升，若之前开的空单则须反手
        if (purchaseInfo.trend === "down") {
            console.log("原来为:", purchaseInfo.trend);
            // 价格走势和订单多空状态背离
            await reverseTrade();
        } else {
            // 没有背离就看看是否有订单，如果没得要怎么办
            console.log("订单空多情况和市场走势一致，无需操作");
        }
    } else {
        console.log("🚀 ~ 现在:👇👇👇👇👇👇👇👇");
        // 如果当前价格趋势是下降，若之前开的多单则须反手
        if (purchaseInfo.trend === "up") {
            console.log("原来为:", purchaseInfo.trend);
            // 价格走势和订单多空状态背离
            await reverseTrade();
        } else {
            // 没有背离就看看是否有订单，如果没得要怎么办
            console.log("订单空多情况和市场走势一致，无需操作");
        }
    }
};

const consolePrice = throttle(() => {
    console.log("currentPrice:", currentPrice);
}, 3000);
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
        // 更新价格
        currentPrice = Number(trade.p) || 0;
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
