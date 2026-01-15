@echo off
cd /d "%~dp0"

echo ==========================================
echo Starting Pomodoro Fusion...
echo ==========================================

REM Check if npm is available
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm command not found. Please install Node.js.
    pause
    exit /b
)

REM Install dependencies if missing
if not exist node_modules (
    echo [INFO] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b
    )
)

echo [INFO] Opening browser...
start "" "http://localhost:5173"

echo [INFO] Starting Vite Server...
echo Press Ctrl+C to stop the server.
call npm run dev

if %errorlevel% neq 0 (
    echo [ERROR] Server stopped with error.
)

pause
