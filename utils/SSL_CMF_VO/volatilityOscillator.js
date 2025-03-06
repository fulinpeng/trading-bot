/**
 * 计算 Volatility Oscillator 指标值
 * @param {Array<Object>} klineData - K线数据数组，每个对象应包含 open 和 close 值
 * @param {Object} params - 指标参数对象
 * @param {number} params.length - 标准差计算的周期长度
 * @returns {Object} - 返回最新 K 线的指标值，包括 spike、upperLine 和 lowerLine
 */
function calculateVolatilityOscillator(klineData, length = 100) {
    // 检查输入数据合法性
    if (!Array.isArray(klineData) || klineData.length < length) {
        throw new Error("K线数据长度不足以计算指标或格式不正确");
    }

    // 计算每根 K 线的 spike 值 (close - open)
    const spikes = klineData.map((kline) => kline.close - kline.open);

    // 计算标准差 (Standard Deviation, stdev)
    function calculateStandardDeviation(data, period) {
        if (data.length < period) {
            throw new Error("数据长度不足以计算标准差");
        }

        const subset = data.slice(-period); // 取最后 `period` 个数据
        const mean = subset.reduce((sum, value) => sum + value, 0) / period; // 计算平均值
        const variance = subset.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / period; // 计算方差
        return Math.sqrt(variance); // 返回标准差
    }

    // 计算 spike 的标准差
    const stdevSpike = calculateStandardDeviation(spikes, length);

    // 计算 Upper Line 和 Lower Line
    const upperLine = stdevSpike; // 上限线
    const lowerLine = -stdevSpike; // 下限线

    // 返回最新 K 线对应的指标值
    return {
        spike: spikes[spikes.length - 1], // 最新 K 线的 spike 值
        upperLine, // 上限线值
        lowerLine, // 下限线值
    };
}

// // 示例调用
// const klineData=[
// 	{open: 100, close: 105},
// 	{open: 104, close: 102},
// 	{open: 101, close: 103},
// 	{open: 103, close: 110},
// 	{open: 108, close: 115},
// 	// 添加更多的 K 线数据...
// ];

// const params={length: 3};

// try {
// 	const result=calculateVolatilityOscillator(klineData, params);
// 	console.log("最新K线的指标值：", result);
// } catch (error) {
// 	console.error("错误：", error.message);
// }

module.exports = {
    calculateVO: calculateVolatilityOscillator,
};
