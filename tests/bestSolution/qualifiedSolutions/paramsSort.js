const fs=require("fs");
const path=require("path");

let symbol=process.argv[2];

// 检查参数是否提供正确
if (!symbol) {
	console.error("请提供symbol");
	process.exit(1);
}
const qualifiedSolutionsPath=path.join(__dirname, `${symbol}.js`);
const outputPath=path.join(__dirname, `output-${symbol}.js`);
const {qualifiedSolutions}=require(qualifiedSolutionsPath);

const newQualifiedSolutions=qualifiedSolutions.filter((item) => {
	let result=item.result||item.results||[];
	if (result[result.length-1].testMoney<=400) {
		return false;
	}
	// 是否需要忽略了最后一个，忽略了最后一个，因为最后一个是最新的，不一定准确
	for (let i=1;i<=result.length-1;i++) {
		if (Math.abs(result[i].minMoney)>Math.abs(result[i].maxMoney)) {
			return false;
		}

		if (Math.abs(result[i].minMoney)>result[i].testMoney) {
			return false;
		}
	}
	return true;
});

function saveQualifiedSolutions(newSolutions) {
	let originSolutions=loadExistingQualifiedSolutions();
	let existingSolutions=[];

	newSolutions.forEach((item) => {
		if (!existingSolutions.some((solution) => areSolutionsEqual(solution.params, item.params))) {
			existingSolutions.push(item);
		}
	});

	console.log("🚀 ~ 未过滤，过滤::", qualifiedSolutions.length, newSolutions.length);

	let allSolutions=[...originSolutions, ...existingSolutions].sort((a, b) => {
		let resulta=a.result||a.results||[];
		let resultb=b.result||b.results||[];
		let aRatial=resulta.reduce((sum, cur) => sum+Math.abs(cur.testMoney/cur.minMoney), 0)/resulta.length;
		let bRatial=resultb.reduce((sum, cur) => sum+Math.abs(cur.testMoney/cur.minMoney), 0)/resultb.length;
		// let aRatial = resulta.reduce((sum, cur) => sum + Math.abs(cur.maxMoney / cur.minMoney), 0) / resulta.length;
		// let bRatial = resultb.reduce((sum, cur) => sum + Math.abs(cur.maxMoney / cur.minMoney), 0) / resultb.length;
		// let aRatial = resulta.reduce((sum, cur) => sum + Math.abs(cur.maxMoney / cur.minMoney) + Math.abs(cur.testMoney / cur.minMoney), 0) / resulta.length;
		// let bRatial = resultb.reduce((sum, cur) => sum + Math.abs(cur.maxMoney / cur.minMoney) + Math.abs(cur.testMoney / cur.minMoney), 0) / resultb.length;
		// let aRatial = resulta.reduce((sum, cur) => sum + cur.minMoney, 0) / resulta.length;
		// let bRatial = resultb.reduce((sum, cur) => sum + cur.minMoney, 0) / resultb.length;
		// let aRatial = resulta.reduce((sum, cur) => sum + cur.testMoney, 0) / resulta.length;
		// let bRatial = resultb.reduce((sum, cur) => sum + cur.testMoney, 0) / resultb.length;
		return bRatial-aRatial;
	});
	fs.writeFileSync(outputPath, `module.exports = { qualifiedSolutions: ${JSON.stringify(allSolutions, null, 2)} }`);
}

// 加载已存在的合格解决方案
function loadExistingQualifiedSolutions() {
	if (fs.existsSync(outputPath)) {
		const data=require(outputPath);
		return data.qualifiedSolutions||[];
	}
	return [];
}
// 检查两个解决方案是否相等
function areSolutionsEqual(solutionA, solutionB) {
	return (
		solutionA.howManyCandle===solutionB.howManyCandle&&
		solutionA.isProfitRun===solutionB.isProfitRun&&
		solutionA.firstProtectProfitRate===solutionB.firstProtectProfitRate&&
		solutionA.firstStopLossRate===solutionB.firstStopLossRate&&
		solutionA.profitProtectRate===solutionB.profitProtectRate&&
		solutionA.howManyCandleForProfitRun===solutionB.howManyCandleForProfitRun&&
		solutionA.maxStopLossRate===solutionB.maxStopLossRate&&
		solutionA.invalidSigleStopRate===solutionB.invalidSigleStopRate&&
		solutionA.double===solutionB.double&&
		solutionA.maxLossCount===solutionB.maxLossCount&&
		solutionA.emaPeriod===solutionB.emaPeriod&&
		solutionA.smaPeriod===solutionB.smaPeriod&&
		solutionA.rsiPeriod===solutionB.rsiPeriod
	);
}

saveQualifiedSolutions(newQualifiedSolutions);
