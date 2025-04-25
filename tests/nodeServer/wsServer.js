const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

/////////////////////////////////截取测试数据////////////////////////////////////////
const targetTime = '' // "2025-02-01_00-00-00"
/////////////////////////////////////////////////////////////////////////


/**
 * HTTP 接口：返回指定 symbol 和 klineStage 的前 limit 条 K 线数据
 * 示例请求：GET /v1/klines?symbol=BTCUSDT&klineStage=1m&limit=1000
 */
app.get('/v1/klines', (req, res) => {
  const { symbol, klineStage, limit = limit } = req.query;
  console.log("🚀 ~ wss.on ~ klineStage:", symbol, klineStage)
  if (!symbol || !klineStage) {
    return res.status(400).json({ error: '缺少必要参数 symbol 或 klineStage' });
  }

    // const filePath = path.resolve(__dirname, `../../tests/${symbol}2.js`);
    const filePath = path.resolve(__dirname, `../../tests/source/renko-${symbol}-${klineStage}.js`);
//   const filePath = path.resolve(__dirname, `../../tests/source/${symbol}-${klineStage}.js`);
  try {
    // 确保读取最新数据
    delete require.cache[require.resolve(filePath)];
    const { kLineData: originLineData } = require(filePath);
    let _originLineData = [...originLineData];
    if (targetTime) {
        _originLineData = _originLineData.slice(originLineData.findIndex(item => item.openTime === targetTime) - limit)
    }
    const result = _originLineData.slice(0, Number(limit));
    res.json(result);
  } catch (err) {
    console.error('读取文件失败:', err);
    res.status(500).json({ error: '读取文件失败' });
  }
});

/**
 * WebSocket 服务器：
 * 连接示例：ws://localhost:3000/ws/BTCUSDT@kline_2023-03-24
 * 每 10 毫秒推送一条 K 线数据，从文件中读取，默认从第 100 条开始
 */
// wss.on('connection', (ws, req) => {
//   const match = req.url.match(/^\/ws\/(.+)@kline_(.+)$/);
//   if (!match) {
//     ws.send(JSON.stringify({ error: '无效的 WebSocket 连接地址格式' }));
//     ws.close();
//     return;
//   }

//   const symbol = match[1];
//   const klineStage = match[2];

//   let interval;
//   try {
//     const filePath = path.resolve(__dirname, `../../tests/source/renko-${symbol}-${klineStage}.js`);
//     let originLineData;
//     delete require.cache[require.resolve(filePath)];
//     const fileData = require(filePath);
//     originLineData = fileData.kLineData;
//     let _originLineData = [...originLineData];
//     if (targetTime) {
//         _originLineData = _originLineData.slice(originLineData.findIndex(item => item.openTime === targetTime) - limit)
//     }
//     // 默认从第 limit 条数据开始推送（数组下标 index）
//     let index = limit;
//     interval = setInterval(() => {
//       if (index < _originLineData.length) {
//         const dataToSend = _originLineData[index];
//         ws.send(JSON.stringify(dataToSend));
//         index++;
//       } else {
//         clearInterval(interval);
//       }
//     }, 1000);
//   } catch (err) {
//     ws.send(JSON.stringify({ error: '读取文件失败：' + err.message }));
//     ws.close();
//     return;
//   }

//   ws.on('close', () => {
//     clearInterval(interval);
//   });
// });

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
        // const filePath = path.resolve(__dirname, `../../tests/${symbol}2.js`);
    //   const filePath = path.resolve(__dirname, `../../tests/source/renko-${symbol}-${klineStage}.js`);
    //   const filePath = path.resolve(__dirname, `../../tests/source/${symbol}-${klineStage}.js`);
      const filePath = path.resolve(__dirname, `../../tests/source/${symbol}-${klineStage}-part.js`);
      delete require.cache[require.resolve(filePath)];
      const fileData = require(filePath);
      const originLineData = fileData.kLineData;
      let index = 30; // 默认从第100条数据开始推送
  
      ws.on('message', (data) => {
        const message = Buffer.isBuffer(data) ? data.toString('utf8') : data;
        if (message === 'hello') {
          if (index < originLineData.length) {
            const dataToSend = originLineData[index];
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
  console.log(`服务器运行中：`);
  console.log(`- HTTP接口: http://localhost:${PORT}/v1/klines?symbol=BTCUSDT&klineStage=1m&size=100`);
  console.log(`- WebSocket地址: ws://localhost:${PORT}/ws/BTCUSDT@kline_1m`);
});
