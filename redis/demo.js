const { getGlobalVariables, setGlobalVariables } = require('./mading/globalVariables');

async function updateTradingBotData() {
    try {
        // 获取当前全局参数
        let params = await getGlobalVariables();

        // 假设我们要更新当前价格
        params.currentPrice = 0.08000;

        // 更新 Redis 中的全局参数
        await setGlobalVariables(params);

        console.log('全局参数更新成功');
    } catch (error) {
        console.error('更新全局参数时出错:', error);
    }
}

// 调用示例
updateTradingBotData();
