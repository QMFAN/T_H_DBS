@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%.") do set "ROOT=%%~fI"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\infra\scripts\start-services.ps1" --no-pause
exit /b %ERRORLEVEL%