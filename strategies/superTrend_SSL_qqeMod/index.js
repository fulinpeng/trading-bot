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
const { getDate, hasUpDownVal, getLastFromArr, calcMartingaleSize, calcRiskBasedQty } = require("../../utils/functions.js");

// 策略配置
const config = require("./config.js");

// 策略模块
const { initEveryIndex, setEveryIndex } = require("./indicators.js");
const { judgeTradingDirection, calculateTradingSignal } = require("./entry.js");
const { gridPointClearTrading } = require("./exit.js");

// 日志收集模块（可选，通过配置开关控制）
const { initLogCollector, getLogCollector } = require("./logs.js");

// 配置解构 - 从config中获取eth配置
const configEth = config["eth"];
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
    isTest,
    isTestLocal,
    slippage,
    sizingMode,
    rolling,
    martingaleInitialPercent,
    martingaleIncrementPercent,
    martingaleMaxPercent,
    RiskBasedRiskPercent,
    maxLossCount,
    maxKLinelen,
    enableVisualizationLogs,
    maxConsecutiveLoss,
} = configEth;

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
    highArr: [],
    lowArr: [],
    swimingFreeArr: [],
    superTrendArr: [],
    sslArr: [],
    ssl2Arr: [],
    fibArr: [],
    qqeModArr: [],
    adxArr: [],
    preHighLowArr: [],
    rsiArr: [],
    ssl55Arr: [],
    squeezeBoxArr: [],

    // 策略状态
    availableMoney: DefaultAvailableMoney,
    lossCount: 0,
    testMoney: 0,
    downArrivedProfit: 0,
    sellstopLossPrice: 0,

    // K线计数
    currentKLineCount: 0,

    // 开仓相关
    entryPrice: null,
    entryKLineCount: null,
    initialLongStopLoss: null,
    initialShortStopLoss: null,
    initialPositionSize: null,        // 初始仓位大小

    // 指标止盈相关
    lastIndicatorTPKLineCount: null,  // 上次触发指标止盈的K线计数
    indicatorTPCount: 0,              // 指标止盈计数

    // 指标止损相关
    isHighRisk: false,                // 是否标记为高风险

    // 移动止损相关
    trailActive: false,               // 移动止损是否激活
    trailStop: null,                  // 移动止损价格

    // 固定止盈位（开仓时计算）
    longTakeProfit: null,
    shortTakeProfit: null,

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
const api = "https://api.binance.com/api";
const fapi = "https://fapi.binance.com/fapi";
const localApi = 'http://localhost:3000';
const apiKey = process.env.BINANCE_API_KEY;
const secretKey = process.env.BINANCE_API_SECRET;

// 全局变量
let serverTimeOffset = 0;
let allPositionDetail = {};
let logStream = null;
let errorStream = null;
let ws = null;
let reconnectAttempts = 0;

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
            return ks;
        } else {
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
        }
    } catch (error) {
        console.error("getKLineData error:", error);
        process.exit(1);
    }
};

const getHistoryClosePrices = async () => {
    const kLines = await getKLineData(B_SYMBOL, `${klineStage}`, maxKLinelen);
    state.kLineData = kLines;
    state.historyClosePrices = state.kLineData.map((data) => data.close);
};

// ==================== 指标更新 ====================

const setKLinesTemp = (curKLine) => {
    if (state.kLineData.length >= maxKLinelen) state.kLineData.shift();
    if (state.historyClosePrices.length >= maxKLinelen) state.historyClosePrices.shift();

    state.kLineData.push(curKLine);
    state.historyClosePrices.push(curKLine.close);
};

