duo = [
  {
    symbol: 'DOGEUSDT',
    positionAmt: '0',
    entryPrice: '0.0',
    breakEvenPrice: '0.0',
    markPrice: '0.17876815',
    unRealizedProfit: '0.00000000',
    liquidationPrice: '0',
    leverage: '4',
    maxNotionalValue: '7000000',
    marginType: 'isolated',
    isolatedMargin: '0.00000000',
    isAutoAddMargin: 'false',
    positionSide: 'LONG',
    notional: '0',
    isolatedWallet: '0',
    updateTime: 1709614828875,
    isolated: true,
    adlQuantile: 0
  },
  {
    symbol: 'DOGEUSDT',
    positionAmt: '-30',
    entryPrice: '0.175896779661',
    breakEvenPrice: '0.1772121376667',
    markPrice: '0.17876815',
    unRealizedProfit: '-0.08614140',
    liquidationPrice: '0.21903766',
    leverage: '4',
    maxNotionalValue: '7000000',
    marginType: 'isolated',
    isolatedMargin: '1.24094090',
    isAutoAddMargin: 'false',
    positionSide: 'SHORT',
    notional: '-5.36304450',
    isolatedWallet: '1.32708230',
    updateTime: 1709614987686,
    isolated: true,
    adlQuantile: 1
  }
]

// kong
[
    {
        symbol: "AGIXUSDT",
        positionAmt: "0",
        entryPrice: "0.0",
        breakEvenPrice: "0.0",
        markPrice: "0.45200000",
        unRealizedProfit: "0.00000000",
        liquidationPrice: "0",
        leverage: "1",
        maxNotionalValue: "1.0E7",
        marginType: "isolated",
        isolatedMargin: "0.00000000",
        isAutoAddMargin: "false",
        positionSide: "LONG",
        notional: "0",
        isolatedWallet: "0",
        updateTime: 1708253020071,
        isolated: true,
        adlQuantile: 0,
    },
    {
        symbol: "AGIXUSDT",
        positionAmt: "-13",
        entryPrice: "0.4518",
        breakEvenPrice: "0.4515741",
        markPrice: "0.45200000",
        unRealizedProfit: "-0.00260000",
        liquidationPrice: "0.88566088",
        leverage: "1",
        maxNotionalValue: "1.0E7",
        marginType: "isolated",
        isolatedMargin: "5.86786330",
        isAutoAddMargin: "false",
        positionSide: "SHORT",
        notional: "-5.87600000",
        isolatedWallet: "5.87046330",
        updateTime: 1708253349284,
        isolated: true,
        adlQuantile: 0,
    },
];

[
    1499040000000, // 开盘时间
    "0.01634790", // 开盘价
    "0.80000000", // 最高价
    "0.01575800", // 最低价
    "0.01577100", // 收盘价(当前K线未结束的即为最新价)
    "148976.11427815", // 成交量
    1499644799999, // 收盘时间
    "2434.19055334", // 成交额
    308, // 成交笔数
    "1756.87402397", // 主动买入成交量
    "28.46694368", // 主动买入成交额
    "17928899.62484339", // 请忽略该参数
];
[
    {
        openTime, // 开盘时间
        open, // 开盘价
        high, // 最高价
        low, // 最低价
        close, // 收盘价(当前K线未结束的即为最新价)
        volume, // 成交量
        closeTime, // 收盘时间
        quoteAssetVolume, // 成交额
        numberOfTrades, // 成交笔数
        takerBuyBaseAssetVolume, // 主动买入成交量
        takerBuyQuoteAssetVolume, // 主动买入成交额
    },
];

res = [
    {
        symbol: "BLURUSDT",
        positionAmt: "14",
        entryPrice: "0.721575",
        breakEvenPrice: "0.7220035",
        markPrice: "0.72110000",
        unRealizedProfit: "-0.00665000",
        liquidationPrice: "0.54942259",
        leverage: "4",
        maxNotionalValue: "2000000",
        marginType: "isolated",
        isolatedMargin: "2.51886250",
        isAutoAddMargin: "false",
        positionSide: "LONG",
        notional: "10.09540000",
        isolatedWallet: "2.52551250",
        updateTime: 1709350466288,
        isolated: true,
        adlQuantile: 2,
    },
    {
        symbol: "BLURUSDT",
        positionAmt: "-28",
        entryPrice: "0.72165",
        breakEvenPrice: "0.721289175",
        markPrice: "0.72110000",
        unRealizedProfit: "0.01540000",
        liquidationPrice: "0.88839917",
        leverage: "4",
        maxNotionalValue: "2000000",
        marginType: "isolated",
        isolatedMargin: "5.05750448",
        isAutoAddMargin: "false",
        positionSide: "SHORT",
        notional: "-20.19080000",
        isolatedWallet: "5.04210448",
        updateTime: 1709350499756,
        isolated: true,
        adlQuantile: 2,
    },
];

allPositionDetail = {
    up: {
        trend: "up",
        side: "BUY",
        orderPrice: 0.721575,
        quantity: 14,
        breakEvenPrice: "0.7220035",
    },
    down: {
        trend: "down",
        side: "SELL",
        orderPrice: 0.72165,
        quantity: 28,
        breakEvenPrice: "0.721289175",
    },
};

b = [
    {
        "symbol": "DOGEUSDT",
        "positionAmt": "0",
        "entryPrice": "0.0",
        "breakEvenPrice": "0.0",
        "markPrice": "0.16465933",
        "unRealizedProfit": "0.00000000",
        "liquidationPrice": "0",
        "leverage": "6",
        "maxNotionalValue": "2200000",
        "marginType": "isolated",
        "isolatedMargin": "0.00000000",
        "isAutoAddMargin": "false",
        "positionSide": "LONG",
        "notional": "0",
        "isolatedWallet": "0",
        "updateTime": 1709885370434,
        "isolated": true,
        "adlQuantile": 0
    },
    {
        "symbol": "DOGEUSDT",
        "positionAmt": "-32",
        "entryPrice": "0.16395",
        "breakEvenPrice": "0.16395",
        "markPrice": "0.16465933",
        "unRealizedProfit": "-0.02269856",
        "liquidationPrice": "0.19059204",
        "leverage": "6",
        "maxNotionalValue": "2200000",
        "marginType": "isolated",
        "isolatedMargin": "0.86034145",
        "isAutoAddMargin": "false",
        "positionSide": "SHORT",
        "notional": "-5.26909856",
        "isolatedWallet": "0.88304001",
        "updateTime": 1709886017670,
        "isolated": true,
        "adlQuantile": 1
    }
]