/**
 * QQE MOD (Quantitative Qualitative Estimation Modified) 指标计算
 * 基于 Pine Script 的 QQE MOD 实现
 */

const { calculateRSI } = require("./rsi.js");
const { calculateEmaArr } = require("./ma.js");

/**
 * 计算完整的 QQE MOD 指标（需要完整历史数据）
 * @param {Array} klines - K线数据数组，每个元素包含 {close}
 * @param {Object} params - 参数配置
 * @returns {Object} - { qqeModBar, qqeModRed, qqeModGreen, secondaryRSI }
 */
function calculateQQEMOD(klines, params = {}) {
    const {
        rsiLengthPrimary = 6,
        rsiSmoothingPrimary = 5,
        qqeFactorPrimary = 3.0,
        thresholdPrimary = 3.0,
        rsiLengthSecondary = 6,
        rsiSmoothingSecondary = 5,
        qqeFactorSecondary = 1.61,
        thresholdSecondary = 3.0,
    } = params;

    if (!klines || klines.length < Math.max(rsiLengthPrimary, rsiLengthSecondary) * 2 + 50) {
        return null;
    }

    const closePrices = klines.map(k => k.close);

    // === Calculate Primary QQE ===
    const wildersLengthPrimary = rsiLengthPrimary * 2 - 1;
    
    // 计算 Primary RSI 数组
    const primaryRSIArray = [];
    for (let i = rsiLengthPrimary; i < closePrices.length; i++) {
        try {
            const slice = closePrices.slice(0, i + 1);
            const rsi = calculateRSI(slice, rsiLengthPrimary);
            if (typeof rsi === 'number' && !isNaN(rsi)) {
                primaryRSIArray.push(rsi);
            } else {
                primaryRSIArray.push(null);
            }
        } catch (e) {
            primaryRSIArray.push(null);
        }
    }

    if (primaryRSIArray.length < rsiSmoothingPrimary) {
        return null;
    }

    // 过滤掉 null 值，但保留索引对应关系
    const validPrimaryRSIArray = primaryRSIArray.filter(v => v !== null);
    if (validPrimaryRSIArray.length < rsiSmoothingPrimary) {
        return null;
    }

    // 计算 smoothed RSI (EMA) - 与 Pine Script 的 ta.ema 一致
    // Pine Script: ta.ema(series, length) 使用标准的 EMA 计算，初始值是前 length 个值的 SMA
    const primarySmoothedRsiArray = [];
    const multiplierPrimary = 2 / (rsiSmoothingPrimary + 1);
    
    // 计算初始 SMA（前 rsiSmoothingPrimary 个值的平均值）
    let initialSumPrimary = 0;
    for (let i = 0; i < rsiSmoothingPrimary; i++) {
        initialSumPrimary += validPrimaryRSIArray[i];
    }
    let emaPrimary = initialSumPrimary / rsiSmoothingPrimary;
    primarySmoothedRsiArray.push(emaPrimary);
    
    // 计算后续的 EMA 值
    for (let i = rsiSmoothingPrimary; i < validPrimaryRSIArray.length; i++) {
        emaPrimary = (validPrimaryRSIArray[i] - emaPrimary) * multiplierPrimary + emaPrimary;
        primarySmoothedRsiArray.push(emaPrimary);
    }

    if (primarySmoothedRsiArray.length === 0) {
        return null;
    }

    // 计算 ATR RSI
    const atrRsiArray = [];
    for (let i = 1; i < primarySmoothedRsiArray.length; i++) {
        const atrRsi = Math.abs(primarySmoothedRsiArray[i] - primarySmoothedRsiArray[i - 1]);
        atrRsiArray.push(atrRsi);
    }

    if (atrRsiArray.length < wildersLengthPrimary) {
        return null;
    }

    // 计算 smoothed ATR RSI (EMA) - 与 Pine Script 的 ta.ema 一致
    const smoothedAtrRsiArray = [];
    const multiplierAtr = 2 / (wildersLengthPrimary + 1);
    
    // 计算初始 SMA（前 wildersLengthPrimary 个值的平均值）
    if (atrRsiArray.length < wildersLengthPrimary) {
        return null;
    }
    
    let initialSumAtr = 0;
    for (let i = 0; i < wildersLengthPrimary; i++) {
        initialSumAtr += atrRsiArray[i];
    }
    let emaAtr = initialSumAtr / wildersLengthPrimary;
    smoothedAtrRsiArray.push(emaAtr);
    
    // 计算后续的 EMA 值
    for (let i = wildersLengthPrimary; i < atrRsiArray.length; i++) {
        emaAtr = (atrRsiArray[i] - emaAtr) * multiplierAtr + emaAtr;
        smoothedAtrRsiArray.push(emaAtr);
    }

    if (smoothedAtrRsiArray.length === 0) {
        return null;
    }

    // 计算 dynamic ATR RSI
    const dynamicAtrRsiArray = smoothedAtrRsiArray.map(v => v * qqeFactorPrimary);

    // 计算 longBand 和 shortBand
    const longBandArray = [];
    const shortBandArray = [];
    let trendDirection = 0; // 0 = undefined, 1 = bullish, -1 = bearish

    for (let i = 0; i < primarySmoothedRsiArray.length - 1; i++) {
        const smoothedRsi = primarySmoothedRsiArray[i + 1];
        const smoothedRsiPrev = primarySmoothedRsiArray[i];
        const atrDelta = dynamicAtrRsiArray[i] || 0;
        
        const newShortBand = smoothedRsi + atrDelta;
        const newLongBand = smoothedRsi - atrDelta;

        let longBand = newLongBand;
        let shortBand = newShortBand;

        if (i > 0) {
            const prevLongBand = longBandArray[i - 1];
            const prevShortBand = shortBandArray[i - 1];
            
            if (smoothedRsiPrev > prevLongBand && smoothedRsi > prevLongBand) {
                longBand = Math.max(prevLongBand, newLongBand);
            }
            
            if (smoothedRsiPrev < prevShortBand && smoothedRsi < prevShortBand) {
                shortBand = Math.min(prevShortBand, newShortBand);
            }
        }

        longBandArray.push(longBand);
        shortBandArray.push(shortBand);

        // 判断趋势方向
        if (smoothedRsi > shortBandArray[i > 0 ? i - 1 : 0]) {
            trendDirection = 1;
        } else if (smoothedRsi < longBandArray[i > 0 ? i - 1 : 0]) {
            trendDirection = -1;
        }
    }

    // === Calculate Secondary QQE ===
    const wildersLengthSecondary = rsiLengthSecondary * 2 - 1;
    
    // 计算 Secondary RSI 数组
    const secondaryRSIArray = [];
    for (let i = rsiLengthSecondary; i < closePrices.length; i++) {
        try {
            const slice = closePrices.slice(0, i + 1);
            const rsi = calculateRSI(slice, rsiLengthSecondary);
            if (typeof rsi === 'number' && !isNaN(rsi)) {
                secondaryRSIArray.push(rsi);
            } else {
                secondaryRSIArray.push(null);
            }
        } catch (e) {
            secondaryRSIArray.push(null);
        }
    }

    if (secondaryRSIArray.length < rsiSmoothingSecondary) {
        return null;
    }

    // 过滤掉 null 值，但保留索引对应关系
    const validSecondaryRSIArray = secondaryRSIArray.filter(v => v !== null);
    if (validSecondaryRSIArray.length < rsiSmoothingSecondary) {
        return null;
    }

    // 计算 smoothed RSI (EMA) - 与 Pine Script 的 ta.ema 一致
    // Pine Script: ta.ema(series, length) 使用标准的 EMA 计算，初始值是前 length 个值的 SMA
    const secondarySmoothedRsiArray = [];
    const multiplier = 2 / (rsiSmoothingSecondary + 1);
    
    // 计算初始 SMA（前 rsiSmoothingSecondary 个值的平均值）
    let initialSum = 0;
    for (let i = 0; i < rsiSmoothingSecondary; i++) {
        initialSum += validSecondaryRSIArray[i];
    }
    let ema = initialSum / rsiSmoothingSecondary;
    secondarySmoothedRsiArray.push(ema);
    
    // 计算后续的 EMA 值
    for (let i = rsiSmoothingSecondary; i < validSecondaryRSIArray.length; i++) {
        ema = (validSecondaryRSIArray[i] - ema) * multiplier + ema;
        secondarySmoothedRsiArray.push(ema);
    }

    if (secondarySmoothedRsiArray.length === 0) {
        return null;
    }

    // 获取最新值（对应原始数组的最后一个有效值）
    const secondarySmoothedRsi = secondarySmoothedRsiArray[secondarySmoothedRsiArray.length - 1];

    // QQE MOD 柱子值（secondaryRSI - 50）- 与 Pine Script 一致
    const qqeModBar = secondarySmoothedRsi - 50;

    // QQE MOD 颜色判断
    const qqeModGreen = qqeModBar > thresholdSecondary;
    const qqeModRed = qqeModBar < -thresholdSecondary;

    return {
        qqeModBar,
        qqeModRed,
        qqeModGreen,
        secondaryRSI: secondarySmoothedRsi,
    };
}

