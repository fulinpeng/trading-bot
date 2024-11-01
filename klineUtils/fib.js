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

module.exports = {
    calculateFibonacciLevels,
};
