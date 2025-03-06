function convertToHeikinAshiArr(kLineData) {
    let haKlineData = [];
    let previousHaOpen = kLineData[0].open; // 初始 HA 开盘价
    let previousHaClose = kLineData[0].close; // 初始 HA 收盘价

    for (let i = 0; i < kLineData.length; i++) {
        let {openTime, closeTime, open, high, low, close, volume} = kLineData[i];

        // 计算 HA 收盘价
        let haClose = (open + high + low + close) / 4;

        // 计算 HA 开盘价
        let haOpen = (previousHaOpen + previousHaClose) / 2;

        // 计算 HA 最高价 & 最低价
        let haHigh = Math.max(high, haOpen, haClose);
        let haLow = Math.min(low, haOpen, haClose);

        // 存入 HA K 线数组
        haKlineData.push({
            openTime,
            open: haOpen,
            high: haHigh,
            low: haLow,
            close: haClose,
            volume,
            closeTime,
        });

        // 更新上一根 HA 开盘 & 收盘价
        previousHaOpen = haOpen;
        previousHaClose = haClose;
    }

    return haKlineData;
}
function convertToHeikinAshi(kLine, previousHaOpen, previousHaClose) {
    let {openTime, closeTime, open, high, low, close, volume} = kLine;

    // 计算 HA 收盘价
    let haClose = (open + high + low + close) / 4;

    // 计算 HA 开盘价
    let haOpen = (previousHaOpen + previousHaClose) / 2;

    // 计算 HA 最高价 & 最低价
    let haHigh = Math.max(high, haOpen, haClose);
    let haLow = Math.min(low, haOpen, haClose);

    // 上一根 HA 开盘 & 收盘价
    // previousHaOpen=haOpen;
    // previousHaClose=haClose;

    return {
        openTime,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        volume,
        closeTime,
    };
}

module.exports = {
    convertToHeikinAshiArr,
    convertToHeikinAshi,
};
