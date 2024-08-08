var result = {
    profitRate: 5,
    atrRate: 0.01,
    overNumberToRest: 16,
    testMoney: 1.8323526172916487,
    maxMoney: 1.8323526172916487,
    minMoney: -1.7142176019791666,
    tradeCount: 2,
    closeOrderHistory: [
        [1, 0],
        [1, 2, 1, 2, 1, 2, 3],
    ],
    mostCountMap: { 2: 1, 7: 1 },
    mostCountKey: "2",
    mostCountValue: 1,
    candleHeightAndGridPoints: [
        {
            date: "2024-08-07_22-25-00",
            trend: "down",
            orderPrice: 0.10095,
            candleHeight: 0.0003449999999999981,
            gridHeight: 0.0006177083333333382,
            gridPoints: [0.0978614583333333, 0.10095, 0.10156770833333334, 0.10465625000000003],
            closeOrderHistory: [1, 0],
        },
        {
            date: "2024-08-08_20-36-00",
            trend: "up",
            orderPrice: 0.09853645833333334,
            candleHeight: 0.0004100000000000018,
            gridHeight: 0.0009364583333333289,
            gridPoints: [0.09291770833333336, 0.0976, 0.09853645833333334, 0.10321874999999998],
            closeOrderHistory: [1, 2, 1, 2, 1, 2, 3],
        },
        {
            date: "2024-08-08_22-04-00",
            trend: "down",
            orderPrice: 0.1024,
            candleHeight: 0.00025916666666666736,
            gridHeight: 0.00171041666666667,
            gridPoints: [0.09384791666666666, 0.1024, 0.10411041666666668, 0.11266250000000003],
            closeOrderHistory: [1, 2, 1, 2, 1, 2, 3],
        },
    ],
    option: {
        xAxis: { type: "category", data: ["2024-08-07_22-25-00", "2024-08-08_20-36-00", "2024-08-08_22-04-00"] },
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        yAxis: { type: "value" },
        series: [
            {
                name: "当前盈利",
                data: [0.2035067815625019, 1.8323526172916487, 1.8323526172916487],
                type: "line",
                markPoint: {
                    data: [
                        { type: "max", name: "Max" },
                        { type: "min", name: "Min" },
                    ],
                },
            },
            { name: "对冲次数", data: [2, 7, 7], type: "line", markPoint: { data: [{ type: "max", name: "Max" }] } },
            { name: "仓位类型", data: [1, 1, -1], type: "bar" },
            { name: "candleHeight", data: [0.7709288450800152, 0.9161763086458242, 0.5791277072944123], type: "line" },
        ],
    },
};
