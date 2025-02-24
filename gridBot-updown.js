// 版本5
require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
// const sendMail=require("./mailer.js");
const axios=require("axios"); // HTTP请求库
const crypto=require("crypto"); // 加密模块
const WebSocket=require("ws"); // WebSocket库
// const { HttpsProxyAgent } = require("https-proxy-agent");
// const { SocksProxyAgent } = require("socks-proxy-agent");
const fs=require("fs");
const {getDate, hasUpDownVal, getLastFromArr, getSequenceArr}=require("./utils/functions.js");
// const {calculateSimpleMovingAverage}=require("./utils/ma.js");
const {calculateATR}=require("./utils/atr.js");
const {calculateIndicators}=require("./utils/superTrend");
const config=require("./config-updown.js");
const {
	calculateCandleHeight,
	isBigLine,
	isBigAndYang,
	isBigAndYin,
	isBreakPreHigh,
	isBreakPreLow,
	isCross,
	isUpCross,
	isDownCross,
	isTopFractal,
	isBottomFractal,
	isDownLinesGroup2,
	isUpLinesGroup2,
	isDownLinesGroup3,
	isUpLinesGroup3,
	isDownSwallow,
	isUpSwallow,
	isBreakDown,
	isBreakUp,
	isDownStar,
	isUpStar,
	isHigherHigh,
	isLowerLow,
	isK1Swallow,
	isFourUp,
	isFourDown,
	downPao,
	upPao,
	isDownMa,
	isUpMa,
	isUpMacd,
	isDownMacd,
	isAllDownTail,
	isAllUpTail,
}=require("./utils/kLineTools");

let testMoney=0;

let {
	strategyType,
	SYMBOL,
	base,
	availableMoney: DefaultAvailableMoney,
	invariableBalance,
	klineStage,
	logsFolder,
	errorsFolder,
	demaShortPeriod,
	demaLongPeriod,
	atrPeriod,
	multiplier, // doge 5 / pepe 6
	numForAverage, // 多少根k线求取candleHeight
	howManyCandle, // 初始止盈，盈亏比
}=config["doge"];

let availableMoney=DefaultAvailableMoney
let maxAvailableMoney=0;

// 环境变量
const B_SYMBOL=SYMBOL.toUpperCase();
const isTest=false; // 将此标志设置为  false/true 使用沙盒环境
const api="https://api.binance.com/api";
const fapi="https://fapi.binance.com/fapi";
const apiKey=process.env.BINANCE_API_KEY; // 获取API密钥
const secretKey=process.env.BINANCE_API_SECRET; // 获取API密钥的密钥

console.log(isTest? "测试环境～～～":"正式环境～～～");

// mac clash
// let httpProxyAgent=new HttpsProxyAgent("http://127.0.0.1:7892");
// let socksProxyAgent=new SocksProxyAgent("socks5://127.0.0.1:7891");

// win clash
// let httpProxyAgent=new HttpsProxyAgent("http://127.0.0.1:7890");
// let socksProxyAgent=new SocksProxyAgent("socks5://127.0.0.1:7890");

// mac 小地球仪
// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:31550");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:31550");

// win 小地球仪
// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:15715");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:15715");

// v2ray
// let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:10809");
// let socksProxyAgent = new SocksProxyAgent("socks5://127.0.0.1:10808");

// const binance = new Binance().options({
//     APIKEY: apiKey,
//     APISECRET: secretKey,
//     // test: true,
//     family: 0,
//     recvWindow: 6000,
//     useServerTime: false, // 如果你的机器时间不准确，可以设置为 false
// });

// 创建公用的 Axios 实例
const axiosInstance=axios.create({
	// baseURL: "https://api.example.com", // 请替换为实际的 API 地址
	headers: {
		"Content-Type": "application/json",
		"X-MBX-APIKEY": apiKey,
	},
	// httpsAgent: httpProxyAgent, // 设置 SOCKS5 代理
});






/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 初始化参数
const n=3; // 计算极值的 K 线数量
const diff=2;
const times=getSequenceArr(diff, 100);
const initialSize=DefaultAvailableMoney; // 初始每次开仓100u
const addSize=(n) => times[n] // 每次加仓10u
const profitTarget=0; // 目标浮盈，单位为U
const isLongOpen=false;
const isShortOpen=true;
let longPositions=[]
let shortPositions=[]
let maxHigh=0
let minLow=0
let maxLongSize=0;
let maxShortSize=0;

