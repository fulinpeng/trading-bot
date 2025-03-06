// 半趋势指标 HalfTrend
// 该函数根据提供的 K 线数据和参数，计算最新一根 K 线对应的半趋势指标值。

/**
 * @param {Array} kLines - K线数据数组
 * @param {Object} params - 指标参数，包含以下字段：
 *   amplitude: 振幅 (number)，对应 PineScript 中的 amplitude 参数
 *   channelDeviation: 通道偏差 (number)，对应 PineScript 中的 channelDeviation 参数
 * @returns {Object} - 返回最新一根 K 线的指标值：
 *   {
 *     trend: 趋势方向 (0: 上升, 1: 下降),
 *     ht: 半趋势值,
 *     atrHigh: ATR 高值,
 *     atrLow: ATR 低值
 *   }
 */
function calculateHalfTrend(kLines, amplitude, channelDeviation, preData) {
    const {
        trend: preTrend,
        nextTrend: preNextTrend,
        up: preUp,
        down: preDown,
        maxLowPrice: preMaxLowPrice,
        minHighPrice: preMinHighPrice,
    } = preData || {};
    const len = kLines.length;

    // 检查输入数据是否合法
    if (!kLines || len < amplitude) {
        throw new Error("K线数据不足，无法计算指标");
    }

    // 初始化变量
    let trend = preTrend === undefined ? 0 : preTrend; // 当前趋势 (0: 上升, 1: 下降)
    let nextTrend = preNextTrend === undefined ? 0 : preNextTrend; // 下一趋势
    let maxLowPrice = preMaxLowPrice === undefined ? kLines[len - 1].low : preMaxLowPrice; // 最高低点
    let minHighPrice = preMinHighPrice === undefined ? kLines[len - 1].high : preMinHighPrice; // 最低高点
    let up = 0.0; // 上升趋势的参考值
    let down = 0.0; // 下降趋势的参考值
    let atrHigh = 0.0; // ATR 高值
    let atrLow = 0.0; // ATR 低值
    let arrowUp = null; // 买入信号箭头位置
    let arrowDown = null; // 卖出信号箭头位置

    // 计算 ATR (简单实现，使用固定周期 100)
    const atr = (period) => {
        if (len < period) return 0;
        let _kLines = kLines.slice(-period);
        let sum = 0;
        for (let i = 0; i <= period - 1; i++) {
            const high = _kLines[i].high;
            const low = _kLines[i].low;
            sum += high - low;
        }
        return sum / period;
    };

    const atr2 = atr(100) / 2; // ATR 除以 2
    const dev = channelDeviation * atr2; // 通道偏差

    // 计算最高价和最低价的均值
    const highPrice = kLines
        .slice(-amplitude)
        .reduce((max, item) => Math.max(max, item.high), -Infinity);
    const lowPrice = kLines
        .slice(-amplitude)
        .reduce((min, item) => Math.min(min, item.low), Infinity);

    // 计算 SMA (简单移动平均线)
    const sma = (data, period) => {
        if (data.length < period) return 0;
        const sum = data.slice(-period).reduce((a, b) => a + b, 0);
        return sum / period;
    };

    const highma = sma(
        kLines.slice(-amplitude).map((item) => item.high),
        amplitude
    );
    const lowma = sma(
        kLines.slice(-amplitude).map((item) => item.low),
        amplitude
    );

    // 处理趋势切换逻辑
    const close = kLines[len - 1].close; // 最新一根K线的收盘价
    if (nextTrend === 1) {
        maxLowPrice = Math.max(lowPrice, maxLowPrice);

        if (highma < maxLowPrice && close < kLines[len - 2].low) {
            trend = 1;
            nextTrend = 0;
            minHighPrice = highPrice;
        }
    } else {
        minHighPrice = Math.min(highPrice, minHighPrice);

        if (lowma > minHighPrice && close > kLines[len - 2].high) {
            trend = 0;
            nextTrend = 1;
            maxLowPrice = lowPrice;
        }
    }

    // 根据当前趋势计算 ATR 高低值
    if (trend === 0) {
        // 当前趋势为上涨
        if (preTrend !== undefined && preTrend !== 0) {
            // 如果前一个趋势存在且不是上涨
            up = preDown === undefined ? down : preDown;
            arrowUp = up - atr2; // 设置买入信号箭头位置
        } else {
            // 如果前一个趋势为上涨
            up = preUp === undefined ? maxLowPrice : Math.max(maxLowPrice, preUp);
        }
        atrHigh = up + dev; // 计算ATR通道上界
        atrLow = up - dev; // 计算ATR通道下界
    } else {
        // 当前趋势为下跌
        if (preTrend !== undefined && preTrend !== 1) {
            // 如果前一个趋势存在且不是下跌
            down = preUp === undefined ? up : preUp;
            arrowDown = down + atr2; // 设置卖出信号箭头位置
        } else {
            // 如果前一个趋势为下跌
            down = preDown === undefined ? minHighPrice : Math.min(minHighPrice, preDown);
        }
        atrHigh = down + dev; // 计算ATR通道上界
        atrLow = down - dev; // 计算ATR通道下界
    }
    // 计算半趋势值
    const ht = trend === 0 ? up : down;

    // 返回结果
    return {
        trend, // 当前趋势 (0: 上升, 1: 下降)
        nextTrend,
        maxLowPrice,
        minHighPrice,
        up,
        down,
        arrowUp,
        arrowDown,
        ht, // 半趋势值
        atrHigh, // ATR 高值
        atrLow, // ATR 低值
    };
}

module.exports = {
    calculateHalfTrend,
};
