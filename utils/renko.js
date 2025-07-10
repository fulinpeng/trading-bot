// 砖型图数据转换函数
// 该砖型图，close为最新值，open方向可能存在长长的尾巴，就像彗星一样
function convertToRenko(params) {
    // preVolume 是1分钟线的volume，不是preRenkoData的volume
    // preRenkoClose 是上一根砖型图的收盘价，不一定是preRenkoData.close， preRenkoData可能只是引线部分
    let { klineData, brickSize, preRenkoClose, preRenkoData, preDirection, preVolume } = params;
    let renkoData = [];
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

    let deltaVolume;
    if (!preVolume) {
        preVolume = 0;
    }

    // 处理 volume 增量
    deltaVolume = Math.max(0, volume - preVolume);

    let preCloseTime = preRenkoData ? (preRenkoData.isNewLine ? preRenkoData.closeTime : preRenkoData.openTime) : openTime;

    if (!preRenkoClose) {
        preRenkoClose = close > open ? Math.floor(close / brickSize) * brickSize : Math.ceil(close / brickSize) * brickSize;
    }

    // 上一根砖型图的方向 1为上涨，-1为下跌
    if (!preDirection) {
        preDirection = preRenkoData ? (preRenkoData.close > preRenkoData.open ? 1 : -1) : (close >= preRenkoClose ? 1 : -1);
    }

    // 如果没有上一个砖型图，初始化第一个砖型图
    if (!preRenkoData) {
        let value = preDirection == 1 ? (low < preRenkoClose ? low : preRenkoClose) : (high > preRenkoClose ? high : preRenkoClose);
        preRenkoData = {
            high: value,
            low: value,
            open: value,
            close: value,
            volume: 0,
            openTime: preCloseTime,
            closeTime: close,
            isNewLine: false,
        }
        deltaVolume = 0;
    }

    // 计算当前价格波动与上一根砖型图的收盘价的差距
    let priceDifference = close - preRenkoClose;
    let isNewRenkoLine = false;

    let direction;
    if (preDirection === 1) {
        if (Math.abs(priceDifference) >= brickSize) {
            if (priceDifference > 0) {
                direction = 1;
                isNewRenkoLine = true;
            } else if (priceDifference < 0) {
                direction = -1;
                isNewRenkoLine = true;
            }
        } else {
            // direction = priceDifference > 0 ? 1 : -1;
        }
    }
    if (preDirection === -1) {
        if (Math.abs(priceDifference) >= brickSize) {
            if (priceDifference < 0) {
                direction = -1;
                isNewRenkoLine = true;
            } else if (priceDifference > 0) {
                direction = 1;
                isNewRenkoLine = true;
            }
        } else {
            // direction = priceDifference > 0 ? 1 : -1;
        }
    }

    // 产生了新的砖块
    if (isNewRenkoLine) {
        // 同向处理
        let numOfBricks = Math.floor(Math.abs(priceDifference) / brickSize);
        if (numOfBricks < 1) {
            numOfBricks = 1;
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@, numOfBricks 怎么可能小于1');
        }
        let deltaPrice = Math.abs(close - preRenkoData.close);
        // if (numOfBricks >=20) throw new Error('numOfBricks >=3');
        let volumePiece = deltaVolume / (deltaPrice / close < 0.0001 ? 1 : deltaPrice); // 按照单位价格来严格计算volume

        for (let i = 0; i < numOfBricks; i++) {
            // 计算新砖型图的开盘和收盘价
            let newClose = preRenkoClose + direction * brickSize;

            let newHigh;
            let newLow;
            let _volume;

            if (i === 0) {
                // i === 0 时，开盘那一头有引线
                newHigh = Math.max(newClose, preRenkoData.high);
                newLow = Math.min(newClose, preRenkoData.low);
                // preRenkoData.volume要么是之前累计的值，要么是0
                _volume = preRenkoData.volume + volumePiece * Math.abs(newClose - preRenkoData.close);
            } else {
                newHigh = Math.max(newClose, preRenkoClose);
                newLow = Math.min(newClose, preRenkoClose);
                // 当前砖块价格区间累计的值
                _volume = volumePiece * Math.abs(newClose - preRenkoData.close);
            }

            // 更新 砖型图/收盘价
            preRenkoData = {
                open: preRenkoClose,
                close: newClose,
                high: newHigh,
                low: newLow,
                volume: _volume,
                openTime: preCloseTime + (i > 0 ? i : ''), // 这里是起始时间，通常是上一根 K 线的结束时间
                closeTime,
                isNewLine: true,
            };
            preRenkoClose = newClose;
            preCloseTime = closeTime;

            // 将新的砖型图保存到 renkoData 中
            renkoData.push(preRenkoData);
        }
        // 初始化下一砖块的high/low
        let deltaPrice2 = Math.abs(close - preRenkoData.close)
        preRenkoData = {
            open: preRenkoClose,
            close: preRenkoClose,
            high: Math.max(preRenkoClose, close),
            low: Math.min(preRenkoClose, close),
            openTime: preRenkoData.closeTime,
            closeTime,
            volume: volumePiece * (deltaPrice2 / close < 0.0001 ? 1 : deltaPrice2),
            isNewLine: false,
        }
        preDirection = direction;
    }
    // 没有产生新的砖块
    else {
        // preRenkoData来自于for循环后的初始化，更新 volume closeTime low high
        preRenkoData = {
            ...preRenkoData,
            close,
            high: Math.max(preRenkoData.high, close),
            low: Math.min(preRenkoData.low, close),
            closeTime,
            volume: preRenkoData.volume + deltaVolume,
        };
    }

    if (isNewLine) {
        preVolume = 0;
    } else {
        preVolume = volume;
    }

    return {
        renkoData,
        newRenkoClose: preRenkoClose,
        newRenkoData: preRenkoData,
        newDirection: preDirection,
        newnewVolume: preVolume,
    };
}

function getSmaRatio(arr) {
    return (arr[arr.length - 1] - arr[0]) / arr[0];
}

module.exports = {
    convertToRenko,
    getSmaRatio,
};
