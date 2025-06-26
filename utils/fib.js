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
  
module.exports = {
    calculateFibonacciLevels,
    getFibonacciLevels,
};
