# Starts the game locally on http://localhost:3000
# Uses Node.js if it is installed, otherwise the Node that ships with VS Code.
Set-Location $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  & $node.Source server/server.js
} else {
  $code = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
  if (-not (Test-Path $code)) { Write-Error 'Fant verken Node.js eller VS Code. Installer Node.js 22.5 eller nyere fra nodejs.org.'; exit 1 }
  $env:ELECTRON_RUN_AS_NODE = '1'
  # Code.exe is a GUI program, so PowerShell has to be told to wait for it.
  Start-Process -FilePath $code -ArgumentList 'server/server.js' -NoNewWindow -Wait
}