// 模拟获取历史数据并计算极值
function getMarketData(candles) {
	try {
		const highs=candles.map(candle => (candle.high));
		const lows=candles.map(candle => (candle.low));

		// 计算最大值和最小值
		const maxHigh=Math.max(...highs);
		const minLow=Math.min(...lows);

		return {maxHigh, minLow};
	} catch (error) {
		console.error('Error fetching market data:', error);
		return {maxHigh: null, minLow: null};
	}
}

// 计算浮动盈亏
function calcLongPositionsProfit(currentPrice, longPositions) {
	return longPositions.reduce((sum, {price: orderPrice, quantity}) => {
		return sum+(currentPrice-orderPrice)*quantity-quantity*(orderPrice+currentPrice)*0.0007
	}, 0)
}
function calcShortPositionsProfit(currentPrice, shortPositions) {
	return shortPositions.reduce((sum, {price: orderPrice, quantity}) => {
		return sum+(orderPrice-currentPrice)*quantity-quantity*(orderPrice+currentPrice)*0.0007
	}, 0)
}
// 平多单
async function closeLongPositions(currentPrice, totalProfit) {
	let totalQuantity=longPositions.reduce((sum, {quantity}) => {
		return sum+quantity
	}, 0)
	await closeOrder("SELL", totalQuantity, () => {
		longPositions=[];
		testMoney+=totalProfit
		console.log("平多 gridPointClearTrading ~ currentPrice testMoney:", currentPrice, testMoney);
		console.log("平多完成");
	});
}
// 平空单
async function closeShortPositions(currentPrice, totalProfit) {
	let totalQuantity=shortPositions.reduce((sum, {quantity}) => {
		return sum+quantity
	}, 0)
	await closeOrder("BUY", totalQuantity, () => {
		shortPositions=[]
		testMoney+=totalProfit
		console.log("平空 gridPointClearTrading ~ currentPrice testMoney:", currentPrice, testMoney);
		console.log("平空完成");
	});
}

// 执行交易：开仓、加仓
async function executeTrade(_candles, curkLine) {
	try {
		const {open, close, openTime, closeTime, low, high}=curkLine;
		const price=close;
		let candles=getLastFromArr(_candles.slice(0, -1), n);

		// 初始化时开多仓和空仓
		if (isLongOpen&&longPositions.length===0) {
			let quantity=getQuantity(initialSize, price);
			await teadeBuy(quantity);
			// 开多仓
			longPositions.push({
				price,
				quantity,
			})
			availableMoney=initialSize
			// 重置 maxHigh minLow
			const value=getMarketData(candles);
			// maxHigh=value.maxHigh
			minLow=value.minLow
			console.log("🚀 ~ executeTrade ~ 开多仓 close, initialSize, availableMoney, minLow:", close, initialSize, availableMoney, minLow)
		}
		if (isShortOpen&&shortPositions.length===0) {
			let quantity=getQuantity(initialSize, price);
			await teadeSell(quantity);
			// 开空仓
			shortPositions.push({
				price,
				quantity,
			})
			availableMoney=initialSize
			// 重置 maxHigh minLow
			const value=getMarketData(candles);
			maxHigh=value.maxHigh
			// minLow=value.minLow
			console.log("🚀 ~ executeTrade ~ 开空仓 close, initialSize, availableMoney, maxHigh:", close, initialSize, availableMoney, maxHigh)
		}

		// 多仓加仓
		if (isLongOpen&&longPositions.length>0&&price<minLow) {
			let size=addSize(longPositions.length)
			if (size>maxLongSize) maxLongSize=size;
			let quantity=getQuantity(size, price);
			await teadeBuy(quantity);
			longPositions.push({
				price,
				quantity,
			})
			if (availableMoney+size>maxAvailableMoney) maxAvailableMoney=availableMoney+size
			availableMoney+=size
			if (close<minLow) minLow=low; // close
			console.log("🚀 ~ executeTrade ~ 多仓加仓, close, size, minLow:", close, size, minLow)
		}

		// 空仓加仓
		if (isShortOpen&&shortPositions.length>0&&price>maxHigh) {
			let size=addSize(shortPositions.length)
			if (size>maxShortSize) maxShortSize=size;
			let quantity=getQuantity(size, price);
			await teadeSell(quantity);
			shortPositions.push({
				price,
				quantity,
			})
			if (availableMoney+size>maxAvailableMoney) maxAvailableMoney=availableMoney+size
			availableMoney+=size
			if (close>maxHigh) maxHigh=high; // close
			console.log("🚀 ~ executeTrade ~ 空仓加仓, close, size, minLow:", close, size, maxHigh)
		}

	} catch (error) {
		console.error('Error executing trade:', error);
	}
}


