# Kjører et Node-skript, med Node.js hvis det er installert, ellers Node-en som følger med VS Code.
#   powershell -File tools/node.ps1 tools/lagfont.js
#   powershell -File tools/node.ps1 tools/simuler.js 2026-11-25 25
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
Set-Location (Split-Path $PSScriptRoot -Parent)
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) { $exe = $node.Source } else { $exe = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"; $env:ELECTRON_RUN_AS_NODE = '1' }
$ut = Join-Path $env:TEMP 'hds_node_out.txt'; $feil = Join-Path $env:TEMP 'hds_node_err.txt'
$p = Start-Process -FilePath $exe -ArgumentList $Args -NoNewWindow -Wait -PassThru -RedirectStandardOutput $ut -RedirectStandardError $feil
Get-Content $ut -Encoding utf8
Get-Content $feil -Encoding utf8 | Select-Object -First 40
exit $p.ExitCode
