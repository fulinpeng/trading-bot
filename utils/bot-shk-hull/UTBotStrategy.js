/**
 * UT Bot Alerts
 * @param {Array} candles - K线数据数组，每个元素是一个对象，格式为 { open, high, low, close, volume }
 * @param {Object} params - 指标参数，格式为 { keyValue, atrPeriod, heikinAshi }
 * @returns {Array} - 包含每根K线对应的计算结果数组，每个元素为 { buy, sell, atrTrailingStop, position }
 */
const defaultParams = {keyValue: 1, atrPeriod: 10, heikinAshi: false};
function calculateUTBot(candles, params) {
    const {keyValue = 1, atrPeriod = 10, heikinAshi = false} = {...defaultParams, ...params};

    // 工具函数：计算移动平均
    const calculateEMA = (data, length) => {
        if (data.length < length) return null;
        const alpha = 2 / (length + 1);
        let ema = data[0];
        for (let i = 1; i < data.length; i++) {
            ema = alpha * data[i] + (1 - alpha) * ema;
        }
        return ema;
    };

    // 工具函数：计算ATR
    const calculateATR = (candles, period) => {
        const atr = [];
        for (let i = 0; i < candles.length; i++) {
            if (i === 0) {
                atr.push(0); // ATR的第一个值初始化为0
                continue;
            }
            const tr = Math.max(
                candles[i].high - candles[i].low,
                Math.abs(candles[i].high - candles[i - 1].close),
                Math.abs(candles[i].low - candles[i - 1].close)
            );
            if (i < period) {
                atr.push(null); // 在数据不足ATR周期时，无法计算
            } else {
                const prevATR = atr[i - 1] || tr; // 使用之前的ATR值
                atr.push((prevATR * (period - 1) + tr) / period);
            }
        }
        return atr;
    };

    // 工具函数：生成Heikin Ashi蜡烛数据
    const calculateHeikinAshi = (candles) => {
        const haCandles = [];
        for (let i = 0; i < candles.length; i++) {
            const current = candles[i];
            const prev = haCandles[i - 1] || {
                close: current.close,
                open: current.open,
            };
            const haClose = (current.open + current.high + current.low + current.close) / 4;
            const haOpen = (prev.open + prev.close) / 2;
            const haHigh = Math.max(current.high, haOpen, haClose);
            const haLow = Math.min(current.low, haOpen, haClose);
            haCandles.push({
                open: haOpen,
                high: haHigh,
                low: haLow,
                close: haClose,
            });
        }
        return haCandles;
    };

    // 如果启用Heikin Ashi，转换K线数据
    const processedCandles = heikinAshi ? calculateHeikinAshi(candles) : candles;

    // 计算ATR
    const atr = calculateATR(processedCandles, atrPeriod);

    // 初始化返回结果数组
    const results = [];
    let atrTrailingStop = 0.0;
    let position = 0;

    // 遍历每根K线，计算指标
    for (let i = 0; i < processedCandles.length; i++) {
        const currentCandle = processedCandles[i];
        const prevClose = i > 0 ? processedCandles[i - 1].close : null;
        const prevTrailingStop = i > 0 ? atrTrailingStop : 0.0;

        // 计算 nLoss
        const nLoss = keyValue * (atr[i] || 0);

        // 计算 ATR Trailing Stop
        if (prevClose !== null) {
            if (currentCandle.close > prevTrailingStop && prevClose > prevTrailingStop) {
                atrTrailingStop = Math.max(prevTrailingStop, currentCandle.close - nLoss);
            } else if (currentCandle.close < prevTrailingStop && prevClose < prevTrailingStop) {
                atrTrailingStop = Math.min(prevTrailingStop, currentCandle.close + nLoss);
            } else if (currentCandle.close > prevTrailingStop) {
                atrTrailingStop = currentCandle.close - nLoss;
            } else {
                atrTrailingStop = currentCandle.close + nLoss;
            }
        } else {
            atrTrailingStop = currentCandle.close + nLoss; // 初始化Trailing Stop
        }

        // 计算持仓状态 (1表示买入，-1表示卖出)
        if (prevClose !== null) {
            if (prevClose < prevTrailingStop && currentCandle.close > prevTrailingStop) {
                position = 1; // 买入信号
            } else if (prevClose > prevTrailingStop && currentCandle.close < prevTrailingStop) {
                position = -1; // 卖出信号
            } else {
                position = position; // 保持不变
            }
        }

        // 计算EMA
        const emaValue = calculateEMA(
            processedCandles.slice(0, i + 1).map((c) => c.close),
            1
        );

        // 生成买入/卖出信号
        const buySignal = currentCandle.close > atrTrailingStop && emaValue > atrTrailingStop;
        const sellSignal = currentCandle.close < atrTrailingStop && emaValue < atrTrailingStop;

        // 将结果添加到数组
        results.push({
            buy: buySignal,
            sell: sellSignal,
            atrTrailingStop,
            position,
        });
    }

    return results;
}

//   // 示例用法
//   const candles = [
// 	{ open: 100, high: 105, low: 95, close: 102, volume: 1000 },
// 	{ open: 102, high: 107, low: 101, close: 106, volume: 1200 },
// 	{ open: 106, high: 110, low: 105, close: 109, volume: 1100 },
// 	// 更多K线数据...
//   ];

//   const params = { keyValue: 1, atrPeriod: 10, heikinAshi: false };
//   const results = calculateUTBot(candles, params);
//   console.log(results);

module.exports = {
    calculateUTBot,
};
