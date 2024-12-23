var result = {
    option: {
        xAxis: {
            type: "category",
            //  new Array(50).fill().map((v, i) => i)
            data: ["2024-09-29_23-15-59", "2024-09-30_04-02-59", "2024-09-30_04-04-59", "2024-09-30_04-07-59"],
        },
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        yAxis: { type: "value" },
        series: [
            {
                name: "当前盈利",
                data: [-0.8150533368996453, 2.139494519054952, 1.4501310599441841, 0.6274114682276472],
                type: "line",
                markPoint: {
                    data: [
                        { type: "max", name: "Max" },
                        { type: "min", name: "Min" },
                    ],
                },
            },
            {
                name: "对冲次数",
                data: [3, 4, 4, 18, 2, 3, 2, 2, 20],
                type: "line",
                markPoint: { data: [{ type: "max", name: "Max" }] },
            },
            {
                name: "仓位类型",
                data: [1, 1, 1, 1, 1, 1, 1, 1, -1],
                type: "bar",
            },
            {
                name: "candleHeight",
                data: [2.5883360574103964, 3.495810619154125, 5.35778573533691, 7.329064510217136],
                type: "line",
            },
        ],
    },
};
