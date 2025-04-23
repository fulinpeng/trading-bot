
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const WebSocket = require("ws"); // WebSocket库
// const { HttpsProxyAgent } = require("https-proxy-agent");
// const { SocksProxyAgent } = require("socks-proxy-agent");

// 环境变量
const api = "https://api.binance.com/api";
const fapi = "https://fapi.binance.com/fapi";
const apiKey = process.env.BINANCE_API_KEY; // 获取API密钥
const secretKey = process.env.BINANCE_API_SECRET; // 获取API密钥的密钥

// mac clash
// let httpProxyAgent=new HttpsProxyAgent("http://127.0.0.1:7892");
// let socksProxyAgent=new SocksProxyAgent("socks5://127.0.0.1:7891");

// win clash
// let httpProxyAgent=new HttpsProxyAgent("http://127.0.0.1:7890");
// let socksProxyAgent=new SocksProxyAgent("socks5://127.0.0.1:7890");

// mac 小地球仪
// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:31550");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:31550");

// win 小地球仪
// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:15715");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:15715");

// v2ray
// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:10809");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:10808");

// 创建公用的 Axios 实例
const axiosInstance = axios.create({
    // baseURL: "https://api.example.com", // 请替换为实际的 API 地址
    headers: {
        "Content-Type": "application/json",
        "X-MBX-APIKEY": apiKey,
    },
    // httpsAgent: httpProxyAgent, // 设置 SOCKS5 代理
});
const BASE_URL = 'https://fapi.binance.com';
const headers = {
    'X-MBX-APIKEY': apiKey,
};
const HEADERS = { 'X-MBX-APIKEY': apiKey };

/**
 * 获取用户数据流的 listenKey
 */
async function getListenKey() {
    try {
        const response = await axios.post(`${BASE_URL}/fapi/v1/listenKey`, null, { headers: HEADERS });
        console.log('获取到 listenKey:', response.data.listenKey);
        return response.data.listenKey;
    } catch (error) {
        console.error('获取 listenKey 失败:', error.message);
        throw error;
    }
}

/**
 * 续约 listenKey（每30分钟调用一次）
 */
async function renewListenKey(listenKey) {
    try {
        await axios.put(`${BASE_URL}/fapi/v1/listenKey?listenKey=${listenKey}`, null, { headers: HEADERS });
        console.log('🔄 ListenKey 已续约');
    } catch (error) {
        console.error('续约 listenKey 失败:', error.message);
    }
}

/**
 * 建立和管理 Binance Futures 用户数据 WebSocket 连接
 */
async function connectUserDataStream() {
    // 获取 listenKey 后建立 WebSocket 连接
    const listenKey = await getListenKey();
    if (!listenKey) return;

    const wsUrl = `wss://fstream.binance.com/ws/${listenKey}`;
    console.log('连接到 Binance Futures 用户数据流:', wsUrl);
    let ws;
    let pingInterval;
    let pongTimeout;
    let reconnectTimeout;

    // 心跳参数：每 3 分钟发送一次 ping，等待 pong 最长10秒
    const HEARTBEAT_INTERVAL = 3 * 60 * 1000;
    const PONG_WAIT = 10000;

    function startWebSocket() {
        ws = new WebSocket(wsUrl);

        ws.on('open', () => {
            console.log('✅ WebSocket 连接已建立');

            // 如果之前重连，清除重连定时器
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }

            // 启动心跳定时器
            pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    console.log('⏱️ 发送 ping');
                    ws.ping();
                    pongTimeout = setTimeout(() => {
                        console.error('❌ Pong 超时，断开连接');
                        ws.terminate();
                    }, PONG_WAIT);
                }
            }, HEARTBEAT_INTERVAL);
        });

        ws.on('pong', () => {
            console.log('🏓 收到 pong');
            if (pongTimeout) clearTimeout(pongTimeout);
        });

        ws.on('message', (data) => {
            // 将 Buffer 数据转换为字符串
            const messageStr = Buffer.isBuffer(data) ? data.toString('utf8') : data;
            try {
                const message = JSON.parse(messageStr);
                // 判断订单更新事件，币安合约订单更新事件类型为 "ORDER_TRADE_UPDATE"
                if (message.e === 'ORDER_TRADE_UPDATE') {
                    const order = message.o;
                    console.log(`📌 订单更新 - Symbol: ${order.s}, 状态: ${order.X}, 成交数量: ${order.z}/${order.q}`);
                } else {
                    console.log('收到其他消息:', message);
                }
            } catch (error) {
                console.error('解析消息失败:', error.message);
            }
        });

        ws.on('error', (err) => {
            console.error('🚨 WebSocket 错误:', err.message);
        });

        ws.on('close', (code, reason) => {
            console.warn(`❌ WebSocket 连接关闭: ${code} - ${reason}`);
            if (pingInterval) clearInterval(pingInterval);
            if (pongTimeout) clearTimeout(pongTimeout);
            // 自动重连：5秒后尝试重新建立连接
            reconnectTimeout = setTimeout(() => {
                console.log('🔄 尝试重新连接...');
                startWebSocket();
            }, 5000);
        });
    }

    startWebSocket();

    // 定期续约 listenKey，每30分钟调用一次
    setInterval(() => {
        renewListenKey(listenKey);
    }, 20 * 60 * 1000);

}

connectUserDataStream();