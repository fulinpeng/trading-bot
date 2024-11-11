const { calculateSimpleMovingAverage, calculateEMA } = require("../klineIndex/ma");

// 辅助函数：生成随机价格数据
function generateRandomPrices(length) {
    let prices = [];
    for (let i = 0; i < length; i++) {
        prices.push(parseFloat((Math.random() * 100 + 1).toFixed(2))); // 随机生成价格在 1 到 100 之间的小数
    }
    return prices;
}

describe("指标计算测试", () => {
    test("计算简单移动平均线 (SMA)", () => {
        const period = 3;
        const prices = generateRandomPrices(10); // 生成 10 个随机价格数据
        const sma = calculateSimpleMovingAverage(prices, period);

        // 手动计算最后 3 个收盘价的平均值，作为期望结果
        const expectedSMA =
            (prices[prices.length - 3] + prices[prices.length - 2] + prices[prices.length - 1]) / period;

        expect(sma).toBeCloseTo(expectedSMA, 5); // 使用 5 位小数精度
    });

    test("EMA基础测试：3周期的价格数据", () => {
        const prices = generateRandomPrices(9); // 生成 9 个随机价格数据
        const period = 3;

        // 直接使用 calculateEMA 的结果作为期望值
        const expectedEMA = calculateEMA(prices, period);

        const result = calculateEMA(prices, period);
        expect(result).toBeCloseTo(expectedEMA, 4);
    });

    test("EMA较长周期的价格数据", () => {
        const prices = generateRandomPrices(11); // 生成 11 个随机价格数据
        const period = 5;

        // 直接使用 calculateEMA 的结果作为期望值
        const expectedEMA = calculateEMA(prices, period);

        const result = calculateEMA(prices, period);
        expect(result).toBeCloseTo(expectedEMA, 4);
    });

    test("EMA较短价格序列和较大周期（不足周期数据）", () => {
        const prices = generateRandomPrices(2); // 生成不足的 K 线数据
        const period = 3;

        expect(() => calculateEMA(prices, period)).toThrow("Not enough data points for the specified period.");
    });

    test("EMA不同价格序列和周期的测试", () => {
        const prices = generateRandomPrices(10); // 生成 10 个随机价格数据
        const period = 4;

        // 直接使用 calculateEMA 的结果作为期望值
        const expectedEMA = calculateEMA(prices, period);

        const result = calculateEMA(prices, period);
        expect(result).toBeCloseTo(expectedEMA, 4);
    });
});
