# Runs a Node script with Node.js if it is installed, otherwise with the Node that ships with VS Code.
#   powershell -File tools/node.ps1 tools/build-font.js
#   powershell -File tools/node.ps1 tools/simulate.js 2026-11-25 25
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
Set-Location (Split-Path $PSScriptRoot -Parent)
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) { $exe = $node.Source } else { $exe = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"; $env:ELECTRON_RUN_AS_NODE = '1' }
$out = Join-Path $env:TEMP 'hds_node_out.txt'; $err = Join-Path $env:TEMP 'hds_node_err.txt'
$p = Start-Process -FilePath $exe -ArgumentList $Args -NoNewWindow -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
Get-Content $out -Encoding utf8
Get-Content $err -Encoding utf8 | Select-Object -First 40
exit $p.ExitCode
