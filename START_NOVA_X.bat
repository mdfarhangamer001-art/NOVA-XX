@echo off
title NOVA-X Launcher
cd /d "%~dp0"

echo ============================================
echo   NOVA-X - Starting real Electron app
echo ============================================
echo.

if not exist "node_modules" (
    echo [1/2] node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: npm install failed. Check your internet connection and Node.js install.
        pause
        exit /b 1
    )
) else (
    echo [1/2] Dependencies already installed. Skipping npm install.
)

echo.
echo [2/2] Launching NOVA-X in real Electron (Secure Bridge will be active)...
echo        (Close this window to stop the app)
echo.

call npx electron-vite dev

pause
