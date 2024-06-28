// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const WebSocket = require("ws"); // WebSocket库
const { HttpsProxyAgent } = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");
// const Binance = require("node-binance-api");
const fs = require("fs");
const {
    debounce,
    throttle,
    getDate,
    isNonEmpty,
    calculateAverage,
    throttleImmediate,
    findFarthestNumber,
} = require("./utils/functions.js");
const config = require("./config.js");

let testMoney = 0;

const {
    SYMBOL,
    base,
    availableMoney,
    invariableBalance,
    leverage,
    numForAverage,
    maxRepeatNum,
    mixReversetime,
    howManyCandleHeight,
    minGridHight,
    maxGridHight,
    stopLossRate,
    times,
    profitRate,
    EMA_PERIOD,
    klineStage,
    logsFolder,
    errorsFolder,
} = config["doge"];

// 环境变量
const B_SYMBOL = SYMBOL.toUpperCase();
const isTest = true; // 将此标志设置为  false/true 使用沙盒环境
const api = "https://api.binance.com/api";
const fapi = "https://fapi.binance.com/fapi";
const apiKey = process.env.BINANCE_API_KEY; // 获取API密钥
const secretKey = process.env.BINANCE_API_SECRET; // 获取API密钥的密钥

console.log(isTest ? "测试环境～～～" : "正式环境～～～");

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
let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:10809");
let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:10808");

// const binance = new Binance().options({
//     APIKEY: apiKey,
//     APISECRET: secretKey,
//     // test: true,
//     family: 0,
//     recvWindow: 6000,
//     useServerTime: false, // 如果你的机器时间不准确，可以设置为 false
// });

// 创建公用的 Axios 实例
const axiosInstance = axios.create({
    // baseURL: "https://api.example.com", // 请替换为实际的 API 地址
    headers: {
        "Content-Type": "application/json",
        "X-MBX-APIKEY": apiKey,
    },
    httpsAgent: httpProxyAgent, // 设置 SOCKS5 代理
});

// WebSocket连接，用于获取实时交易信息
const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}m`, { agent: socksProxyAgent });
// const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}m`);
// {
//     "e": "kline",     // 事件类型
//     "E": 123456789,   // 事件时间
//     "s": "BNBUSDT",    // 交易对
//     "k": {
//       "t": 123400000, // 这根K线的起始时间
//       "T": 123460000, // 这根K线的结束时间
//       "s": "BNBUSDT",  // 交易对
//       "i": "1m",      // K线间隔
//       "f": 100,       // 这根K线期间第一笔成交ID
//       "L": 200,       // 这根K线期间末一笔成交ID
//       "o": "0.0010",  // 这根K线期间第一笔成交价
//       "c": "0.0020",  // 这根K线期间末一笔成交价
//       "h": "0.0025",  // 这根K线期间最高成交价
//       "l": "0.0015",  // 这根K线期间最低成交价
//       "v": "1000",    // 这根K线期间成交量
//       "n": 100,       // 这根K线期间成交笔数
//       "x": false,     // 这根K线是否完结(是否已经开始下一根K线)
//       "q": "1.0000",  // 这根K线期间成交额
//       "V": "500",     // 主动买入的成交量
//       "Q": "0.500",   // 主动买入的成交额
//       "B": "123456"   // 忽略此参数
//     }
//   }
// 全局变量
let kLineData = [];
let currentPrice = 0; // 记录当前价格
let prePrice = 0; // 记录当前价格的前一个
let gridPoints = []; // 网格每个交易点
let currentPriceEma; // 当前价格的EMA值
let confirmationTimer = null; // 订单确认定时器
let serverTimeOffset = 0; // 服务器时间偏移
let confirmNum = 3; // 下单后确认时间（分钟）
let historyClosePrices = []; // 历史收盘价，用来计算EMA
let curGridPoint = undefined; // 当前网格
let allPositionDetail = {}; // 当前仓位信息
let candleHeight = 0; // 蜡烛高度
let gridHight = minGridHight; // 网格高度

const shadowBodyRate = 2; // 插针时，引线/实体

