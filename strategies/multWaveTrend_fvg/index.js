/**
 * 交易机器人框架主文件
 * 包含所有框架代码：API调用、订单管理、WebSocket、数据持久化等
 * 策略特定逻辑在 indicators.js, entry.js, exit.js 中
 */

require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

// 工具函数
const { getDate, hasUpDownVal, getLastFromArr, getSequenceArr, convertToTimestamp } = require("../../utils/functions.js");
const { MultiTimeframeAggregator } = require("../../utils/klineAggregator.js");

// 策略配置
const config = require("./config.js");

// 策略模块
const { initEveryIndex, setEveryIndex } = require("./indicators.js");
const { judgeTradingDirection, calculateTradingSignal } = require("./entry.js");
const { gridPointClearTrading, updateSellstopLossPrice } = require("./exit.js");

// 配置解构
const {
    strategyType,
    SYMBOL,
    base,
    availableMoney: DefaultAvailableMoney,
    invariableBalance,
    klineStage,
    logsFolder,
    errorsFolder,
    priorityFee,
    slippage,
    double,
    maxLossCount,
} = config;

// 全局状态对象
const state = {
    // K线数据
    kLineData: [],
    historyClosePrices: [],
    
    // 价格相关
    currentPrice: 0,
    prePrice: 0,
    
    // 交易状态
    readyTradingDirection: "hold",
    hasOrder: false,
    tradingInfo: {
        trend: "",
        side: "",
        orderPrice: 0,
        quantity: 0,
        times: 0,
    },
    TP_SL: [],
    
    // 指标数组
    wt5mArr: [],
    wt15mArr: [],
    wt1hArr: [],
    avgCandleHeight: 0,
    
    // 多时间框架K线数据
    kline5m: [],  // 5分钟K线数组
    kline15m: [], // 15分钟K线数组
    kline1h: [],  // 1小时K线数组
    
    // 策略状态
    longReadyBuy: false,
    shortReadySell: false,
    longFvgWindowActive: false,
    shortFvgWindowActive: false,
    longFvgWindowStart: null,
    shortFvgWindowStart: null,
    longFvgLookbackStart: null,
    shortFvgLookbackStart: null,
    longLastSwingLow: null,
    shortLastSwingHigh: null,
    longMovedToBreakeven: false,
    shortMovedToBreakeven: false,
    sellstopLossPrice: 0,
    
    // 其他状态
    isUpOpen: true,
    isDownOpen: true,
    availableMoney: DefaultAvailableMoney,
    lossCount: 0,
    isProfitRun: false,
    testMoney: 0,
    
    // Loading 状态
    loadingTrading: false,
    loadingPlaceOrder: false,
    loadingCloseOrder: false,
    onGridPoint: false,
    loadingInit: false,
    isOrdering: false,
    isJudgeStopLoss: false,
    isUpdateSellstopLossPrice: false,
    isJudgeFirstProfit: false,
    isJudgeFirstLoss: false,
    isJudgeProfitRunOrProfit: false,
    isJudgeIndexProfit: false,
    isJudgeIndexLoss: false,
    isJudgeForceLossProtect: false,
};

// 常量
const B_SYMBOL = SYMBOL.toUpperCase();
const isTest = true;
const isTestLocal = true;
const api = "https://api.binance.com/api";
const fapi = "https://fapi.binance.com/fapi";
const localApi = 'http://localhost:3000';
const apiKey = process.env.BINANCE_API_KEY;
const secretKey = process.env.BINANCE_API_SECRET;
const maxKLinelen = 1000;
const diff = 2;
const times = getSequenceArr(diff, 100);

// 全局变量
let serverTimeOffset = 0;
let allPositionDetail = {};
let logStream = null;
let errorStream = null;
let ws = null;
// 多时间框架聚合器
let mtfAggregator = new MultiTimeframeAggregator(['5m', '15m', '1h']);

console.log(isTest ? (isTestLocal ? '本地测试环境～～～' : "测试环境～～～") : "正式环境～～～");

// 创建 Axios 实例
const axiosInstance = axios.create({
    headers: {
        "Content-Type": "application/json",
        "X-MBX-APIKEY": apiKey,
    },
});

