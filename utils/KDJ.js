// Helper function to calculate the minimum and maximum in a given range
function getMinMax(arr, period) {
    let min = arr.slice(0, period).map((p) => p.low);
    let max = arr.slice(0, period).map((p) => p.high);
    return {
        min: Math.min(...min),
        max: Math.max(...max),
    };
}

// Function to calculate EMA
function calculateEMA(current, previous, period) {
    const smoothing = 2 / (period + 1);
    return current * smoothing + previous * (1 - smoothing);
}

// Function to calculate KDJ
function calculateKDJ(data, period = 25, kPeriod = 3, dPeriod = 3) {
    // 初始化K值和D值为50
    let k = 50;
    let d = 50;

    // 遍历K线数据，逐个计算每根K线的RSV值
    let kdj = data.map((cur, index) => {
        if (index < period - 1) {
            // 在周期不足时，返回空值
            return { k: null, d: null, j: null };
        }

        // 获取指定周期内的最高价和最低价
        let { min, max } = getMinMax(data.slice(index - period + 1, index + 1), period);
        let rsv = ((cur.close - min) / (max - min)) * 100;

        // 使用RSV值计算K值和D值的EMA
        k = calculateEMA(rsv, k, kPeriod);
        d = calculateEMA(k, d, dPeriod);

        // 计算J值
        let j = 3 * k - 2 * d;

        // 返回包含K值、D值和J值的对象
        return { k, d, j };
    });

    return kdj[kdj.length - 1];
}
function calculateKDJs(data, period = 25, kPeriod = 3, dPeriod = 3) {
    // 初始化K值和D值为50
    let k = 50;
    let d = 50;

    // 遍历K线数据，逐个计算每根K线的RSV值
    let kdj = data.map((cur, index) => {
        if (index < period - 1) {
            // 在周期不足时，返回空值
            return { k: null, d: null, j: null };
        }

        // 获取指定周期内的最高价和最低价
        let { min, max } = getMinMax(data.slice(index - period + 1, index + 1), period);
        let rsv = ((cur.close - min) / (max - min)) * 100;

        // 使用RSV值计算K值和D值的EMA
        k = calculateEMA(rsv, k, kPeriod);
        d = calculateEMA(k, d, dPeriod);

        // 计算J值
        let j = 3 * k - 2 * d;

        // 返回包含K值、D值和J值的对象
        return { k, d, j };
    });

    return kdj;
}

// 计算 KDJ 指标
// let kdj = calculateKDJs(prices);

// console.log(kdj);

module.exports = {
    calculateKDJ,
    calculateKDJs,
};
