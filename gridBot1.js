// 第一版本：js计算mea斜率版

require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto"); // 添加 crypto 模块的导入
const Binance = require("node-binance-api");
const WebSocket = require("ws");
const fs = require("fs");

const isTest = true; // 将此标志设置为 true 以使用沙盒环境
const apiUrl = isTest ? "https://testnet.binance.vision/api" : "https://api.binance.com/api";

const apiKey = isTest ? process.env.TEST_BINANCE_API_KEY : process.env.BINANCE_API_KEY;
const secretKey = isTest ? process.env.TEST_BINANCE_API_KEY : process.env.BINANCE_SECRET_KEY;

// 这是测试文档：https://testnet.binance.vision/
// wss://stream.binance.com:9443/ws
const ws = new WebSocket("wss://testnet.binance.vision/ws/opusdt@trade");

const SYMBOL = "OPUSDT"; // 替换成你所需的交易对
let klineData = [];
let availableUSDT = 1000; // 你可以根据实际情况获取可用的USDT，应该是获取吧????
let leverage = 3; // 杠杆倍数
let candleHeight = 0; // 蜡烛平均高度
let timeForFresh = 10000; // 刷新时间间隔（可能不能太小，会被币安处理）
const PERCENTAGE_THRESHOLD = 0.001;
let startTime = 0; // 记录启动交易的时间点
let currentPrice = 0; // 记录当前价格

// 计算EMA
let emaPeriod = 14; // 你可以根据需要调整
let ema = 0;

// 获取前一个K线的EMA
let prevEma = 0;

// 获取EMA斜率
let emaSlope = 0;

let serverTimeOffset = 0; // 时差

