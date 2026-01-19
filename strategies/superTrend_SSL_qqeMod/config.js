// 常量配置
const config = {
    'eth': {
        strategyType: "superTrend_ssl_qqemod",
        SYMBOL: "ethUSDT".toLowerCase(), // 交易对
        base: "USDT",
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        availableMoney: 100, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        klineStage: "5m", // k线级别

        priorityFee: 0.0007, // 0.0007,
        slippage: 0.0002, // 滑点
        atrPeriod: 48,
        multiplier: 12,
        firstProtectProfitRate: 0.1, // 在updateSellstopLossPrice中使用
        swimingFreePeriod: 50,
        sslPeriod: 200,
        sslRateUp: -0.0001,
        sslRateDown: -0.0003,
        double: 0, // 是否损失后加倍开仓
        maxLossCount: 20, // 损失后加倍开仓，最大倍数

        // ========== 新增参数 ==========
        // 固定止盈止损
        riskRewardRatio: 1.4,                // 固定止盈倍数（1:3）
        priceTolerance: 0.0005,              // 价格容差
        
        // 移动止损
        enableTrailingStop: false,            // 启用移动止损
        qqeTrailingThresholdLong: 30.0,      // 做多移动止损QQE阈值
        qqeTrailingThresholdShort: -30.0,    // 做空移动止损QQE阈值
        
        // 指标止盈
        enableSupertrendTakeProfit: true,   // 启用SuperTrend指标止盈
        enableFibonacciTakeProfit: true,     // 启用Fibonacci指标止盈
        indicatorTPCountThreshold: 2,         // 指标止盈计数阈值
        indicatorTPPartialRatio: 0.6,        // 首次指标止盈平仓比例
        
        // SSL2相关
        ssl2RateUp: 0.0001,                  // SSL2斜率阈值（多头）
        ssl2RateDown: -0.0001,               // SSL2斜率阈值（空头）
        ssl2SlopeLookback: 21,                // SSL2斜率计算周期
        sslSlopeLookback: 21,                 // SSL斜率计算周期
        
        // QQE相关
        qqe_entryThreshold1: 5.0,            // QQE开单阈值1
        qqe_entryThreshold2: 15.0,           // QQE开单阈值2
        qqe_rsiLengthPrimary: 6,             // Primary RSI周期
        qqe_rsiSmoothingPrimary: 5,          // Primary RSI平滑周期
        qqe_qqeFactorPrimary: 3.0,           // Primary QQE因子
        qqe_thresholdPrimary: 3.0,           // Primary阈值
        qqe_rsiLengthSecondary: 6,           // Secondary RSI周期
        qqe_rsiSmoothingSecondary: 5,       // Secondary RSI平滑周期
        qqe_qqeFactorSecondary: 1.61,       // Secondary QQE因子
        qqe_thresholdSecondary: 3.0,         // Secondary阈值
        
        // ADX相关
        adx_threshold_low: 20.0,             // ADX入场阈值下限
        adx_threshold_high: 40.0,            // ADX入场阈值上限
        adx_len: 12,                         // ADX周期
        
        // 前高点/前低点
        swingLength: 21,                     // 摆动长度
    },
};
// [2, 4, 16, 48, 144]
// [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]
// [1, 1.5, 3, 6, 12, 24, 48, 96, 192, 384]
// [1, 1.2, 2.4, 4.8, 9.6, 19.2, 38.4, 76.8, 153.6, 307.2]
// [1, 1.1, 2.2, 4.4, 8.8, 17.6, 35.2, 70.4, 140.8, 281.6, 563.2]

module.exports = config;
