function debounce(func, delay, immediate) {
    let timeoutId;

    return async function (...args) {
        const later = async () => {
            timeoutId = null;
            if (!immediate) {
                await func.apply(this, args);
            }
        };

        const callNow = immediate && !timeoutId;

        clearTimeout(timeoutId);
        timeoutId = setTimeout(later, delay);

        if (callNow) {
            await func.apply(this, args);
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
                const result = await func.apply(this, args);
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
                    const result = await func.apply(this, args);
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
                const result = await func.apply(this, args);
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
                    const result = await func.apply(this, args);
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

module.exports = {
    debounce,
    throttle,
    getDate,
};
