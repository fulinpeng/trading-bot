// 常量配置
const config={
	sol: {
		strategyType: 'nmacd_marsi',
		SYMBOL: "dogeUSDT".toLowerCase(), // 交易对
		base: "USDT",
		logsFolder: "logs", // 日志配置
		errorsFolder: "errors",
		availableMoney: 100, // 可用的USDT数量
		invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
		klineStage: '2h', // k线级别

		numForAverage: 12, // 多少根k线求取candleHeight
		howManyCandle: 2, // 初始止盈，盈亏比
		isProfitRun: 1, // 是否开启移动止盈
		firstProtectProfitRate: 1, // 是否开启初始止盈（到初始止盈点时，移动止损到开仓价）
		firstStopLossRate: 0.5, // 是否开启初始止损（到初始止损点时，移动动止盈到开仓价）
		profitProtectRate: 0.9, // 移动止盈，保留盈利比例
		howManyCandleForProfitRun: 0.5,
		maxStopLossRate: 0.05, // 止损小于10%的情况，最大止损5%
		invalidSigleStopRate: 0.1, // 止损在10%，不开单
		double: 1, // 是否损失后加倍开仓
		maxLossCount: 9, // 损失后加倍开仓，最大倍数
	},
};

module.exports=config;
