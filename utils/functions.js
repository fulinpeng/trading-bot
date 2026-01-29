const dayjs = require('dayjs');
function debounce(func, delay, immediate) {
    let timeoutId;

    return async function (...args) {
        const later = async () => {
            timeoutId = null;
            if (!immediate) {
                await func(...args);
            }
        };

        const callNow = immediate && !timeoutId;

        clearTimeout(timeoutId);
        timeoutId = setTimeout(later, delay);

        if (callNow) {
            await func(...args);
        }
    };
}
function throttle(func, delay) {
    let lastInvokeTime = 0;
    let timeoutId;

    return async function (...args) {
        const now = Date.now();
        const elapsedTime = now - lastInvokeTime;

        const shouldInvoke = elapsedTime >= delay;

        if (shouldInvoke) {
            lastInvokeTime = now;
            try {
                const result = await func(...args);
                return result;
            } catch (error) {
                throw error;
            }
        } else {
            // 如果在 delay 时间内再次触发，清除之前的定时器，重新设置
            clearTimeout(timeoutId);
            timeoutId = setTimeout(async () => {
                lastInvokeTime = Date.now();
                try {
                    const result = await func(...args);
                    return result;
                } catch (error) {
                    throw error;
                }
            }, delay - elapsedTime);
        }
    };
}
function throttleImmediate(func, delay, immediate = true) {
    let lastInvokeTime = 0;
    let timeoutId;

    return async function (...args) {
        const now = Date.now();
        const elapsedTime = now - lastInvokeTime;

        const shouldInvoke = elapsedTime >= delay;

        if (shouldInvoke) {
            lastInvokeTime = now;
            try {
                const result = await func(...args);
                return result;
            } catch (error) {
                throw error;
            }
        } else {
            // 如果在 delay 时间内再次触发，清除之前的定时器，重新设置
            clearTimeout(timeoutId);
            timeoutId = setTimeout(async () => {
                lastInvokeTime = immediate ? Date.now() : lastInvokeTime;
                try {
                    const result = await func(...args);
                    return result;
                } catch (error) {
                    throw error;
                }
            }, delay - elapsedTime);
        }
    };
}

