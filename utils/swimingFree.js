function cacleSwimingFree(src, rngPer = 50, rngQty = 2.5) {
    if (src.length < rngPer * 2) throw new Error("数据长度不足");
    

    const ema = (data, period) => {
        let k = 2 / (period + 1);
        return data.reduce((acc, val, i) => {
            if (i === 0) acc.push(val);
            else acc.push(val * k + acc[i - 1] * (1 - k));
            return acc;
        }, []);
    };

    const diff = src.slice(1).map((v, i) => Math.abs(v - src[i]));
    const ema1 = ema(diff, rngPer);
    const ema2 = ema(ema1, rngPer * 2 - 1);
    const rngSize = ema2[ema2.length - 1] * rngQty;

    const x = src[src.length - 1];
    const prev = src[src.length - 2];
    let filt = prev;
    if (x - rngSize > prev) filt = x - rngSize;
    else if (x + rngSize < prev) filt = x + rngSize;

    const hiBand = filt + rngSize;
    const loBand = filt - rngSize;

    const fdir = filt > prev ? 1 : filt < prev ? -1 : 0;
    const upward = fdir === 1;
    const downward = fdir === -1;

    const longCond = (x > filt && x > prev && upward) || (x > filt && x < prev && upward);
    const shortCond = (x < filt && x < prev && downward) || (x < filt && x > prev && downward);

    return {
        filt,
        hiBand,
        loBand,
        trend: upward ? "up" : downward ? "down" : "flat",
        longCondition: longCond,
        shortCondition: shortCond
    };
}

module.exports = {
    cacleSwimingFree,
};
