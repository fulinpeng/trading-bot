/**
 * 创建一个 StochRSI 指标计算器，内部维护历史数据
 * @param {number} smoothK - 第一次平滑周期（例如 3）
 * @param {number} smoothD - 第二次平滑周期（例如 3）
 * @param {number} lengthRSI - RSI 计算周期（例如 14）
 * @param {number} lengthStoch - Stochastic RSI 计算周期（例如 14）
 * @returns {object} 包含 update(closePrice) 和 reset() 方法
 */
function createStochRSICalculator(smoothK = 3, smoothD = 3, lengthRSI = 14, lengthStoch = 14) {
    // 内部状态：历史数据存储
    let priceHistory = []; // 原始价格序列
    let rsiHistory = []; // RSI计算结果
    let stochRsiHistory = []; // StochRSI计算结果
    let rsiSmaHistory = []; // 第一次平滑结果
    let rsiSmaSmaHistory = []; // 第二次平滑结果

    /**
     * 核心更新函数：传入当前价格，更新所有历史数据，返回最新的平滑结果
     * @param {number} closePrice - 当前收盘价
     * @returns {object|null} { rsi_sma, rsi_sma_sma } 或数据不足返回 null
     */
    function update(closePrice) {
        priceHistory.push(closePrice);

        // 1. 计算 RSI（需要至少 lengthRSI+1 个价格数据）
        const rsi = calculateRSI();
        if (rsi === null) return null;
        rsiHistory.push(rsi);

        // 2. 计算 Stochastic RSI（需要至少 lengthStoch 个 RSI 数据）
        const stochRsi = calculateStochRSI();
        if (stochRsi === null) return null;
        stochRsiHistory.push(stochRsi);

        // 3. 第一次 SMA 平滑 (smoothK) 对 StochRSI 序列
        const smaK = calculateSMA(stochRsiHistory, smoothK);
        if (smaK === null) return null;
        rsiSmaHistory.push(smaK);

        // 4. 第二次 SMA 平滑 (smoothD) 对第一次 SMA 序列
        const smaD = calculateSMA(rsiSmaHistory, smoothD);
        if (smaD === null) return null;
        rsiSmaSmaHistory.push(smaD);

        return {
            rsi_sma: smaK,
            rsi_sma_sma: smaD,
        };
    }

    /**
     * 计算 RSI 值（使用简单平均法），返回最新 RSI 值
     * 要求 priceHistory 至少包含 lengthRSI+1 个数据
     */
    function calculateRSI() {
        if (priceHistory.length < lengthRSI + 1) return null;

        const prices = priceHistory.slice(-(lengthRSI + 1));
        let gains = 0;
        let losses = 0;
        for (let i = 1; i < prices.length; i++) {
            const diff = prices[i] - prices[i - 1];
            if (diff > 0) gains += diff;
            else losses -= diff;
        }
        const avgGain = gains / lengthRSI;
        const avgLoss = losses / lengthRSI;
        const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
        return 100 - 100 / (1 + rs);
    }

    /**
     * 计算 Stochastic RSI 值，基于最近 lengthStoch 个 RSI 数据
     */
    function calculateStochRSI() {
        if (rsiHistory.length < lengthStoch) return null;

        const rsiWindow = rsiHistory.slice(-lengthStoch);
        const currentRSI = rsiWindow[rsiWindow.length - 1];
        const minRSI = Math.min(...rsiWindow);
        const maxRSI = Math.max(...rsiWindow);

        return maxRSI === minRSI ? 0 : ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;
    }

    /**
     * 计算简单移动平均 (SMA) 值，基于 dataArray 的后 period 个数据
     */
    function calculateSMA(dataArray, period) {
        if (dataArray.length < period) return null;
        const window = dataArray.slice(-period);
        return window.reduce((sum, val) => sum + val, 0) / period;
    }

    /**
     * 清除所有历史数据
     */
    function reset() {
        priceHistory = priceHistory.slice(-200);
        rsiHistory = rsiHistory.slice(-200);
        stochRsiHistory = stochRsiHistory.slice(-200);
        rsiSmaHistory = rsiSmaHistory.slice(-200);
        rsiSmaSmaHistory = rsiSmaSmaHistory.slice(-200);
    }

    // 返回接口
    return { update, reset };
}

// // ===== 使用示例 =====

// // 创建一个指标计算器实例（参数可按需调整）
// const stochRSICalc=createStochRSICalculator(3, 3, 14, 14);

// // 模拟传入一系列价格数据
// const samplePrices=[
// 	1.1, 1.12, 1.15, 1.13, 1.17, 1.2, 1.22, 1.25, 1.28, 1.3,
// 	1.32, 1.35, 1.37, 1.4, 1.42, 1.45, 1.47, 1.5, 1.52, 1.55,
// 	1.57, 1.6, 1.62, 1.65, 1.67, 1.7, 1.72, 1.75, 1.77, 1.8,
// 	1.82, 1.85, 1.9, 1.92, 1.95, 1.98, 2.0, 2.02, 1.15, 1.13, 1.17, 1.2, 1.22, 1.25, 1.28, 1.3,
// 	1.32, 1.35, 1.37, 1.4, 1.42, 1.45, 1.47, 1.5, 1.52, 1.55,
// 	1.57, 1.6, 1.62, 1.65, 1.67, 1.7, 1.72, 1.75, 1.77, 1.8,
// 	1.82, 1.85, 1.9, 1.92, 1.95, 1.98, 2.0, 2.02
// ];

// // 依次更新数据
// samplePrices.forEach(price => {
// 	const result=stochRSICalc.update(price);
// 	if (result!==null) {
// 		console.log(`当前价格: ${price}, rsi_sma: ${result.rsi_sma.toFixed(2)}, rsi_sma_sma: ${result.rsi_sma_sma.toFixed(2)}`);
// 	}
// });

module.exports = {
    createStochRSICalculator,
};
