// https://fapi.binance.com/fapi/v1/klines?symbol=zkUSDT&interval=1h&limit=1440&startTime=1721836800000

const axios = require("axios"); // HTTP请求库
const { getDate } = require("./utils/functions.js");
const fs = require("fs");
const dayjs = require("dayjs");
const fapi = "https://fapi.binance.com/fapi";
const { HttpsProxyAgent } = require("https-proxy-agent");

console.log("🚀process.argv:", process.argv);

let symbol = process.argv[2];

// 检查参数是否提供正确
if (!symbol) {
    console.error("请提供symbol");
    process.exit(1);
}
const data1 = require(`./tests/source/${symbol}-1h.js`);

// mac 小地球仪
let httpProxyAgent = new HttpsProxyAgent("http://127.0.0.1:31550");
// 创建公用的 Axios 实例
const axiosInstance = axios.create({
    // headers: {
    //     "Content-Type": "application/json",
    //     "X-MBX-APIKEY": apiKey,
    // },
    httpsAgent: httpProxyAgent, // 设置 SOCKS5 代理
});
const getKLineData = async (symbol, interval, limit, startTime) => {
    try {
        const response = await axiosInstance.get(`${fapi}/v1/klines`, {
            params: {
                symbol,
                interval,
                limit,
                startTime,
            },
        });
        // 解析K线数据
        return response.data.map((item) => ({
            openTime: getDate(item[0]), // 开盘时间
            open: parseFloat(item[1]), // 开盘价
            high: parseFloat(item[2]), // 最高价
            low: parseFloat(item[3]), // 最低价
            close: parseFloat(item[4]), // 收盘价(当前K线未结束的即为最新价)
            volume: parseFloat(item[5]), // 成交量
            closeTime: getDate(item[6]), // 收盘时间
            quoteAssetVolume: parseFloat(item[7]), // 成交额
            numberOfTrades: item[8], // 成交笔数
            takerBuyBaseAssetVolume: parseFloat(item[9]), // 主动买入成交量
            takerBuyQuoteAssetVolume: parseFloat(item[10]), // 主动买入成交额
        }));
    } catch (error) {
        console.log("🚀 ~ file: getKlines.js:33 ~ getKLineData ~ error:", error);
        return;
    }
};

const getDatas = async (symbol) => {
    let result = [];
    let startTime = 0;
    if (data1.kLineData && data1.kLineData.length) {
        result = data1.kLineData;
        let lastKline = data1.kLineData[data1.kLineData.length - 1];
        startTime =
            dayjs(
                lastKline.closeTime.replace(
                    /^(\d{4}\-\d{2}-\d{2})\_(\d{2})\-(\d{2})\-(\d{2})$/,
                    ($1, $2, $3, $4, $5) => {
                        return `${$2} ${$3}:${$4}:${$5}`;
                    },
                ),
            ).valueOf() + 1000;
    } else {
        throw new Error("还没有该文件，请创建");
    }
    let limit = 24 * 30 * 2; // 2个月有 1h 级别k线 1440 根
    let twoMonth = 30 * 2 * 24 * 60 * 60 * 1000; // ms
    let num = parseInt((Date.now() - startTime) / twoMonth); // 多少个towMonth（请求多少次）
    let rest = parseInt(((Date.now() - startTime) % twoMonth) / 1000 / 60 / 60);

    let isErro = false;
    for (let i = 0; i < num; i++) {
        let _startTime = startTime + twoMonth * i;
        let resItem = await getKLineData(symbol, `1h`, limit, _startTime);
        if (resItem) {
            result = result.concat(resItem);
        } else {
            console.log("🚀 ~ file: getKlines.js:46 ~ getDatas ~ resItem:", resItem);
            // getKLineData 返回没有数据，说明api次数被用完了
            isErro = true;
            break;
        }
    }
    if (rest && !isErro) {
        let _startTime = startTime + twoMonth * num;
        limit = rest;
        let resItem = await getKLineData(symbol, `1h`, limit, _startTime);
        if (resItem) {
            result = result.concat(resItem);
        } else {
            console.log("🚀 ~ file: getKlines.js:46 ~ getDatas ~ resItem:", resItem);
            // getKLineData 返回没有数据，说明api次数被用完了
        }
    }
    writeInFile(`./tests/source/${symbol}-1h.js`, {
        kLineData: result,
    });
};

function writeInFile(fileName, data) {
    fs.writeFileSync(fileName, `module.exports =  ${JSON.stringify(data, null, 2)}`, {
        flag: "w",
    });
}
// 顶上引入文件也要改
getDatas(symbol);
