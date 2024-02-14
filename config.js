// 常量配置
const config = {
    bot6_1: {
        SYMBOL: "AIUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 30, // 多少个格子
        gridHight: 0.018, // 格子高度
        repeatNum: 80, // 重复到达交易点次数就重新绘制网格
        needSellPercent: 4, // 为 3 表示买反了并超过三分之一个格子就需要反手
        EMA_PERIOD: 2, // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    bot6_2: {
        SYMBOL: "BEAMXUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 30, // 多少个格子
        gridHight: 0.0011665, // 格子高度
        repeatNum: 80, // 重复到达交易点次数就重新绘制网格
        needSellPercent: 4, // 为 3 表示买反了并超过三分之一个格子就需要反手
        EMA_PERIOD: 2, // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    bot6_3: {
        SYMBOL: "POWRUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 30, // 多少个格子
        gridHight: 0.0063, // 格子高度
        repeatNum: 80, // 重复到达交易点次数就重新绘制网格
        needSellPercent: 4, // 为 3 表示买反了并超过三分之一个格子就需要反手
        EMA_PERIOD: 2, // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    // bot6_3: {
    //     SYMBOL: "SPELLUSDT".toLowerCase(), // 交易对
    //     base: "USDT",
    //     availableMoney: 6, // 可用的USDT数量
    //     invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
    //     leverage: 1, // 杠杆倍数
    //     gridCount: 30, // 多少个格子
    //     gridHight: 0.000013, // 格子高度
    //     repeatNum: 80, // 重复到达交易点次数就重新绘制网格
    //     needSellPercent: 4, // 为 3 表示买反了并超过三分之一个格子就需要反手
    //     EMA_PERIOD: 2, // EMA计算周期
    //     klineStage: 1, // k线级别
    //     logsFolder: "logs", // 日志配置
    //     errorsFolder: "errors",
    // },
    // bot6_4: {
    //     SYMBOL: "PYTHUSDT".toLowerCase(), // 交易对
    //     base: "USDT",
    //     availableMoney: 6, // 可用的USDT数量
    //     invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
    //     leverage: 1, // 杠杆倍数
    //     gridCount: 40, // 多少个格子
    //     gridHight: 0.009, // 格子高度
    //     repeatNum: 80, // 重复到达交易点次数就重新绘制网格
    //     needSellPercent: 4, // 为 3 表示买反了并超过三分之一个格子就需要反手
    //     EMA_PERIOD: 2, // EMA计算周期
    //     klineStage: 1, // k线级别
    //     logsFolder: "logs", // 日志配置
    //     errorsFolder: "errors",
    // },
    bot6_4: {
        SYMBOL: "AIUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 30, // 多少个格子
        gridHight: 0.004, // 格子高度
        repeatNum: 80, // 重复到达交易点次数就重新绘制网格
        needSellPercent: 3, // 为 3 表示买反了并超过三分之一个格子就需要反手
        // EMA_PERIOD: [2, 4], // EMA计算周期
        EMA_PERIOD: [2, 4], // EMA计算周期
        klineStage: 3, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
};

module.exports = config;
