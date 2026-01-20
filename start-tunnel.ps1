# Cloudflare Tunnel Quick Start Script
# This script starts your server and creates a Cloudflare Tunnel

Write-Host "🚀 Starting YouTube Clipper with Cloudflare Tunnel..." -ForegroundColor Cyan

# Check if cloudflared is installed
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    Write-Host "❌ cloudflared not found!" -ForegroundColor Red
    Write-Host "📥 Installing cloudflared..." -ForegroundColor Yellow
    
    # Try winget first
    try {
        winget install --id Cloudflare.cloudflared --silent --accept-package-agreements --accept-source-agreements
        Write-Host "✅ cloudflared installed via winget" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  winget failed. Please install manually:" -ForegroundColor Yellow
        Write-Host "   Download from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Yellow
        Write-Host "   Or run: scoop install cloudflared" -ForegroundColor Yellow
        exit 1
    }
}

# Check if server is already running
$portCheck = Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($portCheck) {
    Write-Host "✅ Server already running on port 3001" -ForegroundColor Green
} else {
    Write-Host "📦 Starting server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start" -WindowStyle Minimized
    Start-Sleep -Seconds 5
    Write-Host "✅ Server started" -ForegroundColor Green
}

Write-Host ""
Write-Host "🌐 Creating Cloudflare Tunnel..." -ForegroundColor Cyan
Write-Host "   (This will give you a public URL)" -ForegroundColor Gray
Write-Host ""

# Start tunnel
cloudflared tunnel --url http://localhost:3001
