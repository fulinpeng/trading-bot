function calculateFibonacciLevels(high, low, trend) {
    let isUptrend = trend === "up";
    // 斐波那契回撤比率
    const fibRatios = isUptrend
        ? [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] // 上升趋势
        : [1, 0.786, 0.618, 0.5, 0.382, 0.236, 0]; // 下降趋势

    // 计算区间的差值
    const difference = high - low;

    // 计算斐波那契价格点
    const fibonacciLevels = fibRatios.map((ratio) => {
        return isUptrend
            ? low + difference * ratio // 上升趋势：从低点开始计算
            : high - difference * ratio; // 下降趋势：从高点开始计算
    });

    return fibonacciLevels;
}

// // 假设最高价和最低价
// const high = 150.0;
// const low = 100.0;

// // 计算上升趋势的斐波那契价格点
// const fibLevelsUptrend = calculateFibonacciLevels(high, low, true);
// console.log("上升趋势的斐波那契回撤水平:");
// fibLevelsUptrend.forEach((level, index) => {
//     console.log(`Level ${index + 1}: ${level}`);
// });

// // 计算下降趋势的斐波那契价格点
// const fibLevelsDowntrend = calculateFibonacciLevels(high, low, false);
// console.log("下降趋势的斐波那契回撤水平:");
// fibLevelsDowntrend.forEach((level, index) => {
//     console.log(`Level ${index + 1}: ${level}`);
// });

/**
 * 计算斐波那契回撤和扩展水平
 * @param {number} startPrice - 起始价格
 * @param {number} endPrice - 结束价格
 * @param {string} type - 类型，可以是 "retracement" 或 "extension"
 * @returns {Object} 斐波那契回撤或扩展水平
 * 
 * */
function getFibonacciLevels(startPrice, endPrice, type = 'retracement') {
    const isUptrend = endPrice > startPrice;
    const diff = Math.abs(endPrice - startPrice);

    // 斐波那契回撤区间
    if (type === 'retracement') {
        const level_0_5 = isUptrend
            ? endPrice - diff * 0.5
            : endPrice + diff * 0.5;
        const level_0_618 = isUptrend
            ? endPrice - diff * 0.618
            : endPrice + diff * 0.618;

        return {
            '0.5': parseFloat(level_0_5.toFixed(2)),
            '0.618': parseFloat(level_0_618.toFixed(2)),
        };
    }

    // 斐波那契扩展区间
    if (type === 'extension') {
        const level_1_272 = isUptrend
            ? endPrice + diff * 1.272
            : endPrice - diff * 1.272;
        const level_1_414 = isUptrend
            ? endPrice + diff * 1.414
            : endPrice - diff * 1.414;

        return {
            '1.272': parseFloat(level_1_272.toFixed(2)),
            '1.414': parseFloat(level_1_414.toFixed(2)),
        };
    }

    throw new Error('Invalid type: must be "retracement" or "extension".');
}
function calculateFBB(data, fbbLength = 200, mult = 3.0) {
    if (!Array.isArray(data) || data.length < fbbLength) {
        throw new Error("输入数据不足");
    }

    // 计算 hlc3： (high + low + close) / 3
    const fbbSrc = data.map(k => (k.high + k.low + k.close) / 3);

    // 计算 VWMA (成交量加权均线)
    const vwma = (src, vol, length) => {
        const result = [];
        for (let i = 0; i < src.length; i++) {
            if (i < length - 1) {
                result.push(NaN);
                continue;
            }
            let sumPV = 0;
            let sumV = 0;
            for (let j = 0; j < length; j++) {
                sumPV += src[i - j] * vol[i - j];
                sumV += vol[i - j];
            }
            result.push(sumPV / sumV);
        }
        return result;
    };

    // 计算标准差
    const stddev = (arr, length) => {
        const result = [];
        for (let i = 0; i < arr.length; i++) {
            if (i < length - 1) {
                result.push(NaN);
                continue;
            }
            const window = arr.slice(i - length + 1, i + 1);
            const mean = window.reduce((a, b) => a + b, 0) / length;
            const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / length;
            result.push(Math.sqrt(variance));
        }
        return result;
    };

    const volume = data.map(k => k.volume);
    const basisArr = vwma(fbbSrc, volume, fbbLength);
    const devArr = stddev(fbbSrc, fbbLength).map(std => std * mult);

    const lastIdx = fbbSrc.length - 1;
    const basis = basisArr[lastIdx];
    const dev = devArr[lastIdx];

    if (isNaN(basis) || isNaN(dev)) {
        return null; // 尚未形成有效数据
    }

    return {
        basis, // 中轨线（成交量加权均线VWMA）
        upper_3: basis + 0.5 * dev, // 上轨3（中轨+0.5倍标准差）
        upper_4: basis + 0.618 * dev, // 上轨4（中轨+0.618倍标准差，黄金分割）
        upper_5: basis + 0.764 * dev, // 上轨5（中轨+0.764倍标准差）
        upper_6: basis + 1.0 * dev, // 上轨6（中轨+1倍标准差）
        upper_7: basis + 1.414 * dev, // 上轨7（中轨+1.414倍标准差）
        
        lower_3: basis - 0.5 * dev, // 下轨3（中轨-0.5倍标准差）
        lower_4: basis - 0.618 * dev, // 下轨4（中轨-0.618倍标准差，黄金分割）
        lower_5: basis - 0.764 * dev, // 下轨5（中轨-0.764倍标准差）
        lower_6: basis - 1.0 * dev, // 下轨6（中轨-1倍标准差）
        lower_7: basis - 1.414 * dev // 下轨7（中轨-1.414倍标准差）
    };
}

module.exports = {
    calculateFibonacciLevels,
    getFibonacciLevels,
    calculateFBB,
};
