const { calculateADX } = require('../klineIndex/adx');
const kLineData =  require("./kLineData/kLine-adx");

describe('ADX 指标计算测试', () => {

  test('计算 ADX', () => {
    const period = 3;

    // 调用 calculateADX 函数计算 ADX
    const adx = calculateADX(kLineData, period);

    console.log("计算得到的 ADX:", adx);

    // const expectedADX = [23.4, 25.8, 27.1, 26.7, 28.3]; // 期望值
    // expect(adx).toEqual(expectedADX);

    // 检查 ADX 返回结果的长度是否符合预期
    expect(adx.length).toBeGreaterThan(0); // 确保 ADX 结果不为空
  });
});
