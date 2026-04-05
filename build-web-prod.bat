@echo off
setlocal

cd /d "%~dp0"

echo Building @proteindeals/web...
call npm run build --workspace @proteindeals/web

set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Build failed with exit code %EXIT_CODE%.
  exit /b %EXIT_CODE%
)

echo.
echo Build completed successfully.
exit /b 0
