function calculateATRRatio(klineData, length = 1, smoothing = "RMA") {
    function maFunction(data, length, type) {
        if (data.length < length) return null;
        switch (type) {
            case "RMA":
                return rma(data, length);
            case "SMA":
                return sma(data, length);
            case "EMA":
                return ema(data, length);
            case "WMA":
                return wma(data, length);
            default:
                return wma(data, length);
        }
    }

    function tr(kline) {
        return Math.max(
            kline.high - kline.low,
            Math.abs(kline.high - kline.prevClose),
            Math.abs(kline.low - kline.prevClose)
        );
    }

    function rma(values, length) {
        let alpha = 1 / length;
        return values.reduce((acc, val, i) => (i === 0 ? val : alpha * val + (1 - alpha) * acc), 0);
    }

    function sma(values, length) {
        if (values.length < length) return null;
        return values.slice(-length).reduce((sum, val) => sum + val, 0) / length;
    }

    function ema(values, length) {
        let alpha = 2 / (length + 1);
        return values.reduce((acc, val, i) => (i === 0 ? val : alpha * val + (1 - alpha) * acc), 0);
    }

    function wma(values, length) {
        if (values.length < length) return null;
        let weightedSum = 0;
        let weightTotal = 0;
        for (let i = 0; i < length; i++) {
            weightedSum += values[i] * (length - i);
            weightTotal += length - i;
        }
        return weightedSum / weightTotal;
    }

    let atrrValues = klineData.map((k, index) => {
        if (index === 0) k.prevClose = k.close;
        else k.prevClose = klineData[index - 1].close;
        return tr(k) / k.close;
    });

    let aatrr = sma(atrrValues, 100);
    return aatrr;
}

module.exports = {calculateATRRatio};
