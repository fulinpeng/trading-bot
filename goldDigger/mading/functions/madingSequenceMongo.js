const { connectMongoDB, TradingBot, initDataBaceLogs } = require("../../../mongoDB/saveGlobalVariables");

const madingSequenceMongo = async () => {
    // 连接到 MongoDB
    await connectMongoDB();

    // 示例数据
    const strategy = "mading-sequence"; // 策略名称
    const schema = {
        currentPrice: { type: Number, required: true },
        prePrice: { type: Number, required: true },
        curGridPoint: { type: Number, required: true },
        prePointIndex: { type: Number, required: true },
        currentPointIndex: { type: Number, required: true },
        tradingDatas: { type: Object, required: true },
        tradingInfo: { type: Object, required: true },
        gridPoints: { type: Array, required: true },
        candleHeight: { type: Number, required: true },
        gridHight: { type: Number, required: true },
        hasOrder: { type: Boolean, required: true },
        isResting: { type: Boolean, required: true },
        nextTimeBig: { type: Boolean, required: true },
        s_money: { type: Array, required: true },
        s_count: { type: Number, required: true },
        s_prePrice: { type: Number, required: true },
    };
    const botData = new TradingBot(strategy, schema); // 创建机器人数据实例
    
    return botData
};

module.exports = {madingSequenceMongo, initDataBaceLogs};
