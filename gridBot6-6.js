// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const WebSocket = require("ws"); // WebSocket库
const { HttpsProxyAgent } = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");
// const Binance = require("node-binance-api");
const fs = require("fs");
const { debounce, throttle, getDate, hasUpDownVal, calculateAverage } = require("./utils/functions.js");
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
} = config["bot6_6"];

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
let timeToGridPoint = 0; // 到达交易点时间
let tradingDatas = {}; // 订单数据
let allPositionDetail = {}; // 当前仓位信息

// 这些指标，都不能预测，都马后炮
const threshold = 0.0001; // 阈值
const rsiPeriod = 12; // RSI计算周期
const overboughtThreshold = 79.5;
const oversoldThreshold = 20.5;
const rsiGap = 10;

let rsiArr = [];
let ema1Arr = [];
let ema2Arr = [];
let ema3Arr = [];
let preRefreshTime = Date.now();
const klineTimeRange = klineStage * 60 * 1000;

// 日志
let logStream = null;
let errorStream = null;

// // 最新交易信息
// let purchaseInfo = {
//     trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
//     side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
//     orderPrice: 0,
//     orderTime: 0,
// };

// loading
let loadingPlaceOrder = false; // 下单
let loadingCloseOrder = false; // 平仓
let loadingReverseTrade = false; // 反手
let loadingForehandTrade = false; // 顺手
let loadingNewPoints = false; // 修改网格
let onGridPoint = false; // 网格上
const isLoading = () => {
    return loadingPlaceOrder || loadingCloseOrder || loadingReverseTrade || loadingForehandTrade || onGridPoint;
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
    for (let i = rsiPeriod + 1; i <= historyClosePrices.length; i++) {
        const prices = historyClosePrices.slice(0, i);
        rsiArr.push(calculateRSI(prices, rsiPeriod));
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

        consolePrice();
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
                setRsiArr();
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
                    quantity: Math.abs(downData.positionAmt),
                    // orderTime: 0,
                };
            }
            if (Number(downData.positionAmt)) {
                res.down = {
                    trend: "down", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
                    side: "SELL", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
                    orderPrice: Number(upData.entryPrice),
                    quantity: Math.abs(downData.positionAmt),
                    // orderTime: 0,
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
    rsi = calculateRSI(historyClosePrices, rsiPeriod);
    rsiArr.push(rsi);
    console.log("setRsiArr ~ rsiArr:", rsiArr);
};
// 下单（开多操作/开空操作）
const placeOrder = async (side, quantity) => {
    if (loadingPlaceOrder) return;
    console.log("🚀 ~ file: gridBot6.js:269 ~ placeOrder ~ side, quantity:", side, quantity);
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
        console.log("🚀 ~ file: gridBot6.js:267 ~ placeOrder ~ params:", params);
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
            await recordTradingDatas(currentPointIndex, trend, {
                trend,
                side,
                orderPrice: _currentPrice,
                quantity: Math.abs(origQty),
                // orderTime: Date.now(),
            });

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
            if (v.trend == "UP") {
                testMoney += _currentPrice - v.orderPrice;
            } else {
                testMoney += v.orderPrice - _currentPrice;
            }
        });

        console.log("🚀 ~ file: gridBot6-6.js:552 ~ res.map ~ testMoney:", testMoney);

        // 测试 >>>>
        tradingDatas = {};
        testPoints = [];

        console.log("全部仓完成，重新开始");
        await teadeBoth(currentPrice);
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

        console.log("全部仓完成，重新开始");
        await Promise.call([...closeFetchs, teadeBoth(currentPrice)]); // 买/卖 并发
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
        // recordTradingDatas(currentPointIndex, "up", {
        //     trend: "up",
        //     side: "BUY",
        //     orderPrice: _currentPrice,
        //     quantity,
        // });
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
        // recordTradingDatas(currentPointIndex, "down", {
        //     trend: "down",
        //     side: "SELL",
        //     orderPrice: _currentPrice,
        //     quantity,
        // });
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
        // let trend = isUpTrend ? "up" : "down";
        // 记录购买信息
        // await recordTradingDatas(gridCount / 2, trend, {
        //     trend,
        //     side: isUpTrend ? "BUY" : "SELL",
        //     orderPrice: _currentPrice,
        //     orderTime: Date.now(),
        //     quantity: Math.abs(store.origQty),
        // });
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
    currentPointIndex = gridCount / 2;
    if (up) {
        recordTradingDatas(gridCount / 2, "up", up);
    }
    if (down) {
        recordTradingDatas(gridCount / 2, "down", down);
    }
    // 更新完信息，需要重新判断订单方向走势是否符合当前走势
    console.log(`setInitData初始化数据完成 TradingDatas:`, tradingDatas);
};

