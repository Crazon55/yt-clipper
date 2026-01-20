const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
const COOKIES_FILE = path.join(__dirname, 'cookies.txt');
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
// Try system command first (most reliable), then Python, then binary
const getYtDlpCommand = () => {
    // First, try system yt-dlp command (if installed via package manager or pip)
    if (process.platform !== 'win32') {
        try {
            const { execSync } = require('child_process');
            execSync('which yt-dlp', { stdio: 'ignore', timeout: 1000 });
            console.log('Using system yt-dlp command (found in PATH)');
            return 'yt-dlp';
        } catch (err) {
            // System command not found, try Python next
        }
    }
    
    // Try Python module (most reliable on Render)
    try {
        const { execSync } = require('child_process');
        execSync('python3 --version', { stdio: 'ignore', timeout: 1000 });
        console.log('Using python3 -m yt_dlp');
        return 'python3';
    } catch (err) {
        try {
            execSync('python --version', { stdio: 'ignore', timeout: 1000 });
            console.log('Using python -m yt_dlp');
            return 'python';
        } catch (err2) {
            // Python not found, continue to binary
        }
    }
    
    // Check for standalone binary (for Render/Linux) - last resort
    const ytDlpPath = path.join(__dirname, 'yt-dlp');
    if (fs.existsSync(ytDlpPath)) {
        // Make sure it's executable on Unix systems
        if (process.platform !== 'win32') {
            try {
                fs.chmodSync(ytDlpPath, '755');
            } catch (err) {
                // Ignore chmod errors
            }
        }
        console.log(`Using yt-dlp binary at: ${ytDlpPath} (may not work if it needs Python)`);
        return ytDlpPath;
    }
    
    // Check for standalone binary with .exe (Windows)
    const ytDlpExe = path.join(__dirname, 'yt-dlp.exe');
    if (fs.existsSync(ytDlpExe)) {
        console.log(`Using yt-dlp.exe at: ${ytDlpExe}`);
        return ytDlpExe;
    }
    
    // Final fallback
    console.log('No yt-dlp found, will fail');
    return 'yt-dlp';
};

// Helper: Get yt-dlp args (empty if using binary, ['-m', 'yt_dlp'] if using Python)
const getYtDlpArgs = (userArgs) => {
    const command = getYtDlpCommand();
    if (command === 'python' || command === 'python3') {
        return ['-m', 'yt_dlp', ...userArgs];
    }
    return userArgs;
};