// 初始化 WebSocket
ws = isTestLocal 
    ? new WebSocket(`ws://localhost:3000/ws/${SYMBOL}@kline_${klineStage}`) 
    : new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}`);

// ==================== 工具函数 ====================

const isLoading = () => {
    return (
        state.loadingInit ||
        state.isOrdering ||
        state.isJudgeStopLoss ||
        state.isJudgeFirstProfit ||
        state.isJudgeFirstLoss ||
        state.isJudgeProfitRunOrProfit ||
        state.isJudgeIndexProfit ||
        state.isJudgeIndexLoss ||
        state.loadingTrading ||
        state.loadingPlaceOrder ||
        state.loadingCloseOrder ||
        state.onGridPoint ||
        state.isJudgeForceLossProtect ||
        state.isUpdateSellstopLossPrice
    );
};

const resetTradingDatas = () => {
    state.tradingInfo = {
        trend: "",
        side: "",
        orderPrice: 0,
        quantity: 0,
        times: 0,
    };
};

// ==================== API 相关函数 ====================

const getServerTimeOffset = async () => {
    if (isTestLocal) return;
    try {
        console.log("获取服务器时间偏移");
        const response = await axiosInstance.get(`${api}/v3/time`);
        const serverTime = response.data.serverTime;
        const localTime = Date.now();
        serverTimeOffset = serverTime - localTime;
        console.log(" Server time offset:", serverTimeOffset);
    } catch (error) {
        console.error("getServerTimeOffset error:", error);
        process.exit(1);
    }
};

const signRequest = (params) => {
    const timestamp = Date.now() + serverTimeOffset;
    const queryString = Object.entries({ ...params, timestamp })
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
    const signature = crypto.createHmac("sha256", secretKey).update(queryString).digest("hex");
    return `${queryString}&signature=${signature}`;
};

const getKLineData = async (symbol, interval, limit) => {
    try {
        let response = null;
        if (isTestLocal) {
            response = await axios.get(`${localApi}/v1/klines`, {
                params: { symbol, klineStage, limit },
            });
        } else {
            response = await axios.get(`${fapi}/v1/klines`, {
                params: { symbol, interval, limit },
            });
        }

        let ks = response.data || [];

        if (isTestLocal) {
            // 本地测试环境：将日期字符串转换为时间戳，同时保留原始格式
            return ks.map((item) => ({
                openTime: typeof item.openTime === 'string' ? convertToTimestamp(item.openTime) : item.openTime,
                openTimeFormatted: item.openTime, // 保留原始格式
                closeTime: typeof item.closeTime === 'string' ? convertToTimestamp(item.closeTime) : item.closeTime,
                closeTimeFormatted: item.closeTime, // 保留原始格式
                open: parseFloat(item.open),
                high: parseFloat(item.high),
                low: parseFloat(item.low),
                close: parseFloat(item.close),
                volume: parseFloat(item.volume),
                quoteAssetVolume: item.quoteAssetVolume ? parseFloat(item.quoteAssetVolume) : 0,
                numberOfTrades: item.numberOfTrades || 0,
                takerBuyBaseAssetVolume: item.takerBuyBaseAssetVolume ? parseFloat(item.takerBuyBaseAssetVolume) : 0,
                takerBuyQuoteAssetVolume: item.takerBuyQuoteAssetVolume ? parseFloat(item.takerBuyQuoteAssetVolume) : 0,
            }));
        } else {
            if (ks[ks.length - 1][6] > Date.now()) {
                ks.pop();
            }
            return ks.map((item) => ({
                openTime: item[0], // 保存时间戳（毫秒）
                openTimeFormatted: getDate(item[0]), // 格式化日期用于显示
                open: parseFloat(item[1]),
                high: parseFloat(item[2]),
                low: parseFloat(item[3]),
                close: parseFloat(item[4]),
                volume: parseFloat(item[5]),
                closeTime: item[6], // 保存时间戳（毫秒）
                closeTimeFormatted: getDate(item[6]), // 格式化日期用于显示
                quoteAssetVolume: parseFloat(item[7]),
                numberOfTrades: item[8],
                takerBuyBaseAssetVolume: parseFloat(item[9]),
                takerBuyQuoteAssetVolume: parseFloat(item[10]),
            }));
        }
    } catch (error) {
        console.error("getKLineData error:", error);
        process.exit(1);
    }
};

const getHistoryClosePrices = async () => {
    // 获取1分钟K线数据
    const kLines = await getKLineData(B_SYMBOL, `${klineStage}`, maxKLinelen);
    
    // 存储用于显示的格式化K线数据
    state.kLineData = kLines.map(k => ({
        ...k,
        openTime: k.openTimeFormatted || k.openTime, // 使用格式化时间用于显示
        closeTime: k.closeTimeFormatted || k.closeTime,
    }));
    state.historyClosePrices = state.kLineData.map((data) => data.close);
    
    // 如果不是本地测试环境，初始化多时间框架数据
    if (!isTestLocal) {
        // 准备用于聚合的K线数据（使用时间戳格式）
        const klinesForAggregation = kLines.map(k => ({
            openTime: k.openTime, // 时间戳（毫秒）
            closeTime: k.closeTime, // 时间戳（毫秒）
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
        }));
        
        // 初始化多时间框架聚合器
        mtfAggregator.initHistory(klinesForAggregation);
        
        // 获取聚合后的多时间框架K线
        state.kline5m = mtfAggregator.getKlines('5m');
        state.kline15m = mtfAggregator.getKlines('15m');
        state.kline1h = mtfAggregator.getKlines('1h');
        
        console.log(`初始化多时间框架数据: 5m=${state.kline5m.length}条, 15m=${state.kline15m.length}条, 1h=${state.kline1h.length}条`);
    } else {
        // 本地测试环境，等待WS数据积累后再初始化
        console.log("本地测试环境，等待WS数据积累后初始化多时间框架数据");
    }
};

// ==================== 指标更新 ====================

const setKLinesTemp = (curKLine) => {
    if (state.kLineData.length >= maxKLinelen) state.kLineData.shift();
    if (state.historyClosePrices.length >= maxKLinelen) state.historyClosePrices.shift();

    state.kLineData.push(curKLine);
    state.historyClosePrices.push(curKLine.close);
};

const refreshKLineAndIndex = (curKLine) => {
    setKLinesTemp(curKLine);
    setEveryIndex([...state.historyClosePrices], state.kLineData, state, config);
};

// ==================== 开仓逻辑 ====================

const kaiDanDaJi = async () => {
    state.isOrdering = true;

    if (state.readyTradingDirection === "hold") {
        judgeTradingDirection(state, config);
    }

    if (!state.hasOrder) {
        if (state.readyTradingDirection !== "hold") {
            await judgeAndTrading();
        }
    }

    state.isOrdering = false;
};

const judgeAndTrading = async () => {
    state.loadingTrading = true;

    const { trend, stopLoss, stopProfit } = calculateTradingSignal(state, config);
    console.log("预备开仓信息： Trading trend, stopLoss, stopProfit:", trend, stopLoss, stopProfit);
    
    switch (trend) {
        case "up":
            state.readyTradingDirection = "up";
            await teadeBuy();
            state.hasOrder = true;
            state.longFvgWindowActive = false;
            state.longFvgWindowStart = null;
            state.longFvgLookbackStart = null;
            state.longMovedToBreakeven = false;
            if (stopLoss && stopProfit) {
                setTP_SL("up", stopLoss, stopProfit);
            }
            break;
        case "down":
            state.readyTradingDirection = "down";
            await teadeSell();
            state.hasOrder = true;
            state.shortFvgWindowActive = false;
            state.shortFvgWindowStart = null;
            state.shortFvgLookbackStart = null;
            state.shortMovedToBreakeven = false;
            if (stopLoss && stopProfit) {
                setTP_SL("down", stopLoss, stopProfit);
            }
            break;
        default:
            break;
    }

    saveGlobalVariables();
    state.loadingTrading = false;
};

// ==================== 订单管理 ====================

const getQuantity = () => {
    state.availableMoney = DefaultAvailableMoney * times[state.lossCount];
    let q = Math.round((state.availableMoney / state.currentPrice) * 10000) / 10000;
    return q;
};

const placeOrder = async (side, quantity) => {
    console.log(`下单（开${side === "SELL" ? "空" : "多"}操作）placeOrder ~ side, quantity:`, side, quantity);
    try {
        state.loadingPlaceOrder = true;
        const _currentPrice = state.currentPrice;
        const timestamp = Date.now() + serverTimeOffset;
        let params = {
            symbol: B_SYMBOL,
            side,
            type: "MARKET",
            quantity,
            positionSide: side === "BUY" ? "LONG" : "SHORT",
            timestamp,
            recvWindow: 6000,
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

        console.log(`Order placed - Symbol: ${B_SYMBOL}, Side: ${side}, Quantity: ${quantity}`, "orderId:", response.data.orderId);
        
        if (response && response.data && response.data.orderId) {
            const { origQty, orderId } = response.data;
            const trend = side === "BUY" ? "up" : "down";
            await recordRradingInfo({
                orderId,
                trend,
                side,
                orderPrice: _currentPrice,
                quantity: Math.abs(origQty),
                orderTime: state.kLineData[state.kLineData.length - 1].openTime,
            });

            state.hasOrder = true;
            state.readyTradingDirection = "hold";
            saveGlobalVariables();
            console.log("placeOrder ~ 下单成功 tradingInfo:", state.tradingInfo);
        } else {
            console.error("下单失败！！！！！");
        }
        state.loadingPlaceOrder = false;
    } catch (error) {
        console.error("placeOrder error:", error);
        process.exit(1);
    }
};

const closeOrder = async (side, quantity, cb) => {
    try {
        state.loadingCloseOrder = true;
        const timestamp = Date.now() + serverTimeOffset;
        let params = {
            symbol: B_SYMBOL,
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
            state.readyTradingDirection = "hold";
            state.hasOrder = false;
            state.sellstopLossPrice = 0;
            resetTradingDatas();
            state.TP_SL = [];
            state.longMovedToBreakeven = false;
            state.shortMovedToBreakeven = false;
            state.longFvgWindowActive = false;
            state.shortFvgWindowActive = false;
            state.longFvgWindowStart = null;
            state.shortFvgWindowStart = null;
            state.longFvgLookbackStart = null;
            state.shortFvgLookbackStart = null;
            saveGlobalVariables();
        } else {
            console.log(`🚀 ~ 平仓：平${side === "BUY" ? "空" : "多"}！！！！！！！！！！！！！！！！！！！！！！！！失败`, response, state.tradingInfo);
        }
        state.loadingCloseOrder = false;
    } catch (error) {
        console.error("closeOrder error:", error);
        process.exit(1);
    }
};

const teadeBuy = async () => {
    try {
        await placeOrder("BUY", getQuantity());
        console.log("开多完成");
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};

const teadeSell = async () => {
    try {
        await placeOrder("SELL", getQuantity());
        console.log("开空完成");
    } catch (error) {
        console.error("teadeSell err::", error);
        process.exit(1);
    }
};

const recordRradingInfo = async (info) => {
    Object.assign(state.tradingInfo, info);
    console.log("Purchase Info Updated:", state.tradingInfo);
};

const setLossCount = (curTestMoney) => {
    if (double) {
        if (curTestMoney <= 0) {
            state.lossCount = state.lossCount + 1 > maxLossCount ? maxLossCount : state.lossCount + 1;
        } else {
            state.lossCount = 0;
        }
    }
};

const closeUp = async (testCurrentPrice) => {
    let _currentPrice = testCurrentPrice || state.currentPrice;
    await closeOrder("SELL", state.tradingInfo.quantity, () => {
        const curTestMoney =
            state.tradingInfo.quantity * (_currentPrice - state.tradingInfo.orderPrice) -
            state.tradingInfo.quantity * (_currentPrice + state.tradingInfo.orderPrice) * priorityFee;

        state.testMoney += curTestMoney;
        setLossCount(curTestMoney);
        console.log("@@closeUp:", state.tradingInfo.orderTime, state.kLineData[state.kLineData.length - 1].openTime, {
            orderP: state.tradingInfo.orderPrice,
            orderQ: state.tradingInfo.quantity,
            curTtM: curTestMoney,
            tM: state.testMoney,
            lossCount: state.lossCount
        });
        console.log("平多完成");
    });
};

const closeDown = async (testCurrentPrice) => {
    let _currentPrice = testCurrentPrice || state.currentPrice;
    await closeOrder("BUY", state.tradingInfo.quantity, () => {
        const curTestMoney =
            state.tradingInfo.quantity * (state.tradingInfo.orderPrice - _currentPrice) -
            state.tradingInfo.quantity * (_currentPrice + state.tradingInfo.orderPrice) * priorityFee;

        state.testMoney += curTestMoney;
        setLossCount(curTestMoney);
        console.log("@@closeDown:", state.tradingInfo.orderTime, state.kLineData[state.kLineData.length - 1].openTime, {
            orderP: state.tradingInfo.orderPrice,
            orderQ: state.tradingInfo.quantity,
            curTtM: curTestMoney,
            tM: state.testMoney,
            lossCount: state.lossCount
        });
        console.log("平空完成");
    });
};

// ==================== 账户管理 ====================

const getPositionRisk = async () => {
    try {
        const timestamp = Date.now() + serverTimeOffset;
        const params = {
            symbol: B_SYMBOL,
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
                    trend: "up",
                    side: "BUY",
                    orderPrice: Number(upData.entryPrice),
                    quantity: Math.abs(upData.positionAmt),
                    breakEvenPrice: upData.breakEvenPrice,
                };
            }
            if (Number(downData.positionAmt)) {
                res.down = {
                    trend: "down",
                    side: "SELL",
                    orderPrice: Number(downData.entryPrice),
                    quantity: Math.abs(downData.positionAmt),
                    breakEvenPrice: downData.breakEvenPrice,
                };
            }
        }
        return res;
    } catch (error) {
        console.error("getPositionRisk error:", error);
        process.exit(1);
    }
};

const getContractBalance = async () => {
    try {
        let timestamp = Date.now() + serverTimeOffset;
        const params = {
            recvWindow: 6000,
            timestamp,
        };
        const signedParams = signRequest(params);
        const response = await axiosInstance.get(`${fapi}/v2/balance?${signedParams}`);
        const balances = response.data || [];
        const baseBalance = balances.find((balance) => balance.asset === base);

        if (baseBalance) {
            state.availableMoney = baseBalance.availableBalance / 10;
            console.log(`Contract ${base} Balance: ${baseBalance.availableBalance}`);
        } else {
            console.log(`No ${base} balance found in the contract account.`);
        }
    } catch (error) {
        console.error("getContractBalance error:", error);
        process.exit(1);
    }
};

const getCurrentPrice = async () => {
    try {
        let timestamp = Date.now() + serverTimeOffset;
        const params = {
            recvWindow: 6000,
            timestamp,
            symbol: B_SYMBOL,
        };
        const signedParams = signRequest(params);
        const response = await axiosInstance.get(`${fapi}/v2/ticker/price?${signedParams}`);
        state.currentPrice = response.data ? Number(response.data.price) : 0;
    } catch (error) {
        console.error("getCurrentPrice error:", error);
    }
};

// ==================== 数据持久化 ====================

const getHistoryData = () => {
    const dataPath = path.join(__dirname, `../../data/${isTest ? "test" : "prod"}-${strategyType}-${state.isUpOpen ? 'up' : 'down'}-${SYMBOL}.js`);
    if (fs.existsSync(dataPath)) {
        let historyDatas = require(dataPath);
        const { currentPrice: __currentPrice, prePrice: __prePrice, tradingInfo: __tradingInfo } = historyDatas;
        console.log("上一次停止程序时，交易情况", historyDatas);

        if (__currentPrice != 0 && __prePrice != 0) {
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
        currentPrice: __currentPrice,
        prePrice: __prePrice,
        tradingInfo: __tradingInfo,
        isProfitRun: __isProfitRun,
        TP_SL: __TP_SL,
        testMoney: __testMoney,
        readyTradingDirection: __readyTradingDirection,
        hasOrder: __hasOrder,
        availableMoney: __availableMoney,
        lossCount: __lossCount,
        longReadyBuy: __longReadyBuy,
        shortReadySell: __shortReadySell,
        longFvgWindowActive: __longFvgWindowActive,
        shortFvgWindowActive: __shortFvgWindowActive,
        longFvgWindowStart: __longFvgWindowStart,
        shortFvgWindowStart: __shortFvgWindowStart,
        longFvgLookbackStart: __longFvgLookbackStart,
        shortFvgLookbackStart: __shortFvgLookbackStart,
        longLastSwingLow: __longLastSwingLow,
        shortLastSwingHigh: __shortLastSwingHigh,
        longMovedToBreakeven: __longMovedToBreakeven,
        shortMovedToBreakeven: __shortMovedToBreakeven,
        sellstopLossPrice: __sellstopLossPrice,
    } = historyDatas;

    state.prePrice = __prePrice;
    state.tradingInfo = __tradingInfo;
    state.testMoney = __testMoney;
    state.TP_SL = __TP_SL;
    state.isProfitRun = __isProfitRun;
    state.hasOrder = __hasOrder;
    state.readyTradingDirection = __readyTradingDirection;
    state.availableMoney = __availableMoney;
    state.lossCount = __lossCount;
    
    if (__longReadyBuy !== undefined) state.longReadyBuy = __longReadyBuy;
    if (__shortReadySell !== undefined) state.shortReadySell = __shortReadySell;
    if (__longFvgWindowActive !== undefined) state.longFvgWindowActive = __longFvgWindowActive;
    if (__shortFvgWindowActive !== undefined) state.shortFvgWindowActive = __shortFvgWindowActive;
    if (__longFvgWindowStart !== undefined) state.longFvgWindowStart = __longFvgWindowStart;
    if (__shortFvgWindowStart !== undefined) state.shortFvgWindowStart = __shortFvgWindowStart;
    if (__longFvgLookbackStart !== undefined) state.longFvgLookbackStart = __longFvgLookbackStart;
    if (__shortFvgLookbackStart !== undefined) state.shortFvgLookbackStart = __shortFvgLookbackStart;
    if (__longLastSwingLow !== undefined) state.longLastSwingLow = __longLastSwingLow;
    if (__shortLastSwingHigh !== undefined) state.shortLastSwingHigh = __shortLastSwingHigh;
    if (__longMovedToBreakeven !== undefined) state.longMovedToBreakeven = __longMovedToBreakeven;
    if (__shortMovedToBreakeven !== undefined) state.shortMovedToBreakeven = __shortMovedToBreakeven;
    if (__sellstopLossPrice !== undefined) state.sellstopLossPrice = __sellstopLossPrice;
};

const recoverHistoryDataByPosition = async (historyDatas, { up, down }) => {
    state.loadingInit = true;
    await recoverHistoryData(historyDatas);
    if (state.isProfitRun) {
        console.log("上次停止程序时处于利润奔跑模式，当前重启后继续奔跑");
    } else {
        await checkOverGrid({ up, down });
    }
    state.loadingInit = false;
};

const checkOverGrid = async ({ up, down }) => {
    await getCurrentPrice();
    if (state.currentPrice <= state.TP_SL[0] || state.currentPrice >= state.TP_SL[1]) {
        console.log(`初始化时，价格超出TP/SL区间，重置仓位（盈利）`);
        await closeAllOrders({ up, down });
        state.prePrice = state.currentPrice;
    }
};

const setTP_SL = (trend, stopLoss, stopProfit) => {
    const _currentPrice = state.currentPrice;
    console.log("开始设置TP/SL~ trend, _currentPrice:", trend, _currentPrice);

    if (trend === "up") {
        state.TP_SL = [stopLoss, stopProfit];
    }

    if (trend === "down") {
        state.TP_SL = [stopProfit, stopLoss];
    }

    saveGlobalVariables();
    console.log("设置TP/SL _currentPrice, TP_SL :", state.currentPrice, state.TP_SL);
};

const closeAllOrders = async ({ up, down }) => {
    let promises = [];
    if (up) {
        const upPromise = closeOrder("SELL", up.quantity, () => {
            const curTestMoney =
                up.quantity * state.currentPrice -
                up.orderPrice * up.quantity -
                (up.quantity * state.currentPrice + up.orderPrice * up.quantity) * priorityFee;

            state.testMoney += curTestMoney;
            setLossCount(curTestMoney);
            console.log("平多 closeAllOrders ~ curTestMoney:", curTestMoney, state.testMoney);
            console.log("平多完成");
        });
        promises.push(upPromise);
    }
    if (down) {
        const downPromise = closeOrder("BUY", down.quantity, () => {
            const curTestMoney =
                down.quantity * down.orderPrice -
                down.quantity * state.currentPrice -
                (down.quantity * down.orderPrice + down.quantity * state.currentPrice) * priorityFee;

            state.testMoney += curTestMoney;
            setLossCount(curTestMoney);
            console.log("平空 closeAllOrders ~ curTestMoney:", curTestMoney, state.testMoney);
            console.log("平空完成");
        });
        promises.push(downPromise);
    }
    await Promise.all(promises);
};

// ==================== WebSocket ====================

const startWebSocket = async () => {
    console.log("🚀 startWebSocket~~~~~");
    
    ws.on("open", async () => {
        console.log("WebSocket connection opened.");
        // 本地测试环境：连接建立后发送 hello 启动数据流
        if (isTestLocal) {
            ws.send('hello');
        }
    });

    ws.on("message", async (data) => {
        let realData = {};
        if (isTestLocal) {
            const jsonString = data.toString("utf-8");
            try {
                const parsedData = JSON.parse(jsonString);
                // 本地测试环境：将日期字符串转换为时间戳
                const openTimeMs = typeof parsedData.openTime === 'string' 
                    ? convertToTimestamp(parsedData.openTime) 
                    : parsedData.openTime;
                const closeTimeMs = typeof parsedData.closeTime === 'string'
                    ? convertToTimestamp(parsedData.closeTime)
                    : parsedData.closeTime;
                
                realData = {
                    k: {
                        t: openTimeMs, // 使用时间戳
                        T: closeTimeMs, // 使用时间戳
                        o: parsedData.open,
                        c: parsedData.close,
                        h: parsedData.high,
                        l: parsedData.low,
                        v: parsedData.volume,
                        x: true,
                    }
                }
            } catch (error) {
                console.error("JSON 解析失败:", error);
            }
        } else {
            realData = JSON.parse(data);
        }
        
        if ((isTestLocal && !realData) || (!isTestLocal && realData.e !== "kline")) {
            console.error("🚀 ~ ws.on ~ data:", data, data.toString('utf8'))
            return;
        }
        
        const {
            k: {
                t: openTime,
                T: closeTime,
                o: open,
                c: close,
                h: high,
                l: low,
                v: volume,
                x: isNewLine,
                V: takerBuyBaseAssetVolume,
            },
        } = realData;
        
        if (isTestLocal && (realData.error || !openTime)) {
            console.log('end data')
            process.exit(0);
        }
        
        state.prePrice = state.currentPrice;
        state.currentPrice = Number(close) || 0;

        // 确保时间戳格式统一（毫秒数）
        // WebSocket 返回的时间已经是时间戳（毫秒）
        const curKLine = {
            openTime: Number(openTime), // 聚合器需要时间戳（毫秒）
            closeTime: Number(closeTime),
            open: Number(open),
            close: Number(close),
            high: Number(high),
            low: Number(low),
            volume: Number(volume),
            isNewLine,
            takerBuyBaseAssetVolume: Number(takerBuyBaseAssetVolume),
        };
        
        // 用于存储和显示的时间格式（格式化日期字符串）
        const curKLine1m = {
            openTime: isTestLocal ? openTime : getDate(openTime),
            closeTime: isTestLocal ? closeTime : getDate(closeTime),
            open: Number(open),
            close: Number(close),
            high: Number(high),
            low: Number(low),
            volume: Number(volume),
            isNewLine,
            takerBuyBaseAssetVolume: Number(takerBuyBaseAssetVolume),
        };
        
        if (isNewLine) {
            // 1分钟K线收盘，处理多时间框架聚合
            // 使用时间戳格式的K线数据进行聚合
            const completedKlines = mtfAggregator.processKline(curKLine);
            
            // 更新多时间框架K线数组
            if (completedKlines['5m']) {
                state.kline5m.push(completedKlines['5m']);
                if (state.kline5m.length > 1000) state.kline5m.shift();
            }
            if (completedKlines['15m']) {
                state.kline15m.push(completedKlines['15m']);
                if (state.kline15m.length > 1000) state.kline15m.shift();
            }
            if (completedKlines['1h']) {
                state.kline1h.push(completedKlines['1h']);
                if (state.kline1h.length > 1000) state.kline1h.shift();
            }
            
            // 更新1分钟K线和指标（使用日期格式的K线数据用于存储）
            // 下面这个函数因该更新多时间界别的指标
            refreshKLineAndIndex(curKLine1m);
            
            if (!state.hasOrder) {
                await kaiDanDaJi();
                isTestLocal && ws.send('hello');
                return;
            }
            if (isLoading() || state.prePrice === state.currentPrice) {
            } else {
                await gridPointClearTrading(state.currentPrice, state, config, () => closeUp(), () => closeDown());
            }
        }
        isTestLocal && ws.send('hello');
    });
    
    ws.on("close", (code) => {
        console.log(`WebSocket 关闭: `, code);
        process.exit(code);
    });

    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        process.exit(error);
    });
    
    ws.on("ping", (data) => {
        ws.pong(data);
    });
};

// ==================== 日志管理 ====================

function errorToString(error) {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}\n${error.stack}`;
    }
    return error;
}

