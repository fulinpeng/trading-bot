// 给定的参数范围对象形式
const paramRangesObj = {
    timeDis: { min: 1, max: 300 }, // 整数
    profit: { min: 0.1, max: 10 }, // 小数，保留一位
    howManyCandleHeight: { min: 3, max: 10 }, // 整数
    howManyNumForAvarageCandleHight: { min: 6, max: 300 }, // 整数
};

// 转换为数组形式，按顺序存储每个参数的范围
const paramRanges = [
    paramRangesObj.timeDis, // 对应 timeDis (整数)
    paramRangesObj.profit, // 对应 profit (小数)
    paramRangesObj.howManyCandleHeight, // 对应 howManyCandleHeight (整数)
    paramRangesObj.howManyNumForAvarageCandleHight, // 对应 howManyNumForAvarageCandleHight (整数)
];

// 固定变异率
const mutationRate = 0.2; // 设定固定变异率，如 0.2
function getAdaptiveMutationRate(currentIteration, maxIterations) {
    const initialRate = 0.3; // 初始变异率较高
    const finalRate = 0.05; // 最终变异率较低
    const progress = currentIteration / maxIterations;
    return initialRate * (1 - progress) + finalRate * progress;
}

function mutationFunction(phenotype, currentIteration, maxIterations) {
    const mutationRate = getAdaptiveMutationRate(currentIteration, maxIterations);
    return phenotype.map((value, index) => {
        const range = paramRanges[index];
        let mutatedValue = mutateValue(value, range, mutationRate, index);
        if (isNaN(mutatedValue)) {
            mutatedValue = range.min;
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
