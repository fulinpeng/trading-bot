const { calculateSimpleMovingAverage, calculateSmaArr } = require("./ma.js");

// 计算ADX（保持向后兼容）
function calculateADX(data, period = 14) {
    const result = calculateADXFull(data, period);
    return result ? result.ADX : null;
}

/**
 * 计算完整的 ADX 指标（包括 DIPlus、DIMinus、ADX 和历史值）
 * 完全按照 Pine Script 的逻辑实现，逐根K线计算
 * @param {Array} data - K线数据数组，每个元素包含 {high, low, close}
 * @param {number} period - ADX 周期，默认12
 * @returns {Object} - { ADX, DIPlus, DIMinus, ADXHistory, DIPlusHistory, DIMinusHistory }
 */
function calculateADXFull(data, period = 12) {
    if (!data || data.length < period + 1) {
        return null;
    }

    // === 逐根K线计算（与 Pine Script v4/v5 完全一致）===
    // Pine Script v4:
    // SmoothedTrueRange = 0.0
    // SmoothedTrueRange := nz(SmoothedTrueRange[1]) - (nz(SmoothedTrueRange[1])/len) + TrueRange
    // 
    // Pine Script v5:
    // var float SmoothedTrueRange = 0.0
    // SmoothedTrueRange := nz(SmoothedTrueRange[1]) - (nz(SmoothedTrueRange[1]) / adx_len) + TrueRange
    //
    // 两种版本的计算公式相同，只是 v5 使用 var 关键字明确表示变量保持状态
    
    // 变量（在 Pine Script 中保持状态，对应 var 关键字）
    let smoothedTR = 0.0;
    let smoothedPlusDM = 0.0;
    let smoothedMinusDM = 0.0;
    
    const DIPlus = [];
    const DIMinus = [];
    const DX = [];
    const ADX = [];
    
    // 用于计算 ADX 的 DX 值数组（需要 period 个 DX 值才能计算 ADX）
    const dxForADX = [];

    // 从第二根K线开始计算（第一根K线没有前一根K线）
    for (let i = 1; i < data.length; i++) {
        const high = parseFloat(data[i].high);
        const low = parseFloat(data[i].low);
        const close = parseFloat(data[i].close);
        const prevHigh = parseFloat(data[i - 1].high);
        const prevLow = parseFloat(data[i - 1].low);
        const prevClose = parseFloat(data[i - 1].close);

        // TrueRange = max(max(high-low, abs(high-nz(close[1]))), abs(low-nz(close[1])))
        const trueRange = Math.max(
            Math.max(high - low, Math.abs(high - prevClose)),
            Math.abs(low - prevClose)
        );

        // DirectionalMovementPlus = high-nz(high[1]) > nz(low[1])-low ? max(high-nz(high[1]), 0): 0
        const highDiff = high - prevHigh;
        const lowDiff = prevLow - low;
        const directionalMovementPlus = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;

        // DirectionalMovementMinus = nz(low[1])-low > high-nz(high[1]) ? max(nz(low[1])-low, 0): 0
        const directionalMovementMinus = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;

        // Wilder's Smoothing（与 Pine Script v4/v5 完全一致）
        // SmoothedTrueRange := nz(SmoothedTrueRange[1]) - (nz(SmoothedTrueRange[1])/len) + TrueRange
        // 注意：nz(SmoothedTrueRange[1]) 在第一根K线时为 0.0
        smoothedTR = smoothedTR - (smoothedTR / period) + trueRange;
        smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + directionalMovementPlus;
        smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + directionalMovementMinus;

        // DIPlus = SmoothedDirectionalMovementPlus / SmoothedTrueRange * 100
        // DIMinus = SmoothedDirectionalMovementMinus / SmoothedTrueRange * 100
        const diPlus = smoothedTR !== 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
        const diMinus = smoothedTR !== 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
        
        DIPlus.push(diPlus);
        DIMinus.push(diMinus);

        // DX = abs(DIPlus-DIMinus) / (DIPlus+DIMinus)*100
        const sum = diPlus + diMinus;
        const dx = sum !== 0 ? Math.abs(diPlus - diMinus) / sum * 100 : 0;
        DX.push(dx);
        
        // 收集 DX 值用于计算 ADX
        dxForADX.push(dx);
        
        // ADX = sma(DX, len) (v4) 或 ta.sma(DX, adx_len) (v5)
        // 在 Pine Script 中，sma 需要 len 个值才能计算
        // 如果 dxForADX 的长度 >= period，计算 ADX
        if (dxForADX.length >= period) {
            // 取最后 period 个 DX 值计算 SMA
            const dxWindow = dxForADX.slice(-period);
            const adxValue = dxWindow.reduce((sum, val) => sum + val, 0) / period;
            ADX.push(adxValue);
        } else {
            // 如果还没有足够的 DX 值，ADX 为 null（对应 Pine Script 的 na）
            ADX.push(null);
        }
    }

    // 获取最新值
    const latestADX = ADX.length > 0 && ADX[ADX.length - 1] !== null ? ADX[ADX.length - 1] : null;
    const latestDIPlus = DIPlus.length > 0 ? DIPlus[DIPlus.length - 1] : null;
    const latestDIMinus = DIMinus.length > 0 ? DIMinus[DIMinus.length - 1] : null;

    // 获取历史值（用于金叉判断）
    // 只取有效的 ADX 值（非 null）
    const validADX = ADX.filter(val => val !== null);
    const validADXIndices = [];
    let validIdx = 0;
    for (let i = 0; i < ADX.length; i++) {
        if (ADX[i] !== null) {
            validADXIndices.push(i);
        }
    }
    
    // 获取最后3个有效的 ADX 值对应的 DIPlus 和 DIMinus
    const ADXHistory = validADX.slice(-3);
    const DIPlusHistory = [];
    const DIMinusHistory = [];
    
    for (let i = Math.max(0, validADXIndices.length - 3); i < validADXIndices.length; i++) {
        const idx = validADXIndices[i];
        DIPlusHistory.push(DIPlus[idx]);
        DIMinusHistory.push(DIMinus[idx]);
    }

    if (!latestADX || !latestDIPlus || !latestDIMinus) {
        return null;
    }

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
    if (!klines || klines.length < period + 1) {
        return null;
    }

    const result = calculateADXFull(klines, period);
    if (!result) {
        return null;
    }

    // 确保历史值数组有足够的元素
    const ADX1 = result.ADXHistory.length >= 2 ? result.ADXHistory[result.ADXHistory.length - 2] : result.ADX;
    const ADX2 = result.ADXHistory.length >= 3 ? result.ADXHistory[result.ADXHistory.length - 3] : result.ADX;
    const DIPlus1 = result.DIPlusHistory.length >= 2 ? result.DIPlusHistory[result.DIPlusHistory.length - 2] : result.DIPlus;
    const DIMinus1 = result.DIMinusHistory.length >= 2 ? result.DIMinusHistory[result.DIMinusHistory.length - 2] : result.DIMinus;

    return {
        ADX: result.ADX,
        DIPlus: result.DIPlus,
        DIMinus: result.DIMinus,
        ADX0: result.ADX,
        ADX1: ADX1,
        ADX2: ADX2,
        DIPlus0: result.DIPlus,
        DIPlus1: DIPlus1,
        DIMinus0: result.DIMinus,
        DIMinus1: DIMinus1,
    };
}

module.exports = {
    calculateADX,
    calculateADXFull,
    calculateLatestADX,
};