// /////////////////////////////////////////////////////////////////////////////////

// WebSocket连接，用于获取实时交易信息
// const ws = new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}`, { agent: socksProxyAgent });
const ws=new WebSocket(`wss://fstream.binance.com/ws/${SYMBOL}@kline_${klineStage}`);

// 全局变量
let kLineData=[];
let currentPrice=0; // 记录当前价格
let prePrice=0; // 记录当前价格的前一个
let candleHeight=0; // 蜡烛高度

// 以下参数会在程序启动时初始化
let historyClosePrices=[]; // 历史收盘价，用来计算EMA
let serverTimeOffset=0; // 服务器时间偏移
let allPositionDetail={}; // 当前仓位信息

let superTrendArr=[]

const maxKLinelen=500; // 储存kLine最大数量
// 日志
let logStream=null;
let errorStream=null;

// loading
let loadingPlaceOrder=false; // 下单
let loadingCloseOrder=false; // 平仓
let onGridPoint=false; // 网格上
let loadingInit=false;
let isOrdering=false; // 是否在收盘后的计算中
let isJudgeFirstProfit=false;

const isLoading=() => {
	return (
		loadingInit||
		isOrdering||
		isJudgeFirstProfit||
		loadingPlaceOrder||
		loadingCloseOrder||
		onGridPoint
	);
};

// 获取服务器时间偏移
const getServerTimeOffset=async () => {
	try {
		console.log("获取服务器时间偏移");
		const response=await axiosInstance.get(`${api}/v3/time`);
		const serverTime=response.data.serverTime;
		const localTime=Date.now();
		serverTimeOffset=serverTime-localTime;
		console.log(" Server time offset:", serverTimeOffset);
	} catch (error) {
		console.error(
			"getServerTimeOffset header::",
			error&&error.request? error.request._header:null,
			" error::",
			error&&error.response? error.response.data:error,
		);
		process.exit(1);
	}
};

// 签名请求
const signRequest=(params) => {
	const timestamp=Date.now()+serverTimeOffset;
	const queryString=Object.entries({...params, timestamp})
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join("&");
	const signature=crypto.createHmac("sha256", secretKey).update(queryString).digest("hex");
	return `${queryString}&signature=${signature}`;
};

// 获取K线数据
const getKLineData=async (symbol, interval, limit) => {
	try {
		const response=await axios.get(`${fapi}/v1/klines`, {
			params: {
				symbol,
				interval,
				limit,
			},
		});

		let ks=response.data||[];

		// 此时间未收盘
		if (ks[ks.length-1][6]>Date.now()) {
			ks.pop();
		}
		// 解析K线数据
		return ks.map((item) => ({
			openTime: getDate(item[0]), // 开盘时间
			open: parseFloat(item[1]), // 开盘价
			high: parseFloat(item[2]), // 最高价
			low: parseFloat(item[3]), // 最低价
			close: parseFloat(item[4]), // 收盘价(当前K线未结束的即为最新价)
			volume: parseFloat(item[5]), // 成交量
			closeTime: getDate(item[6]), // 收盘时间
			quoteAssetVolume: parseFloat(item[7]), // 成交额
			numberOfTrades: item[8], // 成交笔数
			takerBuyBaseAssetVolume: parseFloat(item[9]), // 主动买入成交量
			takerBuyQuoteAssetVolume: parseFloat(item[10]), // 主动买入成交额
		}));
	} catch (error) {
		console.error(
			"getKLineData header::",
			error&&error.request? error.request._header:null,
			" error::",
			error&&error.response? error.response.data:error,
		);
		process.exit(1);
	}
};

