const fs = require("fs");
const { getDate } = require("./utils/functions.js");

let logStream = null;
let originalConsoleLog = null;
// logs
const createLogs = () => {
    // 保存原始的 console.log 函数
    originalConsoleLog = console.log;
    // 重定向 console.log 到文件
    if (!logStream) {
        logStream = fs.createWriteStream(`logs/fs-.log`, {
            flags: "a",
            // autoClose: true,
            // encoding: "utf8",
            // highWaterMark: 1024 * 100,
        });
    }

    logStream.on("open", (fd) => {
        originalConsoleLog(`文件已打开，文件描述符为：${fd}`);
    });
    logStream.on("finish", () => {
        originalConsoleLog("所有数据都已写入文件。");
    });
    logStream.on("close", () => {
        originalConsoleLog("文件流已关闭。");
    });
    logStream.on("error", (error) => {
        originalConsoleLog("写入文件时发生错误：", error);
    });
    // 重写 console.log
    console.log = function (...args) {
        // originalConsoleLog.apply(console, args); // 保留原始 console.log 的功能
        // 将 log 写入文件
        logStream.write(
            `${args
                .map((v) => {
                    if (typeof v === "object") {
                        return JSON.stringify(v);
                    } else {
                        return v;
                    }
                })
                .join("，")}\n`,
        );
    };
};

createLogs();
num = 0;
const setLog = async () => {
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 100);
    }).then(() => {
        console.log(getDate(undefined, true) + "--test shi da yin ...");
    });
};

async function run() {
    while (num < 1000000) {
        await setLog();
        num++;
        // if (num == 50) {
        //     // process.exit();
        //     var a = string();
        // }
    }
}
run();
// 在服务停止时执行的清理工作
function cleanup() {
    console.log("--Cleaning up before exit.");
    originalConsoleLog(getDate(undefined, true) + "--before logStream.end");
    if (logStream) {
        originalConsoleLog(getDate(undefined, true) + "--logStream.end");
        logStream.end();
    }
}

// 监听进程的 exit 事件
process.on("exit", () => {
    console.log("--Received exit");
    originalConsoleLog(getDate(undefined, true) + "--Received exit");
    cleanup();
});

// 监听中断信号（如 Ctrl+C）
process.on("SIGINT", () => {
    console.log(getDate(undefined, true) + "--Received Ctrl+C");
    process.exit();
});
