const { convertToRenko } = require("../../utils/renko.js");
const fs = require("fs");

let symbol = process.argv[2];
let time = process.argv[3];
let brickSize = process.argv[4];

// 检查参数是否提供正确
if (!symbol) {
    console.error("请提供symbol");
    process.exit(1);
}
if (!time) {
    console.error("请提供时间级别");
    process.exit(1);
}
if (!brickSize) {
    console.error("请提供砖块高度");
    process.exit(1);
}

let { kLineData: originLineData } = require(`../../tests/source/${symbol}-${time}.js`);
let kLineData = [];
let preRenkoClose = null;
let preRenkoData = null;
originLineData.forEach((v, i) => {
    let  {open, high, low, close, volume, openTime, closeTime} = v;
    let splitV = [v];
    volume = volume / 3;
    if (close > open) {
        splitV = [
            {
                ...v,
                open: open,
                close: low,
                volume,
                openTime: openTime + 1,
                closeTime: closeTime + 1,
            },
            {
                ...v,
                open: low,
                close: high,
                volume,
                openTime: openTime + 2,
                closeTime: closeTime + 2,
            },
            {
                ...v,
                open: high,
                close: close,
                volume,
                openTime: openTime + 3,
                closeTime: closeTime + 3,
            },
        ]
    } else {
        splitV = [
            {
                ...v,
                open: open,
                close: high,
                volume,
                openTime: openTime + 1,
                closeTime: closeTime + 1,
            },
            {
                ...v,
                open: high,
                close: low,
                volume,
                openTime: openTime + 2,
                closeTime: closeTime + 2,
            },
            {
                ...v,
                open: low,
                close: close,
                volume,
                openTime: openTime + 3,
                closeTime: closeTime + 3,
            },
        ]
    }
    splitV.forEach((v, i) => {
        const { renkoData, newRenkoClose, newRenkoData } = convertToRenko({
            klineData: v,
            brickSize,
            preRenkoClose,
            preRenkoData,
        });
        preRenkoClose = newRenkoClose;
        preRenkoData = newRenkoData;
        renkoData.length && kLineData.push(...renkoData.map((v) => ({ ...v, openTime: v.openTime + i, closeTime: v.closeTime + i })));
    })
});

writeInFile(`./tests/source/renko-${symbol}-${time}.js`, {
    kLineData,
});

function writeInFile(fileName, data) {
    fs.writeFileSync(fileName, `module.exports =  ${JSON.stringify(data, null, 2)}`, {
        flag: "w",
    });
}