const refreshKLineAndIndex = async (curKLine) => {
    setKLinesTemp(curKLine);
    await setEveryIndex(state.historyClosePrices, state.kLineData, state, configEth);

    // 检测Fibonacci突破，用于重置连续亏损计数
    if (maxConsecutiveLoss > 0 && state.lossCount >= maxConsecutiveLoss) {
        const [fib3] = getLastFromArr(state.fibArr, 1);
        if (fib3 && fib3.upper_7 !== null && fib3.upper_7 !== undefined && 
            fib3.lower_7 !== null && fib3.lower_7 !== undefined) {
            const close = curKLine.close;
            const fibUpper = fib3.upper_7;
            const fibLower = fib3.lower_7;
            
            // 检查价格是否突破Fibonacci上下沿（使用最新的Fibonacci值）
            let isBreakthrough = false;
            
            // 价格突破上沿：close > Fibonacci上沿
            if (close > fibUpper) {
                isBreakthrough = true;
                console.log(`[连续亏损保护] 价格突破Fibonacci上沿，重置连续亏损计数。close: ${close}, Fibonacci上沿: ${fibUpper}`);
            }
            // 价格突破下沿：close < Fibonacci下沿
            if (close < fibLower) {
                isBreakthrough = true;
                console.log(`[连续亏损保护] 价格突破Fibonacci下沿，重置连续亏损计数。close: ${close}, Fibonacci下沿: ${fibLower}`);
            }
            
            // 如果发生突破，重置连续亏损计数
            if (isBreakthrough) {
                state.lossCount = 0;
                console.log(`[连续亏损保护] 连续亏损计数已重置，恢复开单逻辑`);
            }
        }
    }

    // 收集日志数据（如果启用）
    if (enableVisualizationLogs) {
        const collector = getLogCollector();
        if (collector && collector.enabled) {
            // 收集指标数组和K线数据
            collector.collectIndicatorArrays(state);
        }
    }
};

// ==================== 开仓逻辑 ====================

