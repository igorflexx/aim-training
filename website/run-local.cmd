@echo off
setlocal
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

call %PM% run dev -- --host
