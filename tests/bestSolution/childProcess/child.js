const {evaluateStrategy} = require("../../test-mading4-6.js");
const {getDate} = require("../../../utils/functions.js");

process.on("message", (message) => {
    if (message.action === "evaluate") {
        const {params, symbol, childId} = message.params || {}; // 接收 symbol, params 和 childId 参数
        // const result = evaluateStrategy(params, true); // 使用 symbol 和 params 调用 evaluateStrategy

        // 假设 testMoney > 0 表示初步合格
        // if (result.testMoney > 100) {
        if (true) {
            process.stdout.write(`${symbol} ${JSON.stringify(params)}\r`);

            // 进一步验证
            const validationResults = validateOneMore(params);
            if (validationResults && validationResults.length) {
                // 只在合格时发送一次结果，并附带 childId
                process.send({
                    qualified: true,
                    solution: {params, result: validationResults},
                    childId,
                });
            } else {
                // 如果进一步验证不合格，也只发送一次不合格的结果，并附带 childId
                process.send({qualified: false, childId});
            }
        } else {
            // 初步验证不通过，发送一次不合格的结果，并附带 childId
            process.send({qualified: false, childId});
        }
    }
});

// 验证最优参数在不同 targetTimeNum 值下的表现
function validateOneMore(bestParams) {
    let finalRes = [];
    let last = 60;
    // 2024-01-11 11:40:00
    // 2024-02-03 10:40:00
    let strtime = "2024-01-01 10:40:00";
    let date = new Date(strtime.replace(/-/g, "/"));
    let timeStamp = date.valueOf();
    let day = 24 * 60 * 60 * 1000;
    for (let i = 1; i <= last; i++) {
        let targetTime = getDate(timeStamp + day * i * 5);
        const paramsWithTargetTimeDis = {...bestParams, targetTime};
        const evaluation = evaluateStrategy(paramsWithTargetTimeDis);

        // || Math.abs(evaluation.minMoney) > evaluation.maxMoney
        if (evaluation.testMoney < -300) {
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

    return finalRes; // 返回验证成功的结果
}
