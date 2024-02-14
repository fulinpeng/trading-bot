const fs = require("fs");
const axios = require("axios");
const WebSocket = require("ws");
const talib = require("ta-lib");

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

// 示例：将输出到文件
console.log("This message will be saved in the log file.");

// 恢复原始 console.log
console.log = originalConsoleLog;

// 关闭 logStream
logStream.end();

const API_KEY = "YOUR_BINANCE_API_KEY";
const SECRET_KEY = "YOUR_BINANCE_SECRET_KEY";
const SYMBOL = "OPUSDT";

const GRID_SIZE = 10;
const LEVERAGE = 3;
const PERCENTAGE_THRESHOLD = 0.001;
const EMA_PERIOD = 9; // 可根据需要调整 EMA 的周期

let gridPoints = [];
let positions = [];
let serverTimeOffset = 0; // Time offset between server and local machine
let currentPriceEma;

const getServerTimeOffset = async () => {
    try {
        const response = await axios.get("https://api.binance.com/api/v1/time");
        const serverTime = response.data.serverTime;
        const localTime = Date.now();
        serverTimeOffset = serverTime - localTime;
        console.log("Server time offset:", serverTimeOffset);
    } catch (error) {
        console.error("Error fetching server time:", error.response.data);
    }
};

const signRequest = (params) => {
    const timestamp = Date.now() + serverTimeOffset;
    const queryString = Object.entries({ ...params, timestamp })
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
    const signature = crypto.createHmac("sha256", SECRET_KEY).update(queryString).digest("hex");
    return `${queryString}&signature=${signature}`;
};

const calculateGridPoints = (low, high, gridSize) => {
    const interval = (high - low) / gridSize;
    gridPoints = Array.from({ length: gridSize }, (_, index) => low + index * interval);
};

const calculateEma = (prices, period) => {
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

const connectWebSocket = () => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${SYMBOL.toLowerCase()}@trade`);

    ws.on("message", async (data) => {
        const trade = JSON.parse(data);
        const currentPrice = parseFloat(trade.p);

        if (!currentPriceEma) {
            // 初始化 EMA
            currentPriceEma = currentPrice;
        } else {
            // 更新 EMA
            const ema = await calculateEma([currentPrice], EMA_PERIOD);
            currentPriceEma = ema[0];
        }

        const gridPoint = gridPoints.find(
            (point) => Math.abs((point - currentPriceEma) / currentPriceEma) <= PERCENTAGE_THRESHOLD,
        );

        if (gridPoint) {
            // Implement your trading logic here based on grid point and current price
            console.log(`Current Price: ${currentPrice}, EMA: ${currentPriceEma}, Grid Point: ${gridPoint}`);

            // Example: place an order if the current price is near a grid point
            if (currentPrice > currentPriceEma) {
                // Price is above EMA, execute long trade
                await placeOrder("BUY", 0.001); // Adjust quantity as needed
            } else {
                // Price is below EMA, execute short trade
                await placeOrder("SELL", 0.001); // Adjust quantity as needed
            }
        }
    });

    ws.on("error", (error) => {
        console.error("WebSocket Error:", error);
    });

    ws.on("close", () => {
        console.log("WebSocket Closed. Reconnecting...");
        connectWebSocket();
    });
};

const startTrading = async () => {
    await getServerTimeOffset(); // Sync server time
    try {
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${SYMBOL}`);
        const ticker = response.data;

        const lowPrice = parseFloat(ticker.lowPrice);
        const highPrice = parseFloat(ticker.highPrice);

        calculateGridPoints(lowPrice * 0.5, highPrice * 1.5, GRID_SIZE);
        console.log("Grid Points:", gridPoints);

        connectWebSocket();
    } catch (error) {
        console.error("Error fetching initial data:", error.response.data);
    }
};

startTrading();
