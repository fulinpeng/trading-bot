const express = require("express");
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

const app = express();
const PORT = 3002;

let symbol = process.argv[2];
let timeLevel = process.argv[3];
// 策略名固定为当前策略目录名
const strategy = "superTrend_ssl_qqemod";

if (symbol) {
    if (!symbol.match(/\w+USDT$/i)) {
        console.error("请提供正确的symbol（例如：ethUSDT）");
        process.exit(1);
    }
} else {
    console.error("请提供symbol（例如：ethUSDT）");
    process.exit(1);
}

if (timeLevel) {
    if (!timeLevel.match(/\d+(m|h)$/)) {
        console.error("请提供正确的时间级别（例如：5m）");
        process.exit(1);
    }
} else {
    console.error("请提供时间级别（例如：5m）");
    process.exit(1);
}

// 用于动态更新文件内容
let kLineData = [];
let indicators = [];
let openHistory = [];
let closeHistory = [];
let openPriceHistory = [];
let closePriceHistory = [];
let orderAmountHistory = [];
let trendHistory = [];
let curTestMoneyHistory = [];

// 序列化函数
function jsonString(obj) {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === "function") {
            return value.toString();
        }
        if (typeof value === "undefined") {
            return null;
        }
        return value;
    });
}

// 加载数据
function reloadData() {
    try {
        // 加载可视化日志数据（从 test/data 目录）
        // 注意：保持用户输入的symbol大小写
        // K线数据现在也从日志数据中读取，确保与指标数据一一对应
        const logDataPath = path.resolve(__dirname, `data/${symbol}-${strategy}.js`);
        let logData = null;
        if (fs.existsSync(logDataPath)) {
            logData = require(logDataPath);
            // K线数据从日志数据中读取，与指标数据一一对应
            kLineData = logData.kLineData || [];
            openHistory = logData.openHistory || [];
            closeHistory = logData.closeHistory || [];
            openPriceHistory = logData.openPriceHistory || [];
            closePriceHistory = logData.closePriceHistory || [];
            orderAmountHistory = logData.orderAmountHistory || [];
            trendHistory = logData.trendHistory || [];
            curTestMoneyHistory = logData.curTestMoneyHistory || [];
            indicators = {
                superTrendArr: logData.superTrendArr || [],
                sslArr: logData.sslArr || [],
                ssl2Arr: logData.ssl2Arr || [],
                fibArr: logData.fibArr || [],
                swimingFreeArr: logData.swimingFreeArr || [],
                qqeModArr: logData.qqeModArr || [],
                adxArr: logData.adxArr || [],
                preHighLowArr: logData.preHighLowArr || [],
            };
            console.log(`可视化日志数据加载成功: K线数据 ${kLineData.length} 根, 开仓 ${openHistory.length} 次, 指标数组长度 ${indicators.superTrendArr.length}`);
        } else {
            // 可视化日志数据文件不存在是正常的（需要先运行策略并启用日志收集）
            kLineData = [];
            openHistory = [];
            closeHistory = [];
            openPriceHistory = [];
            closePriceHistory = [];
            orderAmountHistory = [];
            trendHistory = [];
            curTestMoneyHistory = [];
            indicators = {
                superTrendArr: [],
                sslArr: [],
                ssl2Arr: [],
                fibArr: [],
                swimingFreeArr: [],
                qqeModArr: [],
                adxArr: [],
                preHighLowArr: [],
            };
        }
    } catch (error) {
        console.error("加载数据失败:", error);
    }
}

// 监控文件变化
const dataDir = path.resolve(__dirname, "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

chokidar
    .watch([
        dataDir + "/**/*.js"
    ], {
        followSymlinks: true,
        usePolling: true,
        interval: 100,
    })
    .on("change", (filePath) => {
        console.log(`文件变化: ${filePath}`);
        reloadData();
    })
    .on("add", (filePath) => {
        console.log(`文件添加: ${filePath}`);
        reloadData();
    });

// 动态生成 HTML
app.get("/", (req, res) => {
    const htmlPath = path.resolve(__dirname, "index.html");
    const htmlTemplate = fs.readFileSync(htmlPath, "utf-8");

    const injectedHTML = htmlTemplate
        .replace("{{kLineData}}", jsonString(kLineData))
        .replace("{{indicators}}", jsonString(indicators))
        .replace("{{openHistory}}", jsonString(openHistory))
        .replace("{{closeHistory}}", jsonString(closeHistory))
        .replace("{{openPriceHistory}}", jsonString(openPriceHistory))
        .replace("{{closePriceHistory}}", jsonString(closePriceHistory))
        .replace("{{orderAmountHistory}}", jsonString(orderAmountHistory))
        .replace("{{trendHistory}}", jsonString(trendHistory))
        .replace("{{curTestMoneyHistory}}", jsonString(curTestMoneyHistory))
        .replace("{{title}}", `${symbol}-${strategy}`)
        .replace("{{symbol}}", `${symbol}`)
        .replace("{{timeLevel}}", `${timeLevel}`);

    res.send(injectedHTML);
});

// 静态文件服务
app.use(express.static(path.resolve(__dirname)));

// 启动服务
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`Symbol: ${symbol}, TimeLevel: ${timeLevel}, Strategy: ${strategy}`);
    reloadData(); // 初次加载数据
});

