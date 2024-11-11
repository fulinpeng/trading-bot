const { calculateATR } = require("../klineIndex/atr.js");

// 辅助函数：生成随机K线数据
function generateRandomKLines(length) {
    let kLines = [];
    for (let i = 0; i < length; i++) {
        const high = parseFloat((Math.random() * 10 + 1).toFixed(2));
        const low = parseFloat((Math.random() * 10).toFixed(2));
        const close = parseFloat(((high + low) / 2).toFixed(2));
        kLines.push({ high, low, close });
    }
    return kLines;
}

describe("ATR计算测试", () => {
    it("使用正确的数据进行 ATR 计算", () => {
        const period = 5;
        const kLines = generateRandomKLines(15); // 生成15个随机K线数据

        const result = calculateATR(kLines, period);

        // 确认返回数组的长度与输入数据长度减去周期一致
        expect(result.length).toBe(kLines.length - period + 1);
        result.forEach((value) => {
            expect(typeof value).toBe("number"); // 检查每个值是否是数值
        });
    });

    it("检测 K线数据不足的情况", () => {
        const kLines = generateRandomKLines(2); // 生成少于周期数的随机K线数据
        const period = 5;

        expect(() => calculateATR(kLines, period)).toThrow("K线数据不足以计算指定周期的ATR");
    });

    it("检测缺少 high, low 或 close 属性的数据", () => {
        const kLines = [
            { high: 1.15, low: 1.05, close: 1.1 },
            { high: 1.2, close: 1.15 }, // 缺少 low 属性
            { high: 1.3, low: 1.15, close: 1.25 },
        ];
        const period = 3;

        expect(() => calculateATR(kLines, period)).toThrow("K线数据格式不正确，第 1 行缺少 high、low 或 close 属性");
    });

    it("计算周期为 1 的 ATR", () => {
        const kLines = [
            { high: 1.15, low: 1.05, close: 1.1 },
            { high: 1.2, low: 1.1, close: 1.15 },
            { high: 1.3, low: 1.15, close: 1.25 },
        ];
        const period = 1;

        const result = calculateATR(kLines, period);

        // 手动计算的预期值，因为周期为1所以直接是high-low差值的平均
        const expectedATR = [
            kLines[0].high - kLines[0].low,
            kLines[1].high - kLines[1].low,
            kLines[2].high - kLines[2].low,
        ];

        expect(result.length).toBe(expectedATR.length);
        result.forEach((value, index) => {
            expect(value).toBeCloseTo(expectedATR[index], 4);
        });
    });
});
