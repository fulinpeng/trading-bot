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

/**
 * 初始化指标计算
 * @param {Array} historyClosePrices - 历史收盘价数组
 * @param {Array} kLineData - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function initEveryIndex(historyClosePrices, kLineData, state, config) {
    const len = historyClosePrices.length;
    for (let i = len - 10; i < len; i++) {
        setEveryIndex(historyClosePrices.slice(0, i), kLineData.slice(0, i), state, config);
    }
}

/**
 * 设置所有指标
 * @param {Array} historyClosePrices - 历史收盘价数组
 * @param {Array} curKLine - 当前K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setEveryIndex(historyClosePrices, curKLine, state, config) {
    setSperTrendArr(curKLine, state, config);
    setSwimingFreeArr(curKLine, state, config);
    setSslArr(curKLine, state, config);
    setSsl2Arr(curKLine, state, config);
    setFibArr(curKLine, state, config);
    setQqeModArr(curKLine, state, config);
    setAdxArr(curKLine, state, config);
    setPreHighLowArr(curKLine, state, config);
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
    
    if (superTrendArr.length >= 10) {
        superTrendArr.shift();
    }
    const superTrend = calculateLatestSuperTrend(klines, atrPeriod, multiplier);
    if (superTrend) {
        superTrendArr.push(superTrend);
    }
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
    
    if (swimingFreeArr.length >= 10) {
        swimingFreeArr.shift();
    }
    const swimingFree = cacleSwimingFreeEma(klines.slice(-swimingFreePeriod * 2 - 10), swimingFreePeriod, 2.5);
    if (swimingFree) {
        swimingFreeArr.push(swimingFree);
    }
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
    
    if (sslArr.length >= 10) {
        sslArr.shift();
    }
    const ssl = calculateLatestSSL(klines.slice(-sslPeriod - 10), sslPeriod);
    if (ssl) {
        sslArr.push(ssl);
    }
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
    
    if (ssl2Arr.length >= 10) {
        ssl2Arr.shift();
    }
    const ssl2 = calculateLatestSSL2(klines.slice(-sslPeriod * 3 - 10), sslPeriod);
    if (ssl2) {
        ssl2Arr.push(ssl2);
    }
}

/**
 * 计算Fibonacci指标
 * @param {Array} klines - K线数据数组
 * @param {Object} state - 策略状态对象
 * @param {Object} config - 配置对象
 */
function setFibArr(klines, state, config) {
    const { fibArr } = state;
    
    if (fibArr.length >= 10) {
        fibArr.shift();
    }
    const fib = calculateFBB(klines);
    if (fib) {
        fibArr.push(fib);
    }
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
    
    if (qqeModArr.length >= 10) {
        qqeModArr.shift();
    }
    const qqeMod = calculateLatestQQEMOD(klines.slice(-100), {
        rsiLengthPrimary: qqe_rsiLengthPrimary,
        rsiSmoothingPrimary: qqe_rsiSmoothingPrimary,
        qqeFactorPrimary: qqe_qqeFactorPrimary,
        thresholdPrimary: qqe_thresholdPrimary,
        rsiLengthSecondary: qqe_rsiLengthSecondary,
        rsiSmoothingSecondary: qqe_rsiSmoothingSecondary,
        qqeFactorSecondary: qqe_qqeFactorSecondary,
        thresholdSecondary: qqe_thresholdSecondary,
    });
    if (qqeMod) {
        qqeModArr.push(qqeMod);
    }
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
    
    if (adxArr.length >= 10) {
        adxArr.shift();
    }
    const adx = calculateLatestADX(klines.slice(-adx_len * 2 - 10), adx_len);
    if (adx) {
        adxArr.push(adx);
    }
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
    
    if (preHighLowArr.length >= 10) {
        preHighLowArr.shift();
    }
    const preHighLow = calculateLatestPreHighLow(klines.slice(-swingLength * 2 - 10), swingLength);
    if (preHighLow) {
        preHighLowArr.push(preHighLow);
    }
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
};
