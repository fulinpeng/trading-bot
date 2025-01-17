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
const {calculateKDJs}=require("../utils/KDJ");
const {calculateBBKeltnerSqueeze}=require("../utils/BBKeltner");
const fs=require("fs");
const symbol="dogeUSDT";
let {kLineData}=require(`./source/${symbol}-2h.js`);

const DefaultAvailableMoney=100
let maxAvailableMoney=0;
let _kLineData=[...kLineData];
let double=0;
let lossCount=0
let maxLossCount=2
let availableMoney=DefaultAvailableMoney*(1+lossCount)
let howManyCandle=1;
let numForAverage=12;
let isProfitRun=0;
let firstStopProfitRate=0;
let profitProtectRate=0.6;
let howManyCandleForProfitRun=0.5;
let maxStopLossRate=0.01;
let invalidSigleStopRate=0.02;

let kdjPeroid=25;
let bbkPeroid=20;
let KDJ=[10, 90];

const getQuantity=(currentPrice) => {
	availableMoney=DefaultAvailableMoney*(1+lossCount)
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

let kdjs=[];
let bbkRes={};

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

const initEveryIndex=(historyClosePrices, curKLines) => {
	setEveryIndex(historyClosePrices, curKLines);
};
const setEveryIndex=(historyClosePrices, curKLines) => {
	kdjs=calculateKDJs(curKLines, kdjPeroid);
	bbkRes=calculateBBKeltnerSqueeze(curKLines, bbkPeroid);
};

const resetInit=() => {
	_kLineData=[...kLineData];
	howManyCandle=1;
	isProfitRun=0;
	double=0;
	lossCount=0
	maxLossCount=2
	firstStopProfitRate=0;
	firstStopLossRate=0;
	profitProtectRate=0.6;
	howManyCandleForProfitRun=0.5;
	maxStopLossRate=0.01;
	invalidSigleStopRate=0.02;
	numForAverage=12;
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
	emaFast=[];
	ema144=[];
	ema169=[];
	targetTime=null;

	kdjPeroid=25
	bbkPeroid=20
	KDJ=[10, 90]
};
const start=(params) => {
	// 每次需要初始化 ???? 检查初始化是否覆盖所有全局变量
	resetInit();
	if (params) {
		howManyCandle=params.howManyCandle;
		numForAverage=params.numForAverage;
		isProfitRun=params.isProfitRun;
		firstStopProfitRate=params.firstStopProfitRate;
		profitProtectRate=params.profitProtectRate;
		howManyCandleForProfitRun=params.howManyCandleForProfitRun;
		maxStopLossRate=params.maxStopLossRate;
		invalidSigleStopRate=params.invalidSigleStopRate;
		double=params.double;
		maxLossCount=params.maxLossCount;
		targetTime=params.targetTime;
		kdjPeroid=params.kdjPeroid;
		bbkPeroid=params.bbkPeroid;
		KDJ=params.KDJ;
	}
	if (targetTime) {
		targetTime=params.targetTime;
		let start=kLineData.findIndex((v) => v.openTime===targetTime);
		_kLineData=[...kLineData].slice(start);
	}
	const preKLines=_kLineData.slice(0, 200);
	const prePrices=preKLines.map((v) => v.close);
	initEveryIndex(prePrices, preKLines);
	for (let idx=201;idx<_kLineData.length;idx++) {
		const curKLines=_kLineData.slice(idx-200, idx);
		const historyClosePrices=curKLines.map((v) => v.close);

		candleHeight=calculateCandleHeight(_kLineData.slice(idx-numForAverage, idx));

		// 设置各种指标
		setEveryIndex([...historyClosePrices], curKLines);

		const curkLine=_kLineData[idx];
		const {open, close, openTime, closeTime, low, high}=curkLine;

		const kdj=kdjs[kdjs.length-1];
		const {B2basis, B2upper, B2lower, Kma, Kupper, Klower, squeeze}=bbkRes;
		const len=B2basis.length;
		const curB2basis=B2basis[len-1];
		const curB2upper=B2upper[len-1];
		const curB2lower=B2lower[len-1];
		const curKma=Kma[len-1];
		const curKupper=Kupper[len-1];
		const curKlower=Klower[len-1];
		const isSqueeze=squeeze[len-1];

		// 准备开仓
		if (readyTradingDirection==="hold") {
			// 判断趋势
			judgeTradingDirection(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj);
		} else {
			// 趋势是否被破坏
			judgeBreakTradingDirection(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj);
		}
		if (!hasOrder) {
			// 开仓：没有仓位就根据 readyTradingDirection 开单
			// 开单完成后会重置 readyTradingDirection
			if (readyTradingDirection!=="hold") {
				judgeAndTrading(
					curB2basis,
					curB2upper,
					curB2lower,
					curKma,
					curkLine,
					isSqueeze,
					kdj,
					getLastFromArr(curKLines, 5),
					params
				);
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
						failNum++;
						reset();
						continue;
					}

					if (firstStopProfitRate) {
						const firstProfitPrice=orderPrice+Math.abs(orderPrice-point1)*firstStopProfitRate
						if (close>firstProfitPrice) {
							// 到初始止盈点时，并且该k线是阴线，移动止损到开仓价，避免盈利回撤
							if (close<open) {
								// 减少止损
								gridPoints[0]=orderPrice//+Math.abs(orderPrice-firstProfitPrice)/2;
								firstStopProfitRate=0
								continue;
							}
						}
					}
					if (firstStopLossRate) {
						const firstStopPrice=orderPrice-Math.abs(orderPrice-point1)*firstStopLossRate
						if (close<firstStopPrice) {
							// 到初始止损点时，并且该k线是阳线，移动止盈到开仓价，避免亏损太多
							if (close<open) {
								// 减少止盈利接近开盘价
								gridPoints[1]=orderPrice //+Math.abs(orderPrice-firstStopPrice)/25;
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
						failNum++;
						reset();
						continue;
					}
					if (firstStopProfitRate) {
						const firstProfitPrice=orderPrice-Math.abs(orderPrice-point2)*firstStopProfitRate
						if (close<firstProfitPrice) {
							// 到初始止盈点时，并且该k线是阳线，移动止损到开仓价，避免盈利回撤
							if (close>open) {
								// 减少止损
								gridPoints[1]=orderPrice//-Math.abs(orderPrice-firstProfitPrice)/25;
								firstStopProfitRate=0
								continue;
							}
						}
					}
					if (firstStopLossRate) {
						const firstStopPrice=orderPrice+Math.abs(orderPrice-point2)*firstStopLossRate
						if (close>firstStopPrice) {
							// 到初始止损点时，并且该k线是阴线，移动止盈到开仓价，避免亏损太多
							if (close>open) {
								// 减少止盈利接近开盘价
								gridPoints[0]=orderPrice //+Math.abs(orderPrice-firstStopPrice)/25;
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
						winNum++;
						reset();
						continue;
					}
					// 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
					if (hasOrder&&trend==="down"&&low<=point1) {
						setProfit(orderPrice, point1, openTime);
						winNum++;
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
		const {close, closeTime, low, high}=curkLine;
		const [point1, point2]=gridPoints;
		if (hasOrder) {
			// 判断止损
			if (trend==="up") {
				// low 小于 point1 就止损，否则继续持有
				if (low<=point1) {
					setProfit(orderPrice, point1, openTime);
					failNum++;
					reset();
					return;
				}
			}
			if (hasOrder&&trend==="down") {
				// high 大于 point2 就止损，否则继续持有
				if (high>=point2) {
					setProfit(orderPrice, point2, openTime);
					failNum++;
					reset();
					return;
				}
			}
		}
		if (hasOrder) {
			// 判断止盈：上面没有被止损，也没被止盈，那看下面是否能止盈，high 大于 point2 就止盈利，否则继续持有
			if (trend==="up"&&high>=point2) {
				setProfit(orderPrice, point2, openTime);
				winNum++;
				reset();
				return;
			}
			// 上面没有被止损，那看是否能止盈，low 小于 point1 就止盈利，否则继续持有
			if (hasOrder&&trend==="down"&&low<=point1) {
				setProfit(orderPrice, point1, openTime);
				winNum++;
				reset();
				return;
			}
		}
	}
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
const judgeTradingDirection=(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj) => {
	let {high, low, close}=curkLine;

	// 第一, 挤压
	// 第二, 在挤压的范围内收盘在布林通道的下线, 并且KDJ小于20以下
	// 第三, 此时准备开多
	const upTerm1=isSqueeze;
	const upTerm2=curkLine.close<curB2lower; //  && isBigAndYin(curkLine, 0.4)
	const upTerm3=kdj.j<KDJ[0];
	if (upTerm1&&upTerm2&&upTerm3) {
		// 有订单时候只设置 下一个订单方向 还不能开单
		readyTradingDirection="up";
		return;
	}
	// 第一, 挤压
	// 第二, 在挤压的范围内收盘在布林通道的上线, 并且KDJ大于80以上
	// 第三, 此时准备开空
	const downTerm1=isSqueeze;
	const downTerm2=curkLine.close>curB2upper; // && isBigAndYang(curkLine, 0.4)
	const downTerm3=kdj.j>KDJ[1];
	if (downTerm1&&downTerm2&&downTerm3) {
		// 有订单时候只设置 下一个订单方向 还不能开单
		readyTradingDirection="down";
		return;
	}
};
const judgeBreakTradingDirection=(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj) => {
	let {high, low, close}=curkLine;

	// 多头被破坏
	const upTerm1=close>curB2lower;
	if (readyTradingDirection==="up"&&!upTerm1) {
		readyTradingDirection="hold";
		return;
	}
	// 空头被破坏
	const downTerm1=close<curB2upper;
	if (readyTradingDirection==="down"&&!downTerm1) {
		readyTradingDirection="hold";
		return;
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
const judgeAndTrading=(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj, curKLines, params) => {
	// 根据指标判断是否可以开单
	const trendInfo=calculateTradingSignal(
		curB2basis,
		curB2upper,
		curB2lower,
		curKma,
		curkLine,
		isSqueeze,
		kdj,
		curKLines,
	);
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
const calculateTradingSignal=(curB2basis, curB2upper, curB2lower, curKma, curkLine, isSqueeze, kdj, curKLines) => {
	const [a, b, kLine1, kLine2, kLine3]=curKLines;

	const {open, close, openTime, closeTime, low, high}=kLine3;

	let max=Math.max(a.high, b.high, kLine1.high, kLine2.high, kLine3.high);
	let min=Math.min(a.low, b.low, kLine1.low, kLine2.low, kLine3.low);

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

	// 当KDJ大于20以上, 并且阳线, 收盘价进场
	const signalUpTerm2=kdj.j>KDJ[0]&&close>open;
	if (readyTradingDirection==="up"&&signalUpTerm1&&signalUpTerm2) {
		// min = min < curEma169 ? curEma169 : min;
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
	// 当KDJ大于80以上, 并且阴线, 收盘价进场
	const signalDownTerm2=kdj.j<KDJ[1]&&close<open;
	if (readyTradingDirection==="down"&&signalDownTerm1&&signalDownTerm2) {
		// max = max > curEma169 ? curEma169 : max;
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
		availableMoney,
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
		`./tests/data/${symbol}-BBK.js`,
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
	// howManyCandle: 1,
	numForAverage: 12,
	// isProfitRun: 1,
	// firstStopProfitRate: 0.5,
	// profitProtectRate: 0.9,
	// howManyCandleForProfitRun: 0.5,
	// maxStopLossRate: 0.05,
	// invalidSigleStopRate: 0.1,
	// double: 1, // 损失后加倍开仓
	// maxLossCount: 5,
	// targetTime: "2024-09-01_00-00-00",
	howManyCandle: 1, // 初始止盈，盈亏比
	isProfitRun: 1, // 是否开启移动止盈
	firstStopProfitRate: 0.5, // 是否开启初始止盈(比例基于止损)（到初始止盈点时，移动止损到开仓价）
	firstStopLossRate: 0.5, // 是否开启初始止损（到初始止损点时，移动止盈到开仓价）
	profitProtectRate: 0.8, // 移动止盈，保留盈利比例
	howManyCandleForProfitRun: 0.5,
	maxStopLossRate: 0.05, // 止损小于10%的情况，最大止损5%
	invalidSigleStopRate: 0.1, // 止损在10%，不开单
	double: 1, // 是否损失后加倍开仓
	maxLossCount: 20, // 损失后加倍开仓，最大倍数
	// targetTime: "2024-09-01_00-00-00",

	kdjPeroid: 25,
	bbkPeroid: 20,
	KDJ: [10, 90],
});
module.exports={
	evaluateStrategy: start,
};
