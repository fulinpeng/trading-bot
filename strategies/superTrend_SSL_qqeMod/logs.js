/**
 * 日志收集系统
 * 用于收集K线数据、指标数据和交易记录，用于可视化展示
 * 可以通过配置开关控制是否启用
 */

const fs = require("fs");
const path = require("path");

// 日志收集器类
class LogCollector {
    constructor(config) {
        this.config = config;
        this.enabled = config?.enableVisualizationLogs || false; // 默认关闭
        this.symbol = config?.SYMBOL || '';
        this.strategyType = config?.strategyType || '';
        
        // 调试信息
        if (this.enabled) {
            console.log(`[日志收集器] 已启用 - Symbol: ${this.symbol}, Strategy: ${this.strategyType}`);
        } else {
            console.log(`[日志收集器] 未启用 - enableVisualizationLogs=${config?.enableVisualizationLogs}`);
        }
        this.data = {
            openHistory: [],         // 开仓时间
            closeHistory: [],        // 平仓时间
            trendHistory: [],       // 交易方向（'up'/'down'）
            openPriceHistory: [],   // 开仓价格
            closePriceHistory: [],  // 平仓价格
            curTestMoneyHistory: [], // 当前测试资金历史
            kLineData: [],          // K线数据（与指标数据一一对应）
            // 指标数组
            superTrendArr: [],
            sslArr: [],
            ssl2Arr: [],
            fibArr: [],
            swimingFreeArr: [],
            qqeModArr: [],
            adxArr: [],
            preHighLowArr: [],
        };
    }

    /**
     * 收集指标数组和K线数据（一次性收集所有指标的最新值和对应的K线数据）
     * @param {Object} state - 状态对象，包含所有指标数组和K线数据
     */
    collectIndicatorArrays(state) {
        if (!this.enabled) return;
        
        // 收集K线数据的最后一个值（与指标数据一一对应）
        const lastKLine = state.kLineData && state.kLineData.length > 0 
            ? state.kLineData[state.kLineData.length - 1] : null;
        
        // 收集各个指标数组的最后一个值
        const lastSuperTrend = state.superTrendArr && state.superTrendArr.length > 0 
            ? state.superTrendArr[state.superTrendArr.length - 1] : null;
        const lastSsl = state.sslArr && state.sslArr.length > 0 
            ? state.sslArr[state.sslArr.length - 1] : null;
        const lastSsl2 = state.ssl2Arr && state.ssl2Arr.length > 0 
            ? state.ssl2Arr[state.ssl2Arr.length - 1] : null;
        const lastFib = state.fibArr && state.fibArr.length > 0 
            ? state.fibArr[state.fibArr.length - 1] : null;
        const lastSwimingFree = state.swimingFreeArr && state.swimingFreeArr.length > 0 
            ? state.swimingFreeArr[state.swimingFreeArr.length - 1] : null;
        const lastQqeMod = state.qqeModArr && state.qqeModArr.length > 0 
            ? state.qqeModArr[state.qqeModArr.length - 1] : null;
        const lastAdx = state.adxArr && state.adxArr.length > 0 
            ? state.adxArr[state.adxArr.length - 1] : null;
        const lastPreHighLow = state.preHighLowArr && state.preHighLowArr.length > 0 
            ? state.preHighLowArr[state.preHighLowArr.length - 1] : null;
        
        // 追加到数组（保持历史记录，确保K线数据和指标数据一一对应）
        this.data.kLineData.push(lastKLine);
        this.data.superTrendArr.push(lastSuperTrend);
        this.data.sslArr.push(lastSsl);
        this.data.ssl2Arr.push(lastSsl2);
        this.data.fibArr.push(lastFib);
        this.data.swimingFreeArr.push(lastSwimingFree);
        this.data.qqeModArr.push(lastQqeMod);
        this.data.adxArr.push(lastAdx);
        this.data.preHighLowArr.push(lastPreHighLow);
    }

    /**
     * 记录开仓
     * @param {string} time - 开仓时间
     * @param {number} price - 开仓价格
     * @param {string} trend - 交易方向（'up'/'down'）
     * @param {number} testMoney - 当前测试资金
     */
    recordOpen(time, price, trend, testMoney) {
        if (!this.enabled) return;
        
        this.data.openHistory.push(time);
        this.data.openPriceHistory.push(price);
        this.data.trendHistory.push(trend);
        this.data.curTestMoneyHistory.push(testMoney);
    }

    /**
     * 记录平仓
     * @param {string} time - 平仓时间
     * @param {number} price - 平仓价格
     * @param {number} testMoney - 当前测试资金
     */
    recordClose(time, price, testMoney) {
        if (!this.enabled) return;
        
        this.data.closeHistory.push(time);
        this.data.closePriceHistory.push(price);
        // 更新最后一次的测试资金
        if (this.data.curTestMoneyHistory.length > 0) {
            this.data.curTestMoneyHistory[this.data.curTestMoneyHistory.length - 1] = testMoney;
        }
    }

