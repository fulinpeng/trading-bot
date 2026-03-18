// 常量配置
const config = {
    'eth': {
        // ========== 基础配置 ==========
        strategyType: "superTrend_ssl_qqemod",
        SYMBOL: "ethUSDT".toLowerCase(),     // 交易对
        base: "USDT",
        klineStage: "30m",                    // K线级别
        isUpOpen: true,                       // 是否允许开多
        isDownOpen: true,                     // 是否允许开空
        isTest: true,                         // 是否为测试环境
        isTestLocal: true,                    // 是否为本地测试环境
        maxKLinelen: 1000,
        
        // ========== 资金管理 ==========
        availableMoney: 10000,                 // 可用的USDT数量
        invariableBalance: true,             // 是否使用固定金额建仓，为true时，availableMoney为必填
        priorityFee: 0.0007,                 // 手续费率
        slippage: 0,                         // 滑点
        sizingMode: 'Fixed',           // 仓位管理: Fixed, Martingale, RiskBased （'Fixed' / 'RiskBased' 时可以启用滚仓）
        rolling: true,                // 滚仓: availableMoney = max(availableMoney + 盈利, availableMoney)

        // 马丁格尔模式配置
        martingaleInitialPercent: 100,  // 初始百分比（默认100，即100%）
        martingaleIncrementPercent: 10,  // 每次增加的百分比（默认1，即1%）
        martingaleMaxPercent: 1000,     // 最大百分比（默认1000，即1000%）

        // 以损定仓模式配置
        RiskBasedRiskPercent: 0.1,     // 单笔风险百分比（默认0.01，即1%）
        
        // ========== 日志配置 ==========
        logsFolder: "logs",
        errorsFolder: "errors",
        enableVisualizationLogs: true,       // 是否启用可视化日志收集
        
        // ========== SuperTrend 指标配置 ==========
        atrPeriod: 50,                       // SuperTrend ATR 周期
        multiplier: 25,                      // SuperTrend ATR 乘数
        atrEntryThreshold: 15,           // ATR入场阈值，连续20根K线的ATR都小于此值时才允许入场（顺势开单的atr条件）
        
        // ========== SSL 指标配置 ==========
        sslPeriod: 200,                      // SSL 周期
        sslSlopeLookback: 21,                // SSL 斜率计算周期
        
        // ========== SSL2 指标配置 ==========
        
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
        // ADX趋势反转计数配置：根据ATR值动态设置计数阈值
        adxReachCountAtrThreshold: 20,       // ATR阈值，当ATR < 此值时使用adxReachCountWhenLow，否则使用adxReachCountWhenHigh
        adxReachCountWhenLow: 1,             // ATR < 阈值时的计数阈值（计数 < 此值）
        adxReachCountWhenHigh: 3,            // ATR >= 阈值时的计数阈值（计数 < 此值）
        
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
        
        // ========== DEMA 趋势线配置 ==========
        demaFastPeriod: 21,                 // 快线 DEMA 周期
        demaSlowPeriod: 55,                 // 慢线 DEMA 周期
        demaSignalHoldBars: 50,             // DEMA 信号保持K线数
        
        // ========== 风险管理配置 ==========
        // 固定止盈
        riskRewardRatio: 2.5,                // 固定止盈倍数
        priceTolerance: 0.001,              // 判断平仓时的价格容差
        
        // 波动率自适应止损（替代原来的移动止损）
        enableVolatilityTrailingStop: true,   // 启用波动率自适应止损 31123 120单 , 31765  indicatorTPSecondCloseRatio: 0.5 （这个设为true后，曲线全是向上，非常好看）
        volatilityATRPeriod: 14,              // 波动率计算用的ATR周期
        volatilitySMAPeriod: 50,              // 波动率计算用的SMA周期
        
        // 高风险检测配置
        enableIndicatorStopLoss: true,        // 启用 高风险检测 15：24359 156单 （收益曲线非常乱，不好） | 30：30350 135单
        indicatorStopLossCheckPeriod: 50,     // 开仓后第N根K线时做一次高风险检测（与参考策略一致）
        indicatorStopLossRiskRatio: 0.51,      // 区间内阴/阳线比例达到此值标记为高风险（做多：阴线比例，做空：阳线比例）
        indicatorStopLossQQEModThresholdLong: 25,   // 做多指标止损QQE MOD阈值，高风险单等待qqemod > 此阈值时触发止损
        indicatorStopLossQQEModThresholdShort: -25, // 做空指标止损QQE MOD阈值，高风险单等待qqemod < 此阈值时触发止损

        enableAtrZCompressedJudge: true,    // 启用ATR Z-Score判断压缩行情 39316 71单 2次平0.5：33210 

        // 冷却时，仓位减半
        enableCoolingMechanism: true,        // 启用冷却机制，默认关闭(仅在亏损时冷却，冷却时仓位减半) 效果不理想
        // 连续亏损保护 目前的代码是反转后100根k线开单所以不用这个保护，不会在趋势末端开单的
        maxConsecutiveLoss: 3,               // 连续亏损次数阈值，达到后半仓开单，等待价格突破Fibonacci上下沿后恢复（0表示不启用）
        
        // 动态仓位调整配置
        reachCountForPositionReduction: 3,   // 当reachCount达到此值时，减少仓位
        positionReductionRatio: 0.5,         // 仓位减少比例，当reachCount达到阈值时，仓位 = 原仓位 * 此比例
        
        // 分批止盈 类型控制开关
        enableSupertrendTakeProfit: true,    // 启用SuperTrend指标止盈
        enableFibonacciTakeProfit: false,     // 启用Fibonacci指标止盈
        enableQQEModTakeProfit: false,        // 启用QQE MOD止盈
        enableProfitPercentTakeProfit: false, // 启用盈利百分比止盈

        // 百分比止盈阈值
        profitPercentTakeProfit: 0.05,       // 盈利百分比止盈阈值，默认2%（0.02）

        // 指标止盈分批平仓配置
        indicatorTPFirstCloseCount: 1,        // 第一次平仓计数阈值，达到此计数时执行第一次平仓
        indicatorTPSecondCloseCount: 2,       // 第二次平仓计数阈值，达到此计数时执行第二次平仓
        indicatorTPFinalCloseCount: 3,        // 最终平仓计数阈值，达到此计数时平仓剩余所有仓位
        indicatorTPFirstCloseRatio: 0,      // 第一次平仓比例，平仓初始仓位的40%
        indicatorTPSecondCloseRatio: 0.5,     // 第二次平仓比例，平仓初始仓位的40%
        indicatorTPCoolingPeriod: 20,          // 指标止盈冷静期（K线数量），触发指标止盈后在此时间内不再触发

        // 保本止损配置
        enableBreakEvenStopLoss: false,        // 启用保本止损，当 第一次指标止盈 后，设置保本止损，如果已经存在移动止损，取更有利的那个（多单时取较大值，空单时取较小值）
        breakEvenStopLossRatio: 0.001,        // 保本止损比例，多单：开仓价 * (1 + ratio)，空单：开仓价 * (1 - ratio)
        tpCountForStopLoss: 2,                 // 指标止盈计数关键字，用于判断是否达到平仓条件

        // 指标止盈 QQE MOD止盈
        qqeModTakeProfitThresholdLong: 30,   // 做多QQE MOD拐止盈阈值，默认30
        qqeModTakeProfitThresholdShort: -30,  // 做空QQE MOD止盈阈值，默认30

        // QQE MOD趋势反转入场配置
        qqeModTrendReversalThreshold: 15,     // QQE MOD趋势反转入场阈值，默认0（多：中间QQE MOD < 阈值，空：中间QQE MOD > 阈值）
        qqeModTrendReversalThreshold2: 30,   // QQE MOD趋势反转入场阈值2
        qqeModTrendReversalCount: 3           // QQE MOD趋势反转需要出现的拐头次数，默认3
    },
};

module.exports = config;