// 获取服务器时间偏移
const getServerTimeOffset = async () => {
    try {
        const response = await axios.get(`${apiUrl}/v1/time`);
        const serverTime = response.data.serverTime;
        const localTime = Date.now();
        serverTimeOffset = serverTime - localTime;
        console.log("Server time offset:", serverTimeOffset);
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

// 计算指数移动平均 EMA = α × Price + (1−α) × EMA‘（EMA‘为上一次的EMA）
// ​α 是平滑系数，通常是 2/(N - 1)，其中 N 是选定的时间周期
// 斜率 Slope = (EMA[t] - EMA[t-n])/n ，其中 n 是计算斜率的时间跨度
// 趋势方向： 当EMA斜率为正时，表示价格趋势向上；当EMA斜率为负时，表示价格趋势向下。
// 趋势强度： 斜率的绝对值可以表示趋势的强弱。绝对值越大，趋势越强烈。
// 零线交叉： 当EMA斜率从负数变为正数时，可能标志着价格从下跌趋势切换到上升趋势，反之亦然。
// 斜率的平滑性： 由于EMA本身是通过平滑计算得到的，其斜率相对于简单移动平均线的斜率更加平滑，对市场噪音有较好的过滤效果。
const calculateEMA = (data, period) => {
    const prices = data.map((item) => item.close); // 获取收盘价数据
    let sum = 0;

    for (let i = 0; i < period; i++) {
        sum += prices[i];
    }

    const initialEMA = sum / period;

    const multiplier = 2 / (period + 1);
    let ema = initialEMA;

    for (let i = period; i < prices.length; i++) {
        ema += (prices[i] - ema) * multiplier;
    }

    return ema;
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

// 判断价格走势
const isTrendingUp = (currentPrice, ema, emaSlope) => {
    const priceDiff = (currentPrice - ema) / ema;
    return priceDiff > PERCENTAGE_THRESHOLD && emaSlope > 0;
};
// 判断价格走势是否向下
const isTrendingDown = (currentPrice, ema, emaSlope) => {
    const priceDiff = (currentPrice - ema) / ema;
    return priceDiff < -PERCENTAGE_THRESHOLD && emaSlope < 0;
};
// 获取EMA斜率
const getEMASlope = async () => {
    try {
        // 获取K线数据
        klineData = await getKLineData(SYMBOL, "1m", 50);

        // 计算EMA
        ema = calculateEMA(klineData, emaPeriod);

        // 获取前一个K线的EMA
        prevEma = calculateEMA(klineData.slice(0, klineData.length - 1), emaPeriod);

        // 获取EMA斜率
        emaSlope = ema - prevEma;
        console.log("🚀 ~ getEMASlope ~ emaSlope:", emaSlope);
    } catch (error) {
        console.error("getEMASlope Error fetching initial data:", error.response.data);
        return;
    }
};

// --------------------

// 获取k线图
const getKlineDataForCandleHeight = async () => {
    try {
        const response = await axios.get(`${apiUrl}/v3/klines?symbol=${SYMBOL}&interval=1m`);
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
        console.error("getKlineDataForCandleHeight Error fetching Kline data:", error);
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
        const klines = await getKlineDataForCandleHeight(); // 获取K线数据
        const averageHeight = calculateAverageCandleHeight(klines); // 计算平均蜡烛高度
        return averageHeight;
        // 其他逻辑...
    } catch (error) {
        console.error("getAverageHeight Error fetching initial data:", error);
    }
};

// 每隔一段时间更新一次价格走势
const getNewTradingStatus = () => {
    getEMASlope();
    setTimeout(() => {
        getEMASlope();
    }, timeForFresh);
};

// 开多操作
const openLongPosition = async (quantity) => {
    try {
        const timestamp = Date.now() + serverTimeOffset;
        const params = {
            symbol: SYMBOL,
            side: "BUY",
            type: "MARKET",
            quantity,
            timestamp,
            recvWindow: 5000,
        };

        const signedParams = signRequest(params);
        const response = await axios.post(`${apiUrl}/v3/order?${signedParams}`);
        console.log(`Long position opened - Symbol: ${SYMBOL}, Quantity: ${quantity}`);
        return response.data;
    } catch (error) {
        console.error("openLongPosition Error opening long position:", error);
        throw error;
    }
};
// 开空操作
const openShortPosition = async (quantity) => {
    try {
        const timestamp = Date.now() + serverTimeOffset;
        const params = {
            symbol: SYMBOL,
            side: "SELL",
            type: "MARKET",
            quantity,
            timestamp,
            recvWindow: 5000,
        };

        const signedParams = signRequest(params);
        const response = await axios.post(`${apiUrl}/v3/order?${signedParams}`);
        console.log(`Short position opened - Symbol: ${SYMBOL}, Quantity: ${quantity}`);
        return response.data;
    } catch (error) {
        console.error("openShortPosition Error opening short position:", error);
        throw error;
    }
};
// 平仓一键平仓
const closeAllPositions = async () => {
    try {
        const timestamp = Date.now() + serverTimeOffset;
        const params = {
            symbol: SYMBOL,
            side: "SELL",
            type: "MARKET",
            quantity: 0, // 设置为0表示平仓
            timestamp,
            recvWindow: 5000,
        };

        const signedParams = signRequest(params);
        const response = await axios.post(`${apiUrl}/v3/order?${signedParams}`);
        console.log("All positions closed");
        // stopLogs();
        return response.data;
    } catch (error) {
        console.error("closeAllPositions Error closing positions:", error);
        // stopLogs();
        throw error;
    }
};
// 例如，你可以在命令行中监听用户输入，当用户输入某个指令时执行平仓操作
// const readline = require("readline");
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
// });

// rl.question('输入 "平仓" 来执行一键平仓操作：', async (answer) => {
//     if (answer.trim().toLowerCase() === "平仓") {
//         await closeAllPositions();
//     } else {
//         console.log("无效的指令，操作已取消。");
//     }

//     rl.close();
// });

// 反手交易
const reverseTrade = async () => {
    try {
        // 获取当前仓位信息
        const positionResponse = await axios.get(`${apiUrl}/v1/positionRisk?symbol=${SYMBOL}`);
        const position = positionResponse.data.filter((pos) => pos.symbol === SYMBOL)[0];

        // 如果有开多的仓位，执行反手操作
        if (position.positionAmt > 0) {
            // 先平多
            await placeOrder("SELL", Math.abs(position.positionAmt));
            console.log("平多完成");

            // 再开空
            await placeOrder("BUY", 0.001); // 调整开仓数量
            console.log("开空完成");
        }
        // 如果有开空的仓位，执行反手操作
        else if (position.positionAmt < 0) {
            // 先平空
            await placeOrder("BUY", Math.abs(position.positionAmt));
            console.log("平空完成");

            // 再开多
            await placeOrder("SELL", 0.001); // 调整开仓数量
            console.log("开多完成");
        } else {
            console.log("无仓位，无需执行反手操作。");
        }
    } catch (error) {
        console.error("reverseTrade Error executing reverse trade:", error);
        throw error;
    }
};

// boot
const startTrading = async () => {
    serverTimeOffset = await getServerTimeOffset(); // 同步服务器时间
    candleHeight = await getAverageHeight();
    console.log("🚀 ~ startTrading ~ candleHeight:", candleHeight);
    startTime = Date.now(); // 设置启动时间
    getNewTradingStatus(); // 每隔一定时间更新一次价格走势
    // 启动websocket，开始跑网格
    startWebSocket();
};

// --------------------- 计算盈利总和
const calculateOpenPositionProfit = async () => {
    try {
        // 获取启动后的所有历史交易记录
        const historicalOrders = await getHistoricalOrders(startTime);

        let openPositionProfit = 0;

        for (const order of historicalOrders) {
            const side = order.side;
            const price = parseFloat(order.price);
            const quantity = parseFloat(order.executedQty);

            // 根据当前价格计算未平仓仓位的盈利
            if (side === "BUY") {
                openPositionProfit += (currentPrice - price) * quantity;
            } else {
                openPositionProfit -= (currentPrice - price) * quantity;
            }
        }

        return openPositionProfit;
    } catch (error) {
        console.error("calculateOpenPositionProfit Error calculating open position profit:", error);
        throw error;
    }
};
// 获取历史交易记录
const getHistoricalOrders = async (startTime) => {
    try {
        const response = await axios.get(`${apiUrl}/v3/allOrders?symbol=${SYMBOL}&startTime=${startTime}`);
        const orders = response.data;
        return orders;
    } catch (error) {
        console.error("getHistoricalOrders Error fetching historical orders:", error);
        throw error;
    }
};
const calculateProfitSum = (historicalOrders) => {
    let profitSum = 0;

    for (const order of historicalOrders) {
        const side = order.side; // 交易方向，'BUY' 或 'SELL'
        const price = parseFloat(order.price); // 成交价格
        const quantity = parseFloat(order.executedQty); // 成交数量

        if (side === "BUY") {
            profitSum -= price * quantity; // 买入，花费资金
        } else {
            profitSum += price * quantity; // 卖出，获得资金
        }
    }

    // 添加未平仓仓位的估算盈利
    // 你需要根据当前市价和未平仓的仓位信息计算估算盈利
    // 这里假设有一个函数 calculateOpenPositionProfit，你需要自己实现
    const openPositionProfit = calculateOpenPositionProfit();

    profitSum += openPositionProfit;

    return profitSum;
};
const getProfitSum = async () => {
    await getServerTimeOffset(); // 同步服务器时间
    try {
        const historicalOrders = await getHistoricalOrders(startTime); // 获取历史交易记录
        const profitSum = calculateProfitSum(historicalOrders); // 计算盈利总和

        console.log("Profit Sum:", profitSum);
        // 其他逻辑...
    } catch (error) {
        console.error("getProfitSum Error fetching historical data:", error);
    }
};

// ------------------------logs
const createLogs = () => {
    // 创建 logs 文件夹
    const logsFolder = "logs";
    if (!fs.existsSync(logsFolder)) {
        fs.mkdirSync(logsFolder);
    }

    // 重定向 console.log 到文件
    const logStream = fs.createWriteStream(`${logsFolder}/output.log`, { flags: "a" });
    // 保存原始的 console.log 函数
    const originalConsoleLog = console.log;

    // 重写 console.log
    console.log = function (message) {
        originalConsoleLog.apply(console, arguments); // 保留原始 console.log 的功能
        // 将 log 写入文件
        logStream.write(`${new Date().toISOString()}: ${message}\n`);
    };
};
const stopLogs = () => {
    // 恢复原始 console.log
    console.log = originalConsoleLog;

    // 关闭 logStream
    logStream.end();
};

// WebSocket 事件
const startWebSocket = () => {
    // 添加 'open' 事件处理程序
    ws.on("open", () => {
        console.log("WebSocket connection opened.");
        // 在这里添加你的逻辑，比如发送消息等
    });

    // 添加 'message' 事件处理程序
    ws.on("message", async (data) => {
        const trade = JSON.parse(data);
        const currentPrice = parseFloat(trade.p);
        const quantity = (availableUSDT * leverage) / currentPrice;

        if (isTrendingUp(currentPrice, ema, emaSlope)) {
            console.log("🚀 ~ 执行开多操作:👆👆👆👆👆👆👆👆");
            // 执行开多操作
            // await openLongPosition(quantity);
            // 继续其他逻辑...
        } else if (isTrendingDown(currentPrice, ema, emaSlope)) {
            console.log("🚀 ~ 执行开空操作:👇👇👇👇👇👇👇👇");
            // 执行开空操作
            // await openShortPosition(quantity);
            // 继续其他逻辑...
        } else {
            console.log("🚀 ~ 不知道 价格走势~~~~~~~~~~~~~~~~");
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
