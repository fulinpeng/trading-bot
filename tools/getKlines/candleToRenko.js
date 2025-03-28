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
    const  {open, high, low, close, volume} = v;
    let splitV = [v];
    if (close > open) {
        splitV = [
            {
                ...v,
                open: open,
                close: low,
            },
            {
                ...v,
                open: low,
                close: high,
            },
            {
                ...v,
                open: high,
                close: close,
                isNewLine: true,
            },
        ]
    } else {
        splitV = [
            {
                ...v,
                open: open,
                close: high,
            },
            {
                ...v,
                open: high,
                close: low,
            },
            {
                ...v,
                open: low,
                close: close,
                isNewLine: true,
            },
        ]
    }
    splitV.forEach(v => {
        const { renkoData, newLastRenkoClose } = convertToRenko({
            klineData: v,
            brickSize,
            lastRenkoClose,
        });
        lastRenkoClose = newLastRenkoClose;
        renkoData.length && kLineData.push(...renkoData);
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
