/**
 * 指标计算逻辑模块
 * 负责计算和更新各种技术指标
 */

const { calculateLatestSuperTrend } = require("../../utils/superTrend.js");
const { cacleSwimingFreeEma } = require("../../utils/swimingFree.js");
const { calculateLatestSSL, calculateLatestSSL2 } = require("../../utils/SSL_CMF_VO/SSLChannel.js");
const { calculateFBB } = require("../../utils/fib.js");
const { calculateLatestQQEMOD } = require("../../utils/qqeMod.js");
const { calculateLatestADX } = require("../../utils/adx.js");
const { calculateLatestPreHighLow } = require("../../utils/swingHighLow.js");
const { calculateLatestSSL55 } = require("../../utils/ssl55.js");
const { calculateLatestSqueezeBox } = require("../../utils/squeezeBox.js");

/**
 * 初始化指标计算（异步执行）
 * @param {Array} historyClosePrices - 历史收盘价数组
 * @param {Array} kLineData - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Promise<void>} 等待所有指标计算完成
 */
async function initEveryIndex(historyClosePrices, kLineData, state, config) {
    const len = historyClosePrices.length;
    // 串行执行初始化，确保顺序
    for (let i = len - 10; i < len; i++) {
        await setEveryIndex(historyClosePrices.slice(0, i), kLineData.slice(0, i), state, config);
    }
}

/**
 * 设置所有指标（异步执行，使用 Promise.all 统一管理）
 * @param {Array} historyClosePrices - 历史收盘价数组（未使用，但保持与源代码一致的参数）
 * @param {Array} curKLine - 当前K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 * @returns {Promise<void>} 等待所有指标计算完成
 */
async function setEveryIndex(historyClosePrices, curKLine, state, config) {
    // 将所有指标计算包装成 Promise，使用 setImmediate 让它们在不同的事件循环tick中执行
    // 这样可以更好地利用事件循环，实现更好的并行性
    const promises = [
        new Promise(resolve => setImmediate(() => {
            setSperTrendArr(curKLine, state, config);
            resolve();
        })),
        new Promise(resolve => setImmediate(() => {
            setSwimingFreeArr(curKLine, state, config);
            resolve();
        })),
        new Promise(resolve => setImmediate(() => {
            setSslArr(curKLine, state, config);
            resolve();
        })),
        new Promise(resolve => setImmediate(() => {
            setSsl2Arr(curKLine, state, config);
            resolve();
        })),
        new Promise(resolve => setImmediate(() => {
            setFibArr(curKLine, state, config);
            resolve();
        })),
        new Promise(resolve => setImmediate(() => {
            setQqeModArr(curKLine, state, config);
            resolve();
        })),
        new Promise(resolve => setImmediate(() => {
            setAdxArr(curKLine, state, config);
            resolve();
        })),
        new Promise(resolve => setImmediate(() => {
            setPreHighLowArr(curKLine, state, config);
            resolve();
        })),
        new Promise(resolve => setImmediate(() => {
            setSSL55Arr(curKLine, state, config);
            resolve();
        })),
        new Promise(resolve => setImmediate(() => {
            setSqueezeBoxArr(curKLine, state, config);
            resolve();
        })),
    ];
    
    // 等待所有指标计算完成
    await Promise.all(promises);
}

