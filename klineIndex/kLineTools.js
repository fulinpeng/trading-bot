const { getDate, hasUpDownVal, calculateAverage } = require("../common/functions.js");

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

// 是否突破前高
function isBreakPreHigh(max) {
    const tempLast = kLineData.slice(0, 14);
    let res = true;
    for (const item of tempLast) {
        if (item.high > max) {
            res = false;
            break;
        }
    }
    console.log("🚀 ~ file: 是否突破前高 res:", res);
    return res;
}
// 突破前低
function isBreakPreLow(min) {
    const tempLast = kLineData.slice(0, 6);
    let res = true;
    for (const item of tempLast) {
        if (item.low < min) {
            res = false;
            break;
        }
    }
    console.log("🚀 ~ file: 是否突破前低 res:", res);
    return res;
}
// 是否十字星
function isCross({ open, close, high, low }, thresholdRatio = 0.35) {
    // 定义一个阈值比例，用于判断开盘价和收盘价的接近程度

    // 计算开盘价和收盘价之间的差值
    const bodyRange = Math.abs(open - close);

    // 计算最高价和最低价之间的差值
    const fullRange = high - low;

    // 判断是否为“十字星”
    const res = bodyRange <= fullRange * thresholdRatio;
    console.log("🚀 ~ 是否十字星 ~ res:", res);
    return res;
}
// 是否上垂线
function isUpCross(kLine) {
    let res = false;
    if (isCross(kLine)) {
        const { open, close, high, low } = kLine;
        // 上引线
        let upTail = high - Math.max(open, close);
        // 下引线
        let downTail = Math.min(open, close) - low;
        res = downTail > upTail * 2;
    } else {
        res = false;
    }
    console.log("🚀 ~ 是否上垂线 ~ res:", res);
    return res;
}
// 是否下垂线
function isDownCross(kLine, ratio) {
    let res = false;
    if (isCross(kLine, ratio)) {
        const { open, close, high, low } = kLine;
        // 上引线
        let upTail = high - Math.max(open, close);
        // 下引线
        let downTail = Math.min(open, close) - low;
        res = upTail > downTail * 2;
    } else {
        res = false;
    }
    console.log("🚀 ~ 是否下垂线 ~ res:", res);
    return res;
}

