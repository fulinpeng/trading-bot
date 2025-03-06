/**
 * 计算 Schaff Trend Cycle (STC) 指标
 *
 * @param {Array} klineData - K线数据数组，每个元素是一个对象，包含时间（time）和收盘价（close）等字段。
 * @param {Object} params - 指标参数，包含：
 *                          - stcLength: STC的长度（一般为80）
 *                          - fastLength: 快速EMA的长度（一般为27）
 *                          - slowLength: 慢速EMA的长度（一般为50）
 *                          - smoothingFactor: EMA平滑因子，默认为0.5
 * @returns {number} 返回最新K线对应的STC值
 */

const defaultParams = {
    stcLength: 80, // STC的长度
    fastLength: 27, // 快速EMA的长度
    slowLength: 50, // 慢速EMA的长度
    smoothingFactor: 0.5, // EMA的平滑因子
};
function calculateSHK(klineData, params) {
    const {stcLength, fastLength, slowLength, smoothingFactor} = {
        ...defaultParams,
        ...params,
    };

    const smoothedKArr = []; // K值的平滑值

    let smoothedD = 0.0; // D值的平滑值

    // 计算STC的核心逻辑
    function calcSTC(kLines, stcLength, fastLength, slowLength) {
        // 计算EMA差值数组
        const emaDiff = calcEMA_diff(
            kLines.map((kline) => kline.close),
            fastLength,
            slowLength
        );

        // 确保EMA差值数组是有效的
        if (!Array.isArray(emaDiff)) {
            throw new TypeError("EMA差值结果应该是一个数组。");
        }

        // 计算最低值和最高值
        const minEmaDiff = lowest(emaDiff, stcLength);
        const maxEmaDiff = highest(emaDiff, stcLength);
        const rangeEmaDiff = maxEmaDiff - minEmaDiff;

        // preSmoothedK 为上一次的值
        const preSmoothedK = smoothedKArr[smoothedKArr.length - 1] || 0;
        // 计算相对强弱的百分比变化
        const k =
            rangeEmaDiff > 0
                ? ((emaDiff[emaDiff.length - 1] - minEmaDiff) / rangeEmaDiff) * 100
                : preSmoothedK;

        // 使用指数移动平均对K值进行平滑, 最新的 preSmoothedK
        const currentSmoothedK = !preSmoothedK
            ? k
            : preSmoothedK + smoothingFactor * (k - preSmoothedK);
        smoothedKArr.push(currentSmoothedK);

        // 计算平滑后的K值的最低值和最高值
        const minSmoothedK = lowest(smoothedKArr, stcLength);
        const maxSmoothedK = highest(smoothedKArr, stcLength);
        const rangeSmoothedK = maxSmoothedK - minSmoothedK;

        // 计算D值
        const d =
            rangeSmoothedK > 0
                ? ((currentSmoothedK - minSmoothedK) / rangeSmoothedK) * 100
                : smoothedD;

        // 更新STC值：使用指数移动平均对D值进行平滑
        smoothedD = !smoothedD ? d : smoothedD + smoothingFactor * (d - smoothedD);

        // 返回最终的STC值
        return smoothedD;
    }

    const stcResult = [];
    // 计算最新K线对应的STC值
    for (let i = stcLength; i < klineData.length; i++) {
        stcResult.push(
            calcSTC(klineData.slice(i - stcLength, i), stcLength, fastLength, slowLength)
        );
    }

    // 返回最新K线对应的STC值
    return stcResult;
}

// 计算EMA差值的函数
function calcEMA_diff(closePrices, fastLength, slowLength) {
    const fastEMA = ema(closePrices, fastLength); // 快速EMA
    const slowEMA = ema(closePrices, slowLength); // 慢速EMA
    return fastEMA.map((fast, index) =>
        fast !== null && slowEMA[index] !== null ? fast - slowEMA[index] : null
    );
}

// 计算EMA的函数
function ema(data, length) {
    const emaResults = [];
    const alpha = 2 / (length + 1); // EMA的平滑系数

    emaResults[0] = data[0]; // 初始化为第一个值
    for (let i = 1; i < data.length; i++) {
        emaResults[i] = alpha * data[i] + (1 - alpha) * emaResults[i - 1];
    }

    return emaResults;
}

// 找到数组中的最低值
function lowest(arr, length) {
    if (!Array.isArray(arr)) {
        throw new TypeError("输入应该是一个数组。");
    }

    return arr
        .slice(-length)
        .reduce((min, val) => (val !== null && val < min ? val : min), Infinity);
}

// 找到数组中的最高值
function highest(arr, length) {
    if (!Array.isArray(arr)) {
        throw new TypeError("输入应该是一个数组。");
    }

    return arr
        .slice(-length)
        .reduce((max, val) => (val !== null && val > max ? val : max), -Infinity);
}

// // 示例调用
// const klineData=[
// 	{time: 1, close: 100},
// 	{time: 2, close: 102},
// 	{time: 3, close: 101},
// 	{time: 4, close: 103},
// 	{time: 5, close: 104},
// ];

// const params={
// 	stcLength: 80,        // STC的长度
// 	fastLength: 27,       // 快速EMA的长度
// 	slowLength: 50,       // 慢速EMA的长度
// 	smoothingFactor: 0.5, // EMA的平滑因子
// };

// const result=calculateSHK(klineData, params);
// console.log("最新K线的STC值:", result);

module.exports = {
    calculateSHK,
};
