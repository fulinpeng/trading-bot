
        var openHistory = [
  "2024-12-09_05-15-00",
  "2024-12-09_23-15-00",
  "2024-12-13_18-30-00",
  "2024-12-16_23-30-00",
  "2024-12-22_20-45-00"
]
        var closeHistory = [
  "2024-12-09_07-14-59",
  "2024-12-10_01-29-59",
  "2024-12-13_21-14-59",
  "2024-12-17_03-29-59",
  "2024-12-22_21-44-59"
]
        var trendHistory = [
  "up",
  "down",
  "up",
  "up",
  "down"
]
        var valueFormatter = (value, index) => '[openTime:' + openHistory[index] + ']' + '\n\r' + '[closeTime:' + closeHistory[index] + ']' + '\n\r' + '[trend:' + trendHistory[index] + ']' + '\n\r' +'[testMoney:' + value + ']'

        var option = {
            xAxis: {
                type: "category",
                data: [
  "2024-12-09_07-14-59",
  "2024-12-10_01-29-59",
  "2024-12-13_21-14-59",
  "2024-12-17_03-29-59",
  "2024-12-22_21-44-59"
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
  301.3956698295801,
  194.78374634823334,
  906.5272935584725,
  3624.712745458379,
  3557.4450728276342
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
    