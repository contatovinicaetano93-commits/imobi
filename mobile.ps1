# Duplo-clique ou rode no PowerShell — inicia o app mobile IMOBI
Set-Location $PSScriptRoot
Write-Host ""
Write-Host "IMOBI Mobile — iniciando Expo (LAN)..." -ForegroundColor Cyan
Write-Host "API em outro terminal: pnpm dev:api" -ForegroundColor DarkGray
Write-Host ""
pnpm mobile:dev:device