const getDate = (date, showMillise) => {
    const currentDate = date ? new Date(date) : new Date();
    const year = currentDate.getFullYear();
    let month = currentDate.getMonth() + 1; // 月份是从 0 开始的，所以要加 1
    if (month < 10) month = `0${month}`;
    let day = currentDate.getDate();
    if (day < 10) day = `0${day}`;
    let hours = currentDate.getHours();
    if (hours < 10) hours = `0${hours}`;
    let minutes = currentDate.getMinutes();
    if (minutes < 10) minutes = `0${minutes}`;
    let seconds = currentDate.getSeconds();
    if (seconds < 10) seconds = `0${seconds}`;

    if (showMillise) {
        let milliseconds = currentDate.getMilliseconds();
        return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}--${milliseconds}`;
    } else {
        return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    }
};
/**
 * 将日期字符串转换为时间戳（毫秒）
 * 不使用 dayjs 库，手动解析日期字符串
 * @param {String} dateStr - 日期字符串，格式: "YYYY-MM-DD_HH-mm-ss"，例如 "2025-05-12_00-00-00"
 * @param {String} inputFormat - 输入格式（保留用于兼容，当前仅支持 "YYYY-MM-DD_HH-mm-ss"）
 * @returns {Number} 时间戳（毫秒），如果解析失败返回 NaN
 */
function convertToTimestamp(dateStr, inputFormat = "YYYY-MM-DD_HH-mm-ss") {
    // 参数验证
    if (!dateStr || typeof dateStr !== 'string') {
        return NaN;
    }
    
    // 格式: "YYYY-MM-DD_HH-mm-ss"
    // 例如: "2025-05-12_00-00-00"
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
    if (!match) {
        return NaN;
    }
    
    // 提取各部分
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // Date 对象月份从 0 开始
    const day = parseInt(match[3], 10);
    const hours = parseInt(match[4], 10);
    const minutes = parseInt(match[5], 10);
    const seconds = parseInt(match[6], 10);
    
    // 验证数值范围
    if (
        isNaN(year) || isNaN(month) || isNaN(day) || 
        isNaN(hours) || isNaN(minutes) || isNaN(seconds) ||
        month < 0 || month > 11 ||
        day < 1 || day > 31 ||
        hours < 0 || hours > 23 ||
        minutes < 0 || minutes > 59 ||
        seconds < 0 || seconds > 59
    ) {
        return NaN;
    }
    
    // 创建 Date 对象并返回时间戳
    const date = new Date(year, month, day, hours, minutes, seconds);
    const timestamp = date.getTime();
    
    // 验证日期是否有效（防止无效日期如 2月30日）
    if (isNaN(timestamp)) {
        return NaN;
    }
    
    return timestamp;
}

// 计算数组平均值的函数
function calculateAverage(values, period) {
    if (period) {
        const sum = values.slice(-period).reduce((acc, val) => acc + val, 0);
        return sum / period;
    } else {
        const sum = values.reduce((acc, val) => acc + val, 0);
        return sum / values.length;
    }
}
// 是否为[{up: null}] || {up: null} 两种结构
// 并且 up || down 有值
function hasUpDownVal(value) {
    if (Array.isArray(value)) {
        return value.length > 0 && value.some((item) => !!(item.up || item.down));
        value.length > 0 && !!value.some((item) => hasUpDownVal(item));
    }
    if (typeof value === "object" && value !== null) {
        return !!(value.up || value.down);
    }

    return false; // 非数组和对象的情况
}

function findFarthestNumber(arr, cur) {
    let farthestNumber = arr[0];
    let maxDistance = Math.abs(arr[0] - cur);

    for (let i = 1; i < arr.length; i++) {
        const distance = Math.abs(arr[i] - cur);
        if (distance > maxDistance) {
            maxDistance = distance;
            farthestNumber = arr[i];
        }
    }

    return farthestNumber;
}
function isIncreasing(arr) {
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] <= arr[i - 1]) {
            return false; // 非递增
        }
    }
    return true; // 递增
}

function isDecreasing(arr) {
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] >= arr[i - 1]) {
            return false; // 非递减
        }
    }
    return true; // 递减
}
function isDifferenceWithinThreshold(arr, threshold) {
    for (let i = 1; i < arr.length; i++) {
        if (Math.abs(arr[i] - arr[i - 1]) > threshold) {
            return false; // 差值超过阈值
        }
    }
    return true; // 所有差值均在阈值以内
}

// 斜率
function calculateSlope(angleInDegrees) {
    const angleInRadians = angleInDegrees * (Math.PI / 180);
    return Math.tan(angleInRadians);
}

function getLastFromArr(arr, num = 3) {
    // let res = [];
    // const len = arr.length;
    // while (num > 0) {
    //     res.push(arr[len - num]);
    //     num--;
    // }
    // return res;
    return arr.length <= num ? arr : arr.slice(num * -1);
}
/**
 * 计算最近25根K线的最高点和最低点
 * @param {Array} klineData - K线数据数组
 * @returns {Object} 包含最高点和最低点的对象
 */
function calculateHighLow(klineData, period = 25) {
    if (klineData.length < period) {
        throw new Error(`K线数据长度必须至少为${period}`);
    }

    // 取最近25根K线数据
    const recentData = klineData.slice(-period);

    // 初始化最高价和最低价
    let maxHigh = Number.MIN_VALUE;
    let minLow = Number.MAX_VALUE;

    // 遍历最近25根K线数据，找出最高价和最低价
    recentData.forEach((kline) => {
        const high = parseFloat(kline.high);
        const low = parseFloat(kline.low);

        if (high > maxHigh) {
            maxHigh = high;
        }
        if (low < minLow) {
            minLow = low;
        }
    });

    return {
        maxHigh,
        minLow,
    };
}
function getSequenceArr(diff, num, defaultVal = 10) {
    let arr = [defaultVal];
    for (let i = 0; i < num; i++) {
        let item = arr[arr.length - 1];
        arr.push(item + diff);
    }
    return arr;
}
function getSmaRatioArr(diff, num) {
    let arr = [1];
    for (let i = 0; i < num; i++) {
        arr.push(arr[arr.length - 1] * diff);
    }
    return arr;
}

/**
 * 计算等差马丁仓位大小
 * @param {number} baseAmount - 基础金额（DefaultAvailableMoney）
 * @param {number} lossCount - 当前损失次数
 * @param {number} initialPercent - 初始百分比（默认100，即100%）
 * @param {number} incrementPercent - 每次增加的百分比（默认1，即1%）
 * @param {number} maxPercent - 最大百分比（默认1000，即1000%）
 * @returns {number} 计算后的仓位大小
 */
function calcMartingaleSize(baseAmount, lossCount, initialPercent = 100, incrementPercent = 1, maxPercent = 1000) {
    // 计算当前百分比：初始百分比 + 损失次数 * 每次增加的百分比
    const currentPercent = initialPercent + lossCount * incrementPercent;
    // 限制在最大百分比内
    const finalPercent = Math.min(currentPercent, maxPercent);
    // 返回计算后的仓位大小
    return baseAmount * (finalPercent / 100);
}

/**
 * 计算以损定仓的仓位数量
 * @param {number} entryPrice - 开单价格
 * @param {number} stopLossPrice - 止损价格
 * @param {number} baseAmount - 基础金额（DefaultAvailableMoney），用于计算单笔风险
 * @param {number} riskPercent - 单笔风险百分比（默认0.01，即1%）
 * @returns {number} 计算后的仓位数量
 */
function calcRiskBasedQty(entryPrice, stopLossPrice, baseAmount, riskPercent = 0.01) {
    // 单笔风险 = 基础金额 * 风险百分比
    const riskAmount = baseAmount * riskPercent;
    
    // 解方程式：(math.abs(开单价格 - 止损价格) / 止损价格) * (开单仓位的数量 * 开单价格) = 单笔风险
    // 得出：开单仓位的数量 = 单笔风险 * 止损价格 / (开单价格 * math.abs(开单价格 - 止损价格))
    const priceDiff = Math.abs(entryPrice - stopLossPrice);
    if (priceDiff === 0) {
        // 如果开单价格和止损价格相同，无法计算，返回0
        return 0;
    }
    const quantity = (riskAmount * stopLossPrice) / (entryPrice * priceDiff);
    return quantity;
}

module.exports = {
    debounce,
    throttle,
    throttleImmediate,
    getDate,
    calculateAverage,
    hasUpDownVal,
    findFarthestNumber,
    isIncreasing,
    isDecreasing,
    isDifferenceWithinThreshold,
    calculateSlope,
    getLastFromArr,
    calculateHighLow,
    getSequenceArr,
    getSmaRatioArr,
    convertToTimestamp,
    calcMartingaleSize,
    calcRiskBasedQty,
};
