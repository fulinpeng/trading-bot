// 砖型图数据转换函数
function convertToRenko(params) {
    let { klineData, brickSize, preRenkoData, lastRenkoClose, lastRenkoTrend } = params;
    let renkoData = [];
    let updatePre = false;
    // 解析 K 线数据
    let {
        openTime, // 当前K线的起始时间
        closeTime, // 当前K线的结束时间
        open, // 开盘价
        close, // 收盘价
        high, // 最高价
        low, // 最低价
        volume, // 成交量
        isNewLine,
    } = klineData;

    let preCloseTime = preRenkoData ? preRenkoData.closeTime : openTime;

    // 如果当前的价格波动已经达到砖型图的大小
    if (lastRenkoClose === null) {
        // 如果没有上一个砖型图，初始化第一个砖型图
        lastRenkoClose = close;
        renkoData.push({ open, close, high, low, volume, openTime, closeTime });
    } else {
        // 计算当前价格波动与上一根砖型图的收盘价的差距
        let priceDifference = close - lastRenkoClose;

        let trendType = '' // TrendReverse or TrendContinue
        if ((lastRenkoTrend === 'up' && priceDifference > brickSize) || (lastRenkoTrend === 'down' && priceDifference > brickSize)) {
            trendType = 'TrendContinue'
        } else {
            trendType = 'TrendReverse'
        }
        // 如果价格差距超过了砖型图的价格区间，生成多个新的砖型图
        if (trendType === 'TrendContinue') {
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
                        openTime: preCloseTime, // 这里是起始时间，通常是上一根 K 线的结束时间
                        closeTime,
                    });
    
                    // 更新上一个砖型图的收盘价
                    lastRenkoClose = newClose;
                }
            }
            // 如果价格差距没有超过砖型图的价格区间，将当前 K 线的数据保存到上一个砖型图中
            else {
                if (preRenkoData) {
                    // 更新 volume high low closeTime
                    preRenkoData = {
                        ...preRenkoData,
                        high: Math.max(preRenkoData.high, high),
                        low: Math.min(preRenkoData.low, low),
                        volume: preRenkoData.volume + volume,
                        closeTime,// 更新为当前k线的收盘价
                    };
                    updatePre = true;
                }
            }
        }
        if (trendType === 'TrendReverse') {
            if (Math.abs(priceDifference) >= brickSize * 2) {
                let numOfBricks = Math.floor(Math.abs(priceDifference) / brickSize) - 1;
                let direction = priceDifference > 0 ? 1 : -1;
                lastRenkoClose = lastRenkoClose + direction * brickSize;
    
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
                        openTime: preCloseTime, // 这里是起始时间，通常是上一根 K 线的结束时间
                        closeTime,
                    });
    
                    // 更新上一个砖型图的收盘价
                    lastRenkoClose = newClose;
                }
            }
            // 如果价格差距没有超过砖型图的价格区间，将当前 K 线的数据保存到上一个砖型图中
            else {
                if (preRenkoData) {
                    // 更新 volume high low closeTime
                    preRenkoData = {
                        ...preRenkoData,
                        high: Math.max(preRenkoData.high, high),
                        low: Math.min(preRenkoData.low, low),
                        volume: preRenkoData.volume + volume,
                        closeTime,// 更新为当前k线的收盘价
                    };
                    updatePre = true;
                }
            }
        }
    }

    return { renkoData, newLastRenkoClose: lastRenkoClose, updatePre };
}

function getSmaRatio(arr) {
    return (arr[arr.length - 1] - arr[0]) / arr[0];
}

module.exports = {
    convertToRenko,
    getSmaRatio,
};
