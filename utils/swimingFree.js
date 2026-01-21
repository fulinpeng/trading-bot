/**
 * Range Filter (swimingFree) 指标计算
 * 完全按照 Pine Script 的逻辑实现，逐根K线计算
 */

/**
 * EMA 计算器类（逐根K线更新，与 Pine Script 的 ta.ema 完全一致）
 */
class EMACalculator {
    constructor(period) {
        this.period = period;
        this.multiplier = 2 / (period + 1);
        this.values = [];
        this.emaValue = null;
        this.smaSum = 0;
        this.smaCount = 0;
    }

    /**
     * 添加新值并更新 EMA
     * @param {number} value - 新值
     * @returns {number|null} - EMA 值，如果数据不足返回 null
     */
    update(value) {
        this.values.push(value);
        
        // 如果还没有足够的值计算 SMA，累加
        if (this.smaCount < this.period) {
            this.smaSum += value;
            this.smaCount++;
            
            // 如果已经有足够的值，计算初始 SMA
            if (this.smaCount === this.period) {
                this.emaValue = this.smaSum / this.period;
                return this.emaValue;
            }
            
            return null;
        }
        
        // 已经有足够的值，使用 EMA 公式更新
        // EMA = (value - prevEMA) * multiplier + prevEMA
        this.emaValue = (value - this.emaValue) * this.multiplier + this.emaValue;
        return this.emaValue;
    }

    /**
     * 获取当前 EMA 值
     * @returns {number|null}
     */
    getValue() {
        return this.emaValue;
    }
}

/**
 * 计算 Range Filter 指标（使用 EMA）
 * 完全按照 Pine Script 的逻辑实现，逐根K线计算
 * @param {Array} data - K线数据数组，每个元素包含 {close}
 * @param {number} rngPer - Range Period，默认60
 * @param {number} rngQty - Range Multiplier，默认2.5
 * @returns {Object} - { filt, hiBand, loBand, trend, longCondition, shortCondition }
 */
