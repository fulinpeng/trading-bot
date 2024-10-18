const fs = require("fs");
const path = require("path");
const crypto = require("crypto"); // 引入 crypto 库，用于计算哈希值
const GeneticAlgorithmConstructor = require("geneticalgorithm");
const { evaluateStrategy } = require("../test-mading4-6.js");

const symbol = "1000pepeUSDT";

let defaultParams = null;
const qualifiedSolutionsPath = path.join(__dirname, `qualifiedSolutions/${symbol}.js`);
const triedSolutionsPath = path.join(__dirname, `triedSolutions/${symbol}.txt`);

if (fs.existsSync(qualifiedSolutionsPath)) {
    defaultParams = require(qualifiedSolutionsPath).qualifiedSolutions;
}

// 参数范围对象
const paramRangesObj = {
    timeDis: { min: 1, max: 300 },
    profit: { min: 0.1, max: 10 },
    howManyCandleHeight: { min: 3, max: 10 },
    howManyNumForAvarageCandleHight: { min: 6, max: 300 },
};

const paramRanges = [
    paramRangesObj.timeDis,
    paramRangesObj.profit,
    paramRangesObj.howManyCandleHeight,
    paramRangesObj.howManyNumForAvarageCandleHight,
];

// 自适应变异率函数
function getAdaptiveMutationRate(currentIteration, maxIterations) {
    const initialRate = 0.3;
    const finalRate = 0.05;
    const progress = currentIteration / maxIterations;
    return initialRate * (1 - progress) + finalRate * progress;
}

// 动态增加变异率和收敛策略
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

function mutateValue(currentValue, range, mutationRate, index) {
    let mutationOffset = (Math.random() * 2 - 1) * mutationRate * (range.max - range.min);
    let newValue = currentValue + mutationOffset;

    if (newValue < range.min) newValue = range.min;
    if (newValue > range.max) newValue = range.max;

    if (index === 0 || index === 2 || index === 3) {
        newValue = Math.round(newValue);
    } else {
        newValue = Number(newValue.toFixed(1));
    }

    return newValue;
}

function encodeParams(params) {
    return [params.timeDis, params.profit, params.howManyCandleHeight, params.howManyNumForAvarageCandleHight];
}

function decodeParams(arr) {
    return {
        timeDis: arr[0],
        profit: arr[1],
        howManyCandleHeight: arr[2],
        howManyNumForAvarageCandleHight: arr[3],
    };
}

function calculateDiversityPenalty(params, qualifiedSolutions) {
    const diversityThreshold = 10; // 距离阈值，定义为适当的阈值范围
    let minDistance = Infinity;

    // 遍历所有已经找到的合格解，计算最小距离
    for (let solution of qualifiedSolutions) {
        const dist = calculateDistance(params, solution.params);
        if (dist < minDistance) {
            minDistance = dist;
        }
    }

    // 如果最小距离小于阈值，则根据距离返回惩罚值
    if (minDistance < diversityThreshold) {
        return (diversityThreshold - minDistance) / diversityThreshold;
    }

    return 0; // 距离足够大，惩罚为0
}

// 计算两个参数向量之间的欧几里得距离
function calculateDistance(params1, params2) {
    const keys = Object.keys(params1);
    let sumOfSquares = 0;

    for (let key of keys) {
        const diff = params1[key] - params2[key];
        sumOfSquares += diff * diff;
    }

    return Math.sqrt(sumOfSquares);
}

// 适应度函数
function fitnessFunction(phenotype) {
    const params = decodeParams(phenotype);
    const { maxMoney, minMoney, testMoney } = evaluateStrategy(params);

    if (testMoney <= 0 || maxMoney <= 0) return 0;

    const diversityPenalty = calculateDiversityPenalty(params);
    const w1 = 3,
        w2 = 2;
    const fitness = w1 * maxMoney + w2 * (maxMoney / minMoney) - diversityPenalty;

    return fitness;
}
function fitnessFunction(phenotype) {
    const params = decodeParams(phenotype);
    const { maxMoney, minMoney, testMoney } = evaluateStrategy(params);

    if (testMoney <= 0 || maxMoney <= 0) return 0;

    const diversityPenalty = calculateDiversityPenalty(params, defaultParams);
    const w1 = 3,
        w2 = 2;
    const fitness = w1 * maxMoney + w2 * (maxMoney / minMoney) - diversityPenalty;

    return fitness;
}

function createGeneticAlgorithm(maxIterations) {
    let bestFitness = -Infinity;
    let lastImprovement = 0;

    return GeneticAlgorithmConstructor({
        mutationFunction: (phenotype) => mutationFunction(phenotype, lastImprovement, maxIterations),
        crossoverFunction: (parent1, parent2) => {
            return [
                [parent1[0], parent2[1], (parent1[2] + parent2[2]) / 2, parent1[3]],
                [parent2[0], parent1[1], parent2[2], (parent1[3] + parent2[3]) / 2],
            ];
        },
        fitnessFunction: (phenotype) => {
            const fitness = fitnessFunction(phenotype);
            if (fitness > bestFitness) {
                bestFitness = fitness;
                lastImprovement = 0; // 重置改进计数
            } else {
                lastImprovement++;
            }
            return fitness;
        },
        population: defaultParams
            ? defaultParams.map((item) => encodeParams(item.params))
            : [
                  encodeParams({
                      timeDis: 1,
                      profit: 1.5,
                      howManyCandleHeight: 5,
                      howManyNumForAvarageCandleHight: 90,
                  }),
              ],
        populationSize: 50,
        crossoverProbability: 0.8,
        mutationProbability: 0.1,
        fittestAlwaysSurvives: true,
        iterations: maxIterations,
    });
}