const setCandleHeight=() => {
	candleHeight=calculateCandleHeight(getLastFromArr(kLineData, numForAverage));
	// console.log("计算出实际蜡烛高度 candleHeight:", candleHeight);
};
// 获取收盘价
const getHistoryClosePrices=async () => {
	// 在getKLineData方法中获取至少15分钟内的价格数据
	kLineData=await getKLineData(B_SYMBOL, `${klineStage}`, maxKLinelen);
	historyClosePrices=kLineData.map((data) => data.close); // K线数据有一个close字段表示收盘价，根据实际情况调整
	// console.log("k线收盘价:", historyClosePrices);
};

const initEveryIndex=(historyClosePrices) => {
	const len=historyClosePrices.length;
	for (let i=len-20;i<len;i++) {
		setEveryIndex(historyClosePrices.slice(0, i));
	}
};
const setEveryIndex=() => {
	superTrendArr.length>=10&&superTrendArr.shift();
	superTrendArr.push(calculateIndicators(kLineData, demaShortPeriod, demaLongPeriod, atrPeriod, multiplier, 'hl2'));
};

// 更新kLine信息
const setKLinesTemp=(curKLine) => {
	kLineData.length>=maxKLinelen&&kLineData.shift();
	historyClosePrices.length>=maxKLinelen&&historyClosePrices.shift();

	kLineData.push(curKLine);
	historyClosePrices.push(curKLine.close);
};
const refreshKLineAndIndex=(curKLine) => {
	// 更新kLine信息
	setKLinesTemp(curKLine);

	// 更新平均蜡烛高度
	setCandleHeight();

	// 设置各种指标
	// setEveryIndex([...historyClosePrices]);

	if (isTest) {
		console.log("🚀 ~ : curKLine:", getDate(curKLine.openTime), curKLine.price);
	}
};

const kaiDanDaJi=async (curKLine) => {
	isOrdering=true;
	await executeTrade(kLineData, curKLine)

	isOrdering=false;
};

// 获取持仓风险，这里要改成村本地
const getPositionRisk=async () => {
	try {
		const timestamp=Date.now()+serverTimeOffset;
		const params={
			symbol: B_SYMBOL, // 交易对
			timestamp,
			recvWindow: 6000,
		};

		const signedParams=signRequest(params);
		const response=await axiosInstance.get(`${fapi}/v2/positionRisk?${signedParams}`);
		const data=response.data;
		console.log(" getPositionRisk ~ response:", data);
		let upData={};
		let downData={};
		if (data[0].positionSide==="LONG") {
			upData=data[0];
			downData=data[1];
		} else {
			upData=data[1];
			downData=data[0];
		}

		let res=null;
		if (Number(upData.positionAmt)||Number(downData.positionAmt)) {
			res={};
			if (Number(upData.positionAmt)) {
				res.up={
					trend: "up", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
					side: "BUY", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
					orderPrice: Number(upData.entryPrice),
					quantity: Math.abs(upData.positionAmt),
					breakEvenPrice: upData.breakEvenPrice,
				};
			}
			if (Number(downData.positionAmt)) {
				res.down={
					trend: "down", // "up" 表示上升趋势，"down" 表示下降趋势，'' 表示无趋势
					side: "SELL", // "BUY" 表示做多（多单），"SELL" 表示做空（空单）
					orderPrice: Number(downData.entryPrice),
					quantity: Math.abs(downData.positionAmt),
					breakEvenPrice: downData.breakEvenPrice,
				};
			}
		}
		return res;
	} catch (error) {
		console.error(
			"getPositionRisk header::",
			error&&error.request? error.request._header:null,
			" error::",
			error&&error.response? error.response.data:error,
		);
		process.exit(1);
	}
};

