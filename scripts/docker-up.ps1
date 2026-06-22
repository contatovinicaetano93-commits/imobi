# Sobe Postgres + Redis. Reinicia Docker Desktop se o engine estiver offline.
$ErrorActionPreference = "Continue"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

function Test-DockerEngine {
  $null = cmd /c "docker info >nul 2>nul"
  return $LASTEXITCODE -eq 0
}

function Start-DockerDesktop {
  $paths = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
  )
  foreach ($p in $paths) {
    if (Test-Path $p) {
      Write-Host "Iniciando Docker Desktop..."
      Start-Process $p
      return $true
    }
  }
  Write-Error "Docker Desktop nao encontrado. Instale em https://www.docker.com/products/docker-desktop/"
  return $false
}

if (-not (Test-DockerEngine)) {
  Write-Host "Docker engine offline."
  $svc = Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue
  if ($svc) {
    Write-Host "Servico com.docker.service: $($svc.Status)"
    if ($svc.Status -ne "Running") {
      try {
        Start-Service com.docker.service -ErrorAction Stop
        Write-Host "Servico iniciado."
      } catch {
        Write-Host "Nao foi possivel iniciar o servico (pode precisar Admin)."
      }
    }
  }
  if (-not (Start-DockerDesktop)) { exit 1 }
  $deadline = (Get-Date).AddMinutes(5)
  do {
    Start-Sleep -Seconds 6
    if (Test-DockerEngine) { break }
    Write-Host "Aguardando Docker engine..."
  } while ((Get-Date) -lt $deadline)
  if (-not (Test-DockerEngine)) {
    Write-Host ""
    Write-Host "Docker engine nao respondeu."
    Write-Host "1. Feche o Docker Desktop (Quit na bandeja)"
    Write-Host "2. Abra de novo e espere ficar verde"
    Write-Host "3. Settings -> Troubleshoot -> Restart"
    Write-Host "4. Rode: pnpm docker:up"
    exit 1
  }
}

Write-Host "Docker OK. Subindo postgres + redis..."
Push-Location $root
try {
  docker compose up -d postgres redis
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $deadline = (Get-Date).AddMinutes(3)
  do {
    $health = docker inspect --format "{{.State.Health.Status}}" imbobi_postgres 2>$null
    if ($health -eq "healthy") {
      Write-Host "Postgres healthy."
      break
    }
    Start-Sleep -Seconds 4
    Write-Host "Aguardando Postgres... status=$health"
  } while ((Get-Date) -lt $deadline)

  docker compose ps
} finally {
  Pop-Location
}
