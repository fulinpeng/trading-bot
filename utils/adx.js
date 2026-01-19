const { calculateSimpleMovingAverage, calculateSmaArr } = require("./ma.js");

// 计算ADX（保持向后兼容）
function calculateADX(data, period = 14) {
    const result = calculateADXFull(data, period);
    return result ? result.ADX : null;
}

/**
 * 计算完整的 ADX 指标（包括 DIPlus、DIMinus、ADX 和历史值）
 * 基于 Pine Script 的 ADX 实现
 * @param {Array} data - K线数据数组，每个元素包含 {high, low, close}
 * @param {number} period - ADX 周期，默认12
 * @returns {Object} - { ADX, DIPlus, DIMinus, ADXHistory, DIPlusHistory, DIMinusHistory }
 */
function calculateADXFull(data, period = 12) {
    if (!data || data.length < period * 2) {
        return null;
    }

    const tr = [];
    const plusDM = [];
    const minusDM = [];

    // 计算 True Range 和 Directional Movement
    for (let i = 1; i < data.length; i++) {
        const highDiff = parseFloat(data[i].high) - parseFloat(data[i - 1].high);
        const lowDiff = parseFloat(data[i - 1].low) - parseFloat(data[i].low);

        const plus = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
        const minus = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;

        const trueRange = Math.max(
            parseFloat(data[i].high) - parseFloat(data[i].low),
            Math.abs(parseFloat(data[i].high) - parseFloat(data[i - 1].close)),
            Math.abs(parseFloat(data[i].low) - parseFloat(data[i - 1].close))
        );

        plusDM.push(plus);
        minusDM.push(minus);
        tr.push(trueRange);
    }

    // 使用 Wilder's Smoothing (类似 EMA，但使用不同的平滑方法)
    // Pine Script 中的实现：SmoothedTR := nz(SmoothedTR[1]) - (nz(SmoothedTR[1]) / adx_len) + TrueRange
    let smoothedTR = [];
    let smoothedPlusDM = [];
    let smoothedMinusDM = [];

    // 初始化第一个值
    if (tr.length > 0) {
        let sumTR = 0;
        let sumPlusDM = 0;
        let sumMinusDM = 0;
        for (let i = 0; i < period && i < tr.length; i++) {
            sumTR += tr[i];
            sumPlusDM += plusDM[i];
            sumMinusDM += minusDM[i];
        }
        smoothedTR.push(sumTR);
        smoothedPlusDM.push(sumPlusDM);
        smoothedMinusDM.push(sumMinusDM);
    }

    // 计算后续的平滑值
    for (let i = period; i < tr.length; i++) {
        const prevSmoothedTR = smoothedTR[smoothedTR.length - 1];
        const prevSmoothedPlusDM = smoothedPlusDM[smoothedPlusDM.length - 1];
        const prevSmoothedMinusDM = smoothedMinusDM[smoothedMinusDM.length - 1];

        smoothedTR.push(prevSmoothedTR - (prevSmoothedTR / period) + tr[i]);
        smoothedPlusDM.push(prevSmoothedPlusDM - (prevSmoothedPlusDM / period) + plusDM[i]);
        smoothedMinusDM.push(prevSmoothedMinusDM - (prevSmoothedMinusDM / period) + minusDM[i]);
    }

    // 计算 DI+ 和 DI-
    const DIPlus = [];
    const DIMinus = [];
    for (let i = 0; i < smoothedTR.length; i++) {
        const diPlus = smoothedTR[i] !== 0 ? 100 * (smoothedPlusDM[i] / smoothedTR[i]) : 0;
        const diMinus = smoothedTR[i] !== 0 ? 100 * (smoothedMinusDM[i] / smoothedTR[i]) : 0;
        DIPlus.push(diPlus);
        DIMinus.push(diMinus);
    }

    // 计算 DX
    const DX = [];
    for (let i = 0; i < DIPlus.length; i++) {
        const sum = DIPlus[i] + DIMinus[i];
        const dx = sum !== 0 ? 100 * Math.abs(DIPlus[i] - DIMinus[i]) / sum : 0;
        DX.push(dx);
    }

    // 计算 ADX (DX 的 SMA)
    const ADX = calculateSmaArr(DX, period);

    // 获取最新值
    const latestADX = ADX[ADX.length - 1];
    const latestDIPlus = DIPlus[DIPlus.length - 1];
    const latestDIMinus = DIMinus[DIMinus.length - 1];

    // 获取历史值（用于金叉判断）
    const ADXHistory = ADX.slice(-3);
    const DIPlusHistory = DIPlus.slice(-3);
    const DIMinusHistory = DIMinus.slice(-3);

    return {
        ADX: latestADX,
        DIPlus: latestDIPlus,
        DIMinus: latestDIMinus,
        ADXHistory,
        DIPlusHistory,
        DIMinusHistory,
    };
}

/**
 * 计算最新 K 线的 ADX（带历史值，用于金叉判断）
 * @param {Array} klines - K线数据数组
 * @param {number} period - ADX 周期
 * @returns {Object} - 当前值和历史值
 */
function calculateLatestADX(klines, period = 12) {
    if (!klines || klines.length < period * 2) {
        return null;
    }

    const result = calculateADXFull(klines, period);
    if (!result) {
        return null;
    }

    return {
        ADX: result.ADX,
        DIPlus: result.DIPlus,
        DIMinus: result.DIMinus,
        ADX0: result.ADX,
        ADX1: result.ADXHistory[result.ADXHistory.length - 2] || result.ADX,
        ADX2: result.ADXHistory[result.ADXHistory.length - 3] || result.ADX,
        DIPlus0: result.DIPlus,
        DIPlus1: result.DIPlusHistory[result.DIPlusHistory.length - 2] || result.DIPlus,
        DIMinus0: result.DIMinus,
        DIMinus1: result.DIMinusHistory[result.DIMinusHistory.length - 2] || result.DIMinus,
    };
}

module.exports = {
    calculateADX,
    calculateADXFull,
    calculateLatestADX,
};
