// 常量配置
const config = {
    uni: {
        SYMBOL: "uniUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 1, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    wld: {
        SYMBOL: "wldUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    doge: {
        SYMBOL: "dogeUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 2.5,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 15, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 12, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    fil: {
        SYMBOL: "filUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    avax: {
        SYMBOL: "avaxUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    people: {
        SYMBOL: "peopleUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 5,
        availableMoney: 10, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 12, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 90, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: true,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 1,
        model1: {
            timeDis: 1,
            profit: 2.1,
        },
        model2: {
            priceDis: 0.002,
            profit: 0.5,
        },
    },
    bome: {
        SYMBOL: "bomeUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 25, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 20, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    inj: {
        SYMBOL: "injUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    ordi: {
        SYMBOL: "ordiUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    eth: {
        SYMBOL: "ethUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    btc: {
        SYMBOL: "btcUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    op: {
        SYMBOL: "opUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    ygg: {
        SYMBOL: "yggUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    arb: {
        SYMBOL: "arbUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    aevo: {
        SYMBOL: "aevoUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    om: {
        SYMBOL: "omUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    sol: {
        SYMBOL: "solUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    wif: {
        SYMBOL: "wifUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    blur: {
        SYMBOL: "blurUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    // zk: {
    //     SYMBOL: "zkUSDT".toLowerCase(), // 交易对
    //     base: "USDT",
    //     howManyCandleHeight: 2.5,
    //     availableMoney: 7, // 可用的USDT数量
    //     diff: 2,
    //     profitRate: 10000,
    //     overNumberToRest: 12, // 多少次对冲后去休息
    //     howManyNumForAvarageCandleHight: 180, //9, // 通过多少个k线来计算 candleHight
    //     klineStage: 1, // k线级别
    //     invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
    //     nextBig: false, // 下一次开大仓

    //     maPeriod: 60, // ma 指标开单
    //     BBK_PERIOD: 100,
    //     RSI_PERIOD: 60,
    //     B2mult: 1,
    //     Kmult: 1.5, // 1.5
    //     judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
    //     logsFolder: "logs", // 日志配置
    //     errorsFolder: "errors",
    isScale: false,
    scaleOverNum: 20,
    scaleHight: 3,
    modelType: 2,
    model1: {
        timeDis: 180,
        profit: 1,
    },
    model2: {
        priceDis: 0.01,
        profit: 2,
    },
    // },
    zk: {
        SYMBOL: "zkUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 0.3, //2.5,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000, // 6,
        overNumberToRest: 4, // 12, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 180, //9, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填    //
        nextBig: false, // 下一次开大仓
        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    "1000pepe": {
        SYMBOL: "1000pepeUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 5,
        availableMoney: 10, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 15, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 90, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 1,
        model1: {
            timeDis: 1,
            profit: 1.5,
        },
        model2: {
            priceDis: 0.001,
            profit: 1.5,
        },
    },
    alice: {
        SYMBOL: "aliceUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    hft: {
        SYMBOL: "hftUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 10, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 100, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    bigtime: {
        SYMBOL: "bigtimeUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 16, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 20, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    beamx: {
        SYMBOL: "beamxUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 17, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 20, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    iotx: {
        SYMBOL: "iotxUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 16, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 14, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    zeta: {
        SYMBOL: "zetaUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 18, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 20, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    t: {
        SYMBOL: "tUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 6,
        availableMoney: 7, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 23, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 180, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    rare: {
        SYMBOL: "rareUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3,
        availableMoney: 10, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 23, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 180, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 2,
        },
    },
    token: {
        SYMBOL: "tokenUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 4,
        availableMoney: 10, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 23, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 180, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.01,
            profit: 1,
        },
    },
    trx: {
        SYMBOL: "trxUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 3.1,
        availableMoney: 10, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 23, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 180, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓

        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.005,
            profit: 0.7,
        },
    },
    matic: {
        SYMBOL: "maticUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 4,
        availableMoney: 10, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 23, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 180, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓
        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 2,
        model1: {
            timeDis: 180,
            profit: 1,
        },
        model2: {
            priceDis: 0.005,
            profit: 0.5,
        },
    },
    "1000floki": {
        SYMBOL: "1000flokiUSDT".toLowerCase(), // 交易对
        base: "USDT",
        howManyCandleHeight: 4,
        availableMoney: 10, // 可用的USDT数量
        diff: 2,
        profitRate: 10000,
        overNumberToRest: 23, // 多少次对冲后去休息
        howManyNumForAvarageCandleHight: 90, // 通过多少个k线来计算 candleHight
        klineStage: 1, // k线级别
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        nextBig: false, // 下一次开大仓
        maPeriod: 60, // ma 指标开单
        BBK_PERIOD: 100,
        RSI_PERIOD: 60,
        B2mult: 1,
        Kmult: 1.5, // 1.5
        judgeByBBK: false, //  true false; 根据bbk指标来开单 ⭐️
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        isScale: false,
        scaleOverNum: 20,
        scaleHight: 3,
        modelType: 1,
        model1: {
            timeDis: 1,
            profit: 2,
        },
        model2: {
            priceDis: 0.005,
            profit: 0.5,
        },
    },
};
// [2, 4, 16, 48, 144]
// [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]
// [1, 1.5, 3, 6, 12, 24, 48, 96, 192, 384]
// [1, 1.2, 2.4, 4.8, 9.6, 19.2, 38.4, 76.8, 153.6, 307.2]
// [1, 1.1, 2.2, 4.4, 8.8, 17.6, 35.2, 70.4, 140.8, 281.6, 563.2]module.exports = config;

module.exports = config;
