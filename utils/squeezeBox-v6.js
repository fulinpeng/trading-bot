
/**
 * calculateLatestSqueezeBox (Pine v6 语义 JS 1:1)
 * - MA: EMA only
 * - Squeeze % / sqz 逻辑一致
 * - bh/bl “保持”逻辑严格按你给的 v6 写法：
 *   if sqz => bh=boxh, bl=boxl
 *   else   => bh = na(bh[1]) ? highest(src, per) : bh[1]
 *           bl = na(bl[1]) ? lowest(src, per)  : bl[1]
 *
 * @param {Array<{open:number,high:number,low:number,close:number,volume?:number}>} klineData
 * @param {Object} params
 * @param {number} [params.period=21]               squeeze_box_Period
 * @param {number} [params.deviation=2]             squeeze_box_Deviation
 * @param {number} [params.threshold=50]            squeeze_box_Threshold
 * @param {'close'|'open'|'high'|'low'|'hl2'|'hlc3'} [params.source='hl2'] squeeze_box_Source
 * @param {boolean} [params.enabled=true]           enableSSL55Squeeze
 * @param {number} [params.emaSeedMode=0]           0=TR 底层 ta.ema 语义(先 SMA seed)；1=用首值 seed（某些库这样）
 *
 * @returns {null|{basis:number|null,bh:number|null,bl:number|null,sqz:boolean|null,sqp:number|null}}
 */
function calculateLatestSqueezeBox(klineData, params = {}) {
    const {
      period = 21,
      deviation = 2,
      threshold = 50,
      source = "hl2",
      enabled = true,
      emaSeedMode = 0,
    } = params;
  
    if (!enabled) return null;
    if (!Array.isArray(klineData) || klineData.length === 0) return null;
  
    // --- helpers ---
    const isNum = (v) => Number.isFinite(v);
    const na = (v) => !isNum(v);
  
    const getSourceValue = (k) => {
      switch (source) {
        case "close":
          return k.close;
        case "open":
          return k.open;
        case "high":
          return k.high;
        case "low":
          return k.low;
        case "hlc3":
          return (k.high + k.low + k.close) / 3;
        case "hl2":
        default:
          return (k.high + k.low) / 2;
      }
    };
  
    const srcArr = klineData.map(getSourceValue);
  
    // rolling highest/lowest over last len (inclusive)
    const highest = (arr, endIdx, len) => {
      let m = -Infinity;
      const start = Math.max(0, endIdx - len + 1);
      for (let i = start; i <= endIdx; i++) {
        const v = arr[i];
        if (isNum(v) && v > m) m = v;
      }
      return m === -Infinity ? NaN : m;
    };
  
    const lowest = (arr, endIdx, len) => {
      let m = Infinity;
      const start = Math.max(0, endIdx - len + 1);
      for (let i = start; i <= endIdx; i++) {
        const v = arr[i];
        if (isNum(v) && v < m) m = v;
      }
      return m === Infinity ? NaN : m;
    };
  
    const sma = (arr, endIdx, len) => {
      const start = Math.max(0, endIdx - len + 1);
      if (endIdx - start + 1 < len) return NaN;
      let sum = 0;
      for (let i = start; i <= endIdx; i++) sum += arr[i];
      return sum / len;
    };
  
    // Pine ta.ema(seed=SMA first len bars) 更接近 TradingView
    const emaSeries = (arr, len) => {
      const out = new Array(arr.length).fill(NaN);
      if (len <= 0) return out;
  
      const alpha = 2 / (len + 1);
  
      if (emaSeedMode === 1) {
        // seed = first value
        let prev = arr[0];
        out[0] = prev;
        for (let i = 1; i < arr.length; i++) {
          const v = arr[i];
          prev = alpha * v + (1 - alpha) * prev;
          out[i] = prev;
        }
        return out;
      }
  
      // seed = SMA at i=len-1
      let prev = NaN;
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        if (!isNum(v)) continue;
  
        if (i === len - 1) {
          const seed = sma(arr, i, len);
          if (isNum(seed)) {
            prev = seed;
            out[i] = prev;
          }
        } else if (i >= len) {
          if (!isNum(prev)) {
            // fallback seed
            const seed = sma(arr, i, len);
            prev = isNum(seed) ? seed : v;
          } else {
            prev = alpha * v + (1 - alpha) * prev;
          }
          out[i] = prev;
        }
        // i < len-1 => NaN (Pine 早期不足len就是na)
      }
      return out;
    };
  
    // Pine stdev: sample stdev (n-1) —— TradingView 的 ta.stdev 默认是 sample
    const stdev = (arr, endIdx, len) => {
      const start = Math.max(0, endIdx - len + 1);
      if (endIdx - start + 1 < len) return NaN;
      let mean = 0;
      for (let i = start; i <= endIdx; i++) mean += arr[i];
      mean /= len;
  
      let ss = 0;
      for (let i = start; i <= endIdx; i++) {
        const d = arr[i] - mean;
        ss += d * d;
      }
      const denom = len - 1;
      if (denom <= 0) return NaN;
      return Math.sqrt(ss / denom);
    };
  
    // --- compute full series (to reproduce bh/bl persistence) ---
    const n = srcArr.length;
    const ma = emaSeries(srcArr, period);
  
    const bu = new Array(n).fill(NaN);
    const bd = new Array(n).fill(NaN);
    const bw = new Array(n).fill(NaN);
    const sqp = new Array(n).fill(NaN);
    const sqz = new Array(n).fill(null); // boolean or null
    const bhSeries = new Array(n).fill(NaN);
    const blSeries = new Array(n).fill(NaN);
  
    for (let i = 0; i < n; i++) {
      const basis = ma[i];
      if (na(basis)) continue;
  
      const sd = stdev(srcArr, i, period);
      if (na(sd)) continue;
  
      const bu_i = basis + sd * deviation;
      const bd_i = basis - sd * deviation;
      const bw_i = bu_i - bd_i;
  
      bu[i] = bu_i;
      bd[i] = bd_i;
      bw[i] = bw_i;
  
      const buh = highest(bu, i, period);
      const bdl = lowest(bd, i, period);
      const brng = buh - bdl;
  
      // 你 v6 代码：brng!=0 ? 100*bw/brng : 100
      const sqp_i = brng !== 0 ? (100 * bw_i) / brng : 100;
      sqp[i] = sqp_i;
  
      const sqz_i = sqp_i < threshold;
      sqz[i] = sqz_i;
  
      const boxh = sqz_i ? highest(srcArr, i, period) : srcArr[i];
      const boxl = sqz_i ? lowest(srcArr, i, period) : srcArr[i];
  
      if (sqz_i) {
        bhSeries[i] = boxh;
        blSeries[i] = boxl;
      } else {
        // v6: bh := na(bh[1]) ? highest(src, per) : bh[1]
        const prevBh = i > 0 ? bhSeries[i - 1] : NaN;
        const prevBl = i > 0 ? blSeries[i - 1] : NaN;
  
        bhSeries[i] = na(prevBh) ? highest(srcArr, i, period) : prevBh;
        blSeries[i] = na(prevBl) ? lowest(srcArr, i, period) : prevBl;
      }
    }
  
    // latest index
    const i = n - 1;
  
    // 输出按你给的结构
    return {
      basis: isNum(ma[i]) ? ma[i] : null,
      bh: isNum(bhSeries[i]) ? bhSeries[i] : null,
      bl: isNum(blSeries[i]) ? blSeries[i] : null,
      sqz: sqz[i] === null ? null : sqz[i],
      sqp: isNum(sqp[i]) ? sqp[i] : null,
    };
  }