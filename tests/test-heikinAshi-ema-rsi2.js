const {getDate, getSequenceArr, getLastFromArr}=require("../utils/functions");
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
}=require("../utils/kLineTools");
const {calculateATR}=require("../utils/atr.js");
const {calculateEMA}=require("../utils/ma.js");
const {convertToHeikinAshi}=require("../utils/heikinAshi.js");
const {createStochRSICalculator}=require("../utils/smoothRsi.js");
const fs=require("fs");
const symbol="dogeUSDT";
let {kLineData}=require(`./source/${symbol}-1m.js`);

const DefaultAvailableMoney=10
let maxAvailableMoney=0;
let numForAverage=0;
let _kLineData=[...kLineData];
let _heikinAshiKLineData=[]
let previousHaOpen=0
let previousHaClose=0
let curKLines=[]
let double=0;
let lossCount=0
let maxLossCount=2
let availableMoney=DefaultAvailableMoney*(1+lossCount)
let howManyCandle=1;
let isProfitRun=0;
let firstStopProfitRate=0;
let firstProtectProfitRate=0;
let profitProtectRate=0.6;
let maxStopLossRate=0.01;
let invalidSigleStopRate=0.02;
let howManyCandleForProfitRun=0.5;

let emaPeriod=200;
let atrPeriod=15;
let stochRsiPeriods={
	lengthRSI: 14, lengthStoch: 14, smoothK: 3, smoothD: 3
};

let minRsi=20
let maxRsi=80

const getQuantity=(currentPrice) => {
	// availableMoney=DefaultAvailableMoney*(1+lossCount)
	availableMoney=100+DefaultAvailableMoney*(lossCount)
	// availableMoney=DefaultAvailableMoney*Math.pow(2, lossCount)
	if (maxAvailableMoney<availableMoney) maxAvailableMoney=availableMoney
	return Math.round(availableMoney/currentPrice);
};
let stochRSICalc=null
let gridPoints=[];
let trend="";
let winNum=0;
let failNum=0;
let zhibiaoWinNum=0;
let testMoney=0;
let quantity=0;
let orderPrice=0;
let maxMoney=0;
let minMoney=0;
let openHistory=[];
let closeHistory=[];
let trendHistory=[];
let openPriceHistory=[];
let closePriceHistory=[];
let testMoneyHistory=[];
let readyTradingDirection="hold";
let hasOrder=false;
let candleHeight=0;


let maxStopLossMoney=0;
let curTestMoneyHistory=[]
let emaArr=[]
let rsiArr=[]

const setProfit=(orderPrice, currentPrice, time) => {
	let curTestMoney=0
	if (trend==="up") {
		curTestMoney=quantity*(currentPrice-orderPrice)-quantity*(orderPrice+currentPrice)*0.0007;
	}
	if (trend==="down") {
		curTestMoney=quantity*(orderPrice-currentPrice)-quantity*(orderPrice+currentPrice)*0.0007;
	}
	testMoney+=curTestMoney
	if (double) {
		if (curTestMoney<=0) {
			lossCount=lossCount+1>maxLossCount? maxLossCount:lossCount+1
		} else {
			lossCount=0
		}
	}
	if (curTestMoney<=0) {
		failNum++
	} else {
		winNum++
	}
	if (testMoney>maxMoney) maxMoney=testMoney;
	if (testMoney<minMoney) minMoney=testMoney;
	curTestMoneyHistory.push(curTestMoney);
	testMoneyHistory.push(testMoney);
	closeHistory.push(time);
	closePriceHistory.push(currentPrice);
	trendHistory.push(trend);
	// 最大亏损值
	setMinMoney(orderPrice, currentPrice);
};
const setMinMoney=(orderPrice, currentPrice, closeTime) => {
	let _testMoney=0;
	if (trend==="up") {
		_testMoney=quantity*(currentPrice-orderPrice)-quantity*(orderPrice+currentPrice)*0.0007;
	}
	if (trend==="down") {
		_testMoney=quantity*(orderPrice-currentPrice)-quantity*(orderPrice+currentPrice)*0.0007;
	}
	if (_testMoney<maxStopLossMoney) maxStopLossMoney=_testMoney;
};
const initEveryIndex=(curKLines) => {
	const len=curKLines.length;
	for (let i=len-100;i<len;i++) {
		setEveryIndex(curKLines.slice(0, i));
	}
};

