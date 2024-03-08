const fs = require("fs");
// 模拟一个全局变量
global.myVariable = "Hello, World!";

const SYMBOL = "DOGEUSDT".toLowerCase();

// 模拟一个异步操作
setInterval(() => {
    // 故意引发异常
    console.log("Simulated Uncaught Exception");
}, 100000);
setTimeout(() => {
    // 故意引发异常
    // throw new Error("Simulated Uncaught Exception");
    console.log("没有错误");
    process.exit(1);
}, 1000);

// process.exit = function (...args) {
//     saveGlobalVariables();
//     process.exit(...args);
// };

// 监听未捕获异常
// process.on("uncaughtException", (err) => {
//     console.error("Uncaught Exception:", err);
//     // 退出进程
//     process.exit(1);
// });

// 监听进程的 exit 事件
process.on("exit", () => {
    saveGlobalVariables();
});
// 保存全局变量到文件
function saveGlobalVariables() {
    // 创建 data 文件夹
    if (!fs.existsSync("data")) {
        fs.mkdirSync("data");
    }
    const data = JSON.stringify({
        myVariable,
        SYMBOL,
    });
    fs.writeFileSync(`data/${SYMBOL}.js`, `module.exports = ${data}`, { flag: "w" });
    console.log(`Global variables saved to data/${SYMBOL}.js`);
}