/**
 * 计算最新 K 线的 QQE MOD（带历史值，用于拐头判断）
 * @param {Array} klines - K线数据数组
 * @param {Object} params - 参数配置
 * @returns {Object} - 当前值和历史值
 */
function calculateLatestQQEMOD(klines, params = {}) {
    if (!klines || klines.length < 50) {
        return null;
    }

    // 计算最近3根K线的 QQE MOD
    const results = [];
    for (let i = Math.max(0, klines.length - 3); i < klines.length; i++) {
        if (i >= 0) {
            const slice = klines.slice(0, i + 1);
            const result = calculateQQEMOD(slice, params);
            if (result) {
                results.push(result);
            }
        }
    }

    if (results.length < 3) {
        return null;
    }

    const [result2, result1, result0] = results;

    return {
        current: result0,
        previous: result1,
        previous2: result2,
        qqeModBar0: result0.qqeModBar || 0,
        qqeModBar1: result1.qqeModBar || 0,
        qqeModBar2: result2.qqeModBar || 0,
        qqeModRed0: result0.qqeModRed || false,
        qqeModRed1: result1.qqeModRed || false,
        qqeModRed2: result2.qqeModRed || false,
        qqeModGreen0: result0.qqeModGreen || false,
        qqeModGreen1: result1.qqeModGreen || false,
        qqeModGreen2: result2.qqeModGreen || false,
    };
}

module.exports = {
    calculateQQEMOD,
    calculateLatestQQEMOD,
};
