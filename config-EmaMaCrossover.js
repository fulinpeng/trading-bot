// 常量配置
const config = {
    doge: {
        strategyType: "EmaMaCrossover",
        SYMBOL: "dogeUSDT".toLowerCase(), // 交易对
        base: "USDT",
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        availableMoney: 100, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        klineStage: "3m", // 1h', // k线级别

        numForAverage: 12,
        howManyCandle: 4.2, // 初始止盈，盈亏比
        firstStopProfitRate: 1.2, // 是否开启初始止盈(比例基于止损)（到初始止盈点时，移动止损到开仓价）
        firstProtectProfitRate: 0.1, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
        firstStopLossRate: 0.8, //  当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
        isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
        profitProtectRate: 0.95, // 移动止盈，保留盈利比例
        howManyCandleForProfitRun: 0.1,
        maxStopLossRate: 0.05, // 止损小于10%的情况，最大止损5%
        invalidSigleStopRate: 0.1, // 止损在10%，不开单
        double: 1, // 是否损失后加倍开仓
        maxLossCount: 20, // 损失后加倍开仓，最大倍数
        emaPeriod: 10,
        smaPeriod: 10,
        rsiPeriod: 14,
    },
};

module.exports = config;
