const redisClient = require("./redisClient");

// 获取全局参数
async function getGlobalVariables(globalKey, symbol) {
    return new Promise((resolve, reject) => {
        redisClient.get(`${globalKey}_${symbol}`, (err, data) => {
            if (err) return reject(err);
            if (data) {
                resolve(JSON.parse(data));
            } else {
                // 如果 Redis 中没有数据
                resolve(null);
            }
        });
    });
}

// 设置（更新）全局参数
async function setGlobalVariables(globalKey, symbol, params) {
    return new Promise((resolve, reject) => {
        redisClient.set(`${globalKey}_${symbol}`, JSON.stringify(params), (err, res) => {
            if (err) return reject(err);
            resolve(res);
        });
    });
}

module.exports = {
    getGlobalVariables,
    setGlobalVariables,
};
