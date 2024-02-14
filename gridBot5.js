// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const WebSocket = require("ws"); // WebSocket库
const talib = require("ta-lib"); // 技术分析库，用于计算EMA

const SYMBOL = "opusdt"; // 交易对
const B_SYMBOL = SYMBOL.toUpperCase();

const isTest = true; // 将此标志设置为 true 以使用沙盒环境
const apiUrl = isTest ? "https://testnet.binance.vision/api" : "https://api.binance.com/api"; // 根据测试标志选择Binance API的URL

const apiKey = isTest ? process.env.TEST_BINANCE_API_KEY : process.env.BINANCE_API_KEY; // 获取API密钥
const secretKey = isTest ? process.env.TEST_BINANCE_API_KEY : process.env.BINANCE_SECRET_KEY; // 获取API密钥的密钥

// WebSocket连接，用于获取实时交易信息
const ws = new WebSocket(`wss://testnet.binance.vision/ws/${SYMBOL}@trade`);

let availableUSDT = 10; // 可用的USDT数量
let leverage = 3; // 杠杆倍数
const priceScale = 0.05; // 价格缩放区间（0.05表示当前价格上下浮动5%）
let candleHeight = 0; // 蜡烛平均高度
// let timeForFresh = 10000; // 刷新时间间隔
const PERCENTAGE_THRESHOLD = 0.002; // 百分比阈值
let startTime = 0; // 记录启动交易的时间点
let currentPrice = 0; // 记录当前价格
let gridPoints = []; // 网格每个交易点
const candleNum = 3; // 每个网格容纳多少个 candleHeight
const EMA_PERIOD = 3; // EMA计算周期
let currentPriceEma; // 当前价格的EMA值
let confirmationTimer = null; // 订单确认定时器
let serverTimeOffset = 0; // 服务器时间偏移
let confirmNum = 3; // 下单后确认时间（分钟）
let store = {}; // 当前仓位信息
const klineStage = 1; //k线级别
let historyClosePrices = []; // 历史收盘价，用来计算EMA
// 最新交易信息
let purchaseInfo = {
    trend: "", // "UP" for uptrend, "DOWN" for downtrend
    side: "", // "BUY" for long, "SELL" for short
    entryPrice: 0,
    entryTime: 0,
    entryGridPoint: 0,
};
// 获取当前合约账户中的 USDT 余额
const getContractBalance = async () => {
    try {
        const params = {
            recvWindow: 5000,
            timestamp: Date.now() + serverTimeOffset,
        };

        const signedParams = signRequest(params);
        // 获取账户信息
        const response = await axios.get(`${apiUrl}/v3/account${signedParams}`);

        // 提取 USDT 余额
        const balances = response.data.assets;
        const usdtBalance = balances.find((balance) => balance.asset === "USDT");

        if (usdtBalance) {
            availableUSDT = usdtBalance.walletBalance;
            console.log(`Contract USDT Balance: ${usdtBalance.walletBalance}`);
        } else {
            console.log("No USDT balance found in the contract account.");
        }
    } catch (error) {
        console.error("Error fetching contract account information:", error);
    }
};

