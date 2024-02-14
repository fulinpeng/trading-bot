// 版本4
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const Binance = require("node-binance-api"); // Binance API Node.js库
const WebSocket = require("ws"); // WebSocket库
const fs = require("fs"); // 文件系统模块
const talib = require("ta-lib"); // 技术分析库，用于计算EMA

const isTest = true; // 将此标志设置为 true 以使用沙盒环境
const apiUrl = isTest ? "https://testnet.binance.vision/api" : "https://api.binance.com/api"; // 根据测试标志选择Binance API的URL

const apiKey = isTest ? process.env.TEST_BINANCE_API_KEY : process.env.BINANCE_API_KEY; // 获取API密钥
const secretKey = isTest ? process.env.TEST_BINANCE_API_KEY : process.env.BINANCE_SECRET_KEY; // 获取API密钥的密钥

// 创建Binance实例
const binance = new Binance().options({
    APIKEY: apiKey,
    APISECRET: secretKey,
    test: isTest, // 是否使用测试环境
});

// WebSocket连接，用于获取实时交易信息
const ws = new WebSocket("wss://testnet.binance.vision/ws/opusdt@trade");

const SYMBOL = "OPUSDT"; // 交易对
let availableUSDT = 1000; // 可用的USDT数量
let leverage = 3; // 杠杆倍数
let candleHeight = 0; // 蜡烛平均高度
let timeForFresh = 10000; // 刷新时间间隔
const PERCENTAGE_THRESHOLD = 0.001; // 百分比阈值
let startTime = 0; // 记录启动交易的时间点
let currentPrice = 0; // 记录当前价格
let gridPoints = []; // 网格每个交易点
const GRID_SIZE = 10;
const EMA_PERIOD = 9; // EMA计算周期
let currentPriceEma; // 当前价格的EMA值

let serverTimeOffset = 0; // 服务器时间偏移

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
    } catch (error) {
        console.error("getAverageHeight Error fetching initial data:", error);
    }
};

// 获取EMA（指数移动平均线）值
const getCurrentPriceEma = async () => {
    if (!currentPriceEma) {
        // 初始化 EMA
        currentPriceEma = currentPrice;
    } else {
        // 在getKLineData方法中获取至少15分钟内的价格数据
        const kLineData = await getKLineData(SYMBOL, "1m", 15);

        // 获取当前时间
        const currentTime = Date.now() + serverTimeOffset;
        // 获取15分钟前的时间
        const fifteenMinutesAgo = currentTime - 15 * 60 * 1000; // 15分钟的毫秒数
        // 筛选出在15分钟内的价格数据
        const fifteenMinutesPrices = kLineData
            .filter((data) => data.closeTime >= fifteenMinutesAgo && data.closeTime <= currentTime) // closeTime 表示收盘时间
            .map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整

        // 传递至calculateEma函数
        const emaResult = await calculateEma(fifteenMinutesPrices, EMA_PERIOD);
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

// 计算EMA值
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

// 下单（开多操作/开空操作）
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

// 启动交易
const startTrading = async () => {
    serverTimeOffset = await getServerTimeOffset(); // 同步服务器时间
    await calculateGridPoints(); // 计算网格交易点
    candleHeight = await getAverageHeight(); // 获取平均蜡烛高度
    console.log("🚀 ~ startTrading ~ candleHeight:", candleHeight);
    startTime = Date.now(); // 设置启动时间
    getNewTradingStatus(); // 每隔一定时间更新一次价格走势
    // 启动websocket，开始跑网格
    startWebSocket();
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
