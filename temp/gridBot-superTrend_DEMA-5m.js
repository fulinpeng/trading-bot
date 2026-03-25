// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const sendMail = require("../utils/mailer.js");
const axios = require("axios"); // HTTP请求库
const crypto = require("crypto"); // 加密模块
const WebSocket = require("ws"); // WebSocket库
// const { HttpsProxyAgent } = require("https-proxy-agent");
// const { SocksProxyAgent } = require("socks-proxy-agent");
const fs = require("fs");
const { getDate, hasUpDownVal, getLastFromArr } = require("../utils/functions.js");
// const {calculateSimpleMovingAverage}=require("./utils/ma.js");
const { calculateATR } = require("../utils/atr.js");
const { calculateIndicators } = require("../utils/superTrend.js");
const config = require("./config-superTrend_DEMA.js");
const {
    calculateCandleHeight,
    isBigLine,
    isBigAndYang,
    isBigAndYin,
    isBreakPreHigh,
    isBreakPreLow,
    isCross,
    isUpCross,
    isDownCross,
    isTopFractal,
    isBottomFractal,
    isDownLinesGroup2,
    isUpLinesGroup2,
    isDownLinesGroup3,
    isUpLinesGroup3,
    isDownSwallow,
    isUpSwallow,
    isBreakDown,
    isBreakUp,
    isDownStar,
    isUpStar,
    isHigherHigh,
    isLowerLow,
    isK1Swallow,
    isFourUp,
    isFourDown,
    downPao,
    upPao,
    isDownMa,
    isUpMa,
    isUpMacd,
    isDownMacd,
    isAllDownTail,
    isAllUpTail,
} = require("../utils/kLineTools.js");

let testMoney = 0;

let {
    strategyType,
    SYMBOL,
    base,
    availableMoney: DefaultAvailableMoney,
    invariableBalance,
    klineStage,
    logsFolder,
    errorsFolder,
    demaShortPeriod,
    demaLongPeriod,
    atrPeriod,
    multiplier, // doge 5 / pepe 6
    slAtrPeriod,
    numForAverage, // 多少根k线求取candleHeight
    howManyCandle, // 初始止盈，盈亏比
    firstStopProfitRate: DefaultFirstStopProfitRate, // 是否开启初始止盈(比例基于止损)（到初始止盈点时，移动止损到开仓价）
    firstProtectProfitRate,
    firstStopLossRate: DefaultFirstStopLossRate, // 是否开启初始止损（到初始止损点时，移动止盈到开仓价）
    isProfitRun, // 是否开启移动止盈
    profitProtectRate, // 移动止盈，保留盈利比例
    howManyCandleForProfitRun,
    maxStopLossRate, // 止损小于10%的情况，最大止损5%
    invalidSigleStopRate, // 止损在10%，不开单
    double, // 是否损失后加倍开仓
    maxLossCount, // 损失后加倍开仓，最大倍数
} = config["1000pepe"];

