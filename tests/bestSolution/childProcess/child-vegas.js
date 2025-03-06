const { evaluateStrategy } = require("../../test-Vegas-2.js");
const { getDate } = require("../../../utils/functions.js");

process.on("message", (message) => {
    if (message.action === "evaluate") {
        const { params, symbol, childId } = message.params || {}; // 接收 symbol, params 和 childId 参数
        const result = evaluateStrategy(params, true); // 使用 symbol 和 params 调用 evaluateStrategy

        if (result.testMoney > 20000 && result.minMoney > -1000) {
            process.stdout.write(`${symbol} ${JSON.stringify(params)}\r`);

            // 进一步验证
            const results = validateOneMore(params);
            if (results && results.length) {
                // 进一步验证，通过
                process.send({
                    qualified: true,
                    solution: { params, results },
                    childId,
                });
            } else {
                // 进一步验证，验证不合格
                process.send({ qualified: false, childId });
            }
        } else {
            // 验证不合格
            process.send({ qualified: false, childId });
        }
    }
});

// 验证最优参数在不同 targetTimeNum 值下的表现
function validateOneMore(bestParams) {
    let finalRes = [];
    let strtime = "2021-01-02 00:00:00";
    let date = new Date(strtime.replace(/-/g, "/"));
    let week = 24 * 60 * 60 * 1000 * 7; // 一天
    let total = 190; // 从 2021-01-02 到 2024-12-02 共192周
    let timeStamp = date.valueOf() + week * total;
    // 到这来会高效一些
    for (let i = total; i >= 1; i--) {
        let targetTime = getDate(timeStamp - week * i); // 每次递增一周
        const paramsWithTargetTimeDis = { ...bestParams, targetTime };
        const evaluation = evaluateStrategy(paramsWithTargetTimeDis);

        // Math.abs(evaluation.minMoney) > evaluation.testMoney
        if (evaluation.testMoney < 0 && false) {
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