// 是否顶分
function isTopFractal(first, middle, last) {
    // 检查中间一根K线的高点是否是三根K线中最高的
    const isMiddleHighHighest = middle.high > first.high && middle.high > last.high;
    // 检查中间一根K线的低点是否是三根K线中最高的
    const isMiddleLowLowest = middle.low > first.low && middle.low > last.low;

    const midBody = Math.abs(middle.close - middle.open);
    const firstBody = Math.abs(first.close - first.open);
    const lastBody = Math.abs(last.close - last.open);

    // 中间k实体不能比两边的大
    const isMiddleSmaller = midBody < firstBody && midBody < lastBody;

    // 返回是否为顶分形态
    const res =
        isCross(middle) &&
        !isCross(first) &&
        !isCross(last) &&
        isMiddleSmaller &&
        isMiddleHighHighest &&
        isMiddleLowLowest &&
        first.open + firstBody / 2 > last.close;

    console.log("🚀 ~ 是否顶分 ~ res:", res);
    return res;
}
// 是否底分
function isBottomFractal(first, middle, last) {
    // 检查中间一根K线的高点是否是三根K线中最低的
    const isMiddleHighHighest = middle.high < first.high && middle.high < last.high;
    // 检查中间一根K线的低点是否是三根K线中最低的
    const isMiddleLowLowest = middle.low < first.low && middle.low < last.low;

    const midBody = Math.abs(middle.close - middle.open);
    const firstBody = Math.abs(first.close - first.open);
    const lastBody = Math.abs(last.close - last.open);

    // 中间k实体不能比两边的大
    const isMiddleSmaller = midBody < firstBody && midBody < lastBody;

    // 返回是否为底分形态
    const res =
        isCross(middle) &&
        !isCross(first) &&
        !isCross(last) &&
        isMiddleSmaller &&
        isMiddleHighHighest &&
        isMiddleLowLowest &&
        first.close + firstBody / 2 < last.close;

    console.log("🚀 ~ 是否 底分形态 ~ res:", res);
    return res;
}
// 两个k线合并看作下垂线
function isDownLinesGroup2(kLine2, kLine3) {
    let res = false;
    if (isUpCross(kLine2) || isUpCross(kLine3)) {
        res = false;
    }
    res = isDownCross({
        open: kLine2.open,
        close: kLine3.close,
        high: Math.max(kLine2.high, kLine3.high),
        low: Math.min(kLine2.low, kLine3.low),
    });
    console.log("🚀 ~ 是否 两个k线合并看作下垂线 ~ res:", res);
    return res;
}
// 两个k线合并看作上垂线
function isUpLinesGroup2(kLine2, kLine3) {
    let res = false;
    if (isDownCross(kLine2) || isDownCross(kLine3)) {
        res = false;
    }
    res = isUpCross({
        open: kLine2.open,
        close: kLine3.close,
        high: Math.max(kLine2.high, kLine3.high),
        low: Math.min(kLine2.low, kLine3.low),
    });
    console.log("🚀 ~ 是否 两个k线合并看作上垂线 ~ res:", res);
    return res;
}
// 三个k线合并看作下垂线
function isDownLinesGroup3(kLine1, kLine2, kLine3) {
    let res = false;
    res =
        isDownCross({
            open: kLine1.open,
            close: kLine3.close,
            high: Math.max(kLine1.high, kLine2.high, kLine3.high),
            low: Math.min(kLine1.low, kLine2.low, kLine3.low),
        }) && kLine3.close < Math.max(kLine1.close, kLine1.open) - Math.abs(kLine1.close - kLine1.open) / 2;
    console.log("🚀 ~ 是否 三个k线合并看作下垂线 ~ res:", res);
    return res;
}
// 三根k线合并为上垂线
function isUpLinesGroup3(kLine1, kLine2, kLine3) {
    let res = false;
    res =
        isUpCross({
            open: kLine1.open,
            close: kLine3.close,
            high: Math.max(kLine1.high, kLine2.high, kLine3.high),
            low: Math.min(kLine1.low, kLine2.low, kLine3.low),
        }) && kLine3.close > Math.min(kLine1.close, kLine1.open) + Math.abs(kLine1.close - kLine1.open) / 2;
    console.log("🚀 ~ 是否 三根k线合并为上垂线 ~ res:", res);
    return res;
}
// 看跌吞没
function isDownSwallow(kLine2, kLine3) {
    const res =
        kLine3.open > kLine3.close && // 阴烛
        (kLine3.open - kLine3.close) / (kLine3.high - kLine3.low) > 0.52 && // 实体占比大于0.55
        kLine2.low > kLine3.low &&
        kLine2.high < kLine3.high;
    console.log("🚀 ~ 是否 看跌吞没 ~ res:", res);
    return res;
}
// 看涨吞没
function isUpSwallow(kLine2, kLine3) {
    const res =
        kLine3.open < kLine3.close && // 阳烛
        (kLine3.close - kLine3.open) / (kLine3.high - kLine3.low) > 0.52 && // 实体占比大于0.55
        kLine2.low > kLine3.low &&
        kLine2.high < kLine3.high;
    console.log("🚀 ~ 是否 看涨吞没 ~ res:", res);
    return res;
}
// k3 跌破k1/k2，k3是光k
function isBreakDown(kLine1, kLine2, kLine3) {
    const kLine3Mid = (kLine3.open - kLine3.close) / 2;
    const res =
        kLine3.close < kLine3.open && kLine3Mid < kLine1.low && kLine3Mid < kLine2.low && isBigLine(kLine3, 0.6);
    console.log("🚀 ~ 是否 k3 跌破k1/k2，k3是光k ~ res:", res);
    return res;
}
// k3 上破k1/k2，k3是光k
function isBreakUp(kLine1, kLine2, kLine3) {
    const kLine3Mid = (kLine3.close - kLine3.open) / 2;
    const res =
        kLine3.close > kLine3.open && kLine3Mid > kLine1.high && kLine3Mid > kLine2.high && isBigLine(kLine3, 0.6);
    console.log("🚀 ~ 是否 k3 上破k1/k2，k3是光k ~ res:", res);
    return res;
}
// 黄昏星
function isDownStar(kLine1, kLine2, kLine3) {
    const k1Body = Math.abs(kLine1.close - kLine1.open);
    const k2Body = Math.abs(kLine2.close - kLine2.open);
    const k3Body = Math.abs(kLine3.close - kLine3.open);
    const res =
        kLine1.open < kLine1.close &&
        kLine3.open > kLine3.close &&
        k1Body > k2Body &&
        k3Body > k2Body &&
        kLine1.open + k1Body / 2 > kLine3.low &&
        kLine2.low > kLine3.low &&
        (isDownSwallow(kLine1, kLine3) || isBigAndYin(kLine3, 0.8) || isDownCross(kLine1, kLine3));
    console.log("🚀 ~ 是否 黄昏星 ~ res:", res);
    return res;
}
// 启明星
function isUpStar(kLine1, kLine2, kLine3) {
    const k1Body = Math.abs(kLine1.close - kLine1.open);
    const k2Body = Math.abs(kLine2.close - kLine2.open);
    const k3Body = Math.abs(kLine3.close - kLine3.open);
    const res =
        kLine1.open > kLine1.close &&
        kLine3.open < kLine3.close &&
        k1Body > k2Body &&
        k3Body > k2Body &&
        kLine1.close + k1Body / 2 < kLine3.high &&
        kLine2.high < kLine3.high &&
        (isUpSwallow(kLine1, kLine3) || isBigAndYang(kLine3, 0.8) || isUpCross(kLine1, kLine3));
    console.log("🚀 ~ 是否 启明星 ~ res:", res);
    return res;
}
// 顶顶高
function isHigherHigh(kLine1, kLine2, kLine3) {
    const res =
        kLine1.low < kLine2.low && kLine2.low < kLine3.low && kLine1.high < kLine2.high && kLine2.high < kLine3.high;
    console.log("🚀 ~ 是否 顶顶高 ~ res:", res);
    return res;
}
// 底底低
function isLowerLow(kLine1, kLine2, kLine3) {
    const res =
        kLine1.low > kLine2.low && kLine2.low > kLine3.low && kLine1.high > kLine2.high && kLine2.high > kLine3.high;
    console.log("🚀 ~ 是否 底底低 ~ res:", res);
    return res;
}
// 相互吞没
function isK1Swallow(kLine1, kLine2, kLine3) {
    const k1Swallow =
        kLine1.high > kLine2.high && kLine1.high > kLine3.high && kLine1.low < kLine2.low && kLine1.low < kLine3.low;
    const bodyMax = Math.max(kLine1.close, kLine1.open);
    const bodyMin = Math.min(kLine1.close, kLine1.open);
    const k1BodySwallow =
        bodyMax > Math.max(kLine2.open, kLine2.close, kLine3.open, kLine3.close) &&
        bodyMin < Math.min(kLine2.open, kLine2.close, kLine3.open, kLine3.close);
    // const k1TooBig =
    //     Math.abs(kLine1.open - kLine1.close) -
    //         Math.abs(kLine2.open - kLine2.close) -
    //         Math.abs(kLine3.open - kLine3.close) >
    //     0;
    // const k2TooBig =
    //     Math.abs(kLine2.open - kLine2.close) -
    //         Math.abs(kLine1.open - kLine1.close) -
    //         Math.abs(kLine3.open - kLine3.close) >
    //     0;

    const res = k1Swallow && k1BodySwallow; //|| k1TooBig || k2TooBig;
    console.log("🚀 ~ 是否 相互吞没 ~ res:", res);
    return res;
}
// 四k上
function isFourUp([one, two, three, four]) {
    let res = false;
    if (
        (isCross(one) &&
            isCross(two) &&
            isCross(three) &&
            isBigAndYang(four) &&
            four.close > Math.max(one.high, two.high, three.high)) ||
        (isBigAndYin(one) && isCross(two) && isCross(three) && isBigAndYang(four))
    ) {
        res = true;
    }
    console.log("🚀 ~ file: 四k上 ~ res:", res);
    return res;
}
// 四k下
function isFourDown([one, two, three, four]) {
    let res = false;
    if (
        (isCross(one) &&
            isCross(two) &&
            isCross(three) &&
            isBigAndYin(four) &&
            four.close < Math.min(one.low, two.low, three.low)) ||
        (isBigAndYang(one) && isCross(two) && isCross(three) && isBigAndYin(four))
    ) {
        res = true;
    }
    console.log("🚀 ~ file: 四k下 ~ res:", res);
    return res;
}
// k1大阴k的+k2实体最小 + 大阴k+k3实体一半小于前方实体最低值
const downPao = (one, two, three) => {
    let res = false;
    const twoBody = Math.abs(two.open - two.close);
    if (
        isBigAndYin(one) &&
        isBigAndYin(three) &&
        twoBody < Math.abs(one.open - one.close) &&
        twoBody < Math.abs(three.open - three.close) &&
        three.close < Math.min(one.low, two.low)
    ) {
        res = true;
    }
    console.log("🚀 ~ file: 空方炮 res:", res);
    return res;
};
const upPao = (one, two, three) => {
    let res = false;
    const twoBody = Math.abs(two.open - two.close);
    if (
        isBigAndYang(one) &&
        isBigAndYang(three) &&
        twoBody < Math.abs(one.open - one.close) &&
        twoBody < Math.abs(three.open - three.close) &&
        three.close > Math.max(one.high, two.high)
    ) {
        res = true;
    }
    console.log("🚀 ~ file: 多方炮 res:", res);
    return res;
};
// 是否在50均线之下
const isDownMa = (kLine1, kLine2, kLine3, ma) => {
    let res = false;
    const k1Center = Math.min(kLine1.open, kLine1.close) + Math.abs(kLine1.open - kLine1.close) / 2;
    const k2Center = Math.min(kLine2.open, kLine2.close) + Math.abs(kLine2.open - kLine2.close) / 2;
    const k3Center = Math.min(kLine3.open, kLine3.close) + Math.abs(kLine3.open - kLine3.close) / 2;
    if (Math.max(k1Center, k2Center, k3Center) <= ma) {
        res = true;
    }
    console.log("🚀 ~ file: 是否在50均线之下 ~ res:", res);
    return res;
};
// 是否在50均线之上
const isUpMa = (kLine1, kLine2, kLine3, ma) => {
    let res = false;
    const k1Center = Math.min(kLine1.open, kLine1.close) + Math.abs(kLine1.open - kLine1.close) / 2;
    const k2Center = Math.min(kLine2.open, kLine2.close) + Math.abs(kLine2.open - kLine2.close) / 2;
    const k3Center = Math.min(kLine3.open, kLine3.close) + Math.abs(kLine3.open - kLine3.close) / 2;
    if (Math.min(k1Center, k2Center, k3Center) >= ma) {
        res = true;
    }
    console.log("🚀 ~ file: 是否在50均线之上 ~ res:", res);
    return res;
};
// macd 指标向上
const isUpMacd = (macdArr) => {
    const macd2 = macdArr[macdArr.length - 2].macd;
    const macd3 = macdArr[macdArr.length - 1].macd;
    const macd1 = macdArr[macdArr.length - 3].macd;
    let res = false;
    if (macd3 == 0) {
        res = macd1 < 0 && macd2 < 0;
    } else {
        res = macd3 - macd2 > 0;
    }
    console.log("🚀 ~ file: macd 指标向上:", res, macd2, macd3);
    return res;
};
// macd 指标向下
const isDownMacd = (macdArr) => {
    const macd2 = macdArr[macdArr.length - 2].macd;
    const macd3 = macdArr[macdArr.length - 1].macd;
    let res = false;
    if (macd3 == 0) {
        res = macd1 > 0 && macd2 > 0;
    } else {
        res = macd3 - macd2 < 0;
    }
    console.log("🚀 ~ file: macd 指标向下:", res, macd2, macd3);
    return res;
};