// Helper: Run yt-dlp command
const runYtDlp = (args) => {
    return new Promise((resolve, reject) => {
        const command = getYtDlpCommand();
        const processArgs = getYtDlpArgs(args);
        
        // Log for debugging
        console.log(`Running: ${command} ${processArgs.join(' ')}`);
        
        const childProcess = spawn(command, processArgs, {
            cwd: __dirname,
            env: { ...process.env, PATH: process.env.PATH }
        });
        let stdout = '';
        let stderr = '';

        childProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        childProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        childProcess.on('error', (err) => {
            console.error(`yt-dlp spawn error:`, err);
            if (err.code === 'ENOENT') {
                reject(new Error('yt-dlp is not installed. Please install it with: pip install yt-dlp or download the binary'));
            } else {
                reject(new Error(`Failed to run yt-dlp: ${err.message}`));
            }
        });

        childProcess.on('close', (code) => {
            console.log(`yt-dlp exit code: ${code}, stdout length: ${stdout.length}, stderr length: ${stderr.length}`);
            
            // Log first part of output for debugging
            if (stdout) {
                console.log(`yt-dlp stdout preview: ${stdout.substring(0, 500)}`);
            }
            if (stderr) {
                console.log(`yt-dlp stderr preview: ${stderr.substring(0, 500)}`);
            }
            
            if (code !== 0) {
                // yt-dlp sometimes returns non-zero codes but still outputs JSON to stdout
                // Check if we have valid output in stdout first
                if (stdout.trim() && stdout.trim().startsWith('{')) {
                    resolve(stdout);
                } else {
                    // Log stderr for debugging
                    if (stderr) {
                        console.error(`yt-dlp stderr: ${stderr.substring(0, 500)}`);
                    }
                    reject(new Error(stderr || stdout || `yt-dlp failed with exit code ${code}`));
                }
            } else {
                if (!stdout.trim()) {
                    // Empty output with exit code 0 is suspicious - log full details
                    console.error(`[CRITICAL] yt-dlp returned empty output despite success code. Command: ${command} ${processArgs.join(' ')}`);
                    console.error(`Binary exists: ${fs.existsSync(command)}`);
                    if (stderr) {
                        console.error(`Full stderr: ${stderr}`);
                    }
                    const errorMsg = stderr ? `yt-dlp returned empty output. stderr: ${stderr.substring(0, 500)}` : 'yt-dlp returned empty output. The binary may be corrupted or incompatible.';
                    reject(new Error(errorMsg));
                } else {
                    resolve(stdout);
                }
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
        // Clean URL - extract just the video ID to avoid playlist/query parameter issues
        let cleanUrl = url;
        try {
            const urlObj = new URL(url);
            // Extract video ID from v parameter
            const videoId = urlObj.searchParams.get('v');
            if (videoId) {
                cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
                console.log(`[${jobId}] Cleaned URL: ${cleanUrl}`);
            }
        } catch (urlError) {
            // If URL parsing fails, use original URL
            console.log(`[${jobId}] Could not parse URL, using original`);
        }
        
        // We use --dump-json to get video info, --no-warnings to reduce noise
        // Note: --quiet suppresses JSON output, so we don't use it here
        const infoArgs = ['--dump-json', '--no-warnings', '--no-playlist', '--no-check-certificate'];
        
        // Add cookies if available
        if (fs.existsSync(COOKIES_FILE)) {
            infoArgs.push('--cookies', COOKIES_FILE);
            console.log(`[${jobId}] Using cookies file for authentication`);
        }
        
        infoArgs.push(cleanUrl);
        let infoJson;
        try {
            infoJson = await runYtDlp(infoArgs);
        } catch (error) {
            console.error(`[${jobId}] yt-dlp error:`, error.message);
            throw new Error(`Failed to fetch video info: ${error.message}`);
        }
        
        // Clean the JSON output (remove any leading/trailing whitespace or non-JSON content)
        const cleanedJson = infoJson.trim();
        if (!cleanedJson) {
            throw new Error('yt-dlp returned empty output. The video may be unavailable, private, or region-restricted.');
        }
        
        let videoInfo;
        try {
            videoInfo = JSON.parse(cleanedJson);
        } catch (parseError) {
            console.error(`[${jobId}] JSON parse error. Raw output length: ${cleanedJson.length}, first 500 chars:`, cleanedJson.substring(0, 500));
            throw new Error(`Failed to parse video info. The video may be unavailable or private.`);
        }

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

        // Clean URL for download too
        let downloadUrl = url;
        try {
            const urlObj = new URL(url);
            const videoId = urlObj.searchParams.get('v');
            if (videoId) {
                downloadUrl = `https://www.youtube.com/watch?v=${videoId}`;
            }
        } catch (urlError) {
            // Use original URL if parsing fails
        }
        
        const downloadArgs = [
            '--download-sections', `*${startSec}-${endSec}`,
            '--force-keyframes-at-cuts',
            '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', // Prefer MP4
            '--output', tempFileTemplate,
            '--no-playlist',
            '--recode-video', 'mp4', // Ensure final output is MP4
            '--progress', // Show progress instead of quiet
        ];
        
        // Add cookies if available
        if (fs.existsSync(COOKIES_FILE)) {
            downloadArgs.push('--cookies', COOKIES_FILE);
        }
        
        downloadArgs.push(downloadUrl);

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