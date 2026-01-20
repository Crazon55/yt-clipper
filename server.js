const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
const MAX_DURATION_SECONDS = 20 * 60; // 20 minutes limit

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR);
}

app.use(cors());
app.use(express.json());

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
}

// Helper: Parse time string (HH:MM:SS or MM:SS or SS) to seconds
const parseTimeToSeconds = (timeStr) => {
    if (typeof timeStr === 'number') return timeStr;
    if (!timeStr) return 0;

    const parts = timeStr.toString().split(':').map(Number);
    if (parts.some(isNaN)) return null; // Invalid format

    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return null;
};

// Helper: Get yt-dlp command based on environment
const getYtDlpCommand = () => {
    // Check for standalone binary first (for Render/Linux)
    const ytDlpPath = path.join(__dirname, 'yt-dlp');
    if (fs.existsSync(ytDlpPath)) {
        return ytDlpPath;
    }
    
    // Check for standalone binary with .exe (Windows)
    const ytDlpExe = path.join(__dirname, 'yt-dlp.exe');
    if (fs.existsSync(ytDlpExe)) {
        return ytDlpExe;
    }
    
    // Try system yt-dlp command
    if (process.platform !== 'win32') {
        return 'yt-dlp';
    }
    
    // Fallback to Python module (Windows/local dev)
    return 'python';
};

// Helper: Get yt-dlp args (empty if using binary, ['-m', 'yt_dlp'] if using Python)
const getYtDlpArgs = (userArgs) => {
    const command = getYtDlpCommand();
    if (command === 'python') {
        return ['-m', 'yt_dlp', ...userArgs];
    }
    return userArgs;
};

// Helper: Run yt-dlp command
const runYtDlp = (args) => {
    return new Promise((resolve, reject) => {
        const command = getYtDlpCommand();
        const processArgs = getYtDlpArgs(args);
        
        const process = spawn(command, processArgs);
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => stdout += data.toString());
        process.stderr.on('data', (data) => stderr += data.toString());

        process.on('error', (err) => {
            if (err.code === 'ENOENT') {
                reject(new Error('yt-dlp is not installed. Please install it with: pip install yt-dlp or download the binary'));
            } else {
                reject(new Error(`Failed to run yt-dlp: ${err.message}`));
            }
        });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr || 'yt-dlp failed'));
            } else {
                resolve(stdout);
            }
        });
    });
};

app.post('/api/clip', async (req, res) => {
    const { url, startTime, endTime } = req.body;
    const jobId = uuidv4();
    const tempFileTemplate = path.join(DOWNLOAD_DIR, `${jobId}_%(title)s.%(ext)s`);

    console.log(`[${jobId}] Processing request for ${url}`);

    try {
        if (!url) return res.status(400).json({ error: "URL is required" });

        // 1. Fetch Metadata (Duration check)
        // We use --flat-playlist to avoid downloading invalid playlists, just single videos
        const infoArgs = ['--dump-json', '--flat-playlist', '--no-warnings', url];
        const infoJson = await runYtDlp(infoArgs);
        const videoInfo = JSON.parse(infoJson);

        const videoDuration = videoInfo.duration;
        const startSec = parseTimeToSeconds(startTime) || 0;
        let endSec = parseTimeToSeconds(endTime);

        // Logic: If no end time provided, default to end of video
        if (endSec === null || endSec === 0) {
            endSec = videoDuration;
        }

        // 2. Validation
        if (startSec < 0 || endSec <= startSec) {
            return res.status(400).json({ error: "Invalid start or end time." });
        }

        const clipDuration = endSec - startSec;
        if (clipDuration > MAX_DURATION_SECONDS) {
            return res.status(400).json({
                error: `Clip too long (${Math.floor(clipDuration / 60)}m). Max allowed is 20 minutes.`
            });
        }

        if (startSec > videoDuration) {
            return res.status(400).json({ error: "Start time is beyond video duration." });
        }

        // 3. Download & Clip
        // We use --download-sections to download ONLY the part we need.
        // *start-end syntax tells yt-dlp to fetch that range.
        // --force-keyframes-at-cuts ensures accuracy by re-encoding at split points if necessary.
        // --recode-video mp4 ensures we always send back an MP4.

        console.log(`[${jobId}] Clipping from ${startSec} to ${endSec} (${clipDuration}s)`);

        const downloadArgs = [
            '--download-sections', `*${startSec}-${endSec}`,
            '--force-keyframes-at-cuts',
            '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', // Prefer MP4
            '--output', tempFileTemplate,
            '--no-playlist',
            '--recode-video', 'mp4', // Ensure final output is MP4
            url
        ];

        await runYtDlp(downloadArgs);

        // Find the generated file (yt-dlp replaces template placeholders)
        // We look for files starting with the jobId in the download dir
        const files = fs.readdirSync(DOWNLOAD_DIR);
        const generatedFile = files.find(f => f.startsWith(jobId));

        if (!generatedFile) {
            throw new Error("File downloaded but not found on disk.");
        }

        const filePath = path.join(DOWNLOAD_DIR, generatedFile);

        // 4. Send File
        res.download(filePath, generatedFile, (err) => {
            if (err) {
                console.error(`[${jobId}] Error sending file:`, err);
                if (!res.headersSent) res.status(500).send("Error sending file");
            }

            // 5. Cleanup
            try {
                fs.unlinkSync(filePath);
                console.log(`[${jobId}] Cleanup successful.`);
            } catch (cleanupErr) {
                console.error(`[${jobId}] Cleanup failed:`, cleanupErr);
            }
        });

    } catch (error) {
        console.error(`[${jobId}] Error:`, error.message);
        // Clean error message for user
        let userMsg = "Failed to process video.";
        if (error.message.includes("Video unavailable")) userMsg = "Video is unavailable or private.";
        if (error.message.includes("Sign in to confirm")) userMsg = "Video is age-restricted.";

        res.status(500).json({ error: userMsg, details: error.message });
    }
});

app.get('/health', (req, res) => res.send('Clipper Service Ready'));

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`   To find and kill the process, run:`);
        console.error(`   netstat -ano | findstr :${PORT}`);
        console.error(`   taskkill /PID <process_id> /F\n`);
        process.exit(1);
    } else {
        throw err;
    }
});