// 长下引线
function isAllDownTail(kLine1, kLine2, kLine3) {
    let num = 0;
    if (
        !isCross(kLine1) &&
        (Math.min(kLine1.open, kLine1.close) - kLine1.low) / Math.abs(kLine1.open - kLine1.close) > 0.5
    ) {
        console.log("🚀 ~ k3长上引线 ~ 不能开单");
        return true;
    }
    if (
        !isCross(kLine1) &&
        (Math.min(kLine1.open, kLine1.close) - kLine1.low) / Math.abs(kLine1.open - kLine1.close) > 0.6
    ) {
        num++;
    }
    if (
        !isCross(kLine2) &&
        (Math.min(kLine2.open, kLine2.close) - kLine2.low) / Math.abs(kLine2.open - kLine2.close) > 0.6
    ) {
        num++;
    }
    if (
        !isCross(kLine3) &&
        (Math.min(kLine3.open, kLine3.close) - kLine3.low) / Math.abs(kLine3.open - kLine3.close) > 0.6
    ) {
        num++;
    }
    console.log("🚀 ~ k1 k2 k3长下引线 ~ res:", num >= 2);
    return num >= 2;
}
// 长上引线
function isAllUpTail(kLine1, kLine2, kLine3) {
    let num = 0;
    if (
        !isCross(kLine3) &&
        (kLine3.high - Math.max(kLine3.open, kLine3.close)) / Math.abs(kLine3.open - kLine3.close) > 0.5
    ) {
        console.log("🚀 ~ k3长上引线 ~ 不能开单");
        return true;
    }
    if (
        !isCross(kLine3) &&
        (kLine3.high - Math.max(kLine3.open, kLine3.close)) / Math.abs(kLine3.open - kLine3.close) > 0.6
    ) {
        num++;
    }
    if (
        !isCross(kLine1) &&
        (kLine1.high - Math.max(kLine1.open, kLine1.close)) / Math.abs(kLine1.open - kLine1.close) > 0.6
    ) {
        num++;
    }
    if (
        !isCross(kLine2) &&
        (kLine2.high - Math.max(kLine2.open, kLine2.close)) / Math.abs(kLine2.open - kLine2.close) > 0.6
    ) {
        num++;
    }
    console.log("🚀 ~ k1 k2 k3长上引线 ~ res:", num >= 2);
    return num >= 2;
}
module.exports = {
    calculateCandleHeight,
    isBigLine,
    isBigAndYang,
    isBigAndYin,
    isBreakPreHigh,
    isBreakPreLow,
    isCross,
    isUpCross,
    isDownCross,
    isTopFractal,
    isBottomFractal,
    isDownLinesGroup2,
    isUpLinesGroup2,
    isDownLinesGroup3,
    isUpLinesGroup3,
    isDownSwallow,
    isUpSwallow,
    isBreakDown,
    isBreakUp,
    isDownStar,
    isUpStar,
    isHigherHigh,
    isLowerLow,
    isK1Swallow,
    isFourUp,
    isFourDown,
    downPao,
    upPao,
    isDownMa,
    isUpMa,
    isUpMacd,
    isDownMacd,
    isAllDownTail,
    isAllUpTail,
};
