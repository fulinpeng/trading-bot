/**
 * Squeeze Box v2 指标计算
 * 与 Pine Script 的 squeeze_box v2 计算保持一致
 * 经过测试，这个版本不是很适合 superTrend_SSL_qqeMod 策略
 */
function calculateLatestSqueezeBox(klineData, params = {}) {
    const {
      period = 24,
      deviation = 2,
      threshold = 50,
      source = "hl2",
      maType = "EMA", // "EMA" | "SMA" | "HULLMA"
    } = params;
  
    const n = klineData?.length ?? 0;
    if (n < period + 2) return null;
  
    // ---------- Source series ----------
    const src = klineData.map(k => {
      switch (source) {
        case "close": return k.close;
        case "open":  return k.open;
        case "high":  return k.high;
        case "low":   return k.low;
        case "hlc3":  return (k.high + k.low + k.close) / 3;
        case "hl2":
        default:      return (k.high + k.low) / 2;
      }
    });
  
    // ---------- Helpers ----------
    const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  
    function smaSeries(x, len) {
      const out = Array(x.length).fill(null);
      let sum = 0;
      for (let i = 0; i < x.length; i++) {
        sum += x[i];
        if (i >= len) sum -= x[i - len];
        if (i >= len - 1) out[i] = sum / len;
      }
      return out;
    }
  
    function emaSeries(x, len) {
      const out = Array(x.length).fill(null);
      const alpha = 2 / (len + 1);
      let ema = null;
      for (let i = 0; i < x.length; i++) {
        const v = x[i];
        if (i < len - 1) continue;
        if (ema === null) {
          // TradingView ta.ema 初始化通常以 SMA 起步
          let s = 0;
          for (let j = i - len + 1; j <= i; j++) s += x[j];
          ema = s / len;
        } else {
          ema = alpha * v + (1 - alpha) * ema;
        }
        out[i] = ema;
      }
      return out;
    }
  
    function wmaSeries(x, len) {
      // TradingView WMA: weights 1..len (oldest*1 ... newest*len)
      const out = Array(x.length).fill(null);
      const denom = (len * (len + 1)) / 2;
      for (let i = len - 1; i < x.length; i++) {
        let num = 0;
        let w = 1;
        for (let j = i - len + 1; j <= i; j++, w++) {
          num += x[j] * w;
        }
        out[i] = num / denom;
      }
      return out;
    }
  
    function stdevSeries(x, len) {
      const out = Array(x.length).fill(null);
      // 这里按“总体方差”实现（匹配 TV 的 stdev 更接近）
      for (let i = len - 1; i < x.length; i++) {
        let mean = 0;
        for (let j = i - len + 1; j <= i; j++) mean += x[j];
        mean /= len;
  
        let v = 0;
        for (let j = i - len + 1; j <= i; j++) {
          const d = x[j] - mean;
          v += d * d;
        }
        v /= len;
        out[i] = Math.sqrt(v);
      }
      return out;
    }
  
    function highestSeries(x, len) {
      const out = Array(x.length).fill(null);
      for (let i = len - 1; i < x.length; i++) {
        let m = -Infinity;
        for (let j = i - len + 1; j <= i; j++) m = Math.max(m, x[j]);
        out[i] = m;
      }
      return out;
    }
  
    function lowestSeries(x, len) {
      const out = Array(x.length).fill(null);
      for (let i = len - 1; i < x.length; i++) {
        let m = Infinity;
        for (let j = i - len + 1; j <= i; j++) m = Math.min(m, x[j]);
        out[i] = m;
      }
      return out;
    }
  
    function hullmaSeries(x, len) {
      const half = Math.max(1, Math.floor(len / 2));         // v5里你用 int(per/2)
      const sqrt = Math.max(1, Math.round(Math.sqrt(len)));  // v2原脚本：round(sqrt(per))
      const w1 = wmaSeries(x, half);
      const w2 = wmaSeries(x, len);
  
      // h = 2*wma(x, half) - wma(x, len)
      const h = x.map((_, i) => {
        if (!isNum(w1[i]) || !isNum(w2[i])) return null;
        return 2 * w1[i] - w2[i];
      });
  
      // 对 h 做 WMA(sqrt)
      // wmaSeries 要求纯 number 数组，这里把 null 处理掉：遇到 null 直接输出 null
      const out = Array(x.length).fill(null);
      const denom = (sqrt * (sqrt + 1)) / 2;
  
      for (let i = sqrt - 1; i < x.length; i++) {
        let ok = true;
        let num = 0;
        let w = 1;
        for (let j = i - sqrt + 1; j <= i; j++, w++) {
          if (!isNum(h[j])) { ok = false; break; }
          num += h[j] * w;
        }
        if (ok) out[i] = num / denom;
      }
      return out;
    }
  
    // ---------- MA basis ----------
    let ma;
    if (maType === "SMA") ma = smaSeries(src, period);
    else if (maType === "HULLMA") ma = hullmaSeries(src, period);
    else ma = emaSeries(src, period); // EMA default
  
    const sd = stdevSeries(src, period);
  
    // ---------- Bollinger + squeeze ----------
    const bu = Array(n).fill(null);
    const bd = Array(n).fill(null);
    const bw = Array(n).fill(null);
  
    for (let i = 0; i < n; i++) {
      if (!isNum(ma[i]) || !isNum(sd[i])) continue;
      const dev = sd[i] * deviation;
      bu[i] = ma[i] + dev;
      bd[i] = ma[i] - dev;
      bw[i] = bu[i] - bd[i];
    }
  
    const buh = highestSeries(bu.map(v => (isNum(v) ? v : -Infinity)), period);
    const bdl = lowestSeries(bd.map(v => (isNum(v) ? v : Infinity)), period);
  
    const sqpSeries = Array(n).fill(null);
    const sqzSeries = Array(n).fill(false);
  
    for (let i = 0; i < n; i++) {
      if (!isNum(bu[i]) || !isNum(bd[i]) || !isNum(buh[i]) || !isNum(bdl[i])) continue;
      const brng = buh[i] - bdl[i];
      const sqp = brng !== 0 ? (100 * (bu[i] - bd[i]) / brng) : 0;
      sqpSeries[i] = sqp;
      // ⭐ 与你 v5 里一致：强制 bool
      sqzSeries[i] = (sqp < threshold) ? true : false;
    }
  
    // ---------- Squeeze Box (v5 “prev/last” logic) ----------
    const hiSrc = highestSeries(src, period);
    const loSrc = lowestSeries(src, period);
  
    const bhSeries = Array(n).fill(null);
    const blSeries = Array(n).fill(null);
  
    let last_boxh = null;
    let last_boxl = null;
    let prev_boxh = null;
    let prev_boxl = null;
  
    for (let i = 0; i < n; i++) {
      const sqz = sqzSeries[i];
  
      // boxh/boxl：sqz ? highest/lowest : src
      const boxh = sqz ? hiSrc[i] : src[i];
      const boxl = sqz ? loSrc[i] : src[i];
  
      if (sqz) {
        prev_boxh = last_boxh;
        last_boxh = boxh;
        prev_boxl = last_boxl;
        last_boxl = boxl;
      }
  
      bhSeries[i] = prev_boxh;
      blSeries[i] = prev_boxl;
    }
  
    const i = n - 1;
    return {
      basis: ma[i],
      bh: bhSeries[i],
      bl: blSeries[i],
      sqz: sqzSeries[i],
      sqp: sqpSeries[i],
    };
  }
  

module.exports = {
    calculateLatestSqueezeBox,
};

