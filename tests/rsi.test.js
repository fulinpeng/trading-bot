const { calculateRSI } = require("../klineIndex/rsi");

// 辅助函数：生成随机价格数据
function generateRandomPrices(length, minPrice = 90, maxPrice = 110) {
    let prices = [];
    for (let i = 0; i < length; i++) {
        let price = Math.random() * (maxPrice - minPrice) + minPrice;
        prices.push(parseFloat(price.toFixed(2)));
    }
    return prices;
}

describe("calculateRSI", () => {
    it("应当返回合理的 RSI 值", () => {
        // 生成足够长度的价格数据用于 RSI 计算
        const mockPrices = generateRandomPrices(20);
        const period = 14;

        const rsi = calculateRSI(mockPrices, period);

        // 验证 RSI 值是否在合理范围内（0 到 100）
        expect(rsi).toBeGreaterThanOrEqual(0);
        expect(rsi).toBeLessThanOrEqual(100);
    });

    it("应当在价格连续上涨时返回 RSI 值接近 100", () => {
        // 生成一个持续上涨的价格数据
        const mockPrices = Array.from({ length: 20 }, (_, i) => 100 + i);
        const period = 14;

        const rsi = calculateRSI(mockPrices, period);

        // 在持续上涨时 RSI 应接近 100
        expect(rsi).toBeGreaterThanOrEqual(70);
    });

    it("应当在价格连续下跌时返回 RSI 值接近 0", () => {
        // 生成一个持续下跌的价格数据
        const mockPrices = Array.from({ length: 20 }, (_, i) => 100 - i);
        const period = 14;

        const rsi = calculateRSI(mockPrices, period);

        // 在持续下跌时 RSI 应接近 0
        expect(rsi).toBeLessThanOrEqual(30);
    });

    it("应当在价格波动时返回 RSI 值在正常范围内", () => {
        // 生成价格波动的数据
        const mockPrices = [
            100, 105, 102, 107, 104, 106, 103, 109, 102, 105, 107, 108, 106, 105, 104, 102, 103, 104, 105, 106,
        ];
        const period = 14;

        const rsi = calculateRSI(mockPrices, period);

        // 在价格波动时，RSI 应该处于正常范围内
        expect(rsi).toBeGreaterThanOrEqual(30);
        expect(rsi).toBeLessThanOrEqual(70);
    });

    it("当数据不足时应抛出错误", () => {
        // 数据长度不足的情况
        const mockPrices = generateRandomPrices(10); // 小于 period + 1
        const period = 14;

        // 验证是否抛出错误
        expect(() => calculateRSI(mockPrices, period)).toThrow("数据不足，无法计算 RSI");
    });
});
