const { exec } = require("child_process");

// 提取文件路径参数
const logFilePath = process.argv[2];

if (!logFilePath) {
    console.error("请提供日志路径");
    process.exit(1);
}

// 执行查询操作的函数
function pintTestMoney() {
    return new Promise((resolve, reject) => {
        // grep -A 2 '止损.* gridPointClearTrading ~ testMoney:.*' logs/dogeusdt-2024-4-5_1-26-29.log
        const command = `grep -A 2 '止损.* gridPointClearTrading ~ testMoney:.*' ${logFilePath}`;
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
    await pintTestMoney()
        .then((content) => {
            const strs = content.split("--") || [];
            console.log(`\n 时间                        仓位方向             testMoney`);
            strs.forEach((str) => {
                const matchRes = str.match(/(.*)\:\s止损(.*)\sgridPointClearTrading\s\~\stestMoney\:[，](-?\d+\.?\d+)/);
                const date = (matchRes && matchRes[1]) || "--";
                const direction = (matchRes && matchRes[2]) || "--";
                const testMoney = (matchRes && matchRes[3]) || "--";
                console.log(` ${date}          ${direction}                ${testMoney}`);
            });
            console.log(`\n`);
        })
        .catch((error) => {
            console.error(error);
        });
};
start();
