/**
 * 计算 Chaikin Money Flow (CMF) 指标值
 * @param {Array<Object>} klineData - K线数据数组，每个对象应包含 open, high, low, close, volume 值
 * @param {Object} params - 指标参数对象
 * @param {number} params.length - CMF 计算的周期长度
 * @returns {number} - 返回最新 K 线对应的 CMF 指标值
 */
function calculateCMF(klineData, length = 20) {
    // 检查输入数据合法性
    if (!Array.isArray(klineData) || klineData.length < length) {
        throw new Error("K线数据长度不足以计算指标或格式不正确");
    }

    // 检查是否提供了有效的成交量数据
    const totalVolume = klineData.reduce((sum, kline) => sum + (kline.volume || 0), 0);
    if (totalVolume === 0) {
        throw new Error("没有提供有效的成交量数据，无法计算 CMF 指标");
    }

    // 计算每根 K 线的 Accumulation/Distribution (A/D) 值
    const adValues = klineData.map((kline) => {
        const {high, low, close, volume} = kline;
        if (high === low) {
            return 0; // 避免除以零
        }
        return ((2 * close - low - high) / (high - low)) * volume;
    });

    // 计算最近 length 周期的 A/D 总和
    const adSum = adValues.slice(-length).reduce((sum, value) => sum + value, 0);

    // 计算最近 length 周期的成交量总和
    const volumeSum = klineData.slice(-length).reduce((sum, kline) => sum + (kline.volume || 0), 0);

    // 计算 CMF 值
    const cmf = volumeSum !== 0 ? adSum / volumeSum : 0;

    // 返回最新 K 线的 CMF 值
    return cmf;
}

// // 示例调用
// const klineData=[
// 	{open: 100, high: 105, low: 95, close: 102, volume: 1000},
// 	{open: 102, high: 108, low: 101, close: 107, volume: 1500},
// 	{open: 107, high: 110, low: 106, close: 109, volume: 1200},
// 	{open: 109, high: 112, low: 108, close: 111, volume: 1300},
// 	{open: 111, high: 115, low: 110, close: 114, volume: 1400},
// 	// 更多 K 线数据...
// ];

// const params={length: 3};

// try {
// 	const result=calculateCMF(klineData, params);
// 	console.log("最新 K 线的 CMF 值：", result);
// } catch (error) {
// 	console.error("错误：", error.message);
// }

module.exports = {
    calculateCMF,
};
