require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const fs = require("fs");
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const { getDate } = require("./utils/functions.js");

console.log("🚀process.argv:", process.argv);

let SYMBOL = process.argv[2];
let point1 = Number(process.argv[3]);
let point2 = Number(process.argv[4]);

// 检查参数是否提供正确
if (!SYMBOL) {
    console.error("请提供SYMBOL");
    process.exit(1);
}
if (!point1) {
    console.error("请提供point1(开空网格点)");
    process.exit(1);
}
if (!point2) {
    console.error("请提供point2(开多网格点)");
    process.exit(1);
}

// 检查参数是否提供正确
if (!SYMBOL) {
    console.error("请提供SYMBOL");
    process.exit(1);
}

// 环境变量
const B_SYMBOL = SYMBOL.toUpperCase();
const S_SYMBOL = SYMBOL.toLowerCase();

const data = require(`./data/prod-mading-${S_SYMBOL}.js`);

const fapi = "https://fapi.binance.com/fapi";
const apiKey = process.env.BINANCE_API_KEY; // 获取API密钥
const secretKey = process.env.BINANCE_API_SECRET; // 获取API密钥的密钥

// 创建公用的 Axios 实例
const axiosInstance = axios.create({
    // baseURL: "https://api.example.com", // 请替换为实际的 API 地址
    headers: {
        "Content-Type": "application/json",
        "X-MBX-APIKEY": apiKey,
    },
    // httpsAgent: httpProxyAgent, // 设置 SOCKS5 代理
});

// 签名请求
const signRequest = (params) => {
    const timestamp = Date.now();
    const queryString = Object.entries({ ...params, timestamp })
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
    const signature = crypto.createHmac("sha256", secretKey).update(queryString).digest("hex");
    return `${queryString}&signature=${signature}`;
};

// 获取持仓风险，这里要改成村本地
const getPositionRisk = async () => {
    try {
        const timestamp = Date.now();
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
                    quantity: Math.abs(upData.positionAmt),
                    breakEvenPrice: upData.breakEvenPrice,
                };
            }
            if (Number(downData.positionAmt)) {
                res.down = {
                    trend: "down", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
                    side: "SELL", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
                    orderPrice: Number(downData.entryPrice),
                    quantity: Math.abs(downData.positionAmt),
                    breakEvenPrice: downData.breakEvenPrice,
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

const setNewData = async () => {
    writeInFile(`./garbage/prod-mading-${S_SYMBOL}.${getDate()}.js`, {
        kLineData: data,
    });
    const { up, down } = await getPositionRisk(); // 获取当前仓位信息;
    if (up && up.quantity) {
        if (data.historyEntryPoints[data.historyEntryPoints.length - 1] === 1) data.historyEntryPoints.push(2);
        const orderPrice = up.orderPrice;
        data.currentPrice = orderPrice;
        data.prePrice = orderPrice;
        data.currentPrice = orderPrice;
        data.curGridPoint = point2;
        data.prePointIndex = 1;
        data.currentPointIndex = 2;
        data.tradingDatas = {
            2: { up: { trend: "up", side: "BUY", orderPrice, quantity: up.quantity, orderTime: Date.now() } },
        };
        data.gridPoints = [0, point1, point2, 99999];
        data.s_count = 0;
        data.s_prePrice = orderPrice;
    }
    if (down && down.quantity) {
        if (data.historyEntryPoints[data.historyEntryPoints.length - 1] === 2) data.historyEntryPoints.push(1);
        const orderPrice = down.orderPrice;
        data.currentPrice = orderPrice;
        data.prePrice = orderPrice;
        data.currentPrice = orderPrice;
        data.curGridPoint = point1;
        data.prePointIndex = 2;
        data.currentPointIndex = 1;
        data.tradingDatas = {
            1: { down: { trend: "down", side: "SELL", orderPrice, quantity: down.quantity, orderTime: Date.now() } },
        };
        data.gridPoints = [0, point1, point2, 99999];
        data.s_count = 0;
        data.s_prePrice = orderPrice;
    }
    console.log("🚀 setNewData ~ data:", data);
    writeInFile(`./data/prod-mading-${S_SYMBOL}.js`, {
        kLineData: data,
    });

    return data;
};

function writeInFile(fileName, data) {
    fs.writeFileSync(fileName, `module.exports =  ${JSON.stringify(data)}`, {
        flag: "w",
    });
}

setNewData();
