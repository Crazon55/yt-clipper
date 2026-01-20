# Cloudflare Tunnel Setup Guide

## What is Cloudflare Tunnel?
Cloudflare Tunnel (via `cloudflared`) creates a secure connection from your server to Cloudflare's edge network. Your app will be accessible via a `*.trycloudflare.com` URL (free) or your own custom domain.

## Why This Works Better Than Render
- ✅ No deployment restrictions
- ✅ Full control over the environment
- ✅ Can run locally or on any VPS
- ✅ Free tier available
- ✅ No port binding issues
- ✅ Works with yt-dlp perfectly

## Setup Steps

### Option 1: Quick Start (Temporary URL - Free)
1. **Download cloudflared:**
   - Windows: Download from https://github.com/cloudflare/cloudflared/releases
   - Or use: `winget install --id Cloudflare.cloudflared`
   - Or use: `scoop install cloudflared`

2. **Start your server:**
   ```powershell
   cd C:\Users\skill\Desktop\yt-downloader
   npm start
   ```
   (Server should be running on port 3001)

3. **In a new terminal, create tunnel:**
   ```powershell
   cloudflared tunnel --url http://localhost:3001
   ```
   
4. **Copy the URL** (looks like `https://xxxxx.trycloudflare.com`)
   - This URL will work for 8 hours (free tier)
   - Share this URL to access your app!

### Option 2: Permanent Setup (Custom Domain - Free)
1. **Install cloudflared** (same as above)

2. **Login to Cloudflare:**
   ```powershell
   cloudflared tunnel login
   ```
   - Opens browser, select your domain
   - Creates certificate automatically

3. **Create a named tunnel:**
   ```powershell
   cloudflared tunnel create yt-clipper
   ```
   - Note the tunnel ID (you'll need it)

4. **Create config file** (`C:\Users\skill\.cloudflared\config.yml`):
   ```yaml
   tunnel: <TUNNEL_ID_FROM_STEP_3>
   credentials-file: C:\Users\skill\.cloudflared\<TUNNEL_ID>.json

   ingress:
     - hostname: yt-clipper.yourdomain.com
       service: http://localhost:3001
     - service: http_status:404
   ```

5. **Create DNS record:**
   ```powershell
   cloudflared tunnel route dns yt-clipper yt-clipper.yourdomain.com
   ```

6. **Run tunnel:**
   ```powershell
   cloudflared tunnel run yt-clipper
   ```

### Option 3: Run as Windows Service (Always On)
1. **Install tunnel service:**
   ```powershell
   cloudflared service install
   ```

2. **Start service:**
   ```powershell
   cloudflared service start
   ```

## Quick Start Script
I'll create a helper script to make this easier!
