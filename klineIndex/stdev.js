// 计算标准差 (Standard Deviation)
function calcStdev(values, length) {
    return values.map((val, idx, arr) => {
        // 如果当前索引小于长度，返回 null，因为还无法计算标准差
        if (idx < length - 1) return null;
        // 计算均值
        const slice = arr.slice(idx - length + 1, idx + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / length;
        // 计算方差
        const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / length;
        // 返回标准差
        return Math.sqrt(variance);
    });
}


module.exports = {
    calcStdev,
};
