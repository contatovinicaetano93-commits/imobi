# Fluxo completo: Docker -> migrate -> seed
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

& (Join-Path $PSScriptRoot "docker-up.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Push-Location $root
try {
  Write-Host "Rodando migrations..."
  pnpm --filter @imbobi/api exec prisma migrate deploy --schema prisma/schema.prisma
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "Rodando seed..."
  pnpm seed:dev
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Pronto. Agora reinicie a API: pnpm dev:api"
Write-Host "Login: tomador@imobi.com.br / Tomador@123"
