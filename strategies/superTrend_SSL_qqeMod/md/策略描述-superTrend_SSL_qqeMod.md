### ====== 做多规则 ======

#### 入场条件

**条件组合**：`section3Up = (section3Up1 or section3Up2 or section3Up3 or section3Up4)`

**section3Up1**：
- 满足所有条件可以SSL入场
    - `maxSSL > minSSL2`（确定上升趋势）
    - `trend == 1`（SuperTrend趋势为上升）
    - 最近三根K线 qqe柱子是红色 and 拐头向上 and 最近三个qqe柱子的最小值 < -`qqe_entryThreshold1`（默认-5）
        - 拐头向上：`qqeModBar[2] > qqeModBar[1] < qqeModBar[0]`（先下降后上升）
    - `close > maxSSL`（收盘价在maxSSL上方）
    - `minSSL > minSSL2 and maxSSL > maxSSL2 and math.min(low, low[1]) <= maxSSL`（当前或前一根K线的最低价触及或下穿maxSSL）
    - SSL斜率条件：`(maxSSL - maxSSLLookback) / maxSSLLookback > sslRateUp`，补充说明
        - 即：maxSSL相对于`sslSlopeLookback`（默认21，可配置）根K线前的maxSSL值的上涨幅度 > `sslRateUp`（默认-0.0001，可配置）
        - 表示SSL通道正在向上倾斜

**section3Up2**：
- 满足所有条件可以SSL2入场
    - `maxSSL > minSSL2`（确定上升趋势）
    - `trend == 1`（SuperTrend趋势为上升）
    - 最近三根K线 qqe柱子是红色 and 拐头向上 and 最近三个qqe柱子的最小值 < -`qqe_entryThreshold2`（默认-15）
        - 拐头向上：`qqeModBar[2] > qqeModBar[1] < qqeModBar[0]`（先下降后上升）
    - `close > maxSSL2`（收盘价在maxSSL2上方）
    - `minSSL > minSSL2 and maxSSL > maxSSL2 and math.min(low, low[1]) <= maxSSL2`（当前或前一根K线的最低价触及或下穿maxSSL2）
    - SSL2斜率条件：`(maxSSL2 - maxSSL2Lookback) / maxSSL2Lookback > ssl2RateUp`，补充说明
        - 即：maxSSL2相对于`ssl2SlopeLookback`（默认21，可配置）根K线前的maxSSL2值的上涨幅度 > `ssl2RateUp`（默认0.0001，可配置）
        - 表示SSL2通道正在向上倾斜

**section3Up3**：
- 满足所有条件可以ADX入场
    - `minSSL > maxSSL2`（确定上升趋势）
    - `trend == 1`（SuperTrend趋势为上升）
    - `close > maxSSL2`（收盘价在maxSSL2上方）
    - ADX 上穿 DIPlus 形成金叉：`ADX0 > DIPlus0 and ADX1 <= DIPlus1` and `ADX0 > ADX1 > ADX2`（ADX上升趋势）
    - `DIPlus > adx_threshold_low and DIMinus < adx_threshold_low and adx_threshold_low < ADX < adx_threshold_high`（`adx_threshold_low`默认20，`adx_threshold_high`默认40，可配置）
    - 最近10根K线不能有 `close > upper_6`（Fibonacci上轨）

**section3Up4**（需开启`enableSSL55Squeeze`，默认关闭）：
- 满足所有条件可以SSL55+Squeeze入场
    - `trend == 1`（SuperTrend趋势为上升）
    - `close > minSSL2`（收盘价在minSSL2上方）
    - `close > SSL55`（收盘价在SSL55上方）
    - `close`上穿`BOX_bl`（Squeeze Box下轨）：当前`close > BOX_bl`且上一根K线的`close`或`open <= BOX_bl[1]`

**开仓条件**：
- 当前无持仓（`!hasOrder`）
- `section3Up = true` 且 `readyTradingDirection === "up"`
- **注意**：与Pine Script保持一致，只要满足`section3Up`就开仓，不需要`close > open`的条件

#### 开仓设置

- **开仓价**：当前收盘价（`close`）
- **订单ID**：`'buy'`
- **订单类型**：市价单（`type: "MARKET"`）
- **注释**：根据入场方式自动设置
    - `'多_SSL1'`（SSL1入场）
    - `'多_SSL2'`（SSL2入场）
    - `'多_ADX'`（ADX入场）
    - `'多_SSL55_SQUEEZE'`（SSL55+Squeeze入场，需开启`enableSSL55Squeeze`）

#### 止损

1. 使用SuperTrend下轨（`minSuper`）为动态止损位
2. 达到任何位置都可以止损：`close < effectiveStopLoss || low < effectiveStopLoss` 立即平仓全部仓位
    - `effectiveStopLoss`：当前SuperTrend下轨或移动止损位（如果已激活）

