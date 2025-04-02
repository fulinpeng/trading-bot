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
let lastRenkoClose = null;
originLineData.forEach((v, i) => {
    let  {open, high, low, close, volume} = v;
    let splitV = [v];
    volume = volume / 3;
    if (close > open) {
        splitV = [
            {
                ...v,
                open: open,
                close: low,
                volume,
            },
            {
                ...v,
                open: low,
                close: high,
                volume,
            },
            {
                ...v,
                open: high,
                close: close,
                volume,
            },
        ]
    } else {
        splitV = [
            {
                ...v,
                open: open,
                close: high,
                volume,
            },
            {
                ...v,
                open: high,
                close: low,
                volume,
            },
            {
                ...v,
                open: low,
                close: close,
                volume,
            },
        ]
    }
    splitV.forEach(v => {
        const { renkoData, newLastRenkoClose, preRenkoData, updatePre } = convertToRenko({
            klineData: v,
            brickSize,
            lastRenkoClose,
        });
        lastRenkoClose = newLastRenkoClose;
        renkoData.length && kLineData.push(...renkoData);
        if (updatePre) {
            kLineData[kLineData.length - 1] = preRenkoData;
        }
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
