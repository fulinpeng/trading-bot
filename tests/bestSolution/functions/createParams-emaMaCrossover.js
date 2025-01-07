const fs=require("fs");
const path=require("path");

// 动态参数范围对象
const paramRangesObj={
	howManyCandle: {min: 1, max: 10, step: 1},
	isProfitRun: {min: 1, max: 1, step: 1},
	firstProtectProfitRate: {min: 1, max: 10, step: 0.5},
	firstStopLossRate: {min: 0.3, max: 0.9, step: 0.1},
	profitProtectRate: {min: 0.3, max: 0.9, step: 0.1},
	howManyCandleForProfitRun: {min: 0.3, max: 2, step: 0.1},
	maxStopLossRate: {min: 0.02, max: 0.05, step: 0.01},
	invalidSigleStopRate: {min: 0.1, max: 0.1, step: 0.01},
	double: {min: 1, max: 1, step: 1},
	maxLossCount: {min: 20, max: 20, step: 1},
	emaPeriod: {min: 10, max: 10, step: 1},
	smaPeriod: {min: 10, max: 10, step: 1},
	rsiPeriod: {min: 14, max: 14, step: 1},
};

// 参数文件路径
const paramsDir=path.resolve(__dirname, "params");
const paramsPath=path.join(paramsDir, "params.jsonl");

// 确保目录存在
function ensureParamsDirExists() {
	if (!fs.existsSync(paramsDir)) {
		fs.mkdirSync(paramsDir); // 如果目录不存在，创建 params 文件夹
	}
}

// 生成指定范围内的所有参数值数组
function generateParams(min, max, step) {
	const params=[];
	for (let i=min;i<=max;i=Math.round((i+step)*100)/100) {
		params.push(i); // 处理小数点精度问题
	}
	return params; // 返回包含该范围内所有值的数组
}

// 批量写入文件
function writeBatchToFile(writeStream, batch) {
	return new Promise((resolve, reject) => {
		writeStream.write(batch.join("\n")+"\n", (err) => {
			if (err) {
				reject(err); // 如果写入失败，拒绝 Promise
			} else {
				resolve(); // 写入成功，解决 Promise
			}
		});
	});
}

// 生成所有可能的参数组合，并分批保存到文件
async function generateCombinationsAndSave(paramRangesObj) {
	const allKeys=Object.keys(paramRangesObj); // 获取参数对象的所有字段名
	const allParams=allKeys.map((key) =>
		generateParams(paramRangesObj[key].min, paramRangesObj[key].max, paramRangesObj[key].step),
	); // 根据每个字段的 min、max、step 生成相应的参数数组

	ensureParamsDirExists(); // 确保目录存在
	const writeStream=fs.createWriteStream(paramsPath); // 创建写入流
	const batchSize=5000; // 每批写入的组合数量
	let batch=[]; // 批次容器
	let index=0; // 计数器，用于显示已处理的组合数量

	// 递归生成组合的函数
	async function generateCombination(currentIndex, currentCombination) {
		// allParams.length 一般为4，所以不需要考虑递归过深的问题
		if (currentIndex===allParams.length) {
			batch.push(JSON.stringify(currentCombination)); // 将 JSON 对象字符串化后添加到批次中

			// 当批次数量达到预定大小时，将其写入文件
			if (batch.length===batchSize) {
				await writeBatchToFile(writeStream, batch); // 等待写入当前批次
				batch=[]; // 清空批次
				process.stdout.write(`已写入 ${index+batchSize} 组参数\r`); // 更新控制台输出
			}
			index++; // 组合计数器增加
			return;
		}

		// 遍历当前参数的所有可能值
		for (const value of allParams[currentIndex]) {
			await generateCombination(currentIndex+1, [...currentCombination, value]); // 递归生成下一个组合
		}
	}

	await generateCombination(0, []); // 从索引 0 开始生成组合

	// 如果最后一批没有达到批次大小，也需要写入文件
	if (batch.length>0) {
		await writeBatchToFile(writeStream, batch); // 写入最后一批
	}

	writeStream.end(); // 结束写入流

	// 当写入完成时，显示总共写入的组合数量
	writeStream.on("finish", () => {
		process.stdout.write(`已写入 ${index} 组参数\n`); // 输出总数
		console.log(`所有参数组合已保存到 ${paramsPath}`); // 提示文件已保存
	});

	// 处理写入过程中发生的错误
	writeStream.on("error", (err) => {
		console.error("写入文件时出错:", err); // 输出错误信息
	});
}

// 执行生成组合并保存到文件
generateCombinationsAndSave(paramRangesObj);
