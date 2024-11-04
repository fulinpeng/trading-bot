// 引入 Mongoose 库
const mongoose = require('mongoose');
const winston = require('winston'); // 日志记录

// 配置日志记录
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'database.log' })
  ]
});

// MongoDB 连接
async function connectMongoDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/tradingBot', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      poolSize: 5,
      serverSelectionTimeoutMS: 5000
    });
    logger.info("已成功连接到 MongoDB！");
  } catch (error) {
    logger.error("连接 MongoDB 失败:", error);
    process.exit(1);
  }
}

// 动态生成模型的函数，仅在机器人启动时调用
function createModel(strategy, symbol, schemaDefinition) {
  // 生成模型名称
  const modelName = `${strategy}_${symbol}`;

  // 创建自定义的 Schema
  const tradingDataSchema = new mongoose.Schema({
    ...schemaDefinition,
    timestamp: { type: Date, default: Date.now, index: true }
  });

  // 为模型 Schema 添加索引
  tradingDataSchema.index({ timestamp: -1 });

  // 返回模型实例
  return mongoose.model(modelName, tradingDataSchema, modelName);
}

// 机器人类
class TradingBot {
  constructor(strategy, symbol, schemaDefinition) {
    this.strategy = strategy;
    this.symbol = symbol;
    // 使用 createModel 创建模型实例
    this.Model = createModel(strategy, symbol, schemaDefinition);
  }

  // 保存交易数据到当前机器人对应的模型中
  async saveTradingData(data) {
    try {
      const tradingData = new this.Model(data);
      await tradingData.save();
      logger.info(`交易数据已保存到 ${this.strategy} 策略的 ${this.symbol} 交易对中`);
    } catch (error) {
      logger.error(`保存交易数据失败 [${this.strategy}/${this.symbol}]:`, error);
    }
  }

  // 获取最新的交易数据
  async loadLatestTradingData() {
    try {
      const latestData = await this.Model.findOne().sort({ timestamp: -1 });
      return latestData || {};
    } catch (error) {
      logger.error(`读取交易数据失败 [${this.strategy}/${this.symbol}]:`, error);
      return {};
    }
  }
}

module.exports = {
    connectMongoDB,
    TradingBot
};
