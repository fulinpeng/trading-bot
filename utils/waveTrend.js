/**
 * WaveTrend 指标计算
 * 基于 TradingView Pine Script 的 WaveTrend 指标实现
 * 
 * @param {Array} klines - K线数据数组，每个元素包含 {open, high, low, close}
 * @param {Number} channelLength - 通道长度 (n1, 默认10)
 * @param {Number} averageLength - 平均长度 (n2, 默认21)
 * @returns {Object} 返回最新的 WaveTrend 指标值
 *   {
 *     wt1: WaveTrend 主线值,
 *     wt2: WaveTrend 信号线值 (wt1的4周期SMA)
 *   }
 */
function calculateWaveTrend(klines, channelLength = 10, averageLength = 21) {
    if (!klines || klines.length < Math.max(channelLength, averageLength)) {
        return null;
    }

    // 计算 HLC3 (典型价格)
    const hlc3 = klines.map(k => (k.high + k.low + k.close) / 3);

    // 计算 ESA (指数平滑平均)
    const calculateEMA = (data, period) => {
        if (data.length < period) return null;
        const multiplier = 2 / (period + 1);
        let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
        
        for (let i = period; i < data.length; i++) {
            ema = (data[i] - ema) * multiplier + ema;
        }
        return ema;
    };

    const esa = calculateEMA(hlc3, channelLength);
    if (esa === null) return null;

    // 计算 D (绝对偏差的指数平滑平均)
    const absDeviation = hlc3.map((val, idx) => {
        const prevEsa = idx === 0 ? val : calculateEMA(hlc3.slice(0, idx + 1), channelLength);
        return Math.abs(val - prevEsa);
    });
    
    const d = calculateEMA(absDeviation, channelLength);
    if (d === null || d === 0) return null;

    // 计算 CI (通道指标)
    const ci = (hlc3[hlc3.length - 1] - esa) / (0.015 * d);

    // 计算 TCI (趋势通道指标，CI的EMA)
    // 需要计算历史TCI值
    const ciArray = hlc3.map((val, idx) => {
        const prevEsa = idx === 0 ? val : calculateEMA(hlc3.slice(0, idx + 1), channelLength);
        const prevD = idx === 0 ? 0 : calculateEMA(absDeviation.slice(0, idx + 1), channelLength);
        if (prevD === 0) return 0;
        return (val - prevEsa) / (0.015 * prevD);
    });

    const tci = calculateEMA(ciArray, averageLength);
    if (tci === null) return null;

    // wt1 = tci
    const wt1 = tci;

    // wt2 = wt1 的 4周期 SMA
    const calculateSMA = (data, period) => {
        if (data.length < period) return null;
        const slice = data.slice(-period);
        return slice.reduce((sum, val) => sum + val, 0) / period;
    };

    // 需要计算历史wt1值来得到wt2
    const wt1Array = [];
    for (let i = Math.max(channelLength, averageLength); i <= klines.length; i++) {
        const slice = klines.slice(0, i);
        const hlc3Slice = slice.map(k => (k.high + k.low + k.close) / 3);
        const esaSlice = calculateEMA(hlc3Slice, channelLength);
        if (esaSlice === null) continue;
        
        const absDeviationSlice = hlc3Slice.map((val, idx) => {
            const prevEsa = idx === 0 ? val : calculateEMA(hlc3Slice.slice(0, idx + 1), channelLength);
            return Math.abs(val - prevEsa);
        });
        const dSlice = calculateEMA(absDeviationSlice, channelLength);
        if (dSlice === null || dSlice === 0) continue;
        
        const ciSlice = hlc3Slice.map((val, idx) => {
            const prevEsa = idx === 0 ? val : calculateEMA(hlc3Slice.slice(0, idx + 1), channelLength);
            const prevD = idx === 0 ? 0 : calculateEMA(absDeviationSlice.slice(0, idx + 1), channelLength);
            if (prevD === 0) return 0;
            return (val - prevEsa) / (0.015 * prevD);
        });
        const tciSlice = calculateEMA(ciSlice, averageLength);
        if (tciSlice !== null) {
            wt1Array.push(tciSlice);
        }
    }

    const wt2 = calculateSMA(wt1Array, 4);

    return {
        wt1: wt1,
        wt2: wt2 || wt1, // 如果无法计算wt2，使用wt1
    };
}

/**
 * 计算最新一根K线的WaveTrend指标值（优化版本，只计算最新值）
 * @param {Array} klines - K线数据数组
 * @param {Number} channelLength - 通道长度
 * @param {Number} averageLength - 平均长度
 * @returns {Object} WaveTrend指标值
 */
function calculateLatestWaveTrend(klines, channelLength = 10, averageLength = 21) {
    if (!klines || klines.length < Math.max(channelLength, averageLength) + 4) {
        return null;
    }

    // 使用足够的历史数据计算
    const requiredLength = Math.max(channelLength, averageLength) + 10;
    const data = klines.slice(-requiredLength);

    // 计算 HLC3
    const hlc3 = data.map(k => (k.high + k.low + k.close) / 3);

    // 计算 ESA (需要历史值)
    const calculateEMA = (data, period) => {
        if (data.length < period) return null;
        const multiplier = 2 / (period + 1);
        let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
        
        for (let i = period; i < data.length; i++) {
            ema = (data[i] - ema) * multiplier + ema;
        }
        return ema;
    };

    // 计算所有历史ESA值
    const esaArray = [];
    for (let i = channelLength; i <= hlc3.length; i++) {
        const slice = hlc3.slice(0, i);
        const esa = calculateEMA(slice, channelLength);
        if (esa !== null) {
            esaArray.push(esa);
        }
    }

    // 计算所有历史D值
    const dArray = [];
    for (let i = channelLength; i <= hlc3.length; i++) {
        const slice = hlc3.slice(0, i);
        const esaSlice = calculateEMA(slice, channelLength);
        if (esaSlice === null) continue;
        
        const absDeviation = slice.map((val, idx) => {
            const prevEsa = idx === 0 ? val : calculateEMA(slice.slice(0, idx + 1), channelLength);
            return Math.abs(val - prevEsa);
        });
        const d = calculateEMA(absDeviation, channelLength);
        if (d !== null && d !== 0) {
            dArray.push(d);
        }
    }

    // 计算CI数组
    const ciArray = [];
    for (let i = 0; i < esaArray.length; i++) {
        const idx = channelLength + i - 1;
        if (idx < hlc3.length && dArray[i] !== 0) {
            const ci = (hlc3[idx] - esaArray[i]) / (0.015 * dArray[i]);
            ciArray.push(ci);
        }
    }

    // 计算TCI (CI的EMA)
    const tciArray = [];
    for (let i = averageLength; i <= ciArray.length; i++) {
        const slice = ciArray.slice(0, i);
        const tci = calculateEMA(slice, averageLength);
        if (tci !== null) {
            tciArray.push(tci);
        }
    }

    // wt1 = 最新的TCI
    const wt1 = tciArray[tciArray.length - 1];
    if (wt1 === undefined) return null;

    // wt2 = wt1的4周期SMA
    const wt1ForSma = tciArray.slice(-4);
    const wt2 = wt1ForSma.length === 4 
        ? wt1ForSma.reduce((sum, val) => sum + val, 0) / 4 
        : wt1;

    return {
        wt1: wt1,
        wt2: wt2,
    };
}

module.exports = {
    calculateWaveTrend,
    calculateLatestWaveTrend,
};

