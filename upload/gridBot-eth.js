// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const axios = require("axios"); // HTTP请求库
const sendMail = require("./mailer.js");
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
    hasUpDownVal,
    calculateAverage,
    throttleImmediate,
    findFarthestNumber,
} = require("./utils/functions.js");
const config = require("./config-mading.js");

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
    overNumber,
} = config["op"];

// 环境变量
const B_SYMBOL = SYMBOL.toUpperCase();
const isTest = true; // 将此标志设置为  false/true 使用沙盒环境
const showProfit = true;
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
// let httpProxyAgent=new HttpsProxyAgent("http://127.0.0.1:10809");
// let socksProxyAgent=new SocksProxyAgent("socks5://127.0.0.1:10808");

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
// const ws=new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@aggTrade`, {agent: socksProxyAgent});
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
let historyEntryPoints = [];
let currentPrice = 0; // 记录当前价格
let prePrice = 0; // 记录当前价格的前一个
let gridPoints = []; // 网格每个交易点
let gridPoints2 = []; // 网格每个交易点 利润奔跑模式使用
let currentPriceEma; // 当前价格的EMA值
let serverTimeOffset = 0; // 服务器时间偏移
let historyClosePrices = []; // 历史收盘价，用来计算EMA
let curGridPoint = undefined; // 当前网格
let prePointIndex = undefined; // 上一个网格
let currentPointIndex = undefined; // 当前网格
let tradingDatas = {}; // 订单数据
let allPositionDetail = {}; // 当前仓位信息
let candleHeight = 0; // 蜡烛高度
let gridHight = minGridHight; // 网格高度
let overNumberOrderArr = []; // 超过 overNumber 手数的单子集合
let isOldOrder = false; // 是不是老单子
let oldOrder = {};
let isProfitRun = false; // 让利润奔跑起来
let isFirstGetProfit = false; // 是否利润奔跑后的第一次盈利

// 最新交易信息 利润奔跑模式使用
let tradingInfo = {
    trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
    side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
    orderPrice: 0,
    quantity: 0,
    times: 0,
};
const resetTradingDatas = () => {
    tradingInfo = {
        // trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
        // side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
        // orderPrice: 0,
        // quantity: 0,
        // times: 0,
    };
};
const shadowBodyRate = 2; // 插针时，引线/实体

let curProfitRate = profitRate;

let firsttradeTime = 0;

let curMaxPrice = 0; // 当前这一轮的二线最高价
let curMinPrice = 0; // 当前这一轮的二线最低价

// 这些指标，都不能预测，都马后炮
const THRESHOLD = gridHight * 0.015; // 阈值
const RSI_PERIOD = 10; // RSI计算周期

const maxKLinelen = 600; // 储存kLine最大数量
const STD_MULTIPLIER = 2; // 用来确定布林带的宽度
const BOLL_PERIOD = 20;
const RSI_PERIOD_MIN = 14 * 5; // RSI计算周期
const RSI_PERIOD_MAX = 500; // RSI计算周期

let emaArr = [];
let macdArr = [];
let rsiGroupArr = [];
let ema1Arr = [];
let ema2Arr = [];
let ema3Arr = [];

const MACD_PERIOD = [9 * 5, 26 * 5, 9 * 5];

// 日志
let logStream = null;
let errorStream = null;

// loading
let loadingPlaceOrder = false; // 下单
let loadingCloseOrder = false; // 平仓
let loadingReverseTrade = false; // 反手
let loadingForehandTrade = false; // 顺手
let onGridPoint = false; // 网格上
let loadingInit = false;
let loadingNewPoints = false;

const isLoading = () => {
    return (
        loadingInit ||
        loadingNewPoints ||
        loadingPlaceOrder ||
        loadingCloseOrder ||
        loadingReverseTrade ||
        loadingForehandTrade ||
        onGridPoint
    );
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
    kLineData = await getKLineData(B_SYMBOL, `${klineStage}m`, maxKLinelen);
    historyClosePrices = kLineData.map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
    // console.log("k线收盘价:", kLineData);

    // 初始化指标
    initEveryIndex();

    candleHeight = calculateCandleHeight(kLineData);
    let _gridHight = candleHeight * howManyCandleHeight;
    gridHight = _gridHight;
};

/**
 * 计算单个真实范围（True Range, TR）
 * @param {number} high 当前最高价
 * @param {number} low 当前最低价
 * @param {number} prevClose 前一收盘价
 * @returns {number} 真实范围值
 */
function calculateTrueRange(high, low, prevClose) {
    return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
}

/**
 * 计算平均真实范围（Average True Range, ATR）
 * @param {Array} kLines K线数据数组，每个元素为一个对象，包含 {high, low, close} 属性
 * @param {number} period 计算 ATR 的周期（例如 14）
 * @returns {Array} ATR 值数组
 */
function calculateATR(kLines, period) {
    let trValues = [];
    let atrValues = [];

    for (let i = 0; i < kLines.length; i++) {
        if (i === 0) {
            // 第一根 K 线没有前一收盘价，TR 值为最高价减最低价
            trValues.push(kLines[i].high - kLines[i].low);
        } else {
            // 计算 TR 值
            trValues.push(calculateTrueRange(kLines[i].high, kLines[i].low, kLines[i - 1].close));
        }

        // 计算 ATR 值
        if (i >= period - 1) {
            if (i === period - 1) {
                // 第一个 ATR 值为前 period 个 TR 值的简单平均
                const initialATR = trValues.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
                atrValues.push(initialATR);
            } else {
                // 后续 ATR 值为前一个 ATR 值与当前 TR 值的加权平均
                const prevATR = atrValues[atrValues.length - 1];
                const currentTR = trValues[i];
                const currentATR = (prevATR * (period - 1) + currentTR) / period;
                atrValues.push(currentATR);
            }
        }
    }

    return {
        atrArr: atrValues,
        atr: atrValues[atrValues.length - 1],
    };
}
const pushOverNumberOrderArr = (count) => {
    if (count <= 0) return;
    let num = 1;
    const h = gridPoints[2] - gridPoints[1];
    if (count > overNumber - 1) {
        num = Math.pow(2, count - (overNumber - 1));
        while (num > 0) {
            overNumberOrderArr.push({
                count: 4,
                gridHight: h,
            });
            num--;
        }
    } else {
        overNumberOrderArr.push({
            count: count,
            gridHight: h,
        });
    }
    console.log(
        "🚀 ~ file: file: pushOverNumberOrderArr ~ overNumberOrderArr:",
        overNumberOrderArr.length,
        overNumberOrderArr,
    );
    saveGlobalVariables();
};