let curProfitRate = profitRate;

const wobvPeriod = 15; // 你想要的移动平均周期
const atrPeriod = 14; // 你想要的 ATR 计算周期

let dynamicWOBVResult = [];
let wobv_maResult = [];
let atrResult = [];

let curMaxPrice = 0; // 当前这一轮的二线最高价
let curMinPrice = 0; // 当前这一轮的二线最低价

let curEma1 = 0;
let curEma2 = 0;
let curRsi = 0;
let curInBollBands = false; // 默认模式为1，所以默认不在布林带

// 这些指标，都不能预测，都马后炮
const THRESHOLD = gridHight * 0.015; // 阈值
const overboughtThreshold = 69.5;
const oversoldThreshold = 31.5;

const STD_MULTIPLIER = 1.2; // 用来确定布林带的宽度
const BOLL_PERIOD = 20;
const RSI_PERIOD = 20; // RSI计算周期

let rsiArr = [];
let ema1Arr = [];
let ema2Arr = [];
let ema3Arr = [];

const klineTimeRange = klineStage * 60 * 1000; // k线单位时间
let emaMargin = [];

// 日志
let logStream = null;
let errorStream = null;

// 最新交易信息
let tradingInfo = {
    trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
    side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
    orderPrice: 0,
    quantity: 0,
    times: 0,
};

// loading
let loadingPlaceOrder = false; // 下单
let loadingCloseOrder = false; // 平仓
let loadingNewPoints = false; // 修改网格
let onGridPoint = false; // 网格上
let isSwitch = false;
let loadingInit = false;
let hasOrder = false; // 是否下订单

