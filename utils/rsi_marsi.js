/**
 * 计算 RSI 指标
 * @param {Array<number>} prices - 收盘价数组
 * @param {Object} params - RSI 参数
 * @param {number} params.rsiLength - RSI 的周期长度（默认值：14）
 * @param {number} params.smaLength - 平滑 RSI 的 SMA 周期长度（默认值：5）
 * @returns {Object} - 当前 K 线的 RSI 和平滑 RSI 值
 */
function calculateRSI(prices, params = { rsiLength: 14, smaLength: 5 }) {
    const { rsiLength, smaLength } = params;

    // 辅助函数：计算 RMA（平滑移动平均线）
    const rma = (values, length) => {
        const alpha = 1 / length;
        let rmaValues = [];
        let previousRma = values.slice(0, length).reduce((sum, val) => sum + val, 0) / length; // 初始值使用 SMA
        rmaValues.push(previousRma);

        for (let i = length; i < values.length; i++) {
            const currentRma = alpha * values[i] + (1 - alpha) * previousRma;
            rmaValues.push(currentRma);
            previousRma = currentRma;
        }

        return rmaValues;
    };

    // 步骤 1：计算价格变动
    const changes = prices.map((value, index) => {
        if (index === 0) return 0; // 第一根 K 线无变动
        return value - prices[index - 1];
    });

    // 步骤 2：计算上升和下降部分
    const upChanges = changes.map((change) => (change > 0 ? change : 0));
    const downChanges = changes.map((change) => (change < 0 ? -change : 0));

    // 步骤 3：计算 RSI 的平滑平均值
    const avgUp = rma(upChanges, rsiLength);
    const avgDown = rma(downChanges, rsiLength);

    // 步骤 4：计算 RSI 值
    const rsi = avgUp.map((up, index) => {
        const down = avgDown[index];
        if (down === 0) return 100; // 避免除零错误
        if (up === 0) return 0; // RSI 为 0
        return 100 - 100 / (1 + up / down);
    });

    // 步骤 5：平滑 RSI 值
    const sma = (values, length) => {
        const result = [];
        for (let i = length - 1; i < values.length; i++) {
            const slice = values.slice(i - length + 1, i + 1);
            const avg = slice.reduce((sum, val) => sum + val, 0) / length;
            result.push(avg);
        }
        return result;
    };
    const smoothedRsi = sma(rsi, smaLength);

    // 返回当前 K 线的 RSI 和平滑 RSI
    return {
        rsi: rsi[rsi.length - 1], // 当前 RSI
        smoothedRsi: smoothedRsi[smoothedRsi.length - 1], // 当前平滑 RSI
    };
}

module.exports = calculateRSI;
