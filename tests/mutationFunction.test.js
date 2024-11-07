const { mutationFunction, paramRanges } = require("../paramsFactory/mading/functions/mutationFunction.js");

describe("mutationFunction", () => {
    test("检查变异后的值是否在有效范围内", () => {
        const phenotype = [100, 5.5, 7, 100]; // 初始的参数
        const mutatedPhenotype = mutationFunction(phenotype);

        // 检查变异后的值是否在有效范围内
        mutatedPhenotype.forEach((value, index) => {
            const range = paramRanges[index];

            expect(value).not.toBeNaN(); // 不应该出现NaN
            expect(value).toBeGreaterThanOrEqual(range.min); // 应该大于等于最小值
            expect(value).toBeLessThanOrEqual(range.max); // 应该小于等于最大值

            // 检查整数索引的参数是否保持为整数
            const isInteger = index === 0 || index === 2 || index === 3;
            if (isInteger) {
                expect(Number.isInteger(value)).toBe(true); // 应该是整数
            }
        });
    });

    test("检查最小边界", () => {
        const edgePhenotype = [1, 0.1, 3, 6]; // 最小边界
        const mutatedPhenotype = mutationFunction(edgePhenotype);

        mutatedPhenotype.forEach((value, index) => {
            const range = paramRanges[index];

            // 检查边界值不应超过范围
            expect(value).toBeGreaterThanOrEqual(range.min);
            expect(value).toBeLessThanOrEqual(range.max);
        });
    });

    test("检查最大边界", () => {
        const edgePhenotype = [300, 10, 10, 300]; // 最大边界
        const mutatedPhenotype = mutationFunction(edgePhenotype);

        mutatedPhenotype.forEach((value, index) => {
            const range = paramRanges[index];

            // 检查边界值不应超过范围
            expect(value).toBeGreaterThanOrEqual(range.min);
            expect(value).toBeLessThanOrEqual(range.max);
        });
    });

    test("检查浮点数类型参数（profit）的结果是否保留一位小数", () => {
        const phenotype = [100, 5.55, 7, 100]; // 浮点型数据
        const mutatedPhenotype = mutationFunction(phenotype);

        // 检查浮点数类型参数（profit）的结果是否保留一位小数
        const profitValue = mutatedPhenotype[1];
        expect(profitValue).toBeGreaterThanOrEqual(0.1);
        expect(profitValue).toBeLessThanOrEqual(10);
        expect(Number(profitValue.toFixed(1))).toBe(profitValue); // 保留一位小数
    });
});