#### 移动止损（默认关闭移动止损，多空使用同一个开关 `enableTrailingStop`）

1. 触发条件：QQE柱子值（`qqeModBar`）> `qqeTrailingThresholdLong`（默认40.0，可配置）
2. 第一次触发时：移动一次止损位置到 `max(订单的当前限价止损价, BOX_bl)`
    - `订单的当前限价止损价`：当前SuperTrend下轨（`minSuper`）
    - `BOX_bl`：Squeeze Box下轨（当前K线的`bl`值）
3. 移动止损激活后，止损位固定为移动后的值，不再更新

#### 止盈

1. **盈利百分比止盈**（可配置，默认开启 `enableProfitPercentTakeProfit`，优先级高于固定止盈）
    - 止盈价 = `entryPrice * (1 + profitPercentTakeProfit)`（`profitPercentTakeProfit`默认0.03即3%，可配置）
    - 达到任何位置都可以止盈：`close >= takeProfitPrice || high >= takeProfitPrice` 立即平仓全部仓位

2. **固定止盈**：1:`riskRewardRatio`（`riskRewardRatio`默认1.4，可配置）作为止盈位，全部平仓
    - 止盈价 = `entryPrice + (entryPrice - initialLongStopLoss) * riskRewardRatio`
    - 达到任何位置都可以止盈：`close >= longTakeProfit || high >= longTakeProfit` 立即平仓全部仓位

3. **指标止盈**（可配置，默认开启 `enableSupertrendTakeProfit` / `enableFibonacciTakeProfit`）
    - 到达一次指标止盈位计数加1，随后5根K线之内如果再次满足该条件不计数，超过5根K线再次到达的需要增加一次计数
    - 冷却期：5根K线（使用`currentKLineCount`跟踪）
    - 容差机制：目标价格 * (1 - `priceTolerance`)（`priceTolerance`默认0.0005，可配置）
    - 触发条件（满足任一即可）：
        - `close > SuperTrend上轨 * (1 - priceTolerance) || high > SuperTrend上轨 * (1 - priceTolerance)`（需开启`enableSupertrendTakeProfit`）
        - `close > Fibonacci上轨(upper_7) * (1 - priceTolerance) || high > Fibonacci上轨(upper_7) * (1 - priceTolerance)`（需开启`enableFibonacciTakeProfit`）
    - 首次达到指标止盈时：移动一次止损位置到 `max(订单的当前限价止损价, preLow)`（如果移动止损未激活）

4. **指标止盈计数**：计数大于等于`indicatorTPCountThreshold`（默认4，可配置），立即全部平仓

5. **首次指标止盈部分平仓**：当指标止盈计数达到`indicatorTPPartialCount`（默认2，可配置）时，平仓初始仓位的`indicatorTPPartialRatio`比例（默认0.6即60%，可配置），剩余仓位博弈更多的可能
    - 如果`indicatorTPPartialRatio`配置为0，不执行平仓逻辑，认为是关闭了分批止盈
    - 部分平仓使用市价单，平仓后不重置`hasOrder`，继续持有剩余仓位
    - 部分平仓后，如果指标止盈条件继续满足（且不在冷却期），计数会继续增加

**平仓注释**：
- 全部平仓时，根据 `close > entryPrice` 判断：
    - `close > entryPrice`：`'止盈平多'`
    - `close <= entryPrice`：`'止损平多'`

---

### ====== 做空规则 ======

#### 入场条件

**条件组合**：`section3Down = (section3Down1 or section3Down2 or section3Down3 or section3Down4)`

**section3Down1**：
- 满足所有条件可以SSL入场
    - `minSSL < maxSSL2`（确定为下降趋势）
    - `trend == -1`（SuperTrend趋势为下降）
    - 最近三根K线 qqe柱子是绿色 and 拐头向下 and 最近三个qqe柱子的最大值 > `qqe_entryThreshold1`（默认5）
        - 拐头向下：`qqeModBar[2] < qqeModBar[1] > qqeModBar[0]`（先上升后下降）
    - `close < minSSL`（收盘价在minSSL下方）
    - `minSSL < minSSL2 and maxSSL < maxSSL2 and math.max(high, high[1]) >= minSSL`（当前或前一根K线的最高价触及或上穿minSSL）
    - SSL斜率条件：`(maxSSL - maxSSLLookback) / maxSSLLookback < sslRateDown`，补充说明
        - 即：maxSSL相对于`sslSlopeLookback`（默认21，可配置）根K线前的maxSSL值的下跌幅度 < `sslRateDown`（默认-0.0003，可配置）
        - 表示SSL通道正在向下倾斜

