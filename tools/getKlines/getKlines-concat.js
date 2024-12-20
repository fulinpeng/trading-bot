// https://fapi.binance.com/fapi/v1/klines?symbol=zkUSDT&interval=1m&limit=1440&startTime=1721836800000

const axios = require("axios"); // HTTP请求库
const fs = require("fs");
// const symbol = "tUSDT";
console.log("🚀process.argv:", process.argv);

let symbol = process.argv[2];
// 检查参数是否提供正确
if (!symbol) {
    console.error("请提供symbol");
    process.exit(1);
}
const data1 = require(`./tests/source/${symbol}-1m.js`);
const data2 = require(`./tests/source/${symbol}-1m-2.js`);

function writeInFile(fileName, data) {
    fs.writeFileSync(fileName, `module.exports =  ${JSON.stringify(data)}`, {
        flag: "w",
    });
}

const copy = async (symbol) => {
    console.log("🚀 ~ file: data1.kLineData:", data1.kLineData[data1.kLineData.length - 1]);
    // console.log("🚀 ~ file: getKlines2.js:12 ~ copy ~ data1.kLineData:", data1.kLineData.length);
    console.log("🚀 ~ file: getKlines2.js:12 ~ copy ~ data2.kLineData:", data2.kLineData.length);
    let result = data1.kLineData;
    result = result.concat(data2.kLineData);
    writeInFile(`./tests/source/${symbol}-1m.js`, {
        kLineData: result,
    });
};

copy(symbol);
