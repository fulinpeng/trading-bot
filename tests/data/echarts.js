option = {
    xAxis: {
        type: "category",
        data: new Array(50).fill(undefined).map((v, i) => i),
    },
    tooltip: {
        trigger: "axis",
        axisPointer: {
            type: "cross",
        },
    },
    yAxis: {
        type: "value",
    },
    series: [
        {
            data: [],
            type: "line",
        },
    ],
};
