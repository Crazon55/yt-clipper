# YouTube Clipper

A web application to extract and download clips from YouTube videos.

## Features

- Extract specific time ranges from YouTube videos
- Download clips in high quality (best available)
- Modern, responsive UI
- Real-time status updates

## Deployment to Render

### Prerequisites

1. Render account
2. GitHub repository (push your code to GitHub first)

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy on Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will auto-detect the `render.yaml` file
   - Or manually configure:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Environment**: `Node`
     - **Environment Variables**:
       - `NODE_ENV=production`
       - `PORT=10000` (Render sets this automatically)

3. **Important Notes**
   - Render will automatically set the `PORT` environment variable
   - The app builds the frontend and serves it from the same server
   - **yt-dlp is automatically installed** during build via the `install-ytdlp.js` script
   - The script downloads the standalone yt-dlp binary (no Python/Docker needed!)

### How yt-dlp Works on Render

The app automatically downloads the standalone `yt-dlp` binary during the build process:
- **Build Command**: `npm install && node scripts/install-ytdlp.js && npm run build`
- The `install-ytdlp.js` script downloads the latest yt-dlp binary from GitHub
- The server automatically detects and uses the binary (no Python required!)
- Falls back to Python module only if binary is not found (for local Windows dev)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start backend:
   ```bash
   npm run dev
   ```

3. Start frontend (in another terminal):
   ```bash
   npm run frontend
   ```

4. Open `http://localhost:3000`

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)
- `VITE_API_URL` - Frontend API URL (optional, defaults to `/api/clip`)
