@echo off
echo Starting Cloudflare Tunnel...
echo.

REM Check if cloudflared exists
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    echo cloudflared not found! Installing...
    winget install --id Cloudflare.cloudflared --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo Failed to install cloudflared. Please install manually.
        echo Download from: https://github.com/cloudflare/cloudflared/releases
        pause
        exit /b 1
    )
)

REM Start server in background (if not running)
netstat -an | find "3001" >nul
if %errorlevel% neq 0 (
    echo Starting server...
    start /min cmd /c "npm start"
    timeout /t 5 /nobreak >nul
)

echo Creating Cloudflare Tunnel...
echo.
cloudflared tunnel --url http://localhost:3001

pause
