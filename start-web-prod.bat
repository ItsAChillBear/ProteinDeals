@echo off
setlocal

cd /d "%~dp0"

set API_PORT=3001
set PORT=3002
set NEXT_PUBLIC_API_BASE_URL=http://localhost:%API_PORT%
set NEXT_PUBLIC_API_URL=http://localhost:%API_PORT%

echo Starting @proteindeals/api on port %API_PORT%...
start "ProteinDeals API" cmd /k "cd /d %~dp0 && set PORT=%API_PORT% && npx tsx apps\api\src\index.ts"

echo Starting @proteindeals/web in production on port %PORT%...
call npm run start --workspace @proteindeals/web

set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Production server exited with code %EXIT_CODE%.
  exit /b %EXIT_CODE%
)

exit /b 0
