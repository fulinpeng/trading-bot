/**
 * 计算V形和A形态的最高点和最低点
 * @param {Array} klineData - K线数据数组
 * @param {number} period - 检查的周期长度
 * @param {number} tolerance - 形态跨度的容差百分比
 * @returns {Object} 包含按顺序排列且无重复数据的V形最低点和A形最高点的对象
 */
function findVandAPoints(klineData, period = 30, tolerance = 0.01) {
    const recentData = klineData.slice(-100); // 取最近100根K线数据
    let vPoints = [];
    let aPoints = [];
    let lastVPoint = null;
    let lastAPoint = null;

    for (let i = 0; i <= recentData.length - period; i++) {
        const slice = recentData.slice(i, i + period);
        const { vPoint, aPoint } = checkVandAPoint(slice, tolerance);
        if (vPoint !== null && vPoint !== lastVPoint) {
            vPoints.push(vPoint);
            lastVPoint = vPoint;
        }
        if (aPoint !== null && aPoint !== lastAPoint) {
            aPoints.push(aPoint);
            lastAPoint = aPoint;
        }
    }

    const vPointsMin = vPoints.length ? Math.min(...vPoints) : null;
    const aPointsMax = aPoints.length ? Math.max(...aPoints) : null;

    return {
        vPoints,
        aPoints,
        vPointsMin,
        aPointsMax,
    };
}

/**
 * 检查K线片段是否符合V形和A形态，并返回最低点和最高点
 * @param {Array} slice - K线片段
 * @param {number} tolerance - 形态跨度的容差百分比
 * @returns {Object} 包含V形最低点和A形最高点的对象
 */
function checkVandAPoint(slice, tolerance) {
    const closes = slice.map((k) => parseFloat(k.close));
    const highs = slice.map((k) => parseFloat(k.high));
    const lows = slice.map((k) => parseFloat(k.low));
    const minClose = Math.min(...closes);
    const maxClose = Math.max(...closes);

    const currentPrice = parseFloat(slice[slice.length - 1].close);

    // 判断是否为V形态
    const vIndex = closes.indexOf(minClose);
    if (vIndex > 0 && vIndex < slice.length - 1) {
        const leftSide = closes.slice(0, vIndex);
        const rightSide = closes.slice(vIndex + 1);
        if (leftSide.length > 0 && rightSide.length > 0) {
            const leftSlope = Math.min(...leftSide);
            const rightSlope = Math.min(...rightSide);
            const priceDifference = (Math.max(...highs) - minClose) / currentPrice;
            if (priceDifference >= tolerance && leftSlope > minClose && rightSlope > minClose) {
                return { vPoint: minClose, aPoint: null };
            }
        }
    }

    // 判断是否为A形态
    const aIndex = closes.indexOf(maxClose);
    if (aIndex > 0 && aIndex < slice.length - 1) {
        const leftSide = closes.slice(0, aIndex);
        const rightSide = closes.slice(aIndex + 1);
        if (leftSide.length > 0 && rightSide.length > 0) {
            const leftSlope = Math.max(...leftSide);
            const rightSlope = Math.max(...rightSide);
            const priceDifference = (maxClose - Math.min(...lows)) / currentPrice;
            if (priceDifference >= tolerance && leftSlope < maxClose && rightSlope < maxClose) {
                return { vPoint: null, aPoint: maxClose };
            }
        }
    }

    return { vPoint: null, aPoint: null };
}

// 示例K线数据
// const klineData = [
//     { openTime: 1622476800000, open: "100", high: "110", low: "90", close: "101", volume: "1000", closeTime: 1622480400000, quoteAssetVolume: "10000", numberOfTrades: 100, takerBuyBaseAssetVolume: "500", takerBuyQuoteAssetVolume: "5000" },
//     // ... 其他K线数据
//     { openTime: 1622576800000, open: "105", high: "115", low: "95", close: "106", volume: "1000", closeTime: 1622580400000, quoteAssetVolume: "10000", numberOfTrades: 100, takerBuyBaseAssetVolume: "500", takerBuyQuoteAssetVolume: "5000" }
// ];

// 调用函数找出最近100根K线中符合V形和A形态的最高点和最低点
// const { vPoints, aPoints, vPointsMin, aPointsMax } = findVandAPoints(klineData);
// console.log('V形态最低点:', vPoints);
// console.log('A形态最高点:', aPoints);
// console.log('V形态最低值:', vPointsMin);
// console.log('A形态最高值:', aPointsMax);

const findMaxAndMin = (recentKlines) => {
    // 获取最近180根K线中的最高价和最低价
    let maxK = recentKlines[0];
    let minK = recentKlines[0];

    recentKlines.forEach((k) => {
        if (k.high > maxK.high) maxK = k;
        if (k.low < maxK.low) minK = k;
    });

    return { minK, maxK };
};
module.exports = { findVandAPoints, findMaxAndMin };