const setEveryIndex=(curKLines) => {
	let prices=curKLines.map(v => v.close);
	// ema
	emaArr.length>=10&&emaArr.shift();
	emaArr.push(calculateEMA(prices, emaPeriod));

	// rsi
	setRsiArr(prices[prices.length-1]);
};

const setRsiArr=(price) => {
	// rsi
	rsiArr.length>=10&&rsiArr.shift();
	rsiArr.push(stochRSICalc.update(price));
	// 要清除过多历史避免内存占用
	stochRSICalc.reset();
}

const resetInit=() => {
	_kLineData=[...kLineData];
	howManyCandle=1;
	isProfitRun=0;
	double=0;
	lossCount=0
	maxLossCount=2
	firstStopProfitRate=0;
	firstProtectProfitRate=0;
	firstStopLossRate=0;
	profitProtectRate=0.6;
	howManyCandleForProfitRun=0.5;
	maxStopLossRate=0.01;
	invalidSigleStopRate=0.02;
	gridPoints=[];
	trend="";
	winNum=0;
	failNum=0;
	testMoney=0;
	quantity=0;
	orderPrice=0;
	maxMoney=0;
	minMoney=0;
	openHistory=[];
	closeHistory=[];
	trendHistory=[];
	testMoneyHistory=[];
	readyTradingDirection="hold";
	hasOrder=false;
	candleHeight=0;
	emaArr=[];
	rsiArr=[];
	emaPeriod=10;
	rsiPeriod=14;
	numForAverage=12;
	emaPeriod=169; // 长周期 DEMA（示例值）
	atrPeriod=10; // ATR 计算周期
	stochRsiPeriods=3.0; // ATR 乘数
	minRsi=20
	maxRsi=80

	targetTime=null;
};