const createLogs = () => {
    if (!fs.existsSync(logsFolder)) {
        fs.mkdirSync(logsFolder);
    }

    logStream = fs.createWriteStream(
        `${logsFolder}/${isTest ? "test" : "prod"}-${strategyType}-${state.isUpOpen ? 'up' : 'down'}-${SYMBOL}-${getDate()}.log`,
        { flags: "a" }
    );
    
    const originalConsoleLog = console.log;
    console.log = function (...args) {
        if (isTestLocal) {
            if (args[0] && args[0].indexOf && args[0].indexOf('@@') < 0) {
                return;
            }
        }
        const date = isTestLocal ? '' : getDate() + ': ';
        logStream.write(
            `${date}${args
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

    if (!fs.existsSync(errorsFolder)) {
        fs.mkdirSync(errorsFolder);
    }
    
    errorStream = fs.createWriteStream(
        `${errorsFolder}/${isTest ? "test" : "prod"}-${strategyType}-${state.isUpOpen ? 'up' : 'down'}-${SYMBOL}-${getDate()}.error`,
        { flags: "a" }
    );
    
    const originalConsoleError = console.error;
    console.error = function (...args) {
        originalConsoleError.apply(console, args);
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
    };
};

// ==================== 数据保存 ====================

function saveGlobalVariables() {
    setTimeout(() => {
        if (!fs.existsSync("data")) {
            fs.mkdirSync("data");
        }
        if (state.currentPrice !== 0 && state.prePrice !== 0) {
            const data = JSON.stringify({
                currentPrice: state.currentPrice,
                prePrice: state.prePrice,
                tradingInfo: state.tradingInfo,
                testMoney: state.testMoney,
                hasOrder: state.hasOrder,
                isProfitRun: state.isProfitRun,
                TP_SL: state.TP_SL,
                readyTradingDirection: state.readyTradingDirection,
                availableMoney: state.availableMoney,
                lossCount: state.lossCount,
                longReadyBuy: state.longReadyBuy,
                shortReadySell: state.shortReadySell,
                longFvgWindowActive: state.longFvgWindowActive,
                shortFvgWindowActive: state.shortFvgWindowActive,
                longFvgWindowStart: state.longFvgWindowStart,
                shortFvgWindowStart: state.shortFvgWindowStart,
                longFvgLookbackStart: state.longFvgLookbackStart,
                shortFvgLookbackStart: state.shortFvgLookbackStart,
                longLastSwingLow: state.longLastSwingLow,
                shortLastSwingHigh: state.shortLastSwingHigh,
                longMovedToBreakeven: state.longMovedToBreakeven,
                shortMovedToBreakeven: state.shortMovedToBreakeven,
                sellstopLossPrice: state.sellstopLossPrice,
            });
            fs.writeFileSync(
                `data/${isTest ? "test" : "prod"}-${strategyType}-${state.isUpOpen ? 'up' : 'down'}-${SYMBOL}.js`,
                `module.exports = ${data}`,
                { flag: "w" }
            );
        }
    }, 0);
}

// ==================== 启动交易 ====================

const startTrading = async () => {
    try {
        await getServerTimeOffset();
        if (!isTestLocal) {
            await getHistoryClosePrices();
            initEveryIndex(state.historyClosePrices, state.kLineData, state, config);
        }

        if (!invariableBalance) {
            await getContractBalance();
        }

        const historyDatas = getHistoryData();
        console.log("🚀 获取历史仓位数据 ~ allPositionDetail:", historyDatas);
        
        if (isTest) {
            !isTestLocal && await getCurrentPrice();
            historyDatas && (await recoverHistoryData(historyDatas));
        } else {
            allPositionDetail = await getPositionRisk();

            if (hasUpDownVal(allPositionDetail)) {
                console.log("🚀 已有仓位 ~ allPositionDetail:", allPositionDetail);
                if (historyDatas && historyDatas.tradingInfo && historyDatas.tradingInfo.quantity) {
                    await recoverHistoryDataByPosition(historyDatas, allPositionDetail);
                } else {
                    console.log("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
                    console.error("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
                    return;
                }
            } else {
                console.log("还没仓位，开始运行策略");
            }
        }
        await startWebSocket();
    } catch (error) {
        console.error("startTrading Error:", error);
        process.exit(1);
    }
};

// ==================== 清理和退出 ====================

function cleanup() {
    console.log("Cleaning up before exit.");
    logStream && logStream.end();
    errorStream && errorStream.end();
}

process.on("exit", (code) => {
    console.log("on exit...");
    cleanup();
});

process.on("SIGINT", (e) => {
    console.log("Received SIGINT. Cleaning up...");
    process.exit();
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});

// ==================== 启动 ====================

// createLogs();
startTrading();