// 获取服务器时间偏移
const getServerTimeOffset = async () => {
    try {
        const response = await axios.get(`${apiUrl}/v3/time`);
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
    const queryString = Object.entries({ ...params, timestamp, apiKey })
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
    const signature = crypto.createHmac("sha256", secretKey).update(queryString).digest("hex");
    return `${queryString}&signature=${signature}`;
};

// 获取K线数据
const getKLineData = async (symbol, interval, limit) => {
    try {
        const response = await axios.get(`${apiUrl}/v3/klines`, {
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
        throw error;
    }
};

// 计算平均高度
const calculateAverageCandleHeight = (klines) => {
    const candleHeights = klines.map((kline) => {
        const open = kline.open; // 开盘价
        const close = kline.close; // 收盘价
        return Math.abs(close - open); // 实体高度
    });
    const averageHeight = candleHeights.reduce((sum, height) => sum + height, 0) / candleHeights.length;

    return averageHeight;
};

// 获取每个蜡烛的高度
const getAverageHeight = async () => {
    try {
        const klines = await getKLineData(B_SYMBOL, "1m", 50); // 获取K线数据
        const averageHeight = calculateAverageCandleHeight(klines); // 计算平均蜡烛高度
        return averageHeight;
    } catch (error) {
        console.error("getAverageHeight Error fetching initial data:", error);
    }
};

// 获取EMA（指数移动平均线）值
const getHistoryClosePrices = async () => {
    // 在getKLineData方法中获取至少15分钟内的价格数据
    const kLineData = await getKLineData(B_SYMBOL, "1m", 15);
    console.log("🚀 ~ file: gridBot5.js:153 ~ getHistoryClosePrices ~ kLineData:", kLineData);

    // 获取当前时间
    const currentTime = Date.now() + serverTimeOffset;
    // 获取分钟前的时间
    const fifteenMinutesAgo = currentTime - klineStage * 60 * 1000; // 毫秒数
    // 筛选出在15分钟内的价格数据
    historyClosePrices = kLineData
        .filter((data) => data.closeTime >= fifteenMinutesAgo) // closeTime 表示收盘时间
        .map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
};
// 获取EMA（指数移动平均线）值
const getCurrentPriceEma = async () => {
    // 传递至calculateEma函数
    const emaResult = await calculateEma(historyClosePrices, EMA_PERIOD);
    console.log("🚀 ~ file: gridBot5.js:173 ~ getCurrentPriceEma ~ emaResult:", emaResult);
    currentPriceEma = emaResult[0];
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
        const response = await axios.get(`${apiUrl}/v3/ticker/24hr?symbol=${B_SYMBOL}`);
        const ticker = response.data;

        const lowPrice = parseFloat(ticker.lowPrice);
        const highPrice = parseFloat(ticker.highPrice);

        const GRID_SIZE = (highPrice - lowPrice) / (candleHeight * candleNum);
        const low = lowPrice * (1 - priceScale);
        const high = highPrice * (1 + priceScale);

        const interval = (high - low) / GRID_SIZE;
        gridPoints = Array.from({ length: GRID_SIZE }, (_, index) => low + index * interval);

        console.log("Grid Points:", gridPoints);
    } catch (error) {
        console.error("Error fetching initial data:", error.response.data);
    }
};
// 获取当前仓位信息
const getStoreInfo = async () => {
    // 获取当前仓位信息
    const positionResponse = await axios.get(`${apiUrl}/v3/positionRisk?symbol=${B_SYMBOL}`);
    store = positionResponse.data.filter((pos) => pos.symbol === B_SYMBOL)[0];
};
// 计算EMA值
const calculateEma = async (prices, period) => {
    console.log("🚀 ~ file: gridBot5.js:209 ~ calculateEma ~ period:", period);
    // >>>>>>>>>>>>>..没执行，没执行？？？？？？？？⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️
    return new Promise((resolve, reject) => {
        talib.execute(
            {
                name: "EMA",
                startIdx: 0,
                endIdx: prices.length - 1,
                inReal: prices,
                optInTimePeriod: period,
            },
            (err, result) => {
                if (err) {
                    console.log("🚀 ~ file: gridBot5.js:220 ~ returnnewPromise ~ err:", err);
                    reject(err);
                } else {
                    console.log("🚀 ~ file: gridBot5.js:224 ~ returnnewPromise ~ result:", result);
                    resolve(result.result.outReal);
                }
            },
        );
    });
};

// 下单（开多操作/开空操作）
const placeOrder = async (side, quantity) => {
    // await getContractBalance(); // 获取当前合约账户中的 USDT 余额
    try {
        const timestamp = Date.now();
        const params = {
            symbol: B_SYMBOL,
            side,
            type: "MARKET",
            quantity,
            timestamp,
            recvWindow: 5000,
        };

        const signedParams = signRequest(params);
        const response = await axios.post(`https://api.binance.com/api/v3/order?${signedParams}`);
        console.log(`Order placed - Symbol: ${B_SYMBOL}, Side: ${side}, Quantity: ${quantity}`);
        await getStoreInfo(); // 交易完成更新当前仓位信息
        return response.data;
    } catch (error) {
        console.error("Error placing order:", error.response.data);
        throw error;
    }
};

// 反手交易
const reverseTrade = async () => {
    // await getContractBalance(); // 获取当前合约账户中的 USDT 余额
    try {
        // 如果有开多的仓位，执行反手操作
        if (store.positionAmt > 0) {
            // 先平多
            await placeOrder("SELL", Math.abs(store.positionAmt)); // 已买入的标的
            console.log("平多完成");

            // 再开空
            await placeOrder("BUY", getQuantity()); // 调整开仓数量
            console.log("开空完成");
        }
        // 如果有开空的仓位，执行反手操作
        else if (store.positionAmt < 0) {
            // 先平空
            await placeOrder("BUY", Math.abs(store.positionAmt)); // 已买入的标的
            console.log("平空完成");

            // 再开多
            await placeOrder("SELL", getQuantity()); // 调整开仓数量
            console.log("开多完成");
        } else {
            console.log("无仓位，无需执行反手操作。");
        }
    } catch (error) {
        console.error("reverseTrade Error executing reverse trade:", error);
        throw error;
    }
    await getStoreInfo(); // 交易完成更新当前仓位信息
};

// 更新购买信息
const recordPurchaseInfo = (info) => {
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
        await getCurrentPriceEma(); // 获取当前价格的EMA值
        const isUpTrend = currentPrice > currentPriceEma; // 判断价格趋势
        if (isUpTrend) {
            await placeOrder("BUY", getQuantity()); // 开多
        } else {
            await placeOrder("SELL", getQuantity()); // 开空
        }

        // 记录购买信息
        recordPurchaseInfo({
            trend: isUpTrend ? "up" : "down",
            orderType: isUpTrend ? "BUY" : "SELL",
            orderPrice: currentPrice,
            orderTime: new Date(),
            tradingPoint: null,
        });

        // 启动定时器
        startConfirmationTimer();
    } catch (error) {
        console.error("initializeTrading Error:", error);
    }
};

// 3. 启动定时器
const startConfirmationTimer = () => {
    clearTimeout(confirmationTimer);
    confirmationTimer = setTimeout(confirmOrder, confirmNum * 60 * 1000);
};

// 4. 确认订单
const confirmOrder = async () => {
    try {
        await getCurrentPriceEma();
        const isUpTrend = currentPrice > currentPriceEma;

        if ((isUpTrend && purchaseInfo.trend === "down") || (!isUpTrend && purchaseInfo.trend === "up")) {
            // 价格走势和订单多空状态背离
            await reverseTrade();
            recordPurchaseInfo({ ...purchaseInfo, tradingPoint: null });
            startConfirmationTimer();
        }
    } catch (error) {
        console.error("confirmOrder Error:", error);
    }
};

// 5. 启动交易
const startTrading = async () => {
    try {
        await getServerTimeOffset(); // 同步服务器时间
        candleHeight = await getAverageHeight(); // 获取平均蜡烛高度
        console.log("🚀 ~ startTrading ~ candleHeight:", candleHeight);
        await calculateGridPoints(); // 计算网格交易点
        startTime = Date.now(); // 设置启动时间

        await getHistoryClosePrices(); // 初始化 historyClosePrices
        refreshHistoryClosePrices(); // 持续更新 historyClosePrices
        //  >>>> 先注释
        // await getContractBalance(); // 获取当前合约账户中的 USDT 余额
        // await initializeTrading(); // 初始交易
        startWebSocket(); // 启动websocket，开始跑网格
    } catch (error) {
        console.error("startTrading Error:", error);
    }
};
// 获取下单量
const getQuantity = async () => {
    return (availableUSDT * leverage) / currentPrice; // 下单量
};
// WebSocket 事件
const startWebSocket = () => {
    console.log("🚀 startWebSocket~~~~~");

    // 添加 'open' 事件处理程序
    ws.on("open", () => {
        console.log("WebSocket connection opened.");
        // 在这里添加你的逻辑，比如发送消息等
    });

    // 添加 'message' 事件处理程序
    ws.on("message", async (data) => {
        const trade = JSON.parse(data);
        console.log("🚀 ~ file: gridBot5.js:366 ~ ws.on ~ data:", trade.s, ": ", trade.p);
        currentPrice = parseFloat(trade.p);
        const quantity = getQuantity();

        const gridPoint = gridPoints.find((point) => {
            return Math.abs((point - currentPrice) / currentPrice) <= PERCENTAGE_THRESHOLD;
        });
        // 价格到了某个网格交易点
        if (gridPoint) {
            console.log(`Current Price: ${currentPrice}, EMA: ${currentPriceEma}, Grid Point: ${gridPoint}`);

            // Example: place an order if the current price is near a grid point
            if (currentPrice > currentPriceEma) {
                console.log("🚀 ~ 执行开多操作:👆👆👆👆👆👆👆👆");
                // 判断执行开多操作/开空/反手
                // await placeOrder("BUY",quantity);
            } else if (currentPrice < currentPriceEma) {
                console.log("🚀 ~ 执行开空操作:👇👇👇👇👇👇👇👇");
                // 判断执行开多操作/开空/反手
                // await placeOrder("SELL", quantity);
            } else {
                console.log("🚀 ~ 价格没变动:～～～～～～～～～");
            }
        }
    });

    // 添加 'close' 事件处理程序
    ws.on("close", () => {
        console.log("WebSocket connection closed.");
        // 在这里添加关闭连接时的逻辑
    });

    // 添加 'error' 事件处理程序
    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        // 在这里添加处理错误的逻辑
    });
};

startTrading(); // 开始启动
