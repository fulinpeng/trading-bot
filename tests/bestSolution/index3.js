const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const GeneticAlgorithmConstructor = require("geneticalgorithm");
const { fork } = require("child_process");
const os = require("os");
const { evaluateStrategy } = require("../test-mading4-6.js");

const symbol = "1000pepeUSDT";

const qualifiedSolutionsPath = path.join(__dirname, `qualifiedSolutions/${symbol}.js`);
const triedSolutionsPath = path.join(__dirname, `triedSolutions/${symbol}.txt`);
const childPath = path.join(__dirname, `childProcess/child.js`);

let defaultParams = null;
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

// 随机生成一个个体参数
function generateRandomParams() {
    return {
        timeDis:
            Math.floor(Math.random() * (paramRangesObj.timeDis.max - paramRangesObj.timeDis.min + 1)) +
            paramRangesObj.timeDis.min,
        profit: (
            Math.random() * (paramRangesObj.profit.max - paramRangesObj.profit.min) +
            paramRangesObj.profit.min
        ).toFixed(1),
        howManyCandleHeight:
            Math.floor(
                Math.random() * (paramRangesObj.howManyCandleHeight.max - paramRangesObj.howManyCandleHeight.min + 1),
            ) + paramRangesObj.howManyCandleHeight.min,
        howManyNumForAvarageCandleHight:
            Math.floor(
                Math.random() *
                    (paramRangesObj.howManyNumForAvarageCandleHight.max -
                        paramRangesObj.howManyNumForAvarageCandleHight.min +
                        1),
            ) + paramRangesObj.howManyNumForAvarageCandleHight.min,
    };
}

// 将个体参数转换为数组，用于遗传算法
function encodeParams(params) {
    return [params.timeDis, params.profit, params.howManyCandleHeight, params.howManyNumForAvarageCandleHight];
}

// 将数组解码为参数对象
function decodeParams(arr) {
    return {
        timeDis: arr[0],
        profit: arr[1],
        howManyCandleHeight: arr[2],
        howManyNumForAvarageCandleHight: arr[3],
    };
}

// 计算适应度函数
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

// 遗传算法中的变异函数
function mutationFunction(phenotype, lastImprovement, maxIterations) {
    const mutationFactor = lastImprovement / maxIterations;
    const newPhenotype = [...phenotype];

    newPhenotype.forEach((gene, index) => {
        if (Math.random() < mutationFactor) {
            newPhenotype[index] = gene * (1 + Math.random() * 0.1 - 0.05); // 添加少量扰动
        }
    });

    return newPhenotype;
}

// 创建遗传算法，并且在初始种群中加入随机生成的个体
function createGeneticAlgorithm(maxIterations) {
    let bestFitness = -Infinity;
    let lastImprovement = 0;

    // 随机生成一批新个体来增加初始种群的多样性
    const randomPopulation = Array.from({ length: 20 }, () => encodeParams(generateRandomParams()));

    // 如果有 defaultParams，加入其中作为种群的一部分
    const initialPopulation = defaultParams
        ? defaultParams.map((item) => encodeParams(item.params)).concat(randomPopulation)
        : randomPopulation;

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
                lastImprovement = 0;
            } else {
                lastImprovement++;
            }
            return fitness;
        },
        population: initialPopulation,
        populationSize: 50,
        crossoverProbability: 0.8,
        mutationProbability: 0.1,
        fittestAlwaysSurvives: true,
        iterations: maxIterations,
    });
}

// 哈希参数值，以避免重复
function getParamsHash(params) {
    return crypto.createHash("md5").update(JSON.stringify(params)).digest("hex");
}

// 加载已尝试过的解
function loadTriedSolutions() {
    if (fs.existsSync(triedSolutionsPath)) {
        const triedSolutions = fs.readFileSync(triedSolutionsPath, "utf8").split("\n");
        return new Set(triedSolutions);
    }
    return new Set();
}

// 保存已尝试过的解
function saveTriedSolutions(triedSolutions) {
    fs.writeFileSync(triedSolutionsPath, Array.from(triedSolutions).join("\n"));
}

// 保存合格解
function saveQualifiedSolutions(params) {
    const qualifiedSolutions = fs.existsSync(qualifiedSolutionsPath)
        ? require(qualifiedSolutionsPath).qualifiedSolutions
        : [];
    qualifiedSolutions.push({ params });
    fs.writeFileSync(
        qualifiedSolutionsPath,
        `module.exports = { qualifiedSolutions: ${JSON.stringify(qualifiedSolutions)} }`,
    );
}

// 主流程：通过遗传算法找到解，并将其交给子线程验证
function findAllQualifiedSolutions() {
    const triedSolutions = loadTriedSolutions();
    const maxAttempts = 200;
    const maxNoImprovementThreshold = 100;

    let attempt = 0;

    while (attempt < maxAttempts) {
        attempt++;
        console.log(`第 ${attempt} 次尝试寻找最优解...`);

        const geneticAlgorithm = createGeneticAlgorithm(maxNoImprovementThreshold);
        geneticAlgorithm.evolve();

        const bestSolution = geneticAlgorithm.best(); // 先获取单个最佳解
        processBestSolutions(bestSolution, triedSolutions);
    }

    console.log("找到的所有合格参数已经保存");
}

// 验证最佳解，并通过子线程并行处理
function processBestSolutions(bestSolution, triedSolutions) {
    const childProcesses = [];
    const qualifiedSolutions = [];

    const cpuCount = os.cpus().length;
    const currentBestParams = decodeParams(bestSolution);
    const currentBestParamsHash = getParamsHash(currentBestParams);

    if (triedSolutions.has(currentBestParamsHash)) {
        console.log("该参数组合已尝试过，跳过这次...");
        return;
    }

    triedSolutions.add(currentBestParamsHash);

    for (let i = 0; i < cpuCount; i++) {
        const childProcess = fork(childPath); // 子进程文件
        childProcess.send({ action: "evaluate", params: currentBestParams, symbol });

        childProcess.on("message", (message) => {
            if (message.qualified) {
                console.log("找到了合格的参数:", message.solution);
                qualifiedSolutions.push(message.solution);
                saveQualifiedSolutions(currentBestParams);
            }
        });

        childProcesses.push(childProcess);
    }

    // 等待所有子进程结束
    Promise.all(childProcesses.map((p) => new Promise((resolve) => p.on("exit", resolve)))).then(() => {
        console.log("所有子进程完成");
        saveTriedSolutions(triedSolutions); // 最后保存尝试过的参数组合
    });
}

// 启动寻找合格解决方案的过程
findAllQualifiedSolutions();
