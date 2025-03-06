const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { fork } = require("child_process");
const GeneticAlgorithmConstructor = require("geneticalgorithm");
const { evaluateStrategy } = require("../test-mading4-6.js"); // 引入你的验证逻辑

const symbol = "1000pepeUSDT";

let defaultParams = null;
const qualifiedSolutionsPath = path.join(__dirname, `qualifiedSolutions/${symbol}.js`);
const triedSolutionsPath = path.join(__dirname, `triedSolutions/${symbol}.txt`);
const childPath = path.join(__dirname, `childProcess/child.js`);

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

// 生成初始种群的随机参数
function generateInitialPopulation() {
    const population = new Set(); // 使用 Set 存储确保唯一性
    while (population.size < 50) {
        const individual = [
            randomInRange(paramRanges[0], true), // timeDis 为整数
            randomInRange(paramRanges[1]), // profit 为小数
            randomInRange(paramRanges[2], true), // howManyCandleHeight 为整数
            randomInRange(paramRanges[3], true), // howManyNumForAvarageCandleHight 为整数
        ];
        // 将个体编码为哈希值以确保唯一性
        population.add(JSON.stringify(individual));
    }
    return Array.from(population).map((item) => JSON.parse(item));
}

// 在给定范围内生成随机数，确保类型正确
function randomInRange(range, isInteger = false) {
    let randomValue = range.min + (range.max - range.min) * Math.random();
    if (isInteger) {
        return Math.round(randomValue); // 强制为整数
    }
    return Number(randomValue.toFixed(1)); // 保留一位小数
}

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
        // 使用随机值决定是否变异，增加变异的可能性
        if (Math.random() < mutationRate) {
            return mutateValue(value, range, mutationRate, index);
        }
        return value; // 保持当前值
    });
}
// 确保突变函数生成的值类型正确
function mutateValue(currentValue, range, mutationRate, index) {
    let mutationOffset = (Math.random() * 2 - 1) * mutationRate * (range.max - range.min);
    let newValue = currentValue + mutationOffset;

    if (newValue < range.min) newValue = range.min;
    if (newValue > range.max) newValue = range.max;

    if (index === 0 || index === 2 || index === 3) {
        newValue = Math.round(newValue); // 确保为整数
    } else {
        newValue = Number(newValue.toFixed(1)); // 确保为保留一位小数
    }

    return newValue;
}

// 交叉操作
function crossoverFunction(parent1, parent2) {
    return [
        [
            parent1[0], // timeDis
            Number(parent2[1].toFixed(1)), // profit，保留一位小数
            Math.round((parent1[2] + parent2[2]) / 2), // howManyCandleHeight 强制为整数
            Math.round((parent1[3] + parent2[3]) / 2), // howManyNumForAvarageCandleHight 强制为整数
        ],
        [
            parent2[0], // timeDis
            Number(parent1[1].toFixed(1)), // profit，保留一位小数
            Math.round((parent1[2] + parent2[2]) / 2), // howManyCandleHeight 强制为整数
            Math.round((parent1[3] + parent2[3]) / 2), // howManyNumForAvarageCandleHight 强制为整数
        ],
    ];
}

// 编码参数为数组
function encodeParams(params) {
    return [
        params.timeDis,
        params.profit,
        params.howManyCandleHeight,
        params.howManyNumForAvarageCandleHight,
    ];
}

// 解码参数为对象
function decodeParams(arr) {
    return {
        timeDis: arr[0],
        profit: arr[1],
        howManyCandleHeight: arr[2],
        howManyNumForAvarageCandleHight: arr[3],
    };
}

// 加载已尝试的参数
function loadTriedSolutions() {
    const triedSolutions = new Set();
    if (fs.existsSync(triedSolutionsPath)) {
        const triedHashes = fs.readFileSync(triedSolutionsPath, "utf8").split("\n");
        triedHashes.forEach((hash) => triedSolutions.add(hash));
    }
    return triedSolutions;
}

// 保存已尝试的参数
function saveTriedSolutions(triedSolutions) {
    const triedArray = Array.from(triedSolutions);

    // 检查并创建目录
    const dir = path.dirname(triedSolutionsPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true }); // 递归创建所有不存在的目录
    }

    // 写入文件
    fs.writeFileSync(triedSolutionsPath, triedArray.join("\n"), "utf8");
}

// 保存合格的解决方案
function saveQualifiedSolutions(newSolution) {
    let existingSolutions = loadExistingQualifiedSolutions();
    const alreadyExist = existingSolutions.some((solution) =>
        areSolutionsEqual(solution.params, newSolution.params)
    );

    if (!alreadyExist) {
        existingSolutions.push(newSolution);
        fs.writeFileSync(
            qualifiedSolutionsPath,
            `module.exports = { qualifiedSolutions: ${JSON.stringify(existingSolutions)} }`,
            "utf8"
        );
    }
}

