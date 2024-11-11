/**
 * 计算单个真实范围（True Range, TR）
 * @param {number} high 当前最高价
 * @param {number} low 当前最低价
 * @param {number} prevClose 前一收盘价
 * @returns {number} 真实范围值
 */
function calculateTrueRange(high, low, prevClose) {
    return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
}

/**
 * 计算平均真实范围（Average True Range, ATR）
 * @param {Array} kLines K线数据数组，每个元素为一个对象，包含 {high, low, close} 属性
 * @param {number} period 计算 ATR 的周期（例如 14）
 * @returns {Array} ATR 值数组
 */
function calculateATR(kLines, period) {
    if (kLines.length < period) {
        throw new Error("K线数据不足以计算指定周期的ATR");
    }

    let trValues = [];
    let atrValues = [];

    for (let i = 0; i < kLines.length; i++) {
        if (!kLines[i].high || !kLines[i].low || !kLines[i].close) {
            throw new Error(`K线数据格式不正确，第 ${i} 行缺少 high、low 或 close 属性`);
        }

        if (i === 0) {
            trValues.push(kLines[i].high - kLines[i].low);
        } else {
            trValues.push(calculateTrueRange(kLines[i].high, kLines[i].low, kLines[i - 1].close));
        }

        if (i >= period - 1) {
            if (i === period - 1) {
                const initialATR = trValues.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
                atrValues.push(initialATR);
            } else {
                const prevATR = atrValues[atrValues.length - 1];
                const currentTR = trValues[i];
                const currentATR = (prevATR * (period - 1) + currentTR) / period;
                atrValues.push(currentATR);
            }
        }
    }

    return atrValues;
}

module.exports = {
    calculateATR,
};