const _refreshPrice = (curKLine) => {
    kLineData.length >= maxKLinelen && kLineData.shift();
    historyClosePrices.length >= maxKLinelen && historyClosePrices.shift();

    kLineData.push(curKLine);
    historyClosePrices.push(curKLine.close);

    // 更新平均蜡烛高度
    candleHeight = calculateCandleHeight(kLineData);
    let _gridHight = candleHeight * howManyCandleHeight;

    gridHight = _gridHight;

    // 设置各种指标
    setEveryIndex([...historyClosePrices]);
};

const setEveryIndex = (prices) => {
    // 计算 ema
    // setSimpleEmaArr(historyClosePrices, BOLL_PERIOD);

    // 计算macd
    setMacdArr(prices);

    // 计算rsi
    setRsiGroupArr(prices);
};

const setSimpleEmaArr = (prices, period) => {
    if (emaArr.length >= 50) {
        emaArr.shift();
    }
    emaArr.push(calculateEMA(prices, period));
};
const setMacdArr = (prices, period) => {
    if (macdArr.length >= 50) {
        macdArr.shift();
    }
    macdArr.push(calculateMACD(prices, period));
};
const setRsiGroupArr = (prices) => {
    if (rsiGroupArr.length >= 50) {
        rsiGroupArr.shift();
    }
    rsiGroupArr.push({
        short: calculateRSI(prices, RSI_PERIOD_MIN),
        long: calculateRSI(prices, RSI_PERIOD_MAX),
    });
};

function calculateEmaArr(prices, period) {
    const k = 2 / (period + 1);
    let emaArray = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
        const ema = prices[i] * k + emaArray[i - 1] * (1 - k);
        emaArray.push(ema);
    }
    return emaArray;
}

