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
        maxKLinelen: 1000,
        
        // ========== 资金管理 ==========
        availableMoney: 100,                 // 可用的USDT数量
        invariableBalance: true,             // 是否使用固定金额建仓，为true时，availableMoney为必填
        priorityFee: 0.0007,                 // 手续费率
        slippage: 0,                         // 滑点
        sizingMode: 'Fixed',           // 仓位管理: Fixed, Martingale, RiskBased （'Fixed' / 'RiskBased' 时可以启用滚仓）
        rolling: false,                // 滚仓: availableMoney = max(availableMoney + 盈利, availableMoney)

        // 马丁格尔模式配置
        martingaleInitialPercent: 100,  // 初始百分比（默认100，即100%）
        martingaleIncrementPercent: 10,  // 每次增加的百分比（默认1，即1%）
        martingaleMaxPercent: 1000,     // 最大百分比（默认1000，即1000%）

        // 以损定仓模式配置
        RiskBasedRiskPercent: 0.02,     // 单笔风险百分比（默认0.01，即1%）
        
        // ========== 日志配置 ==========
        logsFolder: "logs",
        errorsFolder: "errors",
        enableVisualizationLogs: true,       // 是否启用可视化日志收集
        
        // ========== SuperTrend 指标配置 ==========
        atrPeriod: 48,                       // SuperTrend ATR 周期
        multiplier: 25,                      // SuperTrend ATR 乘数
        
        // ========== SSL 指标配置 ==========
        sslPeriod: 200,                      // SSL 周期
        sslSlopeLookback: 21,                // SSL 斜率计算周期
        sslRateUp: 0.00008,                  // SSL 斜率阈值 - 多头(up)
        sslRateDown: -0.00006,               // SSL 斜率阈值 - 空头(down)
        
        // ========== SSL2 指标配置 ==========
        ssl2SlopeLookback: 21,               // SSL2 斜率计算周期
        ssl2RateUp: 0.0001,                  // SSL2 斜率阈值 - 多头(up)
        ssl2RateDown: -0.0001,               // SSL2 斜率阈值 - 空头(down)
        
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
        qqe_entryThreshold1: 5.0,            // QQE开单阈值1
        qqe_entryThreshold2: 15.0,           // QQE开单阈值2
        
        // ========== ADX 指标配置 ==========
        adx_len: 12,                         // ADX周期
        adx_threshold_low: 20.0,             // ADX入场阈值下限
        adx_threshold_high: 40.0,            // ADX入场阈值上限
        
        // ========== Fibonacci Bollinger Bands 配置 ==========
        // 注意：fbbLength 和 fbb_mult 在 utils/fib.js 中硬编码为 200 和 3.0
        // 如需修改，需要在 indicators.js 中传递参数
        
        // ========== Range Filter (SwimingFree) 配置 ==========
        swimingFreePeriod: 60,               // Range Filter 周期
        
        // ========== Swing High/Low 配置 ==========
        swingLength: 21,                     // 摆动长度
        
        // ========== SSL55 + Squeeze Box 入场配置 ==========
        enableSSL55Squeeze: true,           // 启用 SSL55 + Squeeze Box 入场，默认关闭
        ssl55_Length: 55,                    // SSL55 计算周期，默认55
        squeeze_box_Period: 24,              // Squeeze Box 采样周期，默认24
        squeeze_box_Deviation: 2,             // Squeeze Box 标准差倍数，默认2
        squeeze_box_Threshold: 50,           // Squeeze Box 挤压阈值百分比，默认50
        squeeze_box_Source: 'hl2',          // Squeeze Box 数据源，默认 'hl2' (可选: 'close', 'open', 'high', 'low', 'hlc3', 'hl2')
        squeeze_box_MA_Type: 'EMA',         // Squeeze Box MA类型，默认 'EMA' (可选: 'EMA', 'SMA'， 'HULLMA')
        
        // ========== 风险管理配置 ==========
        // 固定止盈
        riskRewardRatio: 1,                // 固定止盈倍数
        priceTolerance: 0.0006,              // 判断平仓时的价格容差
        
        // 移动止损
        enableTrailingStop: false,            // 启用移动止损
        qqeTrailingThresholdLong: 40.0,      // 做多移动止损QQE阈值
        qqeTrailingThresholdShort: -40.0,    // 做空移动止损QQE阈值
        
        // 指标止损 目前的指标止损并不好用
        enableIndicatorStopLoss: false,       // 启用指标止损（当前低点低于前低/当前高点高于前高）

        // 连续亏损保护 目前的代码是反转后100根k线开单所以不用这个保护，不会在趋势末端开单的
        maxConsecutiveLoss: 0,               // 连续亏损次数阈值，达到后停止开单，等待价格突破Fibonacci上下沿后恢复（0表示不启用）
        
        // 分批止盈 类型控制开关
        enableSupertrendTakeProfit: true,    // 启用SuperTrend指标止盈
        enableFibonacciTakeProfit: true,     // 启用Fibonacci指标止盈
        enableQQEModTakeProfit: true,        // 启用QQE MOD拐头止盈
        enableProfitPercentTakeProfit: true, // 启用盈利百分比止盈

        // 百分比止盈阈值
        profitPercentTakeProfit: 0.03,       // 盈利百分比止盈阈值，默认2%（0.02）

        // 指标止盈计数
        indicatorTPCountThreshold: 3,        // 指标止盈计数阈值
        indicatorTPPartialCount: 2,          // 首次指标止盈计数阈值，用于判断是否执行部分平仓
        indicatorTPPartialRatio: 0.6,        // 首次指标止盈平仓比例，默认60%

        // 指标止盈 QQE MOD拐头止盈
        qqeModTakeProfitThresholdLong: 30,   // 做多QQE MOD拐头止盈阈值，默认30
        qqeModTakeProfitThresholdShort: -30,  // 做空QQE MOD拐头止盈阈值，默认30

        // QQE MOD趋势反转入场配置
        qqeModTrendReversalThreshold: 10,     // QQE MOD趋势反转入场阈值，默认0（多：中间QQE MOD < 阈值，空：中间QQE MOD > 阈值）
    },
};

module.exports = config;
