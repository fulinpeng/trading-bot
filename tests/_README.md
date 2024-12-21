* mading策略有效文件
    * test-mading4-6 用于寻找最佳参数
    * test-mading4-3 可看曲线

* vegas策略有效文件
    * test-Vegas-0
        * 非标准vegas策略
        * 确定多空方向： 当前vegas策略成 && 上一次begas策略不成立
        * 开单依据： k线信号 + k线穿过ema12
        * 评价：⭐️⭐️⭐️
    * test-Vegas-1
        * 标准vegas策略
        * 结论： 回撤比较大
        * 评价：⭐️⭐️
    * test-Vegas-2
        * 结合 test-Vegas-0 + test-Vegas-1 策略
        * 评价：⭐️⭐️⭐️⭐️