const isLoading = () => {
    return loadingInit || hasOrder || isSwitch || loadingPlaceOrder || loadingCloseOrder || onGridPoint;
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
            openTime: item[0], // 开盘时间
            open: parseFloat(item[1]), // 开盘价
            high: parseFloat(item[2]), // 最高价
            low: parseFloat(item[3]), // 最低价
            close: parseFloat(item[4]), // 收盘价(当前K线未结束的即为最新价)
            volume: parseFloat(item[5]), // 成交量
            closeTime: item[6], // 收盘时间
            quoteAssetVolume: parseFloat(item[7]), // 成交额
            numberOfTrades: item[8], // 成交笔数
            takerBuyBaseAssetVolume: parseFloat(item[9]), // 主动买入成交量
            takerBuyQuoteAssetVolume: parseFloat(item[10]), // 主动买入成交额
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

const calculateCandleHeight = (klines) => {
    let selected = [];
    for (let curKline of klines) {
        const { open, close, high, low } = curKline;
        const body = Math.abs(open - close);
        const totalKlineH = Math.abs(high - low);
        if (
            (high - Math.max(close, open)) / body > shadowBodyRate ||
            (Math.min(close, open) - low) / body > shadowBodyRate
        ) {
            // 插针，只取一半
            selected.push(totalKlineH / 2);
        } else {
            selected.push(totalKlineH);
        }
    }
    // console.log("参与计算平均高度的蜡烛: ", selected);
    return calculateAverage(selected);
};

// 获取收盘价
const getHistoryClosePrices = async () => {
    // 在getKLineData方法中获取至少15分钟内的价格数据
    kLineData = await getKLineData(B_SYMBOL, `${klineStage}m`, 15);
    historyClosePrices = kLineData.map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
    // console.log("k线收盘价:", historyClosePrices);

    candleHeight = calculateCandleHeight(kLineData);
    let _gridHight = candleHeight * howManyCandleHeight;
    console.log("计算出实际蜡烛高度 gridHight:", _gridHight);
    // if (_gridHight < minGridHight) {
    //     gridHight = minGridHight;
    // } else if (_gridHight > maxGridHight) {
    //     gridHight = maxGridHight;
    // } else {
    //     gridHight = _gridHight;
    // }

    gridHight = _gridHight;

    console.log("最终 ~ gridHight:", gridHight);

    // let preCloseTime = kLineData[kLineData.length - 1].closeTime;
    // let nextCloseTime = preCloseTime + klineStage;
    // let x = nextCloseTime - Date.now();
    // 0.000048
    // 0.00009
    // console.log("k线最后一个蜡烛的收盘时间差 preCloseTime, nextCloseTime, x:", preCloseTime, nextCloseTime, x);

    // setTimeout(() => {
    //     refreshPrice();
    //     refreshHistoryClosePrices(); // 开始刷新最新价格，这一步非常重要
    // }, x);
};
// 获取EMA（指数移动平均线）值
const getCurrentPriceEma = async () => {
    // 传递至calculateEMA函数
    currentPriceEma = await setEmaArr(historyClosePrices, EMA_PERIOD);
    console.log("🚀 ~ file: gridBot5.js:396 ~ ws.on ~ currentPriceEma:", currentPriceEma);
};

const _refreshPrice = (curKLine) => {
    kLineData.length >= BOLL_PERIOD && kLineData.shift();
    historyClosePrices.length >= BOLL_PERIOD && historyClosePrices.shift();
    // atrResult.length >= 15 && atrResult.shift();

    kLineData.push(curKLine);
    historyClosePrices.push(curKLine.close);

    // const atr=calculateATR(kLineData, atrPeriod);

    // atrResult.push(atr);

    // 更新平均蜡烛高度
    candleHeight = calculateCandleHeight(kLineData);
    let _gridHight = candleHeight * howManyCandleHeight;
    console.log("计算出实际蜡烛高度 gridHight:", _gridHight);
    // if (_gridHight < minGridHight) {
    //     gridHight = minGridHight;
    // } else if (_gridHight > maxGridHight) {
    //     gridHight = maxGridHight;
    // } else {
    //     gridHight = _gridHight;
    // }
    gridHight = _gridHight;
    console.log("最终 ~ gridHight:", gridHight);

    // console.log("封盘时间到，当前kLineData:", {
    //     kLineData,
    //     historyClosePrices,
    //     // atrResult,
    // });

    // 更新ema
    setEmaArr(historyClosePrices, EMA_PERIOD);
    // 更新rsi
    setRsiArr(); // 好看rsi数据

    judgeAndTrading();
};

// 初始获取获取historyClosePrices后，后面就自己来弄，避免频繁请求太慢，本地实现比http获取更快
const refreshPrice = () => {
    // 刷新 收盘价格
    historyClosePrices.shift();
    historyClosePrices.push(currentPrice);

    // 更新平均蜡烛高度
    candleHeight = calculateCandleHeight(historyClosePrices);
    let _gridHight = candleHeight * howManyCandleHeight;
    // gridHight = _gridHight < minGridHight ? minGridHight : _gridHight;
    gridHight = _gridHight;
    console.log("收盘后计算gridHight:", gridHight);

    // console.log("封盘时间到，当前currentPrice:", currentPrice, "historyClosePrices:", historyClosePrices);
};
const refreshHistoryClosePrices = () => {
    setTimeout(() => {
        refreshPrice();
        refreshHistoryClosePrices();
    }, klineTimeRange);
};
// 封盘时间到，判断+交易
const judgeAndTrading = async () => {
    if (hasOrder || loadingPlaceOrder) return; // 有订单就不需要执行以下逻辑
    // 根据指标判断是否可以开单
    const signal = calculateTradingSignal(currentPrice);
    console.log("Trading Signal:", signal);
    // 开单
    switch (signal) {
        case "up":
            teadeBuy();
            break;
        case "down":
            teadeSell();
            break;
        default:
            break;
    }
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
        // ema3Arr.shift();
    }
    // if (emaMargin.length >= 3) {
    //     emaMargin.shift();
    // }
    ema1Arr.push(calculateEMA(prices, period1));
    ema2Arr.push(calculateEMA(prices, period2));
    // ema3Arr.push(calculateEMA(prices, period1 + period2));

    // emaMargin.push(ema1Arr[ema1Arr.length - 1] - ema2Arr[ema2Arr.length - 1]);
    // console.log("setEmaArr: ema1Arr, ema2Arr", ema1Arr, ema2Arr);
    // console.log("setEmaArr: emaMargin", emaMargin);
};