// 计算 MACD 指标
function calculateMACD(prices, periods) {
    const [shortPeriod, longPeriod, signalPeriod] = periods || MACD_PERIOD;
    if (prices.length < longPeriod) {
        throw new Error("价格数组的长度必须大于长周期");
    }

    const shortEMA = calculateEmaArr(prices, shortPeriod);
    const longEMA = calculateEmaArr(prices, longPeriod);

    const macdLine = shortEMA.map((value, index) => value - longEMA[index]);

    const signalLine = calculateEmaArr(macdLine.slice(longPeriod - shortPeriod), signalPeriod);
    const histogram = macdLine.slice(longPeriod - shortPeriod).map((value, index) => value - signalLine[index]);

    // 返回最新一组MACD值
    // DIF 对应 macdLine：这是快线，即短周期EMA与长周期EMA的差。
    // DEA 对应 signalLine：这是慢线，即DIF的信号线（DIF的EMA）。
    // MACD 对应 histogram：这是柱状图，即DIF与DEA的差。
    return {
        dif: macdLine[macdLine.length - 1],
        dea: signalLine[signalLine.length - 1],
        macd: histogram[histogram.length - 1],
    };
}
const initEveryIndex = () => {
    const len = historyClosePrices.length;
    for (let index = 0; index < 10; index++) {
        setEveryIndex(historyClosePrices.slice(0, len - 10));
    }
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
// 下单（开多操作/开空操作）
const placeOrder = async (side, quantity, resetTradingDatas) => {
    console.log(
        `下单（开${side === "SELL" ? "空" : "多"}操作）placeOrder ~ side, quantity resetTradingDatas:`,
        side,
        quantity,
        resetTradingDatas,
    );
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
            const index = side === "BUY" ? 2 : 1;
            if (resetTradingDatas) {
                tradingDatas = {};
                currentPointIndex = index;
                await recordTradingDatas(index, trend, {
                    trend,
                    side,
                    orderPrice: _currentPrice,
                    quantity: Math.abs(origQty),
                    // orderTime: Date.now(),
                });
            } else {
                await recordTradingDatas(index, trend, {
                    trend,
                    side,
                    orderPrice: _currentPrice,
                    quantity: Math.abs(origQty),
                    // orderTime: Date.now(),
                });
            }
            saveGlobalVariables();
            console.log("placeOrder ~ 下单成功 currentPointIndex tradingDatas:", currentPointIndex, tradingDatas);

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
const teadeBuy = async (times, resetTradingDatas) => {
    try {
        await placeOrder("BUY", getQuantity(times), resetTradingDatas); // 调整开仓数量
        console.log("开多完成");
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};
// 开空
const teadeSell = async (times, resetTradingDatas) => {
    try {
        await placeOrder("SELL", getQuantity(times), resetTradingDatas); // 调整开仓数量
        console.log("开空完成");
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};

// 更新购买信息
const recordTradingDatas = async (index, trend, info) => {
    if (currentPointIndex === undefined) return;
    // 更新购买信息
    if (tradingDatas[index]) {
        if (tradingDatas[index][trend]) {
            tradingDatas[index][trend] = {
                ...tradingDatas[index][trend],
                ...info,
            };
        } else {
            tradingDatas[index][trend] = { ...info };
        }
    } else {
        tradingDatas[index] = {
            [trend]: { ...info },
        };
    }
    console.log("Purchase Info Updated:", tradingDatas);
};
// 启动时通过EMA判断价格走势
const initializeTrading = async () => {
    try {
        loadingInit = true;
        const len = historyClosePrices.length;
        if (!len || !currentPrice) {
            console.log("ema1Arr / currentPrice 为空", historyClosePrices, currentPrice);
            throw new Error("ema1Arr / currentPrice 为空，请重新启动");
        }
        const trend = judgeTrendForInit();
        if (trend === "up") {
            restDatas("up");
            await teadeBuy(1);
        } else {
            restDatas("down");
            await teadeSell(1);
        }
        firsttradeTime = Date.now(); // 重置 firsttradeTime
        loadingInit = false;
    } catch (error) {
        console.error("initializeTrading header::", error);
        process.exit(1);
    }
};

const checkH = (curP, h) => {
    let left = 0;
    let right = 0;
    let zongKui = (341 * h) / curP + (170 * h) / (curP - h);
    let kaiCang = 1023;
    let pingCang =
        1023 -
        h / curP +
        (2 * h) / (curP - h) -
        (4 * h) / curP +
        (8 * h) / (curP - h) -
        (16 * h) / curP +
        (32 * h) / (curP - h) -
        (64 * h) / curP +
        (128 * h) / (curP - h) -
        (256 * h) / curP -
        (512 * 2 * h) / (curP - h);
    left = zongKui + (kaiCang + pingCang) * 0.0005;
    right = (512 * 1.5 * h) / curP; // 两倍利润
    return left >= right;
};
const getMinH = (curP, h) => {
    let n = 0;
    // 推导过程见演草本
    while (h / curP < 0.05 && n < 100 && checkH(curP, h)) {
        h += candleHeight / 10;
        n++; // 避免死循环
    }
    return h;
};
/**
 * 初始化
 *
 * 1. 无论如何都得先调出历史数据（测试/正式都一样）
 * 2. 线上：有仓位 || 无仓位
 *    有仓位，兼容下数据继续跑
 *         1. 跑出网格，直接平仓，重新开单
 *         2. 未出网格，兼容下数据继续跑
 *    无仓位
 *         1. 反正不知道到底跑了多少个点，就按最大的来存 __historyEntryPoints 经过几次，就把几次存到 overNumberOrderArr 中，h也存起来，重新开单
 *
 * 3. 测试：肯定没有仓位，和线上无仓位处理方式一致
 *         1. 反正不知道到底跑了多少个点，就按最大的来存 __historyEntryPoints 经过几次，就把几次存到 overNumberOrderArr 中，h也存起来，重新开单
 */
const getHistoryData = () => {
    if (fs.existsSync(`./data/${isTest ? "test" : ""}mading-1_5-${SYMBOL}.js`)) {
        let historyDatas = require(`./data/${isTest ? "test" : ""}mading-1_5-${SYMBOL}.js`);
        const {
            historyEntryPoints: __historyEntryPoints,
            currentPrice: __currentPrice, // 记录当前价格
            prePrice: __prePrice, // 记录当前价格的前一个
            curGridPoint: __curGridPoint, // 当前网格
            prePointIndex: __prePointIndex, // 上一个网格
            currentPointIndex: __currentPointIndex, // 当前网格
            tradingDatas: __tradingDatas, // 订单数据
            gridPoints: __gridPoints, // 网格每个交易点
            tradingInfo: __tradingInfo,
            gridHight: __gridHight,
            overNumberOrderArr: __overNumberOrderArr, // 超过 overNumber 手数的单子集合
            isOldOrder: __isOldOrder, // 是不是老单子
            oldOrder: __oldOrder,
            isProfitRun: __isProfitRun,
            gridPoints2: __gridPoints2,
            testMoney: __testMoney,
        } = historyDatas;
        console.log("上一次停止程序时，交易情况", historyDatas);

        if (
            __historyEntryPoints.length > 0 &&
            __currentPrice != 0 &&
            __prePrice != 0 &&
            (!hasUpDownVal(__tradingDatas) || !hasUpDownVal(__tradingInfo)) &&
            __gridPoints.length > 0
        ) {
            return historyDatas;
        } else {
            return null;
        }
    } else {
        return null;
    }
};

const recoverHistoryData = async (historyDatas) => {
    const {
        historyEntryPoints: __historyEntryPoints,
        currentPrice: __currentPrice, // 记录当前价格
        prePrice: __prePrice, // 记录当前价格的前一个
        curGridPoint: __curGridPoint, // 当前网格
        prePointIndex: __prePointIndex, // 上一个网格
        currentPointIndex: __currentPointIndex, // 当前网格
        tradingDatas: __tradingDatas, // 订单数据
        gridPoints: __gridPoints, // 网格每个交易点
        tradingInfo: __tradingInfo,
        gridHight: __gridHight,
        overNumberOrderArr: __overNumberOrderArr, // 超过 overNumber 手数的单子集合
        isOldOrder: __isOldOrder, // 是不是老单子
        oldOrder: __oldOrder,
        isProfitRun: __isProfitRun,
        gridPoints2: __gridPoints2,
        testMoney: __testMoney,
    } = historyDatas;

    historyEntryPoints = __historyEntryPoints;
    // currentPrice = __currentPrice; // 记录当前价格
    prePrice = __prePrice; // 记录当前价格的前一个
    curGridPoint = __curGridPoint; // 当前网格
    prePointIndex = __prePointIndex; // 上一个网格
    currentPointIndex = __currentPointIndex; // 当前网格
    tradingDatas = __tradingDatas; // 订单数据
    gridPoints = __gridPoints; // 网格每个交易点
    tradingInfo = __tradingInfo;
    gridHight = __gridHight;
    overNumberOrderArr = __overNumberOrderArr; // 超过 overNumber 手数的单子集合
    isProfitRun = __isProfitRun;
    gridPoints2 = __gridPoints2;
    testMoney = __testMoney;

    pushOverNumberOrderArr(__historyEntryPoints.length); // 让后面可以把亏损的找补回来
};
const recoverHistoryDataByPosition = async (historyDatas, { up, down }) => {
    //
    // 从数据库拿出上次的数据，并且与现在的比较，如果数据和的上就用以前的，数据和不上就解析出
    loadingInit = true;
    let {
        historyEntryPoints: __historyEntryPoints,
        currentPrice: __currentPrice, // 记录当前价格
        prePrice: __prePrice, // 记录当前价格的前一个
        curGridPoint: __curGridPoint, // 当前网格
        prePointIndex: __prePointIndex, // 上一个网格
        currentPointIndex: __currentPointIndex, // 当前网格
        tradingDatas: __tradingDatas, // 订单数据
        gridPoints: __gridPoints, // 网格每个交易点
        tradingInfo: __tradingInfo,
        gridHight: __gridHight,
        overNumberOrderArr: __overNumberOrderArr, // 超过 overNumber 手数的单子集合
        isOldOrder: __isOldOrder, // 是不是老单子
        oldOrder: __oldOrder,
        isProfitRun: __isProfitRun,
        gridPoints2: __gridPoints2,
        testMoney: __testMoney,
    } = historyDatas;

    historyEntryPoints = __historyEntryPoints;
    // currentPrice = __currentPrice; // 记录当前价格
    prePrice = __currentPrice; // 记录当前价格的前一个
    curGridPoint = __curGridPoint; // 当前网格
    prePointIndex = __prePointIndex; // 上一个网格
    currentPointIndex = __currentPointIndex; // 当前网格
    tradingDatas = __tradingDatas; // 订单数据
    gridPoints = __gridPoints; // 网格每个交易点
    tradingInfo = __tradingInfo;
    // gridHight = __gridHight;
    overNumberOrderArr = __overNumberOrderArr; // 超过 overNumber 手数的单子集合
    isOldOrder = __isOldOrder; // 是不是老单子
    oldOrder = __oldOrder;
    isProfitRun = __isProfitRun;
    gridPoints2 = __gridPoints2;
    testMoney = __testMoney;

    if (__isProfitRun) {
        console.log("上次停止程序时处于利润奔跑模式，当前重启后继续奔跑");
        // await closeOrder(tradingInfo.side, tradingInfo.quantity);
    } else {
        // 兼容 currentPointIndex === 0 或者 currentPointIndex === 3 的情况
        if (__currentPointIndex === 3 && currentPrice > gridPoints[2] && currentPrice < gridPoints[3]) {
            currentPointIndex = 2;
            prePointIndex = 2;
            if (__historyEntryPoints[__historyEntryPoints.length - 1] === 3) __historyEntryPoints.pop();
        }
        if (__currentPointIndex === 0 && currentPrice > gridPoints[0] && currentPrice < gridPoints[1]) {
            currentPointIndex = 1;
            prePointIndex = 1;
            if (__historyEntryPoints[__historyEntryPoints.length - 1] === 0) __historyEntryPoints.pop();
        }

        await checkOverGrid({ up, down });
        console.log(
            `有仓位时，初始化数据完成 currentPointIndex historyEntryPoints tradingDatas:`,
            currentPointIndex,
            historyEntryPoints,
            tradingDatas,
        );
    }
    loadingInit = false;
};

const checkOverGrid = async ({ up, down }) => {
    await getCurrentPrice();
    if (currentPrice <= gridPoints[0]) {
        console.log(`初始化时，价格超出网格区间，重置仓位（盈利），当前价格小于gridPoints[0]`);
        await closeAllOrders({ up, down });
        await initializeTrading();

        prePrice = currentPrice; // 记录当前价格的前一个
        currentPointIndex = -1; // 当前网格
        isOldOrder = false; // 是不是老单子
        oldOrder = {};
        isProfitRun = false;
    }
    if (currentPrice >= gridPoints[3]) {
        console.log(`初始化时，价格超出网格区间，重置仓位（盈利），当前价格大于gridPoints[3]`);
        await closeAllOrders({ up, down });
        await initializeTrading();

        prePrice = currentPrice; // 记录当前价格的前一个
        currentPointIndex = -1; // 当前网格
        isOldOrder = false; // 是不是老单子
        oldOrder = {};
        isProfitRun = false;
    }
};

// 设置网格
const setGridPointsToCurPriceCenter = (trend, _currentPrice) => {
    // 计算atr
    const { atr } = calculateATR([...kLineData], 14);
    console.log("mading模式 开始绘制网格~ atr, trend, _currentPrice gridHight:", atr, trend, _currentPrice, gridHight);

    let _gridHight = gridHight;

    if (isOldOrder) {
        _gridHight = oldOrder.gridHight > gridHight ? oldOrder.gridHight : gridHight;
    }

    let priceUp = 0;
    let priceDown = 0;
    let priceUpClose = 0;
    let priceDownClose = 0;

    if (trend === "up") {
        const minH = getMinH(_currentPrice, gridHight);
        if (_gridHight < minH) {
            _gridHight = minH;
        }
        priceUp = _currentPrice;
        prePrice = priceUp;
        priceDown = priceUp - _gridHight;
        priceUpClose = priceUp + _gridHight * curProfitRate;
        priceDownClose = priceDown - _gridHight * curProfitRate;
    } else {
        const minH = getMinH(_currentPrice, gridHight);
        if (_gridHight < minH) {
            _gridHight = minH;
        }
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

    console.log(
        "绘制网格 historyEntryPoints, curGridPoint，currentPrice, currentPointIndex, gridPoints:",
        historyEntryPoints,
        curGridPoint,
        currentPrice,
        currentPointIndex,
        gridPoints,
    );
};
// 进入交易点的历史记录
const setHistoryEntryPoints = (point) => {
    // if (historyEntryPoints.length < 10) {
    //     historyEntryPoints.push(point);
    // } else {
    //     historyEntryPoints.shift();
    //     historyEntryPoints.push(point);
    // }

    historyEntryPoints.push(point);

    saveGlobalVariables();

    console.log("进入交易点的历史记录 historyEntryPoints:", historyEntryPoints);
};

const restDatas = (trend, oldOrderCount) => {
    const _currentPrice = currentPrice * 0.999999999;
    let _historyEntryPoints = null;
    if (isOldOrder) {
        _historyEntryPoints = new Array(oldOrderCount).fill(-1);
    }
    if (trend === "up") {
        currentPointIndex = 2;
        historyEntryPoints = isOldOrder ? [..._historyEntryPoints, 2] : [2];
    } else {
        currentPointIndex = 1;
        historyEntryPoints = isOldOrder ? [..._historyEntryPoints, 1] : [1];
    }
    curGridPoint = _currentPrice;

    setGridPointsToCurPriceCenter(trend, _currentPrice);
};
// 设置网格
const setGridPoints = (trend, stopLoss, stopProfit) => {
    const _currentPrice = currentPrice;
    // 计算atr
    const { atr } = calculateATR([...kLineData], 14);

    console.log(
        "利润奔跑模式 开始绘制网格 ~  atr, candleHeight, trend, _currentPrice:",
        atr,
        candleHeight,
        trend,
        _currentPrice,
    );

    loadingNewPoints = true;

    if (trend === "up") {
        let _stopLoss = stopLoss * 0.9999999999; // 止损
        let _stopProfit = stopProfit * 0.9999999999; // 止盈
        gridPoints2 = [_stopLoss, _stopProfit];
    }

    if (trend === "down") {
        let _stopLoss = stopLoss * 0.9999999999; // 止损
        let _stopProfit = stopProfit * 0.9999999999; // 止盈
        gridPoints2 = [_stopProfit, _stopLoss];
    }

    saveGlobalVariables();

    loadingNewPoints = false;
    console.log("绘制网格 _currentPrice, gridPoints2 :", currentPrice, gridPoints2);
};

// 更新止损位
const modGridPoints = () => {
    const _currentPrice = currentPrice;

    loadingNewPoints = true;

    const [point1, point2] = gridPoints2;

    if (tradingInfo.trend === "up") {
        let stopLoss = 0;
        if (isFirstGetProfit) {
            stopLoss = tradingInfo.orderPrice + (point2 - tradingInfo.orderPrice) * 0.9; // 止损
        } else {
            stopLoss = point1 + (point2 - point1) * 0.45; // 止损
        }
        let stopProfit = point2 + candleHeight; // 止盈
        gridPoints2 = [stopLoss, stopProfit];

        const _testMoney =
            testMoney +
            tradingInfo.quantity * _currentPrice -
            tradingInfo.orderPrice * tradingInfo.quantity -
            (tradingInfo.quantity * _currentPrice + tradingInfo.orderPrice * tradingInfo.quantity) * 0.0005;
        console.log(`已盈利(${_testMoney})，重新绘制网格 _currentPrice, gridPoints2 :`, currentPrice, gridPoints2);
        console.log("当前还剩overNumberOrderArr：", overNumberOrderArr.length);
    }

    if (tradingInfo.trend === "down") {
        let stopLoss = 0;
        if (isFirstGetProfit) {
            stopLoss = tradingInfo.orderPrice - (tradingInfo.orderPrice - point1) * 0.9; // 止损
        } else {
            stopLoss = point2 - (point2 - point1) * 0.45; // 止损
        }

        let stopProfit = point1 - candleHeight; // 止盈
        gridPoints2 = [stopProfit, stopLoss];

        const _testMoney =
            testMoney +
            tradingInfo.quantity * tradingInfo.orderPrice -
            tradingInfo.quantity * _currentPrice -
            (tradingInfo.quantity * tradingInfo.orderPrice + tradingInfo.quantity * _currentPrice) * 0.0005;
        console.log(`已盈利(${_testMoney})，重新绘制网格 _currentPrice, gridPoints2 :`, currentPrice, gridPoints2);
        console.log("当前还剩overNumberOrderArr：", overNumberOrderArr.length);
    }

    saveGlobalVariables();

    loadingNewPoints = false;
};
// 5. 启动交易
const startTrading = async () => {
    console.log(isTest ? "测试环境～～～" : "正式环境～～～");
    try {
        await getServerTimeOffset(); // 同步服务器时间

        await getHistoryClosePrices(); // 初始化 historyClosePrices

        if (!invariableBalance) {
            await getContractBalance(); // 获取当前合约账户中的 USDT
        }
        const historyDatas = getHistoryData();
        // 测试
        if (isTest) {
            await getCurrentPrice();
            if (historyDatas) {
                await recoverHistoryData(historyDatas);
            }
            await initializeTrading();
        } else {
            // 初始化 tradingDatas
            allPositionDetail = await getPositionRisk(); // 获取当前仓位信息

            console.log("🚀 已有仓位 ~ allPositionDetail:", allPositionDetail);
            if (allPositionDetail) {
                if (historyDatas) {
                    await recoverHistoryDataByPosition(historyDatas, allPositionDetail);
                } else {
                    console.log("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
                    console.error("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
                    return;
                }
            }
            // 如果还没仓位要加仓
            else {
                console.log("还没仓位，直接开始循环");
                await getCurrentPrice(); // 获取当前价格
                await recoverHistoryData(historyDatas); // 处理历史数据
                await initializeTrading(); // 初始交易
            }
        }
        await startWebSocket(); // 启动websocket更新价格
    } catch (error) {
        console.error("startTrading Error:", error);
        process.exit(1);
    }
};
// 获取下单量
const getQuantity = (times = 1) => {
    return Math.round((availableMoney * times) / currentPrice);
    // return Math.round(((availableMoney * times) / currentPrice) * 100) / 100;
};

// 交易点所有订单平仓
const closePointOrders = async (pointIndex) => {
    // console.log("🚀 ~ file: gridBot6-13.js:1073 ~ closePointOrders ~ pointIndex:", onGridPoint, isLoading());
    if (tradingDatas[pointIndex]) {
        if (tradingDatas[pointIndex].up) {
            const { quantity, orderPrice } = tradingDatas[pointIndex].up;
            // 平多
            await closeOrder("SELL", quantity, () => {
                if (showProfit) {
                    // 测试
                    testMoney +=
                        currentPrice * quantity -
                        orderPrice * quantity -
                        (currentPrice * quantity + orderPrice * quantity) * 0.0005;
                    console.log("平多 closePointOrders ~ currentPrice testMoney:", currentPrice, testMoney);
                }
                tradingDatas[pointIndex].up = null;
                console.log("平多完成, closePointOrders ~ tradingDatas", tradingDatas);
            });
        }
        if (tradingDatas[pointIndex].down) {
            const { quantity, orderPrice } = tradingDatas[pointIndex].down;
            // 平空
            await closeOrder("BUY", quantity, () => {
                if (showProfit) {
                    // 测试
                    testMoney +=
                        orderPrice * quantity -
                        currentPrice * quantity -
                        (currentPrice * quantity + orderPrice * quantity) * 0.0005;
                    console.log("平空 closePointOrders ~ currentPrice testMoney:", currentPrice, testMoney);
                }
                tradingDatas[pointIndex].down = null;
                console.log("平空完成, tradingDatas", tradingDatas);
            });
        }
        // 发送邮件
        sendMail({
            subject: `${tradingInfo.orderPrice > currentPrice ? "✅" : "❌"}${B_SYMBOL}有一单平仓`,
            text: JSON.stringify({
                profitMoney: testMoney,
                overNum: overNumberOrderArr.length,
                tradingInfo: { ...tradingInfo },
                gridPoints: [...gridPoints],
            }),
        });
    } else {
        console.log("该交易点没有任何订单", pointIndex);
    }
};

// 其他交易点所有订单平仓
const closeOtherPointAllOrders = async (pointIndexHistory, curIndex) => {
    let promises = [];
    pointIndexHistory.forEach((index) => {
        if (index !== curIndex) {
            promises.push(closePointOrders(index));
        }
    });
    await Promise.all(promises);
};

const closeAllOrders = async ({ up, down }) => {
    let promises = [];
    if (up) {
        // 平多
        const upPromise = closeOrder("SELL", up.quantity, () => {
            if (showProfit) {
                //测试
                testMoney +=
                    currentPrice * up.quantity -
                    up.orderPrice * up.quantity -
                    (currentPrice * up.quantity + up.orderPrice * up.quantity) * 0.0005;
                console.log("平多 closeAllOrders ~ currentPrice testMoney:", currentPrice, testMoney);
            }
            console.log("平多完成");
        });
        promises.push(upPromise);
    }
    if (down) {
        // 平空
        const downPromise = closeOrder("BUY", down.quantity, () => {
            if (showProfit) {
                // 测试
                testMoney +=
                    down.orderPrice * down.quantity -
                    currentPrice * down.quantity -
                    (currentPrice * down.quantity + down.orderPrice * down.quantity) * 0.0005;
                console.log("平空 closeAllOrders ~ currentPrice testMoney:", currentPrice, testMoney);
            }
            console.log("平空完成");
        });
        promises.push(downPromise);
    }
    tradingDatas = {};
    await Promise.all(promises);
};

const setOldOrder = (trend) => {
    isOldOrder = false;
    if (overNumberOrderArr.length) {
        // 判断趋势是否强劲，强才买入
        isTrendClearly = true; // trend === "up" ? isUpTrend() : isDownTrend();
        if (isTrendClearly) {
            oldOrder = overNumberOrderArr.shift();
            isOldOrder = true;
        }
    }
};

const isUpTrend = () => {
    let res = false;
    // 计算macd
    const macds = getLastFromArr(macdArr, 15);
    const macd1 = macds[0];
    const macd2 = macds[7];
    const macd3 = macds[14];
    // 计算rsi
    const rsis = getLastFromArr(rsiGroupArr, 15);
    const rsi1 = rsis[0];
    const rsi2 = rsis[7];
    const rsi3 = rsis[14];
    if (
        // macd ema9快线 处于 ema26慢线 下方
        macd1.dif >= macd1.dea &&
        macd2.dif > macd2.dea &&
        macd3.dif > macd3.dea &&
        // 下降趋势逐渐增强
        macd1.macd <= macd2.macd &&
        macd2.macd < macd3.macd &&
        // 不能超卖状态
        Math.max(rsi1.short, rsi2.short, rsi3.short) < 70 &&
        // rsi14 > rsi100
        rsi1.short > rsi1.long &&
        rsi2.short > rsi2.long &&
        rsi3.short > rsi3.long &&
        // rsi14 趋势逐渐增强
        rsi1.short <= rsi2.short &&
        rsi2.short < rsi3.short
    ) {
        res = true;
    }
    console.log("isUpTrend ~ res, macds, rsis:", res, [macd1, macd2, macd3], [rsi1, rsi2, rsi3]);
    return res;
};
const isDownTrend = () => {
    let res = false;
    // 计算macd
    const macds = getLastFromArr(macdArr, 15);
    const macd1 = macds[0];
    const macd2 = macds[7];
    const macd3 = macds[14];
    // 计算rsi
    const rsis = getLastFromArr(rsiGroupArr, 15);
    const rsi1 = rsis[0];
    const rsi2 = rsis[7];
    const rsi3 = rsis[14];
    if (
        // macd ema9快线 处于 ema26慢线 下方
        macd1.dif <= macd1.dea &&
        macd2.dif < macd2.dea &&
        macd3.dif < macd3.dea &&
        // 下降趋势逐渐增强
        macd1.macd >= macd2.macd &&
        macd2.macd > macd3.macd &&
        // 不能超卖状态
        Math.min(rsi1.short, rsi2.short, rsi3.short) > 30 &&
        // rsi14 < rsi100
        rsi1.short < rsi1.long &&
        rsi2.short < rsi2.long &&
        rsi3.short < rsi3.long &&
        // rsi14 下降趋势逐渐增强
        rsi1.short >= rsi2.short &&
        rsi2.short > rsi3.short
    ) {
        res = true;
    }
    console.log("isDownTrend ~ res, macds, rsis:", res, [macd1, macd2, macd3], [rsi1, rsi2, rsi3]);
    return res;
};

function getLastFromArr(arr, num = 3) {
    let res = [];
    const len = arr.length;
    while (num > 0) {
        res.push(arr[len - num]);
        num--;
    }
    return res;
}

const judgeTrendForInit = () => {
    const [macd1, macd2, macd3] = getLastFromArr(macdArr, 3);
    if (macd1.macd > 0 && macd1.macd < macd2.macd && macd2.macd < macd3.macd) {
        return "up";
    } else if (macd1.macd < 0 && macd1.macd > macd2.macd && macd2.macd > macd3.macd) {
        return "down";
    } else {
        const rsi1 = rsiGroupArr[rsiGroupArr.length - 1];
        return rsi1.short > rsi1.long ? "up" : "down";
    }
};
// 双向开单模式
const gridPointTrading2 = async () => {
    onGridPoint = true;
    const _currentPrice = currentPrice;
    // currentPointIndex historyEntryPoint是不是不应该存，该取出最新的哦，这样才能保证插针时快速获取>>>>>>
    const _currentPointIndex = currentPointIndex;
    const _historyEntryPoints = historyEntryPoints;
    const tradingDataArr = Object.entries(tradingDatas).filter(([k, v]) => v.up || v.down);

    let pointIndexHistoryNoCur = tradingDataArr.map(([k]) => Number(k));
    let pointIndexHistory = Array.from(new Set([...pointIndexHistoryNoCur, _currentPointIndex]));

    const len = pointIndexHistory.length;
    const promises = [];
    if (len === 1) {
        console.log(`在第1个交易点`, tradingDatas);
    } else if (len === 3) {
        console.log(
            "##########不可能，到了第3个交易点, 平掉所有不是本交易点的订单，盈利！！！ pointIndexHistory historyEntryPoints tradingDatas:",
            pointIndexHistory,
            _historyEntryPoints,
            tradingDatas,
        );
        let _time = 1;
        if (_currentPointIndex === 0) {
            await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);
            await teadeSell(_time, true);
            isOldOrder = false;
            restDatas("down");
        } else if (_currentPointIndex === 3) {
            await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);
            isOldOrder = false;
            restDatas("up");
            await teadeBuy(_time, true);
        }
        console.log(
            `到了第3个交易点，已实现盈利，新的historyEntryPoints, tradingDataArr`,
            _historyEntryPoints,
            tradingDataArr,
        );
    } else if (len === 2) {
        console.log(
            "gridPointTrading2~ currentPointIndex pointIndexHistory historyEntryPoints tradingDatas:",
            _currentPointIndex,
            pointIndexHistory,
            _historyEntryPoints,
            tradingDatas,
        );

        let allPoints = _historyEntryPoints.length;

        // 2 个交易点之间交替
        if (_currentPointIndex === 0) {
            if (false && !overNumberOrderArr.length && allPoints - 1 >= overNumber) {
                tradingInfo = tradingDatas[1].down;
                console.log(
                    `交替穿过${allPoints}次交易点，是 1~0，重置仓位（盈利）！！！，开启利润奔跑模式！！！ down tradingInfo`,
                    tradingInfo,
                );
                console.log("当前还剩overNumberOrderArr：", overNumberOrderArr.length);
                tradingDatas[1].down = null; // 清空上马丁模式数据
                let stopLoss = tradingInfo.orderPrice - (tradingInfo.orderPrice - _currentPrice) * 0.9;
                let stopProfit = _currentPrice - candleHeight;
                setGridPoints("down", stopLoss, stopProfit);
                isProfitRun = true;
                isFirstGetProfit = true;
                isOldOrder = false; // 此时，isOldOrder需要重置，避免奔跑完成再次开单时isOldOrder还为true（有三个地方在开单）
            } else {
                console.log(`交替穿过${allPoints}次交易点，是 1~0，重置仓位（盈利）！！！，并当前继续开空`);
                console.log("当前还剩overNumberOrderArr：", overNumberOrderArr.length);
                let _time = 1;
                setOldOrder("down");
                if (isOldOrder) {
                    _time = times[oldOrder.count];
                }
                await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);
                restDatas("down", oldOrder.count);
                await teadeSell(_time, true);

                firsttradeTime = Date.now(); // 重置 firsttradeTime
            }
            onGridPoint = false;
            return;
        } else if (_currentPointIndex === 3) {
            if (false && !overNumberOrderArr.length && allPoints - 1 >= overNumber) {
                tradingInfo = tradingDatas[2].up;
                console.log(
                    `交替穿过${allPoints}次交易点，是 2~3，重置仓位（盈利）！！！，开启利润奔跑模式！！！ up tradingInfo`,
                    tradingInfo,
                );
                console.log("当前还剩overNumberOrderArr：", overNumberOrderArr.length);
                tradingDatas[2].up = null; // 清空上马丁模式数据
                let stopLoss = tradingInfo.orderPrice + (_currentPrice - tradingInfo.orderPrice) * 0.9;
                let stopProfit = _currentPrice + candleHeight;
                setGridPoints("up", stopLoss, stopProfit);
                isProfitRun = true;
                isFirstGetProfit = true;
                isOldOrder = false; // 此时，isOldOrder需要重置，避免奔跑完成再次开单时isOldOrder还为true（有三个地方在开单）
            } else {
                console.log(`交替穿过${allPoints}次交易点，是 2~3，重置仓位（盈利）！！！，并当前继续开多`);
                console.log("当前还剩overNumberOrderArr：", overNumberOrderArr.length);
                let _time = 1;
                setOldOrder("up");
                if (isOldOrder) {
                    _time = times[oldOrder.count];
                }
                await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);
                restDatas("up", oldOrder.count);
                await teadeBuy(_time, true);

                firsttradeTime = Date.now(); // 重置 firsttradeTime
            }
            onGridPoint = false;
            return;
        } else if (_currentPointIndex === 1) {
            let _times = times[allPoints - 1];
            if (isOldOrder ? allPoints >= oldOrder.count + 3 : allPoints >= overNumber) {
                isOldOrder = false;
                pushOverNumberOrderArr(allPoints - 1);
                console.log("仓位过大，暂存该交易，重新开始：curMinPrice, gridPoints", curMinPrice, gridPoints);
                await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);
                restDatas("down");
                await teadeSell(1, true);
                onGridPoint = false;
                return;
            }
            console.log(`交替穿过${allPoints}次交易点，并且当前index为1，当前交易点的仓位加倍`);
            promises.push(closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex), teadeSell(_times));
            await Promise.all(promises);
            // if (allPoints % 2 === 0) {
            //     const _gridHight = gridPoints[2] - gridPoints[1];
            //     if (Math.abs(_gridHight / _currentPrice) < 0.01) {
            //         if (allPoints === 2 && Date.now() - firsttradeTime <= (howManyCandleHeight + 1) * 60 * 1000) {
            //             // 短时间到达第二个点，距离太短，1下移0.5个单位
            //             // 此时不用改第0个交易点位置
            //             gridPoints[1] -= _gridHight * 0.5;
            //             // gridPoints[0] = gridPoints[1] - (gridPoints[2] - gridPoints[1]) * profitRate; // 不能用 _gridHeight，要实时算
            //             console.log("时间小于两分钟，绘制网格 0/1交易点改变：gridPoints:", gridPoints);
            //         } else {
            //             // 在1交易完后，后根据最二线最高值，设置3
            //             gridPoints[2] = curMaxPrice * 0.999999999;
            //             gridPoints[3] = gridPoints[2] + (gridPoints[2] - gridPoints[1]) * profitRate; // 不能用 _gridHeight，要实时算
            //             console.log("绘制网格 2/3交易点改变：", curMaxPrice, gridPoints);
            //         }
            //     } else {
            //         gridPoints[3] = gridPoints[2] + (gridPoints[2] - gridPoints[1]) * profitRate; // 不能用 _gridHeight，要实时算
            //     }
            // } else {
            //     gridPoints[3] = gridPoints[2] + (gridPoints[2] - gridPoints[1]) * stopLossRate; // 不能用 _gridHeight，要实时算
            //     console.log("绘制网格 3交易点改变：", gridPoints);
            // }
            // curMaxPrice = gridPoints[2];
        } else if (_currentPointIndex === 2) {
            let _times = times[allPoints - 1];
            if (isOldOrder ? allPoints >= oldOrder.count + 3 : allPoints >= overNumber) {
                isOldOrder = false;
                pushOverNumberOrderArr(allPoints - 1);
                console.log("仓位过大，暂存该交易，重新开始：curMinPrice, gridPoints", curMinPrice, gridPoints);
                await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);
                restDatas("up");
                await teadeBuy(1, true);
                onGridPoint = false;
                return;
            }
            console.log(`交替穿过${allPoints}次交易点，并且当前index为2，当前交易点的仓位加倍`);
            promises.push(closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex), teadeBuy(_times));
            await Promise.all(promises);
            // if (allPoints % 2 === 0) {
            //     const _gridHight = gridPoints[2] - gridPoints[1];
            //     if (Math.abs(_gridHight / _currentPrice) < 0.01) {
            //         if (allPoints === 2 && Date.now() - firsttradeTime <= (howManyCandleHeight + 1) * 60 * 1000) {
            //             // 短时间到达第二个点，距离太短，2 上移0.5个单位
            //             gridPoints[2] += _gridHight * 0.5;
            //             // gridPoints[3] = gridPoints[2] + (gridPoints[2] - gridPoints[1]) * profitRate; // 不能用 _gridHeight，要实时算
            //             console.log("时间小于两分钟，绘制网格 2/3交易点改变：gridPoints:", gridPoints);
            //         } else {
            //             // 在2交易完后，后根据最二线最小值，设置0
            //             gridPoints[1] = curMinPrice * 0.999999999;
            //             gridPoints[0] = gridPoints[1] - (gridPoints[2] - gridPoints[1]) * profitRate; // 不能用 _gridHeight，要实时算
            //             console.log("绘制网格 0/1交易点改变：", curMinPrice, gridPoints);
            //         }
            //     } else {
            //         gridPoints[0] = gridPoints[1] - (gridPoints[2] - gridPoints[1]) * profitRate; // 不能用 _gridHeight，要实时算
            //     }
            // } else {
            //     gridPoints[0] = gridPoints[1] - (gridPoints[2] - gridPoints[1]) * stopLossRate; // 不能用 _gridHeight，要实时算
            //     console.log("绘制网格 0交易点改变：", gridPoints);
            // }
            // curMinPrice = gridPoints[1];
        }
    } else {
        console.log(
            "@@@@@@ 就1-3个交易点，是不是错了啊，啥都不干直接平仓吧，可能亏了",
            pointIndexHistory,
            _historyEntryPoints,
            tradingDatas,
            tradingDataArr,
        );
    }

    onGridPoint = false;
};

