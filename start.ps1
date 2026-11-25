# Starter spillet lokalt på http://localhost:3000
# Bruker Node.js hvis det er installert, ellers Node-en som følger med VS Code.
Set-Location $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  & $node.Source server/server.js
} else {
  $code = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
  if (-not (Test-Path $code)) { Write-Error 'Fant verken Node.js eller VS Code. Installer Node.js 22.5 eller nyere fra nodejs.org.'; exit 1 }
  $env:ELECTRON_RUN_AS_NODE = '1'
  # Code.exe er et vindusprogram, så vi må be PowerShell vente på det.
  Start-Process -FilePath $code -ArgumentList 'server/server.js' -NoNewWindow -Wait
}
