/**
 * Calculate Hull Suite indicator based on the provided K-line data and parameters.
 *
 * @param {Array} klineData - Array of K-line data where each item is an object with at least `close` and `time` fields.
 * @param {Object} params - Parameters for the Hull Suite indicator:
 *                          - source: The price source to calculate the indicator (e.g., "close").
 *                          - modeSwitch: Hull variation mode ("Hma", "Thma", "Ehma").
 *                          - length: Base length of the Hull MA.
 *                          - lengthMult: Multiplier for length (useful for higher timeframes).
 *                          - useHtf: Boolean indicating whether to use higher timeframe.
 *                          - htf: Higher timeframe resolution (e.g., "240").
 * @returns {Array} - Array of results where each item is an object with:
 *                    - time: Timestamp of the K-line.
 *                    - MHULL: Main Hull MA value.
 *                    - SHULL: Smoothed Hull MA value (2 steps back).
 */

const defaultParams={
	source: "close",
	modeSwitch: "Hma",
	length: 55,
	lengthMult: 1.0,
	useHtf: false,
	htf: "240",
};
function calculateHullSuite(klineData, params) {
	const {source, modeSwitch, length, lengthMult, useHtf}= {...defaultParams, ...params};

	// Helper functions
	const wma=(data, length) => {
		if (data.length<length) return [];
		const wmaResults=[];
		const divisor=(length*(length+1))/2;

		for (let i=0;i<=data.length-length;i++) {
			let sum=0;
			for (let j=0;j<length;j++) {
				sum+=data[i+j]*(length-j);
			}
			wmaResults.push(sum/divisor);
		}

		return Array(data.length-wmaResults.length).fill(null).concat(wmaResults);
	};

	const ema=(data, length) => {
		if (data.length<length) return [];
		const emaResults=[];
		const alpha=2/(length+1);

		emaResults[0]=data[0]; // Initialize with the first value
		for (let i=1;i<data.length;i++) {
			emaResults[i]=alpha*data[i]+(1-alpha)*emaResults[i-1];
		}

		return emaResults;
	};

	const HMA=(data, length) => {
		const halfLength=Math.round(length/2);
		const sqrtLength=Math.round(Math.sqrt(length));
		const wma1=wma(data, halfLength);
		const wma2=wma(data, length);
		const diff=wma1.map((val, idx) => (val!==null&&wma2[idx]!==null? 2*val-wma2[idx]:null));
		return wma(diff, sqrtLength);
	};

	const EHMA=(data, length) => {
		const halfLength=Math.round(length/2);
		const sqrtLength=Math.round(Math.sqrt(length));
		const ema1=ema(data, halfLength);
		const ema2=ema(data, length);
		const diff=ema1.map((val, idx) => (val!==null&&ema2[idx]!==null? 2*val-ema2[idx]:null));
		return ema(diff, sqrtLength);
	};

	const THMA=(data, length) => {
		const thirdLength=Math.round(length/3);
		const halfLength=Math.round(length/2);
		const wma1=wma(data, thirdLength);
		const wma2=wma(data, halfLength);
		const wma3=wma(data, length);
		return wma1.map((val, idx) =>
			val!==null&&wma2[idx]!==null&&wma3[idx]!==null? val*3-wma2[idx]-wma3[idx]:null
		);
	};

	// Calculate Hull Suite
	const srcData=klineData.map((kline) => kline[source]);
	const adjustedLength=Math.round(length*lengthMult);

	let HULL;
	switch (modeSwitch) {
		case "Ehma":
			HULL=EHMA(srcData, adjustedLength);
			break;
		case "Thma":
			HULL=THMA(srcData, adjustedLength/2);
			break;
		case "Hma":
		default:
			HULL=HMA(srcData, adjustedLength);
			break;
	}

	// Optional higher timeframe handling (if `useHtf` is true, logic would depend on how you fetch HTF data)
	if (useHtf) {
		// Note: Implement your higher timeframe aggregation logic here.
		throw new Error("Higher timeframe calculation is not implemented in this example.");
	}

	// Prepare results
	return klineData.map((kline, idx) => ({
		time: kline.time,
		MHULL: HULL[idx],
		SHULL: idx>=2? HULL[idx-2]:null,
	}));
}

// // Example usage:
// const klineData=[
// 	{time: 1, close: 100},
// 	{time: 2, close: 101},
// 	{time: 3, close: 102},
// 	{time: 4, close: 103},
// 	{time: 5, close: 104},
// 	// Add more K-line data as needed
// ];

// const params={
// 	source: "close",
// 	modeSwitch: "Hma",
// 	length: 55,
// 	lengthMult: 1.0,
// 	useHtf: false,
// 	htf: "240",
// };

// const result=calculateHullSuite(klineData, params);
// console.log(result);


module.exports={
	calculateHullSuite
};
