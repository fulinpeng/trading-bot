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

const getDate = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 月份是从 0 开始的，所以要加 1
    const day = currentDate.getDate();
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const seconds = currentDate.getSeconds();

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
function isNonEmpty(value) {
    if (Array.isArray(value)) {
        return value.length > 0 && !value.some((item) => item === undefined || item === null);
    }

    if (typeof value === "object" && value !== null) {
        return Object.values(value).some((item) => item === undefined || item === null);
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

module.exports = {
    debounce,
    throttle,
    throttleImmediate,
    getDate,
    calculateAverage,
    isNonEmpty,
    findFarthestNumber,
    isIncreasing,
    isDecreasing,
    isDifferenceWithinThreshold,
};
