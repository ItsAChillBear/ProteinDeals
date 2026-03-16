@echo off
cd /d "%~dp0"

echo Killing processes on ports 3000 and 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1

set NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
set NEXT_PUBLIC_API_URL=http://localhost:3001

echo Pushing database schema...
call npm run db:push --workspace @wheywise/db
if errorlevel 1 (
  echo Database schema push failed.
  exit /b 1
)

echo Starting WheyWise web and API...
echo Web: http://localhost:3000
echo API: http://localhost:3001
call npm run dev
