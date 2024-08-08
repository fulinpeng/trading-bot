// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const axios = require("axios"); // HTTP请求库
const sendMail = require("./mailer.js");
const crypto = require("crypto"); // 加密模块
const WebSocket = require("ws"); // WebSocket库
const { HttpsProxyAgent } = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");
const fs = require("fs");
const { getDate, hasUpDownVal, calculateAverage, getSequenceArr } = require("./utils/functions.js");
const { calculateCandleHeight } = require("./utils/kLineTools.js");
const config = require("./config-mading.js");
const { calculateBBKeltnerSqueeze } = require("./utils/BBKeltner.js");
const { calculateSimpleMovingAverage } = require("./utils/ma.js");

let testMoney = 0;

const {
    SYMBOL,
    base,
    availableMoney,
    invariableBalance,
    klineStage,
    logsFolder,
    errorsFolder,
    diff,
    profitRate,
    overNumberToRest, // 多少次对冲后去休息
    howManyCandleHeight,
    howManyNumForAvarageCandleHight,
    maPeriod, // ma
    BBK_PERIOD,
    RSI_PERIOD,
    B2mult,
    Kmult, // 1.5
    judgeByBBK, //  true false; 根据bbk指标来开单 ⭐️
} = config["bome"];

const times = getSequenceArr(diff, 100);

let isResting = false; // 休息一段时间（空档跑网格，出网格继续跑）

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
let gridHight = 0;
let isProfitRun = false; // 让利润奔跑起来
let shadowBodyRate = 3;
let hasOrder = false;
// 最新交易信息 利润奔跑模式使用
let tradingInfo = {
    trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
    side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
    orderPrice: 0,
    quantity: 0,
    times: 0,
};

// 这些指标，都不能预测，都马后炮
const maxKLinelen = 600; // 储存kLine最大数量
const STD_MULTIPLIER = 2; // 用来确定布林带的宽度
const BOLL_PERIOD = 20;
const RSI_PERIOD_MIN = 14 * 5; // RSI计算周期
const RSI_PERIOD_MAX = 500; // RSI计算周期

// BBK 指标
let curB2basis = 0;
let curB2upper = 0;
let curB2lower = 0;
let curKma = 0;
let isSqueeze = 0;

let maArr = [];
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
let onGridPoint = false; // 网格上
let loadingInit = false;

