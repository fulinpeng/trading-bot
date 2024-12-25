
        var bbkRes = [object Object]
        var openHistory = []
        var closeHistory = []
        var trendHistory = []
        var valueFormatter = (value, index) => '[openTime:' + openHistory[index] + ']' + '\n\r' + '[closeTime:' + closeHistory[index] + ']' + '\n\r' + '[trend:' + trendHistory[index] + ']' + '\n\r' +'[testMoney:' + value + ']'

        var option = {
            xAxis: {
                type: "category",
                data: [],
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
                    data: [],
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
    