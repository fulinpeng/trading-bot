const { exec } = require("child_process");

// 提取起始数字和文件路径参数
const startNumber = parseInt(process.argv[2]);
const logFilePath = process.argv[3];

// 检查参数是否提供正确
if (!startNumber) {
    console.error("请提供起始数字");
    process.exit(1);
}
if (!logFilePath) {
    console.error("请提供日志路径");
    process.exit(1);
}

// 初始化表头
let tableHeader = "\n查询内容                 行数    \n";

// 执行查询操作的函数
function performQuery(searchTerm) {
    return new Promise((resolve, reject) => {
        // grep -cE '交替穿过3.*盈利' logs/dogeusdt-2024-4-3\ 21\:47\:32.log
        // 查询出现次数
        const command = `grep -cE '${searchTerm}' ${logFilePath}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                // reject(`执行命令时出错: ${error}`);
                resolve(``);
                return;
            }
            if (stderr) {
                reject(`stderr: ${stderr}`);
                return;
            }
            const count = stdout.trim();
            resolve(`${searchTerm}   ----      ${count}    \n`);
        });
    });
}

// 构建表格内容的函数
async function buildTableContent() {
    let tableContent = "";
    for (let i = 1; i <= startNumber; i++) {
        const searchTerm = `穿过${i}次.*盈利`;
        try {
            const content = await performQuery(searchTerm);
            tableContent += content;
        } catch (error) {
            console.error(error);
        }
    }
    return tableContent;
}

// 执行查询操作的函数
function pintTestMoney() {
    return new Promise((resolve, reject) => {
        // grep -A 2 '交替穿过.*次交易点.*盈利' logs/dogeusdt-2024-4-5_1-26-29.log
        const command = `grep -A 2 '交替穿过.*次交易点.*盈利' ${logFilePath}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                // reject(`执行命令时出错: ${error}`);
                resolve(``);
                return;
            }
            if (stderr) {
                reject(`stderr: ${stderr}`);
                return;
            }
            resolve(`${stdout}`);
        });
    });
}

// 等待表格内容构建完成后输出表格

const start = async () => {
    await buildTableContent()
        .then((content) => {
            console.log(tableHeader + content);
        })
        .catch((error) => {
            console.error(error);
        });
    return; //>>>>
    await pintTestMoney()
        .then((content) => {
            const strs = content.split("--") || [];

            console.log(`\n时间                  盈利交易点索引             testMoney`);
            strs.forEach((str) => {
                const matchNumRes = str.match(/(.*)\:\s交替穿过(\d+)次交易点/);
                const matchTestMoneyRes = str.match(/.*testMoney\:，(-?\d+\.?\d+)/);
                const date = (matchNumRes && matchNumRes[1]) || "--";
                const num = (matchNumRes && matchNumRes[2]) || "--";
                const testMoney = (matchTestMoneyRes && matchTestMoneyRes[1]) || "--";
                console.log(` ${date}          ${num}              ----      ${testMoney}`);
            });
            console.log(`\n`);
        })
        .catch((error) => {
            console.error(error);
        });
};
start();
