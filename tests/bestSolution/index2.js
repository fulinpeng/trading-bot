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
const readline = require("readline");
const os = require("os");

const symbol = "1000pepeUSDT";
const qualifiedSolutionsPath = path.join(__dirname, `qualifiedSolutions/${symbol}.js`);

// 动态参数范围对象
const paramRangesObj = {
    timeDis: { min: 1, max: 300, step: 1 }, // step 为 1
    profit: { min: 0.1, max: 10, step: 0.1 }, // step 为 0.1
    howManyCandleHeight: { min: 3, max: 10, step: 1 }, // step 为 1
    howManyNumForAvarageCandleHight: { min: 6, max: 300, step: 1 }, // step 为 1
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

    // newSolutions.forEach((item) => {
    //     if (!existingSolutions.some((solution) => areSolutionsEqual(solution.params, item.params))) {
    //         existingSolutions.push(item);
    //     }
    // });
    existingSolutions.push(...newSolutions);
    fs.writeFileSync(
        qualifiedSolutionsPath,
        `module.exports = { qualifiedSolutions: ${JSON.stringify(existingSolutions)} }`
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
        solutionA.timeDis === solutionB.timeDis &&
        solutionA.profit === solutionB.profit &&
        solutionA.howManyCandleHeight === solutionB.howManyCandleHeight &&
        solutionA.howManyNumForAvarageCandleHight === solutionB.howManyNumForAvarageCandleHight
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
    const batchSize = os.cpus().length - 1; // 每次处理cpus个参数组合
    let currentBatch = [];

    // 创建读行接口逐行读取大文件
    const rl = readline.createInterface({
        input: fs.createReadStream(paramsPath),
        output: process.stdout,
        terminal: false,
    });

    rl.on("line", async (line) => {
        // 尝试解析 JSON，捕获任何可能的错误
        try {
            const param = extractArray(line.trim()); // 将每行参数转换为对象
            process.stdout.write(`读取到最新一行数据：${line}\r`);

            currentBatch.push(param);

            // 达到批次大小，开始处理当前批次
            if (currentBatch.length === batchSize) {
                rl.pause(); // 暂停读取，处理当前批次
                const batchRes = await processBatch(currentBatch);
                const realRes = batchRes.map((v) => v.value).filter((v) => !!v);
                if (realRes.length > 0) {
                    saveQualifiedSolutions(realRes); // 保存合格参数
                } else {
                    console.log("没有找到合适的参数");
                }
                currentBatch = []; // 清空批次
                rl.resume(); // 继续读取下一批
            }
        } catch (error) {
            console.error(`解析错误：${error.message}，行内容：${line}`); // 输出解析错误
        }
    });

    rl.on("close", async () => {
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
    });
    rl.on("error", (err) => {
        console.error("Readline encountered an error:", err);
    });
}

// 处理一批参数
function processBatch(batch) {
    const childProcesses = [];

    // 确保每个子进程只接收一个任务
    for (let i = 0; i < batch.length; i++) {
        childProcesses.push(
            new Promise((resolve, reject) => {
                const child = fork(path.join(__dirname, "./childProcess/child.js")); // 创建子进程
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
