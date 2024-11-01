const fs = require("fs");
const path = require("path");

// 设定每个子文件的数据条数，以确保大小不超过90MB
const maxFileSize = 98 * 1024 * 1024; // 90MB

console.log("🚀process.argv:", process.argv);

let baseFileName = process.argv[2]; // 基础文件名

// 读取大文件
const largeFilePath = path.resolve(__dirname, `tests/source/${baseFileName}.js`);
const largeFile = require(largeFilePath);

// 目标输出目录
const outputDir = path.resolve(__dirname, `tests/source/splitData`);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// 拆分kLineData数据
const kLineData = largeFile.kLineData;
let fileIndex = 1;
let currentFileSize = 0;
let currentData = [];

// 保存数据到子文件
function saveToFile(index, data) {
    const fileName = path.join(outputDir, `${baseFileName}_part_${index}.js`);
    const content = `module.exports = {\n  "kLineData": ${JSON.stringify(data, null, 2)}\n};\n`;
    fs.writeFileSync(fileName, content, "utf8");
    console.log(`子文件 ${fileName} 已保存`);
}

for (let i = 0; i < kLineData.length; i++) {
    const dataEntry = kLineData[i];
    const dataSize = Buffer.byteLength(JSON.stringify(dataEntry), "utf8");

    // 如果当前文件大小超过限制，保存并创建新文件
    if (currentFileSize + dataSize > maxFileSize) {
        saveToFile(fileIndex, currentData);
        fileIndex++;
        currentData = [];
        currentFileSize = 0;
    }

    currentData.push(dataEntry);
    currentFileSize += dataSize;
}

// 保存最后一批数据
if (currentData.length > 0) {
    saveToFile(fileIndex, currentData);
}

// 创建主文件，整合所有子文件
const mainFileContent = `
module.exports = {
  "kLineData": [].concat(
    ${Array.from(
        { length: fileIndex },
        (_, i) => `require('./splitData/${baseFileName}_part_${i + 1}.js').kLineData`,
    ).join(",\n    ")}
  )
};
`;

const mainFilePath = path.resolve(__dirname, largeFilePath);
fs.writeFileSync(mainFilePath, mainFileContent, "utf8");
console.log("主文件 combinedDataFile.js 已生成，引用所有子文件");