let availableMoney = DefaultAvailableMoney;
let firstStopProfitRate = DefaultFirstStopProfitRate;
let firstStopLossRate = DefaultFirstStopLossRate;
let lossCount = 0;

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
// const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}`, { agent: socksProxyAgent });
const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}`);
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
let candleHeight = 0; // 蜡烛高度
let readyTradingDirection = "hold"; // 是否准备开单
let gridPoints = []; // 最新交易信息
let hasOrder = false; // 是否有订单
let tradingInfo = {
    trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'hold' || '' 表示无趋势
    side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
    orderPrice: 0,
    quantity: 0,
    times: 0,
};

// 以下参数会在程序启动时初始化
let historyClosePrices = []; // 历史收盘价，用来计算EMA
let serverTimeOffset = 0; // 服务器时间偏移
let allPositionDetail = {}; // 当前仓位信息

let superTrendArr = [];

const maxKLinelen = 500; // 储存kLine最大数量
// 日志
let logStream = null;
let errorStream = null;

// loading
let loadingTrading = false; // 下单
let loadingPlaceOrder = false; // 下单
let loadingCloseOrder = false; // 平仓
let onGridPoint = false; // 网格上
let loadingInit = false;
let isOrdering = false; // 是否在收盘后的计算中
let isJudgeFirstProfit = false;
let isjudgeProfitRunOrProfit = false;

const isLoading = () => {
    return (
        loadingInit ||
        isOrdering ||
        isJudgeFirstProfit ||
        isjudgeProfitRunOrProfit ||
        loadingTrading ||
        loadingPlaceOrder ||
        loadingCloseOrder ||
        onGridPoint
    );
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
            error && error.response ? error.response.data : error
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

// >>>>???? 后续，将该函数抽离，所有策略适用该函数都有问题
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

        let ks = response.data || [];

        // 此时间未收盘
        if (ks[ks.length - 1][6] > Date.now()) {
            ks.pop();
        }
        // 解析K线数据
        return ks.map((item) => ({
            openTime: getDate(item[0]), // 开盘时间
            open: parseFloat(item[1]), // 开盘价
            high: parseFloat(item[2]), // 最高价
            low: parseFloat(item[3]), // 最低价
            close: parseFloat(item[4]), // 收盘价(当前K线未结束的即为最新价)
            volume: parseFloat(item[5]), // 成交量
            closeTime: getDate(item[6]), // 收盘时间
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
            error && error.response ? error.response.data : error
        );
        process.exit(1);
    }
};

const setCandleHeight = () => {
    candleHeight = calculateCandleHeight(getLastFromArr(kLineData, numForAverage));
    // console.log("计算出实际蜡烛高度 candleHeight:", candleHeight);
};
// 获取收盘价
const getHistoryClosePrices = async () => {
    // 在getKLineData方法中获取至少15分钟内的价格数据
    kLineData = await getKLineData(B_SYMBOL, `${klineStage}`, maxKLinelen);
    historyClosePrices = kLineData.map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
    // console.log("k线收盘价:", historyClosePrices);
};

const initEveryIndex = (historyClosePrices) => {
    const len = historyClosePrices.length;
    for (let i = len - 20; i < len; i++) {
        setEveryIndex(historyClosePrices.slice(0, i));
    }
};
const setEveryIndex = () => {
    superTrendArr.length >= 10 && superTrendArr.shift();
    superTrendArr.push(
        calculateIndicators(
            kLineData,
            demaShortPeriod,
            demaLongPeriod,
            atrPeriod,
            multiplier,
            "hl2"
        )
    );
};

// 更新kLine信息
const setKLinesTemp = (curKLine) => {
    kLineData.length >= maxKLinelen && kLineData.shift();
    historyClosePrices.length >= maxKLinelen && historyClosePrices.shift();

    kLineData.push(curKLine);
    historyClosePrices.push(curKLine.close);
};
const refreshKLineAndIndex = (curKLine) => {
    // 更新kLine信息
    setKLinesTemp(curKLine);

    // 更新平均蜡烛高度
    setCandleHeight();

    // 设置各种指标
    setEveryIndex([...historyClosePrices]);

    if (isTest) {
        console.log("🚀 ~ : curKLine:", curKLine);
    }
};

const kaiDanDaJi = async () => {
    isOrdering = true;

    // 准备开仓
    // 判断趋势
    judgeTradingDirection();
    // 趋势是否被破坏
    // judgeBreakTradingDirection();

    // 没有仓位，准备开仓
    if (!hasOrder) {
        // 开仓：没有仓位就根据 readyTradingDirection 开单
        // 开单完成后会重置 readyTradingDirection
        if (readyTradingDirection !== "hold") {
            judgeAndTrading();
        }
    }

    isOrdering = false;
};

// 止损 | 首次盈利保护
const judgeFirstProfitProtectOrLoss = async (currentPrice) => {
    isJudgeFirstProfit = true;
    const { trend, orderPrice } = tradingInfo;
    const [point1, point2] = gridPoints;

    if (trend === "up") {
        // low 小于 point1 就止损，否则继续持有
        if (currentPrice <= point1) {
            // 止损/平多
            await closeUp();
            isJudgeFirstProfit = false;
            return;
        }

        if (firstStopProfitRate) {
            const firstProfitPrice =
                orderPrice + Math.abs(orderPrice - point1) * firstStopProfitRate;
            if (currentPrice > firstProfitPrice) {
                // 到初始止盈点时，并且该k线是阴线，移动止损到开仓价，避免盈利回撤
                // 减少止损
                gridPoints[0] =
                    orderPrice + Math.abs(orderPrice - firstProfitPrice) * firstProtectProfitRate;
                firstStopProfitRate = 0;
                isJudgeFirstProfit = false;
                return;
            }
        }
        if (firstStopLossRate) {
            const firstStopPrice = orderPrice - Math.abs(orderPrice - point1) * firstStopLossRate;
            if (currentPrice < firstStopPrice) {
                // 到初始止损点时，并且该k线是大阴线，移动止损到该k线的下方，避免亏损太多
                // 仓位还在，说明没有 low 没有触发止损，所以low在point1上方
                // 0.8还是比较苛刻，比较难触发，所以不会频繁触发
                // 这里不再修改止盈点，避免打破策略的平衡
                // 减少止盈利接近开盘价
                gridPoints[1] = orderPrice;
                firstStopLossRate = 0;
                isJudgeFirstProfit = false;
                return;
            }
        }
    }
    if (trend === "down") {
        // high 大于 point2 就止损，否则继续持有
        if (currentPrice >= point2) {
            // 止损/平空
            await closeDown();
            isJudgeFirstProfit = false;
            return;
        }
        if (firstStopProfitRate) {
            const firstProfitPrice =
                orderPrice - Math.abs(orderPrice - point2) * firstStopProfitRate;
            if (currentPrice < firstProfitPrice) {
                // 到初始止盈点时，并且该k线是阳线，移动止损到开仓价，避免盈利回撤
                // 减少止损
                gridPoints[1] =
                    orderPrice - Math.abs(orderPrice - firstProfitPrice) * firstProtectProfitRate;
                firstStopProfitRate = 0;
                isJudgeFirstProfit = false;
                return;
            }
        }
        if (firstStopLossRate) {
            const firstStopPrice = orderPrice + Math.abs(orderPrice - point2) * firstStopLossRate;
            if (currentPrice > firstStopPrice) {
                // 到初始止损点时，并且该k线是阴线，移动止盈到开仓价，避免亏损太多
                // 减少止损
                gridPoints[1] = orderPrice; // Math.abs(high+point2)/2;
                firstStopLossRate = 0;
                isJudgeFirstProfit = false;
                return;
            }
        }
    }
    isJudgeFirstProfit = false;
};

// 止盈 | 移动止盈
const judgeProfitRunOrProfit = async (currentPrice) => {
    isjudgeProfitRunOrProfit = true;
    const { trend, orderPrice } = tradingInfo;
    const [point1, point2] = gridPoints;

    if (isProfitRun) {
        // 移动止盈
        // 判断止盈：high 大于 point2 就止盈利，否则继续持有
        if (trend === "up" && currentPrice >= point2) {
            gridPoints = [
                orderPrice + Math.abs(point2 - orderPrice) * profitProtectRate,
                point2 + candleHeight * howManyCandleForProfitRun,
            ];
            isjudgeProfitRunOrProfit = false;
            return;
        }
        // low 小于 point1 就止盈利，否则继续持有
        if (trend === "down" && currentPrice <= point1) {
            gridPoints = [
                point1 - candleHeight * howManyCandleForProfitRun,
                orderPrice - Math.abs(orderPrice - point1) * profitProtectRate,
            ];
            isjudgeProfitRunOrProfit = false;
            return;
        }
    } else {
        // 判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
        if (trend === "up" && currentPrice >= point2) {
            // 平多
            await closeUp();
            hasOrder = false;
            isjudgeProfitRunOrProfit = false;
            return;
        }
        // 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
        if (hasOrder && trend === "down" && currentPrice <= point1) {
            // 平空
            await closeDown();
            hasOrder = false;
            isjudgeProfitRunOrProfit = false;
            return;
        }
    }
    isjudgeProfitRunOrProfit = false;
};

// 通过指标判断交易方向
const judgeTradingDirection = () => {
    const [kLine1, kLine2, kLine3] = getLastFromArr(kLineData, 3);

    const { close, low, high } = kLine3;

    const [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);

    const { latestClose, demaShort, demaLong, superTrend, dn, up } = superTrend3;

    // (trend == 1 and trend[1] == -1) or (trend == 1 and close > dema_short and low <= dema_log and dema_short > dema_log and dema_log > up)
    const upTerm1 = superTrend === 1 && superTrend2.superTrend === -1;
    const upTerm2 =
        superTrend === 1 &&
        close > demaShort &&
        low <= demaLong &&
        demaShort > demaLong &&
        demaLong > up;
    if (upTerm1 || upTerm2) {
        readyTradingDirection = "up";
        return;
    }

    // (trend == -1 and trend[1] == 1) or (trend == -1 and close < dema_short and high >= dema_log and dema_short < dema_log and dema_log < dn)
    const downTerm1 = superTrend === -1 && superTrend2.superTrend === 1;
    const downTerm2 =
        superTrend == -1 &&
        close < demaShort &&
        high >= demaLong &&
        demaShort < demaLong &&
        demaLong < dn;
    if (downTerm1 || downTerm2) {
        readyTradingDirection = "down";
        return;
    }
    readyTradingDirection = "hold";
};

const judgeBreakTradingDirection = () => {
    const [kLine1, kLine2, kLine3] = getLastFromArr(kLineData, 3);
    const [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);

    const { latestClose, demaShort, demaLong, superTrend } = superTrend3;

    // buySignal and (bar_index - buySignalBar >= lookaheadBars or (dema_short < dema_log) or (trend == -1))
    const upTerm1 = superTrend3.superTrend === 1;
    const upTerm2 = demaShort >= demaLong;
    if (readyTradingDirection === "up" && !(upTerm1 && upTerm2)) {
        //&&upTerm2
        readyTradingDirection = "hold";
        return;
    }

    const downTerm1 = superTrend3.superTrend === -1;
    const downTerm2 = demaShort <= demaLong;
    if (readyTradingDirection === "down" && !(downTerm1 && downTerm2)) {
        //&&downTerm2
        readyTradingDirection = "hold";
        return;
    }
};
// 判断+交易
const judgeAndTrading = async () => {
    loadingTrading = true;

    // 根据指标判断是否可以开单
    const { trend, stopLoss, stopProfit } = calculateTradingSignal();
    console.log("预备开仓信息： Trading trend, stopLoss, stopProfit:", trend, stopLoss, stopProfit);
    // 开单
    switch (trend) {
        case "up":
            await teadeBuy();
            setGridPoints("up", stopLoss, stopProfit);
            firstStopProfitRate = DefaultFirstStopProfitRate;
            firstStopLossRate = DefaultFirstStopLossRate;
            break;
        case "down":
            await teadeSell();
            setGridPoints("down", stopLoss, stopProfit);
            firstStopProfitRate = DefaultFirstStopProfitRate;
            firstStopLossRate = DefaultFirstStopLossRate;
            break;
        default:
            break;
    }

    loadingTrading = false;
};

const calculateTradingSignal = () => {
    const [kLine1, kLine2, kLine3] = getLastFromArr(kLineData, 3);
    const { open, close, openTime, closeTime, low, high } = kLine3;

    const [superTrend1, superTrend2, superTrend3] = getLastFromArr(superTrendArr, 3);

    const { latestClose, demaShort, demaLong, superTrend } = superTrend3;

    // 计算ATR
    const atr = calculateATR(kLineData, atrPeriod).atr;

    let max = Math.max(kLine1.high, kLine2.high, kLine3.high);
    let min = Math.min(kLine1.low, kLine2.low, kLine3.low);
    // let maxBody=Math.max(kLine1.open, kLine1.close, kLine2.open, kLine2.close, kLine3.open, kLine3.close);
    // let minBody=Math.min(kLine1.open, kLine1.close, kLine2.open, kLine2.close, kLine3.open, kLine3.close);

    // const signalUpTerm1=
    // 	isBottomFractal(kLine1, kLine2, kLine3)|| // 是否底分形态
    // 	isBigAndYang(kLine3, 0.85)||
    // 	(isUpLinesGroup2(kLine2, kLine3)&&(isUpCross(kLine1)||isBigAndYang(kLine1, 0.6)))|| // 是否两个k形成垂线
    // 	(isUpLinesGroup3(kLine1, kLine2, kLine3)&&(isBigAndYang(kLine3, 0.6)||isUpCross(kLine3, 0.4)))|| // 是否三个k形成垂线
    // 	(isUpSwallow(kLine2, kLine3)&&kLine3.high>kLine1.high)|| // 看涨吞没
    // 	(isUpSwallow(kLine1, kLine2)&&isBigAndYang(kLine3, 0.6))|| // 看涨吞没 + 大阳k
    // 	(isUpLinesGroup2(kLine1, kLine2)&&(isUpCross(kLine3)||isBigLine(kLine3, 0.6)))|| // k1，k2刺透, k3垂线
    // 	isUpStar(kLine1, kLine2, kLine3)|| // 启明星
    // 	isBreakUp(kLine1, kLine2, kLine3)|| // k3 突破k1/k2，k3是光k
    // 	upPao(kLine1, kLine2, kLine3);

    if (readyTradingDirection === "up" && close > Math.max(demaShort, demaLong) && close > open) {
        // &&signalUpTerm1
        min = Math.min(demaShort, demaLong);
        // if (min<close*(1-invalidSigleStopRate)) {
        // 	return {
        // 		trend: "hold",
        // 	};
        // }
        // if (min<close*(1-maxStopLossRate)) min=close*(1-maxStopLossRate);
        const stopLoss = superTrend === 1 && superTrend2.superTrend === -1 ? min : min - atr;
        return {
            trend: "up",
            stopLoss, // 止损
            // stopLoss: curEma144, // 止损
            // stopProfit: close + candleHeight * howManyCandle, // 止盈
            stopProfit: close + (close - stopLoss) * howManyCandle, // 止盈
        };
    }

    // const signalDownTerm1=
    // 	(isLowerLow(kLine1, kLine2, kLine3)&&isBigLine(kLine3, 0.6))|| // 顶顶高 k3是光k / 三小连阳
    // 	isBigAndYin(kLine3, 0.85)||
    // 	isTopFractal(kLine1, kLine2, kLine3)|| // 是否顶分形态
    // 	(isDownLinesGroup2(kLine2, kLine3)&&(isDownCross(kLine1)||isBigAndYin(kLine1, 0.6)))|| // 是否两个k形成垂线/光头阴
    // 	(isDownLinesGroup3(kLine1, kLine2, kLine3)&&(isBigAndYin(kLine3, 0.6)||isDownCross(kLine3, 0.4)))|| // 是否三个k形成垂线
    // 	(isDownSwallow(kLine2, kLine3)&&kLine3.low<kLine1.low)|| // 看跌吞没
    // 	(isDownSwallow(kLine1, kLine2)&&isBigAndYin(kLine3, 0.6))|| // 看跌吞没 + 大阴k
    // 	(isDownLinesGroup2(kLine1, kLine2)&&(isDownCross(kLine3)||isBigLine(kLine3, 0.6)))|| // k1，k2刺透, k3垂线/大k
    // 	isDownStar(kLine1, kLine2, kLine3)|| // 启明星
    // 	isBreakDown(kLine1, kLine2, kLine3)|| // k3 突破k1/k2，k3是光k
    // 	downPao(kLine1, kLine2, kLine3);

    if (readyTradingDirection === "down" && close < Math.min(demaShort, demaLong) && close < open) {
        // &&signalDownTerm1
        max = Math.max(demaShort, demaLong);
        // if (max>close*(1+invalidSigleStopRate)) {
        // 	return {
        // 		trend: "hold",
        // 	};
        // }
        // if (max>close*(1+maxStopLossRate)) max=close*(1+maxStopLossRate);
        const stopLoss = superTrend === -1 && superTrend2.superTrend === 1 ? max : max + atr;
        return {
            trend: "down",
            stopLoss, // 止损
            // stopLoss: curEma144, // 止损
            // stopProfit: close - candleHeight * howManyCandle, // 止盈
            stopProfit: close - (stopLoss - close) * howManyCandle, // 止盈
        };
    }
    return {
        trend: "hold",
    };
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
    const positionResponse = await axiosInstance.get(
        `${fapi}/v1/positionSide/dual?${signedParams}`
    );
    console.log("🚀 ~ file:200 ~ getPositionSideModel ~ positionResponse:", positionResponse.data);
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
            error && error.response ? error.response.data : error
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
            availableMoney = baseBalance.availableBalance / 10;
            console.log(`Contract ${base} Balance: ${baseBalance.availableBalance}`);
        } else {
            console.log(`No ${base} balance found in the contract account.`);
        }
    } catch (error) {
        console.error(
            "getPositionRisk header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error
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
    } catch (error) {
        console.error(
            "getCurrentPrice header:",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error
        );
    }
};

// 下单（开多操作/开空操作）
const placeOrder = async (side, quantity) => {
    console.log(
        `下单（开${side === "SELL" ? "空" : "多"}操作）placeOrder ~ side, quantity:`,
        side,
        quantity
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
            response.data.orderId
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

            // 更新交易状态
            // readyTradingDirection="hold"; // ????????这里和测试不一样了，测试环境是注释了的
            hasOrder = true;

            saveGlobalVariables();
            console.log("placeOrder ~ 下单成功 tradingInfo:", tradingInfo);

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
            error && error.response ? error.response.data : error
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
            firstStopProfitRate = DefaultFirstStopProfitRate;
            firstStopLossRate = DefaultFirstStopLossRate;
            resetTradingDatas();
            gridPoints = [];
            saveGlobalVariables();
            console.log("🚀 ~ 平仓：平", side === "BUY" ? "空" : "多", response.data.origQty);
        } else {
            console.log(
                "🚀 ~ 平仓：平",
                side === "BUY" ? "空" : "多",
                "！！！！！！！！！！！！！！！！！！！！！！！！失败",
                response,
                tradingInfo
            );
        }
        loadingCloseOrder = false;
    } catch (error) {
        console.error(
            "closeOrder header::",
            error && error.request ? error.request._header : null,
            " error::",
            error && error.response ? error.response.data : error
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

/**
 * 初始化
 *
 * 1. 无论如何都得先调出历史数据（测试/正式都一样）
 * 2. 线上：有仓位 || 无仓位
 *    有仓位，兼容下数据继续跑
 *         1. 跑出网格，直接平仓，重新开单
 *         2. 未出网格，兼容下数据继续跑
 *    无仓位
 *
 * 3. 测试：肯定没有仓位，和线上无仓位处理方式一致
 *         1.
 */
const getHistoryData = () => {
    if (fs.existsSync(`./data/${isTest ? "test" : "prod"}-${strategyType}-${SYMBOL}.js`)) {
        let historyDatas = require(
            `./data/${isTest ? "test" : "prod"}-${strategyType}-${SYMBOL}.js`
        );
        const {
            currentPrice: __currentPrice, // 记录当前价格
            prePrice: __prePrice, // 记录当前价格的前一个
            tradingInfo: __tradingInfo,
        } = historyDatas;
        console.log("上一次停止程序时，交易情况", historyDatas);

        if (
            __currentPrice != 0 &&
            __prePrice != 0 &&
            // 有仓位信息
            __tradingInfo.quantity
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
        currentPrice: __currentPrice, // 记录当前价格
        prePrice: __prePrice, // 记录当前价格的前一个
        tradingInfo: __tradingInfo,
        isProfitRun: __isProfitRun,
        gridPoints: __gridPoints,
        testMoney: __testMoney,
        readyTradingDirection: __readyTradingDirection, // 是否准备开单
        hasOrder: __hasOrder,

        availableMoney: __availableMoney,
        firstStopProfitRate: __firstStopProfitRate,
        firstStopLossRate: __firstStopLossRate,
        lossCount: __lossCount,
    } = historyDatas;

    prePrice = __prePrice; // 记录当前价格的前一个
    tradingInfo = __tradingInfo;
    testMoney = __testMoney;
    gridPoints = __gridPoints;
    isProfitRun = __isProfitRun;
    hasOrder = __hasOrder;
    readyTradingDirection = __readyTradingDirection; // 是否准备开单

    availableMoney = __availableMoney;
    firstStopProfitRate = __firstStopProfitRate;
    firstStopLossRate = __firstStopLossRate;
    lossCount = __lossCount;
};
const recoverHistoryDataByPosition = async (historyDatas, { up, down }) => {
    //
    // 从数据库拿出上次的数据，并且与现在的比较，如果数据和的上就用以前的，数据和不上就解析出
    loadingInit = true;
    let {
        currentPrice: __currentPrice, // 记录当前价格
        prePrice: __prePrice, // 记录当前价格的前一个
        tradingInfo: __tradingInfo,
        isProfitRun: __isProfitRun,
        gridPoints: __gridPoints,
        testMoney: __testMoney,
        readyTradingDirection: __readyTradingDirection, // 是否准备开单
        hasOrder: __hasOrder,

        availableMoney: __availableMoney,
        firstStopProfitRate: __firstStopProfitRate,
        firstStopLossRate: __firstStopLossRate,
        lossCount: __lossCount,
    } = historyDatas;

    prePrice = __currentPrice; // 记录当前价格的前一个
    tradingInfo = __tradingInfo;
    testMoney = __testMoney;
    gridPoints = __gridPoints;
    hasOrder = __hasOrder;
    readyTradingDirection = __readyTradingDirection; // 是否准备开单

    availableMoney = __availableMoney;
    firstStopProfitRate = __firstStopProfitRate;
    firstStopLossRate = __firstStopLossRate;
    lossCount = __lossCount;
    if (__isProfitRun) {
        console.log("上次停止程序时处于利润奔跑模式，当前重启后继续奔跑");
        // await closeOrder(tradingInfo.side, tradingInfo.quantity);
    } else {
        await checkOverGrid({ up, down });
    }
    loadingInit = false;
};

const checkOverGrid = async ({ up, down }) => {
    await getCurrentPrice();
    if (currentPrice <= gridPoints[0] || currentPrice >= gridPoints[1]) {
        console.log(`初始化时，价格超出网格区间，重置仓位（盈利）`);
        await closeAllOrders({ up, down });

        prePrice = currentPrice; // 记录当前价格的前一个
        readyTradingDirection = "hold"; // 是否准备开单
        availableMoney = DefaultAvailableMoney;
        firstStopProfitRate = DefaultFirstStopProfitRate;
        firstStopLossRate = DefaultFirstStopLossRate;
        lossCount = 0;
        resetTradingDatas();
        gridPoints = [];
    }
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

// 更新盈利/止损位（盈利保护）
const modGridPoints = () => {
    const _currentPrice = currentPrice;

    loadingNewPoints = true;

    const [point1, point2] = gridPoints;

    if (tradingInfo.trend === "up") {
        let stopLoss =
            tradingInfo.orderPrice + Math.abs(point2 - tradingInfo.orderPrice) * profitProtectRate; // 止损
        let stopProfit = point2 + candleHeight * howManyCandleForProfitRun; // 止盈
        gridPoints = [stopLoss, stopProfit];

        const _testMoney =
            testMoney +
            tradingInfo.quantity * _currentPrice -
            tradingInfo.orderPrice * tradingInfo.quantity -
            (tradingInfo.quantity * _currentPrice + tradingInfo.orderPrice * tradingInfo.quantity) *
                0.0007;
        console.log(
            `已盈利(${_testMoney})，重新绘制网格 _currentPrice, gridPoints :`,
            currentPrice,
            gridPoints
        );
    }

    if (tradingInfo.trend === "down") {
        let stopLoss =
            tradingInfo.orderPrice - Math.abs(tradingInfo.orderPrice - point1) * profitProtectRate; // 止损
        let stopProfit = point1 - candleHeight * howManyCandleForProfitRun; // 止盈
        gridPoints = [stopProfit, stopLoss];

        const _testMoney =
            testMoney +
            tradingInfo.quantity * tradingInfo.orderPrice -
            tradingInfo.quantity * _currentPrice -
            (tradingInfo.quantity * tradingInfo.orderPrice + tradingInfo.quantity * _currentPrice) *
                0.0007;
        console.log(
            `已盈利(${_testMoney})，重新绘制网格 _currentPrice, gridPoints :`,
            currentPrice,
            gridPoints
        );
    }

    saveGlobalVariables();

    loadingNewPoints = false;
};

// 5. 启动交易
const startTrading = async () => {
    console.log(isTest ? "测试环境～～～" : "正式环境～～～");
    try {
        // 同步服务器时间
        await getServerTimeOffset();

        // 初始化 historyClosePrices
        await getHistoryClosePrices();

        // 初始化指标
        initEveryIndex(historyClosePrices);

        // 初始化 candleHeight
        setCandleHeight();

        // 设置开仓金额
        if (!invariableBalance) {
            await getContractBalance();
        }

        // 获取历史仓位数据
        const historyDatas = getHistoryData();
        // 测试
        if (isTest) {
            await getCurrentPrice();
            historyDatas && (await recoverHistoryData(historyDatas));
        } else {
            // 初始化
            allPositionDetail = await getPositionRisk(); // 获取当前仓位信息

            if (hasUpDownVal(allPositionDetail)) {
                console.log("🚀 已有仓位 ~ allPositionDetail:", allPositionDetail);
                // 已有仓位，立即恢复仓位
                if (historyDatas) {
                    await recoverHistoryDataByPosition(historyDatas, allPositionDetail);
                } else {
                    console.log("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
                    console.error("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
                    return;
                }
            } else {
                // 如果还没仓位要加仓
                console.log("还没仓位，开始运行策略");
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
    availableMoney = DefaultAvailableMoney * (1 + lossCount);
    return Math.round(availableMoney / currentPrice);
};

const closeAllOrders = async ({ up, down }) => {
    let promises = [];
    if (up) {
        // 平多
        const upPromise = closeOrder("SELL", up.quantity, () => {
            if (showProfit) {
                // 测试
                const curTestMoney =
                    up.quantity * currentPrice -
                    up.orderPrice * up.quantity -
                    (up.quantity * currentPrice + up.orderPrice * up.quantity) * 0.0007;

                testMoney += curTestMoney;
                setLossCount(curTestMoney);
                console.log("平多 closeAllOrders ~ testMoney:", testMoney);
            }
            console.log("平多完成");

            // 发送邮件
            // sendMail({
            //     subject: `${up.orderPrice < currentPrice ? "✅" : "❌"}${B_SYMBOL}平多完成`,
            //     text: JSON.stringify({
            //         profitMoney: testMoney,
            //         up: { ...up },
            //         gridPoints: [...gridPoints],
            //     }),
            // });
        });
        promises.push(upPromise);
    }
    if (down) {
        // 平空
        const downPromise = closeOrder("BUY", down.quantity, () => {
            if (showProfit) {
                // 测试
                const curTestMoney =
                    down.quantity * down.orderPrice -
                    down.quantity * currentPrice -
                    (down.quantity * down.orderPrice + down.quantity * currentPrice) * 0.0007;

                testMoney += curTestMoney;
                setLossCount(curTestMoney);

                console.log("平空 closeAllOrders ~ testMoney:", testMoney);
            }
            console.log("平空完成");

            // 发送邮件
            // sendMail({
            //     subject: `${down.orderPrice > currentPrice ? "✅" : "❌"}${B_SYMBOL}平空完成`,
            //     text: JSON.stringify({
            //         profitMoney: testMoney,
            //         down: { ...down },
            //         gridPoints: [...gridPoints],
            //     }),
            // });
        });
        promises.push(downPromise);
    }
    await Promise.all(promises);
    hasOrder = false;
};

// 平多
const closeUp = async () => {
    await closeOrder("SELL", tradingInfo.quantity, () => {
        if (showProfit) {
            // 测试
            const curTestMoney =
                tradingInfo.quantity * currentPrice -
                tradingInfo.quantity * tradingInfo.orderPrice -
                (tradingInfo.quantity * currentPrice +
                    tradingInfo.quantity * tradingInfo.orderPrice) *
                    0.0007;

            testMoney += curTestMoney;
            setLossCount(curTestMoney);
            console.log(
                "平多 gridPointClearTrading ~ currentPrice testMoney:",
                currentPrice,
                testMoney
            );
        }
        console.log("平多完成");

        // 发送邮件
        // sendMail({
        //     subject: `${tradingInfo.orderPrice < _currentPrice ? "✅" : "❌"}${B_SYMBOL}有一单平仓`,
        //     text: JSON.stringify({
        //         profitMoney: testMoney,
        //         tradingInfo: { ...tradingInfo },
        //         gridPoints: [...gridPoints],
        //     }),
        // });
    });
};
const setLossCount = (curTestMoney) => {
    if (double) {
        if (curTestMoney <= 0) {
            lossCount = lossCount + 1 > maxLossCount ? maxLossCount : lossCount + 1;
        } else {
            lossCount = 0;
        }
    }
};
// 平空
const closeDown = async () => {
    await closeOrder("BUY", tradingInfo.quantity, () => {
        if (showProfit) {
            // 测试
            const curTestMoney =
                tradingInfo.quantity * tradingInfo.orderPrice -
                tradingInfo.quantity * currentPrice -
                (tradingInfo.quantity * tradingInfo.orderPrice +
                    tradingInfo.quantity * currentPrice) *
                    0.0007;

            testMoney += curTestMoney;
            setLossCount(curTestMoney);
            console.log(
                "平空 gridPointClearTrading ~ currentPrice testMoney:",
                currentPrice,
                testMoney
            );
        }
        console.log("平空完成");

        // 发送邮件
        // sendMail({
        //     subject: `${tradingInfo.orderPrice > _currentPrice ? "✅" : "❌"}${B_SYMBOL}有一单平仓`,
        //     text: JSON.stringify({
        //         profitMoney: testMoney,
        //         tradingInfo: { ...tradingInfo },
        //         gridPoints: [...gridPoints],
        //     }),
        // });
    });
};
// 是否到达止损点/平仓
const gridPointClearTrading = async (_currentPrice) => {
    onGridPoint = true;
    const [point1, point2] = gridPoints;
    const { trend, orderPrice, quantity } = tradingInfo;
    const curkLine = kLineData[kLineData.length - 1];
    const { open, close, openTime, closeTime, low, high } = curkLine;

    // 止损 | 首次盈利后盈利保护
    await judgeFirstProfitProtectOrLoss(_currentPrice);

    // 止盈 | 移动止盈
    await judgeProfitRunOrProfit(_currentPrice);

    onGridPoint = false;
};

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
            // 更新k线和指标数据
            refreshKLineAndIndex(curKLine);
            // 开单
            await kaiDanDaJi();
        }
        // 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
        // 没有订单也不继续了
        if (isLoading() || prePrice === currentPrice) {
            return;
        } else {
            // 网格模式止盈/止损
            hasOrder && (await gridPointClearTrading(currentPrice)); // 每秒会触发4次左右，但是需要快速判断是否进入交易点，所以不节流
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
    logStream = fs.createWriteStream(
        `${logsFolder}/${isTest ? "test" : "prod"}-${strategyType}-${SYMBOL}-${getDate()}.log`,
        {
            flags: "a",
        }
    );
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
                .join("，")}\n`
        );
    };

    // ~~~~~~~~~~~~~~~~error~~~~~~
    // 创建 error 文件夹
    if (!fs.existsSync(errorsFolder)) {
        fs.mkdirSync(errorsFolder);
    }
    // 重定向 console.error 到文件
    errorStream = fs.createWriteStream(
        `${errorsFolder}/${isTest ? "test" : "prod"}-${strategyType}-${SYMBOL}-${getDate()}.error`,
        { flags: "a" }
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
                .join("，")}\n`
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
    await getServerTimeOffset(); // 同步服务器时间
    await getCurrentPrice();
    await getHistoryClosePrices(); // 初始化 historyClosePrices
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
                candleHeight: candleHeight,
                testMoney,
                hasOrder,
                isProfitRun: isProfitRun,
                gridPoints: gridPoints,
                readyTradingDirection, // 是否准备开单
                availableMoney,
                firstStopProfitRate,
                firstStopLossRate,
                lossCount,
            });
            fs.writeFileSync(
                `data/${isTest ? "test" : "prod"}-${strategyType}-${SYMBOL}.js`,
                `module.exports = ${data}`,
                {
                    flag: "w",
                }
            );
            console.log(`Global variables saved to data/${SYMBOL}.js`);
        }
    }, 0);
}
