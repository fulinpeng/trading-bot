# Step 3：Node 接入 AI 过滤

## 模型是不是要转成 JS？

- **转成 JS**：在 Python 侧训练脚本里已通过 **m2cgen** 生成 `ai/dual_models/output/score_long.js`、`score_short.js`，无需在 Node 里再转一次。
- **Step 3 做的事**：策略里 `require` 这两个文件，按 `training_manifest.json` 里的阈值，在开仓前判断 **P(label=1)** 是否达标。

## 配置（`config.js`）

- `enableAiFilter: true`：启用过滤；`false` 则完全走原策略。
- `aiManifestPath`：manifest 相对策略目录的路径，默认 `ai/dual_models/output/training_manifest.json`。

## 逻辑位置

- `index.js` → `judgeAndTrading`：在 `teadeBuy` / `teadeSell` **之前**调用 `evaluateAiFilter`。
- 未通过：打印 `AI filter blocked ...`，`readyTradingDirection` 置回 `hold`，**不下单**。

## 特征与概率

- 特征向量：`[rsi, atr, adx, price_vs_ma, volatility]`（与训练一致）。
- `scoreLong(input)` / `scoreShort(input)` 返回 **`[P(0), P(1)]`**，正类概率取 **`[1]`**。

## 重新训练后

在 `ai/dual_models` 下重新执行 `python train_dual_models.py` 覆盖 `output/` 后，重启策略进程即可（无需改 Node 代码，除非改 manifest 路径）。
