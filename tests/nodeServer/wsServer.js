const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

/////////////////////////////////截取测试数据////////////////////////////////////////
const maxKLinelen = 1000;
const startTime = '2025-07-29_00-00-00'; // 开始时间，例如: "2025-01-01_00-00-00" 或时间戳
const endTime = '2025-08-30_00-00-00';
const testSymbol = 'ethusdt'; // 测试交易对
const testKlineStage = '5m';  // 测试K线级别
/////////////////////////////////////////////////////////////////////////

// 全局变量：加载后的K线数据
let originLineData = null;

/**
 * 加载 K 线数据文件
 * @param {string} symbol - 交易对符号
 * @param {string} klineStage - K线级别
 * @returns {Array} K线数据数组
 */
const loadKLineData = (symbol, klineStage) => {
  // const filePath = path.resolve(__dirname, `../../tests/${symbol}2.js`);
  // const filePath = path.resolve(__dirname, `../../tests/source/renko-${symbol}-${klineStage}.js`);
  const filePath = path.resolve(__dirname, `../../tests/source/${symbol}-${klineStage}.js`);
  // const filePath = path.resolve(__dirname, `../../tests/source/${symbol}-${klineStage}-part.js`);
  
  // 确保读取最新数据
  delete require.cache[require.resolve(filePath)];
  const fileData = require(filePath);
  const kLineData = fileData.kLineData || [];
  
  // 计算开始和结束索引
  let startIndex = 0;
  let endIndex = kLineData.length - 1;
  
  // 如果提供了 startTime，找到对应的索引（直接使用字符串比较）
  if (startTime) {
    const foundIndex = kLineData.findIndex(item => {
      return item.openTime === startTime;
    });
    
    if (foundIndex !== -1) {
      startIndex = foundIndex;
    }
  }
  
  // 如果提供了 endTime，找到对应的索引（直接使用字符串比较）
  if (endTime) {
    const foundIndex = kLineData.findIndex(item => {
      return item.openTime === endTime;
    });
    
    if (foundIndex !== -1) {
      endIndex = foundIndex - 1;
    }
  }
  
  // 使用 slice 直接取数据
  console.log({
    startIndex,
    endIndex,
    startTime,
    endTime,
    startTimeDate: kLineData[startIndex].openTime,
    endTimeDate: kLineData[endIndex].openTime
})
  return kLineData.slice(startIndex, endIndex + 1);
};

/**
 * 初始化全局K线数据
 */
const initOriginLineData = () => {
  if (!originLineData) {
    originLineData = loadKLineData(testSymbol, testKlineStage);
  }
  return originLineData;
};

/**
 * HTTP 接口：返回指定 symbol 和 klineStage 的前 limit 条 K 线数据
 * 示例请求：GET /v1/klines?symbol=BTCUSDT&klineStage=1m&limit=1000
 */
app.get('/v1/klines', (req, res) => {
  const { symbol, klineStage, limit } = req.query;
  console.log("🚀 ~ wss.on ~ klineStage:", symbol, klineStage)
  if (!symbol || !klineStage) {
    return res.status(400).json({ error: '缺少必要参数 symbol 或 klineStage' });
  }

  try {
    const data = initOriginLineData();
    const result = data.slice(0, Number(limit));
    res.json(result);
  } catch (err) {
    console.error('读取文件失败:', err);
    res.status(500).json({ error: '读取文件失败' });
  }
});

wss.on('connection', (ws, req) => {
      const match = req.url.match(/^\/ws\/(.+)@kline_(.+)$/);
      if (!match) {
        ws.send(JSON.stringify({ error: '无效的 WebSocket 连接地址格式' }));
        ws.close();
        return;
      }
    
      const symbol = match[1];
      const klineStage = match[2];
  
    try {
      const data = initOriginLineData();
      let index = maxKLinelen; // 默认从第maxKLinelen条数据开始推送
  
      ws.on('message', (messageData) => {
        const message = Buffer.isBuffer(messageData) ? messageData.toString('utf8') : messageData;
        if (message === 'hello') {
          if (index < data.length) {
            const dataToSend = data[index];
            ws.send(JSON.stringify(dataToSend));
            index++;
          } else {
            ws.send(JSON.stringify({ error: '没有更多的数据可发送' }));
          }
        }
      });
  
    } catch (err) {
      ws.send(JSON.stringify({ error: '读取文件失败：' + err.message }));
      ws.close();
    }
  
    ws.on('close', () => {
      console.log('客户端已断开连接');
    });
  });
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  // 初始化全局K线数据
  initOriginLineData();
  console.log(`服务器运行中：`);
  console.log(`- HTTP接口: http://localhost:${PORT}/v1/klines?symbol=${testSymbol}&klineStage=${testKlineStage}&limit=100`);
  console.log(`- WebSocket地址: ws://localhost:${PORT}/ws/${testSymbol}@kline_${testKlineStage}`);
});