const kaiDanDaJi = async () => {
    state.isOrdering = true;

    if (state.readyTradingDirection === "hold") {
        judgeTradingDirection(state, configEth);
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

    // 检查连续亏损保护：如果达到阈值，阻止开仓
    if (maxConsecutiveLoss > 0 && state.lossCount >= maxConsecutiveLoss) {
        console.log(`[连续亏损保护] 连续亏损次数已达到阈值(${state.lossCount}/${maxConsecutiveLoss})，暂停开单，等待价格突破Fibonacci上下沿`);
        state.loadingTrading = false;
        return;
    }

    const { trend, stopLoss, stopProfit } = calculateTradingSignal(state, configEth);
    console.log("预备开仓信息： Trading trend, stopLoss, stopProfit:", trend, stopLoss, stopProfit);

    switch (trend) {
        case "up":
            await teadeBuy(stopLoss);
            // 记录开仓信息
            state.entryPrice = state.currentPrice;
            state.entryKLineCount = state.currentKLineCount;
            state.initialLongStopLoss = stopLoss;
            state.longTakeProfit = stopProfit;
            state.initialPositionSize = null;
            // 重置指标止盈相关
            state.lastIndicatorTPKLineCount = null;
            state.indicatorTPCount = 0;
            state.trailActive = false;
            state.trailStop = null;
            // 重置指标止损相关
            state.isHighRisk = false;
            state.hasOrder = true;
            // 更新开仓日志中的初始止损价格
            if (enableVisualizationLogs) {
                const collector = getLogCollector();
                if (collector && collector.data.openHistory.length > 0) {
                    // 更新最后一次开仓记录的初始止损价格
                    const lastIndex = collector.data.openHistory.length - 1;
                    if (collector.data.initialStopLossHistory.length <= lastIndex) {
                        collector.data.initialStopLossHistory.push(stopLoss);
                    } else {
                        collector.data.initialStopLossHistory[lastIndex] = stopLoss;
                    }
                }
            }
            break;
        case "down":
            await teadeSell(stopLoss);
            // 记录开仓信息
            state.entryPrice = state.currentPrice;
            state.entryKLineCount = state.currentKLineCount;
            state.initialShortStopLoss = stopLoss;
            state.shortTakeProfit = stopProfit;
            state.initialPositionSize = null;
            // 重置指标止盈相关
            state.lastIndicatorTPKLineCount = null;
            state.indicatorTPCount = 0;
            state.trailActive = false;
            state.trailStop = null;
            // 重置指标止损相关
            state.isHighRisk = false;
            state.hasOrder = true;
            // 更新开仓日志中的初始止损价格
            if (enableVisualizationLogs) {
                const collector = getLogCollector();
                if (collector && collector.data.openHistory.length > 0) {
                    // 更新最后一次开仓记录的初始止损价格
                    const lastIndex = collector.data.openHistory.length - 1;
                    if (collector.data.initialStopLossHistory.length <= lastIndex) {
                        collector.data.initialStopLossHistory.push(stopLoss);
                    } else {
                        collector.data.initialStopLossHistory[lastIndex] = stopLoss;
                    }
                }
            }
            break;
        default:
            break;
    }

    saveGlobalVariables();
    state.loadingTrading = false;
};

// ==================== 订单管理 ====================

/**
 * 计算开仓数量
 * @param {number} entryPrice - 开单价格（可选，默认使用 state.currentPrice）
 * @param {number} stopLossPrice - 止损价格（可选，RiskBased 模式需要）
 * @returns {number} 计算后的仓位数量
 */
const getQuantity = (entryPrice, stopLossPrice) => {
    const _entryPrice = entryPrice || state.currentPrice;
    let _DefaultAvailableMoney = rolling ? Math.max(DefaultAvailableMoney + state.testMoney, DefaultAvailableMoney) : DefaultAvailableMoney;
    
    // 马丁仓位模式
    if (sizingMode === 'Martingale') {
        // 计算等差马丁仓位大小
        const martingaleSize = calcMartingaleSize(
            _DefaultAvailableMoney,
            state.lossCount,
            martingaleInitialPercent,
            martingaleIncrementPercent,
            martingaleMaxPercent
        );
        state.availableMoney = martingaleSize;
        let q = Math.round((state.availableMoney / _entryPrice) * 10000) / 10000;
        return q;
    }
    // 以损定仓模式
    else if (sizingMode === 'RiskBased') {
        if (!stopLossPrice) {
            console.error('RiskBased 模式需要提供 stopLossPrice，使用固定仓位模式');
            process.exit(1);
        }
        // 计算以损定仓的仓位数量
        const riskBasedQty = calcRiskBasedQty(
            _entryPrice,
            stopLossPrice,
            _DefaultAvailableMoney,
            RiskBasedRiskPercent
        );
        // 限制最大仓位不超过可用资金
        const maxQty = _DefaultAvailableMoney / _entryPrice;
        const q = Math.min(riskBasedQty, maxQty);
        state.availableMoney = q * _entryPrice;
        return Math.round(q * 10000) / 10000;
    }
    // 固定仓位模式（默认）
    else {
        state.availableMoney = _DefaultAvailableMoney;
        let q = Math.round((state.availableMoney / _entryPrice) * 10000) / 10000;
        return q;
    }
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

            // 判断是部分平仓还是全部平仓
            const isPartialClose = quantity && quantity < state.tradingInfo.quantity;

            if (isPartialClose) {
                // 部分平仓：只更新quantity，不重置其他状态
                state.tradingInfo.quantity -= quantity;
                saveGlobalVariables();
            } else {
                // 全部平仓：重置所有状态
                state.readyTradingDirection = "hold";
                state.hasOrder = false;
                state.sellstopLossPrice = 0;
                state.downArrivedProfit = 0;
                resetTradingDatas();
                state.TP_SL = [];

                // 重置新增的变量
                state.entryPrice = null;
                state.entryKLineCount = null;
                state.initialLongStopLoss = null;
                state.initialShortStopLoss = null;
                state.initialPositionSize = null;
                state.lastIndicatorTPKLineCount = null;
                state.indicatorTPCount = 0;
                state.trailActive = false;
                state.trailStop = null;
                state.longTakeProfit = null;
                state.shortTakeProfit = null;
                state.isHighRisk = false;

                saveGlobalVariables();
            }
        } else {
            console.log(`🚀 ~ 平仓失败`, side === "BUY" ? "空" : "多", response, state.tradingInfo);
        }
        state.loadingCloseOrder = false;
    } catch (error) {
        console.error("closeOrder error:", error);
        process.exit(1);
    }
};

