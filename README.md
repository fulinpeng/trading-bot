#### 项目概述
本项目是一个基于币安API开发的自动化交易机器人，旨在帮助用户实现高效、智能的加密货币交易。通过使用技术指标、策略和算法，该机器人能够自动分析市场动态，进行交易决策，减少手动交易带来的情绪干扰与操作失误。

回测/实盘/交易分析框架：[LiveBackEngine]('https://github.com/fulinpeng/trading-bot/tree/live-back-engine')。

#### 功能特点
- **智能交易策略**：
    1. 集成多种交易策略，如移动平均交叉、相对强弱指数（RSI）、布林带等，帮助用户把握市场趋势。
    2. 提供不看指标的交易策略，采用`等差马丁`策略，无需关注多空趋势，只关注交易波动即可。
- **自动化执行**：通过币安API自动下单，支持实时日志监控和宕机自动恢复功能。
- **风险管理**：自动止损、止盈等功能，以降低潜在的投资风险。
- **数据分析**：实时分析市场数据，生成交易信号，支持用户根据数据做出决策。
- **轻量部署**：支持本地运行，对服务器配置要求低。

#### 技术栈
- **编程语言**：JavaScript / Node.js
- **API**：币安交易所API
- **数据存储**：mongoDB存储交易状态

#### 开发目标
本项目的目标是为用户提供一个可操作的交易工具，使其能够更有效地参与加密货币市场。同时，通过开源的方式，鼓励开发者贡献代码和策略，共同提升交易机器人的智能化和适应性。

#### 项目结构（master 分支）

```text
trading-bot/
├── common/                     # 公共工具与脚本（与具体策略弱耦合）
├── data/                       # 运行产出数据、分析结果等
├── goldDigger/                 # 早期策略机器人实现（网格、马丁等）
├── klineIndex/                 # K 线相关索引或分析脚本
├── mongoDB/                    # 与 MongoDB 相关的配置或数据目录
├── params/                     # 手工维护的策略参数
├── paramsFactory/              # 参数拟合：批量生成、筛选、排序策略参数（寻找最优参数）
│   ├── mading/                 # 马丁策略参数搜索管线
│   ├── keltner/                # Keltner/BBK 相关参数搜索
│   └── emaMaCrossover/…        # 其他策略的参数搜索
├── tests/                      # 各种回测脚本与工具
│   ├── source/                 # 历史 K 线数据（*.js 导出 kLineData）
│   ├── nodeServer/             # 本地 HTTP/WS 推流服务，用于驱动策略回测
│   ├── data/                   # 测试时生成的数据
│   └── bestSolution/           # 历史“最佳参数挖掘”脚本与结果（可能存在过拟合）
├── tools/                      # 运维工具（拉取 K 线、查询持仓、日志处理等）
│   ├── getKlines/              # 从交易所拉取并更新 tests/source K 线
│   ├── getPosition/            # 查询持仓相关脚本
│   └── logTools/               # 日志分析与清洗
├── __upload/                   # 上传/中转用临时目录
├── .env                        # 本地环境变量（API Key 等，勿提交）
├── .gitignore                  # Git 忽略规则
├── package.json / pnpm-lock.yaml  # Node 依赖与锁文件
└── README.md                   # 当前说明文档
```

#### 法律声明

本项目是一个开源的加密货币交易机器人，仅供教育和参考使用。项目的发起人及贡献者不对任何因使用本项目而导致的损失或损害承担任何责任。用户在使用本项目时需自行承担风险，并应对所有交易行为负责。

##### 重要声明

1. **风险提示**：加密货币交易具有高度的风险，可能导致部分或全部投资损失。用户在进行任何交易之前应充分了解市场风险，并根据自身的风险承受能力进行决策。

2. **非投资建议**：本项目及其相关文档不构成任何投资建议、财务建议或其他形式的建议。用户在做出投资决策时应咨询专业的财务顾问。

3. **合规性**：用户应确保其交易活动符合所在地区的法律法规，项目发起人对用户的合规性行为不承担任何责任。

4. **遵守交易所API使用条款**：发布前确保交易机器人符合交易所的规则，避免被封禁账户或面临法律责任。

5. **第三方链接**：本项目可能包含第三方网站或服务的链接，项目发起人对这些第三方网站或服务的内容和使用不承担任何责任。

使用本项目即表示您已阅读、理解并同意上述法律声明。如您不同意，请勿使用本项目。

## Contributors ✨

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Thanks goes to these wonderful people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->
