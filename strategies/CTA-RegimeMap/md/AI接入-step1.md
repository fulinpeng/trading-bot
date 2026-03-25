1. 开仓那一刻能拿到的数据
在 judgeAndTrading 里，teadeBuy/teadeSell 之前或之后，可以拿到：

文档字段	你的数据来源	说明
rsi	getLastFromArr(state.rsiArr, 1)	最后一根 RSI
atr	getLastFromArr(state.superTrendArr, 1).atr 或 state.atrForMoveSLArr 的最后一个	SuperTrend 里的 ATR
adx	getLastFromArr(state.adxArr, 1)	通常是 { ADX, DIPlus0, DIMinus0 }，取 .ADX
price	state.currentPrice	当前价
ma	getLastFromArr(state.ema50Arr, 1)	EMA50
entryPrice、initialStopLoss、trend 在开仓后都会写入 state，也可以作为特征或构造派生特征。

2. futureBars 怎么取 —— 核心问题
当前回测是流式的：

wsServer 从 tests/source/ethusdt-30m.js 读完整 K 线，逐根通过 WebSocket 推给 index.js
每次只 push 一根新 K 线，并可能 shift 掉老数据（maxKLinelen = 1000）
开仓那一刻，state.kLineData 里没有未来 K 线，所以在这里直接取不到 futureBars
所以有两种思路：

方案 C：独立训练数据导出脚本（推荐）
当在某根 K 线 i 上产生开仓信号时：
用“那一刻”的openTime，开了多少单就记录多少个openTime
新建脚本，例如 exportTrainingData.js 或放在策略目录下
直接 require 完整 K 线源文件：tests/source/ethusdt-30m.js，得到完整数组 kLineData
通过openTime去kLineData匹配找到未来的100根k线

我觉得我的方案C更好，你觉得呢，可以的话就按照我的来

3. label 的含义
文档里的定义是：

未来 N 根 K 线内，是否达到 1R

所以：

maxProfitR：未来 50/100 根 K 线内，能达到的最大 profitR（多单用 high，空单用 low，按你现有 profitR 公式算）
label：二分类结果
label = 1：maxProfitR >= 1（至少到过 1R）
label = 0：maxProfitR < 1
也就是说，label 不是“最大盈亏比”本身，而是“最大盈亏比是否 ≥ 1”的 0/1 标签。

（实现上以 `config.js` 的 `trainingLabelThreshold` 为准，例如 `0.5` 表示半 R、`1` 表示 1R；文档上文以 1R 为例说明含义。）

4. 一些建议
futureBars 用 50 还是 100 根

文档示例是 50 根，你打算 100 根也可以，两者都试一下，看分布和训练效果
太长（如 200 根）容易学“很久以后”的信息，实战意义会变弱
多单 / 空单

多单：对 futureBars 用 bar.high 算最大 profitR
空单：用 bar.low
两种方向最好分开训练，或特征里加 trend/is_long，否则多空混在一起效果可能变差
开仓时刻的选取

严格按文档，应在“信号触发那一刻”记录，即 readyTradingDirection 从 hold 变为 up/down、且尚未执行 placeOrder 的那一根 K 线
指标一律用该根 K 线对应的 state 里的值，不能用未来数据
关于 recordTrainingSample 的调用位置，如果你采用方案c那么就是在整个回测结束时再单独运行了，这样就不会破坏原策略代码，而且单独跑也不卡，不那么占内存


所以step1就是帮我实现，跑完回测，你可以给我生成一个JSON文件(用来机器学习的数据源)，这个数据结构我就不清楚怎么设计比较合理了，需要你来设计