// 跑网格
const startRunGrid = async (_prePrice, _currentPrice) => {
    // 插针时速度很快可能会垮多个格子>>>>>>
    let _currentPointIndex = -1;
    let _curGridPoint = 0;

    for (let index = 0; index < gridPoints.length; index++) {
        const point = gridPoints[index];
        if ((_prePrice <= point && point <= _currentPrice) || (_prePrice >= point && point >= _currentPrice)) {
            _currentPointIndex = index;
            _curGridPoint = point;
            break;
        }
    }

    // throttlestartRunGridlog(_currentPointIndex, gridPoints);

    // 价格到了某个网格交易点
    if (_currentPointIndex !== -1) {
        if (currentPointIndex !== _currentPointIndex) {
            console.log(
                "到达不同交易点 prePointIndex currentPointIndex _currentPointIndex:",
                prePointIndex,
                currentPointIndex,
                _currentPointIndex,
            );
            curGridPoint = _curGridPoint;
            prePointIndex = currentPointIndex;
            currentPointIndex = _currentPointIndex;

            setHistoryEntryPoints(currentPointIndex); // 实时交易点历史记录
            await gridPointTrading2(); // 交易
        } else {
            // 相同交易点
        }
    }
};
// 是否到达止盈/止损点，平仓/移动止损位
const gridPointClearTrading = async (_currentPrice) => {
    onGridPoint = true;
    const [point1, point2] = gridPoints2;
    if (tradingInfo.side === "BUY") {
        // 直接平仓
        if (_currentPrice <= point1) {
            // 止损平多
            await closeOrder("SELL", tradingInfo.quantity, () => {
                if (showProfit) {
                    //测试
                    testMoney +=
                        tradingInfo.quantity * currentPrice -
                        tradingInfo.quantity * tradingInfo.orderPrice -
                        (tradingInfo.quantity * currentPrice + tradingInfo.quantity * tradingInfo.orderPrice) * 0.0005;
                    console.log("平多 gridPointClearTrading ~ currentPrice testMoney:", currentPrice, testMoney);
                }
                console.log("平多完成");
                isProfitRun = false;

                // 发送邮件
                sendMail({
                    subject: `${tradingInfo.orderPrice < _currentPrice ? "✅" : "❌"}${B_SYMBOL}有一单平仓`,
                    text: JSON.stringify({
                        profitMoney: testMoney,
                        overNum: overNumberOrderArr.length,
                        tradingInfo: { ...tradingInfo },
                        gridPoints: [...gridPoints],
                    }),
                });
            });

            // 继续跑马丁网格，反着开
            restDatas("down");
            await teadeSell(1, true);
            firsttradeTime = Date.now(); // 重置 firsttradeTime
            resetTradingDatas();

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
    } else {
        // 直接平仓
        if (_currentPrice >= point2) {
            // 止损平空
            await closeOrder("BUY", tradingInfo.quantity, () => {
                if (showProfit) {
                    // 测试
                    testMoney +=
                        tradingInfo.quantity * tradingInfo.orderPrice -
                        tradingInfo.quantity * currentPrice -
                        (tradingInfo.quantity * tradingInfo.orderPrice + tradingInfo.quantity * currentPrice) * 0.0005;
                    console.log("平空 gridPointClearTrading ~ currentPrice testMoney:", currentPrice, testMoney);
                }
                console.log("平空完成");
                isProfitRun = false;

                // 发送邮件
                sendMail({
                    subject: `${tradingInfo.orderPrice > _currentPrice ? "✅" : "❌"}${B_SYMBOL}有一单平仓`,
                    text: JSON.stringify({
                        profitMoney: testMoney,
                        overNum: overNumberOrderArr.length,
                        tradingInfo: { ...tradingInfo },
                        gridPoints: [...gridPoints],
                    }),
                });
            });

            // 继续跑马丁网格，反着开
            restDatas("up");
            await teadeBuy(1, true);
            firsttradeTime = Date.now(); // 重置 firsttradeTime
            resetTradingDatas();
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
    }
    onGridPoint = false;
};

const consolePrice = throttle(() => {
    console.log("currentPrice:", currentPrice);
}, 3000);

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
        if (isLoading() || prePrice === currentPrice) {
            return;
        } else {
            if (isProfitRun) {
                await gridPointClearTrading(currentPrice);
            } else {
                await startRunGrid(prePrice, currentPrice); // 每秒会触发4次左右，但是需要快速判断是否进入交易点，所以不节流
            }
        }
    });
    // ws.on("message", async (data) => {
    //     const trade = JSON.parse(data);

    //     prePrice = currentPrice; // 不能删除
    //     currentPrice = Number(trade.p) || 0;
    //     // throttlestartWebSocket_on();
    //     // 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
    //     if (isLoading() || prePrice === currentPrice) return;

    //     await startRunGrid(prePrice, currentPrice); // 每秒会触发十次左右，但是需要快速判断是否进入交易点，所以不节流
    // });

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

