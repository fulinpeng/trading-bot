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

const getDate = (date) => {
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

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};
// 计算数组平均值的函数
function calculateAverage(values, period) {
    if (period) {
        const sum = values.slice(0, period).reduce((acc, val) => acc + val, 0);
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
    let highestHigh = Number.MIN_VALUE;
    let lowestLow = Number.MAX_VALUE;

    // 遍历最近25根K线数据，找出最高价和最低价
    recentData.forEach((kline) => {
        const high = parseFloat(kline.high);
        const low = parseFloat(kline.low);

        if (high > highestHigh) {
            highestHigh = high;
        }
        if (low < lowestLow) {
            lowestLow = low;
        }
    });

    return {
        highestHigh,
        lowestLow,
    };
}
function getSequenceArr(diff, num) {
    let arr = [1];
    for (let i = 0; i < num; i++) {
        arr.push(arr[arr.length - 1] + diff);
    }
    return arr;
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
};
