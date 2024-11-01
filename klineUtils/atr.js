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
    let trValues = [];
    let atrValues = [];

    for (let i = 0; i < kLines.length; i++) {
        if (i === 0) {
            // 第一根 K 线没有前一收盘价，TR 值为最高价减最低价
            trValues.push(kLines[i].high - kLines[i].low);
        } else {
            // 计算 TR 值
            trValues.push(calculateTrueRange(kLines[i].high, kLines[i].low, kLines[i - 1].close));
        }

        // 计算 ATR 值
        if (i >= period - 1) {
            if (i === period - 1) {
                // 第一个 ATR 值为前 period 个 TR 值的简单平均
                const initialATR = trValues.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
                atrValues.push(initialATR);
            } else {
                // 后续 ATR 值为前一个 ATR 值与当前 TR 值的加权平均
                const prevATR = atrValues[atrValues.length - 1];
                const currentTR = trValues[i];
                const currentATR = (prevATR * (period - 1) + currentTR) / period;
                atrValues.push(currentATR);
            }
        }
    }

    return {
        atrArr: atrValues,
        atr: atrValues[atrValues.length - 1],
    };
}

module.exports = {
    calculateATR,
};