const isLoading = () => {
    return loadingInit || loadingPlaceOrder || loadingCloseOrder || onGridPoint;
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
        const response = await axios.get(`${fapi}/v1/klines`, {
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

const _refreshPrice = (curKLine) => {
    kLineData.length >= maxKLinelen && kLineData.shift();
    historyClosePrices.length >= maxKLinelen && historyClosePrices.shift();

    kLineData.push(curKLine);
    historyClosePrices.push(curKLine.close);
    // 更新平均蜡烛高度
    candleHeight = calculateCandleHeight(getLastFromArr(kLineData, howManyNumForAvarageCandleHight));
    let _gridHight = candleHeight * howManyCandleHeight;

    gridHight = _gridHight;

    // 设置各种指标
    setEveryIndex([...historyClosePrices], curKLine);
};

// 判断+交易
const judgeAndTrading = (curkLine) => {
    if (isResting || hasOrder) return;
    let readyTradingDirection = "";
    if (judgeByBBK) {
        if (!isSqueeze) {
            if (curkLine.close > curB2upper) {
                readyTradingDirection = "up";
            }
            if (curkLine.close < curB2lower) {
                readyTradingDirection = "down";
            }
        }
    } else {
        readyTradingDirection = maArr[2] < maArr[3] ? "up" : "down";
    }
    const time = historyEntryPoints.length ? historyEntryPoints.length - 1 : 0;
    // 开单
    switch (readyTradingDirection) {
        case "up":
            hasOrder = true;
            restDatas("up");
            teadeBuy(times[time]);
            break;
        case "down":
            hasOrder = true;
            restDatas("down");
            teadeSell(times[time]);
            break;
        default:
            break;
    }
};

const setEveryIndex = (prices, curKLine) => {
    // 计算 ema
    setEma();
    // 计算macd
    // setMacdArr(prices);
    // 计算rsi
    // setRsiGroupArr(prices);
    // judgeByBBK && setBBK(curKLine);
};
const setEma = () => {
    maArr = [
        calculateSimpleMovingAverage(historyClosePrices.slice(0, historyClosePrices.length - 10), maPeriod),
        calculateSimpleMovingAverage(historyClosePrices.slice(0, historyClosePrices.length - 5), maPeriod),
        calculateSimpleMovingAverage(historyClosePrices.slice(0, historyClosePrices.length - 0), maPeriod),
    ];
};
const setBBK = (curKLine) => {
    const { B2basis, B2upper, B2lower, Kma, Kupper, Klower, squeeze } = calculateBBKeltnerSqueeze(
        [...kLineData],
        BBK_PERIOD,
        B2mult,
        Kmult,
    );

    curB2basis = getLastFromArr(B2basis, 1)[0];
    curB2upper = getLastFromArr(B2upper, 1)[0];
    curB2lower = getLastFromArr(B2lower, 1)[0];
    curKma = getLastFromArr(Kma, 1)[0];
    isSqueeze = getLastFromArr(squeeze, 1)[0];
};

const setMacdArr = (prices, period) => {
    if (macdArr.length >= 500) {
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

const restDatas = (trend) => {
    const _currentPrice = currentPrice;
    if (trend === "up") {
        currentPointIndex = 2;
        historyEntryPoints = [2];
    } else {
        currentPointIndex = 1;
        historyEntryPoints = [1];
    }
    curGridPoint = _currentPrice;

    setGridPointsToCurPriceCenter(trend, _currentPrice);
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
        console.error("teadeSell err::", error);
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

/**
 * 初始化
 *
 * 1. 无论如何都得先调出历史数据（测试/正式都一样）
 * 2. 线上：有仓位 || 无仓位
 *    有仓位，兼容下数据继续跑
 *         1. 跑出网格，直接平仓，重新开单
 *         2. 未出网格，兼容下数据继续跑
 *    无仓位
 *         1. 反正不知道到底跑了多少个点，就按最大的来存 __historyEntryPoints 经过几次，就把几次存到  中，h也存起来，重新开单
 *
 * 3. 测试：肯定没有仓位，和线上无仓位处理方式一致
 *         1. 反正不知道到底跑了多少个点，就按最大的来存 __historyEntryPoints 经过几次，就把几次存到  中，h也存起来，重新开单
 */
const getHistoryData = () => {
    if (fs.existsSync(`./data/${isTest ? "test" : "prod"}-mading-${SYMBOL}.js`)) {
        let historyDatas = require(`./data/${isTest ? "test" : "prod"}-mading-${SYMBOL}.js`);
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
            isProfitRun: __isProfitRun,
            gridPoints2: __gridPoints2,
            testMoney: __testMoney,
            hasOrder: __hasOrder,
            isResting: __isResting, // 休息一段时间（空档跑网格，出网格继续跑）
            candleHeight: __candleHeight,
            gridHight: __gridHight,
        } = historyDatas;
        console.log("上一次停止程序时，交易情况", historyDatas);

        if (
            __historyEntryPoints.length > 0 &&
            __currentPrice != 0 &&
            __prePrice != 0 &&
            // 有仓位信息
            (hasUpDownVal(Object.values(__tradingDatas)) || __tradingInfo.quantity) &&
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
        gridPoints2: __gridPoints2,
        testMoney: __testMoney,
        hasOrder: __hasOrder,
        isResting: __isResting, // 休息一段时间（空档跑网格，出网格继续跑）
        candleHeight: __candleHeight,
        gridHight: __gridHight,
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
    testMoney = __testMoney;
    hasOrder = __hasOrder;
    isResting = __isResting; // 休息一段时间（空档跑网格，出网格继续跑）
    candleHeight = __candleHeight;
    gridHight = __gridHight;
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
        testMoney: __testMoney,
        hasOrder: __hasOrder,
        isResting: __isResting, // 休息一段时间（空档跑网格，出网格继续跑）
        candleHeight: __candleHeight,
        gridHight: __gridHight,
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
    testMoney = __testMoney;
    hasOrder = __hasOrder;
    isResting = __isResting; // 休息一段时间（空档跑网格，出网格继续跑）
    candleHeight = __candleHeight;
    gridHight = __gridHight;

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

    loadingInit = false;
};

const checkOverGrid = async ({ up, down }) => {
    await getCurrentPrice();
    if (currentPrice <= gridPoints[0]) {
        console.log(`初始化时，价格超出网格区间，重置仓位（盈利），当前价格小于gridPoints[0]`);
        await closeAllOrders({ up, down });

        prePrice = currentPrice; // 记录当前价格的前一个
        currentPointIndex = -1; // 当前网格
        isProfitRun = false;
        hasOrder = false;
        isResting = false;
    }
    if (currentPrice >= gridPoints[3]) {
        console.log(`初始化时，价格超出网格区间，重置仓位（盈利），当前价格大于gridPoints[3]`);
        await closeAllOrders({ up, down });

        prePrice = currentPrice; // 记录当前价格的前一个
        currentPointIndex = -1; // 当前网格
        isProfitRun = false;
        hasOrder = false;
        isResting = false;
    }
};

// 设置网格
const setGridPointsToCurPriceCenter = (trend, _currentPrice) => {
    console.log("mading模式 开始绘制网格~ atr, trend, _currentPrice:", trend, _currentPrice);

    let priceUp = 0;
    let priceDown = 0;
    let priceUpClose = 0;
    let priceDownClose = 0;

    if (trend === "up") {
        priceUp = _currentPrice;
        prePrice = priceUp;
        priceDown = priceUp - gridHight;
        priceUpClose = priceUp + gridHight * profitRate;
        priceDownClose = priceDown - gridHight * profitRate;
    } else {
        priceDown = _currentPrice;
        prePrice = priceDown;
        priceUp = priceDown + gridHight;
        priceUpClose = priceUp + gridHight * profitRate;
        priceDownClose = priceDown - gridHight * profitRate;
    }

    gridPoints = [priceDownClose, priceDown, priceUp, priceUpClose];

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
    if (isResting) return;
    historyEntryPoints.push(point);

    saveGlobalVariables();

    console.log("进入交易点的历史记录 historyEntryPoints:", historyEntryPoints);
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
        judgeAndTrading(kLineData[kLineData.length - 1]);
        loadingInit = false;
    } catch (error) {
        console.error("initializeTrading header::", error);
        process.exit(1);
    }
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
            historyDatas && (await recoverHistoryData(historyDatas));
            // 测试环境就不弄太复杂，记住上次的 testMoney 然后直接重新开单
            tradingDatas = {};
            initializeTrading();
        } else {
            // 初始化 tradingDatas
            allPositionDetail = await getPositionRisk(); // 获取当前仓位信息

            if (hasUpDownVal(allPositionDetail)) {
                await getCurrentPrice();
                console.log("🚀 已有仓位 ~ allPositionDetail:", allPositionDetail);
                // 已有仓位要复原
                if (historyDatas) {
                    await recoverHistoryDataByPosition(historyDatas, allPositionDetail);
                } else {
                    console.log("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
                    console.error("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
                    return;
                }
            } else {
                // 如果还没仓位
                console.log("还没仓位，initializeTrading");
                initializeTrading();
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
                        (currentPrice * quantity + orderPrice * quantity) * 0.0007;
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
                        (currentPrice * quantity + orderPrice * quantity) * 0.0007;
                    console.log("平空 closePointOrders ~ currentPrice testMoney:", currentPrice, testMoney);
                }
                tradingDatas[pointIndex].down = null;
                console.log("平空完成, tradingDatas", tradingDatas);
            });
        }
    } else {
        console.log("该交易点没有任何订单", pointIndex);
    }
};

// 其他交易点所有订单平仓
const closeOtherPointAllOrders = async (pointIndexHistory, curIndex) => {
    if (isResting) return;
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
                    (currentPrice * up.quantity + up.orderPrice * up.quantity) * 0.0007;
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
                    (currentPrice * down.quantity + down.orderPrice * down.quantity) * 0.0007;
                console.log("平空 closeAllOrders ~ currentPrice testMoney:", currentPrice, testMoney);
            }
            console.log("平空完成");
        });
        promises.push(downPromise);
    }
    tradingDatas = {};
    await Promise.all(promises);
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

// 双向开单模式
const gridPointTrading2 = async () => {
    onGridPoint = true;
    // currentPointIndex historyEntryPoint是不是不应该存，该取出最新的哦，这样才能保证插针时快速获取>>>>>>
    const _currentPointIndex = currentPointIndex;
    const _historyEntryPoints = historyEntryPoints;
    const tradingDataArr = Object.entries(tradingDatas).filter(([k, v]) => v.up || v.down);

    let pointIndexHistoryNoCur = tradingDataArr.map(([k]) => Number(k));
    let pointIndexHistory = Array.from(new Set([...pointIndexHistoryNoCur, _currentPointIndex]));

    const len = pointIndexHistory.length;
    if (len === 1) {
        console.log(`在第1个交易点`, tradingDatas);
    } else if (len === 3) {
        console.log(
            "##########不可能，到了第3个交易点, 平掉所有不是本交易点的订单，盈利！！！ pointIndexHistory historyEntryPoints tradingDatas:",
            pointIndexHistory,
            _historyEntryPoints,
            tradingDatas,
        );
        if (_currentPointIndex === 0) {
            await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);
            hasOrder = false;
        } else if (_currentPointIndex === 3) {
            await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);
            hasOrder = false;
        }
        isResting = false;
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
            console.log(`交替穿过${allPoints}次交易点，是 1~0，重置仓位（盈利）！！！，并当前继续开空`);
            await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);

            isResting = false;
            hasOrder = false;
            onGridPoint = false;
            return;
        } else if (_currentPointIndex === 3) {
            console.log(`交替穿过${allPoints}次交易点，是 2~3，重置仓位（盈利）！！！，并当前继续开多`);
            await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);

            isResting = false;
            hasOrder = false;
            onGridPoint = false;
            return;
        } else if (_currentPointIndex === 1) {
            // 不通过，就会停止并等下次机会
            // 一次通过
            if (!isResting && allPoints === overNumberToRest) {
                console.log("仓位过大，暂存该交易：currentPrice, gridPoints", currentPrice, gridPoints);
                await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);
                onGridPoint = false;
                isResting = true;
                return;
            }
            if (isResting) {
                console.log(`交替穿过${allPoints}次交易点，并且当前index为2，当前休息状态`);
            } else {
                console.log(`交替穿过${allPoints}次交易点，并且当前index为1，当前交易点的仓位加倍`);

                let promises = [
                    teadeSell(times[allPoints - 1]),
                    closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex),
                ];
                await Promise.all(promises);
            }
        } else if (_currentPointIndex === 2) {
            // 休息后只给一次机会
            if (!isResting && allPoints === overNumberToRest) {
                console.log("仓位过大，暂存该交易，重新开始：currentPrice, gridPoints", currentPrice, gridPoints);
                await closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex);
                onGridPoint = false;
                isResting = true;
                return;
            }
            if (isResting) {
                console.log(`交替穿过${allPoints}次交易点，并且当前index为2，当前休息状态`);
            } else {
                console.log(`交替穿过${allPoints}次交易点，并且当前index为2，当前交易点的仓位加倍`);

                let promises = [
                    teadeBuy(times[allPoints - 1]),
                    closeOtherPointAllOrders(pointIndexHistory, _currentPointIndex),
                ];
                await Promise.all(promises);
            }
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
            // console.log("🚀 ~ file:相同交易点");
        }
    }
};

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
            judgeAndTrading(curKLine); // isResting 时不下单 内部有判断
        }
        // 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
        if (isLoading() || prePrice === currentPrice) {
            return;
        } else {
            hasOrder && (await startRunGrid(prePrice, currentPrice)); // 每秒会触发4次左右，但是需要快速判断是否进入交易点，所以不节流
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
    logStream = fs.createWriteStream(`${logsFolder}/${isTest ? "test" : "prod"}-mading-${SYMBOL}-${getDate()}.log`, {
        flags: "a",
    });
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
    errorStream = fs.createWriteStream(
        `${errorsFolder}/${isTest ? "test" : "prod"}-mading-${SYMBOL}-${getDate()}.error`,
        { flags: "a" },
    );
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
        // 发送邮件
        sendMail({
            subject: `❌❌❌ ${B_SYMBOL}仓位发生错误，请手动处理`,
            text: JSON.stringify({
                currentPrice,
                tradingInfo: { ...tradingInfo },
                gridPoints: [...gridPoints],
            }),
        });
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
                isProfitRun,
                gridPoints2,
                testMoney,
                candleHeight,
                gridHight,
                hasOrder,
                isResting, // 休息一段时间（空档跑网格，出网格继续跑）
            });
            fs.writeFileSync(`data/${isTest ? "test" : "prod"}-mading-${SYMBOL}.js`, `module.exports = ${data}`, {
                flag: "w",
            });
            // console.log(`Global variables saved to data/${SYMBOL}.js`);
        }
    }, 0);
}