function cacleSwimingFreeEma(data, rngPer = 60, rngQty = 2.5) {
    // Range Filter 需要足够的数据：
    // - rng_per = 60，需要 60 个 absDiff 值来计算第一个 avrng
    // - wper = (60 * 2) - 1 = 119，需要 119 个 avrng 值来计算第一个 AC
    // - 所以至少需要 60 + 119 = 179 根K线（因为 absDiff 从第二根K线开始）
    const wper = (rngPer * 2) - 1;
    const minRequired = rngPer + wper + 1; // 60 + 119 + 1 = 180
    if (!Array.isArray(data) || data.length < minRequired) {
        throw new Error(`输入数据不足：需要至少 ${minRequired} 根K线，但只有 ${data.length} 根`);
    }
    
    const src = data.map((item) => parseFloat(item.close));
    
    // === 逐根K线计算 rng_size（与 Pine Script 完全一致）===
    // Pine Script: rng_size(x, qty, n) =>
    //   wper = (n * 2) - 1
    //   avrng = ta.ema(math.abs(x - x[1]), n)
    //   AC = ta.ema(avrng, wper) * qty
    
    // 创建 EMA 计算器
    const avrngEMA = new EMACalculator(rngPer);  // 用于计算 avrng
    const acEMA = new EMACalculator(wper);       // 用于计算 AC
    
    const rngSizeArr = [0]; // 第一根K线没有前一根，rng_size 为 0
    const avrngArr = [];    // 存储每根K线的 avrng 值
    
    // 逐根K线计算
    for (let i = 1; i < src.length; i++) {
        // 计算 abs(x - x[1])
        const absDiff = Math.abs(src[i] - src[i - 1]);
        
        // 更新 avrng EMA
        const avrng = avrngEMA.update(absDiff);
        
        if (avrng === null) {
            // 如果还没有足够的值计算 avrng，rng_size 为 0
            rngSizeArr.push(0);
            continue;
        }
        
        // 保存 avrng 值
        avrngArr.push(avrng);
        
        // 更新 AC EMA（使用 avrng 值）
        const AC = acEMA.update(avrng);
        
        if (AC === null) {
            // 如果还没有足够的值计算 AC，rng_size 为 0
            rngSizeArr.push(0);
            continue;
        }
        
        // 计算 rng_size = AC * qty
        rngSizeArr.push(AC * rngQty);
    }

    // === 计算 rng_filt（与 Pine Script 完全一致）===
    // Pine Script: rng_filt(x, rng_, n) =>
    //   var rfilt = array.new_float(2, x)  // 初始化为 [x, x]
    //   array.set(rfilt, 1, array.get(rfilt, 0))  // 更新第二个元素为第一个元素
    //   if x - r > array.get(rfilt, 1) array.set(rfilt, 0, x - r)
    //   if x + r < array.get(rfilt, 1) array.set(rfilt, 0, x + r)
    //   注意：这是两个独立的 if 语句，不是 else if
    
    // 对应 Pine Script 的 var rfilt = array.new_float(2, x)
    let rfilt0 = src[0]; // rfilt[0]
    let rfilt1 = src[0]; // rfilt[1]
    const filtArr = [src[0]];
    
    // === 计算 fdir（与 Pine Script 完全一致）===
    // Pine Script: var float fdir = na
    //             fdir := filt > filt[1] ? 1 : filt < filt[1] ? -1 : fdir
    let fdir = null; // 初始值为 null（对应 Pine Script 的 na）
    const fdirArr = [fdir];
    
    // === 计算 CondIni（与 Pine Script 完全一致）===
    // Pine Script: var int CondIni = 0
    //             CondIni := longCond ? 1 : shortCond ? -1 : CondIni[1]
    let condIni = 0;
    const condIniArr = [condIni];

    // 逐根K线计算（与 Pine Script 完全一致）
    for (let i = 1; i < src.length; i++) {
        const x = src[i];
        const r = rngSizeArr[i] || 0;

        // Pine Script: array.set(rfilt, 1, array.get(rfilt, 0))
        rfilt1 = rfilt0;
        
        // Pine Script: if x - r > array.get(rfilt, 1) array.set(rfilt, 0, x - r)
        //            if x + r < array.get(rfilt, 1) array.set(rfilt, 0, x + r)
        // 注意：这是两个独立的 if 语句，不是 else if
        if (x - r > rfilt1) {
            rfilt0 = x - r;
        }
        if (x + r < rfilt1) {
            rfilt0 = x + r;
        }
        // 如果两个条件都不满足，rfilt0 保持不变（已经是 rfilt1）
        
        const filt = rfilt0;
        filtArr.push(filt);

        // 计算 fdir
        // Pine Script: fdir := filt > filt[1] ? 1 : filt < filt[1] ? -1 : fdir
        const lastFilt = filtArr[i - 1];
        if (filt > lastFilt) {
            fdir = 1;
        } else if (filt < lastFilt) {
            fdir = -1;
        }
        // 否则保持上一根的值（fdir 不变）
        fdirArr.push(fdir);

        // 计算 longCond 和 shortCond
        // Pine Script:
        // longCond = (rng_src > filt and rng_src > rng_src[1] and upward > 0) or (rng_src > filt and rng_src < rng_src[1] and upward > 0)
        // shortCond = (rng_src < filt and rng_src < rng_src[1] and downward > 0) or (rng_src < filt and rng_src > rng_src[1] and downward > 0)
        const upward = fdir === 1 ? 1 : 0;
        const downward = fdir === -1 ? 1 : 0;
        
        const longCond = (x > filt && x > src[i - 1] && upward > 0) || (x > filt && x < src[i - 1] && upward > 0);
        const shortCond = (x < filt && x < src[i - 1] && downward > 0) || (x < filt && x > src[i - 1] && downward > 0);
        
        // 计算 CondIni
        // Pine Script: CondIni := longCond ? 1 : shortCond ? -1 : CondIni[1]
        if (longCond) {
            condIni = 1;
        } else if (shortCond) {
            condIni = -1;
        }
        // 否则保持上一根的值（condIni 不变）
        condIniArr.push(condIni);
    }

    // 获取最新值
    const i = src.length - 1;
    const filt = filtArr[i];
    const r = rngSizeArr[i] || 0;
    const hiBand = filt + r;
    const loBand = filt - r;
    const finalFdir = fdirArr[i];
    const upward = finalFdir === 1 ? 1 : 0;
    const downward = finalFdir === -1 ? 1 : 0;

    // 计算 longCondition 和 shortCondition
    // Pine Script:
    // longCondition = longCond and CondIni[1] == -1
    // shortCondition = shortCond and CondIni[1] == 1
    const longCond = (src[i] > filt && src[i] > src[i - 1] && upward > 0) || (src[i] > filt && src[i] < src[i - 1] && upward > 0);
    const shortCond = (src[i] < filt && src[i] < src[i - 1] && downward > 0) || (src[i] < filt && src[i] > src[i - 1] && downward > 0);
    const longCondition = longCond && condIniArr[i - 1] === -1;
    const shortCondition = shortCond && condIniArr[i - 1] === 1;

    return {
        filt, // 当前过滤后的价格（主线）
        hiBand, // 上轨线（主线+波动范围）
        loBand, // 下轨线（主线-波动范围）
        trend: finalFdir === 1 ? "up" : finalFdir === -1 ? "down" : "flat", // 当前趋势方向：up=上涨，down=下跌，flat=震荡
        longCondition, // 做多条件是否成立（用于开多仓）
        shortCondition // 做空条件是否成立（用于开空仓）
    };
}

