// 常量配置
const config = {
    doge: {
        strategyType: "renko_boll",
        SYMBOL: "dogeUSDT".toLowerCase(), // 交易对
        base: "USDT",
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        klineStage: "1m", // k线级别
        numForAverage: 12, // 多少根k线求取candleHeight
        
        brickSize: 0.001,
        priorityFee: 0.0007, // 0.0007,
        slippage: 0.0002, // 滑点
        B2Period: 20, // boll周期
        B2mult: 2, // boll倍数
        atrPeriod: 5,
        multiplier: 2,
        baseLossRate: 0.5, // 基础止损
        howManyCandle: 3, // 止盈
        firstStopProfitRate: 2, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
        firstProtectProfitRate: 0.9, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
        firstStopLossRate: 0, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
        isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
        profitProtectRate: 0.9, //isProfitRun === 1 时生效，保留多少利润
        howManyCandleForProfitRun: 1,
        maxStopLossRate: 0.01, // 止损小于10%的情况，最大止损5%
        invalidSigleStopRate: 0.1, // 止损在10%，不开单
        double: 1, // 是否损失后加倍开仓
        maxLossCount: 20, // 损失后加倍开仓，最大倍数
    },
    // gridBot-renko-boll-test2
    '1000pepe': {
        strategyType: "renko_boll",
        SYMBOL: "1000pepeUSDT".toLowerCase(), // 交易对
        base: "USDT",
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        klineStage: "1m", // k线级别
        numForAverage: 12, // 多少根k线求取candleHeight

        
        // brickSize: 0.0001,
        // priorityFee: 0.0007,
        // slippage: 0.0002, // 滑点
        // B2Period: 10, // boll周期
        // B2mult: 1.5, // boll倍数
        // howManyCandle: 3, // 初始止盈
        // firstStopProfitRate: 1,// 2, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
        // firstProtectProfitRate: 0.75, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
        // firstStopLossRate: 0.5, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
        // isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
        // profitProtectRate: 0.95, //isProfitRun === 1 时生效，保留多少利润
        // howManyCandleForProfitRun: 1,
        // maxStopLossRate: 0.1, // 止损小于10%的情况，最大止损5%
        // invalidSigleStopRate: 0.3, // 止损在10%，不开单
        // double: 1, // 是否损失后加倍开仓
        // maxLossCount: 20, // 损失后加倍开仓，最大倍数
        
        brickSize: 0.0001,
        priorityFee: 0.0007, // 0.0007,
        slippage: 0.0002, // 滑点
        B2Period: 20, // boll周期
        B2mult: 2, // boll倍数
        atrPeriod: 5,
        multiplier: 2,
        baseLossRate: 0.5, // 基础止损
        howManyCandle: 6, // 止盈
        firstStopProfitRate: 2, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
        firstProtectProfitRate: 0.9, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
        firstStopLossRate: 0, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
        isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
        profitProtectRate: 0.9, //isProfitRun === 1 时生效，保留多少利润
        howManyCandleForProfitRun: 1,
        maxStopLossRate: 0.01, // 止损小于10%的情况，最大止损5%
        invalidSigleStopRate: 0.1, // 止损在10%，不开单
        double: 1, // 是否损失后加倍开仓
        maxLossCount: 20, // 损失后加倍开仓，最大倍数
    },
    // gridBot-renko-boll-test3
    '1000pepe3': {
        strategyType: "renko_boll",
        SYMBOL: "1000pepeUSDT".toLowerCase(), // 交易对
        base: "USDT",
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        klineStage: "1m", // k线级别
        numForAverage: 12, // 多少根k线求取candleHeight

        brickSize: 0.0001,
        priorityFee: 0.0007,
        slippage: 0.0002, // 滑点
        B2Period: 10, // boll周期
        B2mult: 1.5, // boll倍数
        howManyCandle: 3, // 初始止盈
        baseLossRate: 0.5,
        firstStopProfitRate: 1,// 2, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
        firstProtectProfitRate: 0.75, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
        firstStopLossRate: 0.5, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
        isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
        profitProtectRate: 0.95, //isProfitRun === 1 时生效，保留多少利润
        howManyCandleForProfitRun: 1,
        maxStopLossRate: 0.1, // 止损小于10%的情况，最大止损5%
        invalidSigleStopRate: 0.3, // 止损在10%，不开单
        double: 1, // 是否损失后加倍开仓
        maxLossCount: 20, // 损失后加倍开仓，最大倍数
    },
    '1000pepe4': {
        strategyType: "renko_boll",
        SYMBOL: "1000pepeUSDT".toLowerCase(), // 交易对
        base: "USDT",
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        klineStage: "1m", // k线级别
        numForAverage: 12, // 多少根k线求取candleHeight

        brickSize: 0.0001,
        priorityFee: 0.0007,
        slippage: 0.0002, // 滑点
        B2Period: 7, // boll周期
        B2mult: 1.5, // boll倍数
        howManyCandle: 1.5, // 止盈
        baseLossRate: 0.5,
        firstStopProfitRate: 2, // 多少个 brickSize （首次止盈，只用一次后失效）
        firstProtectProfitRate: 0.1, // 0.9, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
        firstStopLossRate: 0, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
        isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
        profitProtectRate: 1, //isProfitRun === 1 时生效，保留多少利润
        howManyCandleForProfitRun: 1,
        maxStopLossRate: 0.1, // 止损小于10%的情况，最大止损5%
        invalidSigleStopRate: 0.3, // 止损在10%，不开单
        double: 1, // 是否损失后加倍开仓
        maxLossCount: 20, // 损失后加倍开仓，最大倍数
    },
    'ada': {
        strategyType: "renko_boll",
        SYMBOL: "adaUSDT".toLowerCase(), // 交易对
        base: "USDT",
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        klineStage: "1m", // k线级别

        brickSize: 0.002,
        priorityFee: 0.0007, // 0.0007,
        slippage: 0.0002, // 滑点
        B2Period: 20, // boll周期
        B2mult: 2, // boll倍数
        atrPeriod: 5,
        multiplier: 2,
        baseLossRate: 0.5, // 基础止损
        howManyCandle: 3, // 止盈
        firstStopProfitRate: 2, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
        firstProtectProfitRate: 0.9, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
        firstStopLossRate: 0, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
        isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
        profitProtectRate: 0.9, //isProfitRun === 1 时生效，保留多少利润
        howManyCandleForProfitRun: 1,
        maxStopLossRate: 0.01, // 止损小于10%的情况，最大止损5%
        invalidSigleStopRate: 0.1, // 止损在10%，不开单
        double: 1, // 是否损失后加倍开仓
        maxLossCount: 20, // 损失后加倍开仓，最大倍数
    },
};
// [2, 4, 16, 48, 144]
// [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]
// [1, 1.5, 3, 6, 12, 24, 48, 96, 192, 384]
// [1, 1.2, 2.4, 4.8, 9.6, 19.2, 38.4, 76.8, 153.6, 307.2]
// [1, 1.1, 2.2, 4.4, 8.8, 17.6, 35.2, 70.4, 140.8, 281.6, 563.2]

module.exports = config;
