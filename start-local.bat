@echo off
cd /d "%~dp0"

echo ========================================
echo   ProteinDeals - Development Server
echo ========================================
echo.

REM Set environment variables to keep local dev predictable
set NEXT_TELEMETRY_DISABLED=1
set NODE_OPTIONS=--max-old-space-size=4096
set NEXT_DEV=true
set NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
set NEXT_PUBLIC_API_URL=http://localhost:3001

REM Stop only the processes occupying the app ports
echo [*] Clearing ports 3000 and 3001...
set PORTS_CLEARED=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
    set PORTS_CLEARED=1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
    set PORTS_CLEARED=1
)
if "%PORTS_CLEARED%"=="1" (
    echo [OK] Stopped processes on the dev ports
) else (
    echo [OK] No existing listeners found on ports 3000 or 3001
)
echo.

REM Clean build artifacts that commonly cause stale dev state
echo [*] Cleaning up build files...
if exist ".next" (
    rmdir /s /q ".next" 2>nul
    if exist ".next" (
        echo [!] Warning: Could not fully remove .next directory
    ) else (
        echo [OK] Removed .next directory
    )
)

if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache" 2>nul
    echo [OK] Removed node cache
)

del /q *.tsbuildinfo 2>nul
echo.

REM Ensure dependencies exist before starting services
if exist "node_modules" (
    echo [OK] node_modules found
) else (
    echo [!] node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully
)
echo.

REM Surface env file state for easier debugging
if exist ".env.local" (
    echo [OK] .env.local found
) else (
    echo [INFO] .env.local not found. Using .env only.
)
echo.

REM Push the database schema before starting the app
echo ========================================
echo [*] Pushing database schema...
echo ========================================
call npm run db:push --workspace @proteindeals/db
if errorlevel 1 (
    echo [ERROR] Database schema push failed.
    pause
    exit /b 1
)
echo [OK] Database schema is ready
echo.

REM Start the development servers
echo ========================================
echo [*] Starting ProteinDeals services...
echo ========================================
echo [*] Web: http://localhost:3000
echo [*] API: http://localhost:3001
echo [*] Press Ctrl+C to stop all services
echo.
echo [*] Services running:
echo     - Web: http://localhost:3000
echo     - API: http://localhost:3001
echo.

call npm run dev

REM Cleanup when stopping
echo.
echo ========================================
echo [*] Stopping services...
echo ========================================
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
echo [OK] Dev port listeners stopped.
echo ========================================
pause
