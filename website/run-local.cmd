@echo off
setlocal
title aim-training local launcher

call :main
set "EXIT_CODE=%errorlevel%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERROR] Script finished with code %EXIT_CODE%.
  echo Press any key to close this window.
  pause >nul
)
exit /b %EXIT_CODE%

:main
cd /d "%~dp0"

if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin" (
  set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
)
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback" (
  set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%"
)
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\override" (
  set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\override;%PATH%"
)

where pnpm >nul 2>nul
if not errorlevel 1 (
  set "PM=pnpm"
) else (
  where npm >nul 2>nul
  if not errorlevel 1 (
    set "PM=npm"
  )
)

if not defined PM (
  echo Node.js package manager not found.
  echo Install Node.js or run this script from Codex with bundled runtime access.
  exit /b 1
)

if not exist node_modules (
  call %PM% install
  if errorlevel 1 exit /b 1
)

if exist "node_modules\vite\bin\vite.js" (
  node "node_modules\vite\bin\vite.js" --host 127.0.0.1
  exit /b %errorlevel%
)

call %PM% run dev -- --host 127.0.0.1
exit /b %errorlevel%