function validateOneMore(bestParams) {
    let finalRes = [];
    for (let targetTimeNum = 3; targetTimeNum <= 9; targetTimeNum++) {
        const paramsWithTargetTimeNum = { ...bestParams, targetTimeNum };
        const evaluation = evaluateStrategy(paramsWithTargetTimeNum);

        if (evaluation.testMoney <= 0) {
            return null;
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

// 计算哈希值来避免存储完整的参数对象
function getParamsHash(params) {
    const paramStr = JSON.stringify(params);
    return crypto.createHash("sha256").update(paramStr).digest("hex");
}

// 早停机制：没有改进的迭代次数超过阈值时，提前停止
function findAllQualifiedSolutions() {
    let newSolutions = [];
    let newBestParams = null;
    const triedSolutions = loadTriedSolutions();
    let attempt = 0;
    const maxAttempts = 1000;
    const maxNoImprovementThreshold = 100; // 如果 maxNoImprovementThreshold 轮没有改进，则重置

    while (attempt < maxAttempts) {
        attempt++;
        console.log(`第 ${attempt} 次尝试寻找最优解...`);

        const geneticAlgorithm = createGeneticAlgorithm(maxNoImprovementThreshold);
        geneticAlgorithm.evolve();

        const bestSolution = geneticAlgorithm.best();
        const currentBestParams = decodeParams(bestSolution);

        const currentBestParamsHash = getParamsHash(currentBestParams);
        if (triedSolutions.has(currentBestParamsHash)) {
            console.log("该参数组合已尝试过，跳过这次...");
            continue;
        }

        triedSolutions.add(currentBestParamsHash);
        if (triedSolutions.size % 1000 === 0) {
            saveTriedSolutions(triedSolutions); // 每 1000 次尝试保存一次
        }

        const evaluation = evaluateStrategy(currentBestParams);
        if (evaluation.testMoney <= 0) {
            console.log("初步最优解 testMoney <= 0，跳过这次...");
            continue;
        }

        console.log("初步最优参数:", currentBestParams);

        const validationResults = validateOneMore(currentBestParams);

        if (validationResults && validationResults.length) {
            newBestParams = {
                params: currentBestParams,
                results: validationResults,
            };
            newSolutions.push(newBestParams);
            console.log("找到了合格的参数:", {
                params: currentBestParams,
            });
            saveQualifiedSolutions(newBestParams); // 立即保存新的合格参数
        } else {
            console.log("初步参数不合格，继续寻找...");
        }
    }

    // 循环结束
    if (newSolutions.length === 0) {
        console.log(`超过 ${maxAttempts} 次尝试后仍未找到合格的最优参数，寻找失败。`);
    } else {
        console.log("找到的所有合格参数已经保存");
    }
}

function loadExistingQualifiedSolutions() {
    if (fs.existsSync(qualifiedSolutionsPath)) {
        return require(qualifiedSolutionsPath).qualifiedSolutions;
    }
    return [];
}

function loadTriedSolutions() {
    const triedSolutions = new Set();
    if (fs.existsSync(triedSolutionsPath)) {
        const triedHashes = fs.readFileSync(triedSolutionsPath, "utf8").split("\n");
        triedHashes.forEach((hash) => triedSolutions.add(hash));
    }
    return triedSolutions;
}

function saveTriedSolutions(triedSolutions) {
    const triedArray = Array.from(triedSolutions);
    fs.writeFileSync(triedSolutionsPath, triedArray.join("\n"), "utf8");
}

// 存最佳参数到文件
function saveQualifiedSolutions(newSolution) {
    const currentBestParams = newSolution.params;
    // 加载现有的合格参数
    let existingSolutions = loadExistingQualifiedSolutions();

    // 去重：只保留不在 existingSolutions 中的解
    const alreadyExist = existingSolutions.some((existingSolution) =>
        areParamsEqual(existingSolution.params, currentBestParams),
    );

    // 该解已经存在，直接返回
    if (alreadyExist) {
        console.log("没有新合格参数可保存，跳过保存过程。");
        return;
    }

    // 合并旧解和新解
    const updatedSolutions = [...existingSolutions, newSolution];

    // 保存更新后的合格参数
    const fileContent = `const qualifiedSolutions = ${JSON.stringify(
        updatedSolutions,
        null,
        2,
    )};\nmodule.exports = { qualifiedSolutions };`;
    fs.writeFileSync(qualifiedSolutionsPath, fileContent, "utf8");

    console.log(`合格参数已保存到 ${qualifiedSolutionsPath}`);
}

// 比较两个参数对象是否相同
function areParamsEqual(params1, params2) {
    return JSON.stringify(params1) === JSON.stringify(params2);
}

findAllQualifiedSolutions();