/**
 * 计算SuperTrend指标
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setSperTrendArr(klines, state, config) {
    const { superTrendArr } = state;
    const { atrPeriod, multiplier } = config;
    
    // SuperTrend 需要至少 atrPeriod 根K线来计算 ATR
    // 但为了确保上下轨计算的准确性，需要更多历史数据来稳定 ATR 和上下轨
    const minRequired = 800;
    superTrendArr.length >= 10 && superTrendArr.shift();
    // 与 Pine Script 保持一致：
    // - changeATR = true (默认) 使用 RMA (Wilder's smoothing)，对应 useATR = true
    // - 使用标准 TR 计算，对应 inertiaRatio = 0
    const superTrend = calculateLatestSuperTrend(klines.slice(-minRequired), atrPeriod, multiplier, true, 0);
    superTrendArr.push(superTrend);
}

/**
 * 计算SwimingFree指标
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setSwimingFreeArr(klines, state, config) {
    const { swimingFreeArr } = state;
    const { swimingFreePeriod } = config;
    
    // Range Filter 需要足够的数据：
    // - rng_per = 60，需要 60 个 absDiff 值来计算第一个 avrng
    // - wper = (60 * 2) - 1 = 119，需要 119 个 avrng 值来计算第一个 AC
    // - 所以至少需要 60 + 119 = 179 根K线（因为 absDiff 从第二根K线开始）
    // - 传入更多数据确保计算准确：如果需要200条就传入500条
    const minRequired = Math.max(swimingFreePeriod * 3 + 20, 500); // 至少500根K线
    swimingFreeArr.length >= 10 && swimingFreeArr.shift();
    const swimingFree = cacleSwimingFreeEma(klines.slice(-minRequired), swimingFreePeriod, 2.5);
    swimingFreeArr.push(swimingFree);
}

/**
 * 计算SSL指标
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setSslArr(klines, state, config) {
    const { sslArr } = state;
    const { sslPeriod } = config;
    
    // SSL 需要至少 sslPeriod 根K线，传入更多数据确保计算准确
    const minRequired = Math.max(sslPeriod * 2.5, 500); // 至少500根K线
    sslArr.length >= 10 && sslArr.shift();
    const ssl = calculateLatestSSL(klines.slice(-minRequired), sslPeriod);
    sslArr.push(ssl);
}

/**
 * 计算SSL2指标
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setSsl2Arr(klines, state, config) {
    const { ssl2Arr } = state;
    const { sslPeriod } = config;
    
    // SSL2 需要至少 sslPeriod * 3 根K线，传入更多数据确保计算准确
    const minRequired = Math.max(sslPeriod * 3 * 2.5, 500); // 至少500根K线
    ssl2Arr.length >= 10 && ssl2Arr.shift();
    const ssl2 = calculateLatestSSL2(klines.slice(-minRequired), sslPeriod);
    ssl2Arr.push(ssl2);
}

/**
 * 计算Fibonacci指标
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setFibArr(klines, state, config) {
    const { fibArr } = state;
    
    // Fibonacci 需要至少 200 根K线（fbbLength = 200），传入更多数据确保计算准确
    const minRequired = Math.max(200 * 2.5, 500); // 至少500根K线
    fibArr.length >= 10 && fibArr.shift();
    const fib = calculateFBB(klines.slice(-minRequired));
    fibArr.push(fib);
}

/**
 * 计算QQE MOD指标
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setQqeModArr(klines, state, config) {
    const { qqeModArr } = state;
    const {
        qqe_rsiLengthPrimary,
        qqe_rsiSmoothingPrimary,
        qqe_qqeFactorPrimary,
        qqe_thresholdPrimary,
        qqe_rsiLengthSecondary,
        qqe_rsiSmoothingSecondary,
        qqe_qqeFactorSecondary,
        qqe_thresholdSecondary,
    } = config;
    
    // QQE MOD 需要足够的数据，传入更多数据确保计算准确
    const minRequired = Math.max(100 * 2.5, 500); // 至少500根K线
    qqeModArr.length >= 10 && qqeModArr.shift();
    const qqeMod = calculateLatestQQEMOD(klines.slice(-minRequired), {
        rsiLengthPrimary: qqe_rsiLengthPrimary,
        rsiSmoothingPrimary: qqe_rsiSmoothingPrimary,
        qqeFactorPrimary: qqe_qqeFactorPrimary,
        thresholdPrimary: qqe_thresholdPrimary,
        rsiLengthSecondary: qqe_rsiLengthSecondary,
        rsiSmoothingSecondary: qqe_rsiSmoothingSecondary,
        qqeFactorSecondary: qqe_qqeFactorSecondary,
        thresholdSecondary: qqe_thresholdSecondary,
    });
    qqeModArr.push(qqeMod);
}

/**
 * 计算ADX指标
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setAdxArr(klines, state, config) {
    const { adxArr } = state;
    const { adx_len } = config;
    
    // ADX 需要足够的数据：
    // - 需要 adx_len 个 DX 值来计算 ADX
    // - DX 从第二根K线开始计算（需要前一根K线）
    // - 传入更多数据确保计算准确：如果需要36条就传入500条
    const minRequired = Math.max(adx_len * 3 * 2.5, 500); // 至少500根K线
    adxArr.length >= 10 && adxArr.shift();
    const adx = calculateLatestADX(klines.slice(-minRequired), adx_len);
    adxArr.push(adx);
}

/**
 * 计算前高点/前低点指标
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setPreHighLowArr(klines, state, config) {
    const { preHighLowArr } = state;
    const { swingLength } = config;
    
    // PreHighLow 需要至少 swingLength * 2 根K线，传入更多数据确保计算准确
    const minRequired = Math.max(swingLength * 2 * 2.5, 500); // 至少500根K线
    preHighLowArr.length >= 10 && preHighLowArr.shift();
    const preHighLow = calculateLatestPreHighLow(klines.slice(-minRequired), swingLength);
    preHighLowArr.push(preHighLow);
}

/**
 * 计算SSL55指标
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setSSL55Arr(klines, state, config) {
    const { ssl55Arr } = state;
    const { enableSSL55Squeeze, ssl55_Length } = config;
    
    if (!enableSSL55Squeeze) {
        // 如果未启用，保持数组为空或填充 null
        ssl55Arr.length >= 10 && ssl55Arr.shift();
        ssl55Arr.push(null);
        return;
    }
    
    // SSL55 需要至少 ssl55_Length 根K线，传入更多数据确保计算准确
    // HMA 计算需要：WMA(28) + WMA(55) + WMA(7)，至少需要 length + sqrt(length) - 1 根数据
    // 为了计算准确，建议至少传入 length * 3 根数据
    const minRequired = ssl55_Length * 2; // 至少200根K线
    ssl55Arr.length >= 10 && ssl55Arr.shift();
    const ssl55 = calculateLatestSSL55(klines.slice(-minRequired), ssl55_Length);
    ssl55Arr.push(ssl55);
}

/**
 * 计算Squeeze Box指标
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setSqueezeBoxArr(klines, state, config) {
    const { squeezeBoxArr } = state;
    const {
        enableSSL55Squeeze,
        squeeze_box_Period,
        squeeze_box_Deviation,
        squeeze_box_Threshold,
        squeeze_box_Source,
        squeeze_box_MA_Type,
    } = config;
    
    if (!enableSSL55Squeeze) {
        // 如果未启用，保持数组为空或填充 null
        squeezeBoxArr.length >= 10 && squeezeBoxArr.shift();
        squeezeBoxArr.push(null);
        return;
    }
    
    // Squeeze Box 需要至少 squeeze_box_Period 根K线，传入更多数据确保计算准确
    // 计算历史最高/最低需要足够的历史数据，建议至少传入 period * 3 根数据
    const minRequired = Math.max(squeeze_box_Period * 3, 200); // 至少200根K线
    
    squeezeBoxArr.length >= 10 && squeezeBoxArr.shift();
    const squeezeBox = calculateLatestSqueezeBox(klines.slice(-minRequired), {
        period: squeeze_box_Period,
        deviation: squeeze_box_Deviation,
        threshold: squeeze_box_Threshold,
        source: squeeze_box_Source,
        maType: squeeze_box_MA_Type,
    });
    squeezeBoxArr.push(squeezeBox);
}

module.exports = {
    initEveryIndex,
    setEveryIndex,
    setSperTrendArr,
    setSwimingFreeArr,
    setSslArr,
    setSsl2Arr,
    setFibArr,
    setQqeModArr,
    setAdxArr,
    setPreHighLowArr,
    setSSL55Arr,
    setSqueezeBoxArr,
};
