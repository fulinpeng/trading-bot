// 读取命令行中的币种参数
const strategyParam = process.argv[2] || "defaultStrategy";
console.log("启动策略:", strategyParam);

// 动态加载策略文件
const path = require("path");
const fs = require("fs");

const strategiesPath = path.join(__dirname, "botStrategies", `${strategyParam}.js`);

if (fs.existsSync(strategiesPath)) {
    const strategy = require(strategiesPath);
    // 执行策略逻辑
    strategy.run();
} else {
    console.error(`未找到策略文件: ${strategyParam}.js`);
    process.exit(1);
}
