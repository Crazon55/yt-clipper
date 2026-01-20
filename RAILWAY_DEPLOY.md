# Deploy to Railway

Railway is MUCH better for this project because it:
- ✅ Supports Python + Node.js together
- ✅ Can run child processes (spawn)
- ✅ Better yt-dlp support
- ✅ Free tier available

## Steps:

1. **Go to**: https://railway.app
2. **Sign up** with GitHub
3. **Click "New Project"** → **"Deploy from GitHub repo"**
4. **Select your repo**: `Crazon55/yt-clipper`
5. **Railway will auto-detect** Node.js and Python
6. **Add environment variable**:
   - Key: `NODE_ENV`
   - Value: `production`
7. **Deploy!**

Railway will automatically:
- Install Node.js dependencies
- Install Python dependencies (yt-dlp)
- Build the frontend
- Start the server

## Why Railway > Render:
- Better Python support
- Can actually run yt-dlp properly
- More reliable for this use case
