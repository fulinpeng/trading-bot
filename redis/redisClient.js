const redis = require('redis');

// 创建 Redis 客户端，连接到默认的 localhost:6379
const client = redis.createClient({
    host: '127.0.0.1',
    port: 6379
});

// 处理 Redis 客户端的连接事件
client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = client;
