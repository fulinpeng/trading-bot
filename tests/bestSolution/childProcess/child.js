const { evaluateStrategy } = require("../../test-mading4-6.js");

process.on("message", (message) => {
    if (message.action === "evaluate") {
        const { params, symbol } = message.params || {}; // 接收 symbol 和 params 参数
        const result = evaluateStrategy(symbol, params); // 使用 symbol 和 params 调用 evaluateStrategy

        // 假设 testMoney > 0 表示初步合格
        if (result.testMoney > 0) {
            process.stdout.write(`${symbol} ${JSON.stringify(params)}\r`);
            // 进一步验证
            const validationResults = validateOneMore(params);
            if (validationResults.length) {
                process.send({ qualified: true, solution: { params, result } });
            } else {
                process.send({ qualified: false });
            }
        } else {
            process.send({ qualified: false });
        }
    } else if (message.action === "exit") {
        process.exit(0); // 结束子进程
    }
});

// 验证最优参数在不同 targetTimeNum 值下的表现
function validateOneMore(bestParams) {
    let finalRes = [];
    for (let targetTimeNum = 3; targetTimeNum <= 9; targetTimeNum++) {
        const paramsWithTargetTimeNum = { ...bestParams, targetTimeNum };
        const evaluation = evaluateStrategy(paramsWithTargetTimeNum);

        if (evaluation.testMoney <= 0) {
            break;
        } else {
            finalRes.push({
                testMoney: evaluation.testMoney,
                maxMoney: evaluation.maxMoney,
                minMoney: evaluation.minMoney,
            });
        }
    }

    return finalRes;
}
