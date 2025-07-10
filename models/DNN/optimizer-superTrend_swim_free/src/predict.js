const tf = require('@tensorflow/tfjs-node');
const path = require('path');

async function predict(feature) {
    // 加载模型
    const modelPath = 'file://' + path.resolve(__dirname, '../model/tfjs_model/model.json');
    const model = await tf.loadLayersModel(modelPath);

    // 输入特征（必须与训练时维度相同）
    // const feature = [
    //     0.123, 0.45, 0.78, 1.12, 0.34, 0.56,  // k线
    //     1, 145.3, 144.1,                      // superTrend
    //     144.8, 145.6, 144.2, 1, 1, 0,         // swimingFree
    //     1, 145.4, 144.0,                      // ssl
    //     145.0,                                // fib basis
    //     145.5, 145.6, 145.7, 146.0, 146.5,    // fib upper
    //     144.5, 144.4, 144.3, 144.0, 143.5     // fib lower
    // ];

    const input = tf.tensor2d([feature], [1, feature.length]);

    // 预测
    const output = model.predict(input);
    const prediction = (await output.data())[0];

    // 输出
    // const threshold = 0.5;
    // console.log('预测胜率:', prediction.toFixed(4));
    // console.log('是否推荐开单:', prediction > threshold ? '✅ 是' : '❌ 否');
    return prediction;
}

predict([
    0.123, 0.45, 0.78, 1.12, 0.34, 0.56,  // k线
    1, 145.3, 144.1,                      // superTrend
    144.8, 145.6, 144.2, 1, 1, 0,         // swimingFree
    1, 145.4, 144.0,                      // ssl
    145.0,                                // fib basis
    145.5, 145.6, 145.7, 146.0, 146.5,    // fib upper
    144.5, 144.4, 144.3, 144.0, 143.5     // fib lower
]);

module.exports = { predict };