// 设置网格
const setGridPointsToCurPriceCenter = (_currentPrice) => {
    loadingNewPoints = true;

    // 保证当前价在网格正中间
    // let price = _currentPrice + gridHight * 0.5 * 0.99999999; // 0.999999999是为了让小数位数够多
    // >>>>>测试
    let price = _currentPrice + gridHight * 0.05 * 0.99999999;
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
        else if (!hasUpDownVal(allPositionDetail)) {
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

// 到达交易点
const gridPointTradingBak = async () => {
    onGridPoint = true;
    clearAllTimer(confirmationTimer); // 凡是经过交易点，立马取消所有定时器
    // 这些指标，都不能预测，都马后炮
    const confirmationPeriod = 1; // 确认期
    const threshold = 0.0001; // 阈值
    const rsiPeriod = 14; // RSI计算周期
    const overboughtThreshold = 65;
    const oversoldThreshold = 35;

    const ema1 = calculateEMA([...historyClosePrices, currentPrice], EMA_PERIOD[0]);
    const ema2 = calculateEMA([...historyClosePrices, currentPrice], EMA_PERIOD[1]);
    let isUp = ema1 > ema2;
    // if (tradingDatas[currentPointIndex - 1]) {
    // }

    const rsi = calculateRSI([...historyClosePrices, currentPrice], rsiPeriod);

    // 到了交易点，先把邻居可以平的平掉
    const closeFetch = closeNeighbourOrder();

    const emaGap = Math.abs(ema1 - ema2) > threshold;
    // 上升趋势
    if (isUp) {
        console.log("🚀 ~ 现在:👆👆👆👆👆👆👆👆");
        // console.log("qushi1 :", confirmationUpTrend([...ema1Arr, ema1], [...ema2Arr, ema2], confirmationPeriod));
        // console.log("qushi2 :", rsi, overboughtThreshold);
        // console.log("qushi3 :", Math.abs(ema1 - ema2), threshold);
        // 在确认期内保持一致，RSI不处于超买状态才执行交易
        if (
            confirmationUpTrend([...ema1Arr, ema1], [...ema2Arr, ema2], confirmationPeriod) &&
            rsi < overboughtThreshold &&
            emaGap &&
            currentPrice > ema1 > ema2
        ) {
            console.log("🚀 ~ 确定现在:👆👆👆👆👆👆👆👆");
            // 当前交易点是否有多单，没有就加
            if (!tradingDatas[currentPointIndex] || !tradingDatas[currentPointIndex].up) {
                await Promise.all([
                    closeFetch,
                    teadeBuy(currentPrice, getQuantity(currentPrice)), // 开多
                ]);
            }
        } else {
            console.log("上升趋势不够明显或RSI处于超买状态，双向开单", tradingDatas);
            await teadeBoth(currentPrice);
        }
    } else {
        console.log("🚀 ~ 现在:👇👇👇👇👇👇👇👇");
        // console.log("qushi1 :", confirmationUpTrend([...ema1Arr, ema1], [...ema2Arr, ema2], confirmationPeriod));
        // console.log("qushi2 :", rsi, overboughtThreshold);
        // console.log("qushi3 :", Math.abs(ema1 - ema2), threshold);
        // 在确认期内保持一致，RSI不处于超卖状态才执行交易
        if (
            confirmationDownTrend([...ema1Arr, ema1], [...ema2Arr, ema2], confirmationPeriod) &&
            rsi > oversoldThreshold &&
            emaGap &&
            currentPrice < ema1 < ema2
        ) {
            console.log("🚀 ~ 确定现在:👇👇👇👇👇👇👇👇");
            if (!tradingDatas[currentPointIndex] || !tradingDatas[currentPointIndex].down) {
                const promises = [
                    closeFetch,
                    teadeSell(currentPrice, getQuantity(currentPrice)), // 开多
                ];
                await Promise.all(promises);
            }
        } else {
            console.log("下降趋势不够明显或RSI处于超卖状态，双向开单");
            // 超买/超卖 可能是插针，平掉所有订单 （>>>>>>>>如果格子够小，时间够短，是不是根本不怕插针，只怕vpn不稳定）
            if (rsi >= overboughtThreshold + 10 || rsi <= oversoldThreshold - 10) {
                console.log("可能是插针，平掉所有订单:");
                // 请放开
                // await closeAllPositions();
            } else {
                await teadeBoth(currentPrice);
            }
        }
    }
    onGridPoint = false;
};
const gridPointTrading = async () => {
    onGridPoint = true;
    clearAllTimer(confirmationTimer); // 凡是经过交易点，立马取消所有定时器;

    const ema1 = calculateEMA([...historyClosePrices, currentPrice], EMA_PERIOD[0]);
    const ema2 = calculateEMA([...historyClosePrices, currentPrice], EMA_PERIOD[1]);

    const rsi = calculateRSI([...historyClosePrices, currentPrice], rsiPeriod);
    console.log("gridPointTrading ~ rsi:", rsi);

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

        if (prePointIndex === currentPointIndex) {
            console.log("重复到达交易点：", currentPointIndex, curGridPoint);
            if (
                tradingDatas[currentPointIndex] &&
                tradingDatas[currentPointIndex].up &&
                tradingDatas[currentPointIndex].down
            ) {
                return; // 单子满了，退出函数
            }
        } else {
            testPoints.push(currentPointIndex);
            console.log("到达不同交易点：", currentPointIndex, curGridPoint);

            if (
                Object.values(tradingDatas).reduce((res, { up, down }) => {
                    up && res.push(up);
                    down && res.push(down);
                    return res;
                }, []).length > orderCountLimit
            ) {
                console.log("到达不同交易点，并且：orderCount === orderCountLimit，要全平仓", testPoints, tradingDatas);
                await closeAllPositions(); // 全平仓
                return;
            }
            // 请放开
            // // 异步获取，不影响正常交易
            // setTimeout(() => {
            //     getPositionRisk(); // 获取当前仓位信息
            // }, 6000);
        }
        await gridPointTrading(); // 判断+交易
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
    // 计算价格变动
    for (let i = 1; i < len; i++) {
        changes.push(prices[len - i] - prices[len - i - 1]);
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

const functionChaAvarage = (prices) => {
    // 计算相邻元素之间的差值
    const differences = prices.map((price, index) => {
        if (index > 0) {
            return price - prices[index - 1];
        }
        return 0; // 第一个元素的差值为0
    });

    // 计算差价平均值
    return differences.reduce((sum, diff) => sum + diff, 0) / (prices.length - 1);
};
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
