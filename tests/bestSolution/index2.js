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
const paramsDir = path.resolve(__dirname, "../source/params");
const paramsPath = path.join(paramsDir, "params.jsonl"); // 参数文件路径

// 将组合数组转换为对象
function convertToCombinationObject(keys, values) {
    const combinationObj = {};
    keys.forEach((key, index) => {
        combinationObj[key] = values[index]; // 动态生成键值对
    });
    return combinationObj; // 返回包含所有键值对的对象
}

// 保存结果到文件
function saveResToFile(qualifiedSolutions) {
    const fileContent = `const qualifiedSolutions = ${JSON.stringify(
        qualifiedSolutions,
        null,
        2,
    )};\nmodule.exports = { qualifiedSolutions };`;
    fs.appendFileSync(qualifiedSolutionsPath, fileContent, "utf8");
    console.log(`合格参数已保存到 ${qualifiedSolutionsPath}`);
}

// 逐行读取文件并分批发送给子进程
async function parallelProcess() {
    const qualifiedSolutions = [];
    const batchSize = 100; // 每次处理100个参数组合
    let currentBatch = [];

    // 创建读行接口逐行读取大文件
    const rl = readline.createInterface({
        input: fs.createReadStream(paramsPath),
        output: process.stdout,
        terminal: false,
    });

    rl.on("line", (line) => {
        // 尝试解析 JSON，捕获任何可能的错误
        try {
            const param = JSON.parse(line); // 将每行参数转换为对象
            process.stdout.write(`读取到最新一行数据：${line}\r`);
            currentBatch.push(param);

            // 达到批次大小，开始处理当前批次
            if (currentBatch.length === batchSize) {
                rl.pause(); // 暂停读取，处理当前批次
                processBatch(currentBatch, qualifiedSolutions).then(() => {
                    currentBatch = []; // 清空批次
                    rl.resume(); // 继续读取下一批
                });
            }
        } catch (error) {
            console.error(`解析错误：${error.message}，行内容：${line}`); // 输出解析错误
        }
    });

    rl.on("close", async () => {
        if (currentBatch.length > 0) {
            await processBatch(currentBatch, qualifiedSolutions); // 处理最后一批
        }

        if (qualifiedSolutions.length > 0) {
            saveResToFile(qualifiedSolutions); // 保存合格参数
        } else {
            console.log("没有找到合适的参数");
        }
    });
}

// 处理一批参数
function processBatch(batch, qualifiedSolutions) {
    const numCPUs = os.cpus().length;
    const childProcesses = [];

    for (let i = 0; i < numCPUs; i++) {
        childProcesses.push(
            new Promise((resolve) => {
                const child = fork(path.join(__dirname, "./childProcess/child.js")); // 创建子进程
                child.on("message", (result) => {
                    if (result && result.qualified) {
                        qualifiedSolutions.push(result.solution); // 存储合格的结果
                    }
                });
                child.on("exit", resolve);

                // 给子进程分配参数
                let paramIndex = i;
                while (paramIndex < batch.length) {
                    const params = convertToCombinationObject(allKeys, batch[paramIndex]);

                    child.send({ action: "evaluate", params: { symbol, params } });
                    paramIndex += numCPUs;
                }

                // 发送退出信号
                child.send({ action: "exit" });
            }),
        );
    }

    return Promise.all(childProcesses); // 等待所有子进程完成
}

// 启动并行处理
parallelProcess();
