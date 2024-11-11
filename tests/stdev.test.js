// calcStdev.test.js

const { calcStdev } = require("../klineIndex/stdev");

describe("标准差计算 - calcStdev", () => {
    it("当索引 idx < length - 1 时，应该返回一个包含 null 值的数组", () => {
        const values = [1, 2, 3, 4, 5];
        const length = 3;
        const result = calcStdev(values, length);
        expect(result).toEqual([null, null, expect.any(Number), expect.any(Number), expect.any(Number)]);
    });

    it("应正确计算给定窗口长度的标准差", () => {
        const values = [1, 2, 3, 4, 5, 6];
        const length = 3;

        // 手动计算每个滑动窗口的标准差
        // 例如，第一个非 null 窗口为 [1, 2, 3]，其均值为 2，标准差约为 sqrt(2/3) ≈ 0.8165
        const expected = [null, null, 0.8165, 0.8165, 0.8165, 0.8165];

        const result = calcStdev(values, length);
        result.forEach((value, idx) => {
            if (value !== null) {
                expect(value).toBeCloseTo(expected[idx], 4);
            } else {
                expect(value).toBeNull();
            }
        });
    });

    it("当 length 为 1 时，标准差应为 0", () => {
        const values = [5, 10, 15];
        const length = 1;

        const result = calcStdev(values, length);
        expect(result).toEqual([0, 0, 0]);
    });

    it("当数组长度小于指定的 length 时，应该返回全为 null 的数组", () => {
        const values = [1, 2];
        const length = 5;

        const result = calcStdev(values, length);
        expect(result).toEqual([null, null]);
    });

    it("当输入为空数组时，应该返回空数组", () => {
        const values = [];
        const length = 3;

        const result = calcStdev(values, length);
        expect(result).toEqual([]);
    });
});
