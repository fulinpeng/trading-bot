const { calculateFibonacciLevels } = require("../klineIndex/fib.js");

describe("calculateFibonacciLevels", () => {
    // 测试 1: 上升趋势
    it("应该正确计算上升趋势的斐波那契回撤水平", () => {
        const high = 150.0;
        const low = 100.0;
        const trend = "up";

        // 预期的斐波那契水平
        const expectedLevels = [
            100.0, // 0% 回撤
            111.8, // 23.6% 回撤
            119.1, // 38.2% 回撤
            125.0, // 50% 回撤
            130.9, // 61.8% 回撤
            139.3, // 78.6% 回撤
            150.0, // 100% 回撤
        ];

        const result = calculateFibonacciLevels(high, low, trend);

        // 将result和expectedLevels四舍五入到小数点后一位再进行比较
        result.forEach((level, index) => {
            expect(parseFloat(level.toFixed(1))).toBe(parseFloat(expectedLevels[index].toFixed(1)));
        });
    });

    // 测试 2: 下降趋势
    it("应该正确计算下降趋势的斐波那契回撤水平", () => {
        const high = 150.0;
        const low = 100.0;
        const trend = "down";

        // 预期的斐波那契水平
        const expectedLevels = [
            150.0, // 0% 回撤
            139.3, // 23.6% 回撤
            130.9, // 38.2% 回撤
            125.0, // 50% 回撤
            119.1, // 61.8% 回撤
            111.8, // 78.6% 回撤
            100.0, // 100% 回撤
        ];

        const result = calculateFibonacciLevels(high, low, trend);

        // 将result和expectedLevels四舍五入到小数点后一位再进行比较
        result.forEach((level, index) => {
            expect(parseFloat(level.toFixed(1))).toBe(parseFloat(expectedLevels[index].toFixed(1)));
        });
    });

    // 测试 3: 异常输入测试（高点小于低点）
    it("应该在高点小于低点时正常处理，并返回有效的数值", () => {
        const high = 100.0;
        const low = 150.0;
        const trend = "up";

        const result = calculateFibonacciLevels(high, low, trend);
        expect(result).toBeInstanceOf(Array);
        result.forEach((level) => {
            expect(level).not.toBeNaN(); // 应该没有 NaN 值
        });
    });

    // 测试 4: 异常输入测试（无效的趋势值）
    it("应该在传入无效趋势值时抛出错误", () => {
        const high = 150.0;
        const low = 100.0;
        const trend = "sideways"; // 无效的趋势值

        expect(() => calculateFibonacciLevels(high, low, trend)).toThrowError(
            "Invalid trend value. Use 'up' or 'down'.",
        );
    });
});