// 获取当前合约账户中的 USDT 余额
const getContractBalance=async () => {
	try {
		let timestamp=Date.now()+serverTimeOffset;
		const params={
			recvWindow: 6000, // 请求的超时时间
			timestamp,
		};
		const signedParams=signRequest(params);
		// 获取账户信息
		const response=await axiosInstance.get(`${fapi}/v2/balance?${signedParams}`);
		// 提取 USDT 余额
		const balances=response.data||[];
		const baseBalance=balances.find((balance) => balance.asset===base);

		if (baseBalance) {
			availableMoney=baseBalance.availableBalance/10;
			console.log(`Contract ${base} Balance: ${baseBalance.availableBalance}`);
		} else {
			console.log(`No ${base} balance found in the contract account.`);
		}
	} catch (error) {
		console.error(
			"getPositionRisk header::",
			error&&error.request? error.request._header:null,
			" error::",
			error&&error.response? error.response.data:error,
		);
		process.exit(1);
	}
};
// 获取当前价格
const getCurrentPrice=async () => {
	try {
		let timestamp=Date.now()+serverTimeOffset;
		const params={
			recvWindow: 6000, // 请求的超时时间
			timestamp,
			symbol: B_SYMBOL,
		};
		const signedParams=signRequest(params);
		// 获取账户信息
		const response=await axiosInstance.get(`${fapi}/v2/ticker/price?${signedParams}`);
		currentPrice=response.data? Number(response.data.price):0;
	} catch (error) {
		console.error(
			"getCurrentPrice header:",
			error&&error.request? error.request._header:null,
			" error::",
			error&&error.response? error.response.data:error,
		);
	}
};

// 下单（开多操作/开空操作）
const placeOrder=async (side, quantity) => {
	console.log(`下单（开${side==="SELL"? "空":"多"}操作）placeOrder ~ side, quantity:`, side, quantity);
	try {
		loadingPlaceOrder=true;
		const _currentPrice=currentPrice;
		const timestamp=Date.now()+serverTimeOffset;
		let params={
			symbol: B_SYMBOL, // 交易对
			side, // 指定订单是开多 (BUY) 还是开空 (SELL)
			type: "MARKET", // LIMIT：限价订单，MARKET：市价订单，详见 https://binance-docs.github.io/apidocs/spot/en/#test-new-order-trade
			quantity,
			positionSide: side==="BUY"? "LONG":"SHORT",
			timestamp,
			recvWindow: 6000, // 请求的超时时间
		};
		console.log("下单 params:", params);
		const signedParams=signRequest(params);

		let response=null;
		if (isTest) {
			response={
				data: {
					orderId: "xxx",
					origQty: quantity,
				},
			};
		} else {
			response=await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
		}

		console.log(
			`Order placed - Symbol: ${B_SYMBOL}, Side: ${side}, Quantity: ${quantity}`,
			"orderId:",
			response.data.orderId,
		);
		// 如果 下单（开多操作/开空操作） 成功需要更新PurchaseInfo
		if (response&&response.data&&response.data.orderId) {
			const {origQty}=response.data;
			const trend=side==="BUY"? "up":"down";

			saveGlobalVariables();
			console.log("placeOrder ~ 下单成功:");
		} else {
			console.error("下单失败！！！！！");
		}
		loadingPlaceOrder=false;
	} catch (error) {
		console.error(
			"placeOrder header::",
			error&&error.request? error.request._header:null,
			" error::",
			error&&error.response? error.response.data:error,
		);
		process.exit(1);
	}
};
// 平仓
const closeOrder=async (side, quantity, cb) => {
	try {
		loadingCloseOrder=true;
		const timestamp=Date.now()+serverTimeOffset;
		let params={
			symbol: B_SYMBOL, // 交易对
			side,
			type: "MARKET",
			quantity,
			positionSide: side==="BUY"? "SHORT":"LONG",
			timestamp,
			recvWindow: 6000,
		};

		const signedParams=signRequest(params);
		let response=null;
		if (isTest) {
			response={
				data: {
					origQty: quantity,
				},
			};
		} else {
			response=await axiosInstance.post(`${fapi}/v1/order?${signedParams}`);
		}

		if (response&&response.data&&response.data.origQty) {
			cb&&cb();
			saveGlobalVariables();
			console.log("🚀 ~ 平仓：平", side==="BUY"? "空":"多", response.data.origQty);
		} else {
			console.log(
				"🚀 ~ 平仓：平",
				side==="BUY"? "空":"多",
				"！！！！！！！！！！！！！！！！！！！！！！！！失败",
				response,
			);
		}
		loadingCloseOrder=false;
	} catch (error) {
		console.error(
			"closeOrder header::",
			error&&error.request? error.request._header:null,
			" error::",
			error&&error.response? error.response.data:error,
		);
		process.exit(1);
	}
};

