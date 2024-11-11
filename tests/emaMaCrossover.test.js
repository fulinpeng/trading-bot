const { emaMaCrossover } = require("../klineIndex/emaMaCrossover");
const { calculateSimpleMovingAverage, calculateEMA } = require("../klineIndex/ma.js");

jest.mock("../klineIndex/ma.js", () => ({
    calculateSimpleMovingAverage: jest.fn(),
    calculateEMA: jest.fn(),
}));

describe("emaMaCrossover 测试", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("应抛出错误，当价格数组长度小于给定的周期长度", () => {
        const closePrices = [1, 2, 3];
        expect(() => emaMaCrossover(closePrices, 5, 5)).toThrow("价格数组的长度必须大于周期长度");
    });

    it("应正确计算最后 10 个交叉点的 SMA 和 EMA 值", () => {
        const closePrices = Array.from({ length: 30 }, (_, i) => i + 1);

        // Mock 计算简单移动平均线和指数移动平均线
        calculateSimpleMovingAverage.mockImplementation((prices) => prices.reduce((a, b) => a + b, 0) / prices.length);
        calculateEMA.mockImplementation((prices, length) => {
            const smoothingFactor = 2 / (length + 1);
            let ema = prices[0]; // 初始值为第一个元素
            for (let i = 1; i < prices.length; i++) {
                ema = (prices[i] - ema) * smoothingFactor + ema;
            }
            return ema;
        });

        const result = emaMaCrossover(closePrices, 5, 5);

        // 验证结果的长度
        expect(result.length).toBe(10);

        // 验证每个结果包含 sma 和 ema，且不为 null
        result.forEach((point) => {
            expect(point).toHaveProperty("sma");
            expect(point).toHaveProperty("ema");
            expect(point.sma).not.toBeNull();
            expect(point.ema).not.toBeNull();
        });
    });

    it("SMA 和 EMA 计算逻辑在 Mock 情况下应被调用", () => {
        const closePrices = Array.from({ length: 20 }, (_, i) => i + 1);

        calculateSimpleMovingAverage.mockImplementation((prices) => prices.reduce((a, b) => a + b, 0) / prices.length);
        calculateEMA.mockImplementation((prices) => prices.reduce((a, b) => a + b, 0) / prices.length);

        emaMaCrossover(closePrices, 5, 5);

        // 验证 calculateSimpleMovingAverage 和 calculateEMA 被调用的次数
        expect(calculateSimpleMovingAverage).toHaveBeenCalled();
        expect(calculateEMA).toHaveBeenCalled();
    });

    it("应正确处理包含 null 值的 SMA 和 EMA 计算", () => {
        const closePrices = Array.from({ length: 10 }, (_, i) => i + 1);
        calculateSimpleMovingAverage.mockImplementation(() => null);
        calculateEMA.mockImplementation(() => null);

        const result = emaMaCrossover(closePrices, 5, 5);

        // 结果应包含 null 值
        result.forEach((point) => {
            expect(point.sma).toBeNull();
            expect(point.ema).toBeNull();
        });
    });
});
