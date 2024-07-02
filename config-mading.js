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
        maxRepeatNum: 80, // 重复到达交易点次数就重新绘制网格
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
        maxRepeatNum: 80, // 重复到达交易点次数就重新绘制网格
        needSellPercent: 4, // 为 3 表示买反了并超过三分之一个格子就需要反手
        EMA_PERIOD: 2, // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    bot6_3: {
        SYMBOL: "ARKMUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 30, // 多少个格子
        gridHight: 0.004, // 格子高度
        maxRepeatNum: 80, // 重复到达交易点次数就重新绘制网格
        needSellPercent: 3, // 为 3 表示买反了并超过三分之一个格子就需要反手
        EMA_PERIOD: [2, 4], // EMA计算周期
        // EMA_PERIOD: [9, 10], // EMA计算周期
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
    //     maxRepeatNum: 80, // 重复到达交易点次数就重新绘制网格
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
    //     maxRepeatNum: 80, // 重复到达交易点次数就重新绘制网格
    //     needSellPercent: 4, // 为 3 表示买反了并超过三分之一个格子就需要反手
    //     EMA_PERIOD: 2, // EMA计算周期
    //     klineStage: 1, // k线级别
    //     logsFolder: "logs", // 日志配置
    //     errorsFolder: "errors",
    // },
    bot6_4: {
        SYMBOL: "AGIXUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 30, // 多少个格子
        gridHight: 0.004, // 格子高度
        maxRepeatNum: 80, // 重复到达交易点次数就重新绘制网格
        needSellPercent: 3, // 为 3 表示买反了并超过三分之一个格子就需要反手
        EMA_PERIOD: [2, 4], // EMA计算周期
        // EMA_PERIOD: [9, 10], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    bot6_6: {
        // SYMBOL: "AIUSDT".toLowerCase(), // 交易对
        SYMBOL: "BLURUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.022, // 格子高度
        // gridHight: 0.002, // 格子高度
        maxRepeatNum: 80, // 重复到达交易点次数就重新绘制网格
        orderCountLimit: 4, // 同时存在多少订单时全平仓
        EMA_PERIOD: [2, 4], // EMA计算周期
        // EMA_PERIOD: [9, 10], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    bot6_7: {
        // SYMBOL: "AIUSDT".toLowerCase(), // 交易对
        SYMBOL: "BLURUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        // gridHight: 0.022, // 格子高度
        gridHight: 0.007, // 格子高度
        maxRepeatNum: 80, // 重复到达交易点次数就重新绘制网格
        orderCountLimit: 4, // 同时存在多少订单时全平仓
        EMA_PERIOD: [2, 4], // EMA计算周期
        // EMA_PERIOD: [9, 10], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    bot6_8: {
        // SYMBOL: "JASMYUSDT".toLowerCase(), // 交易对
        SYMBOL: "BLURUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        // gridHight: 0.0003, // 格子高度
        gridHight: 0.004, // 格子高度
        maxRepeatNum: 80, // 重复到达交易点次数就重新绘制网格
        orderCountLimit: 4, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第三个交易点时全平仓
        EMA_PERIOD: [2, 4], // EMA计算周期
        // EMA_PERIOD: [9, 10], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    bot6_9: {
        // SYMBOL: "JASMYUSDT".toLowerCase(), // 交易对
        SYMBOL: "BLURUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        // gridHight: 0.0003, // 格子高度
        gridHight: 0.0018, // 格子高度
        maxRepeatNum: 20, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 5, // 跨到第5个交易点时全平仓
        EMA_PERIOD: [7, 14], // EMA计算周期
        // EMA_PERIOD: [9, 10], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    bot6_10: {
        // SYMBOL: "DOGEUSDT".toLowerCase(), // 交易对
        SYMBOL: "CKBUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        // gridHight: 0.00014, // 格子高度
        gridHight: 0.000618, // 格子高度
        maxRepeatNum: 20, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 5, // 跨到第5个交易点时全平仓
        EMA_PERIOD: [2, 3], // EMA计算周期
        // EMA_PERIOD: [9, 10], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    bot6_11: {
        SYMBOL: "GALAUSDT".toLowerCase(), // 交易对
        // SYMBOL: "CKBUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        // gridHight: 0.00014, // 格子高度
        gridHight: 0.0005, // 格子高度
        maxRepeatNum: 20, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第5个交易点时全平仓
        EMA_PERIOD: [2, 3], // EMA计算周期
        // EMA_PERIOD: [9, 10], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    bot6_12: {
        // SYMBOL: "MEMEUSDT".toLowerCase(), // 交易对
        // SYMBOL: "GALAUSDT".toLowerCase(), // 交易对
        // SYMBOL: "CKBUSDT".toLowerCase(), // 交易对
        // SYMBOL: "JOEUSDT".toLowerCase(), // 交易对
        // SYMBOL: "BLURUSDT".toLowerCase(), // 交易对
        // SYMBOL: "MATICUSDT".toLowerCase(), // 交易对
        // SYMBOL: "SUIUSDT".toLowerCase(), // 交易对
        SYMBOL: "SLPUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        // gridHight: 0.0006, // 格子高度
        // gridHight: 0.0046, // 格子高度
        gridHight: 0.00016, // 格子高度
        maxRepeatNum: 20, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [2, 3], // EMA计算周期
        // EMA_PERIOD: [9, 10], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
    },
    bot6_13: {
        // SYMBOL: "MEMEUSDT".toLowerCase(), // 交易对
        // SYMBOL: "GALAUSDT".toLowerCase(), // 交易对
        // SYMBOL: "CKBUSDT".toLowerCase(), // 交易对
        // SYMBOL: "JOEUSDT".toLowerCase(), // 交易对
        // SYMBOL: "BLURUSDT".toLowerCase(), // 交易对
        // SYMBOL: "MATICUSDT".toLowerCase(), // 交易对
        // SYMBOL: "SUIUSDT".toLowerCase(), // 交易对
        howManyCandleHeight: 3,
        SYMBOL: "YGGUSDT".toLowerCase(), // 交易对
        // SYMBOL: "MANTAUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 6, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        // gridHight: 0.0006, // 格子高度
        // gridHight: 0.0046, // 格子高度
        // gridHight: 0.001, // 格子高度 DOGEUSDT
        minGridHight: 0.006, // 格子高度 YGGUSDT
        // gridHight: 0.00442, // 格子高度
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [2, 4], // EMA计算周期
        // EMA_PERIOD: [9, 10], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 1.2, 2.4, 4.8, 9.6, 19.2, 38.4, 76.8, 153.6, 307.2], // [1, 2, 4, 8, 16, 32, 64, 128]
        profitRate: 1.5,
        overNumber: 4,
    },
    uni: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "UNIUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        backIndex: 99,
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    wld: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "WLDUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    doge: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "DOGEUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    fil: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "FILUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    avax: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "AVAXUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    people: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "peopleUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    inj: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "injUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    ordi: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "ordiUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    eth: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "ethUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    btc: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "btcUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    op: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "opUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    ygg: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "yggUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    arb: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "arbUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    aevo: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "aevoUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    om: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "omUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    sol: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "solUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.0012, // 格子高度 DOGEUSDT
        minGridHight: 0.0001, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.0003,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    wif: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "wifUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.005, // 格子高度 DOGEUSDT
        minGridHight: 0.01, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.02,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    blur: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "BLURUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.005, // 格子高度 DOGEUSDT
        minGridHight: 0.01, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.02,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    zk: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "zkUSDT".toLowerCase(), // 交易对
        base: "USDT",
        availableMoney: 10, // 可用的USDT数量
        invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
        leverage: 1, // 杠杆倍数
        gridCount: 24, // 多少个格子
        gridHight: 0.005, // 格子高度 DOGEUSDT
        minGridHight: 0.01, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        maxGridHight: 0.02,
        // minGridHight: 0.0014, // 格子高度 DOGEUSDT 0.16 ，格子高度小为 0.001 / (1 - 0.0005) * currentPrice ==> 0.00016 才能覆盖手续费
        // maxGridHight: 0.0028,
        maxRepeatNum: 10, // 重复到达交易点次数就重新绘制网格
        mixReversetime: 3 * 60 * 1000, // 最短反手时间
        orderCountLimit: 5, // 同时存在多少订单时全平仓
        acrossPointLimit: 4, // 跨到第4个交易点时全平仓
        EMA_PERIOD: [6, 14], // EMA计算周期
        klineStage: 1, // k线级别
        logsFolder: "logs", // 日志配置
        errorsFolder: "errors",
        times: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], //
        profitRate: 1.5,
        overNumber: 4,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
};
// [2, 4, 16, 48, 144]
// [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]
// [1, 1.5, 3, 6, 12, 24, 48, 96, 192, 384]
// [1, 1.2, 2.4, 4.8, 9.6, 19.2, 38.4, 76.8, 153.6, 307.2]
// [1, 1.1, 2.2, 4.4, 8.8, 17.6, 35.2, 70.4, 140.8, 281.6, 563.2]

module.exports = config;