// 下单（开多操作/开空操作）
const placeOrder = async (side, quantity) => {
    console.log(`下单（开${side === "SELL" ? "空" : "多"}操作）placeOrder ~ side, quantity:`, side, quantity);
    try {
        loadingPlaceOrder = true;
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
        console.log("下单 params:", params);
        const signedParams = signRequest(params);

        let response = null;
        if (isTest) {
            response = {
                data: {
                    orderId: "xxx",
                    origQty: quantity,
                },
            };
        } else {
            response = await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
        }

        console.log(
            `Order placed - Symbol: ${B_SYMBOL}, Side: ${side}, Quantity: ${quantity}`,
            "orderId:",
            response.data.orderId,
        );
        // 如果 下单（开多操作/开空操作） 成功需要更新PurchaseInfo
        if (response && response.data && response.data.orderId) {
            const { origQty } = response.data;
            const trend = side === "BUY" ? "up" : "down";
            await recordRradingInfo({
                trend,
                side,
                orderPrice: _currentPrice,
                quantity: Math.abs(origQty),
                // orderTime: Date.now(),
            });
            saveGlobalVariables();
            console.log("placeOrder ~ 下单成功 tradingInfo:", tradingInfo);
            hasOrder = true;

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
const closeOrder = async (side, quantity, cb) => {
    try {
        loadingCloseOrder = true;
        const timestamp = Date.now() + serverTimeOffset;
        let params = {
            symbol: B_SYMBOL, // 交易对
            side,
            type: "MARKET",
            quantity,
            positionSide: side === "BUY" ? "SHORT" : "LONG",
            timestamp,
            recvWindow: 6000,
        };

        const signedParams = signRequest(params);
        let response = null;
        if (isTest) {
            response = {
                data: {
                    origQty: quantity,
                },
            };
        } else {
            response = await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
        }

        if (response && response.data && response.data.origQty) {
            cb && cb();
            tradingInfo = {};
            saveGlobalVariables();
            console.log("🚀 ~ 平仓：平", side === "BUY" ? "空" : "多", response.data.origQty);
        } else {
            console.log(
                "🚀 ~ 平仓：平",
                side === "BUY" ? "空" : "多",
                "！！！！！！！！！！！！！！！！！！！！！！！！失败",
            );
        }
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

// 开多
const teadeBuy = async () => {
    try {
        await placeOrder("BUY", getQuantity()); // 调整开仓数量
        console.log("开多完成");
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};
// 开空
const teadeSell = async () => {
    try {
        await placeOrder("SELL", getQuantity()); // 调整开仓数量
        console.log("开空完成");
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};

// 更新购买信息
const recordRradingInfo = async (info) => {
    // 更新购买信息
    Object.assign(tradingInfo, info);
    console.log("Purchase Info Updated:", tradingInfo);
};

// 初始化
const setInitData = async ({ up, down }) => {
    console.log("🚀 ~ file: gridBot6-13.js:913 ~ setInitData ~ up, down:", up, down);
    // 从数据库拿出上次的数据，并且与现在的比较，如果数据和的上就用以前的，数据和不上就解析出

    loadingInit = true;
    if (fs.existsSync(`./data/${SYMBOL}.js`)) {
        let {
            currentPrice: __currentPrice, // 记录当前价格
            prePrice: __prePrice, // 记录当前价格的前一个
            curGridPoint: __curGridPoint, // 当前网格
            tradingInfo: __tradingInfo, // 订单数据
            gridPoints: __gridPoints, // 网格每个交易点
            gridHight: __gridHight,
        } = require(`./data/${SYMBOL}.js`);
        console.log("上一次停止程序时，交易情况", {
            __currentPrice,
            __prePrice,
            __curGridPoint,
            __tradingInfo,
            __gridPoints,
            __gridHight,
        });

        if (__currentPrice != 0 && __prePrice != 0 && !isNonEmpty(__tradingInfo) && __gridPoints.length > 0) {
            currentPrice = __currentPrice;
            prePrice = __prePrice;
            curGridPoint = __curGridPoint;
            tradingInfo = __tradingInfo;
            gridPoints = __gridPoints;
            gridHight = __gridHight;

            await checkOverGrid(up, down);
            console.log(`setInitData初始化数据完成 当前 tradingInfo:`, tradingInfo);
        } else {
            console.log("该币现有仓位和上次保留的数据不符合，先平仓再重新初始化！！！");
            await closeAllOrders({ up, down });
        }
    } else {
        console.log("该币有仓位，请先手动平仓！！！");
        process.exit(1);
    }
    loadingInit = false;
};

const checkOverGrid = async (up, down) => {
    // 超出区间直接平仓
    if (currentPrice <= gridPoints[0] || currentPrice >= gridPoints[1]) {
        if (up) {
            console.log(`初始化时，价格超出网格区间，重置仓位（盈利），当前价格小于gridPoints[0]`);
            await closeAllOrders({ up });
        }
        if (down) {
            console.log(`初始化时，价格超出网格区间，重置仓位（盈利），当前价格大于gridPoints[3]`);
            await closeAllOrders({ down });
        }
    }
};

// 设置网格
const setGridPointsToCurPriceCenter = (trend, _currentPrice) => {
    console.log("开始绘制网格~ trend, _currentPrice gridHight:", trend, _currentPrice, gridHight);

    loadingNewPoints = true;

    let _gridHight = gridHight;
    let priceUp = 0;
    let priceDown = 0;
    let priceUpClose = 0;
    let priceDownClose = 0;

    if (trend === "up") {
        priceUp = _currentPrice;
        prePrice = priceUp;
        priceDown = priceUp - _gridHight;
        priceUpClose = priceUp + _gridHight * curProfitRate;
        priceDownClose = priceDown - _gridHight * curProfitRate;
    } else {
        priceDown = _currentPrice;
        prePrice = priceDown;
        priceUp = priceDown + _gridHight;
        priceUpClose = priceUp + _gridHight * curProfitRate;
        priceDownClose = priceDown - _gridHight * curProfitRate;
    }

    gridPoints = [priceDownClose, priceDown, priceUp, priceUpClose];

    // 设置完网格之后重置初始的最高值和最低值
    curMaxPrice = priceUp; // 当前这一轮的最高价
    curMinPrice = priceDown; // 当前这一轮的最低价

    saveGlobalVariables();

    loadingNewPoints = false;
    console.log("绘制网格 _currentPrice, curGridPoint, gridPoints :", currentPrice, curGridPoint, gridPoints);
};

const restDatas = async (trend) => {
    const _currentPrice = currentPrice * 0.999999999;
    if (trend === "up") {
    } else {
    }
    curGridPoint = _currentPrice;
    if (!trend) console.log("#####################");
    setGridPointsToCurPriceCenter(trend, _currentPrice);
};
// 5. 启动交易
const startTrading = async () => {
    try {
        await getServerTimeOffset(); // 同步服务器时间

        await getHistoryClosePrices(); // 初始化 historyClosePrices

        if (!invariableBalance) {
            await getContractBalance(); // 获取当前合约账户中的 USDT
        }

        // 测试
        if (isTest) {
            await getCurrentPrice();
            await startWebSocket();
            return;
        } else {
            // 初始化 tradingInfo
            allPositionDetail = await getPositionRisk(); // 获取当前仓位信息

            console.log("🚀 ~ file: gridBot6-1.js:886 ~ startTrading ~ allPositionDetail:", allPositionDetail);
            if (allPositionDetail) {
                await getCurrentPrice();
                await setInitData(allPositionDetail);
            }
            // 如果还没仓位要加仓
            else if (!isNonEmpty(allPositionDetail)) {
                console.log("还没仓位，直接开始循环");
                await getCurrentPrice(); // 获取当前价格
            }
        }
        await startWebSocket(); // 启动websocket更新价格
    } catch (error) {
        console.error("startTrading Error:", error);
        process.exit(1);
    }
};
// 获取下单量
const getQuantity = () => {
    return Math.round(availableMoney / currentPrice);
};

const closeAllOrders = async ({ up, down }) => {
    let promises = [];
    if (up) {
        // 平多
        const upPromise = closeOrder("SELL", up.quantity, () => {
            if (isTest) {
                //测试
                testMoney += currentPrice - up.orderPrice;
                console.log("平多 closeAllOrders ~ testMoney:", testMoney);
            }
            console.log("平多完成");
        });
        promises.push(upPromise);
    }
    if (down) {
        // 平空
        const downPromise = closeOrder("BUY", down.quantity, () => {
            if (isTest) {
                // 测试
                testMoney += down.orderPrice - currentPrice;
                console.log("平空 closeAllOrders ~ testMoney:", testMoney);
            }
            console.log("平空完成");
        });
        promises.push(downPromise);
    }
    tradingInfo = {};
    await Promise.all(promises);
    hasOrder = false;
};

// 到达止盈/止损点
const gridPointTrading = async (_currentPrice) => {
    onGridPoint = true;
    const [point1, point2] = gridPoints;
    if (_currentPrice >= point2 || _currentPrice <= point1) {
        if (tradingInfo.side === "BUY") {
            // 平多
            await closeOrder("SELL", tradingInfo.quantity, () => {
                if (isTest) {
                    //测试
                    testMoney += currentPrice - tradingInfo.orderPrice;
                    console.log("平多 gridPointTrading ~ testMoney:", testMoney);
                }
                console.log("平多完成");
                hasOrder = false;
            });
        } else {
            // 平空
            await closeOrder("BUY", tradingInfo.quantity, () => {
                if (isTest) {
                    // 测试
                    testMoney += tradingInfo.orderPrice - currentPrice;
                    console.log("平空 gridPointTrading ~ testMoney:", testMoney);
                }
                console.log("平空完成");
                hasOrder = false;
            });
        }
    }
    onGridPoint = false;
};

const calcEma1Ema2ByHistoryPrice = async () => {
    const len = ema1Arr.length;
    const ema1 = ema1Arr[len - 1];
    const ema2 = ema2Arr[len - 1];
    const emaGap = Math.abs(ema1 - ema2) > THRESHOLD; // THRESHOLD 这里还需要调整参与对比才行？？？？?????>>>>>

    let trend = "";

    if (emaGap && currentPrice > ema1 && ema1 > ema2) {
        trend = "up";
    }
    if (emaGap && currentPrice < ema1 && ema1 < ema2) {
        trend = "down";
    }
    return {
        ema1,
        ema2,
        trend,
    };
};
const calcEma1Ema2 = async (params = {}) => {
    const initParams = { emaPeriod1: EMA_PERIOD[0], emaPeriod2: EMA_PERIOD[1], threshold: THRESHOLD };
    const { emaPeriod1, emaPeriod2, threshold } = { ...initParams, ...params };
    let ema1 = calculateEMA([...historyClosePrices, currentPrice], emaPeriod1);
    let ema2 = calculateEMA([...historyClosePrices, currentPrice], emaPeriod2);

    // let curRsi = calculateRSI([...historyClosePrices, currentPrice], RSI_PERIOD);

    // // 计算布林带
    const bollingerBands = calculateBollingerBands([...historyClosePrices, currentPrice], BOLL_PERIOD, STD_MULTIPLIER);
    curInBollBands = isPriceInBollingerBands(currentPrice, bollingerBands);

    const emaGap = Math.abs(ema1 - ema2) > threshold; // threshold 这里还需要调整参与对比才行？？？？?????>>>>>

    let trend = "";

    if (emaGap && ema1 > ema2) {
        trend = "up";
    }
    if (emaGap && ema1 < ema2) {
        trend = "down";
    }

    return {
        ema1,
        ema2,
        trend,
    };
};

// 计算简单移动平均线
function calculateSimpleMovingAverage(prices, period) {
    if (prices.length < period) {
        throw new Error("Not enough data points for the specified period.");
    }

    const slice = prices.slice(prices.length - period);
    const sum = slice.reduce((acc, price) => acc + price, 0);
    return sum / period;
}
const setRsiArr = () => {
    if (rsiArr.length >= RSI_PERIOD) {
        rsiArr.shift();
    }
    rsi = calculateRSI(historyClosePrices, RSI_PERIOD);
    rsiArr.push(rsi);
    console.log("setRsiArr ~ rsiArr:", rsiArr);
};

// 计算标准差
function calculateStandardDeviation(prices, period) {
    if (prices.length < period) {
        throw new Error("Not enough data points for the specified period.");
    }

    const sma = calculateSimpleMovingAverage(prices, period);

    const squaredDifferences = prices.slice(prices.length - period).map((price) => Math.pow(price - sma, 2));

    const meanSquaredDifference = squaredDifferences.reduce((acc, val) => acc + val, 0) / period;

    return Math.sqrt(meanSquaredDifference);
}

// 计算布林带
function calculateBollingerBands(prices, period, multiplier) {
    const sma = calculateSimpleMovingAverage(prices, period);
    const stdDev = calculateStandardDeviation(prices, period);

    const upperBand = sma + multiplier * stdDev;
    const lowerBand = sma - multiplier * stdDev;

    return { upperBand, sma, lowerBand };
}

// 判断当前价格是否在布林带之间
function isPriceInBollingerBands(price, bands) {
    return price >= bands.lowerBand && price <= bands.upperBand;
}

// 计算 MACD 指标
function calculateMACD(historyClosePrices, periods) {
    const [shortPeriod, longPeriod, signalPeriod] = periods;
    // 计算短期EMA
    const shortEMA = calculateEMA(historyClosePrices, shortPeriod);
    // 计算长期EMA
    const longEMA = calculateEMA(historyClosePrices, longPeriod);
    // 计算 DIF（快速线）
    const dif = shortEMA.map((value, index) => value - longEMA[index]);
    // 计算 DEA（慢速线）
    const dea = calculateEMA(dif, signalPeriod);
    // 计算 MACD 柱状图
    const macd = dif.map((value, index) => value - dea[index]);
    return { dif, dea, macd };
}
function getKlineType() {
    // up down hold
    let type = "hold"; // 是否在几种常见的k线形态中
    // ...
    return type;
}
function calculateTradingSignal(currentPrice) {
    // 定义权重
    const weights = {
        difDeaCross: 2, // DIF 与 DEA 交叉点权重
        difZeroCross: 1.5, // DIF、DEA 与零轴交叉权重
        macdZeroCross: 1, // MACD 柱状图与零轴交叉权重
        macdHistogramTrend: 1, // MACD 柱状图趋势权重
        priceTrend: 1, // 价格趋势权重
        priceAndDifRelation: 2, // 价格和 DIF 关系权重
        kLineType: 3,
    };

    // 价格趋势（当前价格和3分钟内平均价格比较）
    const priceTrend = "up";
    // MACD 柱状趋势（当前价格和3分钟内平均价格比较）越大信号较强
    const macdHistogramValue = 0.0005;
    const { dif, dea, macd } = calculateMACD(historyClosePrices, [12, 26, 9]);

    // 初始化信号值
    let signalValue = 0;

    // k线形态判断
    const kLineTypeTrend = getKlineType();

    // DIF 与 DEA 交叉点
    if (dif > dea) {
        signalValue += weights.difDeaCross;
    } else {
        signalValue -= weights.difDeaCross;
    }

    // DIF、DEA 与零轴交叉
    if (dif > 0 && dea > 0) {
        signalValue += weights.difZeroCross;
    } else {
        signalValue -= weights.difZeroCross;
    }

    // MACD 柱状图与零轴交叉
    if (macd > 0) {
        signalValue += weights.macdZeroCross;
    } else {
        signalValue -= weights.macdZeroCross;
    }

    // MACD 柱状图趋势
    if (macdHistogram > 0) {
        signalValue += weights.macdHistogramTrend;
    } else {
        signalValue -= weights.macdHistogramTrend;
    }

    // 价格趋势
    if (priceTrend === "up") {
        signalValue += weights.priceTrend;
    } else {
        signalValue -= weights.priceTrend;
    }

    // 价格和 DIF 关系
    if (currentPrice > dif) {
        signalValue += weights.priceAndDifRelation;
    } else {
        signalValue -= weights.priceAndDifRelation;
    }

    // 根据信号值判断买入或卖出
    if (signalValue > 0) {
        return "up"; // 买入信号
    } else if (signalValue < 0) {
        return "down"; // 卖出信号
    } else {
        return "hold"; // 无明显信号，持有状态
    }
}

// let testTime = Date.now();
// WebSocket 事件
const startWebSocket = async () => {
    console.log("🚀 startWebSocket~~~~~");
    // 添加 'open' 事件处理程序
    ws.on("open", async (data) => {
        console.log("WebSocket connection opened.", data);
    });

    // 添加 'message' 事件处理程序
    ws.on("message", async (data) => {
        const {
            k: {
                t: openTime, // 这根K线的起始时间
                T: closeTime, // 这根K线的结束时间
                o: open, // 这根K线期间第一笔成交价
                c: close, // 这根K线期间末一笔成交价
                h: high, // 这根K线期间最高成交价
                l: low, // 这根K线期间最低成交价
                v: volume, // 这根K线期间成交量
                x: isNewLine, // 这根K线是否完结(是否已经开始下一根K线)
                V: takerBuyBaseAssetVolume, // 主动买入的成交量
            },
        } = JSON.parse(data);

        prePrice = currentPrice; // 不能删除
        currentPrice = Number(close) || 0;

        if (isNewLine) {
            const curKLine = {
                openTime, // 这根K线的起始时间
                closeTime, // 这根K线的结束时间
                open: Number(open), // 这根K线期间第一笔成交价
                close: Number(close), // 这根K线期间末一笔成交价
                high: Number(high), // 这根K线期间最高成交价
                low: Number(low), // 这根K线期间最低成交价
                volume: Number(volume), // 这根K线期间成交量
                isNewLine, // 这根K线是否完结(是否已经开始下一根K线)
                takerBuyBaseAssetVolume: Number(takerBuyBaseAssetVolume), // 主动买入的成交量
            };
            _refreshPrice(curKLine);
        }
        // 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
        if (isLoading() || prePrice === currentPrice) return;

        await gridPointTrading(currentPrice); // 每秒会触发4次左右，但是需要快速判断是否进入交易点，所以不节流
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
    await getCurrentPrice();

    await getHistoryClosePrices(); // 初始化 historyClosePrices

    // await initializeTrading();
};
// test();

// 在服务停止时执行的清理工作
function cleanup() {
    console.log("Cleaning up before exit.");
    logStream && logStream.end();
    errorStream && errorStream.end();
}

// 监听进程的 exit 事件
process.on("exit", () => {
    cleanup();
});

// 监听中断信号（如 Ctrl+C）
process.on("SIGINT", () => {
    console.log("Received SIGINT. Cleaning up...");
    process.exit();
});

// 监听未捕获异常
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    // 退出进程
    process.exit(1);
});

// 保存全局变量到文件
function saveGlobalVariables() {
    setTimeout(() => {
        // 创建 data 文件夹
        if (!fs.existsSync("data")) {
            fs.mkdirSync("data");
        }
        if (currentPrice !== 0 && prePrice !== 0) {
            const data = JSON.stringify({
                currentPrice, // 记录当前价格
                prePrice, // 记录当前价格的前一个
                curGridPoint, // 当前网格
                tradingInfo, // 订单数据
                gridPoints, // 网格每个交易点
                gridHight: gridPoints[2] - gridPoints[1],
            });
            fs.writeFileSync(`data/${SYMBOL}.js`, `module.exports = ${data}`, { flag: "w" });
            console.log(`Global variables saved to data/${SYMBOL}.js`);
        }
    }, 0);
}
