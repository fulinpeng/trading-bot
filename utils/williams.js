/**
 * 计算威廉指标 (Williams %R)
 * @param {Array} data - K线数据数组，需包含 high, low, close 属性
 * @param {number} period - 计算周期（默认14）
 * @returns {Array} 威廉指标值数组，长度与输入数据一致，前(period-1)项为null
 */
function calculateWilliamsR(data, period = 14) {
    // 参数校验
    if (!Array.isArray(data)) {
        throw new Error('Invalid data format. Expected array.');
    }
    if (data.length < period) {
        console.warn(`Insufficient data length. Need at least ${period} entries.`);
        return null;
    }

    let result = null;

    // 提取当前计算窗口
    const window = data.slice(-data.length);

    // 计算窗口内极值
    const highest = Math.max(...window.map(d => d.high));
    const lowest = Math.min(...window.map(d => d.low));
    const currentClose = data[data.length - 1].close;

    // 防止除零错误（当最高价=最低价时）
    if (highest === lowest) {
        result = -0; // 中性位置标记
    } else {
        // 威廉指标公式
        const williamsR = ((highest - currentClose) / (highest - lowest)) * -100;
        result = Number(williamsR.toFixed(4)); // 保留4位小数
    }

    return result;
}

module.exports = {
    calculateWilliamsR,
};
