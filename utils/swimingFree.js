function cacleSwimingFree(src, rngPer = 50, rngQty = 2.5) {
    if (!Array.isArray(src) || src.length < rngPer + 2) {
        throw new Error("输入数据不足");
    }

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
        hiBand,
        loBand,
        trend: upward ? "up" : downward ? "down" : "flat",
        longCondition,
        shortCondition
    };
}

module.exports = {
    cacleSwimingFree,
};
