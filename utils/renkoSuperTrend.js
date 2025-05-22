/**
 * 在纯 Renko 砖数据上计算 SuperTrend 指标
 * @param {Array<{open: number, high: number, low: number, close: number}>} renkoData
 *   Renko 砖数据数组。每个对象包含 open, high, low, close。
 * @param {number} atrPeriod
 *   ATR 周期。例如 10、14 等。
 * @param {number} multiplier
 *   SuperTrend 乘数。例如 3。
 * @returns {Array<{ trend: number, up: number, dn: number } | null>}
 *   返回一个与 renkoData 等长的数组。索引小于 (atrPeriod - 1) 的位置无法计算完整 ATR，返回 null；
 *   从索引 = (atrPeriod - 1) 开始，每个位置返回 { trend, up, dn }。
 */
function calculateSuperTrendOnRenko(renkoData, atrPeriod, multiplier) {
    const len = renkoData.length;
    if (!Array.isArray(renkoData) || len === 0 || atrPeriod <= 0) {
      return [];
    }
  
    // 1. 计算 TR（True Range）数组
    //    对 Renko 来说，一般 high - low == brickSize。这里仍按照常规公式取三者最大值，以防有极端情况。
    const trArray = new Array(len).fill(0);
    for (let i = 0; i < len; i++) {
      if (i === 0) {
        // 第一根砖，直接用 high - low
        trArray[i] = Math.abs(renkoData[i].close - renkoData[i].open);
      } else {
        const prevClose = renkoData[i - 1].close;
        const currHigh = Math.max(renkoData[i].open, renkoData[i].close);
        const currLow = Math.min(renkoData[i].open, renkoData[i].close);
  
        const range1 = currHigh - currLow;
        const range2 = Math.abs(currHigh - prevClose);
        const range3 = Math.abs(currLow - prevClose);
  
        trArray[i] = Math.max(range1, range2, range3);
      }
    }
  
    // 2. 计算 ATR（Average True Range），Wilder 平滑法
    //    同样对 Renko 数据取最近 atrPeriod 根砖来计算 ATR
    const atrArray = new Array(len).fill(null);
    if (len >= atrPeriod) {
      // 2.1 先用前 atrPeriod 根 TR 简单平均，作为首个 ATR
      let trSum = 0;
      for (let i = 0; i < atrPeriod; i++) {
        trSum += trArray[i];
      }
      atrArray[atrPeriod - 1] = trSum / atrPeriod;
  
      // 2.2 后续 Wilder 平滑： ATR[i] = (ATR[i-1] * (period - 1) + TR[i]) / period
      for (let i = atrPeriod; i < len; i++) {
        const prevATR = atrArray[i - 1];
        atrArray[i] = (prevATR * (atrPeriod - 1) + trArray[i]) / atrPeriod;
      }
    }
  
    // 3. 计算 Basic Upper Band / Lower Band
    const basicUpperBand = new Array(len).fill(null);
    const basicLowerBand = new Array(len).fill(null);
    for (let i = 0; i < len; i++) {
      if (atrArray[i] === null) continue;
      const high = Math.max(renkoData[i].open, renkoData[i].close);
      const low = Math.min(renkoData[i].open, renkoData[i].close);
      const middle = (high + low) / 2;
      basicUpperBand[i] = middle + multiplier * atrArray[i];
      basicLowerBand[i] = middle - multiplier * atrArray[i];
    }
  
    // 4. 计算 Final Upper Band (up) 和 Final Lower Band (dn)，以及趋势 trend
    const finalUpperBand = new Array(len).fill(null);
    const finalLowerBand = new Array(len).fill(null);
    const trendArray = new Array(len).fill(null);
  
    // 从索引 startIdx 开始能够计算出 ATR
    const startIdx = atrPeriod - 1;
    if (startIdx < len) {
      // 4.1 初始化第一个可用位置
      finalUpperBand[startIdx] = basicUpperBand[startIdx];
      finalLowerBand[startIdx] = basicLowerBand[startIdx];
  
      // 假设第 startIdx 根砖的趋势：
      // 如果当期 close > up 则多头，否则空头
      const firstClose = renkoData[startIdx].close;
      trendArray[startIdx] = firstClose > finalUpperBand[startIdx] ? 1 : -1;
  
      // 4.2 逐根迭代从 startIdx+1 开始计算
      for (let i = startIdx + 1; i < len; i++) {
        if (atrArray[i] === null) continue;
  
        const prevClose = renkoData[i - 1].close;
        const prevFinalUB = finalUpperBand[i - 1];
        const prevFinalLB = finalLowerBand[i - 1];
  
        // 计算本期 Final Upper Band
        if (
          basicUpperBand[i] < prevFinalUB ||
          prevClose > prevFinalUB
        ) {
          finalUpperBand[i] = basicUpperBand[i];
        } else {
          finalUpperBand[i] = prevFinalUB;
        }
  
        // 计算本期 Final Lower Band
        if (
          basicLowerBand[i] > prevFinalLB ||
          prevClose < prevFinalLB
        ) {
          finalLowerBand[i] = basicLowerBand[i];
        } else {
          finalLowerBand[i] = prevFinalLB;
        }
  
        // 判断趋势：多头(1) 与 空头(-1)
        const currClose = renkoData[i].close;
        const prevTrend = trendArray[i - 1];
        let currTrend = prevTrend;
  
        if (prevTrend === -1 && currClose > finalUpperBand[i]) {
          currTrend = 1; // 空头翻多
        } else if (prevTrend === 1 && currClose < finalLowerBand[i]) {
          currTrend = -1; // 多头翻空
        }
        trendArray[i] = currTrend;
      }
    }
  
    // 5. 组合结果，前 startIdx 根返回 null
    const result = new Array(len).fill(null);
    for (let i = 0; i < len; i++) {
      if (i < startIdx || atrArray[i] === null) {
        result[i] = null;
      } else {
        result[i] = {
          trend: trendArray[i],
          up: finalUpperBand[i],
          dn: finalLowerBand[i],
        };
      }
    }
  
    return result;
  }
  
module.exports = {
    calculateSuperTrendOnRenko
};