// 开多
const teadeBuy=async (quantity) => {
	try {
		await placeOrder("BUY", quantity); // 调整开仓数量
		console.log("开多完成");
	} catch (error) {
		console.error("teadeBuy err::", error);
		process.exit(1);
	}
};

// 开空
const teadeSell=async (quantity) => {
	try {
		await placeOrder("SELL", quantity); // 调整开仓数量
		console.log("开空完成");
	} catch (error) {
		console.error("teadeBuy err::", error);
		process.exit(1);
	}
};

/**
 * 初始化
 *
 */
const getHistoryData=() => {
	if (fs.existsSync(`./data/${isTest? "test":"prod"}-${strategyType}-${SYMBOL}.js`)) {
		let historyDatas=require(`./data/${isTest? "test":"prod"}-${strategyType}-${SYMBOL}.js`);
		const {
			currentPrice: __currentPrice, // 记录当前价格
			prePrice: __prePrice, // 记录当前价格的前一个
			longPositions: __longPositions,
			shortPositions: __shortPositions
		}=historyDatas;
		console.log("上一次停止程序时，交易情况", historyDatas);

		if (
			__currentPrice!=0&&
			__prePrice!=0&&
			(__longPositions.length||__shortPositions.length)
			// 有仓位信息
		) {
			return historyDatas;
		} else {
			return null;
		}
	} else {
		return null;
	}
};
const recoverHistoryData=async (historyDatas) => {
	const {
		currentPrice: __currentPrice, // 记录当前价格
		prePrice: __prePrice, // 记录当前价格的前一个
		longPositions: __longPositions,
		shortPositions: __shortPositions,
		testMoney: __testMoney,

		availableMoney: __availableMoney,
	}=historyDatas;

	prePrice=__prePrice; // 记录当前价格的前一个
	testMoney=__testMoney;
	longPositions=__longPositions;
	shortPositions=__shortPositions;

	availableMoney=__availableMoney
};
const recoverHistoryDataByPosition=async (historyDatas, allPositionDetail) => {
	// ??????????? 未处理allPositionDetail
	//
	// 从数据库拿出上次的数据，并且与现在的比较，如果数据和的上就用以前的，数据和不上就解析出
	loadingInit=true;
	let {
		currentPrice: __currentPrice, // 记录当前价格
		prePrice: __prePrice, // 记录当前价格的前一个
		longPositions: __longPositions,
		shortPositions: __shortPositions,
		testMoney: __testMoney,

		availableMoney: __availableMoney,
	}=historyDatas;

	prePrice=__currentPrice; // 记录当前价格的前一个
	testMoney=__testMoney;
	longPositions=__longPositions;
	shortPositions=__shortPositions;

	availableMoney=__availableMoney
	// 多空相差很大时全平
	// 盈利状态立即全平

	if (longPositions.length||shortPositions.length) {
		await getCurrentPrice();
		await gridPointClearTrading(currentPrice)
	}
	loadingInit=false;
};

