// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const sendMail=require("./mailer.js");
const axios=require("axios"); // HTTP请求库
const crypto=require("crypto"); // 加密模块
const WebSocket=require("ws"); // WebSocket库
// const { HttpsProxyAgent } = require("https-proxy-agent");
// const { SocksProxyAgent } = require("socks-proxy-agent");
// const Binance = require("node-binance-api");
const fs=require("fs");
const {getDate, hasUpDownVal}=require("./utils/functions.js");
const {calculateATR}=require("./utils/atr.js");
const {calculateBBKeltnerSqueeze}=require("./utils/BBKeltner.js");
const {calculateKDJ, calculateKDJs}=require("./utils/KDJ.js");
const {calculateCandleHeight}=require("./utils/kLineTools.js");
const config=require("./config-BBKeltner-KDJ.js");
const {calculateRSI}=require("./utils/rsi.js");
const {calculateSimpleMovingAverage, calculateEMA}=require("./utils/ma.js");

let testMoney=0;

const {
    SYMBOL,
    base,
    availableMoney,
    invariableBalance,
    leverage,
    numForAverage,
    maxRepeatNum,
    mixReversetime,
    howManyCandleHeight=15,
    minGridHight,
    maxGridHight,
    stopLossRate,
    times,
    THRESHOLD=0,
    profitRate,
    EMA_PERIOD,
    klineStage,
    logsFolder,
    errorsFolder,
    profitProtectRate,
    xAngle,
}=config["op"];

// 环境变量
const B_SYMBOL=SYMBOL.toUpperCase();
const isTest=true; // 将此标志设置为  false/true 使用沙盒环境
const showProfit=true;
const api="https://api.binance.com/api";
const fapi="https://fapi.binance.com/fapi";
const apiKey=process.env.BINANCE_API_KEY; // 获取API密钥
const secretKey=process.env.BINANCE_API_SECRET; // 获取API密钥的密钥

console.log(isTest? "测试环境～～～":"正式环境～～～");

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
const axiosInstance=axios.create({
    // baseURL: "https://api.example.com", // 请替换为实际的 API 地址
    headers: {
        "Content-Type": "application/json",
        "X-MBX-APIKEY": apiKey,
    },
    // httpsAgent: httpProxyAgent, // 设置 SOCKS5 代理
});