**section3Down2**：
- 满足所有条件可以SSL2入场
    - `minSSL < maxSSL2`（确定为下降趋势）
    - `trend == -1`（SuperTrend趋势为下降）
    - 最近三根K线 qqe柱子是绿色 and 拐头向下 and 最近三个qqe柱子的最大值 > `qqe_entryThreshold2`（默认15）
        - 拐头向下：`qqeModBar[2] < qqeModBar[1] > qqeModBar[0]`（先上升后下降）
    - `close < minSSL2`（收盘价在minSSL2下方）
    - `minSSL < minSSL2 and maxSSL < maxSSL2 and math.max(high, high[1]) >= minSSL2`（当前或前一根K线的最高价触及或上穿minSSL2）
    - SSL2斜率条件：`(maxSSL2 - maxSSL2Lookback) / maxSSL2Lookback < ssl2RateDown`，补充说明
        - 即：maxSSL2相对于`ssl2SlopeLookback`（默认21，可配置）根K线前的maxSSL2值的下跌幅度 < `ssl2RateDown`（默认-0.0001，可配置）
        - 表示SSL2通道正在向下倾斜

**section3Down3**：
- 满足所有条件可以ADX入场
    - `maxSSL < minSSL2`（确定下降趋势）
    - `trend == -1`（SuperTrend趋势为下降）
    - `close < minSSL2`（收盘价在minSSL2下方）
    - ADX 上穿 DIMinus 形成金叉：`ADX0 > DIMinus0 and ADX1 <= DIMinus1` and `ADX0 > ADX1 > ADX2`（ADX上升趋势）
    - `DIMinus > adx_threshold_low and DIPlus < adx_threshold_low and adx_threshold_low < ADX < adx_threshold_high`（`adx_threshold_low`默认20，`adx_threshold_high`默认40，可配置）
    - 最近10根K线不能有 `close < lower_6`（Fibonacci下轨）

**section3Down4**（需开启`enableSSL55Squeeze`，默认关闭）：
- 满足所有条件可以SSL55+Squeeze入场
    - `trend == -1`（SuperTrend趋势为下降）
    - `close < maxSSL2`（收盘价在maxSSL2下方）
    - `close < SSL55`（收盘价在SSL55下方）
    - `close`下穿`BOX_bh`（Squeeze Box上轨）：当前`close < BOX_bh`且上一根K线的`close`或`open >= BOX_bh[1]`

**开仓条件**：
- 当前无持仓（`!hasOrder`）
- `section3Down = true` 且 `readyTradingDirection === "down"`
- **注意**：与Pine Script保持一致，只要满足`section3Down`就开仓，不需要`close < open`的条件

#### 开仓设置

- **开仓价**：当前收盘价（`close`）
- **订单ID**：`'sell'`
- **订单类型**：市价单（`type: "MARKET"`）
- **注释**：根据入场方式自动设置
    - `'空_SSL1'`（SSL1入场）
    - `'空_SSL2'`（SSL2入场）
    - `'空_ADX'`（ADX入场）
    - `'空_SSL55_SQUEEZE'`（SSL55+Squeeze入场，需开启`enableSSL55Squeeze`）

#### 止损

1. 使用SuperTrend上轨（`maxSuper`）为动态止损位
2. 达到任何位置都可以止损：`close > effectiveStopLoss || high > effectiveStopLoss` 立即平仓全部仓位
    - `effectiveStopLoss`：当前SuperTrend上轨或移动止损位（如果已激活）

#### 移动止损（默认关闭移动止损，多空使用同一个开关 `enableTrailingStop`）

1. 触发条件：QQE柱子值（`qqeModBar`）< `qqeTrailingThresholdShort`（默认-40.0，可配置）
2. 第一次触发时：移动一次止损位置到 `min(订单的当前限价止损价, BOX_bh)`
    - `订单的当前限价止损价`：当前SuperTrend上轨（`maxSuper`）
    - `BOX_bh`：Squeeze Box上轨（当前K线的`bh`值）
3. 移动止损激活后，止损位固定为移动后的值，不再更新

#### 止盈

1. **盈利百分比止盈**（可配置，默认开启 `enableProfitPercentTakeProfit`，优先级高于固定止盈）
    - 止盈价 = `entryPrice * (1 - profitPercentTakeProfit)`（`profitPercentTakeProfit`默认0.03即3%，可配置）
    - 达到任何位置都可以止盈：`close <= takeProfitPrice || low <= takeProfitPrice` 立即平仓全部仓位

2. **固定止盈**：1:`riskRewardRatio`（`riskRewardRatio`默认1.4，可配置）作为止盈位，全部平仓
    - 止盈价 = `entryPrice - (initialShortStopLoss - entryPrice) * riskRewardRatio`
    - 达到任何位置都可以止盈：`close <= shortTakeProfit || low <= shortTakeProfit` 立即平仓全部仓位

