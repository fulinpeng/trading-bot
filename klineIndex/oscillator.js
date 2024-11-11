// 随机震荡指标 (%K and %D)
function calculateCurrentStochasticOscillator(data, period = 14, dPeriod = 3) {
    if (data.length < period) {
        throw new Error("数据长度不足以计算指定周期的随机震荡指标");
    }

    // 获取最近一个周期的数据
    let currentSlice = data.slice(-period);
    let high = Math.max(...currentSlice.map((candle) => parseFloat(candle.high)));
    let low = Math.min(...currentSlice.map((candle) => parseFloat(candle.low)));
    let close = parseFloat(currentSlice[currentSlice.length - 1].close);
    let k = ((close - low) / (high - low)) * 100;

    // 计算%K的均值作为%D
    let kValues = [];
    for (let i = 0; i < dPeriod; i++) {
        let slice = data.slice(-(period + i), data.length - i);
        high = Math.max(...slice.map((candle) => parseFloat(candle.high)));
        low = Math.min(...slice.map((candle) => parseFloat(candle.low)));
        close = parseFloat(slice[slice.length - 1].close);
        kValues.push(((close - low) / (high - low)) * 100);
    }
    let d = kValues.reduce((acc, val) => acc + val, 0) / dPeriod;

    return { k, d };
}

function calculateStochasticOscillators(data, period = 14, dPeriod = 3) {
    let stochasticValues = [];

    for (let i = 0; i <= data.length - period; i++) {
        let currentSlice = data.slice(i, i + period);
        let high = Math.max(...currentSlice.map((candle) => parseFloat(candle.high)));
        let low = Math.min(...currentSlice.map((candle) => parseFloat(candle.low)));
        let close = parseFloat(currentSlice[currentSlice.length - 1].close);
        let k = ((close - low) / (high - low)) * 100;
        stochasticValues.push(k);
    }

    let dValues = [];
    for (let i = dPeriod - 1; i < stochasticValues.length; i++) {
        let slice = stochasticValues.slice(i - dPeriod + 1, i + 1);
        let d = slice.reduce((acc, val) => acc + val, 0) / dPeriod;
        dValues.push(d);
    }

    return {
        kValues: stochasticValues.slice(dPeriod - 1),
        dValues: dValues,
    };
}
// 通道指数 Function to calculate Commodity Channel Index (CCI)
function calculateCurrentCCI(data, period = 20) {
    if (data.length < period) {
        throw new Error("数据长度不足以计算指定周期的商品通道指数");
    }

    // 获取最近一个周期的数据
    let currentSlice = data.slice(-period);
    let typicalPrices = currentSlice.map(
        (candle) => (parseFloat(candle.high) + parseFloat(candle.low) + parseFloat(candle.close)) / 3,
    );
    let sma = typicalPrices.reduce((acc, val) => acc + val, 0) / period;
    let meanDeviation = typicalPrices.reduce((acc, val) => acc + Math.abs(val - sma), 0) / period;
    let cci = (typicalPrices[typicalPrices.length - 1] - sma) / (0.015 * meanDeviation);

    return cci;
}
function calculateCCIs(data, period = 20) {
    let cciValues = [];

    for (let i = period - 1; i < data.length; i++) {
        let currentSlice = data.slice(i - period + 1, i + 1);
        let typicalPrices = currentSlice.map(
            (candle) => (parseFloat(candle.high) + parseFloat(candle.low) + parseFloat(candle.close)) / 3,
        );
        let sma = typicalPrices.reduce((acc, val) => acc + val, 0) / period;
        let meanDeviation = typicalPrices.reduce((acc, val) => acc + Math.abs(val - sma), 0) / period;
        let cci = (typicalPrices[typicalPrices.length - 1] - sma) / (0.015 * meanDeviation);
        cciValues.push(cci);
    }

    return cciValues;
}



/**
结合使用 Stochastic 和 CCI
通过结合使用 Stochastic 和 CCI 指标，可以更准确地判断价格走势。以下是一些方法：

双重确认：

当 Stochastic 和 CCI 同时发出超买或超卖信号时，交易者可以更有信心地进行交易。例如，当 %K 和 %D 高于 80 且 CCI 高于 +100 时，可能表示强烈的超买信号，适合卖出。
趋势确认与反转信号：

当一个指标发出反转信号而另一个指标确认趋势时，交易者可以更好地捕捉市场的反转点。例如，当 Stochastic 发出买入信号（%K 向上穿过 %D）且 CCI 从负值区域上升并突破 0 时，可能表示价格的上涨趋势开始。
避免假信号：

使用两个指标可以帮助过滤掉假信号。例如，当 Stochastic 发出卖出信号（%K 向下穿过 %D）但 CCI 仍处于正值区域时，交易者可以选择等待更强烈的确认信号。
*/
module.exports = {
    calculateCurrentStochasticOscillator,
    calculateStochasticOscillators,
    calculateCurrentCCI,
    calculateCCIs,
};
