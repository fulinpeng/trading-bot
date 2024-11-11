// 引入 Mongoose 库
const mongoose = require("mongoose");
const winston = require("winston"); // 日志记录
const { getDate } = require("../common/functions.js");

const path = require("path");

// 配置日志记录
let logger = null;
function initDataBaceLogs(symbol) {
    const logPath = path.join(`logs/database/${symbol}-${getDate()}.js`);
    logger = winston.createLogger({
        transports: [new winston.transports.Console(), new winston.transports.File({ filename: logPath })],
    });
}

// MongoDB 连接
async function connectMongoDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
        });
        logger.info("已成功连接到 MongoDB！");
    } catch (error) {
        logger.error("连接 MongoDB 失败:", error);
        process.exit(1);
    }
}

// 动态生成模型的函数，在机器人启动时调用
function createModel(strategy, schema) {
    // 使用策略名称作为集合名称
    const modelName = strategy;

    // 创建自定义的 Schema
    const tradingDataSchema = new mongoose.Schema({
        symbol: { type: String, required: true }, // 每个交易对的标识符
        data: schema, // 交易数据
        timestamp: { type: Date, default: Date.now, index: true },
    });

    // 为模型 Schema 添加降序索引
    tradingDataSchema.index({ timestamp: 1 });

    // 返回模型实例
    return mongoose.model(modelName, tradingDataSchema, modelName);
}

// 机器人类
class TradingBot {
    constructor(strategy, schema) {
        this.strategy = strategy;
        // 使用 createModel 创建模型实例
        this.Model = createModel(strategy, schema);
    }

    // 保存交易数据到当前策略对应的集合中
    async saveTradingData(symbol, data) {
        try {
            await this.Model.findOneAndUpdate(
                { symbol: symbol }, // 查询条件
                { $set: { data } }, // 更新的数据内容
                { upsert: true, new: true }, // 有则更新，无则插入
            );
            logger.info(`交易数据已保存到 ${this.strategy} 策略的 ${symbol} 交易对中`);
        } catch (error) {
            logger.error(`保存交易数据失败 [${this.strategy}/${symbol}]:`, error);
        }
    }

    // 获取某个 symbol 的最新交易数据
    async loadLatestTradingData(symbol) {
        try {
            const latestData = await this.Model.findOne({ symbol }).sort({ timestamp: -1 }).lean();

            if (latestData) {
                return latestData.data || null;
            } else {
                return null;
            }
        } catch (error) {
            logger.error(`读取交易数据失败 [${this.strategy}/${symbol}]:`, error);
            return null;
        }
    }
}

module.exports = {
    connectMongoDB,
    TradingBot,
    initDataBaceLogs,
};
