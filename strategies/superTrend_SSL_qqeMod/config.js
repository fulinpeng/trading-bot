// 常量配置
const config = {
    'eth': {
        // ========== 基础配置 ==========
        strategyType: "superTrend_ssl_qqemod",
        SYMBOL: "ethUSDT".toLowerCase(),     // 交易对
        base: "USDT",
        klineStage: "5m",                    // K线级别
        isUpOpen: true,                       // 是否允许开多
        isDownOpen: true,                     // 是否允许开空
        isTest: true,                         // 是否为测试环境
        isTestLocal: true,                    // 是否为本地测试环境
        
        // ========== 资金管理 ==========
        availableMoney: 100,                 // 可用的USDT数量
        invariableBalance: true,             // 是否使用固定金额建仓，为true时，availableMoney为必填
        priorityFee: 0.0007,                 // 手续费率
        slippage: 0,                         // 滑点
        double: 0,                           // 是否损失后加倍开仓
        maxLossCount: 20,                    // 损失后加倍开仓，最大倍数
        
        // ========== 日志配置 ==========
        logsFolder: "logs",
        errorsFolder: "errors",
        enableVisualizationLogs: true,       // 是否启用可视化日志收集
        
        // ========== SuperTrend 指标配置 ==========
        atrPeriod: 48,                       // SuperTrend ATR 周期，与 TradingView 一致
        multiplier: 12,                      // SuperTrend ATR 乘数，与 TradingView 一致
        
        // ========== SSL 指标配置 ==========
        sslPeriod: 200,                      // SSL 周期
        sslSlopeLookback: 21,                // SSL 斜率计算周期，与 TradingView 一致
        sslRateUp: 0.00008,                  // SSL 斜率阈值 - 多头(up)，与 TradingView 一致
        sslRateDown: -0.00006,               // SSL 斜率阈值 - 空头(down)，与 TradingView 一致
        
        // ========== SSL2 指标配置 ==========
        ssl2SlopeLookback: 21,               // SSL2 斜率计算周期，与 TradingView 一致
        ssl2RateUp: 0.0001,                  // SSL2 斜率阈值 - 多头(up)，与 TradingView 一致
        ssl2RateDown: -0.0001,               // SSL2 斜率阈值 - 空头(down)，与 TradingView 一致
        
        // ========== QQE MOD 指标配置 ==========
        // Primary QQE 参数
        qqe_rsiLengthPrimary: 6,             // Primary RSI周期
        qqe_rsiSmoothingPrimary: 5,         // Primary RSI平滑周期
        qqe_qqeFactorPrimary: 3.0,           // Primary QQE因子
        qqe_thresholdPrimary: 3.0,           // Primary阈值
        // Secondary QQE 参数
        qqe_rsiLengthSecondary: 6,           // Secondary RSI周期
        qqe_rsiSmoothingSecondary: 5,       // Secondary RSI平滑周期
        qqe_qqeFactorSecondary: 1.61,       // Secondary QQE因子
        qqe_thresholdSecondary: 3.0,         // Secondary阈值
        // QQE 入场阈值
        qqe_entryThreshold1: 5.0,            // QQE开单阈值1，与 TradingView 一致
        qqe_entryThreshold2: 15.0,           // QQE开单阈值2，与 TradingView 一致
        
        // ========== ADX 指标配置 ==========
        adx_len: 12,                         // ADX周期，与 TradingView 一致
        adx_threshold_low: 20.0,             // ADX入场阈值下限，与 TradingView 一致
        adx_threshold_high: 40.0,            // ADX入场阈值上限，与 TradingView 一致
        
        // ========== Fibonacci Bollinger Bands 配置 ==========
        // 注意：fbbLength 和 fbb_mult 在 utils/fib.js 中硬编码为 200 和 3.0
        // 如需修改，需要在 indicators.js 中传递参数
        
        // ========== Range Filter (SwimingFree) 配置 ==========
        swimingFreePeriod: 60,               // Range Filter 周期
        
        // ========== Swing High/Low 配置 ==========
        swingLength: 21,                     // 摆动长度，与 TradingView 一致
        
        // ========== 风险管理配置 ==========
        // 固定止盈止损
        riskRewardRatio: 1.4,                // 固定止盈倍数，与 TradingView 一致
        priceTolerance: 0.0006,              // 价格容差，与 TradingView 一致
        firstProtectProfitRate: 0.1,         // 首次保本止损比例（在updateSellstopLossPrice中使用）
        
        // 移动止损
        enableTrailingStop: false,            // 启用移动止损
        qqeTrailingThresholdLong: 30.0,      // 做多移动止损QQE阈值，与 TradingView 一致
        qqeTrailingThresholdShort: -30.0,    // 做空移动止损QQE阈值，与 TradingView 一致
        
        // 指标止盈
        enableSupertrendTakeProfit: true,    // 启用SuperTrend指标止盈，与 TradingView 一致
        enableFibonacciTakeProfit: true,     // 启用Fibonacci指标止盈，与 TradingView 一致
        indicatorTPCountThreshold: 2,        // 指标止盈计数阈值，与 TradingView 一致
        indicatorTPPartialRatio: 0.6,        // 首次指标止盈平仓比例
    },
};
// [2, 4, 16, 48, 144]
// [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]
// [1, 1.5, 3, 6, 12, 24, 48, 96, 192, 384]
// [1, 1.2, 2.4, 4.8, 9.6, 19.2, 38.4, 76.8, 153.6, 307.2]
// [1, 1.1, 2.2, 4.4, 8.8, 17.6, 35.2, 70.4, 140.8, 281.6, 563.2]

module.exports = config;
