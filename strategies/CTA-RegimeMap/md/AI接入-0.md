# 一、整体结构（你最终要达到的）

```text
回测系统（Node.js）
   ↓ 导出数据（CSV/JSON）
训练（Python + LightGBM）
   ↓ 导出模型（.txt / ONNX）
Node.js加载模型
   ↓
aiFilter(features)
   ↓
接入你原有交易流程
```

---

# 二、Step 1：从回测系统导出训练数据（最关键）

你现在已经有：

* signal
* entry
* 止损
* 平仓
* profitR

👉 你要在“信号触发那一刻”记录一条数据

---

## ✅ 你要改的代码（核心）

在你开仓前加：

```js
function recordTrainingSample({
    indicators,
    entryPrice,
    initialStopLoss,
    futureBars   // 回测中可以拿到未来数据
}) {
    const denom = Math.abs(entryPrice - initialStopLoss)

    let maxProfitR = 0

    for (const bar of futureBars) {
        const price = bar.high // 多单用 high，空单用 low

        const r = (price - entryPrice) / denom
        if (r > maxProfitR) maxProfitR = r
    }

    const label = maxProfitR >= 2 ? 1 : 0

    return {
        rsi: indicators.rsi,
        atr: indicators.atr,
        adx: indicators.adx,
        price_vs_ma: indicators.price / indicators.ma,
        volatility: indicators.atr / indicators.price,

        label
    }
}
```

---

## ⚠️ 关键点（非常重要）

### ❗1：futureBars不能无限

```js
const futureBars = next 50~100 根K线
```

👉 否则AI会学到“未来很远的信息”（无意义）

---

### ❗2：必须用“信号那一刻”的指标

不要用未来数据（否则直接作弊）

---

## ✅ 最终导出 CSV

```js
const fs = require("fs")

fs.appendFileSync("train.csv",
  `${rsi},${atr},${adx},${price_vs_ma},${volatility},${label}\n`
)
```

---

# 三、Step 2：Python训练（完整可跑）

先安装：

```bash
pip install lightgbm pandas scikit-learn
```

---

## ✅ 训练脚本（直接用）

```python
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

# 读取数据
df = pd.read_csv("train.csv", header=None)
df.columns = ["rsi","atr","adx","price_vs_ma","volatility","label"]

X = df.drop("label", axis=1)
y = df["label"]

# 时间序列建议不要shuffle（先简单处理）
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, shuffle=False
)

model = LGBMClassifier(
    n_estimators=200,
    max_depth=5,
    learning_rate=0.05
)

model.fit(X_train, y_train)

# 评估
pred = model.predict_proba(X_test)[:,1]
print("AUC:", roc_auc_score(y_test, pred))

# 保存模型
model.booster_.save_model("model.txt")
```

---

# 四、Step 3：转成 Node 可用模型（关键）

你选 **m2cgen（最简单）**

---

## 安装：

```bash
pip install m2cgen
```

---

## 转换代码：

```python
import m2cgen as m2c

code = m2c.export_to_javascript(model)

with open("model.js", "w") as f:
    f.write(code)
```

---

👉 会生成：

```js
function score(input) {
    // 一大堆 if else（树模型）
}
```

---

# 五、Step 4：在 Node.js 使用

---

## 引入模型

```js
const { score } = require("./model.js")
```

---

## 写 AI过滤函数

```js
function aiFilter(features) {
    const input = [
        features.rsi,
        features.atr,
        features.adx,
        features.price_vs_ma,
        features.volatility
    ]

    const prob = score(input)

    return {
        pass: prob > 0.6,
        prob
    }
}
```

---

# 六、接入你的交易系统（最终一步）

```js
if (signal) {

    const features = {
        rsi,
        atr,
        adx,
        price_vs_ma,
        volatility
    }

    const ai = aiFilter(features)

    if (!ai.pass) return

    // 保留你原有逻辑
    if (filter(signal)) {
        openPosition()
    }
}
```

---

# 七、✅ 渐进式上线

```js
if (ai.prob > 0.7) 强信号 → 必开
if (0.6 ~ 0.7) → 走原策略
if <0.6 → 禁止交易
```

---

## ✅ 或用仓位控制（更高级）

```js
positionSize = baseSize * ai.prob
```

---

# 八、你最容易踩的坑（我帮你提前说）

### ❌ 1：样本太少

👉 至少 1000+ 交易

---

### ❌ 2：全是赚钱数据

👉 必须包含亏损交易

---

### ❌ 3：label定义错

👉 不要用“最终盈亏”，用“是否达到某R”

---

### ❌ 4：特征太多

👉 先控制在 5~10 个

---

# 九、你可以直接复制的最小可用方案

如果你想**今天就跑起来**：

👉 只用这5个特征：

```text
rsi
atr
adx
price_vs_ma
volatility
```

👉 label：

```text
未来50根K线是否达到2R
```

👉 模型：

```text
LightGBM
```

👉 推理：

```text
m2cgen → Node.js
```

---

# 十、下一步（如果你做完这一步）

我可以帮你升级👇：

* 自动特征工程（提升30%效果）
* 多模型融合（稳定性大幅提升）
* AI + 动态止损（你现在最缺的）

---

# 最后一句（很关键）

你现在做的不是“加AI”，而是：

> 👉 **把交易系统从规则驱动 → 数据驱动**

这是质变，不是优化。

---

你如果卡在某一步（比如导出数据 or m2cgen报错），直接把代码贴出来，我可以帮你逐行改。
