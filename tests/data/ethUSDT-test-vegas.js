
        var openHistory = [
  "2024-12-18_08-00-00"
]
        var closeHistory = [
  "2024-12-19_11-59-59"
]
        var trendHistory = [
  "down"
]
        var valueFormatter = (value, index) => '[openTime:' + openHistory[index] + ']' + '\n\r' + '[closeTime:' + closeHistory[index] + ']' + '\n\r' + '[trend:' + trendHistory[index] + ']' + '\n\r' +'[testMoney:' + value + ']'

        var option = {
            xAxis: {
                type: "category",
                data: [
  "2024-12-19_11-59-59"
],
            },
            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "cross",
                },
                valueFormatter,
                extraCssText: 'width:300px; white-space:pre-wrap' // 保留空格并支持换行
            },
            yAxis: {
                type: "value",
            },
            series: [
                {
                    name: "当前盈利",
                    data: [
  6878.062411999995
],
                    type: "line",
                    markPoint: {
                        data: [
                            {
                                type: "max",
                                name: "Max",
                            },
                            {
                                type: "min",
                                name: "Min",
                            },
                        ],
                    },
                },
            ],
        }
    