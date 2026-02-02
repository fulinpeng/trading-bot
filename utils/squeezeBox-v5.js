/**
 * Squeeze Box v2 指标计算
 * 与 Pine Script 的 squeeze_box v2 计算保持一致
 */

function calculateSqueezeBoxV5Series(klineData, params = {}) {
    const {
      source = 'hlc3',
      per = 21,
      matype = 'EMA',
      ndev = 2,
      sr = 50,
    } = params;
  
    const n = klineData?.length ?? 0;
    if (n === 0) return null;
  
    // --- src series (same as Pine input.source)
    const src = new Array(n);
    const high = new Array(n);
    const low = new Array(n);
    const close = new Array(n);
    const volume = new Array(n);
  
    for (let i = 0; i < n; i++) {
      const k = klineData[i];
      high[i] = k.high;
      low[i] = k.low;
      close[i] = k.close;
      volume[i] = k.volume ?? 0;
  
      switch (source) {
        case 'close': src[i] = k.close; break;
        case 'open': src[i] = k.open; break;
        case 'high': src[i] = k.high; break;
        case 'low': src[i] = k.low; break;
        case 'hl2': src[i] = (k.high + k.low) / 2; break;
        case 'hlc3':
        default: src[i] = (k.high + k.low + k.close) / 3; break;
      }
    }
  
    // --- helpers (Pine-like series functions)
    const nan = Number.NaN;
    const isNa = (v) => Number.isNaN(v);
  
    function smaSeries(x, len) {
      const out = new Array(n).fill(nan);
      if (len <= 0) return out;
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += x[i];
        if (i >= len) sum -= x[i - len];
        if (i >= len - 1) out[i] = sum / len;
      }
      return out;
    }
  
    function emaSeries(x, len) {
      const out = new Array(n).fill(nan);
      if (len <= 0) return out;
  
      // TradingView ta.ema uses SMA seed (first non-na at len-1)
      const alpha = 2 / (len + 1);
      let prev = nan;
  
      // seed with SMA at i=len-1
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += x[i];
        if (i >= len) sum -= x[i - len];
  
        if (i === len - 1) {
          prev = sum / len;
          out[i] = prev;
        } else if (i > len - 1) {
          prev = alpha * x[i] + (1 - alpha) * prev;
          out[i] = prev;
        }
      }
      return out;
    }
  
    function wmaSeries(x, len) {
      const out = new Array(n).fill(nan);
      if (len <= 0) return out;
  
      // weights: 1..len (TradingView ta.wma)
      const denom = (len * (len + 1)) / 2;
      for (let i = len - 1; i < n; i++) {
        let num = 0;
        for (let j = 0; j < len; j++) {
          const v = x[i - j];
          const w = (len - j);
          num += v * w;
        }
        out[i] = num / denom;
      }
      return out;
    }
  
    function stdevSeries(x, len) {
      const out = new Array(n).fill(nan);
      if (len <= 0) return out;
  
      // TradingView ta.stdev: population stdev (ddof=0) with SMA mean, first valid at len-1
      // If you ever find it's sample stdev, change denom to (len-1) but TV uses ddof=0 for stdev().
      let sum = 0;
      let sumSq = 0;
  
      for (let i = 0; i < n; i++) {
        const v = x[i];
        sum += v;
        sumSq += v * v;
  
        if (i >= len) {
          const old = x[i - len];
          sum -= old;
          sumSq -= old * old;
        }
  
        if (i >= len - 1) {
          const mean = sum / len;
          const variance = (sumSq / len) - mean * mean;
          out[i] = Math.sqrt(Math.max(variance, 0));
        }
      }
      return out;
    }
  
    function highestSeries(x, len) {
      const out = new Array(n).fill(nan);
      if (len <= 0) return out;
  
      // TradingView ta.highest requires full window? In practice it becomes valid at len-1 for series inputs.
      for (let i = len - 1; i < n; i++) {
        let m = -Infinity;
        for (let j = 0; j < len; j++) {
          const v = x[i - j];
          if (v > m) m = v;
        }
        out[i] = m;
      }
      return out;
    }
  
    function lowestSeries(x, len) {
      const out = new Array(n).fill(nan);
      if (len <= 0) return out;
  
      for (let i = len - 1; i < n; i++) {
        let m = Infinity;
        for (let j = 0; j < len; j++) {
          const v = x[i - j];
          if (v < m) m = v;
        }
        out[i] = m;
      }
      return out;
    }
  
    // --- v5 HullMA semantics
    const halfPer = Math.max(1, Math.floor(per / 2));
    const sqrtPerR = Math.max(1, Math.round(Math.sqrt(per)));
  
    // --- MA series
    const ema_ = emaSeries(src, per);
    const sma_ = smaSeries(src, per);
  
    // hull_ = wma(2*wma(src, halfPer) - wma(src, per), round(sqrt(per)))
    const wmaHalf = wmaSeries(src, halfPer);
    const wmaFull = wmaSeries(src, per);
    const hullInput = new Array(n).fill(nan);
    for (let i = 0; i < n; i++) {
      const a = wmaHalf[i];
      const b = wmaFull[i];
      hullInput[i] = (isNa(a) || isNa(b)) ? nan : (2 * a - b);
    }
    const hull_ = wmaSeries(hullInput, sqrtPerR);
  
    const ma = new Array(n).fill(nan);
    for (let i = 0; i < n; i++) {
      if (matype === 'EMA') ma[i] = ema_[i];
      else if (matype === 'SMA') ma[i] = sma_[i];
      else if (matype === 'HULLMA') ma[i] = hull_[i];
      else ma[i] = ema_[i];
    }
  
    // --- Bollinger + squeeze
    const stdev = stdevSeries(src, per);
    const dev = new Array(n).fill(nan);
    const bu = new Array(n).fill(nan);
    const bd = new Array(n).fill(nan);
    const bw = new Array(n).fill(nan);
  
    for (let i = 0; i < n; i++) {
      if (isNa(ma[i]) || isNa(stdev[i])) continue;
      dev[i] = stdev[i] * ndev;
      bu[i] = ma[i] + dev[i];
      bd[i] = ma[i] - dev[i];
      bw[i] = bu[i] - bd[i];
    }
  
    const buh = highestSeries(bu, per);
    const bdl = lowestSeries(bd, per);
  
    const brng = new Array(n).fill(nan);
    const sqp = new Array(n).fill(nan);
    const sqz = new Array(n).fill(false); // Pine bool series default false-ish in your code
  
    for (let i = 0; i < n; i++) {
      if (isNa(buh[i]) || isNa(bdl[i]) || isNa(bw[i])) {
        // sqp stays NaN; sqz = (sqp < sr) ? true : false
        // when NaN: (NaN < sr) => false in JS (but Pine yields na, ternary -> else false)
        sqz[i] = false;
        continue;
      }
      brng[i] = buh[i] - bdl[i];
  
      // IMPORTANT: match your v5 Pine EXACTLY: sqp = 100.0 * bw / brng (no protection)
      // JS: division by 0 => Infinity; Pine often gives na. To mimic Pine-ternary behavior:
      // If brng==0, force NaN so sqz becomes false (like Pine na -> else false)
      if (brng[i] === 0) {
        sqp[i] = nan;
        sqz[i] = false;
      } else {
        sqp[i] = 100.0 * bw[i] / brng[i];
        // sqz = (sqp < sr) ? true : false
        sqz[i] = (sqp[i] < sr) ? true : false;
      }
    }
  
    // --- Squeeze Box
    const highestSrc = highestSeries(src, per);
    const lowestSrc = lowestSeries(src, per);
  
    const boxh = new Array(n).fill(nan);
    const boxl = new Array(n).fill(nan);
  
    for (let i = 0; i < n; i++) {
      // boxh = sqz ? highest(src, per) : src
      boxh[i] = sqz[i] ? highestSrc[i] : src[i];
      boxl[i] = sqz[i] ? lowestSrc[i] : src[i];
    }
  
    // --- KEY: your hand-written v2-like valuewhen(sqz, box?, 1)
    // var last_boxh, prev_boxh, last_boxl, prev_boxl
    // if sqz:
    //   prev_boxh := last_boxh
    //   last_boxh := boxh
    //   ...
    // bh = prev_boxh; bl = prev_boxl
    const bh = new Array(n).fill(nan);
    const bl = new Array(n).fill(nan);
  
    let last_boxh = nan;
    let prev_boxh = nan;
    let last_boxl = nan;
    let prev_boxl = nan;
  
    for (let i = 0; i < n; i++) {
      if (sqz[i]) {
        prev_boxh = last_boxh;
        last_boxh = boxh[i];
        prev_boxl = last_boxl;
        last_boxl = boxl[i];
      }
      bh[i] = prev_boxh;
      bl[i] = prev_boxl;
    }
  
    return {
      src,
      ma,
      bu,
      bd,
      bw,
      buh,
      bdl,
      brng,
      sqp,
      sqz,
      boxh,
      boxl,
      bh,
      bl,
    };
  }
  
  /**
   * Convenience: return latest bar values like your TODO shape.
   */
  function calculateLatestSqueezeBox(klineData, params = {}) {
    const s = calculateSqueezeBoxV5Series(klineData, params);
    if (!s) return null;
    const i = s.src.length - 1;
    return {
      basis: s.ma[i],
      bh: s.bh[i],
      bl: s.bl[i],
      sqz: s.sqz[i],
      sqp: s.sqp[i],
    };
  }
  