3. **指标止盈**（可配置，默认开启 `enableSupertrendTakeProfit` / `enableFibonacciTakeProfit`）
    - 到达一次指标止盈位计数加1，随后5根K线之内如果再次满足该条件不计数，超过5根K线再次到达的需要增加一次计数
    - 冷却期：5根K线（使用`currentKLineCount`跟踪）
    - 容差机制：目标价格 * (1 + `priceTolerance`)（`priceTolerance`默认0.0005，可配置）
    - 触发条件（满足任一即可）：
        - `close < SuperTrend下轨 * (1 + priceTolerance) || low < SuperTrend下轨 * (1 + priceTolerance)`（需开启`enableSupertrendTakeProfit`）
        - `close < Fibonacci下轨(lower_7) * (1 + priceTolerance) || low < Fibonacci下轨(lower_7) * (1 + priceTolerance)`（需开启`enableFibonacciTakeProfit`）
    - 首次达到指标止盈时：移动一次止损位置到 `min(订单的当前限价止损价, preHigh)`（如果移动止损未激活）

4. **指标止盈计数**：计数大于等于`indicatorTPCountThreshold`（默认4，可配置），立即全部平仓

5. **首次指标止盈部分平仓**：当指标止盈计数达到`indicatorTPPartialCount`（默认2，可配置）时，平仓初始仓位的`indicatorTPPartialRatio`比例（默认0.6即60%，可配置），剩余仓位博弈更多的可能
    - 如果`indicatorTPPartialRatio`配置为0，不执行平仓逻辑，认为是关闭了分批止盈
    - 部分平仓使用市价单，平仓后不重置`hasOrder`，继续持有剩余仓位
    - 部分平仓后，如果指标止盈条件继续满足（且不在冷却期），计数会继续增加

**平仓注释**：
- 全部平仓时，根据 `close < entryPrice` 判断：
    - `close < entryPrice`：`'止盈平空'`
    - `close >= entryPrice`：`'止损平空'`

---

### ====== 补充说明 ======

1. **所有订单类型**：统一使用市价单（`MARKET`），包括开仓、平仓、部分平仓

2. **K线计数**：使用`currentKLineCount`跟踪K线数量，在每根新K线完成时（`isNewLine === true`）递增，用于冷却期计算

3. **容差机制**：
    - 做多：目标价格向下放宽，`目标价格 * (1 - priceTolerance)`
    - 做空：目标价格向上放宽，`目标价格 * (1 + priceTolerance)`
    - 容差范围：`[目标价格*(1-容差配置), 目标价格*(1+容差配置)]`，在容差范围内均可认为达到目标

4. **移动止损参考点**：做多使用`BOX_bl`（Squeeze Box下轨），做空使用`BOX_bh`（Squeeze Box上轨），而非前高点/前低点

5. **指标计算周期**：
    - SSL：`sslPeriod`（默认200）
    - SSL2：`sslPeriod * 3`（默认600）
    - SSL55：`ssl55_Length`（默认55）
    - ADX：`adx_len`（默认12）
    - QQE MOD：使用Primary和Secondary两组参数
    - Fibonacci Bollinger Bands：固定参数
    - Squeeze Box：`squeeze_box_Period`（默认24）

6. **多种仓位管理模式**：
    - 注意：sizingMode为 'Fixed' 、 'RiskBased' 时可以启用滚仓模式，可用资金为: max(DefaultAvailableMoney + 当前全部盈利, DefaultAvailableMoney)
    1. 仓位管理模式（Fixed, 默认），固定仓位为defaultavailablemoney
    2. 等差马丁仓位模式（Martingale），默认单笔仓位大小为defaultavailablemoney的100%，每失败一次按照等差马丁仓位模式计算单笔仓位大小，直到盈利一次后按照默认仓位管理模式计算单笔仓位大小，如：初始为defaultavailablemoney*100%，失败一次后为defaultavailablemoney*101%，失败两次为defaultavailablemoney*102%，直到盈利一次后恢复为defaultavailablemoney*100%，以此类推，但是不超超过最大值defaultavailablemoney的1000%（计算方式帮我写成函数，100%和每次增加的百分比可配置为其他值，最大值可配置为其他值）
    3. 以损定仓模式（RiskBased），单笔持仓为defaultavailablemoney
    ```
    calcRiskBasedQty(entryPrice, stopLossPrice) =>
        // 解方程式：(math.abs(开单价格 - 止损价格) / 止损价格) * (开单仓位的数量 * 开单价格) = 单笔风险
        开单仓位的数量 = 单笔风险 * 止损价格 / (开单价格 * math.abs(开单价格 - 止损价格))
        return 开单仓位的数量
    ```
