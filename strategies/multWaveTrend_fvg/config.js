// 策略配置文件
// 从 config-multWaveTrend&fvg.js 提取的 1000pepe 配置
module.exports = {
    strategyType: "multWaveTrend_fvg",
    SYMBOL: "1000pepeUSDT".toLowerCase(), // 交易对
    base: "USDT",
    logsFolder: "logs", // 日志配置
    errorsFolder: "errors",
    availableMoney: 10, // 可用的USDT数量
    invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
    klineStage: "1m", // k线级别
    priorityFee: 0.0007, // 手续费
    slippage: 0.0002, // 滑点
    
    // WaveTrend 基础参数
    wtChannelLength: 10, // WT Channel Length (n1)
    wtAverageLength: 21, // WT Average Length (n2)
    
    // WaveTrend 阈值参数
    overBoughtLevel1: 60, // OverBought Level 1 (+60)
    overBoughtLevel2: 53, // OverBought Level 2 (+53)
    bearishThresholdLine: 50, // 看空门槛线 (+50)
    bullishThresholdLine: -50, // 看多门槛线 (-50)
    overSoldLevel2: -53, // OverSold Level 2 (-53)
    overSoldLevel1: -60, // OverSold Level 1 (-60)
    
    // 策略启用开关
    enableLongStrategy: true, // 启用做多策略
    enableShortStrategy: true, // 启用做空策略
    enableRiskBasedPosition: true, // 启用以损定仓
    maxLossPercentage: 1, // 最大亏损占比(%)
    
    // 做多参数
    longRiskRewardRatio: 1.2, // 做多盈亏比
    longP5UpperLimit: 50, // 做多开仓p5上限
    longP15LowerLimit: 0, // 做多开仓p15下限
    longReadyBuyThreshold: -50, // 做多readyBuy阈值
    longP1h1UpperLimit: 40, // 做多readyBuy的p1h1上限
    longThresholdLevel: 50, // 做多阈值水平
    longFvgLookbackBars: 8, // 做多FVG回溯K线数量
    longFvgWaitBars: 2, // 做多FVG等待K线数量
    longFvgGapMultiplier: 2, // 做多FVG gap倍数
    longEnableFvgPriceCheck: true, // 做多启用FVG价格检查
    longPartialCloseLevel: 60, // 做多移动止损触发p5阈值
    longBreakevenFactor: 1.001, // 做多保本止损系数
    longEnableProfitTarget2: true, // 做多启用止盈条件2
    longPivotLength: 7, // 做多摆动低点周期
    longAvgHeightLength: 21, // 做多K线平均高度周期
    
    // 做空参数
    shortRiskRewardRatio: 1.2, // 做空盈亏比
    shortP5LowerLimit: -50, // 做空开仓p5下限
    shortP15UpperLimit: 0, // 做空开仓p15上限
    shortReadySellThreshold: 50, // 做空readySell阈值
    shortP1h1LowerLimit: -25, // 做空readySell的p1h1下限
    shortThresholdLevel: -50, // 做空阈值水平
    shortFvgLookbackBars: 5, // 做空FVG回溯K线数量
    shortFvgWaitBars: 3, // 做空FVG等待K线数量
    shortFvgGapMultiplier: 10, // 做空FVG gap倍数
    shortEnableFvgPriceCheck: true, // 做空启用FVG价格检查
    shortPartialCloseLevel: -60, // 做空移动止损触发p5阈值
    shortBreakevenFactor: 0.999, // 做空保本止损系数
    shortEnableProfitTarget2: true, // 做空启用止盈条件2
    shortPivotLength: 7, // 做空摆动高点周期
    shortAvgHeightLength: 21, // 做空K线平均高度周期
    
    // 通用参数
    double: 1, // 是否损失后加倍开仓
    maxLossCount: 20, // 损失后加倍开仓，最大倍数
};