/**
 * 计算 Range Filter 指标（使用 WMA）
 * 注意：Pine Script 中使用的是 EMA，这个函数是为了兼容性保留的
 */
function cacleSwimingFreeWma(data, rngPer = 50, rngQty = 2.5) {
    if (!Array.isArray(data) || data.length < rngPer + 2) {
        throw new Error("输入数据不足");
    }
    const src = data.map((item) => parseFloat(item.close));
    const wma = (arr, period) => {
        const result = [];
        const weightSum = (period * (period + 1)) / 2;
        for (let i = 0; i < arr.length; i++) {
            if (i < period - 1) {
                result.push(NaN);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += arr[i - j] * (period - j);
            }
            result.push(sum / weightSum);
        }
        return result;
    };

    const absDiff = [];
    for (let i = 1; i < src.length; i++) {
        absDiff.push(Math.abs(src[i] - src[i - 1]));
    }
    absDiff.unshift(absDiff[0]);

    const wma1 = wma(absDiff, rngPer);
    while (wma1.length < src.length) wma1.unshift(wma1[0]);
    const wma2 = wma(wma1, (rngPer * 2) - 1);
    while (wma2.length < src.length) wma2.unshift(wma2[0]);
    const rngSizeArr = wma2.map(x => (typeof x === 'number' && !isNaN(x) ? x : 0) * rngQty);

    let rfiltArr = [src[0], src[0]];
    let filtArr = [src[0]];
    let fdirArr = [0];
    let condIniArr = [0];

    for (let i = 1; i < src.length; i++) {
        const x = src[i];
        const r = rngSizeArr[i];

        rfiltArr[1] = rfiltArr[0];
        if (x - r > rfiltArr[1]) {
            rfiltArr[0] = x - r;
        } else if (x + r < rfiltArr[1]) {
            rfiltArr[0] = x + r;
        } else {
            rfiltArr[0] = rfiltArr[1];
        }
        const filt = rfiltArr[0];
        filtArr.push(filt);

        const lastFilt = filtArr[i - 1];
        let fdir = fdirArr[i - 1];
        if (filt > lastFilt) fdir = 1;
        else if (filt < lastFilt) fdir = -1;
        fdirArr.push(fdir);

        let longCond = ((x > filt && x > src[i - 1] && fdir === 1) || (x > filt && x < src[i - 1] && fdir === 1));
        let shortCond = ((x < filt && x < src[i - 1] && fdir === -1) || (x < filt && x > src[i - 1] && fdir === -1));
        let condIni = condIniArr[i - 1];
        if (longCond) condIni = 1;
        else if (shortCond) condIni = -1;
        condIniArr.push(condIni);
    }

    const i = src.length - 1;
    const filt = filtArr[i];
    const hiBand = filt + (rngSizeArr[i] || 0);
    const loBand = filt - (rngSizeArr[i] || 0);
    const finalFdir = fdirArr[i];
    const upward = finalFdir === 1;
    const downward = finalFdir === -1;

    const longCond = ((src[i] > filt && src[i] > src[i - 1] && upward) || (src[i] > filt && src[i] < src[i - 1] && upward));
    const shortCond = ((src[i] < filt && src[i] < src[i - 1] && downward) || (src[i] < filt && src[i] > src[i - 1] && downward));
    const longCondition = longCond && condIniArr[i - 1] === -1;
    const shortCondition = shortCond && condIniArr[i - 1] === 1;

    return {
        filt, // 当前过滤后的价格（主线）
        hiBand, // 上轨线（主线+波动范围）
        loBand, // 下轨线（主线-波动范围）
        trend: upward ? "up" : downward ? "down" : "flat", // 当前趋势方向：up=上涨，down=下跌，flat=震荡
        longCondition, // 做多条件是否成立（用于开多仓）
        shortCondition // 做空条件是否成立（用于开空仓）
    };
}

module.exports = {
    cacleSwimingFreeEma,
    cacleSwimingFreeWma
};
