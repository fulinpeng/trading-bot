const { getDate, hasUpDownVal, calculateAverage } = require("./functions.js");

const calculateCandleHeight = (klines, shadowBodyRate = 2) => {
    let selected = [];
    for (let curKline of klines) {
        const { open, close, high, low } = curKline;
        const body = Math.abs(open - close);
        const totalKlineH = Math.abs(high - low);
        if (
            (high - Math.max(close, open)) / body > shadowBodyRate ||
            (Math.min(close, open) - low) / body > shadowBodyRate
        ) {
            // 插针，只取一半
            selected.push(totalKlineH / 2);
        } else {
            selected.push(totalKlineH);
        }
    }
    // console.log("参与计算平均高度的蜡烛: ", selected);
    return calculateAverage(selected);
};

// 是否 标准
function isBigLine({ open, close, high, low }, thresholdRatio = 0.6) {
    // 计算开盘价和收盘价之间的差值
    const bodyRange = Math.abs(open - close);

    // 计算最高价和最低价之间的差值
    const fullRange = high - low;

    const res = bodyRange >= fullRange * thresholdRatio;
    // console.log("🚀 ~ 是否 标准K ~ res:", res);
    return res;
}
// 是否光头阳
function isBigAndYang(kLine, ratio) {
    const res = kLine.close > kLine.open && isBigLine(kLine, ratio);
    // console.log("🚀 ~ 是否光头阳 ~ res:", res);
    return res;
}
// 是否光头阴
function isBigAndYin(kLine, ratio) {
    const res = kLine.close < kLine.open && isBigLine(kLine, ratio);
    // console.log("🚀 ~ 是否光头阴 ~ res:", res);
    return res;
}
module.exports = {
    calculateCandleHeight,
    isBigLine,
    isBigAndYang,
    isBigAndYin,
};