const teadeBuy = async (stopLoss) => {
    try {
        const quantity = getQuantity(state.currentPrice, stopLoss);
        await placeOrder("BUY", quantity);

        // 记录开仓日志（如果启用）
        if (enableVisualizationLogs) {
            const collector = getLogCollector();
            if (collector) {
                const [kLine3] = getLastFromArr(state.kLineData, 1);
                const kLineDate = kLine3 ? (isTestLocal ? kLine3.openTime : getDate(kLine3.openTime)) : 'N/A';
                // 使用计算出的quantity，而不是state.tradingInfo.quantity（因为placeOrder是异步的）
                collector.recordOpen(kLineDate, state.currentPrice, 'up', state.testMoney, quantity);
            }
        }
    } catch (error) {
        console.error("teadeBuy err::", error);
        process.exit(1);
    }
};

const teadeSell = async (stopLoss) => {
    try {
        const quantity = getQuantity(state.currentPrice, stopLoss);
        await placeOrder("SELL", quantity);

        // 记录开仓日志（如果启用）
        if (enableVisualizationLogs) {
            const collector = getLogCollector();
            if (collector) {
                const [kLine3] = getLastFromArr(state.kLineData, 1);
                const kLineDate = kLine3 ? (isTestLocal ? kLine3.openTime : getDate(kLine3.openTime)) : 'N/A';
                // 使用计算出的quantity，而不是state.tradingInfo.quantity（因为placeOrder是异步的）
                collector.recordOpen(kLineDate, state.currentPrice, 'down', state.testMoney, quantity);
            }
        }
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
    // 更新连续亏损次数
    if (curTestMoney <= 0) {
        // 亏损：增加计数
        if (sizingMode === 'Martingale') {
            state.lossCount = state.lossCount + 1 > maxLossCount ? maxLossCount : state.lossCount + 1;
        } else {
            // 非Martingale模式也记录连续亏损次数（用于连续亏损保护）
            state.lossCount = state.lossCount + 1;
        }
    } else {
        // 盈利：重置计数
        state.lossCount = 0;
    }
};

const closeUp = async (quantity, stopPrice) => {
    // 指定平仓价格（如果指定，则使用指定价格，否则使用当前价格）
    const _currentPrice = stopPrice || state.currentPrice;
    // 如果没有指定数量，则全部平仓
    const closeQuantity = quantity || state.tradingInfo.quantity;
    // 保存平仓前的数量，用于判断部分平仓和计算剩余数量
    const quantityBeforeClose = state.tradingInfo.quantity;
    const isPartialClose = closeQuantity < quantityBeforeClose;
    
    // 注意：initialPositionSize 应该在 judgeProfitRunOrProfit 函数开始时记录（与Pine Script一致）
    await closeOrder("SELL", closeQuantity, () => {
        const curTestMoney =
            closeQuantity * (_currentPrice - state.tradingInfo.orderPrice) -
            closeQuantity * (_currentPrice + state.tradingInfo.orderPrice) * priorityFee;

        state.testMoney += curTestMoney;
        setLossCount(curTestMoney);
        
        const [kLine3] = getLastFromArr(state.kLineData, 1);
        const kLineDate = kLine3 ? (isTestLocal ? kLine3.openTime : getDate(kLine3.openTime)) : 'N/A';
        
        console.log(isPartialClose ? "部分平多完成" : "平多完成");

        // 记录平仓日志（如果启用）
        if (enableVisualizationLogs) {
            const collector = getLogCollector();
            if (collector) {
                collector.recordClose(kLineDate, _currentPrice, state.testMoney, state.tradingInfo.orderPrice);
            }
        }
    });
};

const closeDown = async (quantity, stopPrice) => {
    // 指定平仓价格（如果指定，则使用指定价格，否则使用当前价格）
    const _currentPrice = stopPrice || state.currentPrice;
    // 如果没有指定数量，则全部平仓
    const closeQuantity = quantity || state.tradingInfo.quantity;
    // 保存平仓前的数量，用于判断部分平仓和计算剩余数量
    const quantityBeforeClose = state.tradingInfo.quantity;
    const isPartialClose = closeQuantity < quantityBeforeClose;
    
    // 注意：initialPositionSize 应该在 judgeProfitRunOrProfit 函数开始时记录（与Pine Script一致）
    await closeOrder("BUY", closeQuantity, () => {
        const curTestMoney =
            closeQuantity * (state.tradingInfo.orderPrice - _currentPrice) -
            closeQuantity * (_currentPrice + state.tradingInfo.orderPrice) * priorityFee;

        state.testMoney += curTestMoney;
        setLossCount(curTestMoney);
        
        const [kLine3] = getLastFromArr(state.kLineData, 1);
        const kLineDate = kLine3 ? (isTestLocal ? kLine3.openTime : getDate(kLine3.openTime)) : 'N/A';
        
        console.log(isPartialClose ? "部分平空完成" : "平空完成");

        // 记录平仓日志（如果启用）
        if (enableVisualizationLogs) {
            const collector = getLogCollector();
            if (collector) {
                collector.recordClose(kLineDate, _currentPrice, state.testMoney, state.tradingInfo.orderPrice);
            }
        }
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
    const dataPath = path.join(__dirname, `../../data/${isTest ? "test" : "prod"}-${strategyType}-${SYMBOL}.js`);
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
        TP_SL: __TP_SL,
        testMoney: __testMoney,
        readyTradingDirection: __readyTradingDirection,
        hasOrder: __hasOrder,
        availableMoney: __availableMoney,
        lossCount: __lossCount,
        entryPrice: __entryPrice,
        entryKLineCount: __entryKLineCount,
        initialLongStopLoss: __initialLongStopLoss,
        initialShortStopLoss: __initialShortStopLoss,
        initialPositionSize: __initialPositionSize,
        lastIndicatorTPKLineCount: __lastIndicatorTPKLineCount,
        indicatorTPCount: __indicatorTPCount,
        trailActive: __trailActive,
        trailStop: __trailStop,
        longTakeProfit: __longTakeProfit,
        shortTakeProfit: __shortTakeProfit,
        downArrivedProfit: __downArrivedProfit,
        sellstopLossPrice: __sellstopLossPrice,
    } = historyDatas;

    state.prePrice = __prePrice;
    state.tradingInfo = __tradingInfo;
    state.testMoney = __testMoney;
    state.TP_SL = __TP_SL;
    state.hasOrder = __hasOrder;
    state.readyTradingDirection = __readyTradingDirection;
    state.availableMoney = __availableMoney;
    state.lossCount = __lossCount;

    // 恢复新增的变量（如果存在）
    if (__entryPrice !== undefined) state.entryPrice = __entryPrice;
    if (__entryKLineCount !== undefined) state.entryKLineCount = __entryKLineCount;
    if (__initialLongStopLoss !== undefined) state.initialLongStopLoss = __initialLongStopLoss;
    if (__initialShortStopLoss !== undefined) state.initialShortStopLoss = __initialShortStopLoss;
    if (__initialPositionSize !== undefined) state.initialPositionSize = __initialPositionSize;
    if (__lastIndicatorTPKLineCount !== undefined) state.lastIndicatorTPKLineCount = __lastIndicatorTPKLineCount;
    if (__indicatorTPCount !== undefined) state.indicatorTPCount = __indicatorTPCount;
    if (__trailActive !== undefined) state.trailActive = __trailActive;
    if (__trailStop !== undefined) state.trailStop = __trailStop;
    if (__longTakeProfit !== undefined) state.longTakeProfit = __longTakeProfit;
    if (__shortTakeProfit !== undefined) state.shortTakeProfit = __shortTakeProfit;
    if (__downArrivedProfit !== undefined) state.downArrivedProfit = __downArrivedProfit;
    if (__sellstopLossPrice !== undefined) state.sellstopLossPrice = __sellstopLossPrice;
};

const recoverHistoryDataByPosition = async (historyDatas, { up, down }) => {
    state.loadingInit = true;
    await recoverHistoryData(historyDatas);
    await checkOverGrid({ up, down });
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
        let _stopLoss = stopLoss; // 止损
        let _stopProfit = stopProfit; // 止盈
        state.TP_SL = [_stopLoss, _stopProfit];
    }

    if (trend === "down") {
        let _stopLoss = stopLoss; // 止损
        let _stopProfit = stopProfit; // 止盈
        state.TP_SL = [_stopProfit, _stopLoss];
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
        reconnectAttempts = 0;
    });

    ws.on("message", async (data) => {
        let realData = {};
        if (isTestLocal) {
            const jsonString = data.toString("utf-8");
            try {
                const parsedData = JSON.parse(jsonString);
                realData = {
                    k: {
                        t: parsedData.openTime,
                        T: parsedData.closeTime,
                        o: parsedData.open,
                        c: parsedData.close,
                        h: parsedData.high,
                        l: parsedData.low,
                        v: parsedData.volume,
                        x: true,
                    }
                };
            } catch (error) {
                console.error("JSON 解析失败:", error);
            }
        } else {
            realData = JSON.parse(data);
        }

        if ((isTestLocal && !realData) || (!isTestLocal && realData.e !== "kline")) {
            console.error("🚀 ~ ws.on ~ data:", data, data.toString('utf8'));
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
            console.log('end data', {
                longTrendUpperReachCountMap: state.longTrendUpperReachCountMap,
                shortTrendLowerReachCountMap: state.shortTrendLowerReachCountMap,
            });
            // 程序结束前保存可视化日志
            if (enableVisualizationLogs) {
                const collector = getLogCollector();
                if (collector && collector.enabled) {
                    collector.saveToFile();
                }
            }
            process.exit(0);
        }

        state.prePrice = state.currentPrice;
        state.currentPrice = Number(close) || 0;

        const curKLine = {
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
            // K线计数递增
            state.currentKLineCount++;
            // 更新k线和指标数据（异步执行，等待所有指标计算完成）
            await refreshKLineAndIndex(curKLine);

            // 可视化日志数据收集（不保存，只在程序退出时保存）

            if (!state.hasOrder) {
                await kaiDanDaJi();
            } else {
                if (isLoading() || state.prePrice === state.currentPrice) {
                    // 不做任何操作
                } else {
                    await gridPointClearTrading(state.currentPrice, state, configEth, closeUp, closeDown);
                }
            }
            
            // 在本地测试环境下，处理完新K线数据后请求下一条数据
            // 确保在处理完当前数据后再请求，避免重复推送
            if (isTestLocal) {
                ws.send('hello');
            }
        }
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

    if (isTestLocal) {
        ws.send('hello');
    }
};

// ==================== 日志管理 ====================

function errorToString(error) {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}\n${error.stack}`;
    }
    return error;
}

const createLogs = () => {
    const logsPath = path.join(__dirname, logsFolder || 'logs');
    if (!fs.existsSync(logsPath)) {
        fs.mkdirSync(logsPath, { recursive: true });
    }

    logStream = fs.createWriteStream(
        path.join(logsPath, `${isTest ? "test" : "prod"}-${strategyType}-${SYMBOL}-${getDate()}.log`),
        { flags: "a" }
    );

    const originalConsoleLog = console.log;
    console.log = function (...args) {
        // if (isTestLocal) {
        //     // return;
        //     if (args[0] && args[0].indexOf && args[0].indexOf('@@') < 0) {
        //         return;
        //     }
        // }
        const date = isTestLocal && state.kLineData && state.kLineData.length > 0 
            ? state.kLineData[state.kLineData.length - 1].openTime 
            : getDate();
        logStream.write(
            `${date} ${args
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

    const errorsPath = path.join(__dirname, errorsFolder || 'errors');
    if (!fs.existsSync(errorsPath)) {
        fs.mkdirSync(errorsPath, { recursive: true });
    }

    errorStream = fs.createWriteStream(
        path.join(errorsPath, `${isTest ? "test" : "prod"}-${strategyType}-${SYMBOL}-${getDate()}.error`),
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
        const dataPath = path.join(__dirname, '../../data');
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }
        if (state.currentPrice !== 0 && state.prePrice !== 0) {
            const data = JSON.stringify({
                currentPrice: state.currentPrice,
                prePrice: state.prePrice,
                tradingInfo: state.tradingInfo,
                testMoney: state.testMoney,
                hasOrder: state.hasOrder,
                TP_SL: state.TP_SL,
                readyTradingDirection: state.readyTradingDirection,
                availableMoney: state.availableMoney,
                lossCount: state.lossCount,
                entryPrice: state.entryPrice,
                entryKLineCount: state.entryKLineCount,
                initialLongStopLoss: state.initialLongStopLoss,
                initialShortStopLoss: state.initialShortStopLoss,
                initialPositionSize: state.initialPositionSize,
                lastIndicatorTPKLineCount: state.lastIndicatorTPKLineCount,
                indicatorTPCount: state.indicatorTPCount,
                trailActive: state.trailActive,
                trailStop: state.trailStop,
                longTakeProfit: state.longTakeProfit,
                shortTakeProfit: state.shortTakeProfit,
                downArrivedProfit: state.downArrivedProfit,
                sellstopLossPrice: state.sellstopLossPrice,
            });
            fs.writeFileSync(
                path.join(dataPath, `${isTest ? "test" : "prod"}-${strategyType}-${SYMBOL}.js`),
                `module.exports = ${data}`,
                { flag: "w" }
            );
        }
    }, 0);
}