// 5. 启动交易
const startTrading=async () => {
	console.log(isTest? "测试环境～～～":"正式环境～～～");
	try {
		// 同步服务器时间
		await getServerTimeOffset();

		// 初始化 historyClosePrices
		await getHistoryClosePrices();

		// 初始化指标
		initEveryIndex(historyClosePrices);

		// 初始化 candleHeight
		setCandleHeight();

		// 设置开仓金额
		if (!invariableBalance) {
			await getContractBalance();
		}

		// 获取历史仓位数据
		const historyDatas=getHistoryData();
		// 测试
		if (isTest) {
			await getCurrentPrice();
			historyDatas&&(await recoverHistoryData(historyDatas));
		} else {
			// 初始化
			allPositionDetail=await getPositionRisk(); // 获取当前仓位信息

			if (hasUpDownVal(allPositionDetail)) {
				console.log("🚀 已有仓位 ~ allPositionDetail:", allPositionDetail);
				// 已有仓位，立即恢复仓位
				if (historyDatas) {
					await recoverHistoryDataByPosition(historyDatas, allPositionDetail);
				} else {
					console.log("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
					console.error("该币现有仓位和上次保留的数据不符合，请手动处理！！！");
					return;
				}
			} else {
				// 如果还没仓位要加仓
				console.log("还没仓位，开始运行策略");
			}
		}
		await startWebSocket(); // 启动websocket更新价格
	} catch (error) {
		console.error("startTrading Error:", error);
		process.exit(1);
	}
};
// 获取下单量
const getQuantity=(availableMoney, currentPrice) => {
	// if (maxAvailableMoney<availableMoney) maxAvailableMoney=availableMoney
	// return Math.round(availableMoney/currentPrice);
	return Math.round(availableMoney/currentPrice);
};

// 是否到达止损点/平仓
const gridPointClearTrading=async (_currentPrice) => {
	onGridPoint=true;

	// 计算浮动盈亏
	const longProfit=calcLongPositionsProfit(_currentPrice, longPositions);
	const shortProfit=calcShortPositionsProfit(_currentPrice, shortPositions);
	const totalProfit=longProfit+shortProfit;

	// 平仓条件
	if (totalProfit>profitTarget) {
		isLongOpen&&await closeLongPositions(_currentPrice, longProfit);
		isShortOpen&&await closeShortPositions(_currentPrice, shortProfit);
	} else {
		if (longProfit>profitTarget) {
			await closeLongPositions(_currentPrice, longProfit);
		}
		if (shortProfit>profitTarget) {
			await closeShortPositions(_currentPrice, shortProfit);
		}
	}

	onGridPoint=false;
};

// WebSocket 事件
const startWebSocket=async () => {
	console.log("🚀 startWebSocket~~~~~");
	// 添加 'open' 事件处理程序
	ws.on("open", async (data) => {
		console.log("WebSocket connection opened.", data);
	});

	// 添加 'message' 事件处理程序
	ws.on("message", async (data) => {
		const {
			k: {
				t: openTime, // 这根K线的起始时间
				T: closeTime, // 这根K线的结束时间
				o: open, // 这根K线期间第一笔成交价
				c: close, // 这根K线期间末一笔成交价
				h: high, // 这根K线期间最高成交价
				l: low, // 这根K线期间最低成交价
				v: volume, // 这根K线期间成交量
				x: isNewLine, // 这根K线是否完结(是否已经开始下一根K线)
				V: takerBuyBaseAssetVolume, // 主动买入的成交量
			},
		}=JSON.parse(data);

		prePrice=currentPrice; // 不能删除
		currentPrice=Number(close)||0;

		if (isNewLine) {
			const curKLine={
				openTime, // 这根K线的起始时间
				closeTime, // 这根K线的结束时间
				open: Number(open), // 这根K线期间第一笔成交价
				close: Number(close), // 这根K线期间末一笔成交价
				high: Number(high), // 这根K线期间最高成交价
				low: Number(low), // 这根K线期间最低成交价
				volume: Number(volume), // 这根K线期间成交量
				isNewLine, // 这根K线是否完结(是否已经开始下一根K线)
				takerBuyBaseAssetVolume: Number(takerBuyBaseAssetVolume), // 主动买入的成交量
			};
			// 更新k线和指标数据
			refreshKLineAndIndex(curKLine);
			// 开单
			await kaiDanDaJi(curKLine);
		}
		// 相等的话直接退出，因为它到不了任何交易点，继续执行也没有意义
		// 没有订单也不继续了
		if (isLoading()||prePrice===currentPrice) {
			return;
		} else {
			// 网格模式止盈/止损
			(await gridPointClearTrading(currentPrice)); // 每秒会触发4次左右，但是需要快速判断是否进入交易点，所以不节流
		}
	});
	// 添加 'close' 事件处理程序
	ws.on("close", (error) => {
		console.log(`WebSocket 关闭: `, error);
	});

	// 添加 'error' 事件处理程序
	ws.on("error", (error) => {
		console.error("WebSocket error:", error);
		// 在这里添加处理错误的逻辑
		process.exit(1);
	});
};
// 自定义函数将 Error 对象转为字符串
function errorToString(error) {
	if (error instanceof Error) {
		return `${error.name}: ${error.message}\n${error.stack}`;
	}
	return error;
}
// logs
const createLogs=() => {
	// 创建 logs 文件夹
	if (!fs.existsSync(logsFolder)) {
		fs.mkdirSync(logsFolder);
	}

	// 重定向 console.log 到文件
	logStream=fs.createWriteStream(`${logsFolder}/${isTest? "test":"prod"}-${strategyType}-${SYMBOL}-${getDate()}.log`, {
		flags: "a",
	});
	// 保存原始的 console.log 函数
	const originalConsoleLog=console.log;

	// 重写 console.log
	console.log=function (...args) {
		// originalConsoleLog.apply(console, args); // 保留原始 console.log 的功能
		// 将 log 写入文件
		logStream.write(
			`${getDate()}: ${args
				.map((v) => {
					if (typeof v==="object") {
						return JSON.stringify(v);
					} else {
						return v;
					}
				})
				.join("，")}\n`,
		);
	};

	// ~~~~~~~~~~~~~~~~error~~~~~~
	// 创建 error 文件夹
	if (!fs.existsSync(errorsFolder)) {
		fs.mkdirSync(errorsFolder);
	}
	// 重定向 console.error 到文件
	errorStream=fs.createWriteStream(
		`${errorsFolder}/${isTest? "test":"prod"}-${strategyType}-${SYMBOL}-${getDate()}.error`,
		{flags: "a"},
	);
	// 保存原始的 console.error 函数
	const originalConsoleError=console.error;

	// 重写 console.error
	console.error=function (...args) {
		originalConsoleError.apply(console, args); // 保留原始 console.error 的功能
		// 将 error 写入文件
		errorStream.write(
			`${getDate()}: ${args
				.map((v) => {
					if (v instanceof Error) {
						return errorToString(v);
					} else if (typeof v==="object") {
						return JSON.stringify(v);
					} else {
						return v;
					}
				})
				.join("，")}\n`,
		);
		if (!isTest) {
			// 发送邮件
			// sendMail({
			// 	subject: `❌❌❌ ${B_SYMBOL}仓位发生错误，请手动处理`,
			// 	text: JSON.stringify({
			// 		currentPrice,
			// 		maxLongSize,
			// 		maxShortSize,
			// 	}),
			// });
		}
	};
};

createLogs();
startTrading(); // 开始启动

const test=async () => {
	await getServerTimeOffset(); // 同步服务器时间
	await getCurrentPrice();
	await getHistoryClosePrices(); // 初始化 historyClosePrices
};
// test();

// 在服务停止时执行的清理工作
function cleanup() {
	console.log("Cleaning up before exit.");
	logStream&&logStream.end();
	errorStream&&errorStream.end();
}

// 监听进程的 exit 事件
process.on("exit", () => {
	cleanup();
});

// 监听中断信号（如 Ctrl+C）
process.on("SIGINT", () => {
	console.log("Received SIGINT. Cleaning up...");
	process.exit();
});

// 监听未捕获异常
process.on("uncaughtException", (err) => {
	console.error("Uncaught Exception:", err);
	// 退出进程
	process.exit(1);
});

// 保存全局变量到文件
function saveGlobalVariables() {
	setTimeout(() => {
		// 创建 data 文件夹
		if (!fs.existsSync("data")) {
			fs.mkdirSync("data");
		}
		if (currentPrice!==0&&prePrice!==0) {
			const data=JSON.stringify({
				currentPrice, // 记录当前价格
				prePrice, // 记录当前价格的前一个
				candleHeight: candleHeight,
				testMoney,
				longPositions: longPositions,
				shortPositions: shortPositions,
				availableMoney,
			});
			fs.writeFileSync(`data/${isTest? "test":"prod"}-${strategyType}-${SYMBOL}.js`, `module.exports = ${data}`, {
				flag: "w",
			});
			console.log(`Global variables saved to data/${SYMBOL}.js`);
		}
	}, 0);
}
