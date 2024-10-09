// 给定的参数范围对象形式
const paramRangesObj = {
    model1: {
        timeDis: { min: 1, max: 300 }, // 整数
        profit: { min: 0.1, max: 10 }, // 小数，保留一位
    },
    howManyCandleHeight: { min: 3, max: 10 }, // 整数
    howManyNumForAvarageCandleHight: { min: 6, max: 300 }, // 整数
};

// 转换为数组形式，按顺序存储每个参数的范围
const paramRanges = [
    paramRangesObj.model1.timeDis, // 对应 model1.timeDis (整数)
    paramRangesObj.model1.profit, // 对应 model1.profit (小数)
    paramRangesObj.howManyCandleHeight, // 对应 howManyCandleHeight (整数)
    paramRangesObj.howManyNumForAvarageCandleHight, // 对应 howManyNumForAvarageCandleHight (整数)
];

// 固定变异率
const mutationRate = 0.2; // 设定固定变异率，如 0.2

// 自适应变异函数，基于数组的参数处理
function mutationFunction(phenotype) {
    // 遍历数组中的每个参数，并根据其索引范围进行变异
    return phenotype.map((value, index) => {
        // 获取当前参数的范围
        const range = paramRanges[index];

        // 变异当前值，确保值在合法范围内并不是NaN
        let mutatedValue = mutateValue(value, range, mutationRate, index);

        // 防止变异后产生NaN，设置回合法值
        if (isNaN(mutatedValue)) {
            mutatedValue = range.min; // 将其设置为最小合法值
        }

        return mutatedValue;
    });
}

// 根据是否需要整数，进行变异并保持参数在范围内
function mutateValue(currentValue, range, mutationRate, index) {
    // 随机变异偏移，范围为 mutationRate 的正负范围
    let mutationOffset = (Math.random() * 2 - 1) * mutationRate * (range.max - range.min);

    // 计算新的值
    let newValue = currentValue + mutationOffset;

    // 保证值在给定范围内
    if (newValue < range.min) newValue = range.min;
    if (newValue > range.max) newValue = range.max;

    // // 根据索引判断整数类型
    // 如果需要整数，则四舍五入
    if (index === 0 || index === 2 || index === 3) {
        newValue = Math.round(newValue);
    } else {
        // index === 1 需要保留一位小数
        newValue = Number(newValue.toFixed(1));
    }

    // 返回变异后的值
    return newValue;
}
module.exports = { mutationFunction, paramRanges };