const setHeikingAshiKLineData=(kLine) => {
	if (_heikinAshiKLineData.length>500) _heikinAshiKLineData.shift();
	_heikinAshiKLineData.push(convertToHeikinAshi(kLine, previousHaOpen, previousHaClose));
	previousHaOpen=kLine.open;
	previousHaClose=kLine.close;
}
const start=(params) => {
	// 每次需要初始化 ???? 检查初始化是否覆盖所有全局变量
	resetInit();
	if (params) {
		numForAverage=params.numForAverage;
		howManyCandle=params.howManyCandle;
		isProfitRun=params.isProfitRun;
		firstStopProfitRate=params.firstStopProfitRate;
		firstProtectProfitRate=params.firstProtectProfitRate;
		firstStopLossRate=params.firstStopLossRate;
		profitProtectRate=params.profitProtectRate;
		howManyCandleForProfitRun=params.howManyCandleForProfitRun;
		maxStopLossRate=params.maxStopLossRate;
		invalidSigleStopRate=params.invalidSigleStopRate;
		double=params.double;
		maxLossCount=params.maxLossCount;
		targetTime=params.targetTime;
		emaPeriod=params.emaPeriod;
		rsiPeriod=params.rsiPeriod;
		emaPeriod=params.emaPeriod;
		atrPeriod=params.atrPeriod;
		stochRsiPeriods=params.stochRsiPeriods;
		minRsi=params.minRsi;
		maxRsi=params.maxRsi;

	}
	if (targetTime) {
		targetTime=params.targetTime;
		let start=kLineData.findIndex((v) => v.openTime===targetTime);
		_kLineData=kLineData.slice(start-500);
	}

	stochRSICalc=createStochRSICalculator(stochRsiPeriods.smoothK, stochRsiPeriods.smoothD, stochRsiPeriods.lengthRSI, stochRsiPeriods.lengthStoch);

	const preKLines=_kLineData.slice(0, 500);
	for (let i=0;i<preKLines.length;i++) {
		setHeikingAshiKLineData(preKLines[i]);
	}
	initEveryIndex(_heikinAshiKLineData);
	for (let idx=500;idx<_kLineData.length;idx++) {
		curKLines=_kLineData.slice(idx-50, idx);

		setHeikingAshiKLineData(_kLineData[idx]);

		candleHeight=calculateCandleHeight(_kLineData.slice(idx-numForAverage, idx));

		// 设置各种指标
		setEveryIndex(_heikinAshiKLineData);

		const curkLine=_kLineData[idx];
		const {open, close, openTime, closeTime, low, high}=curkLine;

		const [ema1, ema2, ema3]=getLastFromArr(emaArr, 3);
		const [rsi1, rsi2, rsi3]=getLastFromArr(rsiArr, 3);

		// 准备开仓
		// 判断趋势
		judgeTradingDirection(getLastFromArr(curKLines, 5));
		// 趋势是否被破坏
		// judgeBreakTradingDirection(getLastFromArr(curKLines, 5));
		if (!hasOrder) {
			// 开仓：没有仓位就根据 readyTradingDirection 开单
			// 开单完成后会重置 readyTradingDirection
			if (readyTradingDirection!=="hold") {
				judgeAndTrading(getLastFromArr(curKLines, 5), params);
			}
			continue;
		}
		// 有仓位就准备平仓
		else {
			const [point1, point2]=gridPoints;
			// 先判断止损
			if (trend) {
				// 判断止损
				if (trend==="up") {
					// low 小于 point1 就止损，否则继续持有
					if (low<=point1) {
						setProfit(orderPrice, point1, openTime);
						reset();
						continue;
					}

					if (firstStopProfitRate) {
						const firstProfitPrice=orderPrice+Math.abs(orderPrice-point1)*firstStopProfitRate
						if (close>firstProfitPrice) {
							// 到初始止盈点时，并且该k线是阴线，移动止损到开仓价，避免盈利回撤
							// if (close<open) {
							// 减少止损
							gridPoints[0]=orderPrice+Math.abs(orderPrice-firstProfitPrice)*firstProtectProfitRate;
							firstStopProfitRate=0
							continue;
							// }
						}
					}
					if (firstStopLossRate) {
						const firstStopPrice=orderPrice-Math.abs(orderPrice-point1)*firstStopLossRate
						if (close<firstStopPrice) {
							// 到初始止损点时，并且该k线是阳线，移动止盈到开仓价，避免亏损太多
							// if (close<open) {
							// 减少止盈利接近开盘价
							gridPoints[1]=orderPrice//+Math.abs(orderPrice-firstStopPrice)/2;
							firstStopLossRate=0
							continue;
							// }
						}
					}
				}
				if (trend==="down") {
					// high 大于 point2 就止损，否则继续持有
					if (high>=point2) {
						setProfit(orderPrice, point2, openTime);
						reset();
						continue;
					}
					if (firstStopProfitRate) {
						const firstProfitPrice=orderPrice-Math.abs(orderPrice-point2)*firstStopProfitRate
						if (close<firstProfitPrice) {
							// 到初始止盈点时，并且该k线是阳线，移动止损到开仓价，避免盈利回撤
							// if (close>open) {
							// 减少止损
							gridPoints[1]=orderPrice-Math.abs(orderPrice-firstProfitPrice)*firstProtectProfitRate;
							firstStopProfitRate=0
							continue;
							// }
						}
					}
					if (firstStopLossRate) {
						const firstStopPrice=orderPrice+Math.abs(orderPrice-point2)*firstStopLossRate
						if (close>firstStopPrice) {
							// 到初始止损点时，并且该k线是阴线，移动止盈到开仓价，避免亏损太多
							// if (close>open) {
							// 减少止盈利接近开盘价
							gridPoints[0]=orderPrice//+Math.abs(orderPrice-firstStopPrice)/25;
							firstStopLossRate=0
							continue;
							// }
						}
					}
				}
			}
			// 判断止盈
			if (trend) {
				if (isProfitRun) {
					// 移动止盈
					// 判断止盈：上面没有被止损，那看是否能止盈，high 大于 point2 就止盈利，否则继续持有
					if (trend==="up"&&high>=point2) {
						gridPoints=[
							orderPrice+Math.abs(point2-orderPrice)*profitProtectRate,
							point2+candleHeight*howManyCandleForProfitRun,
						];
						continue;
					}
					// 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
					if (trend==="down"&&low<=point1) {
						gridPoints=[
							point1-candleHeight*howManyCandleForProfitRun,
							orderPrice-Math.abs(orderPrice-point1)*profitProtectRate,
						];
						continue;
					}
				} else {
					// 判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
					if (trend==="up"&&high>=point2) {
						setProfit(orderPrice, point2, openTime);
						reset();
						continue;
					}
					// 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
					if (hasOrder&&trend==="down"&&low<=point1) {
						setProfit(orderPrice, point1, openTime);
						reset();
						continue;
					}
				}
			}


			// 指标判断止损 start //////////////////////////////////////
			// 指标止盈
			// if (hasOrder&&trend==="up"&&(demaShort<demaLong)) { // ||emaArr.emaArr===-1
			// 	zhibiaoWinNum+=1
			// 	setProfit(orderPrice, high, openTime);
			// 	reset();
			// 	continue;
			// }
			// if (hasOrder&&trend==="down"&&(demaShort>demaLong)) { // ||emaArr.emaArr===1
			// 	zhibiaoWinNum+=1
			// 	setProfit(orderPrice, low, openTime);
			// 	reset();
			// 	continue;
			// }
			// 指标判断止损（5分钟没有开启） end //////////////////////////////////////
		}
	}

	// 平仓最后一次
	if (hasOrder) {
		const len=_kLineData.length;
		const curkLine=_kLineData[len-1];
		const {close, openTime, closeTime, low, high}=curkLine;
		const [point1, point2]=gridPoints;
		if (hasOrder) {
			// 判断止损
			if (trend==="up") {
				// low 小于 point1 就止损，否则继续持有
				if (low<=point1) {
					setProfit(orderPrice, point1, openTime);
					reset();
					return;
				}
			}
			if (hasOrder&&trend==="down") {
				// high 大于 point2 就止损，否则继续持有
				if (high>=point2) {
					setProfit(orderPrice, point2, openTime);
					reset();
					return;
				}
			}
		}
		if (hasOrder) {
			// 判断止盈：上面没有被止损，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
			if (trend==="up"&&high>=point2) {
				setProfit(orderPrice, point2, openTime);
				reset();
				return;
			}
			// 判断止盈：上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
			if (hasOrder&&trend==="down"&&low<=point1) {
				setProfit(orderPrice, point1, openTime);
				reset();
				return;
			}
		}
		if (hasOrder) {
			setProfit(orderPrice, close, openTime);
		}
	}

	const timeRange=`${_kLineData[0].openTime} ~ ${_kLineData[_kLineData.length-1].closeTime}`;
	// if (params&&params.targetTime) {
	// 	console.log(
	// 		"🚀 targetTime, testMoney, maxMoney, minMoney::",
	// 		symbol,
	// 		withAllDatas,
	// 		timeRange,
	// 		Math.round(testMoney*100)/100,
	// 		Math.round(maxMoney*100)/100,
	// 		Math.round(minMoney*100)/100,
	// 	);
	// }
	return {
		timeRange,
		testMoney,
		maxMoney,
		minMoney,
	};
};
const reset=() => {
	gridPoints=[];
	readyTradingDirection="hold";
	trend="";
	quantity=0;
	orderPrice=0;
	hasOrder=false;
};
// 指标判断方向 / 交易
const judgeTradingDirection=(kLines) => {
	const [, , kLine1, kLine2, kLine3]=kLines;

	const {close, low, high, openTime}=kLine3

	const [ema1, ema2, ema3]=getLastFromArr(emaArr, 3);
	const [rsi1, rsi2, rsi3]=getLastFromArr(rsiArr, 3);

	const upTerm1=close>ema3;
	const upTerm2=rsi3.rsi_sma<minRsi; // rsi 在超卖区
	const upTerm3=rsi1.rsi_sma<rsi1.rsi_sma_sma&&rsi3.rsi_sma>rsi3.rsi_sma_sma; // rsi 在超卖区间金叉
	if (upTerm1&&upTerm2&&upTerm3) {
		readyTradingDirection="up";
		return
	}

	const downTerm1=close<ema3;
	const downTerm2=rsi3.rsi_sma>maxRsi; // rsi 在超买区
	const downTerm3=rsi1.rsi_sma>rsi1.rsi_sma_sma&&rsi3.rsi_sma<rsi3.rsi_sma_sma; // rsi 在超买区间死叉
	if (downTerm1&&downTerm2&&downTerm3) {
		readyTradingDirection="down";
		return
	}
	readyTradingDirection="hold";
};
const judgeBreakTradingDirection=(kLines) => {
	const [, , kLine1, kLine2, kLine3]=kLines;
	const [ema1, ema2, ema3]=getLastFromArr(emaArr, 3);

	const {latestClose, demaShort, demaLong, emaArr, }=ema3

	// buySignal and (bar_index - buySignalBar >= lookaheadBars or (dema_short < dema_log) or (trend == -1))
	const upTerm1=ema3.emaArr===1;
	const upTerm2=demaShort>=demaLong;
	if (readyTradingDirection==="up"&&!(upTerm1&&upTerm2)) {//&&upTerm2
		readyTradingDirection="hold"
		return
	}

	const downTerm1=ema3.emaArr===-1;
	const downTerm2=demaShort<=demaLong;
	if (readyTradingDirection==="down"&&!(downTerm1&&downTerm2)) {//&&downTerm2
		readyTradingDirection="hold"
		return
	}
};

