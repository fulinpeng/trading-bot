/**
 * SSL55 指标计算
 * 使用 HMA (Hull Moving Average) 计算 SSL55
 * 与 Pine Script 的 ssl55_fn_ssl 函数保持一致
 */
function pineWMA(src, len) {
    // 对齐 Pine：len 为整数且 >= 1
    len = Math.floor(len);
    if (len <= 0) return src.map(() => null);
    if (len === 1) return src.map(v => (v == null ? null : v));
  
    const out = new Array(src.length).fill(null);
  
    for (let idx = 0; idx < src.length; idx++) {
      let norm = 0.0;
      let sum = 0.0;
  
      // Pine: for i = 0 to len - 1
      for (let i = 0; i < len; i++) {
        const v = src[idx - i]; // ✅ Pine 的 src[i]：往过去取
        if (v == null) {
          sum = null; // 窗口内有缺失 -> 结果为 null
          break;
        }
  
        const weight = (len - i) * len; // ✅ 完全照抄 Pine
        norm += weight;
        sum += v * weight;
      }
  
      out[idx] = sum == null ? null : sum / norm;
    }
  
    return out;
  }
  
  function calculateHMA(data, length) {
    const halfLength = Math.floor(length / 2);
    const sqrtLength = Math.floor(Math.sqrt(length));
  
    const wma1 = pineWMA(data, halfLength);
    const wma2 = pineWMA(data, length);
  
    // h = 2*wma1 - wma2
    const h = data.map((_, idx) => {
      const a = wma1[idx];
      const b = wma2[idx];
      if (a == null || b == null) return null;
      return 2.0 * a - b;
    });
  
    // hma = wma(h, floor(sqrt(length)))
    return pineWMA(h, sqrtLength);
  }
  

/**
 * 计算 SSL55 指标（直接计算，不依赖增量更新）
 * @param {Array} klineData - K线数据数组，每个元素包含 {high, low, close}
 * @param {number} length - SSL55 周期，默认 55
 * @returns {Object|null} SSL55 结果 {ssl55, hlv} 或 null
 */
function calculateLatestSSL55(klineData, length = 55) {
    if (!klineData || klineData.length < length) {
        return null;
    }
    
    const highSeries = klineData.map(k => k.high);
    const lowSeries = klineData.map(k => k.low);
    const closeSeries = klineData.map(k => k.close);
    
    // 计算 HMA
    const hh = calculateHMA(highSeries, length);
    const ll = calculateHMA(lowSeries, length);
    
    const lastIndex = klineData.length - 1;
    
    // 计算 Hlv 状态（与 Pine Script 一致）
    // Pine Script: var int Hlv_ssl55 = na
    // Hlv_ssl55 := close > hh ? 1 : close < ll ? -1 : Hlv_ssl55[1]
    // 
    // Pine Script 的三元表达式执行顺序：
    // 1. 如果 close > hh，返回 1
    // 2. 否则，如果 close < ll，返回 -1
    // 3. 否则，返回 Hlv_ssl55[1]（上一根的值）
    let hlv = null;
    let preHlv = null; // 保存上一根K线的 hlv 值
    
    // 从 i=0 开始逐根计算 Hlv 状态（与 Pine Script 一致）
    // 如果 hh[i] 或 ll[i] 为 null，跳过这一根
    for (let i = 0; i <= lastIndex; i++) {
        const currentHH = hh[i];
        const currentLL = ll[i];
        const close = closeSeries[i];
        
        // 跳过 HMA 值仍为 null 的情况（数据不足）
        if (currentHH === null || currentLL === null) continue;
        
        // Pine Script: Hlv_ssl55 := close > hh ? 1 : close < ll ? -1 : Hlv_ssl55[1]
        // 严格按照三元表达式的逻辑执行
        if (close > currentHH) {
            hlv = 1;
        } else {
            // close <= hh，继续判断第二个条件
            if (close < currentLL) {
                hlv = -1;
            } else {
                // close >= ll && close <= hh，保持上一根的值（Hlv_ssl55[1]）
                hlv = preHlv; // 如果 preHlv 是 null（第一根有效K线），则保持 null
            }
        }
        
        // 更新 preHlv 为当前值，供下一根K线使用
        preHlv = hlv;
    }
    
    // 检查是否有有效的 HMA 值和 hlv 值
    const lastHH = hh[lastIndex];
    const lastLL = ll[lastIndex];
    if (lastHH === null || lastLL === null || hlv === null) {
        return null;
    }
    
    // 获取当前K线的 HMA 值（最后一个有效值）
    const currentHH = hh[lastIndex];
    const currentLL = ll[lastIndex];
    
    if (currentHH === null || currentLL === null) {
        return null;
    }
    
    // 计算 SSL55 值（使用当前K线的 HMA 值）
    // Pine Script: ssl55 = Hlv_ssl55 < 0 ? hh : ll
    const ssl55 = hlv < 0 ? currentHH : currentLL;
    
    return {
        ssl55,
        hlv,
        hh: currentHH,  // HMA 高值（用于日志显示）
        ll: currentLL,  // HMA 低值（用于日志显示）
    };
}

module.exports = {
    calculateLatestSSL55,
};

