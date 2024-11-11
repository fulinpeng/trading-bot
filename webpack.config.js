const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
    entry: {
        mading: "./goldDigger/mading/mading-sequence.js",
        // boll: "./goldDigger/boll/kline-signals.js",
        // grid: "./goldDigger/grid/keep-trend.js",
        // keltner: "./goldDigger/keltner/BBKeltner-KDJ.js",
        // rsiEma: "./goldDigger/rsiEma/rsi-macd.js",
    },
    output: {
        path: path.resolve(__dirname, "build"),
        filename: "[name]-bundle.js",
        chunkFilename: "[name].chunk.js",
    },
    target: "node",
    externals: [nodeExternals()],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                    },
                },
            },
        ],
    },
    optimization: {
        splitChunks: {
            chunks: "all",
            minSize: 0,
        },
    },
	mode: 'development' 
};