// 设置网格
const setGridPoints=(trend, stopLoss, stopProfit, _currentPrice) => {
	if (trend==="up") {
		let _stopLoss=stopLoss; // 止损
		let _stopProfit=stopProfit; // 止盈
		gridPoints=[_stopLoss, _stopProfit];
		orderPrice=_currentPrice;
		quantity=getQuantity(_currentPrice);
	}

	if (trend==="down") {
		let _stopLoss=stopLoss; // 止损
		let _stopProfit=stopProfit; // 止盈
		orderPrice=_currentPrice;
		gridPoints=[_stopProfit, _stopLoss];
		quantity=getQuantity(_currentPrice);
	}
};
// 判断+交易
const judgeAndTrading=(kLines, params) => {
	// 根据指标判断是否可以开单
	const [, , , , curkLine]=kLines;
	const trendInfo=calculateTradingSignal(kLines);
	const {stopLoss, stopProfit}=trendInfo;

	// 开单
	switch (trendInfo.trend) {
		case "up":
			trend="up";
			setGridPoints("up", stopLoss, stopProfit, curkLine.close);
			readyTradingDirection="hold";
			hasOrder=true;
			openHistory.push(curkLine.openTime); // 其实开单时间是：curkLine.closeTime，binance的时间显示的是open Time，方便调试这里记录openTime
			openPriceHistory.push(curkLine.close);
			firstStopProfitRate=params.firstStopProfitRate
			firstStopLossRate=params.firstStopLossRate
			break;
		case "down":
			trend="down";
			setGridPoints("down", stopLoss, stopProfit, curkLine.close);
			readyTradingDirection="hold";
			hasOrder=true;
			openHistory.push(curkLine.openTime); // 其实开单时间是：curkLine.closeTime，binance的时间显示的是open Time，方便调试这里记录openTime
			openPriceHistory.push(curkLine.close);
			firstStopProfitRate=params.firstStopProfitRate
			firstStopLossRate=params.firstStopLossRate
			break;
		default:
			break;
	}
};
const calculateTradingSignal=(kLines) => {
	const [kLine_fu1, kLine_0, kLine1, kLine2, kLine3]=kLines;
	const {open, close, openTime, closeTime, low, high}=kLine3;

	// 计算ATR
	const atr=calculateATR(curKLines, atrPeriod).atr;

	let max=Math.max(kLine1.high, kLine2.high, kLine3.high);
	let min=Math.min(kLine1.low, kLine2.low, kLine3.low);

	// let maxBody=Math.max(kLine1.open, kLine1.close, kLine2.open, kLine2.close, kLine3.open, kLine3.close);
	// let minBody=Math.min(kLine1.open, kLine1.close, kLine2.open, kLine2.close, kLine3.open, kLine3.close);

	if (readyTradingDirection==="up") {
		// if (min<close*(1-invalidSigleStopRate)) {
		// 	return {
		// 		trend: "hold",
		// 	};
		// }
		// if (min<close*(1-maxStopLossRate)) min=close*(1-maxStopLossRate);
		const stopLoss=min-atr;
		return {
			trend: "up",
			stopLoss, // 止损
			// stopLoss: curEma144, // 止损
			// stopProfit: close + candleHeight * howManyCandle, // 止盈
			stopProfit: close+(close-stopLoss)*howManyCandle, // 止盈
		};
	}


	if (readyTradingDirection==="down") {
		// if (max>close*(1+invalidSigleStopRate)) {
		// 	return {
		// 		trend: "hold",
		// 	};
		// }
		// if (max>close*(1+maxStopLossRate)) max=close*(1+maxStopLossRate);
		const stopLoss=max+atr;
		return {
			trend: "down",
			stopLoss, // 止损
			// stopLoss: curEma144, // 止损
			// stopProfit: close - candleHeight * howManyCandle, // 止盈
			stopProfit: close-(stopLoss-close)*howManyCandle, // 止盈
		};
	}
	return {
		trend: "hold",
	};
};
function writeInFile(fileName, str) {
	fs.writeFileSync(fileName, str, {
		flag: "w",
	});
}

