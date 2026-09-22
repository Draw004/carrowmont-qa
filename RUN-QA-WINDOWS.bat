@echo off
setlocal
cd /d %~dp0
if not exist node_modules (
  echo Installing QA dependencies...
  call npm install
  if errorlevel 1 goto :error
)
echo Running Carrowmont QA against https://carrowmont.com ...
call npm run qa
if errorlevel 1 goto :failed
echo.
echo QA completed successfully.
echo Open qa-summary.md for the PASS / FAIL / VISUAL REVIEW summary.
exit /b 0
:failed
echo.
echo QA found one or more failures. Open qa-summary.md and playwright-report\index.html.
exit /b 1
:error
echo Dependency installation failed.
exit /b 1
