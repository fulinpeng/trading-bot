// 常量配置
const config = {
    sol: {
        SYMBOL: "solUSDT".toLowerCase(), // 交易对
        base: "USDT",
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        availableMoney: 10000, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        klineStage: '15m', // k线级别
        howManyCandle: 3,
        numForAverage: 12, // 多少根k线求取candleHeight
        invalidNumber: 100, // 多少根k线后多空信号失效
        isProfitRun: 1, // 0为false， 1为true
        profitProtectRate: 0.9, // 允许盈利回撤比例
        howManyCandleForProfitRun: 0.5, // 移动止盈时，增加多少个candleHeight
        fastPeriod: 12, // ema快线 PERIOD
    },
};

module.exports = config;
