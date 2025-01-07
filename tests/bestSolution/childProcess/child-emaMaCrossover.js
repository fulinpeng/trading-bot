const {evaluateStrategy}=require("../../test-emaMaCrossover-1.0.js");
const {getDate}=require("../../../utils/functions.js");

process.on("message", (message) => {
	if (message.action==="evaluate") {
		const {params, symbol, childId}=message.params||{}; // 接收 symbol, params 和 childId 参数
		const result=evaluateStrategy(params, true); // 使用 symbol 和 params 调用 evaluateStrategy

		// if (result.testMoney>0) {
		// 	process.stdout.write(`${symbol} ${JSON.stringify(params)}\r`);
		// 	process.send({qualified: true, solution: {params, results: [result]}, childId});
		// } else {
		// 	// 验证不合格
		// 	process.send({qualified: false, childId});
		// }
		if (result.testMoney>500) {
			process.stdout.write(`${symbol} ${JSON.stringify(params)}\r`);

			// 进一步验证
			const results=validateOneMore(params);
			if (results&&results.length) {
				// 进一步验证，通过
				process.send({qualified: true, solution: {params, results}, childId});
			} else {
				// 进一步验证，验证不合格
				process.send({qualified: false, childId});
			}
		} else {
			// 验证不合格
			process.send({qualified: false, childId});
		}
	}
});

// 验证最优参数在不同 targetTimeNum 值下的表现
function validateOneMore(bestParams) {
	let finalRes=[];
	let strtime="2023/06/01 00:00:00";
	let date=new Date(strtime);
	let week=24*60*60*1000*7; // 一周
	let total=68; // 从 2023-06-01 到 2024-09-01 共60周
	let timeStamp=date.valueOf()+week*total;
	// 到这来会高效一些，递减时间戳
	for (let i=0;i<=total;i++) {
		let targetTime=getDate(timeStamp-week*i); // 每次递增一周
		const paramsWithTargetTimeDis={...bestParams, targetTime};
		const evaluation=evaluateStrategy(paramsWithTargetTimeDis);

		// Math.abs(evaluation.minMoney) > evaluation.testMoney
		if (evaluation.testMoney<0) {
			// 直接返回 null 表示验证失败，不再进行后续验证
			return null;
		} else {
			finalRes.push({
				timeRange: evaluation.timeRange,
				testMoney: evaluation.testMoney,
				maxMoney: evaluation.maxMoney,
				minMoney: evaluation.minMoney,
			});
		}
	}

	return finalRes;
}
