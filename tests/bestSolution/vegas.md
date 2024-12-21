一下均以多头为例
1.判定方向
2.寻找靠近状态
3.寻找开单信号K


关于如何判定方向
1.连续5根  ema12 > ema144  且  ema144 > ema169
2. 5根k线 avg(ema12) - avg(ema144)   >=  mea12 (靠近时信号K) *  0.03


关于“靠近“ 逻辑 简化如下：
若 k线最低价格 来到  ema169 <= Kmin <= ema144 * 1.025范围 。 flag=true
若 后续k线出现  Kmin <  ema169   flag=false
若 flag=true &&  Kend(实体收盘) >= ema12  则 open  , flag = false


开单信号K 

flag=true &&  Kend(实体收盘) >= ema12  则 open  , flag = false