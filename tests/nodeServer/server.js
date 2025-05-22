const express = require("express");
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

const app = express();
const PORT = 3001;

let symbol = process.argv[2];
let timeLevel = process.argv[3];
let strategy = process.argv[4];

if (symbol) {
    if (!symbol.match(/\w+USDT$/)) {
        console.error("请提供正确得symbol");
        process.exit(1);
    }
} else {
    console.error("请提供symbol");
    process.exit(1);
}
if (timeLevel) {
    if (!timeLevel.match(/\d+(m|h)$/)) {
        console.error("请提供正确得时间级别");
        process.exit(1);
    }
} else {
    console.error("请提供时间级别");
    process.exit(1);
}
if (!strategy) {
    console.error("请提供策略名");
    process.exit(1);
}

// 用于动态更新文件内容
let kLineData = [];
let data = {};

// 序列化
function jsonString(obj) {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === "function") {
            return value.toString(); // 将函数转换为字符串
        }
        return value;
    });
}

// 加载 AMD 规范模块
function loadAMDModule(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const module = { exports: {} };
    eval(content); // 注入到 `module.exports`
    return module.exports;
}

// 加载普通 JS 文件并注入全局变量
function loadGlobalModule(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    eval(content); // 加载到全局环境
}

// 加载 CMD 规范模块
function loadCMDModule(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const module = { exports: {} };
    const require = (moduleName) => {
        const resolvedPath = resolveModulePath(moduleName, filePath);
        return loadCMDModule(resolvedPath);
    };

    const wrappedContent = `(function (module, exports, require) { ${content} })(module, module.exports, require);`;
    eval(wrappedContent);

    return module.exports;
}

// 辅助函数：解析模块路径
function resolveModulePath(moduleName, currentFilePath) {
    const path = require("path");
    if (path.isAbsolute(moduleName)) {
        return moduleName;
    }
    return path.resolve(path.dirname(currentFilePath), moduleName);
}

// 加载数据
function reloadData() {
    // const sourcePath = path.resolve(__dirname, `source/${symbol}-${timeLevel}.js`);
    const sourcePath = path.resolve(__dirname, `source/renko-${symbol}-${timeLevel}.js`);
    // const sourcePath = path.resolve(__dirname, `../${symbol}2.js`); // 测试用，刚从logs拿到的数据
    const dataPath = path.resolve(__dirname, `data/${symbol}-${strategy}.js`);

    kLineData = require(sourcePath).kLineData || [];
    data = require(dataPath) || {};
}

// 监控文件变化
chokidar
    .watch(["source/**/*", "data/**/*"], {
        // ignored: /(^|[\/\\])\../,
        followSymlinks: true, // 跟踪软链接
        usePolling: true, // 启用轮询模式
        interval: 100, // 轮询间隔（毫秒）
    }) // 忽略隐藏文件
    .on("change", (path) => {
        console.log(`File changed: ${path}`);
        reloadData();
    })
    .on("add", (path) => {
        console.log(`File added: ${path}`);
    })
    .on("unlink", (path) => {
        console.log(`File removed: ${path}`);
    });

// 动态生成 HTML
app.get("/", (req, res) => {
    // const htmlPath = path.resolve(__dirname, "index.html");
    const htmlPath = path.resolve(__dirname, "index-renko-boll3.html");
    const htmlTemplate = fs.readFileSync(htmlPath, "utf-8");

    const injectedHTML = htmlTemplate
        .replace("{{kLineData}}", jsonString(kLineData))
        .replace("{{option}}", jsonString(data.option))
        .replace("{{openHistory}}", jsonString(data.openHistory))
        .replace("{{closeHistory}}", jsonString(data.closeHistory))
        .replace("{{trendHistory}}", jsonString(data.trendHistory))
        .replace("{{openPriceHistory}}", jsonString(data.openPriceHistory))
        .replace("{{closePriceHistory}}", jsonString(data.closePriceHistory))
        .replace("{{curTestMoneyHistory}}", jsonString(data.curTestMoneyHistory))
        .replace("{{highLowPrices}}", jsonString(data.highLowPrices))
        .replace("{{highLowTimes}}", jsonString(data.highLowTimes))
        .replace("{{ht}}", jsonString(data.ht))
        .replace("{{title}}", `${symbol}-${strategy}`)
        .replace("{{symbol}}", symbol)
        .replace("{{timeLevel}}", timeLevel)
        .replace("{{rsiArr}}", jsonString(data.rsiArr))
        .replace("{{macdArr}}", jsonString(data.macdArr))
        .replace("{{bollDisArr}}", jsonString(data.bollDisArr))
        .replace("{{volArr}}", jsonString(data.volArr))
        .replace("{{ratioArr}}", jsonString(data.ratioArr))
        .replace("{{totalSuperTrendArr}}", jsonString(data.totalSuperTrendArr))

    res.send(injectedHTML);
});

// 静态文件服务
app.use(express.static(path.resolve(__dirname, "public")));

// 启动服务
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    reloadData(); // 初次加载数据
});
