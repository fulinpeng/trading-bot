// 砖型图数据转换函数
function convertToRenko(params) {
    let {klineData, brickSize, lastRenkoClose} = params;
    let renkoData = [];
    // 解析 K 线数据
    const {
        openTime, // 当前K线的起始时间
        closeTime, // 当前K线的结束时间
        open, // 开盘价
        close, // 收盘价
        high, // 最高价
        low, // 最低价
        volume, // 成交量
    } = klineData;

    // 如果当前的价格波动已经达到砖型图的大小
    if (lastRenkoClose === null) {
        // 如果没有上一个砖型图，初始化第一个砖型图
        lastRenkoClose = close;
        renkoData.push({open, close, high, low, volume, time: openTime});
    } else {
        // 计算当前价格波动与上一根砖型图的收盘价的差距
        let priceDifference = close - lastRenkoClose;

        // 如果价格差距超过了砖型图的价格区间，生成新的砖型图
        if (Math.abs(priceDifference) >= brickSize) {
            let numOfBricks = Math.floor(Math.abs(priceDifference) / brickSize);
            let direction = priceDifference > 0 ? 1 : -1;

            for (let i = 0; i < numOfBricks; i++) {
                // 计算新砖型图的开盘和收盘价
                let newClose = lastRenkoClose + direction * brickSize;

                // 将新的砖型图保存到 renkoData 中
                renkoData.push({
                    open: lastRenkoClose,
                    close: newClose,
                    high: Math.max(lastRenkoClose, newClose, high),
                    low: Math.min(lastRenkoClose, newClose, low),
                    volume: volume / numOfBricks, // 这里可以进一步计算砖型图的成交量
                    openTime, // 这里是起始时间，通常是上一根 K 线的结束时间 ????
                    closeTime, // ????
                });

                // 更新上一个砖型图的收盘价
                lastRenkoClose = newClose;
            }
        }
    }

    return {renkoData, newLastRenkoClose: lastRenkoClose};
}
module.exports = {
    convertToRenko,
};
