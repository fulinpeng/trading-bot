/*
根据 ./functions/params 找到合适的参数，用的全部遍历，没有用遗传算法

不用遗传算法，怎么提高搜索效率：
	1. 减少动态参数，减少了生成样本数据总量
	2. 采用两重验证方式，初步验证通过的再进行第二步验证
	3. 采用子线程并行
*/

const { fork } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const readline = require("readline");
const { pipeline } = require("stream");

const symbol = "1000pepeUSDT";
const qualifiedSolutionsPath = path.join(
    __dirname,
    `qualifiedSolutions/emaMaCrossover-${symbol}.js`
);

const batchSize = parseInt(os.cpus().length); // 每次处理cpus个参数组合

// 动态参数范围对象
const paramRangesObj = {
    howManyCandle: { min: 1, max: 10, step: 1 },
    isProfitRun: { min: 1, max: 1, step: 1 },
    firstStopProfitRate: { min: 1, max: 10, step: 0.5 },
    firstStopLossRate: { min: 0.3, max: 0.9, step: 0.1 },
    profitProtectRate: { min: 0.3, max: 0.9, step: 0.1 },
    howManyCandleForProfitRun: { min: 0.3, max: 2, step: 0.1 },
    maxStopLossRate: { min: 0.02, max: 0.05, step: 0.01 },
    invalidSigleStopRate: { min: 0.1, max: 0.1, step: 0.01 },
    double: { min: 1, max: 1, step: 1 },
    maxLossCount: { min: 20, max: 20, step: 1 },
    emaPeriod: { min: 10, max: 10, step: 1 },
    smaPeriod: { min: 10, max: 10, step: 1 },
    rsiPeriod: { min: 14, max: 14, step: 1 },
};

const allKeys = Object.keys(paramRangesObj);
// 参数路径
// const paramsDir = path.resolve(__dirname, "../source/params");
const paramsDir = path.resolve(__dirname, "./functions/params");
const paramsPath = path.join(paramsDir, "params.jsonl"); // 参数文件路径

// 将组合数组转换为对象
function convertToCombinationObject(keys, values) {
    const combinationObj = {};
    keys.forEach((key, index) => {
        combinationObj[key] = values[index]; // 动态生成键值对
    });
    return combinationObj; // 返回包含所有键值对的对象
}

// 保存合格的解决方案
function saveQualifiedSolutions(newSolutions) {
    let existingSolutions = loadExistingQualifiedSolutions();

    newSolutions.forEach((item) => {
        if (
            !existingSolutions.some((solution) => areSolutionsEqual(solution.params, item.params))
        ) {
            existingSolutions.push(item);
        }
    });

    fs.writeFileSync(
        qualifiedSolutionsPath,
        `module.exports = { qualifiedSolutions: ${JSON.stringify(existingSolutions, null, 2)} }` // 添加缩进提高可读性
    );
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
        solutionA.howManyCandle === solutionB.howManyCandle &&
        solutionA.isProfitRun === solutionB.isProfitRun &&
        solutionA.firstStopProfitRate === solutionB.firstStopProfitRate &&
        solutionA.firstStopLossRate === solutionB.firstStopLossRate &&
        solutionA.profitProtectRate === solutionB.profitProtectRate &&
        solutionA.howManyCandleForProfitRun === solutionB.howManyCandleForProfitRun &&
        solutionA.maxStopLossRate === solutionB.maxStopLossRate &&
        solutionA.invalidSigleStopRate === solutionB.invalidSigleStopRate &&
        solutionA.double === solutionB.double &&
        solutionA.maxLossCount === solutionB.maxLossCount &&
        solutionA.emaPeriod === solutionB.emaPeriod &&
        solutionA.smaPeriod === solutionB.smaPeriod &&
        solutionA.rsiPeriod === solutionB.rsiPeriod
    );
}

function extractArray(str) {
    // 正则表达式提取数组部分
    const match = str.match(/\[.*?\]/);
    if (match) {
        try {
            // 解析匹配到的字符串为数组
            return JSON.parse(match[0]); // 通过 JSON.parse 解析为数组
        } catch (error) {
            console.error("解析数组时出错:", error);
            return null; // 返回 null 表示解析失败
        }
    }
    return null; // 如果没有匹配到，则返回 null
}
// 逐行读取文件并分批发送给子进程
async function parallelProcess() {
    let currentBatch = [];

    // 创建读行接口逐行读取大文件
    const rl = readline.createInterface({
        input: fs.createReadStream(paramsPath),
        crlfDelay: Infinity,
    });

    pipeline(
        rl,
        async function* (source) {
            for await (const line of source) {
                const param = extractArray(line.trim());

                process.stdout.write(`读取到最新一行数据：${line}\r`);

                currentBatch.push(param);

                if (currentBatch.length === batchSize) {
                    const batchRes = await processBatch(currentBatch);
                    const realRes = batchRes.map((v) => v.value).filter((v) => !!v);

                    if (realRes.length > 0) {
                        saveQualifiedSolutions(realRes); // 保存合格参数
                    } else {
                        console.log("没有找到合适的参数");
                    }
                    currentBatch = []; // 清空批次
                }
            }

            // 处理最后一批
            if (currentBatch.length > 0 && currentBatch.length < batchSize) {
                console.log("🚀处理最后一批:", currentBatch);
                const batchRes = await processBatch(currentBatch);
                const realRes = batchRes.map((v) => v.value).filter((v) => !!v);
                if (realRes.length > 0) {
                    saveQualifiedSolutions(realRes); // 保存合格参数
                } else {
                    console.log("没有找到合适的参数");
                }
                setTimeout(() => process.exit(0), 10000);
            }
        },
        (err) => {
            if (err) {
                console.error("Pipeline encountered an error:", err);
            } else {
                console.log("Pipeline finished successfully.");
            }
        }
    );
}

// 处理一批参数
function processBatch(batch) {
    const childProcesses = [];

    // 确保每个子进程只接收一个任务
    for (let i = 0; i < batch.length; i++) {
        childProcesses.push(
            new Promise((resolve, reject) => {
                const child = fork(path.join(__dirname, "./childProcess/child-emaMaCrossover.js")); // 创建子进程
                const childId = child.pid; // 使用子进程的 pid 作为唯一标识符

                // 子进程完成任务后，处理结果
                child.on("message", (result) => {
                    if (result && result.childId === child.pid) {
                        // 确保接收到正确的子进程消息
                        if (result.qualified) {
                            resolve(result.solution); // 任务完成后 resolve，表示该子进程的任务完成
                        } else {
                            resolve();
                        }
                    }
                    child.kill(); // 任务完成后，确保子进程终止，防止卡死
                });
                child.on("error", (err) => {
                    reject(err);
                });

                // 捕捉子进程的退出
                child.on("exit", (code) => {
                    if (code !== 0) {
                        reject(new Error(`Child process exited with code ${code}`));
                    }
                });
                // 给子进程分配一个参数组合
                const params = convertToCombinationObject(allKeys, batch[i]);
                child.send({ action: "evaluate", params: { symbol, params, childId } }); // 发送子进程ID
            })
        );
    }

    return Promise.allSettled(childProcesses); // 等待所有子进程完成
}

// 启动并行处理
parallelProcess();
