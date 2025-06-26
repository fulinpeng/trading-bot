// 砖型图数据转换函数
// 该砖型图，close为最新值，open方向可能存在长长的尾巴，就像彗星一样
function convertToRenko(params) {
    let { klineData, brickSize, preRenkoClose, preRenkoData, preDirection } = params;
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

    let preCloseTime = preRenkoData ? preRenkoData.closeTime || openTime : openTime;

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
        }
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
                if (Math.abs(priceDifference) >= 2 * brickSize) {
                    direction = -1;
                    isNewRenkoLine = true;
                } else {
                    // direction = 1;
                }
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
                if (Math.abs(priceDifference) >= 2 * brickSize) {
                    direction = 1;
                    isNewRenkoLine = true;
                } else {
                    // direction = -1;
                }
            }
        } else {
            // direction = priceDifference > 0 ? 1 : -1;
        }
    }

    // 产生了新的砖块
    if (isNewRenkoLine) {
        // 同向处理
        if (direction === preDirection) {
            let numOfBricks = Math.floor(Math.abs(priceDifference) / brickSize);
            if (numOfBricks < 1) numOfBricks = 1;
    
            for (let i = 0; i < numOfBricks; i++) {
                // 计算新砖型图的开盘和收盘价
                let newClose = preRenkoClose + direction * brickSize;
    
                let newHigh;
                let newLow;
    
                if (i === 0) {
                    // i === 0 时，开盘那一头有引线
                    newHigh = Math.max(newClose, preRenkoData.high);
                    newLow = Math.min(newClose, preRenkoData.low);
                } else {
                    newHigh = Math.max(newClose, preRenkoClose);
                    newLow = Math.min(newClose, preRenkoClose);
                }
    
                // 更新 砖型图/收盘价
                preRenkoData = {
                    open: preRenkoClose,
                    close: newClose,
                    high: newHigh,
                    low: newLow,
                    volume: volume / numOfBricks, // 这里可以进一步计算砖型图的成交量
                    openTime: preCloseTime, // 这里是起始时间，通常是上一根 K 线的结束时间
                    closeTime,
                };
                preRenkoClose = newClose;
                preCloseTime = closeTime;
    
                // 将新的砖型图保存到 renkoData 中
                renkoData.push(preRenkoData);
            }
            // 初始化下一砖块的high/low
            preRenkoData = {
                high: Math.max(preRenkoClose, close),
                low: Math.min(preRenkoClose, close),
                openTime: preCloseTime,
                closeTime,
            }
        }
        // 反向处理
        else {
            if (Math.abs(priceDifference) >= brickSize * 2) {
                let numOfBricks = Math.floor(Math.abs(priceDifference) / brickSize);
                if (numOfBricks < 2) numOfBricks = 2;

                for (let i = 0; i < numOfBricks; i++) {
                    // 计算新砖型图的开盘和收盘价
                    let newClose = preRenkoClose + direction * brickSize;
                    let newHigh;
                    let newLow;
                    let newOpen;
        
                    if (i === 0) {
                        // 反转时，第一个砖块位置是引线，high/low/volume 不用重新算（反向但不够brickSize * 2就已经加过了）
                        continue; // 跳过本次循环，这里是细节
                    } else if (i === 1) {
                        newHigh = Math.max(newClose, preRenkoData.high);
                        newLow = Math.min(newClose, preRenkoData.low);
                    } else {
                        newHigh = Math.max(newClose, preRenkoClose);
                        newLow = Math.min(newClose, preRenkoClose);
                    }
                    newOpen = preRenkoClose;
                    newClose = newOpen + direction * brickSize;

                    // 更新 砖型图/收盘价
                    preRenkoData = {
                        open: newOpen,
                        close: newClose,
                        high: newHigh,
                        low: newLow,
                        volume: volume / numOfBricks, // 这里可以进一步计算砖型图的成交量
                        openTime: preCloseTime, // 这里是起始时间，通常是上一根 K 线的结束时间
                        closeTime,
                    };
                    preRenkoClose = newClose;
                    preCloseTime = closeTime;
        
                    // 将新的砖型图保存到 renkoData 中
                    renkoData.push(preRenkoData);
                }
                // 初始化下一砖块的high/low
                preRenkoData = {
                    high: Math.max(preRenkoClose, close),
                    low: Math.min(preRenkoClose, close),
                    openTime: preCloseTime,
                    closeTime,
                }
            } else {
                // 反向但不够brickSize * 2，也就没有产生新的砖块
                preRenkoData = {
                    high: Math.max(preRenkoData.high, close),
                    low: Math.min(preRenkoData.low, close),
                    openTime: preCloseTime,
                    closeTime,
                };
            }
        }
        preDirection = direction;
    }
    // 没有产生新的砖块
    else {
        // preRenkoData来自于for循环后的初始化，更新 volume closeTime low high
        preRenkoData = {
            high: Math.max(preRenkoData.high, close),
            low: Math.min(preRenkoData.low, close),
            openTime: preCloseTime,
            closeTime,
        };
    }

    return {
        renkoData,
        newRenkoClose: preRenkoClose,
        newRenkoData: preRenkoData,
        newDirection: preDirection,
    };
}

function getSmaRatio(arr) {
    return (arr[arr.length - 1] - arr[0]) / arr[0];
}

module.exports = {
    convertToRenko,
    getSmaRatio,
};
