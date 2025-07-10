const fs = require('fs');
const path = require('path');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { convertToRenko } = require('../../utils/renko.js');

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

// 原始 JS 文件路径
const inFile = path.resolve(__dirname, `../../tests/source/${symbol}-${time}.js`);
// 目标 JSON 文件路径
const tempJsonFile = path.resolve(__dirname, `../../tests/source/${symbol}-${time}.json`)

try {
    // 动态引入模块
    const raw = require(inFile);
    // 检查 kLineData 是否存在且为数组
    if (!Array.isArray(raw.kLineData)) {
        throw new Error('kLineData 字段不存在或不是数组');
    }

    // 写入 JSON 文件
    fs.writeFileSync(tempJsonFile, JSON.stringify(raw.kLineData, null, 2));
    console.log(`✅ 从${inFile}提取kLineData成功：已保存为 ${tempJsonFile}`);
} catch (err) {
    console.error(`❌ 提取失败: ${err.message}`);
    process.exit(1);
}

const outFile = path.resolve(__dirname, `../../tests/source/renko-${symbol}-${time}.js`);

// 如果文件已存在，先删除
delTempJsonFile(outFile)

const ws = fs.createWriteStream(outFile, { flags: 'w' });

// 写入文件头
ws.write('module.exports =  {\n"kLineData": [\n');

let isFirst = true;
let preRenkoClose = null, preRenkoData = null, preDirection = null;

let processing = 0;
let ended = false;

function writeWithBackpressure(data) {
    return new Promise((resolve) => {
        if (!ws.write(data)) {
            ws.once('drain', resolve);
        } else {
            resolve();
        }
    });
}

(async () => {
    for await (const { value: v } of fs.createReadStream(tempJsonFile).pipe(parser()).pipe(streamArray())) {
        let { open, high, low, close, volume, openTime, closeTime } = v;
        let splitV = [v];
        volume = volume / 3;
        if (close > open) {
            splitV = [
                { ...v, open: open, close: low, volume, openTime: openTime + 1, closeTime: closeTime + 1 },
                { ...v, open: low, close: high, volume, openTime: openTime + 2, closeTime: closeTime + 2 },
                { ...v, open: high, close: close, volume, openTime: openTime + 3, closeTime: closeTime + 3 },
            ];
        } else {
            splitV = [
                { ...v, open: open, close: high, volume, openTime: openTime + 1, closeTime: closeTime + 1 },
                { ...v, open: high, close: low, volume, openTime: openTime + 2, closeTime: closeTime + 2 },
                { ...v, open: low, close: close, volume, openTime: openTime + 3, closeTime: closeTime + 3 },
            ];
        }
        for (let i = 0; i < splitV.length; i++) {
            const v = splitV[i];
            const { renkoData, newRenkoClose, newRenkoData, newDirection } = convertToRenko({
                klineData: v,
                brickSize: Number(brickSize),
                preRenkoClose,
                preRenkoData,
                preDirection
            });
            preRenkoClose = newRenkoClose;
            preRenkoData = newRenkoData;
            preDirection = newDirection;
            if (renkoData.length) {
                for (const item of renkoData) {
                    const str = (isFirst ? '' : ',\n') + JSON.stringify({ ...item, openTime: item.openTime + i, closeTime: item.closeTime + i });
                    await writeWithBackpressure(str);
                    isFirst = false;
                }
            }
        }
    }
    await writeWithBackpressure('\n]}');
    ws.end();
    console.log('处理完成');
    delTempJsonFile(tempJsonFile);
})();

process.on('uncaughtException', err => {
    delTempJsonFile(tempJsonFile);
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', err => {
    delTempJsonFile(tempJsonFile);
    console.error('Unhandled Rejection:', err);
});

// 删除缓存文件
function delTempJsonFile(file) {
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
    }
}