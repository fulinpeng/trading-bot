const fs = require("fs");
const path = require("path");
const GeneticAlgorithmConstructor = require("geneticalgorithm");
const { evaluateStrategy } = require("../test-mading4-6.js");
// const { evaluateStrategy } = require("./strategies/test-demo");
const { mutationFunction } = require("./functions/mutationFunction");

const symbol = "bigtimeUSDT";

let defaultParams = null;
const qualifiedSolutionsPath = path.join(__dirname, `qualifiedSolutions/${symbol}.js`);

if (fs.existsSync(qualifiedSolutionsPath)) {
    defaultParams = require(qualifiedSolutionsPath).qualifiedSolutions;
}

// 将对象转换为数组，便于遗传算法处理
function encodeParams(params) {
    return [
        params.model1.timeDis,
        params.model1.profit,
        params.howManyCandleHeight,
        params.howManyNumForAvarageCandleHight,
    ];
}

// 将数组转换为对象，并对参数进行合法性约束（确保为正数，且在范围内）
function decodeParams(arr) {
    return {
        model1: {
            timeDis: Math.max(1, Math.min(Math.round(arr[0]), 300)), // timeDis 必须在1-300之间
            profit: Math.max(0.1, Math.min(Math.round(arr[1] * 10) / 10, 10)), // profit 在0.1-10之间，保留1位小数
        },
        howManyCandleHeight: Math.max(3, Math.min(Math.round(arr[2]), 10)), // 必须在3-10之间
        howManyNumForAvarageCandleHight: Math.max(6, Math.min(Math.round(arr[3]), 300)), // 必须在6-300之间
    };
}

// 定义适应度函数，目标是最大化 maxMoney 和 maxMoney/minMoney 比值的绝对值，并最小化 minMoney 的绝对值，同时优先确保 testMoney > 0
function fitnessFunction(phenotype) {
    const params = decodeParams(phenotype);
    const { maxMoney, minMoney, testMoney } = evaluateStrategy(symbol, params);

    // 优先确保 testMoney > 0，如果不满足，适应度为 0
    if (testMoney <= 0) return 0;

    // 确保 maxMoney 必须为正数，否则适应度为 0
    if (maxMoney <= 0) return 0;

    // 定义权重
    const w1 = 3; // maxMoney 的权重
    const w2 = 2; // 比值的权重
    const w3 = 1; // minMoney 绝对值的权重

    // 计算适应度，综合考虑 maxMoney 越大越好，maxMoney/minMoney 比值越大越好，minMoney 的绝对值越小越好
    const fitness = w1 * maxMoney + w2 * testMoney + w3 * minMoney;

    return fitness; //  Math.pow(fitness, 2); // 提升适应度的差异
}

// 配置遗传算法
function createGeneticAlgorithm() {
    return GeneticAlgorithmConstructor({
        mutationFunction,
        crossoverFunction: (parent1, parent2) => {
            return [
                [parent1[0], parent2[1], (parent1[2] + parent2[2]) / 2, parent1[3]],
                [parent2[0], parent1[1], parent2[2], (parent1[3] + parent2[3]) / 2],
            ];
        },
        fitnessFunction: fitnessFunction,
        // 初始参数
        population: defaultParams
            ? defaultParams.map((item) => encodeParams(item.params))
            : [
                  encodeParams({
                      model1: { timeDis: 1, profit: 1.5 },
                      howManyCandleHeight: 5,
                      howManyNumForAvarageCandleHight: 90,
                  }),
              ],
        // 较大种群：种群规模大意味着算法可以同时探索更多的解空间，有助于找到全局最优解，并减少陷入局部最优解的风险，但也会增加每代计算所需的时间和内存
        // 较小种群：较小的种群可以加快每一代的计算速度，但更容易陷入局部最优，且多样性不足可能导致早熟收敛（即过早找到次优解）
        populationSize: 50,
        // 交叉（交配）的概率，crossoverProbability: 0.8 意味着 80% 的情况下，父代会通过交叉产生子代，20% 的情况下不进行交叉，直接将父代个体保留到下一代
        crossoverProbability: 0.8,
        mutationProbability: 0.1, // 变异的概率，越小越快速地收敛，但更会得到局部最优解
        fittestAlwaysSurvives: true, // 最优个体始终保留，为 true 加速遗传算法的收敛过程，但是会导致过快收敛得到局部最优解
        iterations: 500, // 迭代次数，表示遗传算法会进行多少代的演化
    });
}

// 验证最优参数在不同 targetTimeNum 值下的表现
function validateWithTargetTimeNum(bestParams) {
    let finalRes = [];
    for (let targetTimeNum = 3; targetTimeNum <= 9; targetTimeNum++) {
        const paramsWithTargetTimeNum = { ...bestParams, targetTimeNum };
        const evaluation = evaluateStrategy(paramsWithTargetTimeNum);

        if (evaluation.testMoney <= 0) {
            break;
        } else {
            finalRes.push({
                testMoney: evaluation.testMoney,
                maxMoney: evaluation.maxMoney,
                minMoney: evaluation.minMoney,
            });
        }
    }

    return finalRes;
}

// 开始寻找所有合格解
function findAllQualifiedSolutions() {
    const qualifiedSolutions = [];
    const triedSolutions = new Set(); // 使用 Set 存储已尝试的参数
    let attempt = 0;
    const maxAttempts = 50000;

    while (attempt < maxAttempts) {
        attempt++;
        console.log(`第 ${attempt} 次尝试寻找最优解...`);

        const geneticAlgorithm = createGeneticAlgorithm();
        geneticAlgorithm.evolve();

        const bestSolution = geneticAlgorithm.best();
        const currentBestParams = decodeParams(bestSolution);

        // 检查是否已尝试过该参数组合
        const currentBestParamsStr = JSON.stringify(currentBestParams);
        if (triedSolutions.has(currentBestParamsStr)) {
            console.log("该参数组合已尝试过，跳过这次...");
            continue; // 跳过这次尝试
        }

        triedSolutions.add(currentBestParamsStr); // 添加到已尝试集合中

        const evaluation = evaluateStrategy(currentBestParams);
        if (evaluation.testMoney <= 0) {
            console.log("初步最优解 testMoney <= 0，跳过这次...");
            continue; // 跳过这次尝试
        }

        console.log("初步最优参数:", currentBestParams);

        const validationResults = validateWithTargetTimeNum(currentBestParams);

        if (validationResults.length) {
            qualifiedSolutions.push({
                params: currentBestParams,
                results: validationResults,
            });
            console.log("找到了合格的参数:", {
                params: currentBestParams,
                results: validationResults,
            });
        } else {
            console.log("初步最优参数不合格，继续寻找...");
        }
    }

    if (qualifiedSolutions.length === 0) {
        console.log(`超过 ${maxAttempts} 次尝试后仍未找到合格的最优参数，寻找失败。`);
    } else {
        console.log("找到的所有合格参数");
        saveResToFile(qualifiedSolutions);
    }
}

function saveResToFile(qualifiedSolutions) {
    // 保存 qualifiedSolutions 到文件
    const fileContent = `const qualifiedSolutions = ${JSON.stringify(
        qualifiedSolutions,
        null,
        2,
    )};\nmodule.exports = { qualifiedSolutions };`;
    fs.writeFileSync(qualifiedSolutionsPath, fileContent, "utf8");
    console.log(`合格参数已保存到 ${qualifiedSolutionsPath}`);
}
// 开始寻找合格参数
findAllQualifiedSolutions();
