$ErrorActionPreference = "SilentlyContinue"
$ProgressPreference = "SilentlyContinue"

function Test-Port([int]$port){ (Test-NetConnection -ComputerName 127.0.0.1 -Port $port).TcpTestSucceeded }
function Get-HttpStatus($url){ try { (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5).StatusCode } catch { 0 } }
function Test-MySQL(){ $cmd = Get-Command mysqladmin -ErrorAction SilentlyContinue; if($cmd){ try { & $cmd.Source ping -h 127.0.0.1 -P 3308 --silent | Out-Null; return $true } catch { return (Test-Port 3308) } } else { return (Test-Port 3308) } }
function Get-Pm2Summary(){ try { $txt = cmd /c pm2 jlist --no-color | Out-String; if(-not $txt){ return $null } $procs = $txt | ConvertFrom-Json; if(-not $procs){ return $null } $total=$procs.Count; $online=($procs|Where-Object{$_.pm2_env.status -eq 'online'}).Count; $stopped=($procs|Where-Object{$_.pm2_env.status -eq 'stopped'}).Count; $errored=($procs|Where-Object{$_.pm2_env.status -eq 'errored'}).Count; $names=($procs|ForEach-Object{"{0}:{1}" -f $_.name,$_.pm2_env.status}) -join ', '; return "PM2[total:$total online:$online stopped:$stopped errored:$errored] $names" } catch { return $null } }

$intervalSec = 3600
if ($env:MONITOR_INTERVAL_SEC) { try { $intervalSec = [int]$env:MONITOR_INTERVAL_SEC } catch {} }

while($true){
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $backend = Test-Port 3005
  $frontend = Get-HttpStatus "http://127.0.0.1:3006"
  $mysql = Test-MySQL
  Write-Host ("[{0}] backend:{1} frontend:{2} mysql:{3}" -f $ts,$backend,$frontend,$mysql)
  $pm2 = Get-Pm2Summary
  if($pm2){ Write-Host $pm2 }
  Start-Sleep -Seconds $intervalSec
}
