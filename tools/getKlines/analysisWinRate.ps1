# analysisWinRate.ps1

# 初始化统计变量
$totalTrades = 0
$winningTrades = 0
$testMoneyList = @()

# 指定数据文件路径（请确保该文件存在且内容格式正确）
$dataFile = "logs/test-renko_boll-up-dogeusdt-2025-03-28_16-59-25.log"

# 读取文件中的每一行，并处理
Get-Content $dataFile | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    
    # 假设数据各字段用全角逗号（，）分隔
    # 分割后的数组：
    # [0] => "2024-04-11_10-45-00: 平空 closeDown ~ currentPrice curTestMoney testMoney:"
    # [1] => "0.19813000000000008"
    # [2] => "0.860609"
    # [3] => "33.69821528999974"
    $parts = $line -split "，"
    
    # 检查是否至少有 4 个字段
    if ($parts.Length -lt 4) {
        Write-Host "跳过格式不正确的行：$line"
        return
    }
    
    # 提取倒数第二列作为盈利值，最后一列为 testMoney
    $profitStr = $parts[2].Trim()
    $testMoneyStr = $parts[3].Trim()
    
    # 将字符串转换为数值
    try {
        $profit = [double]::Parse($profitStr)
        $testMoney = [double]::Parse($testMoneyStr)
    }
    catch {
        Write-Host "转换数值失败：$line"
        return
    }
    
    # 更新统计
    $totalTrades++
    if ($profit -gt 0) {
        $winningTrades++
    }
    
    # 记录 testMoney 值
    $testMoneyList += $testMoney
}

# 计算胜率
if ($totalTrades -gt 0) {
    $winRate = ($winningTrades / $totalTrades) * 100
} else {
    $winRate = 0
}

# 输出结果
Write-Output "胜率: $winRate%"
Write-Output "testMoney 数组: [$( $testMoneyList -join ', ' )]"
