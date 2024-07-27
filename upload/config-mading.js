// 常量配置
const config = {
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
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
        profitRate: 2,
        overNumber:17,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    "1000pepe": {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "1000pepeUSDT".toLowerCase(), // 交易对
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
        profitRate: 2,
        overNumber:17,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    alice: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "aliceUSDT".toLowerCase(), // 交易对
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
        profitRate: 2,
        overNumber:17,
        stopLossRate: 1.75, // 最好小于1
        profitProtectRate: 0.6,
        xAngle: 10,
    },
    hft: {
        howManyCandleHeight: 3,
        numForAverage: 9,
        SYMBOL: "HFTUSDT".toLowerCase(), // 交易对
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
        profitRate: 2,
        overNumber:17,
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
