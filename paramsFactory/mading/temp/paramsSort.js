const fs = require("fs");
const path = require("path");

let symbol = process.argv[2];

// 检查参数是否提供正确
if (!symbol) {
    console.error("请提供symbol");
    process.exit(1);
}
const qualifiedSolutionsPath = path.join(__dirname, `${symbol}.js`);
const outputPath = path.join(__dirname, `output-${symbol}.js`);
const { qualifiedSolutions } = require(qualifiedSolutionsPath);

const newQualifiedSolutions = qualifiedSolutions.filter((item) => {
    let result = item.result || item.results || [];
    let win = true;
    if (result[0].testMoney <= 500) {
        win = false;
        return win;
    }
    for (let i = 0; i < result.length - 1; i++) {
        if (result[i].testMoney <= result[i + 1].testMoney) {
            win = false;
            break;
        }
        if (Math.abs(result[i].minMoney) > result[i].testMoney) {
            win = false;
            break;
        }
    }
    return win;
});

function saveQualifiedSolutions(newSolutions) {
    let originSolutions = loadExistingQualifiedSolutions();
    let existingSolutions = [];

    newSolutions.forEach((item) => {
        if (!existingSolutions.some((solution) => areSolutionsEqual(solution.params, item.params))) {
            existingSolutions.push(item);
        }
    });

    console.log("🚀 ~ 未过滤，过滤::", qualifiedSolutions.length, newSolutions.length);

    let allSolutions = [...originSolutions, ...existingSolutions].sort((a, b) => {
        let resulta = a.result || a.results || [];
        let resultb = b.result || b.results || [];
        let aRatial = resulta.reduce((sum, cur) => sum + Math.abs(cur.testMoney / cur.minMoney), 0) / resulta.length;
        let bRatial = resultb.reduce((sum, cur) => sum + Math.abs(cur.testMoney / cur.minMoney), 0) / resultb.length;
        // let aRatial = resulta.reduce((sum, cur) => sum + cur.minMoney, 0) / resulta.length;
        // let bRatial = resultb.reduce((sum, cur) => sum + cur.minMoney, 0) / resultb.length;
        // let aRatial = resulta.reduce((sum, cur) => sum + cur.testMoney, 0) / resulta.length;
        // let bRatial = resultb.reduce((sum, cur) => sum + cur.testMoney, 0) / resultb.length;
        return bRatial - aRatial;
    });
    fs.writeFileSync(outputPath, `module.exports = { qualifiedSolutions: ${JSON.stringify(allSolutions, null, 2)} }`);
}

// 加载已存在的合格解决方案
function loadExistingQualifiedSolutions() {
    if (fs.existsSync(outputPath)) {
        const data = require(outputPath);
        return data.qualifiedSolutions || [];
    }
    return [];
}
// 检查两个解决方案是否相等
function areSolutionsEqual(solutionA, solutionB) {
    return (
        solutionA.timeDis === solutionB.timeDis &&
        solutionA.profit === solutionB.profit &&
        solutionA.howManyCandleHeight === solutionB.howManyCandleHeight &&
        solutionA.howManyNumForAvarageCandleHight === solutionB.howManyNumForAvarageCandleHight
    );
}

saveQualifiedSolutions(newQualifiedSolutions);
