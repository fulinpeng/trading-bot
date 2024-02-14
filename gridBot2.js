// 第二版 ： ta-lib 精确计算涨跌版
require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto"); // 添加 crypto 模块的导入
const Binance = require("node-binance-api");
const WebSocket = require("ws");
const fs = require("fs");
const talib = require("ta-lib");

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
let gridPoints = [];
const GRID_SIZE = 10;
const EMA_PERIOD = 9; // 值越小，EMA 就越敏感于最新的价格变动，因为最新的价格数据被赋予了更大的权重。相反，如果 EMA_PERIOD 较大，EMA 就会对价格的波动更加平滑，更不容易受到短期市场波动的影响f
let currentPriceEma;

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
        const klines = await getKLineData(SYMBOL, "1m", 50); // 获取K线数据
        const averageHeight = calculateAverageCandleHeight(klines); // 计算平均蜡烛高度
        return averageHeight;
        // 其他逻辑...
    } catch (error) {
        console.error("getAverageHeight Error fetching initial data:", error);
    }
};
const getCurrentPriceEma = async () => {
    if (!currentPriceEma) {
        // 初始化 EMA
        currentPriceEma = currentPrice;
    } else {
        // 在getKLineData方法中获取至少15分钟内的价格数据
        const kLineData = await getKLineData(SYMBOL, "1m", 15); // 你的获取K线数据的方法

        // 获取当前时间
        const currentTime = Date.now() + serverTimeOffset;
        // 获取15分钟前的时间
        const fifteenMinutesAgo = currentTime - 15 * 60 * 1000; // 15分钟的毫秒数
        // 筛选出在15分钟内的价格数据
        const fifteenMinutesPrices = kLineData
            .filter((data) => data.closeTime >= fifteenMinutesAgo && data.closeTime <= currentTime) // closeTime 表示收盘时间
            .map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整

        console.log("🚀 ~ file: realGridBot.js:147 ~ getCurrentPriceEma ~ fifteenMinutesPrices:", fifteenMinutesPrices);

        // 传递至calculateEma函数
        const emaResult = await calculateEma(fifteenMinutesPrices, EMA_PERIOD);
        console.log("🚀 ~ file: realGridBot.js:149 ~ getCurrentPriceEma ~ emaResult:", emaResult);
        currentPriceEma = emaResult[0];
    }
};
// 每隔一段时间更新一次价格走势
const getNewTradingStatus = () => {
    getCurrentPriceEma();
    setTimeout(() => {
        getCurrentPriceEma();
    }, timeForFresh);
};

// 网格交易点计算
const calculateGridPoints = async () => {
    try {
        const response = await axios.get(`${apiUrl}/v3/ticker/24hr?symbol=${SYMBOL}`);
        const ticker = response.data;

        const lowPrice = parseFloat(ticker.lowPrice);
        const highPrice = parseFloat(ticker.highPrice);

        const low = lowPrice * 0.5;
        const high = highPrice * 1.5;

        const interval = (high - low) / GRID_SIZE;
        gridPoints = Array.from({ length: GRID_SIZE }, (_, index) => low + index * interval);

        console.log("Grid Points:", gridPoints);
    } catch (error) {
        console.error("Error fetching initial data:", error.response.data);
    }
};

const calculateEma = async (prices, period) => {
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
                    reject(err);
                } else {
                    resolve(result.result.outReal);
                }
            },
        );
    });
};
// 下单
const placeOrder = async (side, quantity) => {
    try {
        const timestamp = Date.now();
        const params = {
            symbol: SYMBOL,
            side,
            type: "MARKET",
            quantity,
            timestamp,
            recvWindow: 5000,
        };

        const signedParams = signRequest(params);
        const response = await axios.post(`https://api.binance.com/api/v3/order?${signedParams}`);
        console.log(`Order placed - Symbol: ${SYMBOL}, Side: ${side}, Quantity: ${quantity}`);
        return response.data;
    } catch (error) {
        console.error("Error placing order:", error.response.data);
        throw error;
    }
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
    await calculateGridPoints();
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

        const gridPoint = gridPoints.find((point) => {
            return Math.abs((point - currentPriceEma) / currentPriceEma) <= PERCENTAGE_THRESHOLD;
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