// 保存可视化日志数据（仅在程序退出时调用）
function saveVisualizationLogs() {
    if (!enableVisualizationLogs) {
        return;
    }

    try {
        const collector = getLogCollector();
        if (collector && collector.enabled) {
            collector.saveToFile();
        } else {
            console.error("日志收集器未初始化或未启用");
        }
    } catch (error) {
        console.error("保存可视化日志失败:", error);
    }
}

// ==================== 启动交易 ====================

const startTrading = async () => {
    try {
        // 初始化日志收集器（如果启用，需要在state定义之后）
        if (enableVisualizationLogs) {
            const collector = initLogCollector(configEth);
            if (collector && collector.enabled) {
                console.log(`[可视化日志] 已启用 - Symbol: ${configEth.SYMBOL}, Strategy: ${configEth.strategyType}`);
            } else {
                console.log(`[可视化日志] 初始化失败或未启用 - enabled=${collector?.enabled}`);
            }
        } else {
            console.log(`[可视化日志] 未启用 - enableVisualizationLogs=${enableVisualizationLogs}`);
        }

        await getServerTimeOffset();
        await getHistoryClosePrices();
        await initEveryIndex(state.historyClosePrices, state.kLineData, state, configEth);

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

    // 保存可视化日志数据（如果启用）
    if (enableVisualizationLogs) {
        saveVisualizationLogs();
    }

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

createLogs();
startTrading();
