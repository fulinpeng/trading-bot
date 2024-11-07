const { calculateSimpleMovingAverage } = require("./ma.js");
// 计算ADX
function calculateADX(data, period = 14) {
    let tr = [],
        plusDM = [],
        minusDM = [],
        plusDI = [],
        minusDI = [],
        dx = [],
        adx = [];

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

    let smaTR = calculateSimpleMovingAverage(tr, period);
    let smaPlusDM = calculateSimpleMovingAverage(plusDM, period);
    let smaMinusDM = calculateSimpleMovingAverage(minusDM, period);

    for (let i = 0; i < smaTR.length; i++) {
        plusDI.push(100 * (smaPlusDM[i] / smaTR[i]));
        minusDI.push(100 * (smaMinusDM[i] / smaTR[i]));
        dx.push(100 * Math.abs((plusDI[i] - minusDI[i]) / (plusDI[i] + minusDI[i])));
    }

    adx = calculateSimpleMovingAverage(dx, period);
    return adx;
}

module.exports = {
    calculateADX,
};
