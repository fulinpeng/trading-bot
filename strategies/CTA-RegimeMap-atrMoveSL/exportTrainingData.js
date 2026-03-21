/**
 * 导出 ML 训练数据
 * 根据开仓时记录的特征 + 完整 K 线计算 label（未来 N 根内是否达到 2R）
 * 方案 C：回测结束后单独调用，不破坏原策略流式逻辑
 */

const path = require("path");
const fs = require("fs");

const LABEL_THRESHOLD = 2; // maxProfitR >= 2 则 label=1

/**
 * 从完整 K 线中计算每条样本的 maxProfitR 和 label
 * @param {Array} trainingSamples - 开仓时记录的样本 [{ openTime, trend, entryPrice, initialStopLoss, rsi, atr, adx, price, ma, price_vs_ma, volatility }]
 * @param {Array} kLineData - 完整 K 线数组
 * @param {number} futureBarsCount - 未来 K 线根数
 * @returns {Array} 带 label 的样本
 */
function computeLabels(trainingSamples, kLineData, futureBarsCount = 100) {
    const result = [];
    for (const sample of trainingSamples) {
        const idx = kLineData.findIndex((bar) => bar.openTime === sample.openTime);
        if (idx === -1) {
            console.warn(`[exportTrainingData] 未找到 openTime=${sample.openTime} 的 K 线，跳过`);
            continue;
        }
        const futureBars = kLineData.slice(idx + 1, idx + 1 + futureBarsCount);
        const denom = Math.abs(sample.entryPrice - sample.initialStopLoss);
        if (denom <= 0) {
            console.warn(`[exportTrainingData] entryPrice=${sample.entryPrice} initialStopLoss=${sample.initialStopLoss} 无效，跳过`);
            continue;
        }
        let maxProfitR = 0;
        const isLong = sample.trend === "up";
        for (const bar of futureBars) {
            const price = isLong ? bar.high : bar.low;
            const r = isLong
                ? (price - sample.entryPrice) / denom
                : (sample.entryPrice - price) / denom;
            if (r > maxProfitR) maxProfitR = r;
        }
        const label = maxProfitR >= LABEL_THRESHOLD ? 1 : 0;
        result.push({
            ...sample,
            is_long: isLong ? 1 : 0,
            maxProfitR: Math.round(maxProfitR * 1000) / 1000,
            label,
        });
    }
    return result;
}

/**
 * 导出 ML 训练数据到 JSON 文件
 * @param {Object} options
 * @param {Array} options.trainingSamples
 * @param {string} options.symbol - 如 "ethusdt"
 * @param {string} options.klineStage - 如 "30m"
 * @param {number} options.futureBarsCount
 * @param {string} options.outputPath - 输出路径，默认 strategy/training-data/ml-training-data.json
 */
function exportTrainingData(options) {
    const {
        trainingSamples,
        symbol = "ethusdt",
        klineStage = "30m",
        futureBarsCount = 100,
        outputPath,
    } = options;

    if (!trainingSamples || trainingSamples.length === 0) {
        console.log("[exportTrainingData] 无开仓样本，跳过导出");
        return null;
    }

    // 加载完整 K 线（与 wsServer 使用相同路径规则）
    const projectRoot = path.resolve(__dirname, "../..");
    const klineFilePath = path.join(projectRoot, "tests", "source", `${symbol}-${klineStage}.js`);
    if (!fs.existsSync(klineFilePath)) {
        console.error(`[exportTrainingData] K 线文件不存在: ${klineFilePath}`);
        return null;
    }
    delete require.cache[require.resolve(klineFilePath)];
    const fileData = require(klineFilePath);
    const kLineData = fileData.kLineData || fileData;

    const samplesWithLabels = computeLabels(trainingSamples, kLineData, futureBarsCount);
    const label1Count = samplesWithLabels.filter((s) => s.label === 1).length;
    const label0Count = samplesWithLabels.length - label1Count;

    const output = {
        meta: {
            symbol,
            klineStage,
            futureBarsCount,
            labelThreshold: LABEL_THRESHOLD,
            sampleCount: samplesWithLabels.length,
            label1Count,
            label0Count,
        },
        features: ["rsi", "atr", "adx", "price_vs_ma", "volatility", "is_long"],
        samples: samplesWithLabels,
    };

    const outPath =
        outputPath ||
        path.join(__dirname, "training-data", `ml-training-data-${symbol}-${klineStage}.json`);
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
    console.log(
        `[exportTrainingData] 已导出 ${samplesWithLabels.length} 条样本到 ${outPath}，label=1: ${label1Count}，label=0: ${label0Count}`
    );
    return outPath;
}

module.exports = { exportTrainingData, computeLabels };
