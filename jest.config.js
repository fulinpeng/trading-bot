module.exports = {
    // 指定需要按顺序执行的测试文件
    setupFilesAfterEnv: [
        "./tests/stdev.test.js",
        "./tests/ma.test.js",
        "./tests/adx.test.js",
        "./tests/mutationFunction.test.js",
    ]
};
