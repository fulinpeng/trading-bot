以下是tradingview上 5 in 1  指标的pine代码，请帮我转为nodejs代码，保留数据参数和结果，返回值为当前k线对应的rsi指标相关逻辑即可，我只关系rsi相关逻辑，macd之类我不需要
study(title="5 in 1 ", shorttitle="5 in 1", overlay=false)
swa=input(false,title="AROON")
length = input(14, minval=1)
upper = 100 * (highestbars(high, length+1) + length)/length
lower = 100 * (lowestbars(low, length+1) + length)/length
midp = 0
oscillator = upper - lower
osc = plot(swa? oscillator:na, color=red)
mp = plot(swa?midp:na)
top = plot(swa?85:na)
bottom = plot(swa?-85:na)
co=oscillator>=95 and oscillator[1]>=oscillator?red :oscillator<=-88  ?green:na
bgcolor(swa?co:na,transp=70)
fill(osc, mp)
fill(top,bottom)
//rsi
swr=input(true,title="RSI")
src = close, len = input(14, minval=1, title="Length RSI")
srs=input(5, minval=1, title="Length sma RSI")
up = rma(max(change(src), 0), len)
down = rma(-min(change(src), 0), len)
rsi = down == 0 ? 100 : up == 0 ? 0 : 100 - (100 / (1 + up / down))
mr=sma(rsi,srs)
plot(swr?rsi:na,title="RSI", color=purple,transp=0)
plot(swr?mr:na,title="sma RSI", color=red,transp=0)
//macd
swm=input(false,title="MACD")
source = close
fastLength = input(12, minval=1), slowLength=input(26,minval=1)
signalLength=input(9,minval=1)
fastMA = ema(source, fastLength)
slowMA = ema(source, slowLength)
macd = fastMA - slowMA
signal = ema(macd, signalLength)
hist = macd - signal
plot(swm?hist:na, color=red, style=histogram)
plot(swm?macd:na, color=blue)
plot(swm?signal:na, color=orange)
//stoc
sws=input(false,title="STOCHASTIC")
periodK = input(14, title="K", minval=1)
periodD = input(3, title="D", minval=1)
smoothK = input(3, title="Smooth", minval=1)
k = sma(stoch(close, high, low, periodK), smoothK)
d = sma(k, periodD)
plot(sws?k:na, title="%K", color=blue)
plot(sws?d:na, title="%D", color=orange)
h0 =plot(sws or swr?80:na) 
h1 = plot(sws or swr?20:na)
fill(h0, h1, color=purple, transp=75)
//ADX
swx=input(false,title="ADX DI")

lenx = input(14, minval=1, title="DI Length")
lensig = input(14, title="ADX Smoothing", minval=1, maxval=50)
th = input(title="threshold", type=integer, defval=25)

upx = change(high)
downx = -change(low)
plusDM = na(upx) ? na : (upx > downx and upx > 0 ? upx : 0)
minusDM = na(downx) ? na : (downx > upx and downx > 0 ? downx : 0)
trur = rma(tr, lenx)
plus = fixnan(100 * rma(plusDM, lenx) / trur)
minus = fixnan(100 * rma(minusDM, lenx) / trur)
sum = plus + minus
adx = 100 * rma(abs(plus - minus) / (sum == 0 ? 1 : sum), lensig)

plot(swx?plus:na, color=blue, title="+DI")
plot(swx?minus:na, color=orange, title="-DI")
plot(swx?adx:na, color=red, title="ADX")
plot(swx?th:na, color=black, title="th")
