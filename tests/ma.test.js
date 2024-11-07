const { calculateSimpleMovingAverage, calculateEMA } = require("../klineIndex/ma");
const kLineData = require("./kLineData/kLine-ma");

// 从 kLineData 提取收盘价数据
const prices = kLineData.map((item) => item.close);

describe("指标计算测试", () => {
    test("计算简单移动平均线 (SMA)", () => {
        const period = 3;
        const sma = calculateSimpleMovingAverage(prices, period);

        // 手动计算最后 3 个收盘价的平均值，作为期望结果
        const expectedSMA =
            (prices[prices.length - 3] + prices[prices.length - 2] + prices[prices.length - 1]) / period;

        expect(sma).toBeCloseTo(expectedSMA, 5); // 使用 5 位小数精度
    });

    test("计算指数移动平均线 (EMA)", () => {
        const period = 3;
        const ema = calculateEMA(prices, period);

        console.log("计算得到的 EMA:", ema);

        // expect(ema).toBeCloseTo(expectedEMA, 5);
    });

    // test("当 SMA 周期大于数据长度时抛出错误", () => {
    //     const period = prices.length + 1;
    //     expect(() => calculateSimpleMovingAverage(prices, period)).toThrow(
    //         "k线数据长度必须大于 period.",
    //     );
    // });
});