    /**
     * 更新当前测试资金（每根K线更新）
     * @param {number} testMoney - 当前测试资金
     */
    updateTestMoney(testMoney) {
        if (!this.enabled) return;
        
        // 如果有开仓记录，更新最后一个值；否则不做任何操作
        // 因为 curTestMoneyHistory 只在开仓时 push，每根K线更新最后一个值
        if (this.data.curTestMoneyHistory.length > 0) {
            this.data.curTestMoneyHistory[this.data.curTestMoneyHistory.length - 1] = testMoney;
        }
    }

    /**
     * 获取收集的数据
     * @returns {Object} 收集的数据
     */
    getData() {
        return this.data;
    }

    /**
     * 保存数据到文件（参考 test-superTrend_swim_free.js 的格式）
     */
    saveToFile() {
        if (!this.enabled) {
            console.log(`[日志收集器] 保存被跳过 - enabled=${this.enabled}`);
            return;
        }
        
        try {
            const testDataPath = path.join(__dirname, 'test', 'data');
            console.log(`[日志收集器] 准备保存到: ${testDataPath}`);
            
            if (!fs.existsSync(testDataPath)) {
                fs.mkdirSync(testDataPath, { recursive: true });
                console.log(`[日志收集器] 创建目录: ${testDataPath}`);
            }
            
            // 保持symbol的原始大小写（通常是小写，如 ethUSDT）
            const fileName = `${this.symbol}-${this.strategyType}.js`;
            const filePath = path.join(testDataPath, fileName);
            console.log(`[日志收集器] 文件路径: ${filePath}`);
            
            // 参考 test-superTrend_swim_free.js 的格式
            const content = `
        var kLineData = ${JSON.stringify(this.data.kLineData, null, 8)}
        var openHistory = ${JSON.stringify(this.data.openHistory, null, 8)}
        var closeHistory = ${JSON.stringify(this.data.closeHistory, null, 8)}
        var trendHistory = ${JSON.stringify(this.data.trendHistory, null, 8)}
        var openPriceHistory = ${JSON.stringify(this.data.openPriceHistory, null, 8)}
        var closePriceHistory = ${JSON.stringify(this.data.closePriceHistory, null, 8)}
        var curTestMoneyHistory = ${JSON.stringify(this.data.curTestMoneyHistory, null, 8)}
        var superTrendArr = ${JSON.stringify(this.data.superTrendArr, null, 8)}
        var sslArr = ${JSON.stringify(this.data.sslArr, null, 8)}
        var ssl2Arr = ${JSON.stringify(this.data.ssl2Arr, null, 8)}
        var fibArr = ${JSON.stringify(this.data.fibArr, null, 8)}
        var swimingFreeArr = ${JSON.stringify(this.data.swimingFreeArr, null, 8)}
        var qqeModArr = ${JSON.stringify(this.data.qqeModArr, null, 8)}
        var adxArr = ${JSON.stringify(this.data.adxArr, null, 8)}
        var preHighLowArr = ${JSON.stringify(this.data.preHighLowArr, null, 8)}
        
        module.exports={
            kLineData,
            openHistory,
            closeHistory,
            trendHistory,
            openPriceHistory,
            closePriceHistory,
            curTestMoneyHistory,
            superTrendArr,
            sslArr,
            ssl2Arr,
            fibArr,
            swimingFreeArr,
            qqeModArr,
            adxArr,
            preHighLowArr,
        }
    `;
            
            // 检查是否有数据需要保存
            const hasData = this.data.superTrendArr.length > 0 || this.data.openHistory.length > 0;
            if (!hasData) {
                console.log(`[日志收集器] 跳过保存 - 没有数据（指标数组长度=${this.data.superTrendArr.length}, 开仓记录=${this.data.openHistory.length}）`);
                return;
            }
            
            fs.writeFileSync(filePath, content, "utf-8");
            console.log(`[日志收集器] ✅ 数据已保存: ${filePath}`);
            console.log(`[日志收集器]   K线数据长度: ${this.data.kLineData.length}, 指标数组长度: SuperTrend=${this.data.superTrendArr.length}, SSL=${this.data.sslArr.length}, 开仓记录=${this.data.openHistory.length}`);
        } catch (error) {
            console.error("[日志收集器] ❌ 保存失败:", error.message);
            console.error("[日志收集器] 错误堆栈:", error.stack);
        }
    }

    /**
     * 清空数据
     */
    clear() {
        this.data = {
            openHistory: [],
            closeHistory: [],
            trendHistory: [],
            openPriceHistory: [],
            closePriceHistory: [],
            curTestMoneyHistory: [],
            kLineData: [],
            superTrendArr: [],
            sslArr: [],
            ssl2Arr: [],
            fibArr: [],
            swimingFreeArr: [],
            qqeModArr: [],
            adxArr: [],
            preHighLowArr: [],
        };
    }
}

// 创建全局日志收集器实例
let logCollector = null;

/**
 * 初始化日志收集器
 * @param {Object} config - 配置对象
 * @returns {LogCollector} 日志收集器实例
 */
function initLogCollector(config) {
    if (!logCollector) {
        logCollector = new LogCollector(config);
    }
    return logCollector;
}

/**
 * 获取日志收集器实例
 * @returns {LogCollector|null} 日志收集器实例
 */
function getLogCollector() {
    return logCollector;
}

module.exports = {
    LogCollector,
    initLogCollector,
    getLogCollector,
};

