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

// 斜率
function calculateSlope(angleInDegrees) {
    const angleInRadians = angleInDegrees * (Math.PI / 180);
    return Math.tan(angleInRadians);
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
    calculateSlope,
};
