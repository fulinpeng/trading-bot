module.exports = {
    // 指定需要按顺序执行的测试文件
    setupFilesAfterEnv: [
        "./tests/mutationFunction.test.js",
        "./tests/ma.test.js", 
        "./tests/adx.test.js"
    ]
};
