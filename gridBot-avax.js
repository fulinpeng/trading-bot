// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const sendMail = require("./mailer.js");
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const WebSocket = require("ws"); // WebSocket库
const { HttpsProxyAgent } = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");
// const Binance = require("node-binance-api");
const fs = require("fs");
const { getDate, isNonEmpty, calculateAverage, calculateSlope } = require("./utils/functions.js");
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
    THRESHOLD = 0,
    profitRate,
    EMA_PERIOD,
    klineStage,
    logsFolder,
    errorsFolder,
    profitProtectRate,
    xAngle,
} = config["sol"];

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
// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:10809");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:10808");

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
    // httpsAgent: httpProxyAgent, // 设置 SOCKS5 代理
});

// WebSocket连接，用于获取实时交易信息
// const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}m`, { agent: socksProxyAgent });
const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}m`);
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
let allPositionDetail = {}; // 当前仓位信息
let candleHeight = 0; // 蜡烛高度
let isFirstGetProfit = false; // 是否开单后的第一次盈利
let firstGetProfitMaxPrice = 0; // 最高价格

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

// 这些指标，都不能预测，都马后炮
const overboughtThreshold = 69.5;
const oversoldThreshold = 31.5;

const maxKLinelen = 50; // 储存kLine最大数量
const STD_MULTIPLIER = 2; // 用来确定布林带的宽度
const BOLL_PERIOD = 20;
const RSI_PERIOD_MIN = 6; // RSI计算周期
const RSI_PERIOD_MAX = 14; // RSI计算周期

let rsiArr = [];
let emaArr = [];
let ema1Arr = [];
let ema2Arr = [];
let ema3Arr = [];

const MACD_PERIOD = [12, 26, 9];
let macdArr = [];

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
let loadingTrading = false; // 下单
let loadingPlaceOrder = false; // 下单
let loadingCloseOrder = false; // 平仓
let loadingNewPoints = false; // 修改网格
let onGridPoint = false; // 网格上
let loadingInit = false;
let hasOrder = false; // 是否有订单

const isLoading = () => {
    return loadingInit || loadingTrading || loadingPlaceOrder || loadingCloseOrder || onGridPoint;
};

const resetTradingDatas = () => {
    tradingInfo = {
        trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
        side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
        orderPrice: 0,
        quantity: 0,
        times: 0,
    };
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
    kLineData = await getKLineData(B_SYMBOL, `${klineStage}m`, 50);
    historyClosePrices = kLineData.map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
    console.log("k线收盘价:", historyClosePrices);

    initEmaArr();
    initMacd();
    candleHeight = calculateCandleHeight(kLineData);
    if (candleHeight / currentPrice < 0.001) {
        candleHeight = currentPrice * 0.001;
    }
    if (candleHeight / currentPrice > 0.01) {
        candleHeight = currentPrice * 0.01;
    }
    console.log("计算出实际蜡烛高度 candleHeight:", candleHeight);

    // let preCloseTime = kLineData[kLineData.length - 1].closeTime;
    // let nextCloseTime = preCloseTime + klineStage;
    // let x = nextCloseTime - Date.now();
    // 0.000048
    // 0.00009
    // console.log("k线最后一个蜡烛的收盘时间差 preCloseTime, nextCloseTime, x:", preCloseTime, nextCloseTime, x);
};
const initEmaArr = () => {
    const len = historyClosePrices.length;
    for (let index = 0; index < 10; index++) {
        setSimpleEmaArr(historyClosePrices.slice(0, len - 10), BOLL_PERIOD);
    }
};
const initMacd = () => {
    const len = historyClosePrices.length;
    for (let index = 0; index < len; index++) {
        calculateMacdArr(historyClosePrices.slice(0, len - 10));
    }
};
// 获取EMA（指数移动平均线）值
const getCurrentPriceEma = async () => {
    // 传递至calculateEMA函数
    currentPriceEma = await setEmaArr(historyClosePrices, EMA_PERIOD);
    console.log("🚀 ~ file: gridBot5.js:396 ~ ws.on ~ currentPriceEma:", currentPriceEma);
};

const calculateMacdArr = (_historyClosePrices) => {
    if (macdArr.length > 10) {
        macdArr.shift();
    }
    macdArr.push([calculateMACD(_historyClosePrices), calculateMACD(_historyClosePrices)]);
};

const refreshKLine = (curKLine) => {
    // 更新kLine信息
    kLineData.length >= maxKLinelen && kLineData.shift();
    historyClosePrices.length >= maxKLinelen && historyClosePrices.shift();

    kLineData.push(curKLine);
    historyClosePrices.push(curKLine.close);

    // 更新平均蜡烛高度
    candleHeight = calculateCandleHeight(kLineData);
    console.log("计算出实际蜡烛高度 candleHeight:", candleHeight);

    // 更新ema
    setSimpleEmaArr(historyClosePrices, BOLL_PERIOD);

    calculateMacdArr(historyClosePrices);

    // 更新指标并缓存到数组
    if (isTest) {
        // 好看rsi数据
        // setRsiArr();
        // atrResult.length >= 15 && atrResult.shift();
        // const atr=calculateATR(kLineData, atrPeriod);
        // atrResult.push(atr);
        // console.log("封盘时间到，当前kLineData:", {
        //     kLineData,
        //     historyClosePrices,
        //     atrResult,
        //     rsiArr,
        // });
        // calculateEMASlope(emaArr, RSI_PERIOD_MIN / 2); // >>>>>
    }
};

// 判断+交易
const judgeAndTrading = async () => {
    if (hasOrder || loadingPlaceOrder || loadingInit) return; // 有订单就不需要执行以下逻辑
    loadingTrading = true;
    // 根据指标判断是否可以开单
    const { trend, stopLoss, stopProfit } = calculateTradingSignal(currentPrice);
    console.log("Trading trend, stopLoss, stopProfit:", trend, stopLoss, stopProfit);
    // 开单
    switch (trend) {
        case "up":
            await teadeBuy();
            setGridPoints("up", stopLoss, stopProfit);
            isFirstGetProfit = true;
            firstGetProfitMaxPrice = currentPrice;
            break;
        case "down":
            await teadeSell();
            setGridPoints("down", stopLoss, stopProfit);
            isFirstGetProfit = true;
            firstGetProfitMaxPrice = currentPrice;
            break;
        default:
            break;
    }
    loadingTrading = false;
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
// 计算 EMA 斜率的函数
function calculateEMASlope(emaArray, n) {
    if (emaArray.length < n + 1) {
        throw new Error(`EMA array length (${emaArray.length}) is less than ${n + 1}`);
    }

    let slopes = [];
    for (let i = emaArray.length - n; i < emaArray.length - 1; i++) {
        let slope = emaArray[i + 1] - emaArray[i];
        slopes.push(slope);
    }

    const sum = slopes.reduce((acc, value) => acc + value, 0);
    // const len = emaArray.length;
    // const res = emaArray[len - 1] - emaArray[len - 2];
    const res = sum / slopes.length;
    console.log("🚀 ~ 斜率 ~ res:", res);
    return res;
}
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
const setSimpleEmaArr = (prices, period) => {
    if (emaArr.length >= 50) {
        emaArr.shift();
    }
    emaArr.push(calculateEMA(prices, period));
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
            resetTradingDatas();
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
            tradingInfo: __tradingInfo, // 订单数据
            gridPoints: __gridPoints, // 网格每个交易点
            candleHeight: __candleHeight,
            isFirstGetProfit: __isFirstGetProfit,
            firstGetProfitMaxPrice: __firstGetProfitMaxPrice,
        } = require(`./data/${SYMBOL}.js`);
        console.log("上一次停止程序时，交易情况", {
            __currentPrice,
            __prePrice,
            __tradingInfo,
            __gridPoints,
            __candleHeight,
            __isFirstGetProfit,
            __firstGetProfitMaxPrice,
        });

        if (__currentPrice != 0 && __prePrice != 0 && !isNonEmpty(__tradingInfo) && __gridPoints.length > 0) {
            currentPrice = __currentPrice;
            prePrice = __prePrice;
            tradingInfo = __tradingInfo;
            gridPoints = __gridPoints;
            candleHeight = __candleHeight;
            isFirstGetProfit = __isFirstGetProfit;
            firstGetProfitMaxPrice = __firstGetProfitMaxPrice;
            hasOrder = true; // 有仓位直接用
            console.log(`setInitData初始化数据完成 当前 tradingInfo:`, tradingInfo);
        } else {
            console.log("该币现有仓位和上次保留的数据不符合，先平仓再重新初始化！！！");
            await closeAllOrders({ up, down });
        }
    } else {
        console.error("error:: 该币有仓位，请先手动平仓！！！");
        process.exit(1);
    }
    loadingInit = false;
};

// 设置网格
const setGridPoints = (trend, stopLoss, stopProfit) => {
    const _currentPrice = currentPrice;
    console.log("开始绘制网格~ trend, _currentPrice:", trend, _currentPrice);

    loadingNewPoints = true;

    if (trend === "up") {
        let _stopLoss = stopLoss * 0.9999999999; // 止损
        let _stopProfit = stopProfit * 0.9999999999; // 止盈
        gridPoints = [_stopLoss, _stopProfit];
    }

    if (trend === "down") {
        let _stopLoss = stopLoss * 0.9999999999; // 止损
        let _stopProfit = stopProfit * 0.9999999999; // 止盈
        gridPoints = [_stopProfit, _stopLoss];
    }

    saveGlobalVariables();

    loadingNewPoints = false;
    console.log("绘制网格 _currentPrice, gridPoints :", currentPrice, gridPoints);
};

// 更新止损位
const modGridPoints = () => {
    const _currentPrice = currentPrice;

    loadingNewPoints = true;

    const [point1, point2] = gridPoints;

    if (tradingInfo.trend === "up") {
        let stopLoss = 0;
        if (isFirstGetProfit) {
            stopLoss = tradingInfo.orderPrice + (_currentPrice - tradingInfo.orderPrice) * 0.9; // 止损
        } else {
            stopLoss = point1 + (_currentPrice - point1) * 0.45; // 止损
        }
        let stopProfit = _currentPrice + candleHeight * 2.5; // 止盈
        gridPoints = [stopLoss, stopProfit];
    }

    if (tradingInfo.trend === "down") {
        let stopLoss = 0;
        if (isFirstGetProfit) {
            stopLoss = tradingInfo.orderPrice - (tradingInfo.orderPrice - _currentPrice) * 0.9; // 止损
        } else {
            stopLoss = point2 - (point2 - _currentPrice) * 0.45; // 止损
        }

        let stopProfit = _currentPrice - candleHeight * 2.5; // 止盈
        gridPoints = [stopProfit, stopLoss];
    }

    saveGlobalVariables();

    loadingNewPoints = false;
    console.log(`已盈利，重新绘制网格 _currentPrice, gridPoints :`, currentPrice, gridPoints);
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
            }
            await startWebSocket(); // 启动websocket更新价格
        }
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
            // if (isTest) {
            // 测试
            testMoney +=
                up.quantity * currentPrice -
                up.orderPrice * up.quantity -
                (up.quantity * currentPrice + up.orderPrice * up.quantity) * 0.005;
            console.log("平多 closeAllOrders ~ testMoney:", testMoney);
            // }
            console.log("平多完成");

            // 发送邮件
            sendMail({
                subject: `${up.orderPrice < currentPrice ? "✅" : "❌"}${B_SYMBOL}平多完成`,
                text: JSON.stringify({
                    profitMoney: testMoney,
                    up: { ...up },
                    gridPoints: [...gridPoints],
                }),
            });
        });
        promises.push(upPromise);
    }
    if (down) {
        // 平空
        const downPromise = closeOrder("BUY", down.quantity, () => {
            // if (isTest) {
            // 测试
            testMoney +=
                down.quantity * down.orderPrice -
                down.quantity * currentPrice -
                (down.quantity * down.orderPrice + down.quantity * currentPrice) * 0.005;
            console.log("平空 closeAllOrders ~ testMoney:", testMoney);
            // }
            console.log("平空完成");

            // 发送邮件
            sendMail({
                subject: `${down.orderPrice > currentPrice ? "✅" : "❌"}${B_SYMBOL}平空完成`,
                text: JSON.stringify({
                    profitMoney: testMoney,
                    down: { ...down },
                    gridPoints: [...gridPoints],
                }),
            });
        });
        promises.push(downPromise);
    }
    resetTradingDatas();
    await Promise.all(promises);
    hasOrder = false;
};
// 是否盈利超过5U
const isProfitOver5U = (num = 5) => {
    let res = false;
    const _currentPrice = currentPrice;
    if (tradingInfo.side === "BUY") {
        if ((_currentPrice - tradingInfo.orderPrice) / tradingInfo.orderPrice >= 0.001 * num) {
            res = true;
        }
    }
    if (tradingInfo.side === "SELL") {
        if ((tradingInfo.orderPrice - _currentPrice) / tradingInfo.orderPrice >= 0.001 * num) {
            return true;
        }
    }
    // res && console.log("🚀 ~ file: 是否盈利超过5U:", res);
    return res;
};

// 保留利润，这样可以度过初期的盘整区域
const getOver5UNewRate = () => {
    let num = profitProtectRate * 10; // 超过5u的保留3成

    let sum = 0;
    const _currentPrice = currentPrice;
    if (tradingInfo.side === "BUY") {
        sum = (_currentPrice - tradingInfo.orderPrice) / tradingInfo.orderPrice;
    }
    if (tradingInfo.side === "SELL") {
        sum = (tradingInfo.orderPrice - _currentPrice) / tradingInfo.orderPrice;
    }

    if (sum >= 0.003 && sum < 0.005) {
        num = 3;
    } else if (sum >= 0.005 && sum < 0.01) {
        num = 4.5;
    } else if (sum >= 0.01 && sum < 0.015) {
        num = 6;
    } else if (sum >= 0.015 && sum < 0.03) {
        num = 7;
    } else if (sum >= 0.03 && sum < 50) {
        num = 8;
    } else if (sum >= 50) {
        num = 9;
    }

    let _profitProtectRate = num / 10;
    console.log(`🚀 ~ 大单子，达到${sum * 1000}盈利时，保留${_profitProtectRate}成利润`);
    return _profitProtectRate;
};
// 是否到达止盈/止损点，平仓/移动止损位
const gridPointClearTrading = async (_currentPrice) => {
    onGridPoint = true;
    const [point1, point2] = gridPoints;
    if (tradingInfo.side === "BUY") {
        // 小于3u的都是小单子，直接平仓
        if (_currentPrice <= point1) {
            // 止损平多
            await closeOrder("SELL", tradingInfo.quantity, () => {
                // if (isTest) {
                //测试
                testMoney +=
                    tradingInfo.quantity * currentPrice -
                    tradingInfo.quantity * tradingInfo.orderPrice -
                    (tradingInfo.quantity * currentPrice + tradingInfo.quantity * tradingInfo.orderPrice) * 0.0005;
                console.log("平多 gridPointClearTrading ~ testMoney:", testMoney);
                // }
                console.log("平多完成");
                hasOrder = false;

                // 发送邮件
                sendMail({
                    subject: `${tradingInfo.orderPrice < _currentPrice ? "✅" : "❌"}${B_SYMBOL}有一单平仓`,
                    text: JSON.stringify({
                        profitMoney: testMoney,
                        tradingInfo: { ...tradingInfo },
                        gridPoints: [...gridPoints],
                    }),
                });
            });
            onGridPoint = false;
            return;
        }
        // 到达止盈点，重新绘制网格
        if (_currentPrice >= point2) {
            // 移动止损保留盈利
            modGridPoints();
            isFirstGetProfit = false;
            onGridPoint = false;
            return;
        }
        // 未到达止盈点，但是到达一定的盈利，重新绘制网格
        // if (
        //     isFirstGetProfit &&
        //     firstGetProfitMaxPrice <= _currentPrice &&
        //     _currentPrice < point2 &&
        //     // (point2 - tradingInfo.orderPrice) / tradingInfo.orderPrice >= 0.005 && // 本来的利润是大于5u的才在未达到盈利时4.5成保护
        //     isProfitOver5U(3) // 不管仓位大小都先保本，大不了不赚这一单钱
        // ) {
        //     // 移动止损保留盈利
        //     modGridPoints(getOver5UNewRate());
        //     firstGetProfitMaxPrice = _currentPrice;
        // }
    } else {
        // 小于3u的都是小单子，直接平仓
        if (_currentPrice >= point2) {
            // 止损平空
            await closeOrder("BUY", tradingInfo.quantity, () => {
                // if (isTest) {
                // 测试
                testMoney +=
                    tradingInfo.quantity * tradingInfo.orderPrice -
                    tradingInfo.quantity * currentPrice -
                    (tradingInfo.quantity * tradingInfo.orderPrice + tradingInfo.quantity * currentPrice) * 0.0005;
                console.log("平空 gridPointClearTrading ~ testMoney:", testMoney);
                // }
                console.log("平空完成");
                hasOrder = false;

                // 发送邮件
                sendMail({
                    subject: `${tradingInfo.orderPrice > _currentPrice ? "✅" : "❌"}${B_SYMBOL}有一单平仓`,
                    text: JSON.stringify({
                        profitMoney: testMoney,
                        tradingInfo: { ...tradingInfo },
                        gridPoints: [...gridPoints],
                    }),
                });
            });
            onGridPoint = false;
            return;
        }
        // 到达止盈点，重新绘制网格
        if (_currentPrice <= point1) {
            // 移动止损保留盈利
            modGridPoints();
            isFirstGetProfit = false;
            onGridPoint = false;
            return;
        }
        // 未到达止盈点，但是到达一定的盈利，重新绘制网格
        // if (
        //     isFirstGetProfit &&
        //     firstGetProfitMaxPrice >= _currentPrice &&
        //     _currentPrice > point1 &&
        //     // (tradingInfo.orderPrice - point1) / tradingInfo.orderPrice >= 0.005 && // 本来的利润是大于10u的才在未达到盈利时保护
        //     isProfitOver5U(3) // 不管仓位大小都先保本，大不了不赚这一单钱
        // ) {
        //     // 移动止损保留盈利
        //     modGridPoints(getOver5UNewRate());
        //     firstGetProfitMaxPrice = _currentPrice;
        // }
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

const calcEma1Ema2 = (params = {}) => {
    const initParams = { emaPeriod1: EMA_PERIOD[0], emaPeriod2: EMA_PERIOD[1], threshold: THRESHOLD };
    const { emaPeriod1, emaPeriod2, threshold } = { ...initParams, ...params };
    let ema1 = calculateEMA([...historyClosePrices], emaPeriod1);
    let ema2 = calculateEMA([...historyClosePrices], emaPeriod2);

    const emaGap = Math.abs(ema1 - ema2) > threshold; // threshold 这里还需要调整参与对比才行？？？？?????>>>>>

    let trend = "hold";

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

// 计算RSI的函数
// RSI（相对强弱指数）的一般标准范围是 0 到 100。通常，传统的理解是：
// RSI 小于 30：被认为是超卖状态，可能出现反弹的机会，市场可能过度卖出。
// RSI 大于 70：被认为是超买状态，可能会有下跌的机会，市场可能过度买入。
// 当 RSI 处于 30 到 70 之间时，市场被认为是在正常范围内，没有明显的超买或超卖信号，可能处于横盘状态。

function calculateRSI(prices, period) {
    if (prices.length < period + 1) {
        throw new Error("数据不足，无法计算 RSI");
    }

    let gains = 0;
    let losses = 0;

    // 计算第一期的平均上涨和平均下跌
    for (let i = 1; i <= period; i++) {
        let change = prices[i] - prices[i - 1];
        if (change > 0) {
            gains += change;
        } else {
            losses -= change;
        }
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;

    let RS = averageGain / averageLoss;
    let RSI = 100 - 100 / (1 + RS);

    // 计算后续时期的平均上涨和平均下跌
    for (let i = period + 1; i < prices.length; i++) {
        let change = prices[i] - prices[i - 1];
        if (change > 0) {
            averageGain = (averageGain * (period - 1) + change) / period;
            averageLoss = (averageLoss * (period - 1)) / period;
        } else {
            averageGain = (averageGain * (period - 1)) / period;
            averageLoss = (averageLoss * (period - 1) - change) / period;
        }

        RS = averageGain / averageLoss;
        RSI = 100 - 100 / (1 + RS);
    }

    return RSI;
}
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
    if (rsiArr.length >= RSI_PERIOD_MAX) {
        rsiArr.shift();
    }
    rsi = calculateRSI(historyClosePrices, RSI_PERIOD_MAX);
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

// 计算 MACD 指标
function calculateMACD(historyClosePrices, periods = MACD_PERIOD) {
    const [shortPeriod, longPeriod, signalPeriod] = periods;
    // 计算短期EMA
    const dif = calculateEMA(historyClosePrices, shortPeriod);
    // 计算长期EMA
    const dea = calculateEMA(historyClosePrices, longPeriod);
    // 计算 DIF（快速线）
    // const dif = shortEMA.map((value, index) => value - longEMA[index]);
    // 计算 DEA（慢速线）
    // const dea = calculateEMA(dif, signalPeriod);
    // 计算 MACD 柱状图
    const macd = dif - dea;
    return { dif, dea, macd };
}
// 取出最后几根
function getLastKlines(num = 3) {
    let res = [];
    const len = kLineData.length;
    while (num > 0) {
        res.push(kLineData[len - num]);
        num--;
    }
    return res;
}
// 是否突破前高
function isBreakPreHigh(max) {
    const tempLast = kLineData.slice(0, maxKLinelen - 3);
    let res = true;
    for (const item of tempLast) {
        if (item.high > max) {
            res = false;
            break;
        }
    }
    console.log("🚀 ~ file: 是否突破前高 res:", res);
    return res;
}
// 突破前低
function isBreakPreLow(min) {
    const tempLast = kLineData.slice(0, 6);
    let res = true;
    for (const item of tempLast) {
        if (item.low < min) {
            res = false;
            break;
        }
    }
    console.log("🚀 ~ file: 是否突破前低 res:", res);
    return res;
}
// 是否十字星
function isCross({ open, close, high, low }, thresholdRatio = 0.35) {
    // 定义一个阈值比例，用于判断开盘价和收盘价的接近程度

    // 计算开盘价和收盘价之间的差值
    const bodyRange = Math.abs(open - close);

    // 计算最高价和最低价之间的差值
    const fullRange = high - low;

    // 判断是否为“十字星”
    const res = bodyRange <= fullRange * thresholdRatio;
    console.log("🚀 ~ 是否十字星 ~ res:", res);
    return res;
}
// 是否 标准
function isBigLine({ open, close, high, low }, thresholdRatio = 0.6) {
    // 计算开盘价和收盘价之间的差值
    const bodyRange = Math.abs(open - close);

    // 计算最高价和最低价之间的差值
    const fullRange = high - low;

    const res = bodyRange >= fullRange * thresholdRatio;
    console.log("🚀 ~ 是否 标准K ~ res:", res);
    return res;
}
// 是否上垂线
function isUpCross(kLine) {
    let res = false;
    if (isCross(kLine)) {
        const { open, close, high, low } = kLine;
        // 上引线
        let upTail = high - Math.max(open, close);
        // 下引线
        let downTail = Math.min(open, close) - low;
        res = downTail > upTail * 2;
    } else {
        res = false;
    }
    console.log("🚀 ~ 是否上垂线 ~ res:", res);
    return res;
}
// 是否下垂线
function isDownCross(kLine, ratio) {
    let res = false;
    if (isCross(kLine, ratio)) {
        const { open, close, high, low } = kLine;
        // 上引线
        let upTail = high - Math.max(open, close);
        // 下引线
        let downTail = Math.min(open, close) - low;
        res = upTail > downTail * 2;
    } else {
        res = false;
    }
    console.log("🚀 ~ 是否下垂线 ~ res:", res);
    return res;
}

// 是否顶分
function isTopFractal(first, middle, last) {
    // 检查中间一根K线的高点是否是三根K线中最高的
    const isMiddleHighHighest = middle.high > first.high && middle.high > last.high;
    // 检查中间一根K线的低点是否是三根K线中最高的
    const isMiddleLowLowest = middle.low > first.low && middle.low > last.low;

    const midBody = Math.abs(middle.close - middle.open);
    const firstBody = Math.abs(first.close - first.open);
    const lastBody = Math.abs(last.close - last.open);

    // 中间k实体不能比两边的大
    const isMiddleSmaller = midBody < firstBody && midBody < lastBody;

    // 返回是否为顶分形态
    const res =
        isCross(middle) &&
        !isCross(first) &&
        !isCross(last) &&
        isMiddleSmaller &&
        isMiddleHighHighest &&
        isMiddleLowLowest &&
        first.open + firstBody / 2 > last.close;

    console.log("🚀 ~ 是否顶分 ~ res:", res);
    return res;
}
// 是否底分
function isBottomFractal(first, middle, last) {
    // 检查中间一根K线的高点是否是三根K线中最低的
    const isMiddleHighHighest = middle.high < first.high && middle.high < last.high;
    // 检查中间一根K线的低点是否是三根K线中最低的
    const isMiddleLowLowest = middle.low < first.low && middle.low < last.low;

    const midBody = Math.abs(middle.close - middle.open);
    const firstBody = Math.abs(first.close - first.open);
    const lastBody = Math.abs(last.close - last.open);

    // 中间k实体不能比两边的大
    const isMiddleSmaller = midBody < firstBody && midBody < lastBody;

    // 返回是否为底分形态
    const res =
        isCross(middle) &&
        !isCross(first) &&
        !isCross(last) &&
        isMiddleSmaller &&
        isMiddleHighHighest &&
        isMiddleLowLowest &&
        first.close + firstBody / 2 < last.close;

    console.log("🚀 ~ 是否 底分形态 ~ res:", res);
    return res;
}
// 两个k线合并看作下垂线
function isDownLinesGroup2(kLine2, kLine3) {
    let res = false;
    if (isUpCross(kLine2) || isUpCross(kLine3)) {
        res = false;
    }
    res = isDownCross({
        open: kLine2.open,
        close: kLine3.close,
        high: Math.max(kLine2.high, kLine3.high),
        low: Math.min(kLine2.low, kLine3.low),
    });
    console.log("🚀 ~ 是否 两个k线合并看作下垂线 ~ res:", res);
    return res;
}
// 两个k线合并看作上垂线
function isUpLinesGroup2(kLine2, kLine3) {
    let res = false;
    if (isDownCross(kLine2) || isDownCross(kLine3)) {
        res = false;
    }
    res = isUpCross({
        open: kLine2.open,
        close: kLine3.close,
        high: Math.max(kLine2.high, kLine3.high),
        low: Math.min(kLine2.low, kLine3.low),
    });
    console.log("🚀 ~ 是否 两个k线合并看作上垂线 ~ res:", res);
    return res;
}
// 三个k线合并看作下垂线
function isDownLinesGroup3(kLine1, kLine2, kLine3) {
    let res = false;
    res = isDownCross({
        open: kLine1.open,
        close: kLine3.close,
        high: Math.max(kLine1.high, kLine2.high, kLine3.high),
        low: Math.min(kLine1.low, kLine2.low, kLine3.low),
    });
    console.log("🚀 ~ 是否 三个k线合并看作下垂线 ~ res:", res);
    return res;
}
// 三根k线合并为上垂线
function isUpLinesGroup3(kLine1, kLine2, kLine3) {
    let res = false;
    res = isUpCross({
        open: kLine1.open,
        close: kLine3.close,
        high: Math.max(kLine1.high, kLine2.high, kLine3.high),
        low: Math.min(kLine1.low, kLine2.low, kLine3.low),
    });
    console.log("🚀 ~ 是否 三根k线合并为上垂线 ~ res:", res);
    return res;
}
// 看跌吞没
function isDownSwallow(kLine2, kLine3) {
    const res =
        kLine3.open > kLine3.close && // 阴烛
        (kLine3.open - kLine3.close) / (kLine3.high - kLine3.low) > 0.52 && // 实体占比大于0.55
        kLine2.low > kLine3.low &&
        kLine2.high < kLine3.high;
    console.log("🚀 ~ 是否 看跌吞没 ~ res:", res);
    return res;
}
// 看涨吞没
function isUpSwallow(kLine2, kLine3) {
    const res =
        kLine3.open < kLine3.close && // 阳烛
        (kLine3.close - kLine3.open) / (kLine3.high - kLine3.low) > 0.52 && // 实体占比大于0.55
        kLine2.low > kLine3.low &&
        kLine2.high < kLine3.high;
    console.log("🚀 ~ 是否 看涨吞没 ~ res:", res);
    return res;
}
// k3 跌破k1/k2，k3是光k
function isBreakDown(kLine1, kLine2, kLine3) {
    const kLine3Mid = (kLine3.open - kLine3.close) / 2;
    const res =
        kLine3.close < kLine3.open && kLine3Mid < kLine1.low && kLine3Mid < kLine2.low && isBigLine(kLine3, 0.6);
    console.log("🚀 ~ 是否 k3 跌破k1/k2，k3是光k ~ res:", res);
    return res;
}
// k3 上破k1/k2，k3是光k
function isBreakUp(kLine1, kLine2, kLine3) {
    const kLine3Mid = (kLine3.close - kLine3.open) / 2;
    const res =
        kLine3.close > kLine3.open && kLine3Mid > kLine1.high && kLine3Mid > kLine2.high && isBigLine(kLine3, 0.6);
    console.log("🚀 ~ 是否 k3 上破k1/k2，k3是光k ~ res:", res);
    return res;
}
// 黄昏星
function isDownStar(kLine1, kLine2, kLine3) {
    const res =
        kLine1.open < kLine1.close &&
        kLine3.open > kLine3.close &&
        kLine1.open + (kLine1.close - kLine1.open) / 2 > kLine3.close && // k1实体的中间位 要高于k3的收盘价
        kLine2.low > kLine3.low &&
        (isDownSwallow(kLine1, kLine3) || isBigAndYin(kLine3, 0.8));
    console.log("🚀 ~ 是否 黄昏星 ~ res:", res);
    return res;
}
// 启明星
function isUpStar(kLine1, kLine2, kLine3) {
    const res =
        kLine1.open > kLine1.close &&
        kLine1.open < kLine1.close &&
        kLine1.close + (kLine1.open - kLine1.close) / 2 < kLine3.close &&
        kLine2.high < kLine3.high &&
        isCross(kLine2) &&
        (isUpSwallow(kLine1, kLine3) || isBigAndYang(kLine3, 0.8));
    console.log("🚀 ~ 是否 启明星 ~ res:", res);
    return res;
}
// 顶顶高
function isHigherHigh(kLine1, kLine2, kLine3) {
    const res =
        kLine1.low < kLine2.low && kLine2.low < kLine3.low && kLine1.high < kLine2.high && kLine2.high < kLine3.high;
    console.log("🚀 ~ 是否 顶顶高 ~ res:", res);
    return res;
}
// 底底低
function isLowerLow(kLine1, kLine2, kLine3) {
    const res =
        kLine1.low > kLine2.low && kLine2.low > kLine3.low && kLine1.high > kLine2.high && kLine2.high > kLine3.high;
    console.log("🚀 ~ 是否 底底低 ~ res:", res);
    return res;
}
// 相互吞没
function isK1Swallow(kLine1, kLine2, kLine3) {
    const k1Swallow =
        kLine1.high > kLine2.high && kLine1.high > kLine3.high && kLine1.low < kLine2.low && kLine1.low < kLine3.low;
    const bodyMax = Math.max(kLine1.close, kLine1.open);
    const bodyMin = Math.min(kLine1.close, kLine1.open);
    const k1BodySwallow =
        bodyMax > Math.max(kLine2.open, kLine2.close, kLine3.open, kLine3.close) &&
        bodyMin < Math.min(kLine2.open, kLine2.close, kLine3.open, kLine3.close);
    // const k1TooBig =
    //     Math.abs(kLine1.open - kLine1.close) -
    //         Math.abs(kLine2.open - kLine2.close) -
    //         Math.abs(kLine3.open - kLine3.close) >
    //     0;
    // const k2TooBig =
    //     Math.abs(kLine2.open - kLine2.close) -
    //         Math.abs(kLine1.open - kLine1.close) -
    //         Math.abs(kLine3.open - kLine3.close) >
    //     0;

    const res = k1Swallow && k1BodySwallow; //|| k1TooBig || k2TooBig;
    console.log("🚀 ~ 是否 相互吞没 ~ res:", res);
    return res;
}
// 是否光头阳
function isBigAndYang(kLine, ratio) {
    const res = kLine.close > kLine.open && isBigLine(kLine, ratio);
    console.log("🚀 ~ 是否光头阳 ~ res:", res);
    return res;
}
// 是否光头阴
function isBigAndYin(kLine, ratio) {
    const res = kLine.close < kLine.open && isBigLine(kLine, ratio);
    console.log("🚀 ~ 是否光头阴 ~ res:", res);
    return res;
}
// 四k上
function isFourUp([one, two, three, four]) {
    let res = false;
    if (
        (isCross(one) &&
            isCross(two) &&
            isCross(three) &&
            isBigAndYang(four) &&
            four.close > Math.max(one.high, two.high, three.high)) ||
        (isBigAndYin(one) && isCross(two) && isCross(three) && isBigAndYang(four))
    ) {
        res = true;
    }
    console.log("🚀 ~ file: 四k上 ~ res:", res);
    return res;
}
// 四k下
function isFourDown([one, two, three, four]) {
    let res = false;
    if (
        (isCross(one) &&
            isCross(two) &&
            isCross(three) &&
            isBigAndYin(four) &&
            four.close < Math.min(one.low, two.low, three.low)) ||
        (isBigAndYang(one) && isCross(two) && isCross(three) && isBigAndYin(four))
    ) {
        res = true;
    }
    console.log("🚀 ~ file: 四k下 ~ res:", res);
    return res;
}
// k1大阴k的+k2实体最小 + 大阴k+k3实体一半小于前方实体最低值
const downPao = (one, two, three) => {
    let res = false;
    const twoBody = Math.abs(two.open - two.close);
    if (
        isBigAndYin(one) &&
        isBigAndYin(three) &&
        twoBody < Math.abs(one.open - one.close) &&
        twoBody < Math.abs(three.open - three.close) &&
        three.close < Math.min(one.low, two.low)
    ) {
        res = true;
    }
    console.log("🚀 ~ file: 空方炮 res:", res);
    return res;
};
const upPao = (one, two, three) => {
    let res = false;
    const twoBody = Math.abs(two.open - two.close);
    if (
        isBigAndYang(one) &&
        isBigAndYang(three) &&
        twoBody < Math.abs(one.open - one.close) &&
        twoBody < Math.abs(three.open - three.close) &&
        three.close < Math.max(one.high, two.high)
    ) {
        res = true;
    }
    console.log("🚀 ~ file: 多方炮 res:", res);
    return res;
};
// 是否在50均线之下
const isDownMa = (kLine1, kLine2, kLine3, ma) => {
    let res = false;
    const k1Center = Math.min(kLine1.open, kLine1.close) + Math.abs(kLine1.open - kLine1.close) / 2;
    const k2Center = Math.min(kLine2.open, kLine2.close) + Math.abs(kLine2.open - kLine2.close) / 2;
    const k3Center = Math.min(kLine3.open, kLine3.close) + Math.abs(kLine3.open - kLine3.close) / 2;
    if (Math.max(k1Center, k2Center, k3Center) <= ma) {
        res = true;
    }
    console.log("🚀 ~ file: 是否在50均线之下 ~ res:", res);
    return res;
};
// 是否在50均线之上
const isUpMa = (kLine1, kLine2, kLine3, ma) => {
    let res = false;
    const k1Center = Math.min(kLine1.open, kLine1.close) + Math.abs(kLine1.open - kLine1.close) / 2;
    const k2Center = Math.min(kLine2.open, kLine2.close) + Math.abs(kLine2.open - kLine2.close) / 2;
    const k3Center = Math.min(kLine3.open, kLine3.close) + Math.abs(kLine3.open - kLine3.close) / 2;
    if (Math.min(k1Center, k2Center, k3Center) >= ma) {
        res = true;
    }
    console.log("🚀 ~ file: 是否在50均线之上 ~ res:", res);
    return res;
};
// macd 指标向上
const isUpMacd = () => {
    const macd2 = macdArr[macdArr.length - 2].macd;
    const macd3 = macdArr[macdArr.length - 1].macd;
    const macd1 = macdArr[macdArr.length - 3].macd;
    let res = false;
    if (macd3 == 0) {
        res = macd1 < 0 && macd2 < 0;
    } else {
        res = macd3 - macd2 > 0;
    }
    console.log("🚀 ~ file: macd 指标向上:", res, macd2, macd3);
    return res;
};
// macd 指标向下
const isDownMacd = () => {
    const macd2 = macdArr[macdArr.length - 2].macd;
    const macd3 = macdArr[macdArr.length - 1].macd;
    let res = false;
    if (macd3 == 0) {
        res = macd1 > 0 && macd2 > 0;
    } else {
        res = macd3 - macd2 < 0;
    }
    console.log("🚀 ~ file: macd 指标向下:", res, macd2, macd3);
    return res;
};

function isTrackTopReverse({ upperBand, sma, lowerBand }, { kLine1, kLine2, kLine3 }) {
    let curRsiMax = calculateRSI([...historyClosePrices], RSI_PERIOD_MAX);
    let reasonBack = [
        kLine3.close >= kLine3.open, // k3不能是阳线
        kLine2.high > kLine3.high && kLine2.low < kLine3.low, // 孕线绝对不可以，机会多得是，放弃一次又怎样
        isAllDownTail(kLine1, kLine2, kLine3), // 有两个都是长下引线的不要
        curRsiMax > 65, // rsi（14） 在35-65之间
        // isK1Swallow(kLine1, kLine2, kLine3), // k1 body吞没k2，k3
        // isK1Swallow(kLine2, kLine1, kLine3) && kLine2.close > kLine2.open,
        kLine3.close - kLine3.low >= (kLine3.high - kLine3.low) * 0.5, // 当前k收盘方向引线不能大于整体0.5
        // tooManeyInTen(),
    ];
    let reasonPass = [];
    console.log("~ isTrackTopReverse ~ reasonBack:", reasonBack);
    if (reasonBack.some((r) => r)) {
        return false;
    } else {
        reasonPass = [
            curRsiMax < 65,
            isTopFractal(kLine1, kLine2, kLine3) || // 是否顶分形态
                (isDownLinesGroup2(kLine2, kLine3) && (isDownCross(kLine3) || isBigAndYin(kLine3, 0.6))) || // 是否两个k形成垂线/光头阴
                (isDownLinesGroup3(kLine1, kLine2, kLine3) &&
                    (isBigAndYin(kLine3, 0.6) || isDownCross(kLine3, 0.45))) || // 是否三个k形成垂线
                (isDownSwallow(kLine2, kLine3) && kLine3.low < kLine1.low) || // 看跌吞没
                (isDownSwallow(kLine1, kLine2) && isBigAndYin(kLine3, 0.6)) || // 看跌吞没 + 大阴k
                (isDownLinesGroup2(kLine1, kLine2) && (isDownCross(kLine3) || isBigLine(kLine3, 0.6))) || // k1，k2刺透, k3垂线/光头阴
                isDownStar(kLine1, kLine2, kLine3) || // 黄昏星
                isBreakDown(kLine1, kLine2, kLine3) || // k3 跌破k1/k2，k3是光k
                isFourDown(getLastKlines(4)) || // 4k上
                downPao(kLine1, kLine2, kLine3), // 空方炮
        ];
        console.log("~ isTrackTopReverse ~ reasonPass:", reasonPass);
        if (reasonPass.every((r) => r)) {
            return true;
        }
    }
    return false;
}
function isTrackBottomReverse({ upperBand, sma, lowerBand }, { kLine1, kLine2, kLine3 }) {
    let curRsiMax = calculateRSI([...historyClosePrices], RSI_PERIOD_MAX);
    let reasonBack = [
        kLine3.close <= kLine3.open, // k3不能是阴线
        kLine2.high > kLine3.high && kLine2.low < kLine3.low, // 孕线绝对不可以，机会多得是，放弃一次又怎样
        // isCross(kLine3),
        // tooManeyInTen(),
        isAllUpTail(kLine1, kLine2, kLine3), // 有两个都是长上引线的不要
        curRsiMax < 35,
        // isK1Swallow(kLine1, kLine2, kLine3), // k1 body吞没k2，k3
        // isK1Swallow(kLine2, kLine1, kLine3) && kLine2.close < kLine2.open,
        kLine3.high - kLine3.close >= (kLine3.high - kLine3.low) * 0.5, // 当前k收盘方向引线不能大于整体0.5
        upPao(kLine1, kLine2, kLine3), // 多方炮
    ];
    let reasonPass = [];
    console.log("🚀 isTrackBottomReverse ~ reasonBack:", reasonBack);
    if (reasonBack.some((r) => r)) {
        return false;
    } else {
        reasonPass = [
            curRsiMax > 35, // rsi（14） 在35-65之间
            isBottomFractal(kLine1, kLine2, kLine3) || // 是否底分形态
                (isUpLinesGroup2(kLine2, kLine3) && (isUpCross(kLine1) || isBigAndYang(kLine1, 0.6))) || // 是否两个k形成垂线
                (isUpLinesGroup3(kLine1, kLine2, kLine3) && (isBigAndYang(kLine3, 0.6) || isUpCross(kLine3, 0.45))) || // 是否三个k形成垂线
                (isUpSwallow(kLine2, kLine3) && kLine3.high > kLine1.high) || // 看涨吞没
                (isUpSwallow(kLine1, kLine2) && isBigAndYang(kLine3, 0.6)) || // 看涨吞没 + 大阳k
                (isUpLinesGroup2(kLine1, kLine2) && (isUpCross(kLine3) || isBigLine(kLine3, 0.6))) || // k1，k2刺透, k3垂线
                isUpStar(kLine1, kLine2, kLine3) || // 启明星
                isBreakUp(kLine1, kLine2, kLine3) || // k3 突破k1/k2，k3是光k
                isFourUp(getLastKlines(4)) || // 4k上
                upPao(kLine1, kLine2, kLine3), // 多方炮
        ];
        console.log("🚀 isTrackBottomReverse ~ reasonPass:", reasonPass);
        if (reasonPass.every((r) => r)) {
            return true;
        }
    }
    return false;
}
// 从中轨下方到中轨
function isBreakthroughSmaUp({ upperBand, sma, lowerBand }, { kLine1, kLine2, kLine3 }) {
    let curRsiMin = calculateRSI([...historyClosePrices], RSI_PERIOD_MIN);
    // let curEmaSlope = calculateEMASlope(emaArr, RSI_PERIOD_MIN / 2);
    // if (curEmaSlope < 0) {
    //     //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>给个准确值，而且不是放在这里，放在开单处，而且顶/底，也需要这个判断，太平了就是横盘啊，突破交给了两外的逻辑的，别担心，也别贪心
    //     return false;
    // }
    let reasonBack = [
        kLine3.close <= kLine3.open, // k3不能是阴线
        kLine2.high > kLine3.high && kLine2.low < kLine3.low, // 孕线绝对不可以，机会多得是，放弃一次又怎样
        isCross(kLine3),
        // tooManeyInTen(),
        isAllUpTail(kLine1, kLine2, kLine3), // 有两个都是长上引线的不要
        isK1Swallow(kLine1, kLine2, kLine3), // k1 body吞没k2，k3
        isK1Swallow(kLine2, kLine1, kLine3) && kLine2.close < kLine2.open,
        kLine3.high - kLine3.close >= (kLine3.high - kLine3.low) * 0.5, // 当前k收盘方向引线不能大于整体0.5 >>>>>>
    ];
    if (curRsiMin > 65 && !reasonBack.some((r) => r)) {
        console.log("🚀 ~ file: gridBot-doge7-1.js:1423 ~ isBreakthroughSmaUp ~ curRsiMin:", curRsiMin);
        return true;
    } else {
        let reasonPass = [];
        console.log("🚀 ~ isBreakthroughSmaUp ~ reasonBack:", reasonBack);
        if (reasonBack.some((r) => r)) {
            return false;
        } else {
            // const { trend } = calcEma1Ema2();
            // let ma = calculateEMA([...historyClosePrices], 50);
            reasonPass = [
                // isUpMa(kLine1, kLine2, kLine3, ma),
                isUpMacd(),
                // trend === "up",
                // curRsiMin > 40 && curRsiMin < 60, // rsi（6） 在40-60之间 >>> 没必要吧，干嘛要做横盘，目的是接住边轨漏掉的单子而已
                (isHigherHigh(kLine1, kLine2, kLine3) && isBigLine(kLine3, 0.6)) || // 顶顶高 k3是光k / 三小连阳
                    isBottomFractal(kLine1, kLine2, kLine3) || // 是否底分形态
                    (isUpLinesGroup2(kLine2, kLine3) && (isUpCross(kLine1) || isBigAndYang(kLine1, 0.6))) || // 是否两个k形成垂线/光头阳
                    (isUpLinesGroup3(kLine1, kLine2, kLine3) &&
                        (isBigAndYang(kLine3, 0.6) || isUpCross(kLine3, 0.4))) || // 是否三个k形成垂线
                    (isUpSwallow(kLine2, kLine3) && kLine3.high > kLine1.high) || // 看涨吞没
                    (isUpSwallow(kLine1, kLine2) && isBigAndYang(kLine3, 0.6)) || // 看涨吞没 + 大阳k
                    (isUpLinesGroup2(kLine1, kLine2) && (isUpCross(kLine3) || isBigLine(kLine3, 0.6))) || // k1，k2刺透, k3垂线/光头阳
                    isUpStar(kLine1, kLine2, kLine3) || // 启明星
                    isBreakUp(kLine1, kLine2, kLine3) || // k3 突破k1/k2，k3是光k
                    isFourUp(getLastKlines(4)) || // 4k上
                    upPao(kLine1, kLine2, kLine3), // 多方炮
            ];
            console.log("🚀 ~ isBreakthroughSmaUp ~ reasonPass:", reasonPass);
            if (reasonPass.every((r) => r)) {
                return true;
            }
        }
    }

    return false;
}
function isBreakthroughSmaDown({ upperBand, sma, lowerBand }, { kLine1, kLine2, kLine3 }) {
    let curRsiMin = calculateRSI([...historyClosePrices], RSI_PERIOD_MIN);
    // let curEmaSlope = calculateEMASlope(emaArr, RSI_PERIOD_MIN / 2);
    // if (curEmaSlope > 0) {
    //     return false;
    // }
    let reasonBack = [
        kLine3.close >= kLine3.open, // k3不能是阳线
        kLine2.high > kLine3.high && kLine2.low < kLine3.low, // 孕线绝对不可以，机会多得是，放弃一次又怎样
        isCross(kLine3),
        // tooManeyInTen(),
        isAllDownTail(kLine1, kLine2, kLine3), // 有两个都是长下引线的不要
        isK1Swallow(kLine1, kLine2, kLine3), // k1 body吞没k2，k3
        isK1Swallow(kLine2, kLine1, kLine3) && kLine2.close > kLine2.open,
        kLine3.close - kLine3.low >= (kLine3.high - kLine3.low) * 0.5, // 当前k收盘方向引线不能大于整体0.5 >>>>>>
    ];
    if (curRsiMin < 35 && !reasonBack.some((r) => r)) {
        console.log("🚀 ~ file: gridBot-doge7-1.js:1463 ~ isBreakthroughSmaDown ~ curRsiMin:", curRsiMin);
        return true;
    } else {
        let reasonPass = [];
        console.log("🚀 ~ isBreakthroughSmaDown ~ reasonBack:", reasonBack);
        if (reasonBack.some((r) => r)) {
            return false;
        } else {
            // const { trend } = calcEma1Ema2();
            // let ma = calculateEMA([...historyClosePrices], 50);
            reasonPass = [
                // isDownMa(kLine1, kLine2, kLine3, ma),
                isDownMacd(),
                // trend === "down",
                // curRsiMin > 40 && curRsiMin < 60, // rsi（6） 在40-60之间 >>> 没必要吧，干嘛要做横盘，目的是接住边轨漏掉的单子而已
                (isLowerLow(kLine1, kLine2, kLine3) && isBigLine(kLine3, 0.6)) || // 顶顶高 k3是光k / 三小连阳
                    isTopFractal(kLine1, kLine2, kLine3) || // 是否顶分形态
                    (isDownLinesGroup2(kLine2, kLine3) && (isDownCross(kLine1) || isBigAndYin(kLine1, 0.6))) || // 是否两个k形成垂线/光头阴
                    (isDownLinesGroup3(kLine1, kLine2, kLine3) &&
                        (isBigAndYin(kLine3, 0.6) || isDownCross(kLine3, 0.4))) || // 是否三个k形成垂线
                    (isDownSwallow(kLine2, kLine3) && kLine3.low < kLine1.low) || // 看跌吞没
                    (isDownSwallow(kLine1, kLine2) && isBigAndYin(kLine3, 0.6)) || // 看跌吞没 + 大阴k
                    (isDownLinesGroup2(kLine1, kLine2) && (isDownCross(kLine3) || isBigLine(kLine3, 0.6))) || // k1，k2刺透, k3垂线/大k
                    isDownStar(kLine1, kLine2, kLine3) || // 启明星
                    isBreakDown(kLine1, kLine2, kLine3) || // k3 突破k1/k2，k3是光k
                    isFourDown(getLastKlines(4)) || // 4k上
                    downPao(kLine1, kLine2, kLine3), // 多方炮
            ];
            console.log("🚀 ~ isBreakthroughSmaDown ~ reasonPass:", reasonPass);
        }
        if (reasonPass.every((r) => r)) {
            return true;
        }
    }
    return false;
}
// 最后10根k线，最后三根形成的上下值包裹了前面超过6根的都不能要
function tooManeyInTen() {
    const tempLastTen = kLineData.slice(kLineData.length - 10);
    const last = kLineData[kLineData.length - 1];
    const max = last.high;
    const min = last.low;
    let num = -1;
    for (const item of tempLastTen) {
        if (Math.max(item.close, item.open) <= max || Math.min(item.close, item.open) >= min) {
            num++;
        }
    }
    return num >= 3;
}
// 长下引线
function isAllDownTail(kLine1, kLine2, kLine3) {
    let num = 0;
    if (
        !isCross(kLine1) &&
        (Math.min(kLine1.open, kLine1.close) - kLine1.low) / Math.abs(kLine1.open - kLine1.close) > 0.6
    ) {
        num++;
    }
    if (
        !isCross(kLine2) &&
        (Math.min(kLine2.open, kLine2.close) - kLine2.low) / Math.abs(kLine2.open - kLine2.close) > 0.6
    ) {
        num++;
    }
    if (
        !isCross(kLine3) &&
        (Math.min(kLine3.open, kLine3.close) - kLine3.low) / Math.abs(kLine3.open - kLine3.close) > 0.6
    ) {
        num++;
    }
    console.log("🚀 ~ k1 k2 k3长下引线 ~ res:", num >= 2);
    return num >= 2;
}
// 长上引线
function isAllUpTail(kLine1, kLine2, kLine3) {
    let num = 0;
    if (
        !isCross(kLine1) &&
        (kLine1.high - Math.max(kLine1.open, kLine1.close)) / Math.abs(kLine1.open - kLine1.close) > 0.6
    ) {
        num++;
    }
    if (
        !isCross(kLine2) &&
        (kLine2.high - Math.max(kLine2.open, kLine2.close)) / Math.abs(kLine2.open - kLine2.close) > 0.6
    ) {
        num++;
    }
    if (
        !isCross(kLine3) &&
        (kLine3.high - Math.max(kLine3.open, kLine3.close)) / Math.abs(kLine3.open - kLine3.close) > 0.6
    ) {
        num++;
    }
    console.log("🚀 ~ k1 k2 k3长上引线 ~ res:", num >= 2);
    return num >= 2;
}
// 根据指标生成交易信号
function calculateTradingSignal() {
    const [kLine1, kLine2, kLine3] = getLastKlines(3);

    // 计算布林带
    const { upperBand, sma, lowerBand } = calculateBollingerBands([...historyClosePrices], BOLL_PERIOD, STD_MULTIPLIER);

    const max = Math.max(kLine1.high, kLine2.high, kLine3.high);
    const min = Math.min(kLine1.low, kLine2.low, kLine3.low);

    // const bodyMax = Math.max(kLine2.open, kLine2.close, kLine3.open, kLine3.close);
    // const bodyMin = Math.min(kLine1.close, kLine2.open, kLine2.close, kLine3.open, kLine3.close);

    // 跨越上下轨的不做，很可能是横盘或者插针
    if (kLine3.high > upperBand && lowerBand > kLine3.low) {
        return { trend: "hold" };
    }

    // 从上轨下来(看最后一根k，引线在外即可，只做线上反转，才能保证1:1盈亏比)
    if (
        kLine3.close < kLine3.open &&
        kLine3.close <= Math.max(kLine2.close, kLine2.open) - Math.abs(kLine2.close - kLine2.open) / 2 &&
        max >= upperBand && // 避免错过机会
        upperBand > kLine3.close &&
        min > sma
    ) {
        // 不能是从sma跨到upperBand上的
        // 是否上轨反转做空形态
        if (isTrackTopReverse({ upperBand, sma, lowerBand }, { kLine1, kLine2, kLine3 })) {
            let stopLoss = kLine3.high; // 少亏损
            let stopProfit = currentPrice - (stopLoss - currentPrice) * profitRate;

            if ((currentPrice - stopProfit) / currentPrice < 0.001) {
                console.log("盈利太小");
                return { trend: "hold" };
            }
            return {
                trend: "down",
                stopLoss,
                stopProfit,
            };
        }
    }
    // 从下轨上来(看最后一根k，引线在外即可)
    if (
        kLine3.close > kLine3.open &&
        kLine3.close >= Math.min(kLine2.close, kLine2.open) + Math.abs(kLine2.close - kLine2.open) / 2 &&
        min <= lowerBand && // 避免错过机会
        lowerBand < kLine3.close &&
        max < sma
    ) {
        // 不能是从sma跨到lowerBand下的
        // 是否下轨反转做多形态
        if (isTrackBottomReverse({ upperBand, sma, lowerBand }, { kLine1, kLine2, kLine3 })) {
            let stopLoss = kLine3.low; // 少亏损
            let stopProfit = currentPrice + (currentPrice - stopLoss) * profitRate;
            if ((stopProfit - currentPrice) / currentPrice < 0.001) {
                console.log("盈利太小");
                return { trend: "hold" };
            }
            return {
                trend: "up",
                stopLoss,
                stopProfit,
            };
        }
    }

    // 中轨 ==> 上轨 || 下轨 ==> 中轨（做多）
    if (
        kLine3.close > kLine3.open &&
        (isBigAndYang(kLine3, 0.8) || isUpCross(kLine3, 0.5)) &&
        ((kLine3.low <= sma && upperBand < kLine3.high) || (kLine3.low <= lowerBand && sma < kLine3.high))
    ) {
        let stopLoss = kLine3.low;
        let stopProfit = currentPrice + (currentPrice - stopLoss) * profitRate;
        if ((stopProfit - currentPrice) / currentPrice < 0.001) {
            console.log("盈利太小");
            return { trend: "hold" };
        }
        return {
            trend: "up",
            stopLoss,
            stopProfit,
        };
    }
    // 中轨 ==> 下轨 || 上轨 ==> 中轨 (做空)
    if (
        kLine3.close < kLine3.open &&
        (isBigAndYin(kLine3, 0.8) || isDownCross(kLine3, 0.5)) &&
        ((kLine3.low < lowerBand && sma <= kLine3.high) || (kLine3.low < sma && upperBand <= kLine3.high))
    ) {
        let stopLoss = kLine3.high;
        let stopProfit = currentPrice - (stopLoss - currentPrice) * profitRate;
        if ((currentPrice - stopProfit) / currentPrice < 0.001) {
            console.log("盈利太小");
            return { trend: "hold" };
        }
        return {
            trend: "down",
            stopLoss,
            stopProfit,
        };
    }
    // 是否从下往上突破中轨做多(看最后一根k，实体穿过才算)
    if (kLine3.close > kLine3.open && kLine3.low <= sma && sma < kLine3.close) {
        if (max < upperBand && isBreakthroughSmaUp({ upperBand, sma, lowerBand }, { kLine1, kLine2, kLine3 })) {
            let stopLoss = kLine3.low;
            if ((currentPrice - stopLoss) / currentPrice < 0.001) {
                console.log("stopLoss比太小");
                return { trend: "hold" };
            }
            // stopLoss比太大 可以用5U止盈法
            return {
                trend: "up",
                stopLoss,
                stopProfit: currentPrice + (currentPrice - stopLoss) * profitRate,
            };
        }
    }
    // 是否从上往下突破中轨做空(看最后一根k，实体穿过才算)
    if (kLine3.close < kLine3.open && kLine3.high >= sma && sma > kLine3.close) {
        if (min > lowerBand && isBreakthroughSmaDown({ upperBand, sma, lowerBand }, { kLine1, kLine2, kLine3 })) {
            let stopLoss = kLine3.high;
            if ((stopLoss - currentPrice) / currentPrice < 0.001) {
                console.log("stopLoss比太小");
                return { trend: "hold" };
            }
            // stopLoss比太大 可以用5U止盈法
            return {
                trend: "down",
                stopLoss,
                stopProfit: currentPrice - (stopLoss - currentPrice) * profitRate,
            };
        }
    }
    return { trend: "hold" }; // 默认为 hold
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
            refreshKLine(curKLine);
            judgeAndTrading();
        }

        // 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
        // 没有订单也不继续了
        if (isLoading() || prePrice === currentPrice || !hasOrder) {
            return;
        } else {
            await gridPointClearTrading(currentPrice); // 每秒会触发4次左右，但是需要快速判断是否进入交易点，所以不节流
        }
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
        // 发送邮件
        sendMail({
            subject: `❌❌❌ ${B_SYMBOL}仓位发生错误，请手动处理`,
            text: JSON.stringify({
                tradingInfo: { ...tradingInfo },
                gridPoints: [...gridPoints],
            }),
        });
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
                tradingInfo, // 订单数据
                gridPoints, // 网格每个交易点
                candleHeight: candleHeight,
                isFirstGetProfit: isFirstGetProfit,
            });
            fs.writeFileSync(`data/${SYMBOL}.js`, `module.exports = ${data}`, { flag: "w" });
            console.log(`Global variables saved to data/${SYMBOL}.js`);
        }
    }, 0);
}
