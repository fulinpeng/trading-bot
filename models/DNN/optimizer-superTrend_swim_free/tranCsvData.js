const fs = require('fs');
const path = require('path');

function convertCsvDataToTrainingSet(csvData, symbol) {
    if (!Array.isArray(csvData)) {
        throw new Error('csvData 必须是数组');
    }

    const trainingSet = [];

    csvData.forEach((entry) => {
        const { kLineData, indicatorData, resultArr: result } = entry;

        if (!Array.isArray(kLineData) || kLineData.length < 5) return;

        // 提取最近5根K线的 open, high, low, close, volume
        const kLineFeatures = kLineData.slice(-5).flatMap(k => [
            k.open, k.high, k.low, k.close, k.volume
        ]);

        // 提取最近一根指标数据
        const superTrend = indicatorData.superTrendArr.at(-1);
        const swim = indicatorData.swimingFreeArr.at(-1);
        const ssl = indicatorData.sslArr.at(-1);
        const fib = indicatorData.fibArr.at(-1);

        const features = [
            ...kLineFeatures,
            superTrend.trend, superTrend.up, superTrend.dn,
            swim.filt, swim.hiBand, swim.loBand,
            swim.trend === 'up' ? 1 : swim.trend === 'down' ? -1 : 0,
            swim.longCondition ? 1 : 0,
            swim.shortCondition ? 1 : 0,
            ssl.hlv, ssl.sslUp, ssl.sslDown,
            fib.basis,
            fib.upper_3, fib.upper_4, fib.upper_5, fib.upper_6, fib.upper_7,
            fib.lower_3, fib.lower_4, fib.lower_5, fib.lower_6, fib.lower_7
        ];

        const label = result.isWin ? 1 : 0;

        trainingSet.push({ features, label });
    });

    const filePath = `E:\\githubProjects\\trading-bot\\models\\DNN\\optimizer-superTrend_swim_free\\data\\${symbol}.json`;
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    } else {
        fs.writeFileSync(filePath, '', 'utf-8'); // 清空
    }

    fs.writeFileSync(filePath, JSON.stringify(trainingSet, null, 2), 'utf-8');
    console.log(`✅ 已生成训练数据文件: ${filePath}`);
}

module.exports = {
    convertCsvDataToTrainingSet,
};