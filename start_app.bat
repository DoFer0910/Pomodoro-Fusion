@echo off
cd /d %~dp0
echo Starting Pomodoro Fusion...
start "" "http://localhost:3000"
call npm run dev
pause
