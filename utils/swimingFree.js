function cacleSwimingFreeEma(data, rngPer = 50, rngQty = 2.5) {
    if (!Array.isArray(data) || data.length < rngPer * 2) {
        console.log("🚀 ~ cacleSwimingFreeEma ~ data.length:", Array.isArray(data), data.length)
        throw new Error("输入数据不足");
    }
    const src = data.map((item) => item.close);
    const ema = (data, period) => {
        const k = 2 / (period + 1);
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                result.push(data[i]);
            } else {
                const prev = result[i - 1];
                result.push(data[i] * k + prev * (1 - k));
            }
        }
        return result;
    };

    const absDiff = [];
    for (let i = 1; i < src.length; i++) {
        absDiff.push(Math.abs(src[i] - src[i - 1]));
    }
    absDiff.unshift(absDiff[0]);

    const ema1 = ema(absDiff, rngPer);
    while (ema1.length < src.length) ema1.unshift(ema1[0]);
    const ema2 = ema(ema1, (rngPer * 2) - 1);
    while (ema2.length < src.length) ema2.unshift(ema2[0]);
    const rngSizeArr = ema2.map(x => (typeof x === 'number' && !isNaN(x) ? x : 0) * rngQty);

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
    const hiBand = filt + rngSizeArr[i];
    const loBand = filt - rngSizeArr[i];
    const fdir = fdirArr[i];
    const upward = fdir === 1;
    const downward = fdir === -1;

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


function cacleSwimingFreeWma(data, rngPer = 50, rngQty = 2.5) {
    if (!Array.isArray(data) || data.length < rngPer + 2) {
        throw new Error("输入数据不足");
    }
    const src = data.map((item) => item.close);
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
    const hiBand = filt + rngSizeArr[i];
    const loBand = filt - rngSizeArr[i];
    const fdir = fdirArr[i];
    const upward = fdir === 1;
    const downward = fdir === -1;

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