// 自定义函数将 Error 对象转为字符串
function errorToString(error) {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}\n${error.stack}`;
    }
    return error;
}
// logs
const createLogs = () => {
    // 创建 logs 文件夹
    if (!fs.existsSync(logsFolder)) {
        fs.mkdirSync(logsFolder);
    }

    // 重定向 console.log 到文件
    logStream = fs.createWriteStream(`${logsFolder}/mading-1_5-${SYMBOL}-${getDate()}.log`, { flags: "a" });
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
    errorStream = fs.createWriteStream(`${errorsFolder}/mading-1_5-${SYMBOL}-${getDate()}.error`, { flags: "a" });
    // 保存原始的 console.error 函数
    const originalConsoleError = console.error;

    // 重写 console.error
    console.error = function (...args) {
        originalConsoleError.apply(console, args); // 保留原始 console.error 的功能
        // 将 error 写入文件
        errorStream.write(
            `${getDate()}: ${args
                .map((v) => {
                    if (v instanceof Error) {
                        return errorToString(v);
                    } else if (typeof v === "object") {
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
    allPositionDetail = await getPositionRisk(); // 获取当前仓位信息

    console.log("🚀 ~ file: gridBot6-1.js:886 ~ startTrading ~ allPositionDetail:", allPositionDetail);

    // await getServerTimeOffset(); // 同步服务器时间
    // await getCurrentPrice();

    // await getHistoryClosePrices(); // 初始化 historyClosePrices

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
                historyEntryPoints,
                currentPrice, // 记录当前价格
                prePrice, // 记录当前价格的前一个
                curGridPoint, // 当前网格
                prePointIndex, // 上一个网格
                currentPointIndex, // 当前网格
                tradingDatas, // 订单数据
                tradingInfo, // 订单数据 利润奔跑模式
                gridPoints, // 网格每个交易点
                gridHight: gridPoints[2] - gridPoints[1],
                overNumberOrderArr, // 超过 overNumber 手数的单子集合
                isOldOrder, // 是不是老单子
                oldOrder,
                isProfitRun,
                gridPoints2,
                testMoney,
            });
            fs.writeFileSync(`data/${isTest ? "test" : ""}mading-1_5-${SYMBOL}.js`, `module.exports = ${data}`, {
                flag: "w",
            });
            // console.log(`Global variables saved to data/${SYMBOL}.js`);
        }
    }, 0);
}
