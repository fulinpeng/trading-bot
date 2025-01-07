// 常量配置
const config={
	doge: {
		strategyType: 'highesthigh-lowestLow',
		SYMBOL: "dogeUSDT".toLowerCase(), // 交易对
		base: "USDT",
		logsFolder: "logs", // 日志配置
		errorsFolder: "errors",
		availableMoney: 100, // 可用的USDT数量
		invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
		klineStage: '5m', // k线级别

		numForAverage: 12,
		emaPeriod: 60,
		basePeriod: 15,
		stopLossRatio: 6, // 6
		stopProfitRatio: 12, // 10
		// howManyCandle: 5, // 止盈，盈亏比(该策略不用此参数)
		isProfitRun: 1, // 是否开启移动止盈
		firstProtectProfitRate: 3, // 是否开启初始止盈(比例基于止损)（到初始止盈点时，移动止损到开仓价）
		firstStopLossRate: 0.6, // 是否开启初始止损（到初始止损点时，移动止盈到开仓价）
		profitProtectRate: 0.7, // 移动止盈，保留盈利比例
		howManyCandleForProfitRun: 0.5,
		maxStopLossRate: 0.05, // 止损小于10%的情况，最大止损5%
		invalidSigleStopRate: 0.1, // 止损在10%，不开单
		double: 1, // 是否损失后加倍开仓
		maxLossCount: 9, // 损失后加倍开仓，最大倍数
	},
};

module.exports=config;
