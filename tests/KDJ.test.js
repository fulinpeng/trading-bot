const { calculateKDJ, calculateKDJs } = require("../klineIndex/kdj");

// 辅助函数：生成随机 K 线数据
function generateRandomCandleData(length, minPrice = 100, maxPrice = 200) {
    let data = [];
    for (let i = 0; i < length; i++) {
        const open = Math.random() * (maxPrice - minPrice) + minPrice;
        const close = Math.random() * (maxPrice - minPrice) + minPrice;
        const high = Math.max(open, close) + Math.random() * 10;
        const low = Math.min(open, close) - Math.random() * 10;

        data.push({
            open: parseFloat(open.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
        });
    }
    return data;
}

describe("calculateKDJ", () => {
    it("应当返回合理的 KDJ 值", () => {
        // 使用生成的随机 K 线数据进行测试
        const mockData = generateRandomCandleData(30);
        const kdj = calculateKDJ(mockData, 9, 3, 3);

        expect(kdj).toHaveProperty("k");
        expect(kdj).toHaveProperty("d");
        expect(kdj).toHaveProperty("j");

        // 验证 K、D、J 值是否在合理范围内
        expect(kdj.k).toBeGreaterThanOrEqual(0);
        expect(kdj.k).toBeLessThanOrEqual(100);
        expect(kdj.d).toBeGreaterThanOrEqual(0);
        expect(kdj.d).toBeLessThanOrEqual(100);
        expect(kdj.j).toBeGreaterThanOrEqual(-100);
        expect(kdj.j).toBeLessThanOrEqual(200);
    });
});

describe("calculateKDJs", () => {
    it("应当返回每个时间点的合理 KDJ 值", () => {
        // 使用生成的随机 K 线数据进行测试
        const mockData = generateRandomCandleData(50);
        const kdjValues = calculateKDJs(mockData, 9, 3, 3);

        // 检查返回数组的长度是否与数据一致
        expect(kdjValues.length).toBe(mockData.length);

        // 验证每个对象是否包含合理的 K、D、J 值
        kdjValues.forEach((kdj, index) => {
            if (index < 8) {
                // 周期不足时应返回 null
                expect(kdj.k).toBeNull();
                expect(kdj.d).toBeNull();
                expect(kdj.j).toBeNull();
            } else {
                // 周期足够时应返回有效的 K、D、J 值
                expect(kdj.k).toBeGreaterThanOrEqual(0);
                expect(kdj.k).toBeLessThanOrEqual(100);
                expect(kdj.d).toBeGreaterThanOrEqual(0);
                expect(kdj.d).toBeLessThanOrEqual(100);
                expect(kdj.j).toBeGreaterThanOrEqual(-100);
                expect(kdj.j).toBeLessThanOrEqual(200);
            }
        });
    });
});