function run(params) {
	start(params);
	const result={
		...params,
		xxxx: '--------------------------------',
		availableMoney,
		maxAvailableMoney,
		winNum,
		failNum,
		zhibiaoWinNum,
		testMoney,
		maxMoney,
		minMoney,
		maxStopLossMoney,
		winRate: ((winNum/(winNum+failNum))*100).toFixed(3)+"%",
	};
	console.log("最终结果::", result);
	console.log("length::", openHistory.length, closeHistory.length, trendHistory.length);
	// https://echarts.apache.org/examples/zh/editor.html?c=line-simple
	writeInFile(
		`./tests/data/heikinAshi-${symbol}-ema-rsi.js`,
		`
		var openHistory = ${JSON.stringify(openHistory, null, 2)}
		var closeHistory = ${JSON.stringify(closeHistory, null, 2)}
		var trendHistory = ${JSON.stringify(trendHistory, null, 2)}
		var openPriceHistory = ${JSON.stringify(openPriceHistory, null, 2)}
		var closePriceHistory = ${JSON.stringify(closePriceHistory, null, 2)}
		var curTestMoneyHistory = ${JSON.stringify(curTestMoneyHistory, null, 2)}
		var valueFormatter = (value, index) => '[openTime:' + openHistory[index] + ']' + '\\n\\r' +
		'[closeTime:' + closeHistory[index] + ']' + '\\n\\r' +
		'[trend:' + trendHistory[index] + ']' + '\\n\\r' +
		'[openPrice:' + openPriceHistory[index] + ']' + '\\n\\r' +
		'[closePriceHistory:' + closePriceHistory[index] + ']' + '\\n\\r' +
		'[testMoney:' + value + ']' + '\\n\\r';


		var option = {
			xAxis: {
			type: "category",
		data: ${JSON.stringify(closeHistory, null, 2)},
			},
		tooltip: {
			trigger: "axis",
		axisPointer: {
			type: "cross",
				},
		valueFormatter,
		extraCssText: 'width:300px; white-space:pre-wrap' // 保留空格并支持换行
			},
		yAxis: {
			type: "value",
			},
		series: [
		{
			name: "当前盈利",
		data: ${JSON.stringify(testMoneyHistory, null, 2)},
		type: "line",
		markPoint: {
			data: [
		{
			type: "max",
		name: "Max",
							},
		{
			type: "min",
		name: "Min",
							},
		],
					},
				},
		],
		}

		module.exports={
			option,
			openHistory,
			closeHistory,
			trendHistory,
			openPriceHistory,
			closePriceHistory,
			curTestMoneyHistory
		}
		`,
	);
}

run({
	emaPeriod: 200,
	stochRsiPeriods: {
		lengthRSI: 14, lengthStoch: 14, smoothK: 3, smoothD: 3
	}, // doge
	atrPeriod: 12,
	minRsi: 20,
	maxRsi: 80,

	"howManyCandle": 4, // doge
	"firstStopProfitRate": 3, //1.5,
	firstProtectProfitRate: 0.6,
	firstStopLossRate: 0,// 0.35, //  当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
	"isProfitRun": 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
	"profitProtectRate": 0.8,
	"howManyCandleForProfitRun": 1,
	"maxStopLossRate": 0.05,
	"invalidSigleStopRate": 0.1, // 开单时止损超过这个比例就不开单
	"double": 1,
	"maxLossCount": 20,
	targetTime: "2025-03-01_00-00-00",
});
module.exports={
	evaluateStrategy: start,
};

// 止盈止损跟tradingview不一样所以结果不一样