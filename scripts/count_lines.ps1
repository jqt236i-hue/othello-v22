$exts = @('.js','.ts','.jsx','.tsx','.html','.css','.json','.md','.py')
$excludesPattern = '[/\\](coverage|archive|artifacts|_flatten_backup_20260127_131541|node_modules|\.git)[/\\]'
$files = Get-ChildItem -Path . -Recurse -File | Where-Object { $exts -contains $_.Extension -and -not ($_.FullName -match $excludesPattern) }
$total = 0
$byExt = @{}
foreach ($f in $files) {
  try {
    $raw = Get-Content -Raw -LiteralPath $f.FullName -ErrorAction Stop
  } catch {
    $raw = $null
  }
  if ($raw -eq $null) { $lines = 0 } else { $lines = ($raw -split "`r`n|`r|`n").Length }
  $total += $lines
  if ($byExt.ContainsKey($f.Extension)) { $byExt[$f.Extension] += $lines } else { $byExt[$f.Extension] = $lines }
}
Write-Output "Files counted: $($files.Count)"
Write-Output "Total lines: $total"
$byExt.GetEnumerator() | Sort-Object Name | ForEach-Object { Write-Output ("$($_.Name): $($_.Value)") }