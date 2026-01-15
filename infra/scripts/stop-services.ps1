$ErrorActionPreference = "SilentlyContinue"
$ProgressPreference = "SilentlyContinue"

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $root

Write-Host ("[{0}] Stopping monitor window and services..." -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))

try { Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*monitor-prod.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force } } catch {}

if(Get-Command pm2 -ErrorAction SilentlyContinue){
  cmd /c pm2 stop thdbs-backend | Out-Null
  cmd /c pm2 delete thdbs-backend | Out-Null
  cmd /c pm2 save | Out-Null
}

$nginxExe = Join-Path $root 'infra/nginx/nginx.exe'
if(-not (Test-Path $nginxExe)){
  $fallback = Join-Path $Env:ProgramFiles 'nginx/nginx.exe'
  if(Test-Path $fallback){ $nginxExe = $fallback } else { $nginxExe = $null }
}
$nginxConf = Join-Path $root 'infra/nginx/nginx.conf'
if($nginxExe -and (Test-Path $nginxConf)){
  & $nginxExe -s quit -c $nginxConf | Out-Null
  Start-Sleep -Seconds 2
  try { Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'nginx.exe' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force } } catch {}
}

Write-Host ("[{0}] Stopped frontend and backend" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
exit 0
