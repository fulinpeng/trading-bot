#### 项目概述
本项目是一个基于币安API开发的自动化交易机器人，旨在帮助用户实现高效、智能的加密货币交易。通过使用技术指标、策略和算法，该机器人能够自动分析市场动态，进行交易决策，减少手动交易带来的情绪干扰与操作失误。

#### 功能特点
- **智能交易策略**：
    1. 集成多种交易策略，如移动平均交叉、相对强弱指数（RSI）、布林带等，帮助用户把握市场趋势。
    2. 提供不看指标的交易策略，采用`变形马丁`策略，无需关注多空趋势，只关注交易波动即可。
- **自动化执行**：通过币安API自动下单，支持实时日志监控和宕机自动恢复功能。
- **风险管理**：自动止损、止盈等功能，以降低潜在的投资风险。
- **数据分析**：实时分析市场数据，生成交易信号，支持用户根据数据做出决策。

#### 技术栈
- **编程语言**：JavaScript / Node.js
- **API**：币安交易所API
- **数据存储**：可选择使用数据库存储交易记录和策略参数

#### 开发目标
本项目的目标是为用户提供一个可操作的交易工具，使其能够更有效地参与加密货币市场。同时，通过开源的方式，鼓励开发者贡献代码和策略，共同提升交易机器人的智能化和适应性。

#### 核心策略代码

获取最佳参数：[index2-pipeline.js](https://github.com/fulinpeng/trading-bot/tree/main-deprecated/tests/bestSolution/index2-pipeline.js)
策略：[gridBot-doge3-7-1-mading-speed-small.js](https://github.com/fulinpeng/trading-bot/tree/main-deprecated/gridBot-doge3-7-1-mading-speed-small.js)

#### 获取币安API_KEY
先获取币安API_KEY，新建`.env`文件
```js
BINANCE_API_KEY = Wxxxxxxxxxxxxxxxxxxxxxxxxxxxxcr;
BINANCE_API_SECRET = DYxxxxxxxxxxx0Xz9qVAi9;

// 不需要邮件通知可以省略，可能需要注释对应代码
SEND_MAIL_ACOUNT = "xxxxx@qq.com"; // 发邮件，目前简单用QQ邮箱实现
SEND_MAIL_CODE = "xxxx";
RECIEVE_MAIL_ACOUNT = "xxx@qq.com"; // 邮件接收方
```

`第一次尝试运行可以跳过获取最佳参数的步骤，1000pepeUSDT参数已经放在tests/bestSolution/qualifiedSolutions下，直接用选用即可`


#### 如何运用真实历史k线数据验证策略

1. 获取真实k线数据
```sh
# 先获取 1000pepeUSDT 从 2024-01-01 开始和之后30天的k线数据
node getKlines-1m.js 1000pepeUSDT 1704038400000 30
# 接着获取剩下的所有K线数据
node getKlines-1m-to-now.js 1000pepeUSDT
```
2. 生成所有可能的参数
```sh
node tests/bestSolution/functions/translate.js
```
3. 通过历史k线数据找最优参数
```sh
node tests/bestSolution/index2-pipeline.js
node tests/bestSolution/qualifiedSolutions/paramsSort.js
```
4. 将参数填入 `tests/test-mading4-3.js`
```sh
node tests/bestSolution/index2-pipeline.js
node tests/bestSolution/qualifiedSolutions/paramsSort.js
```
5. 通过历史数据测试最佳参数盈利情况
```sh
node tests/test-mading4-3.js
```
6. 查看测试情况

* 控制台会得到如下结果：
```js
{
  profitRate: 10000,
  overNumberToRest: 15,
  howManyCandleHeight: 6,
  howManyNumForAvarageCandleHight: 6,
  overGrid: 5,
  nextBig: false,
  testMoney: 673.0414680197536,
  maxMoney: 697.9778231200553,
  minMoney: -243.4413620124446,
  tradeCount: 1111,
  mostCountKey: '2',
  mostCountValue: 479,
  mostCountMap: '{"2":479,"3":82,"4":24,"5":21,"6":5,"7":4,"8":9,"9":3,"10":2,"11":1,"12":1,"13":1,"14":1,"15":1,"17":1,"18":1,"19":1,"22":1,"27":1}',
  maxPosition: 27,
  lastPosition: 8,
  modelType: 1,
  model1: { timeDis: 6, profit: 0.3 },
  model2: { priceDis: 0.002, profit: 0.8 },
  maxPositionMoney: 620
}
```

* 更详细的测试情况在 `tests/data/mading-1000pepeUSDT.js`，复制其中的`option`对象，浏览器打开 [echarts-line-simple](https://echarts.apache.org/examples/zh/editor.html?c=line-simple) 粘贴即可查看盈利曲线

#### 调用正式环境api
进入`gridBot-doge3-7-1-mading-speed-small.js` 后，修改 `isTest`值为false即可

```sh
forever start --minUptime 10000 --spinSleepTime 10000 -o /dev/null -e /dev/null gridBot-mading-speed-small-1000pepe.js
```

* `data`目录下查看日志

#### 注意事项
1. 访问不了api？
    * 需要代理
2. 请在交易界面开启双向开仓功能
3. 这三个文件的代码逻辑是一样的： gridBot-doge3-7-1-mading-speed-small.js test-mading4-3.js test-mading4-6.js
    * 不用疑惑，请谅解这是最初的代码，后续考虑只保留一套，并删除无用代码
    * 测试就关注 [test-mading4-3.js](https://github.com/fulinpeng/trading-bot/tree/main-deprecated/tests/test-mading4-3.js) [test-mading4-6.js](https://github.com/fulinpeng/trading-bot/tree/main-deprecated/tests/test-mading4-6.js) 这俩文件
    * 正式环境只关注 [gridBot-doge3-7-1-mading-speed-small.js](https://github.com/fulinpeng/trading-bot/tree/main-deprecated/gridBot-doge3-7-1-mading-speed-small.js)

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