@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..\..") do set "PROJECT_DIR=%%~fI"
set "MY_CNF=%PROJECT_DIR%\infra\mysql\my.cnf"
set "MYSQL_DATA=%PROJECT_DIR%\infra\mysql\mysql_data\data"
set "MYSQLD="

if not "%MYSQL_HOME%"=="" if exist "%MYSQL_HOME%\bin\mysqld.exe" set "MYSQLD=%MYSQL_HOME%\bin\mysqld.exe"
if "%MYSQLD%"=="" if exist "%ProgramFiles%\MySQL\MySQL Server 9.3\bin\mysqld.exe" set "MYSQLD=%ProgramFiles%\MySQL\MySQL Server 9.3\bin\mysqld.exe"
if "%MYSQLD%"=="" if exist "%ProgramFiles%\MySQL\MySQL Server 9.2\bin\mysqld.exe" set "MYSQLD=%ProgramFiles%\MySQL\MySQL Server 9.2\bin\mysqld.exe"
if "%MYSQLD%"=="" if exist "%ProgramFiles%\MySQL\MySQL Server 9.1\bin\mysqld.exe" set "MYSQLD=%ProgramFiles%\MySQL\MySQL Server 9.1\bin\mysqld.exe"
if "%MYSQLD%"=="" if exist "%ProgramFiles%\MySQL\MySQL Server 9.0\bin\mysqld.exe" set "MYSQLD=%ProgramFiles%\MySQL\MySQL Server 9.0\bin\mysqld.exe"
if "%MYSQLD%"=="" if exist "%ProgramFiles%\MySQL\MySQL Server 8.0\bin\mysqld.exe" set "MYSQLD=%ProgramFiles%\MySQL\MySQL Server 8.0\bin\mysqld.exe"
if "%MYSQLD%"=="" if exist "%ProgramFiles(x86)%\MySQL\MySQL Server 8.0\bin\mysqld.exe" set "MYSQLD=%ProgramFiles(x86)%\MySQL\MySQL Server 8.0\bin\mysqld.exe"
if "%MYSQLD%"=="" if exist "C:\mysql\bin\mysqld.exe" set "MYSQLD=C:\mysql\bin\mysqld.exe"
if "%MYSQLD%"=="" if exist "%PROJECT_DIR%\infra\mysql\bin\mysqld.exe" set "MYSQLD=%PROJECT_DIR%\infra\mysql\bin\mysqld.exe"

if "%MYSQLD%"=="" (
  echo mysqld.exe not found. Install MySQL or set MYSQL_HOME to installation directory
  exit /b 1
)

echo Using mysqld: %MYSQLD%
"%MYSQLD%" --version

for %%D in ("%PROJECT_DIR%\infra\mysql\mysql_data" "%PROJECT_DIR%\infra\mysql\mysql_data\data" "%PROJECT_DIR%\infra\mysql\mysql_data\tmp" "%PROJECT_DIR%\infra\mysql\mysql_data\uploads") do (
  if not exist "%%~fD" mkdir "%%~fD"
)

set "NEED_INIT=0"
if not exist "%MYSQL_DATA%" set "NEED_INIT=1"
if exist "%MYSQL_DATA%" if not exist "%MYSQL_DATA%\mysql" set "NEED_INIT=1"
if "%NEED_INIT%"=="1" (
  echo Data directory missing or uninitialized, initializing without root password...
  "%MYSQLD%" --initialize-insecure --defaults-file="%MY_CNF%"
  if errorlevel 1 (
    echo Initialization failed
    exit /b 1
  )
)

if /i "%~1"=="--dry-run" (
  echo Will execute: start "" "%MYSQLD%" --defaults-file="%MY_CNF%" --console
  exit /b 0
)

rem If already listening on 3308, skip start
powershell -NoProfile -Command "if((Test-NetConnection -ComputerName 127.0.0.1 -Port 3308).TcpTestSucceeded){exit 0}else{exit 1}" >nul 2>&1
if not errorlevel 1 (
  echo MySQL already listening on port 3308
  goto DONE
)

rem Remove stale pid file if exists and port not listening
set "MYSQL_PID=%PROJECT_DIR%\infra\mysql\mysql_data\mysql.pid"
if exist "%MYSQL_PID" (
  del /f /q "%MYSQL_PID%" >nul 2>&1
)

rem Start mysqld; support optional --console to show logs
if /i "%~1"=="--console" (
  start "" "%MYSQLD%" --defaults-file="%MY_CNF%" --console
) else (
  powershell -NoProfile -Command "Start-Process -FilePath '%MYSQLD%' -ArgumentList '--defaults-file=%MY_CNF%' -WindowStyle Hidden" >nul 2>&1
)
if errorlevel 1 (
  echo MySQL start failed
  exit /b 1
)

set /a _WAIT=0
:WAIT_PORT
powershell -NoProfile -Command "if((Test-NetConnection -ComputerName 127.0.0.1 -Port 3308).TcpTestSucceeded){exit 0}else{exit 1}" >nul 2>&1
if errorlevel 1 (
  set /a _WAIT+=1
  if %_WAIT% GEQ 90 (
    echo MySQL port 3308 is not listening
    powershell -NoProfile -Command "if(Test-Path '%PROJECT_DIR%\infra\mysql\mysql_data\ENHEALTH.err'){Get-Content '%PROJECT_DIR%\infra\mysql\mysql_data\ENHEALTH.err' -Tail 50}"
    exit /b 1
  )
  timeout /t 1 >nul
  goto WAIT_PORT
)

echo MySQL started (config: %MY_CNF%)
goto DONE

:DONE
exit /b 0