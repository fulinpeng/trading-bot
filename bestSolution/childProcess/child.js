const { evaluateStrategy } = require("../../test-mading4-6.js");

process.on("message", (message) => {
    if (message.action === "evaluate") {
        const { params, symbol, childId } = message.params || {}; // 接收 symbol, params 和 childId 参数
        const result = evaluateStrategy(params); // 使用 symbol 和 params 调用 evaluateStrategy

        // 假设 testMoney > 0 表示初步合格
        if (result.testMoney > 0) {
            process.stdout.write(`${symbol} ${JSON.stringify(params)}\r`);

            // 进一步验证
            const validationResults = validateOneMore(params);
            if (validationResults && validationResults.length) {
                // 只在合格时发送一次结果，并附带 childId
                process.send({ qualified: true, solution: { params, result: validationResults }, childId });
            } else {
                // 如果进一步验证不合格，也只发送一次不合格的结果，并附带 childId
                process.send({ qualified: false, childId });
            }
        } else {
            // 初步验证不通过，发送一次不合格的结果，并附带 childId
            process.send({ qualified: false, childId });
        }
    }
});

// 验证最优参数在不同 targetTimeNum 值下的表现
function validateOneMore(bestParams) {
    let finalRes = [];
    for (let targetTimeNum = 4; targetTimeNum <= 9; targetTimeNum++) {
        const paramsWithTargetTimeNum = { ...bestParams, targetTimeNum };
        const evaluation = evaluateStrategy(paramsWithTargetTimeNum);

        if (evaluation.testMoney <= 0 || Math.abs(evaluation.minMoney) > evaluation.maxMoney) {
            // 直接返回 null 表示验证失败，不再进行后续验证
            return null;
        } else {
            finalRes.push({
                testMoney: evaluation.testMoney,
                maxMoney: evaluation.maxMoney,
                minMoney: evaluation.minMoney,
            });
        }
    }

    return finalRes; // 返回验证成功的结果
}