// WebSocket连接，用于获取实时交易信息
// const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}m`, { agent: socksProxyAgent });
const ws=new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}m`);
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
let kLineData=[];
let currentPrice=0; // 记录当前价格
let prePrice=0; // 记录当前价格的前一个
let gridPoints=[]; // 网格每个交易点
let currentPriceEma; // 当前价格的EMA值
let serverTimeOffset=0; // 服务器时间偏移
let historyClosePrices=[]; // 历史收盘价，用来计算EMA
let allPositionDetail={}; // 当前仓位信息
let candleHeight=0; // 蜡烛高度
let readyTradingDirection="hold"; // 是否准备开单
let isReadyStopProfit=false; // 是否准备止盈
let isProfitRun=false;
let KDJ=isTest? [40, 60]:[10, 90];

const maxKLinelen=200; // 储存kLine最大数量
const STD_MULTIPLIER=2; // 用来确定布林带的宽度
const BOLL_PERIOD=20;
const RSI_PERIOD_MIN=14; // RSI计算周期
const RSI_PERIOD_MAX=100; // RSI计算周期

let rsiArr=[];
let emaArr=[];
let macdArr=[];
let rsiGroupArr=[];
let ema1Arr=[];
let ema2Arr=[];

const MACD_PERIOD=[40, 80, 9];

// 日志
let logStream=null;
let errorStream=null;

// 最新交易信息
let tradingInfo={
    trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
    side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
    orderPrice: 0,
    quantity: 0,
    times: 0,
};

// loading
let loadingTrading=false; // 下单
let loadingPlaceOrder=false; // 下单
let loadingCloseOrder=false; // 平仓
let onGridPoint=false; // 网格上
let loadingInit=false;
let hasOrder=false; // 是否有订单
let isRefreshKLine=false; // 是否在收盘后的计算中
let isClosePosition=false;

const isLoading=() => {
    return (
        loadingInit||
        isRefreshKLine||
        isClosePosition||
        loadingTrading||
        loadingPlaceOrder||
        loadingCloseOrder||
        onGridPoint
    );
};

const resetTradingDatas=() => {
    tradingInfo={
        trend: "", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
        side: "", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
        orderPrice: 0,
        quantity: 0,
        times: 0,
    };
};
// 获取服务器时间偏移
const getServerTimeOffset=async () => {
    try {
        console.log("获取服务器时间偏移");
        const response=await axiosInstance.get(`${api}/v3/time`);
        const serverTime=response.data.serverTime;
        const localTime=Date.now();
        serverTimeOffset=serverTime-localTime;
        console.log(" Server time offset:", serverTimeOffset);
    } catch (error) {
        console.error(
            "getServerTimeOffset header::",
            error&&error.request? error.request._header:null,
            " error::",
            error&&error.response? error.response.data:error,
        );
        process.exit(1);
    }
};

// 签名请求
const signRequest=(params) => {
    const timestamp=Date.now()+serverTimeOffset;
    const queryString=Object.entries({...params, timestamp})
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
    const signature=crypto.createHmac("sha256", secretKey).update(queryString).digest("hex");
    return `${queryString}&signature=${signature}`;
};

// 获取K线数据
const getKLineData=async (symbol, interval, limit) => {
    try {
        const response=await axios.get(`${fapi}/v1/klines`, {
            params: {
                symbol,
                interval,
                limit,
            },
        });
        // 解析K线数据
        return response.data.map((item) => ({
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
            error&&error.request? error.request._header:null,
            " error::",
            error&&error.response? error.response.data:error,
        );
        process.exit(1);
    }
};

// 获取收盘价
const getHistoryClosePrices=async () => {
    // 在getKLineData方法中获取至少15分钟内的价格数据
    kLineData=await getKLineData(B_SYMBOL, `${klineStage}m`, maxKLinelen);
    historyClosePrices=kLineData.map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
    // console.log("k线收盘价:", historyClosePrices);

    // initEmaArr();

    // initEveryIndex();
    candleHeight=calculateCandleHeight(getLastFromArr(kLineData, 9));

    // console.log("计算出实际蜡烛高度 candleHeight:", candleHeight);

    // let preCloseTime = kLineData[kLineData.length - 1].closeTime;
    // let nextCloseTime = preCloseTime + klineStage;
    // let x = nextCloseTime - Date.now();
    // 0.000048
    // 0.00009
    // console.log("k线最后一个蜡烛的收盘时间差 preCloseTime, nextCloseTime, x:", preCloseTime, nextCloseTime, x);
};
const initEveryIndex=() => {
    const len=historyClosePrices.length;
    for (let index=0;index<10;index++) {
        setEveryIndex(historyClosePrices.slice(0, len-10));
    }
};
const initEmaArr=() => {
    const len=historyClosePrices.length;
    for (let index=0;index<10;index++) {
        setSimpleEmaArr(historyClosePrices.slice(0, len-10), BOLL_PERIOD);
    }
};
// 获取EMA（指数移动平均线）值
const getCurrentPriceEma=async () => {
    // 传递至calculateEMA函数
    currentPriceEma=await setEmaArr(historyClosePrices, EMA_PERIOD);
    console.log("🚀 ~ file: gridBot5.js:396 ~ ws.on ~ currentPriceEma:", currentPriceEma);
};

const refreshKLine=async (curKLine) => {
    isRefreshKLine=true;
    // 更新kLine信息
    kLineData.length>=maxKLinelen&&kLineData.shift();
    historyClosePrices.length>=maxKLinelen&&historyClosePrices.shift();

    kLineData.push(curKLine);
    historyClosePrices.push(curKLine.close);

    // 更新平均蜡烛高度
    candleHeight=calculateCandleHeight(kLineData);
    // console.log("计算出实际蜡烛高度 candleHeight:", candleHeight);

    // 设置各种指标
    setEveryIndex([...historyClosePrices]);

    const {B2basis, B2upper, B2lower, Kma, Kupper, Klower, squeeze}=calculateBBKeltnerSqueeze([...kLineData], 20);
    const kdjs=calculateKDJs([...kLineData], 25);
    // console.log("🚀 ~ file: gridBot-doge7-0-4-BBKeltner-KDJ.js:418 ~ refreshKLine ~ kdjs:", kdjs);
    const kdj=kdjs[kdjs.length-1];
    if (isTest) {
        console.log(
            "🚀 ~ 各种指标: curKLine, [B2upper, Kupper], [B2lower, Klower], squeeze, kdjs:",
            curKLine,
            [getLastFromArr(B2upper, 1)[0], getLastFromArr(Kupper, 1)[0]],
            [getLastFromArr(B2lower, 1)[0], getLastFromArr(Klower, 1)[0]],
            getLastFromArr(squeeze, 1)[0],
            getLastFromArr(kdjs, 1)[0],
        );
    }

    const curB2basis=getLastFromArr(B2basis, 1)[0];
    const curB2upper=getLastFromArr(B2upper, 1)[0];
    const curB2lower=getLastFromArr(B2lower, 1)[0];
    const curKma=getLastFromArr(Kma, 1)[0];
    const curkLine=getLastFromArr(kLineData, 1)[0];
    const isSqueeze=getLastFromArr(squeeze, 1)[0];

    // 没有仓位，准备开仓：挤压状态时，判断 开单方向
    if (!hasOrder) {
        if (isSqueeze&&readyTradingDirection==="hold") {
            judgeTradingDirection(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj);

            console.log("🚀 ~ 准备开仓：准备开单方向 readyTradingDirection:", readyTradingDirection);
        }
        // 开仓：没有仓位就根据 readyTradingDirection 开单
        // 开单完成后会重置 readyTradingDirection
        if (readyTradingDirection!=="hold") {
            await judgeAndTrading(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj);
        }
    }
    // 平仓：已有仓位就根据kdj指标平仓
    else {
        // isReadyStopProfit === false 表示没有准备止盈，就先判断并准备止盈
        if (!isReadyStopProfit) {
            judgeReadyStopProfit(kdj);
            console.log("判断是否准备止盈 ~ isReadyStopProfit:", isReadyStopProfit);
        }
        // 准备止盈后，根据kdj指标平仓，此时是否需要采用网格止盈+利润奔跑要快点能抓取更多利润，避免1h级别后续利润回吐太多
        // 已经在平仓了（网格先判断出平仓并正在平仓）就不再进入下面逻辑
        if (isReadyStopProfit&&!loadingCloseOrder) {
            console.log("开始止盈");
            (kdj.j<KDJ[0]||kdj.j>KDJ[1])&&modGridPoints(); // 准备止盈后就开启盈利保护
            await judgeClosePosition(kdjs);
        }
    }
    isRefreshKLine=false;
};
// 准备止盈
const judgeReadyStopProfit=async (kdj) => {
    if (tradingInfo.trend==="up") {
        // 当KDJ蓝色信号线大于80以上位阶, 做好停利的准备
        if (kdj.j>KDJ[1]) {
            isReadyStopProfit=true;
        }
    }
    if (tradingInfo.trend==="down") {
        // 当KDJ蓝色信号线小于20以下位阶, 做好停利的准备
        if (kdj.j<KDJ[0]) {
            isReadyStopProfit=true;
        }
    }
};
// 止盈
const judgeClosePosition=async (kdjs) => {
    isClosePosition=true;
    const [preKdj, curKdj]=getLastFromArr(kdjs, 2);
    if (tradingInfo.trend==="up") {
        // 等到KDJ蓝色信号线从80以上位阶下穿到小于80以下时, 进行多单平仓
        if (preKdj.j>=KDJ[1]&&curKdj.j<KDJ[1]) {
            console.log("蓝色信号线从80以上位阶下穿到小于80以下时, 进行多单平仓 平多");
            // 平多
            await closeOrder("SELL", tradingInfo.quantity, () => {
                if (showProfit) {
                    // 测试
                    testMoney+=
                        tradingInfo.quantity*currentPrice-
                        tradingInfo.quantity*tradingInfo.orderPrice-
                        (tradingInfo.quantity*currentPrice+tradingInfo.quantity*tradingInfo.orderPrice)*0.0005;
                    console.log("平多 gridPointClearTrading ~ testMoney:", testMoney);
                }
                console.log("平多完成");
                hasOrder=false;
                onGridPoint=false;
                readyTradingDirection="hold";
                isReadyStopProfit=false;

                // 发送邮件
                sendMail({
                    subject: `${tradingInfo.orderPrice<_currentPrice? "✅":"❌"}${B_SYMBOL}有一单平仓`,
                    text: JSON.stringify({
                        profitMoney: testMoney,
                        tradingInfo: {...tradingInfo},
                        gridPoints: [...gridPoints],
                    }),
                });
            });
            isClosePosition=false;
            return;
        }
    }
    if (tradingInfo.trend==="down") {
        // 等到KDJ蓝色信号线从20以下位阶上穿到大于20以上时, 进行空单平仓
        if (preKdj.j<=KDJ[0]&&curKdj.j>KDJ[0]) {
            console.log("等到KDJ蓝色信号线从20以下位阶上穿到大于20以上时, 进行空单平仓 平空");
            // 平空
            await closeOrder("BUY", tradingInfo.quantity, () => {
                if (showProfit) {
                    // 测试
                    testMoney+=
                        tradingInfo.quantity*tradingInfo.orderPrice-
                        tradingInfo.quantity*currentPrice-
                        (tradingInfo.quantity*tradingInfo.orderPrice+tradingInfo.quantity*currentPrice)*0.0005;
                    console.log("平空 gridPointClearTrading ~ testMoney:", testMoney);
                }
                console.log("平空完成");
                hasOrder=false;
                onGridPoint=false;
                readyTradingDirection="hold";
                isReadyStopProfit=false;

                // 发送邮件
                sendMail({
                    subject: `${tradingInfo.orderPrice>_currentPrice? "✅":"❌"}${B_SYMBOL}有一单平仓`,
                    text: JSON.stringify({
                        profitMoney: testMoney,
                        tradingInfo: {...tradingInfo},
                        gridPoints: [...gridPoints],
                    }),
                });
            });
            isClosePosition=false;
            return;
        }
    }
    isClosePosition=false;
};
// 通过 BBK-KDJ 指标判断方向 / 交易
const judgeTradingDirection=(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj) => {
    // 第一, 出现蓝底范围, 视为挤压
    // 第二, 在挤压的范围内某一根K棒收盘后收在布林通道的下线, 并且KDJ蓝色信号线小于20以下位阶
    // 第三, 此时准备开多

    if (curkLine.close<curB2lower&&kdj.j<KDJ[0]) {
        // 有订单时候只设置 下一个订单方向 还不能开单
        readyTradingDirection="up";
        return;
    }
    // 第一, 出现蓝底范围, 视为挤压
    // 第二, 在挤压的范围内某一根K棒收盘后收在布林通道的上线, 并且KDJ蓝色信号线大于80以上位阶
    // 第三, 此时准备开空
    if (curkLine.close>curB2upper&&kdj.j>KDJ[1]) {
        // 有订单时候只设置 下一个订单方向 还不能开单
        readyTradingDirection="down";
        return;
    }
    readyTradingDirection="hold";
};

// 判断+交易
const judgeAndTrading=async (curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj) => {
    loadingTrading=true;
    // 根据指标判断是否可以开单
    const {trend, stopLoss, stopProfit}=calculateTradingSignal(
        curB2basis,
        curB2upper,
        curB2lower,
        curKma,
        curkLine,
        isSqueeze,
        kdj,
    );
    console.log("仓位信息： Trading trend, stopLoss, stopProfit:", trend, stopLoss, stopProfit);
    // 开单
    switch (trend) {
        case "up":
            if (kdj.j>KDJ[0]) {
                await teadeBuy();
                setGridPoints("up", stopLoss, stopProfit);
                readyTradingDirection="hold";
                isReadyStopProfit=false;
                hasOrder=true;
            }
            break;
        case "down":
            if (kdj.j<KDJ[1]) {
                await teadeSell();
                setGridPoints("down", stopLoss, stopProfit);
                readyTradingDirection="hold";
                isReadyStopProfit=false;
                hasOrder=true;
            }
            break;
        default:
            break;
    }

    loadingTrading=false;
};
const calculateTradingSignal=(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj) => {
    const [kLine1, kLine2, kLine3]=getLastFromArr(3);
    const max=Math.max(kLine1.high, kLine2.high, kLine3.high);
    const min=Math.min(kLine1.low, kLine2.low, kLine3.low);

    // 当KDJ蓝色信号线大于20以上位阶, 并且K棒要收涨, 收盘价进场
    if (readyTradingDirection==="up"&&kdj.j>KDJ[0]&&kLine3.close>kLine3.open) {
        // 计算atr
        // const { atr } = calculateATR(getLastFromArr(kLineData, 100), 14);
        return {
            trend: "up",
            stopLoss: kLine3.close-kLine3.close*0.01, // min - atr, // >>>>>> 这里有插针后引线过长导致止损过长的问题
            stopProfit: kLine3.close+kLine3.close*0.01*howManyCandleHeight, // 止盈大一点
        };
    }
    // 当KDJ蓝色信号线小于80以上位阶, 并且K棒要收跌, 收盘价进场
    if (readyTradingDirection==="down"&&kdj.j<KDJ[1]&&kLine3.close<kLine3.open) {
        // 计算atr
        // const { atr } = calculateATR(getLastFromArr(kLineData, 100), 14);
        return {
            trend: "down",
            stopLoss: kLine3.close+kLine3.close*0.01, // max + atr, // >>>>>> 这里有插针后引线过长导致止损过长的问题
            stopProfit: kLine3.close-kLine3.close*0.01*howManyCandleHeight, // 止盈大一点
        };
    }
    return {
        trend: "hold",
    };
};

const setEveryIndex=(prices) => {
    // 计算 ema
    // setSimpleEmaArr(historyClosePrices, BOLL_PERIOD);

    // 计算macd
    setMacdArr(prices);

    // 计算rsi
    setRsiGroupArr(prices);
};

const setSimpleEmaArr=(prices, period) => {
    if (emaArr.length>=50) {
        emaArr.shift();
    }
    emaArr.push(calculateEMA(prices, period));
};
const setMacdArr=(prices, period) => {
    if (macdArr.length>=50) {
        macdArr.shift();
    }
    macdArr.push(calculateMACD(prices, period));
};
const setRsiGroupArr=(prices) => {
    if (rsiGroupArr.length>=50) {
        rsiGroupArr.shift();
    }
    rsiGroupArr.push({
        short: calculateRSI(prices, RSI_PERIOD_MIN),
        long: calculateRSI(prices, RSI_PERIOD_MAX),
    });
};

// 查询持仓模式
const getPositionSideModel=async () => {
    // await getServerTimeOffset(); // 测试后删除
    let timestamp=Date.now()+serverTimeOffset;
    const params={
        recvWindow: 6000, // 请求的超时时间
        timestamp,
    };
    const signedParams=signRequest(params);
    const positionResponse=await axiosInstance.get(`${fapi}/v1/positionSide/dual?${signedParams}`);
    // "true": 双向持仓模式；"false": 单向持仓模式
    console.log("🚀 ~ file: gridBot6.js:200 ~ getPositionSideModel ~ positionResponse:", positionResponse.data);
};
// 获取持仓风险，这里要改成村本地
const getPositionRisk=async () => {
    try {
        const timestamp=Date.now()+serverTimeOffset;
        const params={
            symbol: B_SYMBOL, // 交易对
            timestamp,
            recvWindow: 6000,
        };

        const signedParams=signRequest(params);
        const response=await axiosInstance.get(`${fapi}/v2/positionRisk?${signedParams}`);
        const data=response.data;
        console.log(" getPositionRisk ~ response:", data);
        let upData={};
        let downData={};
        if (data[0].positionSide==="LONG") {
            upData=data[0];
            downData=data[1];
        } else {
            upData=data[1];
            downData=data[0];
        }

        let res=null;
        if (Number(upData.positionAmt)||Number(downData.positionAmt)) {
            res={};
            if (Number(upData.positionAmt)) {
                res.up={
                    trend: "up", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
                    side: "BUY", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
                    orderPrice: Number(upData.entryPrice),
                    quantity: Math.abs(upData.positionAmt),
                    breakEvenPrice: upData.breakEvenPrice,
                };
            }
            if (Number(downData.positionAmt)) {
                res.down={
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
            error&&error.request? error.request._header:null,
            " error::",
            error&&error.response? error.response.data:error,
        );
        process.exit(1);
    }
};

// 获取当前合约账户中的 USDT 余额
const getContractBalance=async () => {
    try {
        let timestamp=Date.now()+serverTimeOffset;
        const params={
            recvWindow: 6000, // 请求的超时时间
            timestamp,
        };
        const signedParams=signRequest(params);
        // 获取账户信息
        const response=await axiosInstance.get(`${fapi}/v2/balance?${signedParams}`);
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
        const balances=response.data||[];
        const baseBalance=balances.find((balance) => balance.asset===base);

        if (baseBalance) {
            availableMoney=baseBalance.availableBalance;
            console.log(`Contract ${base} Balance: ${baseBalance.availableBalance}`);
        } else {
            console.log(`No ${base} balance found in the contract account.`);
        }
    } catch (error) {
        console.error(
            "getPositionRisk header::",
            error&&error.request? error.request._header:null,
            " error::",
            error&&error.response? error.response.data:error,
        );
        process.exit(1);
    }
};
// 获取当前价格
const getCurrentPrice=async () => {
    try {
        let timestamp=Date.now()+serverTimeOffset;
        const params={
            recvWindow: 6000, // 请求的超时时间
            timestamp,
            symbol: B_SYMBOL,
        };
        const signedParams=signRequest(params);
        // 获取账户信息
        const response=await axiosInstance.get(`${fapi}/v2/ticker/price?${signedParams}`);
        currentPrice=response.data? Number(response.data.price):0;
        console.log("🚀 ~ file: gridBot6-1.js:362 ~ getCurrentPrice ~ currentPrice:", currentPrice);
    } catch (error) {
        console.error(
            "getCurrentPrice header:",
            error&&error.request? error.request._header:null,
            " error::",
            error&&error.response? error.response.data:error,
        );
    }
};

// 计算 EMA 斜率的函数
function calculateEMASlope(emaArray, n) {
    if (emaArray.length<n+1) {
        throw new Error(`EMA array length (${emaArray.length}) is less than ${n+1}`);
    }

    let slopes=[];
    for (let i=emaArray.length-n;i<emaArray.length-1;i++) {
        let slope=emaArray[i+1]-emaArray[i];
        slopes.push(slope);
    }

    const sum=slopes.reduce((acc, value) => acc+value, 0);
    // const len = emaArray.length;
    // const res = emaArray[len - 1] - emaArray[len - 2];
    const res=sum/slopes.length;
    console.log("🚀 ~ 斜率 ~ res:", res);
    return res;
}
const setEmaArr=(prices, [period1, period2]) => {
    if (ema1Arr.length>=10) {
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
const placeOrder=async (side, quantity) => {
    console.log(`下单（开${side==="SELL"? "空":"多"}操作）placeOrder ~ side, quantity:`, side, quantity);
    try {
        loadingPlaceOrder=true;
        const _currentPrice=currentPrice;
        const timestamp=Date.now()+serverTimeOffset;
        let params={
            symbol: B_SYMBOL, // 交易对
            side, // 指定订单是开多 (BUY) 还是开空 (SELL)
            type: "MARKET", // LIMIT：限价订单，MARKET：市价订单，详见 https://binance-docs.github.io/apidocs/spot/en/#test-new-order-trade
            quantity,
            positionSide: side==="BUY"? "LONG":"SHORT",
            timestamp,
            recvWindow: 6000, // 请求的超时时间
        };
        console.log("下单 params:", params);
        const signedParams=signRequest(params);

        let response=null;
        if (isTest) {
            response={
                data: {
                    orderId: "xxx",
                    origQty: quantity,
                },
            };
        } else {
            response=await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
        }

        console.log(
            `Order placed - Symbol: ${B_SYMBOL}, Side: ${side}, Quantity: ${quantity}`,
            "orderId:",
            response.data.orderId,
        );
        // 如果 下单（开多操作/开空操作） 成功需要更新PurchaseInfo
        if (response&&response.data&&response.data.orderId) {
            const {origQty}=response.data;
            const trend=side==="BUY"? "up":"down";
            await recordRradingInfo({
                trend,
                side,
                orderPrice: _currentPrice,
                quantity: Math.abs(origQty),
                // orderTime: Date.now(),
            });
            saveGlobalVariables();
            console.log("placeOrder ~ 下单成功 tradingInfo:", tradingInfo);
            hasOrder=true;

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
        loadingPlaceOrder=false;
    } catch (error) {
        console.error(
            "placeOrder header::",
            error&&error.request? error.request._header:null,
            " error::",
            error&&error.response? error.response.data:error,
        );
        process.exit(1);
    }
};
// 平仓
const closeOrder=async (side, quantity, cb) => {
    try {
        loadingCloseOrder=true;
        const timestamp=Date.now()+serverTimeOffset;
        let params={
            symbol: B_SYMBOL, // 交易对
            side,
            type: "MARKET",
            quantity,
            positionSide: side==="BUY"? "SHORT":"LONG",
            timestamp,
            recvWindow: 6000,
        };

        const signedParams=signRequest(params);
        let response=null;
        if (isTest) {
            response={
                data: {
                    origQty: quantity,
                },
            };
        } else {
            response=await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
        }

        if (response&&response.data&&response.data.origQty) {
            cb&&cb();
            resetTradingDatas();
            saveGlobalVariables();
            console.log("🚀 ~ 平仓：平", side==="BUY"? "空":"多", response.data.origQty);
        } else {
            console.log(
                "🚀 ~ 平仓：平",
                side==="BUY"? "空":"多",
                "！！！！！！！！！！！！！！！！！！！！！！！！失败",
                response,
                tradingInfo,
            );
        }
        loadingCloseOrder=false;
    } catch (error) {
        console.error(
            "closeOrder header::",
            error&&error.request? error.request._header:null,
            " error::",
            error&&error.response? error.response.data:error,
        );
        process.exit(1);
    }
};

// 开多
const teadeBuy=async () => {
    try {
        await placeOrder("BUY", getQuantity()); // 调整开仓数量
        console.log("开多完成");
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};

// 开空
const teadeSell=async () => {
    try {
        await placeOrder("SELL", getQuantity()); // 调整开仓数量
        console.log("开空完成");
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};

// 更新购买信息
const recordRradingInfo=async (info) => {
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
const getHistoryData=() => {
    if (fs.existsSync(`./data/${isTest? "test":"prod"}-BBKeltner-KDJ-${SYMBOL}.js`)) {
        let historyDatas=require(`./data/${isTest? "test":"prod"}-BBKeltner-KDJ-${SYMBOL}.js`);
        const {
            currentPrice: __currentPrice, // 记录当前价格
            prePrice: __prePrice, // 记录当前价格的前一个
            tradingInfo: __tradingInfo,
        }=historyDatas;
        console.log("上一次停止程序时，交易情况", historyDatas);

        if (
            __currentPrice!=0&&
            __prePrice!=0&&
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
const recoverHistoryData=async (historyDatas) => {
    const {
        currentPrice: __currentPrice, // 记录当前价格
        prePrice: __prePrice, // 记录当前价格的前一个
        tradingInfo: __tradingInfo,
        isProfitRun: __isProfitRun,
        gridPoints: __gridPoints,
        testMoney: __testMoney,
        readyTradingDirection: __readyTradingDirection, // 是否准备开单
        isReadyStopProfit: __isReadyStopProfit, // 是否准备止盈
        hasOrder: __hasOrder,
    }=historyDatas;

    prePrice=__prePrice; // 记录当前价格的前一个
    tradingInfo=__tradingInfo;
    testMoney=__testMoney;
    gridPoints=__gridPoints;
    isProfitRun=__isProfitRun;
    hasOrder=__hasOrder;
    readyTradingDirection=__readyTradingDirection; // 是否准备开单
    isReadyStopProfit=__isReadyStopProfit; // 是否准备止盈
};
const recoverHistoryDataByPosition=async (historyDatas, {up, down}) => {
    //
    // 从数据库拿出上次的数据，并且与现在的比较，如果数据和的上就用以前的，数据和不上就解析出
    loadingInit=true;
    let {
        currentPrice: __currentPrice, // 记录当前价格
        prePrice: __prePrice, // 记录当前价格的前一个
        tradingInfo: __tradingInfo,
        isProfitRun: __isProfitRun,
        gridPoints: __gridPoints,
        testMoney: __testMoney,
        readyTradingDirection: __readyTradingDirection, // 是否准备开单
        isReadyStopProfit: __isReadyStopProfit, // 是否准备止盈
        hasOrder: __hasOrder,
    }=historyDatas;

    prePrice=__currentPrice; // 记录当前价格的前一个
    tradingInfo=__tradingInfo;
    testMoney=__testMoney;
    gridPoints=__gridPoints;
    hasOrder=__hasOrder;
    readyTradingDirection=__readyTradingDirection; // 是否准备开单
    isReadyStopProfit=__isReadyStopProfit; // 是否准备止盈

    if (__isProfitRun) {
        console.log("上次停止程序时处于利润奔跑模式，当前重启后继续奔跑");
        // await closeOrder(tradingInfo.side, tradingInfo.quantity);
    } else {
        await checkOverGrid({up, down});
    }
    loadingInit=false;
};

const checkOverGrid=async ({up, down}) => {
    await getCurrentPrice();
    if (currentPrice<=gridPoints[0]||currentPrice>=gridPoints[1]) {
        console.log(`初始化时，价格超出网格区间，重置仓位（盈利）`);
        await closeAllOrders({up, down});

        prePrice=currentPrice; // 记录当前价格的前一个
        isProfitRun=false;
        readyTradingDirection="hold"; // 是否准备开单
        isReadyStopProfit=false; // 是否准备止盈
        resetTradingDatas();
        gridPoints=[];
    }
};

// 设置网格
const setGridPoints=(trend, stopLoss, stopProfit) => {
    const _currentPrice=currentPrice;
    console.log("开始绘制网格~ trend, _currentPrice:", trend, _currentPrice);

    loadingNewPoints=true;

    if (trend==="up") {
        let _stopLoss=stopLoss*0.9999999999; // 止损
        let _stopProfit=stopProfit*0.9999999999; // 止盈
        gridPoints=[_stopLoss, _stopProfit];
    }

    if (trend==="down") {
        let _stopLoss=stopLoss*0.9999999999; // 止损
        let _stopProfit=stopProfit*0.9999999999; // 止盈
        gridPoints=[_stopProfit, _stopLoss];
    }

    saveGlobalVariables();

    loadingNewPoints=false;
    console.log("绘制网格 _currentPrice, gridPoints :", currentPrice, gridPoints);
};

// 更新止损位（盈利保护）
const modGridPoints=() => {
    const _currentPrice=currentPrice;

    loadingNewPoints=true;

    const [point1, point2]=gridPoints;

    if (tradingInfo.trend==="up") {
        let stopLoss=tradingInfo.orderPrice+(point2-tradingInfo.orderPrice)*profitProtectRate; // 止损
        let stopProfit=point2+candleHeight; // 止盈
        gridPoints=[stopLoss, stopProfit];

        const _testMoney=
            testMoney+
            tradingInfo.quantity*_currentPrice-
            tradingInfo.orderPrice*tradingInfo.quantity-
            (tradingInfo.quantity*_currentPrice+tradingInfo.orderPrice*tradingInfo.quantity)*0.0005;
        console.log(`已盈利(${_testMoney})，重新绘制网格 _currentPrice, gridPoints :`, currentPrice, gridPoints);
    }

    if (tradingInfo.trend==="down") {
        let stopLoss=tradingInfo.orderPrice-(tradingInfo.orderPrice-point1)*profitProtectRate; // 止损

        let stopProfit=point1-candleHeight; // 止盈
        gridPoints=[stopProfit, stopLoss];

        const _testMoney=
            testMoney+
            tradingInfo.quantity*tradingInfo.orderPrice-
            tradingInfo.quantity*_currentPrice-
            (tradingInfo.quantity*tradingInfo.orderPrice+tradingInfo.quantity*_currentPrice)*0.0005;
        console.log(`已盈利(${_testMoney})，重新绘制网格 _currentPrice, gridPoints :`, currentPrice, gridPoints);
    }

    saveGlobalVariables();

    loadingNewPoints=false;
};

// 5. 启动交易
const startTrading=async () => {
    console.log(isTest? "测试环境～～～":"正式环境～～～");
    try {
        await getServerTimeOffset(); // 同步服务器时间

        await getHistoryClosePrices(); // 初始化 historyClosePrices

        if (!invariableBalance) {
            await getContractBalance(); // 获取当前合约账户中的 USDT
        }
        const historyDatas=getHistoryData();
        // 测试
        if (isTest) {
            await getCurrentPrice();
            historyDatas&&(await recoverHistoryData(historyDatas));
        } else {
            // 初始化
            allPositionDetail=await getPositionRisk(); // 获取当前仓位信息

            if (hasUpDownVal(allPositionDetail)) {
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
                // 如果还没仓位要加仓
                console.log("还没仓位，直接开始循环");
                await getCurrentPrice(); // 获取当前价格
                historyDatas&&(await recoverHistoryData(historyDatas)); // 处理历史数据
            }
        }
        await startWebSocket(); // 启动websocket更新价格
    } catch (error) {
        console.error("startTrading Error:", error);
        process.exit(1);
    }
};
// 获取下单量
const getQuantity=() => {
    return Math.round(availableMoney/currentPrice);
};

const closeAllOrders=async ({up, down}) => {
    let promises=[];
    if (up) {
        // 平多
        const upPromise=closeOrder("SELL", up.quantity, () => {
            if (showProfit) {
                // 测试
                testMoney+=
                    up.quantity*currentPrice-
                    up.orderPrice*up.quantity-
                    (up.quantity*currentPrice+up.orderPrice*up.quantity)*0.0005;
                console.log("平多 closeAllOrders ~ testMoney:", testMoney);
            }
            console.log("平多完成");

            // 发送邮件
            sendMail({
                subject: `${up.orderPrice<currentPrice? "✅":"❌"}${B_SYMBOL}平多完成`,
                text: JSON.stringify({
                    profitMoney: testMoney,
                    up: {...up},
                    gridPoints: [...gridPoints],
                }),
            });
        });
        promises.push(upPromise);
    }
    if (down) {
        // 平空
        const downPromise=closeOrder("BUY", down.quantity, () => {
            if (showProfit) {
                // 测试
                testMoney+=
                    down.quantity*down.orderPrice-
                    down.quantity*currentPrice-
                    (down.quantity*down.orderPrice+down.quantity*currentPrice)*0.0005;
                console.log("平空 closeAllOrders ~ testMoney:", testMoney);
            }
            console.log("平空完成");

            // 发送邮件
            sendMail({
                subject: `${down.orderPrice>currentPrice? "✅":"❌"}${B_SYMBOL}平空完成`,
                text: JSON.stringify({
                    profitMoney: testMoney,
                    down: {...down},
                    gridPoints: [...gridPoints],
                }),
            });
        });
        promises.push(downPromise);
    }
    resetTradingDatas();
    await Promise.all(promises);
    hasOrder=false;
};
// 是否到达止损点/平仓
// isClosePosition === true 时不能进入(loading中已有该逻辑)
const gridPointClearTrading=async (_currentPrice) => {
    onGridPoint=true;
    const [point1, point2]=gridPoints;
    if (tradingInfo.side==="BUY") {
        // if (_currentPrice <= point1) {
        if (_currentPrice>=point2||_currentPrice<=point1) {
            // 止损平多
            await closeOrder("SELL", tradingInfo.quantity, () => {
                if (showProfit) {
                    // 测试
                    testMoney+=
                        tradingInfo.quantity*currentPrice-
                        tradingInfo.quantity*tradingInfo.orderPrice-
                        (tradingInfo.quantity*currentPrice+tradingInfo.quantity*tradingInfo.orderPrice)*0.0005;
                    console.log("平多 gridPointClearTrading ~ currentPrice testMoney:", currentPrice, testMoney);
                }
                console.log("平多完成");
                hasOrder=false;
                onGridPoint=false;
                // readyTradingDirection = "hold";
                isReadyStopProfit=false;

                // 发送邮件
                sendMail({
                    subject: `${tradingInfo.orderPrice<_currentPrice? "✅":"❌"}${B_SYMBOL}有一单平仓`,
                    text: JSON.stringify({
                        profitMoney: testMoney,
                        tradingInfo: {...tradingInfo},
                        gridPoints: [...gridPoints],
                    }),
                });
            });
            onGridPoint=false;
            return;
        }
        // 到达一定的盈利，重新绘制网格
        // if (_currentPrice >= point2) {
        //     // 移动止损保留盈利
        //     modGridPoints();
        //     onGridPoint = false;
        // }
    } else {
        // if (_currentPrice >= point2) {
        if (_currentPrice>=point2||_currentPrice<=point1) {
            // 止损平空
            await closeOrder("BUY", tradingInfo.quantity, () => {
                if (showProfit) {
                    // 测试
                    testMoney+=
                        tradingInfo.quantity*tradingInfo.orderPrice-
                        tradingInfo.quantity*currentPrice-
                        (tradingInfo.quantity*tradingInfo.orderPrice+tradingInfo.quantity*currentPrice)*0.0005;
                    console.log("平空 gridPointClearTrading ~ currentPrice testMoney:", currentPrice, testMoney);
                }
                console.log("平空完成");
                hasOrder=false;
                onGridPoint=false;
                // readyTradingDirection = "hold";
                isReadyStopProfit=false;

                // 发送邮件
                sendMail({
                    subject: `${tradingInfo.orderPrice>_currentPrice? "✅":"❌"}${B_SYMBOL}有一单平仓`,
                    text: JSON.stringify({
                        profitMoney: testMoney,
                        tradingInfo: {...tradingInfo},
                        gridPoints: [...gridPoints],
                    }),
                });
            });
            onGridPoint=false;
            return;
        }
        // 到达一定的盈利，重新绘制网格
        // if (_currentPrice <= point1) {
        //     // 移动止损保留盈利
        //     modGridPoints();
        //     onGridPoint = false;
        // }
    }
    onGridPoint=false;
};

const calcEma1Ema2ByHistoryPrice=async () => {
    const len=ema1Arr.length;
    const ema1=ema1Arr[len-1];
    const ema2=ema2Arr[len-1];
    const emaGap=Math.abs(ema1-ema2)>THRESHOLD; // THRESHOLD 这里还需要调整参与对比才行？？？？?????>>>>>

    let trend="";

    if (emaGap&&currentPrice>ema1&&ema1>ema2) {
        trend="up";
    }
    if (emaGap&&currentPrice<ema1&&ema1<ema2) {
        trend="down";
    }
    return {
        ema1,
        ema2,
        trend,
    };
};

const calcEma1Ema2=(params={}) => {
    const initParams={emaPeriod1: EMA_PERIOD[0], emaPeriod2: EMA_PERIOD[1], threshold: THRESHOLD};
    const {emaPeriod1, emaPeriod2, threshold}={...initParams, ...params};
    let ema1=calculateEMA([...historyClosePrices], emaPeriod1);
    let ema2=calculateEMA([...historyClosePrices], emaPeriod2);

    const emaGap=Math.abs(ema1-ema2)>threshold; // threshold 这里还需要调整参与对比才行？？？？?????>>>>>

    let trend="hold";

    if (emaGap&&ema1>ema2) {
        trend="up";
    }
    if (emaGap&&ema1<ema2) {
        trend="down";
    }

    return {
        ema1,
        ema2,
        trend,
    };
};

const setRsiArr=(period=RSI_PERIOD_MIN) => {
    if (rsiArr.length>=period) {
        rsiArr.shift();
    }
    rsi=calculateRSI(historyClosePrices, period);
    rsiArr.push(rsi);
    console.log("setRsiArr ~ rsiArr:", rsiArr);
};

// 计算标准差
function calculateStandardDeviation(prices, period) {
    if (prices.length<period) {
        throw new Error("Not enough data points for the specified period.");
    }

    const sma=calculateSimpleMovingAverage(prices, period);

    const squaredDifferences=prices.slice(prices.length-period).map((price) => Math.pow(price-sma, 2));

    const meanSquaredDifference=squaredDifferences.reduce((acc, val) => acc+val, 0)/period;

    return Math.sqrt(meanSquaredDifference);
}

// 计算布林带
function calculateBollingerBands(prices, period, multiplier) {
    const sma=calculateSimpleMovingAverage(prices, period);
    const stdDev=calculateStandardDeviation(prices, period);

    const upperBand=sma+multiplier*stdDev;
    const lowerBand=sma-multiplier*stdDev;

    return {upperBand, sma, lowerBand};
}
function calculateEmaArr(prices, period) {
    const k=2/(period+1);
    let emaArray=[prices[0]];
    for (let i=1;i<prices.length;i++) {
        const ema=prices[i]*k+emaArray[i-1]*(1-k);
        emaArray.push(ema);
    }
    return emaArray;
}

// 计算 MACD 指标
function calculateMACD(prices, periods) {
    const [shortPeriod, longPeriod, signalPeriod]=periods||MACD_PERIOD;
    if (prices.length<longPeriod) {
        throw new Error("价格数组的长度必须大于长周期");
    }

    const shortEMA=calculateEmaArr(prices, shortPeriod);
    const longEMA=calculateEmaArr(prices, longPeriod);

    const macdLine=shortEMA.map((value, index) => value-longEMA[index]);

    const signalLine=calculateEmaArr(macdLine.slice(longPeriod-shortPeriod), signalPeriod);
    const histogram=macdLine.slice(longPeriod-shortPeriod).map((value, index) => value-signalLine[index]);

    // 返回最新一组MACD值
    // DIF 对应 macdLine：这是快线，即短周期EMA与长周期EMA的差。
    // DEA 对应 signalLine：这是慢线，即DIF的信号线（DIF的EMA）。
    // MACD 对应 histogram：这是柱状图，即DIF与DEA的差。
    return {
        dif: macdLine[macdLine.length-1],
        dea: signalLine[signalLine.length-1],
        macd: histogram[histogram.length-1],
    };
}

// 取出最后几根
function getLastFromArr(num=3) {
    let res=[];
    const len=kLineData.length;
    while (num>0) {
        res.push(kLineData[len-num]);
        num--;
    }
    return res;
}
function getLastFromArr(arr, num=3) {
    let res=[];
    const len=arr.length;
    while (num>0) {
        res.push(arr[len-num]);
        num--;
    }
    return res;
}

// let testTime = Date.now();
// WebSocket 事件
const startWebSocket=async () => {
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
        }=JSON.parse(data);

        prePrice=currentPrice; // 不能删除
        currentPrice=Number(close)||0;

        if (isNewLine) {
            const curKLine={
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
        }
        // 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
        // 没有订单也不继续了
        if (isLoading()||prePrice===currentPrice) {
            return;
        } else {
            // 网格模式止盈/止损
            hasOrder&&(await gridPointClearTrading(currentPrice)); // 每秒会触发4次左右，但是需要快速判断是否进入交易点，所以不节流
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
const createLogs=() => {
    // 创建 logs 文件夹
    if (!fs.existsSync(logsFolder)) {
        fs.mkdirSync(logsFolder);
    }

    // 重定向 console.log 到文件
    logStream=fs.createWriteStream(
        `${logsFolder}/${isTest? "test":"prod"}-BBKeltner-KDJ-${SYMBOL}-${getDate()}.log`,
        {
            flags: "a",
        },
    );
    // 保存原始的 console.log 函数
    const originalConsoleLog=console.log;

    // 重写 console.log
    console.log=function (...args) {
        // originalConsoleLog.apply(console, args); // 保留原始 console.log 的功能
        // 将 log 写入文件
        logStream.write(
            `${getDate()}: ${args
                .map((v) => {
                    if (typeof v==="object") {
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
    errorStream=fs.createWriteStream(
        `${errorsFolder}/${isTest? "test":"prod"}-BBKeltner-KDJ-${SYMBOL}-${getDate()}.error`,
        {flags: "a"},
    );
    // 保存原始的 console.error 函数
    const originalConsoleError=console.error;

    // 重写 console.error
    console.error=function (...args) {
        originalConsoleError.apply(console, args); // 保留原始 console.error 的功能
        // 将 error 写入文件
        errorStream.write(
            `${getDate()}: ${args
                .map((v) => {
                    if (v instanceof Error) {
                        return errorToString(v);
                    } else if (typeof v==="object") {
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
                tradingInfo: {...tradingInfo},
                gridPoints: [...gridPoints],
            }),
        });
    };
};

createLogs();
startTrading(); // 开始启动

const test=async () => {
    await getServerTimeOffset(); // 同步服务器时间
    await getCurrentPrice();
    await getHistoryClosePrices(); // 初始化 historyClosePrices
};
// test();

// 在服务停止时执行的清理工作
function cleanup() {
    console.log("Cleaning up before exit.");
    logStream&&logStream.end();
    errorStream&&errorStream.end();
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
        if (currentPrice!==0&&prePrice!==0) {
            const data=JSON.stringify({
                currentPrice, // 记录当前价格
                prePrice, // 记录当前价格的前一个
                tradingInfo, // 订单数据
                candleHeight: candleHeight,
                testMoney,
                hasOrder,
                isProfitRun: isProfitRun,
                gridPoints: gridPoints,
                readyTradingDirection: readyTradingDirection, // 是否准备开单
                isReadyStopProfit: isReadyStopProfit, // 是否准备止盈
            });
            fs.writeFileSync(
                `data/${isTest? "test":"prod"}-BBKeltner-KDJ-${SYMBOL}.js`,
                `module.exports = ${data}`,
                {
                    flag: "w",
                },
            );
            console.log(`Global variables saved to data/${SYMBOL}.js`);
        }
    }, 0);
}
