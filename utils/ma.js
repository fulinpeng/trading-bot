// 计算简单移动平均线
function calculateSimpleMovingAverage(prices, period) {
	if (prices.length<period) {
		throw new Error("Not enough data points for the specified period.");
	}

	const slice=prices.slice(prices.length-period);
	const sum=slice.reduce((acc, price) => acc+price, 0);
	return sum/period;
}

// 计算指数移动平均 EMA
const calculateEMA=(prices, period) => {
	// 计算初始的简单移动平均（SMA）
	let sum=0;
	for (let i=0;i<period;i++) {
		sum+=prices[i];
	}
	let ema=sum/period; // 初始 EMA 是前 N 天的简单平均

	// 计算 EMA 的 multiplier
	const multiplier=2/(period+1);

	// 从第 period 天开始计算 EMA
	for (let i=period;i<prices.length;i++) {
		ema=(prices[i]-ema)*multiplier+ema; // 更新 EMA
	}

	return ema;
};
// 计算简单移动平均线 (SMA)
function calculateSmaArr(values, length) {
	return values.map((val, idx, arr) => {
		// 如果当前索引小于长度，返回 null，因为还无法计算均值
		if (idx<length-1) return null;
		// 计算指定长度窗口内的均值
		const sum=arr.slice(idx-length+1, idx+1).reduce((a, b) => a+b, 0);
		return sum/length;
	});
}
// 计算指数移动平均线 (EMA)
function calculateEmaArr(values, length) {
	const multiplier=2/(length+1); // 计算 EMA 的平滑因子
	return values.map((val, idx, arr) => {
		// 第一个值直接返回，因为没有之前的值进行平滑
		if (idx===0) return val;
		// 使用之前的 EMA 值和当前值计算新的 EMA
		const prevEma=idx===1? val:arr[idx-1];
		return val*multiplier+prevEma*(1-multiplier);
	});
}

module.exports={
	calculateSimpleMovingAverage,
	calculateEMA,
	calculateSmaArr,
	calculateEmaArr
};