// 加载已存在的合格解决方案
function loadExistingQualifiedSolutions() {
    if (fs.existsSync(qualifiedSolutionsPath)) {
        const data = require(qualifiedSolutionsPath);
        return data.qualifiedSolutions || [];
    }
    return [];
}

// 检查两个解决方案是否相等
function areSolutionsEqual(solutionA, solutionB) {
    return (
        solutionA.timeDis === solutionB.timeDis &&
        solutionA.profit === solutionB.profit &&
        solutionA.howManyCandleHeight === solutionB.howManyCandleHeight &&
        solutionA.howManyNumForAvarageCandleHight === solutionB.howManyNumForAvarageCandleHight
    );
}

// 生成参数的哈希值
function getParamsHash(params) {
    return crypto.createHash("sha256").update(JSON.stringify(params)).digest("hex");
}
function fitnessFunction(phenotype) {
    const params = decodeParams(phenotype);
    const { maxMoney, minMoney, testMoney } = evaluateStrategy(params);

    if (testMoney <= 0 || maxMoney <= 0) return 0;

    const w1 = 3,
        w2 = 2;
    const fitness = w1 * maxMoney + w2 * (maxMoney / minMoney);

    return fitness;
}
// 创建遗传算法实例
function createGeneticAlgorithm(maxIterations) {
    return GeneticAlgorithmConstructor({
        mutationFunction: mutationFunction,
        crossoverFunction: crossoverFunction,
        fitnessFunction: fitnessFunction,
        population: defaultParams
            ? defaultParams.map((item) => encodeParams(item.params))
            : generateInitialPopulation(),
        populationSize: 50,
        crossoverProbability: 0.8,
        mutationProbability: 0.1,
        fittestAlwaysSurvives: true,
        iterations: maxIterations,
    });
}

// 分配任务到子线程
function distributeTasks() {
    const maxConcurrent = os.cpus().length;
    const triedSolutions = loadTriedSolutions();
    let childProcesses = [];
    let queue = []; // 使用队列管理任务
    let currentGeneration = 0; // 当前的代数
    const maxGenerations = 1000; // 最大代数

    const geneticAlgorithm = createGeneticAlgorithm(maxGenerations);

    function processNext() {
        // 如果队列中没有任务了，检查是否所有的子进程都完成了
        if (queue.length === 0 && childProcesses.length === 0) {
            console.log(`所有参数处理完毕，进化到第${currentGeneration}代。`);
            if (currentGeneration >= maxGenerations) {
                console.log("达到最大代数，停止进化。");
                saveTriedSolutions(triedSolutions);
                return;
            }

            // 进化到下一代
            geneticAlgorithm.evolve();
            currentGeneration++;

            // 获取新种群并继续处理
            const population = geneticAlgorithm.population();
            queue = population.map((individual) => decodeParams(individual));
            console.log("queue:", queue);
            processNext(); // 重新开始分配
            return;
        }

        // 如果有任务且有空闲的CPU，分配新的任务
        while (queue.length > 0 && childProcesses.length < maxConcurrent) {
            console.log("🚀 queue.length:", queue.length);
            const params = queue.shift(); // 从队列中取出一个任务
            const paramHash = getParamsHash(params);

            // 检查参数是否已尝试过
            if (triedSolutions.has(paramHash)) {
                console.log("参数已尝试，跳过:", params);
                continue;
            }

            const child = fork(childPath);
            child.send({ params });
            child.on("message", (message) => {
                if (message.type === "result") {
                    console.log("处理结果:", message.result);
                    // 处理结果，并判断是否合格
                    if (message.result.qualified) {
                        saveQualifiedSolutions({ params, score: message.result.score });
                    }
                    triedSolutions.add(paramHash); // 记录已尝试的参数
                    saveTriedSolutions(triedSolutions); // 持久化
                }
                child.kill(); // 结束子进程
                childProcesses = childProcesses.filter((p) => p !== child); // 移除已完成的子进程
                processNext(); // 继续处理下一个任务
            });
            child.on("exit", () => {
                console.log("子进程退出。");
                childProcesses = childProcesses.filter((p) => p !== child); // 移除已完成的子进程
                processNext(); // 继续处理下一个任务
            });

            childProcesses.push(child); // 记录正在处理的子进程
        }
    }
    processNext(); // 开始分配任务
}

// 启动任务分发
distributeTasks();
