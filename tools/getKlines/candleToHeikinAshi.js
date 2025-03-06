const {convertToHeikinAshiArr} = require("../../utils/heikinAshi.js");
const fs = require("fs");

let symbol = process.argv[2];
let time = process.argv[3];

// 检查参数是否提供正确
if (!symbol) {
    console.error("请提供symbol");
    process.exit(1);
}
if (!time) {
    console.error("请提供时间级别");
    process.exit(1);
}

let {kLineData: originLineData} = require(`../../tests/source/${symbol}-${time}.js`);
let kLineData = convertToHeikinAshiArr(originLineData);

writeInFile(`./tests/source/heikinAshi-${symbol}-${time}.js`, {
    kLineData,
});

function writeInFile(fileName, data) {
    fs.writeFileSync(fileName, `module.exports =  ${JSON.stringify(data, null, 2)}`, {
        flag: "w",
    });
}
