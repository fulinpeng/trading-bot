const { evaluateStrategy } = require("../../test-superTrend_swim_free.js");
const { getDate } = require("../../../utils/functions.js");

process.on("message", async (message) => {
    if (message.action === "evaluate") {
        const { params, symbol, childId } = message.params || {}; // 接收 symbol, params 和 childId 参数
        const result = await evaluateStrategy(params, true); // 使用 symbol 和 params 调用 evaluateStrategy

        if (result.testMoney>300 || (result.winRate>0.4 && result.testMoney > 100 && result.maxMoney-result.testMoney<30) || (result.testMoney>100 && result.winRate > 0.5)) {
        	process.stdout.write(`${symbol} ${JSON.stringify(params)}\r`);
        	process.send({qualified: true, solution: {params, results: [result]}, childId});
        } else {
        	// 验证不合格
        	process.send({qualified: false, childId});
        }
        // if (result.testMoney > 0) {
        //     process.stdout.write(`${symbol} ${JSON.stringify(params)}\r`);

        //     // 进一步验证
        //     const results = validateOneMore(params);
        //     if (results && results.length) {
        //         // 进一步验证，通过
        //         process.send({
        //             qualified: true,
        //             solution: { params, results },
        //             childId,
        //         });
        //     } else {
        //         // 进一步验证，验证不合格
        //         process.send({ qualified: false, childId });
        //     }
        // } else {
        //     // 验证不合格
        //     process.send({ qualified: false, childId });
        // }
    }
});

// 验证最优参数在不同 targetTimeNum 值下的表现
async function validateOneMore(bestParams) {
    let finalRes = [];
    let strtime = "2024/06/01 00:00:00";
    let date = new Date(strtime);
    let month = 24 * 60 * 60 * 1000 * 30; // 一个月
    let total = 12; // 从 2024-06 到 2025-06 共12个月
    let timeStamp = date.valueOf() + month * total;
    // 到这来会高效一些，递减时间戳
    for (let i = 0; i <= total; i++) {
        let targetTime = getDate(timeStamp - month * i); // 每次递增一个月
        const paramsWithTargetTimeDis = { ...bestParams, targetTime };
        const evaluation = await evaluateStrategy(paramsWithTargetTimeDis);

        // Math.abs(evaluation.minMoney) > evaluation.testMoney
        if (evaluation.testMoney < 0) {
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
