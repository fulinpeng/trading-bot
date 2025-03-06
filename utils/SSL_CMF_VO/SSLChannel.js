/**
 * 计算 SSL 通道指标值 (SSL Channel)
 * @param {Array<Object>} klineData - K 线数据数组，每个对象应包含 high, low, close 值
 * @param {Object} params - 指标参数对象
 * @param {number} params.len - SMA 的计算周期
 * @returns {Object} - 返回最新 K 线对应的 sslDown 和 sslUp 指标值
 */
function calculateSSLChannel(klineData, len = 20) {
    // 检查输入数据是否合法
    if (!Array.isArray(klineData) || klineData.length < len) {
        throw new Error("K 线数据长度不足以计算指标或格式不正确");
    }

    // 计算简单移动平均线 (SMA)
    function sma(values, period) {
        if (values.length < period) {
            throw new Error("数据长度不足以计算 SMA");
        }
        const sum = values.slice(-period).reduce((acc, value) => acc + value, 0);
        return sum / period;
    }

    // 计算 high 和 low 的 SMA
    const smaHigh = sma(
        klineData.map((kline) => kline.high),
        len
    );
    const smaLow = sma(
        klineData.map((kline) => kline.low),
        len
    );

    // Hlv 计算逻辑
    let hlv = null;
    const lastClose = klineData[klineData.length - 1].close; // 获取最新的 close 值
    if (lastClose > smaHigh) {
        hlv = 1;
    } else if (lastClose < smaLow) {
        hlv = -1;
    } else {
        // 如果当前 close 值在 smaHigh 和 smaLow 之间，继承上一根 K 线的 Hlv 值
        hlv = klineData.length > 1 ? klineData[klineData.length - 2].hlv || 0 : 0; // 默认值为 0
    }

    // 计算 SSL 通道的上下轨
    const sslDown = hlv < 0 ? smaHigh : smaLow;
    const sslUp = hlv < 0 ? smaLow : smaHigh;

    // 返回最新 K 线对应的 SSL 通道值
    return {sslDown, sslUp};
}

// // 示例调用
// const klineData=[
// 	{high: 105, low: 95, close: 100},
// 	{high: 110, low: 100, close: 105},
// 	{high: 115, low: 105, close: 110},
// 	{high: 120, low: 110, close: 115},
// 	{high: 125, low: 115, close: 120},
// 	// 更多 K 线数据...
// ];

// const params={len: 3};

// try {
// 	const result=calculateSSLChannel(klineData, params);
// 	console.log("最新 K 线的 SSL 通道值：", result);
// } catch (error) {
// 	console.error("错误：", error.message);
// }

module.exports = {
    calculateSSL: calculateSSLChannel,
};
