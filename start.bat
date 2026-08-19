@echo off
setlocal

cd /d "%~dp0"

echo Starting tarot-wheel...
echo Project: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not available in PATH.
  echo Please install Node.js, then run this file again.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not installed or not available in PATH.
  echo Please install Node.js with npm, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dependencies not found. Running npm install...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
  echo.
)

echo Opening http://localhost:3000 ...
start "" cmd /c "timeout /t 5 /nobreak >nul && start "" http://localhost:3000"

echo Starting development server...
echo Keep this window open while using the site.
echo Press Ctrl+C in this window to stop the server.
echo.

call npm.cmd run dev

echo.
echo Server stopped.
pause
