// bb-keltner.test.js

const { calculateBBKeltnerSqueeze, getReverseSqueeze } = require("../klineIndex/BBKeltner.js");

describe("BB-Keltner Squeeze 计算测试", () => {
    it("calculateBBKeltnerSqueeze 的计算测试", () => {
        const prices = [
            { high: 1.15, low: 1.05, close: 1.1 },
            { high: 1.2, low: 1.1, close: 1.15 },
            { high: 1.3, low: 1.15, close: 1.25 },
            { high: 1.25, low: 1.2, close: 1.2 },
            { high: 1.35, low: 1.3, close: 1.33 },
            { high: 1.4, low: 1.25, close: 1.35 },
            { high: 1.42, low: 1.3, close: 1.38 },
            { high: 1.45, low: 1.4, close: 1.42 },
            { high: 1.5, low: 1.45, close: 1.48 },
            { high: 1.52, low: 1.5, close: 1.5 },
            { high: 1.53, low: 1.48, close: 1.5 },
            { high: 1.55, low: 1.49, close: 1.51 },
            { high: 1.6, low: 1.55, close: 1.57 },
            { high: 1.62, low: 1.56, close: 1.58 },
            { high: 1.65, low: 1.6, close: 1.64 },
        ];
        const length = 5;
        const B2mult = 2.0;
        const Kmult = 1.5;

        const result = calculateBBKeltnerSqueeze(prices, length, B2mult, Kmult);

        const expectedB2basis = [
            null,
            null,
            null,
            null,
            1.206,
            1.2559999999999998,
            1.302,
            1.3359999999999999,
            1.3920000000000001,
            1.4260000000000002,
            1.456,
            1.482,
            1.512,
            1.532,
            1.56,
        ];
        const expectedB2upper = [
            0, 0, 0, 0, 1.365298462013919, 1.4075783625719713, 1.435506554146229, 1.48491608375189, 1.498883113727099,
            1.5402628548566857, 1.552, 1.5469923072370877, 1.5731882341631134, 1.6028801805866775, 1.6619803902718557,
        ];
        const expectedB2lower = [
            0, 0, 0, 0, 1.046701537986081, 1.1044216374280282, 1.168493445853771, 1.1870839162481097,
            1.2851168862729012, 1.3117371451433146, 1.3599999999999999, 1.4170076927629123, 1.4508117658368866,
            1.4611198194133226, 1.4580196097281444,
        ];
        const expectedKma = [
            null,
            null,
            null,
            null,
            1.206,
            1.2559999999999998,
            1.302,
            1.3359999999999999,
            1.3920000000000001,
            1.4260000000000002,
            1.456,
            1.482,
            1.512,
            1.532,
            1.56,
        ];
        const expectedKupper = [
            0, 0, 0, 0, 1.371, 1.436, 1.488, 1.4979999999999998, 1.5630000000000002, 1.564, 1.564, 1.572, 1.608, 1.622,
            1.659,
        ];
        const expectedKlower = [
            0, 0, 0, 0, 1.041, 1.0759999999999996, 1.116, 1.174, 1.221, 1.2880000000000003, 1.3479999999999999, 1.392,
            1.416, 1.442, 1.461,
        ];
        const expectedSqueeze = [
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            true,
        ];

        expect(result.B2basis.length).toBe(expectedB2basis.length);
        expect(result.B2upper.length).toBe(expectedB2upper.length);
        expect(result.B2lower.length).toBe(expectedB2lower.length);
        expect(result.Kma.length).toBe(expectedKma.length);
        expect(result.Kupper.length).toBe(expectedKupper.length);
        expect(result.Klower.length).toBe(expectedKlower.length);
        expect(result.squeeze.length).toBe(expectedSqueeze.length);

        result.B2basis.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedB2basis[idx] || 0, 4);
        });
        result.B2upper.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedB2upper[idx] || 0, 4);
        });
        result.B2lower.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedB2lower[idx] || 0, 4);
        });
        result.Kma.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedKma[idx] || 0, 4);
        });
        result.Kupper.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedKupper[idx] || 0, 4);
        });
        result.Klower.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedKlower[idx] || 0, 4);
        });
        result.squeeze.forEach((val, idx) => {
            expect(val).toBe(expectedSqueeze[idx]);
        });
    });

    it("getReverseSqueeze 的计算测试", () => {
        const prices = [
            { high: 1.15, low: 1.05, close: 1.1 },
            { high: 1.2, low: 1.1, close: 1.15 },
            { high: 1.3, low: 1.15, close: 1.25 },
            { high: 1.25, low: 1.2, close: 1.2 },
            { high: 1.35, low: 1.3, close: 1.33 },
            { high: 1.4, low: 1.25, close: 1.35 },
            { high: 1.42, low: 1.3, close: 1.38 },
            { high: 1.45, low: 1.4, close: 1.42 },
            { high: 1.5, low: 1.45, close: 1.48 },
            { high: 1.52, low: 1.5, close: 1.5 },
            { high: 1.53, low: 1.48, close: 1.5 },
            { high: 1.55, low: 1.49, close: 1.51 },
            { high: 1.6, low: 1.55, close: 1.57 },
            { high: 1.62, low: 1.56, close: 1.58 },
            { high: 1.65, low: 1.6, close: 1.64 },
        ];
        const length = 5;
        const B2mult = 2.0;
        const Kmult = 1.5;

        const result = getReverseSqueeze(prices, length, B2mult, Kmult);

        const expectedB2basis = [
            null,
            null,
            null,
            null,
            1.206,
            1.2559999999999998,
            1.302,
            1.3359999999999999,
            1.3920000000000001,
            1.4260000000000002,
            1.456,
            1.482,
            1.512,
            1.532,
            1.56,
        ];
        const expectedB2upper = [
            0, 0, 0, 0, 1.365298462013919, 1.4075783625719713, 1.435506554146229, 1.48491608375189, 1.498883113727099,
            1.5402628548566857, 1.552, 1.5469923072370877, 1.5731882341631134, 1.6028801805866775, 1.6619803902718557,
        ];
        const expectedB2lower = [
            0, 0, 0, 0, 1.046701537986081, 1.1044216374280282, 1.168493445853771, 1.1870839162481097,
            1.2851168862729012, 1.3117371451433146, 1.3599999999999999, 1.4170076927629123, 1.4508117658368866,
            1.4611198194133226, 1.4580196097281444,
        ];
        const expectedKma = [
            null,
            null,
            null,
            null,
            1.206,
            1.2559999999999998,
            1.302,
            1.3359999999999999,
            1.3920000000000001,
            1.4260000000000002,
            1.456,
            1.482,
            1.512,
            1.532,
            1.56,
        ];
        const expectedKupper = [
            0, 0, 0, 0, 1.371, 1.436, 1.488, 1.4979999999999998, 1.5630000000000002, 1.564, 1.564, 1.572, 1.608, 1.622,
            1.659,
        ];
        const expectedKlower = [
            0, 0, 0, 0, 1.041, 1.0759999999999996, 1.116, 1.174, 1.221, 1.2880000000000003, 1.3479999999999999, 1.392,
            1.416, 1.442, 1.461,
        ];
        const expectedSqueeze = [
            false,
            false,
            false,
            false,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            false,
        ];

        expect(result.B2basis.length).toBe(expectedB2basis.length);
        expect(result.B2upper.length).toBe(expectedB2upper.length);
        expect(result.B2lower.length).toBe(expectedB2lower.length);
        expect(result.Kma.length).toBe(expectedKma.length);
        expect(result.Kupper.length).toBe(expectedKupper.length);
        expect(result.Klower.length).toBe(expectedKlower.length);
        expect(result.squeeze.length).toBe(expectedSqueeze.length);

        result.B2basis.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedB2basis[idx] || 0, 4);
        });
        result.B2upper.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedB2upper[idx] || 0, 4);
        });
        result.B2lower.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedB2lower[idx] || 0, 4);
        });
        result.Kma.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedKma[idx] || 0, 4);
        });
        result.Kupper.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedKupper[idx] || 0, 4);
        });
        result.Klower.forEach((val, idx) => {
            expect(val || 0).toBeCloseTo(expectedKlower[idx] || 0, 4);
        });
        result.squeeze.forEach((val, idx) => {
            expect(val).toBe(expectedSqueeze[idx]);
        });
    });
});
