require("dotenv").config();
const axios = require("axios");
const Binance = require("node-binance-api");
const WebSocket = require("ws");
const fs = require("fs");
require("dotenv").config();

const BINANCE_API_KEY = process.env.BINANCE_API_KEY; // 从环境变量或配置文件中获取 API Key
const BINANCE_SECRET_KEY = process.env.BINANCE_SECRET_KEY; // 从环境变量或配置文件中获取 Secret Key

const ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@trade");

ws.on("message", (data) => {
    const trade = JSON.parse(data);
    console.log("Real-time Trade:", trade);
});

const binance = new Binance().options({
    APIKEY: process.env.BINANCE_API_KEY,
    APISECRET: process.env.BINANCE_API_SECRET,
    test: true,
    family: 0,
    useServerTime: false, // 如果你的机器时间不准确，可以设置为 false
});

// 获取账户余额
binance.balance((error, balances) => {
    if (error) {
        console.error("Error fetching balance:", error);
        return;
    }
    console.log("Balances:", balances);
});

// 下单示例
binance.buy("BTCUSDT", 1, 30000, { type: "LIMIT" }, (error, response) => {
    if (error) {
        console.error("Error placing order:", error.body);
        return;
    }

    console.log("Order response:", response);
});

const getHistoricalPrices = async () => {
    try {
        const symbol = "BTCUSDT";
        const interval = "100ms"; // 修改为每100毫秒一个数据点
        const limit = ((60 * 60 * 1000) / 100) * 24 * 30; // 一个月的数据点

        const response = await axios.get(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        );

        const historicalPrices = response.data.map((item) => ({
            timestamp: item[0],
            price: parseFloat(item[4]),
        }));

        // 将数据保存到 testRes 文件夹中的 historicalPrices.json 文件中
        const filePath = "./testRes/historicalPrices.json";
        fs.writeFileSync(filePath, JSON.stringify(historicalPrices, null, 2));

        console.log(`Historical Prices saved to ${filePath}`);
    } catch (error) {
        console.error("Error fetching historical prices:", error.message);
    }
};
// 调用获取历史价格数据的函数
getHistoricalPrices();
