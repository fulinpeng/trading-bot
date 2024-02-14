// 你可能需要使用一些专业的 JavaScript 模块，例如 crypto、axios、ws，你可以使用 npm install 命令安装它们
const crypto = require("crypto");
const axios = require("axios");
const WebSocket = require("ws");

const API_KEY = process.env.BINANCE_API_KEY;
const SECRET_KEY = process.env.BINANCE_SECRET_KEY;
const SYMBOL = "OPUSDT";

const GRID_SIZE = 10;
const LEVERAGE = 3;
const PERCENTAGE_THRESHOLD = 0.001;

let gridPoints = [];
let positions = [];
let serverTimeOffset = 0; // Time offset between server and local machine

// 获取服务器时间偏移
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

// 签名请求
const signRequest = (params) => {
    const timestamp = Date.now() + serverTimeOffset;
    const queryString = Object.entries({ ...params, timestamp })
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
    const signature = crypto.createHmac("sha256", SECRET_KEY).update(queryString).digest("hex");
    return `${queryString}&signature=${signature}`;
};

// 计算网格点
const calculateGridPoints = (low, high, gridSize) => {
    const interval = (high - low) / gridSize;
    gridPoints = Array.from({ length: gridSize }, (_, index) => low + index * interval);
};

// 下单
const placeOrder = async (side, quantity, type) => {
    try {
        const timestamp = Date.now();
        const params = {
            symbol: SYMBOL,
            side,
            type,
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

// WebSocket 连接
const connectWebSocket = () => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${SYMBOL.toLowerCase()}@trade`);

    ws.on("message", (data) => {
        const trade = JSON.parse(data);
        const currentPrice = parseFloat(trade.p);

        // 在这里实现价格变化的逻辑，根据需要进行下单
        // ...
    });

    ws.on("error", (error) => {
        console.error("WebSocket Error:", error);
    });

    ws.on("close", () => {
        console.log("WebSocket Closed. Reconnecting...");
        connectWebSocket();
    });
};

// 启动交易
const startTrading = async () => {
    await getServerTimeOffset(); // 同步服务器时间
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
