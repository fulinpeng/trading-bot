// 常量配置
const config={
	'1000pepe': {
		strategyType: 'nmacd_marsi',
		SYMBOL: "1000pepeUSDT".toLowerCase(), // 交易对
		base: "USDT",
		logsFolder: "logs", // 日志配置
		errorsFolder: "errors",
		availableMoney: 100, // 可用的USDT数量
		invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
		klineStage: '3m', // 2h k线级别
		numForAverage: 12, // 多少根k线求取candleHeight/*  */

		howManyCandle: 3, // 初始止盈，盈亏比
		firstStopProfitRate: 1, // 盈亏比达到该值时止损移动到多于开盘价（首次止盈，只用一次后失效）
		firstProtectProfitRate: 0.04, // firstStopProfitRate > 0 时生效，达到首次止盈保留多少利润
		firstStopLossRate: 0.4, // 当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
		isProfitRun: 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
		profitProtectRate: 0.7, //isProfitRun === 1 时生效，保留多少利润
		howManyCandleForProfitRun: 0.1,
		maxStopLossRate: 0.03, // 止损小于10%的情况，最大止损5%
		invalidSigleStopRate: 0.1, // 止损在10%，不开单
		double: 1, // 是否损失后加倍开仓
		maxLossCount: 20, // 损失后加倍开仓，最大倍数
		NMACD_PARAMS: {sma: 13, lma: 21, tsp: 9, np: 50, type: 1},
		MA_RSI_PARAMS: {rsiLength: 21, smaLength: 55},
		SMA_PERIOD: 15,
	},
	troy: {
		strategyType: 'nmacd_marsi',
		SYMBOL: "troyUSDT".toLowerCase(), // 交易对
		base: "USDT",
		logsFolder: "logs", // 日志配置
		errorsFolder: "errors",
		availableMoney: 100, // 可用的USDT数量
		invariableBalance: true, // 是否使用固定金额建仓，为true时，availableMoney为必填
		klineStage: '1m',// '2h', // k线级别

		numForAverage: 12, // 多少根k线求取candleHeight
		howManyCandle: 2, // 初始止盈，盈亏比
		isProfitRun: 1, // 是否开启移动止盈
		firstStopProfitRate: 1, // 是否开启初始止盈(比例基于止损)（到初始止盈点时，移动止损到开仓价）
		firstStopLossRate: 0.5, // 是否开启初始止损（到初始止损点时，移动止盈到开仓价）
		profitProtectRate: 0.9, // 移动止盈，保留盈利比例
		howManyCandleForProfitRun: 0.5,
		maxStopLossRate: 0.05, // 止损小于10%的情况，最大止损5%
		invalidSigleStopRate: 0.1, // 止损在10%，不开单
		double: 1, // 是否损失后加倍开仓
		maxLossCount: 9, // 损失后加倍开仓，最大倍数
		NMACD_PARAMS: {sma: 13, lma: 21, tsp: 9, np: 50, type: 1},
		MA_RSI_PARAMS: {rsiLength: 21, smaLength: 55},
		SMA_PERIOD: 15,
	},
};

module.exports=config;
