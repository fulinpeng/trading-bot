const talib = require("talib");

// 示例用的是 talib 库，你可以使用任何其他适合你的技术分析库

// 获取价格数据，这里用随机数据代替
const prices = Array.from({ length: 100 }, () => Math.random() * 100);

// 1. SMA（Simple Moving Average，简单移动平均）
const sma = talib.execute({
    name: "SMA",
    startIdx: 0,
    endIdx: prices.length - 1,
    inReal: prices,
    optInTimePeriod: 14, // 时间周期，可根据需求调整
});

console.log("SMA:", sma.result.outReal);

// 2. MACD（Moving Average Convergence Divergence，移动平均线收敛背离）
const macd = talib.execute({
    name: "MACD",
    startIdx: 0,
    endIdx: prices.length - 1,
    inReal: prices,
    optInFastPeriod: 12,
    optInSlowPeriod: 26,
    optInSignalPeriod: 9,
});

console.log("MACD:", macd.result);

// 3. RSI（Relative Strength Index，相对强弱指标）
const rsi = talib.execute({
    name: "RSI",
    startIdx: 0,
    endIdx: prices.length - 1,
    inReal: prices,
    optInTimePeriod: 14,
});

console.log("RSI:", rsi.result.outReal);

/*
SMA（Simple Moving Average）简单移动平均：

SMA是通过计算一定时间范围内的价格平均值来平滑价格曲线。
例如，14日SMA是最近14个收盘价的平均值。
SMA可以帮助观察价格趋势，对价格的短期波动不太敏感。
MACD（Moving Average Convergence Divergence）移动平均线收敛背离：

MACD包含两个线：DIF（快线）和DEA（慢线）。MACD柱状图是两者的差值。
交叉和柱状图的变化可用于判断价格趋势的变化。
DIF上穿DEA和柱状图由负变正，可能是买入信号。
RSI（Relative Strength Index）相对强弱指标：

RSI度量价格变化的速度和幅度。
RSI值在0到100之间，超过70被认为是超买，低于30被认为是超卖。
RSI可用于判断市场是过度买入还是过度卖出。
在实际应用中，这些指标通常结合使用。例如，当短期SMA上穿长期SMA，MACD的快线上穿慢线，并且RSI处于相对低水平时，这可能是一个潜在的买入信号。相反的条件可能表示卖出信号。

关于EMA斜率，它可以用来判断趋势的强度和变化。如果EMA斜率向上，表示趋势可能是上升的；如果向下，表示趋势可能是下降的。你可以通过计算EMA的变化率（斜率）来实现。
*/
