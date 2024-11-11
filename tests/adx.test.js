const { calculateADX } = require("../klineIndex/adx");

// 辅助函数：生成随机的 K 线数据
function generateRandomKLineData(length) {
    let kLineData = [];
    for (let i = 0; i < length; i++) {
        const open = parseFloat((Math.random() * 100 + 1).toFixed(2));
        const high = parseFloat((open + Math.random() * 10).toFixed(2));
        const low = parseFloat((open - Math.random() * 10).toFixed(2));
        const close = parseFloat((Math.random() * (high - low) + low).toFixed(2));
        const volume = Math.floor(Math.random() * 1000 + 100);

        kLineData.push({ open, high, low, close, volume });
    }
    return kLineData;
}

describe("ADX计算测试", () => {
    it("ADX计算", () => {
        const period = 5;

        // 使用辅助函数生成随机的 K 线数据
        const kLineData = generateRandomKLineData(20);

        // 计算ADX
        const result = calculateADX(kLineData, period);

        // 设置预期的ADX结果（因为生成的是随机数据，这里只是示例，具体的预期值需根据业务或通过其他已知算法来验证）
        // 在实际场景中，可以手动计算或对比预期的 ADX 值，这里用大致范围测试
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        // 检查结果是否符合 ADX 值的典型范围（例如 0 到 100 之间）
        result.forEach((adxValue) => {
            expect(adxValue).toBeGreaterThanOrEqual(0);
            expect(adxValue).toBeLessThanOrEqual(100);
        });
    });
});
