const {getDate, getLastFromArr}=require("../utils/functions");
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
const {calculateSSL}=require("../utils/SSL_CMF_VO/SSLChannel.js");
const {calculateCMF}=require("../utils/SSL_CMF_VO/CMF.js");
const {calculateVO}=require("../utils/SSL_CMF_VO/volatilityOscillator.js");
const fs=require("fs");
const symbol="dogeUSDT";
let {kLineData}=require(`./source/${symbol}-1h.js`);

const DefaultAvailableMoney=10
let maxAvailableMoney=0;
let numForAverage=0;
let _kLineData=[...kLineData];
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
let SSL_PERIOD=20;
let CMF_PERIOD=100;
let VO_PERIOD=20;

let SSL=[];
let CMF=[];
let VO=[];

const getQuantity=(currentPrice) => {
	availableMoney=DefaultAvailableMoney*(1+lossCount)
	if (maxAvailableMoney<availableMoney) maxAvailableMoney=availableMoney
	return Math.round(availableMoney/currentPrice);
};

let gridPoints=[];
let trend="";
let winNum=0;
let failNum=0;
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
	for (let i=len-20;i<len;i++) {
		setEveryIndex(curKLines.slice(0, i));
	}
};

const setEveryIndex=(curKLines) => {
	VO.length>=10&&VO.shift();
	VO.push(calculateVO(curKLines, VO_PERIOD));

	CMF.length>=10&&CMF.shift();
	CMF.push(calculateCMF(curKLines, CMF_PERIOD));

	SSL.length>=10&&SSL.shift();
	SSL.push(calculateSSL(curKLines, SSL_PERIOD));
};

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
	emaMaArr=[];
	rsiArr=[];
	emaPeriod=10;
	smaPeriod=10;
	rsiPeriod=14;
	numForAverage=12;

	SSL_PERIOD=20;
	CMF_PERIOD=100;
	VO_PERIOD=20;

	targetTime=null;
};
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
		smaPeriod=params.smaPeriod;
		rsiPeriod=params.rsiPeriod;

		SSL_PERIOD=params.SSL_PERIOD;
		CMF_PERIOD=params.CMF_PERIOD;
		VO_PERIOD=params.VO_PERIOD;
	}
	if (targetTime) {
		targetTime=params.targetTime;
		let start=kLineData.findIndex((v) => v.openTime===targetTime);
		_kLineData=[...kLineData].slice(start);
	}
	const preKLines=_kLineData.slice(0, 500);
	initEveryIndex(preKLines);
	for (let idx=500;idx<_kLineData.length;idx++) {
		const curKLines=_kLineData.slice(idx-500, idx);

		candleHeight=calculateCandleHeight(_kLineData.slice(idx-numForAverage, idx));

		// 设置各种指标
		setEveryIndex([...curKLines]);

		const curkLine=_kLineData[idx];
		const {open, close, openTime, closeTime, low, high}=curkLine;

		// let [emaMa1, emaMa2, emaMa3, emaMa4, emaMa5]=getLastFromArr(emaMaArr, 5);
		// let [rsi1, rsi2, rsi3, rsi4, rsi5]=getLastFromArr(rsiArr, 5);

		// 准备开仓
		if (readyTradingDirection==="hold") {
			// 判断趋势
			judgeTradingDirection(getLastFromArr(curKLines, 5));
		} else {
			// 趋势是否被破坏
			judgeBreakTradingDirection(getLastFromArr(curKLines, 5));
		}
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
			// 判断止损
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
							firstStopLossRate=0 // 防止同时触发止损
							continue;
							// }
						}
					}
					if (firstStopLossRate) {
						const firstStopPrice=orderPrice-Math.abs(orderPrice-point1)*firstStopLossRate
						if (close<firstStopPrice) {
							// 到初始止损点时，并且该k线是大阴线，移动止损到该k线的下方，避免亏损太多
							// 仓位还在，说明没有 low 没有触发止损，所以low在point1上方
							// 0.8还是比较苛刻，比较难触发，所以不会频繁触发
							// 这里不再修改止盈点，避免打破策略的平衡
							if (isBigAndYin(curkLine, 0.8)) {
								// 移动止损到low下方
								gridPoints[0]=Math.abs(low+point1)/2;
								firstStopLossRate=0
								continue;
							}
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
							firstStopLossRate=0 // 防止同时触发止损
							continue;
							// }
						}
					}
					if (firstStopLossRate) {
						const firstStopPrice=orderPrice+Math.abs(orderPrice-point2)*firstStopLossRate
						if (close>firstStopPrice) {
							// 到初始止损点时，并且该k线是大阳线，移动止损到该k线的上方，避免亏损太多
							// 仓位还在，说明没有 high 没有触发止损，所以high在point2下方
							// 0.8还是比较苛刻，比较难触发，所以不会频繁触发
							// 这里不再修改止盈点，避免打破策略的平衡
							if (isBigAndYang(curkLine, 0.8)) {
								// 减少止盈利接近开盘价
								gridPoints[1]=Math.abs(high+point2)/2;
								firstStopLossRate=0
								continue;
							}
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
	isReadyStopProfit=false;
	hasOrder=false;
};
// 指标判断方向 / 交易
const judgeTradingDirection=(kLines) => {
	// const [, , kLine1, kLine2, kLine3]=kLines;
	const [ssl1, ssl2, ssl3, ssl4, ssl5]=getLastFromArr(SSL, 5);
	const [cmf1, cmf2, cmf3, cmf4, cmf5]=getLastFromArr(CMF, 5);
	const [vo1, vo2, vo3, vo4, vo5]=getLastFromArr(VO, 5);

	// spike: spikes[spikes.length-1], // 最新 K 线的 spike 值
	// upperLine, // 上限线值
	// lowerLine // 下限线值

	const upTerm1=ssl4.sslUp<ssl4.sslDown&&ssl5.sslUp>ssl5.sslDown;
	const upTerm2=cmf5>0;
	const upTerm3=vo1.spike<vo1.upperLine&&vo5.spike>vo5.upperLine;
	if (upTerm1&&upTerm2&&upTerm3) {
		readyTradingDirection="up";
		return
	}

	const downTerm1=ssl4.sslUp>ssl4.sslDown&&ssl5.sslUp<ssl5.sslDown;
	const downTerm2=cmf5<0;
	const downTerm3=vo1.spike>vo1.lowerLine&&vo5.spike<vo5.lowerLine;
	if (downTerm1&&downTerm2&&downTerm3) {
		readyTradingDirection="down";
		return
	}
	readyTradingDirection="hold";
};
const judgeBreakTradingDirection=(kLines) => {
	// const [, , kLine1, kLine2, kLine3]=kLines;
	const [ssl1, ssl2, ssl3, ssl4, ssl5]=getLastFromArr(SSL, 5);
	const [cmf1, cmf2, cmf3, cmf4, cmf5]=getLastFromArr(CMF, 5);
	const [vo1, vo2, vo3, vo4, vo5]=getLastFromArr(VO, 5);

	const upTerm1=ssl5.sslUp>ssl5.sslDown;
	const upTerm2=cmf5>0;
	const upTerm3=vo5.spike>vo5.upperLine;
	if (readyTradingDirection==="up"&&!(upTerm1&&upTerm2&&upTerm3)) {
		readyTradingDirection="hold"
		return
	}

	const downTerm1=ssl5.sslUp<ssl5.sslDown;
	const downTerm2=cmf5<0;
	const downTerm3=vo5.spike<vo5.lowerLine;
	if (readyTradingDirection==="down"&&!(downTerm1&&downTerm2&&downTerm3)) {
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
			// readyTradingDirection = "hold";
			isReadyStopProfit=false;
			hasOrder=true;
			openHistory.push(curkLine.openTime); // 其实开单时间是：curkLine.closeTime，binance的时间显示的是open Time，方便调试这里记录openTime
			openPriceHistory.push(curkLine.close);
			firstStopProfitRate=params.firstStopProfitRate
			firstStopLossRate=params.firstStopLossRate
			break;
		case "down":
			trend="down";
			setGridPoints("down", stopLoss, stopProfit, curkLine.close);
			// readyTradingDirection = "hold";
			isReadyStopProfit=false;
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

	const [ssl1, ssl2, ssl3, ssl4, ssl5]=getLastFromArr(SSL, 5);
	const [cmf1, cmf2, cmf3, cmf4, cmf5]=getLastFromArr(CMF, 5);
	const [vo1, vo2, vo3, vo4, vo5]=getLastFromArr(VO, 5);

	let max=Math.max(kLine1.high, kLine2.high, kLine3.high);
	let min=Math.min(kLine1.low, kLine2.low, kLine3.low);
	// let maxBody=Math.max(kLine1.open, kLine1.close, kLine2.open, kLine2.close, kLine3.open, kLine3.close);
	// let minBody=Math.min(kLine1.open, kLine1.close, kLine2.open, kLine2.close, kLine3.open, kLine3.close);

	const signalUpTerm1=
		isBottomFractal(kLine1, kLine2, kLine3)|| // 是否底分形态
		isBigAndYang(kLine3, 0.85)||
		(isUpLinesGroup2(kLine2, kLine3)&&(isUpCross(kLine1)||isBigAndYang(kLine1, 0.6)))|| // 是否两个k形成垂线
		(isUpLinesGroup3(kLine1, kLine2, kLine3)&&(isBigAndYang(kLine3, 0.6)||isUpCross(kLine3, 0.4)))|| // 是否三个k形成垂线
		(isUpSwallow(kLine2, kLine3)&&kLine3.high>kLine1.high)|| // 看涨吞没
		(isUpSwallow(kLine1, kLine2)&&isBigAndYang(kLine3, 0.6))|| // 看涨吞没 + 大阳k
		(isUpLinesGroup2(kLine1, kLine2)&&(isUpCross(kLine3)||isBigLine(kLine3, 0.6)))|| // k1，k2刺透, k3垂线
		isUpStar(kLine1, kLine2, kLine3)|| // 启明星
		isBreakUp(kLine1, kLine2, kLine3)|| // k3 突破k1/k2，k3是光k
		upPao(kLine1, kLine2, kLine3);

	const signalUpTerm2=ssl5.sslUp>ssl5.sslDown&&cmf5>0&&vo5.spike>vo5.upperLine;
	if (readyTradingDirection==="up"&&signalUpTerm1&&signalUpTerm2) {
		// min=min<emaMa5.sma? emaMa5.sma:min;
		if (min<close*(1-invalidSigleStopRate)) {
			return {
				trend: "hold",
			};
		}
		if (min<close*(1-maxStopLossRate)) min=close*(1-maxStopLossRate);
		return {
			trend: "up",
			stopLoss: min, // 止损
			// stopLoss: curEma144, // 止损
			// stopProfit: close + candleHeight * howManyCandle, // 止盈
			stopProfit: close+(close-min)*howManyCandle, // 止盈
		};
	}

	const signalDownTerm1=
		(isLowerLow(kLine1, kLine2, kLine3)&&isBigLine(kLine3, 0.6))|| // 顶顶高 k3是光k / 三小连阳
		isBigAndYin(kLine3, 0.85)||
		isTopFractal(kLine1, kLine2, kLine3)|| // 是否顶分形态
		(isDownLinesGroup2(kLine2, kLine3)&&(isDownCross(kLine1)||isBigAndYin(kLine1, 0.6)))|| // 是否两个k形成垂线/光头阴
		(isDownLinesGroup3(kLine1, kLine2, kLine3)&&(isBigAndYin(kLine3, 0.6)||isDownCross(kLine3, 0.4)))|| // 是否三个k形成垂线
		(isDownSwallow(kLine2, kLine3)&&kLine3.low<kLine1.low)|| // 看跌吞没
		(isDownSwallow(kLine1, kLine2)&&isBigAndYin(kLine3, 0.6))|| // 看跌吞没 + 大阴k
		(isDownLinesGroup2(kLine1, kLine2)&&(isDownCross(kLine3)||isBigLine(kLine3, 0.6)))|| // k1，k2刺透, k3垂线/大k
		isDownStar(kLine1, kLine2, kLine3)|| // 启明星
		isBreakDown(kLine1, kLine2, kLine3)|| // k3 突破k1/k2，k3是光k
		downPao(kLine1, kLine2, kLine3);
	const signalDownTerm2=ssl5.sslUp<ssl5.sslDown&&cmf5<0&&vo5.spike<vo5.lowerLine;
	if (readyTradingDirection==="down"&&signalDownTerm1&&signalDownTerm2) {
		// max=max>emaMa5.sma? emaMa5.sma:max;
		if (max>close*(1+invalidSigleStopRate)) {
			return {
				trend: "hold",
			};
		}
		if (max>close*(1+maxStopLossRate)) max=close*(1+maxStopLossRate);
		return {
			trend: "down",
			stopLoss: max, // 止损
			// stopLoss: curEma144, // 止损
			// stopProfit: close - candleHeight * howManyCandle, // 止盈
			stopProfit: close-(max-close)*howManyCandle, // 止盈
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
		howManyCandle,
		firstStopProfitRate,
		firstProtectProfitRate,
		firstStopLossRate,
		isProfitRun,
		profitProtectRate,
		howManyCandleForProfitRun,
		maxStopLossRate,
		invalidSigleStopRate,
		double,
		maxLossCount,
		xxxx: '--------------------------------',
		availableMoney,
		maxAvailableMoney,
		winNum,
		failNum,
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
		`./tests/data/${symbol}-SSL_CMF_VO.js`,
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
	"howManyCandle": 2.1,
	"firstStopProfitRate": 1.5,
	firstProtectProfitRate: -0.1,
	firstStopLossRate: 0.8, //  当前亏损/止损区间 >= firstStopLossRate 时修改止损移到当前k线下方（只用一次后失效）
	"isProfitRun": 1, // 选胜率最高的howManyCandle才开启移动止盈，开启后，再找最佳profitProtectRate
	"profitProtectRate": 0.8,
	"howManyCandleForProfitRun": 1,
	"maxStopLossRate": 0.05,
	"invalidSigleStopRate": 0.1,
	"double": 0,
	"maxLossCount": 20,
	SSL_PERIOD: 20,
	CMF_PERIOD: 20,
	VO_PERIOD: 100,

	// targetTime: "2024-11-30_00-00-00",
});
module.exports={
	evaluateStrategy: start,
};
