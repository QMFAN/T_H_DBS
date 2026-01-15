$ErrorActionPreference = "SilentlyContinue"
$ProgressPreference = "SilentlyContinue"

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $root

Write-Host ("[{0}] Starting production startup..." -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))

if(-not (Get-Command node -ErrorAction SilentlyContinue)){ Write-Host "node is not found"; exit 1 }
if(-not (Get-Command npm -ErrorAction SilentlyContinue)){ Write-Host "npm is not found"; exit 1 }
if(-not (Get-Command pm2 -ErrorAction SilentlyContinue)){
  Write-Host ("[{0}] Installing PM2 globally..." -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  cmd /c npm i -g pm2
  if($LASTEXITCODE -ne 0){ Write-Host "Failed to install PM2"; exit 1 }
}

Write-Host ("[{0}] Building frontend: npm install" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Push-Location (Join-Path $root 'frontend')
cmd /c npm install
if($LASTEXITCODE -ne 0){ Write-Host "Frontend dependency install failed"; Pop-Location; exit 1 }
Write-Host ("[{0}] Building frontend: npm run build" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
cmd /c npm run build
if($LASTEXITCODE -ne 0){ Write-Host "Frontend build failed"; Pop-Location; exit 1 }
Pop-Location

Write-Host ("[{0}] Building backend: npm install" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Push-Location (Join-Path $root 'backend')
cmd /c npm install
if($LASTEXITCODE -ne 0){ Write-Host "Backend dependency install failed"; Pop-Location; exit 1 }
Write-Host ("[{0}] Building backend: npm run build" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
cmd /c npm run build
if($LASTEXITCODE -ne 0){ Write-Host "Backend build failed"; Pop-Location; exit 1 }
Pop-Location

Write-Host ("[{0}] Starting backend with PM2..." -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
$ecos = Join-Path $root 'backend\ecosystem.config.js'
cmd /c pm2 start $ecos --env production --update-env
if($LASTEXITCODE -ne 0){ Write-Host "Backend start failed"; exit 1 }
cmd /c pm2 save | Out-Null
Start-Sleep -Seconds 3

Write-Host ("[{0}] Validating services..." -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
$beOk = $false
for($i=0;$i -lt 30;$i++){
  if((Test-NetConnection -ComputerName 127.0.0.1 -Port 3005).TcpTestSucceeded){ $beOk = $true; break }
  Start-Sleep -Seconds 1
}

$nginxExe = Join-Path $root 'infra/nginx/nginx.exe'
if(-not (Test-Path $nginxExe)){
  $fallback = Join-Path $Env:ProgramFiles 'nginx/nginx.exe'
  if(Test-Path $fallback){ $nginxExe = $fallback } else { $nginxExe = $null }
}
$nginxConf = Join-Path $root 'infra/nginx/nginx.conf'
if($nginxExe -and (Test-Path $nginxConf)){
  $running = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'nginx.exe' }
  if($running){ & $nginxExe -s reload -c $nginxConf | Out-Null } else { Start-Process -FilePath $nginxExe -ArgumentList "-c", $nginxConf }
  Start-Sleep -Seconds 1
}

$feOk = $false
try{ $r = Invoke-WebRequest -Uri http://127.0.0.1:3006 -UseBasicParsing -TimeoutSec 5; if($r.StatusCode -eq 200){ $feOk = $true } } catch {}

$dbOk = (Test-NetConnection -ComputerName 127.0.0.1 -Port 3308).TcpTestSucceeded

if(-not $beOk){
  $beOut = Join-Path $root 'backend/logs/out.log'
  $beErr = Join-Path $root 'backend/logs/error.log'
  if(Test-Path $beErr){ Write-Host "Backend error log (tail):"; Get-Content $beErr -Tail 50 | ForEach-Object { Write-Host $_ } }
  elseif(Test-Path $beOut){ Write-Host "Backend output log (tail):"; Get-Content $beOut -Tail 50 | ForEach-Object { Write-Host $_ } }
}

$beTxt = if($beOk){ 'OK' } else { 'FAIL' }
$feTxt = if($nginxExe){ if($feOk){ 'OK' } else { 'FAIL' } } else { 'SKIP' }
$dbTxt = if($dbOk){ 'OK' } else { 'FAIL' }
Write-Host ("[{0}] Startup summary: Backend={1} Frontend={2} DB={3}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $beTxt, $feTxt, $dbTxt)

Start-Process powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File",(Join-Path $root 'infra/scripts/monitor-prod.ps1')

if($beOk -and (($nginxExe -and $feOk) -or (-not $nginxExe))){ exit 0 } else { exit 1 }
