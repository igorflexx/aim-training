@echo off
setlocal
cd /d "%~dp0"

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
  echo Install Node.js so that pnpm or npm is available in PATH.
  exit /b 1
)

if not exist node_modules (
  call %PM% install
  if errorlevel 1 exit /b 1
)

call %PM% run dev -- --host
