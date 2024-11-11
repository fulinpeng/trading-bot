const { calculateSimpleMovingAverage } = require("./ma.js");

// 辅助函数，用于生成移动平均序列
function calculateMovingAverageSeries(data, period) {
    let result = [];
    for (let i = 0; i <= data.length - period; i++) {
        let slice = data.slice(i, i + period);
        result.push(calculateSimpleMovingAverage(slice, period));
    }
    return result;
}

// 计算ADX
function calculateADX(data, period = 14) {
    if (data.length < period) {
        throw new Error("Not enough data points for the specified period.");
    }
    let tr = [],
        plusDM = [],
        minusDM = [],
        plusDI = [],
        minusDI = [],
        dx = [],
        adx = [];

    // 计算 TR, +DM, -DM
    for (let i = 1; i < data.length; i++) {
        let highDiff = parseFloat(data[i].high) - parseFloat(data[i - 1].high);
        let lowDiff = parseFloat(data[i - 1].low) - parseFloat(data[i].low);

        let plus = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
        let minus = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;

        let trueRange = Math.max(
            parseFloat(data[i].high) - parseFloat(data[i].low),
            Math.abs(parseFloat(data[i].high) - parseFloat(data[i - 1].close)),
            Math.abs(parseFloat(data[i].low) - parseFloat(data[i - 1].close)),
        );

        plusDM.push(plus);
        minusDM.push(minus);
        tr.push(trueRange);
    }

    // 生成移动平均序列
    const smaTR = calculateMovingAverageSeries(tr, period);
    const smaPlusDM = calculateMovingAverageSeries(plusDM, period);
    const smaMinusDM = calculateMovingAverageSeries(minusDM, period);

    // 计算 +DI, -DI, 和 DX
    for (let i = 0; i < smaTR.length; i++) {
        plusDI.push(100 * (smaPlusDM[i] / smaTR[i]));
        minusDI.push(100 * (smaMinusDM[i] / smaTR[i]));
        dx.push(100 * Math.abs((plusDI[i] - minusDI[i]) / (plusDI[i] + minusDI[i])));
    }

    // 计算ADX
    adx = calculateMovingAverageSeries(dx, period);
    return adx;
}

module.exports = {
    calculateADX,
};
