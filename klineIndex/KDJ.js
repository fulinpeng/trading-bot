// 辅助函数：计算给定范围内的最高价和最低价
function getMinMax(arr, period) {
    let min = arr.slice(0, period).map((p) => p.low);
    let max = arr.slice(0, period).map((p) => p.high);
    return {
        min: Math.min(...min),
        max: Math.max(...max),
    };
}

// 函数：计算 EMA（指数移动平均）
function calculateEMA(current, previous, period) {
    const smoothing = 2 / (period + 1);
    return current * smoothing + previous * (1 - smoothing);
}

// 函数：计算单个 KDJ 指标
function calculateKDJ(data, period = 25, kPeriod = 3, dPeriod = 3) {
    // 初始化 K 值和 D 值为 50
    let k = 50;
    let d = 50;

    // 遍历 K 线数据，逐个计算每根 K 线的 RSV 值
    let kdj = data.map((cur, index) => {
        if (index < period - 1) {
            // 在周期不足时，返回空值
            return { k: null, d: null, j: null };
        }

        // 获取指定周期内的最高价和最低价
        let { min, max } = getMinMax(data.slice(index - period + 1, index + 1), period);
        let rsv = ((cur.close - min) / (max - min)) * 100;

        // 使用 RSV 值计算 K 值和 D 值的 EMA
        k = calculateEMA(rsv, k, kPeriod);
        d = calculateEMA(k, d, dPeriod);

        // 计算 J 值
        let j = 3 * k - 2 * d;

        // 返回包含 K 值、D 值和 J 值的对象
        return { k, d, j };
    });

    // 返回最后一个计算的 KDJ 值
    return kdj[kdj.length - 1];
}

// 函数：计算整个数据集的 KDJ 指标
function calculateKDJs(data, period = 25, kPeriod = 3, dPeriod = 3) {
    // 初始化 K 值和 D 值为 50
    let k = 50;
    let d = 50;

    // 遍历 K 线数据，逐个计算每根 K 线的 RSV 值
    let kdj = data.map((cur, index) => {
        if (index < period - 1) {
            // 在周期不足时，返回空值
            return { k: null, d: null, j: null };
        }

        // 获取指定周期内的最高价和最低价
        let { min, max } = getMinMax(data.slice(index - period + 1, index + 1), period);
        let rsv = ((cur.close - min) / (max - min)) * 100;

        // 使用 RSV 值计算 K 值和 D 值的 EMA
        k = calculateEMA(rsv, k, kPeriod);
        d = calculateEMA(k, d, dPeriod);

        // 计算 J 值
        let j = 3 * k - 2 * d;

        // 返回包含 K 值、D 值和 J 值的对象
        return { k, d, j };
    });

    // 返回整个数据集的 KDJ 值
    return kdj;
}

module.exports = {
    calculateKDJ,
    calculateKDJs,
};
